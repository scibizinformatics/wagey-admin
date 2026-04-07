import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useRolesAndPositions } from 'src/composables/page/useRolesAndPositions.js'
import { BASE, authHeaders } from 'src/composables/utils/http.js'

export function useInvites() {
  const { companyId } = useCompany()
  // fetchUserRoles is already defined in useRolesAndPositions — reuse it here
  // instead of duplicating the implementation.
  const { fetchUserRoles } = useRolesAndPositions()

  const invites = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Read ─────────────────────────────────────────────────────────────────

  async function fetchInvites() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/user/invite-list/`, {
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
      const response = await api.post(`${BASE}/user/invite/`, invitationData, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
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
