import { ref, computed, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { usePayroll } from 'src/composables/page/usePayroll'
import { BASE, authHeaders } from 'src/composables/utils/http'
import { PHILIPPINES_DEFAULT_MULTIPLIERS } from './useAdminContracts.js'

export function useAdminContractTypes() {
  const $q = useQuasar()
  const { companyId } = useCompany()
  const { fetchCustomMultipliers } = usePayroll()

  const contractTypes = ref([])
  const eligibilities = ref([])
  const contributions = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // Company multipliers for Standard toggle option
  const companyMultipliers = ref(null)

  const dialog = ref(false)
  const editing = ref(false)
  const selectedContractType = ref(null)
  const form = ref(_emptyForm())

  const flexibleId = computed(
    () => eligibilities.value.find((e) => e.name === 'Work Hours Flexible')?.id,
  )
  const strictId = computed(
    () => eligibilities.value.find((e) => e.name === 'Work Hours Strict')?.id,
  )

  function _emptyForm() {
    return {
      id: null,
      name: '',
      company: null,
      pay_type: 'monthly',
      work_hours_per_week: null,
      work_hours_type: null,
      eligibilities: [],
      contributions: [],

      // Custom multiplier values
      overtime_multiplier: null,
      special_holiday_multiplier: null,
      regular_holiday_multiplier: null,
      night_diff_multiplier: null,
      regular_holiday_ot_multiplier: null,
      special_holiday_ot_multiplier: null,
      undertime_multiplier: null,

      // Holiday sub-option toggles
      special_holiday_enabled: true,
      regular_holiday_enabled: true,
    }
  }

  watch(
    () => form.value.pay_type,
    (newVal) => {
      if (newVal === 'monthly') {
        form.value.work_hours_per_week = null
      }
    },
  )

  watch(
    () => form.value.work_hours_type,
    (newVal) => {
      if (!flexibleId.value || !strictId.value) return
      const current = form.value.eligibilities.filter(
        (id) => id !== flexibleId.value && id !== strictId.value,
      )
      if (newVal === 'flexible') {
        form.value.eligibilities = [...current, flexibleId.value]
      } else if (newVal === 'strict') {
        form.value.eligibilities = [...current, strictId.value]
      } else {
        form.value.eligibilities = current
      }
    },
  )

  const COMPANY_FIELD_ALIASES = ['company.id', 'company_id', 'company']

  /** Resolve the company identifier from a contract type record. */
  function resolveCompanyId(ct) {
    for (const alias of COMPANY_FIELD_ALIASES) {
      const parts = alias.split('.')
      let val = ct
      for (const key of parts) val = val?.[key]
      if (val != null) return String(val)
    }
    return null
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
      const all = response.data.data ?? response.data ?? []

      // Client-side safeguard for any records the server may have missed filtering
      const cid = String(companyId.value)
      contractTypes.value = all.filter((ct) => resolveCompanyId(ct) === cid)
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

  async function fetchContributions() {
    try {
      const response = await api.get(`${BASE}/payroll/contributions/${companyId.value}/`, {
        headers: authHeaders(),
      })
      const data = response.data.data ?? response.data ?? []
      contributions.value = Array.isArray(data) ? data : []
      return contributions.value
    } catch (error) {
      console.error('Error fetching contributions:', error)
      contributions.value = []
    }
  }

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

  async function openDialog() {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }
    await fetchCompanyMultipliersForForm()
    if (!eligibilities.value.length) {
      await fetchEligibilities()
    }
    if (!contributions.value.length) {
      await fetchContributions()
    }
    editing.value = false
    form.value = _emptyForm()
    form.value.company = companyId.value

    // Pre-fill multipliers with company default or DOLE default
    const multiplierKeys = [
      'overtime',
      'special_holiday',
      'regular_holiday',
      'night_diff',
      'regular_holiday_ot',
      'special_holiday_ot',
      'undertime',
    ]
    for (const key of multiplierKeys) {
      const companyVal = companyMultipliers.value?.[`${key}_multiplier`]
      form.value[`${key}_multiplier`] = companyVal ?? PHILIPPINES_DEFAULT_MULTIPLIERS[key]
    }

    // Excluded from generic loop (have dedicated checkboxes)
    const dedicatedEligibilityNames = [
      'Overtime Eligible',
      'Overtime Converted to CTO',
      'Holiday Pay',
      'Undertime Deduction',
      'Night Differential Eligible',
      'Contributions',
    ]

    // Pre-select all non-work-hours, non-dedicated eligibilities
    const otherEligibilities = eligibilities.value
      .filter((e) => {
        if (e.name === 'Work Hours Flexible' || e.name === 'Work Hours Strict') return false
        if (dedicatedEligibilityNames.includes(e.name)) return false
        return true
      })
      .map((e) => e.id)

    // Pre-select dedicated eligibilities by default
    const preSelectIds = eligibilities.value
      .filter((e) => dedicatedEligibilityNames.includes(e.name))
      .map((e) => e.id)

    form.value.eligibilities = [...preSelectIds, ...otherEligibilities]

    dialog.value = true
  }

  async function editContractType(contractType) {
    editing.value = true
    selectedContractType.value = contractType
    if (!companyMultipliers.value) {
      await fetchCompanyMultipliersForForm()
    }
    const multiplierKeys = [
      'overtime',
      'special_holiday',
      'regular_holiday',
      'night_diff',
      'regular_holiday_ot',
      'special_holiday_ot',
      'undertime',
    ]
    const multiplierFields = {}
    multiplierKeys.forEach((key) => {
      const companyVal = companyMultipliers.value?.[`${key}_multiplier`]
      const standardVal = companyVal ?? PHILIPPINES_DEFAULT_MULTIPLIERS[key]
      const ctVal = contractType[`${key}_multiplier`]
      multiplierFields[`${key}_multiplier`] = ctVal ?? standardVal
    })

    // Determine work_hours_type from existing eligibilities
    const currentEligibilities = contractType.eligibilities ?? []
    let workHoursType = null
    if (flexibleId.value && currentEligibilities.includes(flexibleId.value)) {
      workHoursType = 'flexible'
    } else if (strictId.value && currentEligibilities.includes(strictId.value)) {
      workHoursType = 'strict'
    }

    form.value = {
      id: contractType.id,
      name: contractType.name,
      company: contractType.company,
      pay_type: contractType.pay_type ?? 'monthly',
      work_hours_per_week: contractType.work_hours_per_week ?? null,
      work_hours_type: workHoursType,
      eligibilities: currentEligibilities,
      contributions: contractType.contributions ?? [],
      ...multiplierFields,
      special_holiday_enabled: contractType.special_holiday_enabled ?? true,
      regular_holiday_enabled: contractType.regular_holiday_enabled ?? true,
    }
    dialog.value = true
  }

  async function saveContractType() {
    if (!form.value.name) {
      $q.notify({ type: 'negative', message: 'Contract type name is required', position: 'top' })
      return
    }

    // Resolve and validate multipliers
    const multiplierKeys = [
      'overtime',
      'special_holiday',
      'regular_holiday',
      'night_diff',
      'regular_holiday_ot',
      'special_holiday_ot',
      'undertime',
    ]
    const multiplierPayload = {}
    for (const key of multiplierKeys) {
      const num = Number(form.value[`${key}_multiplier`])
      if (isNaN(num) || num < 0) {
        $q.notify({
          type: 'negative',
          message: `${key.replace(/_/g, ' ')} multiplier must be a valid number ≥ 0`,
          position: 'top',
        })
        return
      }
      multiplierPayload[`${key}_multiplier`] = num
    }

    saving.value = true
    try {
      const payload = {
        name: form.value.name,
        company: form.value.company || companyId.value,
        pay_type: form.value.pay_type,
        work_hours_per_week: form.value.work_hours_per_week,
        eligibilities: form.value.eligibilities,
        contributions: form.value.contributions,
        special_holiday_enabled: form.value.special_holiday_enabled,
        regular_holiday_enabled: form.value.regular_holiday_enabled,
        ...multiplierPayload,
      }

      if (editing.value) {
        await api.patch(`${BASE}/organization/contract-types/${form.value.id}/update/`, payload, {
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
        await api.delete(`${BASE}/organization/contract-types/${contractType.id}/delete/`, {
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
    contributions,
    loading,
    saving,
    dialog,
    editing,
    selectedContractType,
    form,
    fetchContractTypes,
    fetchEligibilities,
    fetchContributions,
    openDialog,
    editContractType,
    saveContractType,
    deleteContractType,
    companyMultipliers,
    PHILIPPINES_DEFAULT_MULTIPLIERS,
  }
}
