import { ref } from 'vue'
import { api } from 'src/boot/axios'
// import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function usePayroll() {
  // const { companyId } = useCompany()

  // ─── Abort controllers (per-instance — not shared across composable calls) ─
  const abortControllers = new Map()

  const getAbortController = (key) => {
    const existing = abortControllers.get(key)
    if (existing) {
      existing.abort()
      abortControllers.delete(key)
    }
    const controller = new AbortController()
    abortControllers.set(key, controller)
    return controller
  }

  const isCancelError = (err) => {
    // Axios cancels its own requests when a newer one supersedes them.
    // We should not treat these as user-facing errors.
    return (
      err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED'
    )
  }

  const clearAbortController = (key, controller = null) => {
    // Only delete if we are cleaning up the *same* controller instance.
    // This prevents a slow finally-block from wiping a newer request's controller.
    if (!controller || abortControllers.get(key) === controller) {
      abortControllers.delete(key)
    }
  }

  const allowanceTypes = ref([])
  const contracts = ref([])
  const contractTypes = ref([])
  const customMultipliers = ref(null)

  // Per-operation loading states (prevents race conditions)
  const loadingStates = ref({
    fetchingAllowanceTypes: false,
    fetchingContracts: false,
    fetchingContractTypes: false,
    fetchingPayrollRunsSummary: false,
    fetchingPayrollRunEmployees: false,
    fetchingDisbursementFundings: false,
    fetchingCustomMultipliers: false,
    // Employee-side (Step 5)
    fetchingEmployeePayslips: false,
    fetchingPayslipBreakdown: false,
  })

  // Per-operation saving states (prevents duplicate submissions)
  const savingStates = ref({
    creatingAllowanceType: false,
    updatingAllowanceType: false,
    deletingAllowanceType: false,
    creatingContract: false,
    updatingContract: false,
    deletingContract: false,
    bulkReleasing: false,
    disbursing: false,
    addingFunding: false,
    creatingPayrollRun: false,
    updatingCustomMultipliers: false,
    creatingCustomMultipliers: false,
    // Employee-side actions (Steps 5, 6, 10)
    acknowledgingPayslip: false,
    confirmingMoneyReceived: false,
  })

  // Helper functions to get/set loading states
  const setLoading = (key, value) => {
    loadingStates.value[key] = value
  }

  const setSaving = (key, value) => {
    savingStates.value[key] = value
  }

  const isLoading = (key) => loadingStates.value[key]
  const isSaving = (key) => savingStates.value[key]

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
  // Note: workflowLoading removed - using per-operation loading states instead
  const workflowStats = ref({
    total: 0,
    draft: 0,
    pending_review: 0,
    ready_for_payment: 0,
    disbursed: 0,
    completed: 0,
  })

  // ─── Hours breakdown ──────────────────────────────────────────────────────

  async function fetchHoursBreakdown(employeeId, period) {

    const controller = getAbortController(`hoursBreakdown-${employeeId}`)
    try {
      const response = await api.get(`${BASE}/attendance/${employeeId}/hours-breakdown/`, {
        params: { period },
        headers: authHeaders(),
        signal: controller.signal,
      })

      return response.data
    } catch (err) {
      if (isCancelError(err)) {
        return
      }
      console.error('[usePayroll] fetchHoursBreakdown ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      clearAbortController(`hoursBreakdown-${employeeId}`, controller)
    }
  }

  const selectedBreakdown = ref(null)
  const breakdownLoading = ref(false)

  async function fetchPayslipBreakdown(payslipId) {
    const controller = getAbortController(`payslipBreakdown-${payslipId}`)
    setLoading('fetchingPayslipBreakdown', true)
    breakdownLoading.value = true
    try {
      const response = await api.get(`${BASE}/payroll/admin/payslips/${payslipId}/breakdown/`, {
        headers: authHeaders(),
        signal: controller.signal,
      })
      selectedBreakdown.value = response.data
      return response.data
    } catch (err) {
      if (isCancelError(err)) {
        return
      }
      console.error('[usePayroll] fetchPayslipBreakdown ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingPayslipBreakdown', false)
      breakdownLoading.value = false
      clearAbortController(`payslipBreakdown-${payslipId}`, controller)
    }
  }

  // ─── Allowance types ──────────────────────────────────────────────────────

  async function fetchAllowanceTypes() {

    const controller = getAbortController('fetchAllowanceTypes')
    setLoading('fetchingAllowanceTypes', true)
    try {
      const response = await api.get(`${BASE}/payroll/admin/allowance-types/`, {
        headers: authHeaders(),
        signal: controller.signal,
      })
      allowanceTypes.value = response.data.data ?? response.data ?? []

      return allowanceTypes.value
    } catch (err) {
      if (isCancelError(err)) {
        return
      }
      console.error('[usePayroll] fetchAllowanceTypes ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingAllowanceTypes', false)
      clearAbortController('fetchAllowanceTypes', controller)
    }
  }

  async function createAllowanceType(payload) {

    setSaving('creatingAllowanceType', true)
    try {
      const response = await api.post(`${BASE}/payroll/admin/allowance-types/`, payload, {
        headers: authHeaders(),
      })

      return response.data
    } catch (err) {
      console.error('[usePayroll] createAllowanceType ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('creatingAllowanceType', false)
    }
  }

  async function updateAllowanceType(typeId, payload) {

    setSaving('updatingAllowanceType', true)
    try {
      const response = await api.put(`${BASE}/payroll/admin/allowance-types/${typeId}/`, payload, {
        headers: authHeaders(),
      })

      return response.data
    } catch (err) {
      console.error('[usePayroll] updateAllowanceType ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('updatingAllowanceType', false)
    }
  }

  async function deleteAllowanceType(typeId) {

    setSaving('deletingAllowanceType', true)
    try {
      const response = await api.delete(`${BASE}/payroll/admin/allowance-types/${typeId}/`, {
        headers: authHeaders(),
      })

      return response.data
    } catch (err) {
      console.error('[usePayroll] deleteAllowanceType ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('deletingAllowanceType', false)
    }
  }

  // ─── Employee contracts ───────────────────────────────────────────────────

  async function fetchContracts() {

    const controller = getAbortController('fetchContracts')
    setLoading('fetchingContracts', true)
    try {
      const response = await api.get(`${BASE}/contracts/employee-contracts/`, {
        headers: authHeaders(),
        signal: controller.signal,
      })
      contracts.value = response.data.data ?? response.data ?? []

      return contracts.value
    } catch (err) {
      if (isCancelError(err)) {
        return
      }
      console.error('[usePayroll] fetchContracts ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingContracts', false)
      clearAbortController('fetchContracts', controller)
    }
  }

  async function fetchContractTypes() {

    const controller = getAbortController('fetchContractTypes')
    setLoading('fetchingContractTypes', true)
    try {
      const response = await api.get(`${BASE}/contracts/contract-types/`, {
        headers: authHeaders(),
        signal: controller.signal,
      })
      contractTypes.value = response.data.data ?? response.data ?? []

      return contractTypes.value
    } catch (err) {
      if (isCancelError(err)) {
        return
      }
      console.error('[usePayroll] fetchContractTypes ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingContractTypes', false)
      clearAbortController('fetchContractTypes', controller)
    }
  }

  async function createContract(payload) {

    setSaving('creatingContract', true)
    try {
      const response = await api.post(`${BASE}/contracts/employee-contracts/`, payload, {
        headers: authHeaders(),
      })

      return response.data
    } catch (err) {
      console.error('[usePayroll] createContract ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('creatingContract', false)
    }
  }

  async function updateContract(contractId, payload) {

    setSaving('updatingContract', true)
    try {
      const response = await api.patch(
        `${BASE}/contracts/employee-contracts/${contractId}/`,
        payload,
        { headers: authHeaders() },
      )

      return response.data
    } catch (err) {
      console.error('[usePayroll] updateContract ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('updatingContract', false)
    }
  }

  async function deleteContract(contractId) {

    setSaving('deletingContract', true)
    try {
      const response = await api.delete(`${BASE}/contracts/employee-contracts/${contractId}/`, {
        headers: authHeaders(),
      })

      return response.data
    } catch (err) {
      console.error('[usePayroll] deleteContract ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('deletingContract', false)
    }
  }

  // ─── Step 4: Bulk Review Payslips ──────────────────────────────────────────
  // PATCH /admin/payslips/bulk-review/
  // { disbursement_log_id, employee_ids }
  // → Payslip status: reviewed
  async function bulkReviewPayslips(disbursementLogId, employeeIds) {
    const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds]
    setSaving('bulkReviewing', true)
    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/payslips/bulk-review/`,
        { disbursement_log_id: disbursementLogId, employee_ids: ids },
        { headers: authHeaders() },
      )

      return response.data
    } catch (err) {
      console.error('[usePayroll] Step 4 bulkReviewPayslips ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('bulkReviewing', false)
    }
  }

  // ─── Step 5: Employee Views Payslips ─────────────────────────────────────
  // GET /employee/payslips/?company=<id>
  // Returns a list of the authenticated employee's payslips.
  const employeePayslips = ref([])

  async function fetchEmployeePayslips(companyId) {

    const controller = getAbortController('fetchEmployeePayslips')
    setLoading('fetchingEmployeePayslips', true)
    try {
      const params = {}
      if (companyId) params.company = companyId
      const response = await api.get(`${BASE}/employee/payslips/`, {
        params,
        headers: authHeaders(),
        signal: controller.signal,
      })
      const raw = response.data
      employeePayslips.value = raw?.results ?? raw?.data ?? raw ?? []

      return employeePayslips.value
    } catch (err) {
      if (isCancelError(err)) {
        return
      }
      console.error('[usePayroll] Step 5 fetchEmployeePayslips ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingEmployeePayslips', false)
      clearAbortController('fetchEmployeePayslips', controller)
    }
  }

  // ─── Step 6: Employee Acknowledge Payslip ────────────────────────────────
  // PATCH /employee/payslips/<id>/acknowledge/
  // Header: X-Acknowledge-Source: app | web
  // → Payslip: pending_review → ready_for_payment
  //   review_status = acknowledged | payment_status = ready
  async function acknowledgePayslip(payslipId, source = 'web') {
    setSaving('acknowledgingPayslip', true)
    try {
      const response = await api.patch(
        `${BASE}/employee/payslips/${payslipId}/acknowledge/`,
        {},
        {
          headers: {
            ...authHeaders(),
            'X-Acknowledge-Source': source,
          },
        },
      )

      return response.data
    } catch (err) {
      console.error('[usePayroll] Step 6 acknowledgePayslip ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('acknowledgingPayslip', false)
    }
  }

  // ─── Step 10: Employee Confirm Money Received (cash only) ─────────────────
  // PATCH /employee/payslips/<id>/money-received/
  // Guard: status=disbursed AND payment_status=ready
  // → Payslip: completed | payment_status = complete
  async function confirmMoneyReceived(payslipId) {

    setSaving('confirmingMoneyReceived', true)
    try {
      const response = await api.patch(
        `${BASE}/employee/payslips/${payslipId}/money-received/`,
        {},
        { headers: authHeaders() },
      )

      return response.data
    } catch (err) {
      console.error('[usePayroll] Step 10 confirmMoneyReceived ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('confirmingMoneyReceived', false)
    }
  }

  // ─── Step 7: Add Disbursement Funding ────────────────────────────────────
  // POST /admin/disbursement-fundings/
  async function addDisbursementFunding(payload) {

    setSaving('addingFunding', true)
    try {
      const response = await api.post(`${BASE}/payroll/admin/disbursement-fundings/`, payload, {
        headers: authHeaders(),
      })

      return response.data
    } catch (err) {
      console.error('[usePayroll] Step 7 addDisbursementFunding ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('addingFunding', false)
    }
  }

  // ─── Step 8: List Fundings for a Disbursement Log ────────────────────────
  // GET /admin/disbursement-fundings/?disbursement_log_id=123
  // If disbursementLogId is omitted, returns all fundings.
  async function fetchDisbursementFundings(disbursementLogId = null) {

    const controller = getAbortController('fetchDisbursementFundings')
    setLoading('fetchingDisbursementFundings', true)
    try {
      const params = {}
      if (disbursementLogId) {
        params.disbursement_log_id = disbursementLogId
      }
      const response = await api.get(`${BASE}/payroll/admin/disbursement-fundings/`, {
        params,
        headers: authHeaders(),
        signal: controller.signal,
      })
      const result = response.data.results ?? response.data.data ?? response.data ?? []

      return result
    } catch (err) {
      if (isCancelError(err)) {
        return
      }
      console.error('[usePayroll] Step 8 fetchDisbursementFundings ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingDisbursementFundings', false)
      clearAbortController('fetchDisbursementFundings', controller)
    }
  }

  // ─── Step 9: Admin Disburse Payslips ─────────────────────────────────────
  // PATCH /admin/disburse-payslips/
  // { disbursement_log_id, employee_ids }
  // Cash → status: disbursed | Bank → status: completed
  async function disbursePayslips(disbursementLogId, employeeIds) {
    const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds]
    setSaving('disbursing', true)
    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/disburse-payslips/`,
        { disbursement_log_id: disbursementLogId, employee_ids: ids },
        { headers: authHeaders() },
      )

      return response.data
    } catch (err) {
      console.error('[usePayroll] Step 9 disbursePayslips ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('disbursing', false)
    }
  }

  // ─── Admin: Fetch Issues ────────────────────────────────────────────────────
  // GET /payroll/admin/issues/all/?company=&status=&disbursement_log_id=
  async function fetchIssues(params = {}) {
    try {
      const response = await api.get(`${BASE}/payroll/admin/issues/all/`, {
        params,
        headers: authHeaders(),
      })
      return response.data ?? []
    } catch (err) {
      console.error('[usePayroll] fetchIssues ✖ error', {
        status: err?.response?.status,
        message: err?.message,
      })
      return []
    }
  }

  // ─── Admin: Resolve Issue ─────────────────────────────────────────────────
  // PATCH /payroll/admin/payslips/{id}/resolve/
  // { admin_notes }
  async function resolveIssue(payslipId, adminNotes = '') {
    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/payslips/${payslipId}/resolve/`,
        { admin_notes: adminNotes },
        { headers: authHeaders() },
      )
      return response.data
    } catch (err) {
      console.error('[usePayroll] resolveIssue ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    }
  }

  // ─── Admin: Reject Issue ──────────────────────────────────────────────────
  // PATCH /payroll/admin/payslips/{id}/reject/
  // { admin_notes }
  async function rejectIssue(payslipId, adminNotes = '') {
    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/payslips/${payslipId}/reject/`,
        { admin_notes: adminNotes },
        { headers: authHeaders() },
      )
      return response.data
    } catch (err) {
      console.error('[usePayroll] rejectIssue ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    }
  }

  // ─── Workflow: Fetch Disbursement Log Employees ───────────────────────────
  // Step 3: GET /payroll/admin/disbursement-logs/{id}/employees/
  async function fetchPayrollRunEmployees(logId, statusFilter = null) {

    const controller = getAbortController('fetchPayrollRunEmployees')
    setLoading('fetchingPayrollRunEmployees', true)
    try {
      const params = {}
      if (statusFilter) {
        // Pass array as comma-joined string so the backend receives ?status=draft,pending_review
        params.status = Array.isArray(statusFilter) ? statusFilter.join(',') : statusFilter
      }

      const response = await api.get(
        `${BASE}/payroll/admin/disbursement-logs/${logId}/employees/`,
        {
          params,
          headers: authHeaders(),
          signal: controller.signal,
        },
      )

      // FIX: API now returns an object wrapper: { disbursement_log_id, employees: [...], calculated_amount, total_net_pay, funded, ... }
      // Also support legacy bare array for backward compatibility.
      const responseData = Array.isArray(response.data) ? { employees: response.data } : (response.data ?? {})
      const rawData = responseData.employees ?? responseData.results ?? responseData.data ?? []

      // ─── Patch parent metadata into the matching run summary ───────────────────
      // The employee endpoint carries the canonical run-level financials and counts.
      const runIndex = payrollRunsSummary.value.findIndex((r) => String(r.id) === String(logId))
      if (runIndex !== -1) {
        const patched = { ...payrollRunsSummary.value[runIndex] }
        if (responseData.calculated_amount !== undefined) patched.calculated_amount = responseData.calculated_amount
        if (responseData.total_net_pay !== undefined) patched.total_net_pay = responseData.total_net_pay
        if (responseData.funded !== undefined) patched.funded = responseData.funded
        // New count fields from employee endpoint wrapper
        if (responseData.total_employees !== undefined) patched.total_employees = responseData.total_employees
        if (responseData.acknowledged_employees !== undefined) patched.acknowledged_employees = responseData.acknowledged_employees
        if (responseData.pending_review_employees !== undefined) patched.pending_review_employees = responseData.pending_review_employees
        if (responseData.reviewed_employees !== undefined) patched.reviewed_employees = responseData.reviewed_employees
        if (responseData.disputed_employees !== undefined) patched.disputed_employees = responseData.disputed_employees
        if (responseData.pending_issues_count !== undefined) patched.pending_issues_count = responseData.pending_issues_count
        payrollRunsSummary.value[runIndex] = patched
      }

      // FIX: Normalize API field names → shape the template expects.
      // New payload: payslip_status, net_pay
      // Supported statuses: Pending Review, Reviewed, Disputed, Acknowledged,
      // Ready for Payment, Funded, Completed
      payrollRunEmployees.value = Array.isArray(rawData)
        ? rawData.map((emp) => {
            const raw = emp.payslip_status ?? emp.status ?? emp.review_status_display ?? 'pending_review'
            const map = {
              'Pending Review': 'pending_review',
              pending_review: 'pending_review',
              Reviewed: 'reviewed',
              reviewed: 'reviewed',
              Disputed: 'disputed',
              disputed: 'disputed',
              Acknowledged: 'ready_for_payment',
              ready_for_payment: 'ready_for_payment',
              'Ready for Payment': 'ready_for_payment',
              Funded: 'funded',
              funded: 'funded',
              Completed: 'completed',
              completed: 'completed',
            }
            const normalized = map[raw] ?? raw

            return {
              ...emp,
              gross_pay: emp.gross_pay ?? emp.calculated ?? 0,
              net_pay: emp.net_pay ?? emp.actual_net_pay ?? 0,
              status: normalized,
            }
          })
        : []
      payrollRunId.value = logId
      updateWorkflowStats()
      updateWorkflowStage()
      return payrollRunEmployees.value
    } catch (err) {
      if (isCancelError(err)) {
        return
      }
      console.error('[usePayroll] Step 3 fetchPayrollRunEmployees ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingPayrollRunEmployees', false)
      clearAbortController('fetchPayrollRunEmployees', controller)
    }
  }

  // ─── Workflow: Update Stats ────────────────────────────────────
  function updateWorkflowStats() {
    const employees = payrollRunEmployees.value

    if (!Array.isArray(employees)) {
      workflowStats.value = {
        total: 0,
        pending_review: 0,
        reviewed: 0,
        disputed: 0,
        ready_for_payment: 0,
        funded: 0,
        completed: 0,
      }
      return
    }

    const statusCounts = {
      pending_review: 0,
      reviewed: 0,
      disputed: 0,
      ready_for_payment: 0,
      funded: 0,
      completed: 0,
    }

    employees.forEach((emp) => {
      const status = emp.status || 'pending_review'
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
  //  pending_review    → admin can bulk-review
  //  reviewed          → waiting for funding
  //  ready_for_payment → waiting for funding (legacy/acknowledged)
  //  funded            → admin can mark complete
  //  completed         → done
  function updateWorkflowStage() {
    const employees = payrollRunEmployees.value

    if (!Array.isArray(employees) || employees.length === 0) {
      workflowStage.value = 'pending_review'
      return
    }

    const anyHaveStatus = (statuses) => employees.some((e) => statuses.includes(e.status))

    if (anyHaveStatus(['completed'])) {
      workflowStage.value = 'completed'
    } else if (anyHaveStatus(['funded'])) {
      workflowStage.value = 'funded'
    } else if (anyHaveStatus(['ready_for_payment'])) {
      workflowStage.value = 'ready_for_payment'
    } else if (anyHaveStatus(['reviewed'])) {
      workflowStage.value = 'reviewed'
    } else {
      workflowStage.value = 'pending_review'
    }
  }

  // ─── Workflow: Get Actionable Employees ────────────────────────
  // Backend handles all status validation; frontend returns all employees
  // so the admin can select any and the backend will reject invalid ones.
  function getActionableEmployees() {
    const employees = payrollRunEmployees.value
    return Array.isArray(employees) ? employees : []
  }

  // ─── Workflow: Check if stage has auto-selection behavior ──────
  // pending_review: only truly-pending employees are locked/auto-shown;
  // ready_for_payment employees within that stage are now selectable for early disbursal.
  function isStageAutoSelectable() {
    return false // no longer fully auto-selectable; per-employee logic handles locking
  }

  // ─── Workflow: Check if employee is in pre-approved state ───────
  function isEmployeePreApproved() {
    return false // superseded by per-row checkbox logic in PayrollPage
  }

  // ─── Disbursement Logs Summary ────────────────────────────────────────────
  // Step 2: GET /admin/disbursement-logs/summary/?company_id=1
  const payrollRunsSummary = ref([])

  async function fetchPayrollRunsSummary(params = {}) {

    const controller = getAbortController('fetchPayrollRunsSummary')
    setLoading('fetchingPayrollRunsSummary', true)
    try {
      const response = await api.get(`${BASE}/payroll/admin/disbursement-logs/summary/`, {
        params,
        headers: authHeaders(),
        signal: controller.signal,
      })
      const raw = response.data

      const extracted = raw?.results ?? raw?.data ?? raw ?? []
      const backendList = Array.isArray(extracted) ? extracted : []

      // ─── Smart merge: preserve optimistic runs until backend confirms them ─────
      const backendMap = new Map(backendList.map((r) => [r.id, r]))
      const merged = []

      // 1. Keep existing optimistic runs that haven't been confirmed yet
      for (const existing of payrollRunsSummary.value) {
        if (existing.__optimistic && !backendMap.has(existing.id)) {
          merged.push(existing)
        }
      }

      // 2. Add/replace with real backend data (optimistic runs get superseded)
      for (const run of backendList) {
        const existing = payrollRunsSummary.value.find((r) => String(r.id) === String(run.id))
        const normalizedRun = {
          ...existing, // preserve fields like department_id, __optimistic flags
          ...run, // backend data overrides
          department_id: run.department_id ?? existing?.department_id ?? null,
        }
        // Normalize backend status so a fully-finished run shows as "Completed"
        if (normalizedRun.status === 'closed') {
          normalizedRun.status = 'completed'
        }
        merged.push(normalizedRun)
      }

      payrollRunsSummary.value = merged
      return payrollRunsSummary.value
    } catch (err) {
      if (isCancelError(err)) {
        return payrollRunsSummary.value
      }
      console.error('[usePayroll] Step 2 fetchPayrollRunsSummary ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      // ─── On 502 or any error, DO NOT wipe the list ────────────────────────────
      // Preserve optimistic runs so the UI doesn't flicker empty while the
      // backend recovers from a heavy POST operation.
      throw err
    } finally {
      setLoading('fetchingPayrollRunsSummary', false)
      clearAbortController('fetchPayrollRunsSummary', controller)
    }
  }

  // ─── Fetch cost-center bank accounts for a disbursement log ────────────────
  // GET /payroll/admin/disbursement-logs/{id}/cost-center-bank-accounts/
  // Response: { count: 2, bank_accounts: [{ id, name }, ...] }
  async function fetchDisbursementLogBankAccounts(logId) {

    try {
      const response = await api.get(
        `${BASE}/payroll/admin/disbursement-logs/${logId}/cost-center-bank-accounts/`,
        { headers: authHeaders() },
      )
      // API returns { count, bank_accounts: [...] }
      const result = response.data.bank_accounts ?? response.data.data?.bank_accounts ?? []

      return Array.isArray(result) ? result : []
    } catch (err) {
      console.error('[usePayroll] fetchDisbursementLogBankAccounts ✖ error', {
        status: err?.response?.status,
        message: err?.message,
      })
      return []
    }
  }

  // ─── Retry helper with exponential backoff ──────────────────────────────────
  async function retryWithBackoff(fn, { maxAttempts = 4, baseDelay = 5000 } = {}) {
    let attempt = 0
    while (attempt < maxAttempts) {
      try {
        return await fn()
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err
        const delay = baseDelay * Math.pow(2, attempt) // 5s, 10s, 20s, 40s

        await new Promise((resolve) => setTimeout(resolve, delay))
        attempt++
      }
    }
  }

  // ─── Custom Multipliers ───────────────────────────────────────────────────

  async function fetchCustomMultipliers(companyId) {

    const controller = getAbortController('fetchCustomMultipliers')
    setLoading('fetchingCustomMultipliers', true)
    try {
      const response = await api.get(`${BASE}/payroll/admin/company-custom-multipliers/`, {
        params: { company: companyId },
        headers: authHeaders(),
        signal: controller.signal,
      })
      const data = response.data.data ?? response.data ?? []
      customMultipliers.value = Array.isArray(data) ? (data[0] ?? null) : data

      return customMultipliers.value
    } catch (err) {
      if (isCancelError(err)) {
        return
      }
      console.error('[usePayroll] fetchCustomMultipliers ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingCustomMultipliers', false)
      clearAbortController('fetchCustomMultipliers', controller)
    }
  }

  async function createCustomMultipliers(payload) {

    setSaving('creatingCustomMultipliers', true)
    try {
      const response = await api.post(
        `${BASE}/payroll/admin/company-custom-multipliers/`,
        payload,
        { headers: authHeaders() },
      )

      return response.data
    } catch (err) {
      console.error('[usePayroll] createCustomMultipliers ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('creatingCustomMultipliers', false)
    }
  }

  async function updateCustomMultipliers(companyId, payload) {

    setSaving('updatingCustomMultipliers', true)
    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/company-custom-multipliers/${companyId}/`,
        payload,
        { headers: authHeaders() },
      )

      return response.data
    } catch (err) {
      console.error('[usePayroll] updateCustomMultipliers ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('updatingCustomMultipliers', false)
    }
  }

  // ─── Cost Centers (commented out) ────────────────────────────

  // ─── Step 1: Generate Payslips ────────────────────────────────
  // POST /admin/generate-payslip/
  // { company_id, department_id, start_date, end_date, type }
  // Returns: { success, message, disbursement_log_id, generated_count }
  async function createPayrollRun(payload) {

    setSaving('creatingPayrollRun', true)
    try {
      const response = await api.post(`${BASE}/payroll/admin/generate-payslip/`, payload, {
        headers: authHeaders(),
      })

      return response.data
    } catch (err) {
      console.error('[usePayroll] Step 1 createPayrollRun ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('creatingPayrollRun', false)
    }
  }

  return {
    // state
    allowanceTypes,
    contracts,
    contractTypes,
    customMultipliers,
    // Per-operation loading/saving states
    loadingStates,
    savingStates,
    isLoading,
    isSaving,
    // workflow state
    payrollRunId,
    workflowStage,
    payrollRunEmployees,
    workflowStats,
    // disbursement logs summary (replaces payroll-runs/summary)
    payrollRunsSummary,
    fetchPayrollRunsSummary,
    // hours
    fetchHoursBreakdown,
    // payslip breakdown
    selectedBreakdown,
    breakdownLoading,
    fetchPayslipBreakdown,
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
    // Step 4: bulk review payslips
    bulkReviewPayslips,
    // Step 5: employee view payslips
    employeePayslips,
    fetchEmployeePayslips,
    // Step 6: employee acknowledge payslip
    acknowledgePayslip,
    // Step 7: add funding to a disbursement log
    addDisbursementFunding,
    // Step 8: list fundings for a log
    fetchDisbursementFundings,
    // Step 9: disburse (cash → disbursed, bank → completed)
    disbursePayslips,
    // Step 10: employee confirm money received (cash only)
    confirmMoneyReceived,
    // Issue management
    fetchIssues,
    resolveIssue,
    rejectIssue,
    // Workflow helpers
    fetchPayrollRunEmployees,
    updateWorkflowStats,
    updateWorkflowStage,
    getActionableEmployees,
    isStageAutoSelectable,
    isEmployeePreApproved,
    // Cost-center bank accounts by log
    fetchDisbursementLogBankAccounts,
    // Retry utility
    retryWithBackoff,
  }
}
