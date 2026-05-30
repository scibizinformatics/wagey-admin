<template>
  <q-page class="payroll-dashboard">
    <div class="dashboard-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Disbursements</h1>
          </div>
          <div class="header-actions">
            <q-input v-model="disbursementSearch" dense outlined placeholder="Search disbursements..." class="header-search" clearable>
              <template v-slot:prepend><q-icon name="search" class="search-icon" /></template>
            </q-input>
            <q-btn v-if="activeTab === 'logs'" unelevated icon="add" label="Add Disbursements" color="positive" class="export-btn" no-caps @click="openCreateRunDialog" />
            <q-btn v-if="activeTab === 'funding'" unelevated icon="add" label="Add Funds" color="primary" class="export-btn" no-caps @click="scrollToFundingForm" />
            <q-btn unelevated icon="file_download" label="Export All" color="primary" class="export-btn" no-caps @click="exportToPDF" />
          </div>
        </div>
      </div>

      <PayrollStatsCards
        :total-employees="totalEmployees"
        :total-gross-pay="formatCurrency(totalGrossPay)"
        :total-net-pay="formatCurrency(totalNetPay)"
        :total-payroll-runs="totalPayrollRuns"
      />

      <div class="tabs-section">
        <div class="tab-pills">
          <button :class="['tab-pill', { active: activeTab === 'logs' }]" @click="activeTab = 'logs'">
            <q-icon name="receipt_long" class="tab-pill-icon" />
            <span>Logs</span>
          </button>
          <button :class="['tab-pill', { active: activeTab === 'funding' }]" @click="activeTab = 'funding'">
            <q-icon name="account_balance" class="tab-pill-icon" />
            <span>Funding</span>
          </button>
        </div>
      </div>

      <q-tab-panels v-model="activeTab" animated class="tab-panels">
        <q-tab-panel name="logs" class="tab-panel-content">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Logs</h2>
                <div class="table-info">{{ payrollRunsSummary.length }} runs</div>
              </div>
              <q-btn flat round icon="refresh" class="header-btn" @click="fetchPayrollRunsSummary()" :loading="isLoading('fetchingPayrollRunsSummary')" />
            </div>

            <div v-if="isLoading('fetchingPayrollRunsSummary')" class="loading-state">
              <q-spinner color="primary" size="32px" />
            </div>

            <div v-else-if="!payrollRunsSummary.length" class="loading-state">
              <span class="text-grey-5">No payroll runs found</span>
            </div>

            <div v-else class="runs-list">
              <div v-for="run in payrollRunsSummary" :key="run.id" class="run-card">
                <PayrollRunCard
                  :run="run"
                  :is-expanded="selectedRun?.id === run.id"
                  :action-type="getRunActionType(run)"
                  :action-loading="getRunActionLoading(run)"
                  @toggle-expand="toggleRunExpanded(run)"
                  @disburse="selectAndDisburse(run)"
                  @release="bulkReleaseAll(run)"
                />

                <div v-if="selectedRun?.id === run.id" class="employees-panel-wrapper">
                  <PayrollEmployeePanel
                    :employees="displayEmployees"
                    :loading="isLoading('fetchingPayrollRunEmployees')"
                    :saving="isSaving('bulkReleasing') || isSaving('disbursing')"
                    :search-query="employeeSearchQuery"
                    :select-all="selectAll"
                    :selected-count="selectedEmployees.length"
                    :workflow-stage="workflowStage"
                    :run-id="run.id"
                    :actionable-count="getActionableEmployees(workflowStage).length"
                    :show-release-btn="run.id === selectedRun?.id && workflowStage === 'draft' && selectedEmployees.length > 0"
                    :show-disburse-ready-btn="run.id === selectedRun?.id && workflowStage === 'draft' && getActionableEmployees('pending_review').length > 0 && selectedEmployees.length > 0"
                    :show-disburse-selected-btn="showDisburseSelectedBtn(run)"
                    :show-early-disbursal-banner-first="showEarlyDisbursalFirst(run)"
                    :show-early-disbursal-banner-second="showEarlyDisbursalSecond(run)"
                    :early-disbursal-count="getActionableEmployees('pending_review').length"
                    :release-btn-label="releaseBtnLabel"
                    :disburse-btn-label="disburseBtnLabel"
                    @update:search-query="employeeSearchQuery = $event"
                    @toggle-select-all="toggleSelectAll"
                    @bulk-release="handleBulkAction"
                    @bulk-disburse="handleBulkDisburse"
                    @toggle-selection="toggleEmployeeSelection"
                    @menu-action="onEmployeeMenuAction"
                  />
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <q-tab-panel name="funding" class="tab-panel-funding">
          <div class="funding-layout">
            <PayrollFundingForm
              :form="fundingForm"
              :run-options="runOptions"
              :funding-sources="fundingSources"
              :saving-funding="savingFunding"
              :selected-run-gross-pay="formatCurrency(selectedRunGrossPay)"
              :selected-run-net-pay="formatCurrency(selectedRunNetPay)"
              @update:log-id="onFundingLogChange"
              @update:form="fundingForm = $event"
              @submit-funding="submitFunding"
            />
            <PayrollFundingHistory
              :loading="fundingHistoryLoading"
              :entries="filteredFundingHistory"
              :total-pages="fundingTotalPages"
              @view-entry="viewFundingEntry"
              @edit-entry="editFundingEntry"
            />
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <PayrollCreateRunDialog
      :show-create-run-dialog="showCreateRunDialog"
      :create-run-form="createRunForm"
      :department-options="departmentOptions"
      :create-run-loading="createRunLoading"
      :company-id="getResolvedCompanyId()"
      :departments="departments"
      @update:show-create-run-dialog="showCreateRunDialog = $event"
      @create-run="onCreateRun"
    />

    <PayrollDetailModal
      :show-detail-modal="showDetailModal"
      :record="selectedRecord"
      @update:show-detail-modal="showDetailModal = $event"
      @close="closeDetailModal"
      @download-payslip="downloadPayslip(selectedRecord)"
    />

    <PayrollAcknowledgeDialog
      :show-acknowledge-dialog="showAcknowledgeDialog"
      :target="acknowledgeTarget"
      :acknowledge-loading="acknowledgeLoading"
      :dialog-loading="acknowledgeDialogLoading"
      @update:show-acknowledge-dialog="showAcknowledgeDialog = $event"
      @close="showAcknowledgeDialog = false; acknowledgeTarget = null"
      @acknowledge-payslip="submitAcknowledge"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { usePayroll } from 'src/composables/page/usePayroll'
import { useCompany } from 'src/composables/page/useCompany'
import { useAdminDepartments } from 'src/composables/admin/useAdminDepartments'
import { useAdminCostCenters } from 'src/composables/admin/useAdminCostCenters'

import PayrollStatsCards from 'src/components/pages/Payroll/PayrollStatsCards.vue'
import PayrollRunCard from 'src/components/pages/Payroll/PayrollRunCard.vue'
import PayrollEmployeePanel from 'src/components/pages/Payroll/PayrollEmployeePanel.vue'
import PayrollFundingForm from 'src/components/pages/Payroll/PayrollFundingForm.vue'
import PayrollFundingHistory from 'src/components/pages/Payroll/PayrollFundingHistory.vue'
import PayrollCreateRunDialog from 'src/components/pages/Payroll/PayrollCreateRunDialog.vue'
import PayrollDetailModal from 'src/components/pages/Payroll/PayrollDetailModal.vue'
import PayrollAcknowledgeDialog from 'src/components/pages/Payroll/PayrollAcknowledgeDialog.vue'

