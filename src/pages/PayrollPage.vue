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

      <!-- Payroll Runs Table -->
      <div class="table-section" style="margin-bottom: 16px">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Payroll Runs</h2>
            <div class="table-info">{{ payrollRunsSummary.length }} runs</div>
          </div>
          <q-btn
            flat
            round
            icon="refresh"
            class="header-btn"
            @click="fetchPayrollRunsSummary"
            :loading="loading"
          />
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="loading-state">
          <q-spinner color="primary" size="32px" />
        </div>

        <!-- Empty state -->
        <div v-else-if="!payrollRunsSummary.length" class="loading-state">
          <span class="text-grey-5">No payroll runs found</span>
        </div>

        <!-- One card per payroll run, with collapsible employees panel -->
        <div v-else class="runs-list">
          <div v-for="run in payrollRunsSummary" :key="run.id" class="run-card">
            <!-- Run header row - CLICKABLE to expand/collapse -->
            <div
              class="run-card-header"
              :class="{ expanded: selectedRun?.id === run.id }"
              @click="toggleRunExpanded(run)"
              style="cursor: pointer; user-select: none"
            >
              <div class="run-header-left">
                <q-icon
                  name="expand_more"
                  :style="{
                    transform: selectedRun?.id === run.id ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                  }"
                  size="20px"
                  class="expand-icon"
                />
                <div class="run-badge">#{{ run.id }}</div>
                <div class="run-name">{{ run.name }}</div>
                <q-badge :color="getStageColor(run.status)" :label="getStageLabel(run.status)" />
              </div>
              <div class="run-header-amounts">
                <div class="run-amount-item">
                  <span class="run-amount-label">Calculated</span>
                  <span class="run-amount-value">{{ formatCurrency(run.calculated_amount) }}</span>
                </div>
                <div class="run-amount-item">
                  <span class="run-amount-label">Final</span>
                  <span class="run-amount-value">{{ formatCurrency(run.final_amount) }}</span>
                </div>
              </div>
              <div class="run-header-action">
                <q-btn
                  v-if="run.status === 'owner_approved'"
                  unelevated
                  dense
                  no-caps
                  size="sm"
                  icon="send"
                  color="orange"
                  label="Release"
                  :loading="saving && selectedRun?.id === run.id"
                  @click.stop="selectAndApprove(run, 'release')"
                />
                <q-btn
                  v-else-if="run.status === 'released_for_review'"
                  unelevated
                  dense
                  no-caps
                  size="sm"
                  icon="account_balance"
                  color="purple"
                  label="Fund Payroll"
                  :loading="saving && selectedRun?.id === run.id"
                  @click.stop="selectAndApprove(run, 'fund')"
                />
                <q-icon
                  v-else-if="
                    ['partially_paid', 'payroll_funded', 'disbursed', 'completed'].includes(
                      run.status,
                    )
                  "
                  name="task_alt"
                  color="positive"
                  size="22px"
                >
                  <q-tooltip>{{ getStageLabel(run.status) }}</q-tooltip>
                </q-icon>
                <span v-else class="text-grey-5 text-caption">{{ getStageLabel(run.status) }}</span>
              </div>
            </div>

            <!-- Employees panel — only visible when run is expanded -->
            <div v-if="selectedRun?.id === run.id" class="employees-panel">
              <!-- Panel header / merged action toolbar -->
              <div class="employees-panel-header">
                <div class="employees-panel-title">
                  <q-icon name="people" size="16px" color="primary" />
                  <span>Employees</span>
                  <span class="employees-panel-count">{{
                    run.id === selectedRun?.id ? payrollRunEmployees.length : '—'
                  }}</span>
                  <span
                    v-if="selectedEmployees.length && run.id === selectedRun?.id"
                    class="employees-panel-selected"
                  >
                    · {{ selectedEmployees.length }} selected
                  </span>
                </div>
                <div class="employees-panel-actions">
                  <q-input
                    dense
                    outlined
                    v-model="employeeSearchQuery"
                    placeholder="Search employees..."
                    class="employee-search-input"
                    clearable
                    style="min-width: 180px"
                  >
                    <template v-slot:prepend><q-icon name="search" size="16px" /></template>
                  </q-input>
                  <q-checkbox
                    v-model="selectAll"
                    label="Select All"
                    dense
                    @update:model-value="toggleSelectAll"
                    :disable="
                      getActionableEmployees(workflowStage).length === 0 ||
                      ['released', 'acknowledged'].includes(workflowStage)
                    "
                    class="select-all-checkbox"
                  />
                  <!-- Approve Selected / Approve All (Dynamic) -->

                  <q-btn
                    v-if="
                      run.id === selectedRun?.id &&
                      workflowStage === 'draft' &&
                      selectedEmployees.length > 0
                    "
                    unelevated
                    dense
                    no-caps
                    size="sm"
                    icon="done"
                    color="primary"
                    :label="approveBtnLabel"
                    :loading="saving"
                    @click="approveAllByAdmin(run)"
                  />
                  <q-btn
                    v-else-if="
                      run.id === selectedRun?.id &&
                      workflowStage === 'admin_approved' &&
                      selectedEmployees.length > 0
                    "
                    unelevated
                    dense
                    no-caps
                    size="sm"
                    icon="done"
                    color="indigo"
                    :label="approveOwnerBtnLabel"
                    :loading="saving"
                    @click="approveAllByOwner(run)"
                  />
                  <q-btn
                    v-else-if="
                      run.id === selectedRun?.id &&
                      workflowStage === 'owner_approved' &&
                      selectedEmployees.length > 0
                    "
                    unelevated
                    dense
                    no-caps
                    size="sm"
                    icon="send"
                    color="orange"
                    :label="releaseBtnLabel"
                    :loading="saving"
                    @click="releaseAll(run)"
                  />
                </div>
              </div>

              <!-- Loading employees -->
              <div
                v-if="workflowLoading && run.id === selectedRun?.id"
                style="display: flex; align-items: center; gap: 10px; padding: 20px 24px"
              >
                <q-spinner color="primary" size="20px" />
                <span style="font-size: 13px; color: #6b7280">Loading employees...</span>
              </div>

              <!-- Unified Employees Table -->
              <table class="payroll-table employees-nested-table">
                <thead>
                  <tr class="table-header-row">
                    <th class="table-header-cell" style="width: 48px"></th>
                    <th class="table-header-cell">Employee</th>
                    <th class="table-header-cell">Status</th>
                    <th class="table-header-cell">Period</th>
                    <th class="table-header-cell">Run</th>
                    <th class="table-header-cell">Gross Pay</th>
                    <th class="table-header-cell">Net Pay</th>
                    <th class="table-header-cell">Total Hours</th>
                    <th class="table-header-cell" style="text-align: center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="run.id === selectedRun?.id">
                    <tr
                      v-for="emp in filteredEmployees"
                      :key="emp.employee_id || emp.payslip_id"
                      class="table-body-row"
                      :class="{
                        'selected-row': selectedEmployees.includes(emp.employee_id),
                        'failed-row': emp.lastError,
                      }"
                    >
                      <td class="table-body-cell text-center">
                        <!-- Auto-selected stages (released/acknowledged): show disabled checked checkbox with lock icon -->
                        <q-checkbox
                          v-if="isAutoSelectStage && isEmployeePreApproved(emp, workflowStage)"
                          :model-value="true"
                          disable
                          dense
                          checked-icon="lock"
                          color="positive"
                        >
                          <q-tooltip>Pre-approved and locked</q-tooltip>
                        </q-checkbox>

                        <!-- Normal actionable checkbox for draft/admin/owner/funded stages -->
                        <q-checkbox
                          v-else-if="isEmployeeActionable(emp)"
                          :model-value="selectedEmployees.includes(emp.employee_id)"
                          @update:model-value="toggleEmployeeSelection(emp.employee_id)"
                          dense
                        />

                        <!-- Completed/disbursement completed -->
                        <q-icon
                          v-else-if="
                            ['cash_disbursed', 'bank_disbursed', 'completed'].includes(emp.status)
                          "
                          name="task_alt"
                          color="positive"
                          size="20px"
                        />

                        <!-- Non-actionable -->
                        <span v-else class="text-grey-5">—</span>
                      </td>
                      <td class="table-body-cell employee-cell">
                        <div class="employee-info">
                          <q-avatar size="32px" class="avatar-fallback">{{
                            getInitials(emp.employee_name || emp.employee)
                          }}</q-avatar>
                          <div class="employee-details">
                            <div class="employee-name">{{ emp.employee_name || emp.employee }}</div>
                            <div class="employee-id">{{ emp.employee_id || 'N/A' }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="table-body-cell">
                        <q-badge
                          :color="getStatusColor(emp.status)"
                          :label="getStatusLabel(emp.status)"
                        />
                        <q-tooltip v-if="emp.lastError" class="bg-negative">{{
                          emp.lastError
                        }}</q-tooltip>
                      </td>
                      <td class="table-body-cell">
                        <div class="period-badge">{{ emp.period || run.name || '—' }}</div>
                      </td>
                      <td class="table-body-cell">
                        <div class="run-badge">#{{ run.id }}</div>
                      </td>
                      <td class="table-body-cell amount-cell">
                        <div class="amount-display">{{ formatCurrency(emp.gross_pay) }}</div>
                        <div class="amount-progress">
                          <div
                            class="amount-bar gross-bar"
                            :style="{ width: getPayPercentage(emp.gross_pay, maxGrossPay) + '%' }"
                          ></div>
                        </div>
                      </td>
                      <td class="table-body-cell amount-cell">
                        <div class="amount-display">{{ formatCurrency(emp.net_pay) }}</div>
                        <div class="amount-progress">
                          <div
                            class="amount-bar net-bar"
                            :style="{ width: getPayPercentage(emp.net_pay, maxNetPay) + '%' }"
                          ></div>
                        </div>
                      </td>
                      <td class="table-body-cell">
                        <div class="hours-badge">
                          {{ emp.breakdown?.attendance?.total_hours_worked || 0 }}h
                        </div>
                      </td>
                      <td class="table-body-cell actions-cell">
                        <div class="workflow-actions-cell">
                          <q-btn
                            v-if="emp.lastError"
                            flat
                            dense
                            icon="refresh"
                            color="negative"
                            size="sm"
                            @click="retryEmployeeAction(emp)"
                            round
                            ><q-tooltip>Retry</q-tooltip></q-btn
                          >
                          <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                            <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                              <q-list dense style="min-width: 180px">
                                <!-- Workflow action item — shown based on employee status -->
                                <q-item
                                  v-if="emp.status === 'draft'"
                                  clickable
                                  v-close-popup
                                  @click="handleWorkflowAction(emp, 'approve_admin')"
                                  class="dropdown-item"
                                >
                                  <q-item-section avatar
                                    ><q-icon name="verified_user" size="16px" color="primary"
                                  /></q-item-section>
                                  <q-item-section>Approve (Admin)</q-item-section>
                                </q-item>
                                <q-item
                                  v-else-if="emp.status === 'approved_admin'"
                                  clickable
                                  v-close-popup
                                  @click="handleWorkflowAction(emp, 'approve_owner')"
                                  class="dropdown-item"
                                >
                                  <q-item-section avatar
                                    ><q-icon name="admin_panel_settings" size="16px" color="indigo"
                                  /></q-item-section>
                                  <q-item-section>Approve (Owner)</q-item-section>
                                </q-item>
                                <q-item
                                  v-else-if="emp.status === 'approved_owner'"
                                  clickable
                                  v-close-popup
                                  @click="handleWorkflowAction(emp, 'release')"
                                  class="dropdown-item"
                                >
                                  <q-item-section avatar
                                    ><q-icon name="send" size="16px" color="orange"
                                  /></q-item-section>
                                  <q-item-section>Release</q-item-section>
                                </q-item>
                                <q-item
                                  v-if="emp.status === 'payroll_funded'"
                                  clickable
                                  v-close-popup
                                  @click="handleWorkflowAction(emp, 'cash')"
                                  class="dropdown-item"
                                >
                                  <q-item-section avatar
                                    ><q-icon name="payments" size="16px" color="amber-8"
                                  /></q-item-section>
                                  <q-item-section>Cash Disbursement</q-item-section>
                                </q-item>
                                <q-item
                                  v-if="emp.status === 'payroll_funded'"
                                  clickable
                                  v-close-popup
                                  @click="handleWorkflowAction(emp, 'bank')"
                                  class="dropdown-item"
                                >
                                  <q-item-section avatar
                                    ><q-icon name="account_balance" size="16px" color="blue"
                                  /></q-item-section>
                                  <q-item-section>Bank Transfer</q-item-section>
                                </q-item>

                                <q-separator
                                  v-if="
                                    ![
                                      'released',
                                      'pending_review',
                                      'disbursed',
                                      'cash_disbursed',
                                      'bank_disbursed',
                                      'completed',
                                    ].includes(emp.status)
                                  "
                                  spaced
                                />

                                <q-item
                                  clickable
                                  v-close-popup
                                  @click="viewDetails(emp)"
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
                                  @click="downloadPayslip(emp)"
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
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!filteredEmployees.length && !workflowLoading">
                      <td colspan="9" class="table-body-cell text-center text-grey-5">
                        No employees found
                      </td>
                    </tr>
                  </template>
                  <tr v-else>
                    <td
                      colspan="9"
                      class="table-body-cell text-center"
                      @click="loadRunEmployees(run)"
                      style="cursor: pointer; color: #3b82f6; font-size: 13px"
                    >
                      <q-icon name="refresh" size="14px" /> Click to load employees
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================== DETAIL MODAL ======================== -->
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
          <q-btn flat label="Close" @click="closeDetailModal" class="dialog-btn" no-caps />
          <q-btn
            color="primary"
            label="Download Payslip"
            @click="downloadPayslip(selectedRecord)"
            class="dialog-btn primary-btn"
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useQuasar } from 'quasar'
import { usePayroll } from 'src/composables/page/usePayroll'

