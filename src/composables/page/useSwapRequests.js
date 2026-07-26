import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { authHeaders } from 'src/composables/utils/http'

export function useSwapRequests() {
  const swapRequests = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Read ─────────────────────────────────────────────────────────────────

  async function fetchSwapRequests(params = {}) {
    loading.value = true
    try {
      // FIX: added headers: authHeaders() — was imported but never used,
      // causing 401 Unauthorized on authenticated endpoints in production.
       const response = await api.get(`/organization/swap-requests/`, {
         params,
         headers: authHeaders(),
       })
      swapRequests.value = response.data.data ?? response.data ?? []
      return swapRequests.value
    } finally {
      loading.value = false
    }
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  /**
   * Approve or reject a swap request.
   * @param {string|number} requestId
   * @param {object} payload – { status: 'approved' | 'rejected', remarks?: string }
   */
  async function updateSwapRequest(requestId, payload) {
    saving.value = true
    try {
      // FIX: added headers: authHeaders() — was missing, causing 401 in production.
       const response = await api.patch(`/organization/swap-requests/${requestId}/`, payload, {
         headers: authHeaders(),
       })
      return response.data
    } finally {
      saving.value = false
    }
  }

  return {
    // state
    swapRequests,
    loading,
    saving,
    // methods
    fetchSwapRequests,
    updateSwapRequest,
  }
}
