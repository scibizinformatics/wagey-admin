<template>
  <div class="payroll-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Payroll</h1>
          <div class="header-actions">
            <q-btn flat round icon="refresh" class="header-btn" @click="fetchPayrollData" />
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
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-blue">
            <q-icon name="people" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Total Employees</div>
            <div class="stats-amount">{{ totalEmployees }}</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-amber">
            <q-icon name="attach_money" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Total Gross Pay</div>
            <div class="stats-amount">{{ formatCurrency(totalGrossPay) }}</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-green">
            <q-icon name="account_balance_wallet" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Total Net Pay</div>
            <div class="stats-amount">{{ formatCurrency(totalNetPay) }}</div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-purple">
            <q-icon name="schedule" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Total Hours</div>
            <div class="stats-amount">{{ totalHours }}h</div>
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
                  v-for="record in paginatedData"
                  :key="record.id"
                  class="table-body-row"
                  :class="{ 'highlight-row': record.net_pay > averageNetPay }"
                >
                  <td class="table-body-cell employee-cell">
                    <div class="employee-info">
                      <q-avatar size="34px" class="employee-avatar">
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
                    <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                      <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                        <q-list dense style="min-width: 150px">
                          <q-item
                            clickable
                            v-close-popup
                            @click="viewDetails(record)"
                            class="dropdown-item"
                          >
                            <q-item-section avatar
                              ><q-icon name="visibility" size="16px"
                            /></q-item-section>
                            <q-item-section>View details</q-item-section>
                          </q-item>
                          <q-item
                            clickable
                            v-close-popup
                            @click="downloadPayslip(record)"
                            class="dropdown-item"
                          >
                            <q-item-section avatar
                              ><q-icon name="description" size="16px"
                            /></q-item-section>
                            <q-item-section>Download payslip</q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
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
            <q-avatar size="44px" class="modal-avatar-icon">
              <q-icon name="receipt_long" size="22px" />
            </q-avatar>
            <div>
              <div class="modal-title">Payroll Details</div>
              <div class="modal-subtitle" v-if="selectedRecord">{{ selectedRecord.employee }}</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" @click="closeDetailModal" />
        </q-card-section>

        <q-separator />

        <q-card-section class="modal-content" v-if="selectedRecord">
          <div class="modal-section-title">Employee information</div>
          <div class="detail-grid-cards">
            <div class="detail-card">
              <div class="detail-card-label">Name</div>
              <div class="detail-card-value">{{ selectedRecord.employee }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Employee ID</div>
              <div class="detail-card-value">{{ selectedRecord.employee_id || 'N/A' }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Period</div>
              <div class="detail-card-value">{{ selectedRecord.period }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Run</div>
              <div class="detail-card-value">#{{ selectedRecord.run }}</div>
            </div>
          </div>
          <div class="modal-section-title">Pay information</div>
          <div class="detail-grid-cards">
            <div class="detail-card">
              <div class="detail-card-label">Gross Pay</div>
              <div class="detail-card-value amount-green">
                {{ formatCurrency(selectedRecord.gross_pay) }}
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Net Pay</div>
              <div class="detail-card-value amount-blue">
                {{ formatCurrency(selectedRecord.net_pay) }}
              </div>
            </div>
            <div class="detail-card detail-card-full">
              <div class="detail-card-label">Deductions</div>
              <div class="detail-card-value amount-red">
                {{ formatCurrency(selectedRecord.gross_pay - selectedRecord.net_pay) }}
              </div>
            </div>
          </div>
          <div class="modal-section-title">Hours breakdown</div>
          <div class="detail-grid-cards">
            <div class="detail-card">
              <div class="detail-card-label">Regular</div>
              <div class="detail-card-value">
                {{ selectedRecord.breakdown?.attendance?.regular_hours || 0 }}h
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Overtime</div>
              <div class="detail-card-value amount-amber">
                {{ selectedRecord.breakdown?.attendance?.overtime_hours || 0 }}h
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Holiday</div>
              <div class="detail-card-value amount-purple">
                {{ selectedRecord.breakdown?.attendance?.holiday_hours || 0 }}h
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Total</div>
              <div class="detail-card-value">
                {{ selectedRecord.breakdown?.attendance?.total_hours_worked || 0 }}h
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
/* ==============================
   BASE
============================== */
.payroll-dashboard {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* ==============================
   HEADER
============================== */
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
}

.header-btn {
  color: #6b7280 !important;
  width: 36px;
  height: 36px;
  border-radius: 8px !important;
}

.header-btn:hover {
  background: #f3f4f6 !important;
}

.export-btn {
  height: 36px;
  border-radius: 8px !important;
  font-weight: 500;
  font-size: 13px;
  text-transform: none;
  padding: 0 16px;
}

/* ==============================
   STATS CARDS
============================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid #e8ecf0;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  transition: box-shadow 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.stats-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stats-icon {
  font-size: 20px;
}

.stats-icon-blue {
  background: #eff6ff;
  color: #3b82f6;
}
.stats-icon-amber {
  background: #fefce8;
  color: #ca8a04;
}
.stats-icon-green {
  background: #f0fdf4;
  color: #22c55e;
}
.stats-icon-purple {
  background: #f5f3ff;
  color: #8b5cf6;
}

.stats-content {
  min-width: 0;
}

.stats-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}

.stats-amount {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==============================
   FILTERS SECTION
============================== */
.filters-section {
  margin-bottom: 16px;
}

.filters-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 20px;
  border: 1px solid #e8ecf0;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.filters-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.view-toggle {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 3px;
}

.toggle-btn {
  border-radius: 6px !important;
  font-weight: 500;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  text-transform: none;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.filter-input :deep(.q-field__control) {
  border-radius: 8px;
}

/* ==============================
   TABLE SECTION
============================== */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  margin-bottom: 16px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-wrap: wrap;
  gap: 8px;
}

.table-title-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-info {
  font-size: 12px;
  color: #9ca3af;
}

.modern-table-container {
  overflow: hidden;
  margin: 0 16px 16px;
  border: 1px solid #e8ecf0;
  border-radius: 10px;
}

.table-wrapper {
  overflow-x: auto;
}

.payroll-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: white;
}

.table-header-row {
  background: #f8fafc;
}

.table-header-cell {
  padding: 11px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e8ecf0;
  white-space: nowrap;
}

.table-header-cell.sortable {
  cursor: pointer;
  user-select: none;
}

.table-header-cell.sortable:hover {
  background: #f1f5f9;
  color: #374151;
}

.table-body-row {
  border-bottom: 1px solid #f1f3f5;
  transition: background 0.15s;
}

.table-body-row:hover .table-body-cell {
  background: #f9fafb;
}

.table-body-cell {
  padding: 12px 16px;
  color: #374151;
  font-size: 13px;
  vertical-align: middle;
}

.highlight-row .table-body-cell {
  background: #f0fdf4;
}

/* Employee cell */
.employee-cell {
  min-width: 180px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-avatar {
  background: #e0e7ff !important;
  color: #4338ca !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  flex-shrink: 0;
}

.employee-avatar :deep(.q-avatar__content) {
  font-size: 12px !important;
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
}

.employee-id {
  font-size: 11px;
  color: #9ca3af;
}

/* Badges */
.period-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  white-space: nowrap;
}

.run-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: #f5f3ff;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
  white-space: nowrap;
}

