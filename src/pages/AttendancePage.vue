<template>
  <q-page class="attendance-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Attendance</h1>
          <div class="header-actions">
            <q-btn
              unelevated
              color="primary"
              icon="add"
              label="Add Attendance"
              class="add-attendance-btn"
              no-caps
              @click="openAddDialog"
            />
            <q-input
              v-model="employeeSearch"
              placeholder="Search by employee name..."
              class="header-search"
              dense
              outlined
              clearable
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <AttendanceStatsCards :loading="loading" :stats="statsObj" />

      <!-- Filters Section -->
      <div class="filters-section">
        <div class="filters-card">
          <div class="filters-header">
            <h3 class="filters-title">Filter Records</h3>
            <div class="filters-header-actions">
              <div class="date-nav-wrapper">
                <q-btn flat round dense icon="chevron_left" class="date-nav-btn" @click="goToPreviousDay" />
                <q-input
                  dense
                  outlined
                  v-model="currentDate"
                  type="date"
                  class="filter-input date-nav-input"
                  @update:model-value="onDateNavChange"
                >
                  <template v-slot:prepend>
                    <q-icon name="event" />
                  </template>
                </q-input>
                <q-btn flat round dense icon="chevron_right" class="date-nav-btn" @click="goToNextDay" :disable="currentDate >= today" />
              </div>
              <q-btn flat dense icon="clear_all" label="Clear All" @click="clearAllFilters" class="clear-btn" size="sm" />
            </div>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <AttendanceTable
        :rows="filteredAttendanceRows"
        :loading="loading"
        :page="pagination.page"
        :total-pages="totalPages"
        :cost-center-filter="filters.cost_center"
        @update:cost-center-filter="(val) => (filters.cost_center = val)"
        :cost-center-options="costCenterOptions"
        :options-loading="filtersLoading"
        :employees="employees"
        @refresh="fetchAttendanceData()"
        @view-selfie="viewSelfie"
        @view-photo="viewEmployeePhoto"
        @edit-time="openInlineEdit"
        @edit-cost-center="openCostCenterInlineEdit"
        @prev-page="previousPage"
        @next-page="nextPage"
      />
    </div>

    <!-- Date Range Picker Dialog -->
    <AttendanceDateRangePicker
      v-model="showDatePicker"
      :initial-range="tempDateRange"
      @apply="applyDateRange"
    />

    <!-- Selfie Viewer Dialog -->
    <AttendanceSelfieViewer v-model="showSelfieDialog" :image-url="selectedSelfie" :title="selfieDialogTitle" />

    <!-- Add Attendance Dialog -->
    <AttendanceAddDialog
      v-model="showAddDialog"
      v-model:record="newRecord"
      :site-options="siteOptions"
      :cost-center-options="costCenterOptions"
      :employee-options="employeeOptions"
      :schedule="employeeSchedule"
      :schedule-loading="loadingSchedule"
      :options-loading="filtersLoading"
      :saving="creating"
      @submit="submitAttendance"
      @filter-employees="filterEmployees"
      @fetch-schedule="fetchEmployeeSchedule"
    />

    <!-- Employee Photo Viewer Dialog -->
    <AttendanceEmployeePhotoViewer v-model="showEmployeePhotoDialog" :image-url="selectedEmployeePhoto" />

    <!-- Inline Time Edit Dialog -->
    <AttendanceInlineEditDialog
      v-model="showInlineEditDialog"
      v-model:value="inlineEdit.value"
      :field="inlineEdit.field"
      :employee-name="inlineEdit.employeeName"
      :date="inlineEdit.date"
      :saving="inlineEdit.saving"
      @save="saveInlineEdit"
    />

    <!-- Inline Cost Center Edit Dialog -->
    <AttendanceCostCenterEditDialog
      v-model="showCostCenterInlineDialog"
      v-model:value="costCenterInlineEdit.value"
      :employee-name="costCenterInlineEdit.employeeName"
      :date="costCenterInlineEdit.date"
      :cost-center-options="costCenterOptions"
      :loading="filtersLoading"
      :saving="costCenterInlineEdit.saving"
      @save="saveCostCenterInlineEdit"
    />

    <!-- Edit Attendance Dialog -->
    <AttendanceEditDialog
      v-model="showEditDialog"
      v-model:record="editingRecord"
      :cost-center-options="costCenterOptions"
      :options-loading="filtersLoading"
      :saving="updating"
      @submit="updateAttendance"
    />
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAttendance } from '@/composables/page/useAttendance'
import { useEmployees } from '@/composables/page/useEmployees'
import { toUTC, formatInTimezone } from '@/composables/utils/timezone'
import { useOrganization } from '@/composables/page/useOrganization'
import AttendanceStatsCards from '@/components/pages/Attendance/AttendanceStatsCards.vue'
import AttendanceTable from '@/components/pages/Attendance/AttendanceTable.vue'
import AttendanceDateRangePicker from '@/components/pages/Attendance/AttendanceDateRangePicker.vue'
import AttendanceSelfieViewer from '@/components/pages/Attendance/AttendanceSelfieViewer.vue'
import AttendanceAddDialog from '@/components/pages/Attendance/AttendanceAddDialog.vue'
import AttendanceEmployeePhotoViewer from '@/components/pages/Attendance/AttendanceEmployeePhotoViewer.vue'
import AttendanceInlineEditDialog from '@/components/pages/Attendance/AttendanceInlineEditDialog.vue'
import AttendanceCostCenterEditDialog from '@/components/pages/Attendance/AttendanceCostCenterEditDialog.vue'
import AttendanceEditDialog from '@/components/pages/Attendance/AttendanceEditDialog.vue'

