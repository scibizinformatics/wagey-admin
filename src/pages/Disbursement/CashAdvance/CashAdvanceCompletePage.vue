<template>
  <PageShell>
    <CashAdvanceStepShell
      :pgi-id="pgiId"
      :step="4"
      :stage="notComplete ? 'disburse' : 'complete'"
      :status="groupStatus"
      :group-name="groupName"
      :subtitle="subtitle"
    >
      <!-- The completed record is only available once the run itself is complete.
           A 400 is that state, not a failure, so the page says what is still
           happening and offers the one useful way back. -->
      <div v-if="notComplete" class="ca-notice" role="status">
        <q-icon name="o_info" size="16px" class="ca-notice__icon" />
        <span class="ca-notice__text">{{ notCompleteMessage }}</span>
        <q-btn
          outline
          no-caps
          dense
          icon="refresh"
          label="Retry"
          class="btn-outline"
          @click="refresh"
        />
        <q-btn
          unelevated
          no-caps
          dense
          icon="o_arrow_back"
          label="Go to disburse"
          class="btn-primary"
          :to="disburseRoute"
        />
      </div>

      <template v-else>
        <!-- The terminal step is a result, not a worklist, so it opens by saying
             the advances are done and what they came to. -->
        <div v-if="!loading" class="done">
          <span class="dash-featured-icon dash-featured-icon--good done__icon">
            <q-icon name="check" size="20px" />
          </span>
          <div class="done__text">
            <h2 class="done__title">Cash advance complete</h2>
            <p class="done__sub">
              <template v-if="completion.completionDate">
                Closed {{ longLabel(completion.completionDate) }} ·
              </template>
              {{ completion.claimedEmployees }} of {{ completion.totalEmployees }} employees claimed
            </p>
          </div>
          <div class="done__total">
            <span class="done__total-label">Funded</span>
            <span class="done__total-value dash-num"
              >₱{{ parseAmount(completion.fundedAmount) }}</span
            >
          </div>
        </div>

        <DisbursementStatRow :tiles="statTiles" :loading="loading" />

        <DisbursementTableCard
          v-model:search="searchTerm"
          v-model:page="page"
          v-model:page-size="pageSize"
          title="Cash advance summary"
          :total="filteredData.length"
          :page-size-options="pageSizeOptions"
          :loading="loading"
          searchable
          search-placeholder="Search employee, method or status"
          unit-label="employee"
          unit-label-plural="employees"
        >
          <template #actions>
            <q-btn
              outline
              no-caps
              dense
              icon="o_file_download"
              label="Export PDF"
              class="btn-outline"
              :disable="!filteredData.length"
              @click="exportSummary"
            />
            <q-btn
              unelevated
              no-caps
              dense
              icon="o_list"
              label="All cash advances"
              class="btn-primary"
              @click="goToList"
            />
          </template>

          <TableSkeleton
            v-if="loading"
            :columns="columns"
            :rows="pageSize"
            aria-label="Loading cash advance summary"
            wrap-class="dash-page-body"
          />

          <div v-else-if="!paginatedData.length" class="dash-empty dash-page-body">
            <span class="dash-featured-icon">
              <q-icon :name="searchTerm ? 'filter_alt_off' : 'o_receipt_long'" size="20px" />
            </span>
            <p class="dash-empty__title">
              {{ searchTerm ? 'No employees match this search' : 'No payment records' }}
            </p>
            <p class="dash-empty__sub">
              {{
                searchTerm
                  ? 'Try a different name, method or status.'
                  : 'This group has no completed cash advance payments to show.'
              }}
            </p>
          </div>

          <q-table
            v-else
            :rows="paginatedData"
            :columns="columns"
            :pagination="{ rowsPerPage: 0 }"
            flat
            hide-pagination
          >
            <template #body-cell-employee="props">
              <q-td :props="props">
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
            </template>

            <template #body-cell-payment_method="props">
              <q-td :props="props">
                <span class="method">
                  <q-icon :name="methodIcon(props.row.method)" size="15px" />
                  {{ props.row.method || '—' }}
                </span>
              </q-td>
            </template>

            <template #body-cell-reference_no="props">
              <q-td :props="props">
                <span v-if="props.row.reference" class="dash-num">{{ props.row.reference }}</span>
                <span v-else class="muted">—</span>
              </q-td>
            </template>

            <template #body-cell-cash_advance="props">
              <q-td :props="props" class="text-right ca-amount dash-num">
                {{ formatCurrency(props.row.amount) }}
              </q-td>
            </template>

            <template #body-cell-status="props">
              <q-td :props="props">
                <StatusPill :status="props.row.status" />
              </q-td>
            </template>

            <template #body-cell-released_on="props">
              <q-td :props="props">
                <span v-if="props.row.releasedOn" class="dash-num">
                  {{ longLabel(props.row.releasedOn) }}
                </span>
                <span v-else class="muted">—</span>
              </q-td>
            </template>

            <template #body-cell-received_by="props">
              <q-td :props="props">
                <span v-if="props.row.receivedBy">{{ props.row.receivedBy }}</span>
                <span v-else class="muted">—</span>
              </q-td>
            </template>
          </q-table>
        </DisbursementTableCard>
      </template>
    </CashAdvanceStepShell>
  </PageShell>
