import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'

export function useAdminPayrollGroups() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()

  const payrollGroups = ref([])
  const paymentMethods = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const dialog = ref(false)
  const editing = ref(false)
  const form = ref({ id: null, name: '', company: null, payment_method: null, is_active: true })

  async function fetchPaymentMethods() {
    try {
      const response = await api.get(`${BASE}/payroll/payment-methods/`)
      const all = response.data.data ?? response.data ?? []
      paymentMethods.value = all.filter((pm) => pm.is_active)
      return paymentMethods.value
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      paymentMethods.value = []
    }
  }

  async function fetchPayrollGroups() {
    if (!companyId.value) {
      payrollGroups.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/payroll/payroll-groups/`, {
        params: { company: companyId.value },
      })
      payrollGroups.value = response.data.data ?? response.data ?? []
      return payrollGroups.value
    } catch (error) {
      console.error('Error fetching payroll groups:', error)
      toast.error(error.response?.data?.message || 'Failed to load payroll groups')
    } finally {
      loading.value = false
    }
  }

  function openDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
      return
    }
    editing.value = false
    form.value = {
      id: null,
      name: '',
      company: companyId.value,
      payment_method: null,
      is_active: true,
    }
    dialog.value = true
  }

  function openEditDialog(group) {
    editing.value = true
    form.value = {
      id: group.id,
      name: group.name || '',
      company: group.company || companyId.value,
      payment_method: group.payment_method ?? null,
      is_active: group.is_active ?? true,
    }
    dialog.value = true
  }

  async function savePayrollGroup() {
    if (!form.value.name.trim()) {
      toast.error('Payroll group name is required')
      return
    }
    if (!form.value.payment_method) {
      toast.error('Payment method is required')
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
        payment_method: form.value.payment_method,
        is_active: form.value.is_active,
      }

      if (editing.value) {
        await api.put(`${BASE}/payroll/payroll-groups/${form.value.id}/`, payload)
        toast.success('Payroll group updated successfully')
      } else {
        await api.post(`${BASE}/payroll/payroll-groups/`, payload)
        toast.success('Payroll group created successfully')
      }

      dialog.value = false
      await fetchPayrollGroups()
    } catch (error) {
      console.error('Error saving payroll group:', error)
      let errorMessage = 'Failed to save payroll group'
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

  async function deletePayrollGroup(group) {
    $q.dialog({
      title: 'Delete this payroll group?',
      message: `"${group.name}" is removed and its cutoff no longer applies. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/payroll/payroll-groups/${group.id}/`)
        toast.success('Payroll group deleted successfully')
        await fetchPayrollGroups()
      } catch (error) {
        console.error('Error deleting payroll group:', error)
        toast.error(error.response?.data?.message || 'Failed to delete payroll group')
      }
    })
  }

  return {
    payrollGroups,
    paymentMethods,
    loading,
    saving,
    dialog,
    editing,
    form,
    fetchPayrollGroups,
    fetchPaymentMethods,
    openDialog,
    openEditDialog,
    savePayrollGroup,
    deletePayrollGroup,
  }
}
