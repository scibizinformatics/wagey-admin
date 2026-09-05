<template>
  <PageShell fluid>
    <div class="requests-page">
      <!-- Page header -->
      <header class="page-head">
        <div class="page-identity">
          <h1 class="page-heading">Requests</h1>
          <div class="page-meta">
            <template v-if="companyName">
              <span class="page-meta-item">{{ companyName }}</span>
              <span class="page-meta-dot" aria-hidden="true">·</span>
            </template>
            <span :class="['page-meta-item', { waiting: totalPending > 0 }]">
              {{ pendingSummary }}
            </span>
            <span class="page-meta-dot" aria-hidden="true">·</span>
            <span class="page-meta-item page-meta-live">
              <span class="live-dot" aria-hidden="true"></span>
              Updated {{ lastUpdatedLabel }}
            </span>
          </div>
        </div>

        <div class="page-actions">
          <q-btn
            round
            flat
            icon="refresh"
            class="refresh-btn"
            @click="handleRefresh"
            :loading="refreshLoading"
          >
            <q-tooltip>Refresh</q-tooltip>
          </q-btn>
          <span class="action-divider" aria-hidden="true"></span>
          <q-btn
            v-if="activeTab === 'leave'"
            unelevated
            no-caps
            icon="add"
            label="Apply leave"
            class="primary-action-btn"
            @click="openApplyLeaveModal"
          />
          <q-btn
            v-else-if="activeTab === 'overtime'"
            unelevated
            no-caps
            icon="add"
            label="Overtime advance"
            class="primary-action-btn"
            @click="openOvertimeAdvanceModal"
          />
          <q-btn-toggle
            v-else-if="activeTab === 'cash_advance'"
            v-model="caViewMode"
            no-caps
            unelevated
            :options="[
              { label: 'All requests', value: 'all', icon: 'list' },
              { label: 'By cutoff', value: 'cutoff', icon: 'calendar_today' },
            ]"
            class="view-toggle"
          />
        </div>
      </header>

      <!-- Work surface: tabs ride the card's top edge, then one stat/filter
           band, then the table. -->
      <section class="queue-content">
        <div class="tab-bar-row">
          <nav class="tab-bar" aria-label="Request queues">
            <button
              v-for="queue in queues"
              :key="queue.key"
              type="button"
              :class="['queue-tab', { active: activeTab === queue.key }]"
              :aria-pressed="activeTab === queue.key"
              @click="activeTab = queue.key"
            >
              <q-icon :name="queue.icon" size="18px" class="queue-tab-icon" />
              <span class="queue-tab-label">{{ queue.label }}</span>
              <span v-if="queue.pending > 0" class="queue-tab-count">
                {{ queue.pending }}
                <q-tooltip>{{ queue.pending }} pending</q-tooltip>
              </span>
            </button>
          </nav>
          <div class="tab-bar-aside">
            <RequestStatsCards
              class="tab-bar-stats"
              :active-tab="activeTab"
              :leave-stats="leaveStats"
              :overtime-stats="overtimeStats"
              :ca-statistics="caStatistics"
              :swap-statistics="swapStatistics"
            />
          </div>
        </div>

        <!-- Tab Panels -->
        <q-tab-panels v-model="activeTab" class="tab-panels">
          <q-tab-panel name="leave" class="tab-panel-content">
            <RequestLeaveTable
              :rows="filteredLeaveRequests"
              :loading="loading || resolvingGroups"
              :action-loading="actionLoading"
              :status-filter="statusFilter"
              :search="searchTerm"
              :payroll-group-filter="leavePayrollGroupFilter"
              :payroll-group-options="payrollGroupOptions"
              @update:status-filter="statusFilter = $event"
              @update:search="searchTerm = $event"
              @update:payroll-group-filter="leavePayrollGroupFilter = $event"
              @view-details="openLeaveDetails"
              @approve="approveRequest"
              @reject="rejectRequest"
            />
          </q-tab-panel>

          <q-tab-panel name="overtime" class="tab-panel-content">
            <RequestOvertimeTable
              :rows="filteredOvertimeRequests"
              :loading="overtimeLoading || resolvingGroups"
              :submitting="overtimeSubmitting"
              :selected-ids="selectedOvertimeIds"
              :editable-hours="overtimeEditableHours"
              :status-filter="overtimeStatusFilter"
              :search="overtimeSearch"
              :payroll-group-filter="overtimePayrollGroupFilter"
              :payroll-group-options="payrollGroupOptions"
              @update:status-filter="overtimeStatusFilter = $event"
              @update:search="overtimeSearch = $event"
              @update:payroll-group-filter="overtimePayrollGroupFilter = $event"
              @update:editable-hours="setOvertimeEditableHours"
              @toggle-selection="toggleOvertimeSelection"
              @toggle-select-all="toggleSelectAllOvertime"
              @clear-selection="clearOvertimeSelection"
              @view-details="openOvertimeDetail"
              @approve="approveOvertimeSingle"
              @reject="rejectOvertimeSingle"
              @bulk-approve="bulkApproveOvertime"
              @bulk-reject="bulkRejectOvertime"
            />
          </q-tab-panel>

          <q-tab-panel name="cash_advance" class="tab-panel-content">
            <div class="panel-surface">
              <RequestCashAdvanceTable
                v-if="caViewMode === 'all'"
                :rows="filteredCaRequests"
                :loading="loading || resolvingGroups"
                :ca-filter-status="caFilterStatus"
                :ca-status-options="caStatusOptions"
                :ca-pagination="caPagination"
                :search="searchTerm"
                :payroll-group-filter="caPayrollGroupFilter"
                :payroll-group-options="payrollGroupOptions"
                @update:ca-filter-status="caFilterStatus = $event"
                @update:search="searchTerm = $event"
                @update:payroll-group-filter="caPayrollGroupFilter = $event"
                @view="viewCaRequest"
                @approve="openCaApprovalModal"
              />

              <RequestCashAdvanceCutoff
                v-else
                :logs="caDisbursementLogs"
                :loading="loading"
                :expanded-log-id="selectedCaDisbursementLog"
                :cutoff-requests="caCutoffRequests"
                :cutoff-loading="caCutoffLoading"
                :search="caCutoffSearch"
                @expand="selectCaDisbursementLog"
                @view="viewCaRequest"
                @approve="openCaApprovalModal"
                @update:search="caCutoffSearch = $event"
              />
            </div>
          </q-tab-panel>

          <q-tab-panel name="swap" class="tab-panel-content">
            <RequestSwapTable
              :rows="filteredSwapRequests"
              :loading="swapLoading"
              :sortBy="swapSortBy"
              :processingId="swapActionLoading"
              :pagination="swapPagination"
              :totalRecords="swapRequests.length"
              :search="searchTerm"
              @update:search="searchTerm = $event"
              @update:sortBy="swapSortBy = $event"
              @update:pagination="swapPagination = $event"
              @view="viewSwapRequest"
              @approve="approveSwapRequest"
              @reject="rejectSwapRequest"
            />
          </q-tab-panel>
        </q-tab-panels>
      </section>

      <!-- Modals -->
      <RequestLeaveDetailModal
        v-model="showLeaveDetails"
        :request="selectedLeaveRequest"
        :action-loading="actionLoading"
        @approve="approveRequest"
        @reject="rejectRequest"
      />

      <RequestCaApprovalModal
        v-model="caApprovalModal"
        :request="selectedCaRequest"
        :approval-data="caApprovalData"
        :submitting="caSubmitting"
        @update:approval-data="caApprovalData = $event"
        @submit="submitCaApproval"
      />

      <RequestCaViewModal v-model="caViewDialog" :request="selectedCaRequest" />

      <RequestOvertimeDetailModal v-model="showOvertimeDetail" :request="selectedOvertimeRow" />

      <OvertimeAdvanceModal
        v-model="showOvertimeAdvanceModal"
        :categories="overtimeCategories"
        :employee-options="overtimeAdvanceEmployeeOptions"
        :submitting="overtimeAdvanceSubmitting"
        :company-id="selectedCompany"
        @filter-employees="filterOvertimeAdvanceEmployees"
        @submit="submitOvertimeAdvance"
      />

      <RequestSwapViewModal
        v-model="showSwapViewDialog"
        :request="selectedSwapRequest"
        @approve="approveSwapRequest"
        @reject="rejectSwapRequest"
      />

      <RequestApplyLeaveModal
        v-model="showApplyLeaveModal"
        :employee-options="applyLeaveEmployeeOptions"
        :leave-types="applyLeaveTypes"
        :submitting="applyLeaveSubmitting"
        @filter-employees="filterApplyLeaveEmployees"
        @submit="submitApplyLeave"
      />
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { extractErrorMessage } from 'src/composables/utils/http'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useCompany } from 'src/composables/page/useCompany'
import { useAuthStore } from 'src/boot/auth'
import { getApproverName } from 'src/composables/utils/employee'
import RequestStatsCards from 'src/components/pages/Request/RequestStatsCards.vue'
import RequestLeaveTable from 'src/components/pages/Request/RequestLeaveTable.vue'
import RequestOvertimeTable from 'src/components/pages/Request/RequestOvertimeTable.vue'
import RequestCashAdvanceTable from 'src/components/pages/Request/RequestCashAdvanceTable.vue'
import RequestLeaveDetailModal from 'src/components/pages/Request/RequestLeaveDetailModal.vue'
import RequestCaApprovalModal from 'src/components/pages/Request/RequestCaApprovalModal.vue'
import RequestCaViewModal from 'src/components/pages/Request/RequestCaViewModal.vue'
import RequestOvertimeDetailModal from 'src/components/pages/Request/RequestOvertimeDetailModal.vue'
import OvertimeAdvanceModal from 'src/components/pages/Request/OvertimeAdvanceModal.vue'
import RequestCashAdvanceCutoff from 'src/components/pages/Request/RequestCashAdvanceCutoff.vue'
import RequestSwapTable from 'src/components/pages/Request/RequestSwapTable.vue'
import RequestSwapViewModal from 'src/components/pages/Request/RequestSwapViewModal.vue'
import RequestApplyLeaveModal from 'src/components/pages/Request/RequestApplyLeaveModal.vue'
import {
  buildEmployeeDirectory,
  normalizeSwapRequest,
  normalizeSwapRequests,
} from 'src/composables/utils/swapRequests'
import { normalizeOvertimeRequests } from 'src/composables/utils/overtimeRequests'
import { useAdminPayrollGroups } from 'src/composables/admin/useAdminPayrollGroups'
import { useEmployeePayoutGroup } from 'src/composables/page/useEmployeePayoutGroup'
import { useToast } from 'src/composables/useToast'

