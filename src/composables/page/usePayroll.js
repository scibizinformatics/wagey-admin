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
  const loading = ref(false)
  const saving = ref(false)

  // ─── Payslips ─────────────────────────────────────────────────────────────

  /**
   * Fetch payslips. When a selectedCompany is provided it uses the admin endpoint.
   * @param {string|null} selectedCompany
   * @param {object} [params]
   */
  async function fetchPayslips(selectedCompany = null, params = {}) {
    loading.value = true
    try {
      const url = selectedCompany
        ? `${BASE}/payroll/admin/${selectedCompany}/payslips/`
        : `${BASE}/payroll/`

      const response = await api.get(url, {
        params,
        headers: authHeaders(),
      })
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
      const response = await api.get(`${BASE}/user/contracts/`, {
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

  return {
    // state
    payslips,
    allowanceTypes,
    contracts,
    contractTypes,
    loading,
    saving,
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
  }
}
