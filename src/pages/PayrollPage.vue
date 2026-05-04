<template>
  <div class="payroll-dashboard">
    <div class="dashboard-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Payroll</h1>
          <div class="header-actions">
            <q-btn 
              flat 
              round 
              icon="arrow_back" 
              class="header-btn" 
              v-if="selectedRun" 
              @click="backToRuns"
            >
              <q-tooltip>Back to Runs</q-tooltip>
            </q-btn>
            <q-btn flat round icon="refresh" class="header-btn" @click="refreshData" />
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
            <div class="stats-label">{{ selectedRun ? 'Employees' : 'Total Runs' }}</div>
            <div class="stats-amount">{{ selectedRun ? paginatedEmployees.length : payrollRunsSummary.length }}</div>
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
            <div class="stats-label">Stage</div>
            <div class="stats-amount stage-text">{{ selectedRun ? getStageLabel(selectedRun.status) : 'Overview' }}</div>
          </div>
        </div>
      </div>

      <!-- Payroll Runs List (shown when no run selected) -->
      <div v-if="!selectedRun" class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Payroll Runs</h2>
            <div class="table-info">{{ payrollRunsSummary.length }} runs available</div>
          </div>
          <q-btn flat round icon="refresh" @click="fetchPayrollRunsSummary" :loading="loading" />
        </div>

        <div class="modern-table-container">
          <div class="table-wrapper">
            <table class="payroll-table">
              <thead>
                <tr class="table-header-row">
                  <th class="table-header-cell">Run ID</th>
                  <th class="table-header-cell">Name</th>
                  <th class="table-header-cell">Status</th>
                  <th class="table-header-cell">Period</th>
                  <th class="table-header-cell">Calculated</th>
                  <th class="table-header-cell">Final Amount</th>
                  <th class="table-header-cell" style="text-align: center">Employees</th>
                  <th class="table-header-cell" style="text-align: center">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="8" class="table-body-cell text-center">
                    <q-spinner color="primary" size="24px" />
                  </td>
                </tr>
                <tr
                  v-else
                  v-for="run in payrollRunsSummary"
                  :key="run.id"
                  class="table-body-row run-row"
                >
                  <td class="table-body-cell">
                    <div class="run-badge">#{{ run.id }}</div>
                  </td>
                  <td class="table-body-cell">{{ run.name }}</td>
                  <td class="table-body-cell">
                    <q-badge :color="getStageColor(run.status)">
                      {{ getStageLabel(run.status) }}
                    </q-badge>
                  </td>
                  <td class="table-body-cell">{{ run.period || 'N/A' }}</td>
                  <td class="table-body-cell amount-cell">
                    {{ formatCurrency(run.calculated_amount) }}
                  </td>
                  <td class="table-body-cell amount-cell">
                    {{ formatCurrency(run.final_amount) }}
                  </td>
                  <td class="table-body-cell text-center">
                    <span class="count-badge">{{ run.employee_count || 0 }}</span>
                  </td>
                  <td class="table-body-cell actions-cell">
                    <q-btn
                      unelevated
                      color="primary"
                      icon="visibility"
                      label="View"
                      size="sm"
                      no-caps
                      @click="selectRun(run)"
                    />
                  </td>
                </tr>
                <tr v-if="!loading && !payrollRunsSummary.length">
                  <td colspan="8" class="table-body-cell text-center text-grey-5">
                    No payroll runs found
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Employees Table (shown when run selected) -->
      <div v-else class="employees-section">
        <!-- Run Info Header -->
        <div class="run-info-card">
          <div class="run-info-content">
            <div class="run-info-main">
              <span class="run-info-id">Run #{{ selectedRun.id }}</span>
              <span class="run-info-name">{{ selectedRun.name }}</span>
              <q-badge :color="getStageColor(selectedRun.status)">
                {{ getStageLabel(selectedRun.status) }}
              </q-badge>
            </div>
            <div class="run-info-stats">
              <span>{{ payrollRunEmployees.length }} Employees</span>
              <span>·</span>
              <span>{{ formatCurrency(selectedRun.final_amount) }}</span>
            </div>
          </div>
        </div>

        <!-- Bulk Actions Toolbar -->
        <div v-if="selectedEmployees.length > 0" class="bulk-actions-bar">
          <div class="bulk-actions-info">
            <q-icon name="check_circle" color="positive" />
            <span>{{ selectedEmployees.length }} employees selected</span>
          </div>
          <div class="bulk-actions-buttons">
            <q-btn
              v-if="canBulkApproveAdmin"
              unelevated
              color="primary"
              icon="verified_user"
              label="Approve Admin"
              size="sm"
              no-caps
              :loading="saving"
              @click="bulkAction('approve_admin')"
            />
            <q-btn
              v-if="canBulkApproveOwner"
              unelevated
              color="indigo"
              icon="admin_panel_settings"
              label="Approve Owner"
              size="sm"
              no-caps
              :loading="saving"
              @click="bulkAction('approve_owner')"
            />
            <q-btn
              v-if="canBulkRelease"
              unelevated
              color="orange"
              icon="send"
              label="Release"
              size="sm"
              no-caps
              :loading="saving"
              @click="bulkAction('release')"
            />
            <q-btn flat size="sm" @click="clearSelection">Clear</q-btn>
          </div>
        </div>

        <!-- Filters -->
        <div class="filters-bar">
          <q-input
            dense
            outlined
            v-model="employeeSearch"
            placeholder="Search employees..."
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
            v-model="statusFilter"
            :options="statusOptions"
            label="Status"
            class="filter-input"
            clearable
            emit-value
            map-options
          />
        </div>

        <!-- Employees Table -->
        <div class="table-section">
          <div class="table-header">
            <div class="table-title-section">
              <h2 class="table-title">Employees</h2>
              <div class="table-info">
                Showing {{ filteredEmployees.length }} of {{ payrollRunEmployees.length }}
              </div>
            </div>
            <q-checkbox
              v-model="selectAll"
              label="Select All"
              @update:model-value="toggleSelectAll"
            />
          </div>

          <div class="modern-table-container">
            <div class="table-wrapper">
              <table class="payroll-table">
                <thead>
                  <tr class="table-header-row">
                    <th class="table-header-cell" style="width: 40px">
                      <q-checkbox v-model="selectAll" @update:model-value="toggleSelectAll" />
                    </th>
                    <th class="table-header-cell">Employee</th>
                    <th class="table-header-cell">Status</th>
                    <th class="table-header-cell">Gross Pay</th>
                    <th class="table-header-cell">Net Pay</th>
                    <th class="table-header-cell" style="text-align: center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="workflowLoading">
                    <td colspan="6" class="table-body-cell text-center">
                      <q-spinner color="primary" size="24px" />
                    </td>
                  </tr>
                  <tr
                    v-else
                    v-for="emp in paginatedEmployees"
                    :key="emp.employee_id"
                    class="table-body-row"
                    :class="{ 'selected-row': selectedEmployees.includes(emp.employee_id) }"
                  >
                    <td class="table-body-cell text-center">
                      <q-checkbox
                        :model-value="selectedEmployees.includes(emp.employee_id)"
                        @update:model-value="toggleSelection(emp.employee_id)"
                      />
                    </td>
                    <td class="table-body-cell employee-cell">
                      <div class="employee-info">
                        <q-avatar size="34px" class="avatar-fallback">
                          {{ getInitials(emp.employee_name) }}
                        </q-avatar>
                        <div class="employee-details">
                          <div class="employee-name">{{ emp.employee_name }}</div>
                          <div class="employee-id">{{ emp.employee_id }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="table-body-cell">
                      <q-badge :color="getStatusColor(emp.status)">
                        {{ getStatusLabel(emp.status) }}
                      </q-badge>
                    </td>
                    <td class="table-body-cell amount-cell">
                      {{ formatCurrency(emp.gross_pay) }}
                    </td>
                    <td class="table-body-cell amount-cell">
                      {{ formatCurrency(emp.net_pay) }}
                    </td>
                    <td class="table-body-cell actions-cell">
                      <div class="action-buttons">
                        <q-btn
                          v-if="emp.status === 'draft'"
                          flat
                          dense
                          color="primary"
                          icon="verified_user"
                          label="Approve"
                          size="sm"
                          no-caps
                          :loading="saving"
                          @click="employeeAction(emp, 'approve_admin')"
                        />
                        <q-btn
                          v-else-if="emp.status === 'approved_admin'"
                          flat
                          dense
                          color="indigo"
                          icon="admin_panel_settings"
                          label="Approve"
                          size="sm"
                          no-caps
                          :loading="saving"
                          @click="employeeAction(emp, 'approve_owner')"
                        />
                        <q-btn
                          v-else-if="emp.status === 'approved_owner'"
                          flat
                          dense
                          color="orange"
                          icon="send"
                          label="Release"
                          size="sm"
                          no-caps
                          :loading="saving"
                          @click="employeeAction(emp, 'release')"
                        />
                        <div v-else-if="emp.status === 'funded'" class="disbursement-buttons">
                          <q-btn
                            flat
                            dense
                            color="amber-8"
                            icon="payments"
                            label="Cash"
                            size="sm"
                            no-caps
                            :loading="saving"
                            @click="employeeAction(emp, 'cash')"
                          />
                          <q-btn
                            flat
                            dense
                            color="blue"
                            icon="account_balance"
                            label="Bank"
                            size="sm"
                            no-caps
                            :loading="saving"
                            @click="employeeAction(emp, 'bank')"
                          />
                        </div>
                        <q-icon
                          v-else-if="['cash_disbursed', 'bank_disbursed', 'completed'].includes(emp.status)"
                          name="task_alt"
                          color="positive"
                          size="24px"
                        >
                          <q-tooltip>Completed</q-tooltip>
                        </q-icon>
                        <span v-else class="text-grey-5 text-caption">{{ getStatusLabel(emp.status) }}</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!workflowLoading && !paginatedEmployees.length">
                    <td colspan="6" class="table-body-cell text-center text-grey-5">
                      No employees found
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Pagination -->
          <div class="pagination-bar">
            <div class="pagination-info">
              Page {{ currentPage }} of {{ totalPages }} · {{ itemsPerPage }} per page
            </div>
            <div class="pagination-controls">
              <q-btn
                flat
                icon="chevron_left"
                :disable="currentPage === 1"
                @click="currentPage--"
              />
              <q-btn
                flat
                icon="chevron_right"
                :disable="currentPage === totalPages"
                @click="currentPage++"
              />
            </div>
          </div>
        </div>

        <!-- Run-Level Actions (when not in bulk selection) -->
        <div v-if="selectedEmployees.length === 0" class="run-actions">
          <q-btn
            v-if="selectedRun.status === 'acknowledged'"
            unelevated
            color="purple"
            icon="account_balance"
            label="Fund This Run"
            no-caps
            :loading="saving"
            @click="fundRun"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { usePayroll } from 'src/composables/page/usePayroll'

const $q = useQuasar()

// Payroll composable
const {
  payrollRunsSummary,
  payrollRunEmployees,
  fetchPayrollRunsSummary,
  fetchPayrollRunEmployees,
  approveByAdmin,
  approveByOwner,
  releasePayslip,
  fundPayroll,
  cashDisbursement,
  bankTransfer,
  loading,
  saving,
  workflowLoading,
} = usePayroll()

// State
const selectedRun = ref(null)
const selectedEmployees = ref([])
const selectAll = ref(false)
const currentPage = ref(1)
const itemsPerPage = 20
const employeeSearch = ref('')
const statusFilter = ref(null)

// Status filter options
const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Admin Approved', value: 'approved_admin' },
  { label: 'Owner Approved', value: 'approved_owner' },
  { label: 'Released', value: 'released' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Funded', value: 'funded' },
  { label: 'Completed', value: 'completed' },
]

// Computed
const filteredEmployees = computed(() => {
  let employees = payrollRunEmployees.value || []
  
  // Search filter
  if (employeeSearch.value) {
    const query = employeeSearch.value.toLowerCase()
    employees = employees.filter(e => 
      (e.employee_name || '').toLowerCase().includes(query) ||
      (e.employee_id || '').toString().includes(query)
    )
  }
  
  // Status filter
  if (statusFilter.value) {
    employees = employees.filter(e => e.status === statusFilter.value)
  }
  
  return employees
})

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredEmployees.value.slice(start, end)
})

