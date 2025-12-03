<template>
  <q-page class="modern-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">Schedule</h1>
          <div class="timezone-badge">
            <q-icon name="schedule" size="16px" />
            <span>{{ userTimezone }}</span>
          </div>
        </div>

        <div class="header-actions">
          <!-- Search Input -->
          <q-input
            v-model="searchTerm"
            placeholder="Search employees..."
            outlined
            dense
            class="search-input"
            debounce="300"
            @update:model-value="filterEmployees"
          >
            <template #prepend>
              <q-icon name="search" size="20px" />
            </template>
          </q-input>

          <!-- Add Employee Button -->
          <q-btn
            v-if="true"
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

    <!-- Summary Cards Section -->
    <div class="summary-section">
      <div class="summary-grid">
        <div class="summary-card card-purple">
          <div class="card-icon">
            <q-icon name="groups" size="32px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ activeEmployees }}</div>
            <div class="card-label">Total Employees</div>
          </div>
        </div>

        <div class="summary-card card-yellow">
          <div class="card-icon">
            <q-icon name="event" size="32px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ totalShifts }}</div>
            <div class="card-label">Active</div>
          </div>
        </div>

        <div class="summary-card card-pink">
          <div class="card-icon">
            <q-icon name="schedule" size="32px" />
          </div>
          <div class="card-content">
            <div class="card-value">{{ positionsCount }}</div>
            <div class="card-label">Positions Filled</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter and Controls Section -->
    <div class="controls-section">
      <h2 class="section-title">Schedule Overview</h2>
      <div class="controls-row">
        <div class="filter-group">
          <q-select
            v-model="filters.position"
            :options="positionFilterOptions"
            label="Position"
            outlined
            dense
            class="filter-select"
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
            class="filter-select"
            clearable
            emit-value
            map-options
            @update:model-value="applyFilters"
          />
        </div>
        <div class="week-nav">
          <q-btn flat round icon="chevron_left" @click="prevWeek" class="nav-btn" size="sm" />
          <div class="week-display">
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
          <q-btn flat round icon="chevron_right" @click="nextWeek" class="nav-btn" size="sm" />
        </div>
        <q-select
          v-model="viewMode"
          :options="[
            { label: 'Table View', value: 'table' },
            { label: 'Card View', value: 'cards' },
          ]"
          outlined
          dense
          emit-value
          map-options
          class="view-select"
          label="Sort by"
        />
      </div>
    </div>

    <!-- Schedule Content -->
    <div class="content-section">
      <!-- Desktop Table View -->
      <div v-if="viewMode === 'table' && !$q.screen.lt.lg" class="table-view">
        <div class="table-wrapper">
          <table class="schedule-table">
            <thead>
              <tr>
                <th class="employee-col">Employee</th>
                <th v-for="(day, i) in days" :key="i" class="day-col">
                  {{ day }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id" class="table-row">
                <td class="employee-cell">
                  <div class="employee-info">
                    <q-avatar
                      size="32px"
                      class="employee-avatar"
                      :style="{ backgroundColor: getAvatarColor(user.name) }"
                    >
                      <span class="avatar-text">{{ getInitials(user.name) }}</span>
                    </q-avatar>
                    <span class="employee-name">{{ user.name }}</span>
                  </div>
                </td>
                <td v-for="(day, dayIdx) in days" :key="dayIdx" class="schedule-cell">
                  <div class="shifts-wrapper">
                    <div
                      v-for="element in getShifts(user.id, dayIdx)"
                      :key="element.id"
                      class="shift-badge"
                    >
                      <div class="shift-time">
                        {{ formatTimeWithTimezone(element.startTime) }} - {{ element.endTime }}
                      </div>
                      <div class="shift-position">{{ getPositionName(element.position) }}</div>
                      <div class="shift-actions">
                        <q-btn
                          flat
                          dense
                          round
                          icon="visibility"
                          size="xs"
                          class="action-btn view-btn"
                          @click="openEditModal(element)"
                        />
                        <q-btn
                          flat
                          dense
                          round
                          icon="edit"
                          size="xs"
                          class="action-btn edit-btn"
                          @click="openEditModal(element)"
                        />
                        <q-btn
                          flat
                          dense
                          round
                          icon="close"
                          size="xs"
                          class="action-btn delete-btn"
                          @click.stop="deleteShift(element.id)"
                        />
                      </div>
                    </div>
                    <q-btn
                      v-if="getShifts(user.id, dayIdx).length === 0"
                      flat
                      dense
                      size="sm"
                      label="+ Add"
                      @click="openQuickAddModal(user.id, dayIdx)"
                      class="add-shift-btn"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile/Cards View -->
      <div v-else class="cards-view">
        <div class="employee-cards">
          <div v-for="user in filteredUsers" :key="user.id" class="employee-card">
            <div class="card-header">
              <div class="employee-info">
                <q-avatar
                  size="40px"
                  class="employee-avatar"
                  :style="{ backgroundColor: getAvatarColor(user.name) }"
                >
                  <span class="avatar-text">{{ getInitials(user.name) }}</span>
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
                <div class="day-content">
                  <div v-if="getShifts(user.id, dayIdx).length === 0" class="empty-slot">
                    <q-btn
                      flat
                      dense
                      size="sm"
                      label="Add"
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
                      <div class="shift-position">{{ getPositionName(shift.position) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Schedule Modal -->
    <q-dialog v-model="showAddModal" persistent>
      <q-card class="modal-card">
        <q-card-section class="modal-header">
          <div class="modal-title">Add New Schedule</div>
          <q-btn flat round dense icon="close" @click="closeAddModal" />
        </q-card-section>

        <q-card-section class="modal-body">
          <q-form @submit="addSchedule" class="schedule-form">
            <!-- Schedule Type Selection -->
            <q-select
              v-model="newSchedule.scheduleType"
              :options="[
                { label: 'One-Time Schedule', value: 'one-time' },
                { label: 'Recurring Schedule', value: 'recurring' },
              ]"
              option-value="value"
              option-label="label"
              label="Schedule Type"
              outlined
              emit-value
              map-options
              class="form-field full-width"
            >
              <template #hint>
                Choose whether this is a single schedule or repeats weekly
              </template>
            </q-select>

            <!-- Employee & Day Selection -->
            <div class="form-row">
              <!-- NEW CODE -->
              <q-select
                v-model="newSchedule.userId"
                :options="employeeOptions"
                option-value="value"
                option-label="label"
                label="Select Employee"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => !!val || 'Employee is required']"
                :loading="loadingEmployees"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey"> No employees available </q-item-section>
                  </q-item>
                </template>
              </q-select>

              <q-input
                v-if="newSchedule.scheduleType === 'one-time'"
                v-model="newSchedule.selectedDate"
                label="Select Date"
                outlined
                class="form-field"
                :rules="[(val) => !!val || 'Date is required']"
                readonly
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date
                        v-model="newSchedule.selectedDate"
                        mask="YYYY-MM-DD"
                        :options="(date) => date >= new Date().toISOString().split('T')[0]"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>

            <!-- For Recurring: Weekday Selection -->
            <q-select
              v-if="newSchedule.scheduleType === 'recurring'"
              v-model="newSchedule.weekdays"
              :options="weekdayOptions"
              option-value="value"
              option-label="label"
              label="Repeat On"
              outlined
              multiple
              emit-value
              map-options
              class="form-field full-width"
              :rules="[(val) => val?.length > 0 || 'Select at least one day']"
            >
              <template #hint> Select which days this schedule repeats </template>
            </q-select>

            <!-- Recurring Template Selection (Optional) -->
            <q-select
              v-model="newSchedule.recurringSchedule"
              :options="recurringScheduleOptions"
              option-value="value"
              option-label="label"
              label="Use Recurring Template (Optional)"
              outlined
              emit-value
              map-options
              class="form-field full-width"
              clearable
              @update:model-value="onRecurringTemplateChange"
            >
              <template #hint> Select a template to auto-fill schedule details </template>
            </q-select>

            <!-- Site & Department -->
            <div class="form-row">
              <q-select
                v-model="newSchedule.site"
                :options="siteOptions"
                option-value="value"
                option-label="label"
                label="Select Site"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => !!val || 'Site is required']"
              />

              <q-select
                v-model="newSchedule.department"
                :options="departmentOptions"
                option-value="value"
                option-label="label"
                label="Department"
                outlined
                emit-value
                map-options
                class="form-field"
                clearable
              />
            </div>

            <!-- Shift Type / Position -->
            <q-select
              v-model="newSchedule.position"
              :options="positionOptions"
              option-value="value"
              option-label="label"
              label="Shift Type / Position"
              outlined
              emit-value
              map-options
              class="form-field full-width"
              :rules="[(val) => !!val || 'Shift type is required']"
            />

            <!-- Repeat Interval (for recurring) -->
            <q-input
              v-if="newSchedule.scheduleType === 'recurring'"
              v-model.number="newSchedule.repeatInterval"
              label="Repeat Every (weeks)"
              type="number"
              outlined
              min="1"
              class="form-field full-width"
            >
              <template #hint> 1 = every week, 2 = every other week, etc. </template>
            </q-input>

            <!-- Rotating Schedule Options -->
            <q-checkbox
              v-if="newSchedule.scheduleType === 'recurring'"
              v-model="newSchedule.isRotating"
              label="This is a rotating schedule"
              class="full-width"
            />

            <!-- Conflict Warning -->
            <q-banner v-if="addConflictWarning" class="warning-banner">
              <template #avatar>
                <q-icon name="warning" />
              </template>
              <strong>Schedule Conflict Detected!</strong><br />
              This employee already has a schedule on the selected date/time.
            </q-banner>

            <!-- Actions -->
            <div class="modal-actions">
              <q-btn flat label="Cancel" @click="closeAddModal" class="cancel-btn" />
              <q-btn
                type="submit"
                color="primary"
                :label="
                  newSchedule.scheduleType === 'recurring'
                    ? 'Create Recurring Schedule'
                    : 'Add Schedule'
                "
                unelevated
                class="submit-btn"
                :loading="isCheckingConflict"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Edit Schedule Modal -->
    <q-dialog v-model="showEditModal" persistent>
      <q-card class="modal-card">
        <q-card-section class="modal-header">
          <div class="modal-title">Edit Schedule</div>
          <q-btn flat round dense icon="close" @click="closeEditModal" />
        </q-card-section>

        <q-card-section class="modal-body">
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
              <q-select
                v-model="editingSchedule.site"
                :options="siteOptions"
                option-value="value"
                option-label="label"
                label="Select Site"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => !!val || 'Please select a site']"
              />

              <q-select
                v-model="editingSchedule.department"
                :options="departmentOptions"
                option-value="value"
                option-label="label"
                label="Select Department"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => !!val || 'Please select a department']"
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
              >
                <template #append>
                  <q-icon name="access_time" />
                </template>
                <template #hint> {{ userTimezone }} ({{ getTimezoneAbbreviation() }}) </template>
              </q-input>

              <q-input
                v-model="editingSchedule.endTime"
                label="End Time"
                mask="##:##"
                placeholder="17:00"
                outlined
                class="form-field"
                :rules="[timeValidation, (val) => validateEndTime(val, editingSchedule.startTime)]"
              >
                <template #append>
                  <q-icon name="access_time" />
                </template>
                <template #hint> {{ userTimezone }} ({{ getTimezoneAbbreviation() }}) </template>
              </q-input>
            </div>

            <q-select
              v-model="editingSchedule.position"
              :options="positionOptions"
              option-value="value"
              option-label="label"
              label="Position"
              outlined
              emit-value
              map-options
              class="form-field full-width"
              :rules="[(val) => !!val || 'Please select a position']"
            />

            <q-banner v-if="editConflictWarning" class="warning-banner">
              <template #avatar>
                <q-icon name="warning" />
              </template>
              Warning: This employee already has a shift on this day!
            </q-banner>

            <div class="modal-actions">
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
    <q-dialog v-model="showQuickAddModal" persistent>
      <q-card class="modal-card">
        <q-card-section class="modal-header">
          <div class="modal-title">Quick Add Shift</div>
          <q-btn flat round dense icon="close" @click="closeQuickAddModal" />
        </q-card-section>

        <q-card-section class="modal-body">
          <div class="quick-info">
            <div class="info-item">
              <q-icon name="person" size="20px" />
              <span>{{ getEmployeeName(quickAdd.userId) }}</span>
            </div>
            <div class="info-item">
              <q-icon name="today" size="20px" />
              <span>{{ days[quickAdd.day] }}</span>
            </div>
          </div>

          <q-form @submit="quickAddSchedule" class="schedule-form">
            <q-select
              v-model="quickAdd.site"
              :options="siteOptions"
              option-value="value"
              option-label="label"
              label="Select Site"
              outlined
              emit-value
              map-options
              class="form-field full-width"
              :rules="[(val) => !!val || 'Site is required']"
            />

            <q-select
              v-model="quickAdd.shiftType"
              :options="shiftTypeOptions"
              option-value="value"
              option-label="label"
              label="Shift Type"
              outlined
              emit-value
              map-options
              class="form-field full-width"
              :rules="[(val) => !!val || 'Shift type is required']"
            >
              <template #hint> Select the type of shift for this schedule </template>
            </q-select>

            <div class="modal-actions">
              <q-btn flat label="Cancel" @click="closeQuickAddModal" class="cancel-btn" />
              <q-btn
                type="submit"
                color="primary"
                label="Add Shift"
                unelevated
                class="submit-btn"
                :loading="isAddingShift"
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
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()

