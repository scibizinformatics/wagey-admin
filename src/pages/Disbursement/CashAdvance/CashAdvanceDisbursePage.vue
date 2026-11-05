<template>
  <PageShell>
    <CashAdvanceStepShell
      :pgi-id="pgiId"
      :step="3"
      :stage="stage"
      :status="groupStatus"
      :group-name="groupName"
      :subtitle="subtitle"
      :stepper-key="stepperKey"
    >
      <div v-if="!loading && needsFunding" class="ca-notice" role="status">
        <q-icon name="o_info" size="16px" class="ca-notice__icon" />
        <span class="ca-notice__text">
          These advances have not been funded yet, so there is nothing to release.
        </span>
        <q-btn
          outline
          no-caps
          dense
          icon="o_arrow_back"
          label="Go to funding"
          class="btn-outline"
          :to="fundingRoute"
        />
      </div>

      <div v-else-if="!loading && missingEpiIds && !allReleased" class="ca-notice" role="status">
        <q-icon name="o_info" size="16px" class="ca-notice__icon" />
        <span class="ca-notice__text">
          The release endpoint needs each employee's payroll item id, and this group's summary did
          not include them.
        </span>
      </div>

      <div v-else-if="!loading && allReleased && !payrollComplete" class="ca-notice" role="status">
        <q-icon name="o_info" size="16px" class="ca-notice__icon" />
        <span class="ca-notice__text">
          Every advance has been released. The payroll run must be completed before this cash
          advance record can close.
        </span>
      </div>

      <DisbursementStatRow :tiles="statTiles" :loading="loading" />

      <DisbursementTableCard
        v-model:search="searchTerm"
        v-model:page="page"
        v-model:page-size="pageSize"
        title="Cash advance releases"
        :total="filteredRows.length"
        :page-size-options="pageSizeOptions"
        :loading="loading"
        searchable
        search-placeholder="Search employee, method or status"
        unit-label="employee"
        unit-label-plural="employees"
      >
        <template #actions>
          <span class="action-note dash-num">
            {{ summary.released }} released · {{ summary.pending }} pending
          </span>
          <q-btn
            unelevated
            no-caps
            dense
            icon="o_send"
            label="Release cash advances"
            class="btn-primary"
            :loading="disbursing"
            :disable="!bulkRows.length || disbursing || needsFunding"
            @click="requestDisburseAll"
          >
            <q-tooltip v-if="!bulkRows.length">
              {{
                needsFunding
                  ? 'Fund these advances first'
                  : missingEpiIds
                    ? 'Employee payroll item ids unavailable'
                    : 'Nothing left to release on this group'
              }}
            </q-tooltip>
          </q-btn>
        </template>

        <TableSkeleton
          v-if="loading"
          :columns="columns"
          :rows="pageSize"
          aria-label="Loading cash advance releases"
          wrap-class="dash-page-body"
        />

        <div v-else-if="!paginatedRows.length" class="dash-empty dash-page-body">
          <span class="dash-featured-icon">
            <q-icon :name="searchTerm ? 'filter_alt_off' : 'o_send'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ searchTerm ? 'No employees match this search' : 'Nothing to release' }}
          </p>
          <p class="dash-empty__sub">
            {{
              searchTerm
                ? 'Try a different name, method or status.'
                : 'Employees appear here once this group is funded.'
            }}
          </p>
        </div>

        <q-table
          v-else
          :rows="paginatedRows"
          :columns="columns"
          :pagination="{ rowsPerPage: 0 }"
          row-key="epiId"
          flat
          hide-pagination
        >
          <template #body-cell-employee="props">
            <q-td :props="props">
              <div class="identity">
                <!-- A face when the name resolves to exactly one roster employee
                     who has one, otherwise the person's initials on their
                     identity colour. -->
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
          </template>

          <template #body-cell-cash_advance_amount="props">
            <q-td :props="props" class="text-right ca-amount dash-num">
              {{ formatCurrency(props.row.amount) }}
            </q-td>
          </template>

          <template #body-cell-payout_method="props">
            <q-td :props="props">
              <span class="method">
                <q-icon :name="methodIcon(props.row.method)" size="15px" />
                {{ props.row.method || '—' }}
              </span>
            </q-td>
          </template>

          <template #body-cell-claim_status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.claimStatus" :label="props.row.claimStatusDisplay" />
            </q-td>
          </template>

          <template #body-cell-claimed_on="props">
            <q-td :props="props">
              <span v-if="props.row.claimedOn" class="claimed dash-num">
                {{ formatDateTime(props.row.claimedOn) }}
              </span>
              <span v-else class="muted">—</span>
            </q-td>
          </template>

          <template #body-cell-reference="props">
            <q-td :props="props">
              <span v-if="props.row.reference" class="dash-num">{{ props.row.reference }}</span>
              <span v-else class="muted">—</span>
            </q-td>
          </template>

          <template #body-cell-proof="props">
            <q-td :props="props">
              <a
                v-if="props.row.proof"
                :href="props.row.proof"
                target="_blank"
                rel="noopener noreferrer"
                class="proof"
              >
                <q-icon name="o_receipt_long" size="14px" />
                View
              </a>
              <span v-else class="muted">—</span>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" class="cell-actions">
              <q-btn
                v-if="isEligible(props.row)"
                flat
                round
                dense
                icon="o_send"
                size="12px"
                class="row-btn"
                :disable="disbursing"
                :aria-label="`Release the advance for ${props.row.name}`"
                @click.stop="requestDisburseOne(props.row)"
              >
                <q-tooltip>Release this advance</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </DisbursementTableCard>

      <ConfirmDialog
        v-model="showConfirm"
        :confirm="confirm"
        :loading="disbursing"
        @confirm="onConfirm"
      />
    </CashAdvanceStepShell>
  </PageShell>
