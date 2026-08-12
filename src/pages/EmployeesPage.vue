<template>
  <PageShell>
    <div class="employees-card">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-titles">
            <h1 class="page-title">Employees</h1>
          </div>
          <div class="header-actions">
            <q-input
              v-model="searchTerm"
              placeholder="Search employees..."
              class="header-search"
              dense
              outlined
              @update:model-value="filterEmployees"
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
            <q-btn
              label="Add employee"
              icon="add"
              class="add-employee-btn header-add-btn"
              unelevated
              @click="openAddModal"
            />
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <EmployeeStatsCards :stats="employeeStats" />

      <!-- Main Table Section -->
      <div class="table-block">
        <div v-if="selectedEmployees.length > 0" class="selection-bar">
          <div class="selection-bar-content">
            <div class="selection-info">
              <q-icon name="check_circle" size="20px" color="primary" />
              <span class="selection-text">{{ selectedEmployees.length }} selected</span>
            </div>
            <div class="selection-actions">
              <q-btn
                unelevated
                color="primary"
                icon="assignment"
                label="Assign Payroll Profile"
                class="add-employee-btn"
                @click="handleBulkAssignDialog"
              />
              <q-btn
                unelevated
                color="negative"
                icon="block"
                label="Terminate"
                class="add-employee-btn"
                @click="handleBulkTerminateDialog"
              />
              <q-btn flat dense label="Clear" @click="selectedEmployees = []" />
            </div>
          </div>
        </div>
        <EmployeeTable
          v-model:selected="selectedEmployees"
          :employees="paginatedEmployees"
          :loading="loading"
          :contracts="employeeContracts"
          :company-id="companyId"
          :leave-types="leaveTypes"
          :loading-contract-ids="loadingContractIds"
          :loading-balance-ids="loadingBalanceIds"
          @view="viewEmployee"
          @edit="editEmployee"
          @assign="handleOpenAssignDialog"
          @terminate="confirmTerminate"
          @restore="confirmRestore"
          @view-photo="viewEmployeePhoto"
          @add-leave-balance="openLeaveBalanceModal"
          @add-cto-balance="openCtoBalanceModal"
        />
      </div>

      <!-- Pagination Controls -->
      <div class="pagination-bar" v-if="filteredEmployees.length > 0">
        <div class="pagination-info">
          <span class="pagination-text">
            Showing {{ (employeePage - 1) * employeePageSize + 1 }} –
            {{ Math.min(employeePage * employeePageSize, filteredEmployees.length) }}
            of {{ filteredEmployees.length }} employees
          </span>
          <q-select
            v-model="employeePageSize"
            :options="pageSizeOptions.map((n) => ({ label: `${n} per page`, value: n }))"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            dense
            outlined
            class="page-size-select"
            @update:model-value="onPageSizeChange"
          />
        </div>
        <q-pagination
          v-model="employeePage"
          :max="totalPages"
          :max-pages="6"
          boundary-numbers
          direction-links
          color="primary"
          active-color="primary"
          active-text-color="white"
          icon-first="first_page"
          icon-prev="chevron_left"
          icon-next="chevron_right"
          icon-last="last_page"
          class="schedule-pagination"
          @update:model-value="onPageChange"
        />
      </div>
    </div>

    <!-- Modals -->
    <EmployeeAddModal
      v-model="showAddModal"
      :role-options="roleOptions"
      :saving="savingEmployee"
      :uploading-avatar="uploadingAvatar"
      @submit="addEmployee"
      @cancel="cancelAdd"
      @avatar-select="handleAvatarSelect"
      @avatar-remove="removeAvatar"
    />

    <EmployeeEditModal
      v-model="showEditModal"
      :employee="selectedEmployee"
      :role-options="roleOptions"
      :saving="savingEmployee"
      :uploading-avatar="uploadingAvatar"
      @submit="saveEmployee"
      @cancel="cancelEdit"
      @avatar-select="handleEditAvatarSelect"
      @avatar-remove="removeEditAvatar"
    />

    <EmployeeViewModal v-model="showViewModal" :employee="selectedEmployee" />

    <EmployeeTerminateDialog
      v-model="showTerminateDialog"
      :employee="employeeToTerminate"
      :loading="terminating"
      @confirm="terminateEmployee"
    />

    <EmployeeRestoreDialog
      v-model="showRestoreDialog"
      :employee="employeeToRestore"
      :loading="restoring"
      @confirm="restoreEmployee"
    />

    <AttendanceEmployeePhotoViewer v-model="showPhotoViewer" :image-url="selectedPhotoUrl" />

    <EmployeeAssignContractDialog
      v-model="assignDialog"
      :form="assignForm"
      :assigning="assigning"
      :employee="selectedAssignEmployee"
      :contract-type-options="contractTypeOptions"
      :positions="positions"
      :departments="departments"
      :eligibility-objects="selectedEligibilityObjectsData"
      :is-renewing="isRenewing"
      :all-eligibility-options="eligibilityOptions"
      :contribution-options="contributions"
      :payroll-group-options="payrollGroups"
      @update:field="updateAssignField"
      @contract-type-change="onContractTypeChange"
      @submit="handleAssignSubmit"
    />

    <EmployeeLeaveBalanceModal
      v-model="showLeaveBalanceModal"
      :employee="selectedBalanceEmployee"
      :leave-type-options="leaveTypes"
      :loading-leave-types="loadingLeaveTypes"
      :submitting="submittingLeave"
      @submit="handleAddLeaveBalance"
      @cancel="showLeaveBalanceModal = false"
    />

    <EmployeeCtoBalanceModal
      v-model="showCtoBalanceModal"
      :employee="selectedBalanceEmployee"
      :submitting="submittingCto"
      @submit="handleAddCtoBalance"
      @cancel="showCtoBalanceModal = false"
    />
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useEmployees } from '@/composables/page/useEmployees'
import { useRolesAndPositions } from '@/composables/page/useRolesAndPositions'
import { useOrganization } from '@/composables/page/useOrganization'
import { useCompany } from '@/composables/page/useCompany'
import { useAdminContracts } from '@/composables/admin/useAdminContracts'
import { useAdminContractTypes } from '@/composables/admin/useAdminContractTypes'
import { useAdminPositions } from '@/composables/admin/useAdminPositions'
import { useAdminDepartments } from '@/composables/admin/useAdminDepartments'
import { useAdminPayrollGroups } from '@/composables/admin/useAdminPayrollGroups'
import { useEmployeeBalances } from '@/composables/page/useEmployeeBalances'

