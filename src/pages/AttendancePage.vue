<template>
  <q-page class="attendance-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Attendance Management</h1>
          </div>
          <div class="header-actions">
            <q-btn
              flat
              round
              icon="refresh"
              size="md"
              class="header-btn"
              @click="fetchAttendanceData()"
            />
            <q-btn
              unelevated
              icon="file_download"
              label="Export All"
              color="primary"
              class="export-btn"
              no-caps
              @click="exportAll"
            />
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-section">
        <div class="stats-card personal-card">
          <div class="stats-icon-wrapper">
            <q-icon name="people" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[0].count }}</div>
            <div class="stats-label">Total Records</div>
          </div>
        </div>

        <div class="stats-card corporate-card">
          <div class="stats-icon-wrapper">
            <q-icon name="qr_code" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[1].count }}</div>
            <div class="stats-label">QR Scans</div>
          </div>
        </div>

        <div class="stats-card business-card">
          <div class="stats-icon-wrapper">
            <q-icon name="edit" class="stats-icon" />
          </div>
          <div class="stats-content">
            <q-skeleton v-if="loading" type="text" class="text-h5" />
            <div v-else class="stats-amount">{{ stats[2].count }}</div>
            <div class="stats-label">Manual Entry</div>
          </div>
        </div>

        <div class="stats-card custom-card">
          <div class="stats-icon-wrapper">
            <q-icon name="schedule" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Auto Login</div>
            <div class="stats-sublabel">System Generated</div>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="filters-section">
        <div class="filters-card">
          <div class="filters-header">
            <h3 class="filters-title">Filter Records</h3>
            <q-btn
              flat
              dense
              icon="clear_all"
              label="Clear All"
              @click="clearAllFilters"
              class="clear-btn"
              size="sm"
            />
          </div>

          <div class="filters-grid">
            <q-input
              dense
              outlined
              label="Date Range"
              v-model="dateRange"
              class="filter-input"
              clearable
              readonly
              @click="showDatePicker = true"
            >
              <template v-slot:prepend>
                <q-icon name="event" class="cursor-pointer" @click="showDatePicker = true" />
              </template>
            </q-input>

            <q-select
              dense
              outlined
              label="Source"
              v-model="filters.source"
              :options="sourceOptions"
              :loading="filtersLoading"
              class="filter-input"
              clearable
              map-options
              emit-value
            />

            <q-select
              dense
              outlined
              label="Employee"
              v-model="filters.employee"
              :options="employeeOptions"
              :loading="filtersLoading"
              class="filter-input"
              clearable
              map-options
              emit-value
              use-input
              input-debounce="300"
              @filter="filterEmployees"
            />

            <q-select
              dense
              outlined
              label="Business Owner"
              v-model="filters.business_owner"
              :options="businessOwnerOptions"
              :loading="filtersLoading"
              class="filter-input"
              clearable
              map-options
              emit-value
            />
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Attendance Overview</h2>
          </div>
          <div class="table-actions" v-if="selected.length > 0">
            <q-btn
              color="negative"
              icon="delete"
              :label="`Delete ${selected.length} items`"
              @click="confirmBatchDelete"
              size="sm"
              no-caps
            />
            <q-btn
              color="primary"
              icon="file_download"
              label="Export Selected"
              @click="exportSelected"
              size="sm"
              no-caps
            />
          </div>
        </div>

        <!-- Attendance Table -->
        <div class="modern-table-container">
          <q-table
            :rows="attendanceData"
            :columns="columns"
            row-key="id"
            flat
            :loading="loading"
            class="attendance-table"
            hide-pagination
            :rows-per-page-options="[0]"
            selection="multiple"
            v-model:selected="selected"
            :grid="$q.screen.xs"
          >
            <!-- Grid mode for mobile -->
            <template v-slot:item="props" v-if="$q.screen.xs">
              <div class="q-pa-xs col-xs-12 col-sm-6 col-md-4">
                <q-card class="mobile-card">
                  <q-card-section>
                    <div class="mobile-employee">{{ getEmployeeName(props.row.employee) }}</div>
                    <div class="mobile-date">{{ props.row.date }}</div>
                  </q-card-section>
                  <q-card-section class="q-pt-none">
                    <div class="mobile-details">
                      Time In: {{ formatTime(props.row.time_in) }}<br />
                      Time Out: {{ formatTime(props.row.time_out) }}<br />
                      Source: {{ props.row.source?.replace('_', ' ').toUpperCase() }}
                    </div>
                  </q-card-section>
                  <q-card-actions align="right">
                    <q-btn flat size="sm" color="primary" @click="editAttendance(props.row)"
                      >Edit</q-btn
                    >
                    <q-btn flat size="sm" color="negative" @click="confirmDelete(props.row)"
                      >Delete</q-btn
                    >
                  </q-card-actions>
                </q-card>
              </div>
            </template>

            <template v-slot:header>
              <q-tr class="table-header-row">
                <q-th class="table-header-cell">
                  <q-checkbox v-model="selectAll" @update:model-value="toggleSelectAll" />
                </q-th>
                <q-th class="table-header-cell">SL No</q-th>
                <q-th class="table-header-cell">Employee</q-th>
                <q-th class="table-header-cell">Date</q-th>
                <q-th class="table-header-cell">Time In</q-th>
                <q-th class="table-header-cell">Time Out</q-th>
                <q-th class="table-header-cell">Source</q-th>
                <q-th class="table-header-cell">Actions</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr class="table-body-row">
                <q-td class="table-body-cell">
                  <q-checkbox v-model="selected" :val="props.row" />
                </q-td>
                <q-td class="table-body-cell">
                  {{ String(props.rowIndex + 1).padStart(2, '0') }}.
                </q-td>
                <q-td class="table-body-cell employee-cell">
                  <div class="employee-info">
                    <q-avatar size="32px" class="employee-avatar">
                      {{ getEmployeeName(props.row.employee).charAt(0) }}
                    </q-avatar>
                    <span class="employee-name">{{ getEmployeeName(props.row.employee) }}</span>
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  {{ props.row.date }}
                </q-td>
                <q-td class="table-body-cell">
                  <div class="time-badge time-in" :class="{ 'has-time': props.row.time_in }">
                    {{ formatTime(props.row.time_in) }}
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  <div class="time-badge time-out" :class="{ 'has-time': props.row.time_out }">
                    {{ formatTime(props.row.time_out) }}
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  <div class="source-badge" :class="getSourceClass(props.row.source)">
                    {{ formatSource(props.row.source) }}
                  </div>
                </q-td>
                <q-td class="table-body-cell actions-cell">
                  <div class="action-buttons">
                    <q-btn
                      flat
                      round
                      icon="visibility"
                      size="sm"
                      class="action-btn view-btn"
                      @click="viewDetails(props.row)"
                    />
                    <q-btn
                      flat
                      round
                      icon="edit"
                      size="sm"
                      class="action-btn edit-btn"
                      @click="editAttendance(props.row)"
                    />
                    <q-btn
                      flat
                      round
                      icon="delete"
                      size="sm"
                      class="action-btn delete-btn"
                      @click="confirmDelete(props.row)"
                    />
                  </div>
                </q-td>
              </q-tr>
            </template>
          </q-table>

          <!-- Table Footer with Pagination Info -->
          <div class="table-footer">
            <div class="footer-info">
              <span class="total-label">Total</span>
              <span class="total-records">{{ attendanceData.length }} Records</span>
              <span class="total-selected" v-if="selected.length > 0"
                >{{ selected.length }} Selected</span
              >
            </div>
            <div class="pagination-controls">
              <q-btn
                flat
                icon="chevron_left"
                class="pagination-btn"
                :disable="pagination.page === 1"
                @click="previousPage"
              />
              <span class="page-info">Page {{ pagination.page }} of {{ totalPages }}</span>
              <q-btn
                flat
                icon="chevron_right"
                class="pagination-btn"
                :disable="pagination.page === totalPages"
                @click="nextPage"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Date Range Picker Dialog -->
    <q-dialog v-model="showDatePicker">
      <q-card class="date-picker-card">
        <q-card-section>
          <div class="dialog-title">Select Date Range</div>
        </q-card-section>
        <q-card-section>
          <div class="date-picker-grid">
            <q-date v-model="tempDateRange.from" label="From Date" class="date-picker" />
            <q-date v-model="tempDateRange.to" label="To Date" class="date-picker" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showDatePicker = false" class="dialog-btn" />
          <q-btn flat label="Clear" @click="clearDateRange" class="dialog-btn" />
          <q-btn
            color="primary"
            label="Apply"
            @click="applyDateRange"
            class="dialog-btn primary-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Attendance Dialog -->
    <q-dialog v-model="showEditDialog" persistent>
      <q-card class="edit-dialog-card">
        <q-card-section>
          <div class="dialog-title">Edit Attendance</div>
        </q-card-section>

        <q-card-section class="q-pt-none" v-if="editingRecord">
          <q-form @submit="updateAttendance" class="edit-form">
            <q-input
              filled
              v-model="editingRecord.date"
              label="Date"
              type="date"
              class="form-field"
            />

            <div class="time-inputs">
              <q-input
                filled
                v-model="editingRecord.time_in"
                label="Time In"
                type="time"
                class="form-field"
              />

              <q-input
                filled
                v-model="editingRecord.time_out"
                label="Time Out"
                type="time"
                class="form-field"
              />
            </div>

            <q-select
              filled
              v-model="editingRecord.source"
              :options="sourceOptions"
              label="Source"
              map-options
              emit-value
              class="form-field"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showEditDialog = false" class="dialog-btn" />
          <q-btn
            color="primary"
            label="Update"
            @click="updateAttendance"
            :loading="updating"
            class="dialog-btn primary-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