</template>

<script setup>
/**
 * Step 3 of the cash-advance flow: release the advances.
 *
 * Mirrors the payroll Disbursement step — the same figures strip, the same table
 * card, the same bulk action beside search — with the cash-advance endpoint's
 * own eligibility rule: an employee is releasable while they have an amount and
 * their claim is not already settled.
 *
 * The summary endpoint is also what tells this page whether the group has been
 * funded at all. Opening it from the list on an unfunded group therefore shows a
 * prerequisite notice and a link back to Funding, rather than a release button
 * over an empty table.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from 'src/components/layout/PageShell.vue'
import TableSkeleton from 'src/components/common/TableSkeleton.vue'
import ConfirmDialog from 'src/components/common/ConfirmDialog.vue'
import StatusPill from 'src/components/common/StatusPill.vue'
import CashAdvanceStepShell from 'src/components/pages/CashAdvance/CashAdvanceStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import {
  buildCashAdvanceDisburseConfirm,
  buildCashAdvanceDisburseOneConfirm,
} from 'src/components/pages/CashAdvance/cashAdvanceConfirm'
import { useCashAdvanceApi } from 'src/composables/disbursement/useCashAdvanceApi'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { usePayoutGroupIdentity } from 'src/composables/disbursement/usePayoutGroupIdentity'
import { useEmployees } from 'src/composables/page/useEmployees'
import { invalidateEmployeeBalances } from 'src/composables/page/useEmployeeBalances'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { useToast } from 'src/composables/useToast'
import {
  summariseCashAdvanceDisbursement,
  buildEpiIdByName,
  withResolvedEpiIds,
} from 'src/composables/utils/cashAdvance'
import { extractErrorMessage } from 'src/composables/utils/http'
import { avatarFor, buildEmployeeNameIndex } from 'src/composables/utils/employee'
import { formatCurrency, formatDateTime } from 'src/composables/utils/format'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { cashAdvanceStepIndex, normalizeStatusKey } from 'src/constants/cashAdvanceStatus'

const route = useRoute()
const toast = useToast()
const { notifyLoaded } = useLoadedToast()
const pgiId = route.params.id
const { identity, resolveQuietly } = usePayoutGroupIdentity()
const {
  fetchCashAdvanceDisbursementSummary,
  disburseCashAdvances,
  fetchCashAdvanceReviewEmployees,
} = useCashAdvanceApi()
const { invalidateCache } = useDisbursementApi()
const { employees, fetchEmployees } = useEmployees()

const employeeIndex = computed(() => buildEmployeeNameIndex(employees.value))
const avatarOf = (name) => avatarFor(employeeIndex.value, name)

const loading = ref(true)
const disbursing = ref(false)
const payload = ref(null)
const stepperKey = ref(0)
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const guard = createRequestToken()

const summary = computed(() => summariseCashAdvanceDisbursement(payload.value))

const groupStatus = computed(() => {
  // `na` means "this group has no cash advance"; it must not become a badge
  // reading "Na" or override the payroll status.
  const caStatus = normalizeStatusKey(identity.value?.cashAdvanceStatus)
  return normalizeStatusKey(
    summary.value.groupStatus ||
      (caStatus && caStatus !== 'na' ? caStatus : '') ||
      identity.value?.status ||
      route.query.pgi_status,
  )
})
const groupName = computed(() => identity.value?.name || route.query.group || '')
const cutoffName = computed(() => identity.value?.cutoff || route.query.cutoff || '')

// `group_status` arrives as a display string ("Complete", "Disbursing"), so it
// goes through the same normaliser the stage does rather than an exact map key.
const payrollComplete = computed(() => cashAdvanceStepIndex(groupStatus.value) === 3)

/** Nothing has been released until the group is funded. */
const needsFunding = computed(() => !summary.value.loaded || summary.value.fundedAmount <= 0)