import EmployeeStatsCards from '@/components/pages/Employees/EmployeeStatsCards.vue'
import EmployeeTable from '@/components/pages/Employees/EmployeeTable.vue'
import EmployeeAddModal from '@/components/pages/Employees/EmployeeAddModal.vue'
import EmployeeEditModal from '@/components/pages/Employees/EmployeeEditModal.vue'
import EmployeeViewModal from '@/components/pages/Employees/EmployeeViewModal.vue'
import EmployeeTerminateDialog from '@/components/pages/Employees/EmployeeTerminateDialog.vue'
import EmployeeRestoreDialog from '@/components/pages/Employees/EmployeeRestoreDialog.vue'
import EmployeeAssignContractDialog from '@/components/pages/Employees/EmployeeAssignContractDialog.vue'
import AttendanceEmployeePhotoViewer from '@/components/pages/Attendance/AttendanceEmployeePhotoViewer.vue'
import EmployeeLeaveBalanceModal from '@/components/pages/Employees/EmployeeLeaveBalanceModal.vue'
import EmployeeCtoBalanceModal from '@/components/pages/Employees/EmployeeCtoBalanceModal.vue'

const $q = useQuasar()

// ─── Composables ──────────────────────────────────────────────────────────────
const {
  employees,
  loading,
  saving: savingEmployee,
  fetchEmployees: fetchEmployeesList,
  fetchEmployee,
  fetchEmployeeContract,
  addEmployee: addEmployeeApi,
  updateEmployee,
  uploadEmployeeAvatar,
  terminateEmployee: terminateEmployeeApi,
  restoreEmployee: restoreEmployeeApi,
} = useEmployees()

const { userRoles, fetchUserRoles } = useRolesAndPositions()
const { sites: rawSites, fetchSites: fetchSitesApi } = useOrganization()
const { companyId } = useCompany()

const {
  assignDialog,
  assigning,
  assignForm,
  openAssignDialog,
  assignContract,
  bulkAssignContract,
  contractAssigned,
  resetContractAssigned,
  holidayTypes,
  fetchHolidayTypes,
  activeContract,
  isRenewing,
} = useAdminContracts()

const {
  contractTypes: contractTypeOptions,
  fetchContractTypes,
  eligibilities: eligibilityOptions,
  fetchEligibilities: fetchEligibilityOptions,
  contributions,
  fetchContributions,
  fetchCompanyMultipliersForForm,
  companyMultipliers,
  PHILIPPINES_DEFAULT_MULTIPLIERS: defaultMultipliers,
} = useAdminContractTypes()

const { positions, fetchPositions } = useAdminPositions()
const { departments, fetchDepartments } = useAdminDepartments()
const { payrollGroups, fetchPayrollGroups } = useAdminPayrollGroups()

const {
  leaveTypes,
  loadingLeaveTypes,
  fetchLeaveTypes,
  fetchEmployeeBalances,
  addLeaveBalance,
  addCtoBalance,
  submittingLeave,
  submittingCto,
} = useEmployeeBalances()

const selectedEligibilityObjectsData = ref([])

// ─── Local UI state ───────────────────────────────────────────────────────────
const filteredEmployees = ref([])
const searchTerm = ref('')
const sortBy = ref('A-Z')
const sites = ref([])
const selectedSite = ref(null)
const employeeContracts = ref({})
const loadingContractIds = ref(new Set())
const loadingBalanceIds = ref(new Set())
const payTypeAutoFilled = ref(false)
const selectedEmployees = ref([])
const bulkAssignEmployeeIds = ref([])
const selectedAssignEmployee = ref(null)
// Pagination state
const employeePage = ref(1)
const employeePageSize = ref(20)
const pageSizeOptions = [10, 20, 50]

function onContractTypeChange(contractTypeId) {
  assignForm.value.contract_type_id = contractTypeId

  const selectedType = contractTypeOptions.value.find((ct) => ct.id === contractTypeId)
  if (selectedType && selectedType.eligibilities) {
    const eligs = eligibilityOptions.value.filter((el) =>
      selectedType.eligibilities.includes(el.id),
    )
    selectedEligibilityObjectsData.value = eligs
    assignForm.value.eligibilities = [...selectedType.eligibilities]
  } else {
    selectedEligibilityObjectsData.value = []
    assignForm.value.eligibilities = []
  }
  if (selectedType?.pay_type) {
    assignForm.value.pay_type = selectedType.pay_type
  } else {
    assignForm.value.pay_type = null
  }
  if (assignForm.value.pay_type === 'daily') {
    assignForm.value.work_hours_per_week = 8
  } else {
    assignForm.value.work_hours_per_week = 48
  }
  if (!assignForm.value.rate || assignForm.value.rate < 100) {
    assignForm.value.rate = 100
  }

  // Populate contributions from contract type
  if (selectedType?.contributions?.length) {
    assignForm.value.contributions = [...selectedType.contributions]
  } else {
    assignForm.value.contributions = []
  }

  // Populate multipliers from contract type
  const mKeys = ['overtime_multiplier', 'special_holiday_multiplier', 'regular_holiday_multiplier',
    'night_diff_multiplier', 'regular_holiday_ot_multiplier', 'special_holiday_ot_multiplier', 'undertime_multiplier']
  for (const key of mKeys) {
    assignForm.value[key] = selectedType?.[key] ?? null
  }

  // Derive holiday_pay_types from contract type flags
  const codes = []
  if (selectedType) {
    const matchCode = (flag, hint) => {
      if (!flag) return
      const ht = holidayTypes.value.find(
        (h) => h.code?.toLowerCase().includes(hint) || h.name?.toLowerCase().includes(hint),
      )
      if (ht?.code) codes.push(ht.code)
    }
    matchCode(selectedType.regular_holiday_enabled, 'regular')
    matchCode(selectedType.special_holiday_enabled, 'special')
  }
  assignForm.value.holiday_pay_types = codes
}

watch(
  () => assignForm.value.pay_type,
  (newType) => {
    if (newType === 'daily') {
      assignForm.value.work_hours_per_week = 8
    } else if (newType === 'monthly') {
      assignForm.value.work_hours_per_week = 48
    }
    if (!assignForm.value.rate || assignForm.value.rate < 100) {
      assignForm.value.rate = 100
    }
  },
)

