<template>
  <PageShell>
    <div class="emp-page">
      <!-- ── Page header: identity and the one primary action ────────────── -->
      <header class="emp-head">
        <div class="emp-head__titles">
          <h1 class="emp-head__title">Employees</h1>
          <p class="emp-head__sub">
            {{ headcountSummary }}
          </p>
        </div>
        <q-btn
          unelevated
          no-caps
          icon="add"
          label="Add employee"
          class="btn-primary"
          @click="openAddModal"
        />
      </header>

      <!-- ── List card ──────────────────────────────────────────────────── -->
      <section class="dash-panel emp-list">
        <!-- The toolbar becomes the selection bar when rows are picked, rather
             than a second bar pushing the list down. One row, two states. -->
        <div class="emp-toolbar" :class="{ 'emp-toolbar--selecting': hasSelection }">
          <template v-if="!hasSelection">
            <q-input
              ref="searchRef"
              v-model="searchTerm"
              placeholder="Search name, email, role or status"
              dense
              outlined
              clearable
              class="emp-search dash-field"
              @update:model-value="onSearchInput"
              @focus="searchFocused = true"
              @blur="searchFocused = false"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" />
              </template>
              <!-- Press / to jump here. Hidden once the field has focus or text,
                   so the hint never sits on top of what you are typing. -->
              <template v-slot:append>
                <kbd v-if="showSearchHint" class="emp-kbd">/</kbd>
              </template>
            </q-input>

            <!-- No floating labels: a Quasar stacked label needs ~44px of
                 height and these fields are 34px, so the label and the value
                 were overlapping. Each option label is self-describing instead
                 ("All statuses", "All Sites", "Name A–Z") and a leading icon
                 says which dimension it controls. -->
            <div class="emp-filters">
              <q-select
                v-model="statusFilter"
                :options="statusOptions"
                emit-value
                map-options
                dense
                outlined
                hide-bottom-space
                :popup-content-class="'emp-popup'"
                class="emp-filter dash-field"
                aria-label="Filter by status"
              >
                <template v-slot:prepend>
                  <q-icon name="o_filter_alt" size="16px" />
                </template>
              </q-select>

              <!-- Payout group, resolved from each employee's active contract —
                   the same source the Schedule and Attendance filters use. -->
              <q-select
                v-if="payrollGroupOptions.length"
                v-model="payrollGroupFilter"
                :options="payrollGroupSelectOptions"
                emit-value
                map-options
                dense
                outlined
                hide-bottom-space
                :popup-content-class="'emp-popup'"
                class="emp-filter emp-filter--wide dash-field"
                aria-label="Filter by payout group"
              >
                <template v-slot:prepend>
                  <q-icon name="o_groups" size="16px" />
                </template>
              </q-select>

              <q-select
                v-model="sortBy"
                :options="sortOptions"
                emit-value
                map-options
                dense
                outlined
                hide-bottom-space
                :popup-content-class="'emp-popup'"
                class="emp-filter emp-filter--wide dash-field"
                aria-label="Sort order"
              >
                <template v-slot:prepend>
                  <q-icon name="o_swap_vert" size="16px" />
                </template>
              </q-select>
            </div>

            <span class="emp-toolbar__count">
              {{ filteredEmployees.length }}
              {{ filteredEmployees.length === 1 ? 'result' : 'results' }}
            </span>
          </template>

          <template v-else>
            <span class="emp-toolbar__selected">
              <q-icon name="check_circle" size="17px" />
              {{ selectedEmployees.length }} selected
            </span>
            <div class="emp-toolbar__actions">
              <q-btn
                outline
                no-caps
                dense
                icon="o_assignment"
                label="Assign payroll profile"
                class="btn-outline"
                @click="handleBulkAssignDialog"
              />
              <q-btn
                outline
                no-caps
                dense
                icon="o_block"
                label="Terminate"
                class="btn-outline btn-outline--danger"
                @click="handleBulkTerminateDialog"
              />
              <q-btn
                flat
                dense
                no-caps
                label="Clear"
                class="btn-quiet"
                @click="selectedEmployees = []"
              />
            </div>
          </template>
        </div>

        <!-- What is currently narrowing the list, and how to undo it. Without
             this, a filter left set three visits ago reads as "we have no
             employees". -->
        <div v-if="!hasSelection && activeFilters.length" class="emp-applied">
          <span class="emp-applied__label">Filtered by</span>
          <button
            v-for="f in activeFilters"
            :key="f.key"
            type="button"
            class="emp-applied__chip"
            @click="clearFilter(f.key)"
          >
            <span class="emp-applied__chip-text">{{ f.label }}</span>
            <q-icon name="close" size="13px" />
          </button>
          <q-btn flat dense no-caps size="11px" label="Clear all" class="btn-quiet" @click="clearFilters" />
        </div>

        <!-- Cards below 1024px, table above. The table needs ~1000px with three
             leave types configured; below that width it would scroll sideways and
             hide columns behind a gesture. -->
        <EmployeeCardList
          v-if="$q.screen.lt.md"
          v-model:selected="selectedEmployees"
          :employees="paginatedEmployees"
          :loading="loading || resolvingGroups"
          :contracts="employeeContracts"
          :company-id="companyId"
          :leave-types="cardLeaveTypes"
          :loading-contract-ids="loadingContractIds"
          :loading-balance-ids="loadingBalanceIds"
          :is-filtered="activeFilters.length > 0"
          @clear-filters="clearFilters"
          @add="openAddModal"
          @view="viewEmployee"
          @edit="editEmployee"
          @assign="handleOpenAssignDialog"
          @terminate="confirmTerminate"
          @restore="confirmRestore"
          @view-photo="viewEmployeePhoto"
          @add-leave-balance="openLeaveBalanceModal"
          @add-cto-balance="openCtoBalanceModal"
        />
        <EmployeeTable
          v-else
          v-model:selected="selectedEmployees"
          :employees="paginatedEmployees"
          :loading="loading || resolvingGroups"
          :contracts="employeeContracts"
          :company-id="companyId"
          :leave-types="leaveTypes"
          :loading-contract-ids="loadingContractIds"
          :loading-balance-ids="loadingBalanceIds"
          :is-filtered="activeFilters.length > 0"
          @clear-filters="clearFilters"
          @add="openAddModal"
          @view="viewEmployee"
          @edit="editEmployee"
          @assign="handleOpenAssignDialog"
          @terminate="confirmTerminate"
          @restore="confirmRestore"
          @view-photo="viewEmployeePhoto"
          @add-leave-balance="openLeaveBalanceModal"
          @add-cto-balance="openCtoBalanceModal"
        />

        <footer v-if="filteredEmployees.length > 0" class="emp-foot">
          <div class="emp-foot__left">
            <span class="emp-foot__range dash-num">
              {{ (employeePage - 1) * employeePageSize + 1 }}–{{
                Math.min(employeePage * employeePageSize, filteredEmployees.length)
              }}
              of {{ filteredEmployees.length }}
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
              class="emp-foot__size dash-field"
              @update:model-value="onPageSizeChange"
            />
          </div>
          <q-pagination
            v-model="employeePage"
            :max="totalPages"
            :max-pages="$q.screen.lt.md ? 3 : 6"
            boundary-numbers
            direction-links
            :ripple="false"
            icon-prev="chevron_left"
            icon-next="chevron_right"
            icon-first="first_page"
            icon-last="last_page"
            class="emp-pager"
            @update:model-value="onPageChange"
          />
        </footer>
      </section>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useEmployees } from '@/composables/page/useEmployees'
