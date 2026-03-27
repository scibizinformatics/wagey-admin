import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from './useCompany'

const BASE = 'https://staging.wageyapp.com'

export function useAnnouncements() {
  const { companyId } = useCompany()

  const announcements = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Auth helper ──────────────────────────────────────────────────────────
  function authHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // ─── Company ID helper ────────────────────────────────────────────────────
  function resolvedCompanyId() {
    // If composable value is a plain scalar, use it directly
    if (companyId.value && typeof companyId.value !== 'object') return companyId.value

    // Fall back to localStorage (handles cases where company is stored as JSON object)
    const stored = localStorage.getItem('selectedCompany')
    if (!stored) return companyId.value
    try {
      const parsed = JSON.parse(stored)
      return parsed?.id ?? parsed
    } catch {
      return stored
    }
  }

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
