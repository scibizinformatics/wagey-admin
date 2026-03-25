import { ref } from 'vue'
import axios from 'axios'
import { useCompany } from './useCompany'

const BASE = 'https://staging.wageyapp.com'

export function useSchedule() {
  const { companyId } = useCompany()

  const schedules = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Auth helper ──────────────────────────────────────────────────────────
  function authHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // ─── Monthly schedule grid ────────────────────────────────────────────────

  /**
   * Fetch company monthly schedule.
   * @param {object} [params] - Extra query params e.g. { year, month }
   */
  async function fetchMonthlySchedules(params = {}) {
    loading.value = true
    try {
      const response = await axios.get(`${BASE}/organization/schedules/company/monthly/`, {
        params: { company: companyId.value, ...params },
        headers: authHeaders(),
      })
      const data = response.data.data ?? response.data ?? []
      schedules.value = Array.isArray(data) ? data : []
      return schedules.value
    } finally {
      loading.value = false
    }
  }

  // ─── Assignments ──────────────────────────────────────────────────────────

  /**
   * Assign a shift to one or more employees.
   * @param {object} payload
   */
  async function assignShift(payload) {
    saving.value = true
    try {
      const response = await axios.post(`${BASE}/organization/assignments/assign/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } catch (error) {
      console.error('assignShift error:', error.response?.data)
      throw error
    } finally {
      saving.value = false
    }
  }

  /**
   * Reassign (patch) an existing assignment.
   * @param {object} payload
   */
  async function reassignShift(payload) {
    saving.value = true
    try {
      const response = await axios.patch(`${BASE}/organization/assignments/reassign/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  /**
   * Cancel an assignment by its ID.
   * @param {string|number} assignmentId
   */
  async function cancelAssignment(assignmentId) {
    const response = await axios.patch(
      `${BASE}/organization/assignments/${assignmentId}/cancel/`,
      { status: 'cancelled' },
      { headers: authHeaders() },
    )
    return response.data
  }

  // ─── Day-offs ─────────────────────────────────────────────────────────────

  /**
   * Assign a day-off.
   * @param {{ employee_id: string, company_id: number, date: string, site_id: number }} payload
   */
  async function assignDayOff(payload) {
    saving.value = true
    try {
      console.log('assignDayOff payload:', JSON.stringify(payload, null, 2))
      const response = await axios.patch(`${BASE}/organization/assignments/assign-off/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } catch (error) {
      console.error('assignDayOff 400 response:', JSON.stringify(error.response?.data, null, 2))
      throw error
    } finally {
      saving.value = false
    }
  }

  // ─── Leave ────────────────────────────────────────────────────────────────

  /**
   * Apply leave on behalf of an employee (admin action).
   * @param {object} payload
   */
  async function applyLeaveForEmployee(payload) {
    saving.value = true
    try {
      const response = await axios.post(`${BASE}/attendance/leave/apply-for-employee/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  /**
   * Fetch leave types for the company.
   */
  async function fetchLeaveTypes() {
    const response = await axios.get(`${BASE}/attendance/leave-types/?company=${companyId.value}`, {
      headers: authHeaders(),
    })
    return response.data.data ?? response.data ?? []
  }

  /**
   * Delete a leave record.
   * @param {string|number} leaveId
   */
  async function deleteLeave(leaveId) {
    const response = await axios.delete(`${BASE}/attendance/leaves/${leaveId}/`, {
      headers: authHeaders(),
    })
    return response.data
  }

  return {
    // state
    schedules,
    loading,
    saving,
    // methods
    fetchMonthlySchedules,
    assignShift,
    reassignShift,
    cancelAssignment,
    assignDayOff,
    applyLeaveForEmployee,
    fetchLeaveTypes,
    deleteLeave,
  }
}
