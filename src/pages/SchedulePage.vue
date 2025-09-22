<template>
  <q-page class="payroll-style-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">Weekly Schedule</h1>
          <p class="page-subtitle">Manage your team's work schedule efficiently</p>
        </div>
        <div class="header-actions">
          <q-btn
            flat
            color="grey-7"
            icon="refresh"
            @click="fetchData"
            class="header-btn"
            size="md"
          />
          <q-btn
            color="primary"
            icon="download"
            label="Export All"
            @click="exportSchedule"
            class="header-btn export-btn"
            unelevated
          />
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-section">
      <div class="summary-grid">
        <div class="summary-card purple">
          <div class="card-icon">
            <q-icon name="groups" size="24px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ activeEmployees }}</div>
            <div class="card-label">Total Employees</div>
          </div>
        </div>

        <div class="summary-card yellow">
          <div class="card-icon">
            <q-icon name="schedule" size="24px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ totalShifts }}</div>
            <div class="card-label">Total Shifts</div>
          </div>
        </div>

        <div class="summary-card green">
          <div class="card-icon">
            <q-icon name="business_center" size="24px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ positionsCount }}</div>
            <div class="card-label">Positions Filled</div>
          </div>
        </div>

        <div class="summary-card blue">
          <div class="card-icon">
            <q-icon name="schedule" size="24px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ weekHours.toFixed(1) }}h</div>
            <div class="card-label">Total Hours</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Section -->
    <div class="filter-section">
      <div class="filter-container">
        <h2 class="filter-title">Filter Records</h2>
        <div class="filter-controls">
          <div class="filter-inputs">
            <q-input
              v-model="searchQuery"
              placeholder="Search employees..."
              outlined
              dense
              class="search-field"
              debounce="300"
              @update:model-value="applyFilters"
            >
              <template #prepend>
                <q-icon name="search" size="20px" />
              </template>
            </q-input>

            <q-select
              v-model="filters.position"
              :options="['All', ...positions]"
              label="Position"
              outlined
              dense
              class="filter-field"
              clearable
              @update:model-value="applyFilters"
            />

            <q-select
              v-model="filters.employee"
              :options="[{ label: 'All Employees', value: null }, ...userOptions]"
              option-value="value"
              option-label="label"
              label="Employee"
              outlined
              dense
              class="filter-field"
              clearable
              emit-value
              map-options
              @update:model-value="applyFilters"
            />
          </div>

          <div class="view-controls">
            <q-btn-toggle
              v-model="viewMode"
              toggle-color="primary"
              :options="[
                { label: 'Table', value: 'table', icon: 'table_view' },
                { label: 'Cards', value: 'cards', icon: 'view_module' },
              ]"
              class="view-toggle"
              unelevated
            />
            <q-btn
              color="primary"
              icon="add"
              label="Add Schedule"
              @click="openAddModal"
              class="add-btn"
              unelevated
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Week Navigation -->
    <div class="week-nav-section">
      <div class="week-nav">
        <q-btn flat round icon="chevron_left" @click="prevWeek" class="nav-btn" size="md" />
        <div class="week-display">
          <div class="week-range">
            {{ selectedWeek.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
            –
            {{
              selectedWeek.end.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            }}
          </div>
        </div>
        <q-btn flat round icon="chevron_right" @click="nextWeek" class="nav-btn" size="md" />
      </div>
    </div>

    <!-- Schedule Content -->
    <div class="content-section">
      <!-- Mobile/Cards View -->
      <div v-if="viewMode === 'cards' || $q.screen.lt.lg" class="cards-view">
        <div class="employee-cards">
          <div v-for="user in filteredUsers" :key="user.id" class="employee-card">
            <div class="employee-header">
              <div class="employee-info">
                <q-avatar size="40px" class="employee-avatar">
                  <img :src="user.avatar" :alt="user.name" />
                </q-avatar>
                <div class="employee-details">
                  <div class="employee-name">{{ user.name }}</div>
                  <div class="employee-stats">
                    {{ getUserShiftCount(user.id) }} shifts this week
                  </div>
                </div>
              </div>
            </div>

            <div class="schedule-grid">
              <div v-for="(day, dayIdx) in days" :key="dayIdx" class="day-column">
                <div class="day-header">{{ day }}</div>
                <div class="day-shifts">
                  <div v-if="getShifts(user.id, dayIdx).length === 0" class="empty-slot">
                    <q-btn
                      flat
                      dense
                      size="sm"
                      label="Add Shift"
                      @click="openQuickAddModal(user.id, dayIdx)"
                      class="add-shift-btn"
                    />
                  </div>
                  <div v-else class="shift-items">
                    <div
                      v-for="shift in getShifts(user.id, dayIdx)"
                      :key="shift.id"
                      class="shift-card"
                      @click="openEditModal(shift)"
                    >
                      <div class="shift-time">
                        {{ shift.time || `${shift.startTime}-${shift.endTime}` }}
                      </div>
                      <div class="shift-position">{{ shift.position }}</div>
                      <q-btn
                        flat
                        dense
                        round
                        icon="close"
                        size="xs"
                        class="shift-remove"
                        @click.stop="deleteShift(shift.id)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Table View -->
      <div v-else class="table-view">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="employee-col">Employee</th>
                <th v-for="(day, i) in days" :key="i" class="day-col">
                  <div class="day-header-content">
                    <span class="day-name">{{ day }}</span>
                    <span class="day-count">{{ getDayShiftCount(i) }}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id" class="employee-row">
                <td class="employee-cell">
                  <div class="employee-info">
                    <q-avatar size="32px" class="employee-avatar">
                      <img :src="user.avatar" :alt="user.name" />
                    </q-avatar>
                    <div class="employee-details">
                      <div class="employee-name">{{ user.name }}</div>
                      <div class="employee-shifts">{{ getUserShiftCount(user.id) }} shifts</div>
                    </div>
                  </div>
                </td>
                <td v-for="(day, dayIdx) in days" :key="dayIdx" class="schedule-cell">
                  <draggable
                    :list="getShifts(user.id, dayIdx)"
                    :group="'shifts'"
                    class="shifts-list"
                    item-key="id"
                    @add="onAdd($event, user.id, dayIdx)"
                  >
                    <template #item="{ element }">
                      <div class="shift-item" @click="openEditModal(element)">
                        <div class="shift-time">
                          {{ element.time || `${element.startTime}-${element.endTime}` }}
                        </div>
                        <div class="shift-position">{{ element.position }}</div>
                        <q-btn
                          flat
                          dense
                          round
                          icon="close"
                          size="xs"
                          class="shift-delete"
                          @click.stop="deleteShift(element.id)"
                        />
                      </div>
                    </template>
                    <template #footer>
                      <div v-if="getShifts(user.id, dayIdx).length === 0" class="empty-cell">
                        <q-btn
                          flat
                          dense
                          size="sm"
                          label="Add"
                          @click="openQuickAddModal(user.id, dayIdx)"
                          class="add-shift-button"
                        />
                      </div>
                    </template>
                  </draggable>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Schedule Modal -->
    <q-dialog v-model="showAddModal" persistent class="schedule-dialog">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">Add New Schedule</div>
          <q-btn flat round dense icon="close" @click="closeAddModal" class="dialog-close" />
        </q-card-section>

        <q-card-section class="dialog-content">
          <q-form @submit="addSchedule" class="schedule-form">
            <div class="form-row">
              <q-select
                v-model="newSchedule.userId"
                :options="userOptions"
                option-value="value"
                option-label="label"
                label="Select Employee"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => !!val || 'Please select an employee']"
              />

              <q-select
                v-model="newSchedule.day"
                :options="dayOptions"
                option-value="value"
                option-label="label"
                label="Select Day"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => val !== null || 'Please select a day']"
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="newSchedule.startTime"
                label="Start Time"
                mask="##:##"
                placeholder="08:00"
                outlined
                class="form-field"
                :rules="[timeValidation]"
              />

              <q-input
                v-model="newSchedule.endTime"
                label="End Time"
                mask="##:##"
                placeholder="17:00"
                outlined
                class="form-field"
                :rules="[timeValidation, (val) => validateEndTime(val)]"
              />
            </div>

            <q-select
              v-model="newSchedule.position"
              :options="positionOptions"
              label="Position"
              outlined
              class="form-field full-width"
              :rules="[(val) => !!val || 'Please select a position']"
            />

            <q-banner v-if="addConflictWarning" class="conflict-banner">
              <template #avatar>
                <q-icon name="warning" />
              </template>
              Warning: This employee already has a shift on this day!
            </q-banner>

            <div class="dialog-actions">
              <q-btn flat label="Cancel" @click="closeAddModal" class="cancel-btn" />
              <q-btn
                type="submit"
                color="primary"
                label="Add Schedule"
                unelevated
                class="submit-btn"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Edit Schedule Modal -->
    <q-dialog v-model="showEditModal" persistent class="schedule-dialog">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">Edit Schedule</div>
          <q-btn flat round dense icon="close" @click="closeEditModal" class="dialog-close" />
        </q-card-section>

        <q-card-section class="dialog-content">
          <q-form @submit="updateSchedule" class="schedule-form">
            <div class="form-row">
              <q-select
                v-model="editingSchedule.userId"
                :options="userOptions"
                option-value="value"
                option-label="label"
                label="Select Employee"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => !!val || 'Please select an employee']"
              />

              <q-select
                v-model="editingSchedule.day"
                :options="dayOptions"
                option-value="value"
                option-label="label"
                label="Select Day"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => val !== null || 'Please select a day']"
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="editingSchedule.startTime"
                label="Start Time"
                mask="##:##"
                placeholder="08:00"
                outlined
                class="form-field"
                :rules="[timeValidation]"
              />

              <q-input
                v-model="editingSchedule.endTime"
                label="End Time"
                mask="##:##"
                placeholder="17:00"
                outlined
                class="form-field"
                :rules="[timeValidation, (val) => validateEndTime(val, editingSchedule.startTime)]"
              />
            </div>

            <q-select
              v-model="editingSchedule.position"
              :options="positionOptions"
              label="Position"
              outlined
              class="form-field full-width"
              :rules="[(val) => !!val || 'Please select a position']"
            />

            <q-banner v-if="editConflictWarning" class="conflict-banner">
              <template #avatar>
                <q-icon name="warning" />
              </template>
              Warning: This employee already has a shift on this day!
            </q-banner>

            <div class="dialog-actions">
              <q-btn flat label="Cancel" @click="closeEditModal" class="cancel-btn" />
              <q-btn
                type="submit"
                color="primary"
                label="Update Schedule"
                unelevated
                class="submit-btn"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Quick Add Modal -->
    <q-dialog v-model="showQuickAddModal" persistent class="schedule-dialog">
      <q-card class="dialog-card quick-add">
        <q-card-section class="dialog-header">
          <div class="dialog-title">Quick Add Shift</div>
          <q-btn flat round dense icon="close" @click="closeQuickAddModal" class="dialog-close" />
        </q-card-section>

        <q-card-section class="dialog-content">
          <div class="quick-info">
            <div class="info-row">
              <q-icon name="person" size="20px" />
              <span>{{ getEmployeeName(quickAdd.userId) }}</span>
            </div>
            <div class="info-row">
              <q-icon name="today" size="20px" />
              <span>{{ days[quickAdd.day] }}</span>
            </div>
          </div>

          <q-form @submit="quickAddSchedule" class="schedule-form">
            <div class="form-row">
              <q-input
                v-model="quickAdd.startTime"
                label="Start Time"
                mask="##:##"
                placeholder="08:00"
                outlined
                class="form-field"
                :rules="[timeValidation]"
              />

              <q-input
                v-model="quickAdd.endTime"
                label="End Time"
                mask="##:##"
                placeholder="17:00"
                outlined
                class="form-field"
                :rules="[timeValidation, (val) => validateEndTime(val, quickAdd.startTime)]"
              />
            </div>

            <q-select
              v-model="quickAdd.position"
              :options="positionOptions"
              label="Position"
              outlined
              class="form-field full-width"
              :rules="[(val) => !!val || 'Please select a position']"
            />

            <div class="dialog-actions">
              <q-btn flat label="Cancel" @click="closeQuickAddModal" class="cancel-btn" />
              <q-btn
                type="submit"
                color="primary"
                label="Add Shift"
                unelevated
                class="submit-btn"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import draggable from 'vuedraggable'

