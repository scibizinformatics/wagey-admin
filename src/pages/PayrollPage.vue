<template>
  <div class="payroll-dashboard">
    <div class="dashboard-container">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading payroll data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Data</h3>
        <p>{{ error }}</p>
        <button @click="fetchPayrollData" class="retry-btn">
          <span class="retry-icon">🔄</span>
          Retry
        </button>
      </div>

      <!-- Main Content -->
      <div v-else-if="payrollData.length" class="payroll-content">
        <!-- Header Section -->
        <div class="page-header">
          <div class="header-content">
            <div class="header-left">
              <h1 class="page-title">Payroll Management</h1>
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

      <!-- No Data -->
      <div v-else class="no-data">
        <div class="no-data-icon">📊</div>
        <h3>No Payroll Records Found</h3>
        <p>There are currently no payroll records to display.</p>
        <button @click="fetchPayrollData" class="retry-btn">🔄 Refresh Data</button>
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
                  <span>{{
                    formatCurrency(selectedRecord.gross_pay - selectedRecord.net_pay)
                  }}</span>
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
  </div>
</template>

<script>
export default {
  name: 'EnhancedPayrollTable',
  data() {
    return {
      payrollData: [],
      loading: false,
      error: null,
      apiEndpoint: 'https://staging.wageyapp.com/payroll/company/{selectedCompany}/payslips/',

      // UI State
      viewMode: 'table',
      searchQuery: '',
      selectedPeriod: '',
      selectedRun: '',
      sortColumn: '',
      sortDirection: 'asc',

      // Pagination
      currentPage: 1,
      itemsPerPage: 10,

      // Modal
      showDetailModal: false,
      selectedRecord: null,
    }
  },
  computed: {
    // Summary Statistics
    totalEmployees() {
      return this.payrollData.length
    },
    totalGrossPay() {
      return this.payrollData.reduce((sum, record) => sum + (record.gross_pay || 0), 0)
    },
    totalNetPay() {
      return this.payrollData.reduce((sum, record) => sum + (record.net_pay || 0), 0)
    },
    totalHours() {
      return this.payrollData.reduce((sum, record) => {
        const hours = record.breakdown?.attendance?.total_hours_worked || 0
        return sum + hours
      }, 0)
    },
    averageNetPay() {
      return this.totalNetPay / this.totalEmployees || 0
    },
    maxGrossPay() {
      return Math.max(...this.payrollData.map((r) => r.gross_pay || 0))
    },
    maxNetPay() {
      return Math.max(...this.payrollData.map((r) => r.net_pay || 0))
    },

    // Filter Options
    uniquePeriods() {
      const periods = [...new Set(this.payrollData.map((record) => record.period))].sort()
      return periods.map((period) => ({ label: period, value: period }))
    },
    runOptions() {
      const runs = [...new Set(this.payrollData.map((record) => record.run))].sort((a, b) => a - b)
      return runs.map((run) => ({ label: `Run #${run}`, value: run }))
    },

    // Filtered Data
    filteredPayrollData() {
      let filtered = [...this.payrollData]

      if (this.searchQuery) {
        filtered = filtered.filter((record) =>
          record.employee.toLowerCase().includes(this.searchQuery.toLowerCase()),
        )
      }

      if (this.selectedPeriod) {
        filtered = filtered.filter((record) => record.period === this.selectedPeriod)
      }

      if (this.selectedRun) {
        filtered = filtered.filter((record) => record.run === this.selectedRun)
      }

      if (this.sortColumn) {
        filtered.sort((a, b) => {
          let aVal = this.getNestedValue(a, this.sortColumn)
          let bVal = this.getNestedValue(b, this.sortColumn)

          if (typeof aVal === 'string') aVal = aVal.toLowerCase()
          if (typeof bVal === 'string') bVal = bVal.toLowerCase()

          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
          return this.sortDirection === 'asc' ? comparison : -comparison
        })
      }

      return filtered
    },

    // Pagination
    totalPages() {
      return Math.ceil(this.filteredPayrollData.length / this.itemsPerPage)
    },
    paginatedData() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.filteredPayrollData.slice(start, end)
    },
  },
  watch: {
    searchQuery() {
      this.currentPage = 1
    },
    selectedPeriod() {
      this.currentPage = 1
    },
    selectedRun() {
      this.currentPage = 1
    },
  },
  mounted() {
    this.fetchPayrollData()
  },
  methods: {
    async fetchPayrollData() {
      this.loading = true
      this.error = null

      try {
        const token = this.getAuthToken()
        const selectedCompany = localStorage.getItem('selectedCompany') // or wherever you stored it

        const url = `https://staging.wageyapp.com/payroll/company/${selectedCompany}/payslips/`

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        this.payrollData = Array.isArray(data)
          ? this.processPayrollData(data)
          : this.processPayrollData(data.data || [data])
      } catch (err) {
        this.error = err.message
        console.error('Error fetching payroll data:', err)
      } finally {
        this.loading = false
      }
    },

    processPayrollData(data) {
      return data.map((record, index) => ({
        ...record,
        id: record.id || `payroll-${index}`,
        employee_id: record.employee_id || `EMP-${String(index + 1).padStart(3, '0')}`,
        breakdown: {
          attendance: {
            regular_hours: record.breakdown?.attendance?.regular_hours || 0,
            overtime_hours: record.breakdown?.attendance?.overtime_hours || 0,
            holiday_hours: record.breakdown?.attendance?.holiday_hours || 0,
            total_hours_worked: record.breakdown?.attendance?.total_hours_worked || 0,
          },
          ...record.breakdown,
        },
      }))
    },

    getAuthToken() {
      const possibleKeys = ['access_token', 'token']
      for (const key of possibleKeys) {
        const token = localStorage?.getItem(key) || sessionStorage?.getItem(key)
        if (token) return token
      }
      return null
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount || 0)
    },

    getInitials(name) {
      return name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
    },

    getPayPercentage(amount, max) {
      return max > 0 ? Math.round((amount / max) * 100) : 0
    },

    getNestedValue(obj, path) {
      return path.split('.').reduce((current, prop) => current && current[prop], obj)
    },

    // Sorting
    sortBy(column) {
      if (this.sortColumn === column) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortColumn = column
        this.sortDirection = 'asc'
      }
    },

    getSortIcon(column) {
      if (this.sortColumn !== column) return 'unfold_more'
      return this.sortDirection === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'
    },

    // Actions
    viewDetails(record) {
      this.selectedRecord = record
      this.showDetailModal = true
    },

    closeDetailModal() {
      this.showDetailModal = false
      this.selectedRecord = null
    },

    downloadPayslip(record) {
      console.log('Downloading payslip for:', record.employee)
      this.$q.notify({
        type: 'positive',
        message: `Downloading payslip for ${record.employee}`,
        position: 'top',
        timeout: 3000,
      })
    },

    exportToPDF() {
      console.log('Exporting to PDF...')
      this.$q.notify({
        type: 'info',
        message: 'PDF export functionality would be implemented here',
        position: 'top',
        timeout: 3000,
      })
    },

    exportToExcel() {
      console.log('Exporting to Excel...')
      this.$q.notify({
        type: 'info',
        message: 'Excel export functionality would be implemented here',
        position: 'top',
        timeout: 3000,
      })
    },

    printReport() {
      console.log('Printing report...')
      window.print()
    },
  },
}
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
  padding: 24px;
}

