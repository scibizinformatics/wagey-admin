<template>
  <PageShell>
    <DisbursementStepShell
      :group-id="groupId"
      :step="4"
      :group-name="groupName"
      :subtitle="subtitle"
      :status="pgiStatus"
      :stepper-key="stepperKey"
    >
      <DisbursementStatRow :tiles="statTiles" :loading="loading" />

      <DisbursementTableCard
        v-model:search="searchTerm"
        v-model:page="page"
        v-model:page-size="pageSize"
        title="Disbursement details"
        :total="filteredData.length"
        :page-size-options="pageSizeOptions"
        :loading="loading"
        searchable
        search-placeholder="Search employee, method or status"
        unit-label="employee"
        unit-label-plural="employees"
      >
        <!-- Beside search, so it is reachable without scrolling past the table. -->
        <template #actions>
          <span class="action-note dash-num">
            {{ summary?.released ?? 0 }} released · {{ summary?.pending_claim ?? 0 }} pending
          </span>
          <!-- Bulk releases non-cash only. Cash is released per employee from the
               row actions, so this button never moves that money. -->
          <q-btn
            unelevated
            no-caps
            dense
            icon="o_send"
            label="Disburse non-cash"
            class="btn-primary"
            :loading="disbursing"
            :disable="!bulkRows.length || disbursing"
            @click="requestDisburseAll"
          >
            <q-tooltip v-if="!bulkRows.length">
              {{
                cashRows.length
                  ? 'Nothing but cash — release each one from its row'
                  : 'Nothing to disburse yet'
              }}
            </q-tooltip>
          </q-btn>
        </template>

        <!-- First paint, when there is nothing to keep on screen. Built from the
             same `columns` the table renders, so the placeholder shares its
             column edges, labels and alignment. -->
        <TableSkeleton
          v-if="loading"
          :columns="columns"
          :rows="pageSize"
          aria-label="Loading disbursement details"
          wrap-class="dash-page-body"
        />

        <!-- Empty. `hide-no-data` was on the table alongside this markup, and it
             suppresses Quasar's no-data branch outright — so the state was never
             drawn and an empty result showed a bare header strip. Rendered here
             instead, and without the loading guard it no longer needs: this branch
             is only reached once the fetch has answered. -->
        <div v-else-if="!paginatedData.length" class="dash-empty dash-page-body">
          <span class="dash-featured-icon">
            <q-icon :name="searchTerm ? 'filter_alt_off' : 'o_payments'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ searchTerm ? 'No employees match this search' : 'Nothing to disburse' }}
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
          :rows="paginatedData"
          :columns="columns"
          :pagination="{ rowsPerPage: 0 }"
          row-key="id"
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
                  v-if="avatarOf(props.row.employee).pictureUrl"
                  size="30px"
                  class="identity-avatar"
                >
                  <img
                    :src="avatarOf(props.row.employee).pictureUrl"
                    :alt="props.row.employee || 'Employee'"
                  />
                </q-avatar>
                <q-avatar
                  v-else
                  size="30px"
                  class="identity-avatar"
                  :style="{ background: avatarOf(props.row.employee).color }"
                >
                  <span class="identity-initials">{{ avatarOf(props.row.employee).initials }}</span>
                </q-avatar>
                <span class="identity-name">{{ props.row.employee }}</span>
              </div>
            </q-td>
          </template>

          <template #body-cell-payout_method="props">
            <q-td :props="props">
              <span class="method">
                <q-icon :name="methodIcon(props.row.payout_method)" size="15px" />
                {{ props.row.payout_method || '—' }}
              </span>
            </q-td>
          </template>

          <template #body-cell-claim_status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.claim_status" />
            </q-td>
          </template>

          <template #body-cell-proof_of_payment="props">
            <q-td :props="props">
              <!-- Proof is a link when present, and plainly absent when not. It
                   used to render whatever the field held as bare text. -->
              <a
                v-if="props.row.proof_of_payment"
                :href="props.row.proof_of_payment"
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

          <template #body-cell-reference_no="props">
            <q-td :props="props">
              <span v-if="props.row.reference_no" class="dash-num">{{
                props.row.reference_no
              }}</span>
              <span v-else class="muted">—</span>
            </q-td>
          </template>

          <!-- The claim arrived as an ISO instant and printed as one, in a column
               whose neighbours are words. -->
          <template #body-cell-claimed_on="props">
            <q-td :props="props">
              <span v-if="formatDateTime(props.row.claimed_on)" class="claimed dash-num">
                {{ formatDateTime(props.row.claimed_on) }}
              </span>
              <span v-else class="muted">—</span>
            </q-td>
          </template>

          <!-- Cash only. A cash payout is handed over to one person, so it is
               released one person at a time; bank and the rest go out in the
               batch above. Rows with nothing to do show nothing rather than a
               disabled control. -->
          <template #body-cell-actions="props">
            <q-td :props="props" class="cell-actions">
              <q-btn
                v-if="isCash(props.row) && !isSettled(props.row)"
                flat
                round
                dense
                icon="more_horiz"
                size="12px"
                class="row-btn"
                :disable="disbursing"
                aria-label="Row actions"
                @click.stop
              >
                <RowMenu :actions="disburseActions" @select="requestDisburseOne(props.row)" />
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </DisbursementTableCard>

      <!-- The gate in front of pay actually moving. One dialog for both routes;
         wording comes from `disburseConfirm.js`. -->
      <ConfirmDialog
        v-model="showConfirm"
        :confirm="confirm"
        :loading="disbursing"
        @confirm="onConfirm"
      />
    </DisbursementStepShell>
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import StatusPill from 'src/components/common/StatusPill.vue'
import TableSkeleton from 'src/components/common/TableSkeleton.vue'
import ConfirmDialog from 'src/components/common/ConfirmDialog.vue'
import RowMenu from 'src/components/common/RowMenu.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import DisbursementStepShell from 'src/components/pages/Payroll/DisbursementStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import {
  buildDisburseAllConfirm,
  buildDisburseOneConfirm,
} from 'src/components/pages/Payroll/disburseConfirm'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { usePayoutGroupIdentity } from 'src/composables/disbursement/usePayoutGroupIdentity'
import { avatarFor, buildEmployeeNameIndex } from 'src/composables/utils/employee'
import { extractErrorMessage } from 'src/composables/utils/http'
import { formatDateTime } from 'src/composables/utils/format'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { useToast } from 'src/composables/useToast'