// The summary does not always carry `epi_id`; the Review payload does, and the
// page fills the gap by employee name. If even that cannot resolve an id, no row
// is releasable and the page says why rather than leaving a dead button.
const missingEpiIds = computed(
  () => summary.value.total > 0 && summary.value.employees.every((row) => row.epiId == null),
)

const allReleased = computed(
  () =>
    summary.value.total > 0 &&
    summary.value.pending === 0 &&
    summary.value.failed === 0 &&
    summary.value.released >= summary.value.total,
)

/**
 * The stage the flow is actually on. A group with no funding is sent back to
 * Funding; a fully released group whose payroll run has also finished has moved
 * on to Complete. Everything between those two is this step.
 */
const stage = computed(() => {
  if (needsFunding.value) return 'funding'
  if (allReleased.value && payrollComplete.value) return 'complete'
  return 'disburse'
})

const subtitle = computed(() => {
  const purpose = 'Release each advance and record what has been claimed.'
  return cutoffName.value ? `${cutoffName.value} · ${purpose}` : purpose
})

const fundingRoute = computed(() => ({
  path: `/app/payroll/cash-advance/${pgiId}/funding`,
  query: route.query,
}))

const statTiles = computed(() => [
  {
    key: 'funded',
    label: 'Funded amount',
    value: `₱${parseAmount(summary.value.fundedAmount)}`,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'released',
    label: 'Released',
    value: summary.value.released,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'pending',
    label: 'Pending claims',
    value: summary.value.pending,
    mark: 'var(--dash-warn-mark)',
  },
  {
    key: 'failed',
    label: 'Failed',
    value: summary.value.failed,
    mark: 'var(--dash-critical-mark)',
  },
  {
    key: 'status',
    label: 'Group status',
    value: summary.value.groupStatus || '—',
    mark: 'var(--dash-neutral-mark)',
    numeric: false,
  },
])

