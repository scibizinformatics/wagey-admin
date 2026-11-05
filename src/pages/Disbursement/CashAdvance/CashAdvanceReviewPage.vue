<template>
  <PageShell>
    <CashAdvanceStepShell
      :pgi-id="pgiId"
      :step="1"
      :stage="stage"
      :status="badgeStatus"
      :group-name="groupName"
      :subtitle="subtitle"
      :stepper-key="stepperKey"
    >
      <DisbursementStatRow :tiles="statTiles" :loading="loading" />

      <DisbursementTableCard
        v-model:search="searchTerm"
        v-model:page="page"
        v-model:page-size="pageSize"
        title="Advance requests"
        :total="filteredEmployees.length"
        :page-size-options="pageSizeOptions"
        :loading="loading"
        searchable
        search-placeholder="Search employee"
        unit-label="employee"
        unit-label-plural="employees"
      >
        <template #actions>
          <span class="action-note dash-num">
            {{ summary.pending }} pending · {{ summary.approved }} approved
          </span>
        </template>

        <TableSkeleton
          v-if="loading"
          :columns="columns"
          :rows="pageSize"
          aria-label="Loading cash advance requests"
          wrap-class="dash-page-body"
        />

        <div v-else-if="!paginatedEmployees.length" class="dash-empty dash-page-body">
          <span class="dash-featured-icon">
            <q-icon :name="searchTerm ? 'filter_alt_off' : 'o_request_quote'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ searchTerm ? 'No employees match this search' : 'No cash advances' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchTerm
                ? 'Try a different name.'
                : 'Advances appear here once an employee in this payout group requests one.'
            }}
          </p>
        </div>

        <q-table
          v-else
          :rows="paginatedEmployees"
          :columns="columns"
          :pagination="{ rowsPerPage: 0 }"
          row-key="epiId"
          flat
          hide-pagination
        >
          <template #body="props">
            <q-tr :props="props">
              <q-td key="employee" :props="props">
                <div class="identity">
                  <q-avatar
                    v-if="avatarOf(props.row.name).pictureUrl"
                    size="30px"
                    class="identity-avatar"
                  >
                    <img :src="avatarOf(props.row.name).pictureUrl" :alt="props.row.name" />
                  </q-avatar>
                  <q-avatar
                    v-else
                    size="30px"
                    class="identity-avatar"
                    :style="{ background: avatarOf(props.row.name).color }"
                  >
                    <span class="identity-initials">{{
                      avatarOf(props.row.name).initials || '?'
                    }}</span>
                  </q-avatar>
                  <span class="identity-name">{{ props.row.name }}</span>
                </div>
              </q-td>

              <q-td key="requests" :props="props" class="col-num">
                <span class="ca-count">{{ props.row.requestedCount }}</span>
              </q-td>
              <q-td key="pending" :props="props" class="col-num">
                <span :class="props.row.pendingCount ? 'ca-pending' : 'ca-none'">
                  {{ props.row.pendingCount }}
                </span>
              </q-td>
              <q-td key="approved" :props="props" class="col-num">
                <span :class="props.row.approvedCount ? 'ca-approved' : 'ca-none'">
                  {{ props.row.approvedCount }}
                </span>
              </q-td>
              <q-td key="rejected" :props="props" class="col-num">
                <span :class="props.row.rejectedCount ? 'ca-rejected' : 'ca-none'">
                  {{ props.row.rejectedCount }}
                </span>
              </q-td>

              <q-td key="requested_amount" :props="props" class="col-num">
                <span class="dash-num">{{ formatCurrency(props.row.requestedAmount) }}</span>
              </q-td>
              <q-td key="approved_amount" :props="props" class="col-num">
                <span class="dash-num ca-approved">
                  {{ formatCurrency(props.row.approvedAmount) }}
                </span>
              </q-td>

              <!-- The row's actions: a reader can decide an employee's pending
                   requests from here without opening anything. -->
              <q-td key="actions" :props="props" class="cell-actions">
                <q-btn
                  flat
                  round
                  dense
                  icon="more_horiz"
                  size="11px"
                  class="row-btn"
                  :disable="submitting"
                  :aria-label="`Actions for ${props.row.name}`"
                  @click.stop
                  @keydown.stop
                >
                  <RowMenu
                    :actions="rowActions(props.row)"
                    @select="onRowAction($event, props.row)"
                  />
                </q-btn>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </DisbursementTableCard>

      <ConfirmDialog
        v-model="showConfirm"
        :confirm="confirm"
        :loading="submitting"
        @confirm="onConfirm"
      />
    </CashAdvanceStepShell>
  </PageShell>
