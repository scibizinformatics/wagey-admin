import { ref } from 'vue'
import axios from 'axios'
import { api } from 'src/boot/axios'
import { useCompany } from './useCompany'

const BASE = 'https://staging.wageyapp.com'

export function useOrganization() {
  const { companyId } = useCompany()

  const sites = ref([])
  const departments = ref([])
  const shiftTypes = ref([])
  const recurringSchedules = ref([])
  const costCenters = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Auth helper ──────────────────────────────────────────────────────────
  function authHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

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
      const response = await api.post(`${BASE}/organization/sites/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateSite(siteId, payload) {
    saving.value = true
    try {
      const response = await api.put(`${BASE}/organization/sites/${siteId}/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deleteSite(siteId) {
    const response = await api.delete(`${BASE}/organization/sites/${siteId}/`, {
      headers: authHeaders(),
    })
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
      const response = await api.post(`${BASE}/organization/departments/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateDepartment(deptId, payload) {
    saving.value = true
    try {
      const response = await api.put(`${BASE}/organization/departments/${deptId}/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deleteDepartment(deptId) {
    const response = await api.delete(`${BASE}/organization/departments/${deptId}/`, {
      headers: authHeaders(),
    })
    return response.data
  }

  // ─── Shift Types ──────────────────────────────────────────────────────────

  async function fetchShiftTypes() {
    loading.value = true
    try {
      const response = await axios.get(
        `${BASE}/organization/shift-types/?company=${companyId.value}`,
        { headers: authHeaders() },
      )
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
      const response = await api.post(`${BASE}/organization/shift-types/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateShiftType(shiftId, payload) {
    saving.value = true
    try {
      const response = await api.put(`${BASE}/organization/shift-types/${shiftId}/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function deleteShiftType(shiftId) {
    const response = await api.delete(`${BASE}/organization/shift-types/${shiftId}/`, {
      headers: authHeaders(),
    })
    return response.data
  }

  // ─── Recurring Schedules ──────────────────────────────────────────────────

  async function fetchRecurringSchedules() {
    loading.value = true
    try {
      const response = await axios.get(
        `${BASE}/organization/recurring-schedules/?company=${companyId.value}`,
        { headers: authHeaders() },
      )
      const data = response.data.data ?? response.data ?? []
      recurringSchedules.value = Array.isArray(data) ? data : []
      return recurringSchedules.value
    } finally {
      loading.value = false
    }
  }

  // ─── Cost Centers ─────────────────────────────────────────────────────────

  async function fetchCostCenters() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/payroll/cost-centers/`, {
        params: { company: companyId.value },
      })
      const data = response.data.data ?? response.data ?? []
      costCenters.value = Array.isArray(data) ? data : []
      return costCenters.value
    } finally {
      loading.value = false
    }
  }

  // ─── Companies ────────────────────────────────────────────────────────────

  async function fetchCompanies() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token')
    const response = await api.get(`${BASE}/organization/companies/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data.data ?? response.data ?? []
  }

  async function createCompany(formData) {
    const response = await api.post(`${BASE}/organization/companies/create/`, formData, {
      headers: authHeaders(),
    })
    return response.data
  }

  async function updateCompany(companyId, payload) {
    const response = await api.put(`${BASE}/organization/companies/${companyId}/`, payload, {
      headers: authHeaders(),
    })
    return response.data
  }

  async function deleteCompany(companyId) {
    const response = await api.delete(`${BASE}/organization/companies/${companyId}/`, {
      headers: authHeaders(),
    })
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
    createCompany,
    updateCompany,
    deleteCompany,
  }
}