.hours-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  white-space: nowrap;
}

/* Amount cells */
.amount-cell {
  min-width: 120px;
}

.amount-display {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  margin-bottom: 4px;
}

.amount-progress {
  height: 3px;
  background: #f1f3f5;
  border-radius: 2px;
  overflow: hidden;
}

.amount-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.gross-bar {
  background: #f59e0b;
}
.net-bar {
  background: #22c55e;
}

/* Actions */
.actions-cell {
  text-align: center;
  width: 60px;
}

.action-menu-btn {
  color: #6b7280 !important;
  border-radius: 6px !important;
}

.action-menu-btn:hover {
  background: #f3f4f6 !important;
}

.action-dropdown {
  border-radius: 8px !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

.dropdown-item {
  font-size: 13px !important;
  color: #374151 !important;
  min-height: 36px !important;
  padding: 0 12px !important;
}

.dropdown-item:hover {
  background: #f9fafb !important;
}

/* Table footer */
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  flex-wrap: wrap;
  gap: 8px;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #6b7280;
}

.total-label {
  font-weight: 600;
  color: #374151;
}
.total-records {
  color: #6b7280;
}
.total-amount {
  color: #16a34a;
  font-weight: 600;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination-btn {
  color: #6b7280;
  border-radius: 6px !important;
}
.pagination-btn:hover {
  background: #f3f4f6 !important;
}

.page-info {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  min-width: 90px;
  text-align: center;
}

/* ==============================
   CARDS VIEW
============================== */
.cards-section {
  margin-bottom: 16px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.payroll-card {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.payroll-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e8ecf0;
}

.employee-avatar-large {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.employee-info-card {
  flex: 1;
  min-width: 0;
}

.card-employee-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-employee-id {
  font-size: 11px;
  color: #9ca3af;
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-action-btn {
  color: #6b7280 !important;
  width: 30px;
  height: 30px;
  border-radius: 6px !important;
}

.card-action-btn:hover {
  background: #f3f4f6 !important;
}

.card-body {
  padding: 14px 16px;
}

.pay-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f3f5;
}

.pay-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pay-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pay-value {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.pay-value.net {
  color: #16a34a;
}

.hours-section {
  margin-bottom: 12px;
}

.hours-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.hours-item {
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}

.hours-label {
  font-size: 10px;
  color: #9ca3af;
  font-weight: 500;
  display: block;
  margin-bottom: 3px;
  text-transform: uppercase;
}
.hours-value {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
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
  padding-top: 10px;
  border-top: 1px solid #f1f3f5;
}

.period-info {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.cards-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px;
  flex-wrap: wrap;
  gap: 8px;
}

.pagination-info {
  font-size: 13px;
  color: #6b7280;
}

/* ==============================
   MODAL
============================== */
.detail-modal-card {
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 14px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #ffffff;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  background: #eff6ff !important;
  color: #3b82f6 !important;
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}
.modal-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.modal-close-btn {
  color: #9ca3af !important;
}
.modal-close-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
}

.modal-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 16px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f3f5;
}

.modal-section-title:first-child {
  margin-top: 0;
}

.detail-grid-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #f1f3f5;
}

.detail-card-full {
  grid-column: 1 / -1;
}

.detail-card-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.detail-card-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.amount-green {
  color: #16a34a;
}
.amount-blue {
  color: #2563eb;
}
.amount-red {
  color: #dc2626;
}
.amount-amber {
  color: #d97706;
}
.amount-purple {
  color: #7c3aed;
}

.dialog-btn {
  border-radius: 8px !important;
  font-size: 13px;
  text-transform: none;
}
.primary-btn {
  font-weight: 500;
}

/* Loading / error */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  margin: 16px 0;
  padding: 32px;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 14px;
}

/* ==============================
   RESPONSIVE
============================== */
@media (max-width: 900px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 14px;
  }
  .header-content {
    flex-wrap: wrap;
  }
  .stats-section {
    grid-template-columns: 1fr;
  }
  .filters-grid {
    grid-template-columns: 1fr;
  }
  .detail-grid-cards {
    grid-template-columns: 1fr;
  }
  .detail-card-full {
    grid-column: span 1;
  }
  .modern-table-container {
    margin: 0 10px 10px;
  }
  .hours-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 18px;
  }
  .stats-amount {
    font-size: 18px;
  }
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