const $q = useQuasar()

// ─── Composables ──────────────────────────────────────────────────────────────
const {
  attendanceData,
  loading,
  fetchAttendanceByDate,
  fetchEmployeeSchedule: fetchScheduleFromComposable,
  logAttendance,
  updateAttendance: updateAttendanceApi,
} = useAttendance()

const { employees, fetchEmployees, fetchEmployee } = useEmployees()
const {
  sites: rawSites,
  costCenters: rawCostCenters,
  fetchSites: fetchSitesApi,
  fetchCostCenters: fetchCostCentersApi,
} = useOrganization()

// ─── Local UI state ───────────────────────────────────────────────────────────
const filtersLoading = ref(false)

// Dialog states
const showDatePicker = ref(false)
const showEditDialog = ref(false)
const showAddDialog = ref(false)
const showSelfieDialog = ref(false)
const selectedSelfie = ref('')
const selfieDialogTitle = ref('')

// Inline time edit state
const showInlineEditDialog = ref(false)
const inlineEdit = ref({
  record: null,
  field: '',
  value: '',
  date: '',
  employeeName: '',
  saving: false,
})

// Inline cost center edit state
const showCostCenterInlineDialog = ref(false)
const costCenterInlineEdit = ref({
  record: null,
  value: null,
  date: '',
  employeeName: '',
  saving: false,
})

// Loading states
const updating = ref(false)
const creating = ref(false)

// Schedule state
const employeeSchedule = ref(null)
const loadingSchedule = ref(false)
const scheduleError = ref(null)

const showEmployeePhotoDialog = ref(false)
const selectedEmployeePhoto = ref('')
const selectedEmployeeName = ref('')

const pagination = ref({
  page: 1,
  rowsPerPage: 25,
  rowsNumber: 0,
})

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const filters = ref({
  date_from: today,
  date_to: today,
  cost_center: '',
})

const currentDate = ref(today)
const tempDateRange = ref({ from: '', to: '' })

// Filter options
const siteOptions = ref([])
const costCenterOptions = ref([])
const employeeOptions = ref([])
const employeeSearch = ref('')

// Edit form
const editingRecord = ref(null)

// Add form
const newRecord = ref({
  employee: '',
  site_id: '',
  cost_center_id: '',
  date: '',
  time_in: '',
  time_out: '',
  source: 'admin',
})

const isAdmin = ref(false)
const userData = JSON.parse(localStorage.getItem('user') || '{}')
if (userData.role === 'admin') isAdmin.value = true

// ─── Timezone cache ──────────────────────────────────────────────────────────────
const employeeTimezoneCache = reactive({})
const fetchedEmployees = ref({})

function getEmployeeId(employee) {
  if (!employee) return null
  if (typeof employee === 'object') return employee.uuid || employee.id || employee.employee_id
  return employee
}