const $q = useQuasar()
const {
  payrollRunsSummary,
  fetchPayrollRunsSummary,
  payrollRunId,
  workflowStage,
  payrollRunEmployees,
  workflowLoading,
  approveByAdmin,
  approveByOwner,
  releasePayslip,
  fundPayroll,
  cashDisbursement,
  bankTransfer,
  fetchPayrollRunEmployees,
  getActionableEmployees,
  isStageAutoSelectable,
  isEmployeePreApproved,
} = usePayroll()

onMounted(async () => {
  await fetchPayrollRunsSummary()
  if (payrollRunsSummary.value.length > 0) {
    await loadRunEmployees(payrollRunsSummary.value[0])
  }
  fetchPayrollData()
})

// Inline run selection state
const selectedRun = ref(null)
const saving = ref(false)

const loadRunEmployees = async (run) => {
  if (selectedRun.value && selectedRun.value.id === run.id) return
  selectedRun.value = run
  payrollRunId.value = run.id
  selectedEmployees.value = []
  selectAll.value = false
  await fetchPayrollRunEmployees(run.id)
  selectedRunForData.value = run.id
  // Don't call fetchPayrollData() - it causes unnecessary refresh
}

// Toggle run expansion - click header to expand/collapse
const toggleRunExpanded = async (run) => {
  if (selectedRun.value?.id === run.id) {
    // Collapse if already expanded
    selectedRun.value = null
  } else {
    // Expand and load only this run's employees (no full table refresh)
    selectedRun.value = run
    payrollRunId.value = run.id
    selectedEmployees.value = []
    selectAll.value = false
    await fetchPayrollRunEmployees(run.id)
    selectedRunForData.value = run.id
  }
}