const $q = useQuasar()
const toast = useToast()

const { employees, fetchEmployees } = useEmployees()
// Aliased to `selectedCompany`: several functions in this file declare their own
// local `companyId` from it, and an outer binding by that name would read as the
// one being shadowed. It is a *computed* over the Pinia company store, so it
// tracks a workspace switch in this tab — which the private localStorage
// snapshot this replaces could not do, `storage` events being delivered only to
// the tabs that did not make the change.
const { company, companyId: selectedCompany } = useCompany()
const authStore = useAuthStore()

const companyName = computed(() => company.value?.name || '')

// ===== OVERTIME ADVANCE STATE =====
const showOvertimeAdvanceModal = ref(false)
const overtimeAdvanceSubmitting = ref(false)
const overtimeAdvanceEmployeeOptions = ref([])

// ===== APPLY LEAVE STATE =====
const showApplyLeaveModal = ref(false)
const applyLeaveSubmitting = ref(false)
const applyLeaveEmployeeOptions = ref([])
const applyLeaveTypes = ref([])

// ===== SHARED STATE =====
const activeTab = ref('leave')
const loading = ref(false)
const searchTerm = ref('')

// ===== SHARED: PAYOUT GROUP FILTER =====
// Every queue on this page can be narrowed to one payout group, the way the
// Employees, Attendance and Schedule pages already can — a reviewer usually
// works one group's cutoff at a time, across leave, overtime and cash advance
// alike, so the same control and the same wording appear in all three toolbars.
//
// Client-side, and resolved per employee from their active contract: none of
// `/attendance/leave-list/`, `/payroll/overtime-list/` or the cash-advance list
// returns a payout group or accepts one as a query param. The contract lookups
// are cached module-level by `useEmployeePayoutGroup`, shared with those other
// pages, and only run for the queue whose filter is actually in use.
const { payrollGroups, fetchPayrollGroups } = useAdminPayrollGroups()
const {
  resolving: resolvingPayoutGroups,
  groupIdFor,
  inlineGroupId,
  ensure: ensurePayoutGroups,
} = useEmployeePayoutGroup()

// One ref per queue rather than one shared across the tabs: each toolbar shows
// the state of the table under it, so switching tabs cannot silently hide rows
// behind a filter set somewhere else.
const leavePayrollGroupFilter = ref(null)
const overtimePayrollGroupFilter = ref(null)
const caPayrollGroupFilter = ref(null)

const payrollGroupOptions = computed(() =>
  payrollGroups.value.map((g) => ({ label: g.name, value: g.id })),
)

/**
 * The roster record a request row's employee reference points at.
 *
 * These endpoints name people by primary key, and the id spaces in circulation
 * across them overlap — employee id, user id and employee-company id are all
 * used, and employee #3 is not user #3. So one candidate is tried at a time, in
 * the order the payload's fields are most likely to mean, and within a candidate
 * the employee-company fields are checked before widening to every id a roster
 * entry answers to (the set `buildEmployeeDirectory` keys its names by).
 *
 * A key two people answer to resolves to nobody rather than to a guess: the
 * group decides whether a row is shown at all, and listing the wrong person's
 * request under "group A" is worse than leaving the row out.
 *
 * A record, not an id, because the contract endpoint wants the roster pk and
 * only the record can give it.
 */
function rosterEmployeeForKey(candidate) {
  const raw =
    candidate && typeof candidate === 'object'
      ? (candidate.id ?? candidate.uuid ?? null)
      : candidate
  if (raw === null || raw === undefined || raw === '') return null
  const target = String(raw)
  const answersTo = (ids) =>
    ids.some((id) => id !== null && id !== undefined && String(id) === target)

  const byCompanyId = employees.value.filter((emp) =>
    answersTo([emp.employee_company, emp.employee_company_id]),
  )
  if (byCompanyId.length === 1) return byCompanyId[0]
  if (byCompanyId.length > 1) return null

  const byAnyId = employees.value.filter((emp) =>
    answersTo([emp.id, emp.employee_id, emp.uuid, emp.user?.id, emp.user_id]),
  )
  return byAnyId.length === 1 ? byAnyId[0] : null
}

function rosterEmployeeFor(candidates) {
  for (const candidate of candidates) {
    const match = rosterEmployeeForKey(candidate)
    if (match) return match
  }
  return null
}

/** Payout group for a row: inline on the roster record if present, else cached. */
function rowPayoutGroupId(candidates) {
  const employee = rosterEmployeeFor(candidates)
  if (!employee) return null
  const inline = inlineGroupId(employee)
  if (inline !== null) return inline
  return groupIdFor(employee.id)
}

// The employee reference each payload carries, most specific field first. The
// three lists were written against different serializers, so none of them agrees
// with the others on where the person's id lives.
const leaveRowEmployeeRefs = (row) => [row.employeeCompany, row.employeeRef, row.employeeId]
const overtimeRowEmployeeRefs = (row) => [row.employeeCompany]
const caRowEmployeeRefs = (row) => [
  row.employee_company,
  row.employee_company_id,
  row.employee,
  row.employee_id,
  row.user,
  row.user_id,
]