const METHOD_ICONS = {
  cash: 'o_payments',
  bank: 'o_account_balance',
  gcash: 'o_smartphone',
  check: 'o_receipt_long',
  cheque: 'o_receipt_long',
  paytaca: 'o_qr_code',
  bch: 'o_qr_code_2',
}

function methodIcon(method) {
  const key = String(method || '').toLowerCase()
  const hit = Object.keys(METHOD_ICONS).find((k) => key.includes(k))
  return hit ? METHOD_ICONS[hit] : 'o_account_balance_wallet'
}

/**
 * Whether a row can be released. An employee with no amount has nothing to
 * release, and a settled claim is already done. `epiId` is required because the
 * endpoint takes employee payroll item ids, not names.
 */
function isEligible(row) {
  return row.epiId != null && row.amount > 0 && !row.settled
}

const bulkRows = computed(() => summary.value.employees.filter(isEligible))
const settledCount = computed(() => summary.value.employees.filter((row) => row.settled).length)

const filteredRows = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return summary.value.employees
  return summary.value.employees.filter(
    (row) =>
      row.name.toLowerCase().includes(term) ||
      row.method.toLowerCase().includes(term) ||
      row.claimStatus.toLowerCase().includes(term),
  )
})

const paginatedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const columns = [
  { name: 'employee', label: 'Employee', field: 'name', align: 'left', style: 'min-width: 220px' },
  {
    name: 'cash_advance_amount',
    label: 'Cash advance',
    field: 'amount',
    align: 'right',
    style: 'width: 138px',
  },
  {
    name: 'payout_method',
    label: 'Method',
    field: 'method',
    align: 'left',
    style: 'width: 132px',
  },
  {
    name: 'claim_status',
    label: 'Claim status',
    field: 'claimStatus',
    align: 'left',
    style: 'width: 124px',
  },
  { name: 'claimed_on', label: 'Claimed', field: 'claimedOn', align: 'left' },
  { name: 'reference', label: 'Reference', field: 'reference', align: 'left' },
  { name: 'proof', label: 'Proof', field: 'proof', align: 'left', style: 'width: 82px' },
  { name: 'actions', label: '', field: 'actions', align: 'right', style: 'width: 52px' },
]

const showConfirm = ref(false)
const confirm = ref(null)
const pendingAction = ref(null)
const pendingRows = ref([])

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

function requestDisburseAll() {
  const rows = bulkRows.value
  if (!rows.length || disbursing.value || showConfirm.value) return
  pendingAction.value = 'all'
  pendingRows.value = rows
  confirm.value = buildCashAdvanceDisburseConfirm({
    rows,
    excluded: settledCount.value,
    groupName: groupName.value,
  })
  showConfirm.value = true
}

function requestDisburseOne(row) {
  if (!isEligible(row) || disbursing.value || showConfirm.value) return
  pendingAction.value = 'one'
  pendingRows.value = [row]
  confirm.value = buildCashAdvanceDisburseOneConfirm({
    employee: row.name,
    amount: row.amount,
    method: row.method,
    groupName: groupName.value,
  })
  showConfirm.value = true
}

function onConfirm() {
  disburse(pendingRows.value)
}

// Cancelling must clear the snapshot as surely as confirming does: a stale
// `pendingRows` left behind is a release the next dialog's Confirm could fire.
watch(showConfirm, (open) => {
  if (open) return
  confirm.value = null
  pendingAction.value = null
  pendingRows.value = []
})

watch([searchTerm, pageSize], () => {
  page.value = 1
})