watch(
  () => eligibilityOptions.value,
  (newEligs) => {
    if (newEligs.length && assignForm.value.eligibilities.length) {
      const eligs = newEligs.filter((el) => assignForm.value.eligibilities.includes(el.id))
      selectedEligibilityObjectsData.value = eligs
    }
  },
  { deep: true },
)

watch(
  () => assignForm.value.assignment_mode,
  (newMode) => {
    if (newMode === 'contract_type' && assignForm.value.contract_type_id) {
      onContractTypeChange(assignForm.value.contract_type_id)
    } else if (newMode === 'custom') {
      assignForm.value.contract_type_id = null
      assignForm.value.pay_type = null
      assignForm.value.eligibilities = eligibilityOptions.value.map((e) => e.id)
      assignForm.value.contributions = []
      assignForm.value.holiday_pay_types = []
      assignForm.value.overtime_multiplier = companyMultipliers.value?.overtime_multiplier ?? defaultMultipliers.overtime ?? null
      assignForm.value.special_holiday_multiplier = companyMultipliers.value?.special_holiday_multiplier ?? defaultMultipliers.special_holiday ?? null
      assignForm.value.regular_holiday_multiplier = companyMultipliers.value?.regular_holiday_multiplier ?? defaultMultipliers.regular_holiday ?? null
      assignForm.value.night_diff_multiplier = companyMultipliers.value?.night_diff_multiplier ?? defaultMultipliers.night_diff ?? null
      assignForm.value.regular_holiday_ot_multiplier = companyMultipliers.value?.regular_holiday_ot_multiplier ?? defaultMultipliers.regular_holiday_ot ?? null
      assignForm.value.special_holiday_ot_multiplier = companyMultipliers.value?.special_holiday_ot_multiplier ?? defaultMultipliers.special_holiday_ot ?? null
      assignForm.value.undertime_multiplier = companyMultipliers.value?.undertime_multiplier ?? defaultMultipliers.undertime ?? null
    }
  },
)

watch(contractAssigned, (newVal) => {
  if (newVal) {
    fetchEmployees()
    resetContractAssigned()
  }
})

watch(
  () => filteredEmployees.value?.length ?? 0,
  () => {
    employeePage.value = 1
  },
)

watch(assignDialog, (open) => {
  if (!open) {
    if (bulkAssignEmployeeIds.value.length > 0) {
      bulkAssignEmployeeIds.value = []
    }
    selectedAssignEmployee.value = null
  }
})

// Modal states
const showAddModal = ref(false)
const showViewModal = ref(false)
const showEditModal = ref(false)
const showTerminateDialog = ref(false)
const showRestoreDialog = ref(false)
const selectedEmployee = ref({})
const employeeToTerminate = ref({})
const employeeToRestore = ref({})
const terminating = ref(false)
const restoring = ref(false)
const showPhotoViewer = ref(false)
const selectedPhotoUrl = ref('')

// Balance modals
const showLeaveBalanceModal = ref(false)
const showCtoBalanceModal = ref(false)
const selectedBalanceEmployee = ref(null)

// Avatar
const avatarFile = ref(null)
const avatarPreview = ref(null)
const editAvatarFile = ref(null)
const editAvatarPreview = ref(null)
const uploadingAvatar = ref(false)

// Form states
const confirmPassword = ref('')
const addForm = ref({
  user: { username: '', email: '', first_name: '', middle_name: '', last_name: '' },
  password: '',
  user_role: null,
  civil_status: '',
  address: '',
  phone_number: '',
  emergency_contact: '',
  birthday: '',
  bank_acct: '',
  timezone: '',
})

const editForm = ref({
  user: { id: 0, username: '', email: '', first_name: '', last_name: '' },
  user_role: null,
  civil_status: '',
  address: '',
  phone_number: '',
  emergency_contact: '',
  birthday: '',
  bank_acct: '',
  timezone: '',
})

// ─── Computed ─────────────────────────────────────────────────────────────────
const roleOptions = computed(() => userRoles.value)
const employeeStats = computed(() => {
  const total = employees.value.length
  const active = employees.value.filter((emp) => getStatus(emp) === 'Active').length
  const terminated = employees.value.filter((emp) => getStatus(emp) === 'Terminated').length
  return { total, active, terminated }
})

const totalPages = computed(
  () => Math.ceil((filteredEmployees.value?.length ?? 0) / employeePageSize.value) || 1,
)

const paginatedEmployees = computed(() => {
  if (!filteredEmployees.value) return []
  const start = (employeePage.value - 1) * employeePageSize.value
  return filteredEmployees.value.slice(start, start + employeePageSize.value)
})

const selectedActiveEmployees = computed(() =>
  selectedEmployees.value.filter((emp) => getStatus(emp) === 'Active'),
)

// ─── Helper Functions ─────────────────────────────────────────────────────────

const getFullName = (employee) => {
  if (!employee) return 'N/A'
  return (
    `${employee.user?.first_name || ''} ${employee.user?.last_name || ''}`.trim() ||
    employee.user?.username ||
    'N/A'
  )
}

const getEmail = (employee) => employee?.user?.email || 'N/A'

const getRole = (employee) => {
  if (!employee) return 'N/A'
  if (employee.user_role_name) return String(employee.user_role_name)
  if (employee.user_role?.name) return String(employee.user_role.name)
  if (employee.companies?.length > 0) {
    const role = employee.companies[0].user_role
    return role?.name ? String(role.name) : 'N/A'
  }
  return 'N/A'
}

const getPhoneNumber = (employee) => employee?.phone_number || 'N/A'

const getStatus = (employee) => {
  if (!employee) return 'N/A'
  if (employee.status?.toLowerCase() === 'terminated') return 'Terminated'
  if (employee.is_active === false) return 'Terminated'
  const empStatus = employee.companies?.[0]?.employment_status
  if (empStatus?.toLowerCase() === 'terminated') return 'Terminated'
  return 'Active'
}

function formatPhilippinePhone(number) {
  if (!number) return ''
  let cleaned = number.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = '+63' + cleaned.slice(1)
  else if (cleaned.startsWith('9')) cleaned = '+63' + cleaned
  else if (cleaned.startsWith('63')) cleaned = '+' + cleaned
  const valid = /^\+639\d{9}$/.test(cleaned)
  return valid ? cleaned : ''
}

