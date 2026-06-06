import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany, resolvedCompanyId } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function useAnnouncements() {
  const { companyId } = useCompany()

  const announcements = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Read ─────────────────────────────────────────────────────────────────

  async function fetchAnnouncements(params = {}) {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/communication/announcements/`, {
        params: { company: resolvedCompanyId(), ...params },
        headers: authHeaders(),
      })
      announcements.value = response.data.data ?? response.data ?? []
      return announcements.value
    } catch (error) {
      console.error('[fetchAnnouncements] failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async function createAnnouncement(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/communication/announcements/create/`, payload, {
        headers: authHeaders(),
      })
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async function updateAnnouncement(announcementId, payload) {
    saving.value = true
    try {
      const response = await api.put(
        `${BASE}/communication/announcements/${announcementId}/`,
        payload,
        { headers: authHeaders() },
      )
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async function deleteAnnouncement(announcementId) {
    const response = await api.delete(`${BASE}/communication/announcements/${announcementId}/`, {
      params: { company: companyId.value },
      headers: authHeaders(),
    })
    return response.data
  }

  return {
    // state
    announcements,
    loading,
    saving,
    // methods
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  }
}