async function refresh() {
  const token = guard.next()
  loading.value = true
  try {
    const [summaryRes, reviewRes] = await Promise.all([
      fetchCashAdvanceDisbursementSummary(pgiId),
      // The summary's rows do not always carry `epi_id`; the Review payload does.
      // This is enrichment, not the step's data, so a failure here does not fail
      // the page — it leaves the rows without ids, which the notice explains.
      fetchCashAdvanceReviewEmployees(pgiId).catch(() => null),
    ])
    if (!guard.isCurrent(token)) return false
    const epiIdByName = buildEpiIdByName(reviewRes?.data)
    payload.value = withResolvedEpiIds(summaryRes.data, epiIdByName)
    return true
  } catch (err) {
    if (err?.response?.status === 404) {
      if (guard.isCurrent(token)) payload.value = null
      return false
    }
    console.error('[CashAdvanceDisbursePage] fetch failed:', err)
    return false
  } finally {
    if (guard.isCurrent(token)) loading.value = false
  }
}

/**
 * The confirmed release.
 *
 * The write and the refetch are deliberately separate: a read that failed after
 * a successful write must not report the release as failed.
 */
async function disburse(rows) {
  const epiIds = rows.map((row) => row.epiId).filter((id) => id != null)
  if (!epiIds.length) return

  disbursing.value = true
  try {
    let result
    try {
      result = await disburseCashAdvances(pgiId, epiIds)
    } catch (err) {
      console.error('[CashAdvanceDisbursePage] disburse error:', err)
      toast.error(
        extractErrorMessage(err, 'Failed to release these advances. Nothing was changed.'),
      )
      return
    }

    showConfirm.value = false
    stepperKey.value++
    await refresh()
    invalidateCache()
    invalidateEmployeeBalances()

    const count = result.data?.disbursed_count
    toast.success(
      count != null
        ? `${count} cash advance${count === 1 ? '' : 's'} released.`
        : result.message || 'Cash advances released.',
    )
  } finally {
    disbursing.value = false
  }
}

onMounted(async () => {
  // A deep link arrives with no name, cutoff or status, and a refresh can arrive
  // with a stale one, so the run is resolved by its id either way.
  resolveQuietly(pgiId)
  fetchEmployees().catch(() => null)
  if (await refresh()) {
    notifyLoaded('Cash advance releases', summary.value.total, {
      noun: 'employee',
      nounPlural: 'employees',
    })
  }
})
</script>

<style scoped>
/* ============================================================================
   Cash advance Disburse step — local styles only. Frame, figures strip and table
   chrome are shared with the payroll steps.
   ========================================================================== */
.btn-primary {
  height: 34px;
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
.btn-primary:disabled,
.btn-primary[disabled] {
  background: var(--dash-n-200);
  color: var(--dash-ink-4);
  box-shadow: none;
}

.btn-outline {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
  flex-shrink: 0;
}

.ca-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--dash-info-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-accent-bg);
  font-size: 13px;
  color: var(--dash-ink-2);
}
.ca-notice__icon {
  color: var(--dash-accent);
  flex-shrink: 0;
}
.ca-notice__text {
  flex: 1;
  min-width: 0;
}

/* Sits immediately left of the toolbar action, so the button's precondition is
   readable beside the button rather than only in a disabled tooltip. */
.action-note {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

@media (max-width: 1023px) {
  .action-note {
    display: none;
  }
}

/* ── Cells ── */
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

.ca-amount {
  color: var(--dash-ink) !important;
  font-weight: 600;
}

.claimed {
  font-size: 12.5px;
  color: var(--dash-ink-2);
  white-space: nowrap;
}

.method {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}
.method .q-icon {
  color: var(--dash-ink-4);
  flex-shrink: 0;
}

.proof {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--dash-accent);
  font-weight: 500;
  text-decoration: none;
}
.proof:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.proof:focus-visible {
  outline: none;
  border-radius: var(--dash-r-xs);
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

.muted {
  color: var(--dash-ink-4);
}

/* The employee cell: a 30px face (or the person's initials on their identity
   colour) beside the name. Same construction as the Request tables. */
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
</style>

<style>
.disb-popup {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  padding: 4px;
}
.disb-popup .q-item {
  min-height: 32px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.disb-popup .q-item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.disb-popup .q-item--active {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}
</style>