function getTimezoneForEmployee(employee) {
  const empId = getEmployeeId(employee)
  if (!empId) return null
  if (employeeTimezoneCache[empId]) return employeeTimezoneCache[empId]
  if (typeof employee === 'object' && employee.timezone) {
    employeeTimezoneCache[empId] = employee.timezone
    return employee.timezone
  }
  const found = employees.value.find(e => e.uuid === empId || e.id === empId)
  if (found?.timezone) {
    employeeTimezoneCache[empId] = found.timezone
    return found.timezone
  }
  return null
}

function triggerTimezoneFetch(data) {
  const toFetch = []
  for (const row of data) {
    const empId = getEmployeeId(row.employee)
    if (!empId) continue
    if (employeeTimezoneCache[empId]) continue
    if (typeof row.employee === 'object' && row.employee.timezone) {
      employeeTimezoneCache[empId] = row.employee.timezone
      continue
    }
    const found = employees.value.find(e => e.uuid === empId || e.id === empId)
    if (found?.timezone) {
      employeeTimezoneCache[empId] = found.timezone
      continue
    }
    toFetch.push(empId)
  }
  for (const empId of toFetch) {
    lazyFetchTimezone(empId)
  }
}

async function lazyFetchTimezone(empId) {
  if (fetchedEmployees.value[empId]) return
  fetchedEmployees.value[empId] = true
  try {
    const detail = await fetchEmployee(empId)
    if (detail?.timezone) {
      employeeTimezoneCache[empId] = detail.timezone
    }
  } catch { /* timezone fetch failed, will use browser timezone */ }
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const statsObj = computed(() => {
  const data = attendanceData.value
  const total = data.length
  const app = data.filter((item) => item.source === 'app').length
  const terminal = data.filter((item) => item.source === 'terminal').length
  const system = data.filter((item) => item.source === 'system').length
  return { total, app, terminal, system }
})

const filteredAttendanceRows = computed(() => {
  let data = attendanceData.value
  if (employeeSearch.value && employeeSearch.value.trim()) {
    const term = employeeSearch.value.trim().toLowerCase()
    data = data.filter((row) =>
      getEmployeeName(row.employee).toLowerCase().includes(term),
    )
  }
  return data.map((row) => ({
    ...row,
    _timezone: getTimezoneForEmployee(row.employee) || '',
  }))
})

const totalPages = computed(() => {
  return Math.ceil(pagination.value.rowsNumber / pagination.value.rowsPerPage) || 1
})

// ─── Date navigation ──────────────────────────────────────────────────────────
function goToPreviousDay() {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() - 1)
  const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  currentDate.value = newDate
  filters.value.date_from = newDate
  filters.value.date_to = newDate
  pagination.value.page = 1
  fetchAttendanceData()
}

function goToNextDay() {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() + 1)
  const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  currentDate.value = newDate
  filters.value.date_from = newDate
  filters.value.date_to = newDate
  pagination.value.page = 1
  fetchAttendanceData()
}

function onDateNavChange(val) {
  if (!val) return
  currentDate.value = val
  filters.value.date_from = val
  filters.value.date_to = val
  pagination.value.page = 1
  fetchAttendanceData()
}