</template>

<script setup>
/**
 * Step 4 of the cash-advance flow: the finished record.
 *
 * Mirrors the payroll Complete step — the arrival banner, the figures strip, the
 * searchable table and its PDF export — with the cash-advance endpoint's own
 * guard: `completed-progress` answers 400 until the run is complete. That 400 is
 * rendered as a state ("still disbursing") with a link back to Disburse, not as
 * an error the reader can do nothing about.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import PageShell from 'src/components/layout/PageShell.vue'
import TableSkeleton from 'src/components/common/TableSkeleton.vue'
import StatusPill from 'src/components/common/StatusPill.vue'
import CashAdvanceStepShell from 'src/components/pages/CashAdvance/CashAdvanceStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import { useCashAdvanceApi } from 'src/composables/disbursement/useCashAdvanceApi'
import { usePayoutGroupIdentity } from 'src/composables/disbursement/usePayoutGroupIdentity'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useDisbursementViewState } from 'src/composables/page/useDisbursementViewState'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { summariseCashAdvanceCompletion } from 'src/composables/utils/cashAdvance'
import { extractErrorMessage } from 'src/composables/utils/http'
import { longLabel } from 'src/composables/utils/calendarDate'
import { avatarFor, buildEmployeeNameIndex } from 'src/composables/utils/employee'
import { formatCurrency } from 'src/composables/utils/format'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { normalizeStatusKey } from 'src/constants/cashAdvanceStatus'

const route = useRoute()
const router = useRouter()
const { notifyLoaded } = useLoadedToast()
const pgiId = route.params.id
const { identity, resolveQuietly } = usePayoutGroupIdentity()
const { fetchCashAdvanceCompletedProgress } = useCashAdvanceApi()
const { employees: rosterEmployees, fetchEmployees } = useEmployees()

const employeeIndex = computed(() => buildEmployeeNameIndex(rosterEmployees.value))
const avatarOf = (name) => avatarFor(employeeIndex.value, name)

const loading = ref(true)
const completionPayload = ref(null)
const notComplete = ref(false)
const notCompleteMessage = ref('')
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
// Remembers the table state and scroll position while the reader is on another
// page, and hands them back on return. Run-scoped, so opening a different run
// never inherits this one's page. See useDisbursementViewState.
const { restoreScroll } = useDisbursementViewState(`cash-advance-complete:${pgiId}`, {
  page,
  pageSize,
  searchTerm,
})
const guard = createRequestToken()

const completion = computed(() => summariseCashAdvanceCompletion(completionPayload.value))
const records = computed(() => completion.value.employees)

const groupStatus = computed(() => {
  // `na` means "this group has no cash advance"; it must not become a badge
  // reading "Na" or override the payroll status.
  const caStatus = normalizeStatusKey(identity.value?.cashAdvanceStatus)
  return normalizeStatusKey(
    (caStatus && caStatus !== 'na' ? caStatus : '') ||
      identity.value?.status ||
      route.query.pgi_status,
  )
})
const groupName = computed(() => identity.value?.name || route.query.group || '')
const cutoffName = computed(() => identity.value?.cutoff || route.query.cutoff || '')

const subtitle = computed(() => {
  const purpose = 'The finished record of these cash advances.'
  return cutoffName.value ? `${cutoffName.value} · ${purpose}` : purpose
})

const disburseRoute = computed(() => ({
  path: `/app/payroll/cash-advance/${pgiId}/disburse`,
  query: route.query,
}))

const statTiles = computed(() => [
  {
    key: 'funded',
    label: 'Funded amount',
    value: `₱${parseAmount(completion.value.fundedAmount)}`,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'employees',
    label: 'Employees',
    value: completion.value.totalEmployees,
    mark: 'var(--dash-cat-2)',
  },
  {
    key: 'claimed',
    label: 'Claimed',
    value: completion.value.claimedEmployees,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'date',
    label: 'Completed',
    value: longLabel(completion.value.completionDate) || '—',
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

const columns = [
  { name: 'employee', label: 'Employee', field: 'name', align: 'left', style: 'min-width: 220px' },
  {
    name: 'payment_method',
    label: 'Method',
    field: 'method',
    align: 'left',
    style: 'width: 132px',
  },
  { name: 'reference_no', label: 'Reference', field: 'reference', align: 'left' },
  {
    name: 'cash_advance',
    label: 'Cash advance',
    field: 'amount',
    align: 'right',
    style: 'width: 138px',
  },
  { name: 'status', label: 'Status', field: 'status', align: 'left', style: 'width: 118px' },
  { name: 'released_on', label: 'Released', field: 'releasedOn', align: 'left' },
  { name: 'received_by', label: 'Received by', field: 'receivedBy', align: 'left' },
]

const filteredData = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return records.value
  return records.value.filter(
    (record) =>
      record.name.toLowerCase().includes(term) ||
      record.method.toLowerCase().includes(term) ||
      record.status.toLowerCase().includes(term),
  )
})

const paginatedData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

// A remembered page can outrun a list that shrank while the tab was elsewhere —
// without any control being touched. Land on the last real page rather than an
// empty one.
watch(
  () => filteredData.value.length,
  (n) => {
    const last = Math.max(1, Math.ceil(n / pageSize.value))
    if (page.value > last) page.value = last
  },
)

watch([searchTerm, pageSize], () => {
  page.value = 1
})

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

function goToList() {
  router.push('/app/payroll?view=cash_advance')
}

/**
 * A completed run is the record people are asked for later, so it exports.
 * Uses the same jsPDF + autotable pair as the payroll Complete step.
 */