const route = useRoute()

const toast = useToast()
const groupId = route.params.id
const { identity, resolveQuietly } = usePayoutGroupIdentity()
const stepperKey = ref(0)
const { fetchPayoutGroupInstanceSummary, fetchDisbursementEmployees, disbursePgi } =
  useDisbursementApi()
const { notifyLoaded } = useLoadedToast()
const { employees, fetchEmployees } = useEmployees()

// Puts a face beside each name. The disbursement payload names an employee but
// carries no photograph, so the roster is the only thing that can supply one —
// the same construction as the Request tables and the disbursement list's
// cash-advance view, including its refusal to guess on duplicate names.
const employeeIndex = computed(() => buildEmployeeNameIndex(employees.value))
const avatarOf = (name) => avatarFor(employeeIndex.value, name)

const loading = ref(true)
const disbursing = ref(false)
const summary = ref(null)
const disbursements = ref([])
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'position', align: 'left', sortable: true },
  {
    name: 'net_pay',
    label: 'Net pay',
    field: 'net_pay',
    align: 'right',
    sortable: true,
    format: (v) => `\u20B1${parseFloat(v || 0).toLocaleString('en-PH')}`,
  },
  { name: 'payout_method', label: 'Method', field: 'payout_method', align: 'left', sortable: true },
  {
    name: 'claim_status',
    label: 'Claim status',
    field: 'claim_status',
    align: 'left',
    sortable: true,
  },
  { name: 'claimed_on', label: 'Claimed', field: 'claimed_on', align: 'left' },
  { name: 'proof_of_payment', label: 'Proof', field: 'proof_of_payment', align: 'left' },
  { name: 'reference_no', label: 'Reference', field: 'reference_no', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

// Narrowing the list while on a later page would strand the reader.
watch([searchTerm, pageSize], () => {
  page.value = 1
})

// The resolved run first: `pgi_status` in the query is a snapshot from whenever
// the list page last loaded, so on a refresh it can name a step the run has long
// since left. It stands in only until the run itself answers.
const pgiStatus = computed(() => identity.value?.status || route.query.pgi_status || '')

const groupName = computed(
  () =>
    summary.value?.payout_group_name ||
    summary.value?.group_name ||
    route.query.group ||
    identity.value?.name ||
    '',
)

// The period this run settles, from whichever of the three knows it. Naming it
// in the header saves opening the run to find out which cutoff you are looking
// at — every step page said only what the step was for.
const cutoffName = computed(
  () => summary.value?.cutoff_name || route.query.cutoff || identity.value?.cutoff || '',
)

const subtitle = computed(() => {
  const purpose = 'Release pay and record what each employee has claimed.'
  return cutoffName.value ? `${cutoffName.value} · ${purpose}` : purpose
})

const statTiles = computed(() => [
  {
    key: 'funded',
    label: 'Net funded',
    value: `₱${parseAmount(summary.value?.net_funded_amount)}`,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'released',
    label: 'Released',
    value: summary.value?.released ?? 0,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'pending',
    label: 'Pending claims',
    value: summary.value?.pending_claim ?? 0,
    mark: 'var(--dash-warn-mark)',
  },
  {
    key: 'failed',
    label: 'Failed',
    value: summary.value?.failed ?? 0,
    mark: 'var(--dash-critical-mark)',
  },
  {
    key: 'cash',
    label: 'Cash on hand',
    value: `₱${parseAmount(summary.value?.cash_on_hand_remaining)}`,
    mark: 'var(--dash-cat-2)',
  },
])

const METHOD_ICONS = {
  cash: 'o_payments',
  bank: 'o_account_balance',
  gcash: 'o_smartphone',
  check: 'o_receipt_long',
  cheque: 'o_receipt_long',
  paytaca: 'o_qr_code',
}

function methodIcon(method) {
  const key = String(method || '').toLowerCase()
  const hit = Object.keys(METHOD_ICONS).find((k) => key.includes(k))
  return hit ? METHOD_ICONS[hit] : 'o_account_balance_wallet'
}

const filteredData = computed(() => {
  if (!searchTerm.value.trim()) return disbursements.value
  const term = searchTerm.value.toLowerCase()
  return disbursements.value.filter((d) => {
    return (
      (d.employee || '').toLowerCase().includes(term) ||
      (d.payout_method || '').toLowerCase().includes(term) ||
      (d.claim_status || '').toLowerCase().includes(term)
    )
  })
})

const paginatedData = computed(() => {
  if (!filteredData.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

onMounted(async () => {
  // The list page hands the run's name, cutoff and status over in the query, and
  // no step endpoint returns any of them — but a deep link arrives with none of
  // them and a refresh can arrive with a stale status, so the run is resolved by
  // its id either way.
  resolveQuietly(groupId)
  fetchEmployees().catch(() => null)
  try {
    const [summ, data] = await Promise.all([
      fetchPayoutGroupInstanceSummary(groupId),
      fetchDisbursementEmployees(groupId),
    ])
    summary.value = summ
    disbursements.value = data || []
    notifyLoaded('Disbursements', disbursements.value.length, {
      noun: 'employee',
      nounPlural: 'employees',
    })
  } catch (err) {
    console.error('[DisbursePage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

/**
 * Whether a row is paid in cash.
 *
 * One test, used by both the row action and the batch, because "which rows are
 * cash" is the single fact the two must agree on — a row the batch releases and
 * the row button also offers is money moved twice. Substring rather than
 * equality because the endpoint has spelled this both `Cash` and `cash` across
 * runs, and `Cash Advance` is still cash.
 */
function isCash(row) {
  return String(row?.payout_method || '')
    .toLowerCase()
    .includes('cash')
}

/**
 * Whether a row still has pay owed against it.
 *
 * ASSUMPTION, flagged: this reads `claim_status`, on the basis that a release
 * moves it off `Pending`. Release and *claim* are different events, so if the
 * status only moves when the employee actually collects the cash, this would
 * hide the button on rows that were released but not yet claimed. The alternative
 * — no gate — offers a second release of the same pay, which is worse. If the
 * backend has a real per-row released flag, this is the one line to swap.
 */
function isSettled(row) {
  return String(row?.claim_status || '').toLowerCase() !== 'pending'
}

/** Everything the batch is allowed to move. */
const bulkRows = computed(() => disbursements.value.filter((row) => !isCash(row)))
const cashRows = computed(() => disbursements.value.filter(isCash))

// One action, and it is the same on every cash row, so it is declared once
// rather than rebuilt per render. The gate that decides whether the menu exists
// at all lives in the template — an action that does not apply is absent, not a
// greyed-out item.
const disburseActions = [{ key: 'disburse', label: 'Disburse', icon: 'o_payments' }]

// The confirmation gate. `pending` is snapshotted rather than re-read on confirm,
// so the dialog describes the release that was asked about even though the table
// behind it is live and a refetch can replace those rows at any moment.
const showConfirm = ref(false)
const confirm = ref(null)
const pendingAction = ref(null)
const pendingRows = ref([])

function requestDisburseAll() {
  const rows = bulkRows.value
  if (!rows.length || disbursing.value || showConfirm.value) return
  pendingRows.value = rows
  confirm.value = buildDisburseAllConfirm(rows, cashRows.value.length, groupName.value)
  pendingAction.value = 'all'
  showConfirm.value = true
}

function requestDisburseOne(row) {
  if (!row?.epi_id || disbursing.value || showConfirm.value) return
  pendingRows.value = [row]
  confirm.value = buildDisburseOneConfirm(row, groupName.value)
  pendingAction.value = 'one'
  showConfirm.value = true
}

function onConfirm() {
  if (pendingAction.value === 'all')
    disburse(pendingRows.value, 'Released pay for everyone paid by bank or another method.')
  else if (pendingAction.value === 'one') disburse(pendingRows.value, 'Pay released.')
}

// Cancelling must clear the snapshot as surely as confirming does: a stale
// `pendingRows` left behind is a release the next dialog's Confirm could fire.
watch(showConfirm, (open) => {
  if (open) return
  confirm.value = null
  pendingAction.value = null
  pendingRows.value = []
})

/** Re-reads the run. Both writes move the same summary and the same rows. */
async function refresh() {
  try {
    const [summ, data] = await Promise.all([
      fetchPayoutGroupInstanceSummary(groupId),
      fetchDisbursementEmployees(groupId),
    ])
    summary.value = summ
    disbursements.value = data || []
  } catch (err) {
    console.error('[DisbursePage] refresh ✖ error:', err)
  }
}

/**
 * The confirmed release.
 *
 * The write and the refetch are deliberately separate: folding them into one
 * `try` meant a read that failed after a successful write reported the write as
 * failed, leaving the reader believing pay had not been released when it had.
 */
async function disburse(rows, successMessage) {
  const epiIds = rows.map((row) => row.epi_id).filter((id) => id != null)
  if (!epiIds.length) return

  disbursing.value = true
  try {
    try {
      await disbursePgi(groupId, epiIds)
    } catch (err) {
      console.error('[DisbursePage] disburse ✖ error:', err)
      toast.error(extractErrorMessage(err, 'Failed to release this pay. Nothing was changed.'))
      return
    }

    stepperKey.value++
    await refresh()
    toast.success(successMessage)
  } finally {
    disbursing.value = false
  }
}
</script>

<style scoped>
/* ============================================================================
   Disburse step — local styles only. Frame, figures strip and table chrome are
   shared (DisbursementStepShell / DisbursementStatRow / DisbursementTableCard).
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

/* Sits immediately left of the toolbar action, so the button's precondition is
   readable beside the button rather than only in a disabled tooltip. Hidden on
   narrow viewports, where the toolbar needs its width for search and the action
   itself. */
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

/* The row's kebab: quiet at rest, the same treatment `EmployeeTable.vue` gives
   its row menu, so the two tables read as one language. */
.row-btn {
  color: var(--dash-ink-4);
}
.row-btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
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
