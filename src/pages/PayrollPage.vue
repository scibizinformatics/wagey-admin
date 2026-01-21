<template>
  <div class="payroll-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Payroll</h1>
          </div>
          <div class="header-actions">
            <q-btn
              flat
              round
              icon="refresh"
              size="md"
              class="header-btn"
              @click="fetchPayrollData"
            />
            <q-btn
              unelevated
              icon="file_download"
              label="Export All"
              color="primary"
              class="export-btn"
              no-caps
              @click="exportToPDF"
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
            <div class="stats-amount">{{ totalEmployees }}</div>
            <div class="stats-label">Total Employees</div>
          </div>
        </div>

        <div class="stats-card corporate-card">
          <div class="stats-icon-wrapper">
            <q-icon name="attach_money" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ formatCurrency(totalGrossPay) }}</div>
            <div class="stats-label">Total Gross Pay</div>
          </div>
        </div>

        <div class="stats-card business-card">
          <div class="stats-icon-wrapper">
            <q-icon name="account_balance_wallet" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ formatCurrency(totalNetPay) }}</div>
            <div class="stats-label">Total Net Pay</div>
          </div>
        </div>

        <div class="stats-card custom-card">
          <div class="stats-icon-wrapper">
            <q-icon name="schedule" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ totalHours }}h</div>
            <div class="stats-label">Total Hours</div>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="filters-section">
        <div class="filters-card">
          <div class="filters-header">
            <h3 class="filters-title">Filter Records</h3>
            <div class="view-toggle">
              <q-btn
                :flat="viewMode !== 'table'"
                :unelevated="viewMode === 'table'"
                :color="viewMode === 'table' ? 'primary' : 'grey-6'"
                icon="table_view"
                label="Table"
                @click="viewMode = 'table'"
                class="toggle-btn"
                no-caps
                size="sm"
              />
              <q-btn
                :flat="viewMode !== 'cards'"
                :unelevated="viewMode === 'cards'"
                :color="viewMode === 'cards' ? 'primary' : 'grey-6'"
                icon="view_module"
                label="Cards"
                @click="viewMode = 'cards'"
                class="toggle-btn"
                no-caps
                size="sm"
              />
            </div>
          </div>

          <div class="filters-grid">
            <q-input
              dense
              outlined
              label="Search employees..."
              v-model="searchQuery"
              class="filter-input"
              clearable
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <q-select
              dense
              outlined
              label="Period"
              v-model="selectedPeriod"
              :options="uniquePeriods"
              class="filter-input"
              clearable
              emit-value
              map-options
            />

            <q-select
              dense
              outlined
              label="Run"
              v-model="selectedRun"
              :options="runOptions"
              class="filter-input"
              clearable
              emit-value
              map-options
            />
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div v-if="viewMode === 'table'" class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Payroll Overview</h2>
            <div class="table-info">
              Showing {{ filteredPayrollData.length }} of {{ payrollData.length }} records
            </div>
          </div>
        </div>

        <!-- Payroll Table -->
        <div class="modern-table-container">
          <div class="table-wrapper">
            <table class="payroll-table">
              <thead>
                <tr class="table-header-row">
                  <th class="table-header-cell">SL No</th>
                  <th class="table-header-cell sortable" @click="sortBy('employee')">
                    Employee
                    <q-icon :name="getSortIcon('employee')" size="xs" />
                  </th>
                  <th class="table-header-cell sortable" @click="sortBy('period')">
                    Period
                    <q-icon :name="getSortIcon('period')" size="xs" />
                  </th>
                  <th class="table-header-cell sortable" @click="sortBy('run')">
                    Run
                    <q-icon :name="getSortIcon('run')" size="xs" />
                  </th>
                  <th class="table-header-cell sortable" @click="sortBy('gross_pay')">
                    Gross Pay
                    <q-icon :name="getSortIcon('gross_pay')" size="xs" />
                  </th>
                  <th class="table-header-cell sortable" @click="sortBy('net_pay')">
                    Net Pay
                    <q-icon :name="getSortIcon('net_pay')" size="xs" />
                  </th>
                  <th class="table-header-cell">Total Hours</th>
                  <th class="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(record, index) in paginatedData"
                  :key="record.id"
                  class="table-body-row"
                  :class="{ 'highlight-row': record.net_pay > averageNetPay }"
                >
                  <td class="table-body-cell">{{ String(index + 1).padStart(2, '0') }}.</td>
                  <td class="table-body-cell employee-cell">
                    <div class="employee-info">
                      <q-avatar size="32px" class="employee-avatar">
                        {{ getInitials(record.employee) }}
                      </q-avatar>
                      <div class="employee-details">
                        <div class="employee-name">{{ record.employee }}</div>
                        <div class="employee-id">{{ record.employee_id || 'N/A' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="table-body-cell">
                    <div class="period-badge">{{ record.period }}</div>
                  </td>
                  <td class="table-body-cell">
                    <div class="run-badge">#{{ record.run }}</div>
                  </td>
                  <td class="table-body-cell amount-cell">
                    <div class="amount-display">{{ formatCurrency(record.gross_pay) }}</div>
                    <div class="amount-progress">
                      <div
                        class="amount-bar gross-bar"
                        :style="{ width: getPayPercentage(record.gross_pay, maxGrossPay) + '%' }"
                      ></div>
                    </div>
                  </td>
                  <td class="table-body-cell amount-cell">
                    <div class="amount-display">{{ formatCurrency(record.net_pay) }}</div>
                    <div class="amount-progress">
                      <div
                        class="amount-bar net-bar"
                        :style="{ width: getPayPercentage(record.net_pay, maxNetPay) + '%' }"
                      ></div>
                    </div>
                  </td>
                  <td class="table-body-cell hours-cell">
                    <div class="hours-badge">
                      {{ record.breakdown?.attendance?.total_hours_worked || 0 }}h
                    </div>
                  </td>
                  <td class="table-body-cell actions-cell">
                    <div class="action-buttons">
                      <q-btn
                        flat
                        round
                        icon="visibility"
                        size="sm"
                        class="action-btn view-btn"
                        @click="viewDetails(record)"
                      />
                      <q-btn
                        flat
                        round
                        icon="description"
                        size="sm"
                        class="action-btn download-btn"
                        @click="downloadPayslip(record)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Table Footer -->
          <div class="table-footer">
            <div class="footer-info">
              <span class="total-label">Total</span>
              <span class="total-records">{{ filteredPayrollData.length }} Records</span>
              <span class="total-amount">{{ formatCurrency(totalNetPay) }} Net Pay</span>
            </div>
            <div class="pagination-controls">
              <q-btn
                flat
                icon="chevron_left"
                class="pagination-btn"
                :disable="currentPage === 1"
                @click="currentPage--"
              />
              <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
              <q-btn
                flat
                icon="chevron_right"
                class="pagination-btn"
                :disable="currentPage === totalPages"
                @click="currentPage++"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Card View -->
      <div v-else-if="viewMode === 'cards'" class="cards-section">
        <div class="cards-grid">
          <div v-for="record in paginatedData" :key="record.id" class="payroll-card">
            <div class="card-header">
              <div class="employee-avatar-large">{{ getInitials(record.employee) }}</div>
              <div class="employee-info-card">
                <h3 class="card-employee-name">{{ record.employee }}</h3>
                <p class="card-employee-id">{{ record.employee_id || 'N/A' }}</p>
              </div>
              <div class="card-actions">
                <q-btn
                  flat
                  round
                  icon="visibility"
                  size="sm"
                  class="card-action-btn"
                  @click="viewDetails(record)"
                />
                <q-btn
                  flat
                  round
                  icon="description"
                  size="sm"
                  class="card-action-btn"
                  @click="downloadPayslip(record)"
                />
              </div>
            </div>

            <div class="card-body">
              <div class="pay-section">
                <div class="pay-item">
                  <span class="pay-label">Gross Pay</span>
                  <span class="pay-value">{{ formatCurrency(record.gross_pay) }}</span>
                </div>
                <div class="pay-item">
                  <span class="pay-label">Net Pay</span>
                  <span class="pay-value net">{{ formatCurrency(record.net_pay) }}</span>
                </div>
              </div>

              <div class="hours-section">
                <div class="hours-grid">
                  <div class="hours-item">
                    <span class="hours-label">Regular</span>
                    <span class="hours-value"
                      >{{ record.breakdown?.attendance?.regular_hours || 0 }}h</span
                    >
                  </div>
                  <div class="hours-item">
                    <span class="hours-label">Overtime</span>
                    <span class="hours-value overtime"
                      >{{ record.breakdown?.attendance?.overtime_hours || 0 }}h</span
                    >
                  </div>
                  <div class="hours-item">
                    <span class="hours-label">Holiday</span>
                    <span class="hours-value holiday"
                      >{{ record.breakdown?.attendance?.holiday_hours || 0 }}h</span
                    >
                  </div>
                  <div class="hours-item">
                    <span class="hours-label">Total</span>
                    <span class="hours-value total"
                      >{{ record.breakdown?.attendance?.total_hours_worked || 0 }}h</span
                    >
                  </div>
                </div>
              </div>

              <div class="card-footer">
                <div class="period-info">
                  <span class="period-badge">{{ record.period }}</span>
                  <span class="run-badge">#{{ record.run }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card View Pagination -->
        <div class="cards-pagination">
          <div class="pagination-info">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} -
            {{ Math.min(currentPage * itemsPerPage, filteredPayrollData.length) }} of
            {{ filteredPayrollData.length }} records
          </div>
          <div class="pagination-controls">
            <q-btn
              flat
              icon="chevron_left"
              label="Previous"
              class="pagination-btn"
              :disable="currentPage === 1"
              @click="currentPage--"
              no-caps
            />
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <q-btn
              flat
              icon="chevron_right"
              label="Next"
              class="pagination-btn"
              :disable="currentPage === totalPages"
              @click="currentPage++"
              no-caps
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Detail Modal -->
    <q-dialog v-model="showDetailModal" persistent>
      <q-card class="detail-modal-card">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-icon name="receipt_long" class="modal-icon" />
            <div>
              <div class="modal-title">Payroll Details</div>
              <div class="modal-subtitle" v-if="selectedRecord">
                {{ selectedRecord.employee }}
              </div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="closeDetailModal" />
        </q-card-section>

        <q-separator />

        <q-card-section class="modal-content" v-if="selectedRecord">
          <div class="detail-grid">
            <div class="detail-section">
              <h4 class="section-title">Employee Information</h4>
              <div class="detail-item">
                <label>Name:</label>
                <span>{{ selectedRecord.employee }}</span>
              </div>
              <div class="detail-item">
                <label>Employee ID:</label>
                <span>{{ selectedRecord.employee_id || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <label>Period:</label>
                <span>{{ selectedRecord.period }}</span>
              </div>
              <div class="detail-item">
                <label>Run:</label>
                <span>#{{ selectedRecord.run }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4 class="section-title">Pay Information</h4>
              <div class="detail-item">
                <label>Gross Pay:</label>
                <span>{{ formatCurrency(selectedRecord.gross_pay) }}</span>
              </div>
              <div class="detail-item">
                <label>Net Pay:</label>
                <span>{{ formatCurrency(selectedRecord.net_pay) }}</span>
              </div>
              <div class="detail-item">
                <label>Deductions:</label>
                <span>{{ formatCurrency(selectedRecord.gross_pay - selectedRecord.net_pay) }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4 class="section-title">Hours Breakdown</h4>
              <div class="detail-item">
                <label>Regular Hours:</label>
                <span>{{ selectedRecord.breakdown?.attendance?.regular_hours || 0 }}h</span>
              </div>
              <div class="detail-item">
                <label>Overtime Hours:</label>
                <span>{{ selectedRecord.breakdown?.attendance?.overtime_hours || 0 }}h</span>
              </div>
              <div class="detail-item">
                <label>Holiday Hours:</label>
                <span>{{ selectedRecord.breakdown?.attendance?.holiday_hours || 0 }}h</span>
              </div>
              <div class="detail-item">
                <label>Total Hours:</label>
                <span>{{ selectedRecord.breakdown?.attendance?.total_hours_worked || 0 }}h</span>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" @click="closeDetailModal" class="dialog-btn" />
          <q-btn
            color="primary"
            label="Download Payslip"
            @click="downloadPayslip(selectedRecord)"
            class="dialog-btn primary-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()

// Data
const payrollData = ref([]) // always normalized to array
const loading = ref(false)
const error = ref(null)

// Filters & view
const searchQuery = ref('')
const selectedPeriod = ref(null)
const selectedRun = ref(null)
const viewMode = ref('table')

// Sorting
const sortField = ref(null)
const sortDirection = ref('asc')

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10

// Detail modal
const showDetailModal = ref(false)
const selectedRecord = ref(null)

/**
 * Normalize API response into an array.
 * Accepts: array, { data: [...] }, { results: [...] }, single object, null/undefined
 */
function normalizeResponseToArray(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (payload.data && Array.isArray(payload.data)) return payload.data
  if (payload.results && Array.isArray(payload.results)) return payload.results
  // If it's an object containing the records keyed differently or a single record -> wrap it
  if (typeof payload === 'object') return [payload]
  return []
}

// Fetch payroll data (defensive)
const fetchPayrollData = async () => {
  loading.value = true
  error.value = null

  try {
    const token = localStorage.getItem('access_token')

    // Check for auth token
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.')
    }

    const selectedCompany = localStorage.getItem('selectedCompany') || ''
    const url = selectedCompany
      ? `https://staging.wageyapp.com/payroll/admin/${selectedCompany}/payslips/`
      : 'https://staging.wageyapp.com/payroll/'

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000, // 30 second timeout
    })

    let records = normalizeResponseToArray(response.data)

    // Handle empty response
    if (records.length === 0) {
      payrollData.value = []
      $q.notify({
        type: 'info',
        message: 'No payroll records found',
        position: 'top',
      })
      return
    }

    // Enrich records with hours breakdown
    const enrichedRecords = await Promise.all(
      records.map(async (r, i) => {
        const employeeId = r.employee_id ?? r.emp_id
        const period = r.period ?? r.pay_period
        const hours = await fetchHoursBreakdown(employeeId, period)

        const baseRecord = {
          id: r.id ?? `payroll-${i}`,
          employee: r.employee ?? r.employee_name ?? 'Unknown',
          employee_id: employeeId ?? null,
          period,
          run: r.run ?? r.run_id ?? 0,
          gross_pay: Number(r.gross_pay ?? 0),
          net_pay: Number(r.net_pay ?? 0),
          breakdown: {
            attendance: hours,
          },
        }

        return validatePayrollRecord(baseRecord)
      }),
    )

    payrollData.value = enrichedRecords

    // Count and notify about errors
    const errorCount = enrichedRecords.filter((r) => r.breakdown?.attendance?._error).length

    if (errorCount > 0) {
      $q.notify({
        type: 'warning',
        message: `Payroll loaded! ${errorCount} records have incomplete hours data.`,
        position: 'top',
        timeout: 4000,
      })
    } else {
      $q.notify({
        type: 'positive',
        message: 'Payroll data loaded successfully!',
        position: 'top',
      })
    }
  } catch (err) {
    console.error('fetchPayrollData error:', err)
    error.value = err?.response?.data?.message ?? err?.message ?? 'Failed to fetch payroll data'

    $q.notify({
      type: 'negative',
      message: error.value,
      position: 'top',
      timeout: 5000,
    })
  } finally {
    loading.value = false
  }
}

function validatePayrollRecord(record) {
  const grossPay = Math.max(0, Number(record.gross_pay || 0))
  const netPay = Math.max(0, Math.min(Number(record.net_pay || 0), grossPay))

  return {
    ...record,
    gross_pay: grossPay,
    net_pay: netPay,
  }
}

// Fetch hours breakdown for each employee
const fetchHoursBreakdown = async (employeeId, period) => {
  // Handle missing parameters
  if (!employeeId || !period) {
    return {
      regular_hours: 0,
      overtime_hours: 0,
      holiday_hours: 0,
      total_hours_worked: 0,
      _error: true, // Flag for UI to show warning
    }
  }

  try {
    const token = localStorage.getItem('access_token')
    const url = `https://staging.wageyapp.com/attendance/${employeeId}/hours-breakdown/?period=${period}`

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000, // 5 second timeout per request
    })

    return {
      regular_hours: response.data.regular_hours ?? 0,
      overtime_hours: response.data.overtime_hours ?? 0,
      holiday_hours: response.data.holiday_hours ?? 0,
      total_hours_worked: response.data.total_hours_worked ?? 0,
      _error: false,
    }
  } catch (err) {
    console.warn(`Failed to fetch hours for employee ${employeeId}:`, err.message)

    // Return default values with error flag
    return {
      regular_hours: 0,
      overtime_hours: 0,
      holiday_hours: 0,
      total_hours_worked: 0,
      _error: true,
    }
  }
}