const totalPages = computed(() => 
  Math.ceil(filteredEmployees.value.length / itemsPerPage) || 1
)

const totalGrossPay = computed(() => 
  filteredEmployees.value.reduce((sum, e) => sum + (e.gross_pay || 0), 0)
)

const totalNetPay = computed(() => 
  filteredEmployees.value.reduce((sum, e) => sum + (e.net_pay || 0), 0)
)

// Bulk action eligibility
const canBulkApproveAdmin = computed(() => 
  selectedEmployees.value.some(id => {
    const emp = payrollRunEmployees.value.find(e => e.employee_id === id)
    return emp?.status === 'draft'
  })
)

const canBulkApproveOwner = computed(() => 
  selectedEmployees.value.some(id => {
    const emp = payrollRunEmployees.value.find(e => e.employee_id === id)
    return emp?.status === 'approved_admin'
  })
)

const canBulkRelease = computed(() => 
  selectedEmployees.value.some(id => {
    const emp = payrollRunEmployees.value.find(e => e.employee_id === id)
    return emp?.status === 'approved_owner'
  })
)

// Methods
const selectRun = async (run) => {
  selectedRun.value = run
  currentPage.value = 1
  selectedEmployees.value = []
  selectAll.value = false
  await fetchPayrollRunEmployees(run.id)
}

