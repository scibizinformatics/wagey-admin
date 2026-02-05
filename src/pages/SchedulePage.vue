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
            v-model="filters.site"
            :options="siteFilterOptions"
            option-value="value"
            option-label="label"
            label="Filter by Site"
            outlined
            dense
            class="filter-select"
            clearable
            emit-value
            map-options
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

    <div class="content-section">
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
                    <!-- Existing Shifts -->
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
                          icon="swap_horiz"
                          size="xs"
                          class="action-btn reassign-btn"
                          @click="openReassignModal(element)"
                        >
                          <q-tooltip>Update Shift</q-tooltip>
                        </q-btn>
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

                    <!-- Always Show Add Button -->
                    <q-btn
                      flat
                      dense
                      size="sm"
                      :label="getShifts(user.id, dayIdx).length === 0 ? '+ Add' : '+ Add More'"
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
                  <!-- Show shifts if they exist -->
                  <div v-if="getShifts(user.id, dayIdx).length > 0" class="shift-items">
                    <div
                      v-for="shift in getShifts(user.id, dayIdx)"
                      :key="shift.id"
                      class="shift-card"
                    >
                      <div class="shift-position">{{ getPositionName(shift.position) }}</div>
                    </div>
                  </div>

                  <!-- Always show add button -->
                  <q-btn
                    flat
                    dense
                    size="sm"
                    :label="getShifts(user.id, dayIdx).length === 0 ? 'Add' : '+ Add More'"
                    @click="openQuickAddModal(user.id, dayIdx)"
                    class="add-shift-btn mobile-add-btn"
                  />
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

    <!-- Quick Add Modal - Multiple Shifts Same Day -->
    <q-dialog v-model="showQuickAddModal" persistent>
      <q-card class="modal-card" style="max-width: 500px">
        <q-card-section class="modal-header">
          <div class="modal-title">Quick Add Shifts</div>
          <q-btn flat round dense icon="close" @click="closeQuickAddModal" />
        </q-card-section>

        <q-card-section class="modal-body">
          <!-- Employee and Day Info -->
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
            <!-- Multiple Shift Rows -->
            <div v-for="(shift, index) in quickAdd.shifts" :key="index" class="shift-row">
              <div class="shift-row-header">
                <span class="row-label">
                  <q-icon name="schedule" size="16px" />
                  Shift {{ index + 1 }}
                </span>
                <q-btn
                  v-if="quickAdd.shifts.length > 1"
                  flat
                  dense
                  round
                  icon="close"
                  size="sm"
                  @click="removeShiftRow(index)"
                  class="remove-btn"
                />
              </div>

              <div class="shift-fields">
                <q-select
                  v-model="shift.site"
                  :options="siteOptions"
                  option-value="value"
                  option-label="label"
                  label="Select Site"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="form-field"
                  :rules="[(val) => !!val || 'Site is required']"
                />

                <q-select
                  v-model="shift.shiftType"
                  :options="shiftTypeOptions"
                  option-value="value"
                  option-label="label"
                  label="Shift Type"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="form-field"
                  :rules="[(val) => !!val || 'Shift type is required']"
                >
                  <template #hint>
                    {{
                      shift.shiftType ? getShiftTypeDetails(shift.shiftType) : 'Select a shift type'
                    }}
                  </template>
                </q-select>
              </div>
            </div>

            <!-- Add Another Shift Button -->
            <q-btn
              flat
              icon="add"
              label="Add Another Shift"
              @click="addShiftRow"
              class="add-row-btn"
              color="primary"
              size="sm"
            />

            <!-- Info Banner -->
            <q-banner class="info-banner" dense>
              <template #avatar>
                <q-icon name="info" color="primary" />
              </template>
              <span style="font-size: 12px">
                Adding {{ quickAdd.shifts.length }} shift{{
                  quickAdd.shifts.length > 1 ? 's' : ''
                }}
                for <strong>{{ days[quickAdd.day] }}</strong>
              </span>
            </q-banner>

            <div class="modal-actions">
              <q-btn flat label="Cancel" @click="closeQuickAddModal" class="cancel-btn" />
              <q-btn
                type="submit"
                color="primary"
                :label="`Add ${quickAdd.shifts.length} Shift${quickAdd.shifts.length > 1 ? 's' : ''}`"
                unelevated
                class="submit-btn"
                :loading="isAddingShift"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Update Shift Assignment Modal -->
    <q-dialog v-model="showReassignModal">
      <q-card style="min-width: 450px">
        <q-card-section>
          <div class="text-h6">Update Shift Assignment</div>
          <div class="text-caption text-grey-7" style="margin-top: 4px">
            Modify the shift details for this assignment
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <!-- Employee Info (read-only) -->
          <q-input
            :model-value="getEmployeeName(reassignData.currentEmployee)"
            label="Employee"
            outlined
            dense
            readonly
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <!-- Date (read-only) -->
          <q-input v-model="reassignData.date" label="Date" outlined dense readonly class="q-mb-md">
            <template v-slot:prepend>
              <q-icon name="event" />
            </template>
          </q-input>

          <!-- Site Select (editable) -->
          <q-select
            v-model="reassignData.siteId"
            :options="siteOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            label="Site *"
            outlined
            dense
            class="q-mb-md"
            :rules="[(val) => !!val || 'Site is required']"
          >
            <template v-slot:prepend>
              <q-icon name="location_on" />
            </template>
          </q-select>

          <!-- Shift Type Select (editable) -->
          <q-select
            v-model="reassignData.shiftTypeId"
            :options="positionOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            label="Shift Type *"
            outlined
            dense
            class="q-mb-md"
            :rules="[(val) => !!val || 'Shift type is required']"
          >
            <template v-slot:prepend>
              <q-icon name="work" />
            </template>
          </q-select>

          <!-- Department Select (editable, optional) -->
          <q-select
            v-model="reassignData.departmentId"
            :options="departmentOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            label="Department (Optional)"
            outlined
            dense
            clearable
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="business" />
            </template>
          </q-select>

          <q-banner dense class="bg-blue-1">
            <template v-slot:avatar>
              <q-icon name="info" color="primary" />
            </template>
            <span style="font-size: 12px">
              You can update the site, shift type, and department for this employee's assignment.
            </span>
          </q-banner>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            color="grey-7"
            @click="closeReassignModal"
            :disable="isReassigning"
          />
          <q-btn
            unelevated
            label="Update Assignment"
            color="primary"
            @click="reassignShift"
            :loading="isReassigning"
            :disable="
              !reassignData.siteId || !reassignData.shiftTypeId || !reassignData.assignmentId
            "
          >
            <template v-slot:loading>
              <q-spinner color="white" size="20px" />
            </template>
          </q-btn>
        </q-card-actions>
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
const isReassigning = ref(false)
const recurringSchedules = ref([])
const userTimezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone)