import { useRolesAndPositions } from '@/composables/page/useRolesAndPositions'
import { useEmployeePayoutGroup } from '@/composables/page/useEmployeePayoutGroup'
import { useCompany } from '@/composables/page/useCompany'
import { useAdminContracts } from '@/composables/admin/useAdminContracts'
import { useAdminContractTypes } from '@/composables/admin/useAdminContractTypes'
import { useAdminPositions } from '@/composables/admin/useAdminPositions'
import { useAdminDepartments } from '@/composables/admin/useAdminDepartments'
import { useAdminPayrollGroups } from '@/composables/admin/useAdminPayrollGroups'
import { useEmployeeBalances } from '@/composables/page/useEmployeeBalances'

import EmployeeTable from '@/components/pages/Employees/EmployeeTable.vue'
import EmployeeCardList from '@/components/pages/Employees/EmployeeCardList.vue'
import EmployeeAddModal from '@/components/pages/Employees/EmployeeAddModal.vue'
import EmployeeEditModal from '@/components/pages/Employees/EmployeeEditModal.vue'
import EmployeeViewModal from '@/components/pages/Employees/EmployeeViewModal.vue'
import EmployeeTerminateDialog from '@/components/pages/Employees/EmployeeTerminateDialog.vue'
import EmployeeRestoreDialog from '@/components/pages/Employees/EmployeeRestoreDialog.vue'
import EmployeeAssignContractDialog from '@/components/pages/Employees/EmployeeAssignContractDialog.vue'
import AttendanceEmployeePhotoViewer from '@/components/pages/Attendance/AttendanceEmployeePhotoViewer.vue'
import EmployeeLeaveBalanceModal from '@/components/pages/Employees/EmployeeLeaveBalanceModal.vue'
import EmployeeCtoBalanceModal from '@/components/pages/Employees/EmployeeCtoBalanceModal.vue'

