import { ref, computed } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { useCompanyStore } from 'src/stores/company'
import { BASE } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'
import { safeParseJson } from 'src/composables/utils/storage'

// Philippines Labor Code default multipliers
export const PHILIPPINES_DEFAULT_MULTIPLIERS = {
  overtime: 1.25,
  special_holiday: 1.3,
  regular_holiday: 2.0,
  night_diff: 1.1,
  regular_holiday_ot: 2.6,
  special_holiday_ot: 1.95,
  undertime: 0.5,
}

export function useAdminContracts() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()
  const companyStore = useCompanyStore()
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

  // ─── Assign Contract state ─────────────────────────────────────────────────
  const assignDialog = ref(false)
  const assigning = ref(false)
  const assignForm = ref(_emptyAssignForm())
  const contractAssigned = ref(null)
  const holidayTypes = ref([])
  const activeContract = ref(null)
  const isRenewing = computed(() => !!activeContract.value)

  function resetContractAssigned() {
    contractAssigned.value = null
  }

  function _emptyAssignForm(employeeId = null) {
    return {
      employee_id: employeeId,
      company_id: null,
      contract_type_id: null,
      assignment_mode: 'custom',
      pay_type: null,
      rate: '',
      work_hours_per_week: null,
      position: null,
      department: null,
      payroll_group_id: null,
      payroll_group: null,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      eligibilities: [],
      holiday_pay_types: [],
      contributions: [],
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
        employees.map((emp) =>
          api.get(`${BASE}/user/employee/contracts/${companyId.value}/${emp.id}/`),
        ),
      )

      const raw = []
      contractResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.data) {
          const emp = employees[index]
          const c = result.value.data
          // Handle new format (direct contract object with pay_type)
          const contractData = c.pay_type ? c : c.contract || c
          const ct = contractTypes.value.find((t) => t.id === contractData?.contract_type_id)
          const co = companies.find((x) => x.id === c.companies?.[0]?.company_id)
          raw.push({
            ...c,
            employee_name: emp
              ? `${emp.user?.first_name || ''} ${emp.user?.last_name || ''}`.trim()
              : null,
            contract_type_name: contractData?.name || ct?.name || null,
            company_name: c.companies?.[0]?.company_name || co?.name || null,
          })
        }
      })

      contracts.value = raw
      return contracts.value
    } catch (error) {
      console.error('Error fetching contracts:', error)
      toast.error('Failed to load contracts')
    } finally {
      loading.value = false
    }
  }

  async function fetchContractTypes() {
    try {
      const response = await api.get(`${BASE}/contracts/contract-types/`)
      contractTypes.value = response.data.data ?? response.data ?? []
      return contractTypes.value
    } catch (error) {
      console.error('Error fetching contract types:', error)
    }
  }

  async function fetchHolidayTypes() {
    try {
      const response = await api.get(`${BASE}/attendance/holiday-types/`)
      holidayTypes.value = response.data.data ?? response.data ?? []
      return holidayTypes.value
    } catch (error) {
      console.error('Error fetching holiday types:', error)
      holidayTypes.value = []
    }
  }

  /**
   * A 404 here is an answer, not a failure: the employee has no active
   * contract, the normal state for anyone not yet assigned one. It is declared
   * expected so the shared axios interceptor stays quiet about it — otherwise
   * loading a page of contractless employees fills the console with errors and
   * hides the real ones.
   */
  async function fetchActiveContract(employeeId) {
    try {
      const response = await api.get(
        `${BASE}/user/employee/${companyId.value}/${employeeId}/active-contract/`,
        { expectedStatuses: [404, 500] },
      )
      return response.data ?? null
    } catch (error) {
      const status = error.response?.status
      if (status === 500) {
        console.warn('Server error fetching active contract for employee:', employeeId, error)
      } else if (status !== 404) {
        console.error('Error fetching active contract:', error)
      }
      return null
    }
  }

  function parseEligibilities(raw) {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.map((item) => item.id ?? item)
    if (typeof raw === 'string') {
      // A value that parses as JSON is trusted as-is; one that does not is the
      // comma-separated id list the older endpoint returned.
      const parsed = safeParseJson(raw, null)
      if (parsed !== null) return Array.isArray(parsed) ? parsed : []
      return raw
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n))
    }
    return []
  }

  function matchContractTypeByMultipliers(multipliers) {
    if (!multipliers || !contractTypes.value.length) return null
    const mKeys = [
      'overtime_multiplier',
      'special_holiday_multiplier',
      'regular_holiday_multiplier',
      'night_diff_multiplier',
      'regular_holiday_ot_multiplier',
      'special_holiday_ot_multiplier',
      'undertime_multiplier',
    ]
    for (const ct of contractTypes.value) {
      const match = mKeys.every((key) => {
        if (!multipliers[key] && !ct[key]) return true
        return String(multipliers[key] ?? '') === String(ct[key] ?? '')
      })
      if (match) return ct.id
    }
    return null
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  async function openDialog(fetchDeps) {
    if (!companyId.value) {
      toast.warning('Please select a company first')
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
      toast.error('Please fill all required fields (Employee, Contract Type, Position)')
      return
    }
    if (!form.value.pay_structure?.rate) {
      toast.error('Pay rate is required')
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
        await api.patch(`${BASE}/contracts/employee-contracts/${form.value.id}/`, payload)
        toast.success('Contract updated successfully')
      } else {
        await api.post(`${BASE}/contracts/employee-contracts/`, payload)
        toast.success('Contract created successfully')
      }

      dialog.value = false
      await fetchContracts()
    } catch (error) {
      console.error('Error saving contract:', error)
      toast.error(error.response?.data?.message || 'Failed to save contract')
    } finally {
      saving.value = false
    }
  }

  // ─── Assign Contract ──────────────────────────────────────────────────────

  async function openAssignDialog(employee) {
    if (!companyId.value) {
      toast.warning('Please select a company first')
      return
    }

    assignForm.value = _emptyAssignForm(employee.id)
    assignForm.value.company_id = companyId.value
    activeContract.value = null

    const existing = await fetchActiveContract(employee.id)
    if (existing) {
      activeContract.value = existing
      assignForm.value.pay_type = existing.pay_type ?? null
      assignForm.value.rate = existing.rate ?? ''
      assignForm.value.work_hours_per_week = existing.work_hours_per_week ?? null
      assignForm.value.position = existing.position ?? null
      assignForm.value.department = existing.department ?? null
      assignForm.value.payroll_group_id = existing.payroll_group_id ?? null
      assignForm.value.payroll_group = existing.payroll_group ?? null
      assignForm.value.year = existing.year ?? new Date().getFullYear()
      assignForm.value.month = existing.month ?? new Date().getMonth() + 1
      assignForm.value.eligibilities = parseEligibilities(existing.eligibilities)
      assignForm.value.holiday_pay_types = existing.holiday_pay_types ?? []
      assignForm.value.contributions = existing.contributions?.map((c) => c.id ?? c) ?? []
      const mKeys = [
        'overtime_multiplier',
        'special_holiday_multiplier',
        'regular_holiday_multiplier',
        'night_diff_multiplier',
        'regular_holiday_ot_multiplier',
        'special_holiday_ot_multiplier',
        'undertime_multiplier',
      ]
      for (const key of mKeys) {
        assignForm.value[key] = existing[key] ?? null
      }
      const matchedId = matchContractTypeByMultipliers(existing)
      if (matchedId) {
        assignForm.value.contract_type_id = matchedId
      }
      assignForm.value.assignment_mode = 'custom'
    }

    assignDialog.value = true
  }

  async function assignContract() {
    if (!assignForm.value.employee_id || !assignForm.value.company_id) {
      toast.error('Employee and company are required')
      return
    }

    if (activeContract.value) {
      // ── Renew ── all fields optional, only validate if present
      if (assignForm.value.rate) {
        const rateNum = parseFloat(assignForm.value.rate)
        if (isNaN(rateNum) || rateNum < 0) {
          toast.error('Rate cannot be negative')
          return
        }
        if (rateNum < 100) {
          toast.error('Rate must be at least ₱100')
          return
        }
      }
      if (assignForm.value.work_hours_per_week) {
        const hoursNum = Number(assignForm.value.work_hours_per_week)
        if (hoursNum < 8 || hoursNum > 48) {
          toast.error('Work hours must be between 8 and 48')
          return
        }
      }
    } else {
      // ── Create ── strict validation
      if (
        (assignForm.value.assignment_mode !== 'custom' && !assignForm.value.contract_type_id) ||
        !assignForm.value.pay_type ||
        !assignForm.value.rate
      ) {
        toast.error('Please fill all required fields (Contract Type, Pay Type, Rate, Department)')
        return
      }
      const rateNum = parseFloat(assignForm.value.rate)
      if (isNaN(rateNum) || rateNum < 0) {
        toast.error('Rate cannot be negative')
        return
      }
      if (rateNum < 100) {
        toast.error('Rate must be at least ₱100')
        return
      }
      const hoursNum = assignForm.value.work_hours_per_week
        ? Number(assignForm.value.work_hours_per_week)
        : null
      if (hoursNum !== null && (hoursNum < 8 || hoursNum > 48)) {
        toast.error('Work hours must be between 8 and 48')
        return
      }
      if (!assignForm.value.department) {
        toast.error('Department is required')
        return
      }
    }

    // Validate multiplier values (reject negatives)
    const mKeys = [
      'overtime_multiplier',
      'special_holiday_multiplier',
      'regular_holiday_multiplier',
      'night_diff_multiplier',
      'regular_holiday_ot_multiplier',
      'special_holiday_ot_multiplier',
      'undertime_multiplier',
    ]
    for (const key of mKeys) {
      const val = assignForm.value[key]
      if (val !== null && val !== undefined && val !== '' && parseFloat(val) < 0) {
        toast.error(`${key.replace(/_/g, ' ')} cannot be negative`)
        return
      }
    }

    assigning.value = true
    try {
      const rateNum = assignForm.value.rate ? parseFloat(assignForm.value.rate) : null
      const hoursNum = assignForm.value.work_hours_per_week
        ? Number(assignForm.value.work_hours_per_week)
        : null

      const payload = {
        employee_id: assignForm.value.employee_id,
        company_id: assignForm.value.company_id || companyId.value,
        year: assignForm.value.year ? Number(assignForm.value.year) : null,
        month: assignForm.value.month ? Number(assignForm.value.month) : null,
      }

      if (activeContract.value) {
        // ── Renew payload ──
        if (assignForm.value.contract_type_id)
          payload.contract_type_id = assignForm.value.contract_type_id
        if (assignForm.value.pay_type) payload.pay_type = assignForm.value.pay_type
        if (rateNum) payload.rate = String(rateNum)
        if (hoursNum) payload.work_hours_per_week = hoursNum
        if (assignForm.value.position) payload.position = Number(assignForm.value.position)
        if (assignForm.value.department) payload.department = Number(assignForm.value.department)
        payload.department_id = Number(assignForm.value.department || 0)
        payload.payroll_group_id = assignForm.value.payroll_group_id || null
        payload.payroll_group = assignForm.value.payroll_group || null
        payload.eligibilities = assignForm.value.eligibilities ?? []
        payload.holiday_pay_types = assignForm.value.holiday_pay_types ?? []
        if (assignForm.value.contributions?.length)
          payload.contributions = assignForm.value.contributions.map((c) => c.id ?? c)

        const mKeys = [
          'overtime_multiplier',
          'special_holiday_multiplier',
          'regular_holiday_multiplier',
          'night_diff_multiplier',
          'regular_holiday_ot_multiplier',
          'special_holiday_ot_multiplier',
          'undertime_multiplier',
        ]
        for (const key of mKeys) {
          const val = assignForm.value[key]
          if (val !== null && val !== undefined) payload[key] = String(val)
        }
      } else {
        // ── Create payload ──
        if (assignForm.value.contract_type_id)
          payload.contract_type_id = assignForm.value.contract_type_id
        payload.pay_type = assignForm.value.pay_type
        payload.rate = String(rateNum)
        if (hoursNum) payload.work_hours_per_week = hoursNum
        if (assignForm.value.position) payload.position = Number(assignForm.value.position)
        payload.department = Number(assignForm.value.department)
        payload.department_id = Number(assignForm.value.department || 0)
        payload.payroll_group_id = assignForm.value.payroll_group_id || null
        payload.payroll_group = assignForm.value.payroll_group || null
        payload.eligibilities = assignForm.value.eligibilities ?? []
        payload.holiday_pay_types = assignForm.value.holiday_pay_types ?? []
        if (assignForm.value.contributions?.length)
          payload.contributions = assignForm.value.contributions.map((c) => c.id ?? c)

        const mKeys = [
          'overtime_multiplier',
          'special_holiday_multiplier',
          'regular_holiday_multiplier',
          'night_diff_multiplier',
          'regular_holiday_ot_multiplier',
          'special_holiday_ot_multiplier',
          'undertime_multiplier',
        ]
        for (const key of mKeys) {
          const val = assignForm.value[key]
          if (val !== null && val !== undefined) payload[key] = String(val)
        }

        if (!payload.work_hours_per_week) delete payload.work_hours_per_week
        if (!payload.position) delete payload.position
        if (!payload.contract_type_id) delete payload.contract_type_id
      }

      console.log('Payload to send:', payload)

      if (activeContract.value) {
        await api.post(
          `${BASE}/user/employee/${payload.company_id}/${payload.employee_id}/renew-contract/`,
          payload,
        )
        toast.success('Contract renewed successfully')
      } else {
        await api.post(`${BASE}/user/employment-contracts/create/`, payload)
        toast.success('Contract assigned successfully')
      }
      contractAssigned.value = assignForm.value.employee_id
      assignDialog.value = false
      activeContract.value = null
    } catch (error) {
      console.error('Error assigning contract:', error)
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2))
      const data = error.response?.data
      const message = data
        ? Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
        : 'Failed to assign contract'
      toast.error(message, { timeout: 8000 })
    } finally {
      assigning.value = false
    }
  }

  // ─── Bulk Assign Contract ──────────────────────────────────────────────────

  async function bulkAssignContract(employeeIds) {
    const rateNum = parseFloat(assignForm.value.rate)
    if (isNaN(rateNum) || rateNum < 0) {
      toast.error('Rate cannot be negative')
      return { successCount: 0, failCount: 0 }
    }
    if (rateNum < 100) {
      toast.error('Rate must be at least ₱100')
      return { successCount: 0, failCount: 0 }
    }

    const hoursNum = assignForm.value.work_hours_per_week
      ? Number(assignForm.value.work_hours_per_week)
      : null
    if (hoursNum !== null && (hoursNum < 8 || hoursNum > 48)) {
      toast.error('Work hours must be between 8 and 48')
      return { successCount: 0, failCount: 0 }
    }

    if (!assignForm.value.department) {
      toast.error('Department is required')
      return { successCount: 0, failCount: 0 }
    }

    assigning.value = true
    let successCount = 0
    let failCount = 0

    for (const empId of employeeIds) {
      try {
        const payload = {
          employee_id: empId,
          company_id: assignForm.value.company_id || companyId.value,
          contract_type_id: assignForm.value.contract_type_id,
          pay_type: assignForm.value.pay_type,
          rate: String(rateNum),
          work_hours_per_week: hoursNum,
          position: assignForm.value.position ? Number(assignForm.value.position) : null,
          department: Number(assignForm.value.department),
          department_id: Number(assignForm.value.department || 0),
          payroll_group_id: assignForm.value.payroll_group_id || null,
          payroll_group: assignForm.value.payroll_group || null,
          year: assignForm.value.year ? Number(assignForm.value.year) : null,
          month: assignForm.value.month ? Number(assignForm.value.month) : null,
          eligibilities: assignForm.value.eligibilities ?? [],
          holiday_pay_types: assignForm.value.holiday_pay_types ?? [],
          contributions: assignForm.value.contributions?.length
            ? assignForm.value.contributions.map((c) => c.id ?? c)
            : [],
        }
        const mKeys = [
          'overtime_multiplier',
          'special_holiday_multiplier',
          'regular_holiday_multiplier',
          'night_diff_multiplier',
          'regular_holiday_ot_multiplier',
          'special_holiday_ot_multiplier',
          'undertime_multiplier',
        ]
        for (const key of mKeys) {
          if (assignForm.value[key]) payload[key] = String(assignForm.value[key])
        }
        if (!payload.work_hours_per_week) delete payload.work_hours_per_week
        if (!payload.position) delete payload.position
        if (!payload.contract_type_id) delete payload.contract_type_id

        await api.post(`${BASE}/user/employment-contracts/create/`, payload)
        successCount++
      } catch {
        failCount++
      }
    }

    assigning.value = false
    assignDialog.value = false
    contractAssigned.value = true

    return { successCount, failCount }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deleteContract(contract) {
    $q.dialog({
      title: 'Delete this contract?',
      message: `The contract for ${contract.employee_name} is removed, along with the pay terms it sets. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/contracts/employee-contracts/${contract.id}/`)
        toast.success('Contract deleted successfully')
        await fetchContracts()
      } catch (error) {
        console.error('Error deleting contract:', error)
        toast.error('Failed to delete contract')
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
    fetchHolidayTypes,
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
    bulkAssignContract,
    contractAssigned,
    resetContractAssigned,
    holidayTypes,
    activeContract,
    isRenewing,
    fetchActiveContract,
    // Exposed for component use
    PHILIPPINES_DEFAULT_MULTIPLIERS,
  }
}