const viewMode = ref('table')
const filters = ref({
  site: null,
  employee: null,
})
const searchTerm = ref('')

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayOptions = days.map((d, i) => ({ label: d, value: i }))

const showAddModal = ref(false)
const showQuickAddModal = ref(false)
const showReassignModal = ref(false)
const isCheckingConflict = ref(false)
const isAddingShift = ref(false)

const newSchedule = ref({
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

const quickAdd = ref({
  userId: null,
  day: null,
  shifts: [],
})

// Reassign data state (for updating shift assignment)
const reassignData = ref({
  assignmentId: null,
  shiftTypeId: null,
  siteId: null,
  departmentId: null,
  currentEmployee: null,
  date: null,
  day: null,
})

const addConflictWarning = ref(false)

// Week helpers
const getWeekRange = (date = new Date()) => {
  const d = new Date(date)

  console.log('getWeekRange input:', d)
  console.log('getWeekRange input is valid?:', !isNaN(d.getTime()))

  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  console.log('getWeekRange output:', { start: monday, end: sunday })
  console.log('Week start year:', monday.getFullYear())

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

const requireId = (value, name) => {
  const id = parseInt(value)
  if (!id || Number.isNaN(id)) {
    throw new Error(`${name} is required and must be a valid ID`)
  }
  return id
}

// Summaries
const totalShifts = computed(() => shifts.value.length)
const activeEmployees = computed(() => new Set(shifts.value.map((s) => s.userId)).size)
const positionsCount = computed(() => new Set(shifts.value.map((s) => s.position)).size)

const siteFilterOptions = computed(() => {
  if (!sites.value || sites.value.length === 0) {
    return [{ label: 'All Sites', value: null }]
  }
  return [
    { label: 'All Sites', value: null },
    ...sites.value.map((site) => ({
      label: site.name,
      value: site.id,
    })),
  ]
})

// Options
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

const filteredUsers = computed(() => {
  if (filters.value.site) {
    console.log('🔍 FILTERING DEBUG:', {
      selectedSite: filters.value.site,
      totalShifts: shifts.value.length,
      sampleShift: shifts.value[0],
      shiftsWithSite: shifts.value.filter((s) => s.site).length,
      uniqueSiteIds: [...new Set(shifts.value.map((s) => s.site))],
      siteIdTypes: shifts.value.slice(0, 3).map((s) => ({ site: s.site, type: typeof s.site })),
    })
  }

  return users.value.filter((u) => {
    const matchEmployee = !filters.value.employee || u.id === filters.value.employee

    const matchSearch = (u.name || '')
      .toLowerCase()
      .includes((searchTerm.value || '').toLowerCase())

    const matchSite =
      !filters.value.site ||
      shifts.value.some((shift) => {
        const shiftSiteId = typeof shift.site === 'number' ? shift.site : parseInt(shift.site)
        const filterSiteId =
          typeof filters.value.site === 'number' ? filters.value.site : parseInt(filters.value.site)

        return shift.userId === u.id && shiftSiteId === filterSiteId
      })

    if (filters.value.site && matchEmployee && matchSearch) {
      const userShifts = shifts.value.filter((s) => s.userId === u.id)
      if (userShifts.length > 0) {
        console.log(`👤 ${u.name}:`, {
          totalShifts: userShifts.length,
          shiftSites: userShifts.map((s) => s.site),
          matchSite: matchSite,
        })
      }
    }

    return matchEmployee && matchSearch && matchSite
  })
})

const onRecurringTemplateChange = (templateId) => {
  if (!templateId) {
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

  if (template.shift_type) {
    newSchedule.value.position = template.shift_type
    quickAdd.value.position = template.shift_type
  }

  if (template.weekdays) {
    try {
      newSchedule.value.weekdays = parseWeekdays(template.weekdays)
    } catch (e) {
      console.error('Error parsing weekdays:', e)
      newSchedule.value.weekdays = []
    }
  }

  if (template.is_rotating !== undefined) {
    newSchedule.value.isRotating = template.is_rotating
  }

  if (template.site) {
    newSchedule.value.site = template.site
    quickAdd.value.site = template.site
  }

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

const parseWeekdays = (weekdaysStr) => {
  if (!weekdaysStr) return []

  if (Array.isArray(weekdaysStr)) {
    return weekdaysStr.map((d) => d.toString().trim().toLowerCase())
  }

  if (typeof weekdaysStr === 'string') {
    return weekdaysStr.split(',').map((d) => d.trim().toLowerCase())
  }

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

    // 🆕 ADD: Log the actual shift types for debugging
    console.log(
      '📋 Available Shift Types:',
      shiftTypes.value.map((st) => ({
        id: st.id,
        name: st.name,
        times: `${st.default_start_time?.substring(0, 5)} - ${st.default_end_time?.substring(0, 5)}`,
      })),
    )
  } catch (error) {
    console.error('❌ Failed to fetch data:', error.response?.data || error.message)

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
    console.log('🔄 fetchData called at:', new Date().toISOString())
    const token = localStorage.getItem('access_token')
    let companyId = localStorage.getItem('selectedCompany')

    console.log('=== FETCH DATA DEBUG ===')
    console.log('🔑 Token exists:', !!token)
    console.log('🏢 Raw companyId from localStorage:', companyId)

    try {
      const parsed = JSON.parse(companyId)
      companyId = parsed?.id || parsed
      console.log('🏢 Parsed companyId:', companyId)
    } catch {
      console.log('🏢 CompanyId is plain value (not JSON)')
    }

    if (!token) {
      console.error('❌ No token found')
      $q.notify({
        type: 'negative',
        message: 'Please log in to view schedules',
        timeout: 3000,
      })
      return
    }

    if (!companyId) {
      console.error('❌ No company selected')
      $q.notify({
        type: 'negative',
        message: 'No company selected. Please select a company.',
        timeout: 3000,
      })
      return
    }

    const url = `https://staging.wageyapp.com/organization/schedules/company/monthly/?company=${companyId}`
    console.log('🌐 API URL:', url)

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    console.log('✅ API Response Status:', res.status)
    console.log('📥 RAW API RESPONSE:', JSON.stringify(res.data, null, 2))

    if (!res.data) {
      console.error('❌ API returned null/undefined')
      return
    }

    users.value = employees.value.map((emp) => ({
      id: emp.id,
      name: emp.full_name || emp.name || `Employee ${emp.id}`,
      email: emp.email || '',
    }))

    shifts.value = []

    let employeesData = []

    if (Array.isArray(res.data)) {
      employeesData = res.data
    } else if (res.data?.results && Array.isArray(res.data.results)) {
      employeesData = res.data.results
    } else if (res.data?.data && Array.isArray(res.data.data)) {
      employeesData = res.data.data
    } else if (res.data && typeof res.data === 'object') {
      employeesData = [res.data]
    }

    console.log('📊 Processing', employeesData.length, 'employees with schedules')

    let loggedFirstSchedule = false

    employeesData.forEach((empData, index) => {
      let employee = null
      let schedules = []

      if (empData.employee && typeof empData.employee === 'object') {
        employee = empData.employee
        schedules = empData.schedules || []
      } else if (empData.id && empData.schedules) {
        employee = empData
        schedules = empData.schedules || []
      } else if (empData.id) {
        employee = empData
        schedules = empData.schedule || empData.schedule_list || []
      }

      if (!employee || !employee.id) {
        return
      }

      if (typeof schedules === 'string') {
        try {
          schedules = JSON.parse(schedules)
        } catch (e) {
          console.error('Failed to parse schedules string:', e)
          schedules = []
        }
      }

      if (!Array.isArray(schedules) || schedules.length === 0) {
        return
      }

      schedules.forEach((schedule, sIndex) => {
        try {
          if (!loggedFirstSchedule) {
            console.log('=== 🔍 FIRST SCHEDULE DETAILED ANALYSIS ===')
            console.log('📋 Full schedule object:', schedule)
            console.log('📋 All keys in schedule:', Object.keys(schedule))
            console.log('📋 Complete JSON:', JSON.stringify(schedule, null, 2))
            loggedFirstSchedule = true
          }

          if (!schedule.date) {
            return
          }

          const scheduleDate = new Date(schedule.date)
          const weekStart = new Date(selectedWeek.value.start)
          const timeDiff = scheduleDate.getTime() - weekStart.getTime()
          const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

          if (daysDiff >= 0 && daysDiff < 7) {
            // ✅ IMPROVED: Extract times first
            const startTime =
              schedule.actual_start_time?.substring(0, 5) ||
              schedule.start_time?.substring(0, 5) ||
              '09:00'
            const endTime =
              schedule.actual_end_time?.substring(0, 5) ||
              schedule.end_time?.substring(0, 5) ||
              '17:00'

            // ✅ IMPROVED: Better shift type detection
            let shiftTypeId =
              schedule.shift_type_id ||
              schedule.shift_type ||
              schedule.shiftType ||
              schedule.shiftTypeId ||
              null

            let shiftTypeName =
              schedule.shift_type_name || schedule.shiftTypeName || schedule.shift_name || 'Shift'

            // ✅ If no shift type ID, match by times
            if (!shiftTypeId && startTime && endTime && shiftTypes.value.length > 0) {
              const matchingShiftType = shiftTypes.value.find((st) => {
                const stStart = st.default_start_time?.substring(0, 5)
                const stEnd = st.default_end_time?.substring(0, 5)
                return stStart === startTime && stEnd === endTime
              })

              if (matchingShiftType) {
                shiftTypeId = matchingShiftType.id
                shiftTypeName = matchingShiftType.name
                console.log(`✅ Matched shift type by time: ${shiftTypeName} (ID: ${shiftTypeId})`)
              } else {
                // ✅ No match found - use first shift type as fallback
                console.warn(`⚠️ No shift type match for ${startTime}-${endTime}, using fallback`)
                shiftTypeId = shiftTypes.value[0].id
                shiftTypeName = shiftTypes.value[0].name
              }
            }

            // ✅ If we have name but no ID, find ID by name
            if (
              !shiftTypeId &&
              shiftTypeName &&
              shiftTypeName !== 'Shift' &&
              shiftTypes.value.length > 0
            ) {
              const foundShiftType = shiftTypes.value.find(
                (st) => st.name.toLowerCase() === shiftTypeName.toLowerCase(),
              )
              if (foundShiftType) {
                shiftTypeId = foundShiftType.id
              } else {
                // ✅ Fallback to first shift type
                shiftTypeId = shiftTypes.value[0].id
              }
            }

            // ✅ Final fallback if still no shift type
            if (!shiftTypeId && shiftTypes.value.length > 0) {
              console.warn('⚠️ Using fallback shift type for schedule:', schedule.id)
              shiftTypeId = shiftTypes.value[0].id
              shiftTypeName = shiftTypes.value[0].name
            }

            const shift = {
              id: schedule.id || `temp-${Date.now()}-${sIndex}`,
              assignmentId:
                schedule.employee_assignment_id || schedule.assignment_id || schedule.id,
              userId: employee.id,
              day: daysDiff,
              startTime: startTime,
              endTime: endTime,
              position: shiftTypeName,
              shiftTypeId: shiftTypeId, // ✅ Should now always have a value
              site: schedule.site || null,
              department: schedule.department || null,
              status: schedule.status || 'draft',
              date: schedule.date,
            }

            // ✅ WARN about missing critical fields
            if (!shift.assignmentId) {
              console.error('❌ CRITICAL: No assignment ID for shift:', schedule.id)
            }
            if (!shift.shiftTypeId) {
              console.error('❌ CRITICAL: No shift type ID for shift:', schedule.id)
            }
            if (!shift.site) {
              console.warn('⚠️ No site ID for shift:', schedule.id)
            }

            shifts.value.push(shift)
          }
        } catch (err) {
          console.error('❌ Error processing schedule:', err)
        }
      })
    })

    console.log('\n=== FINAL RESULTS ===')
    console.log('👥 Users loaded:', users.value.length)
    console.log('📋 Shifts loaded:', shifts.value.length)
    console.log('📋 First shift:', shifts.value[0])
    console.log('📋 Shifts with assignmentId:', shifts.value.filter((s) => s.assignmentId).length)
    console.log(
      '📋 Shifts WITHOUT assignmentId:',
      shifts.value.filter((s) => !s.assignmentId).length,
    )

    // ✅ LOG SHIFTS WITH MISSING SHIFT TYPES
    const shiftsWithoutShiftType = shifts.value.filter((s) => !s.shiftTypeId)
    if (shiftsWithoutShiftType.length > 0) {
      console.error(
        '❌ CRITICAL: Some shifts are missing shift type IDs:',
        shiftsWithoutShiftType.length,
      )
      console.error(
        'Affected shifts:',
        shiftsWithoutShiftType.map((s) => ({
          id: s.id,
          date: s.date,
          times: `${s.startTime}-${s.endTime}`,
        })),
      )
    }

    console.log('🔍 SAMPLE SHIFTS WITH FULL DATA:')
    shifts.value.slice(0, 3).forEach((shift, idx) => {
      console.log(`Shift ${idx + 1}:`, {
        id: shift.id,
        assignmentId: shift.assignmentId,
        assignmentIdType: typeof shift.assignmentId,
        userId: shift.userId,
        date: shift.date,
        site: shift.site,
        siteType: typeof shift.site,
        department: shift.department,
        position: shift.position,
        shiftTypeId: shift.shiftTypeId, // ✅ Check this!
        shiftTypeIdType: typeof shift.shiftTypeId,
      })
    })

    console.log(
      '🔍 ALL ASSIGNMENT IDS:',
      shifts.value.map((s) => s.assignmentId),
    )

    if (shifts.value.length > 0) {
      $q.notify({
        type: 'positive',
        message: `Loaded ${shifts.value.length} schedules`,
        timeout: 2000,
      })
    } else {
      $q.notify({
        type: 'info',
        message: 'No schedules found for the selected week.',
        timeout: 3000,
      })
    }
  } catch (e) {
    console.error('❌ FETCH ERROR:', e)
    console.error('❌ Response:', e.response?.data)

    $q.notify({
      type: 'negative',
      message: 'Failed to load schedules',
      timeout: 5000,
    })
  }
}
onMounted(async () => {
  await fetchSitesAndDepartments()
  await fetchEmployees()
  await fetchData()
  await debugEmployeeAndCompany()
})

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

const getShiftTypeDetails = (shiftTypeId) => {
  const shiftType = shiftTypes.value.find((st) => st.id === shiftTypeId)
  if (!shiftType) return ''

  const start = shiftType.default_start_time?.substring(0, 5) || ''
  const end = shiftType.default_end_time?.substring(0, 5) || ''

  return start && end ? `${start} - ${end}` : ''
}

const createScheduleRecord = async (scheduleData, dateStr) => {
  const token = localStorage.getItem('access_token')
  let companyId = localStorage.getItem('selectedCompany')

  console.log('=== CREATE SCHEDULE DEBUG ===')
  console.log('📋 Raw scheduleData:', scheduleData)
  console.log('📅 Date string:', dateStr)
  console.log('🏢 Raw companyId from localStorage:', companyId)

  if (!companyId) {
    throw new Error('No company selected')
  }

  try {
    const parsed = JSON.parse(companyId)
    companyId = parsed?.id || parsed
  } catch {
    // Already a plain value
  }

  companyId = parseInt(companyId)

  console.log('🏢 Normalized companyId:', companyId, typeof companyId)
  console.log('👤 Employee ID:', scheduleData.userId, typeof scheduleData.userId)
  console.log('🏢 Site ID:', scheduleData.site, typeof scheduleData.site)
  console.log('👔 Shift Type ID:', scheduleData.position, typeof scheduleData.position)

  if (!scheduleData.userId) {
    throw new Error('Employee ID is required')
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    scheduleData.userId,
  )

  console.log('🔑 Employee ID format - Is UUID?:', isUUID)

  const employeeId = isUUID ? scheduleData.userId : parseInt(scheduleData.userId)

  const payload = {
    company_id: companyId,
    employee_ids: [employeeId],
    schedules: [
      {
        date: dateStr,
        site_id: parseInt(scheduleData.site),
        shift_type_id: parseInt(scheduleData.position),
        department_id: parseInt(scheduleData.department || departments.value[0]?.id), // fallback to first department
      },
    ],
  }

  if (scheduleData.department) {
    payload.schedules[0].department_id = parseInt(scheduleData.department)
  }

  console.log('📤 Final Payload:', JSON.stringify(payload, null, 2))
  console.log('📤 Payload Types:', {
    company_id: typeof payload.company_id,
    employee_ids: typeof payload.employee_ids[0],
    site_id: typeof payload.schedules[0].site_id,
    shift_type_id: typeof payload.schedules[0].shift_type_id,
  })

  try {
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

    console.log('✅ SUCCESS - Response:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ FAILED - Full Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
    })

    if (error.response?.data?.results && error.response.data.results.length === 0) {
      console.error('⚠️ DIAGNOSIS: Empty results array - Common causes:')
      console.error('  1. Employee is not linked to this company')
      console.error('  2. Invalid employee_id format')
      console.error("  3. Company_id does not match employee's company")
      console.error('  4. Site or shift_type does not exist for this company')

      try {
        const empResponse = await axios.get(
          `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        const employeeExists = empResponse.data.some((emp) => emp.id === employeeId)

        console.error('🔍 Employee verification:', {
          employeeId: employeeId,
          existsInCompany: employeeExists,
          totalEmployees: empResponse.data.length,
        })

        if (!employeeExists) {
          throw new Error(`Employee ${employeeId} is not linked to company ${companyId}`)
        }
      } catch (verifyError) {
        console.error('❌ Could not verify employee:', verifyError)
      }
    }

    throw error
  }
}

const handleScheduleError = (error) => {
  console.error('❌ Full Error Object:', error)
  console.error('❌ Error Response:', error.response)
  console.error('❌ Error Data:', error.response?.data)

  let errorMessage = 'Failed to create schedule'
  let caption = 'Please try again'

  if (error.response?.data) {
    const data = error.response.data

    console.error('❌ Full Error Data:', JSON.stringify(data, null, 2))

    if (data.results && Array.isArray(data.results) && data.results.length === 0) {
      errorMessage = 'Could not create schedule'
      caption =
        'Common causes: Employee not linked to company, invalid site/shift type, or data mismatch. Check console for details.'
    } else if (data.errors && Array.isArray(data.errors)) {
      errorMessage = data.errors.join('; ')
      caption = 'Please correct the errors above'
    } else if (typeof data === 'object') {
      const errorDetails = []

      Object.keys(data).forEach((key) => {
        const value = data[key]
        if (key !== 'results' || (Array.isArray(value) && value.length > 0)) {
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
    } else if (typeof data === 'string') {
      errorMessage = data
    }
  }

  if (error.response?.status === 400) {
    caption = 'Bad Request - Check console for detailed validation errors'
  } else if (error.response?.status === 404) {
    caption = 'Resource not found - Check company, site, or shift type IDs'
  } else if (error.response?.status === 403) {
    caption = 'Permission denied - You may not have access to this resource'
  }

  $q.notify({
    type: 'negative',
    message: errorMessage,
    caption: caption,
    timeout: 10000,
    position: 'top',
    multiLine: true,
    actions: [
      {
        label: 'View Console',
        color: 'white',
        handler: () => console.table({ error: error.response?.data }),
      },
      { label: 'Dismiss', color: 'white' },
    ],
  })
}

const debugEmployeeAndCompany = async () => {
  try {
    const token = localStorage.getItem('access_token')
    let companyId = localStorage.getItem('selectedCompany')

    try {
      const parsed = JSON.parse(companyId)
      companyId = parsed?.id || parsed
    } catch {
      // Already plain value
    }

    companyId = parseInt(companyId)

    console.log('=== EMPLOYEE-COMPANY DEBUG ===')
    console.log('🏢 Company ID:', companyId)

    const empResponse = await axios.get(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    console.log('👥 Total Employees:', empResponse.data.length)
    console.log(
      '👥 Employee IDs:',
      empResponse.data.map((e) => ({
        id: e.id,
        name: e.full_name || e.name,
        type: typeof e.id,
      })),
    )

    const sitesResponse = await axios.get(
      `https://staging.wageyapp.com/organization/sites/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    console.log(
      '🏢 Sites:',
      (sitesResponse.data.results || sitesResponse.data).map((s) => ({
        id: s.id,
        name: s.name,
      })),
    )

    const shiftResponse = await axios.get(
      `https://staging.wageyapp.com/organization/shift-types/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    console.log(
      '👔 Shift Types:',
      (shiftResponse.data.results || shiftResponse.data).map((st) => ({
        id: st.id,
        name: st.name,
      })),
    )
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
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

const addSchedule = async () => {
  const n = newSchedule.value

  if (!n.userId) {
    $q.notify({ type: 'negative', message: 'Please select an employee.' })
    return
  }

  if (!n.selectedDate) {
    $q.notify({ type: 'negative', message: 'Please select a date.' })
    return
  }

  if (!n.position) {
    $q.notify({ type: 'negative', message: 'Please select a shift type.' })
    return
  }

  if (!n.site) {
    $q.notify({ type: 'negative', message: 'Please select a site.' })
    return
  }

  isCheckingConflict.value = true
  addConflictWarning.value = false

  try {
    console.log('🔍 Verifying employee-company link...')
    const isLinked = await verifyEmployeeCompanyLink(n.userId)

    if (!isLinked) {
      isCheckingConflict.value = false
      const selectedEmployee = employees.value.find((emp) => emp.id === n.userId)
      $q.notify({
        type: 'negative',
        message: `${selectedEmployee?.full_name || 'Employee'} is not linked to this company.`,
        timeout: 8000,
      })
      return
    }

    console.log('✅ Employee verified')

    const hasConflict = await checkEmployeeScheduleOnDate(n.userId, n.selectedDate)

    if (hasConflict) {
      isCheckingConflict.value = false
      const selectedEmployee = employees.value.find((emp) => emp.id === n.userId)
      $q.notify({
        type: 'warning',
        message: `${selectedEmployee?.full_name || 'Employee'} already has a schedule on ${n.selectedDate}.`,
        timeout: 6000,
      })
      return
    }

    await createScheduleRecord(n, n.selectedDate)

    isCheckingConflict.value = false
    showAddModal.value = false

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

    setTimeout(() => fetchData(), 500)
  } catch (error) {
    isCheckingConflict.value = false
    console.error('❌ Error adding schedule:', error)
    handleScheduleError(error)
  }
}

const quickAddSchedule = async () => {
  console.log('🚀 Quick Add Started')

  const { userId, day, shifts } = quickAdd.value

  console.log('📋 Quick Add Values:', { userId, day, shifts })

  if (!userId || day === null) {
    $q.notify({
      type: 'negative',
      message: 'Employee and day are required.',
    })
    return
  }

  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i]
    if (!shift.site || !shift.shiftType) {
      $q.notify({
        type: 'negative',
        message: `Please fill all fields for shift ${i + 1}`,
      })
      return
    }
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
      isAddingShift.value = false
      return
    }

    console.log('=== DATE CALCULATION DEBUG ===')
    const { start } = selectedWeek.value
    const weekStart = start instanceof Date ? start : new Date(start)

    const targetDate = new Date(weekStart)
    targetDate.setDate(targetDate.getDate() + day)

    console.log('Target date:', targetDate)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(targetDate)
    compareDate.setHours(0, 0, 0, 0)

    if (compareDate < today) {
      $q.notify({
        type: 'warning',
        message: 'Cannot schedule shifts in the past',
        caption: `Selected date: ${targetDate.toLocaleDateString()}`,
      })
      isAddingShift.value = false
      return
    }

    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const dayOfMonth = String(targetDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayOfMonth}`

    console.log('Final dateStr:', dateStr)

    const schedulePayloads = shifts.map((shift) => ({
      date: dateStr,
      site_id: shift.site,
      shift_type_id: shift.shiftType,
    }))

    const payload = {
      company_id: parseInt(companyId),
      employee_ids: [userId],
      schedules: schedulePayloads,
    }

    console.log('📤 Sending payload with multiple shifts:', JSON.stringify(payload, null, 2))

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

    console.log('✅ Success:', response.data)

    $q.notify({
      type: 'positive',
      message: `${shifts.length} shift${shifts.length > 1 ? 's' : ''} added successfully for ${days[day]}!`,
      icon: 'check_circle',
    })

    closeQuickAddModal()
    setTimeout(() => fetchData(), 500)
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message)

    let errorMsg = 'Failed to add shifts'

    if (error.response?.data) {
      const data = error.response.data
      if (data.detail) {
        errorMsg = data.detail
      } else if (data.results && data.results.length === 0) {
        errorMsg = 'Unable to create schedules. Check for conflicts or invalid data.'
      } else if (typeof data === 'object') {
        const errors = Object.entries(data)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('; ')
        if (errors) errorMsg = errors
      }
    }

    $q.notify({
      type: 'negative',
      message: errorMsg,
      timeout: 5000,
    })
  } finally {
    isAddingShift.value = false
  }
}

const openAddModal = () => {
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
  addConflictWarning.value = false
  fetchEmployees()
  showAddModal.value = true
}

const closeAddModal = () => (showAddModal.value = false)

const deleteShift = async (id) => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) {
      shifts.value = shifts.value.filter((s) => s.id !== id)
      $q.notify({ type: 'positive', message: 'Shift removed (local)' })
      return
    }

    await axios.delete(`https://staging.wageyapp.com/organization/assignments/assign/${id}/`, {
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
    shifts: [
      {
        site: null,
        shiftType: null,
      },
    ],
  }
  showQuickAddModal.value = true
}

const addShiftRow = () => {
  quickAdd.value.shifts.push({
    site: null,
    shiftType: null,
  })
}

const removeShiftRow = (index) => {
  quickAdd.value.shifts.splice(index, 1)
}

const closeQuickAddModal = () => {
  showQuickAddModal.value = false
  quickAdd.value = {
    userId: null,
    day: null,
    shifts: [],
  }
}

const openReassignModal = (shift) => {
  console.log('=== 🔍 OPEN UPDATE SHIFT MODAL ===')
  console.log('📋 Shift data:', {
    id: shift.id,
    assignmentId: shift.assignmentId,
    shiftTypeId: shift.shiftTypeId,
    site: shift.site,
    department: shift.department,
    date: shift.date,
    userId: shift.userId,
  })

  // Validate required fields
  const missingFields = []

  if (!shift.assignmentId) missingFields.push('Assignment ID')
  if (!shift.site) missingFields.push('Site')
  if (!shift.shiftTypeId) missingFields.push('Shift Type')

  if (missingFields.length > 0) {
    console.error('❌ Cannot update shift - Missing:', missingFields)

    $q.notify({
      type: 'negative',
      message: 'Cannot update this shift',
      caption: `Missing required fields: ${missingFields.join(', ')}`,
      timeout: 5000,
    })
    return
  }

  // Initialize reassign data with current shift values
  reassignData.value = {
    assignmentId: shift.assignmentId,
    shiftTypeId: shift.shiftTypeId,
    siteId: shift.site,
    departmentId: shift.department || null,
    currentEmployee: shift.userId,
    date: shift.date,
    day: shift.day,
    originalShift: { ...shift }, // Store original shift for reference
  }

  console.log('✅ Update shift data ready:', reassignData.value)
  showReassignModal.value = true
}

const closeReassignModal = () => {
  showReassignModal.value = false
  reassignData.value = {
    assignmentId: null,
    shiftTypeId: null,
    siteId: null,
    departmentId: null,
    currentEmployee: null,
    date: null,
    day: null,
    originalShift: null,
  }
}

// Update shift assignment function
// This allows admin to change the shift_type_id, site_id, and department_id for an assignment
const reassignShift = async () => {
  isReassigning.value = true
  const token = localStorage.getItem('access_token')

  try {
    const r = reassignData.value

    console.log('🔍 Starting shift update...')
    console.log('📋 Update data:', {
      assignmentId: r.assignmentId,
      assignmentIdType: typeof r.assignmentId,
      siteId: r.siteId,
      shiftTypeId: r.shiftTypeId,
      departmentId: r.departmentId,
      currentEmployee: r.currentEmployee,
    })

    // ============================================
    // VALIDATION
    // ============================================
    if (!r.assignmentId) {
      $q.notify({
        type: 'negative',
        message: 'Assignment ID is missing',
      })
      isReassigning.value = false
      return
    }

    if (!r.siteId) {
      $q.notify({
        type: 'negative',
        message: 'Site is required',
      })
      isReassigning.value = false
      return
    }

    if (!r.shiftTypeId) {
      $q.notify({
        type: 'negative',
        message: 'Shift type is required',
      })
      isReassigning.value = false
      return
    }

    // ============================================
    // BUILD PAYLOAD
    // ============================================
    // Based on the API specification:
    // { "assignment_id": 0, "shift_type_id": 0, "site_id": 0, "department_id": 0 }
    const payload = {
      assignment_id: parseInt(r.assignmentId),
      shift_type_id: parseInt(r.shiftTypeId),
      site_id: parseInt(r.siteId),
    }

    // Add department_id only if it's provided
    if (r.departmentId) {
      payload.department_id = parseInt(r.departmentId)
    }

    console.log('📤 Update payload:', JSON.stringify(payload, null, 2))
    console.log('📤 Payload field types:', {
      assignment_id: typeof payload.assignment_id,
      shift_type_id: typeof payload.shift_type_id,
      site_id: typeof payload.site_id,
      department_id: payload.department_id ? typeof payload.department_id : 'not included',
    })

    // ============================================
    // MAKE API CALL
    // ============================================
    const response = await axios.patch(
      'https://staging.wageyapp.com/organization/assignments/reassign/',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    console.log('✅ Shift update API response:', response.data)
    console.log('✅ Response status:', response.status)

    // ============================================
    // SUCCESS NOTIFICATION
    // ============================================
    const employeeName = getEmployeeName(r.currentEmployee)
    const shiftTypeName = getPositionName(r.shiftTypeId)

    $q.notify({
      type: 'positive',
      message: 'Shift updated successfully!',
      caption: `${employeeName}'s shift updated to ${shiftTypeName}`,
      icon: 'check_circle',
      timeout: 3000,
    })

    closeReassignModal()

    // ============================================
    // FORCE REFRESH FROM API
    // ============================================
    console.log('🔄 Force refreshing data from server...')

    // Clear current shifts to force a clean reload
    shifts.value = []

    // Wait a bit for backend to process
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Fetch fresh data
    await fetchData()

    console.log('✅ Data refresh complete. New shifts count:', shifts.value.length)
  } catch (error) {
    console.error('❌ Reassign failed:', error)
    console.error('❌ Error response:', error.response?.data)
    console.error('❌ Error status:', error.response?.status)
    console.error('❌ Full error object:', JSON.stringify(error.response, null, 2))

    let errorMsg = 'Failed to reassign shift.'
    let errorCaption = ''

    if (error.response?.status === 400) {
      const data = error.response.data
      console.error('❌ 400 Bad Request - Details:', data)

      if (typeof data === 'object') {
        const errors = []
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            errors.push(`${key}: ${value.join(', ')}`)
          } else {
            errors.push(`${key}: ${value}`)
          }
        })
        if (errors.length > 0) {
          errorMsg = errors.join('; ')
        }
      } else if (data.detail) {
        errorMsg = data.detail
      }

      errorCaption = 'Check the console for detailed validation errors'
    } else if (error.response?.status === 404) {
      errorMsg = 'Assignment not found'
      errorCaption = 'The assignment may be invalid or the shift was deleted'
    } else if (error.response?.status === 403) {
      errorMsg = 'Permission denied'
      errorCaption = 'You may not have access to reassign this shift'
    } else if (error.response?.data?.detail) {
      errorMsg = error.response.data.detail
    }

    $q.notify({
      type: 'negative',
      message: errorMsg,
      caption: errorCaption,
      timeout: 6000,
      actions: [{ label: 'Dismiss', color: 'white' }],
    })
  } finally {
    isReassigning.value = false
  }
}

const applyFilters = () => {
  console.log('🔍 Filters applied:', {
    site: filters.value.site,
    employee: filters.value.employee,
    searchTerm: searchTerm.value,
  })
}

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