// State
const users = ref([])
const shifts = ref([])
const shiftTypes = ref([])
const sites = ref([])
const departments = ref([])
const employees = ref([])
const loadingEmployees = ref(false)

const recurringSchedules = ref([])
const userTimezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone)

const viewMode = ref('table')
const filters = ref({ position: 'All', employee: null })
const searchTerm = ref('')

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayOptions = days.map((d, i) => ({ label: d, value: i }))

const showAddModal = ref(false)
const showEditModal = ref(false)
const showQuickAddModal = ref(false)
const isCheckingConflict = ref(false)
const isAddingShift = ref(false)

// NEW CODE
const newSchedule = ref({
  userId: null,
  selectedDate: null, // Changed from 'day' to 'selectedDate'
  startTime: '',
  endTime: '',
  position: null,
  site: null,
  department: null,
  recurringSchedule: null,
  scheduleType: 'one-time',
  isRotating: false,
  rotationShifts: [],
  weekdays: [],
  repeatInterval: 1,
})

const weekdayOptions = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
]

const editingSchedule = ref({
  id: null,
  userId: null,
  day: null,
  startTime: '',
  endTime: '',
  position: '',
  site: null,
  department: null,
  contractType: null,
  recurringSchedule: null,
  isRecurring: false,
})

const quickAdd = ref({
  userId: null,
  day: null,
  site: null,
  shiftType: null,
})