/* Loading and Error States */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin: 20px 0;
  padding: 40px;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
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
  font-size: 28px;
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

.view-toggle {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  border-radius: 8px;
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
}

.table-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.table-info {
  font-size: 14px;
  color: #64748b;
}

/* Modern Table */
.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 12px;
  overflow: hidden;
  margin: 0 24px 24px 24px;
}

.table-wrapper {
  overflow-x: auto;
}

.payroll-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  min-width: 1000px;
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
  padding: 16px;
  font-size: 14px;
  color: #374151;
  border: none;
  vertical-align: middle;
}

.employee-cell {
  min-width: 200px;
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

.employee-details {
  flex: 1;
}

.employee-name {
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 2px;
}

.employee-id {
  font-size: 12px;
  color: #64748b;
}

.period-badge {
  padding: 6px 12px;
  background: #dbeafe;
  color: #2563eb;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.run-badge {
  padding: 6px 12px;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.amount-cell {
  min-width: 120px;
}

.amount-display {
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 4px;
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
  padding: 6px 12px;
  background: #f3e8ff;
  color: #7c3aed;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.actions-cell {
  min-width: 120px;
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

.total-amount {
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

/* Cards Section */
.cards-section {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 24px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.payroll-card {
  background: #f8fafc;
  border-radius: 16px;
  padding: 24px;
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
  margin-bottom: 20px;
  gap: 16px;
}

.employee-avatar-large {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.2rem;
}

.employee-info-card {
  flex: 1;
}

.card-employee-name {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.card-employee-id {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 8px;
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

.pay-section {
  margin-bottom: 20px;
}

.pay-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.pay-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.pay-value {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
}

.pay-value.net {
  color: #16a34a;
}

.hours-section {
  margin-bottom: 20px;
}

.hours-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.hours-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.hours-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
  font-weight: 500;
}

.hours-value {
  font-size: 14px;
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
  padding-top: 16px;
  margin-top: 20px;
}

.period-info {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* Cards Pagination */
.cards-pagination {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-info {
  font-size: 14px;
  color: #64748b;
}

/* Modal Styles */
.detail-modal-card {
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  border-radius: 12px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #f9fafb;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-icon {
  font-size: 32px;
  color: #3b82f6;
  background: #dbeafe;
  padding: 8px;
  border-radius: 8px;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin-top: 2px;
}

.modal-close-btn {
  color: #6b7280;
}

.modal-content {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.detail-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
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
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.detail-item span {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
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

/* No Data State */
.no-data {
  background: white;
  border-radius: 16px;
  padding: 60px 40px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.no-data-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.6;
}

.no-data h3 {
  color: #1a202c;
  margin: 0 0 15px 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.no-data p {
  color: #64748b;
  margin: 0 0 25px 0;
  font-size: 16px;
}

.retry-btn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 16px;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
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

  .stats-amount {
    font-size: 24px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .filters-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .modern-table-container {
    margin: 0 16px 16px 16px;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .payroll-table {
    min-width: 800px;
  }

  .table-body-cell {
    padding: 12px 8px;
    font-size: 12px;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .cards-pagination {
    flex-direction: column;
    gap: 16px;
  }

  .footer-info {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
