import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function useAdminContractTypes() {
  const $q = useQuasar()
  const { companyId } = useCompany()

  const contractTypes = ref([])
  const eligibilities = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const dialog = ref(false)
  const editing = ref(false)
  const selectedContractType = ref(null)
  const form = ref(_emptyForm())

  function _emptyForm() {
    return {
      id: null,
      name: '',
      company: null,
      eligibilities: [],
    }
  }

  async function fetchContractTypes() {
    if (!companyId.value) {
      contractTypes.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/contract-types/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      contractTypes.value = response.data.data ?? response.data ?? []
      return contractTypes.value
    } catch (error) {
      console.error('Error fetching contract types:', error)
      $q.notify({ type: 'negative', message: 'Failed to load contract types', position: 'top' })
    } finally {
      loading.value = false
    }
  }

  async function fetchEligibilities() {
    try {
      const response = await api.get(`${BASE}/access/payroll-eligibilities/`, {
        headers: authHeaders(),
      })
      const data = response.data.data ?? response.data ?? []
      eligibilities.value = Array.isArray(data) ? data : []
      return eligibilities.value
    } catch (error) {
      console.error('Error fetching eligibilities:', error)
      eligibilities.value = []
    }
  }

  function openDialog() {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }
    editing.value = false
    form.value = _emptyForm()
    form.value.company = companyId.value
    dialog.value = true
  }

  function editContractType(contractType) {
    editing.value = true
    selectedContractType.value = contractType
    form.value = {
      id: contractType.id,
      name: contractType.name,
      company: contractType.company,
      eligibilities: contractType.eligibilities ?? [],
    }
    dialog.value = true
  }

  async function saveContractType() {
    if (!form.value.name) {
      $q.notify({ type: 'negative', message: 'Contract type name is required', position: 'top' })
      return
    }

    saving.value = true
    try {
      const payload = {
        name: form.value.name,
        company: form.value.company || companyId.value,
        eligibilities: form.value.eligibilities,
      }

      if (editing.value) {
        await api.patch(`${BASE}/organization/contract-types/${form.value.id}/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Contract type updated successfully' })
      } else {
        await api.post(`${BASE}/organization/contract-types/create/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Contract type created successfully' })
      }

      dialog.value = false
      await fetchContractTypes()
    } catch (error) {
      console.error('Error saving contract type:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to save contract type',
        position: 'top',
      })
    } finally {
      saving.value = false
    }
  }

  async function deleteContractType(contractType) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${contractType.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/contract-types/${contractType.id}/`, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Contract type deleted successfully' })
        await fetchContractTypes()
      } catch (error) {
        console.error('Error deleting contract type:', error)
        $q.notify({ type: 'negative', message: 'Failed to delete contract type' })
      }
    })
  }

  return {
    contractTypes,
    eligibilities,
    loading,
    saving,
    dialog,
    editing,
    selectedContractType,
    form,
    fetchContractTypes,
    fetchEligibilities,
    openDialog,
    editContractType,
    saveContractType,
    deleteContractType,
  }
}