import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { BASE, authHeaders } from '@/composables/utils/http'

let _cachedUserUuid = null
const token = localStorage.getItem('token') || localStorage.getItem('access_token')
fetch('/user/current-user-companies/', {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((r) => r.json())
  .then((d) => console.log(JSON.stringify(d, null, 2)))
async function fetchCurrentUserUuid() {
  if (_cachedUserUuid) return _cachedUserUuid
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token')
    if (!token) return null
    const headers = { Authorization: `Bearer ${token}` }
    const res = await fetch(`${BASE}/user/current-user-companies/`, { headers })
    if (res.ok) {
      const json = await res.json()
      const records = json?.data ?? json ?? []
      const first = Array.isArray(records) ? records[0] : null
      if (first) {
        // Prefer user.uuid, fall back to user.id (the numeric PK stored as user_id)
        const uuid = first?.user?.uuid ?? first?.user?.id ?? null
        if (uuid) {
          _cachedUserUuid = String(uuid)
          return _cachedUserUuid
        }
      }
    }
  } catch {
    // ignore network errors
  }
  return null
}

export function useAdminCompanies() {
  const $q = useQuasar()

  const companies = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref({
    id: null,
    name: '',
    logo: '',
    owner_ids: [],
  })

  // Logo upload helpers
  const logoUploadMethod = ref('url')
  const logoFile = ref(null)
  const logoPreview = ref(null)

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchCompanies() {
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/companies/`, {
        headers: authHeaders(),
      })
      companies.value = response.data.data ?? response.data ?? []
      return companies.value
    } catch (error) {
      console.error('Error fetching companies:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load companies',
        position: 'top',
      })
    } finally {
      loading.value = false
    }
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  async function openDialog() {
    editing.value = false
    const userId = await fetchCurrentUserUuid()
    form.value = {
      id: null,
      name: '',
      logo: '',
      owner_ids: userId ? [userId] : [],
    }
    logoUploadMethod.value = 'url'
    logoFile.value = null
    logoPreview.value = null
    dialog.value = true
  }

  async function openEditDialog(company) {
    editing.value = true
    // The GET response doesn't return owner_ids, so we must preserve the
    // current user as an owner to satisfy the PUT permission check.
    const userId = await fetchCurrentUserUuid()
    const existingOwners = company.owner_ids ?? []
    const ownerIds =
      userId && !existingOwners.includes(userId)
        ? [...existingOwners, userId]
        : existingOwners.length > 0
          ? existingOwners
          : userId
            ? [userId]
            : []
    form.value = {
      id: company.id,
      name: company.name ?? '',
      logo: company.logo ?? '',
      owner_ids: ownerIds,
    }
    logoUploadMethod.value = 'url'
    logoFile.value = null
    logoPreview.value = company.logo || null
    dialog.value = true
  }

  function onLogoFileSelected(file) {
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        logoPreview.value = e.target.result
      }
      reader.readAsDataURL(file)
    } else {
      logoPreview.value = null
    }
  }

  function clearLogoFile() {
    logoFile.value = null
    logoPreview.value = null
    form.value.logo = ''
  }

  function clearLogoUrl() {
    form.value.logo = ''
    logoPreview.value = null
  }

  function onFileRejected(rejectedEntries) {
    $q.notify({
      type: 'negative',
      message: `File rejected: ${rejectedEntries[0].failedPropValidation}`,
      position: 'top',
    })
  }

  function handleImageError() {
    logoPreview.value = null
    $q.notify({ type: 'warning', message: 'Failed to load image preview', position: 'top' })
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveCompany() {
    if (!form.value.name.trim()) {
      $q.notify({ type: 'negative', message: 'Company name is required', position: 'top' })
      return
    }

    saving.value = true
    try {
      // The API requires multipart/form-data (logo must be a file field).
      // owner_ids must be appended as individual entries for Django to parse the list.
      const formData = new FormData()
      formData.append('name', form.value.name.trim())

      // Logo: file takes priority, then URL, then omit
      if (logoUploadMethod.value === 'file' && logoFile.value) {
        formData.append('logo', logoFile.value)
      } else if (logoUploadMethod.value === 'url' && form.value.logo) {
        formData.append('logo', form.value.logo)
      }

      // Append each owner UUID as a separate entry so Django sees a list
      const ownerIds = form.value.owner_ids ?? []
      ownerIds.forEach((id) => formData.append('owner_ids', id))

      // Let the browser set Content-Type with the correct multipart boundary
      const headers = { ...authHeaders() }

      if (editing.value) {
        await api.put(`${BASE}/organization/companies/${form.value.id}/`, formData, { headers })
        $q.notify({ type: 'positive', message: 'Company updated successfully' })
      } else {
        await api.post(`${BASE}/organization/companies/create/`, formData, { headers })
        $q.notify({ type: 'positive', message: 'Company created successfully' })
      }

      dialog.value = false
      clearLogoFile()
      await fetchCompanies()
    } catch (error) {
      console.error('Error saving company:', error)
      let errorMessage = 'Failed to save company'
      if (error.response?.data) {
        const d = error.response.data
        if (d.logo && Array.isArray(d.logo)) errorMessage = d.logo.join(', ')
        else if (d.name && Array.isArray(d.name)) errorMessage = d.name.join(', ')
        else if (d.message) errorMessage = d.message
        else if (typeof d === 'string') errorMessage = d
      }
      $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 5000 })
    } finally {
      saving.value = false
    }
  }

  // ─── Partial update (PATCH) ────────────────────────────────────────────────

  async function patchCompany(id, fields) {
    try {
      await api.patch(`${BASE}/organization/companies/${id}/`, fields, {
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      })
      await fetchCompanies()
    } catch (error) {
      console.error('Error patching company:', error)
      $q.notify({ type: 'negative', message: 'Failed to update company', position: 'top' })
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteCompany(company) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${company.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/companies/${company.id}/`, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Company deleted successfully' })
        await fetchCompanies()
      } catch (error) {
        console.error('Error deleting company:', error)
        $q.notify({ type: 'negative', message: 'Failed to delete company' })
      }
    })
  }

  return {
    companies,
    loading,
    saving,
    dialog,
    editing,
    form,
    logoUploadMethod,
    logoFile,
    logoPreview,
    fetchCompanies,
    openDialog,
    openEditDialog,
    onLogoFileSelected,
    clearLogoFile,
    clearLogoUrl,
    onFileRejected,
    handleImageError,
    saveCompany,
    patchCompany,
    deleteCompany,
  }
}
