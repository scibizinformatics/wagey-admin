import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { BASE, authHeaders } from '../utils/http'

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
    address: '',
    contact: '',
    logo: '',
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

  function openDialog() {
    editing.value = false
    form.value = { id: null, name: '', address: '', contact: '', logo: '' }
    logoUploadMethod.value = 'url'
    logoFile.value = null
    logoPreview.value = null
    dialog.value = true
  }

  function openEditDialog(company) {
    editing.value = true
    form.value = { ...company }
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
      const formData = new FormData()
      formData.append('name', form.value.name)
      if (form.value.address) formData.append('address', form.value.address)
      if (form.value.contact) formData.append('contact', form.value.contact)

      if (logoUploadMethod.value === 'file' && logoFile.value) {
        formData.append('logo', logoFile.value)
      } else if (logoUploadMethod.value === 'url' && form.value.logo) {
        formData.append('logo', form.value.logo)
      } else if (!editing.value) {
        formData.append('logo', '')
      }

      const headers = { ...authHeaders(), 'Content-Type': 'multipart/form-data' }

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
        else if (d.message) errorMessage = d.message
      }
      $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 5000 })
    } finally {
      saving.value = false
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
    deleteCompany,
  }
}