const backToRuns = () => {
  selectedRun.value = null
  selectedEmployees.value = []
  selectAll.value = false
  currentPage.value = 1
}

const refreshData = () => {
  if (selectedRun.value) {
    fetchPayrollRunEmployees(selectedRun.value.id)
  } else {
    fetchPayrollRunsSummary()
  }
}

const toggleSelection = (employeeId) => {
  const index = selectedEmployees.value.indexOf(employeeId)
  if (index > -1) {
    selectedEmployees.value.splice(index, 1)
  } else {
    selectedEmployees.value.push(employeeId)
  }
  updateSelectAllState()
}

const toggleSelectAll = () => {
  if (selectAll.value) {
    // Select all actionable employees
    selectedEmployees.value = filteredEmployees.value
      .filter(e => isActionable(e))
      .map(e => e.employee_id)
  } else {
    selectedEmployees.value = []
  }
}

const updateSelectAllState = () => {
  const actionableCount = filteredEmployees.value.filter(e => isActionable(e)).length
  selectAll.value = actionableCount > 0 && actionableCount === selectedEmployees.value.length
}

const isActionable = (employee) => {
  return ['draft', 'approved_admin', 'approved_owner', 'funded'].includes(employee.status)
}

const clearSelection = () => {
  selectedEmployees.value = []
  selectAll.value = false
}

