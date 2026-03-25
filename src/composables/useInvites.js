import { ref } from 'vue'
import axios from 'axios'
import { useCompany } from './useCompany'

const BASE = 'https://staging.wageyapp.com'

export function useInvites() {
  const { companyId } = useCompany()

  const invites = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Auth helper ──────────────────────────────────────────────────────────
  function authHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  async function fetchInvites() {
    loading.value = true
    try {
      const response = await axios.get(`${BASE}/user/invite-list/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      invites.value = response.data.data ?? response.data ?? []
      return invites.value
    } finally {
      loading.value = false
    }
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  /**
   * Send an invitation to a new employee.
   * @param {object} invitationData
   */
  async function sendInvite(invitationData) {
    saving.value = true
    try {
      const response = await axios.post(`${BASE}/user/invite/`, invitationData, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── User roles (needed by invite form) ──────────────────────────────────

  async function fetchUserRoles() {
    const response = await axios.get(`${BASE}/user/user-roles/`, {
      params: { company: companyId.value },
      headers: authHeaders(),
    })
    return response.data.data ?? response.data ?? []
  }

  return {
    // state
    invites,
    loading,
    saving,
    // methods
    fetchInvites,
    sendInvite,
    fetchUserRoles,
  }
}
