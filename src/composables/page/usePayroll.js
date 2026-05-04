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
  const workflowStage = ref('draft') // draft | admin_approved | owner_approved | released | acknowledged | funded | disbursed
  const payrollRunEmployees = ref([])
  const workflowLoading = ref(false)
  const workflowStats = ref({
    total: 0,
    adminApproved: 0,
    ownerApproved: 0,
    released: 0,
    acknowledged: 0,
    funded: false,
    cashDisbursed: 0,
    bankDisbursed: 0,
    completed: 0,
  })

  // ─── Payslips ─────────────────────────────────────────────────────────────

  /**
   * Fetch payslips. When a selectedCompany is provided it uses the admin endpoint.
   * @param {string|null} selectedCompany
   * @param {object} [params]
   */
  async function fetchPayslips(payrollRunId = null, params = {}) {
    if (!payrollRunId) return []
    loading.value = true
    try {
      const response = await api.get(
        `${BASE}/payroll/admin/payroll-runs/${payrollRunId}/employees/`,
        { params, headers: authHeaders() },
      )
      payslips.value = response.data.data ?? response.data ?? []
      return payslips.value
    } finally {
      loading.value = false
    }
  }

  // ─── Hours breakdown ──────────────────────────────────────────────────────

  /**
   * Fetch an employee's hours breakdown for a given period.
   * @param {string} employeeId
   * @param {string} period – e.g. '2025-07'
   */
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

  // ─── Workflow: Approve by Admin ─────────────────────────────────
  async function approveByAdmin(payrollRunId, employeeIds) {
    saving.value = true
    console.group('🔧 approveByAdmin API Call')
    console.log('URL:', `${BASE}/payroll/admin/payslips/${payrollRunId}/approve-by-admin/`)
    console.log('Method: PATCH')
    console.log('Payload:', {
      employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds],
    })

    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/payslips/${payrollRunId}/approve-by-admin/`,
        { employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds] },
      )
      console.log('✅ Success:', response.data)
      console.groupEnd()
      return response.data
    } catch (error) {
      console.error('❌ Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      })
      console.groupEnd()
      throw error
    } finally {
      saving.value = false
    }
  }

  // ─── Workflow: Approve by Owner ─────────────────────────────────
  async function approveByOwner(payrollRunId, employeeIds) {
    saving.value = true
    console.group('🔧 approveByOwner API Call')
    console.log('URL:', `${BASE}/payroll/admin/payslips/${payrollRunId}/approve-by-owner/`)
    console.log('Method: PATCH')
    console.log('Payload:', {
      employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds],
    })

    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/payslips/${payrollRunId}/approve-by-owner/`,
        { employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds] },
      )
      console.log('✅ Success:', response.data)
      console.groupEnd()
      return response.data
    } catch (error) {
      console.error('❌ Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      })
      console.groupEnd()
      throw error
    } finally {
      saving.value = false
    }
  }

  // ─── Workflow: Release Payslip ─────────────────────────────────
  async function releasePayslip(payrollRunId, employeeIds) {
    saving.value = true
    console.group('🔧 releasePayslip API Call')
    console.log('URL:', `${BASE}/payroll/admin/payslips/${payrollRunId}/release/`)
    console.log('Method: PATCH')
    console.log('Payload:', {
      employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds],
    })

    try {
      const response = await api.patch(`${BASE}/payroll/admin/payslips/${payrollRunId}/release/`, {
        employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds],
      })
      console.log('✅ Success:', response.data)
      console.groupEnd()
      return response.data
    } catch (error) {
      console.error('❌ Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      })
      console.groupEnd()
      throw error
    } finally {
      saving.value = false
    }
  }

  // ─── Workflow: Fund Payroll ────────────────────────────────────
  async function fundPayroll(payrollRunId) {
    saving.value = true
    console.group('🔧 fundPayroll API Call')
    console.log('URL:', `${BASE}/payroll/admin/payslips/${payrollRunId}/fund/`)
    console.log('Method: PATCH')
    console.log('Payload: {}')

    try {
      const response = await api.patch(`${BASE}/payroll/admin/payslips/${payrollRunId}/fund/`, {})
      console.log('✅ Success:', response.data)
      console.groupEnd()
      return response.data
    } catch (error) {
      console.error('❌ Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      })
      console.groupEnd()
      throw error
    } finally {
      saving.value = false
    }
  }

  // ─── Workflow: Cash Disbursement ───────────────────────────────
  async function cashDisbursement(payrollRunId, employeeIds) {
    saving.value = true
    console.group('🔧 cashDisbursement API Call')
    console.log('URL:', `${BASE}/payroll/admin/payslips/${payrollRunId}/cash-disbursement/`)
    console.log('Method: PATCH')
    console.log('Payload:', {
      employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds],
    })

    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/payslips/${payrollRunId}/cash-disbursement/`,
        { employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds] },
      )
      console.log('✅ Success:', response.data)
      console.groupEnd()
      return response.data
    } catch (error) {
      console.error('❌ Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      })
      console.groupEnd()
      throw error
    } finally {
      saving.value = false
    }
  }

  // ─── Workflow: Bank Transfer ───────────────────────────────────
  async function bankTransfer(payrollRunId, employeeIds) {
    saving.value = true
    console.group('🔧 bankTransfer API Call')
    console.log('URL:', `${BASE}/payroll/admin/payslips/${payrollRunId}/bank-transfer/`)
    console.log('Method: PATCH')
    console.log('Payload:', {
      employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds],
    })

    try {
      const response = await api.patch(
        `${BASE}/payroll/admin/payslips/${payrollRunId}/bank-transfer/`,
        { employee_ids: Array.isArray(employeeIds) ? employeeIds : [employeeIds] },
      )
      console.log('✅ Success:', response.data)
      console.groupEnd()
      return response.data
    } catch (error) {
      console.error('❌ Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      })
      console.groupEnd()
      throw error
    } finally {
      saving.value = false
    }
  }

  // ─── Workflow: Fetch Payroll Run Employees ─────────────────────
  async function fetchPayrollRunEmployees(runId, statusFilter = null) {
    workflowLoading.value = true
    console.group('🔧 fetchPayrollRunEmployees API Call')
    console.log('URL:', `${BASE}/payroll/admin/payroll-runs/${runId}/employees/`)
    console.log('Method: GET')

    try {
      const params = {}
      if (statusFilter) {
        if (typeof statusFilter === 'string') {
          params.status = statusFilter
        } else if (Array.isArray(statusFilter)) {
          params.status = statusFilter
        }
      }

      const response = await api.get(`${BASE}/payroll/admin/payroll-runs/${runId}/employees/`, {
        params,
      })

      console.log('✅ Success:', response.data)
      console.groupEnd()

      payrollRunEmployees.value =
        response.data.employees ?? response.data.data ?? response.data ?? []
      payrollRunId.value = runId
      updateWorkflowStats()
      updateWorkflowStage()
      return payrollRunEmployees.value
    } catch (error) {
      console.error('❌ Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      })
      console.groupEnd()
      throw error
    } finally {
      workflowLoading.value = false
    }
  }

  // ─── Workflow: Update Stats ────────────────────────────────────
  function updateWorkflowStats() {
    const employees = payrollRunEmployees.value

    // Count by status
    const statusCounts = {
      draft: 0,
      approved_admin: 0,
      approved_owner: 0,
      released: 0,
      acknowledged: 0,
      funded: 0,
      cash_disbursed: 0,
      bank_disbursed: 0,
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
      // Legacy compatibility (for UI)
      adminApproved: statusCounts.approved_admin,
      ownerApproved: statusCounts.approved_owner,
      released: statusCounts.released,
      acknowledged: statusCounts.acknowledged,
      funded: statusCounts.funded,
      cashDisbursed: statusCounts.cash_disbursed,
      bankDisbursed: statusCounts.bank_disbursed,
      completed: statusCounts.completed,
    }
  }

  // ─── Workflow: Update Stage ────────────────────────────────────
  function updateWorkflowStage() {
    const employees = payrollRunEmployees.value

    if (employees.length === 0) {
      workflowStage.value = 'draft'
      return
    }

    const allHaveStatus = (statuses) => employees.every((e) => statuses.includes(e.status))

    if (allHaveStatus(['completed'])) {
      workflowStage.value = 'completed'
    } else if (allHaveStatus(['cash_disbursed', 'bank_disbursed', 'completed'])) {
      workflowStage.value = 'disbursed'
    } else if (allHaveStatus(['funded', 'cash_disbursed', 'bank_disbursed', 'completed'])) {
      workflowStage.value = 'funded'
    } else if (
      allHaveStatus(['acknowledged', 'funded', 'cash_disbursed', 'bank_disbursed', 'completed'])
    ) {
      workflowStage.value = 'acknowledged'
    } else if (
      allHaveStatus([
        'released',
        'acknowledged',
        'funded',
        'cash_disbursed',
        'bank_disbursed',
        'completed',
      ])
    ) {
      workflowStage.value = 'released'
    } else if (
      allHaveStatus([
        'approved_owner',
        'released',
        'acknowledged',
        'funded',
        'cash_disbursed',
        'bank_disbursed',
        'completed',
      ])
    ) {
      workflowStage.value = 'owner_approved'
    } else if (
      allHaveStatus([
        'approved_admin',
        'approved_owner',
        'released',
        'acknowledged',
        'funded',
        'cash_disbursed',
        'bank_disbursed',
        'completed',
      ])
    ) {
      workflowStage.value = 'admin_approved'
    } else {
      workflowStage.value = 'draft'
    }
  }

  // ─── Workflow: Check if stage has auto-selection behavior ──────
  function isStageAutoSelectable(currentStage) {
    return ['released', 'acknowledged', 'funded'].includes(currentStage)
  }

  // ─── Workflow: Check if employee is in pre-approved state ───────
  function isEmployeePreApproved(emp, currentStage) {
    if (!isStageAutoSelectable(currentStage)) return false

    // In released/acknowledged/funded stages, employees with these statuses
    // are considered pre-approved for earlier stages
    const preApprovedStatuses = [
      'released',
      'acknowledged',
      'funded',
      'cash_disbursed',
      'bank_disbursed',
      'completed',
    ]
    return preApprovedStatuses.includes(emp.status)
  }

  // ─── Workflow: Get Actionable Employees ────────────────────────
  function getActionableEmployees(currentStage) {
    const employees = payrollRunEmployees.value

    switch (currentStage) {
      case 'draft':
        // Employees still in draft — need admin approval
        return employees.filter((e) => e.status === 'draft')
      case 'admin_approved':
        // Admin approved, waiting for owner approval
        return employees.filter((e) => e.status === 'approved_admin')
      case 'owner_approved':
        // Owner approved, waiting to be released
        return employees.filter((e) => e.status === 'approved_owner')
      case 'released':
      case 'acknowledged':
        // All employees are auto-selected (locked in) for visual indication
        // Return all employees in pre-approved state
        return employees.filter((e) =>
          ['released', 'acknowledged', 'funded', 'cash_disbursed', 'bank_disbursed', 'completed'].includes(
            e.status,
          ),
        )
      case 'funded':
        // Funded — need disbursement method selected per employee
        return employees.filter((e) => e.status === 'funded')
      default:
        return []
    }
  }

  // ─── Workflow: Can Fund Payroll ────────────────────────────────
  function canFundPayroll() {
    const employees = payrollRunEmployees.value
    if (employees.length === 0) return false
    // ALL employees must be acknowledged before funding
    return employees.every((e) =>
      ['acknowledged', 'funded', 'cash_disbursed', 'bank_disbursed', 'completed'].includes(
        e.status,
      ),
    )
  }

  // ─── Payroll Runs Summary ─────────────────────────────────────────────────
  const payrollRunsSummary = ref([])

  async function fetchPayrollRunsSummary(params = {}) {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/payroll/admin/payroll-runs/summary/`, {
        params,
        headers: authHeaders(),
      })
      payrollRunsSummary.value = response.data.data ?? response.data ?? []
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
    // payroll runs summary
    payrollRunsSummary,
    fetchPayrollRunsSummary,
    // payslips
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
    // workflow methods
    approveByAdmin,
    approveByOwner,
    releasePayslip,
    fundPayroll,
    cashDisbursement,
    bankTransfer,
    fetchPayrollRunEmployees,
    updateWorkflowStats,
    updateWorkflowStage,
    getActionableEmployees,
    canFundPayroll,
    // auto-selection helpers
    isStageAutoSelectable,
    isEmployeePreApproved,
  }
}
