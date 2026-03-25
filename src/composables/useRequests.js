import { ref } from 'vue'
import axios from 'axios'
import { api } from 'src/boot/axios'
import { useCompany } from './useCompany'

const BASE = 'https://staging.wageyapp.com'

export function useRequests() {
  const { companyId } = useCompany()

  // Reactive state for each request type
  const leaveRequests = ref([])
  const overtimeRequests = ref([])
  const cashAdvanceRequests = ref([])
  const overtimeCategories = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Auth helper ──────────────────────────────────────────────────────────
  function authHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // ─── Leave requests ───────────────────────────────────────────────────────

  async function fetchLeaveRequests() {
    loading.value = true
    try {
      const response = await axios.get(
        `${BASE}/attendance/leave-list/?company_id=${companyId.value}`,
        { headers: authHeaders() },
      )
      leaveRequests.value = response.data.data ?? response.data ?? []
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
      const response = await axios.patch(
        `${BASE}/attendance/leave-approval/${requestId}/`,
        payload,
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Overtime requests ────────────────────────────────────────────────────

  async function fetchOvertimeCategories() {
    const response = await axios.get(`${BASE}/payroll/overtime-categories/`, {
      headers: authHeaders(),
    })
    overtimeCategories.value = response.data.data ?? response.data ?? []
    return overtimeCategories.value
  }

  async function fetchOvertimeRequests() {
    loading.value = true
    try {
      const response = await axios.get(
        `${BASE}/payroll/overtime-list/?company=${companyId.value}`,
        { headers: authHeaders() },
      )
      overtimeRequests.value = response.data.data ?? response.data ?? []
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
      const response = await axios.patch(
        `${BASE}/payroll/overtime-approve/${requestId}/`,
        payload,
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Cash Advance requests ────────────────────────────────────────────────

  /**
   * Fetch cash advance requests for a specific company.
   * @param {string} selectedCompany - The selected company value from the dropdown
   */
  async function fetchCashAdvanceRequests(selectedCompany) {
    loading.value = true
    try {
      const res = await api.get(`${BASE}/cash_advance/admin/?company_id=${selectedCompany}`)
      cashAdvanceRequests.value = res.data.data ?? res.data ?? []
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
      const response = await api.patch(`${BASE}/cash_advance/admin/${requestId}/approval/`, payload)
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