// Action button in the Payroll Runs table row
const selectAndApprove = async (run, action) => {
  selectedRun.value = run
  payrollRunId.value = run.id
  await fetchPayrollRunEmployees(run.id)
  if (action === 'fund') {
    await handleFundPayroll()
  } else {
    await handleBulkAction(action)
  }
  await fetchPayrollRunsSummary()
}

const employeeSearchQuery = ref('')

const filteredEmployees = computed(() => {
  const q = employeeSearchQuery.value?.toLowerCase() || ''
  if (!q) return payrollRunEmployees.value
  return payrollRunEmployees.value.filter(
    (e) =>
      (e.employee_name || e.employee || '').toLowerCase().includes(q) ||
      (e.employee_id || '').toString().toLowerCase().includes(q),
  )
})

const approveAllByAdmin = async (run) => {
  selectedRun.value = run
  payrollRunId.value = run.id
  await fetchPayrollRunEmployees(run.id)
  await handleBulkAction('approve_admin')
  await fetchPayrollRunsSummary()
}

const approveAllByOwner = async (run) => {
  selectedRun.value = run
  payrollRunId.value = run.id
  await fetchPayrollRunEmployees(run.id)
  await handleBulkAction('approve_owner')
  await fetchPayrollRunsSummary()
}

const releaseAll = async (run) => {
  selectedRun.value = run
  payrollRunId.value = run.id
  await fetchPayrollRunEmployees(run.id)
  await handleBulkAction('release')
  await fetchPayrollRunsSummary()
}

// Selection state for bulk operations
const selectedEmployees = ref([])
const selectAll = ref(false)

// Auto-selection state for released+ stages
const isAutoSelectStage = computed(() => {
  return isStageAutoSelectable(workflowStage.value)
})

// Computed properties for dynamic approve button labels
const isAllSelected = computed(() => {
  const actionableCount = getActionableEmployees(workflowStage.value).length
  return actionableCount > 0 && selectedEmployees.value.length === actionableCount
})

const approveBtnLabel = computed(() => {
  if (selectedEmployees.value.length === 0) {
    return null // No button shown if no selection
  }
  return isAllSelected.value ? 'Approve All (Admin)' : 'Approve'
})

const approveOwnerBtnLabel = computed(() => {
  if (selectedEmployees.value.length === 0) {
    return null // No button shown if no selection
  }
  return isAllSelected.value ? 'Approve All (Owner)' : 'Approve'
})

const releaseBtnLabel = computed(() => {
  if (selectedEmployees.value.length === 0) {
    return null // No button shown if no selection
  }
  return isAllSelected.value ? 'Release All' : 'Release'
})

// Data
const payrollData = ref([])
const loading = ref(false)
const error = ref(null)

const selectedRunForData = ref(null)

// Detail modal
const showDetailModal = ref(false)
const selectedRecord = ref(null)

const fetchPayrollData = async () => {
  const runId = selectedRunForData.value ?? null
  if (!runId) {
    payrollData.value = []
    return
  }
  loading.value = true
  error.value = null
  try {
    const employees = await fetchPayrollRunEmployees(runId)
    if (!employees || employees.length === 0) {
      payrollData.value = []
      return
    }
    payrollData.value = employees.map((r, i) => ({
      id: r.payslip_id ?? `payroll-${i}`,
      employee: r.employee_name ?? 'Unknown',
      employee_id: r.employee_id ?? null,
      period: r.period ?? null,
      run: runId,
      gross_pay: Number(r.gross_pay ?? 0),
      total_deductions: Number(r.total_deductions ?? 0),
      net_pay: Number(r.net_pay ?? 0),
      status: r.status ?? 'draft',
    }))
  } catch (err) {
    error.value = err?.response?.data?.message ?? err?.message ?? 'Failed to fetch payroll data'
    $q.notify({ type: 'negative', message: error.value, position: 'top', timeout: 5000 })
  } finally {
    loading.value = false
  }
}

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

