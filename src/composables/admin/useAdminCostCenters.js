import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

function defaultBankAccount() {
  return {
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    is_active: true,
  }
}

function defaultForm(companyId = null) {
  return {
    id: null,
    name: '',
    company: companyId,
    is_active: true,
    bank_accounts: [defaultBankAccount()],
  }
}

export function useAdminCostCenters() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()

  const costCenters = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(defaultForm())

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchCostCenters() {
    if (!companyId.value) {
      costCenters.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/payroll/cost-centers/`, {
        params: { company: companyId.value },
      })
      costCenters.value = response.data.data ?? response.data ?? []
      return costCenters.value
    } catch (error) {
      console.error('Error fetching cost centers:', error)
      toast.error(error.response?.data?.message || 'Failed to load cost centers')
    } finally {
      loading.value = false
    }
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
      return
    }
    editing.value = false
    form.value = defaultForm(companyId.value)
    dialog.value = true
  }

  function openEditDialog(costCenter) {
    editing.value = true
    form.value = {
      id: costCenter.id,
      name: costCenter.name,
      company: costCenter.company || companyId.value,
      is_active: costCenter.is_active ?? true,
      bank_accounts:
        costCenter.bank_accounts && costCenter.bank_accounts.length
          ? costCenter.bank_accounts.map((b) => ({ ...b }))
          : [defaultBankAccount()],
    }
    dialog.value = true
  }

  // ─── Bank account row helpers ──────────────────────────────────────────────

  function addBankAccount() {
    form.value.bank_accounts.push(defaultBankAccount())
  }

  function removeBankAccount(index) {
    if (form.value.bank_accounts.length > 1) {
      form.value.bank_accounts.splice(index, 1)
    }
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveCostCenter() {
    if (!form.value.name.trim()) {
      toast.error('Cost center name is required')
      return
    }
    const cId = form.value.company || companyId.value
    if (!cId) {
      toast.error('Company ID is required')
      return
    }

    saving.value = true
    try {
      const payload = {
        name: form.value.name.trim(),
        company: cId,
        is_active: form.value.is_active,
        bank_accounts: form.value.bank_accounts.map((b) => ({
          bank_name: b.bank_name,
          bank_account_name: b.bank_account_name,
          bank_account_number: b.bank_account_number,
          is_active: b.is_active,
        })),
      }

      if (editing.value) {
        await api.put(`${BASE}/payroll/cost-centers/${form.value.id}/`, payload)
        toast.success('Cost center updated successfully')
      } else {
        await api.post(`${BASE}/payroll/cost-centers/`, payload)
        toast.success('Cost center created successfully')
      }

      dialog.value = false
      await fetchCostCenters()
    } catch (error) {
      console.error('Error saving cost center:', error)
      let errorMessage = 'Failed to save cost center'
      if (error.response?.data) {
        if (Array.isArray(error.response.data)) errorMessage = error.response.data[0]
        else if (error.response.data.message) errorMessage = error.response.data.message
        else if (error.response.data.error) errorMessage = error.response.data.error
      }
      toast.error(errorMessage)
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteCostCenter(costCenter) {
    $q.dialog({
      title: 'Delete this cost center?',
      message: `"${costCenter.name}" is removed and can no longer be charged to. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/payroll/cost-centers/${costCenter.id}/`)
        toast.success('Cost center deleted successfully')
        await fetchCostCenters()
      } catch (error) {
        console.error('Error deleting cost center:', error)
        toast.error(error.response?.data?.message || 'Failed to delete cost center')
      }
    })
  }

  return {
    costCenters,
    loading,
    saving,
    dialog,
    editing,
    form,
    fetchCostCenters,
    openDialog,
    openEditDialog,
    addBankAccount,
    removeBankAccount,
    saveCostCenter,
    deleteCostCenter,
  }
}