const $q = useQuasar()

// Reactive data
const attendanceData = ref([])
const employees = ref([])
const loading = ref(false)
const filtersLoading = ref(false)
const selected = ref([])
const selectAll = ref(false)

// Dialog states
const showDatePicker = ref(false)
const showEditDialog = ref(false)

// Loading states
const updating = ref(false)

const pagination = ref({
  page: 1,
  rowsPerPage: 25,
  rowsNumber: 0,
})

const filters = ref({
  date_from: '',
  date_to: '',
  source: '',
  employee: '',
  business_owner: '',
})

// Date range handling
const dateRange = ref('')
const tempDateRange = ref({
  from: '',
  to: '',
})

// Edit form
const editingRecord = ref(null)

// Filter options
const employeeOptions = ref([])
const businessOwnerOptions = ref([])
const sourceOptions = ref([
  { label: 'QR Scan', value: 'qr_scan' },
  { label: 'Manual Entry', value: 'manual' },
  { label: 'Auto Login', value: 'auto_login' },
])

// Get company ID
const companyId = ref(localStorage.getItem('selectedCompany') || null)

// Computed
const stats = computed(() => {
  const data = attendanceData.value
  const total = data.length
  const qrScans = data.filter((item) => item.source === 'qr_scan').length
  const manual = data.filter((item) => item.source === 'manual').length

  return [
    { label: 'Total Records', count: total },
    { label: 'QR Scans', count: qrScans },
    { label: 'Manual Entry', count: manual },
  ]
})

