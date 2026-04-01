import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from './useCompany'

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
      const response = await api.get(`/user/companies/${companyId.value}/employees/`)
      const data = normaliseList(response.data)
      employees.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  /** Fetch a single employee's full profile. */
  async function fetchEmployee(employeeId) {
    const response = await api.get(`/user/companies/${companyId.value}/employees/${employeeId}/`)
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
      const response = await api.post(`/user/employees/`, payload)
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
    const response = await api.patch(`/user/users/${userId}/`, payload)
    return response.data
  }

  /**
   * Upload or update an employee's profile picture.
   * Mirrors updateProfilePicture() — uses the employee endpoint with FormData.
   * @param {string|number} employeeId – the employee record ID (not user ID)
   * @param {File} file – must be an image, max 5MB
   */
  async function uploadEmployeeAvatar(employeeId, file) {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please select an image.')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image must be less than 5MB')
    }

    const formData = new FormData()
    formData.append('picture', file)

    // ✅ Correct endpoint — mirrors updateProfilePicture() from userApi.js
    // ✅ No Content-Type header — Axios auto-sets multipart/form-data with boundary
    const response = await api.patch(
      `/user/companies/${companyId.value}/employees/${employeeId}/`,
      formData,
    )

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
      const response = await api.patch(
        `/user/companies/${companyId.value}/employees/${employeeId}/`,
        payload,
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  /** Terminate an employee. */
  async function terminateEmployee(employeeId, payload = {}) {
    const response = await api.patch(
      `/user/companies/${companyId.value}/employees/${employeeId}/`,
      { status: 'terminated', ...payload },
    )
    return response.data
  }

  /** Restore a terminated employee. */
  async function restoreEmployee(employeeId, payload = {}) {
    const response = await api.patch(
      `/user/companies/${companyId.value}/employees/${employeeId}/`,
      { status: 'active', ...payload },
    )
    return response.data
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
    uploadEmployeeAvatar,
    terminateEmployee,
    restoreEmployee,
  }
}
