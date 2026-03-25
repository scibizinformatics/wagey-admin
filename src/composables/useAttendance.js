import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from './useCompany'

const BASE = 'https://staging.wageyapp.com'

export function useAttendance() {
  const { companyId } = useCompany()

  const attendanceData = ref([])
  const loading = ref(false)
  const creating = ref(false)
  const updating = ref(false)

  // ─── Fetch ────────────────────────────────────────────────────────────────

  /**
   * Fetch attendance records for a given year/month.
   * @param {string} year
   * @param {string} month
   * @param {object} [params] - Extra query params (cost_center, page, limit …)
   */
  async function fetchAttendance(year, month, params = {}) {
    if (!companyId.value) throw new Error('Company ID not found')

    loading.value = true
    try {
      let url = `${BASE}/attendance/company/${companyId.value}/${year}/${month}/`
      const response = await api.get(url, { params })

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

  // ─── Update ───────────────────────────────────────────────────────────────

  /**
   * Update an attendance record (time_in, time_out, cost_center …).
   * @param {string|number} recordId
   * @param {object} payload
   */
  async function updateAttendance(recordId, payload) {
    updating.value = true
    try {
      const response = await api.put(
        `${BASE}/attendance/log-update/${companyId.value}/${recordId}/`,
        payload,
      )
      return response.data
    } finally {
      updating.value = false
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  /**
   * Batch-delete attendance records by IDs.
   * @param {Array<string|number>} ids
   */
  async function batchDeleteAttendance(ids) {
    const response = await api.post(`${BASE}/attendance/batch-delete/`, { ids })
    return response.data
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  async function exportSelectedAttendance(ids) {
    const response = await api.post('/attendance/export/', { ids, format: 'csv' })
    return response.data
  }

  async function exportAllAttendance(filters) {
    const response = await api.get('/attendance/export/', {
      params: { ...filters, format: 'csv' },
    })
    return response.data
  }

  return {
    // state
    attendanceData,
    loading,
    creating,
    updating,
    // methods
    fetchAttendance,
    fetchEmployeeSchedule,
    logAttendance,
    updateAttendance,
    batchDeleteAttendance,
    exportSelectedAttendance,
    exportAllAttendance,
  }
}
