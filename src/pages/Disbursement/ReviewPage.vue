<template>
  <PageShell>
    <DisbursementStepShell
      :group-id="groupId"
      :step="1"
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
        title="Requests and deductions"
        :total="filteredData.length"
        :page-size-options="pageSizeOptions"
        :loading="loading"
        searchable
        search-placeholder="Search name, position or department"
        unit-label="employee"
        unit-label-plural="employees"
      >
        <!-- The step's action sits beside search, so it is on screen the moment
             the page loads rather than below the table. -->
        <template #actions>
          <span class="action-note dash-num">{{ reviewedIds.length }}/{{ reviewData.length }} reviewed</span>
          <q-btn
            unelevated
            no-caps
            dense
            icon="o_send"
            label="Release payslips"
            class="btn-primary"
            :loading="releasing"
            :disable="!reviewedIds.length || releasing"
            @click="releaseAll"
          >
            <q-tooltip v-if="!reviewedIds.length">
              Mark at least one employee reviewed first
            </q-tooltip>
          </q-btn>
        </template>

        <q-table
          :rows="paginatedData"
          :columns="columns"
          :loading="loading"
          :pagination="{ rowsPerPage: 0 }"
          row-key="epi_id"
          flat
          hide-no-data
          hide-pagination
        >
          <!-- Counts. Most rows are zero, so a zero is muted and only a real
               figure carries full ink — the exceptions are what this step is
               looking for. -->
          <template #body-cell-leave_request_count="props">
            <q-td :props="props">
              <span class="dash-num" :class="{ 'num-zero': !props.row.leave_request_count }">
                {{ props.row.leave_request_count ?? 0 }}
              </span>
            </q-td>
          </template>

          <template #body-cell-ot_request="props">
            <q-td :props="props">
              <span class="dash-num" :class="{ 'num-zero': !props.row.ot_request }">
                {{ props.row.ot_request ?? 0 }}
              </span>
            </q-td>
          </template>

          <template #body-cell-requested_cash_advance="props">
            <q-td :props="props">
              <span class="dash-num" :class="{ 'num-zero': !amount(props.row.requested_cash_advance) }">
                {{ formatCurrency(props.row.requested_cash_advance) }}
              </span>
            </q-td>
          </template>

          <!-- Approved short of requested is the case an admin has to decide on,
               so it is toned rather than left as one more number in the row. -->
          <template #body-cell-approved_cash_advance="props">
            <q-td :props="props">
              <span
                class="dash-num"
                :class="{
                  'num-zero': !amount(props.row.approved_cash_advance) && !isCashAdvanceShort(props.row),
                  'num-warn': isCashAdvanceShort(props.row),
                }"
              >
                {{ formatCurrency(props.row.approved_cash_advance) }}
              </span>
              <q-tooltip v-if="isCashAdvanceShort(props.row)">
                {{ formatCurrency(props.row.requested_cash_advance) }} requested
              </q-tooltip>
            </q-td>
          </template>

          <!-- The contribution's own status rides under its amount rather than in
               a column of its own: two status pills per row would compete with
               the review status, which is the one the step acts on.

               The cell is the way into the breakdown, where a contribution that
               did not come off automatically can be deducted by hand. It opens
               even on a zero amount, since zero is exactly the case where a
               deduction is missing. -->
          <template #body-cell-contribution="props">
            <q-td :props="props">
              <button type="button" class="contrib" @click="viewContributions(props.row)">
                <span
                  class="dash-num contrib__amount"
                  :class="{ 'contrib__amount--zero': !amount(props.row.contribution) }"
                >
                  {{ formatCurrency(props.row.contribution) }}
                </span>
                <span v-if="showsContributionStatus(props.row)" class="contrib__status">
                  {{ props.row.contribution_status }}
                </span>
                <q-tooltip :delay="400">View contributions</q-tooltip>
              </button>
            </q-td>
          </template>

          <template #body-cell-review_status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.review_status" />
            </q-td>
          </template>

          <template #body-cell-action="props">
            <q-td :props="props" class="text-center">
              <q-btn flat round dense icon="more_horiz" size="11px" class="row-btn">
                <q-menu anchor="bottom right" self="top right" :offset="[0, 6]" class="disb-menu">
                  <q-list dense class="disb-menu__list">
                    <q-item
                      v-close-popup
                      clickable
                      class="disb-menu__item"
                      :disable="reviewedIds.includes(props.row.epi_id) || reviewingId === props.row.epi_id"
                      @click="reviewEmployee(props.row)"
                    >
                      <q-item-section avatar>
                        <q-spinner v-if="reviewingId === props.row.epi_id" size="15px" />
                        <q-icon v-else name="o_check_circle" size="17px" />
                      </q-item-section>
                      <q-item-section>
                        {{ reviewedIds.includes(props.row.epi_id) ? 'Reviewed' : 'Mark reviewed' }}
                      </q-item-section>
                    </q-item>

                    <q-item
                      v-if="reviewedIds.includes(props.row.epi_id)"
                      v-close-popup
                      clickable
                      class="disb-menu__item"
                      :disable="releasingId === props.row.epi_id"
                      @click="releaseEmployee(props.row)"
                    >
                      <q-item-section avatar>
                        <q-spinner v-if="releasingId === props.row.epi_id" size="15px" />
                        <q-icon v-else name="o_send" size="17px" />
                      </q-item-section>
                      <q-item-section>Release payslip</q-item-section>
                    </q-item>

                    <q-separator class="disb-menu__sep" />

                    <q-item
                      v-close-popup
                      clickable
                      class="disb-menu__item"
                      @click="viewContributions(props.row)"
                    >
                      <q-item-section avatar>
                        <q-icon name="o_account_balance" size="17px" />
                      </q-item-section>
                      <q-item-section>Contributions</q-item-section>
                    </q-item>

                    <q-item v-close-popup clickable class="disb-menu__item" @click="viewEmployee(props.row)">
                      <q-item-section avatar><q-icon name="o_visibility" size="17px" /></q-item-section>
                      <q-item-section>View details</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>
          </template>

          <template #no-data>
            <div v-if="!loading" class="dash-empty">
              <span class="dash-featured-icon">
                <q-icon :name="searchTerm ? 'filter_alt_off' : 'o_fact_check'" size="20px" />
              </span>
              <p class="dash-empty__title">
                {{ searchTerm ? 'No employees match this search' : 'Nothing to review' }}
              </p>
              <p class="dash-empty__sub">
                {{
                  searchTerm
                    ? 'Try a different name, position or department.'
                    : 'This payout group has no employees to review.'
                }}
              </p>
            </div>
          </template>
        </q-table>
      </DisbursementTableCard>
    </DisbursementStepShell>

    <EmployeeDetailDialog v-model="detailDialogOpen" :employee-id="selectedEmployeeId" />

    <!-- Deducting a contribution moves the row's contribution figures and can
         move its status, so the table refetches when the dialog reports one. -->
    <EmployeeContributionsDialog
      v-model="contributionsDialogOpen"
      :pgi-id="groupId"
      :epi-id="selectedEpiId"
      :employee-name="selectedEmployeeName"
      @deducted="refreshAfterDeduct"
    />
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import StatusPill from 'src/components/common/StatusPill.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import DisbursementStepShell from 'src/components/pages/Payroll/DisbursementStepShell.vue'
import DisbursementStatRow from 'src/components/pages/Payroll/DisbursementStatRow.vue'
import DisbursementTableCard from 'src/components/pages/Payroll/DisbursementTableCard.vue'
import EmployeeDetailDialog from 'src/components/pages/Payroll/EmployeeDetailDialog.vue'
import EmployeeContributionsDialog from 'src/components/pages/Payroll/EmployeeContributionsDialog.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { formatCurrency } from 'src/composables/utils/format'
import { useLoadedToast } from 'src/composables/useLoadedToast'