const employeeAction = async (employee, action) => {
  try {
    switch (action) {
      case 'approve_admin':
        await approveByAdmin(selectedRun.value.id, [employee.employee_id])
        $q.notify({ type: 'positive', message: `${employee.employee_name} approved by admin` })
        break
      case 'approve_owner':
        await approveByOwner(selectedRun.value.id, [employee.employee_id])
        $q.notify({ type: 'positive', message: `${employee.employee_name} approved by owner` })
        break
      case 'release':
        await releasePayslip(selectedRun.value.id, [employee.employee_id])
        $q.notify({ type: 'positive', message: `Payslip released for ${employee.employee_name}` })
        break
      case 'cash':
        await cashDisbursement(selectedRun.value.id, [employee.employee_id])
        $q.notify({ type: 'positive', message: `Cash disbursed to ${employee.employee_name}` })
        break
      case 'bank':
        await bankTransfer(selectedRun.value.id, [employee.employee_id])
        $q.notify({ type: 'positive', message: `Bank transfer for ${employee.employee_name}` })
        break
    }
    await fetchPayrollRunEmployees(selectedRun.value.id)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || 'Action failed' })
  }
}

const bulkAction = async (action) => {
  const runId = selectedRun.value.id
  const employeeIds = [...selectedEmployees.value]
  
  try {
    for (const empId of employeeIds) {
      switch (action) {
        case 'approve_admin':
          await approveByAdmin(runId, [empId])
          break
        case 'approve_owner':
          await approveByOwner(runId, [empId])
          break
        case 'release':
          await releasePayslip(runId, [empId])
          break
      }
    }
    $q.notify({ type: 'positive', message: `${employeeIds.length} employees processed` })
    selectedEmployees.value = []
    selectAll.value = false
    await fetchPayrollRunEmployees(runId)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || 'Bulk action failed' })
  }
}

const fundRun = async () => {
  try {
    await fundPayroll(selectedRun.value.id)
    $q.notify({ type: 'positive', message: 'Payroll funded successfully!' })
    await fetchPayrollRunEmployees(selectedRun.value.id)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || 'Funding failed' })
  }
}

// Helpers
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₱0.00'
  return '₱' + Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const getStageColor = (status) => {
  const colors = {
    draft: 'grey',
    admin_approved: 'blue',
    owner_approved: 'indigo',
    released: 'orange',
    acknowledged: 'teal',
    funded: 'purple',
    disbursed: 'green',
    completed: 'green',
  }
  return colors[status] || 'grey'
}

