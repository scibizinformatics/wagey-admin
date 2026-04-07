import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

// ─── Shared CRUD factory ────────────────────────────────────────────────────
function useCrud($q, companyId, config) {
  const { listUrl, itemUrl, name, emptyForm, transformList } = config
  const items = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(emptyForm())

  async function fetchItems() {
    if (!companyId.value) {
      items.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(listUrl(), {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      const raw = response.data.data ?? response.data ?? []
      items.value = transformList ? transformList(raw) : raw
      return items.value
    } catch (error) {
      console.error(`Error fetching ${name}:`, error)
    } finally {
      loading.value = false
    }
  }

  function openDialog() {
    editing.value = false
    form.value = emptyForm(companyId.value)
    dialog.value = true
  }

  function openEditDialog(item) {
    editing.value = true
    form.value = { ...item }
    dialog.value = true
  }

  async function saveItem(validate, buildPayload) {
    if (validate && !validate()) return

    saving.value = true
    try {
      const payload = buildPayload
        ? buildPayload()
        : { ...form.value, company: form.value.company || companyId.value }

      if (editing.value) {
        await api.put(itemUrl(form.value.id), payload, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: `${name} updated successfully` })
      } else {
        await api.post(listUrl(), payload, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: `${name} created successfully` })
      }

      dialog.value = false
      await fetchItems()
    } catch (error) {
      console.error(`Error saving ${name}:`, error)
      $q.notify({ type: 'negative', message: `Failed to save ${name}` })
    } finally {
      saving.value = false
    }
  }

  async function deleteItem(item) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${item.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(itemUrl(item.id), { headers: authHeaders() })
        $q.notify({ type: 'positive', message: `${name} deleted successfully` })
        await fetchItems()
      } catch (error) {
        console.error(`Error deleting ${name}:`, error)
        $q.notify({ type: 'negative', message: `Failed to delete ${name}` })
      }
    })
  }

  return {
    items,
    loading,
    saving,
    dialog,
    editing,
    form,
    fetchItems,
    openDialog,
    openEditDialog,
    saveItem,
    deleteItem,
  }
}

// ─── Allowance Types ────────────────────────────────────────────────────────
export function useAdminAllowanceTypes() {
  const $q = useQuasar()
  const { companyId } = useCompany()
  const crud = useCrud($q, companyId, {
    name: 'Allowance type',
    listUrl: () => `${BASE}/payroll/admin/allowance-types/`,
    itemUrl: (id) => `${BASE}/payroll/admin/allowance-types/${id}/`,
    emptyForm: (cId = null) => ({ id: null, company: cId, name: '', description: '' }),
  })

  async function saveAllowanceType() {
    return crud.saveItem(
      () => {
        if (!crud.form.value.name.trim()) {
          $q.notify({ type: 'negative', message: 'Name is required' })
          return false
        }
        return true
      },
      () => ({ company: crud.form.value.company || companyId.value, name: crud.form.value.name }),
    )
  }

  return {
    allowanceTypes: crud.items,
    loadingAllowanceTypes: crud.loading,
    savingAllowanceType: crud.saving,
    allowanceTypeDialog: crud.dialog,
    editingAllowanceType: crud.editing,
    allowanceTypeForm: crud.form,
    fetchAllowanceTypes: crud.fetchItems,
    openAllowanceTypeDialog: crud.openDialog,
    editAllowanceType: crud.openEditDialog,
    saveAllowanceType,
    deleteAllowanceType: crud.deleteItem,
  }
}

// ─── Tax Brackets ───────────────────────────────────────────────────────────
export function useAdminTaxBrackets() {
  const $q = useQuasar()
  const { companyId } = useCompany()
  const crud = useCrud($q, companyId, {
    name: 'Tax bracket',
    listUrl: () => `${BASE}/payroll/admin/tax-brackets/`,
    itemUrl: (id) => `${BASE}/payroll/admin/tax-brackets/${id}/`,
    emptyForm: (cId = null) => ({
      id: null,
      company: cId,
      name: '',
      min_amount: 0,
      max_amount: null,
      rate: 0,
    }),
  })

  async function saveTaxBracket() {
    return crud.saveItem(
      () => {
        if (!crud.form.value.name.trim()) {
          $q.notify({ type: 'negative', message: 'Name is required' })
          return false
        }
        return true
      },
      () => ({
        company: crud.form.value.company || companyId.value,
        name: crud.form.value.name,
        min_amount: crud.form.value.min_amount,
        max_amount: crud.form.value.max_amount || null,
        rate: crud.form.value.rate,
      }),
    )
  }

  return {
    taxBrackets: crud.items,
    loadingTaxBrackets: crud.loading,
    savingTaxBracket: crud.saving,
    taxBracketDialog: crud.dialog,
    editingTaxBracket: crud.editing,
    taxBracketForm: crud.form,
    fetchTaxBrackets: crud.fetchItems,
    openTaxBracketDialog: crud.openDialog,
    editTaxBracket: crud.openEditDialog,
    saveTaxBracket,
    deleteTaxBracket: crud.deleteItem,
  }
}