const route = useRoute()
const $q = useQuasar()
const groupId = route.params.id
// Bumped after releasing payslips so the progress header refetches.
const stepperKey = ref(0)
const { fetchReviewOverview, fetchEmployeeReviewSummary, reviewToReady, releasePayslips } =
  useDisbursementApi()
const { notifyLoaded } = useLoadedToast()

// The shell shows the run's identity and status. pgi_status arrives as a query
// param from the list page; the stepper falls back to its progress endpoint when
// it is absent, so a deep link still resolves.
const pgiStatus = computed(() => route.query.pgi_status || '')

const loading = ref(true)
const releasing = ref(false)
const reviewingId = ref(null)
const releasingId = ref(null)
const reviewedIds = ref([])
const overview = ref(null)
const summary = ref(null)
const reviewData = ref([])
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const detailDialogOpen = ref(false)
const selectedEmployeeId = ref(null)
const contributionsDialogOpen = ref(false)
const selectedEpiId = ref(null)
const selectedEmployeeName = ref('')

/** Decimal strings ("0.00") arrive from the API; compare and sort them as numbers. */
function amount(val) {
  return Number(val ?? 0)
}

/**
 * Figures are right-aligned so a column of them reads as numbers.
 *
 * The money columns sort through a `field` function that coerces to Number: the
 * API sends decimals as strings ("1500.00"), and sorting those as text puts
 * "900.00" above "1500.00".
 */
