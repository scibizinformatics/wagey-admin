import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function useAdminPayrollGroups() {
  const $q = useQuasar()
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
      const response = await api.get(`${BASE}/payroll/payment-methods/`, {
        headers: authHeaders(),
      })
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
        headers: authHeaders(),
      })
      payrollGroups.value = response.data.data ?? response.data ?? []
      return payrollGroups.value
    } catch (error) {
      console.error('Error fetching payroll groups:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load payroll groups',
        position: 'top',
      })
    } finally {
      loading.value = false
    }
  }

  function openDialog() {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }
    editing.value = false
    form.value = { id: null, name: '', company: companyId.value, payment_method: null, is_active: true }
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
      $q.notify({ type: 'negative', message: 'Payroll group name is required', position: 'top' })
      return
    }
    if (!form.value.payment_method) {
      $q.notify({ type: 'negative', message: 'Payment method is required', position: 'top' })
      return
    }
    const cId = form.value.company || companyId.value
    if (!cId) {
      $q.notify({ type: 'negative', message: 'Company ID is required', position: 'top' })
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
        await api.put(`${BASE}/payroll/payroll-groups/${form.value.id}/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Payroll group updated successfully' })
      } else {
        await api.post(`${BASE}/payroll/payroll-groups/`, payload, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Payroll group created successfully' })
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
      $q.notify({ type: 'negative', message: errorMessage, position: 'top' })
    } finally {
      saving.value = false
    }
  }

  async function deletePayrollGroup(group) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${group.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/payroll/payroll-groups/${group.id}/`, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Payroll group deleted successfully' })
        await fetchPayrollGroups()
      } catch (error) {
        console.error('Error deleting payroll group:', error)
        $q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to delete payroll group',
          position: 'top',
        })
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