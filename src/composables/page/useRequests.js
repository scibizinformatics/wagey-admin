import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'

export function useRequests() {
  const { companyId } = useCompany()

  const leaveRequests = ref([])
  const overtimeRequests = ref([])
  const cashAdvanceRequests = ref([])
  const overtimeCategories = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // One guard per queue. The Requests page fires all three lists from
  // `onMounted` and again from its company watcher, and each is scoped by
  // company — so an in-flight round for the previous workspace must not be
  // allowed to publish over the new one's rows. That is the failure the page
  // must never show: one company's requests listed while actions post against
  // another.
  const leaveGuard = createRequestToken()
  const overtimeGuard = createRequestToken()
  const cashAdvanceGuard = createRequestToken()

  // ─── Leave requests ───────────────────────────────────────────────────────

  async function fetchLeaveRequests() {
    loading.value = true
    const token = leaveGuard.next()
    try {
      const response = await api.get(`${BASE}/attendance/leave-list/`, {
        params: { company_id: companyId.value },
      })
      const rows = response.data.data ?? response.data ?? []
      // Superseded by a newer request: return the rows, publish nothing.
      if (!leaveGuard.isCurrent(token)) return rows
      leaveRequests.value = rows
      return leaveRequests.value
    } finally {
      loading.value = false
    }
  }

  /**
   * Approve or reject a leave request.
   * @param {string|number} requestId
   * @param {object} payload – e.g. { status: 'approved' | 'rejected', remarks?: string }
   */
  async function updateLeaveApproval(requestId, payload) {
    saving.value = true
    try {
      const response = await api.patch(`${BASE}/attendance/leave-approval/${requestId}/`, payload)
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Overtime requests ────────────────────────────────────────────────────

  async function fetchOvertimeCategories() {
    const response = await api.get(`${BASE}/payroll/overtime-categories/`)
    overtimeCategories.value = response.data.data ?? response.data ?? []
    return overtimeCategories.value
  }

  async function fetchOvertimeRequests() {
    loading.value = true
    const token = overtimeGuard.next()
    try {
      const response = await api.get(`${BASE}/payroll/overtime-list/`, {
        params: { company: companyId.value },
      })
      const rows = response.data.data ?? response.data ?? []
      // Superseded by a newer request: return the rows, publish nothing.
      if (!overtimeGuard.isCurrent(token)) return rows
      overtimeRequests.value = rows
      return overtimeRequests.value
    } finally {
      loading.value = false
    }
  }

  /**
   * Approve or reject an overtime request.
   * @param {string|number} requestId
   * @param {object} payload – { status: 'approved' | 'rejected' }
   */
  async function updateOvertimeApproval(requestId, payload) {
    saving.value = true
    try {
      const response = await api.patch(`${BASE}/payroll/overtime-approve/${requestId}/`, payload)
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Cash Advance requests ────────────────────────────────────────────────

  /**
   * Fetch cash advance requests for a specific company.
   * @param {string} selectedCompany
   */
  async function fetchCashAdvanceRequests(selectedCompany) {
    loading.value = true
    const token = cashAdvanceGuard.next()
    try {
      const response = await api.get(`/cash_advance/admin/company/${selectedCompany}/requests/`)
      const rows = response.data.data ?? response.data ?? []
      // Superseded by a newer request: return the rows, publish nothing.
      if (!cashAdvanceGuard.isCurrent(token)) return rows
      cashAdvanceRequests.value = rows
      return cashAdvanceRequests.value
    } finally {
      loading.value = false
    }
  }

  /**
   * Approve or reject a cash advance request.
   * @param {string|number} requestId
   * @param {object} payload – { status: 'approved' | 'rejected' }
   */
  async function updateCashAdvanceApproval(requestId, payload) {
    saving.value = true
    try {
      const response = await api.post(
        `/cash_advance/admin/cash-advances/${requestId}/action/`,
        payload,
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  return {
    // state
    leaveRequests,
    overtimeRequests,
    cashAdvanceRequests,
    overtimeCategories,
    loading,
    saving,
    // leave
    fetchLeaveRequests,
    updateLeaveApproval,
    // overtime
    fetchOvertimeCategories,
    fetchOvertimeRequests,
    updateOvertimeApproval,
    // cash advance
    fetchCashAdvanceRequests,
    updateCashAdvanceApproval,
  }
}