const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'position', align: 'left', sortable: true },
  { name: 'department', label: 'Department', field: 'department', align: 'left', sortable: true },
  {
    name: 'leave_request_count',
    label: 'Leave',
    field: (row) => amount(row.leave_request_count),
    align: 'right',
    sortable: true,
  },
  {
    name: 'ot_request',
    label: 'OT req.',
    field: (row) => amount(row.ot_request),
    align: 'right',
    sortable: true,
  },
  {
    name: 'requested_cash_advance',
    label: 'CA requested',
    field: (row) => amount(row.requested_cash_advance),
    align: 'right',
    sortable: true,
  },
  {
    name: 'approved_cash_advance',
    label: 'CA approved',
    field: (row) => amount(row.approved_cash_advance),
    align: 'right',
    sortable: true,
  },
  {
    name: 'contribution',
    label: 'Contribution',
    field: (row) => amount(row.contribution),
    align: 'right',
    sortable: true,
  },
  {
    name: 'review_status',
    label: 'Review status',
    field: 'review_status',
    align: 'left',
    sortable: true,
  },
  { name: 'action', label: '', field: 'action', align: 'center' },
]

function isCashAdvanceShort(row) {
  const requested = amount(row.requested_cash_advance)
  return requested > 0 && amount(row.approved_cash_advance) < requested
}

/** "Not Applicable" -> "not_applicable", so a label compares regardless of casing. */
function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

/**
 * "Not applicable" against a zero contribution says nothing the empty amount has
 * not already said, so it is left off; anything else — pending, incomplete, paid —
 * is a state the reader needs.
 */
function showsContributionStatus(row) {
  const status = normalize(row.contribution_status)
  return Boolean(status) && status !== 'not_applicable'
}

function isReviewed(row) {
  return normalize(row.review_status) === 'reviewed'
}

/**
 * Marks follow what each figure means rather than a decorative sequence: the two
 * that need a person are warn and critical, the settled one is good.
 */
const statTiles = computed(() => [
  {
    key: 'total',
    label: 'Employees',
    value: reviewData.value.length ?? 0,
    mark: 'var(--dash-cat-1)',
  },
  {
    key: 'reviewed',
    label: 'Reviewed',
    value: overview.value?.reviewed ?? 0,
    mark: 'var(--dash-good-mark)',
  },
  {
    key: 'attention',
    label: 'Needs attention',
    value: overview.value?.needs_attention ?? 0,
    mark: 'var(--dash-critical-mark)',
  },
  {
    key: 'missing',
    label: 'Missing date',
    value: overview.value?.missing_date ?? 0,
    mark: 'var(--dash-warn-mark)',
  },
  {
    key: 'na',
    label: 'Not applicable',
    value: overview.value?.not_applicable ?? 0,
    mark: 'var(--dash-neutral-mark)',
  },
])

