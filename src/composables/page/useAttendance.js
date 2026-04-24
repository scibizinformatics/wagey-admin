import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'

export function useAttendance() {
  const { companyId } = useCompany()

  const attendanceData = ref([])
  const loading = ref(false)
  const creating = ref(false)
  const updating = ref(false)

  // ─── Fetch ────────────────────────────────────────────────────────────────

  /**
   * Fetch attendance records for a given year/month, optionally filtered by a specific date.
   * @param {string} year
   * @param {string} month
   * @param {object} [params] - Extra query params (date, cost_center, page, limit …)
   * @param {string} [params.date] - Optional date filter e.g. '2026-03-27'
   */
  async function fetchAttendance(year, month, params = {}) {
    if (!companyId.value) throw new Error('Company ID not found')

    loading.value = true
    try {
      const url = `${BASE}/attendance/company/${companyId.value}/${year}/${month}/`
      const response = await api.get(url, { params })

      const data = Array.isArray(response.data) ? response.data : (response.data.data ?? [])

      attendanceData.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch attendance records for a specific date. Faster than fetching a full month.
   * @param {string} date - YYYY-MM-DD e.g. '2026-03-27'
   * @param {object} [params] - Extra query params (cost_center, page, limit …)
   */
  async function fetchAttendanceByDate(date, params = {}) {
    if (!companyId.value) throw new Error('Company ID not found')
    if (!date) throw new Error('Date is required')

    const [year, month] = date.split('-')
    loading.value = true
    try {
      const url = `${BASE}/attendance/company/${companyId.value}/${year}/${month}/`
      const response = await api.get(url, { params: { date, ...params } })

      const data = Array.isArray(response.data) ? response.data : (response.data.data ?? [])

      attendanceData.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch the scheduled record for a specific employee on a date.
   * @param {string} employeeId
   * @param {string} date  – YYYY-MM-DD
   */
  async function fetchEmployeeSchedule(employeeId, date) {
    if (!companyId.value || !employeeId || !date) return null

    const response = await api.get(`${BASE}/organization/scheduled/${companyId.value}/${date}/`)

    const list = Array.isArray(response.data)
      ? response.data
      : (response.data.data ?? response.data.schedules ?? [])

    return list.find((s) => s.employee_id === employeeId) ?? null
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  /**
   * Log a single time-in or time-out punch.
   * @param {object} payload – { source, employee_id, timestamp, site_id?, cost_center? }
   */
  async function logAttendance(payload) {
    creating.value = true
    try {
      const response = await api.post(`${BASE}/attendance/log/${companyId.value}/`, payload)
      return response.data
    } finally {
      creating.value = false
    }
  }

  return {
    // state
    attendanceData,
    loading,
    creating,
    updating,
    // methods
    fetchAttendance,
    fetchAttendanceByDate,
    fetchEmployeeSchedule,
    logAttendance,
  }
}