// Shared accessors — these were duplicated verbatim between this page and
// EmployeeTable, which meant the two could disagree about the same record.
import {
  getFullName,
  getEmail,
  getRole,
  getStatus,
  getPhoneNumber,
  isTerminated,
} from '@/composables/utils/employee'

const $q = useQuasar()

// ─── Composables ──────────────────────────────────────────────────────────────
const {
  employees,
  loading,
  saving: savingEmployee,
  fetchEmployees: fetchEmployeesList,
  fetchEmployee,
  addEmployee: addEmployeeApi,
  updateEmployee,
  uploadEmployeeAvatar,
  terminateEmployee: terminateEmployeeApi,
  restoreEmployee: restoreEmployeeApi,
} = useEmployees()

const { userRoles, fetchUserRoles } = useRolesAndPositions()
// Payout group comes from each employee's active contract. The cache is shared
// with the Schedule and Attendance pages.
const {
  resolving: resolvingGroups,
  groupIdFor,
  inlineGroupId,
  ensure: ensurePayoutGroups,
  invalidate: invalidatePayoutGroups,
} = useEmployeePayoutGroup()
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
  fetchActiveContract,
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
const payrollGroupFilter = ref(null)
const statusFilter = ref('all')
const searchRef = ref(null)
const searchFocused = ref(false)
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
// Feeds the header's "N on record · N active" line. The terminated count went
// with the stats cards — nothing reads it now, and it cost a second pass over
// the whole list on every recompute.
const employeeStats = computed(() => {
  const total = employees.value.length
  const active = employees.value.filter((emp) => getStatus(emp) === 'Active').length
  return { total, active }
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

const hasSelection = computed(() => selectedEmployees.value.length > 0)

// ─── Filters ──────────────────────────────────────────────────────────────────
// `sortBy` already had complete sort logic but was never bound to anything, so
// it was unreachable until these options exposed it. The site filter it sat
// beside has since been replaced by payout group, which is the grouping this
// page is actually asked about.
const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'Active' },
  { label: 'Terminated', value: 'Terminated' },
]

const sortOptions = [
  { label: 'Name A–Z', value: 'A-Z' },
  { label: 'Name Z–A', value: 'Z-A' },
  { label: 'Recently updated', value: 'Newest' },
  { label: 'Oldest updated', value: 'Oldest' },
]

const DEFAULT_SORT = 'A-Z'

const payrollGroupOptions = computed(() =>
  payrollGroups.value.map((g) => ({ label: g.name, value: g.id })),
)

const payrollGroupSelectOptions = computed(() => [
  { label: 'All payout groups', value: null },
  ...payrollGroupOptions.value,
])

/** Payout group for an employee row: inline if present, else from the cache. */
const employeePayoutGroupId = (emp) => {
  const inline = inlineGroupId(emp)
  return inline !== null ? inline : groupIdFor(emp?.id)
}

/** Everything currently narrowing the list, each individually removable. */
const activeFilters = computed(() => {
  const out = []
  if (searchTerm.value?.trim()) {
    out.push({ key: 'search', label: `“${searchTerm.value.trim()}”` })
  }
  if (statusFilter.value !== 'all') {
    out.push({ key: 'status', label: statusFilter.value })
  }
  if (payrollGroupFilter.value !== null) {
    const group = payrollGroupOptions.value.find((g) => g.value === payrollGroupFilter.value)
    out.push({ key: 'payrollGroup', label: group?.label ?? 'Payout group' })
  }
  if (sortBy.value !== DEFAULT_SORT) {
    const sort = sortOptions.find((s) => s.value === sortBy.value)
    out.push({ key: 'sort', label: sort?.label ?? 'Sorted' })
  }
  return out
})