// --- State ---
const users = ref([]) // employees
const shifts = ref([]) // schedules
const positions = ref(['Cashier', 'Manager', 'Staff'])
const viewMode = ref('table')

const filters = ref({ position: 'All', employee: null })
const searchQuery = ref('')

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayOptions = days.map((d, i) => ({ label: d, value: i }))

const showAddModal = ref(false)
const showEditModal = ref(false)
const showQuickAddModal = ref(false)

const newSchedule = ref({ userId: null, day: null, startTime: '', endTime: '', position: '' })
const editingSchedule = ref({
  id: null,
  userId: null,
  day: null,
  startTime: '',
  endTime: '',
  position: '',
})
const quickAdd = ref({ userId: null, day: null, startTime: '', endTime: '', position: '' })

const addConflictWarning = ref(false)
const editConflictWarning = ref(false)

// --- Week helpers ---
const getWeekRange = (date = new Date()) => {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day // shift to Monday
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { start: monday, end: sunday }
}

const selectedWeek = ref(getWeekRange())

const nextWeek = () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() + 7)
  selectedWeek.value = getWeekRange(newStart)
  fetchData()
}

const prevWeek = () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() - 7)
  selectedWeek.value = getWeekRange(newStart)
  fetchData()
}

// --- Utilities ---
const isValidTime = (val) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val || '')
const timeValidation = (val) => isValidTime(val) || 'Please use HH:MM (24h)'

