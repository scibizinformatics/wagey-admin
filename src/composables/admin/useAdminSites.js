import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function useAdminSites() {
  const $q = useQuasar()
  const { companyId } = useCompany()

  const sites = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref({
    id: null,
    name: '',
    brand_name: '',
    otp_secret: '',
    location: '',
    latitude: '',
    longitude: '',
    radius_meters: 100,
    ownership_type: 'owned',
    is_active: true,
    requires_otp: false,
    allow_manual_attendance: true,
    allow_service_charge: true,
    multiply_nd_by_holiday: false,
    extended_shift_days: '',
    company: null,
    business_type: null,
  })

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchSites() {
    if (!companyId.value) {
      sites.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/sites/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      sites.value = response.data.data ?? response.data ?? []
      return sites.value
    } catch (error) {
      console.error('Error fetching sites:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load sites',
        position: 'top',
      })
    } finally {
      loading.value = false
    }
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog() {
    editing.value = false
    form.value = {
      id: null,
      name: '',
      brand_name: '',
      otp_secret: '',
      location: '',
      latitude: '',
      longitude: '',
      radius_meters: 100,
      ownership_type: 'owned',
      is_active: true,
      requires_otp: false,
      allow_manual_attendance: true,
      allow_service_charge: true,
      multiply_nd_by_holiday: false,
      extended_shift_days: '',
      company: companyId.value,
      business_type: null,
    }
    dialog.value = true
  }

  function openEditDialog(site) {
    editing.value = true
    form.value = {
      id: site.id,
      name: site.name ?? '',
      brand_name: site.brand_name ?? '',
      otp_secret: site.otp_secret ?? '',
      location: site.location ?? '',
      latitude: site.latitude ?? '',
      longitude: site.longitude ?? '',
      radius_meters: site.radius_meters ?? 100,
      ownership_type: site.ownership_type ?? 'owned',
      is_active: site.is_active ?? true,
      requires_otp: site.requires_otp ?? false,
      allow_manual_attendance: site.allow_manual_attendance ?? true,
      allow_service_charge: site.allow_service_charge ?? true,
      multiply_nd_by_holiday: site.multiply_nd_by_holiday ?? false,
      extended_shift_days: site.extended_shift_days ?? '',
      company: site.company ?? companyId.value,
      business_type: site.business_type ?? null,
    }
    dialog.value = true
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveSite() {
    if (!form.value.name.trim()) {
      $q.notify({ type: 'negative', message: 'Site name is required', position: 'top' })
      return
    }
    if (!form.value.location.trim()) {
      $q.notify({ type: 'negative', message: 'Location is required', position: 'top' })
      return
    }
    if (!form.value.latitude || !form.value.longitude) {
      $q.notify({
        type: 'negative',
        message: 'Latitude and longitude are required',
        position: 'top',
      })
      return
    }

    saving.value = true
    try {
      const fmt = (v, d = 5) => {
        const n = Number(v)
        return isNaN(n) ? '0.00000' : n.toFixed(d).padStart(d + 4, '0')
      }

      const payload = {
        name: form.value.name.trim(),
        brand_name: form.value.brand_name?.trim() || '',
        otp_secret: form.value.otp_secret?.trim() || '',
        location: form.value.location.trim(),
        latitude: fmt(form.value.latitude),
        longitude: fmt(form.value.longitude),
        radius_meters: parseInt(form.value.radius_meters) || 100,
        ownership_type: form.value.ownership_type || 'owned',
        is_active: Boolean(form.value.is_active),
        requires_otp: Boolean(form.value.requires_otp),
        allow_manual_attendance: Boolean(form.value.allow_manual_attendance),
        allow_service_charge: Boolean(form.value.allow_service_charge),
        multiply_nd_by_holiday: Boolean(form.value.multiply_nd_by_holiday),
        extended_shift_days: form.value.extended_shift_days || '',
        company: companyId.value,
      }
      if (form.value.business_type) payload.business_type = form.value.business_type

      if (editing.value) {
        await api.put(`${BASE}/organization/sites/${form.value.id}/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Site updated successfully', position: 'top' })
      } else {
        await api.post(`${BASE}/organization/sites/`, payload, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Site created successfully', position: 'top' })
      }

      dialog.value = false
      await fetchSites()
    } catch (error) {
      console.error('Error saving site:', error)
      let errorMessage = 'Failed to save site'
      if (error.response?.data) {
        const d = error.response.data
        if (typeof d === 'object') {
          const first = Object.values(d)[0]
          errorMessage = Array.isArray(first) ? first[0] : first
        } else if (d.message) {
          errorMessage = d.message
        } else if (typeof d === 'string') {
          errorMessage = d
        }
      }
      $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 3000 })
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteSite(site) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${site.name}"?`,
      cancel: { color: 'grey', flat: true },
      ok: { color: 'negative', label: 'Delete' },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/sites/${site.id}/`, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Site deleted successfully', position: 'top' })
        await fetchSites()
      } catch (error) {
        console.error('Error deleting site:', error)
        $q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to delete site',
          position: 'top',
        })
      }
    })
  }

  return {
    sites,
    loading,
    saving,
    dialog,
    editing,
    form,
    fetchSites,
    openDialog,
    openEditDialog,
    saveSite,
    deleteSite,
  }
}