function exportSummary() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(15)
  doc.text(`Cash advance summary - ${groupName.value || 'Payout group'}`, 14, 18)
  doc.setFontSize(9)
  doc.text(
    [
      completion.value.completionDate
        ? `Completed ${longLabel(completion.value.completionDate)}`
        : '',
      `Employees: ${completion.value.totalEmployees}`,
      `Claimed: ${completion.value.claimedEmployees}`,
      `Funded: PHP ${parseAmount(completion.value.fundedAmount)}`,
    ]
      .filter(Boolean)
      .join('   |   '),
    14,
    25,
  )

  doc.autoTable({
    startY: 31,
    head: [
      ['Employee', 'Method', 'Reference', 'Cash advance', 'Status', 'Released', 'Received by'],
    ],
    body: filteredData.value.map((record) => [
      record.name,
      record.method,
      record.reference,
      `PHP ${parseAmount(record.amount)}`,
      record.status,
      longLabel(record.releasedOn),
      record.receivedBy,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 35, 53] },
  })

  doc.save(`cash-advance-summary-${pgiId}.pdf`)
}

async function refresh() {
  const token = guard.next()
  loading.value = true
  try {
    const res = await fetchCashAdvanceCompletedProgress(pgiId)
    if (!guard.isCurrent(token)) return false
    completionPayload.value = res.data
    notComplete.value = false
    notCompleteMessage.value = ''
    return true
  } catch (err) {
    if (!guard.isCurrent(token)) return false
    console.error('[CashAdvanceCompletePage] fetch failed:', err)
    notComplete.value = true
    notCompleteMessage.value =
      err?.response?.status === 400
        ? extractErrorMessage(err, 'These cash advances are not complete yet.')
        : 'The completed cash advance record could not be read.'
    return false
  } finally {
    if (guard.isCurrent(token)) loading.value = false
  }
}

onMounted(async () => {
  // A deep link arrives with no name, cutoff or status, and a refresh can arrive
  // with a stale one, so the run is resolved by its id either way.
  resolveQuietly(pgiId)
  fetchEmployees().catch(() => null)
  if (await refresh()) {
    notifyLoaded('Cash advance summary', records.value.length, {
      noun: 'employee',
      nounPlural: 'employees',
    })
  }
  // `refresh` clears `loading` in its own finally, so the rows are on screen by
  // the time this runs.
  restoreScroll()
})
</script>

<style scoped>
/* ============================================================================
   Cash advance Complete step — local styles only. Frame, figures strip and table
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

.btn-outline {
  height: 34px;
  padding: 0 11px;
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
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
  flex-wrap: wrap;
}
.ca-notice__icon {
  color: var(--dash-accent);
  flex-shrink: 0;
}
.ca-notice__text {
  flex: 1;
  min-width: 180px;
}

/* ── Completion banner ──
   States the outcome and its headline figure. A completed run should read as
   finished on arrival, not as another step waiting for input. */
.done {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--dash-good-bg);
  border: 1px solid var(--dash-good-line);
  border-radius: var(--dash-r-lg);
  flex-wrap: wrap;
}

.done__icon {
  background: var(--dash-surface);
  flex-shrink: 0;
}

.done__text {
  flex: 1;
  min-width: 180px;
}

.done__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.012em;
  color: #05603a;
}

.done__sub {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--dash-good);
}

.done__total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.done__total-label {
  font-size: 11.5px;
  color: var(--dash-good);
}

.done__total-value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: #05603a;
}

/* ── Cells ── */
.ca-amount {
  color: var(--dash-ink) !important;
  font-weight: 600;
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

@media (max-width: 640px) {
  .done__total {
    align-items: flex-start;
    width: 100%;
    padding-top: 4px;
    border-top: 1px solid var(--dash-good-line);
  }
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
