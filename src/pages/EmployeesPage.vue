<template>
  <PageShell>
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Employees</h1>
        <div class="header-actions">
          <q-btn
            color="primary"
            label="Add Employee"
            icon="add"
            class="add-employee-btn"
            unelevated
            @click="openAddModal"
          />
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
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <EmployeeStatsCards :stats="employeeStats" />

    <!-- Main Table Section -->
    <div class="table-section">
      <div class="table-header">
        <h2 class="table-title">Employee Overview</h2>
        <div class="table-actions">
          <q-select
            v-model="selectedSite"
            :options="sites"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            label="Filter by Site"
            class="site-select"
            dense
            outlined
            clearable
            @update:model-value="filterEmployees"
          >
            <template v-slot:prepend>
              <q-icon name="location_on" />
            </template>
          </q-select>
        </div>
      </div>

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
              label="Assign Contract"
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
        :positions="positions"
        :departments="departments"
        @view="viewEmployee"
        @edit="editEmployee"
        @assign="handleOpenAssignDialog"
        @terminate="confirmTerminate"
        @restore="confirmRestore"
        @view-photo="viewEmployeePhoto"
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
      :contract-type-options="contractTypeOptions"
      :positions="positions"
      :departments="departments"
      :eligibility-objects="selectedEligibilityObjectsData"
      :is-renewing="isRenewing"
      :all-eligibility-options="eligibilityOptions"
      :contribution-options="contributions"
      @update:field="updateAssignField"
      @contract-type-change="onContractTypeChange"
      @submit="handleAssignSubmit"
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

import EmployeeStatsCards from '@/components/pages/Employees/EmployeeStatsCards.vue'
import EmployeeTable from '@/components/pages/Employees/EmployeeTable.vue'
import EmployeeAddModal from '@/components/pages/Employees/EmployeeAddModal.vue'
import EmployeeEditModal from '@/components/pages/Employees/EmployeeEditModal.vue'
import EmployeeViewModal from '@/components/pages/Employees/EmployeeViewModal.vue'
import EmployeeTerminateDialog from '@/components/pages/Employees/EmployeeTerminateDialog.vue'
import EmployeeRestoreDialog from '@/components/pages/Employees/EmployeeRestoreDialog.vue'
import EmployeeAssignContractDialog from '@/components/pages/Employees/EmployeeAssignContractDialog.vue'
import AttendanceEmployeePhotoViewer from '@/components/pages/Attendance/AttendanceEmployeePhotoViewer.vue'

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
} = useAdminContractTypes()

const { positions, fetchPositions } = useAdminPositions()
const { departments, fetchDepartments } = useAdminDepartments()

const selectedEligibilityObjectsData = ref([])

// ─── Local UI state ───────────────────────────────────────────────────────────
const filteredEmployees = ref([])
const searchTerm = ref('')
const sortBy = ref('A-Z')
const sites = ref([])
const selectedSite = ref(null)
const employeeContracts = ref({})
const payTypeAutoFilled = ref(false)
const selectedEmployees = ref([])
const bulkAssignEmployeeIds = ref([])
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

  // Derive holiday_pay_types from contract type flags
  const codes = []
  if (selectedType) {
    const matchCode = (flag, hint) => {
      if (!flag) return
      const ht = holidayTypes.value.find(
        (h) =>
          h.code?.toLowerCase().includes(hint) || h.name?.toLowerCase().includes(hint),
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
  if (!open && bulkAssignEmployeeIds.value.length > 0) {
    bulkAssignEmployeeIds.value = []
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
    fetchContracts(list)
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail ?? 'Failed to fetch employees',
      position: 'top',
    })
  }
}

const fetchContracts = async (employeeList, batchSize = 15) => {
  if (!employeeList?.length) return
  if (!companyId.value) return

  delete employeeContracts.value[companyId.value]
  employeeContracts.value[companyId.value] = {}

  const fetchBatch = async (startIndex) => {
    const batch = employeeList.slice(startIndex, startIndex + batchSize)
    const results = await Promise.allSettled(batch.map((emp) => fetchEmployeeContract(emp.id)))
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        const emp = batch[idx]
        employeeContracts.value[companyId.value][emp.id] = result.value
      }
    })
  }

  try {
    for (let i = 0; i < employeeList.length; i += batchSize) {
      await fetchBatch(i)
    }
    filteredEmployees.value = [...filteredEmployees.value]
  } catch {
    // Silent - contracts remain as "No Contract"
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
  if (!holidayTypes.value.length) {
    await fetchHolidayTypes()
  }
  if (!contributions.value.length) {
    await fetchContributions()
  }
  await openAssignDialog(employee)

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
  if (!holidayTypes.value.length) await fetchHolidayTypes()
  if (!contributions.value.length) await fetchContributions()

  bulkAssignEmployeeIds.value = selectedEmployees.value.map((e) => e.id)
  payTypeAutoFilled.value = false

  assignForm.value = {
    employee_id: null,
    company_id: companyId.value,
    contract_type_id: null,
    pay_type: 'monthly',
    payment_method: 'bank_transfer',
    rate: '',
    work_hours_per_week: 48,
    position: null,
    department: null,
    eligibilities: [],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    holiday_pay_types: [],
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

const updateAssignField = ({ field, value }) => {
  assignForm.value[field] = value
}

watch(sortBy, () => {
  sortEmployees()
})

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
   HEADER
   ============================== */
.page-header {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.header-search {
  min-width: 200px;
  max-width: 260px;
}

.header-search .q-field__control {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

.add-employee-btn {
  height: 36px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 13px;
}

/* ==============================
   TABLE SECTION
============================== */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.site-select {
  min-width: 180px;
}

/* ==============================
   RESPONSIVE
============================== */
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

  .table-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .site-select {
    width: 100%;
  }

  .selection-bar-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
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

/* Selection Bar */
.selection-bar {
  padding: 10px 20px;
  background: #eff6ff;
  border-bottom: 1px solid #bfdbfe;
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
  font-size: 14px;
  font-weight: 600;
  color: #1d4ed8;
}
.selection-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Pagination Bar */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  padding: 12px 20px;
  margin-top: 16px;
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
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}
.page-size-select {
  min-width: 120px;
}
.page-size-select :deep(.q-field__control) {
  border-radius: 8px;
}
.schedule-pagination :deep(.q-btn) {
  font-weight: 600;
  border-radius: 8px;
  min-width: 32px;
  min-height: 32px;
}
.schedule-pagination :deep(.q-btn--active) {
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
}
@media (max-width: 768px) {
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
</style>
