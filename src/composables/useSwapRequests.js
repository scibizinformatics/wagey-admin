import { ref } from 'vue'
import { api } from 'src/boot/axios'

const BASE = 'https://staging.wageyapp.com'

export function useSwapRequests() {
  const swapRequests = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Read ─────────────────────────────────────────────────────────────────

  async function fetchSwapRequests(params = {}) {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/company-swap-requests/`, { params })
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
      const response = await api.put(`${BASE}/organization/swap-requests/${requestId}/`, payload)
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