</template>

<script setup>
/**
 * Step 1 of the cash-advance flow: decide the requests.
 *
 * The page reads `review-employees`, which answers the run's totals and one row
 * per employee. The row is a summary — counts, amounts and a 3-dot menu — rather
 * than an expandable list. The payload's individual requests are what the
 * decision endpoint takes ids from, so they build the "all pending" action
 * instead of rendering a per-request panel.
 *
 * A bulk decision is one PATCH per pending request, so a partial failure is a
 * real outcome: `allSettled` counts what landed and the toast says so. Every
 * write refetches before the toast, because a write that reported failure may
 * still have landed.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from 'src/components/layout/PageShell.vue'
import TableSkeleton from 'src/components/common/TableSkeleton.vue'
import ConfirmDialog from 'src/components/common/ConfirmDialog.vue'
import RowMenu from 'src/components/common/RowMenu.vue'
import CashAdvanceStepShell from 'src/components/pages/CashAdvance/CashAdvanceStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import { buildCashAdvanceBulkDecisionConfirm } from 'src/components/pages/CashAdvance/cashAdvanceConfirm'
import { useCashAdvanceApi } from 'src/composables/disbursement/useCashAdvanceApi'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { usePayoutGroupIdentity } from 'src/composables/disbursement/usePayoutGroupIdentity'
import { useEmployees } from 'src/composables/page/useEmployees'
import { invalidateEmployeeBalances } from 'src/composables/page/useEmployeeBalances'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { useToast } from 'src/composables/useToast'
import {
  isCashAdvanceRequestPending,
  summariseCashAdvanceReview,
} from 'src/composables/utils/cashAdvance'
import { extractErrorMessage } from 'src/composables/utils/http'
import { avatarFor, buildEmployeeNameIndex } from 'src/composables/utils/employee'
import { formatCurrency } from 'src/composables/utils/format'
import { longLabel } from 'src/composables/utils/calendarDate'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { furtherCashAdvanceStage, normalizeStatusKey } from 'src/constants/cashAdvanceStatus'

const route = useRoute()
const toast = useToast()
const { notifyLoaded } = useLoadedToast()
const pgiId = route.params.id
const { identity, resolveQuietly } = usePayoutGroupIdentity()
const { fetchCashAdvanceReviewEmployees, actOnCashAdvanceRequest } = useCashAdvanceApi()
const { invalidateCache } = useDisbursementApi()
const { employees, fetchEmployees } = useEmployees()

const employeeIndex = computed(() => buildEmployeeNameIndex(employees.value))
const avatarOf = (name) => avatarFor(employeeIndex.value, name)

const loading = ref(true)
const submitting = ref(false)
const payload = ref(null)
const stepperKey = ref(0)
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const guard = createRequestToken()

const summary = computed(() => summariseCashAdvanceReview(payload.value))

const filteredEmployees = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return summary.value.employees
  return summary.value.employees.filter((employee) => employee.name.toLowerCase().includes(term))
})

const paginatedEmployees = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredEmployees.value.slice(start, start + pageSize.value)
})

const columns = [
  { name: 'employee', label: 'Employee', field: 'name', align: 'left', style: 'min-width: 230px' },
  {
    name: 'requests',
    label: 'Requests',
    field: 'requestedCount',
    align: 'right',
    style: 'width: 92px',
  },
  {
    name: 'pending',
    label: 'Pending',
    field: 'pendingCount',
    align: 'right',
    style: 'width: 86px',
  },
  {
    name: 'approved',
    label: 'Approved',
    field: 'approvedCount',
    align: 'right',
    style: 'width: 94px',
  },
  {
    name: 'rejected',
    label: 'Rejected',
    field: 'rejectedCount',
    align: 'right',
    style: 'width: 90px',
  },
  {
    name: 'requested_amount',
    label: 'Requested',
    field: 'requestedAmount',
    align: 'right',
    style: 'width: 124px',
  },
  {
    name: 'approved_amount',
    label: 'Approved amount',
    field: 'approvedAmount',
    align: 'right',
    style: 'width: 140px',
  },
  { name: 'actions', label: '', field: 'actions', align: 'right', style: 'width: 52px' },
]

const statTiles = computed(() => [
  {
    key: 'requests',
    label: 'Requests',
    value: summary.value.totalRequests,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'pending',
    label: 'Pending',
    value: summary.value.pending,
    mark: 'var(--dash-warn-mark)',
  },
  {
    key: 'approved',
    label: 'Approved',
    value: summary.value.approved,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    value: summary.value.rejected,
    mark: 'var(--dash-critical-mark)',
  },
  {
    key: 'total',
    label: 'Current total',
    value: formatCurrency(summary.value.currentTotal),
    mark: 'var(--dash-cat-5)',
  },
  {
    key: 'payout',
    label: 'Payout date',
    value: longLabel(summary.value.payoutDate) || '—',
    mark: 'var(--dash-neutral-mark)',
    numeric: false,
  },
])

const groupStatus = computed(() =>
  normalizeStatusKey(identity.value?.status || route.query.pgi_status),
)
const caStatus = computed(() =>
  normalizeStatusKey(identity.value?.cashAdvanceStatus || route.query.ca_status),
)
// The badge names the run's status. A real cash-advance status is more useful
// here than the payroll one once the advances have moved on; `na` (no advances)
// falls back to the payroll status rather than rendering a chip reading "Na".
const badgeStatus = computed(() =>
  caStatus.value && caStatus.value !== 'na' ? caStatus.value : groupStatus.value,
)
const groupName = computed(() => identity.value?.name || route.query.group || '')
const cutoffName = computed(() => identity.value?.cutoff || route.query.cutoff || '')

/**
 * The stage the flow is actually on. Pending requests hold it at Review; once
 * none are pending, the PGI's cash-advance status is the further-along signal —
 * it knows when funding or disbursement has already happened, which this page's
 * payload cannot see.
 */