function clearFilter(key) {
  if (key === 'search') searchTerm.value = ''
  if (key === 'status') statusFilter.value = 'all'
  if (key === 'payrollGroup') payrollGroupFilter.value = null
  if (key === 'sort') sortBy.value = DEFAULT_SORT
  filterEmployees()
}

function clearFilters() {
  searchTerm.value = ''
  statusFilter.value = 'all'
  payrollGroupFilter.value = null
  sortBy.value = DEFAULT_SORT
  filterEmployees()
}

// The card view has room for every configured leave type, so it is not subject
// to the table's column budget.
const cardLeaveTypes = computed(() =>
  leaveTypes.value.filter((lt) => !lt.name?.toLowerCase().includes('unpaid')),
)

const headcountSummary = computed(() => {
  const { total, active } = employeeStats.value
  if (!total) return 'No employees on record yet'
  return `${total} on record · ${active} active`
})

// ─── Helper Functions ─────────────────────────────────────────────────────────

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

    // Clear stale contract / balance caches when the list refreshes. The payout
    // group is read off the same active contract, so it goes stale in lockstep —
    // without this, an assignment that sets a payroll group left the Payout Group
    // column showing the previous resolution.
    delete employeeContracts.value[companyId.value]
    invalidatePayoutGroups(companyId.value)
    employees.value.forEach((emp) => {
      emp._balance = undefined
    })

    // Show table immediately — do not block on heavy per-employee fetches
    loading.value = false

    // Fetch leave types and the first page of contract / balance data in background
    await Promise.all([
      fetchLeaveTypes(companyId.value).catch(() => {}),
      fetchPageData({ force: true }),
    ])

    // Re-resolve payout groups only if the filter that needs them is in use.
    if (payrollGroupFilter.value) {
      await ensurePayoutGroups(employees.value.map((emp) => emp.id))
      filterEmployees()
    }
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

// Sourced from the *active-contract* endpoint, not the contracts list endpoint.
// The list returns every contract an employee has ever held in no guaranteed
// order, so reading it meant the column showed whichever contract happened to be
// first — a freshly assigned or renewed contract never appeared. `active-contract`
// answers "which one is current?" server-side. See useEmployeePayoutGroup.js,
// which resolves payout groups from the same endpoint for the same reason.
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
        // Resolves to null on 404 (no active contract) rather than throwing.
        Promise.resolve(fetchActiveContract(emp.id))
          .then((data) => ({ status: 'fulfilled', empId: emp.id, data }))
          .catch(() => ({ status: 'rejected', empId: emp.id, data: null })),
      )
      const results = await Promise.all(promises)
      results.forEach((res) => {
        // Cache the null too: "resolved, no contract" has to be distinguishable
        // from "not fetched yet", or every page visit re-requests these.
        if (res.status === 'fulfilled') {
          employeeContracts.value[companyId.value][res.empId] = res.data ?? null
        }
      })
    }
    filteredEmployees.value = [...filteredEmployees.value]
  } catch {
    // Silent - contracts remain as "No Contract"
  }
}

let pageDataInFlight = null

// `force` skips the in-flight dedup: a refresh that has just cleared the caches
// must not be answered by a request that computed its work list before the clear.
const fetchPageData = async ({ force = false } = {}) => {
  if (pageDataInFlight && !force) return pageDataInFlight

  pageDataInFlight = (async () => {
    const pageEmps = paginatedEmployees.value
    if (!pageEmps.length) return

    const uncachedContract = pageEmps.filter((emp) => {
      const companyContracts = employeeContracts.value[companyId.value]
      // `null` means "resolved: no active contract" — only `undefined` is unfetched.
      return companyContracts?.[emp.id] === undefined
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

// `fetchSites` is gone with the site filter it populated — sites were fetched on
// every page load purely to fill that dropdown, and nothing else here used them.

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

// Search runs over the whole in-memory list on every keystroke, which is wasted
// work on a few thousand employees. A short debounce keeps typing responsive
// without making the result feel laggy.
let searchTimer = null

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => filterEmployees(), 180)
}

const showSearchHint = computed(
  () => !searchFocused.value && !searchTerm.value && !$q.screen.lt.md,
)

// "/" focuses search, the convention in most tools with a list this long.
// Ignored while the user is already typing somewhere, so it never swallows a
// literal slash.
function onGlobalKey(e) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
  e.preventDefault()
  searchRef.value?.focus()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKey)
  clearTimeout(searchTimer)
})