/** True when the row belongs to the selected group; unresolved rows do not. */
const matchesPayrollGroup = (refs, groupId) =>
  String(rowPayoutGroupId(refs) ?? '') === String(groupId)

// True while the roster the resolution needs is still on its way. Only the
// overtime and swap fetches load employees for their own sake, so a filter used
// on a tab that never needed the roster has to wait for one.
const loadingGroupRoster = ref(false)

/** Rows are hidden until resolution finishes, so the tables show a skeleton. */
const resolvingGroups = computed(() => resolvingPayoutGroups.value || loadingGroupRoster.value)

/** Fill the contract cache for the rows a group filter is currently narrowing. */
async function ensureGroupsFor(rows, refsFor) {
  if (!employees.value.length) {
    loadingGroupRoster.value = true
    try {
      // Cached per company by useEmployees, so this is usually free — but every
      // row's group is resolved through the roster, and without it a selected
      // group would match nothing and read as an empty queue.
      await fetchEmployees()
    } catch {
      /* names and groups degrade together; the queue itself still renders */
    } finally {
      loadingGroupRoster.value = false
    }
  }
  const ids = [...new Set(rows.map((row) => rosterEmployeeFor(refsFor(row))?.id).filter(Boolean))]
  if (ids.length) await ensurePayoutGroups(ids)
}

// ===== LEAVE STATE =====
const leaveList = ref([])
const statusFilter = ref('all')
const actionLoading = ref(null)
const selectedLeaveRequest = ref(null)
const showLeaveDetails = ref(false)

// ===== OVERTIME STATE =====
// One flat queue for the whole company, the same shape the leave tab uses.
// Overtime used to be grouped under the payroll run it belonged to, so an
// approver had to open each run to find out whether anything was waiting.
const overtimeCategories = ref([])
const overtimeRequests = ref([])
const overtimeLoading = ref(false)
const overtimeSearch = ref('')
const overtimeStatusFilter = ref('all')
// id -> employee name for the active company, rebuilt on every overtime fetch:
// the list names people by primary key alone, so a stale directory would label
// rows with the previous workspace's roster.
const overtimeDirectory = ref(null)
const overtimeSubmitting = ref(new Set())
const overtimeEditableHours = ref({})
const selectedOvertimeIds = ref(new Set())
const showOvertimeDetail = ref(false)
const selectedOvertimeRow = ref(null)

// ===== CASH ADVANCE STATE =====
const caRequests = ref([])
const caFilterStatus = ref('')
const caSubmitting = ref(false)
const selectedCaRequest = ref(null)
const caApprovalModal = ref(false)
const caViewDialog = ref(false)
const caApprovalData = ref({ status: 'approved', remarks: '' })
const caPagination = ref({ page: 1, rowsPerPage: 10 })
const caStatistics = ref({ total: 0, pending: 0, approved: 0, rejected: 0 })
const caStatusOptions = ['', 'pending', 'approved', 'rejected']
const caViewMode = ref('all')
const caDisbursementLogs = ref([])
const selectedCaDisbursementLog = ref(null)
const caCutoffRequests = ref([])
const caCutoffLoading = ref(false)
const caCutoffSearch = ref('')

// ===== SWAP STATE =====
const swapRequests = ref([])
const swapSortBy = ref('Newest')
const swapPagination = ref({ page: 1, rowsPerPage: 10 })
const swapLoading = ref(false)
const swapActionLoading = ref(null)
// id -> employee name for the active company, rebuilt on every swap fetch so a
// workspace switch can't resolve names out of the previous company's roster.
const swapDirectory = ref(null)
const selectedSwapRequest = ref(null)
const showSwapViewDialog = ref(false)

// ===== COMPUTED STATS =====
const leaveStats = computed(() => ({
  total: leaveList.value.length,
  pending: leaveList.value.filter((r) => r.status === 'pending').length,
  approved: leaveList.value.filter((r) => r.status === 'approved').length,
  rejected: leaveList.value.filter((r) => r.status === 'rejected').length,
}))

const overtimeStats = computed(() => ({
  total: overtimeRequests.value.length,
  pending: overtimeRequests.value.filter((r) => r.actionable).length,
  approved: overtimeRequests.value.filter((r) => r.statusGroup === 'approved').length,
  rejected: overtimeRequests.value.filter((r) => r.statusGroup === 'rejected').length,
}))

const swapStatistics = computed(() => ({
  total: swapRequests.value.length,
  pending: swapRequests.value.filter(
    (r) => r.status === 'pending' || r.status === 'to_employee_approved',
  ).length,
  approved: swapRequests.value.filter((r) => r.status === 'approved').length,
  rejected: swapRequests.value.filter((r) => r.status === 'rejected').length,
}))

// ===== QUEUE RAIL =====
const queues = computed(() => [
  { key: 'leave', label: 'Leave', icon: 'event_note', pending: leaveStats.value.pending },
  { key: 'overtime', label: 'Overtime', icon: 'more_time', pending: overtimeStats.value.pending },
  {
    key: 'cash_advance',
    label: 'Cash Advance',
    icon: 'account_balance_wallet',
    pending: caStatistics.value.pending,
  },
  { key: 'swap', label: 'Swap', icon: 'swap_horiz', pending: swapStatistics.value.pending },
])

const totalPending = computed(() =>
  queues.value.reduce((sum, queue) => sum + (queue.pending || 0), 0),
)

const pendingSummary = computed(() => {
  const waiting = totalPending.value
  if (!waiting) return 'Every queue is clear'
  return `${waiting} awaiting your decision`
})

// ===== "UPDATED x ago" =====
// `nowTick` re-evaluates the label on a timer; without it the relative time
// would freeze at whatever it read when the data last arrived.
const lastUpdated = ref(null)
const nowTick = ref(Date.now())
let tickTimer = null

const markUpdated = () => {
  lastUpdated.value = Date.now()
  nowTick.value = Date.now()
}

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return 'just now'
  const seconds = Math.max(0, Math.round((nowTick.value - lastUpdated.value) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(lastUpdated.value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
})

// ===== FILTERED LISTS =====
const filteredLeaveRequests = computed(() => {
  let filtered = [...leaveList.value]
  if (statusFilter.value && statusFilter.value !== 'all' && statusFilter.value !== null) {
    filtered = filtered.filter((r) => r.status === statusFilter.value)
  }
  if ((searchTerm.value || '').trim()) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.employeeName?.toLowerCase().includes(search) ||
        (r.reason && r.reason.toLowerCase().includes(search)),
    )
  }
  // A row whose group cannot be resolved is excluded while a group is selected —
  // "show me group A" should not fall back to including unknowns.
  if (leavePayrollGroupFilter.value) {
    filtered = filtered.filter((r) =>
      matchesPayrollGroup(leaveRowEmployeeRefs(r), leavePayrollGroupFilter.value),
    )
  }
  return filtered
})

const filteredCaRequests = computed(() => {
  let list = [...caRequests.value]
  if (caFilterStatus.value) {
    list = list.filter((r) => r.status === caFilterStatus.value)
  }
  if (searchTerm.value) {
    const searchLower = searchTerm.value.toLowerCase()
    list = list.filter(
      (r) =>
        (r.employee_name || '').toLowerCase().includes(searchLower) ||
        String(r.id).includes(searchLower),
    )
  }
  if (caPayrollGroupFilter.value) {
    list = list.filter((r) => matchesPayrollGroup(caRowEmployeeRefs(r), caPayrollGroupFilter.value))
  }
  return list
})