const addConflictWarning = ref(false)
const editConflictWarning = ref(false)

// Week helpers
const getWeekRange = (date = new Date()) => {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
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
  console.log('📅 Moving to next week:', selectedWeek.value.start.toISOString().split('T')[0])
  fetchData()
}

const prevWeek = () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() - 7)
  selectedWeek.value = getWeekRange(newStart)
  console.log('📅 Moving to previous week:', selectedWeek.value.start.toISOString().split('T')[0])
  fetchData()
}

// Utilities
const getTimezoneAbbreviation = () => {
  const date = new Date()
  const shortFormat = date.toLocaleTimeString('en-US', { timeZoneName: 'short' })
  const match = shortFormat.match(/\b[A-Z]{3,4}\b/)
  return match ? match[0] : ''
}

const formatTimeWithTimezone = (time) => {
  if (!time) return ''
  const abbr = getTimezoneAbbreviation()
  return abbr ? `${time} ${abbr}` : time
}

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

//*const mapDateToDayIdx = (dateStr) => {
//const jsDay = new Date(dateStr).getDay()
//return jsDay === 0 ? 6 : jsDay - 1
//}

const getPositionName = (positionId) => {
  const position = shiftTypes.value.find((p) => p.id === positionId)
  return position?.name || positionId
}

const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

