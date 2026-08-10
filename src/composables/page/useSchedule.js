import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function useSchedule() {
  const { companyId } = useCompany()

  const schedules = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const schedulePagination = ref({
    page: 1,
    page_size: 20,
    count: 0,
    next: null,
    previous: null,
  })

  // ─── Monthly schedule grid ────────────────────────────────────────────────

  /**
   * Fetch company monthly schedule.
   * @param {object} [params] - Extra query params e.g. { start_date: '2026-03-01', end_date: '2026-03-15' }
   */
  async function fetchMonthlySchedules(params = {}) {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/schedules/company/monthly/`, {
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
   * Fetch schedules for a specific date range.
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate   - YYYY-MM-DD
   * @param {object} [params]  - Extra query params
   */
  async function fetchScheduleByDateRange(startDate, endDate, params = {}) {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/schedules/company/monthly/`, {
        params: { company: companyId.value, start_date: startDate, end_date: endDate, ...params },
        headers: authHeaders(),
      })
      const data = response.data ?? {}
      schedules.value = Array.isArray(data.results) ? data.results : []
      schedulePagination.value = {
        page: params.page || 1,
        page_size: params.page_size || 20,
        count: data.count || 0,
        next: data.next || null,
        previous: data.previous || null,
      }
      return schedules.value
    } finally {
      loading.value = false
    }
  }

  // ─── Assignments ──────────────────────────────────────────────────────────

  /**
   * Assign a one-time shift to one or more employees.
   * @param {object} payload
   */
  async function assignShift(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/organization/assignments/assign/`, payload, {
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
      const response = await api.patch(`${BASE}/organization/assignments/reassign/`, payload, {
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
    const response = await api.patch(
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
      const response = await api.patch(`${BASE}/organization/assignments/assign-off/`, payload, {
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
   * @param {object} payload - { employee_id, leave_type, start_date, end_date, hours, reason, company_id }
   */
  async function applyLeaveForEmployee(payload) {
    saving.value = true
    try {
      const response = await api.post(
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

  /** Fetch leave types for the company. */
  async function fetchLeaveTypes() {
    const response = await api.get(`${BASE}/attendance/leave-types/`, {
      params: { company: companyId.value },
      headers: authHeaders(),
    })
    return response.data.data ?? response.data ?? []
  }

  /**
   * Delete a leave record.
   * @param {string|number} leaveId
   */
  async function deleteLeave(leaveId) {
    const response = await api.delete(`${BASE}/attendance/leaves/${leaveId}/`, {
      headers: authHeaders(),
    })
    return response.data
  }

  /** Fetch shift type templates for the company. */
  async function fetchShiftTemplates() {
    const response = await api.get(`${BASE}/organization/shift-type-templates-list/`, {
      params: { company: companyId.value },
      headers: authHeaders(),
    })
    return response.data.data ?? response.data ?? []
  }

  /**
   * Fetch employees for a specific payroll group and site.
   * @param {number|string} companyId
   * @param {number|string} payrollGroupId
   * @param {number|string} siteId
   */
  async function fetchEmployeesByPayrollSite(companyId, payrollGroupId, siteId) {
    const response = await api.get(
      `${BASE}/user/companies/${companyId}/employees/by-payroll-site/${payrollGroupId}/${siteId}/`,
      { headers: authHeaders() },
    )
    return response.data ?? []
  }

  /**
   * Auto-assign recurring (rotating) schedules.
   * @param {object} payload
   */
  async function autoAssignRecurring(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/organization/auto-assign-recurring/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } catch (error) {
      console.error('autoAssignRecurring error:', error.response?.data)
      throw error
    } finally {
      saving.value = false
    }
  }

  /**
   * Fetch schedules for a single employee in a date range.
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate   - YYYY-MM-DD
   * @param {string|number} employeeId
   */
  async function fetchEmployeeSchedule(startDate, endDate, employeeId) {
    const response = await api.get(`${BASE}/organization/schedules/company/monthly/`, {
      params: {
        company: companyId.value,
        start_date: startDate,
        end_date: endDate,
        employee_id: employeeId,
        page_size: 100,
      },
      headers: authHeaders(),
    })
    return response.data ?? {}
  }

  /**
   * Assign employees to a recurring schedule by expanding the template rules
   * into individual dated entries and posting to the existing /assign/ endpoint.
   *
   * @param {{
   *   company_id: number,
   *   employee_ids: string[],
   *   recurring_id: number,
   *   start_date: string,   // YYYY-MM-DD
   *   end_date: string,     // YYYY-MM-DD
   *   rules: Array<{ weekday: string, shift_type?: number, shift_template?: number }>
   * }} payload
   */
  async function assignRecurringSchedule(payload) {
    saving.value = true
    try {
      const { company_id, employee_ids, recurring_id, start_date, end_date, rules } = payload

      // Map weekday names to JS getDay() values (0 = Sunday … 6 = Saturday)
      const WEEKDAY_MAP = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      }

      const start = new Date(start_date + 'T00:00:00')
      const end = new Date(end_date + 'T00:00:00')

      // Expand every rule across the full date range
      const schedules = []
      for (const rule of rules) {
        const targetDay = WEEKDAY_MAP[rule.weekday?.toLowerCase()]
        if (targetDay === undefined) continue

        const cursor = new Date(start)
        // Advance cursor to the first occurrence of this weekday on or after start
        const diff = (targetDay - cursor.getDay() + 7) % 7
        cursor.setDate(cursor.getDate() + diff)

        while (cursor <= end) {
          const dateStr =
            `${cursor.getFullYear()}-` +
            `${String(cursor.getMonth() + 1).padStart(2, '0')}-` +
            `${String(cursor.getDate()).padStart(2, '0')}`

          const entry = { date: dateStr, recurring_id }
          if (rule.shift_type) entry.shift_type_id = rule.shift_type
          else if (rule.shift_template) entry.shift_template_id = rule.shift_template

          schedules.push(entry)
          cursor.setDate(cursor.getDate() + 7)
        }
      }

      if (!schedules.length) {
        throw new Error(
          'No dates could be generated for the selected recurring template and date range.',
        )
      }

      const response = await api.post(
        `${BASE}/organization/assignments/assign/`,
        { company_id, employee_ids, schedules },
        { headers: authHeaders() },
      )
      return response.data
    } catch (error) {
      console.error('assignRecurringSchedule error:', error.response?.data)
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    // state
    schedules,
    loading,
    saving,
    schedulePagination,
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
    fetchShiftTemplates,
    assignRecurringSchedule,
    fetchEmployeeSchedule,
    fetchEmployeesByPayrollSite,
    autoAssignRecurring,
  }
}