const validateEndTime = (val, start = null) => {
  if (!isValidTime(val)) return 'Invalid time'
  if (start && isValidTime(start)) {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = val.split(':').map(Number)
    if (eh < sh || (eh === sh && em <= sm)) return 'End must be after start'
  }
  return true
}

const mapDateToDayIdx = (dateStr) => {
  const jsDay = new Date(dateStr).getDay() // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1 // Mon=0 … Sun=6
}

// --- Summaries ---
const totalShifts = computed(() => shifts.value.length)
const activeEmployees = computed(() => new Set(shifts.value.map((s) => s.userId)).size)
const positionsCount = computed(() => new Set(shifts.value.map((s) => s.position)).size)
const weekHours = computed(() =>
  shifts.value.reduce((acc, s) => {
    if (!isValidTime(s.startTime) || !isValidTime(s.endTime)) return acc
    const [sh, sm] = s.startTime.split(':').map(Number)
    const [eh, em] = s.endTime.split(':').map(Number)
    const hours = eh + em / 60 - (sh + sm / 60)
    return acc + (hours > 0 ? hours : 0)
  }, 0),
)

// --- Options / filters ---
const userOptions = computed(() => users.value.map((u) => ({ label: u.name, value: u.id })))
const positionOptions = computed(() => positions.value.map((p) => ({ label: p, value: p })))