// ─── Cutoff Periods ─────────────────────────────────────────────────────────
export function useAdminCutoffPeriods() {
  const $q = useQuasar()
  const { companyId } = useCompany()
  const crud = useCrud($q, companyId, {
    name: 'Cutoff period',
    listUrl: () => `${BASE}/payroll/admin/cutoff-periods/`,
    itemUrl: (id) => `${BASE}/payroll/admin/cutoff-periods/${id}/`,
    emptyForm: (cId = null) => ({
      id: null,
      company: cId,
      name: '',
      start_date: '',
      end_date: '',
      is_active: true,
    }),
  })

  async function saveCutoffPeriod() {
    return crud.saveItem(
      () => {
        if (
          !crud.form.value.name.trim() ||
          !crud.form.value.start_date ||
          !crud.form.value.end_date
        ) {
          $q.notify({ type: 'negative', message: 'Please fill all required fields' })
          return false
        }
        return true
      },
      () => ({
        company: crud.form.value.company || companyId.value,
        name: crud.form.value.name,
        start_date: crud.form.value.start_date,
        end_date: crud.form.value.end_date,
        is_active: crud.form.value.is_active,
      }),
    )
  }

  return {
    cutoffPeriods: crud.items,
    loadingCutoffPeriods: crud.loading,
    savingCutoffPeriod: crud.saving,
    cutoffPeriodDialog: crud.dialog,
    editingCutoffPeriod: crud.editing,
    cutoffPeriodForm: crud.form,
    fetchCutoffPeriods: crud.fetchItems,
    openCutoffPeriodDialog: crud.openDialog,
    editCutoffPeriod: crud.openEditDialog,
    saveCutoffPeriod,
    deleteCutoffPeriod: crud.deleteItem,
  }
}

// ─── Payroll Groups ─────────────────────────────────────────────────────────
export function useAdminPayrollGroups() {
  const $q = useQuasar()
  const { companyId } = useCompany()
  const crud = useCrud($q, companyId, {
    name: 'Payroll group',
    listUrl: () => `${BASE}/payroll/admin/payroll-groups/`,
    itemUrl: (id) => `${BASE}/payroll/admin/payroll-groups/${id}/`,
    emptyForm: (cId = null) => ({ id: null, company: cId, name: '', description: '' }),
  })

  async function savePayrollGroup() {
    return crud.saveItem(() => {
      if (!crud.form.value.name.trim()) {
        $q.notify({ type: 'negative', message: 'Group name is required' })
        return false
      }
      return true
    })
  }

  return {
    payrollGroups: crud.items,
    loadingPayrollGroups: crud.loading,
    savingPayrollGroup: crud.saving,
    payrollGroupDialog: crud.dialog,
    editingPayrollGroup: crud.editing,
    payrollGroupForm: crud.form,
    fetchPayrollGroups: crud.fetchItems,
    openPayrollGroupDialog: crud.openDialog,
    editPayrollGroup: crud.openEditDialog,
    savePayrollGroup,
    deletePayrollGroup: crud.deleteItem,
  }
}

