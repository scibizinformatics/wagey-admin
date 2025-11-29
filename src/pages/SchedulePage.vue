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
            :options="['All', ...positions.map((p) => p.name)]"
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
                      <div class="shift-time">
                        {{ formatTimeWithTimezone(shift.startTime) }} - {{ shift.endTime }}
                      </div>
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

            <q-select
              v-model="newSchedule.recurringSchedule"
              :options="recurringScheduleOptions"
              option-value="value"
              option-label="label"
              label="Recurring Schedule (Optional)"
              outlined
              emit-value
              map-options
              class="form-field full-width"
              clearable
              @update:model-value="onRecurringScheduleChange"
            >
              <template #hint>
                Select a recurring schedule to auto-fill times and details
              </template>
            </q-select>

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
                label="Department (Optional)"
                outlined
                emit-value
                map-options
                class="form-field"
                clearable
              />
            </div>

            <div v-if="!newSchedule.recurringSchedule" class="form-row">
              <q-select
                v-model="newSchedule.contractType"
                :options="contractTypeOptions"
                option-value="value"
                option-label="label"
                label="Contract Type (Optional)"
                outlined
                emit-value
                map-options
                class="form-field"
                clearable
              />

              <q-select
                v-model="newSchedule.position"
                :options="positionOptions"
                option-value="value"
                option-label="label"
                label="Position / Shift Type"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => !!val || 'Position is required for custom schedules']"
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
              >
                <template #append>
                  <q-icon name="access_time" />
                </template>
                <template #hint> {{ userTimezone }} ({{ getTimezoneAbbreviation() }}) </template>
              </q-input>

              <q-input
                v-model="newSchedule.endTime"
                label="End Time"
                mask="##:##"
                placeholder="17:00"
                outlined
                class="form-field"
                :rules="[timeValidation, validateEndTime]"
              >
                <template #append>
                  <q-icon name="access_time" />
                </template>
                <template #hint> {{ userTimezone }} ({{ getTimezoneAbbreviation() }}) </template>
              </q-input>
            </div>

            <q-banner v-if="addConflictWarning" class="warning-banner">
              <template #avatar>
                <q-icon name="warning" />
              </template>
              <strong>Schedule Conflict Detected!</strong><br />
              This employee already has a schedule on the selected date. Each employee can only have
              one schedule per day.
              <br /><br />
              <small
                >This may include schedules from recurring patterns or schedules created in other
                weeks not currently visible.</small
              >
            </q-banner>

            <q-banner v-if="isCheckingConflict" class="info-banner">
              <template #avatar>
                <q-spinner color="primary" size="20px" />
              </template>
              Checking for schedule conflicts...
            </q-banner>

            <div class="modal-actions">
              <q-btn
                flat
                label="Cancel"
                @click="closeAddModal"
                class="cancel-btn"
                :disable="isCheckingConflict"
              />
              <q-btn
                type="submit"
                color="primary"
                label="Add Schedule"
                unelevated
                class="submit-btn"
                :loading="isCheckingConflict"
                :disable="isCheckingConflict"
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
              v-model="quickAdd.recurringSchedule"
              :options="recurringScheduleOptions"
              option-value="value"
              option-label="label"
              label="Recurring Schedule (Optional)"
              outlined
              emit-value
              map-options
              class="form-field full-width"
              clearable
              @update:model-value="onRecurringScheduleChange"
            >
              <template #hint>
                Select a recurring schedule to auto-fill times and details
              </template>
            </q-select>

            <div class="form-row">
              <q-select
                v-model="quickAdd.site"
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
                v-model="quickAdd.department"
                :options="departmentOptions"
                option-value="value"
                option-label="label"
                label="Department (Optional)"
                outlined
                emit-value
                map-options
                class="form-field"
                clearable
              />
            </div>

            <div v-if="!quickAdd.recurringSchedule" class="form-row">
              <q-select
                v-model="quickAdd.contractType"
                :options="contractTypeOptions"
                option-value="value"
                option-label="label"
                label="Contract Type (Optional)"
                outlined
                emit-value
                map-options
                class="form-field"
                clearable
              />

              <q-select
                v-model="quickAdd.position"
                :options="positionOptions"
                option-value="value"
                option-label="label"
                label="Position / Shift Type"
                outlined
                emit-value
                map-options
                class="form-field"
                :rules="[(val) => !!val || 'Position is required for custom schedules']"
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="quickAdd.startTime"
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
                v-model="quickAdd.endTime"
                label="End Time"
                mask="##:##"
                placeholder="17:00"
                outlined
                class="form-field"
                :rules="[timeValidation, (val) => validateEndTime(val, quickAdd.startTime)]"
              >
                <template #append>
                  <q-icon name="access_time" />
                </template>
                <template #hint> {{ userTimezone }} ({{ getTimezoneAbbreviation() }}) </template>
              </q-input>
            </div>

            <div class="modal-actions">
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
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()