// Computed totals (defensive - always work even if payrollData isn't an array)
const safeArray = (arr) => (Array.isArray(arr) ? arr : [])

const totalEmployees = computed(() => safeArray(payrollData.value).length)

const totalGrossPay = computed(() =>
  safeArray(payrollData.value).reduce((sum, r) => sum + Number(r.gross_pay || 0), 0),
)

const totalNetPay = computed(() =>
  safeArray(payrollData.value).reduce((sum, r) => sum + Number(r.net_pay || 0), 0),
)

const totalHours = computed(() =>
  safeArray(payrollData.value).reduce(
    (sum, r) => sum + Number(r.breakdown?.attendance?.total_hours_worked || 0),
    0,
  ),
)

// Filtering options (defensive)
const uniquePeriods = computed(() => {
  const arr = safeArray(payrollData.value)
    .map((r) => r.period)
    .filter(Boolean)
  return [...new Set(arr)].sort().map((p) => ({ label: p, value: p }))
})
const runOptions = computed(() => {
  const arr = safeArray(payrollData.value)
    .map((r) => (typeof r.run === 'number' || typeof r.run === 'string' ? r.run : null))
    .filter((v) => v !== null)
  return [...new Set(arr)]
    .sort((a, b) => Number(a) - Number(b))
    .map((r) => ({ label: `Run #${r}`, value: r }))
})

