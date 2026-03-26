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
   * @param {object} [params] - Extra query params e.g. { start_date: '2026-03-01', end_date: '2026-03-15' }
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

  /**
   * Fetch schedules for a specific date range. Faster than fetching a full month.
   * @param {string} startDate - YYYY-MM-DD e.g. '2026-03-24'
   * @param {string} endDate   - YYYY-MM-DD e.g. '2026-03-30'
   * @param {object} [params]  - Extra query params
   */
  async function fetchScheduleByDateRange(startDate, endDate, params = {}) {
    loading.value = true
    try {
      const response = await axios.get(`${BASE}/organization/schedules/company/monthly/`, {
        params: { company: companyId.value, start_date: startDate, end_date: endDate, ...params },
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
   * Assign a one-time shift to one or more employees.
   * Payload: { company_id, employee_ids, schedules: [{ date, site_id, shift_type_id }] }
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
      const response = await axios.patch(`${BASE}/organization/assignments/assign-off/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } catch (error) {
      console.error('assignDayOff error:', error.response?.data)
      throw error
    } finally {
      saving.value = false
    }
  }

  // ─── Leave ────────────────────────────────────────────────────────────────

  /**
   * Apply leave on behalf of an employee (admin action).
   * Status is always set to 'approved' since this is an admin-initiated action.
   * @param {object} payload - { employee_id, leave_type, start_date, end_date, hours, reason, company_id }
   */
  async function applyLeaveForEmployee(payload) {
    saving.value = true
    try {
      const response = await axios.post(
        `${BASE}/attendance/leave/apply-for-employee/`,
        { ...payload, status: 'approved' },
        { headers: authHeaders() },
      )
      return response.data
    } catch (error) {
      console.error('applyLeaveForEmployee error:', error.response?.data)
      throw error
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
    fetchScheduleByDateRange,
    assignShift,
    reassignShift,
    cancelAssignment,
    assignDayOff,
    applyLeaveForEmployee,
    fetchLeaveTypes,
    deleteLeave,
  }
}