const totalPages = computed(() => {
  return Math.ceil(pagination.value.rowsNumber / pagination.value.rowsPerPage) || 1
})

// ================= API Functions =================
async function fetchAttendanceData(params = {}) {
  if (!companyId.value) {
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }

  loading.value = true
  try {
    const response = await api.get(
      `https://staging.wageyapp.com/attendance/company/${companyId.value}/`,
      {
        params: {
          page: pagination.value.page,
          limit: pagination.value.rowsPerPage,
          ...filters.value,
          ...params,
        },
      },
    )

    const data = Array.isArray(response.data) ? response.data : response.data.data
    attendanceData.value = data || []

    pagination.value.rowsNumber =
      response.data.total || response.data.meta?.total || attendanceData.value.length

    return response.data
  } catch (error) {
    console.error('Error fetching attendance data:', error)
    showErrorNotification('Failed to load attendance data')
    attendanceData.value = []
  } finally {
    loading.value = false
  }
}

async function fetchEmployeeDetails() {
  if (!companyId.value) {
    showErrorNotification('Company ID not found. Please log in again.')
    return
  }

  try {
    const response = await api.get(`/user/companies/${companyId.value}/employees/`)
    const data = Array.isArray(response.data) ? response.data : response.data.data
    employees.value = data || []

    employeeOptions.value = employees.value.map((emp) => ({
      label: getEmployeeName(emp),
      value: emp.id,
    }))
  } catch (error) {
    console.error('Error fetching employee details:', error)
    showErrorNotification('Failed to load employees')
    employees.value = []
    employeeOptions.value = []
  }
}

