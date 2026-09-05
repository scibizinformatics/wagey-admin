import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'

export function useOrganization() {
  const { companyId } = useCompany()

  const sites = ref([])
  const departments = ref([])
  const shiftTypes = ref([])
  const recurringSchedules = ref([])
  const costCenters = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Sites ────────────────────────────────────────────────────────────────

  async function fetchSites() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/sites/`, {
        params: { company: companyId.value },
      })
      const data = response.data.data ?? response.data ?? []
      sites.value = Array.isArray(data) ? data : []
      return sites.value
    } finally {
      loading.value = false
    }
  }

  async function createSite(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/organization/sites/`, payload)
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateSite(siteId, payload) {
    saving.value = true
    try {
      const response = await api.put(`${BASE}/organization/sites/${siteId}/`, payload)
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deleteSite(siteId) {
    const response = await api.delete(`${BASE}/organization/sites/${siteId}/`)
    return response.data
  }

  // ─── Departments ──────────────────────────────────────────────────────────

  async function fetchDepartments() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/departments/`, {
        params: { company: companyId.value },
      })
      const data = response.data.data ?? response.data ?? []
      departments.value = Array.isArray(data) ? data : []
      return departments.value
    } finally {
      loading.value = false
    }
  }

  async function createDepartment(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/organization/departments/`, payload)
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateDepartment(deptId, payload) {
    saving.value = true
    try {
      const response = await api.put(`${BASE}/organization/departments/${deptId}/`, payload)
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deleteDepartment(deptId) {
    const response = await api.delete(`${BASE}/organization/departments/${deptId}/`)
    return response.data
  }

  // ─── Shift Types ──────────────────────────────────────────────────────────
  // Previously used raw axios — now unified to api instance.

  async function fetchShiftTypes() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/shift-types/`, {
        params: { company: companyId.value },
      })
      const data = response.data.data ?? response.data ?? []
      shiftTypes.value = Array.isArray(data) ? data : []
      return shiftTypes.value
    } finally {
      loading.value = false
    }
  }

  async function createShiftType(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/organization/shift-types/`, payload)
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateShiftType(shiftId, payload) {
    saving.value = true
    try {
      const response = await api.put(`${BASE}/organization/shift-types/${shiftId}/`, payload)
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deleteShiftType(shiftId) {
    const response = await api.delete(`${BASE}/organization/shift-types/${shiftId}/`)
    return response.data
  }

  // ─── Recurring Schedules ──────────────────────────────────────────────────
  // Previously used raw axios — now unified to api instance.

  async function fetchRecurringSchedules() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/recurring-schedules/`, {
        params: { company: companyId.value },
      })
      const data = response.data.data ?? response.data ?? []
      recurringSchedules.value = Array.isArray(data) ? data : []
      return recurringSchedules.value
    } finally {
      loading.value = false
    }
  }

  // ─── Cost Centers ─────────────────────────────────────────────────────────

  async function fetchCostCenters(overrideCompanyId = null) {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/payroll/cost-centers/`, {
        params: { company: overrideCompanyId ?? companyId.value },
      })
      const data = response.data.data ?? response.data ?? []
      costCenters.value = Array.isArray(data) ? data : []
      return costCenters.value
    } finally {
      loading.value = false
    }
  }

  // ─── Companies ────────────────────────────────────────────────────────────

  /**
   * Fetch companies for the authenticated user.
   * @returns {Promise<Array<{id:number|string,name:string,logo:string|null,country:string,country_name:string}>>}
   */
  async function fetchCompanies() {
    try {
      const response = await api.get(`${BASE}/organization/companies/`)
      return response.data.data ?? response.data ?? []
    } catch (error) {
      console.error('[fetchCompanies] failed:', error)
      throw error
    }
  }

  async function fetchCurrentUserCompanies() {
    try {
      const response = await api.get(`${BASE}/user/current-user-companies/`)
      return response.data.data ?? response.data ?? []
    } catch (error) {
      console.error('[fetchCurrentUserCompanies] failed:', error)
      throw error
    }
  }

  async function createCompany(formData) {
    const response = await api.post(`${BASE}/organization/companies/create/`, formData)
    return response.data
  }

  async function updateCompany(id, payload) {
    const response = await api.put(`${BASE}/organization/companies/${id}/`, payload)
    return response.data
  }

  async function deleteCompany(id) {
    const response = await api.delete(`${BASE}/organization/companies/${id}/`)
    return response.data
  }

  return {
    // state
    sites,
    departments,
    shiftTypes,
    recurringSchedules,
    costCenters,
    loading,
    saving,
    // sites
    fetchSites,
    createSite,
    updateSite,
    deleteSite,
    // departments
    fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    // shift types
    fetchShiftTypes,
    createShiftType,
    updateShiftType,
    deleteShiftType,
    // recurring schedules
    fetchRecurringSchedules,
    // cost centers
    fetchCostCenters,
    // companies
    fetchCompanies,
    fetchCurrentUserCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
  }
}
