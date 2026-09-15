import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, extractErrorMessage } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

export const SITE_OWNERSHIP_TYPES = ['owned', 'leased', 'partnership']

/*
 * `location_type` is the site's own nature, not an employee's arrangement: an
 * on-site location is one people physically report to, and so the one the
 * geofence, the radius and OTP are actually about. The API takes the bare slug.
 */
export const SITE_LOCATION_TYPES = [
  { label: 'On site', value: 'on_site' },
  { label: 'Off site', value: 'off_site' },
]

const MAX_LOGO_BYTES = 5 * 1024 * 1024

function emptyForm(companyId = null) {
  return {
    id: null,
    name: '',
    brand_name: '',
    location: '',
    location_type: 'on_site',
    latitude: '',
    longitude: '',
    radius_meters: 100,
    phone_number: '',
    ownership_type: 'owned',
    is_active: true,
    requires_otp: false,
    company: companyId,
    business_type: null,
    // `logo` holds a freshly picked File; `logo_url` is whatever the server
    // already has. They are kept apart so an edit that does not touch the logo
    // sends no logo key at all, rather than posting a URL string back at a
    // field that expects an upload.
    logo: null,
    logo_url: '',
    logo_cleared: false,
  }
}

export function useAdminSites() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()

  const sites = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(emptyForm())

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
      })
      sites.value = response.data.data ?? response.data ?? []
      return sites.value
    } catch (error) {
      console.error('Error fetching sites:', error)
      toast.error(extractErrorMessage(error, 'Failed to load sites'))
    } finally {
      loading.value = false
    }
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog() {
    editing.value = false
    form.value = emptyForm(companyId.value)
    dialog.value = true
  }

  function openEditDialog(site) {
    editing.value = true
    form.value = {
      ...emptyForm(site.company ?? companyId.value),
      id: site.id,
      name: site.name ?? '',
      brand_name: site.brand_name ?? '',
      location: site.location ?? '',
      location_type: site.location_type ?? 'on_site',
      latitude: site.latitude ?? '',
      longitude: site.longitude ?? '',
      radius_meters: site.radius_meters ?? 100,
      phone_number: site.phone_number ?? '',
      ownership_type: site.ownership_type ?? 'owned',
      is_active: site.is_active ?? true,
      requires_otp: site.requires_otp ?? false,
      business_type: site.business_type ?? null,
      logo_url: site.logo ?? '',
    }
    dialog.value = true
  }

  /*
   * Checked on pick rather than at save: an oversized or non-image file should
   * be answered while the person is still looking at the picker, not after they
   * have filled in the rest of the form.
   */
  function setLogo(file) {
    if (!file) {
      form.value.logo = null
      return true
    }
    if (!file.type?.startsWith('image/')) {
      toast.error('The logo must be an image file')
      return false
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('The logo must be smaller than 5MB')
      return false
    }
    form.value.logo = file
    form.value.logo_cleared = false
    return true
  }

  function clearLogo() {
    form.value.logo = null
    form.value.logo_url = ''
    form.value.logo_cleared = true
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  function buildPayload() {
    // Latitude and longitude are DRF decimals: the field validates a
    // fixed-point string, and a bare Number would send `14.6` for a value the
    // map produced at seven places.
    const fmt = (v, d = 5) => {
      const n = Number(v)
      return isNaN(n) ? '0.00000' : n.toFixed(d).padStart(d + 4, '0')
    }

    const payload = {
      name: form.value.name.trim(),
      brand_name: form.value.brand_name?.trim() || '',
      location: form.value.location.trim(),
      location_type: form.value.location_type || 'on_site',
      latitude: fmt(form.value.latitude),
      longitude: fmt(form.value.longitude),
      radius_meters: parseInt(form.value.radius_meters) || 100,
      phone_number: form.value.phone_number?.trim() || '',
      ownership_type: form.value.ownership_type || 'owned',
      is_active: Boolean(form.value.is_active),
      requires_otp: Boolean(form.value.requires_otp),
      company: companyId.value,
    }
    if (form.value.business_type) payload.business_type = form.value.business_type
    return payload
  }

  /*
   * JSON unless there is a file to carry. The logo is the only multipart field,
   * and routing every save through FormData would turn `is_active` into the
   * string "true" and hand the backend a booleanish text value instead.
   */
  function buildBody(payload) {
    const file = form.value.logo instanceof File ? form.value.logo : null
    if (!file) {
      // An explicit clear is the one case where a logo key is still sent
      // without a file behind it.
      return form.value.logo_cleared ? { ...payload, logo: '' } : payload
    }
    const body = new FormData()
    Object.entries(payload).forEach(([key, value]) => body.append(key, value))
    body.append('logo', file)
    return body
  }

  async function saveSite() {
    if (!form.value.name.trim()) {
      toast.error('Site name is required')
      return
    }
    if (!form.value.location.trim()) {
      toast.error('Location is required')
      return
    }
    if (!form.value.latitude || !form.value.longitude) {
      toast.error('Latitude and longitude are required')
      return
    }

    saving.value = true
    try {
      const body = buildBody(buildPayload())

      if (editing.value) {
        await api.put(`${BASE}/organization/sites/${form.value.id}/`, body)
        toast.success('Site updated successfully')
      } else {
        await api.post(`${BASE}/organization/sites/`, body)
        toast.success('Site created successfully')
      }

      dialog.value = false
      await fetchSites()
    } catch (error) {
      console.error('Error saving site:', error)
      toast.error(extractErrorMessage(error, 'Failed to save site'), { timeout: 3000 })
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteSite(site) {
    $q.dialog({
      title: 'Delete this site?',
      message: `"${site.name}" is removed, along with its position requirements. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/sites/${site.id}/`)
        toast.success('Site deleted successfully')
        await fetchSites()
      } catch (error) {
        console.error('Error deleting site:', error)
        toast.error(extractErrorMessage(error, 'Failed to delete site'))
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
    setLogo,
    clearLogo,
    saveSite,
    deleteSite,
  }
}