async function updateAttendance() {
  if (!editingRecord.value) return

  updating.value = true
  try {
    await api.put(`/attendance/${editingRecord.value.id}/`, editingRecord.value)

    showSuccessNotification('Attendance updated successfully')
    showEditDialog.value = false
    editingRecord.value = null
    await fetchAttendanceData()
  } catch (error) {
    console.error('Error updating attendance:', error)
    showErrorNotification('Failed to update attendance')
  } finally {
    updating.value = false
  }
}

async function deleteAttendance(record) {
  try {
    await api.delete(`/attendance/${record.id}/`)
    showSuccessNotification('Attendance deleted successfully')
    await fetchAttendanceData()
  } catch (error) {
    console.error('Error deleting attendance:', error)
    showErrorNotification('Failed to delete attendance')
  }
}

async function batchDelete(records) {
  try {
    const ids = records.map((r) => r.id)
    await api.post(`/attendance/batch-delete/`, { ids })

    showSuccessNotification(`${records.length} records deleted successfully`)
    selected.value = []
    await fetchAttendanceData()
  } catch (error) {
    console.error('Error batch deleting:', error)
    showErrorNotification('Failed to delete records')
  }
}

// ================= Dialog handlers =================
function editAttendance(record) {
  editingRecord.value = { ...record }

  if (editingRecord.value.time_in) {
    editingRecord.value.time_in = formatTimeForInput(editingRecord.value.time_in)
  }
  if (editingRecord.value.time_out) {
    editingRecord.value.time_out = formatTimeForInput(editingRecord.value.time_out)
  }

  showEditDialog.value = true
}

function confirmDelete(record) {
  $q.dialog({
    title: 'Confirm Delete',
    message: `Are you sure you want to delete this attendance record for ${getEmployeeName(record.employee)}?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    deleteAttendance(record)
  })
}

function confirmBatchDelete() {
  $q.dialog({
    title: 'Confirm Batch Delete',
    message: `Are you sure you want to delete ${selected.value.length} selected records?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    batchDelete(selected.value)
  })
}

function viewDetails(record) {
  $q.dialog({
    title: 'Attendance Details',
    message: `
      Employee: ${getEmployeeName(record.employee)}
      Date: ${record.date}
      Time In: ${formatTime(record.time_in)}
      Time Out: ${formatTime(record.time_out)}
      Source: ${record.source?.replace('_', ' ').toUpperCase()}
      Created: ${formatDateTime(record.created_at)}
    `,
    html: true,
  })
}

// ================= Filters =================
function clearAllFilters() {
  filters.value = {
    date_from: '',
    date_to: '',
    source: '',
    employee: '',
    business_owner: '',
  }
  dateRange.value = ''
  pagination.value.page = 1
  selected.value = []
  selectAll.value = false
}

function applyDateRange() {
  if (tempDateRange.value.from && tempDateRange.value.to) {
    filters.value.date_from = tempDateRange.value.from
    filters.value.date_to = tempDateRange.value.to
    dateRange.value = `${tempDateRange.value.from} - ${tempDateRange.value.to}`
  }
  showDatePicker.value = false
}