const stage = computed(() => {
  if (!summary.value.loaded) return 'review'
  // Pending requests hold the flow at Review regardless of any status hint.
  if (summary.value.totalRequests > 0 && summary.value.pending > 0) return 'review'
  // Once review is done, the PGI's cash-advance status is the further-along
  // signal: it knows when funding (or disbursement) has already happened, which
  // this page's own payload cannot see.
  return furtherCashAdvanceStage('funding', caStatus.value || groupStatus.value)
})

const subtitle = computed(() => {
  const purpose = 'Decide the advance requests against this payout group.'
  return cutoffName.value ? `${cutoffName.value} · ${purpose}` : purpose
})

const showConfirm = ref(false)
const confirm = ref(null)
const pendingAction = ref(null)

const isPending = (request) => isCashAdvanceRequestPending(request)

/** The pending requests whose ids the decision endpoint can act on. */
function pendingRequestsOf(employee) {
  return employee.requests.filter((request) => request.id != null && isPending(request))
}

/**
 * The employee row's 3-dot menu.
 *
 * The actions are per request, not per employee, so "all pending" is the only
 * honest bulk verb here. When the payload reports pending requests but did not
 * send their ids, the items stay visible and disabled with the reason — the same
 * rule `RowMenu` uses for any action that exists but is not available yet.
 */
function rowActions(employee) {
  const actions = []

  const pending = pendingRequestsOf(employee)
  if (pending.length) {
    const caption = `${pending.length} request${pending.length === 1 ? '' : 's'} · ${formatCurrency(
      pending.reduce((sum, request) => sum + request.amount, 0),
    )}`
    actions.push(
      {
        key: 'approveAll',
        label: 'Approve all pending',
        icon: 'o_check_circle',
        tone: 'good',
        caption,
      },
      {
        key: 'rejectAll',
        label: 'Reject all pending',
        icon: 'o_cancel',
        tone: 'danger',
        caption,
      },
    )
  } else if (employee.pendingCount > 0) {
    actions.push(
      {
        key: 'approveAll',
        label: 'Approve all pending',
        icon: 'o_check_circle',
        tone: 'good',
        disabled: true,
        caption: 'Request details unavailable',
      },
      {
        key: 'rejectAll',
        label: 'Reject all pending',
        icon: 'o_cancel',
        tone: 'danger',
        disabled: true,
        caption: 'Request details unavailable',
      },
    )
  } else {
    // Nothing to decide. The trigger still exists so the column is consistent
    // row to row; the menu says why instead of opening empty.
    actions.push({
      key: 'none',
      label: 'No pending requests',
      icon: 'o_check_circle',
      disabled: true,
      caption: 'Nothing to approve or reject',
    })
  }

  return actions
}

