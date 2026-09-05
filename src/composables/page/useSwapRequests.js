import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { normalizeSwapRequests } from 'src/composables/utils/swapRequests'

export function useSwapRequests() {
  const swapRequests = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Read ─────────────────────────────────────────────────────────────────

  async function fetchSwapRequests(params = {}) {
    loading.value = true
    try {
      const response = await api.get(`/organization/swap-requests/`, {
        params,
      })
      // Normalised on the way in: the endpoint answers with ids and enum tokens
      // for shift/site and with either flat names or nested employee objects,
      // none of which is fit to print.
      swapRequests.value = normalizeSwapRequests(response.data.data ?? response.data ?? [])
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
      const response = await api.patch(`/organization/swap-requests/${requestId}/`, payload)
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