const $q = useQuasar()
const { companyId } = useCompany()
const {
  payrollRunsSummary,
  fetchPayrollRunsSummary: _fetchPayrollRunsSummary,
  payrollRunId,
  workflowStage,
  payrollRunEmployees,
  isLoading,
  isSaving,
  bulkReleasePayslips,
  addDisbursementFunding,
  fetchDisbursementFundings,
  disbursePayslips,
  fetchPayrollRunEmployees,
  createPayrollRun,
  fetchEmployeePayslips,
  acknowledgePayslip,
  confirmMoneyReceived,
  fetchDisbursementLogBankAccounts,
  retryWithBackoff,
} = usePayroll()

const { departments, fetchDepartments } = useAdminDepartments()
const { costCenters, fetchCostCenters } = useAdminCostCenters()

// ─── Company ID ─────────────────────────────────────────────────────────────
function getResolvedCompanyId() {
  const raw = companyId.value
  if (raw && typeof raw !== 'object') {
    const n = Number(raw)
    if (!Number.isNaN(n) && n > 0) return n
  }
  const keys = ['selectedCompany', 'company_id', 'companyId']
  for (const key of keys) {
    const stored = localStorage.getItem(key)
    if (!stored) continue
    try {
      const parsed = JSON.parse(stored)
      const id = parsed?.id ?? parsed
      const n = Number(id)
      if (!Number.isNaN(n) && n > 0) return n
    } catch {
      const n = Number(stored)
      if (!Number.isNaN(n) && n > 0) return n
    }
  }
  console.warn('[PayrollPage] No valid company ID resolved')
  return null
}

const fetchPayrollRunsSummary = (extraParams = {}) => {
  const cid = getResolvedCompanyId()
  const params = cid ? { company_id: cid, ...extraParams } : extraParams
  console.debug('[PayrollPage] fetchPayrollRunsSummary params:', params)
  return _fetchPayrollRunsSummary(params)
}

// ─── Tab State ───────────────────────────────────────────────────────────────
const activeTab = ref('logs')
const disbursementSearch = ref('')

watch(activeTab, (tab) => {
  if (tab === 'funding') {
    loadAllFundingHistory()
  }
})

// ─── Funding State ────────────────────────────────────────────────────────────
const fundingFormRef = ref(null)
const savingFunding = ref(false)
const fundingHistoryLoading = ref(false)
const fundingPageSize = 7

const fundingForm = ref({
  logId: null,
  date: new Date().toISOString().split('T')[0],
  type: 'check',
  reference: '',
  source: null,
  amount: '',
  notes: '',
})

const fundingSources = ref([])
const allFundingHistory = ref([])

const filteredFundingHistory = computed(() => allFundingHistory.value)

const fundingTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredFundingHistory.value.length / fundingPageSize)),
)

const selectedRunGrossPay = computed(() => {
  const run = payrollRunsSummary.value.find((r) => r.id === fundingForm.value.logId)
  return Number(run?.calculated_amount ?? 0)
})

const selectedRunNetPay = computed(() => {
  const run = payrollRunsSummary.value.find((r) => r.id === fundingForm.value.logId)
  return Number(run?.total_net_pay ?? 0)
})

const loadAllFundingHistory = async () => {
  fundingHistoryLoading.value = true
  try {
    const entries = await fetchDisbursementFundings()
    allFundingHistory.value = entries.map((h) => {
      const run = payrollRunsSummary.value.find((r) => r.id === h.log)
      return {
        id: h.id, logId: h.log, logName: h.log_name ?? run?.name ?? '\u2014',
        period: run?.period ?? '', source: h.source_bank_name ?? h.source ?? '\u2014',
        amount: Number(h.amount ?? 0), date: h.date ?? '', type: h.type ?? '',
        type_display: h.type_display ?? h.type ?? '', reference: h.reference_num ?? '',
        notes: h.notes ?? '',
      }
    })
  } catch (err) {
    console.error('[Funding] Error loading all funding history:', err)
    allFundingHistory.value = []
  } finally {
    fundingHistoryLoading.value = false
  }
}

const onFundingLogChange = async (logId) => {
  if (!logId) {
    fundingForm.value.amount = ''
    fundingSources.value = []
    fundingForm.value.source = null
    return
  }
  fundingSources.value = []
  fundingForm.value.source = null
  try {
    const run = payrollRunsSummary.value.find((r) => r.id === logId)
    fundingForm.value.amount = Number(run?.total_net_pay ?? 0) || ''
    const bankAccounts = await fetchDisbursementLogBankAccounts(logId)
    if (bankAccounts.length > 0) {
      fundingSources.value = bankAccounts.map((b) => ({
        label: b.name ?? 'Unnamed Account', value: b.id,
      }))
    } else {
      console.warn('[Funding] Endpoint returned empty — falling back to manual lookup')
      const departmentId = run?.department_id
      const dept = departments.value.find((d) => String(d.id) === String(departmentId))
      const costCenterId = dept?.cost_center
      if (costCenterId) {
        const cc = costCenters.value.find((c) => String(c.id) === String(costCenterId))
        const accounts = (cc?.bank_accounts ?? []).filter((b) => b.is_active !== false)
        fundingSources.value = accounts.map((b) => ({
          label: `${b.bank_name} \u2013 ${b.bank_account_name} \u2013 ${b.bank_account_number}`,
          value: b.id,
        }))
      }
    }
  } catch (err) {
    console.error('[Funding] Error loading funding data:', err)
    fundingSources.value = []
  }
}

