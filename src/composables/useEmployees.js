import { ref } from 'vue'
import axios from 'axios'
import { useCompany } from './useCompany'

const BASE = 'https://staging.wageyapp.com'

export function useEmployees() {
  const { companyId } = useCompany()

  const employees = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Read ─────────────────────────────────────────────────────────────────

  /** Fetch all employees for the active company. */
  async function fetchEmployees() {
    if (!companyId.value) throw new Error('Company ID not found')

    loading.value = true
    try {
      const response = await axios.get(`${BASE}/user/companies/${companyId.value}/employees/`, {
        headers: authHeaders(),
      })

      const data = normaliseList(response.data)
      employees.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  /** Fetch a single employee's full profile. */
  async function fetchEmployee(employeeId) {
    const response = await axios.get(
      `${BASE}/user/companies/${companyId.value}/employees/${employeeId}/`,
      { headers: authHeaders() },
    )
    return response.data
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  /**
   * Add a new employee.
   * @param {object} payload – matches the API body expected by /user/employees/
   */
  async function addEmployee(payload) {
    saving.value = true
    try {
      const response = await axios.post(`${BASE}/user/employees/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  /**
   * Update a user record (e.g. email / name).
   * @param {string|number} userId
   * @param {object} payload
   */
  async function updateUser(userId, payload) {
    const response = await axios.patch(`${BASE}/user/users/${userId}/`, payload, {
      headers: authHeaders(),
    })
    return response.data
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  /**
   * Update an employee record.
   * @param {string|number} employeeId
   * @param {object} payload
   */
  async function updateEmployee(employeeId, payload) {
    saving.value = true
    try {
      const response = await axios.patch(
        `${BASE}/user/companies/${companyId.value}/employees/${employeeId}/`,
        payload,
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  /** Terminate an employee. */
  async function terminateEmployee(employeeId, payload = {}) {
    const response = await axios.patch(
      `${BASE}/user/companies/${companyId.value}/employees/${employeeId}/`,
      { status: 'terminated', ...payload },
      { headers: authHeaders() },
    )
    return response.data
  }

  /** Restore a terminated employee. */
  async function restoreEmployee(employeeId, payload = {}) {
    const response = await axios.patch(
      `${BASE}/user/companies/${companyId.value}/employees/${employeeId}/`,
      { status: 'active', ...payload },
      { headers: authHeaders() },
    )
    return response.data
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function authHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  function normaliseList(raw) {
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.data)) return raw.data
    if (Array.isArray(raw?.results)) return raw.results
    if (Array.isArray(raw?.employees)) return raw.employees
    return []
  }

  return {
    // state
    employees,
    loading,
    saving,
    // methods
    fetchEmployees,
    fetchEmployee,
    addEmployee,
    updateEmployee,
    updateUser,
    terminateEmployee,
    restoreEmployee,
  }
}
