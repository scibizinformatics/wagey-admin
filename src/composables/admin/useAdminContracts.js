import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { useCompanyStore } from 'src/stores/company'
import { usePayroll } from 'src/composables/page/usePayroll'
import { BASE, authHeaders } from 'src/composables/utils/http'

// Philippines Labor Code default multipliers
export const PHILIPPINES_DEFAULT_MULTIPLIERS = {
  overtime: 1.25,
  special_holiday: 1.30,
  regular_holiday: 2.00,
  night_diff: 1.10,
  regular_holiday_ot: 2.60,
  special_holiday_ot: 1.95,
  undertime: 0.50,
}

export function useAdminContracts() {
  const $q = useQuasar()
  const { companyId } = useCompany()
  const companyStore = useCompanyStore()
  const { fetchCustomMultipliers } = usePayroll()

  const contracts = ref([])
  const contractTypes = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // Company multipliers for Standard toggle option
  const companyMultipliers = ref(null)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const viewDialog = ref(false)
  const editing = ref(false)
  const selectedContract = ref(null)
  const form = ref(_emptyForm())

  const payTypeOptions = ['monthly', 'semi-monthly', 'weekly', 'daily', 'hourly']

  // ─── Assign Contract state ─────────────────────────────────────────────────
  const assignDialog = ref(false)
  const assigning = ref(false)
  const assignForm = ref(_emptyAssignForm())
  const contractAssigned = ref(null)

  function resetContractAssigned() {
    contractAssigned.value = null
  }

  function _emptyAssignForm(employeeId = null) {
    return {
      // Existing fields
      employee_id: employeeId,
      company_id: null,
      contract_type_id: null,
      pay_type: 'monthly',
      payment_method: 'bank_transfer',
      rate: '',
      work_hours_per_week: null,
      position: null,
      department: null,
      eligibilities: [],
      start_date: '',
      end_date: '',

      // Multiplier toggles (true = use standard/company value)
      use_standard_overtime: true,
      use_standard_special_holiday: true,
      use_standard_regular_holiday: true,
      use_standard_night_diff: true,
      use_standard_regular_holiday_ot: true,
      use_standard_special_holiday_ot: true,
      use_standard_undertime: true,

      // Custom multiplier values (used when toggle is false)
      overtime_multiplier: null,
      special_holiday_multiplier: null,
      regular_holiday_multiplier: null,
      night_diff_multiplier: null,
      regular_holiday_ot_multiplier: null,
      special_holiday_ot_multiplier: null,
      undertime_multiplier: null,
    }
  }

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
        currency: companyStore.currency,
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
    if (!employees?.length) {
      contracts.value = []
      return
    }
    loading.value = true
    try {
      const contractResults = await Promise.allSettled(
        employees.map((emp) => api.get(`${BASE}/user/employee/contracts/${companyId.value}/${emp.id}/`, {
          headers: authHeaders(),
        }))
      )

      const raw = []
      contractResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.data) {
          const emp = employees[index]
          const c = result.value.data
          // Handle new format (direct contract object with pay_type)
          const contractData = c.pay_type ? c : (c.contract || c)
          const ct = contractTypes.value.find((t) => t.id === contractData?.contract_type_id)
          const co = companies.find((x) => x.id === c.companies?.[0]?.company_id)
          raw.push({
            ...c,
            employee_name: emp ? `${emp.user?.first_name || ''} ${emp.user?.last_name || ''}`.trim() : null,
            contract_type_name: contractData?.name || ct?.name || null,
            company_name: c.companies?.[0]?.company_name || co?.name || null,
          })
        }
      })

      contracts.value = raw
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
      contract_type_id: contract.contract_type_id ?? null,
      site_id: null,
      pay_structure: {
        position_id: null,
        pay_type: 'monthly',
        rate: '',
        currency: companyStore.currency,
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

  // ─── Assign Contract ──────────────────────────────────────────────────────

  async function fetchCompanyMultipliersForForm() {
    try {
      const data = await fetchCustomMultipliers(companyId.value)
      companyMultipliers.value = data
      return data
    } catch (error) {
      console.error('Error fetching company multipliers:', error)
      companyMultipliers.value = null
      return null
    }
  }

  function getMultiplierValue(fieldName, useStandard, customValue) {
    if (!useStandard) {
      // Custom mode: use user input or default
      return customValue ?? PHILIPPINES_DEFAULT_MULTIPLIERS[fieldName]
    }

    // Standard mode: use company custom multiplier if available, otherwise legal default
    const companyValue = companyMultipliers.value?.[`${fieldName}_multiplier`]
    return companyValue ?? PHILIPPINES_DEFAULT_MULTIPLIERS[fieldName]
  }

  async function openAssignDialog(employee) {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }

    // Fetch company multipliers for Standard toggle option
    await fetchCompanyMultipliersForForm()

    assignForm.value = _emptyAssignForm(employee.id)
    assignForm.value.company_id = companyId.value
    assignDialog.value = true
  }

  async function assignContract() {
    if (
      !assignForm.value.employee_id ||
      !assignForm.value.contract_type_id ||
      !assignForm.value.pay_type ||
      !assignForm.value.rate ||
      !assignForm.value.start_date
    ) {
      $q.notify({
        type: 'negative',
        message: 'Please fill all required fields (Contract Type, Pay Type, Rate, Start Date)',
        position: 'top',
      })
      return
    }

    assigning.value = true
    try {
      // Build payload with all multipliers resolved (Standard vs Custom)
      const payload = {
        employee_id: assignForm.value.employee_id,
        company_id: assignForm.value.company_id || companyId.value,
        contract_type_id: assignForm.value.contract_type_id,
        pay_type: assignForm.value.pay_type,
        payment_method: assignForm.value.payment_method || 'bank_transfer',
        rate: String(assignForm.value.rate),
        work_hours_per_week: assignForm.value.work_hours_per_week
          ? Number(assignForm.value.work_hours_per_week)
          : null,
        position: assignForm.value.position ? Number(assignForm.value.position) : null,
        department: assignForm.value.department ? Number(assignForm.value.department) : null,
        start_date: assignForm.value.start_date || null,
        end_date: assignForm.value.end_date || null,

        // Multipliers - resolved based on Standard/Custom toggle
        overtime_multiplier: getMultiplierValue(
          'overtime',
          assignForm.value.use_standard_overtime,
          assignForm.value.overtime_multiplier
        ),
        special_holiday_multiplier: getMultiplierValue(
          'special_holiday',
          assignForm.value.use_standard_special_holiday,
          assignForm.value.special_holiday_multiplier
        ),
        regular_holiday_multiplier: getMultiplierValue(
          'regular_holiday',
          assignForm.value.use_standard_regular_holiday,
          assignForm.value.regular_holiday_multiplier
        ),
        night_diff_multiplier: getMultiplierValue(
          'night_diff',
          assignForm.value.use_standard_night_diff,
          assignForm.value.night_diff_multiplier
        ),
        regular_holiday_ot_multiplier: getMultiplierValue(
          'regular_holiday_ot',
          assignForm.value.use_standard_regular_holiday_ot,
          assignForm.value.regular_holiday_ot_multiplier
        ),
        special_holiday_ot_multiplier: getMultiplierValue(
          'special_holiday_ot',
          assignForm.value.use_standard_special_holiday_ot,
          assignForm.value.special_holiday_ot_multiplier
        ),
        undertime_multiplier: getMultiplierValue(
          'undertime',
          assignForm.value.use_standard_undertime,
          assignForm.value.undertime_multiplier
        ),

        eligibilities: assignForm.value.eligibilities ?? [],
      }

      // Remove null/undefined optional fields
      if (!payload.work_hours_per_week) delete payload.work_hours_per_week
      if (!payload.position) delete payload.position
      if (!payload.department) delete payload.department
      if (!payload.end_date) delete payload.end_date

      console.log('Payload to send:', payload)

      await api.post(`${BASE}/user/employment-contracts/create/`, payload, {
        headers: authHeaders(),
      })
      $q.notify({ type: 'positive', message: 'Contract assigned successfully', position: 'top' })
      contractAssigned.value = assignForm.value.employee_id
      assignDialog.value = false
    } catch (error) {
      console.error('Error assigning contract:', error)
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2))
      const data = error.response?.data
      const message = data
        ? Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
        : 'Failed to assign contract'
      $q.notify({
        type: 'negative',
        message,
        position: 'top',
        timeout: 8000,
      })
    } finally {
      assigning.value = false
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
    assignDialog,
    assigning,
    assignForm,
    openAssignDialog,
    assignContract,
    contractAssigned,
    resetContractAssigned,
    // Exposed for component use
    companyMultipliers,
    PHILIPPINES_DEFAULT_MULTIPLIERS,
    getMultiplierValue,
  }
}