// ─── Labor Rules ─────────────────────────────────────────────────────────────
export function useAdminLaborRules() {
  const $q = useQuasar()
  const { companyId } = useCompany()
  const crud = useCrud($q, companyId, {
    name: 'Labor rule',
    listUrl: () => `${BASE}/payroll/admin/labor-rules/`,
    itemUrl: (id) => `${BASE}/payroll/admin/labor-rules/${id}/`,
    emptyForm: (cId = null) => ({
      id: null,
      company: cId,
      name: '',
      description: '',
      multiplier: 1.0,
      is_active: true,
    }),
  })

  async function saveLaborRule() {
    return crud.saveItem(() => {
      if (!crud.form.value.name.trim() || !crud.form.value.multiplier) {
        $q.notify({ type: 'negative', message: 'Please fill all required fields' })
        return false
      }
      return true
    })
  }

  return {
    laborRules: crud.items,
    loadingLaborRules: crud.loading,
    savingLaborRule: crud.saving,
    laborRuleDialog: crud.dialog,
    editingLaborRule: crud.editing,
    laborRuleForm: crud.form,
    fetchLaborRules: crud.fetchItems,
    openLaborRuleDialog: crud.openDialog,
    editLaborRule: crud.openEditDialog,
    saveLaborRule,
    deleteLaborRule: crud.deleteItem,
  }
}

// ─── Pay Structures ──────────────────────────────────────────────────────────
export function useAdminPayStructures() {
  const $q = useQuasar()
  const { companyId } = useCompany()

  const payStructures = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(_emptyForm())

  const payTypeOptions = ['monthly', 'semi-monthly', 'weekly', 'daily', 'hourly']

  function _emptyForm() {
    return {
      id: null,
      position: null,
      pay_type: 'monthly',
      rate: 0,
      currency: 'PHP',
      effective_from: '',
      effective_to: null,
    }
  }

  async function fetchPayStructures(positions = []) {
    if (!companyId.value) {
      payStructures.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/payroll/pay-structures/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      const raw = response.data.data ?? response.data ?? []
      payStructures.value = raw.map((s) => {
        const pos = positions.find((p) => p.id === s.position)
        return { ...s, position_name: pos?.name || 'N/A' }
      })
      return payStructures.value
    } catch (error) {
      console.error('Error fetching pay structures:', error)
    } finally {
      loading.value = false
    }
  }

  function openDialog() {
    editing.value = false
    form.value = _emptyForm()
    dialog.value = true
  }

  function openEditDialog(item) {
    editing.value = true
    form.value = {
      id: item.id,
      position: item.position,
      pay_type: item.pay_type,
      rate: item.rate,
      currency: item.currency,
      effective_from: item.effective_from,
      effective_to: item.effective_to || null,
    }
    dialog.value = true
  }

  async function savePayStructure() {
    if (
      !form.value.position ||
      !form.value.pay_type ||
      !form.value.rate ||
      !form.value.currency ||
      !form.value.effective_from
    ) {
      $q.notify({ type: 'negative', message: 'Please fill all required fields' })
      return
    }

    saving.value = true
    try {
      const payload = {
        company_id: companyId.value,
        position: form.value.position,
        pay_type: form.value.pay_type,
        rate: form.value.rate.toString(),
        currency: form.value.currency,
        effective_from: form.value.effective_from,
        effective_to: form.value.effective_to || null,
      }

      if (editing.value) {
        await api.put(`${BASE}/payroll/pay-structures/${form.value.id}/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Pay structure updated successfully' })
      } else {
        await api.post(`${BASE}/payroll/pay-structures/`, payload, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Pay structure created successfully' })
      }

      dialog.value = false
      await fetchPayStructures()
    } catch (error) {
      console.error('Error saving pay structure:', error)
      let errorMessage = 'Failed to save pay structure'
      if (error.response?.data && typeof error.response.data === 'object') {
        const errors = Object.entries(error.response.data).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`,
        )
        if (errors.length) errorMessage = errors.join(' | ')
      } else if (error.response?.data?.message) errorMessage = error.response.data.message
      $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 5000 })
    } finally {
      saving.value = false
    }
  }

  async function deletePayStructure(item) {
    $q.dialog({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this pay structure?',
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/payroll/pay-structures/${item.id}/`, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Pay structure deleted successfully' })
        await fetchPayStructures()
      } catch (error) {
        console.error('Error deleting pay structure:', error)
        $q.notify({ type: 'negative', message: 'Failed to delete pay structure' })
      }
    })
  }

  return {
    payStructures,
    loading,
    saving,
    dialog,
    editing,
    form,
    payTypeOptions,
    fetchPayStructures,
    openPayStructureDialog: openDialog,
    editPayStructure: openEditDialog,
    savePayStructure,
    deletePayStructure,
  }
}