// ─── Selfie viewer ────────────────────────────────────────────────────────────
function viewSelfie(imageUrl, title) {
  selectedSelfie.value = imageUrl
  selfieDialogTitle.value = `${title} Selfie`
  showSelfieDialog.value = true
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
async function fetchEmployeeSchedule(employeeId, date) {
  if (!employeeId || !date) return

  loadingSchedule.value = true
  scheduleError.value = null
  employeeSchedule.value = null

  try {
    const scheduleData = await fetchScheduleFromComposable(employeeId, date)
    if (scheduleData) {
      employeeSchedule.value = {
        employee_id: scheduleData.employee_id,
        employee_name: scheduleData.employee_name,
        position: scheduleData.position_name,
        site: scheduleData.site_name,
        date: scheduleData.schedule_date,
        shift_start: formatScheduleTime(scheduleData.start_time),
        shift_end: formatScheduleTime(scheduleData.end_time),
        status: scheduleData.status,
      }
    } else {
      employeeSchedule.value = null
    }
  } catch (error) {
    scheduleError.value =
      error.response?.data?.message ?? error.response?.data?.detail ?? 'Failed to load schedule'
    employeeSchedule.value = null
  } finally {
    loadingSchedule.value = false
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchAttendanceData(params = {}) {
  try {
    const extraParams = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      ...(filters.value.cost_center ? { cost_center: filters.value.cost_center } : {}),
      ...params,
    }

    const data = await fetchAttendanceByDate(currentDate.value, extraParams)
    attendanceData.value = [...data]
    pagination.value.rowsNumber = data.length

    if (data.length === 0) {
      showErrorNotification('No attendance records found for this period.')
    }

    triggerTimezoneFetch(data)
  } catch (error) {
    showErrorNotification(
      error.response?.data?.detail ??
        error.response?.data?.message ??
        'Failed to load attendance data',
    )
    attendanceData.value = []
  }
}

async function fetchSites() {
  filtersLoading.value = true
  try {
    await fetchSitesApi()
    siteOptions.value = rawSites.value.map((site) => ({
      label: site.name || site.site_name || site.title || `Site ${site.id}`,
      value: site.id || site.site_id || site.uuid,
      site,
    }))
  } catch (error) {
    showErrorNotification(error.response?.data?.detail ?? 'Failed to load sites')
    siteOptions.value = []
  } finally {
    filtersLoading.value = false
  }
}

async function fetchCostCenters() {
  try {
    await fetchCostCentersApi()
    costCenterOptions.value = rawCostCenters.value.map((cc) => ({
      label: cc.name || `Cost Center ${cc.id}`,
      value: cc.id,
      costCenter: cc,
    }))
  } catch {
    costCenterOptions.value = []
  }
}

async function fetchEmployeeDetails() {
  filtersLoading.value = true
  try {
    await fetchEmployees()
    employeeOptions.value = employees.value
      .map((emp) => ({
        label: getEmployeeName(emp) || 'Unknown Employee',
        value: emp.uuid || emp.id,
        employee: emp,
      }))
      .filter((opt) => opt.label !== 'Unknown Employee')

    if (employeeOptions.value.length === 0) {
      showErrorNotification('No employees found. Please add employees first.')
    }
  } catch (error) {
    showErrorNotification(error.response?.data?.detail ?? 'Failed to load employees')
    employeeOptions.value = []
  } finally {
    filtersLoading.value = false
  }
}

// ─── Submit attendance (add) ──────────────────────────────────────────────────
async function submitAttendance(record) {
  if (!record.employee) {
    showErrorNotification('Please select an employee')
    return
  }
  if (!record.time_in || !record.time_out) {
    showErrorNotification('Please enter both time in and time out')
    return
  }

  const employeeId = getEmployeeId(record.employee)
  const selectedEmp = employees.value.find(
    (emp) => emp.id === employeeId || emp.uuid === employeeId,
  )
  const empTimezone = selectedEmp?.timezone || employeeTimezoneCache[employeeId]

  const timeIn = new Date(toUTC(record.date, record.time_in, empTimezone))
  let timeOut = new Date(toUTC(record.date, record.time_out, empTimezone))
  if (timeOut <= timeIn) timeOut.setDate(timeOut.getDate() + 1)

  if (record.date && !employeeSchedule.value && !loadingSchedule.value) {
    try {
      await $q.dialog({
        title: 'No Schedule Found',
        message:
          'This employee does not have a schedule for the selected date. Do you want to proceed anyway?',
        cancel: true,
        persistent: true,
      })
    } catch {
      return
    }
  }

  creating.value = true

  try {
    if (!selectedEmp) {
      showErrorNotification('Employee not found.')
      return
    }

    const employeeUUID = selectedEmp.uuid || selectedEmp.id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!employeeUUID || !uuidRegex.test(employeeUUID)) {
      showErrorNotification('Invalid employee ID format.')
      return
    }

    await logAttendance({
      source: 'manual',
      time_in_source: 'manual',
      employee_id: employeeUUID,
      timestamp: timeIn.toISOString(),
      ...(record.site_id && { site_id: record.site_id }),
      ...(record.cost_center_id != null && { cost_center: record.cost_center_id }),
    })

    await new Promise((resolve) => setTimeout(resolve, 500))

    await logAttendance({
      source: 'manual',
      time_out_source: 'manual',
      employee_id: employeeUUID,
      timestamp: timeOut.toISOString(),
      ...(record.site_id && { site_id: record.site_id }),
      ...(record.cost_center_id != null && { cost_center: record.cost_center_id }),
    })

    showSuccessNotification('Attendance recorded successfully!')
    closeAddDialog()
    await fetchAttendanceData()
  } catch (error) {
    const data = error.response?.data
    const msg =
      typeof data === 'string'
        ? data
        : (data?.reason ?? data?.detail ?? data?.message ?? 'Failed to record attendance')
    showErrorNotification(msg)
  } finally {
    creating.value = false
  }
}

// ─── Inline time edit ─────────────────────────────────────────────────────────
function openInlineEdit(row, field) {
  const currentValue = field === 'time_in' ? row.time_in : row.time_out
  inlineEdit.value = {
    record: row,
    field,
    value: formatTimeForInput(currentValue, getTimezoneForEmployee(row.employee)),
    date: row.date,
    employeeName: getEmployeeName(row.employee),
    saving: false,
  }
  showInlineEditDialog.value = true
}

function closeInlineEdit() {
  showInlineEditDialog.value = false
  inlineEdit.value = { record: null, field: '', value: '', date: '', employeeName: '', saving: false }
}

async function saveInlineEdit() {
  if (!inlineEdit.value.value || !inlineEdit.value.record) return

  inlineEdit.value.saving = true
  try {
    const record = inlineEdit.value.record
    const field = inlineEdit.value.field
    const date = record.date
    const empTimezone = getTimezoneForEmployee(record.employee)
    let newTimestamp = toUTC(date, inlineEdit.value.value, empTimezone)

    const existingTimeIn = field === 'time_in' ? newTimestamp : record.time_in
    const existingTimeOut = field === 'time_out' ? newTimestamp : record.time_out

    let timeOutTimestamp = existingTimeOut
    if (existingTimeIn && existingTimeOut) {
      const tIn = new Date(existingTimeIn)
      let tOut = new Date(existingTimeOut)
      if (tOut <= tIn) {
        tOut.setDate(tOut.getDate() + 1)
        timeOutTimestamp = tOut.toISOString()
      }
    }

    await updateAttendanceApi(record.id, {
      time_in: existingTimeIn,
      time_out: timeOutTimestamp,
      source: record.source || 'admin',
    })

    showSuccessNotification(`${field === 'time_in' ? 'Time In' : 'Time Out'} updated successfully`)
    closeInlineEdit()
    await fetchAttendanceData()
  } catch (error) {
    const data = error.response?.data
    const msg = typeof data === 'string' ? data : (data?.detail ?? data?.message ?? 'Failed to update')
    showErrorNotification(msg)
  } finally {
    inlineEdit.value.saving = false
  }
}

// ─── Inline cost center edit ──────────────────────────────────────────────────
function openCostCenterInlineEdit(row) {
  const rawCc = row.cost_center
  let resolvedId = null
  if (rawCc) {
    if (typeof rawCc === 'object') {
      resolvedId = rawCc.id ?? null
    } else {
      const match = costCenterOptions.value.find((cc) => cc.label === rawCc || cc.value === rawCc)
      resolvedId = match ? match.value : null
    }
  }
  costCenterInlineEdit.value = {
    record: row,
    value: resolvedId,
    date: row.date,
    employeeName: getEmployeeName(row.employee),
    saving: false,
  }
  showCostCenterInlineDialog.value = true
}

function closeCostCenterInlineEdit() {
  showCostCenterInlineDialog.value = false
  costCenterInlineEdit.value = { record: null, value: null, date: '', employeeName: '', saving: false }
}

async function saveCostCenterInlineEdit() {
  if (!costCenterInlineEdit.value.record) return

  costCenterInlineEdit.value.saving = true
  try {
    const record = costCenterInlineEdit.value.record
    await updateAttendanceApi(record.id, {
      time_in: record.time_in || null,
      time_out: record.time_out || null,
      time_in_source: record.time_in_source || record.source || 'admin',
      time_out_source: record.time_out_source || record.source || 'admin',
      source: record.source || 'admin',
      cost_center: costCenterInlineEdit.value.value ?? null,
    })

    showSuccessNotification('Cost center updated successfully')
    closeCostCenterInlineEdit()
    await fetchAttendanceData()
  } catch (error) {
    const data = error.response?.data
    const msg =
      typeof data === 'string'
        ? data
        : (data?.detail ?? data?.message ?? 'Failed to update cost center')
    showErrorNotification(msg)
  } finally {
    costCenterInlineEdit.value.saving = false
  }
}

// ─── Update attendance (edit dialog) ─────────────────────────────────────────
async function updateAttendance(record) {
  if (!record) return

  updating.value = true
  try {
    const selectedEmp = employees.value.find(
      (emp) =>
        emp.id === record.employee ||
        emp.uuid === record.employee ||
        (typeof record.employee === 'object' &&
          (emp.id === record.employee.id || emp.uuid === record.employee.uuid)),
    )

    if (!selectedEmp) {
      showErrorNotification('Employee not found.')
      return
    }

    const empTimezone = selectedEmp?.timezone || employeeTimezoneCache[getEmployeeId(record.employee)]

    let timeInTimestamp = null
    let timeOutTimestamp = null

    if (record.time_in) {
      timeInTimestamp = toUTC(record.date, record.time_in, empTimezone)
    }

    if (record.time_out) {
      let timeOutDate = new Date(toUTC(record.date, record.time_out, empTimezone))
      if (record.time_in && timeOutDate <= new Date(timeInTimestamp)) {
        timeOutDate.setDate(timeOutDate.getDate() + 1)
      }
      timeOutTimestamp = timeOutDate.toISOString()
    }

    await updateAttendanceApi(record.id, {
      time_in: timeInTimestamp,
      time_out: timeOutTimestamp,
      time_in_source: record.time_in_source || record.source || 'admin',
      time_out_source: record.time_out_source || record.source || 'admin',
      source: record.source || 'admin',
      ...(record.cost_center_id != null && { cost_center: record.cost_center_id }),
    })

    showSuccessNotification('Attendance updated successfully')
    showEditDialog.value = false
    await fetchAttendanceData()
  } catch (error) {
    const data = error.response?.data
    let msg = 'Failed to update attendance'
    if (error.response?.status === 404)
      msg = 'Update endpoint not found. Please check the API documentation.'
    else if (typeof data === 'string') msg = data
    else if (data?.detail) msg = data.detail
    else if (data?.message) msg = data.message
    showErrorNotification(msg)
  } finally {
    updating.value = false
  }
}

// ─── Dialog handlers ──────────────────────────────────────────────────────────
function openAddDialog() {
  newRecord.value = {
    employee: '',
    site_id: '',
    cost_center_id: '',
    date: currentDate.value || today,
    time_in: '',
    time_out: '',
    source: 'admin',
  }
  employeeSchedule.value = null
  scheduleError.value = null
  loadingSchedule.value = false
  showAddDialog.value = true
}

function closeAddDialog() {
  showAddDialog.value = false
  newRecord.value = {
    employee: '',
    site_id: '',
    cost_center_id: '',
    date: '',
    time_in: '',
    time_out: '',
    source: 'admin',
  }
  employeeSchedule.value = null
  scheduleError.value = null
  loadingSchedule.value = false
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function clearAllFilters() {
  filters.value = { date_from: today, date_to: today, cost_center: '' }
  currentDate.value = today
  pagination.value.page = 1
}

function applyDateRange(range) {
  if (range && range.from && range.to) {
    filters.value.date_from = range.from
    filters.value.date_to = range.to
  }
  showDatePicker.value = false
}

function filterEmployees(val, update) {
  if (val === '') {
    update(() => {
      if (!isAdmin.value && newRecord.value.site_id) {
        employeeOptions.value = employees.value
          .filter((emp) => {
            const empSiteId = emp.site_id || emp.siteId || emp.site
            return empSiteId && Number(empSiteId) === Number(newRecord.value.site_id)
          })
          .map((emp) => ({ label: getEmployeeName(emp), value: emp.id || emp.uuid, employee: emp }))
      } else {
        employeeOptions.value = employees.value.map((emp) => ({
          label: getEmployeeName(emp),
          value: emp.id || emp.uuid,
          employee: emp,
        }))
      }
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    const base =
      !isAdmin.value && newRecord.value.site_id
        ? employees.value.filter((emp) => {
            const empSiteId = emp.site_id || emp.siteId || emp.site
            return empSiteId && Number(empSiteId) === Number(newRecord.value.site_id)
          })
        : employees.value

    employeeOptions.value = base
      .map((emp) => ({ label: getEmployeeName(emp), value: emp.id || emp.uuid, employee: emp }))
      .filter((emp) => emp.label.toLowerCase().indexOf(needle) > -1)
  })
}

function previousPage() {
  if (pagination.value.page > 1) {
    pagination.value.page--
    fetchAttendanceData()
  }
}

function nextPage() {
  if (pagination.value.page < totalPages.value) {
    pagination.value.page++
    fetchAttendanceData()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getEmployeeName(employee) {
  if (!employee) return 'Unknown Employee'
  if (typeof employee === 'number' || typeof employee === 'string') {
    const found = employees.value.find((emp) => emp.id === employee || emp.id === parseInt(employee))
    if (found) {
      const fullName = `${found.first_name || found.firstName || ''} ${found.last_name || found.lastName || ''}`.trim()
      return fullName || found.name || found.username || found.email || 'Unknown Employee'
    }
    return `Employee #${employee}`
  }
  if (typeof employee === 'object') {
    const fullName = `${employee.first_name || employee.firstName || employee.firstname || ''} ${employee.last_name || employee.lastName || employee.lastname || ''}`.trim()
    return fullName || employee.name || employee.fullName || employee.full_name || employee.username || employee.email || 'Unknown Employee'
  }
  return 'Unknown Employee'
}

function viewEmployeePhoto(employee) {
  if (!employee) return
  selectedEmployeeName.value = getEmployeeName(employee)
  selectedEmployeePhoto.value = getEmployeePhoto(employee)
  showEmployeePhotoDialog.value = true
}

function getEmployeePhoto(employee) {
  if (!employee) return null
  if (typeof employee === 'object') {
    return employee.photo || employee.image || employee.profile_picture || employee.profile_photo || employee.avatar || employee.picture || null
  }
  const found = employees.value.find((emp) => emp.id === employee || emp.uuid === employee)
  return found ? found.photo || found.image || found.profile_picture || found.profile_photo || found.avatar || found.picture || null : null
}

function formatTimeForInput(dateTimeString, timezone) {
  if (!dateTimeString) return ''
  return formatInTimezone(dateTimeString, timezone, '24h')
}

function formatScheduleTime(timeString) {
  if (!timeString) return '-'
  try {
    if (/^(\d{1,2}):(\d{2})(:\d{2})?$/.test(timeString)) {
      const [hours, minutes] = timeString.split(':').map(Number)
      return new Date(1970, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
    const date = new Date(timeString)
    if (isNaN(date.getTime())) return timeString
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return timeString
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
function showSuccessNotification(message) {
  $q.notify({ type: 'positive', message, position: 'top', timeout: 3000 })
}

function showErrorNotification(message) {
  $q.notify({ type: 'negative', message, position: 'top', timeout: 5000 })
}

// ─── Watchers ─────────────────────────────────────────────────────────────────
watch(
  filters,
  () => {
    pagination.value.page = 1
    fetchAttendanceData()
  },
  { deep: true },
)

watch(
  () => newRecord.value.date,
  (newDate) => {
    employeeSchedule.value = null
    scheduleError.value = null
    if (newRecord.value.employee && newDate) {
      fetchEmployeeSchedule(newRecord.value.employee, newDate)
    }
  },
)

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    await Promise.all([fetchSites(), fetchCostCenters(), fetchEmployeeDetails()])
    await fetchAttendanceData()
  } catch {
    showErrorNotification('Error during initialization')
  }
})
</script>

<style scoped>
.attendance-dashboard {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}
.page-header {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.add-attendance-btn {
  height: 36px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px !important;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
}
.header-search {
  min-width: 280px;
  max-width: 280px;
}
.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}
.search-icon { color: #9ca3af; }

.filters-section { margin-bottom: 16px; }
.filters-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  padding: 16px 20px;
}
.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.filters-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filters-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.clear-btn {
  color: #6b7280 !important;
  font-size: 12px;
}
.date-nav-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}
.date-nav-btn { color: #64748b; flex-shrink: 0; }
.date-nav-input { width: 175px; }
.filter-input :deep(.q-field__control) { border-radius: 8px; }

@media (max-width: 768px) {
  .dashboard-container { padding: 14px; }
  .page-header { padding: 12px 14px; margin-bottom: 12px; }
  .header-content { flex-direction: column; align-items: stretch; gap: 10px; }
  .header-actions { justify-content: space-between; }
  .header-search { min-width: auto; max-width: 100%; width: 100%; }
  .filters-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
}
@media (max-width: 480px) {
  .dashboard-container { padding: 10px; }
  .page-title { font-size: 18px; }
  .filters-card { padding: 10px; }
  .filters-header { flex-direction: column; align-items: flex-start; gap: 8px; }
  .filters-header-actions { width: 100%; justify-content: space-between; }
}
</style>