// State
const users = ref([])
const shifts = ref([])
const positions = ref([])
const sites = ref([])
const departments = ref([])
const contractTypes = ref([])
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

const newSchedule = ref({
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
  startTime: '',
  endTime: '',
  position: '',
  site: null,
  department: null,
  contractType: null,
  recurringSchedule: null,
  isRecurring: false,
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
  fetchData()
}

const prevWeek = () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() - 7)
  selectedWeek.value = getWeekRange(newStart)
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

const mapDateToDayIdx = (dateStr) => {
  const jsDay = new Date(dateStr).getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

const getPositionName = (positionId) => {
  const position = positions.value.find((p) => p.id === positionId)
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

// Options
const userOptions = computed(() => users.value.map((u) => ({ label: u.name, value: u.id })))
const positionOptions = computed(() => positions.value.map((p) => ({ label: p.name, value: p.id })))
const siteOptions = computed(() => sites.value.map((s) => ({ label: s.name, value: s.id })))
const departmentOptions = computed(() =>
  departments.value.map((d) => ({ label: d.name, value: d.id })),
)
const contractTypeOptions = computed(() =>
  contractTypes.value.map((c) => ({ label: c.name, value: c.id })),
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

// When recurring schedule is selected, populate times
const onRecurringScheduleChange = (recurringId) => {
  if (!recurringId) return

  const recurring = recurringSchedules.value.find((r) => r.id === recurringId)
  if (!recurring) return

  // Auto-fill start and end times from recurring schedule
  if (recurring.start_time) {
    const startTime = recurring.start_time.substring(0, 5)
    newSchedule.value.startTime = startTime
    quickAdd.value.startTime = startTime
  }
  if (recurring.end_time) {
    const endTime = recurring.end_time.substring(0, 5)
    newSchedule.value.endTime = endTime
    quickAdd.value.endTime = endTime
  }
}

// API functions
const fetchSitesAndDepartments = async () => {
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!token || !companyId) {
      sites.value = [
        { id: 1, name: 'Main Office' },
        { id: 2, name: 'Branch 1' },
        { id: 3, name: 'Branch 2' },
      ]
      departments.value = [
        { id: 1, name: 'Sales' },
        { id: 2, name: 'Operations' },
        { id: 3, name: 'Management' },
      ]
      positions.value = [
        { id: 1, name: 'Cashier' },
        { id: 2, name: 'Manager' },
        { id: 3, name: 'Staff' },
      ]
      contractTypes.value = [
        { id: 1, name: 'Full-time' },
        { id: 2, name: 'Part-time' },
        { id: 3, name: 'Contract' },
      ]
      recurringSchedules.value = [
        { id: 1, name: 'Morning Shift (8AM-5PM)', start_time: '08:00', end_time: '17:00' },
        { id: 2, name: 'Night Shift (9PM-6AM)', start_time: '21:00', end_time: '06:00' },
      ]
      return
    }

    const [sitesRes, deptsRes, positionsRes, contractTypesRes, recurringRes] = await Promise.all([
      axios.get(`https://staging.wageyapp.com/organization/sites/?company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`https://staging.wageyapp.com/organization/departments/?company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`https://staging.wageyapp.com/user/positions/?company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`https://staging.wageyapp.com/organization/contract-types/`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`https://staging.wageyapp.com/organization/recurring-schedules/`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    sites.value = sitesRes.data.results || sitesRes.data || []
    departments.value = deptsRes.data.results || deptsRes.data || []
    positions.value = positionsRes.data.results || positionsRes.data || []
    contractTypes.value = contractTypesRes.data.results || contractTypesRes.data || []
    recurringSchedules.value = recurringRes.data.results || recurringRes.data || []
  } catch (e) {
    console.error('Failed to fetch data:', e.response?.data || e.message)
    sites.value = [
      { id: 1, name: 'Main Office' },
      { id: 2, name: 'Branch 1' },
    ]
    departments.value = [
      { id: 1, name: 'Sales' },
      { id: 2, name: 'Operations' },
    ]
    positions.value = [
      { id: 1, name: 'Cashier' },
      { id: 2, name: 'Manager' },
      { id: 3, name: 'Staff' },
    ]
    contractTypes.value = [
      { id: 1, name: 'Full-time' },
      { id: 2, name: 'Part-time' },
    ]
    recurringSchedules.value = [
      { id: 1, name: 'Morning Shift', start_time: '08:00', end_time: '17:00' },
      { id: 2, name: 'Night Shift', start_time: '21:00', end_time: '06:00' },
    ]
  }
}

const fetchData = async () => {
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!token) {
      users.value = [
        { id: 1, name: 'John Doe', avatar: 'https://cdn.quasar.dev/img/avatar.png' },
        { id: 2, name: 'Jane Smith', avatar: 'https://cdn.quasar.dev/img/avatar2.png' },
        { id: 3, name: 'Bob Johnson', avatar: 'https://cdn.quasar.dev/img/avatar3.png' },
      ]
      shifts.value = [
        {
          id: 1,
          userId: 1,
          day: 0,
          startTime: '09:00',
          endTime: '17:00',
          position: 1,
          site: 1,
          department: 1,
        },
        {
          id: 2,
          userId: 2,
          day: 0,
          startTime: '10:00',
          endTime: '18:00',
          position: 2,
          site: 1,
          department: 2,
        },
        {
          id: 3,
          userId: 1,
          day: 2,
          startTime: '08:00',
          endTime: '16:00',
          position: 1,
          site: 2,
          department: 1,
        },
      ]
      return
    }

    if (!companyId) {
      console.error('No company selected. Please select a company first.')
      return
    }

    const res = await axios.get(
      `https://staging.wageyapp.com/organization/schedules/company/monthly/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
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
        .map((s) => {
          const stripSeconds = (timeStr) => {
            if (!timeStr) return '00:00'
            return timeStr.substring(0, 5)
          }

          return {
            id: s.id,
            userId: emp.employee.id,
            day: mapDateToDayIdx(s.date),
            startTime: stripSeconds(s.actual_start_time || s.start_time),
            endTime: stripSeconds(s.actual_end_time || s.end_time),
            site: s.site,
            department: s.department,
            position: s.position,
          }
        }),
    )
  } catch (e) {
    console.error('Failed to fetch data:', e.response?.data || e.message)
    users.value = [
      { id: 1, name: 'John Doe', avatar: 'https://cdn.quasar.dev/img/avatar.png' },
      { id: 2, name: 'Jane Smith', avatar: 'https://cdn.quasar.dev/img/avatar2.png' },
    ]
    shifts.value = []
  }
}

onMounted(() => {
  fetchSitesAndDepartments()
  fetchData()
})

// Check if employee has any schedule on a specific date (API call)
const checkEmployeeScheduleOnDate = async (employeeId, dateStr, startTime, endTime) => {
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!token || !companyId) {
      // In local mode, check for time overlap
      return shifts.value.some((s) => {
        if (s.userId !== employeeId) return false
        const { start } = selectedWeek.value
        const shiftDate = new Date(start)
        shiftDate.setDate(start.getDate() + s.day)
        const shiftDateStr = shiftDate.toISOString().split('T')[0]

        if (shiftDateStr !== dateStr) return false

        // Check for time overlap
        return startTime < s.endTime && endTime > s.startTime
      })
    }

    // Check with API for all schedules on that date
    const response = await axios.get(
      `https://staging.wageyapp.com/organization/schedules/company/monthly/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    const employeesData = response.data || []
    const employeeData = employeesData.find((emp) => emp.employee.id === employeeId)

    if (!employeeData) return false

    // Check if employee has any schedule on the target date with time overlap
    return employeeData.schedules.some((schedule) => {
      const scheduleDate = schedule.date.split('T')[0]
      if (scheduleDate !== dateStr) return false

      const schedStartTime = schedule.actual_start_time || schedule.start_time
      const schedEndTime = schedule.actual_end_time || schedule.end_time

      if (!schedStartTime || !schedEndTime) {
        return true
      }

      const schedStart = schedStartTime.substring(0, 5)
      const schedEnd = schedEndTime.substring(0, 5)

      // Check for time overlap
      return startTime < schedEnd && endTime > schedStart
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
const getEmployeeName = (id) => users.value.find((u) => u.id === id)?.name || 'Unknown'

// Create schedule using /organization/assignments/assign/ endpoint
const createSchedule = async (n) => {
  if (n.day === null || n.day === undefined) {
    $q.notify({ type: 'negative', message: 'Please select a day.' })
    return
  }
  if (!isValidTime(n.startTime) || !isValidTime(n.endTime)) {
    $q.notify({ type: 'negative', message: 'Please provide valid start/end times (HH:MM).' })
    return
  }

  const token = localStorage.getItem('access_token')
  const companyId = localStorage.getItem('selectedCompany')

  try {
    // Local mode fallback
    if (!token || !companyId) {
      const id = Math.max(0, ...shifts.value.map((s) => s.id || 0)) + 1
      shifts.value.push({
        id,
        userId: n.userId,
        day: n.day,
        startTime: n.startTime,
        endTime: n.endTime,
        position: n.position,
        site: n.site,
        department: n.department,
      })
      $q.notify({ type: 'positive', message: 'Schedule added (local)' })
      return shifts.value[shifts.value.length - 1]
    }

    // Validate required fields
    const isRecurring = !!n.recurringSchedule

    if (!n.site) {
      $q.notify({
        type: 'negative',
        message: 'Please select Site',
        timeout: 5000,
      })
      return
    }

    // For custom (non-recurring) schedules, shift_type_id is required
    if (!isRecurring && !n.position) {
      $q.notify({
        type: 'negative',
        message: 'Please select Position/Shift Type for custom schedules',
        timeout: 5000,
      })
      return
    }

    // Calculate target date
    const { start } = selectedWeek.value
    const targetDate = new Date(start)
    targetDate.setDate(start.getDate() + n.day)
    const dateStr = targetDate.toISOString().split('T')[0]

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 CREATING SCHEDULE ASSIGNMENT')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Type:', isRecurring ? 'RECURRING SCHEDULE' : 'CUSTOM SCHEDULE')
    console.log('Employee ID:', n.userId)
    console.log('Company ID:', companyId)
    console.log('Date:', dateStr)
    console.log('Site ID:', n.site)
    console.log('Department ID:', n.department || 'Optional - Not provided')
    console.log('Shift Type ID:', isRecurring ? 'Not needed for recurring' : n.position)
    console.log('Recurring Schedule ID:', n.recurringSchedule || 'None')

    // Build payload according to new API spec
    const payload = {
      company_id: parseInt(companyId),
      employee_ids: [n.userId],
      site_id: parseInt(n.site),
      dates: [dateStr],
      start_date: dateStr,
      end_date: dateStr,
    }

    // Department is always optional
    if (n.department) {
      payload.department_id = parseInt(n.department)
    }

    // For recurring schedules
    if (isRecurring) {
      payload.recurring = parseInt(n.recurringSchedule)
    }
    // For custom schedules (non-recurring) - shift_type_id is required
    else {
      payload.shift_type_id = parseInt(n.position)

      // Add position_id if present (same as shift_type_id)
      if (n.position) {
        payload.position_id = parseInt(n.position)
      }
    }

    console.log('\n📦 Payload:')
    console.log(JSON.stringify(payload, null, 2))

    const endpoint = 'https://staging.wageyapp.com/organization/assignments/assign/'
    console.log(`\n🔄 POST ${endpoint}`)

    const res = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('✅ SUCCESS!')
    console.log('Response:', res.data)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    $q.notify({
      type: 'positive',
      message: 'Schedule assigned successfully',
    })

    return res.data
  } catch (e) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('❌ ERROR')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Status:', e.response?.status)
    console.log('Status Text:', e.response?.statusText)
    console.log('Full Error:', e.response?.data)
    console.log('Error Message:', e.message)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    let errorMessage = 'Failed to create schedule'
    let errorCaption = ''

    if (e.response?.data) {
      const data = e.response.data

      if (typeof data === 'object') {
        const errorFields = []
        Object.keys(data).forEach((key) => {
          const value = data[key]
          const message = Array.isArray(value) ? value[0] : value
          errorFields.push(`${key}: ${message}`)
        })

        if (errorFields.length > 0) {
          errorMessage = errorFields.join('; ')
        } else if (data.detail) {
          errorMessage = data.detail
        } else if (data.error) {
          errorMessage = data.error
        }
      } else if (typeof data === 'string') {
        errorMessage = data
      }
    } else if (!e.response) {
      errorMessage = 'Network Error - Unable to reach server'
      errorCaption = 'Check your internet connection or contact support'
    }

    $q.notify({
      type: 'negative',
      message: errorMessage,
      caption: errorCaption || 'Check console for details',
      timeout: 8000,
      position: 'top',
      multiLine: true,
    })

    throw e
  }
}

const addSchedule = async () => {
  const n = newSchedule.value
  if (n.userId == null || n.day === null || n.day === undefined) {
    addConflictWarning.value = false
    $q.notify({ type: 'negative', message: 'Please select employee and day.' })
    return
  }

  if (!isValidTime(n.startTime) || !isValidTime(n.endTime)) {
    addConflictWarning.value = false
    $q.notify({ type: 'negative', message: 'Please provide valid start/end times (HH:MM).' })
    return
  }

  // Validate end time is after start time
  const [startHour, startMin] = n.startTime.split(':').map(Number)
  const [endHour, endMin] = n.endTime.split(':').map(Number)
  if (endHour < startHour || (endHour === startHour && endMin <= startMin)) {
    addConflictWarning.value = false
    $q.notify({ type: 'negative', message: 'End time must be after start time.' })
    return
  }

  // Calculate target date
  const { start } = selectedWeek.value
  const targetDate = new Date(start)
  targetDate.setDate(start.getDate() + n.day)
  const dateStr = targetDate.toISOString().split('T')[0]

  // Show loading state
  isCheckingConflict.value = true
  addConflictWarning.value = false

  try {
    // Check for conflicts with API (includes time overlap check)
    const hasConflict = await checkEmployeeScheduleOnDate(n.userId, dateStr, n.startTime, n.endTime)

    isCheckingConflict.value = false

    if (hasConflict) {
      addConflictWarning.value = true
      const employeeName = getEmployeeName(n.userId)
      $q.notify({
        type: 'warning',
        message: `${employeeName} already has an overlapping schedule on ${dateStr}. Cannot create overlapping schedules.`,
        timeout: 6000,
        actions: [{ label: 'Dismiss', color: 'white' }],
      })
      return
    }

    // Proceed with creation
    await createSchedule(n)
    showAddModal.value = false
    addConflictWarning.value = false

    // Reset form
    newSchedule.value = {
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
    }

    // Refresh data
    setTimeout(async () => {
      await fetchData()
    }, 500)
  } catch {
    isCheckingConflict.value = false
  }
}

const quickAddSchedule = async () => {
  const q = quickAdd.value
  if (q.userId == null || q.day === null || q.day === undefined) {
    $q.notify({ type: 'negative', message: 'Please select employee and day.' })
    return
  }
  if (!isValidTime(q.startTime) || !isValidTime(q.endTime)) {
    $q.notify({ type: 'negative', message: 'Please provide valid start/end times (HH:MM).' })
    return
  }

  // Check for local conflicts
  const { start } = selectedWeek.value
  const targetDate = new Date(start)
  targetDate.setDate(start.getDate() + q.day)
  const dateStr = targetDate.toISOString().split('T')[0]

  const exists = shifts.value.some((s) => {
    if (s.userId !== q.userId) return false

    const shiftDate = new Date(start)
    shiftDate.setDate(start.getDate() + s.day)
    const shiftDateStr = shiftDate.toISOString().split('T')[0]

    return shiftDateStr === dateStr
  })

  if (exists) {
    $q.notify({
      type: 'warning',
      message:
        'Warning: This employee already has a shift on this day. The API may reject this if times overlap.',
      timeout: 5000,
    })
    return
  }

  try {
    await createSchedule(q)
    showQuickAddModal.value = false

    quickAdd.value = {
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
    }

    setTimeout(async () => {
      await fetchData()
    }, 500)
  } catch {
    // Error is already handled in createSchedule
  }
}

const openAddModal = () => {
  newSchedule.value = {
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
  }
  addConflictWarning.value = false
  showAddModal.value = true
}

const closeAddModal = () => (showAddModal.value = false)

const openEditModal = (schedule) => {
  editingSchedule.value = { ...schedule }
  editConflictWarning.value = false
  showEditModal.value = true
}

const closeEditModal = () => (showEditModal.value = false)

const updateSchedule = async () => {
  const es = editingSchedule.value
  if (!es.id) return

  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!token || !companyId) {
      const idx = shifts.value.findIndex((s) => s.id === es.id)
      if (idx !== -1) shifts.value[idx] = { ...es }
      showEditModal.value = false
      return
    }

    const payload = {
      employee: es.userId,
      company: parseInt(companyId),
      day_of_week: es.day,
      start_time: es.startTime,
      end_time: es.endTime,
      position: es.position,
      site: es.site,
      department: es.department,
      is_active: true,
    }

    await axios.put(
      `https://staging.wageyapp.com/organization/recurring-schedules/${es.id}/`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    const idx = shifts.value.findIndex((s) => s.id === es.id)
    if (idx !== -1) shifts.value[idx] = { ...es }

    showEditModal.value = false
    $q.notify({ type: 'positive', message: 'Schedule updated' })
  } catch (e) {
    console.error('Failed to update schedule:', e.response?.data || e.message)
    $q.notify({ type: 'negative', message: 'Failed to update schedule' })
  }
}

const deleteShift = async (id) => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) {
      shifts.value = shifts.value.filter((s) => s.id !== id)
      $q.notify({ type: 'positive', message: 'Shift removed (local)' })
      return
    }

    await axios.delete(`https://staging.wageyapp.com/organization/recurring-schedules/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    shifts.value = shifts.value.filter((s) => s.id !== id)
    $q.notify({ type: 'positive', message: 'Schedule deleted successfully' })
  } catch (e) {
    console.error('Failed to delete schedule:', e.response?.data || e.message)
    $q.notify({ type: 'negative', message: 'Failed to delete schedule' })
  }
}

const openQuickAddModal = (userId, dayIdx) => {
  quickAdd.value = {
    userId,
    day: dayIdx,
    startTime: '',
    endTime: '',
    position: '',
    site: null,
    department: null,
    contractType: null,
    recurringSchedule: null,
    isRecurring: false,
  }
  showQuickAddModal.value = true
}

const closeQuickAddModal = () => (showQuickAddModal.value = false)
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