const filteredSwapRequests = computed(() => {
  let filtered = [...swapRequests.value]
  if ((searchTerm.value || '').trim()) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        (r.requested_by_name || '').toLowerCase().includes(search) ||
        (r.from_employee_name || '').toLowerCase().includes(search) ||
        (r.to_employee_name || '').toLowerCase().includes(search),
    )
  }
  if (swapSortBy.value === 'Newest') {
    filtered.sort((a, b) => new Date(b.requested_at || 0) - new Date(a.requested_at || 0))
  } else if (swapSortBy.value === 'Oldest') {
    filtered.sort((a, b) => new Date(a.requested_at || 0) - new Date(b.requested_at || 0))
  } else if (swapSortBy.value === 'Status') {
    filtered.sort((a, b) => (a.status || '').localeCompare(b.status || ''))
  }
  const page = swapPagination.value.page
  const rowsPerPage = swapPagination.value.rowsPerPage
  const start = (page - 1) * rowsPerPage
  return filtered.slice(start, start + rowsPerPage)
})

const refreshLoading = computed(() => {
  if (activeTab.value === 'swap') return swapLoading.value
  if (activeTab.value === 'overtime') return overtimeLoading.value
  return loading.value
})

// Select-all acts on the rows the filters actually left on screen, not on the
// whole queue — approving something the approver cannot see is not a bulk
// action, it is a surprise.
const actionableOvertimeIds = computed(() =>
  filteredOvertimeRequests.value.filter((r) => r.actionable).map((r) => r.id),
)

// ===== CASH ADVANCE HELPERS =====
const extractEmployeeName = (request) => {
  if (request.employee_name) return request.employee_name
  if (request.employee) {
    if (typeof request.employee === 'object') {
      if (request.employee.full_name) return request.employee.full_name
      if (request.employee.name) return request.employee.name
      if (request.employee.first_name && request.employee.last_name)
        return `${request.employee.first_name} ${request.employee.last_name}`
      if (request.employee.first_name) return request.employee.first_name
    }
  }
  if (request.user && typeof request.user === 'object') {
    if (request.user.full_name) return request.user.full_name
    if (request.user.first_name) return request.user.first_name
  }
  if (request.employee_id) return `Employee #${request.employee_id}`
  return 'Unknown Employee'
}

/** The signed-in admin's own name, for a request they approved themselves. */
const signedInName = () => {
  const user = authStore.user
  if (!user) return ''
  return (
    user.full_name ||
    `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
    user.username ||
    ''
  )
}

/**
 * Names the approver on a cash-advance request.
 *
 * `approved_by` comes back as the approver's id, which is what the Status column
 * was printing — "by 14". A name is used when the payload carries one; failing
 * that, an id matching the signed-in user is resolved locally, since an admin
 * approving from this screen is the common case and their own name is the one
 * fact the client can establish without guessing.
 *
 * It deliberately does not match the id against the employee list: `approved_by`
 * identifies a user, employees are a different id space, and naming the wrong
 * person is worse than naming nobody. Rows approved by someone else stay
 * unnamed until the endpoint returns `approved_by_name`, as the leave and
 * overtime endpoints already do.
 */
const resolveApproverName = (request) => {
  const named = getApproverName(request)
  if (named) return named
  const by = request?.approved_by
  if (by != null && String(by) === String(authStore.user?.id)) return signedInName()
  return ''
}

const updateCaStats = (sourceList = caRequests.value) => {
  caStatistics.value.total = sourceList.length
  caStatistics.value.pending = sourceList.filter((r) => r.status === 'pending').length
  caStatistics.value.approved = sourceList.filter((r) => r.status === 'approved').length
  caStatistics.value.rejected = sourceList.filter((r) => r.status === 'rejected').length
}

// ===== API: LEAVE =====
const fetchLeaveRequests = async () => {
  loading.value = true
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const res = await api.get('/attendance/leave-list/', {
      params: { company_id: companyId },
    })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    leaveList.value = data.map((item) => ({
      id: item.id,
      employeeName: item.employee_name,
      // Kept only so the payout-group filter can reach the roster: the list
      // renders `employee_name`, but a name cannot be matched to a contract.
      // Which of these three the serializer sends varies, so all are carried.
      employeeCompany: item.employee_company ?? item.employee_company_id ?? null,
      employeeRef: item.employee ?? null,
      employeeId: item.employee_id ?? null,
      company: item.company_name || '',
      type: item.leave_type_name || 'Leave',
      status: item.status?.toLowerCase(),
      startDate: item.start_date,
      endDate: item.end_date,
      duration:
        item.total_days != null
          ? `${item.total_days} day(s)`
          : item.hours
            ? `${item.hours}h`
            : 'N/A',
      reason: item.reason,
      leavePicture: item.leave_picture || null,
      submittedDate: item.submitted_at,
      approvedByName: item.approved_by_name || '',
      approvedAt: item.approved_at || '',
    }))
  } catch (e) {
    const errorMessage = extractErrorMessage(e, 'Failed to fetch leave requests.')
    toast.error(errorMessage, { icon: 'error' })
  } finally {
    loading.value = false
  }
}

// ===== API: OVERTIME =====
const fetchOvertimeCategories = async () => {
  try {
    const companyId = selectedCompany.value
    const res = await api.get('/payroll/overtime-categories/', {
      params: companyId ? { company: companyId } : {},
    })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    overtimeCategories.value = data.filter((c) => c.is_active)
  } catch {
    /* non-critical, fail silently */
  }
}

const fetchOvertimeRequests = async () => {
  overtimeLoading.value = true
  overtimeEditableHours.value = {}
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    // The overtime list names people by primary key alone, so the company's
    // employees are the only place the names exist. useEmployees caches per
    // company, so this is usually free; a failure here costs names, not the tab.
    const [res] = await Promise.all([
      api.get('/payroll/overtime-list/', { params: { company: companyId } }),
      fetchEmployees().catch(() => []),
    ])
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    // Resolved here rather than in the grid so the table, the details modal and
    // the tab counter all read the same names, hours and status wording.
    overtimeDirectory.value = buildEmployeeDirectory(employees.value)
    overtimeRequests.value = normalizeOvertimeRequests(data, overtimeDirectory.value)
    // Rows that vanished from the queue must not stay selected — a later bulk
    // approve would then patch ids that are no longer on screen.
    const live = new Set(overtimeRequests.value.filter((r) => r.actionable).map((r) => r.id))
    selectedOvertimeIds.value = new Set(
      Array.from(selectedOvertimeIds.value).filter((id) => live.has(id)),
    )
  } catch (e) {
    const errorMessage = extractErrorMessage(e, 'Failed to fetch overtime requests.')
    toast.error(errorMessage, { icon: 'error' })
  } finally {
    overtimeLoading.value = false
  }
}

// The hours field is only editable while a row is still open, so the draft map
// is keyed by request id and cleared on every refetch.
const setOvertimeEditableHours = (id, value) => {
  overtimeEditableHours.value = { ...overtimeEditableHours.value, [id]: value }
}

// What to settle the request at: the approver's edit if they made one, then the
// hours claimed, then the qualified figure. A row carrying no figure at all
// patches as 0 — the endpoint wants a decimal string, and sending the text of
// whatever placeholder the payload used is how it ends up storing "null".
const resolveApprovedHours = (row) => {
  const parsed = Number(
    overtimeEditableHours.value[row?.id] ?? row?.hours ?? row?.qualifiedHours ?? 0,
  )
  return String(Number.isFinite(parsed) ? parsed : 0)
}

const openOvertimeDetail = (row) => {
  selectedOvertimeRow.value = row
  showOvertimeDetail.value = true
}

const approveOvertimeSingle = async (row) => {
  overtimeSubmitting.value.add(row.id)
  try {
    await api.patch(`/payroll/overtime-approve/${row.id}/`, {
      approved_hours: resolveApprovedHours(row),
      category: row.category ?? 0,
      reason: '',
      status: 'approved',
    })
    toast.success('Overtime approved successfully', { icon: 'check_circle' })
    clearOvertimeSelection()
    await fetchOvertimeRequests()
  } catch (e) {
    console.log('Overtime approve error:', JSON.stringify(e.response?.data, null, 2))
    const msg = extractErrorMessage(e, 'Failed to approve overtime')
    toast.error(msg, { icon: 'error' })
  } finally {
    overtimeSubmitting.value.delete(row.id)
  }
}

const rejectOvertimeSingle = async (row) => {
  overtimeSubmitting.value.add(row.id)
  try {
    await api.patch(`/payroll/overtime-approve/${row.id}/`, {
      approved_hours: resolveApprovedHours(row),
      category: row.category ?? 0,
      reason: '',
      status: 'rejected',
    })
    toast.success('Overtime rejected', { icon: 'cancel' })
    clearOvertimeSelection()
    await fetchOvertimeRequests()
  } catch (e) {
    console.log('Overtime reject error:', JSON.stringify(e.response?.data, null, 2))
    const msg = extractErrorMessage(e, 'Failed to reject overtime')
    toast.error(msg, { icon: 'error' })
  } finally {
    overtimeSubmitting.value.delete(row.id)
  }
}

const toggleOvertimeSelection = (id) => {
  const newSet = new Set(selectedOvertimeIds.value)
  if (newSet.has(id)) newSet.delete(id)
  else newSet.add(id)
  selectedOvertimeIds.value = newSet
}

const toggleSelectAllOvertime = () => {
  const actionable = actionableOvertimeIds.value
  const allSelected =
    actionable.length > 0 && actionable.every((id) => selectedOvertimeIds.value.has(id))
  selectedOvertimeIds.value = allSelected ? new Set() : new Set(actionable)
}

const clearOvertimeSelection = () => {
  selectedOvertimeIds.value = new Set()
}

// ===== OVERTIME ADVANCE =====
const openOvertimeAdvanceModal = async () => {
  overtimeAdvanceEmployeeOptions.value = []
  await fetchOvertimeAdvanceEmployees()
  showOvertimeAdvanceModal.value = true
}

const fetchOvertimeAdvanceEmployees = async () => {
  try {
    await fetchEmployees({ force: true })
    overtimeAdvanceEmployeeOptions.value = employees.value.map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
  } catch {
    /* silent */
  }
}

const filterOvertimeAdvanceEmployees = (val) => {
  if (!val || val.trim() === '') {
    overtimeAdvanceEmployeeOptions.value = employees.value.map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
    return
  }
  const search = val.toLowerCase()
  overtimeAdvanceEmployeeOptions.value = employees.value
    .filter((e) => {
      const name =
        e.user?.full_name || `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim()
      return name.toLowerCase().includes(search)
    })
    .map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
}