// Filtered data
const filteredPayrollData = computed(() => {
  const arr = safeArray(payrollData.value)
  return arr.filter((r) => {
    const matchesSearch =
      !searchQuery.value ||
      (r.employee &&
        r.employee.toString().toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (r.employee_id &&
        r.employee_id.toString().toLowerCase().includes(searchQuery.value.toLowerCase()))

    const matchesPeriod = !selectedPeriod.value || r.period === selectedPeriod.value
    const matchesRun = !selectedRun.value || String(r.run) === String(selectedRun.value)

    return matchesSearch && matchesPeriod && matchesRun
  })
})

// Sorting
const sortBy = (field) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

const getSortIcon = (field) => {
  if (sortField.value !== field) return 'unfold_more'
  return sortDirection.value === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'
}

const sortedPayrollData = computed(() => {
  const arr = [...safeArray(filteredPayrollData.value)]
  if (!sortField.value) return arr

  const field = sortField.value
  return arr.sort((a, b) => {
    const aVal = a[field] ?? ''
    const bVal = b[field] ?? ''

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection.value === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }

    // Numeric sorting
    const aNum = Number(aVal)
    const bNum = Number(bVal)
    return sortDirection.value === 'asc' ? aNum - bNum : bNum - aNum
  })
})

// Pagination
const totalPages = computed(() =>
  Math.max(1, Math.ceil(sortedPayrollData.value.length / itemsPerPage)),
)
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return sortedPayrollData.value.slice(start, start + itemsPerPage)
})