function onRowAction(key, employee) {
  if (key === 'approveAll') {
    requestBulkDecision(employee, 'approved')
    return
  }
  if (key === 'rejectAll') {
    requestBulkDecision(employee, 'rejected')
  }
}

function requestBulkDecision(employee, status) {
  if (submitting.value || showConfirm.value) return
  const requests = pendingRequestsOf(employee)
  if (!requests.length) return
  pendingAction.value = { type: 'bulk', employee, requests, status }
  confirm.value = buildCashAdvanceBulkDecisionConfirm({
    employee: employee.name,
    requests,
    decision: status,
    groupName: groupName.value,
  })
  showConfirm.value = true
}

async function refresh() {
  const token = guard.next()
  loading.value = true
  try {
    const res = await fetchCashAdvanceReviewEmployees(pgiId)
    if (!guard.isCurrent(token)) return false
    payload.value = res.data
    return true
  } catch (err) {
    console.error('[CashAdvanceReviewPage] fetch failed:', err)
    return false
  } finally {
    if (guard.isCurrent(token)) loading.value = false
  }
}

function onConfirm() {
  const action = pendingAction.value
  if (!action || submitting.value) return
  commit(action)
}

async function commit(action) {
  if (action.type !== 'bulk') return
  submitting.value = true
  try {
    // Bulk decisions are one request per row, so a failure belongs to a single
    // item rather than to the batch. `allSettled` is the only way to count them,
    // and a partial success still has to refetch: the ones that landed are real.
    const results = await Promise.allSettled(
      action.requests.map((request) => actOnCashAdvanceRequest(request.id, action.status)),
    )
    const updated = results.filter((result) => result.status === 'fulfilled').length
    const failed = results.length - updated

    showConfirm.value = false
    stepperKey.value++
    await refresh()
    invalidateCache()
    invalidateEmployeeBalances()

    const verb = action.status === 'approved' ? 'approved' : 'rejected'
    if (!failed) {
      toast.success(`${updated} cash advance${updated === 1 ? '' : 's'} ${verb}.`)
      return
    }

    const firstError = results.find((result) => result.status === 'rejected')?.reason
    const detail = extractErrorMessage(firstError, 'The rest could not be updated.')
    if (updated > 0) {
      toast.warning(`${updated} of ${results.length} requests updated. ${detail}`)
    } else {
      toast.error(`No requests were updated. ${detail}`)
    }
  } finally {
    submitting.value = false
  }
}

// Cancelling must clear the snapshot as surely as confirming does: a stale
// `pendingAction` left behind is a write the next dialog's Confirm could fire.
watch(showConfirm, (open) => {
  if (open) return
  confirm.value = null
  pendingAction.value = null
})

// Narrowing the list while on a later page would strand the reader.
watch([searchTerm, pageSize], () => {
  page.value = 1
})

onMounted(async () => {
  // A deep link arrives with no name, cutoff or status, and a refresh can arrive
  // with a stale one, so the run is resolved by its id either way.
  resolveQuietly(pgiId)
  fetchEmployees().catch(() => null)
  if (await refresh()) {
    notifyLoaded('Cash advance requests', summary.value.totalRequests, { noun: 'request' })
  }
})
</script>

<style scoped>
/* ============================================================================
   Cash advance Review step — local styles only. Frame, figures strip and table
   chrome are shared with the payroll steps.
   ========================================================================== */
.action-note {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

/* ── Identity ── */
.identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.identity-avatar {
  flex-shrink: 0;
  border: 1px solid var(--dash-line);
}
.identity-avatar :deep(img) {
  object-fit: cover;
}
.identity-initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.identity-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Figures ── */
.col-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ca-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}
.ca-pending {
  font-weight: 600;
  color: var(--dash-warn);
}
.ca-approved {
  font-weight: 600;
  color: var(--dash-ink);
}
.ca-rejected {
  font-weight: 600;
  color: var(--dash-critical);
}
.ca-none {
  color: var(--dash-ink-4);
}

/* The row's 3-dot. Quiet at rest, the same treatment every other row menu in
   the app gives its trigger. */
.cell-actions {
  width: 1%;
  white-space: nowrap;
}

.row-btn {
  color: var(--dash-ink-4);
}
.row-btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

@media (max-width: 1023px) {
  .action-note {
    display: none;
  }
}
</style>