const getAvatarColor = (name) => {
  const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

// Summaries
const totalShifts = computed(() => shifts.value.length)
const activeEmployees = computed(() => new Set(shifts.value.map((s) => s.userId)).size)
const positionsCount = computed(() => new Set(shifts.value.map((s) => s.position)).size)
const positionFilterOptions = computed(() => {
  if (!shiftTypes.value || shiftTypes.value.length === 0) {
    return ['All']
  }
  return ['All', ...shiftTypes.value.map((p) => p.name)]
})
// Options
// NEW CODE
const userOptions = computed(() => users.value.map((u) => ({ label: u.name, value: u.id })))

const employeeOptions = computed(() =>
  employees.value.map((emp) => ({
    label: emp.full_name || emp.name,
    value: emp.id,
  })),
)

const shiftTypeOptions = computed(() =>
  shiftTypes.value.map((st) => ({
    label: st.name,
    value: st.id,
  })),
)

const positionOptions = computed(() =>
  shiftTypes.value.map((p) => ({ label: p.name, value: p.id })),
)

const siteOptions = computed(() =>
  sites.value.map((s) => ({
    label: s.name,
    value: s.id,
  })),
)

const departmentOptions = computed(() =>
  departments.value.map((d) => ({
    label: d.name,
    value: d.id,
  })),
)

const recurringScheduleOptions = computed(() =>
  recurringSchedules.value.map((r) => ({ label: r.name, value: r.id })),
)

const filteredUsers = computed(() =>
  users.value.filter((u) => {
    const matchEmployee = !filters.value.employee || u.id === filters.value.employee
    const matchSearch = (u.name || '')
      .toLowerCase()
      .includes((searchTerm.value || '').toLowerCase())
    const matchPosition =
      filters.value.position === 'All' ||
      shifts.value.some((s) => s.userId === u.id && s.position === filters.value.position)
    return matchEmployee && matchSearch && matchPosition
  }),
)

// When recurring schedule template is selected, populate times
// When recurring schedule template is selected, populate times - ENHANCED VERSION
const onRecurringTemplateChange = (templateId) => {
  if (!templateId) {
    // Reset fields when template is cleared
    newSchedule.value.startTime = ''
    newSchedule.value.endTime = ''
    quickAdd.value.startTime = ''
    quickAdd.value.endTime = ''
    return
  }

  const template = recurringSchedules.value.find((r) => r.id === templateId)
  if (!template) {
    console.warn('Template not found:', templateId)
    return
  }

  console.log('Selected recurring template:', template)

  // Auto-fill start time
  if (template.start_time) {
    try {
      const startTime =
        typeof template.start_time === 'string'
          ? template.start_time.substring(0, 5)
          : template.start_time
      newSchedule.value.startTime = startTime
      quickAdd.value.startTime = startTime
    } catch (e) {
      console.error('Error parsing start_time:', e)
    }
  }

  // Auto-fill end time
  if (template.end_time) {
    try {
      const endTime =
        typeof template.end_time === 'string'
          ? template.end_time.substring(0, 5)
          : template.end_time
      newSchedule.value.endTime = endTime
      quickAdd.value.endTime = endTime
    } catch (e) {
      console.error('Error parsing end_time:', e)
    }
  }

  // Auto-fill shift type/position
  if (template.shift_type) {
    newSchedule.value.position = template.shift_type
    quickAdd.value.position = template.shift_type
  }

  // Auto-fill weekdays
  if (template.weekdays) {
    try {
      newSchedule.value.weekdays = parseWeekdays(template.weekdays)
    } catch (e) {
      console.error('Error parsing weekdays:', e)
      newSchedule.value.weekdays = []
    }
  }

  // Set rotating flag
  if (template.is_rotating !== undefined) {
    newSchedule.value.isRotating = template.is_rotating
  }

  // Auto-fill site if available
  if (template.site) {
    newSchedule.value.site = template.site
    quickAdd.value.site = template.site
  }

  // Auto-fill department if available
  if (template.department) {
    newSchedule.value.department = template.department
    quickAdd.value.department = template.department
  }

  $q.notify({
    type: 'info',
    message: 'Template loaded successfully',
    timeout: 2000,
  })
}

// Parse weekdays from API format
// Parse weekdays from API format - FIXED VERSION
const parseWeekdays = (weekdaysStr) => {
  if (!weekdaysStr) return []

  // If it's already an array, return it
  if (Array.isArray(weekdaysStr)) {
    return weekdaysStr.map((d) => d.toString().trim().toLowerCase())
  }

  // If it's a string, split it
  if (typeof weekdaysStr === 'string') {
    return weekdaysStr.split(',').map((d) => d.trim().toLowerCase())
  }

  // If it's a number or other type, convert to string first
  return weekdaysStr
    .toString()
    .split(',')
    .map((d) => d.trim().toLowerCase())
}

// API functions
const fetchSitesAndDepartments = async () => {
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!token || !companyId) {
      // Fallback mock data
      sites.value = [
        { id: 1, name: 'Main Office' },
        { id: 2, name: 'Branch 1' },
      ]
      departments.value = [
        { id: 1, name: 'Sales' },
        { id: 2, name: 'Operations' },
      ]
      shiftTypes.value = [
        {
          id: 1,
          name: 'Morning Shift',
          default_start_time: '08:00:00',
          default_end_time: '17:00:00',
        },
        {
          id: 2,
          name: 'Night Shift',
          default_start_time: '21:00:00',
          default_end_time: '06:00:00',
        },
      ]
      return
    }

    const [sitesRes, deptsRes, shiftTypesRes] = await Promise.all([
      axios.get(`https://staging.wageyapp.com/organization/sites/?company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`https://staging.wageyapp.com/organization/departments/?company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`https://staging.wageyapp.com/organization/shift-types/?company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    sites.value = sitesRes.data.results || sitesRes.data || []
    departments.value = deptsRes.data.results || deptsRes.data || []
    shiftTypes.value = shiftTypesRes.data.results || shiftTypesRes.data || []

    console.log('✅ Data loaded:', {
      sites: sites.value.length,
      departments: departments.value.length,
      shiftTypes: shiftTypes.value.length,
    })
  } catch (error) {
    console.error('❌ Failed to fetch data:', error.response?.data || error.message)

    // Fallback data
    sites.value = [{ id: 1, name: 'Main Office' }]
    departments.value = [{ id: 1, name: 'Sales' }]
    shiftTypes.value = [{ id: 1, name: 'Morning Shift' }]

    $q.notify({
      type: 'warning',
      message: 'Using fallback data. Some features may be limited.',
      timeout: 3000,
    })
  }
}

const fetchEmployees = async () => {
  try {
    const token = localStorage.getItem('access_token')
    let storedCompany = localStorage.getItem('selectedCompany')
    let companyId = null

    try {
      const parsed = JSON.parse(storedCompany)
      companyId = parsed?.id || parsed
    } catch {
      companyId = storedCompany
    }

    if (!token || !companyId) {
      $q.notify({
        type: 'negative',
        message: 'Missing token or company ID.',
        position: 'top',
      })
      return
    }

    loadingEmployees.value = true
    const response = await axios.get(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    console.log('=== EMPLOYEES FETCHED ===')
    console.log('Total employees from API:', response.data.length)
    console.log('Sample employee structure:', JSON.stringify(response.data[0], null, 2))
    console.log('Company ID we are filtering for:', companyId)

    // ✅ FIXED: Since the API endpoint is /companies/{companyId}/employees/
    // All returned employees are already linked to this company
    // No need to filter - trust the API endpoint
    employees.value = response.data || []

    console.log('✅ All employees loaded (already filtered by API):', employees.value.length)
  } catch (error) {
    console.error('Error fetching employees:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to fetch employees',
      position: 'top',
    })
  } finally {
    loadingEmployees.value = false
  }
}

const fetchData = async () => {
  try {
    const token = localStorage.getItem('access_token')
    let companyId = localStorage.getItem('selectedCompany')

    // Normalize company ID
    try {
      const parsed = JSON.parse(companyId)
      companyId = parsed?.id || parsed
    } catch {
      // Already a string/number
    }

    if (!token) {
      console.error('❌ No token found')
      return
    }

    if (!companyId) {
      console.error('❌ No company selected')
      return
    }

    console.log('🔄 Fetching schedules...')
    console.log('📍 Company ID:', companyId)
    console.log('📅 Selected Week:', {
      start: selectedWeek.value.start.toISOString().split('T')[0],
      end: selectedWeek.value.end.toISOString().split('T')[0],
    })

    // ✅ USE DIRECT ENDPOINT INSTEAD
    const url = `https://staging.wageyapp.com/organization/schedules/?company=${companyId}`
    console.log('🌐 API URL:', url)

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    console.log('✅ API Response received')
    console.log('📥 Response type:', typeof res.data)

    // Clear existing data
    users.value = []
    shifts.value = []

    // ✅ HANDLE: Response might be array or object with results
    let schedules = []

    if (Array.isArray(res.data)) {
      schedules = res.data
      console.log('📦 Direct array response, length:', schedules.length)
    } else if (res.data?.results && Array.isArray(res.data.results)) {
      schedules = res.data.results
      console.log('📦 Paginated response, length:', schedules.length)
    } else {
      console.error('❌ Unexpected response structure:', res.data)
      return
    }

    if (schedules.length === 0) {
      console.warn('⚠️ No schedules found')
      $q.notify({
        type: 'info',
        message: 'No schedules found. Create your first schedule!',
        timeout: 3000,
        actions: [{ label: 'Add Schedule', color: 'white', handler: () => openAddModal() }],
      })
      return
    }

    console.log('📊 Processing', schedules.length, 'schedules')
    console.log('🔍 Sample schedule:', JSON.stringify(schedules[0], null, 2))

    // ✅ BUILD: Map of employee IDs we need to fetch names for
    const employeeIdsInSchedules = new Set()

    schedules.forEach((schedule) => {
      // Extract employee ID from schedule name (format: "Name - ShiftType - Date")
      const namePart = schedule.name?.split(' - ')[0]
      if (namePart) {
        // Find matching employee from employees list
        const matchingEmployee = employees.value.find(
          (emp) =>
            emp.full_name === namePart ||
            emp.full_name?.includes(namePart) ||
            namePart.includes(emp.full_name || ''),
        )
        if (matchingEmployee) {
          employeeIdsInSchedules.add(matchingEmployee.id)
        }
      }
    })

    console.log('👥 Found', employeeIdsInSchedules.size, 'unique employees in schedules')

    // ✅ Add employees to users list
    employeeIdsInSchedules.forEach((empId) => {
      const employee = employees.value.find((e) => e.id === empId)
      if (employee && !users.value.find((u) => u.id === employee.id)) {
        users.value.push({
          id: employee.id,
          name:
            employee.full_name ||
            employee.user?.first_name + ' ' + employee.user?.last_name ||
            'Employee',
          email: employee.user?.email || '',
        })
      }
    })

    // ✅ PROCESS: Each schedule and match to employee
    let totalSchedules = 0

    schedules.forEach((schedule, index) => {
      try {
        // Parse schedule date
        if (!schedule.date) {
          console.warn(`⚠️ Schedule ${index} has no date`)
          return
        }

        const scheduleDate = new Date(schedule.date)
        const weekStart = new Date(selectedWeek.value.start)
        const timeDiff = scheduleDate.getTime() - weekStart.getTime()
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

        // Only include schedules within selected week
        if (daysDiff < 0 || daysDiff >= 7) {
          return // Skip schedules outside selected week
        }

        // ✅ MATCH: Find employee for this schedule
        const namePart = schedule.name?.split(' - ')[0]
        const matchingEmployee = employees.value.find(
          (emp) =>
            emp.full_name === namePart ||
            emp.full_name?.includes(namePart) ||
            namePart?.includes(emp.full_name || ''),
        )

        if (!matchingEmployee) {
          console.warn(`⚠️ Could not find employee for schedule: ${schedule.name}`)
          return
        }

        // Get shift type name
        const shiftType = shiftTypes.value.find((st) => st.id === schedule.shift_type)
        const positionName = shiftType?.name || 'Shift'

        // Add to shifts array
        const shift = {
          id: schedule.id,
          userId: matchingEmployee.id,
          day: daysDiff,
          startTime: schedule.start_time ? schedule.start_time.substring(0, 5) : '09:00',
          endTime: schedule.end_time ? schedule.end_time.substring(0, 5) : '17:00',
          position: positionName,
          site: schedule.site || null,
          department: schedule.department || null,
          status: schedule.status || 'draft',
          date: schedule.date,
        }

        shifts.value.push(shift)
        totalSchedules++
      } catch (err) {
        console.error('❌ Error processing schedule:', err)
      }
    })

    console.log('\n=== FINAL RESULTS ===')
    console.log('👥 Users loaded:', users.value.length)
    console.log('📋 Shifts loaded:', shifts.value.length)
    console.log('📊 Shifts by day:', {
      Mon: shifts.value.filter((s) => s.day === 0).length,
      Tue: shifts.value.filter((s) => s.day === 1).length,
      Wed: shifts.value.filter((s) => s.day === 2).length,
      Thu: shifts.value.filter((s) => s.day === 3).length,
      Fri: shifts.value.filter((s) => s.day === 4).length,
      Sat: shifts.value.filter((s) => s.day === 5).length,
      Sun: shifts.value.filter((s) => s.day === 6).length,
    })

    if (totalSchedules === 0) {
      $q.notify({
        type: 'info',
        message: 'No schedules found for the selected week. Try changing the week.',
        timeout: 4000,
      })
    } else {
      $q.notify({
        type: 'positive',
        message: `Loaded ${totalSchedules} schedules for this week`,
        timeout: 2000,
      })
    }
  } catch (e) {
    console.error('❌ FETCH ERROR:', e)
    console.error('❌ Response:', e.response?.data)

    $q.notify({
      type: 'negative',
      message: `Failed to load schedules: ${e.message}`,
      timeout: 5000,
    })
  }
}

onMounted(() => {
  fetchSitesAndDepartments()
  fetchEmployees()
  fetchData()
})

// Check if employee has any schedule on a specific date
const checkEmployeeScheduleOnDate = async (employeeId, dateStr) => {
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!token || !companyId) {
      return shifts.value.some((s) => {
        if (s.userId !== employeeId) return false
        const { start } = selectedWeek.value
        const shiftDate = new Date(start)
        shiftDate.setDate(start.getDate() + s.day)
        const shiftDateStr = shiftDate.toISOString().split('T')[0]
        return shiftDateStr === dateStr
      })
    }

    const response = await axios.get(
      `https://staging.wageyapp.com/organization/schedules/company/monthly/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    const employeesData = response.data || []
    const employeeData = employeesData.find((emp) => emp.employee.id === employeeId)

    if (!employeeData) return false

    return employeeData.schedules.some((schedule) => {
      const scheduleDate = schedule.date.split('T')[0]
      return scheduleDate === dateStr
    })
  } catch (error) {
    console.error('Error checking employee schedule:', error)
    return false
  }
}

// Helpers
const getShifts = (employeeId, dayIdx) =>
  shifts.value.filter((shift) => shift.userId === employeeId && shift.day === dayIdx)

const getUserShiftCount = (userId) => shifts.value.filter((s) => s.userId === userId).length
const getEmployeeName = (id) => {
  const user = users.value.find((u) => u.id === id)
  return user?.name || 'Unknown Employee'
}

// LOCAL MODE: Add schedule locally (no API)
// NEW CODE
const addScheduleLocally = (scheduleData) => {
  const id = Math.max(0, ...shifts.value.map((s) => s.id || 0)) + 1

  // Convert selectedDate to day index for local display
  const date = new Date(scheduleData.selectedDate)
  const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1

  shifts.value.push({
    id,
    userId: scheduleData.userId,
    day: dayIdx,
    startTime: scheduleData.startTime,
    endTime: scheduleData.endTime,
    position: scheduleData.position,
    site: scheduleData.site,
    department: scheduleData.department,
  })
  $q.notify({ type: 'positive', message: 'Schedule added (local mode)' })
  return shifts.value[shifts.value.length - 1]
}

// ENHANCED: Main schedule creation function
const createSchedule = async (scheduleData) => {
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!token || !companyId) {
      return addScheduleLocally(scheduleData)
    }

    const dateStr = scheduleData.selectedDate

    // Get default times from shift type if not provided
    if (!scheduleData.startTime || !scheduleData.endTime) {
      const shiftType = shiftTypes.value.find((st) => st.id === scheduleData.position)
      if (shiftType) {
        scheduleData.startTime =
          scheduleData.startTime || shiftType.default_start_time?.substring(0, 5) || '09:00'
        scheduleData.endTime =
          scheduleData.endTime || shiftType.default_end_time?.substring(0, 5) || '17:00'
      }
    }

    const createdSchedule = await createScheduleRecord(scheduleData, dateStr)

    return createdSchedule
  } catch (error) {
    handleScheduleError(error)
    throw error
  }
}

// NEW FUNCTION - Add after createSchedule
// BACKUP METHOD: Keep for fallback if two-step process fails

const createScheduleRecord = async (scheduleData, dateStr) => {
  const token = localStorage.getItem('access_token')
  let companyId = localStorage.getItem('selectedCompany')

  // ✅ FIX: Improved company ID parsing
  if (!companyId) {
    throw new Error('No company selected')
  }

  // Normalize company ID
  try {
    const parsed = JSON.parse(companyId)
    companyId = String(parsed?.id || parsed)
  } catch {
    companyId = String(companyId)
  }

  const selectedEmployee = employees.value.find((emp) => emp.id === scheduleData.userId)
  const shiftType = shiftTypes.value.find((st) => st.id === scheduleData.position)
  const employeeName = selectedEmployee?.full_name || selectedEmployee?.name || 'Employee'
  const shiftTypeName = shiftType?.name || 'Shift'

  const scheduleName = `${employeeName} - ${shiftTypeName} - ${dateStr}`

  // ✅ FIX: More robust time formatting
  const formatTime = (time) => {
    if (!time) return '09:00:00'

    // If already in HH:MM:SS format
    if (time.match(/^\d{2}:\d{2}:\d{2}$/)) {
      return time
    }

    // If in HH:MM format
    if (time.match(/^\d{2}:\d{2}$/)) {
      return `${time}:00`
    }

    // Fallback
    return '09:00:00'
  }

  const payload = {
    name: scheduleName,
    employee: scheduleData.userId,
    company: parseInt(companyId),
    date: dateStr,
    start_time: formatTime(scheduleData.startTime),
    end_time: formatTime(scheduleData.endTime),
    shift_type: parseInt(scheduleData.position),
    site: parseInt(scheduleData.site),
  }

  // Add optional fields
  if (scheduleData.department) {
    payload.department = parseInt(scheduleData.department)
  }

  // ✅ ADD: Include status if your API requires it (uncomment if needed)
  // payload.status = 'draft'

  console.log('📤 Schedule Payload:', JSON.stringify(payload, null, 2))

  try {
    const response = await axios.post(
      'https://staging.wageyapp.com/organization/schedules/',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    console.log('✅ Schedule created:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ Schedule creation error:', error.response?.data)
    throw error
  }
}
// STEP 2: Assign the schedule

// Error handler with detailed feedback
const handleScheduleError = (error) => {
  console.error('❌ Full Error Object:', error)
  console.error('❌ Error Response:', error.response)
  console.error('❌ Error Data:', error.response?.data)

  let errorMessage = 'Failed to create schedule'
  const errorDetails = []

  if (error.response?.data) {
    const data = error.response.data

    console.error('❌ Full Error Data:', JSON.stringify(data, null, 2))

    // Check for errors array (common in this API)
    if (data.errors && Array.isArray(data.errors)) {
      errorMessage = data.errors.join('; ')
    }
    // Check for results with errors
    else if (data.results && Array.isArray(data.results) && data.results.length === 0) {
      errorMessage =
        'No schedules were created. Please check if the employee is properly linked to the company.'
    }
    // Check for field-specific errors
    else if (typeof data === 'object') {
      Object.keys(data).forEach((key) => {
        const value = data[key]
        if (key !== 'results') {
          // Skip empty results array
          const message = Array.isArray(value) ? value.join(', ') : value
          errorDetails.push(`${key}: ${message}`)
          console.error(`❌ ${key}:`, value)
        }
      })

      if (errorDetails.length > 0) {
        errorMessage = errorDetails.join('; ')
      } else if (data.detail) {
        errorMessage = data.detail
      }
    }
    // String error
    else if (typeof data === 'string') {
      errorMessage = data
    }
  }

  $q.notify({
    type: 'negative',
    message: errorMessage,
    caption: 'Please verify employee is linked to this company',
    timeout: 10000,
    position: 'top',
    multiLine: true,
    actions: [{ label: 'Dismiss', color: 'white' }],
  })
}

const verifyEmployeeCompanyLink = async (employeeId) => {
  try {
    const token = localStorage.getItem('access_token')
    let companyId = localStorage.getItem('selectedCompany')

    try {
      const parsed = JSON.parse(companyId)
      companyId = parsed?.id || parsed
    } catch {
      // Already a plain string/number
    }

    // Check if employee exists in company employees list
    const response = await axios.get(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    const employeeExists = response.data.some((emp) => emp.id === employeeId)

    console.log('Employee verification:', {
      employeeId,
      companyId,
      exists: employeeExists,
    })

    return employeeExists
  } catch (error) {
    console.error('Failed to verify employee:', error)
    return false
  }
}

// NEW CODE - Simplified validation
// ✅ FIXED: Better validation that auto-fills times from shift type
const addSchedule = async () => {
  const n = newSchedule.value

  // Basic validation
  if (!n.userId) {
    $q.notify({ type: 'negative', message: 'Please select an employee.' })
    return
  }

  if (!n.selectedDate) {
    $q.notify({ type: 'negative', message: 'Please select a date.' })
    return
  }

  if (!n.position) {
    $q.notify({ type: 'negative', message: 'Please select a shift type/position.' })
    return
  }

  if (!n.site) {
    $q.notify({ type: 'negative', message: 'Please select a site.' })
    return
  }

  // ✅ FIX: Auto-fill times from shift type if not provided
  if (!n.startTime || !n.endTime) {
    const shiftType = shiftTypes.value.find((st) => st.id === n.position)
    if (shiftType) {
      if (!n.startTime && shiftType.default_start_time) {
        n.startTime = shiftType.default_start_time.substring(0, 5)
        console.log('⏰ Auto-filled start time from shift type:', n.startTime)
      }
      if (!n.endTime && shiftType.default_end_time) {
        n.endTime = shiftType.default_end_time.substring(0, 5)
        console.log('⏰ Auto-filled end time from shift type:', n.endTime)
      }
    }
  }

  // ✅ FIX: If still empty, use defaults
  if (!n.startTime) n.startTime = '09:00'
  if (!n.endTime) n.endTime = '17:00'

  // ✅ NOW validate time format
  if (!isValidTime(n.startTime) || !isValidTime(n.endTime)) {
    $q.notify({
      type: 'negative',
      message: `Invalid time format. Start: ${n.startTime}, End: ${n.endTime}`,
    })
    return
  }

  const selectedEmployee = employees.value.find((emp) => emp.id === n.userId)

  if (!selectedEmployee) {
    $q.notify({
      type: 'negative',
      message: 'Selected employee not found. Please refresh the page and try again.',
      timeout: 5000,
    })
    return
  }

  isCheckingConflict.value = true
  addConflictWarning.value = false

  try {
    console.log('🔍 Verifying employee-company link...')
    let isLinked = false

    try {
      isLinked = await verifyEmployeeCompanyLink(n.userId)
    } catch (verifyError) {
      console.error('Employee verification failed:', verifyError)
      $q.notify({
        type: 'negative',
        message: 'Failed to verify employee. Please try again.',
        timeout: 5000,
      })
      isCheckingConflict.value = false
      return
    }

    if (!isLinked) {
      isCheckingConflict.value = false
      $q.notify({
        type: 'negative',
        message: `${selectedEmployee.full_name} is not linked to this company. Please contact your administrator.`,
        timeout: 8000,
      })
      return
    }

    console.log('✅ Employee verified as linked to company')

    let hasConflict = false
    try {
      hasConflict = await checkEmployeeScheduleOnDate(n.userId, n.selectedDate)
    } catch (conflictError) {
      console.error('Conflict check failed:', conflictError)
    }

    if (hasConflict) {
      isCheckingConflict.value = false
      const employeeName = selectedEmployee.full_name || selectedEmployee.name
      $q.notify({
        type: 'warning',
        message: `${employeeName} already has a schedule on ${n.selectedDate}.`,
        timeout: 6000,
        actions: [{ label: 'Dismiss', color: 'white' }],
      })
      return
    }

    addConflictWarning.value = true

    // ✅ Log what we're about to send
    console.log('📤 Creating schedule with:', {
      employee: selectedEmployee.full_name,
      date: n.selectedDate,
      startTime: n.startTime,
      endTime: n.endTime,
      position: n.position,
      site: n.site,
    })

    await createSchedule(n)

    isCheckingConflict.value = false
    showAddModal.value = false
    addConflictWarning.value = false

    // Reset form
    newSchedule.value = {
      userId: null,
      selectedDate: null,
      startTime: '',
      endTime: '',
      position: null,
      site: null,
      department: null,
      recurringSchedule: null,
      scheduleType: 'one-time',
      isRotating: false,
      rotationShifts: [],
      weekdays: [],
      repeatInterval: 1,
    }

    $q.notify({
      type: 'positive',
      message: 'Schedule created successfully!',
      icon: 'check_circle',
    })

    setTimeout(async () => {
      await fetchData()
    }, 500)
  } catch (error) {
    isCheckingConflict.value = false
    addConflictWarning.value = false
    console.error('Error adding schedule:', error)

    try {
      handleScheduleError(error)
    } catch (handlerError) {
      console.error('Error handler failed:', handlerError)
      $q.notify({
        type: 'negative',
        message: 'An unexpected error occurred. Please try again.',
        timeout: 5000,
      })
    }
  }
}

// Quick add schedule
const quickAddSchedule = async () => {
  const { userId, day, site, shiftType } = quickAdd.value

  // Validation
  if (!userId || day === null || !site || !shiftType) {
    $q.notify({
      type: 'negative',
      message: 'Please fill all required fields.',
    })
    return
  }

  isAddingShift.value = true

  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!token || !companyId) {
      $q.notify({
        type: 'negative',
        message: 'Authentication required. Please log in.',
      })
      return
    }

    // Calculate target date
    const { start } = selectedWeek.value
    const targetDate = new Date(start)
    targetDate.setDate(start.getDate() + day)
    const dateStr = targetDate.toISOString().split('T')[0]

    // Build payload for new endpoint
    const payload = {
      company_id: parseInt(companyId),
      employee_ids: [userId],
      schedules: [
        {
          date: dateStr,
          site_id: site,
          shift_type_id: shiftType,
        },
      ],
    }

    console.log('📤 Quick Add Payload:', JSON.stringify(payload, null, 2))

    // Call new endpoint
    const response = await axios.post(
      'https://staging.wageyapp.com/organization/assignments/assign/',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    console.log('✅ Quick Add Success:', response.data)

    $q.notify({
      type: 'positive',
      message: 'Shift added successfully!',
      icon: 'check_circle',
    })

    // Close modal and reset
    closeQuickAddModal()

    // Refresh schedule data
    setTimeout(() => fetchData(), 500)
  } catch (error) {
    console.error('❌ Quick Add Error:', error.response?.data || error.message)

    let errorMsg = 'Failed to add shift'

    if (error.response?.data) {
      const data = error.response.data

      if (data.detail) {
        errorMsg = data.detail
      } else if (data.schedules) {
        errorMsg = `Schedule error: ${JSON.stringify(data.schedules)}`
      } else if (typeof data === 'string') {
        errorMsg = data
      }
    }

    $q.notify({
      type: 'negative',
      message: errorMsg,
      caption: 'Please check the form and try again',
      timeout: 5000,
      multiLine: true,
    })
  } finally {
    isAddingShift.value = false
  }
}

// NEW CODE
const openAddModal = () => {
  newSchedule.value = {
    userId: null,
    selectedDate: null, // ✅ Fixed
    startTime: '',
    endTime: '',
    position: null,
    site: null,
    department: null,
    recurringSchedule: null,
    scheduleType: 'one-time',
    isRotating: false,
    rotationShifts: [],
    weekdays: [],
    repeatInterval: 1,
  }
  addConflictWarning.value = false
  fetchEmployees() // Fetch fresh employee data when modal opens
  showAddModal.value = true
}

const closeAddModal = () => (showAddModal.value = false)

const openEditModal = (schedule) => {
  editingSchedule.value = { ...schedule }
  editConflictWarning.value = false
  showEditModal.value = true
}

const closeEditModal = () => (showEditModal.value = false)

// Update schedule
const updateSchedule = async () => {
  const es = editingSchedule.value
  if (!es.id) return

  try {
    const token = localStorage.getItem('access_token')

    if (!token) {
      const idx = shifts.value.findIndex((s) => s.id === es.id)
      if (idx !== -1) shifts.value[idx] = { ...es }
      showEditModal.value = false
      return
    }

    const payload = {
      name: `${getEmployeeName(es.userId)} - Updated`,
      date: new Date().toISOString().split('T')[0],
      start_time: es.startTime,
      end_time: es.endTime,
      shift_type: es.position,
      site: es.site,
      department: es.department,
      status: 'active',
    }

    await axios.put(`https://staging.wageyapp.com/organization/schedules/${es.id}/`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const idx = shifts.value.findIndex((s) => s.id === es.id)
    if (idx !== -1) shifts.value[idx] = { ...es }

    showEditModal.value = false
    $q.notify({ type: 'positive', message: 'Schedule updated' })

    setTimeout(async () => {
      await fetchData()
    }, 500)
  } catch (e) {
    console.error('Failed to update schedule:', e.response?.data || e.message)
    $q.notify({ type: 'negative', message: 'Failed to update schedule' })
  }
}
// Delete schedule
const deleteShift = async (id) => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) {
      shifts.value = shifts.value.filter((s) => s.id !== id)
      $q.notify({ type: 'positive', message: 'Shift removed (local)' })
      return
    }

    await axios.delete(`https://staging.wageyapp.com/organization/schedules/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    shifts.value = shifts.value.filter((s) => s.id !== id)
    $q.notify({ type: 'positive', message: 'Schedule deleted successfully' })

    setTimeout(async () => {
      await fetchData()
    }, 500)
  } catch (e) {
    console.error('Failed to delete schedule:', e.response?.data || e.message)
    $q.notify({ type: 'negative', message: 'Failed to delete schedule' })
  }
}
const openQuickAddModal = (userId, dayIdx) => {
  quickAdd.value = {
    userId,
    day: dayIdx,
    site: null,
    shiftType: null,
  }
  showQuickAddModal.value = true
}
const closeQuickAddModal = () => {
  showQuickAddModal.value = false
  quickAdd.value = {
    userId: null,
    day: null,
    site: null,
    shiftType: null,
  }
}
const applyFilters = () => {}
const filterEmployees = () => {}
</script>

<style scoped lang="scss">
.recurring-badge {
  font-size: 10px;
  margin-left: 4px;
}

.warning-banner {
  margin-top: 14px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  padding: 12px;
  border-radius: 8px;
}

.info-banner {
  margin-top: 14px;
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  padding: 12px;
  border-radius: 8px;
}

.quick-info {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.modern-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* Header Section */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
}

.timezone-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  font-size: 11px;
  color: #1e40af;
  font-weight: 500;
}

.timezone-badge .q-icon {
  color: #3b82f6;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  width: 260px;
  background: white;
}

.add-btn {
  background: #2563eb;
  color: white;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  font-size: 13px;
}

.add-btn:hover {
  background: #1d4ed8;
}

/* Summary Cards */
.summary-section {
  margin-bottom: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: transform 0.2s;
  min-width: 0;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-purple {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
}

.card-purple .card-icon {
  background: rgba(109, 40, 217, 0.15);
  color: #6d28d9;
}

.card-yellow {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.card-yellow .card-icon {
  background: rgba(217, 119, 6, 0.15);
  color: #d97706;
}

.card-pink {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
}

.card-pink .card-icon {
  background: rgba(219, 39, 119, 0.15);
  color: #db2777;
}

.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon .q-icon {
  font-size: 28px;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.card-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

/* Controls Section */
.controls-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 14px 0;
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 10px;
  flex: 1;
}

.filter-select {
  min-width: 160px;
}

.week-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.nav-btn {
  color: #6b7280;
  width: 32px;
  height: 32px;
}

.nav-btn:hover {
  background: #e5e7eb;
}

.week-display {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  min-width: 160px;
  text-align: center;
}

.view-select {
  min-width: 140px;
}

/* Content Section */
.content-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

/* Table View */
.table-wrapper {
  overflow-x: auto;
  border: 2px solid #3b82f6;
  border-radius: 10px;
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.schedule-table thead {
  background: #f9fafb;
}

.schedule-table th {
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.employee-col {
  width: 180px;
  min-width: 180px;
}

.day-col {
  width: 120px;
  min-width: 120px;
  text-align: center !important;
}

.table-row {
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.15s;
}

.table-row:hover {
  background: #f9fafb;
}

.employee-cell {
  padding: 12px 10px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

.avatar-text {
  color: white;
  font-weight: 600;
  font-size: 13px;
}

.employee-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 13px;
}

.schedule-cell {
  padding: 10px 8px;
  vertical-align: top;
}

.shifts-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 50px;
}

.shift-badge {
  background: #dbeafe;
  border-radius: 8px;
  padding: 10px;
  position: relative;
  transition: all 0.2s;
}

.shift-badge:hover {
  background: #bfdbfe;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.shift-time {
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 4px;
  line-height: 1.3;
}

.shift-position {
  font-size: 11px;
  color: #3b82f6;
}

.shift-actions {
  display: none;
  position: absolute;
  top: 6px;
  right: 6px;
  gap: 3px;
  background: white;
  padding: 4px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.shift-badge:hover .shift-actions {
  display: flex;
}

.action-btn {
  width: 26px;
  height: 26px;
  min-height: 26px;
  border-radius: 4px;
}

.view-btn {
  background: #dbeafe;
  color: #2563eb;
}

.view-btn:hover {
  background: #bfdbfe;
}

.edit-btn {
  background: #fef3c7;
  color: #d97706;
}

.edit-btn:hover {
  background: #fde68a;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}

.add-shift-btn {
  color: #6b7280;
  font-size: 11px;
  padding: 6px 8px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  width: 100%;
  min-height: 32px;
}

.add-shift-btn:hover {
  color: #2563eb;
  border-color: #2563eb;
  background: #f0f9ff;
}

/* Cards View */
.cards-view {
  padding: 16px;
}

.employee-cards {
  display: grid;
  gap: 16px;
}

.employee-card {
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  background: #f9fafb;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.employee-stats {
  font-size: 12px;
  color: #6b7280;
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1px;
  background: #e5e7eb;
}

.day-column {
  background: white;
}

.day-header {
  background: #f9fafb;
  padding: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
}

.day-content {
  padding: 10px;
  min-height: 90px;
}

.empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70px;
}

.shift-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shift-card {
  background: #dbeafe;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.shift-card:hover {
  background: #bfdbfe;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Modal Styles */
.modal-card {
  border-radius: 12px;
  max-width: 480px;
  width: 100%;
}

.modal-header {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.modal-body {
  padding: 16px;
}

.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-field {
  width: 100%;
}

.full-width {
  grid-column: 1 / -1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  color: #6b7280;
  padding: 6px 14px;
}

.submit-btn {
  background: #2563eb;
  color: white;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.submit-btn:hover {
  background: #1d4ed8;
}

/* ===================================
   RESPONSIVE BREAKPOINTS
   =================================== */

/* 1440px - Large Desktop */
@media (min-width: 1440px) {
  .modern-page {
    padding: 20px;
  }

  .summary-grid {
    gap: 16px;
  }

  .card-value {
    font-size: 30px;
  }

  .schedule-table th,
  .employee-cell,
  .schedule-cell {
    padding: 14px 12px;
  }

  .shift-badge {
    padding: 12px;
  }
}

/* 1024px - Desktop / Tablet Landscape */
@media (max-width: 1024px) {
  .modern-page {
    padding: 14px;
  }

  .header-content {
    flex-wrap: wrap;
  }

  .title-section {
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .search-input {
    flex: 1;
    min-width: 200px;
  }

  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .summary-card {
    padding: 14px;
  }

  .card-icon {
    width: 48px;
    height: 48px;
  }

  .card-icon .q-icon {
    font-size: 26px;
  }

  .card-value {
    font-size: 26px;
  }

  .card-label {
    font-size: 12px;
  }

  .controls-row {
    gap: 10px;
  }

  .filter-group {
    flex-wrap: wrap;
  }

  .filter-select {
    flex: 1;
    min-width: 140px;
  }

  .week-nav {
    width: 100%;
    justify-content: center;
  }

  .view-select {
    width: 100%;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .schedule-table {
    min-width: 800px;
  }

  .employee-col {
    width: 160px;
    min-width: 160px;
  }

  .day-col {
    width: 110px;
    min-width: 110px;
  }

  .schedule-table th {
    padding: 11px 8px;
    font-size: 12px;
  }

  .employee-cell,
  .schedule-cell {
    padding: 10px 8px;
  }

  .shift-time {
    font-size: 11px;
  }

  .shift-position {
    font-size: 10px;
  }

  .action-btn {
    width: 24px;
    height: 24px;
    min-height: 24px;
  }
}

/* 768px - Tablet Portrait */
@media (max-width: 768px) {
  .modern-page {
    padding: 12px;
  }

  .page-header {
    padding: 12px;
    margin-bottom: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .page-title {
    font-size: 18px;
  }

  .timezone-badge {
    font-size: 10px;
    padding: 4px 10px;
  }

  .header-actions {
    flex-direction: column;
    gap: 10px;
  }

  .search-input,
  .add-btn {
    width: 100%;
  }

  .summary-section {
    margin-bottom: 12px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .summary-card {
    padding: 12px;
  }

  .card-icon {
    width: 44px;
    height: 44px;
  }

  .card-icon .q-icon {
    font-size: 24px;
  }

  .card-value {
    font-size: 24px;
  }

  .card-label {
    font-size: 11px;
  }

  .controls-section {
    padding: 12px;
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .controls-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-direction: column;
    width: 100%;
  }

  .filter-select,
  .view-select {
    width: 100%;
  }

  .week-nav {
    width: 100%;
  }

  .week-display {
    min-width: 140px;
    font-size: 12px;
  }

  .table-wrapper {
    border-radius: 8px;
  }

  .cards-view {
    padding: 12px;
  }

  .employee-cards {
    gap: 12px;
  }

  .card-header {
    padding: 12px;
  }

  .employee-avatar {
    width: 36px;
    height: 36px;
  }

  .employee-name {
    font-size: 14px;
  }

  .schedule-grid {
    grid-template-columns: 1fr;
  }

  .day-content {
    min-height: 80px;
    padding: 8px;
  }

  .modal-card {
    max-width: 95vw;
    margin: 12px;
  }

  .modal-header,
  .modal-body {
    padding: 14px;
  }

  .modal-title {
    font-size: 17px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .modal-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .cancel-btn,
  .submit-btn {
    width: 100%;
    justify-content: center;
  }

  .quick-info {
    flex-direction: column;
    gap: 10px;
  }
}

/* Small Mobile - 480px and below */
@media (max-width: 480px) {
  .modern-page {
    padding: 10px;
  }

  .page-header {
    padding: 10px;
    border-radius: 10px;
  }

  .page-title {
    font-size: 16px;
  }

  .timezone-badge {
    font-size: 9px;
    padding: 4px 8px;
  }

  .add-btn {
    height: 32px;
    font-size: 12px;
  }

  .summary-card {
    padding: 10px;
  }

  .card-icon {
    width: 40px;
    height: 40px;
  }

  .card-icon .q-icon {
    font-size: 22px;
  }

  .card-value {
    font-size: 22px;
  }

  .card-label {
    font-size: 10px;
  }

  .controls-section {
    padding: 10px;
  }

  .section-title {
    font-size: 15px;
  }

  .week-nav {
    padding: 4px 8px;
  }

  .nav-btn {
    width: 28px;
    height: 28px;
  }

  .week-display {
    font-size: 11px;
  }

  .cards-view {
    padding: 10px;
  }

  .card-header {
    padding: 10px;
  }

  .employee-avatar {
    width: 32px;
    height: 32px;
  }

  .employee-name {
    font-size: 13px;
  }

  .day-header {
    padding: 8px;
    font-size: 11px;
  }

  .day-content {
    padding: 6px;
    min-height: 70px;
  }

  .shift-card {
    padding: 8px;
  }

  .shift-time {
    font-size: 11px;
  }

  .shift-position {
    font-size: 10px;
  }

  .modal-header,
  .modal-body {
    padding: 12px;
  }

  .modal-title {
    font-size: 16px;
  }
}
</style>
