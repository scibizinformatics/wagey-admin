import { ref } from 'vue'
import { api } from 'src/boot/axios'
// import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function usePayroll() {
  // const { companyId } = useCompany()

  const payslips = ref([])
  const allowanceTypes = ref([])
  const contracts = ref([])
  const contractTypes = ref([])
  const customMultipliers = ref(null)
  const loading = ref(false)
  const saving = ref(false)

  // ─── Workflow State ────────────────────────────────────────────────
  const payrollRunId = ref(null)
  /**
   * New simplified workflow stages:
   *   draft → pending_review → ready_for_payment → disbursed/completed
   *
   * "draft"            – payslips just generated, not yet bulk-released
   * "pending_review"   – bulk-released; employees can view & acknowledge
   * "ready_for_payment"– all employees acknowledged; can be disbursed
   * "disbursed"        – cash disbursed (waiting for employee money-received)
   * "completed"        – all payslips completed
   */
  const workflowStage = ref('draft')
  const payrollRunEmployees = ref([])
  const workflowLoading = ref(false)
  const workflowStats = ref({
    total: 0,
    draft: 0,
    pending_review: 0,
    ready_for_payment: 0,
    disbursed: 0,
    completed: 0,
  })

  // ─── Payslips ─────────────────────────────────────────────────────────────

  async function fetchPayslips(logId = null, params = {}) {
    if (!logId) return []
    loading.value = true
    try {
      const response = await api.get(`${BASE}/admin/disbursement-logs/${logId}/employees/`, {
        params,
        headers: authHeaders(),
      })
      payslips.value = response.data.employees ?? response.data.data ?? response.data ?? []
      return payslips.value
    } finally {
      loading.value = false
    }
  }

  // ─── Hours breakdown ──────────────────────────────────────────────────────

  async function fetchHoursBreakdown(employeeId, period) {
    const response = await api.get(`${BASE}/attendance/${employeeId}/hours-breakdown/`, {
      params: { period },
      headers: authHeaders(),
    })
    return response.data
  }

  // ─── Allowance types ──────────────────────────────────────────────────────

  async function fetchAllowanceTypes() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/payroll/admin/allowance-types/`, {
        headers: authHeaders(),
      })
      allowanceTypes.value = response.data.data ?? response.data ?? []
      return allowanceTypes.value
    } finally {
      loading.value = false
    }
  }

  async function createAllowanceType(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/payroll/admin/allowance-types/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateAllowanceType(typeId, payload) {
    saving.value = true
    try {
      const response = await api.put(`${BASE}/payroll/admin/allowance-types/${typeId}/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deleteAllowanceType(typeId) {
    const response = await api.delete(`${BASE}/payroll/admin/allowance-types/${typeId}/`, {
      headers: authHeaders(),
    })
    return response.data
  }

  // ─── Employee contracts ───────────────────────────────────────────────────

  async function fetchContracts() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/contracts/employee-contracts/`, {
        headers: authHeaders(),
      })
      contracts.value = response.data.data ?? response.data ?? []
      return contracts.value
    } finally {
      loading.value = false
    }
  }

  async function fetchContractTypes() {
    const response = await api.get(`${BASE}/contracts/contract-types/`, {
      headers: authHeaders(),
    })
    contractTypes.value = response.data.data ?? response.data ?? []
    return contractTypes.value
  }

  async function createContract(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/contracts/employee-contracts/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateContract(contractId, payload) {
    saving.value = true
    try {
      const response = await api.patch(
        `${BASE}/contracts/employee-contracts/${contractId}/`,
        payload,
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deleteContract(contractId) {
    const response = await api.delete(`${BASE}/contracts/employee-contracts/${contractId}/`, {
      headers: authHeaders(),
    })
    return response.data
  }

  // ─── Step 4: Bulk Release Payslips for Review ─────────────────────────────
  // POST /admin/payslips/bulk-release/
  // { disbursement_log_id, employee_ids }
  // → Payslip status: pending_review
  async function bulkReleasePayslips(disbursementLogId, employeeIds) {
    saving.value = true
    const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds]
    try {
      const response = await api.patch(
        `${BASE}/admin/payslips/bulk-release/`,
        { disbursement_log_id: disbursementLogId, employee_ids: ids },
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Step 7: Add Disbursement Funding ────────────────────────────────────
  // POST /admin/disbursement-fundings/
  async function addDisbursementFunding(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/admin/disbursement-fundings/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Step 8: List Fundings for a Disbursement Log ────────────────────────
  // GET /admin/disbursement-fundings/?disbursement_log_id=123
  async function fetchDisbursementFundings(disbursementLogId) {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/admin/disbursement-fundings/`, {
        params: { disbursement_log_id: disbursementLogId },
        headers: authHeaders(),
      })
      return response.data.results ?? response.data.data ?? response.data ?? []
    } finally {
      loading.value = false
    }
  }

  // ─── Step 9: Admin Disburse Payslips ─────────────────────────────────────
  // PATCH /admin/disburse-payslips/
  // { disbursement_log_id, employee_ids }
  // Cash → status: disbursed | Bank → status: completed
  async function disbursePayslips(disbursementLogId, employeeIds) {
    saving.value = true
    const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds]
    try {
      const response = await api.patch(
        `${BASE}/admin/disburse-payslips/`,
        { disbursement_log_id: disbursementLogId, employee_ids: ids },
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Workflow: Fetch Disbursement Log Employees ───────────────────────────
  // Step 3: GET /admin/disbursement-logs/{id}/employees/
  async function fetchPayrollRunEmployees(logId, statusFilter = null) {
    workflowLoading.value = true
    try {
      const params = {}
      if (statusFilter) {
        params.status = Array.isArray(statusFilter) ? statusFilter : statusFilter
      }

      const response = await api.get(`${BASE}/admin/disbursement-logs/${logId}/employees/`, {
        params,
        headers: authHeaders(),
      })

      payrollRunEmployees.value =
        response.data.employees ?? response.data.data ?? response.data ?? []
      payrollRunId.value = logId
      updateWorkflowStats()
      updateWorkflowStage()
      return payrollRunEmployees.value
    } finally {
      workflowLoading.value = false
    }
  }

  // ─── Workflow: Update Stats ────────────────────────────────────
  function updateWorkflowStats() {
    const employees = payrollRunEmployees.value

    const statusCounts = {
      draft: 0,
      pending_review: 0,
      ready_for_payment: 0,
      disbursed: 0,
      completed: 0,
    }

    employees.forEach((emp) => {
      const status = emp.status || 'draft'
      if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
        statusCounts[status]++
      }
    })

    workflowStats.value = {
      total: employees.length,
      ...statusCounts,
    }
  }

  // ─── Workflow: Update Stage ────────────────────────────────────
  // Maps employee statuses → a single UI workflow stage for showing
  // the correct action buttons.
  //
  //  draft             → admin can bulk-release
  //  pending_review    → waiting for employees to acknowledge (read-only for admin)
  //  ready_for_payment → admin can disburse (after funding)
  //  disbursed         → cash employees waiting to confirm money received
  //  completed         → done
  function updateWorkflowStage() {
    const employees = payrollRunEmployees.value

    if (employees.length === 0) {
      workflowStage.value = 'draft'
      return
    }

    const allHaveStatus = (statuses) => employees.every((e) => statuses.includes(e.status))

    if (allHaveStatus(['completed'])) {
      workflowStage.value = 'completed'
    } else if (allHaveStatus(['disbursed', 'completed'])) {
      workflowStage.value = 'disbursed'
    } else if (allHaveStatus(['ready_for_payment', 'disbursed', 'completed'])) {
      workflowStage.value = 'ready_for_payment'
    } else if (allHaveStatus(['pending_review', 'ready_for_payment', 'disbursed', 'completed'])) {
      workflowStage.value = 'pending_review'
    } else {
      workflowStage.value = 'draft'
    }
  }

  // ─── Workflow: Get Actionable Employees ────────────────────────
  function getActionableEmployees(currentStage) {
    const employees = payrollRunEmployees.value

    switch (currentStage) {
      case 'draft':
        // Admin can bulk-release draft payslips
        return employees.filter((e) => e.status === 'draft')
      case 'pending_review':
        // Waiting for employee to acknowledge — read-only for admin
        return employees.filter((e) => e.status === 'pending_review')
      case 'ready_for_payment':
        // Acknowledged by employee — admin can disburse
        return employees.filter((e) => e.status === 'ready_for_payment')
      case 'disbursed':
        // Cash disbursed — waiting for employee to confirm money received
        return employees.filter((e) => e.status === 'disbursed')
      default:
        return []
    }
  }

  // ─── Workflow: Check if stage has auto-selection behavior ──────
  // In pending_review, employees are auto-selected (read-only display)
  function isStageAutoSelectable(currentStage) {
    return currentStage === 'pending_review'
  }

  // ─── Workflow: Check if employee is in pre-approved state ───────
  function isEmployeePreApproved(emp, currentStage) {
    if (!isStageAutoSelectable(currentStage)) return false
    return ['pending_review', 'ready_for_payment', 'disbursed', 'completed'].includes(emp.status)
  }

  // ─── Disbursement Logs Summary ────────────────────────────────────────────
  // Step 2: GET /admin/disbursement-logs/summary/?company_id=1
  const payrollRunsSummary = ref([])

  async function fetchPayrollRunsSummary(params = {}) {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/admin/disbursement-logs/summary/`, {
        params,
        headers: authHeaders(),
      })
      payrollRunsSummary.value = response.data.results ?? response.data.data ?? response.data ?? []
      return payrollRunsSummary.value
    } finally {
      loading.value = false
    }
  }

  // ─── Custom Multipliers ───────────────────────────────────────────────────

  async function fetchCustomMultipliers(companyId) {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/payroll/admin/company-custom-multipliers/`, {
        params: { company: companyId },
        headers: authHeaders(),
      })
      const data = response.data.data ?? response.data ?? []
      customMultipliers.value = Array.isArray(data) ? (data[0] ?? null) : data
      return customMultipliers.value
    } finally {
      loading.value = false
    }
  }

  async function createCustomMultipliers(payload) {
    saving.value = true
    try {
      const response = await api.post(
        `${BASE}/payroll/admin/company-custom-multipliers/`,
        payload,
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateCustomMultipliers(companyId, payload) {
    saving.value = true
    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/company-custom-multipliers/${companyId}/`,
        payload,
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Cost Centers ─────────────────────────────────────────────
  // const costCenters = ref([])

  // async function fetchCostCenters(companyId) {
  // if (!companyId) return []
  //oading.value = true
  // try {
  // const response = await api.get(`${BASE}/payroll/cost-centers/`, {
  // params: { company: companyId },
  //headers: authHeaders(),
  // })
  //costCenters.value = response.data.data ?? response.data ?? []
  //return costCenters.value
  //} finally {
  loading.value = false
  //}
  //}

  // ─── Step 1: Generate Payslips ────────────────────────────────
  // POST /admin/generate-payslip/
  // { company_id, department_id, start_date, end_date, type }
  // Returns: { success, message, disbursement_log_id, generated_count }
  async function createPayrollRun(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/admin/generate-payslip/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  return {
    // state
    payslips,
    allowanceTypes,
    contracts,
    contractTypes,
    customMultipliers,
    loading,
    saving,
    // workflow state
    payrollRunId,
    workflowStage,
    payrollRunEmployees,
    workflowLoading,
    workflowStats,
    // disbursement logs summary (replaces payroll-runs/summary)
    payrollRunsSummary,
    fetchPayrollRunsSummary,
    // payslips / employees
    fetchPayslips,
    // hours
    fetchHoursBreakdown,
    // allowance types
    fetchAllowanceTypes,
    createAllowanceType,
    updateAllowanceType,
    deleteAllowanceType,
    // contracts
    fetchContracts,
    fetchContractTypes,
    createContract,
    updateContract,
    deleteContract,
    // custom multipliers
    fetchCustomMultipliers,
    createCustomMultipliers,
    updateCustomMultipliers,
    // Step 1: generate payslips + create disbursement log
    createPayrollRun,
    // Step 4: bulk release for employee review
    bulkReleasePayslips,
    // Step 7: add funding to a disbursement log
    addDisbursementFunding,
    // Step 8: list fundings for a log
    fetchDisbursementFundings,
    // Step 9: disburse (cash → disbursed, bank → completed)
    disbursePayslips,
    // Workflow helpers
    fetchPayrollRunEmployees,
    updateWorkflowStats,
    updateWorkflowStage,
    getActionableEmployees,
    isStageAutoSelectable,
    isEmployeePreApproved,
  }
}