const filteredUsers = computed(() =>
  users.value.filter((u) => {
    const matchEmployee = !filters.value.employee || u.id === filters.value.employee
    const matchSearch = (u.name || '')
      .toLowerCase()
      .includes((searchQuery.value || '').toLowerCase())
    const matchPosition =
      filters.value.position === 'All' ||
      shifts.value.some((s) => s.userId === u.id && s.position === filters.value.position)
    return matchEmployee && matchSearch && matchPosition
  }),
)

// --- API ---
const fetchData = async () => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) {
      // Mock data for demo
      users.value = [
        { id: 1, name: 'John Doe', avatar: 'https://cdn.quasar.dev/img/avatar.png' },
        { id: 2, name: 'Jane Smith', avatar: 'https://cdn.quasar.dev/img/avatar2.png' },
        { id: 3, name: 'Bob Johnson', avatar: 'https://cdn.quasar.dev/img/avatar3.png' },
      ]
      shifts.value = [
        { id: 1, userId: 1, day: 0, startTime: '09:00', endTime: '17:00', position: 'Manager' },
        { id: 2, userId: 2, day: 0, startTime: '10:00', endTime: '18:00', position: 'Cashier' },
        { id: 3, userId: 1, day: 2, startTime: '08:00', endTime: '16:00', position: 'Manager' },
      ]
      return
    }

    const res = await axios.get(
      'https://staging.wageyapp.com/organization/schedules/company/monthly/?company={selectedCompany}/',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    const employeesData = res.data || []
    const { start, end } = selectedWeek.value

    users.value = employeesData.map((emp) => ({
      id: emp.employee.id,
      name: emp.employee.full_name,
      avatar: 'https://cdn.quasar.dev/img/avatar.png',
    }))

    shifts.value = employeesData.flatMap((emp) =>
      emp.schedules
        .filter((s) => {
          const d = new Date(s.date)
          return d >= start && d <= end
        })
        .map((s) => ({
          id: s.id,
          userId: emp.employee.id,
          day: mapDateToDayIdx(s.date),
          startTime: s.actual_start_time,
          endTime: s.actual_end_time,
          site: s.site_name,
          department: s.department_name,
          position: s.department_name,
        })),
    )
  } catch (e) {
    console.error('Error fetching schedules:', e)
    // Fallback to mock data
    users.value = [
      { id: 1, name: 'John Doe', avatar: 'https://cdn.quasar.dev/img/avatar.png' },
      { id: 2, name: 'Jane Smith', avatar: 'https://cdn.quasar.dev/img/avatar2.png' },
    ]
    shifts.value = []
  }
}