const onPageChange = (newPage) => {
  employeePage.value = newPage
}

const onPageSizeChange = (newSize) => {
  employeePageSize.value = newSize
  employeePage.value = 1
}

const filterEmployees = () => {
  let filtered = employees.value

  // Optional-chained because the search field is `clearable`: Quasar sets the
  // model to null rather than '' when the clear button is used.
  if (searchTerm.value?.trim()) {
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

  if (statusFilter.value !== 'all') {
    filtered = filtered.filter((emp) => getStatus(emp) === statusFilter.value)
  }

  // An employee whose group cannot be resolved is excluded while a group is
  // selected — "show me group A" should not fall back to including unknowns.
  if (payrollGroupFilter.value !== null) {
    filtered = filtered.filter(
      (emp) => String(employeePayoutGroupId(emp) ?? '') === String(payrollGroupFilter.value),
    )
  }

  filteredEmployees.value = filtered
  sortEmployees()
}

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

// The status and site selects re-run the whole filter chain. Sort has its own
// watcher above because it only needs to reorder, not re-filter.
watch([statusFilter, payrollGroupFilter], () => {
  filterEmployees()
})

// Contracts are only fetched once a payout group is actually selected, then
// cached (module-level, shared with the Schedule and Attendance pages).
watch(payrollGroupFilter, async (groupId) => {
  if (!groupId) return
  await ensurePayoutGroups(employees.value.map((emp) => emp.id))
  filterEmployees()
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
        // Feeds the payout-group filter; replaced fetchSites() here.
        fetchPayrollGroups(),
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
/* ============================================================================
   EMPLOYEES PAGE
   ----------------------------------------------------------------------------
   Built on the app design system in src/css/dashboard.scss. Was one monolithic
   white card holding header, stats, table and pagination; it is now three
   stacked regions — page header, KPI tiles, list card — so the page has an
   entry point instead of opening straight into chrome.
   ========================================================================== */
.emp-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.emp-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.emp-head__titles {
  min-width: 0;
}

.emp-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.emp-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Buttons ── */
.btn-primary {
  height: 38px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}
.btn-primary:hover {
  background: #193d5c;
}

.btn-outline {
  height: 32px;
  padding: 0 11px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
}
.btn-outline--danger {
  color: var(--dash-critical);
}

.btn-quiet {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  padding: 0 8px;
}

/* ── List card ──
   No `overflow: visible` here. It was defeating the `overflow: hidden` that
   clips .dash-panel's rounded corners, so the footer's fill painted square over
   the bottom two while the top two stayed round. Quasar teleports select and
   menu popups to the body, so nothing inside needs to escape the card anyway. */
.emp-list {
  /* Rows and the footer are clipped to the card's radius on all four corners. */
  overflow: hidden;
}

/* ── Toolbar ── */
.emp-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
  transition: background var(--dash-fast) var(--dash-ease);
}
/* Selection is a state of the toolbar, marked by a tint, not a second bar. */
.emp-toolbar--selecting {
  background: var(--dash-accent-bg);
  border-bottom-color: var(--dash-info-line);
}

/* Search takes the slack rather than a fixed 320px. At 1024–1280 a fixed search
   plus three fixed filters overflowed the row and wrapped the count onto its
   own line; now search absorbs the difference and the filters keep their size. */
.emp-search {
  flex: 1 1 200px;
  min-width: 0;
  max-width: 340px;
}
.emp-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
/* Border and focus ring come from `.dash-field` in the design system. */
.emp-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.emp-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

/* ── Keyboard hint ── */
.emp-kbd {
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  color: var(--dash-ink-4);
  background: var(--dash-n-100);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-xs);
  padding: 3px 6px;
  min-width: 18px;
  text-align: center;
}

/* ── Filter selects ──
   Compact, label-above-value fields so three of them fit on one line without
   reading as a form. */
.emp-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.emp-filter {
  width: 148px;
  flex-shrink: 0;
}
.emp-filter--wide {
  width: 166px;
}
.emp-filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  padding: 0 8px 0 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
/* No vertical padding games: with the label gone the value is simply centred. */
.emp-filter :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  padding: 0;
  min-height: 34px;
}
.emp-filter :deep(.q-field__marginal) {
  height: 34px;
  min-width: 0;
  padding: 0;
  color: var(--dash-ink-4);
}
.emp-filter :deep(.q-field__prepend) {
  padding-right: 7px;
}
.emp-filter :deep(.q-field__append) {
  padding-left: 2px;
}