// Helpers
const formatCurrency = (val) => {
  const n = Number(val ?? 0)
  return (
    '₱' +
    n.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}
const getInitials = (name) => {
  if (!name) return '?'
  return name
    .toString()
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
const maxGrossPay = computed(() => {
  const arr = safeArray(payrollData.value).map((r) => Number(r.gross_pay || 0))
  return arr.length ? Math.max(...arr) : 1
})
const maxNetPay = computed(() => {
  const arr = safeArray(payrollData.value).map((r) => Number(r.net_pay || 0))
  return arr.length ? Math.max(...arr) : 1
})
const getPayPercentage = (value, max) => (max > 0 ? Math.round(((value || 0) / max) * 100) : 0)
const averageNetPay = computed(() =>
  totalEmployees.value ? totalNetPay.value / totalEmployees.value : 0,
)

// Export to PDF (uses normalized data)
const exportToPDF = () => {
  const arr = safeArray(payrollData.value)
  if (!arr.length) {
    $q.notify({ type: 'warning', message: 'No payroll data to export' })
    return
  }

  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Payroll Report', 14, 20)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

  const tableData = arr.map((r, i) => [
    i + 1,
    r.employee ?? 'N/A',
    r.period ?? '-',
    `#${r.run ?? ''}`,
    formatCurrency(r.gross_pay),
    formatCurrency(r.net_pay),
    `${r.breakdown?.attendance?.total_hours_worked ?? 0}h`,
  ])

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Employee', 'Period', 'Run', 'Gross Pay', 'Net Pay', 'Hours']],
    body: tableData,
  })

  doc.save(`Payroll_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  $q.notify({ type: 'positive', message: 'Payroll exported as PDF!' })
}

// Download individual payslip
const downloadPayslip = (record) => {
  const rec = record ?? selectedRecord.value
  if (!rec) {
    $q.notify({ type: 'negative', message: 'No record selected to download' })
    return
  }

  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Employee Payslip', 14, 20)

  doc.setFontSize(12)
  doc.text(`Name: ${rec.employee ?? rec.employee_name}`, 14, 35)
  doc.text(`Employee ID: ${rec.employee_id ?? 'N/A'}`, 14, 45)
  doc.text(`Period: ${rec.period ?? '-'}`, 14, 55)
  doc.text(`Run: #${rec.run ?? ''}`, 14, 65)

  const yStart = 80
  autoTable(doc, {
    startY: yStart,
    head: [['Description', 'Amount']],
    body: [
      ['Gross Pay', formatCurrency(rec.gross_pay)],
      ['Net Pay', formatCurrency(rec.net_pay)],
      ['Deductions', formatCurrency((rec.gross_pay || 0) - (rec.net_pay || 0))],
    ],
  })

  const finalY = doc.lastAutoTable?.finalY ?? yStart + 40
  autoTable(doc, {
    startY: finalY + 8,
    head: [['Hours Type', 'Hours']],
    body: [
      ['Regular', rec.breakdown?.attendance?.regular_hours ?? 0],
      ['Overtime', rec.breakdown?.attendance?.overtime_hours ?? 0],
      ['Holiday', rec.breakdown?.attendance?.holiday_hours ?? 0],
      ['Total', rec.breakdown?.attendance?.total_hours_worked ?? 0],
    ],
  })

  doc.setFontSize(10)
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    14,
    (doc.lastAutoTable?.finalY ?? finalY) + 14,
  )
  doc.save(`${(rec.employee || 'employee').toString().replace(/\s+/g, '_')}_Payslip.pdf`)
  $q.notify({ type: 'positive', message: `Payslip downloaded for ${rec.employee}` })
}