// ─── Data fetching ────────────────────────────────────────────────────────────

const fetchEmployees = async () => {
  try {
    loading.value = true
    const list = await fetchEmployeesList({ force: true })
    employees.value = list
    filteredEmployees.value = list
    sortEmployees()

    // Clear stale contract / balance caches when the list refreshes
    delete employeeContracts.value[companyId.value]
    employees.value.forEach((emp) => {
      emp._balance = undefined
    })

    // Show table immediately — do not block on heavy per-employee fetches
    loading.value = false

    // Fetch leave types and the first page of contract / balance data in background
    await Promise.all([
      fetchLeaveTypes(companyId.value).catch(() => {}),
      fetchPageData(),
    ])
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail ?? 'Failed to fetch employees',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

const fetchBalances = async (employeeList, concurrency = 20) => {
  if (!employeeList?.length) return
  if (!companyId.value) return

  try {
    for (let i = 0; i < employeeList.length; i += concurrency) {
      const batch = employeeList.slice(i, i + concurrency)
      const promises = batch.map((emp) =>
        fetchEmployeeBalances(companyId.value, emp.id)
          .then((data) => ({ status: 'fulfilled', emp, data }))
          .catch(() => ({ status: 'rejected', emp, data: null })),
      )
      const results = await Promise.all(promises)
      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          res.emp._balance = res.data
        } else {
          res.emp._balance = null
        }
      })
    }
    filteredEmployees.value = [...filteredEmployees.value]
  } catch {
    // Silent - balances remain as null
  }
}

const fetchContracts = async (employeeList, concurrency = 20) => {
  if (!employeeList?.length) return
  if (!companyId.value) return

  if (!employeeContracts.value[companyId.value]) {
    employeeContracts.value[companyId.value] = {}
  }

  try {
    for (let i = 0; i < employeeList.length; i += concurrency) {
      const batch = employeeList.slice(i, i + concurrency)
      const promises = batch.map((emp) =>
        fetchEmployeeContract(emp.id)
          .then((data) => ({ status: 'fulfilled', empId: emp.id, data }))
          .catch(() => ({ status: 'rejected', empId: emp.id, data: null })),
      )
      const results = await Promise.all(promises)
      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.data) {
          employeeContracts.value[companyId.value][res.empId] = res.data
        }
      })
    }
    filteredEmployees.value = [...filteredEmployees.value]
  } catch {
    // Silent - contracts remain as "No Contract"
  }
}

let pageDataInFlight = null

const fetchPageData = async () => {
  if (pageDataInFlight) return pageDataInFlight

  pageDataInFlight = (async () => {
    const pageEmps = paginatedEmployees.value
    if (!pageEmps.length) return

    const uncachedContract = pageEmps.filter((emp) => {
      const companyContracts = employeeContracts.value[companyId.value]
      return !companyContracts?.[emp.id]
    })

    const uncachedBalance = pageEmps.filter((emp) => emp._balance === undefined)

    if (!uncachedContract.length && !uncachedBalance.length) return

    // Mark IDs as loading
    uncachedContract.forEach((e) => loadingContractIds.value.add(e.id))
    uncachedBalance.forEach((e) => loadingBalanceIds.value.add(e.id))

    try {
      await Promise.all([
        uncachedContract.length ? fetchContracts(uncachedContract) : Promise.resolve(),
        uncachedBalance.length ? fetchBalances(uncachedBalance) : Promise.resolve(),
      ])
    } catch {
      // Silent
    } finally {
      // Clear loading state
      uncachedContract.forEach((e) => loadingContractIds.value.delete(e.id))
      uncachedBalance.forEach((e) => loadingBalanceIds.value.delete(e.id))
    }
  })()

  try {
    return await pageDataInFlight
  } finally {
    pageDataInFlight = null
  }
}

const fetchRoles = async () => {
  try {
    await fetchUserRoles()
  } catch {
    /* silent */
  }
}

const fetchSites = async () => {
  try {
    await fetchSitesApi()
    sites.value = [
      { label: 'All Sites', value: null },
      ...rawSites.value.map((site) => ({
        label: site.name || site.site_name || `Site ${site.id}`,
        value: site.id,
      })),
    ]
  } catch (err) {
    sites.value = [{ label: 'All Sites', value: null }]
    $q.notify({
      type: 'warning',
      message: err.response?.data?.detail ?? 'Could not load sites. Showing all employees.',
      position: 'top',
    })
  }
}

const fetchEmployeeDetails = async (employeeId) => {
  try {
    return await fetchEmployee(employeeId)
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to fetch employee details', position: 'top' })
    return null
  }
}

// ─── Add Employee ─────────────────────────────────────────────────────────────

async function addEmployee(formData) {
  try {
    const formattedPhone = formatPhilippinePhone(formData.phone_number)
    const formattedEmergency = formatPhilippinePhone(formData.emergency_contact)

    if (!formattedPhone) {
      return $q.notify({
        type: 'warning',
        message: 'Invalid phone number format. Please use +639XXXXXXXXX or 09XXXXXXXXX.',
        position: 'top',
      })
    }

    const payload = {
      username: formData.user.username,
      email: formData.user.email,
      password: formData.password,
      first_name: formData.user.first_name,
      middle_name: formData.user.middle_name || '',
      last_name: formData.user.last_name,
      flow: 'admin',
      civil_status: formData.civil_status || '',
      address: formData.address || '',
      phone_number: formattedPhone,
      emergency_contact: formattedEmergency,
      birthday: formData.birthday || null,
      bank_acct: formData.bank_acct || '',
      timezone: formData.timezone || '',
      last_date_updated: new Date().toISOString(),
      user_role: formData.user_role?.id ? parseInt(formData.user_role.id) : null,
      status: 'active',
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === undefined || payload[key] === null) {
        delete payload[key]
      }
    })

    const newEmployee = await addEmployeeApi(payload)

    if (avatarFile.value && newEmployee.id) {
      try {
        uploadingAvatar.value = true
        const uploadResponse = await uploadEmployeeAvatar(newEmployee.id, avatarFile.value)
        await fetchEmployees()
        const picture_url = uploadResponse?.user?.picture_url || uploadResponse?.picture_url || null
        if (picture_url) {
          const index = employees.value.findIndex((emp) => emp.id === newEmployee.id)
          if (index !== -1 && employees.value[index].user) {
            employees.value[index].user.picture_url = picture_url
            filteredEmployees.value = [...employees.value]
          }
        }
        $q.notify({
          type: 'positive',
          message: 'Employee and profile picture added successfully!',
          position: 'top',
        })
      } catch {
        await fetchEmployees()
        $q.notify({
          type: 'warning',
          message: 'Employee created but profile picture upload failed',
          position: 'top',
        })
      } finally {
        uploadingAvatar.value = false
      }
    } else {
      await fetchEmployees()
      $q.notify({ type: 'positive', message: 'Employee added successfully!', position: 'top' })
    }

    resetAddForm()
    showAddModal.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.response?.data?.error ||
        Object.entries(error.response?.data || {})
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join(' | ') ||
        'Failed to add employee',
      position: 'top',
      timeout: 5000,
    })
  }
}