const getStageLabel = (stage) => {
  const labels = {
    draft: 'Draft',
    admin_approved: 'Admin Approved',
    owner_approved: 'Owner Approved',
    released: 'Released',
    acknowledged: 'Acknowledged',
    funded: 'Funded',
    disbursed: 'Disbursed',
    completed: 'Completed',
  }
  return labels[stage] || stage
}

const getStatusColor = (status) => {
  const colors = {
    draft: 'grey',
    approved_admin: 'blue',
    approved_owner: 'indigo',
    released: 'orange',
    acknowledged: 'teal',
    funded: 'purple',
    cash_disbursed: 'amber',
    bank_disbursed: 'blue',
    completed: 'green',
  }
  return colors[status] || 'grey'
}

const getStatusLabel = (status) => {
  const labels = {
    draft: 'Draft',
    approved_admin: 'Admin Approved',
    approved_owner: 'Owner Approved',
    released: 'Released',
    acknowledged: 'Acknowledged',
    funded: 'Funded',
    cash_disbursed: 'Cash Disbursed',
    bank_disbursed: 'Bank Transfer',
    completed: 'Completed',
  }
  return labels[status] || status
}

const exportToPDF = () => {
  $q.notify({ type: 'info', message: 'Export to PDF coming soon!' })
}

// Init
onMounted(() => {
  fetchPayrollRunsSummary()
})
</script>

<style scoped>
.payroll-dashboard {
  padding: 24px;
  min-height: 100vh;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-btn {
  color: #6b7280 !important;
}

.export-btn {
  height: 36px;
  border-radius: 8px;
  font-weight: 500;
}

/* Stats */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e8ecf0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-icon-blue { background: #eff6ff; color: #3b82f6; }
.stats-icon-amber { background: #fefce8; color: #ca8a04; }
.stats-icon-green { background: #f0fdf4; color: #22c55e; }
.stats-icon-purple { background: #f5f3ff; color: #8b5cf6; }

.stats-icon {
  font-size: 20px;
}

.stats-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stats-amount {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.stage-text {
  font-size: 16px;
}

/* Table Section */
.table-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
}

.table-title-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.table-title {
  font-size: 16px;
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
  padding: 12px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e8ecf0;
}

.table-body-row {
  border-bottom: 1px solid #f1f3f5;
}

.table-body-row:hover {
  background: #f9fafb;
}

.table-body-cell {
  padding: 12px 16px;
  color: #374151;
  font-size: 13px;
  vertical-align: middle;
}

.selected-row {
  background: #eff6ff !important;
}

/* Run Row Styling */
.run-row:hover {
  background: #f3f4f6;
  cursor: default;
}

/* Run Badge */
.run-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: #f5f3ff;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
}

.count-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: #eff6ff;
  color: #1d4ed8;
}

/* Employee Cell */
.employee-cell {
  min-width: 200px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-fallback {
  background: #e0e7ff !important;
  color: #4338ca !important;
  font-weight: 600;
  font-size: 12px;
}

.employee-details {
  display: flex;
  flex-direction: column;
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

/* Amount Cell */
.amount-cell {
  font-weight: 600;
  color: #111827;
  font-family: monospace;
}

/* Actions */
.actions-cell {
  text-align: center;
  width: 120px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.disbursement-buttons {
  display: flex;
  gap: 4px;
}

/* Employees Section */
.employees-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Run Info Card */
.run-info-card {
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  border: 1px solid #e8ecf0;
}

.run-info-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.run-info-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.run-info-id {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.run-info-name {
  font-size: 14px;
  color: #6b7280;
}

.run-info-stats {
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Bulk Actions */
.bulk-actions-bar {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.bulk-actions-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1d4ed8;
}

.bulk-actions-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-input {
  min-width: 200px;
}

/* Pagination */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid #f1f3f5;
  background: #f8fafc;
}

.pagination-info {
  font-size: 13px;
  color: #6b7280;
}

.pagination-controls {
  display: flex;
  gap: 4px;
}

/* Run Actions */
.run-actions {
  display: flex;
  justify-content: center;
  padding: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .payroll-dashboard {
    padding: 16px;
  }
  
  .table-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .bulk-actions-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .run-info-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filters-bar {
    flex-direction: column;
  }
  
  .filter-input {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .stats-section {
    grid-template-columns: 1fr;
  }
}
</style>