const scrollToFundingForm = () => {
  activeTab.value = 'funding'
  setTimeout(() => {
    fundingFormRef.value?.$el?.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}

const submitFunding = async () => {
  if (!fundingForm.value.logId || !fundingForm.value.amount) {
    $q.notify({ type: 'warning', message: 'Please fill in Log and Amount' })
    return
  }
  savingFunding.value = true
  try {
    const payload = {
      log: fundingForm.value.logId, date: fundingForm.value.date, type: fundingForm.value.type,
      source: fundingForm.value.source, reference_num: fundingForm.value.reference || '',
      amount: Number(fundingForm.value.amount) || 0,
    }
    if (fundingForm.value.notes) payload.notes = fundingForm.value.notes
    await addDisbursementFunding(payload)
    $q.notify({ type: 'positive', message: 'Funds added successfully!' })
    await loadAllFundingHistory()
    await fetchPayrollRunsSummary()
    const refreshedRun = payrollRunsSummary.value.find((r) => String(r.id) === String(fundingForm.value.logId))
    if (refreshedRun) selectedRun.value = refreshedRun
    const keepLogId = fundingForm.value.logId
    fundingForm.value = {
      logId: keepLogId, date: new Date().toISOString().split('T')[0], type: 'check',
      reference: '', source: null, amount: '', notes: '',
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Failed to add funds' })
  } finally {
    savingFunding.value = false
  }
}

const viewFundingEntry = (entry) => {
  $q.dialog({
    title: 'Funding Entry',
    message: `Log: ${entry.logName}\nAmount: ${formatCurrency(entry.amount)}\nSource: ${entry.source}`,
    ok: { label: 'Close', flat: true },
  })
}

const editFundingEntry = (entry) => {
  fundingForm.value = {
    logId: entry.logId, date: entry.date || new Date().toISOString().split('T')[0],
    type: entry.type || 'check', reference: entry.reference || '',
    source: entry.source || null, amount: entry.amount || '', notes: entry.notes || '',
  }
  fundingFormRef.value?.$el?.scrollIntoView({ behavior: 'smooth' })
}

// ─── Create Run Dialog ───────────────────────────────────────────────────────
const showCreateRunDialog = ref(false)
const createRunForm = ref({ company_id: '', department_id: null, start_date: '', end_date: '', type: 'salary' })
const createRunLoading = ref(false)

const openCreateRunDialog = () => {
  const cid = getResolvedCompanyId()
  if (!cid) {
    $q.notify({ type: 'warning', message: 'Please select a company first' })
    return
  }
  createRunForm.value = { company_id: cid, department_id: null, start_date: '', end_date: '', type: 'salary' }
  showCreateRunDialog.value = true
  fetchDepartments(cid)
}

const onCreateRun = async (form) => {
  const cid = getResolvedCompanyId()
  if (!cid || !form.start_date || !form.end_date) {
    $q.notify({ type: 'warning', message: 'Please fill in Company, Start Date, and End Date.' })
    return
  }
  try {
    createRunLoading.value = true
    const payload = {
      company_id: cid, start_date: form.start_date, end_date: form.end_date,
      type: form.type || 'salary',
    }
    const deptId = Number(form.department_id)
    if (deptId) payload.department_id = deptId
    const result = await createPayrollRun(payload)
    $q.notify({
      type: 'positive',
      message: result?.message || `Generated ${result?.generated_count ?? 0} payslip(s)!`,
    })
    showCreateRunDialog.value = false

    const optimisticId = result?.disbursement_log_id ?? Date.now()
    const optimisticRun = {
      id: optimisticId, name: result?.name ?? `Payroll Run | ${payload.type} | ${payload.start_date} - ${payload.end_date}`,
      period: `${payload.start_date} - ${payload.end_date}`, status: 'draft', status_display: 'Draft',
      calculated_amount: '0.00', total_net_pay: '0.00', funded: '0.00', released: '0.00',
      number_of_employee: result?.generated_count ?? 0, completed_employees_count: 0,
      department_id: payload.department_id ?? null, __optimistic: true, __optimisticAt: Date.now(),
    }
    payrollRunsSummary.value = [optimisticRun, ...payrollRunsSummary.value]

    selectedRun.value = optimisticRun
    payrollRunId.value = optimisticId
    clearSelection()
    selectAll.value = false
    try {
      await fetchPayrollRunEmployees(optimisticId)
      selectedRunForData.value = optimisticId
    } catch { /* non-fatal */ }

    try {
      await retryWithBackoff(async () => {
        await fetchPayrollRunsSummary()
        const confirmed = payrollRunsSummary.value.some((r) => r.id === optimisticId && !r.__optimistic)
        if (!confirmed) throw new Error('Not yet synced')
      })
      const confirmedRun = payrollRunsSummary.value.find((r) => r.id === optimisticId && !r.__optimistic)
      if (confirmedRun) {
        selectedRun.value = confirmedRun
        payrollRunId.value = confirmedRun.id
        clearSelection()
        selectAll.value = false
        try {
          await fetchPayrollRunEmployees(confirmedRun.id)
          selectedRunForData.value = confirmedRun.id
        } catch { /* non-fatal */ }
      }
    } catch {
      $q.notify({ type: 'warning', message: 'Payroll run created, but the server summary is still updating.', timeout: 6000 })
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to generate payslips' })
  } finally {
    createRunLoading.value = false
  }
}

// ─── Run Card Action Helpers ──────────────────────────────────────────────────
function getRunActionType(run) {
  if (!run) return null
  const isExpanded = selectedRun.value?.id === run.id
  const isDisbursed = ['disbursed', 'completed', 'closed'].includes(run.status)
  if (isDisbursed) return 'completed'
  if (run.status === 'pending_review') return 'awaiting'
  if (isExpanded && workflowStage.value === 'draft' && hasReadyForPaymentSelected.value && !isRunFullyDisbursed(run)) return 'disburse'
  if (isExpanded && allEmployeesReadyForPayment.value && !isRunFullyDisbursed(run)) return 'disburse'
  if (run.status === 'ready_for_payment' && !isRunFullyDisbursed(run)) return 'disburse'
  if (run.status === 'draft' || (isExpanded && workflowStage.value === 'draft')) return 'release'
  return null
}

function getRunActionLoading(run) {
  if (!run) return false
  if (run.status === 'draft') return isSaving('bulkReleasing')
  return isSaving('disbursing')
}

// ─── Run Selection & Employee Loading ─────────────────────────────────────────
const selectedRun = ref(null)
const selectedRunForData = ref(null)

const loadRunEmployees = async (run) => {
  if (selectedRun.value && selectedRun.value.id === run.id) return
  selectedRun.value = run
  payrollRunId.value = run.id
  clearSelection()
  selectAll.value = false
  await fetchPayrollRunEmployees(run.id)
  selectedRunForData.value = run.id
}

const toggleRunExpanded = async (run) => {
  if (selectedRun.value?.id === run.id) {
    selectedRun.value = null
    payrollRunId.value = null
  } else {
    selectedRun.value = run
    payrollRunId.value = run.id
    clearSelection()
    selectAll.value = false
    try {
      await fetchPayrollRunEmployees(run.id)
      selectedRunForData.value = run.id
    } catch { /* non-fatal */ }
  }
}

const selectAndDisburse = async (run) => {
  selectedRun.value = run
  payrollRunId.value = run.id
  await fetchPayrollRunEmployees(run.id)
  const readyCount = payrollRunEmployees.value.filter(
    (e) => e.status === 'ready_for_payment' && e.review_status !== 'pending',
  ).length
  if (!readyCount) {
    $q.notify({ type: 'warning', message: 'No employees are ready for payment yet' })
    return
  }
  await handleBulkDisburse()
  await fetchPayrollRunsSummary()
  const refreshedRun = payrollRunsSummary.value.find((r) => String(r.id) === String(run.id))
  if (refreshedRun) selectedRun.value = refreshedRun
}

// ─── Employee Search & Display Rows ───────────────────────────────────────────
const employeeSearchQuery = ref('')
const employeeSearchDebounce = ref('')

let searchDebounceTimer = null
watch(employeeSearchQuery, (newVal) => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    employeeSearchDebounce.value = newVal
    employeePage.value = 1
  }, 300)
})

const employeePage = ref(1)

const filteredEmployees = computed(() => {
  const employees = payrollRunEmployees.value
  if (!Array.isArray(employees) || employees.length === 0) return []
  const q = employeeSearchDebounce.value?.toLowerCase()?.trim() || ''
  if (!q) return employees
  return employees.filter((e) => {
    const name = (e.employee_name || e.employee || '').toLowerCase()
    const id = (e.employee_id || '').toString().toLowerCase()
    return name.includes(q) || id.includes(q)
  })
})

const maxGrossPayComputed = computed(() => {
  const employees = payrollRunEmployees.value
  if (!Array.isArray(employees) || employees.length === 0) return 1
  let max = 0
  for (const emp of employees) { const val = Number(emp.gross_pay || 0); if (val > max) max = val }
  return max > 0 ? max : 1
})

const maxNetPayComputed = computed(() => {
  const employees = payrollRunEmployees.value
  if (!Array.isArray(employees) || employees.length === 0) return 1
  let max = 0
  for (const emp of employees) { const val = Number(emp.net_pay || 0); if (val > max) max = val }
  return max > 0 ? max : 1
})

const displayEmployees = computed(() => {
  return filteredEmployees.value.map((emp) => {
    const grossPay = Number(emp.gross_pay || 0)
    const netPay = Number(emp.net_pay || 0)
    return {
      ...emp,
      _selected: isEmployeeSelected(emp.employee_id),
      _canCheck: isEmployeeActionable(emp),
      _checkboxType: workflowStage.value === 'pending_review' && emp.status === 'pending_review' ? 'pending_review' : null,
      _statusColor: getStatusColor(emp.status),
      _statusLabel: getStatusLabel(emp.status),
      _hasError: !!emp.lastError,
      _initials: getInitials(emp.employee_name || emp.employee),
      _grossPayFormatted: formatCurrency(grossPay),
      _netPayFormatted: formatCurrency(netPay),
      _grossBarWidth: getPayPercentage(grossPay, maxGrossPayComputed.value),
      _netBarWidth: getPayPercentage(netPay, maxNetPayComputed.value),
      _totalHours: emp.breakdown?.attendance?.total_hours_worked || 0,
    }
  })
})

// ─── Employee Panel Button Visibility ─────────────────────────────────────────
function showDisburseSelectedBtn(run) {
  if (run.id !== selectedRun.value?.id) return false
  if (workflowStage.value === 'ready_for_payment' && selectedEmployees.value.length > 0) return true
  if (workflowStage.value === 'pending_review' && selectedEmployees.value.length > 0) return true
  return false
}

function showEarlyDisbursalFirst(run) {
  return run.id === selectedRun.value?.id && workflowStage.value === 'pending_review' && getActionableEmployees('pending_review').length > 0
}

function showEarlyDisbursalSecond(run) {
  return run.id === selectedRun.value?.id && workflowStage.value === 'draft' && getActionableEmployees('pending_review').length > 0
}

// ─── Selection State ──────────────────────────────────────────────────────────
const selectedEmployeeIds = ref(new Set())
const selectAll = ref(false)

const selectedEmployees = computed(() => Array.from(selectedEmployeeIds.value))

const hasReadyForPaymentSelected = computed(() => {
  if (!selectedEmployees.value.length) return false
  return payrollRunEmployees.value.some(
    (e) => selectedEmployeeIds.value.has(e.employee_id) && e.status === 'ready_for_payment' && e.review_status !== 'pending',
  )
})

const allEmployeesReadyForPayment = computed(() => {
  const employees = payrollRunEmployees.value
  if (!employees || employees.length === 0) return false
  return employees.every((e) => e.status === 'ready_for_payment' && e.review_status !== 'pending')
})

const isRunFullyDisbursed = (run) => {
  if (['disbursed', 'completed', 'closed'].includes(run.status)) return true
  const employees = payrollRunEmployees.value
  if (!employees || employees.length === 0) return false
  return employees.every((e) => e.status === 'disbursed')
}

const isEmployeeSelected = (id) => selectedEmployeeIds.value.has(id)

const toggleEmployeeSelection = (employeeId) => {
  const newSet = new Set(selectedEmployeeIds.value)
  if (newSet.has(employeeId)) newSet.delete(employeeId)
  else newSet.add(employeeId)
  selectedEmployeeIds.value = newSet
  const actionable = getActionableEmployees(workflowStage.value)
  const actionableIds = new Set(actionable.map((e) => e.employee_id))
  selectAll.value = actionableIds.size > 0 && Array.from(actionableIds).every((id) => newSet.has(id))
}

const clearSelection = () => {
  selectedEmployeeIds.value = new Set()
  selectAll.value = false
}

const selectAllActionable = () => {
  const actionable = getActionableEmployees(workflowStage.value)
  selectedEmployeeIds.value = new Set(actionable.map((e) => e.employee_id))
}

const actionableEmployeesByStage = computed(() => {
  const employees = payrollRunEmployees.value
  if (!Array.isArray(employees)) return { draft: [], pending_review: [], ready_for_payment: [], disbursed: [] }
  return {
    draft: employees.filter((e) => e.status === 'draft'),
    pending_review: employees.filter((e) => e.status === 'pending_review'),
    ready_for_payment: employees.filter((e) => e.status === 'ready_for_payment'),
    disbursed: employees.filter((e) => e.status === 'disbursed'),
  }
})

const getActionableEmployees = (currentStage) => actionableEmployeesByStage.value[currentStage] || []

const releaseBtnLabel = computed(() => {
  if (selectedEmployeeIds.value.size === 0) return null
  const actionableCount = getActionableEmployees(workflowStage.value).length
  return selectedEmployeeIds.value.size === actionableCount ? 'Release All' : 'Release'
})

const disburseBtnLabel = computed(() => {
  const selected = selectedEmployees.value.length
  const actionable = getActionableEmployees('pending_review').length
  if (workflowStage.value === 'pending_review') {
    return `Disburse ${selected === actionable ? 'All Acknowledged' : 'Selected'} (${selected})`
  }
  return 'Disburse Selected'
})

// ─── Payroll Data (for detail modal & PDF export) ────────────────────────────
const payrollData = computed(() =>
  (Array.isArray(payrollRunEmployees.value) ? payrollRunEmployees.value : []).map((r, i) => ({
    id: r.payslip_id ?? `payroll-${i}`, employee: r.employee_name ?? 'Unknown',
    employee_id: r.employee_id ?? null, period: r.period ?? null, run: selectedRunForData.value,
    gross_pay: Number(r.gross_pay ?? 0), total_deductions: Number(r.total_deductions ?? 0),
    net_pay: Number(r.net_pay ?? 0), status: r.status ?? 'draft', breakdown: r.breakdown ?? {},
  })),
)

const showDetailModal = ref(false)
const selectedRecord = ref(null)

const safeArray = (arr) => (Array.isArray(arr) ? arr : [])

const runOptions = computed(() =>
  payrollRunsSummary.value.map((r) => ({ label: r.name, value: r.id })),
)

const departmentOptions = computed(() =>
  (departments.value ?? []).map((d) => ({ label: d.name, value: d.id })),
)

const totalEmployees = computed(() =>
  safeArray(payrollRunsSummary.value).reduce((sum, r) => sum + Number(r.number_of_employee || 0), 0),
)
const totalGrossPay = computed(() =>
  safeArray(payrollRunsSummary.value).reduce((sum, r) => sum + Number(r.calculated_amount || 0), 0),
)
const totalNetPay = computed(() =>
  safeArray(payrollRunsSummary.value).reduce((sum, r) => sum + Number(r.total_net_pay || 0), 0),
)
const totalPayrollRuns = computed(() => safeArray(payrollRunsSummary.value).length)

// ─── Utilities ────────────────────────────────────────────────────────────────
const formatCurrency = (val) => {
  const n = Number(val ?? 0)
  return '\u20B1' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.toString().split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const payPercentageCache = new Map()
const getPayPercentage = (value, max) => {
  if (max <= 0) return 0
  const cacheKey = `${value}-${max}`
  if (payPercentageCache.has(cacheKey)) return payPercentageCache.get(cacheKey)
  const result = Math.round(((value || 0) / max) * 100)
  if (payPercentageCache.size > 1000) payPercentageCache.clear()
  payPercentageCache.set(cacheKey, result)
  return result
}

const exportToPDF = async () => {
  const arr = safeArray(payrollData.value)
  if (!arr.length) {
    $q.notify({ type: 'warning', message: 'No payroll data to export' })
    return
  }
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Payroll Report', 14, 20)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Employee', 'Period', 'Run', 'Gross Pay', 'Net Pay', 'Hours']],
    body: arr.map((r, i) => [
      i + 1, r.employee ?? 'N/A', r.period ?? '-', `#${r.run ?? ''}`,
      formatCurrency(r.gross_pay), formatCurrency(r.net_pay),
      `${r.breakdown?.attendance?.total_hours_worked ?? 0}h`,
    ]),
  })
  doc.save(`Payroll_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  $q.notify({ type: 'positive', message: 'Payroll exported as PDF!' })
}

const downloadPayslip = async (record) => {
  // Full payslip PDF generation preserved
  const rec = record ?? selectedRecord.value
  if (!rec) {
    $q.notify({ type: 'negative', message: 'No record selected to download' })
    return
  }
  const employeeName = rec.employee_name ?? rec.employee ?? 'N/A'
  const employeeId = rec.employee_id ?? 'N/A'
  const position = rec.position ?? rec.job_title ?? '\u2014'
  const employmentType = rec.employment_type ?? '\u2014'
  const empStatus = rec.employment_status ?? '\u2014'
  const runName = rec.period ?? selectedRun.value?.name ?? '\u2014'
  const fmtDate = (d) => {
    if (!d || d === '\u2014') return '\u2014'
    try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) }
    catch { return d }
  }
  const payDate = fmtDate(rec.pay_date ?? rec.released_at)
  const payslipNo = rec.payslip_no ?? `PS-${rec.payslip_id ?? rec.id ?? ''}`
  const companyName = selectedRun.value?.company_name ?? rec.company_name ?? ''
  const companyAddress = selectedRun.value?.company_address ?? rec.company_address ?? ''
  const companyTin = selectedRun.value?.company_tin ?? rec.company_tin ?? ''
  const bd = rec.breakdown ?? {}
  const att = bd.attendance ?? {}
  const daysWorked = att.days_worked ?? rec.days_worked ?? '\u2014'
  const daysAbsent = att.days_absent ?? rec.days_absent ?? 0
  const vlUsed = att.vacation_leave ?? rec.vacation_leave ?? 0
  const slUsed = att.sick_leave ?? rec.sick_leave ?? 0
  const totalHoursW = att.total_hours_worked ?? rec.total_hours_worked ?? 0
  const otHours = att.overtime_hours ?? rec.overtime_hours ?? 0
  const ndHours = att.night_diff_hours ?? rec.night_diff_hours ?? 0
  const restDays = att.rest_days_worked ?? rec.rest_days_worked ?? 0
  const holidayDays = att.holidays_worked ?? rec.holidays_worked ?? 0
  const monthlyRate = Number(rec.monthly_rate ?? rec.rate ?? 0)
  const dailyRate = Number(rec.daily_rate ?? (monthlyRate ? monthlyRate / 22 : 0))
  const basicPay = Number(rec.basic_pay ?? rec.gross_pay ?? 0)
  const earnings = Array.isArray(rec.earnings) ? rec.earnings : []
  const premiumItems = earnings.filter((e) => ['overtime', 'night_differential', 'holiday', 'rest_day'].includes(e.type))
  const allowances = earnings.filter((e) => e.type === 'allowance')
  const incentives = earnings.filter((e) => e.type === 'incentive')
  const adjAdditions = earnings.filter((e) => e.type === 'adjustment_add')
  const overtimePay = premiumItems.find((e) => e.type === 'overtime')?.amount ?? Number(rec.overtime_pay ?? 0)
  const nightDiffPay = premiumItems.find((e) => e.type === 'night_differential')?.amount ?? Number(rec.night_diff_pay ?? 0)
  const holidayPay = premiumItems.find((e) => e.type === 'holiday')?.amount ?? Number(rec.holiday_pay ?? 0)
  const grossPay = Number(rec.gross_pay ?? 0)
  const deductions = Array.isArray(rec.deductions) ? rec.deductions : []
  const withholdingTax = Number(rec.withholding_tax ?? deductions.find((d) => d.type === 'withholding_tax')?.amount ?? 0)
  const sssContrib = Number(rec.sss ?? deductions.find((d) => d.type === 'sss')?.amount ?? 0)
  const philhealth = Number(rec.philhealth ?? deductions.find((d) => d.type === 'philhealth')?.amount ?? 0)
  const pagibig = Number(rec.pagibig ?? deductions.find((d) => d.type === 'pagibig')?.amount ?? 0)
  const sssLoan = Number(rec.sss_loan ?? deductions.find((d) => d.type === 'sss_loan')?.amount ?? 0)
  const pagibigLoan = Number(rec.pagibig_loan ?? deductions.find((d) => d.type === 'pagibig_loan')?.amount ?? 0)
  const cashAdvance = Number(rec.cash_advance ?? deductions.find((d) => d.type === 'cash_advance')?.amount ?? 0)
  const companyLoan = Number(rec.company_loan ?? deductions.find((d) => d.type === 'company_loan')?.amount ?? 0)
  const absenceDeduct = Number(rec.absence_deduction ?? deductions.find((d) => d.type === 'absence')?.amount ?? (daysAbsent > 0 ? dailyRate * daysAbsent : 0))
  const lateDeduct = Number(rec.late_deduction ?? deductions.find((d) => d.type === 'late')?.amount ?? 0)
  const totalDeductions = Number(rec.total_deductions ?? grossPay - Number(rec.net_pay ?? 0))
  const netPay = Number(rec.net_pay ?? 0)
  const paymentMethod = rec.payment_method ?? rec.disbursement_type ?? '\u2014'
  const paymentStatus = rec.status ?? '\u2014'
  const dateReleased = fmtDate(rec.released_at ?? rec.pay_date)
  const loans = Array.isArray(rec.loans) ? rec.loans : companyLoan ? [{ type: 'Company Loan', total: rec.total_loan_amount ?? 0, deduction: companyLoan, balance: rec.loan_balance ?? 0 }] : []
  const thirteenthAccrual = Number(rec.thirteenth_month_accrual ?? rec.month_accrual ?? 0)
  const thirteenthYtd = Number(rec.thirteenth_month_ytd ?? rec.ytd_accrual ?? 0)

  const jspdfModule = await import('jspdf')
  const jsPDF = jspdfModule.jsPDF ?? jspdfModule.default
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const PW = 210
  const ML = 15
  const MR = 193
  let y = 14
  const fc = (v) => {
    const n = Number(v ?? 0)
    return 'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  const line = (x1, yy, x2) => { doc.setDrawColor(200, 200, 200); doc.line(x1, yy, x2, yy) }
  const sectionTitle = (title, yy) => {
    doc.setFillColor(240, 244, 255); doc.rect(ML, yy - 4.5, MR - ML, 6.5, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(50, 60, 120)
    doc.text(title.toUpperCase(), ML + 2, yy); doc.setTextColor(30, 30, 30)
    return yy + 5
  }
  const dotRow = (label, val, yy, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80)
    doc.text(label, ML + 2, yy)
    doc.setTextColor(180, 180, 180)
    const dotStart = ML + 2 + doc.getTextWidth(label) + 1; const dotEnd = MR - doc.getTextWidth(val) - 1
    if (dotEnd > dotStart) { let dx = dotStart; while (dx < dotEnd) { doc.text('.', dx, yy); dx += 1.6 } }
    doc.setTextColor(bold ? 20 : 40, bold ? 20 : 40, bold ? 20 : 40)
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.text(val, MR, yy, { align: 'right' })
    return yy + 5.2
  }
  const kv = (label, val, yy) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 100, 100)
    doc.text(label + ':', ML + 2, yy); doc.setTextColor(20, 20, 20)
    doc.setFont('helvetica', 'bold'); doc.text(String(val), ML + 45, yy); doc.setFont('helvetica', 'normal')
    return yy + 5
  }

  doc.setFillColor(37, 56, 120); doc.rect(0, 0, PW, 22, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255)
  doc.text('OFFICIAL PAYSLIP', PW / 2, 9, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  if (companyName) doc.text(companyName, PW / 2, 15, { align: 'center' })
  if (companyAddress) doc.text(companyAddress, PW / 2, 19, { align: 'center' })
  y = 28

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80)
  if (companyTin) doc.text(`TIN: ${companyTin}`, ML, y)
  doc.text(`Payslip No.: ${payslipNo}`, MR, y, { align: 'right' })
  y += 5; doc.text(`Payroll Period: ${runName}`, ML, y); doc.text(`Pay Date: ${payDate}`, MR, y, { align: 'right' })
  y += 3; line(ML, y, MR); y += 5

  y = sectionTitle('Employee Information', y); y += 1
  y = kv('Full Name', employeeName, y); y = kv('Employee ID', employeeId, y)
  y = kv('Position', position, y); y = kv('Employment Type', employmentType, y)
  y = kv('Status', empStatus, y); y += 2; line(ML, y, MR); y += 5

  y = sectionTitle('Work Summary', y); y += 1
  const workRows = [['Days Worked', String(daysWorked)], ['Days Absent', String(daysAbsent)], ['Vacation Leave (VL)', String(vlUsed)], ['Sick Leave (SL)', String(slUsed)], ['Total Hours Worked', `${totalHoursW}h`], ['Overtime Hours', `${otHours}h`], ['Night Differential Hrs', `${ndHours}h`], ['Rest Days Worked', String(restDays)], ['Holidays Worked', String(holidayDays)]]
  workRows.forEach(([l, v]) => { y = dotRow(l, v, y) })
  y += 2; line(ML, y, MR); y += 5

  if (monthlyRate > 0 || dailyRate > 0) {
    y = sectionTitle('Rate Basis', y); y += 1
    if (monthlyRate > 0) y = dotRow('Monthly Rate', fc(monthlyRate), y)
    if (dailyRate > 0) y = dotRow('Daily Rate', fc(dailyRate), y)
    y += 2; line(ML, y, MR); y += 5
  }

  y = sectionTitle('Earnings', y); y += 1
  y = dotRow('Basic Pay', fc(basicPay), y)
  const hasPremium = overtimePay > 0 || nightDiffPay > 0 || holidayPay > 0 || premiumItems.length > 0
  if (hasPremium) {
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
    doc.text('Premium Pay', ML + 2, y); y += 4.5
    if (overtimePay > 0) y = dotRow('Overtime Pay', fc(overtimePay), y, false)
    if (nightDiffPay > 0) y = dotRow('Night Differential Pay', fc(nightDiffPay), y, false)
    if (holidayPay > 0) y = dotRow('Holiday Pay', fc(holidayPay), y, false)
    premiumItems.filter((e) => !['overtime', 'night_differential', 'holiday'].includes(e.type)).forEach((e) => { y = dotRow(e.label ?? e.type, fc(e.amount), y, false) })
  }
  if (allowances.length > 0) {
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
    doc.text('Allowances', ML + 2, y); y += 4.5; allowances.forEach((a) => { y = dotRow(a.label ?? a.type, fc(a.amount), y) })
  }
  if (incentives.length > 0) {
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
    doc.text('Incentives', ML + 2, y); y += 4.5; incentives.forEach((a) => { y = dotRow(a.label ?? a.type, fc(a.amount), y) })
  }
  doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
  doc.text('Adjustments (Additions)', ML + 2, y); y += 4.5
  if (adjAdditions.length > 0) adjAdditions.forEach((a) => { y = dotRow(a.label ?? a.type, fc(a.amount), y) })
  else y = dotRow('\u2014', fc(0), y)

  doc.setFillColor(37, 56, 120); doc.rect(ML, y - 1, MR - ML, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255)
  doc.text('GROSS PAY', ML + 3, y + 4); doc.text(fc(grossPay), MR - 2, y + 4, { align: 'right' })
  y += 11; doc.setTextColor(30, 30, 30)

  y = sectionTitle('Deductions', y); y += 1
  doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
  doc.text('Government Contributions', ML + 2, y); y += 4.5
  if (withholdingTax > 0) y = dotRow('Withholding Tax', fc(withholdingTax), y)
  if (sssContrib > 0) y = dotRow('SSS Contribution', fc(sssContrib), y)
  if (philhealth > 0) y = dotRow('PhilHealth', fc(philhealth), y)
  if (pagibig > 0) y = dotRow('Pag-IBIG', fc(pagibig), y)

  doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
  doc.text('Government Loans', ML + 2, y); y += 4.5
  y = dotRow('SSS Loan', fc(sssLoan), y); y = dotRow('Pag-IBIG Loan', fc(pagibigLoan), y)

  doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
  doc.text('Company Deductions', ML + 2, y); y += 4.5
  if (cashAdvance > 0) y = dotRow('Cash Advance', fc(cashAdvance), y)
  if (companyLoan > 0) y = dotRow('Company Loan', fc(companyLoan), y)

  doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
  doc.text('Attendance Deductions', ML + 2, y); y += 4.5
  y = dotRow(`Absence (${daysAbsent} day${daysAbsent !== 1 ? 's' : ''})`, fc(absenceDeduct), y)
  y = dotRow('Late / Undertime', fc(lateDeduct), y)

  const otherDeductions = deductions.filter((d) => !['withholding_tax', 'sss', 'philhealth', 'pagibig', 'sss_loan', 'pagibig_loan', 'cash_advance', 'company_loan', 'absence', 'late'].includes(d.type))
  if (otherDeductions.length > 0) {
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
    doc.text('Other Deductions', ML + 2, y); y += 4.5; otherDeductions.forEach((d) => { y = dotRow(d.label ?? d.type, fc(d.amount), y) })
  } else {
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
    doc.text('Other Deductions', ML + 2, y); y += 4.5; y = dotRow('\u2014', fc(0), y)
  }

  doc.setFillColor(180, 30, 30); doc.rect(ML, y - 1, MR - ML, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255)
  doc.text('TOTAL DEDUCTIONS', ML + 3, y + 4); doc.text(fc(totalDeductions), MR - 2, y + 4, { align: 'right' })
  y += 10; doc.setTextColor(30, 30, 30)

  doc.setFillColor(22, 101, 52); doc.rect(ML, y, MR - ML, 12, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255)
  doc.text('NET PAY', ML + 4, y + 8); doc.setFontSize(13); doc.text(fc(netPay), MR - 2, y + 8, { align: 'right' })
  y += 17; doc.setTextColor(30, 30, 30)

  const checkPage = (needed) => { if (y + needed > 280) { doc.addPage(); y = 14 } }

  checkPage(30); y = sectionTitle('Payment Details', y); y += 1
  y = kv('Payment Method', paymentMethod, y); y = kv('Status', paymentStatus, y)
  y = kv('Date Released', dateReleased, y); y += 2; line(ML, y, MR); y += 5

  if (loans.length > 0) {
    checkPage(30); y = sectionTitle('Loan Disclosure', y); y += 1
    loans.forEach((loan) => {
      y = kv('Loan Type', loan.type ?? '\u2014', y); y = kv('Total Loan Amount', fc(loan.total ?? 0), y)
      y = kv('Deduction This Period', fc(loan.deduction ?? 0), y); y = kv('Remaining Balance', fc(loan.balance ?? 0), y); y += 2
    }); line(ML, y, MR); y += 5
  }

  if (thirteenthAccrual > 0 || thirteenthYtd > 0) {
    checkPage(20); y = sectionTitle('13th Month Tracking', y); y += 1
    y = kv('This Period Accrual', fc(thirteenthAccrual), y); y = kv('Year-to-Date Accrual', fc(thirteenthYtd), y); y += 2; line(ML, y, MR); y += 5
  }

  checkPage(30); y = sectionTitle('Certification', y); y += 3
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60, 60, 60)
  doc.text('I acknowledge receipt of the amount stated above.', ML + 2, y); y += 10
  doc.line(ML + 2, y, ML + 70, y); doc.text('Employee Signature', ML + 2, y + 4)
  doc.line(MR - 68, y, MR, y); doc.text('Date', MR - 12, y + 4); y += 12

  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
    doc.text(`Page ${i} of ${pageCount}`, PW / 2, 292, { align: 'center' })
    doc.text('This is a system-generated payslip.', PW / 2, 296, { align: 'center' })
  }
  const safeName = employeeName.replace(/\s+/g, '_')
  doc.save(`Payslip_${safeName}_${runName.replace(/\s+/g, '_')}.pdf`)
  $q.notify({ type: 'positive', message: `Payslip downloaded for ${employeeName}` })
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const viewDetails = (record) => {
  selectedRecord.value = {
    employee: record.employee_name || record.employee, employee_id: record.employee_id,
    period: record.period, run: record.run ?? selectedRun.value?.id,
    gross_pay: record.gross_pay, net_pay: record.net_pay, breakdown: record.breakdown,
  }
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
}

// ─── Selection helpers ────────────────────────────────────────────────────────
const toggleSelectAll = () => {
  if (selectAll.value) selectAllActionable()
  else clearSelection()
}

const isEmployeeActionable = (emp) => {
  const stage = workflowStage.value
  switch (stage) {
    case 'draft':
      if (emp.status === 'draft') return true
      if (emp.status === 'ready_for_payment') return emp.review_status !== 'pending'
      return false
    case 'pending_review':
      return emp.status === 'ready_for_payment' && emp.review_status !== 'pending'
    case 'ready_for_payment':
      return emp.status === 'ready_for_payment' && emp.review_status !== 'pending'
    default:
      return false
  }
}

// ─── Employee Menu Actions (dispatched from PayrollEmployeePanel) ────────────
const onEmployeeMenuAction = (action, employee) => {
  switch (action) {
    case 'release': handleWorkflowAction(employee, 'release'); break
    case 'acknowledge': openAcknowledgeDialog(employee); break
    case 'disburse': handleWorkflowAction(employee, 'disburse'); break
    case 'markComplete': handleMarkComplete(employee); break
    case 'view': viewDetails(employee); break
    case 'download': downloadPayslip(employee); break
    case 'retry': retryEmployeeAction(employee); break
  }
}

// ─── Bulk Release ─────────────────────────────────────────────────────────────
const bulkReleaseAll = async (run) => {
  selectedRun.value = run
  payrollRunId.value = run.id
  const draftIds = payrollRunEmployees.value.filter((e) => e.status === 'draft').map((e) => e.employee_id)
  if (!draftIds.length) {
    $q.notify({ type: 'info', message: 'No draft employees to release' })
    return
  }
  $q.dialog({
    title: 'Bulk Release for Review',
    message: `Release ${draftIds.length} payslip(s) for employee review?`,
    ok: { label: 'Release', color: 'orange', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      const result = await bulkReleasePayslips(run.id, draftIds)
      $q.notify({
        type: 'positive',
        message: `Released ${result?.summary?.updated_to_pending_review ?? draftIds.length} payslip(s)!`,
      })
      await fetchPayrollRunEmployees(run.id)
      await fetchPayrollRunsSummary()
      clearSelection()
      selectAll.value = false
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Release failed' })
    }
  })
}

const handleBulkAction = async () => {
  const logId = payrollRunId.value
  if (!logId) { $q.notify({ type: 'warning', message: 'Please select a disbursement log first' }); return }
  const employeeIds = selectedEmployeeIds.value.size > 0 ? selectedEmployees.value : getActionableEmployees('draft').map((e) => e.employee_id)
  if (!employeeIds.length) { $q.notify({ type: 'info', message: 'No draft employees to release' }); return }
  $q.dialog({
    title: 'Bulk Release for Review',
    message: `Release ${employeeIds.length} payslip(s) for employee review?`,
    ok: { label: 'Release', color: 'orange', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      const result = await bulkReleasePayslips(logId, employeeIds)
      $q.notify({ type: 'positive', message: `Released ${result?.summary?.updated_to_pending_review ?? employeeIds.length} payslip(s)!` })
      await fetchPayrollRunEmployees(logId)
      await fetchPayrollRunsSummary()
      clearSelection(); selectAll.value = false
    } catch { $q.notify({ type: 'negative', message: 'Bulk release failed' }) }
  })
}

// ─── Employee Action (single) ─────────────────────────────────────────────────
const handleWorkflowAction = async (employee, action) => {
  const logId = payrollRunId.value
  if (!logId) { $q.notify({ type: 'warning', message: 'Please select a disbursement log first' }); return }
  const employeeId = employee.employee_id || employee.id
  if (action === 'release') {
    $q.dialog({
      title: 'Release for Review', message: `Release payslip for ${employee.employee_name || employee.employee}?`,
      ok: { label: 'Release', color: 'orange', unelevated: true }, cancel: { label: 'Cancel', flat: true },
    }).onOk(async () => {
      try {
        await bulkReleasePayslips(logId, [employeeId])
        $q.notify({ type: 'positive', message: `Released: ${employee.employee_name || employee.employee}` })
        await fetchPayrollRunEmployees(logId); await fetchPayrollRunsSummary(); clearSelection(); selectAll.value = false
      } catch (err) { $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Release failed' }) }
    })
    return
  }
  if (action === 'disburse') {
    if (employee.review_status === 'pending') { $q.notify({ type: 'warning', message: 'This employee is still under review and cannot be disbursed yet.' }); return }
    $q.dialog({
      title: 'Disburse', message: `Disburse payment for ${employee.employee_name || employee.employee}?`,
      ok: { label: 'Disburse', color: 'positive', unelevated: true }, cancel: { label: 'Cancel', flat: true },
    }).onOk(async () => {
      try {
        await disbursePayslips(logId, [employeeId])
        $q.notify({ type: 'positive', message: `Disbursed: ${employee.employee_name || employee.employee}` })
        await fetchPayrollRunEmployees(logId); await fetchPayrollRunsSummary(); clearSelection(); selectAll.value = false
      } catch (err) { $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Disbursement failed' }) }
    })
    return
  }
}

// ─── Confirm Money Received ───────────────────────────────────────────────────
const handleMarkComplete = (employee) => {
  const payslipId = employee.payslip_id
  if (!payslipId) { $q.notify({ type: 'warning', message: 'No payslip ID found for this employee' }); return }
  $q.dialog({
    title: 'Confirm Money Received',
    message: `Confirm that ${employee.employee_name || employee.employee} has physically received their cash payment?`,
    ok: { label: 'Confirm Received', color: 'positive', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      const result = await confirmMoneyReceived(payslipId)
      $q.notify({ type: 'positive', message: `Marked as received for ${employee.employee_name || employee.employee}.${result?.disbursement_log_closed ? ' Disbursement log is now closed.' : ''}` })
      const logId = payrollRunId.value
      if (logId) { await fetchPayrollRunEmployees(logId); await fetchPayrollRunsSummary() }
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Failed to confirm receipt.' })
    }
  })
}

// ─── Acknowledge Dialog ───────────────────────────────────────────────────────
const showAcknowledgeDialog = ref(false)
const acknowledgeTarget = ref(null)
const acknowledgeLoading = ref(false)
const acknowledgeDialogLoading = ref(false)

const openAcknowledgeDialog = async (employee) => {
  acknowledgeTarget.value = employee
  showAcknowledgeDialog.value = true
  acknowledgeDialogLoading.value = true
  try {
    const payslips = await fetchEmployeePayslips(getResolvedCompanyId())
    const full = payslips.find((p) => p.id === employee.payslip_id)
    if (full) acknowledgeTarget.value = { ...employee, ...full, payslip_id: full.id ?? employee.payslip_id }
  } catch { /* non-fatal */ }
  finally { acknowledgeDialogLoading.value = false }
}

const submitAcknowledge = async () => {
  const emp = acknowledgeTarget.value
  if (!emp?.payslip_id) return
  acknowledgeLoading.value = true
  try {
    const result = await acknowledgePayslip(emp.payslip_id, 'web')
    $q.notify({ type: 'positive', message: `Payslip acknowledged for ${emp.employee_name || emp.employee}. Status: ${result?.new_status ?? 'ready_for_payment'}.` })
    showAcknowledgeDialog.value = false; acknowledgeTarget.value = null
    const logId = payrollRunId.value
    if (logId) { await fetchPayrollRunEmployees(logId); await fetchPayrollRunsSummary() }
  } catch (err) {
    const status = err?.response?.status
    const msg = status === 403 ? 'Permission denied — this action must be completed by the employee in their own app.' : err?.response?.data?.message || 'Acknowledge failed'
    $q.notify({ type: 'negative', message: msg })
  } finally { acknowledgeLoading.value = false }
}

// ─── Bulk Disburse ────────────────────────────────────────────────────────────
const handleBulkDisburse = async () => {
  const logId = payrollRunId.value
  if (!logId) { $q.notify({ type: 'warning', message: 'Please select a disbursement log first' }); return }
  const readyIds = selectedEmployeeIds.value.size > 0
    ? payrollRunEmployees.value.filter((e) => selectedEmployeeIds.value.has(e.employee_id) && e.status === 'ready_for_payment' && e.review_status !== 'pending').map((e) => e.employee_id)
    : payrollRunEmployees.value.filter((e) => e.status === 'ready_for_payment' && e.review_status !== 'pending').map((e) => e.employee_id)
  if (!readyIds.length) { $q.notify({ type: 'warning', message: 'No employees are ready for payment' }); return }
  $q.dialog({
    title: 'Disburse Payslips',
    message: `Disburse payment for ${readyIds.length} employee(s)?`,
    ok: { label: 'Disburse', color: 'positive', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      const result = await disbursePayslips(logId, readyIds)
      const summary = result?.summary ?? {}
      $q.notify({ type: 'positive', message: `Done! Cash: ${summary.disbursed_cash ?? 0}, Bank: ${summary.completed_bank ?? 0}` })
      await fetchPayrollRunEmployees(logId); await fetchPayrollRunsSummary()
      const refreshedRun = payrollRunsSummary.value.find((r) => String(r.id) === String(logId))
      if (refreshedRun) selectedRun.value = refreshedRun
      clearSelection(); selectAll.value = false
    } catch (err) { $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Disbursement failed' }) }
  })
}

// ─── Helper Functions ─────────────────────────────────────────────────────────
const getStatusColor = (status) => {
  const colors = { draft: 'grey', pending_review: 'orange', ready_for_payment: 'teal', disbursed: 'amber', completed: 'positive' }
  return colors[status] || 'grey'
}

const getStatusLabel = (status) => {
  const labels = { draft: 'Draft', pending_review: 'Pending Review', ready_for_payment: 'Ready for Payment', disbursed: 'Disbursed', completed: 'Completed' }
  return labels[status] || status
}

const retryEmployeeAction = async (emp) => {
  const logId = payrollRunId.value
  if (!logId) return
  try {
    emp.lastError = null
    if (emp.status === 'draft') { await bulkReleasePayslips(logId, [emp.employee_id]) }
    else if (emp.status === 'ready_for_payment') { await disbursePayslips(logId, [emp.employee_id]) }
    else if (emp.status === 'disbursed' && emp.payment_method === 'cash' && emp.payslip_id) { await confirmMoneyReceived(emp.payslip_id) }
    $q.notify({ type: 'positive', message: `Retried: ${emp.employee_name || emp.employee}` })
    await fetchPayrollRunEmployees(logId)
  } catch (err) { emp.lastError = err.response?.data?.message || err.message; $q.notify({ type: 'negative', message: 'Retry failed' }) }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  const resolvedCompanyId = getResolvedCompanyId()
  if (resolvedCompanyId) {
    try { await Promise.all([fetchDepartments(), fetchCostCenters()]) }
    catch (err) { console.error('[PayrollPage] Failed to preload departments/cost centers:', err) }
  }
  try {
    await fetchPayrollRunsSummary()
    await loadAllFundingHistory()
  } catch (err) {
    console.error('[PayrollPage] Initial summary fetch failed:', err)
    $q.notify({ type: 'warning', message: 'Could not load payroll logs. The server may be busy.', timeout: 6000 })
  }
  const firstRun = payrollRunsSummary.value?.[0]
  if (firstRun && !firstRun.__optimistic) { await loadRunEmployees(firstRun) }
})

onUnmounted(() => {
  clearTimeout(searchDebounceTimer)
})
</script>

<style scoped>
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

.header-search {
  min-width: 200px;
  max-width: 260px;
  flex: 1;
}

.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

.export-btn {
  height: 36px;
  border-radius: 8px !important;
  font-weight: 500;
  font-size: 13px;
  text-transform: none;
  padding: 0 16px;
}

.tabs-section {
  background: #ffffff;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
  padding: 10px 14px;
}

.tab-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.tab-pill:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.tab-pill.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.tab-pill-icon {
  font-size: 15px;
}

.tab-panels {
  background: transparent;
}

.tab-panel-content {
  padding: 0;
}

.tab-panel-funding {
  padding: 0;
}

.table-section {
  background: #ffffff;
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
  flex-wrap: wrap;
  gap: 8px;
}

.table-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
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

.employees-panel-wrapper {
  border-left: 4px solid #3b82f6;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 20px;
  gap: 14px;
}

.text-grey-5 {
  color: #b0b8c1;
  font-size: 12px;
}

.funding-layout {
  display: grid;
  grid-template-columns: minmax(0, 400px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

@media (min-width: 1440px) {
  .dashboard-container { max-width: 1600px; padding: 20px; }
  .page-header { padding: 18px 28px; }
  .header-search { min-width: 280px; max-width: 360px; }
  .export-btn { height: 40px; padding: 0 20px; font-size: 14px; }
  .tabs-section { padding: 12px 18px; }
  .tab-pill { padding: 9px 18px; font-size: 14px; }
  .table-header { padding: 18px 24px; }
}

@media (max-width: 1024px) {
  .dashboard-container { max-width: 100%; padding: 14px; }
  .funding-layout { grid-template-columns: 1fr; }
  .header-search { min-width: 180px; max-width: 220px; }
}

@media (max-width: 768px) {
  .dashboard-container { padding: 12px; }
  .page-header { padding: 12px 14px; margin-bottom: 12px; border-radius: 10px; }
  .header-content { flex-direction: column; align-items: stretch; gap: 10px; }
  .header-left { display: flex; align-items: center; justify-content: space-between; }
  .header-actions { flex-direction: row; gap: 8px; flex-wrap: wrap; width: 100%; }
  .header-search { max-width: 100%; width: 100%; flex: 1 1 120px; min-width: 0; }
  .export-btn { flex: 1 1 auto; min-width: 0; font-size: 12px; padding: 0 10px; }
  .tabs-section { padding: 8px 10px; margin-bottom: 12px; border-radius: 10px; }
  .tab-pills { gap: 5px; }
  .tab-pill { padding: 7px 12px; font-size: 12px; flex: 1; justify-content: center; }
  .table-header { padding: 12px 14px; flex-direction: column; align-items: flex-start; gap: 6px; }
  .runs-list { padding: 10px; gap: 10px; }
}

@media (max-width: 480px) {
  .dashboard-container { padding: 8px; }
  .page-title { font-size: 18px; }
  .tab-pill span:not(.tab-badge) { display: none; }
  .tab-pill-icon { font-size: 16px; }
  .tab-pill { padding: 8px 14px; }
  .export-btn { font-size: 11px; height: 32px; }
}
</style>