.emp-toolbar__count {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Applied filters ── */
.emp-applied {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding: 9px 16px;
  border-bottom: 1px solid var(--dash-line);
  background: var(--dash-n-25);
}

.emp-applied__label {
  font-size: 12px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

.emp-applied__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 220px;
  padding: 3px 7px 3px 9px;
  border-radius: var(--dash-r-sm);
  border: 1px solid var(--dash-line-strong);
  background: var(--dash-surface);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--dash-ink-2);
  cursor: pointer;
  transition: border-color var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.emp-applied__chip:hover {
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
}
.emp-applied__chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dash-surface), 0 0 0 4px var(--dash-accent-ring);
}

.emp-applied__chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.emp-toolbar__selected {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-accent);
  white-space: nowrap;
}

.emp-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

/* ── Footer ── */
.emp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 16px;
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  flex-wrap: wrap;
}

.emp-foot__left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.emp-foot__range {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.emp-foot__size {
  width: 132px;
}
.emp-foot__size :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.emp-foot__size :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.emp-foot__size :deep(.q-field__marginal) {
  height: 32px;
  color: var(--dash-ink-4);
}

.emp-pager :deep(.q-btn) {
  min-width: 30px;
  min-height: 30px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
}
.emp-pager :deep(.q-btn:hover) {
  background: var(--dash-n-100);
  color: var(--dash-ink);
}
.emp-pager :deep(.q-btn--active) {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line-strong);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}

/* ============================================================================
   RESPONSIVE
   ----------------------------------------------------------------------------
   Four stages rather than one breakpoint, because three different things need
   to give way at three different widths:

     >= 1280   full table, up to 2-3 leave columns, filters and count inline
     1024-1279 table on a reduced column budget; result count drops
     < 1024    EmployeeCardList replaces the table entirely — no sideways scroll
     < 640     single-column cards, filters two-up, footer stacks
   ========================================================================== */

/* Laptop: the count is the first thing to go — it is a nicety, and the filters
   are not. */
@media (max-width: 1279px) {
  .emp-toolbar__count {
    display: none;
  }
}

@media (max-width: 1023px) {
  .emp-head__title {
    font-size: 20px;
  }
  .emp-toolbar {
    padding: 10px 14px;
  }
  /* Search claims its own line so the three filters can share the next one at
     full width instead of one of them being orphaned. */
  .emp-search {
    flex: 1 1 100%;
    max-width: none;
  }
  .emp-filters {
    width: 100%;
  }
  .emp-filter,
  .emp-filter--wide {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
  }
  .emp-applied {
    padding: 9px 14px;
  }
  .emp-foot {
    padding: 10px 14px;
  }
}

@media (max-width: 768px) {
  .emp-head {
    align-items: stretch;
  }
  .emp-head .btn-primary {
    width: 100%;
  }
  /* Bulk actions get their own line and split it evenly, so neither is the
     awkward one that wraps alone. */
  .emp-toolbar__actions {
    width: 100%;
  }
  .emp-toolbar__actions .btn-outline {
    flex: 1;
  }
}

@media (max-width: 640px) {
  /* Three selects side by side stop being tappable at phone width. */
  .emp-filter,
  .emp-filter--wide {
    flex: 1 1 calc(50% - 4px);
  }
  .emp-foot {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .emp-foot__left {
    justify-content: space-between;
  }
  .emp-foot__size {
    width: 124px;
  }
  .emp-pager {
    align-self: center;
  }
}

/* Filter dropdown panels. Unscoped because QSelect teleports its popup to the
   body, out of this component's style scope. */
.emp-popup {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  padding: 4px;
}
.emp-popup .q-item {
  min-height: 32px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.emp-popup .q-item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.emp-popup .q-item--active {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
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
