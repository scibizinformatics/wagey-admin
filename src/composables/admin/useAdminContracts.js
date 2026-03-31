import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from '../useCompany'
import { BASE, authHeaders } from '../utils/http'

export function useAdminContracts() {
  const $q = useQuasar()
  const { companyId } = useCompany()

  const contracts = ref([])
  const contractTypes = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const viewDialog = ref(false)
  const editing = ref(false)
  const selectedContract = ref(null)
  const form = ref(_emptyForm())

  const payTypeOptions = ['monthly', 'semi-monthly', 'weekly', 'daily', 'hourly']

  function _emptyForm(cId = null) {
    return {
      id: null,
      employee_id: null,
      company_id: cId,
      contract_type_id: null,
      site_id: null,
      pay_structure: {
        position_id: null,
        pay_type: 'monthly',
        rate: '',
        currency: 'PHP',
        effective_from: '',
        effective_to: null,
      },
    }
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  /**
   * @param {Array} employees   – pass in the employees list to resolve names
   * @param {Array} companies   – pass in the companies list to resolve names
   */
  async function fetchContracts(employees = [], companies = []) {
    if (!companyId.value) {
      contracts.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/user/contracts/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      const raw = response.data.data ?? response.data ?? []
      contracts.value = raw.map((c) => {
        const emp = employees.find((e) => e.id === c.employee_id)
        const ct = contractTypes.value.find((t) => t.id === c.contract_type_id)
        const co = companies.find((x) => x.id === (c.company_id || c.company))
        return {
          ...c,
          employee_name:
            c.employee_name ||
            (emp ? `${emp.user?.first_name || ''} ${emp.user?.last_name || ''}`.trim() : null),
          contract_type_name: c.contract_type_name || ct?.name || null,
          company_name: c.company_name || co?.name || null,
        }
      })
      return contracts.value
    } catch (error) {
      console.error('Error fetching contracts:', error)
      $q.notify({ type: 'negative', message: 'Failed to load contracts', position: 'top' })
    } finally {
      loading.value = false
    }
  }

  async function fetchContractTypes() {
    try {
      const response = await api.get(`${BASE}/contracts/contract-types/`, {
        headers: authHeaders(),
      })
      contractTypes.value = response.data.data ?? response.data ?? []
      return contractTypes.value
    } catch (error) {
      console.error('Error fetching contract types:', error)
    }
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  async function openDialog(fetchDeps) {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }
    if (fetchDeps) await fetchDeps()
    editing.value = false
    form.value = _emptyForm(companyId.value)
    dialog.value = true
  }

  async function openEditDialog(contract, fetchDeps) {
    if (fetchDeps) await fetchDeps()
    editing.value = true
    form.value = {
      id: contract.id,
      employee_id: contract.employee_company || null,
      company_id: contract.employee_company || companyId.value,
      contract_type_id: contract.contract_type_name || null,
      site_id: null,
      pay_structure: {
        position_id: null,
        pay_type: 'monthly',
        rate: '',
        currency: 'PHP',
        effective_from: '',
        effective_to: null,
      },
    }
    dialog.value = true
  }

  function viewContract(contract) {
    selectedContract.value = contract
    viewDialog.value = true
  }

  function viewContractPDF(contract) {
    if (contract.pdf_url) window.open(contract.pdf_url, '_blank')
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveContract() {
    if (
      !form.value.employee_id ||
      !form.value.contract_type_id ||
      !form.value.pay_structure?.position_id
    ) {
      $q.notify({
        type: 'negative',
        message: 'Please fill all required fields (Employee, Contract Type, Position)',
        position: 'top',
      })
      return
    }
    if (!form.value.pay_structure?.rate) {
      $q.notify({ type: 'negative', message: 'Pay rate is required', position: 'top' })
      return
    }

    saving.value = true
    try {
      const payload = {
        employee_id: form.value.employee_id,
        company_id: form.value.company_id || companyId.value,
        contract_type_id: form.value.contract_type_id,
        site_id: form.value.site_id || null,
        pay_structure: {
          position_id: form.value.pay_structure.position_id,
          pay_type: form.value.pay_structure.pay_type || 'monthly',
          rate: String(form.value.pay_structure.rate),
          currency: form.value.pay_structure.currency || 'PHP',
          effective_from: form.value.pay_structure.effective_from || null,
          effective_to: form.value.pay_structure.effective_to || null,
        },
      }

      if (editing.value) {
        await api.patch(`${BASE}/contracts/employee-contracts/${form.value.id}/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Contract updated successfully' })
      } else {
        await api.post(`${BASE}/contracts/employee-contracts/`, payload, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Contract created successfully' })
      }

      dialog.value = false
      await fetchContracts()
    } catch (error) {
      console.error('Error saving contract:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to save contract',
        position: 'top',
      })
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteContract(contract) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete this contract for "${contract.employee_name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/contracts/employee-contracts/${contract.id}/`, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Contract deleted successfully' })
        await fetchContracts()
      } catch (error) {
        console.error('Error deleting contract:', error)
        $q.notify({ type: 'negative', message: 'Failed to delete contract' })
      }
    })
  }

  return {
    contracts,
    contractTypes,
    loading,
    saving,
    dialog,
    viewDialog,
    editing,
    selectedContract,
    form,
    payTypeOptions,
    fetchContracts,
    fetchContractTypes,
    openDialog,
    openEditDialog,
    viewContract,
    viewContractPDF,
    saveContract,
    deleteContract,
  }
}