// ─── Save Employee (Edit) ─────────────────────────────────────────────────────

const saveEmployee = async (formData) => {
  try {
    const formattedPhone = formatPhilippinePhone(formData.phone_number)
    const formattedEmergency = formatPhilippinePhone(formData.emergency_contact)

    if (!formattedPhone) {
      return $q.notify({
        type: 'warning',
        message: 'Invalid phone number format. Please use +639XXXXXXXXX or 09XXXXXXXXX.',
        position: 'top',
      })
    }

    const payload = {
      user: {
        id: formData.user.id,
        username: formData.user.username,
        email: formData.user.email,
        first_name: formData.user.first_name,
        middle_name: formData.user.middle_name || '',
        last_name: formData.user.last_name,
      },
      user_role_id: formData.user_role?.id,
      civil_status: formData.civil_status,
      address: formData.address,
      phone_number: formattedPhone,
      emergency_contact: formattedEmergency,
      birthday: formData.birthday || null,
      bank_acct: formData.bank_acct,
      timezone: formData.timezone,
    }

    const updatedEmployee = await updateEmployee(selectedEmployee.value.id, payload)

    if (editAvatarFile.value && selectedEmployee.value.id) {
      try {
        uploadingAvatar.value = true
        const uploadResponse = await uploadEmployeeAvatar(
          selectedEmployee.value.id,
          editAvatarFile.value,
        )
        await fetchEmployees()
        const picture_url = uploadResponse?.user?.picture_url || uploadResponse?.picture_url || null
        if (picture_url) {
          const index = employees.value.findIndex((emp) => emp.id === selectedEmployee.value.id)
          if (index !== -1 && employees.value[index].user) {
            employees.value[index].user.picture_url = picture_url
            filteredEmployees.value = [...employees.value]
          }
        }
      } catch {
        $q.notify({
          type: 'warning',
          message: 'Employee updated but profile picture upload failed',
          position: 'top',
        })
        const index = employees.value.findIndex((emp) => emp.id === updatedEmployee.id)
        if (index !== -1) employees.value[index] = updatedEmployee
        filteredEmployees.value = [...employees.value]
        sortEmployees()
      } finally {
        uploadingAvatar.value = false
      }
    } else {
      const index = employees.value.findIndex((emp) => emp.id === updatedEmployee.id)
      if (index !== -1) employees.value[index] = updatedEmployee
      filteredEmployees.value = [...employees.value]
      sortEmployees()
    }

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(selectedEmployee.value)} updated successfully.`,
      position: 'top',
    })
    showEditModal.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail ?? 'Failed to update employee',
      position: 'top',
    })
  }
}

async function handleOpenAssignDialog(employee) {
  if (!contractTypeOptions.value.length) {
    await fetchContractTypes()
  }
  if (!eligibilityOptions.value.length) {
    await fetchEligibilityOptions()
  }
  if (!positions.value.length) {
    await fetchPositions()
  }
  if (!payrollGroups.value.length) {
    await fetchPayrollGroups()
  }
  if (!holidayTypes.value.length) {
    await fetchHolidayTypes()
  }
  if (!contributions.value.length) {
    await fetchContributions()
  }
  if (!companyMultipliers.value) {
    await fetchCompanyMultipliersForForm()
  }
  selectedAssignEmployee.value = employee
  await openAssignDialog(employee)

  // Populate defaults for new custom assignment
  if (!activeContract.value && assignForm.value.assignment_mode === 'custom') {
    assignForm.value.eligibilities = eligibilityOptions.value.map((e) => e.id)
    assignForm.value.contributions = contributions.value.map((c) => c.id)
    assignForm.value.overtime_multiplier = companyMultipliers.value?.overtime_multiplier ?? defaultMultipliers.overtime ?? null
    assignForm.value.special_holiday_multiplier = companyMultipliers.value?.special_holiday_multiplier ?? defaultMultipliers.special_holiday ?? null
    assignForm.value.regular_holiday_multiplier = companyMultipliers.value?.regular_holiday_multiplier ?? defaultMultipliers.regular_holiday ?? null
    assignForm.value.night_diff_multiplier = companyMultipliers.value?.night_diff_multiplier ?? defaultMultipliers.night_diff ?? null
    assignForm.value.regular_holiday_ot_multiplier = companyMultipliers.value?.regular_holiday_ot_multiplier ?? defaultMultipliers.regular_holiday_ot ?? null
    assignForm.value.special_holiday_ot_multiplier = companyMultipliers.value?.special_holiday_ot_multiplier ?? defaultMultipliers.special_holiday_ot ?? null
    assignForm.value.undertime_multiplier = companyMultipliers.value?.undertime_multiplier ?? defaultMultipliers.undertime ?? null
  }

  // Sync eligibility display when pre-filled from existing contract
  if (activeContract.value && assignForm.value.eligibilities.length) {
    const eligs = eligibilityOptions.value.filter((el) =>
      assignForm.value.eligibilities.includes(el.id),
    )
    selectedEligibilityObjectsData.value = eligs
  }
}

async function handleBulkAssignDialog() {
  if (!contractTypeOptions.value.length) await fetchContractTypes()
  if (!eligibilityOptions.value.length) await fetchEligibilityOptions()
  if (!positions.value.length) await fetchPositions()
  if (!payrollGroups.value.length) await fetchPayrollGroups()
  if (!holidayTypes.value.length) await fetchHolidayTypes()
  if (!contributions.value.length) await fetchContributions()
  if (!companyMultipliers.value) await fetchCompanyMultipliersForForm()

  bulkAssignEmployeeIds.value = selectedEmployees.value.map((e) => e.id)
  payTypeAutoFilled.value = false

  assignForm.value = {
    employee_id: null,
    company_id: companyId.value,
    contract_type_id: null,
    assignment_mode: 'custom',
    pay_type: 'monthly',
    rate: '',
    work_hours_per_week: 48,
    position: null,
    department: null,
    payroll_group_id: null,
    payroll_group: null,
    eligibilities: eligibilityOptions.value.map((e) => e.id),
    contributions: contributions.value.map((c) => c.id),
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    holiday_pay_types: [],
    overtime_multiplier: companyMultipliers.value?.overtime_multiplier ?? defaultMultipliers.overtime ?? null,
    special_holiday_multiplier: companyMultipliers.value?.special_holiday_multiplier ?? defaultMultipliers.special_holiday ?? null,
    regular_holiday_multiplier: companyMultipliers.value?.regular_holiday_multiplier ?? defaultMultipliers.regular_holiday ?? null,
    night_diff_multiplier: companyMultipliers.value?.night_diff_multiplier ?? defaultMultipliers.night_diff ?? null,
    regular_holiday_ot_multiplier: companyMultipliers.value?.regular_holiday_ot_multiplier ?? defaultMultipliers.regular_holiday_ot ?? null,
    special_holiday_ot_multiplier: companyMultipliers.value?.special_holiday_ot_multiplier ?? defaultMultipliers.special_holiday_ot ?? null,
    undertime_multiplier: companyMultipliers.value?.undertime_multiplier ?? defaultMultipliers.undertime ?? null,
    start_date: '',
    end_date: '',
  }
  assignDialog.value = true
}

async function handleAssignSubmit() {
  if (bulkAssignEmployeeIds.value.length > 0) {
    const ids = [...bulkAssignEmployeeIds.value]
    bulkAssignEmployeeIds.value = []
    const { successCount, failCount } = await bulkAssignContract(ids)
    selectedEmployees.value = []
    if (successCount > 0) {
      $q.notify({
        type: 'positive',
        message: `Contract assigned to ${successCount} employee(s)`,
        position: 'top',
      })
    }
    if (failCount > 0) {
      $q.notify({ type: 'warning', message: `${failCount} assignment(s) failed`, position: 'top' })
    }
  } else {
    await assignContract()
  }
}

async function handleBulkTerminateDialog() {
  const active = selectedActiveEmployees.value
  if (active.length === 0) {
    $q.notify({ type: 'warning', message: 'No active employees selected', position: 'top' })
    return
  }

  $q.dialog({
    title: `Terminate ${active.length} employee${active.length > 1 ? 's' : ''}?`,
    message:
      'These employees will be marked as Terminated and lose system access. This can be reversed.',
    cancel: { label: 'Cancel', flat: true },
    persistent: true,
    ok: { label: 'Terminate', color: 'negative', unelevated: true },
  }).onOk(async () => {
    const ids = active.map((e) => e.id)
    const { successCount, failCount } = await bulkTerminateEmployees(ids)
    selectedEmployees.value = []
    if (successCount > 0) {
      $q.notify({
        type: 'positive',
        message: `${successCount} employee(s) terminated`,
        position: 'top',
      })
    }
    if (failCount > 0) {
      $q.notify({ type: 'warning', message: `${failCount} termination(s) failed`, position: 'top' })
    }
  })
}

async function bulkTerminateEmployees(employeeIds) {
  let successCount = 0
  let failCount = 0

  for (const empId of employeeIds) {
    try {
      const emp = employees.value.find((e) => e.id === empId)
      const cid = emp?.companies?.[0]?.company_id
      const payload = cid
        ? { companies: [{ company_id: cid, employment_status: 'terminated' }] }
        : {}
      const response = await terminateEmployeeApi(empId, payload)

      const idx = employees.value.findIndex((e) => e.id === empId)
      if (idx !== -1) {
        employees.value[idx] = { ...response, is_active: false, status: 'terminated' }
      }
      successCount++
    } catch {
      failCount++
    }
  }

  filteredEmployees.value = [...employees.value]
  sortEmployees()

  return { successCount, failCount }
}

const resetAddForm = () => {
  addForm.value = {
    user: { username: '', email: '', first_name: '', middle_name: '', last_name: '' },
    password: '',
    user_role: null,
    civil_status: '',
    address: '',
    phone_number: '',
    emergency_contact: '',
    birthday: '',
    bank_acct: '',
    timezone: '',
  }
  confirmPassword.value = ''
  avatarFile.value = null
  avatarPreview.value = null
}

const cancelEdit = () => {
  showEditModal.value = false
  editAvatarFile.value = null
  editAvatarPreview.value = null
  editForm.value = {
    user: { id: 0, username: '', email: '', first_name: '', last_name: '' },
    user_role: null,
    civil_status: '',
    address: '',
    phone_number: '',
    emergency_contact: '',
    birthday: '',
    bank_acct: '',
    timezone: '',
  }
}

const terminateEmployee = async () => {
  try {
    terminating.value = true
    const cid = employeeToTerminate.value.companies?.[0]?.company_id
    const payload = {
      companies: [{ company_id: cid, employment_status: 'terminated' }],
    }
    const response = await terminateEmployeeApi(employeeToTerminate.value.id, payload)

    const employeeIndex = employees.value.findIndex((e) => e.id === employeeToTerminate.value.id)
    if (employeeIndex !== -1) {
      employees.value[employeeIndex] = { ...response, is_active: false, status: 'terminated' }
    }

    filteredEmployees.value = [...employees.value]
    sortEmployees()

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(employeeToTerminate.value)} has been terminated`,
      position: 'top',
    })
    showTerminateDialog.value = false
    employeeToTerminate.value = {}
  } catch (error) {
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.detail ??
        error.response?.data?.message ??
        'Failed to terminate employee',
      position: 'top',
    })
  } finally {
    terminating.value = false
  }
}