const submitOvertimeAdvance = async (payload) => {
  overtimeAdvanceSubmitting.value = true
  const companyId = selectedCompany.value
  if (!companyId) {
    toast.error('No company selected', { icon: 'error' })
    overtimeAdvanceSubmitting.value = false
    return
  }
  try {
    const body = {
      employee_ids: payload.employee_ids,
      category: payload.category,
      date: payload.date,
      reason: payload.reason,
    }
    if (payload.limit_hours) {
      body.limit_hours = payload.limit_hours
    }
    await api.post(`/attendance/overtime/admin/${companyId}/`, body)
    toast.success('Overtime advance created successfully', { icon: 'check_circle' })
    showOvertimeAdvanceModal.value = false
    await fetchOvertimeRequests()
  } catch (e) {
    const msg = extractErrorMessage(e, 'Failed to create overtime advance')
    toast.error(msg, { icon: 'error' })
  } finally {
    overtimeAdvanceSubmitting.value = false
  }
}

// ===== APPLY LEAVE =====
const openApplyLeaveModal = async () => {
  applyLeaveEmployeeOptions.value = []
  applyLeaveTypes.value = []
  try {
    await fetchEmployees({ force: true })
    applyLeaveEmployeeOptions.value = employees.value.map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
    const companyId = selectedCompany.value
    if (companyId) {
      const res = await api.get('/attendance/leave-types/', {
        params: { company: companyId },
      })
      const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.results || []
      applyLeaveTypes.value = data
    }
  } catch {
    /* silent */
  }
  showApplyLeaveModal.value = true
}