const formatCurrency = (val) => {
  const n = Number(val ?? 0)
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Employee', 'Period', 'Run', 'Gross Pay', 'Net Pay', 'Hours']],
    body: arr.map((r, i) => [
      i + 1,
      r.employee ?? 'N/A',
      r.period ?? '-',
      `#${r.run ?? ''}`,
      formatCurrency(r.gross_pay),
      formatCurrency(r.net_pay),
      `${r.breakdown?.attendance?.total_hours_worked ?? 0}h`,
    ]),
  })
  doc.save(`Payroll_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  $q.notify({ type: 'positive', message: 'Payroll exported as PDF!' })
}

const downloadPayslip = (record) => {
  const rec = record ?? selectedRecord.value
  if (!rec) {
    $q.notify({ type: 'negative', message: 'No record selected to download' })
    return
  }

  // ─── Resolve fields from either the table row shape or the modal shape ───
  const employeeName = rec.employee_name ?? rec.employee ?? 'N/A'
  const employeeId = rec.employee_id ?? 'N/A'
  const position = rec.position ?? rec.job_title ?? '—'
  const employmentType = rec.employment_type ?? '—'
  const empStatus = rec.employment_status ?? '—'
  const runName = rec.period ?? selectedRun.value?.name ?? '—'
  const fmtDate = (d) => {
    if (!d || d === '—') return '—'
    try {
      return new Date(d).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return d
    }
  }
  const payDate = fmtDate(rec.pay_date ?? rec.released_at)
  const payslipNo = rec.payslip_no ?? `PS-${rec.payslip_id ?? rec.id ?? ''}`

  // Employer / company info — pulled exclusively from API data, never from Wagey defaults
  const companyName = selectedRun.value?.company_name ?? rec.company_name ?? ''
  const companyAddress = selectedRun.value?.company_address ?? rec.company_address ?? ''
  const companyTin = selectedRun.value?.company_tin ?? rec.company_tin ?? ''

  // Work summary
  const bd = rec.breakdown ?? {}
  const att = bd.attendance ?? {}
  const daysWorked = att.days_worked ?? rec.days_worked ?? '—'
  const daysAbsent = att.days_absent ?? rec.days_absent ?? 0
  const vlUsed = att.vacation_leave ?? rec.vacation_leave ?? 0
  const slUsed = att.sick_leave ?? rec.sick_leave ?? 0
  const totalHoursW = att.total_hours_worked ?? rec.total_hours_worked ?? 0
  const otHours = att.overtime_hours ?? rec.overtime_hours ?? 0
  const ndHours = att.night_diff_hours ?? rec.night_diff_hours ?? 0
  const restDays = att.rest_days_worked ?? rec.rest_days_worked ?? 0
  const holidayDays = att.holidays_worked ?? rec.holidays_worked ?? 0

  // Rate basis
  const monthlyRate = Number(rec.monthly_rate ?? rec.rate ?? 0)
  const dailyRate = Number(rec.daily_rate ?? (monthlyRate ? monthlyRate / 22 : 0))
  const hourlyRate = Number(rec.hourly_rate ?? (dailyRate ? dailyRate / 8 : 0))

  // Earnings
  const basicPay = Number(rec.basic_pay ?? rec.gross_pay ?? 0)
  const earnings = Array.isArray(rec.earnings) ? rec.earnings : []

  // Separate earning categories
  const premiumItems = earnings.filter((e) =>
    ['overtime', 'night_differential', 'holiday', 'rest_day'].includes(e.type),
  )
  const allowances = earnings.filter((e) => e.type === 'allowance')
  const incentives = earnings.filter((e) => e.type === 'incentive')
  const adjAdditions = earnings.filter((e) => e.type === 'adjustment_add')

  // Fall back to top-level fields if earnings array is empty
  const overtimePay =
    premiumItems.find((e) => e.type === 'overtime')?.amount ?? Number(rec.overtime_pay ?? 0)
  const nightDiffPay =
    premiumItems.find((e) => e.type === 'night_differential')?.amount ??
    Number(rec.night_diff_pay ?? 0)
  const holidayPay =
    premiumItems.find((e) => e.type === 'holiday')?.amount ?? Number(rec.holiday_pay ?? 0)
  const grossPay = Number(rec.gross_pay ?? 0)

  // Deductions
  const deductions = Array.isArray(rec.deductions) ? rec.deductions : []
  const withholdingTax = Number(
    rec.withholding_tax ?? deductions.find((d) => d.type === 'withholding_tax')?.amount ?? 0,
  )
  const sssContrib = Number(rec.sss ?? deductions.find((d) => d.type === 'sss')?.amount ?? 0)
  const philhealth = Number(
    rec.philhealth ?? deductions.find((d) => d.type === 'philhealth')?.amount ?? 0,
  )
  const pagibig = Number(rec.pagibig ?? deductions.find((d) => d.type === 'pagibig')?.amount ?? 0)
  const sssLoan = Number(rec.sss_loan ?? deductions.find((d) => d.type === 'sss_loan')?.amount ?? 0)
  const pagibigLoan = Number(
    rec.pagibig_loan ?? deductions.find((d) => d.type === 'pagibig_loan')?.amount ?? 0,
  )
  const cashAdvance = Number(
    rec.cash_advance ?? deductions.find((d) => d.type === 'cash_advance')?.amount ?? 0,
  )
  const companyLoan = Number(
    rec.company_loan ?? deductions.find((d) => d.type === 'company_loan')?.amount ?? 0,
  )
  const absenceDeduct = Number(
    rec.absence_deduction ??
      deductions.find((d) => d.type === 'absence')?.amount ??
      (daysAbsent > 0 ? dailyRate * daysAbsent : 0),
  )
  const lateDeduct = Number(
    rec.late_deduction ?? deductions.find((d) => d.type === 'late')?.amount ?? 0,
  )
  const totalDeductions = Number(rec.total_deductions ?? grossPay - Number(rec.net_pay ?? 0))
  const netPay = Number(rec.net_pay ?? 0)

  // Payment / loan / 13th month
  const paymentMethod = rec.payment_method ?? rec.disbursement_type ?? '—'
  const paymentStatus = rec.status ?? '—'
  const dateReleased = fmtDate(rec.released_at ?? rec.pay_date)
  const loans = Array.isArray(rec.loans)
    ? rec.loans
    : companyLoan
      ? [
          {
            type: 'Company Loan',
            total: rec.total_loan_amount ?? 0,
            deduction: companyLoan,
            balance: rec.loan_balance ?? 0,
          },
        ]
      : []
  const thirteenthAccrual = Number(rec.thirteenth_month_accrual ?? rec.month_accrual ?? 0)
  const thirteenthYtd = Number(rec.thirteenth_month_ytd ?? rec.ytd_accrual ?? 0)

  // ─── PDF construction ────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const PW = 210 // page width mm
  const ML = 15 // margin left
  const MR = 193 // margin right — 15mm from right edge keeps amounts inside printable area
  let y = 14

  // ── Helpers ──
  // ₱ is unsupported by jsPDF built-in Helvetica; use "PHP" prefix for PDF output
  const fc = (v) => {
    const n = Number(v ?? 0)
    return (
      'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  }
  const line = (x1, yy, x2) => {
    doc.setDrawColor(200, 200, 200)
    doc.line(x1, yy, x2, yy)
  }
  const sectionTitle = (title, yy) => {
    doc.setFillColor(240, 244, 255)
    doc.rect(ML, yy - 4.5, MR - ML, 6.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(50, 60, 120)
    doc.text(title.toUpperCase(), ML + 2, yy)
    doc.setTextColor(30, 30, 30)
    return yy + 5
  }
  const dotRow = (label, val, yy, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(80, 80, 80)
    doc.text(label, ML + 2, yy)
    // dotted leader
    doc.setTextColor(180, 180, 180)
    const dotStart = ML + 2 + doc.getTextWidth(label) + 1
    const dotEnd = MR - doc.getTextWidth(val) - 1
    if (dotEnd > dotStart) {
      let dx = dotStart
      while (dx < dotEnd) {
        doc.text('.', dx, yy)
        dx += 1.6
      }
    }
    doc.setTextColor(bold ? 20 : 40, bold ? 20 : 40, bold ? 20 : 40)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(val, MR, yy, { align: 'right' })
    return yy + 5.2
  }
  const kv = (label, val, yy) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 100, 100)
    doc.text(label + ':', ML + 2, yy)
    doc.setTextColor(20, 20, 20)
    doc.setFont('helvetica', 'bold')
    doc.text(String(val), ML + 45, yy)
    doc.setFont('helvetica', 'normal')
    return yy + 5
  }

  // ══════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════
  doc.setFillColor(37, 56, 120)
  doc.rect(0, 0, PW, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('OFFICIAL PAYSLIP', PW / 2, 9, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (companyName) doc.text(companyName, PW / 2, 15, { align: 'center' })
  if (companyAddress) doc.text(companyAddress, PW / 2, 19, { align: 'center' })
  y = 28

  // Company meta row
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  if (companyTin) {
    doc.text(`TIN: ${companyTin}`, ML, y)
  }
  doc.text(`Payslip No.: ${payslipNo}`, MR, y, { align: 'right' })
  y += 5
  doc.text(`Payroll Period: ${runName}`, ML, y)
  doc.text(`Pay Date: ${payDate}`, MR, y, { align: 'right' })
  y += 3
  line(ML, y, MR)
  y += 5

  // ══════════════════════════════════════════════
  // EMPLOYEE INFORMATION
  // ══════════════════════════════════════════════
  y = sectionTitle('Employee Information', y)
  y += 1
  y = kv('Full Name', employeeName, y)
  y = kv('Employee ID', employeeId, y)
  y = kv('Position', position, y)
  y = kv('Employment Type', employmentType, y)
  y = kv('Status', empStatus, y)
  y += 2
  line(ML, y, MR)
  y += 5

  // ══════════════════════════════════════════════
  // WORK SUMMARY
  // ══════════════════════════════════════════════
  y = sectionTitle('Work Summary', y)
  y += 1
  const workRows = [
    ['Days Worked', String(daysWorked)],
    ['Days Absent', String(daysAbsent)],
    ['Vacation Leave (VL)', String(vlUsed)],
    ['Sick Leave (SL)', String(slUsed)],
    ['Total Hours Worked', `${totalHoursW}h`],
    ['Overtime Hours', `${otHours}h`],
    ['Night Differential Hrs', `${ndHours}h`],
    ['Rest Days Worked', String(restDays)],
    ['Holidays Worked', String(holidayDays)],
  ]
  workRows.forEach(([l, v]) => {
    y = dotRow(l, v, y)
  })
  y += 2
  line(ML, y, MR)
  y += 5

  // ══════════════════════════════════════════════
  // RATE BASIS  (only shown when rates are available)
  // ══════════════════════════════════════════════
  if (monthlyRate > 0 || dailyRate > 0 || hourlyRate > 0) {
    y = sectionTitle('Rate Basis', y)
    y += 1
    if (monthlyRate > 0) y = dotRow('Monthly Rate', fc(monthlyRate), y)
    if (dailyRate > 0) y = dotRow('Daily Rate', fc(dailyRate), y)
    if (hourlyRate > 0) y = dotRow('Hourly Rate', fc(hourlyRate), y)
    y += 2
    line(ML, y, MR)
    y += 5
  }

  // ══════════════════════════════════════════════
  // EARNINGS
  // ══════════════════════════════════════════════
  y = sectionTitle('Earnings', y)
  y += 1
  y = dotRow('Basic Pay', fc(basicPay), y)

  // Premium Pay
  const hasPremium =
    overtimePay > 0 || nightDiffPay > 0 || holidayPay > 0 || premiumItems.length > 0
  if (hasPremium) {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Premium Pay', ML + 2, y)
    y += 4.5
    if (overtimePay > 0) y = dotRow('Overtime Pay', fc(overtimePay), y, false)
    if (nightDiffPay > 0) y = dotRow('Night Differential Pay', fc(nightDiffPay), y, false)
    if (holidayPay > 0) y = dotRow('Holiday Pay', fc(holidayPay), y, false)
    premiumItems
      .filter((e) => !['overtime', 'night_differential', 'holiday'].includes(e.type))
      .forEach((e) => {
        y = dotRow(e.label ?? e.type, fc(e.amount), y, false)
      })
  }

  // Allowances
  if (allowances.length > 0) {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Allowances', ML + 2, y)
    y += 4.5
    allowances.forEach((a) => {
      y = dotRow(a.label ?? a.type, fc(a.amount), y)
    })
  }

  // Incentives
  if (incentives.length > 0) {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Incentives', ML + 2, y)
    y += 4.5
    incentives.forEach((a) => {
      y = dotRow(a.label ?? a.type, fc(a.amount), y)
    })
  }

  // Adjustments (additions)
  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Adjustments (Additions)', ML + 2, y)
  y += 4.5
  if (adjAdditions.length > 0) {
    adjAdditions.forEach((a) => {
      y = dotRow(a.label ?? a.type, fc(a.amount), y)
    })
  } else {
    y = dotRow('—', fc(0), y)
  }

  // Gross Pay total bar
  doc.setFillColor(37, 56, 120)
  doc.rect(ML, y - 1, MR - ML, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('GROSS PAY', ML + 3, y + 4)
  doc.text(fc(grossPay), MR - 2, y + 4, { align: 'right' })
  y += 11
  doc.setTextColor(30, 30, 30)

  // ══════════════════════════════════════════════
  // DEDUCTIONS
  // ══════════════════════════════════════════════
  y = sectionTitle('Deductions', y)
  y += 1

  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Government Contributions', ML + 2, y)
  y += 4.5
  if (withholdingTax > 0) y = dotRow('Withholding Tax', fc(withholdingTax), y)
  if (sssContrib > 0) y = dotRow('SSS Contribution', fc(sssContrib), y)
  if (philhealth > 0) y = dotRow('PhilHealth', fc(philhealth), y)
  if (pagibig > 0) y = dotRow('Pag-IBIG', fc(pagibig), y)

  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Government Loans', ML + 2, y)
  y += 4.5
  y = dotRow('SSS Loan', fc(sssLoan), y)
  y = dotRow('Pag-IBIG Loan', fc(pagibigLoan), y)

  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Company Deductions', ML + 2, y)
  y += 4.5
  if (cashAdvance > 0) y = dotRow('Cash Advance', fc(cashAdvance), y)
  if (companyLoan > 0) y = dotRow('Company Loan', fc(companyLoan), y)

  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Attendance Deductions', ML + 2, y)
  y += 4.5
  y = dotRow(`Absence (${daysAbsent} day${daysAbsent !== 1 ? 's' : ''})`, fc(absenceDeduct), y)
  y = dotRow('Late / Undertime', fc(lateDeduct), y)

  // Other deductions from array
  const otherDeductions = deductions.filter(
    (d) =>
      ![
        'withholding_tax',
        'sss',
        'philhealth',
        'pagibig',
        'sss_loan',
        'pagibig_loan',
        'cash_advance',
        'company_loan',
        'absence',
        'late',
      ].includes(d.type),
  )
  if (otherDeductions.length > 0) {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Other Deductions', ML + 2, y)
    y += 4.5
    otherDeductions.forEach((d) => {
      y = dotRow(d.label ?? d.type, fc(d.amount), y)
    })
  } else {
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Other Deductions', ML + 2, y)
    y += 4.5
    y = dotRow('—', fc(0), y)
  }

  // Total Deductions bar
  doc.setFillColor(180, 30, 30)
  doc.rect(ML, y - 1, MR - ML, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL DEDUCTIONS', ML + 3, y + 4)
  doc.text(fc(totalDeductions), MR - 2, y + 4, { align: 'right' })
  y += 10
  doc.setTextColor(30, 30, 30)

  // ══════════════════════════════════════════════
  // NET PAY
  // ══════════════════════════════════════════════
  doc.setFillColor(22, 101, 52)
  doc.rect(ML, y, MR - ML, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('NET PAY', ML + 4, y + 8)
  doc.setFontSize(13)
  doc.text(fc(netPay), MR - 2, y + 8, { align: 'right' })
  y += 17
  doc.setTextColor(30, 30, 30)

  // ══════════════════════════════════════════════
  // Check for new page before optional sections
  // ══════════════════════════════════════════════
  const checkPage = (needed) => {
    if (y + needed > 280) {
      doc.addPage()
      y = 14
    }
  }

  // ── PAYMENT DETAILS ──
  checkPage(30)
  y = sectionTitle('Payment Details', y)
  y += 1
  y = kv('Payment Method', paymentMethod, y)
  y = kv('Status', paymentStatus, y)
  y = kv('Date Released', dateReleased, y)
  y += 2
  line(ML, y, MR)
  y += 5

  // ── LOAN DISCLOSURE ──
  if (loans.length > 0) {
    checkPage(30)
    y = sectionTitle('Loan Disclosure', y)
    y += 1
    loans.forEach((loan) => {
      y = kv('Loan Type', loan.type ?? '—', y)
      y = kv('Total Loan Amount', fc(loan.total ?? 0), y)
      y = kv('Deduction This Period', fc(loan.deduction ?? 0), y)
      y = kv('Remaining Balance', fc(loan.balance ?? 0), y)
      y += 2
    })
    line(ML, y, MR)
    y += 5
  }

  // ── 13TH MONTH TRACKING ──
  if (thirteenthAccrual > 0 || thirteenthYtd > 0) {
    checkPage(20)
    y = sectionTitle('13th Month Tracking', y)
    y += 1
    y = kv('This Period Accrual', fc(thirteenthAccrual), y)
    y = kv('Year-to-Date Accrual', fc(thirteenthYtd), y)
    y += 2
    line(ML, y, MR)
    y += 5
  }

  // ── CERTIFICATION ──
  checkPage(30)
  y = sectionTitle('Certification', y)
  y += 3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(60, 60, 60)
  doc.text('I acknowledge receipt of the amount stated above.', ML + 2, y)
  y += 10
  doc.line(ML + 2, y, ML + 70, y)
  doc.text('Employee Signature', ML + 2, y + 4)
  doc.line(MR - 68, y, MR, y)
  doc.text('Date', MR - 12, y + 4)
  y += 12

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(`Page ${i} of ${pageCount}`, PW / 2, 292, { align: 'center' })
    doc.text('This is a system-generated payslip.', PW / 2, 296, { align: 'center' })
  }

  // ── Save ──
  const safeName = employeeName.replace(/\s+/g, '_')
  doc.save(`Payslip_${safeName}_${runName.replace(/\s+/g, '_')}.pdf`)
  $q.notify({ type: 'positive', message: `Payslip downloaded for ${employeeName}` })
}

const viewDetails = (record) => {
  // Normalize emp fields from the nested table to the modal format
  selectedRecord.value = {
    employee: record.employee_name || record.employee,
    employee_id: record.employee_id,
    period: record.period,
    run: record.run ?? selectedRun.value?.id,
    gross_pay: record.gross_pay,
    net_pay: record.net_pay,
    breakdown: record.breakdown,
  }
  showDetailModal.value = true
}
const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
}

const toggleSelectAll = () => {
  const actionable = getActionableEmployees(workflowStage.value)

  if (isAutoSelectStage.value) {
    // In auto-select stages (released/acknowledged/funded), handle specially
    if (workflowStage.value === 'funded') {
      // For funded stage, only select funded employees (for disbursement)
      selectedEmployees.value = selectAll.value ? actionable.map((e) => e.employee_id) : []
    } else {
      // For released/acknowledged stages, all are auto-selected
      // Clear selection as these stages don't support bulk actions
      selectedEmployees.value = []
    }
  } else {
    // Normal behavior for draft/admin_approved/owner_approved stages
    if (selectAll.value) {
      selectedEmployees.value = actionable.map((e) => e.employee_id)
    } else {
      selectedEmployees.value = []
    }
  }
}

const toggleEmployeeSelection = (employeeId) => {
  const index = selectedEmployees.value.indexOf(employeeId)
  if (index > -1) {
    selectedEmployees.value.splice(index, 1)
    selectAll.value = false
  } else {
    selectedEmployees.value.push(employeeId)
    const actionableIds = getActionableEmployees(workflowStage.value).map((e) => e.employee_id)
    selectAll.value = actionableIds.every((id) => selectedEmployees.value.includes(id))
  }
}

const isEmployeeActionable = (emp) => {
  const stage = workflowStage.value

  // Auto-select stages: show all employees as "actionable" (for visual checkboxes)
  // They will be shown as disabled/pre-selected
  if (['released', 'acknowledged'].includes(stage)) {
    return [
      'released',
      'acknowledged',
      'funded',
      'cash_disbursed',
      'bank_disbursed',
      'completed',
    ].includes(emp.status)
  }

  switch (stage) {
    case 'draft':
      return emp.status === 'draft'
    case 'admin_approved':
      return emp.status === 'approved_admin'
    case 'owner_approved':
      return emp.status === 'approved_owner'
    case 'funded':
      return emp.status === 'funded'
    default:
      return false
  }
}

const workflowSteps = [
  { key: 'computed', label: 'Computed', icon: 'edit' },
  { key: 'admin_reviewed', label: 'Admin Reviewed', icon: 'verified_user' },
  { key: 'owner_approved', label: 'Owner Approved', icon: 'admin_panel_settings' },
  { key: 'released_for_review', label: 'Released for Review', icon: 'send' },
  { key: 'partially_paid', label: 'Partially Paid', icon: 'hourglass_top' },
  { key: 'payroll_funded', label: 'Payroll Funded', icon: 'account_balance' },
  { key: 'disbursed', label: 'Disbursed', icon: 'payments' },
  { key: 'completed', label: 'Completed', icon: 'task_alt' },
]

const handleWorkflowAction = async (employee, action) => {
  const runId = payrollRunId.value
  if (!runId) {
    $q.notify({ type: 'warning', message: 'Please select a payroll run first' })
    return
  }
  const employeeId = employee.employee_id || employee.id
  try {
    saving.value = true
    if (action === 'bank') {
      saving.value = false
      $q.dialog({
        title: 'Bank Transfer',
        message: 'Enter payment reference number:',
        prompt: {
          model: '',
          type: 'text',
          placeholder: 'e.g. BTR-2026-001',
          isValid: (val) => val && val.trim().length > 0,
        },
        ok: { label: 'Transfer', color: 'primary', unelevated: true },
        cancel: { label: 'Cancel', flat: true },
      }).onOk(async (paymentReference) => {
        try {
          saving.value = true
          await bankTransfer(runId, [employeeId], paymentReference.trim())
          $q.notify({
            type: 'positive',
            message: `Bank transfer done: ${employee.employee_name || employee.employee}`,
          })
          await fetchPayrollRunEmployees(runId)
          await fetchPayrollRunsSummary()
          selectedEmployees.value = []
          selectAll.value = false
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: err.response?.data?.message || 'Bank transfer failed',
          })
        } finally {
          saving.value = false
        }
      })
      return
    }

    switch (action) {
      case 'approve_admin':
        await approveByAdmin(runId, [employeeId])
        break
      case 'approve_owner':
        await approveByOwner(runId, [employeeId])
        break
      case 'release':
        await releasePayslip(runId, [employeeId])
        break
      case 'cash':
        await cashDisbursement(runId, [employeeId])
        break
    }
    $q.notify({
      type: 'positive',
      message: `Success: ${employee.employee_name || employee.employee}`,
    })
    await fetchPayrollRunEmployees(runId)
    await fetchPayrollRunsSummary()
    selectedEmployees.value = []
    selectAll.value = false
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Action failed' })
  } finally {
    saving.value = false
  }
}

const handleBulkAction = async (action) => {
  const runId = payrollRunId.value
  if (!runId) {
    $q.notify({ type: 'warning', message: 'Please select a payroll run first' })
    return
  }
  let employeeIds =
    selectedEmployees.value.length > 0
      ? selectedEmployees.value
      : getActionableEmployees(workflowStage.value).map((e) => e.employee_id)
  if (employeeIds.length === 0) {
    $q.notify({ type: 'info', message: 'No employees to process' })
    return
  }
  $q.dialog({
    title: 'Confirm Bulk Action',
    message: `Process ${action} for ${employeeIds.length} employee(s)?`,
    ok: { label: 'Confirm', color: 'primary', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    saving.value = true
    let successCount = 0
    let failCount = 0
    for (const empId of employeeIds) {
      try {
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
        successCount++
      } catch {
        failCount++
      }
    }
    saving.value = false
    if (failCount > 0) {
      $q.notify({
        type: 'warning',
        message: `${successCount} succeeded, ${failCount} failed`,
        timeout: 5000,
      })
    } else {
      $q.notify({ type: 'positive', message: `Completed: ${successCount} employees processed!` })
    }
    await fetchPayrollRunEmployees(runId)
    await fetchPayrollRunsSummary()
    selectedEmployees.value = []
    selectAll.value = false
  })
}

const handleFundPayroll = async () => {
  const runId = payrollRunId.value
  if (!runId) {
    $q.notify({ type: 'warning', message: 'Please select a payroll run first' })
    return
  }

  // Use selected employees if any, otherwise all ready_for_payment employees
  const fundableIds =
    selectedEmployees.value.length > 0
      ? selectedEmployees.value
      : payrollRunEmployees.value
          .filter((e) => e.status === 'ready_for_payment')
          .map((e) => e.employee_id)

  if (fundableIds.length === 0) {
    $q.notify({ type: 'warning', message: 'No employees are ready for payment' })
    return
  }

  $q.dialog({
    title: 'Fund Payroll',
    message: `Fund payroll for ${fundableIds.length} employee(s)?`,
    ok: { label: 'Fund', color: 'primary', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      saving.value = true
      await fundPayroll(runId, fundableIds)
      $q.notify({ type: 'positive', message: 'Payroll funded successfully!' })
      await fetchPayrollRunEmployees(runId)
      await fetchPayrollRunsSummary()
      selectedEmployees.value = []
      selectAll.value = false
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.message || 'Funding failed' })
    } finally {
      saving.value = false
    }
  })
}

const getStageColor = (stage) => {
  const colors = {
    computed: 'grey',
    admin_reviewed: 'blue',
    owner_approved: 'indigo',
    released_for_review: 'orange',
    partially_paid: 'amber',
    payroll_funded: 'purple',
    disbursed: 'green',
    completed: 'green',
  }
  return colors[stage] || 'grey'
}

const getStageLabel = (stage) => {
  const step = workflowSteps.find((s) => s.key === stage)
  return step ? step.label : stage
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
    bank_disbursed: 'Bank Disbursed',
    completed: 'Completed',
  }
  return labels[status] || status
}

const retryEmployeeAction = async (emp) => {
  const runId = payrollRunId.value
  if (!runId) return
  try {
    emp.lastError = null
    saving.value = true
    switch (emp.status) {
      case 'draft':
        await approveByAdmin(runId, [emp.employee_id])
        break
      case 'approved_admin':
        await approveByOwner(runId, [emp.employee_id])
        break
      case 'approved_owner':
        await releasePayslip(runId, [emp.employee_id])
        break
    }
    $q.notify({ type: 'positive', message: `Success: ${emp.employee_name || emp.employee}` })
    await fetchPayrollRunEmployees(runId)
  } catch (err) {
    emp.lastError = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: 'Retry failed' })
  } finally {
    saving.value = false
  }
}
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
   RUN CARDS (always-visible layout)
============================== */
.runs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.run-card {
  background: #ffffff;
  border: 1px solid #e0e7ef;
  border-radius: 12px;
  overflow: hidden;
}

.run-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e0e7ef;
  flex-wrap: wrap;
  transition: all 0.2s ease;
}

.run-card-header:hover {
  background: #f3f7fc;
}

.run-card-header.expanded {
  background: #eff6ff;
  border-bottom-color: #bfdbfe;
}

.expand-icon {
  flex-shrink: 0;
  color: #6b7280;
  transition: transform 0.3s ease;
}

.run-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.run-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.run-header-amounts {
  display: flex;
  gap: 24px;
}

.run-amount-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.run-amount-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
}

.run-amount-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.run-header-action {
  display: flex;
  align-items: center;
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

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
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

/* ==============================
   AVATAR — matches EmployeesPage exactly
============================== */
.avatar-fallback {
  background: #e0e7ff !important;
  color: #4338ca !important;
  font-weight: 600 !important;
  min-width: 34px !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}

.avatar-fallback :deep(.q-avatar__content) {
  font-size: 12px !important;
  line-height: 1 !important;
}

/* ==============================
   EMPLOYEE CELL
============================== */
.employee-cell {
  min-width: 200px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-id {
  font-size: 11px;
  color: #9ca3af;
}

/* ==============================
   BADGES
============================== */
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

/* ==============================
   AMOUNT CELLS
============================== */
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

/* ==============================
   ACTIONS
============================== */
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

/* ==============================
   TABLE FOOTER
============================== */
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
   PAYROLL RUN DIALOG
============================== */
.run-dialog-card {
  display: flex;
  flex-direction: column;
  background: #f4f6f9;
}

.run-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px !important;
  background: #ffffff;
  border-bottom: 1px solid #e8ecf0;
}

.run-dialog-title-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.run-dialog-icon {
  background: #eff6ff !important;
  color: #3b82f6 !important;
  border-radius: 10px !important;
  flex-shrink: 0;
}

.run-dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.run-dialog-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.run-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px !important;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.run-dialog-footer {
  background: #ffffff;
  border-top: 1px solid #e8ecf0;
  padding: 12px 20px !important;
}

/* ==============================
   WORKFLOW SECTION (inside dialog)
============================== */
.workflow-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e8ecf0;
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.workflow-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.workflow-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #6b7280;
}
.workflow-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.workflow-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 12px 0;
  overflow-x: auto;
}

.stepper-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  min-width: 80px;
  flex: 1;
}

.step-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #9ca3af;
  transition: all 0.3s;
  position: relative;
  z-index: 1;
}

.stepper-step.step-active .step-icon {
  background: #3b82f6;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}
.stepper-step.step-completed .step-icon {
  background: #22c55e;
  color: white;
}
.stepper-step.step-pending .step-icon {
  background: #f3f4f6;
  color: #d1d5db;
}

.step-label {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
  white-space: nowrap;
}
.stepper-step.step-active .step-label {
  color: #3b82f6;
  font-weight: 600;
}
.stepper-step.step-completed .step-label {
  color: #22c55e;
  font-weight: 600;
}

.step-connector {
  position: absolute;
  top: 20px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
}
.stepper-step.step-completed .step-connector {
  background: #22c55e;
}

.workflow-actions {
  margin-bottom: 4px;
}
.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.action-hint {
  font-size: 12px;
  color: #9ca3af;
}

/* ==============================
   WORKFLOW TABLE (inside dialog)
============================== */
.workflow-table-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.workflow-actions-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}
.disbursement-btns {
  display: flex;
  gap: 4px;
}

/* ==============================
   EMPLOYEES PANEL (inline under run row)
============================== */
.employees-panel {
  background: #f4f7fb;
  border-top: 1px solid #dde3ec;
  border-left: 4px solid #3b82f6;
  margin-left: 0;
}

.employees-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 20px 10px 20px;
  background: #eef2f9;
  border-bottom: 1px solid #dde3ec;
}

.employees-panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.employees-panel-count {
  background: #3b82f6;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  padding: 1px 7px;
  line-height: 1.6;
}

.employees-panel-selected {
  font-size: 12px;
  font-weight: 400;
  color: #6b7280;
}

.employees-panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.employee-search-input {
  font-size: 13px;
}

.select-all-checkbox {
  font-size: 13px;
  color: #374151;
}

.employees-nested-table {
  width: 100%;
  border-collapse: collapse;
}

.employees-nested-table .table-header-row th {
  background: #eef2f9 !important;
}

.employees-nested-table .table-body-row:last-child td {
  border-bottom: none;
}

/* ==============================
   INLINE RUN DETAIL (legacy, kept for compatibility)
============================== */

.inline-run-detail {
  background: #f8fafc;
  border-bottom: 1px solid #e0e7ef;
  padding-bottom: 16px;
}

/* ==============================
   SELECTION STATES
============================== */
.selected-row .table-body-cell {
  background: #f0f9ff !important;
}
.selected-row:hover .table-body-cell {
  background: #e0f2fe !important;
}
.failed-row .table-body-cell {
  background: #fef2f2 !important;
}

/* ==============================
   DETAIL MODAL
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

/* ==============================
   MISC
============================== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 32px;
}

.text-center {
  text-align: center;
}
.text-grey-5 {
  color: #b0b8c1;
  font-size: 12px;
}
.text-caption {
  font-size: 11px;
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
  .workflow-stepper {
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
  }
  .step-connector {
    display: none;
  }
  .stepper-step {
    min-width: 60px;
  }
  .workflow-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .run-dialog-body {
    padding: 14px !important;
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
