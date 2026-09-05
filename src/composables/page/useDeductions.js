import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { BASE } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'

export function useDeductions() {
  const annualContributions = ref([])
  const employeeContributions = ref([])
  const departmentContributions = ref([])
  const loading = ref(false)
  const error = ref(null)

  // One guard per published set, not one shared across all three: the year and
  // the month are separate controls and the three summaries are independent, so
  // changing the month must not invalidate an annual fetch still in the air.
  // Within a set, the cutoff selector can be changed faster than the endpoint
  // answers, and the older response landing last would show one period's
  // figures under another period's heading.
  const annualGuard = createRequestToken()
  const employeeGuard = createRequestToken()
  const departmentGuard = createRequestToken()

  async function fetchAnnualContributions(companyId, year) {
    loading.value = true
    error.value = null
    const token = annualGuard.next()
    try {
      const response = await api.get(`${BASE}/payroll/annual-contributions/${companyId}/${year}/`)
      const rows = response.data ?? []
      // Superseded by a newer request: return the rows, publish nothing.
      if (!annualGuard.isCurrent(token)) return rows
      annualContributions.value = rows
      return annualContributions.value
    } catch (err) {
      console.error('[useDeductions] fetchAnnualContributions error:', err)
      if (!annualGuard.isCurrent(token)) return []
      annualContributions.value = []
      error.value = err?.response?.statusText || err?.message || 'Server error'
    } finally {
      loading.value = false
    }
  }

  async function fetchEmployeeContributions(companyId, year, month) {
    loading.value = true
    error.value = null
    const token = employeeGuard.next()
    try {
      const response = await api.get(`${BASE}/payroll/employee-contributions/${companyId}/${year}/${month}/`)
      const rows = response.data ?? []
      // Superseded by a newer request: return the rows, publish nothing.
      if (!employeeGuard.isCurrent(token)) return rows
      employeeContributions.value = rows
      return employeeContributions.value
    } catch (err) {
      console.error('[useDeductions] fetchEmployeeContributions error:', err)
      if (!employeeGuard.isCurrent(token)) return []
      employeeContributions.value = []
      error.value = err?.response?.statusText || err?.message || 'Server error'
    } finally {
      loading.value = false
    }
  }

  async function fetchDepartmentContributions(companyId, year, month) {
    loading.value = true
    error.value = null
    const token = departmentGuard.next()
    try {
      const response = await api.get(`${BASE}/payroll/department-contributions/${companyId}/${year}/${month}/`)
      const rows = response.data ?? []
      // Superseded by a newer request: return the rows, publish nothing.
      if (!departmentGuard.isCurrent(token)) return rows
      departmentContributions.value = rows
      return departmentContributions.value
    } catch (err) {
      console.error('[useDeductions] fetchDepartmentContributions error:', err)
      if (!departmentGuard.isCurrent(token)) return []
      departmentContributions.value = []
      error.value = err?.response?.statusText || err?.message || 'Server error'
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    annualContributions,
    employeeContributions,
    departmentContributions,
    loading,
    error,
    clearError,
    fetchAnnualContributions,
    fetchEmployeeContributions,
    fetchDepartmentContributions,
  }
}