// Modal logic
const viewDetails = (record) => {
  selectedRecord.value = record
  showDetailModal.value = true
}
const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
}

// watchers: reset page when filters change (simple)
watch([searchQuery, selectedPeriod, selectedRun], () => {
  currentPage.value = 1
})

// initial load
onMounted(() => {
  fetchPayrollData()
})
</script>

<style scoped>
.payroll-dashboard {
  background: #f8fafc;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

/* Loading and Error States */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  text-align: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin: 16px 0;
  padding: 32px;
}

.error-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  color: #64748b;
  width: 36px;
  height: 36px;
}

.export-btn {
  background: #6366f1;
  border-radius: 8px;
  font-weight: 500;
  padding: 6px 14px;
  height: 36px;
  font-size: 13px;
}

/* Stats Section */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  min-width: 0;
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
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.stats-icon {
  font-size: 24px;
  color: #374151;
}

.stats-content {
  flex: 1;
  min-width: 0;
}

.stats-amount {
  font-size: 24px;
  font-weight: 700;
  color: #1a202c;
  line-height: 1;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stats-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}

/* Filters Section */
.filters-section {
  margin-bottom: 16px;
}

.filters-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.filters-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.view-toggle {
  display: flex;
  gap: 6px;
}

.toggle-btn {
  border-radius: 8px;
  font-weight: 500;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.filter-input {
  background: #f8fafc;
  border-radius: 8px;
}

.filter-input .q-field__control {
  border-radius: 8px;
  height: 36px;
}

/* Table Section */
.table-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.table-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.table-info {
  font-size: 13px;
  color: #64748b;
}

/* Modern Table */
.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 10px;
  overflow: hidden;
  margin: 0 16px 16px 16px;
}