onMounted(fetchData)

// --- Helpers ---
const getShifts = (employeeId, dayIdx) =>
  shifts.value.filter((shift) => shift.userId === employeeId && shift.day === dayIdx)

const getDayShiftCount = (dayIdx) => shifts.value.filter((s) => s.day === dayIdx).length
const getUserShiftCount = (userId) => shifts.value.filter((s) => s.userId === userId).length
const getEmployeeName = (id) => users.value.find((u) => u.id === id)?.name || 'Unknown'

// --- Actions ---
const openAddModal = () => {
  newSchedule.value = { userId: null, day: null, startTime: '', endTime: '', position: '' }
  addConflictWarning.value = false
  showAddModal.value = true
}
const closeAddModal = () => (showAddModal.value = false)
const addSchedule = () => {
  const n = newSchedule.value
  if (!n.userId && n.userId !== 0) return
  if (n.day == null) return
  if (!isValidTime(n.startTime) || !isValidTime(n.endTime)) return
  const id = Date.now()
  shifts.value.push({ id, ...n })
  showAddModal.value = false
}

const openEditModal = (schedule) => {
  editingSchedule.value = { ...schedule }
  editConflictWarning.value = false
  showEditModal.value = true
}
const closeEditModal = () => (showEditModal.value = false)
const updateSchedule = () => {
  const es = editingSchedule.value
  const idx = shifts.value.findIndex((s) => s.id === es.id)
  if (idx !== -1) shifts.value[idx] = { ...es }
  showEditModal.value = false
}

const deleteShift = (id) => {
  shifts.value = shifts.value.filter((s) => s.id !== id)
}

const openQuickAddModal = (userId, dayIdx) => {
  quickAdd.value = { userId, day: dayIdx, startTime: '', endTime: '', position: '' }
  showQuickAddModal.value = true
}
const closeQuickAddModal = () => (showQuickAddModal.value = false)
const quickAddSchedule = () => {
  const q = quickAdd.value
  if (!q.userId && q.userId !== 0) return
  if (q.day == null) return
  if (!isValidTime(q.startTime) || !isValidTime(q.endTime)) return
  const id = Date.now()
  shifts.value.push({ id, ...q })
  showQuickAddModal.value = false
}

