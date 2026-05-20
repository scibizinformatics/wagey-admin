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

  const clearAbortController = (key) => {
    abortControllers.delete(key)
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
    console.log('[usePayroll] fetchHoursBreakdown → request', { employeeId, period })
    const controller = getAbortController(`hoursBreakdown-${employeeId}`)
    try {
      const response = await api.get(`${BASE}/attendance/${employeeId}/hours-breakdown/`, {
        params: { period },
        headers: authHeaders(),
        signal: controller.signal,
      })
      console.log('[usePayroll] fetchHoursBreakdown ← response', response.data)
      return response.data
    } catch (err) {
      console.error('[usePayroll] fetchHoursBreakdown ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      clearAbortController(`hoursBreakdown-${employeeId}`)
    }
  }

  // ─── Allowance types ──────────────────────────────────────────────────────

  async function fetchAllowanceTypes() {
    console.log('[usePayroll] fetchAllowanceTypes → request')
    const controller = getAbortController('fetchAllowanceTypes')
    setLoading('fetchingAllowanceTypes', true)
    try {
      const response = await api.get(`${BASE}/payroll/admin/allowance-types/`, {
        headers: authHeaders(),
        signal: controller.signal,
      })
      allowanceTypes.value = response.data.data ?? response.data ?? []
      console.log('[usePayroll] fetchAllowanceTypes ← response', allowanceTypes.value)
      return allowanceTypes.value
    } catch (err) {
      console.error('[usePayroll] fetchAllowanceTypes ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingAllowanceTypes', false)
      clearAbortController('fetchAllowanceTypes')
    }
  }

  async function createAllowanceType(payload) {
    console.log('[usePayroll] createAllowanceType → request', payload)
    setSaving('creatingAllowanceType', true)
    try {
      const response = await api.post(`${BASE}/payroll/admin/allowance-types/`, payload, {
        headers: authHeaders(),
      })
      console.log('[usePayroll] createAllowanceType ← response', response.data)
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
    console.log('[usePayroll] updateAllowanceType → request', { typeId, payload })
    setSaving('updatingAllowanceType', true)
    try {
      const response = await api.put(`${BASE}/payroll/admin/allowance-types/${typeId}/`, payload, {
        headers: authHeaders(),
      })
      console.log('[usePayroll] updateAllowanceType ← response', response.data)
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
    console.log('[usePayroll] deleteAllowanceType → request', { typeId })
    setSaving('deletingAllowanceType', true)
    try {
      const response = await api.delete(`${BASE}/payroll/admin/allowance-types/${typeId}/`, {
        headers: authHeaders(),
      })
      console.log('[usePayroll] deleteAllowanceType ← response', response.data)
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
    console.log('[usePayroll] fetchContracts → request')
    const controller = getAbortController('fetchContracts')
    setLoading('fetchingContracts', true)
    try {
      const response = await api.get(`${BASE}/contracts/employee-contracts/`, {
        headers: authHeaders(),
        signal: controller.signal,
      })
      contracts.value = response.data.data ?? response.data ?? []
      console.log('[usePayroll] fetchContracts ← response', contracts.value)
      return contracts.value
    } catch (err) {
      console.error('[usePayroll] fetchContracts ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingContracts', false)
      clearAbortController('fetchContracts')
    }
  }

  async function fetchContractTypes() {
    console.log('[usePayroll] fetchContractTypes → request')
    const controller = getAbortController('fetchContractTypes')
    setLoading('fetchingContractTypes', true)
    try {
      const response = await api.get(`${BASE}/contracts/contract-types/`, {
        headers: authHeaders(),
        signal: controller.signal,
      })
      contractTypes.value = response.data.data ?? response.data ?? []
      console.log('[usePayroll] fetchContractTypes ← response', contractTypes.value)
      return contractTypes.value
    } catch (err) {
      console.error('[usePayroll] fetchContractTypes ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingContractTypes', false)
      clearAbortController('fetchContractTypes')
    }
  }

  async function createContract(payload) {
    console.log('[usePayroll] createContract → request', payload)
    setSaving('creatingContract', true)
    try {
      const response = await api.post(`${BASE}/contracts/employee-contracts/`, payload, {
        headers: authHeaders(),
      })
      console.log('[usePayroll] createContract ← response', response.data)
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
    console.log('[usePayroll] updateContract → request', { contractId, payload })
    setSaving('updatingContract', true)
    try {
      const response = await api.patch(
        `${BASE}/contracts/employee-contracts/${contractId}/`,
        payload,
        { headers: authHeaders() },
      )
      console.log('[usePayroll] updateContract ← response', response.data)
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
    console.log('[usePayroll] deleteContract → request', { contractId })
    setSaving('deletingContract', true)
    try {
      const response = await api.delete(`${BASE}/contracts/employee-contracts/${contractId}/`, {
        headers: authHeaders(),
      })
      console.log('[usePayroll] deleteContract ← response', response.data)
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

  // ─── Step 4: Bulk Release Payslips for Review ─────────────────────────────
  // PATCH /admin/payslips/bulk-release/
  // { disbursement_log_id, employee_ids }
  // → Payslip status: pending_review
  async function bulkReleasePayslips(disbursementLogId, employeeIds) {
    const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds]
    console.log('[usePayroll] Step 4 bulkReleasePayslips → request', {
      disbursementLogId,
      employee_ids: ids,
    })
    setSaving('bulkReleasing', true)
    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/payslips/bulk-release/`,
        { disbursement_log_id: disbursementLogId, employee_ids: ids },
        { headers: authHeaders() },
      )
      console.log('[usePayroll] Step 4 bulkReleasePayslips ← response', response.data)
      return response.data
    } catch (err) {
      console.error('[usePayroll] Step 4 bulkReleasePayslips ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setSaving('bulkReleasing', false)
    }
  }

  // ─── Step 5: Employee Views Payslips ─────────────────────────────────────
  // GET /employee/payslips/?company=<id>
  // Returns a list of the authenticated employee's payslips.
  const employeePayslips = ref([])

  async function fetchEmployeePayslips(companyId) {
    console.log('[usePayroll] Step 5 fetchEmployeePayslips → request', { company: companyId })
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
      console.log('[usePayroll] Step 5 fetchEmployeePayslips ← response', employeePayslips.value)
      return employeePayslips.value
    } catch (err) {
      console.error('[usePayroll] Step 5 fetchEmployeePayslips ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingEmployeePayslips', false)
      clearAbortController('fetchEmployeePayslips')
    }
  }

  // ─── Step 6: Employee Acknowledge Payslip ────────────────────────────────
  // PATCH /employee/payslips/<id>/acknowledge/
  // Header: X-Acknowledge-Source: app | web
  // → Payslip: pending_review → ready_for_payment
  //   review_status = acknowledged | payment_status = ready
  async function acknowledgePayslip(payslipId, source = 'web') {
    console.log('[usePayroll] Step 6 acknowledgePayslip → request', {
      payslipId,
      source,
      'X-Acknowledge-Source': source,
    })
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
      console.log('[usePayroll] Step 6 acknowledgePayslip ← response', response.data)
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
    console.log('[usePayroll] Step 10 confirmMoneyReceived → request', { payslipId })
    setSaving('confirmingMoneyReceived', true)
    try {
      const response = await api.patch(
        `${BASE}/employee/payslips/${payslipId}/money-received/`,
        {},
        { headers: authHeaders() },
      )
      console.log('[usePayroll] Step 10 confirmMoneyReceived ← response', response.data)
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
    console.log('[usePayroll] Step 7 addDisbursementFunding → request', payload)
    setSaving('addingFunding', true)
    try {
      const response = await api.post(`${BASE}/payroll/admin/disbursement-fundings/`, payload, {
        headers: authHeaders(),
      })
      console.log('[usePayroll] Step 7 addDisbursementFunding ← response', response.data)
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
  async function fetchDisbursementFundings(disbursementLogId) {
    console.log('[usePayroll] Step 8 fetchDisbursementFundings → request', { disbursementLogId })
    const controller = getAbortController('fetchDisbursementFundings')
    setLoading('fetchingDisbursementFundings', true)
    try {
      const response = await api.get(`${BASE}/payroll/admin/disbursement-fundings/`, {
        params: { disbursement_log_id: disbursementLogId },
        headers: authHeaders(),
        signal: controller.signal,
      })
      const result = response.data.results ?? response.data.data ?? response.data ?? []
      console.log('[usePayroll] Step 8 fetchDisbursementFundings ← response', result)
      return result
    } catch (err) {
      console.error('[usePayroll] Step 8 fetchDisbursementFundings ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingDisbursementFundings', false)
      clearAbortController('fetchDisbursementFundings')
    }
  }

  // ─── Step 9: Admin Disburse Payslips ─────────────────────────────────────
  // PATCH /admin/disburse-payslips/
  // { disbursement_log_id, employee_ids }
  // Cash → status: disbursed | Bank → status: completed
  async function disbursePayslips(disbursementLogId, employeeIds) {
    const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds]
    console.log('[usePayroll] Step 9 disbursePayslips → request', {
      disbursementLogId,
      employee_ids: ids,
    })
    setSaving('disbursing', true)
    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/disburse-payslips/`,
        { disbursement_log_id: disbursementLogId, employee_ids: ids },
        { headers: authHeaders() },
      )
      console.log('[usePayroll] Step 9 disbursePayslips ← response', response.data)
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

  // ─── Workflow: Fetch Disbursement Log Employees ───────────────────────────
  // Step 3: GET /payroll/admin/disbursement-logs/{id}/employees/
  async function fetchPayrollRunEmployees(logId, statusFilter = null) {
    console.log('[usePayroll] Step 3 fetchPayrollRunEmployees → request', { logId, statusFilter })
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

      // FIX: API returns a bare array [...] — check for that first before trying object keys.
      // Priority: root array → employees (custom key) → results (DRF pagination) → data (legacy wrapper)
      const rawData = Array.isArray(response.data)
        ? response.data
        : (response.data.employees ?? response.data.results ?? response.data.data ?? [])

      console.debug('[usePayroll] Step 3 fetchPayrollRunEmployees ← raw response shape:', {
        isArray: Array.isArray(response.data),
        resolvedCount: Array.isArray(rawData) ? rawData.length : 'not an array',
        sample: Array.isArray(rawData) ? rawData[0] : response.data,
      })

      // FIX: Normalize API field names → shape the template expects.
      // API returns:      calculated, actual_net_pay, review_status_display
      // Template expects: gross_pay,  net_pay,         status
      payrollRunEmployees.value = Array.isArray(rawData)
        ? rawData.map((emp) => ({
            ...emp,
            gross_pay: emp.gross_pay ?? emp.calculated ?? 0,
            net_pay: emp.net_pay ?? emp.actual_net_pay ?? 0,
            status: (() => {
              const raw = emp.status ?? emp.review_status_display ?? 'draft'
              const map = {
                draft: 'draft',
                pending: 'draft',
                'Pending': 'draft',
                pending_review: 'pending_review',
                'Pending Review': 'pending_review',
                ready_for_payment: 'ready_for_payment',
                'Acknowledged': 'ready_for_payment',
                disbursed: 'disbursed',
                'Disbursed': 'disbursed',
                completed: 'completed',
                'Completed': 'completed',
              }
              return map[raw] ?? raw
            })(),
          }))
        : []
      payrollRunId.value = logId
      updateWorkflowStats()
      updateWorkflowStage()
      console.log('[usePayroll] Step 3 fetchPayrollRunEmployees ← response', {
        count: payrollRunEmployees.value.length,
        workflowStage: workflowStage.value,
        workflowStats: workflowStats.value,
        employees: payrollRunEmployees.value,
      })
      return payrollRunEmployees.value
    } catch (err) {
      console.error('[usePayroll] Step 3 fetchPayrollRunEmployees ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingPayrollRunEmployees', false)
      clearAbortController('fetchPayrollRunEmployees')
    }
  }

  // ─── Workflow: Update Stats ────────────────────────────────────
  function updateWorkflowStats() {
    const employees = payrollRunEmployees.value

    // Ensure employees is an array before processing
    if (!Array.isArray(employees)) {
      workflowStats.value = {
        total: 0,
        draft: 0,
        pending_review: 0,
        ready_for_payment: 0,
        disbursed: 0,
        completed: 0,
      }
      return
    }

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

    // Ensure employees is an array
    if (!Array.isArray(employees) || employees.length === 0) {
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

    // Ensure employees is an array before filtering
    if (!Array.isArray(employees)) {
      return []
    }

    switch (currentStage) {
      case 'draft':
        // Admin can bulk-release draft payslips
        return employees.filter((e) => e.status === 'draft')
      case 'pending_review':
        // Waiting for employee to acknowledge — but those who already acknowledged
        // (ready_for_payment) can be selectively disbursed early by the admin
        return employees.filter((e) => e.status === 'ready_for_payment')
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
    console.log('[usePayroll] Step 2 fetchPayrollRunsSummary → request', { params })
    const controller = getAbortController('fetchPayrollRunsSummary')
    setLoading('fetchingPayrollRunsSummary', true)
    try {
      const response = await api.get(`${BASE}/payroll/admin/disbursement-logs/summary/`, {
        params,
        headers: authHeaders(),
        signal: controller.signal,
      })
      const raw = response.data
      console.debug('[usePayroll] Step 2 fetchPayrollRunsSummary ← raw response:', raw)
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
        merged.push(run)
      }

      payrollRunsSummary.value = merged
      console.log('[usePayroll] Step 2 fetchPayrollRunsSummary ← merged list', {
        count: merged.length,
        runs: merged,
      })
      return payrollRunsSummary.value
    } catch (err) {
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
      clearAbortController('fetchPayrollRunsSummary')
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
        console.debug(`[usePayroll] Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        attempt++
      }
    }
  }

  // ─── Custom Multipliers ───────────────────────────────────────────────────

  async function fetchCustomMultipliers(companyId) {
    console.log('[usePayroll] fetchCustomMultipliers → request', { companyId })
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
      console.log('[usePayroll] fetchCustomMultipliers ← response', customMultipliers.value)
      return customMultipliers.value
    } catch (err) {
      console.error('[usePayroll] fetchCustomMultipliers ✖ error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      throw err
    } finally {
      setLoading('fetchingCustomMultipliers', false)
      clearAbortController('fetchCustomMultipliers')
    }
  }

  async function createCustomMultipliers(payload) {
    console.log('[usePayroll] createCustomMultipliers → request', payload)
    setSaving('creatingCustomMultipliers', true)
    try {
      const response = await api.post(
        `${BASE}/payroll/admin/company-custom-multipliers/`,
        payload,
        { headers: authHeaders() },
      )
      console.log('[usePayroll] createCustomMultipliers ← response', response.data)
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
    console.log('[usePayroll] updateCustomMultipliers → request', { companyId, payload })
    setSaving('updatingCustomMultipliers', true)
    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/company-custom-multipliers/${companyId}/`,
        payload,
        { headers: authHeaders() },
      )
      console.log('[usePayroll] updateCustomMultipliers ← response', response.data)
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
    console.log('[usePayroll] Step 1 createPayrollRun → request', payload)
    setSaving('creatingPayrollRun', true)
    try {
      const response = await api.post(`${BASE}/payroll/admin/generate-payslip/`, payload, {
        headers: authHeaders(),
      })
      console.log('[usePayroll] Step 1 createPayrollRun ← response', response.data)
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
    // Workflow helpers
    fetchPayrollRunEmployees,
    updateWorkflowStats,
    updateWorkflowStage,
    getActionableEmployees,
    isStageAutoSelectable,
    isEmployeePreApproved,
    // Retry utility
    retryWithBackoff,
  }
}