const groupName = computed(
  () =>
    overview.value?.payout_group_name ||
    overview.value?.group_name ||
    route.query.group ||
    '',
)

// The review payload names the cutoff this run belongs to, so the header can say
// which period is being settled rather than leaving the reader to infer it.
const subtitle = computed(() => {
  const purpose = 'Settle requests and deductions before payslips go out.'
  const cutoff = summary.value?.cutoff_name
  return cutoff ? `${cutoff} · ${purpose}` : purpose
})

// Narrowing or resizing the list while on a later page would otherwise leave the
// reader on a page that no longer exists.
watch([searchTerm, pageSize], () => {
  page.value = 1
})

const filteredData = computed(() => {
  if (!searchTerm.value.trim()) return reviewData.value
  const term = searchTerm.value.toLowerCase()
  return reviewData.value.filter((e) => {
    return (
      (e.employee || '').toLowerCase().includes(term) ||
      (e.department || '').toLowerCase().includes(term) ||
      (e.position || '').toLowerCase().includes(term)
    )
  })
})

const paginatedData = computed(() => {
  if (!filteredData.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

/**
 * Rows are keyed by `epi_id` — the employee payroll item — which is the id that
 * review, release and the detail dialog all address, so no translation is needed
 * between the table and the actions taken on it.
 */
async function load() {
  const [ov, rev] = await Promise.all([
    fetchReviewOverview(groupId),
    fetchEmployeeReviewSummary(groupId),
  ])
  overview.value = ov
  summary.value = rev
  reviewData.value = rev?.employees || []
  reviewedIds.value = reviewData.value.filter(isReviewed).map((e) => e.epi_id)
}

onMounted(async () => {
  try {
    await load()
    notifyLoaded('Payroll review', reviewData.value.length, {
      noun: 'employee',
      nounPlural: 'employees',
    })
  } catch (err) {
    console.error('[ReviewPage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

function viewEmployee(row) {
  selectedEmployeeId.value = row.epi_id
  detailDialogOpen.value = true
}

function viewContributions(row) {
  selectedEpiId.value = row.epi_id
  selectedEmployeeName.value = row.employee || ''
  contributionsDialogOpen.value = true
}

/**
 * The deduction itself already succeeded and the dialog has said so, so a failed
 * refresh is logged and left there rather than raised as a second, contradictory
 * notice — the table is stale, not wrong.
 */
async function refreshAfterDeduct() {
  try {
    await load()
  } catch (err) {
    console.error('[ReviewPage] refresh after deduction failed:', err)
  }
}

async function reviewEmployee(row) {
  reviewingId.value = row.epi_id
  try {
    await reviewToReady(groupId, [row.epi_id])
    if (!reviewedIds.value.includes(row.epi_id)) {
      reviewedIds.value.push(row.epi_id)
    }
  } catch (err) {
    console.error('[ReviewPage] reviewEmployee ✖ error:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to review employee.',
      icon: 'error',
      timeout: 3000,
      position: 'top',
    })
  } finally {
    reviewingId.value = null
  }
}

async function releaseAll() {
  releasing.value = true
  try {
    const epiIds = reviewData.value
      .filter((e) => reviewedIds.value.includes(e.epi_id))
      .map((e) => e.epi_id)
    if (!epiIds.length) {
      $q.notify({
        type: 'warning',
        message: 'No reviewed employees to release.',
        icon: 'warning',
        timeout: 2000,
        position: 'top',
      })
      return
    }
    await releasePayslips(groupId, epiIds)

    stepperKey.value++
    await load()
    $q.notify({
      type: 'positive',
      message: `Payslips released for ${epiIds.length} employee${epiIds.length > 1 ? 's' : ''}.`,
      icon: 'check_circle',
      timeout: 3000,
      position: 'top',
    })
  } catch (err) {
    console.error('[ReviewPage] releaseAll ✖ error:', err)
  } finally {
    releasing.value = false
  }
}

async function releaseEmployee(row) {
  releasingId.value = row.epi_id
  try {
    await releasePayslips(groupId, [row.epi_id])
    await load()
    $q.notify({
      type: 'positive',
      message: `Payslip released for ${row.employee}.`,
      icon: 'check_circle',
      timeout: 2000,
      position: 'top',
    })
  } catch (err) {
    console.error('[ReviewPage] releaseEmployee ✖ error:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to release payslip.',
      icon: 'error',
      timeout: 3000,
      position: 'top',
    })
  } finally {
    releasingId.value = null
  }
}
</script>

<style scoped>
/* ============================================================================
   Step-local styles only.
   ----------------------------------------------------------------------------
   The page frame comes from DisbursementStepShell, the figures strip from
   DisbursementStatRow, and the list card and its table from
   DisbursementTableCard. What used to be ~400 lines of per-page CSS — header,
   stats bar, section header, table, pagination — is now shared, leaving only
   what is genuinely specific to this step.
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

.row-btn {
  color: var(--dash-ink-4);
}
.row-btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

/* A cutoff where nothing was requested is almost all zeros. Receding them lets
   the few rows that do carry a request read straight off the column. */
.num-zero {
  color: var(--dash-ink-4);
}

.num-warn {
  color: var(--dash-warn);
  font-weight: 600;
}

/* A cell that opens the contribution breakdown. Inline-flex so the hover tint
   hugs the figure instead of washing the whole column, and a plain button so it
   is reachable by keyboard — the amount used to be inert text. */
.contrib {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  margin: -4px -6px;
  padding: 4px 6px;
  border: 0;
  border-radius: var(--dash-r-sm);
  background: none;
  font: inherit;
  color: inherit;
  text-align: right;
  cursor: pointer;
  transition: background 0.12s ease;
}

.contrib:hover {
  background: var(--dash-accent-bg);
}

.contrib:focus-visible {
  outline: 2px solid var(--dash-accent);
  outline-offset: 1px;
}

/* Link-toned and underlined at rest, not only on hover: a reader scanning the
   column has to be able to tell the amount opens something without hovering it
   first. Underline rather than a trailing chevron so the digits still end on a
   common right edge and the column reads as numbers. */
.contrib__amount {
  color: var(--dash-accent);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
  /* A softened --dash-accent: the underline should mark the amount as a link
     without competing with the digits it sits under. */
  text-decoration-color: rgba(46, 79, 212, 0.4);
  transition: text-decoration-color 0.12s ease;
}

.contrib:hover .contrib__amount {
  text-decoration-color: var(--dash-accent);
}

/* A zero recedes as it does in the other figure columns, but keeps the underline
   — zero is the case most likely to need opening, so it must not read as inert. */
.contrib__amount--zero {
  color: var(--dash-ink-4);
  font-weight: 400;
  text-decoration-color: var(--dash-n-300, #d0d5dd);
}

.contrib:hover .contrib__amount--zero {
  color: var(--dash-accent);
  text-decoration-color: var(--dash-accent);
}

.contrib__status {
  font-size: 11px;
  line-height: 1.3;
  color: var(--dash-ink-4);
}
</style>

<style>
/* Row menus teleport to the body. Shared by the disbursement steps. */
.disb-menu {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
}
.disb-menu__list {
  min-width: 196px;
  padding: 5px;
}
.disb-menu__item {
  min-height: 34px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 13px;
  color: var(--dash-ink-2);
}
.disb-menu__item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.disb-menu__item .q-item__section--avatar {
  min-width: 26px;
  padding-right: 10px;
  color: var(--dash-ink-4);
}
.disb-menu__sep {
  margin: 4px 0;
  background: var(--dash-line-soft);
}

/* Page-size selects inside DisbursementTableCard. */
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