const filterApplyLeaveEmployees = (val) => {
  if (!val || val.trim() === '') {
    applyLeaveEmployeeOptions.value = employees.value.map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
    return
  }
  const search = val.toLowerCase()
  applyLeaveEmployeeOptions.value = employees.value
    .filter((e) => {
      const name =
        e.user?.full_name || `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim()
      return name.toLowerCase().includes(search)
    })
    .map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
}

const submitApplyLeave = async (payload) => {
  applyLeaveSubmitting.value = true
  try {
    await api.post('/attendance/leave/apply-for-employee/', {
      ...payload,
      status: 'approved',
    })
    toast.success('Leave assigned successfully', { icon: 'check_circle' })
    showApplyLeaveModal.value = false
    await fetchLeaveRequests()
  } catch (e) {
    const msg = extractErrorMessage(e, 'Failed to assign leave')
    toast.error(msg, { icon: 'error' })
  } finally {
    applyLeaveSubmitting.value = false
  }
}

/**
 * Approve or reject every selected overtime request, and say what actually
 * happened.
 *
 * The endpoint decides one request at a time, so a bulk action is N calls and
 * any one of them can be refused on its own — a category the server rejects, a
 * request someone else already actioned. Both handlers used to wrap the whole
 * loop in a single try/catch, which meant the third failure of ten aborted the
 * run with seven untouched, skipped the success toast, skipped
 * `clearOvertimeSelection()` *and* skipped the refetch, and reported one flat
 * "Failed to bulk approve". The first two were already committed on the server
 * but still rendered as pending, so a retry patched them a second time, and
 * there was no way for the reviewer to learn which two had gone through.
 *
 * So: each request gets its own try/catch, the outcome is counted, the queue is
 * always re-read because the server has moved for whatever succeeded, and the
 * closing toast distinguishes all / some / none. This is the shape
 * `Disbursement/ReviewPage.vue` already uses for its own bulk review.
 *
 * The two handlers were also identical apart from the verb, which is why they
 * are one function now — the bug had been fixed in neither copy.
 */
const OVERTIME_BULK_ACTIONS = {
  approved: {
    title: 'Bulk Approve',
    prompt: (n) => `Approve ${n} overtime request(s)?`,
    ok: { label: 'Approve', color: 'positive', unelevated: true },
    verb: 'approve',
    past: 'approved',
    icon: 'check_circle',
  },
  rejected: {
    title: 'Bulk Reject',
    prompt: (n) => `Reject ${n} overtime request(s)?`,
    ok: { label: 'Reject', color: 'negative', unelevated: true },
    verb: 'reject',
    past: 'rejected',
    icon: 'cancel',
  },
}

const bulkDecideOvertime = (status) => {
  const spec = OVERTIME_BULK_ACTIONS[status]
  const ids = Array.from(selectedOvertimeIds.value)
  if (!ids.length) return

  $q.dialog({
    title: spec.title,
    message: spec.prompt(ids.length),
    ok: spec.ok,
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    overtimeSubmitting.value = new Set(ids)
    const done = []
    let reason = ''

    try {
      for (const id of ids) {
        const row = overtimeRequests.value.find((r) => r.id === id)
        try {
          await api.patch(`/payroll/overtime-approve/${id}/`, {
            approved_hours: resolveApprovedHours(row),
            category: row?.category ?? 0,
            reason: '',
            status,
          })
          done.push(id)
        } catch (e) {
          // First refusal wins the caption: they are usually the same reason,
          // and a toast is not the place for ten of them.
          reason = reason || extractErrorMessage(e, `Could not ${spec.verb} this request`)
          console.error(
            `[Requests] bulk ${spec.verb} failed for overtime ${id}:`,
            e?.response?.data ?? e,
          )
        }
      }
    } finally {
      overtimeSubmitting.value = new Set()
      clearOvertimeSelection()
    }

    // Unconditional: the server state has moved for everything in `done`, so a
    // partial run that left the table alone is exactly how approved rows kept
    // showing as pending.
    await fetchOvertimeRequests().catch((e) =>
      console.error('[Requests] refetch after bulk overtime failed:', e),
    )

    const failed = ids.length - done.length
    if (done.length && failed) {
      toast.warning(`${done.length} ${spec.past}, ${failed} could not be.`, {
        caption: reason || undefined,
      })
    } else if (done.length) {
      toast.success(
        `${done.length} overtime request${done.length === 1 ? '' : 's'} ${spec.past}`,
        { icon: spec.icon },
      )
    } else {
      toast.error(reason || `None of these requests could be ${spec.past}.`)
    }
  })
}

const bulkApproveOvertime = () => bulkDecideOvertime('approved')
const bulkRejectOvertime = () => bulkDecideOvertime('rejected')

// Filtered over the whole queue, then ordered — never over whatever happens to
// be rendered. The grid shows every matching row, so there is no page slice to
// filter behind. Newest overtime first, because a flat queue spanning every
// payroll run has no other natural order; ties break on the request id so the
// list does not reshuffle between refreshes.
const filteredOvertimeRequests = computed(() => {
  let filtered = [...overtimeRequests.value]
  if (overtimeStatusFilter.value && overtimeStatusFilter.value !== 'all') {
    filtered = filtered.filter((r) => r.statusGroup === overtimeStatusFilter.value)
  }
  const search = (overtimeSearch.value || '').trim().toLowerCase()
  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.employeeName?.toLowerCase().includes(search) ||
        r.categoryName?.toLowerCase().includes(search) ||
        (r.reason && r.reason.toLowerCase().includes(search)),
    )
  }
  // A row whose group cannot be resolved is excluded while a group is selected —
  // "show me group A" should not fall back to including unknowns.
  if (overtimePayrollGroupFilter.value) {
    filtered = filtered.filter((r) =>
      matchesPayrollGroup(overtimeRowEmployeeRefs(r), overtimePayrollGroupFilter.value),
    )
  }
  return filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id)
})

// ===== LEAVE: APPROVE / REJECT =====
const approveRequest = async (request) => {
  try {
    actionLoading.value = `approve-${request.id}`
    await api.patch(`/attendance/leave-approval/${request.id}/`, { status: 'approved' })
    const index = leaveList.value.findIndex((r) => r.id === request.id)
    if (index !== -1) leaveList.value[index].status = 'approved'
    toast.success('Leave request approved successfully', { icon: 'check_circle' })
    if (showLeaveDetails.value) showLeaveDetails.value = false
  } catch (e) {
    if (e.response?.status === 500) {
      const index = leaveList.value.findIndex((r) => r.id === request.id)
      if (index !== -1) leaveList.value[index].status = 'approved'
      toast.success('Leave request approved successfully', { icon: 'check_circle' })
      if (showLeaveDetails.value) showLeaveDetails.value = false
      return
    }
    const errorMessage = extractErrorMessage(e, 'Failed to approve request.')
    toast.error(errorMessage, { icon: 'error' })
  } finally {
    actionLoading.value = null
  }
}

const rejectRequest = async (request) => {
  try {
    actionLoading.value = `reject-${request.id}`
    await api.patch(`/attendance/leave-approval/${request.id}/`, { status: 'rejected' })
    const index = leaveList.value.findIndex((r) => r.id === request.id)
    if (index !== -1) leaveList.value[index].status = 'rejected'
    toast.warning('Leave request rejected', { icon: 'cancel' })
    if (showLeaveDetails.value) showLeaveDetails.value = false
  } catch (e) {
    if (e.response?.status === 500) {
      const index = leaveList.value.findIndex((r) => r.id === request.id)
      if (index !== -1) leaveList.value[index].status = 'rejected'
      toast.warning('Leave request rejected', { icon: 'cancel' })
      if (showLeaveDetails.value) showLeaveDetails.value = false
      return
    }
    const errorMessage = extractErrorMessage(e, 'Failed to reject request.')
    toast.error(errorMessage, { icon: 'error' })
  } finally {
    actionLoading.value = null
  }
}

const openLeaveDetails = (request) => {
  selectedLeaveRequest.value = request
  showLeaveDetails.value = true
}

// ===== API: CASH ADVANCE =====
const fetchCaRequests = async () => {
  loading.value = true
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const res = await api.get(`/cash_advance/admin/company/${companyId}/requests/`)
    let data = Array.isArray(res.data)
      ? res.data
      : res.data?.data?.requests || res.data?.requests || res.data?.results || []
    caRequests.value = data.map((req) => ({
      ...req,
      employee_name: req.employee_name || extractEmployeeName(req),
      approved_by_name: resolveApproverName(req),
    }))
    updateCaStats(caRequests.value)
  } catch (err) {
    const errorMessages = {
      401: 'Unauthorized. Please log in again.',
      403: 'Access forbidden.',
      404: 'Endpoint not found.',
    }
    // The status map stays ahead of the body: these endpoints answer some
    // failures with a code and no explanation, and the map is the only place
    // that wording exists.
    const message =
      errorMessages[err.response?.status] || extractErrorMessage(err, 'Failed to fetch requests')
    toast.error(message, { timeout: 5000 })
  } finally {
    loading.value = false
  }
}

const fetchCaDisbursementLogs = async () => {
  loading.value = true
  try {
    const res = await api.get('/cash_advance/admin/disbursement-logs/')
    caDisbursementLogs.value = Array.isArray(res.data) ? res.data : res.data.results || []
  } catch (err) {
    console.error('Failed to fetch CA disbursement logs', err)
  } finally {
    loading.value = false
  }
}

const fetchCaCutoffRequests = async (logId) => {
  caCutoffLoading.value = true
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const params = { log_id: logId }
    const res = await api.get(`/cash_advance/admin/company/${companyId}/requests/`, { params })
    let data = Array.isArray(res.data)
      ? res.data
      : res.data?.data?.requests || res.data?.requests || res.data?.results || []
    caCutoffRequests.value = data.map((req) => ({
      ...req,
      employee_name: req.employee_name || extractEmployeeName(req),
      approved_by_name: resolveApproverName(req),
    }))
    updateCaStats(caCutoffRequests.value)
  } catch (err) {
    const errorMessages = {
      401: 'Unauthorized. Please log in again.',
      403: 'Access forbidden.',
      404: 'Endpoint not found.',
    }
    // The status map stays ahead of the body: these endpoints answer some
    // failures with a code and no explanation, and the map is the only place
    // that wording exists.
    const message =
      errorMessages[err.response?.status] || extractErrorMessage(err, 'Failed to fetch cutoff requests')
    toast.error(message, { timeout: 5000 })
  } finally {
    caCutoffLoading.value = false
  }
}

const submitCaApproval = async () => {
  try {
    caSubmitting.value = true
    const requestId = selectedCaRequest.value.id
    if (!requestId) throw new Error('No valid ID found for this request')
    const payload = {
      status: caApprovalData.value.status,
      remarks: caApprovalData.value.remarks || '',
    }
    await api.patch(`/cash_advance/admin/cash-advances/${requestId}/action/`, payload)
    caApprovalModal.value = false
    selectedCaRequest.value = null
    toast.success('Request updated successfully!')
    if (caViewMode.value === 'cutoff' && selectedCaDisbursementLog.value) {
      await fetchCaCutoffRequests(selectedCaDisbursementLog.value)
    } else {
      await fetchCaRequests()
    }
  } catch (err) {
    if (err.response?.status === 500) {
      caApprovalModal.value = false
      selectedCaRequest.value = null
      toast.success('Request updated successfully!')
      if (caViewMode.value === 'cutoff' && selectedCaDisbursementLog.value) {
        await fetchCaCutoffRequests(selectedCaDisbursementLog.value)
      } else {
        await fetchCaRequests()
      }
      return
    }
    const message = extractErrorMessage(err, 'Failed to update request')
    toast.error(message, { timeout: 5000 })
  } finally {
    caSubmitting.value = false
  }
}

const openCaApprovalModal = (row) => {
  selectedCaRequest.value = row
  caApprovalData.value = { status: 'approved', remarks: '' }
  caApprovalModal.value = true
}

const viewCaRequest = (row) => {
  selectedCaRequest.value = row
  caViewDialog.value = true
}

const selectCaDisbursementLog = (id) => {
  const isSame = selectedCaDisbursementLog.value === id
  selectedCaDisbursementLog.value = isSame ? null : id
  caCutoffSearch.value = ''
  if (!isSame && id) {
    fetchCaCutoffRequests(id)
  } else {
    caCutoffRequests.value = []
    updateCaStats(caRequests.value)
  }
}

// ===== API: SWAP REQUESTS =====
const fetchSwapRequests = async () => {
  swapLoading.value = true
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    // The swap endpoint names people by id alone, so the company's employees
    // are the only place the names exist. useEmployees caches per company, so
    // this is usually free; a failure here costs names, not the whole tab.
    const [res] = await Promise.all([
      api.get('/organization/swap-requests/', { params: { company: companyId } }),
      fetchEmployees().catch(() => []),
    ])
    const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data?.results ?? [])
    // Resolved here rather than in the grid so the table, the details modal and
    // the tab counter all read the same names, labels and status wording.
    swapDirectory.value = buildEmployeeDirectory(employees.value)
    swapRequests.value = normalizeSwapRequests(data, swapDirectory.value)
    if (process.env.DEV) {
      // If a row still can't be named, the payload identifies people by some key
      // the resolver doesn't know yet — print that row's shape rather than let
      // the column quietly read "Unknown employee".
      const unnamed = swapRequests.value.find((r) => !r.requested_by_name)
      if (unnamed) console.debug('[swap-requests] unresolved requester, raw row:', unnamed)
    }
  } catch (e) {
    const errorMessage = extractErrorMessage(e, 'Failed to fetch swap requests.')
    toast.error(errorMessage, { icon: 'error' })
  } finally {
    swapLoading.value = false
  }
}

const approveSwapRequest = async (request) => {
  if (!request.to_employee_approved) {
    toast.warning('Employee has not yet approved the swap', { icon: 'warning' })
    return
  }
  swapActionLoading.value = `approve-${request.id}`
  try {
    await api.patch(`/organization/swap-requests/${request.id}/`, {
      status: 'approved',
      remarks: '',
    })
    const index = swapRequests.value.findIndex((r) => r.id === request.id)
    if (index !== -1) {
      swapRequests.value[index] = normalizeSwapRequest(
        { ...swapRequests.value[index], status: 'approved' },
        swapDirectory.value,
      )
    }
    toast.success('Swap request approved successfully', { icon: 'check_circle' })
    if (showSwapViewDialog.value) showSwapViewDialog.value = false
    await fetchSwapRequests()
  } catch (e) {
    const errorMessage = extractErrorMessage(e, 'Failed to approve swap request.')
    toast.error(errorMessage, { icon: 'error' })
  } finally {
    swapActionLoading.value = null
  }
}

const rejectSwapRequest = async (request) => {
  if (!request.to_employee_approved) {
    toast.warning('Employee has not yet approved the swap', { icon: 'warning' })
    return
  }
  swapActionLoading.value = `reject-${request.id}`
  try {
    await api.patch(`/organization/swap-requests/${request.id}/`, {
      status: 'rejected',
      remarks: '',
    })
    const index = swapRequests.value.findIndex((r) => r.id === request.id)
    if (index !== -1) {
      swapRequests.value[index] = normalizeSwapRequest(
        { ...swapRequests.value[index], status: 'rejected' },
        swapDirectory.value,
      )
    }
    toast.warning('Swap request rejected', { icon: 'cancel' })
    if (showSwapViewDialog.value) showSwapViewDialog.value = false
    await fetchSwapRequests()
  } catch (e) {
    const errorMessage = extractErrorMessage(e, 'Failed to reject swap request.')
    toast.error(errorMessage, { icon: 'error' })
  } finally {
    swapActionLoading.value = null
  }
}

const viewSwapRequest = (request) => {
  selectedSwapRequest.value = request
  showSwapViewDialog.value = true
}

// ===== REFRESH HANDLER =====
const handleRefresh = () => {
  markUpdated()
  if (activeTab.value === 'cash_advance') {
    if (caViewMode.value === 'cutoff') {
      fetchCaDisbursementLogs()
      if (selectedCaDisbursementLog.value) {
        fetchCaCutoffRequests(selectedCaDisbursementLog.value)
      }
    } else {
      fetchCaRequests()
    }
  } else if (activeTab.value === 'overtime') {
    fetchOvertimeRequests()
    fetchOvertimeCategories()
  } else if (activeTab.value === 'swap') {
    fetchSwapRequests()
  } else {
    fetchLeaveRequests()
  }
}

// Fetch data when tab changes
watch(activeTab, (newTab) => {
  statusFilter.value = 'all'
  if (newTab === 'cash_advance') {
    if (caViewMode.value === 'cutoff') {
      fetchCaDisbursementLogs()
    } else {
      fetchCaRequests()
    }
  } else if (newTab === 'overtime') {
    fetchOvertimeRequests()
    fetchOvertimeCategories()
  } else if (newTab === 'swap') {
    fetchSwapRequests()
  } else {
    fetchLeaveRequests()
  }
})

watch(caViewMode, (mode) => {
  if (activeTab.value === 'cash_advance') {
    if (mode === 'cutoff') {
      fetchCaDisbursementLogs()
    } else {
      fetchCaRequests()
    }
  }
})

// Payout groups feed all three toolbar selects, so the list loads with the page
// and reloads on a switch. Gated on companyId because fetchPayrollGroups
// returns an empty list without one, and does so silently.
watch(
  selectedCompany,
  (id) => {
    if (id) fetchPayrollGroups()
  },
  { immediate: true },
)

// Contracts are only fetched once a group is actually selected, then cached
// (module-level, shared with the Employees, Attendance and Schedule pages).
// Filtering is client-side, so nothing needs refetching — just resolve, then let
// the computed re-evaluate. Each queue also re-resolves when its rows change,
// because a refreshed list brings employees the cache has not seen yet.
watch([leavePayrollGroupFilter, leaveList], async () => {
  if (!leavePayrollGroupFilter.value) return
  await ensureGroupsFor(leaveList.value, leaveRowEmployeeRefs)
})

watch([overtimePayrollGroupFilter, overtimeRequests], async () => {
  if (!overtimePayrollGroupFilter.value) return
  await ensureGroupsFor(overtimeRequests.value, overtimeRowEmployeeRefs)
})

watch([caPayrollGroupFilter, caRequests], async () => {
  if (!caPayrollGroupFilter.value) return
  await ensureGroupsFor(caRequests.value, caRowEmployeeRefs)
})

// Re-fetch all data when selected company changes
watch(selectedCompany, () => {
  markUpdated()
  selectedCaDisbursementLog.value = null
  caCutoffRequests.value = []
  // Ids from the previous workspace mean nothing in the next one.
  clearOvertimeSelection()
  overtimeRequests.value = []
  overtimeDirectory.value = null
  // Group ids belong to the company they were listed for, so the filters cannot
  // survive a switch — they would silently match nothing in the new workspace.
  leavePayrollGroupFilter.value = null
  overtimePayrollGroupFilter.value = null
  caPayrollGroupFilter.value = null
  fetchLeaveRequests()
  fetchOvertimeRequests()
  fetchOvertimeCategories()
  fetchCaRequests()
  fetchCaDisbursementLogs()
  fetchSwapRequests()
})

onMounted(() => {
  markUpdated()
  fetchLeaveRequests()
  fetchOvertimeRequests()
  fetchOvertimeCategories()
  fetchCaRequests()
  fetchCaDisbursementLogs()
  fetchSwapRequests()
  tickTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
})
</script>

<style scoped src="../components/pages/Request/requestGrid.css"></style>

<style scoped>
/* ===========================================================================
   Requests page chrome.

   Everything here reads from the design system in src/css/dashboard.scss — the
   same `--dash-*` neutral ramp, radii, shadows and type scale the tables inside
   this page already use through requestGrid.css. The page previously carried
   its own slate palette (#102335, #e8ecf0, #f8fafc), its own radii (14–16px)
   and its own micro-label convention (10px uppercase at 0.06em tracking), so
   the frame around the queues read as a different product from the queues
   themselves.
   =========================================================================== */

.requests-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ===== Page header =====
   Matched to Contributions and Attendance: a 22px/600 title over a single meta
   line, so the three pages share one masthead rather than three. */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.page-identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.page-heading {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
}

/* Every page header in the app carries the same title metrics, including the
   one step down at tablet width. See EmployeesPage's .emp-head__title. */
@media (max-width: 1023px) {
  .page-heading {
    font-size: 20px;
  }
}
.page-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 7px;
  margin-top: 3px;
  font-size: 13px;
  color: var(--dash-ink-3);
}
.page-meta-item {
  white-space: nowrap;
}
.page-meta-item.waiting {
  color: var(--dash-warn);
  font-weight: 500;
}
.page-meta-dot {
  color: var(--dash-n-300);
}
/* Small live indicator on the freshness stamp, so "Updated 2m ago" reads as a
   running clock rather than a static string. */
.page-meta-live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dash-good-mark);
  flex-shrink: 0;
  animation: live-pulse 2.4s ease-in-out infinite;
}
@keyframes live-pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(23, 178, 106, 0.3);
  }
  50% {
    opacity: 0.7;
    box-shadow: 0 0 0 4px rgba(23, 178, 106, 0);
  }
}

/* Every header control stands 36px tall, so the refresh button, the primary
   action and the view toggle centre on each other by construction instead of
   by a per-item nudge. */
.page-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.action-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background: var(--dash-line);
  flex-shrink: 0;
}
.refresh-btn {
  height: 36px;
  width: 36px;
  min-height: 36px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-4) !important;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.refresh-btn:hover {
  background: var(--dash-n-100) !important;
  color: var(--dash-ink) !important;
}
/* Flat, not floating. The previous button lifted 1px and cast a 22px glow on
   hover, which reads as consumer software beside the rest of the dashboard;
   depth here is one hairline-dark plate plus the system's smallest shadow. */
.primary-action-btn {
  height: 36px;
  min-height: 36px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand) !important;
  color: #ffffff !important;
  box-shadow: var(--dash-shadow-xs);
  transition: background var(--dash-fast) var(--dash-ease);
}
.primary-action-btn:hover {
  background: var(--dash-n-800) !important;
}

/* Segmented control: a recessed track carrying a raised white plate on the
   active segment, the same shape the Contributions view switcher uses. It
   replaced a solid navy pill, which made "which list am I looking at" the
   loudest element on the page. */
.view-toggle {
  padding: 3px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-100);
  box-shadow: none;
}
.view-toggle :deep(.q-btn) {
  height: 28px;
  min-height: 28px;
  padding: 0 11px;
  font-size: 12.5px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--dash-r-sm);
  background: transparent !important;
  color: var(--dash-ink-3) !important;
  box-shadow: none;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.view-toggle :deep(.q-btn .q-icon) {
  font-size: 15px;
  margin-right: 5px;
  color: var(--dash-ink-4);
}
.view-toggle :deep(.q-btn:hover:not(.q-btn--active)) {
  background: rgba(255, 255, 255, 0.6) !important;
  color: var(--dash-ink-2) !important;
}
.view-toggle :deep(.q-btn--active) {
  background: var(--dash-surface) !important;
  border-color: var(--dash-line);
  color: var(--dash-ink) !important;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}
.view-toggle :deep(.q-btn--active .q-icon) {
  color: var(--dash-accent);
}

/* ===== Work surface =====
   One panel on the system's panel chrome: hairline edge, 12px radius, and the
   near-invisible shadow that keeps it flat against the canvas. */
.queue-content {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
  overflow: hidden;
}

/* ===== Tab bar =====
   Underline tabs riding the panel's top edge — an unambiguous "these are tabs"
   affordance, with the active queue's breakdown sharing the same band. */
/* Both halves stretch to the band's height: the tabs then anchor themselves to
   its bottom edge so the active indicator lands on the border, while the search
   and the stat chips centre inside the same height. Bottom-aligning the whole
   row instead left the chips sitting ~3px below the tab labels they read
   alongside. */
.tab-bar-row {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid var(--dash-line);
  background: var(--dash-surface);
  flex-wrap: wrap;
}
.tab-bar {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.tab-bar::-webkit-scrollbar {
  display: none;
}
.queue-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  /* -1px lets the indicator sit over the row's 1px border, so the active tab
     reads as connected to the panel below it. */
  margin-bottom: -1px;
  padding: 12px 12px 13px;
  background: transparent;
  border: none;
  border-radius: var(--dash-r-sm) var(--dash-r-sm) 0 0;
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--dash-fast) var(--dash-ease);
}
.queue-tab:hover {
  background: var(--dash-n-50);
}
/* Soft halo rather than a hard outline, which would fight the hairline borders
   it sits between. */
.queue-tab:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}
/* Rounded indicator that grows out from the centre on selection, rather than a
   hard border switching on. */
.queue-tab::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--dash-accent);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.22s var(--dash-ease);
}
.queue-tab.active::after {
  transform: scaleX(1);
}
/* No tile behind the icon — selection is carried by colour alone. */
.queue-tab-icon {
  color: var(--dash-ink-4);
  flex-shrink: 0;
  transition: color var(--dash-fast) var(--dash-ease);
}
.queue-tab:hover .queue-tab-icon {
  color: var(--dash-ink-2);
}
.queue-tab.active .queue-tab-icon {
  color: var(--dash-accent);
}
.queue-tab-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink-3);
  line-height: 1.3;
  transition: color var(--dash-fast) var(--dash-ease);
}
.queue-tab:hover .queue-tab-label {
  color: var(--dash-ink-2);
}
.queue-tab.active .queue-tab-label {
  color: var(--dash-ink);
  font-weight: 600;
}
/* Bordered rather than flat-filled, so the count holds its edge against both
   the white strip and the hover plate. */
.queue-tab-count {
  min-width: 19px;
  padding: 0 5px;
  border-radius: var(--dash-r-xs);
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  color: var(--dash-warn);
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.tab-bar-aside {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  min-width: 0;
}
.tab-bar-stats {
  flex-shrink: 0;
}

.panel-surface {
  background: var(--dash-surface);
}
.tab-panels {
  background: transparent;
}
.tab-panel-content {
  padding: 0;
}

/* ===== Responsive ===== */
/* Laptop */
@media (max-width: 1279px) {
  .queue-tab {
    gap: 7px;
    padding: 11px 10px 12px;
  }
}

/* Tablet */
@media (max-width: 1023px) {
  .page-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .page-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .action-divider {
    display: none;
  }
  .tab-bar-row {
    align-items: stretch;
    flex-direction: column;
    gap: 0;
    padding: 0 12px;
  }
  .queue-tab {
    flex: 1 0 auto;
    justify-content: center;
  }
  .tab-bar-aside {
    padding: 0 0 10px;
  }
}

@media (max-width: 599px) {
  .page-meta {
    font-size: 12px;
  }
  .queue-tab {
    padding: 11px 9px 12px;
  }
  /* Keep the icon and the pending count; the label is the first thing to go. */
  .queue-tab-label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .queue-tab,
  .queue-tab::after,
  .primary-action-btn {
    transition: none;
  }
  .live-dot {
    animation: none;
  }
}
</style>