const restoreEmployee = async () => {
  try {
    restoring.value = true
    const cid = employeeToRestore.value.companies?.[0]?.company_id
    const payload = {
      companies: [{ company_id: cid, employment_status: 'active' }],
      is_active: true,
      status: 'active',
    }
    const response = await restoreEmployeeApi(employeeToRestore.value.id, payload)

    const employeeIndex = employees.value.findIndex((e) => e.id === employeeToRestore.value.id)
    if (employeeIndex !== -1) {
      employees.value[employeeIndex] = { ...response, is_active: true, status: 'active' }
    }

    filteredEmployees.value = [...employees.value]
    sortEmployees()

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(employeeToRestore.value)} has been restored successfully.`,
      position: 'top',
    })
    showRestoreDialog.value = false
    employeeToRestore.value = {}
  } catch (error) {
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.detail ??
        error.response?.data?.message ??
        'Failed to restore employee',
      position: 'top',
    })
  } finally {
    restoring.value = false
  }
}

const handleAvatarSelect = (file) => {
  avatarFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const handleEditAvatarSelect = (file) => {
  editAvatarFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    editAvatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const removeAvatar = () => {
  avatarFile.value = null
  avatarPreview.value = null
}

const removeEditAvatar = () => {
  editAvatarFile.value = null
  editAvatarPreview.value = null
}

const onPageChange = (newPage) => {
  employeePage.value = newPage
}

const onPageSizeChange = (newSize) => {
  employeePageSize.value = newSize
  employeePage.value = 1
}

const filterEmployees = () => {
  let filtered = employees.value

  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter((emp) => {
      return (
        (getFullName(emp) || '').toLowerCase().includes(term) ||
        (getEmail(emp) || '').toLowerCase().includes(term) ||
        (getPhoneNumber(emp) || '').toLowerCase().includes(term) ||
        (getRole(emp) || '').toLowerCase().includes(term) ||
        (getStatus(emp) || '').toLowerCase().includes(term)
      )
    })
  }

  if (selectedSite.value !== null) {
    filtered = filtered.filter((emp) => {
      const empSiteId =
        emp.site_id ||
        emp.site?.id ||
        emp.companies?.[0]?.site_id ||
        emp.companies?.[0]?.site?.id ||
        emp.user_site?.id
      const employeeSite = typeof empSiteId === 'number' ? empSiteId : parseInt(empSiteId)
      const filterSite =
        typeof selectedSite.value === 'number' ? selectedSite.value : parseInt(selectedSite.value)
      return employeeSite === filterSite
    })
  }

  filteredEmployees.value = filtered
  sortEmployees()
}

const isTerminated = (emp) => getStatus(emp) === 'Terminated'

const sortEmployees = () => {
  const sorted = [...filteredEmployees.value]

  switch (sortBy.value) {
    case 'Newest':
      sorted.sort((a, b) => {
        const aTerm = isTerminated(a) ? 1 : 0
        const bTerm = isTerminated(b) ? 1 : 0
        if (aTerm !== bTerm) return aTerm - bTerm
        return new Date(b.last_date_updated || 0) - new Date(a.last_date_updated || 0)
      })
      break
    case 'Oldest':
      sorted.sort((a, b) => {
        const aTerm = isTerminated(a) ? 1 : 0
        const bTerm = isTerminated(b) ? 1 : 0
        if (aTerm !== bTerm) return aTerm - bTerm
        return new Date(a.last_date_updated || 0) - new Date(b.last_date_updated || 0)
      })
      break
    case 'A-Z':
      sorted.sort((a, b) => {
        const aTerm = isTerminated(a) ? 1 : 0
        const bTerm = isTerminated(b) ? 1 : 0
        if (aTerm !== bTerm) return aTerm - bTerm
        return getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase())
      })
      break
    case 'Z-A':
      sorted.sort((a, b) => {
        const aTerm = isTerminated(a) ? 1 : 0
        const bTerm = isTerminated(b) ? 1 : 0
        if (aTerm !== bTerm) return aTerm - bTerm
        return getFullName(b).toLowerCase().localeCompare(getFullName(a).toLowerCase())
      })
      break
  }

  filteredEmployees.value = sorted
}

// Modal Actions
const openAddModal = () => {
  resetAddForm()
  addForm.value = {
    user: { username: '', email: '', first_name: '', middle_name: '', last_name: '' },
    password: '',
    user_role: null,
    civil_status: '',
    address: '',
    phone_number: '',
    emergency_contact: '',
    birthday: '',
    bank_acct: '',
    timezone: '',
  }
  showAddModal.value = true
}

const viewEmployeePhoto = (employee) => {
  selectedPhotoUrl.value = employee?.user?.picture_url || ''
  showPhotoViewer.value = true
}

const viewEmployee = async (emp) => {
  const detailed = await fetchEmployeeDetails(emp.id)
  if (detailed) {
    const localEmp = employees.value.find((e) => e.id === emp.id)
    selectedEmployee.value = {
      ...detailed,
      is_active: localEmp?.is_active ?? detailed.is_active,
      status: localEmp?.status ?? detailed.status,
      companies: localEmp?.companies ?? detailed.companies,
    }
    showViewModal.value = true
  }
}

const editEmployee = async (emp) => {
  const detailed = await fetchEmployeeDetails(emp.id)
  if (!detailed) return

  selectedEmployee.value = detailed

  const roleNameFromCompany = detailed.companies?.[0]?.user_role?.name || ''
  const matchingRole =
    roleOptions.value.find(
      (role) =>
        role.name?.toLowerCase() ===
        (detailed.user_role_name || detailed.user_role?.name || roleNameFromCompany).toLowerCase(),
    ) || null

  editForm.value = {
    user: {
      id: detailed.user?.id || 0,
      username: detailed.user?.username || '',
      email: detailed.user?.email || '',
      first_name: detailed.user?.first_name || '',
      middle_name: detailed.user?.middle_name || '',
      last_name: detailed.user?.last_name || '',
    },
    user_role: matchingRole || detailed.user_role || null,
    civil_status: detailed.civil_status || '',
    address: detailed.address || '',
    phone_number: detailed.phone_number || '',
    emergency_contact: detailed.emergency_contact || '',
    birthday: detailed.birthday || '',
    bank_acct: detailed.bank_acct || '',
    timezone: detailed.timezone || '',
  }

  showEditModal.value = true
}

const confirmTerminate = (emp) => {
  employeeToTerminate.value = emp
  showTerminateDialog.value = true
}

const confirmRestore = (emp) => {
  employeeToRestore.value = emp
  showRestoreDialog.value = true
}

const cancelAdd = () => {
  showAddModal.value = false
  resetAddForm()
}

// ─── Balance Modal Actions ──────────────────────────────────────────────────

const openLeaveBalanceModal = async (emp) => {
  selectedBalanceEmployee.value = emp
  if (!leaveTypes.value.length) {
    await fetchLeaveTypes(companyId.value)
  }
  showLeaveBalanceModal.value = true
}

const openCtoBalanceModal = (emp) => {
  selectedBalanceEmployee.value = emp
  showCtoBalanceModal.value = true
}

const handleAddLeaveBalance = async (payload) => {
  try {
    await addLeaveBalance(payload)
    $q.notify({
      type: 'positive',
      message: 'Leave balance added successfully',
      icon: 'check_circle',
      position: 'top',
    })
    showLeaveBalanceModal.value = false
    // Refresh balance for this employee
    const empId = selectedBalanceEmployee.value?.id
    if (empId) {
      const updated = await fetchEmployeeBalances(companyId.value, empId)
      if (updated) {
        const empIndex = employees.value.findIndex((e) => e.id === selectedBalanceEmployee.value.id)
        if (empIndex !== -1) {
          employees.value[empIndex] = { ...employees.value[empIndex], _balance: updated }
          filteredEmployees.value = [...filteredEmployees.value]
        }
      }
    }
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.detail || e.message || 'Failed to add leave balance'
    $q.notify({ type: 'negative', message: msg, icon: 'error', position: 'top' })
  }
}

const handleAddCtoBalance = async (payload) => {
  try {
    await addCtoBalance(payload)
    $q.notify({
      type: 'positive',
      message: 'CTO balance added successfully',
      icon: 'check_circle',
      position: 'top',
    })
    showCtoBalanceModal.value = false
    // Refresh balance for this employee
    const empId = selectedBalanceEmployee.value?.id
    if (empId) {
      const updated = await fetchEmployeeBalances(companyId.value, empId)
      if (updated) {
        const empIndex = employees.value.findIndex((e) => e.id === selectedBalanceEmployee.value.id)
        if (empIndex !== -1) {
          employees.value[empIndex] = { ...employees.value[empIndex], _balance: updated }
          filteredEmployees.value = [...filteredEmployees.value]
        }
      }
    }
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.detail || e.message || 'Failed to add CTO balance'
    $q.notify({ type: 'negative', message: msg, icon: 'error', position: 'top' })
  }
}

const updateAssignField = ({ field, value }) => {
  assignForm.value[field] = value
}

watch(sortBy, () => {
  sortEmployees()
})

// Lazy-load contract / balance data whenever the visible page changes
watch(
  [employeePage, employeePageSize],
  () => {
    if (filteredEmployees.value.length > 0) {
      fetchPageData()
    }
  },
  { immediate: false },
)

let initialised = false
watch(
  companyId,
  async (newId) => {
    if (newId && !initialised) {
      initialised = true
      await Promise.all([
        fetchRoles(),
        fetchSites(),
        fetchContractTypes(),
        fetchDepartments(),
        fetchEligibilityOptions(),
        fetchPositions(),
        fetchHolidayTypes(),
        fetchContributions(),
      ])
      await fetchEmployees()
    }
  },
  { immediate: true },
)

watch(companyId, (newId, oldId) => {
  if (newId && oldId && newId !== oldId) {
    fetchContractTypes()
  }
})

// Initial data load handled by {immediate: true} watcher above
</script>

<style scoped>
/* ==============================
   WRAPPER
   ============================== */
.employees-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

/* ==============================
   HEADER
   ============================== */
.page-header {
  padding: 8px 24px;
  border-bottom: 1px solid #f1f3f5;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.header-search {
  min-width: 220px;
  max-width: 280px;
}

.header-search :deep(.q-field__control) {
  border-radius: 10px;
  height: 36px;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.header-search :deep(.q-field__control:hover) {
  border-color: #cbd5e1;
}

.search-icon {
  color: #94a3b8;
}

.add-employee-btn {
  height: 36px;
  border-radius: 10px;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 13px;
}

.header-add-btn {
  background: #102335 !important;
  color: #ffffff !important;
}

.header-add-btn:hover {
  background: #193d5c !important;
}

/* ==============================
   TABLE SECTION
============================== */
.table-block {
}

/* ==============================
   SELECTION BAR
============================== */
.selection-bar {
  padding: 10px 24px;
  background: #f0f4ff;
  border-bottom: 1px solid #c7d2fe;
}
.selection-bar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.selection-text {
  font-size: 13px;
  font-weight: 600;
  color: #3730a3;
}
.selection-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ==============================
   PAGINATION BAR
============================== */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f1f3f5;
  padding: 10px 24px;
  gap: 16px;
  flex-wrap: wrap;
}
.pagination-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.pagination-text {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 400;
}
.page-size-select {
  min-width: 120px;
}
.page-size-select :deep(.q-field__control) {
  border-radius: 8px;
  border-color: #e2e8f0;
}
.schedule-pagination :deep(.q-btn) {
  font-weight: 500;
  border-radius: 8px;
  min-width: 32px;
  min-height: 32px;
  font-size: 13px;
}
.schedule-pagination :deep(.q-btn--active) {
  font-weight: 600;
}

/* ==============================
   RESPONSIVE
============================== */
@media (max-width: 1440px) {
  .employees-card {
    border-radius: 14px;
  }

  .page-header {
    padding: 8px 20px;
  }

  .pagination-bar {
    padding: 10px 20px;
  }
}

@media (max-width: 1024px) {
  .page-header {
    padding: 8px 16px;
  }

  .page-title {
    font-size: 19px;
  }

  .header-search {
    min-width: 180px;
  }

  .selection-bar,
  .pagination-bar {
    padding: 10px 16px;
  }

  .pagination-info {
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    gap: 8px;
  }

  .header-search,
  .add-employee-btn {
    width: 100%;
    max-width: 100%;
  }

  .selection-bar-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .pagination-bar {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
  }
  .pagination-info {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 18px;
  }
}

/* Custom Multiplier Warning Dialog Styles */
.custom-multiplier-warning-dialog .q-dialog__title {
  color: #92400e;
  font-weight: 600;
  font-size: 18px;
}
.custom-multiplier-warning-dialog .q-dialog__message {
  font-size: 14px;
  line-height: 1.5;
}
.custom-multiplier-warning-dialog .q-card {
  max-width: 480px;
  border-radius: 12px;
}
</style>