// --- Drag and drop ---
const onAdd = (event, userId, dayIdx) => {
  // Handle drag and drop functionality
  console.log('Shift moved', { event, userId, dayIdx })
}

// --- Filters / export ---
const applyFilters = () => {}
const exportSchedule = () => {
  console.log('Exporting schedule...', shifts.value)
}
</script>

<style scoped>
/* Base Styles - Matching Payroll Design */
.payroll-style-page {
  background: #f8fafc;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header Section */
.page-header {
  background: white;
  padding: 2rem 2rem 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 1rem;
  color: #718096;
  margin: 0;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.header-btn {
  height: 40px;
  padding: 0 1rem;
  border-radius: 6px;
  font-weight: 500;
  text-transform: none;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
}

.export-btn {
  background: #1a365d;
  color: white;
  border: 1px solid #1a365d;
}

/* Summary Cards Section */
.summary-section {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.summary-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.summary-card.purple {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.summary-card.yellow {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
}

.summary-card.green {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
}

.summary-card.blue {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
  border: none;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  line-height: 1;
}

.card-label {
  font-size: 0.875rem;
  opacity: 0.9;
  font-weight: 500;
}

/* Filter Section */
.filter-section {
  padding: 0 2rem 1.5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.filter-container {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.filter-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 1.5rem 0;
}

.filter-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-inputs {
  display: flex;
  gap: 1rem;
  flex: 1;
  flex-wrap: wrap;
}

.search-field {
  min-width: 250px;
}

.filter-field {
  min-width: 160px;
}

.view-controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.view-toggle {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.add-btn {
  background: #1a365d;
  color: white;
  height: 40px;
  padding: 0 1.5rem;
  border-radius: 6px;
}

/* Week Navigation */
.week-nav-section {
  padding: 0 2rem 1.5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.week-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.nav-btn {
  color: #4a5568;
}

.week-display {
  text-align: center;
  min-width: 200px;
}

.week-range {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
}

/* Content Section */
.content-section {
  padding: 0 2rem 2rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Cards View */
.cards-view {
  display: block;
}

.employee-cards {
  display: grid;
  gap: 1.5rem;
}

.employee-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.employee-card:hover {
  box-shadow: 0 8px 25px 0 rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.employee-header {
  background: #f7fafc;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.employee-avatar {
  border: 2px solid #e2e8f0;
}

.employee-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.25rem;
}

.employee-stats {
  font-size: 0.875rem;
  color: #718096;
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e2e8f0;
  padding: 1px;
}

.day-column {
  background: white;
  min-height: 120px;
}

.day-header {
  background: #f7fafc;
  padding: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #4a5568;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e2e8f0;
}

.day-shifts {
  padding: 0.75rem;
  min-height: 80px;
}

.empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 60px;
}

.add-shift-btn {
  color: #718096;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border: 1px dashed #cbd5e0;
  border-radius: 4px;
}

.add-shift-btn:hover {
  color: #1a365d;
  border-color: #1a365d;
  background: #f7fafc;
}

.shift-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.shift-card {
  background: #1a365d;
  color: white;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.shift-card:hover {
  background: #2c5282;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.shift-time {
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
}

.shift-position {
  font-size: 0.7rem;
  opacity: 0.9;
}

.shift-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  background: white;
  color: #e53e3e;
  width: 20px;
  height: 20px;
  min-height: 20px;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.shift-card:hover .shift-remove {
  opacity: 1;
}

/* Table View */
.table-view {
  display: block;
}

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.05);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table thead {
  background: #f7fafc;
  border-bottom: 2px solid #e2e8f0;
}

.data-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #4a5568;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-right: 1px solid #e2e8f0;
}

.data-table th:last-child {
  border-right: none;
}

.employee-col {
  width: 200px;
  min-width: 200px;
}

.day-col {
  text-align: center !important;
  width: 140px;
  min-width: 140px;
}

.day-header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.day-name {
  font-weight: 600;
  color: #2d3748;
}

.day-count {
  font-size: 0.625rem;
  color: #718096;
  font-weight: 400;
  text-transform: none;
}

.employee-row {
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.15s ease;
}

.employee-row:hover {
  background: #f7fafc;
}

.employee-row:last-child {
  border-bottom: none;
}

.employee-cell {
  padding: 1rem;
  border-right: 1px solid #e2e8f0;
}

.employee-details {
  margin-left: 0.75rem;
}

.employee-shifts {
  font-size: 0.75rem;
  color: #718096;
  margin-top: 0.125rem;
}

.schedule-cell {
  padding: 0.75rem;
  border-right: 1px solid #e2e8f0;
  vertical-align: top;
  min-height: 80px;
}

.schedule-cell:last-child {
  border-right: none;
}

.shifts-list {
  min-height: 60px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.shift-item {
  background: #1a365d;
  color: white;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.75rem;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.shift-item:hover {
  background: #2c5282;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.shift-delete {
  position: absolute;
  top: -8px;
  right: -8px;
  background: white;
  color: #e53e3e;
  width: 18px;
  height: 18px;
  min-height: 18px;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.shift-item:hover .shift-delete {
  opacity: 1;
}

.empty-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  border: 1px dashed #cbd5e0;
  border-radius: 6px;
}

.add-shift-button {
  color: #718096;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.add-shift-button:hover {
  color: #1a365d;
  background: #f7fafc;
}

/* Dialog Styles */
.schedule-dialog .q-dialog__inner {
  padding: 1rem;
}

.dialog-card {
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 0;
  max-width: 500px;
  width: 100%;
}

.dialog-header {
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
}

.dialog-close {
  color: #718096;
}

.dialog-content {
  padding: 1.5rem;
}

.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  border-radius: 8px;
}

.full-width {
  grid-column: 1 / -1;
}

.conflict-banner {
  background: #fef5e7;
  color: #c05621;
  border: 1px solid #f6ad55;
  border-radius: 8px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.cancel-btn {
  color: #718096;
}

.submit-btn {
  background: #1a365d;
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
}

.quick-add {
  max-width: 400px;
}

.quick-info {
  background: #f7fafc;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #2d3748;
  font-size: 0.875rem;
  font-weight: 500;
}

.info-row .q-icon {
  color: #2563eb;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .header-content,
  .summary-section,
  .filter-section,
  .week-nav-section,
  .content-section {
    max-width: 100%;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (max-width: 992px) {
  .schedule-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .day-column:nth-child(n + 5) {
    margin-top: 1px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    text-align: center;
  }

  .filter-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }

  .filter-inputs {
    flex-direction: column;
    width: 100%;
  }

  .search-field,
  .filter-field {
    min-width: 100%;
  }

  .view-controls {
    justify-content: center;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .schedule-grid {
    grid-template-columns: 1fr;
  }

  .day-column {
    border-bottom: 1px solid #e2e8f0;
  }

  .day-column:last-child {
    border-bottom: none;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-header,
  .summary-section,
  .filter-section,
  .week-nav-section,
  .content-section {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .dialog-card {
    margin: 0.5rem;
    max-width: calc(100vw - 1rem);
  }

  .page-title {
    font-size: 1.5rem;
  }
}

/* Drag and Drop States */
.sortable-chosen {
  opacity: 0.6;
}

.sortable-ghost {
  opacity: 0.3;
  background: #bee3f8 !important;
}

/* Print Styles */
@media print {
  .header-actions,
  .filter-section,
  .week-nav-section,
  .view-controls,
  .dialog-close,
  .shift-delete,
  .shift-remove,
  .add-shift-btn,
  .add-shift-button {
    display: none !important;
  }

  .payroll-style-page {
    background: white;
  }

  .employee-card,
  .table-container {
    border: 1px solid #000;
    box-shadow: none;
  }

  .shift-card,
  .shift-item {
    background: #f7fafc !important;
    color: #000 !important;
    border: 1px solid #000;
  }
}
</style>