.table-wrapper {
  overflow-x: auto;
}

.payroll-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  min-width: 900px;
}

.table-header-row {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.table-header-cell {
  padding: 12px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  text-align: left;
  border: none;
  white-space: nowrap;
}

.table-header-cell.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.table-header-cell.sortable:hover {
  background-color: #e2e8f0;
}

.table-body-row {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-body-row:hover {
  background: #f8fafc;
}

.table-body-row.highlight-row {
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, rgba(34, 197, 94, 0.05) 100%);
}

.table-body-cell {
  padding: 12px 10px;
  font-size: 13px;
  color: #374151;
  border: none;
  vertical-align: middle;
}

.employee-cell {
  min-width: 180px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
  width: 32px;
  height: 32px;
  font-size: 13px;
}

.employee-details {
  flex: 1;
}

.employee-name {
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 2px;
  font-size: 13px;
}

.employee-id {
  font-size: 11px;
  color: #64748b;
}

.period-badge {
  padding: 4px 10px;
  background: #dbeafe;
  color: #2563eb;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.run-badge {
  padding: 4px 10px;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.amount-cell {
  min-width: 110px;
}

.amount-display {
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 4px;
  font-size: 13px;
}

.amount-progress {
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  overflow: hidden;
}

.amount-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.gross-bar {
  background: linear-gradient(90deg, #10b981, #22c55e);
}

.net-bar {
  background: linear-gradient(90deg, #3b82f6, #6366f1);
}

.hours-cell {
  text-align: center;
}

.hours-badge {
  padding: 4px 10px;
  background: #f3e8ff;
  color: #7c3aed;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.actions-cell {
  width: 100px;
  min-width: 100px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: nowrap;
}

.action-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 6px;
  flex-shrink: 0;
}

.view-btn {
  background: #dbeafe;
  color: #3b82f6;
}

.view-btn:hover {
  background: #bfdbfe;
}

.download-btn {
  background: #dcfce7;
  color: #16a34a;
}

.download-btn:hover {
  background: #bbf7d0;
}

/* Table Footer */
.table-footer {
  background: #f8fafc;
  padding: 14px 16px;
  border-top: 2px solid #3b82f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-info {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.total-label {
  font-size: 13px;
  font-weight: 600;
  color: #ef4444;
}

.total-records {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.total-amount {
  font-size: 13px;
  font-weight: 600;
  color: #16a34a;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-btn {
  color: #64748b;
  padding: 4px;
  width: 32px;
  height: 32px;
}

.pagination-btn:hover:not(:disabled) {
  background: #f1f5f9;
}

.page-info {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

/* Cards Section */
.cards-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 16px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.payroll-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.payroll-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.employee-avatar-large {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.employee-info-card {
  flex: 1;
  min-width: 0;
}

.card-employee-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-employee-id {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 6px;
}

.card-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #e2e8f0;
  color: #64748b;
}

.card-action-btn:hover {
  background: #3b82f6;
  color: white;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pay-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pay-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
}

.pay-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.pay-value {
  font-size: 15px;
  font-weight: 600;
  color: #1a202c;
}

.pay-value.net {
  color: #16a34a;
}

.hours-section {
  background: white;
  border-radius: 8px;
  padding: 12px;
}

.hours-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.hours-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: #f8fafc;
  border-radius: 6px;
}

.hours-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
  font-weight: 500;
}

.hours-value {
  font-size: 13px;
  font-weight: 600;
  color: #1a202c;
}

.hours-value.overtime {
  color: #f59e0b;
}

.hours-value.holiday {
  color: #8b5cf6;
}

.hours-value.total {
  color: #3b82f6;
}

.card-footer {
  border-top: 1px solid #e2e8f0;
  padding-top: 14px;
}

.period-info {
  display: flex;
  gap: 10px;
  justify-content: center;
}

/* Cards Pagination */
.cards-pagination {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-size: 13px;
  color: #64748b;
}

/* Modal Styles */
.detail-modal-card {
  width: 100%;
  max-width: 720px;
  max-height: 80vh;
  border-radius: 12px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9fafb;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon {
  font-size: 28px;
  color: #3b82f6;
  background: #dbeafe;
  padding: 8px;
  border-radius: 8px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

.modal-close-btn {
  color: #6b7280;
}

.modal-content {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.detail-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.detail-item span {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
}

.dialog-btn {
  padding: 7px 14px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
}

.primary-btn {
  background: #3b82f6;
  color: white;
}

/* No Data State */
.no-data {
  background: white;
  border-radius: 12px;
  padding: 48px 32px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.no-data-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
  opacity: 0.6;
}

.no-data h3 {
  color: #1a202c;
  margin: 0 0 12px 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.no-data p {
  color: #64748b;
  margin: 0 0 20px 0;
  font-size: 15px;
}

.retry-btn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 15px;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}

/* ===================================
   RESPONSIVE BREAKPOINTS
   =================================== */

/* 1440px - Large Desktop */
@media (min-width: 1440px) {
  .dashboard-container {
    padding: 20px;
  }

  .stats-section {
    gap: 16px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 14px 12px;
  }

  .action-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
  }
}

/* 1024px - Desktop / Tablet Landscape */
@media (max-width: 1024px) {
  .dashboard-container {
    padding: 14px;
  }

  .header-content {
    flex-wrap: wrap;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stats-card {
    padding: 14px;
  }

  .stats-icon-wrapper {
    width: 44px;
    height: 44px;
  }

  .stats-icon {
    font-size: 22px;
  }

  .stats-amount {
    font-size: 22px;
  }

  .stats-label {
    font-size: 11px;
  }

  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .table-header {
    padding: 14px;
  }

  .modern-table-container {
    margin: 0 14px 14px 14px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 11px 8px;
    font-size: 12px;
  }

  .actions-cell {
    width: 90px;
    min-width: 90px;
  }

  .action-buttons {
    gap: 3px;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }

  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .employee-avatar-large {
    width: 48px;
    height: 48px;
  }
}

/* 768px - Tablet Portrait */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }

  .page-header {
    padding: 12px;
    margin-bottom: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-actions {
    justify-content: space-between;
  }

  .page-title {
    font-size: 18px;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .stats-card {
    padding: 12px;
  }

  .stats-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .stats-icon {
    font-size: 20px;
  }

  .stats-amount {
    font-size: 20px;
  }

  .stats-label {
    font-size: 10px;
  }

  .filters-section {
    margin-bottom: 12px;
  }

  .filters-card {
    padding: 12px;
  }

  .filters-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filters-title {
    font-size: 15px;
  }

  .view-toggle {
    width: 100%;
    justify-content: stretch;
  }

  .toggle-btn {
    flex: 1;
  }

  .filters-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .table-header {
    padding: 12px;
  }

  .table-title {
    font-size: 16px;
  }

  .modern-table-container {
    margin: 0 10px 10px 10px;
  }

  .table-footer {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
  }

  .footer-info {
    justify-content: center;
    gap: 12px;
  }

  .pagination-controls {
    justify-content: center;
  }

  .cards-section {
    padding: 12px;
  }

  .cards-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .payroll-card {
    padding: 16px;
  }

  .card-header {
    margin-bottom: 14px;
  }

  .employee-avatar-large {
    width: 44px;
    height: 44px;
  }

  .card-employee-name {
    font-size: 15px;
  }

  .cards-pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-modal-card {
    max-width: 95vw;
    margin: 12px;
  }

  .modal-header,
  .modal-content {
    padding: 14px;
  }

  .modal-title {
    font-size: 17px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

/* Small Mobile - 480px and below */
@media (max-width: 480px) {
  .dashboard-container {
    padding: 10px;
  }

  .page-header {
    padding: 10px;
    border-radius: 10px;
  }

  .page-title {
    font-size: 16px;
  }

  .header-btn {
    width: 32px;
    height: 32px;
  }

  .export-btn {
    padding: 6px 12px;
    height: 32px;
    font-size: 12px;
  }

  .stats-card {
    padding: 10px;
  }

  .stats-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .stats-icon {
    font-size: 18px;
  }

  .stats-amount {
    font-size: 18px;
  }

  .stats-label {
    font-size: 9px;
  }

  .filters-card {
    padding: 10px;
  }

  .filters-title {
    font-size: 14px;
  }

  .toggle-btn {
    font-size: 11px;
    padding: 0 10px;
  }

  .table-header {
    padding: 10px;
  }

  .table-title {
    font-size: 15px;
  }

  .modern-table-container {
    margin: 0 8px 8px 8px;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }

  .payroll-card {
    padding: 14px;
  }

  .employee-avatar-large {
    width: 40px;
    height: 40px;
  }

  .card-employee-name {
    font-size: 14px;
  }

  .pay-item {
    padding: 8px 10px;
  }

  .hours-item {
    padding: 8px;
  }

  .modal-header,
  .modal-content {
    padding: 12px;
  }

  .modal-title {
    font-size: 16px;
  }
}
</style>