function clearDateRange() {
  tempDateRange.value = { from: '', to: '' }
  filters.value.date_from = ''
  filters.value.date_to = ''
  dateRange.value = ''
}

function filterEmployees(val, update) {
  if (val === '') {
    update(() => {
      employeeOptions.value = employees.value.map((emp) => ({
        label: getEmployeeName(emp),
        value: emp.id,
      }))
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    const allEmployees = employees.value.map((emp) => ({
      label: getEmployeeName(emp),
      value: emp.id,
    }))
    employeeOptions.value = allEmployees.filter(
      (emp) => emp.label.toLowerCase().indexOf(needle) > -1,
    )
  })
}

// ================= Table functions =================
function toggleSelectAll(val) {
  if (val) {
    selected.value = [...attendanceData.value]
  } else {
    selected.value = []
  }
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

// ================= Export functions =================
async function exportSelected() {
  if (selected.value.length === 0) return

  try {
    const response = await api.post('/attendance/export/', {
      ids: selected.value.map((r) => r.id),
      format: 'csv',
    })

    downloadFile(response.data, 'selected_attendance.csv')
    showSuccessNotification('Export completed')
  } catch {
    showErrorNotification('Export failed')
  }
}

async function exportAll() {
  try {
    const response = await api.get('/attendance/export/', {
      params: { ...filters.value, format: 'csv' },
    })

    downloadFile(response.data, 'all_attendance.csv')
    showSuccessNotification('Export completed')
  } catch {
    showErrorNotification('Export failed')
  }
}

function downloadFile(data, filename) {
  const blob = new Blob([data], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

// ================= Helpers =================
function getEmployeeName(employee) {
  if (!employee) return 'Unknown Employee'
  const firstName = employee.first_name || ''
  const lastName = employee.last_name || ''
  return `${firstName} ${lastName}`.trim() || 'Unknown Employee'
}

function getSourceClass(source) {
  switch (source) {
    case 'qr_scan':
      return 'source-qr'
    case 'manual':
      return 'source-manual'
    case 'auto_login':
      return 'source-auto'
    default:
      return 'source-default'
  }
}

function formatSource(source) {
  if (!source) return '-'
  return source.replace('_', ' ').toUpperCase()
}

function formatTime(dateTimeString) {
  if (!dateTimeString) return '-'
  try {
    const date = new Date(dateTimeString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '-'
  }
}

function formatTimeForInput(dateTimeString) {
  if (!dateTimeString) return ''
  try {
    const date = new Date(dateTimeString)
    return date.toTimeString().slice(0, 5)
  } catch {
    return ''
  }
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '-'
  try {
    const date = new Date(dateTimeString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '-'
  }
}

// ================= Notifications =================
function showSuccessNotification(message) {
  $q.notify({
    type: 'positive',
    message,
    position: 'top',
    timeout: 3000,
  })
}

function showErrorNotification(message) {
  $q.notify({
    type: 'negative',
    message,
    position: 'top',
    timeout: 5000,
  })
}

// ================= Watchers & Lifecycle =================
watch(
  filters,
  () => {
    pagination.value.page = 1
    fetchAttendanceData()
  },
  { deep: true },
)

onMounted(async () => {
  await Promise.all([fetchAttendanceData(), fetchEmployeeDetails()])
})

// ================= Table columns =================
const columns = [
  { name: 'id', label: 'ID', align: 'left', field: 'id', sortable: true },
  { name: 'employee', label: 'Employee', align: 'left', field: 'employee', sortable: true },
  { name: 'date', label: 'Date', align: 'center', field: 'date', sortable: true },
  { name: 'time_in', label: 'Time In', align: 'center', field: 'time_in', sortable: true },
  { name: 'time_out', label: 'Time Out', align: 'center', field: 'time_out', sortable: true },
  { name: 'source', label: 'Source', align: 'center', field: 'source', sortable: true },
  { name: 'action', label: 'Actions', align: 'center', field: 'action', sortable: false },
]
</script>

<style scoped>
.attendance-dashboard {
  background: #f8fafc;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* Header Section */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-btn {
  color: #64748b;
}

.export-btn {
  background: #6366f1;
  border-radius: 8px;
  font-weight: 500;
  padding: 8px 16px;
}

/* Stats Section */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stats-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.personal-card {
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
}

.corporate-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.business-card {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.custom-card {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.stats-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.stats-icon {
  font-size: 28px;
  color: #374151;
}

.stats-content {
  flex: 1;
}

.stats-amount {
  font-size: 32px;
  font-weight: 700;
  color: #1a202c;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}

.stats-sublabel {
  font-size: 14px;
  color: #64748b;
}

/* Filters Section */
.filters-section {
  margin-bottom: 24px;
}

.filters-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e2e8f0;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.clear-btn {
  color: #64748b;
  font-weight: 500;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.filter-input {
  background: #f8fafc;
  border-radius: 8px;
}

.filter-input .q-field__control {
  border-radius: 8px;
  height: 40px;
}

/* Table Section */
.table-section {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-header {
  padding: 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 12px;
}

/* Modern Table */
.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 12px;
  overflow: hidden;
  margin: 0 24px 24px 24px;
}

.attendance-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.table-header-row {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.table-header-cell {
  padding: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  text-align: left;
  border: none;
}

.table-body-row {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-body-row:hover {
  background: #f8fafc;
}

.table-body-cell {
  padding: 16px;
  font-size: 14px;
  color: #374151;
  border: none;
  vertical-align: middle;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.employee-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
}

.employee-name {
  font-weight: 500;
  color: #1a202c;
}

.time-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: #f1f5f9;
  color: #64748b;
}

.time-badge.has-time.time-in {
  background: #dcfce7;
  color: #166534;
}

.time-badge.has-time.time-out {
  background: #fef2f2;
  color: #991b1b;
}

.source-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.source-qr {
  background: #f3e8ff;
  color: #7c3aed;
}

.source-manual {
  background: #dbeafe;
  color: #2563eb;
}

.source-auto {
  background: #dcfce7;
  color: #16a34a;
}

.source-default {
  background: #f1f5f9;
  color: #64748b;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.view-btn {
  background: #dbeafe;
  color: #3b82f6;
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
  background: #fef2f2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}

/* Table Footer */
.table-footer {
  background: #f8fafc;
  padding: 16px 24px;
  border-top: 2px solid #3b82f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-info {
  display: flex;
  gap: 24px;
  align-items: center;
}

.total-label {
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
}

.total-records {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.total-selected {
  font-size: 14px;
  font-weight: 600;
  color: #16a34a;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pagination-btn {
  color: #64748b;
  padding: 4px;
}

.pagination-btn:hover:not(:disabled) {
  background: #f1f5f9;
}

.page-info {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

/* Mobile Cards */
.mobile-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.mobile-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.mobile-employee {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
}

.mobile-date {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.mobile-details {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.4;
}

/* Dialog Styles */
.date-picker-card {
  width: 100%;
  max-width: 800px;
  border-radius: 12px;
}

.edit-dialog-card {
  width: 100%;
  max-width: 500px;
  border-radius: 12px;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.date-picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.date-picker {
  border-radius: 8px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-field {
  margin-bottom: 0;
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
}

.primary-btn {
  background: #3b82f6;
  color: white;
}

/* Responsive Design */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .table-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .modern-table-container {
    margin: 0 16px 16px 16px;
  }

  .table-body-cell {
    padding: 12px 8px;
    font-size: 12px;
  }

  .employee-info {
    gap: 8px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }

  .footer-info {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .date-picker-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .time-inputs {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Loading States */
.q-skeleton {
  animation: skeleton-loading 1.5s infinite ease-in-out;
}

@keyframes skeleton-loading {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* Focus States */
.filter-input .q-field--focused .q-field__control {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.dialog-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>
