import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { BASE } from 'src/composables/utils/http'

export function useDeductions() {
  const annualContributions = ref([])
  const employeeContributions = ref([])
  const departmentContributions = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAnnualContributions(companyId, year) {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`${BASE}/payroll/annual-contributions/${companyId}/${year}/`)
      annualContributions.value = response.data ?? []
      return annualContributions.value
    } catch (err) {
      console.error('[useDeductions] fetchAnnualContributions error:', err)
      annualContributions.value = []
      error.value = err?.response?.statusText || err?.message || 'Server error'
    } finally {
      loading.value = false
    }
  }

  async function fetchEmployeeContributions(companyId, year, month) {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`${BASE}/payroll/employee-contributions/${companyId}/${year}/${month}/`)
      employeeContributions.value = response.data ?? []
      return employeeContributions.value
    } catch (err) {
      console.error('[useDeductions] fetchEmployeeContributions error:', err)
      employeeContributions.value = []
      error.value = err?.response?.statusText || err?.message || 'Server error'
    } finally {
      loading.value = false
    }
  }

  async function fetchDepartmentContributions(companyId, year, month) {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`${BASE}/payroll/department-contributions/${companyId}/${year}/${month}/`)
      departmentContributions.value = response.data ?? []
      return departmentContributions.value
    } catch (err) {
      console.error('[useDeductions] fetchDepartmentContributions error:', err)
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
