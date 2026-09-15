<template>
  <PageShell>
    <div class="disb-page">
      <!-- ── Page header ─────────────────────────────────────────────────── -->
      <header class="disb-head">
        <div class="disb-head__titles">
          <h1 class="disb-head__title">Disbursement</h1>
          <p class="disb-head__sub">{{ headSummary }}</p>
        </div>
        <q-btn
          outline
          no-caps
          icon="o_file_download"
          label="Export PDF"
          class="btn-outline"
          :disable="!listRows.length"
          @click="exportRuns"
        />
      </header>

      <!-- ── Scope summary ───────────────────────────────────────────────────
           The cutoff read as a pipeline rather than seven equal readings: what
           still needs work, then what money is where. The old strip gave counts
           and pesos the same weight in one grey band, so nothing led.

           The tiles follow the view. Left on the pipeline while the table showed
           cash advances they would have been a row of figures about something
           else, sitting directly above a table that disagreed with every one. -->
      <div class="disb-stats">
        <div v-for="tile in activeTiles" :key="tile.key" class="disb-stat">
          <div class="disb-stat__head">
            <span class="disb-stat__mark" :style="{ background: tile.mark }" />
            <span class="disb-stat__label">{{ tile.label }}</span>
          </div>
          <span v-if="tilesLoading" class="dash-shimmer disb-stat__skeleton" />
          <span v-else class="disb-stat__value dash-num">{{ tile.value }}</span>
        </div>
      </div>

      <!-- ── Runs ────────────────────────────────────────────────────────── -->
      <section class="dash-panel disb-list">
        <div class="disb-toolbar">
          <!-- What the table *is*, not what it narrows to — which is why it sits
               ahead of the search box and the two filters, all three of which
               apply to whichever view is showing. The same runs are listed
               either way; only the columns change. -->
          <q-select
            v-model="view"
            :options="VIEW_OPTIONS"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            :popup-content-class="'disb-popup'"
            class="disb-view dash-field"
            aria-label="Show payout groups or cash advances"
          >
            <template #prepend>
              <q-icon :name="viewIcon" size="16px" />
            </template>
          </q-select>

          <q-input
            ref="searchRef"
            v-model="searchTerm"
            :placeholder="searchPlaceholder"
            dense
            outlined
            clearable
            hide-bottom-space
            debounce="250"
            class="disb-search dash-field"
          >
            <template #prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>

          <!-- Both narrow the same list and both carry an explicit "All ..." row
               rather than a clear button, matching the payout-group filter on
               Attendance. They only render once there is something to choose
               between: a select holding one option is a label, not a control. -->
          <q-select
            v-if="groupSelectOptions.length > 2"
            v-model="groupFilter"
            :options="groupSelectOptions"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            :popup-content-class="'disb-popup'"
            class="disb-filter dash-field"
            aria-label="Filter by payout group"
          >
            <template #prepend>
              <q-icon name="o_groups" size="16px" />
            </template>
          </q-select>

          <q-select
            v-if="cutoffSelectOptions.length > 2"
            v-model="cutoffFilter"
            :options="cutoffSelectOptions"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            :popup-content-class="'disb-popup'"
            class="disb-filter disb-filter--cutoff dash-field"
            aria-label="Filter by cutoff"
          >
            <template #prepend>
              <q-icon name="o_event" size="16px" />
            </template>
          </q-select>

          <!-- The deep-link narrowing that the cutoff select could *not* take
               over, because neither the id nor the name matched a cutoff the
               list actually holds. It stays visible because a list that
               silently shows a subset reads as a list that is missing rows. -->
          <button
            v-if="cutoffFilterLabel"
            type="button"
            class="dash-chip dash-chip--info disb-cutoff-chip"
            @click="clearCutoffFilter"
          >
            <span class="dash-chip__dot" />
            {{ cutoffFilterLabel }}
            <q-icon name="close" size="13px" class="disb-cutoff-chip__x" />
            <q-tooltip>Show every open cutoff</q-tooltip>
          </button>

          <!-- Most runs in a cutoff have nobody borrowing, so a cash advance
               table listing all of them is mostly zeroes. This hides them by
               default — but as a control that is visible, pressed-looking and
               switchable, rather than as a silent rule, since a list that shows
               a subset without saying so reads as a list missing rows. -->
          <button
            v-if="isCashAdvance"
            type="button"
            class="dash-chip disb-only-chip"
            :class="onlyWithAdvances ? 'dash-chip--info' : 'disb-only-chip--off'"
            :aria-pressed="onlyWithAdvances"
            @click="onlyWithAdvances = !onlyWithAdvances"
          >
            <span class="dash-chip__dot" />
            Only groups with advances
            <q-tooltip>
              {{ onlyWithAdvances ? 'Show every run in scope' : 'Hide runs with no advances' }}
            </q-tooltip>
          </button>

          <span class="disb-toolbar__count">
            {{ listRows.length }} {{ listRows.length === 1 ? 'run' : 'runs' }}
          </span>
        </div>

        <div class="disb-table-wrap">
          <PayoutTable
            v-if="!isCashAdvance"
            :rows="paginatedRuns"
            :loading="loading"
            @view="openRun"
          />
          <CashAdvanceTable
            v-else
            :rows="paginatedRuns"
            :loading="loading || loadingCashAdvance"
            :sort="cashAdvanceSort"
            :employee-index="employeeIndex"
            @view="openRun"
            @update:sort="cashAdvanceSort = $event"
          />
        </div>

        <footer v-if="listRows.length > 0" class="disb-foot">
          <div class="disb-foot__left">
            <span class="disb-foot__range dash-num">
              {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, listRows.length) }}
              of {{ listRows.length }}
            </span>
            <q-select
              v-model="pageSize"
              :options="pageSizeOptions.map((n) => ({ label: `${n} per page`, value: n }))"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              dense
              outlined
              hide-bottom-space
              :popup-content-class="'disb-popup'"
              class="disb-foot__size dash-field"
            />
          </div>
          <q-pagination
            v-model="page"
            :max="totalPages"
            :max-pages="$q.screen.lt.md ? 3 : 6"
            boundary-numbers
            direction-links
            :ripple="false"
            icon-first="first_page"
            icon-prev="chevron_left"
            icon-next="chevron_right"
            icon-last="last_page"
            class="disb-pager"
          />
        </footer>
      </section>
    </div>
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import PageShell from 'src/components/layout/PageShell.vue'
import PayoutTable from 'src/components/pages/Payroll/PayoutTable.vue'
import CashAdvanceTable from 'src/components/pages/Payroll/CashAdvanceTable.vue'
import { stepRouteForPgiStatus } from 'src/constants/pgiStatus'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { useCompany } from 'src/composables/page/useCompany'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { useToast } from 'src/composables/useToast'
import { todayIso } from 'src/composables/utils/calendarDate'
import { buildEmployeeNameIndex } from 'src/composables/utils/employee'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  aggregateCashAdvance,
  emptyCashAdvanceSummary,
  summariseCashAdvance,
} from 'src/composables/utils/cashAdvance'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

const toast = useToast()
const { companyId } = useCompany()
const {
  fetchCutoffInstances,
  fetchDashboardSummary,
  fetchEmployeeReviewSummary,
  fetchPayoutGroupInstances,
} = useDisbursementApi()
const { employees, fetchEmployees } = useEmployees()
const { notifyLoaded } = useLoadedToast()

const loading = ref(true)
const loadingDashboards = ref(false)
const rows = ref([])
const dashboard = ref(null)
const searchTerm = ref('')
const page = ref(1)

/**
 * ── The two views ──────────────────────────────────────────────────────────
 *
 * The same list of runs, read two ways. "Payout groups" is what a run pays;
 * "Cash advances" is what its employees borrowed against that pay, from
 * `/payroll/admin/employee-review-summary/{pgi_id}/`.
 *
 * They are one list rather than two screens on purpose: a run's position in the
 * five-step flow is the same fact in both, both carry the same progress rail,
 * and the toolbar's search, group and cutoff filters narrow them identically —
 * so switching views keeps the reader's place instead of restarting them.
 */
const VIEW_PAYOUT = 'payout_group'
const VIEW_CASH_ADVANCE = 'cash_advance'

const VIEW_OPTIONS = [
  { label: 'Payout groups', value: VIEW_PAYOUT },
  { label: 'Cash advances', value: VIEW_CASH_ADVANCE },
]

const view = ref(VIEW_PAYOUT)
const isCashAdvance = computed(() => view.value === VIEW_CASH_ADVANCE)
const viewIcon = computed(() => (isCashAdvance.value ? 'o_request_quote' : 'o_payments'))

const searchPlaceholder = computed(() =>
  isCashAdvance.value
    ? 'Search group, cutoff or employee'
    : 'Search group, cutoff, method or status',
)

/**
 * Cash advance readings, one per run, keyed by payout group instance id.
 *
 * Fetched lazily: the endpoint answers about a single run, so filling this table
 * costs one request per row, and most visits to this page never open the view.
 * They are asked for once and then cached for the same five minutes as the
 * payout-group and dashboard lists beside them.
 */
const cashAdvanceById = ref(new Map())
const loadingCashAdvance = ref(false)
const cashAdvanceLoaded = ref(false)
const onlyWithAdvances = ref(true)
const cashAdvanceSort = ref({ sortBy: 'requested', descending: true })
const cashAdvanceGuard = createRequestToken()

// Shared read-only stand-in for a run whose summary has not arrived, so the
// table can render every row from the moment the view opens rather than
// appearing one row at a time.
const EMPTY_CASH_ADVANCE = emptyCashAdvanceSummary()

/**
 * Puts a face beside a name in the expanded rows. The summary payload names an
 * employee and gives their id but carries no photograph, so the roster is the
 * only thing that can supply one — the same construction the Audit trail uses,
 * including its refusal to guess when a name belongs to two people.
 */
const employeeIndex = computed(() => buildEmployeeNameIndex(employees.value))

/**
 * Narrows the list to one cutoff, set from `?cutoff_id=` / `?cutoff=` when the
 * dashboard's "Previous cutoff is still open" alert sends the reader here.
 *
 * Both are kept because the two screens read cutoffs from different endpoints —
 * the dashboard from `payroll-trend`, this page from `cutoff-instances` — and
 * nothing guarantees they number them the same way. The id is tried first and
 * the label is the fallback, so a mismatch degrades to a name match rather than
 * to an empty table.
 */
const cutoffFilterId = ref('')
const cutoffFilterLabel = ref('')
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]

/**
 * Toolbar filters. `groupFilter` holds a payout-group name and `cutoffFilter` a
 * cutoff key, both null for "all".
 *
 * The options are derived from the rows rather than fetched, because the list is
 * already assembled from every open cutoff -- a second lookup could offer a
 * cutoff or a group that has no run on this page, which is a filter that empties
 * the table for no visible reason.
 */
const groupFilter = ref(null)
const cutoffFilter = ref(null)

// A cutoff is keyed by id where the row has one, since two cutoffs may share a
// display name; the name is the fallback so a row without an id is still
// selectable rather than silently unreachable.
function cutoffKey(run) {
  return run.cutoffId != null ? `id:${run.cutoffId}` : `name:${(run.cutoff || '').toLowerCase()}`
}

const groupSelectOptions = computed(() => {
  const names = new Set()
  for (const run of rows.value) if (run.group) names.add(run.group)
  return [
    { label: 'All payout groups', value: null },
    ...[...names].sort((a, b) => a.localeCompare(b)).map((n) => ({ label: n, value: n })),
  ]
})

// Insertion order, not alphabetical: the rows arrive in the order the cutoff
// endpoint returned its cutoffs, which is chronological, and sorting names like
// "Sept 1-15" as text would shuffle them.
const cutoffSelectOptions = computed(() => {
  const seen = new Map()
  for (const run of rows.value) {
    const key = cutoffKey(run)
    if (!seen.has(key)) seen.set(key, { label: run.cutoff || 'Unnamed cutoff', value: key })
  }
  return [{ label: 'All cutoffs', value: null }, ...seen.values()]
})

const activeCutoffLabel = computed(() => {
  if (cutoffFilter.value) {
    return cutoffSelectOptions.value.find((o) => o.value === cutoffFilter.value)?.label || ''
  }
  return cutoffFilterLabel.value
})

const cutoffScopedRuns = computed(() => {
  if (!cutoffFilterId.value && !cutoffFilterLabel.value) return rows.value

  // The id is the exact key, so it wins whenever it matches anything at all.
  if (cutoffFilterId.value) {
    const byId = rows.value.filter((run) => String(run.cutoffId) === cutoffFilterId.value)
    if (byId.length) return byId
  }

  if (!cutoffFilterLabel.value) return rows.value
  const label = cutoffFilterLabel.value.toLowerCase()
  const byLabel = rows.value.filter((run) => (run.cutoff || '').toLowerCase() === label)
  // Neither key found the cutoff — the two endpoints disagree about both its id
  // and its name. Showing everything is the honest answer; the chip stays up so
  // the reader can see the narrowing was asked for and did not take.
  return byLabel.length ? byLabel : rows.value
})

// Everything the toolbar narrowing leaves, before the search term. Kept apart
// from `filteredRuns` because the subtitle counts the scope the reader chose,
// not what they are part-way through typing.
const narrowedRuns = computed(() => {
  let out = cutoffScopedRuns.value
  if (cutoffFilter.value) out = out.filter((run) => cutoffKey(run) === cutoffFilter.value)
  if (groupFilter.value) out = out.filter((run) => run.group === groupFilter.value)
  return out
})

const filteredRuns = computed(() => {
  const scoped = narrowedRuns.value
  // `clearable` on the search input writes null, not '', so this coerces before
  // trimming rather than throwing on the clear button.
  const term = (searchTerm.value || '').trim().toLowerCase()
  if (!term) return scoped
  return scoped.filter((run) => {
    if (
      (run.group || '').toLowerCase().includes(term) ||
      (run.cutoff || '').toLowerCase().includes(term) ||
      (run.method || '').toLowerCase().includes(term) ||
      (run.status || '').toLowerCase().includes(term)
    ) {
      return true
    }
    // The cash advance view's rows are about people, so a name is a reasonable
    // thing to type into a box that offers to search the list. Only there: in
    // the payout-group view no employee is named on screen, and a search that
    // matched invisible text would look like it had matched nothing.
    if (!isCashAdvance.value) return false
    const summary = cashAdvanceById.value.get(run.id)
    return Boolean(summary?.advances.some((person) => person.name.toLowerCase().includes(term)))
  })
})

/** Runs paired with their cash advance reading, in the toolbar's scope. */
const cashAdvanceRows = computed(() =>
  filteredRuns.value.map((run) => ({
    ...run,
    summary: cashAdvanceById.value.get(run.id) ?? EMPTY_CASH_ADVANCE,
  })),
)

// Sort accessors keyed by the table's column names. Amounts and counts come off
// the derived summary rather than the payload, so a column sorts by the same
// number the cell prints — the payload sends its money as decimal strings, and
// "900.00" sorts above "1500.00" as text.
const CASH_ADVANCE_SORTS = {
  group: (row) => (row.group || '').toLowerCase(),
  advances: (row) => row.summary.advanceCount,
  requested: (row) => row.summary.requested,
  approved: (row) => row.summary.approved,
  // A run with nothing requested has no share; -1 keeps it below 0% rather than
  // scattering the un-askable rows through the middle of the order.
  approval: (row) => row.summary.approvalPct ?? -1,
}

/**
 * What the table renders, before the page slice: the payout-group rows as they
 * are, or the cash advance rows narrowed and sorted.
 *
 * Both the toggle and the sort are applied to the whole scoped set here rather
 * than inside the table, which only ever sees one page — a column header that
 * re-ordered ten visible rows would be answering a much narrower question than
 * it appears to.
 */
const listRows = computed(() => {
  if (!isCashAdvance.value) return filteredRuns.value

  // Nothing while the summaries are still arriving. Rendering the rows first
  // would show every run as advance-free and then visibly collapse the table to
  // a handful once the requests came back — the loading bar says "not yet"
  // without first giving a wrong answer.
  if (loadingCashAdvance.value && !cashAdvanceLoaded.value) return []

  let out = cashAdvanceRows.value
  // Guarded on `cashAdvanceLoaded` as well, so a sweep that failed outright
  // leaves the runs listed with empty figures rather than hiding all of them
  // behind a toggle the reader would have to find and switch off.
  if (onlyWithAdvances.value && cashAdvanceLoaded.value) {
    out = out.filter((row) => row.summary.advanceCount > 0)
  }

  const accessor = CASH_ADVANCE_SORTS[cashAdvanceSort.value?.sortBy]
  if (!accessor) return out

  const direction = cashAdvanceSort.value.descending ? -1 : 1
  return [...out].sort((a, b) => {
    const left = accessor(a)
    const right = accessor(b)
    if (typeof left === 'string' || typeof right === 'string') {
      return String(left).localeCompare(String(right)) * direction
    }
    return (left - right) * direction
  })
})

function clearCutoffFilter() {
  cutoffFilterId.value = ''
  cutoffFilterLabel.value = ''
  page.value = 1
}

const totalPages = computed(() => Math.ceil((listRows.value?.length ?? 0) / pageSize.value) || 1)

const searchRef = ref(null)

/** The scope the toolbar's two filters describe, named for the subtitle. */
const scopeLabel = computed(() => {
  const parts = []
  if (groupFilter.value) parts.push(groupFilter.value)
  parts.push(activeCutoffLabel.value || 'the open cutoffs')
  return parts.join(' · ')
})

const headSummary = computed(() => {
  if (loading.value) return 'Loading payout groups…'
  const scope = scopeLabel.value

  // The cash advance view counts people, not runs: how many groups are in scope
  // is the other view's answer, and repeating it here would say nothing about
  // the table underneath.
  if (isCashAdvance.value) {
    if (loadingCashAdvance.value) return `Reading cash advances in ${scope}…`
    const totals = aggregateCashAdvance(scopedCashAdvanceSummaries.value)
    if (!totals.advanceCount) return `No cash advances in ${scope}`
    const groups = totals.runsWithAdvances
    return (
      `${totals.advanceCount} cash ${totals.advanceCount === 1 ? 'advance' : 'advances'} across ` +
      `${groups} payout ${groups === 1 ? 'group' : 'groups'} in ${scope}`
    )
  }

  // Counts what the narrowing actually leaves, not what was fetched — the
  // subtitle sat above a filtered table claiming the full total otherwise.
  const n = narrowedRuns.value.length
  if (!n) return `No payout groups in ${scope}`
  return `${n} payout ${n === 1 ? 'group' : 'groups'} in ${scope}`
})

/**
 * The cash advance readings for the runs the toolbar's filters leave — the
 * scope both the subtitle and the summary tiles describe.
 *
 * Deliberately *before* the search term and the advances-only toggle, matching
 * the payout-group view: the tiles above the table state the cutoff a reader
 * chose, not what they are part-way through typing into the search box.
 */
const scopedCashAdvanceSummaries = computed(() =>
  narrowedRuns.value.map((run) => cashAdvanceById.value.get(run.id)).filter(Boolean),
)

/**
 * The cutoff read as a pipeline: what still needs a person, then where the money
 * has got to. Ordered left to right in the direction work actually moves, so the
 * leftmost non-zero tile is what to pick up next.
 *
 * Marks come from the design system's status and categorical ramps rather than
 * the seven ad-hoc dot colours the old strip used.
 */
const statTiles = computed(() => {
  const d = dashboard.value
  return [
    {
      key: 'open',
      label: 'Open groups',
      value: d?.open_payout_groups ?? 0,
      mark: 'var(--dash-cat-1)',
    },
    {
      key: 'review',
      label: 'Review required',
      value: d?.review_required ?? 0,
      mark: 'var(--dash-critical-mark)',
    },
    {
      key: 'ack',
      label: 'Awaiting ack',
      value: d?.awaiting_acknowledgement ?? 0,
      mark: 'var(--dash-warn-mark)',
    },
    {
      key: 'ready',
      label: 'Ready to fund',
      value: `₱${parseAmount(d?.ready_for_funding_amount)}`,
      mark: 'var(--dash-good-mark)',
    },
    {
      key: 'funded',
      label: 'Funded',
      value: `₱${parseAmount(d?.funded_amount)}`,
      mark: 'var(--dash-cat-2)',
    },
    {
      key: 'disbursing',
      label: 'Disbursing',
      value: `₱${parseAmount(d?.disbursing_amount)}`,
      mark: 'var(--dash-info-mark)',
    },
    {
      key: 'completed',
      label: 'Completed',
      value: d?.completed_this_cutoff ?? 0,
      mark: 'var(--dash-neutral-mark)',
    },
  ]
})

/**
 * The cash advance summary for the same cutoff scope: how much was asked for,
 * how much has been approved, and what is left between the two.
 *
 * The last figure is labelled "Not approved" rather than "Outstanding" or
 * "Pending" on purpose — the gap between requested and approved is partly
 * decisions nobody has made yet and partly requests somebody deliberately
 * approved in part, and the payload cannot tell the two apart. Naming it for
 * what it is keeps the tile from asserting work that may not exist.
 */
const cashAdvanceTiles = computed(() => {
  const t = aggregateCashAdvance(scopedCashAdvanceSummaries.value)
  return [
    {
      key: 'ca-groups',
      label: 'Groups with advances',
      value: t.runsWithAdvances,
      mark: 'var(--dash-cat-1)',
    },
    {
      key: 'ca-employees',
      label: 'Employees',
      value: t.advanceCount,
      mark: 'var(--dash-cat-2)',
    },
    {
      key: 'ca-requested',
      label: 'Requested',
      value: `₱${parseAmount(t.requested)}`,
      mark: 'var(--dash-info-mark)',
    },
    {
      key: 'ca-approved',
      label: 'Approved',
      value: `₱${parseAmount(t.approved)}`,
      mark: 'var(--dash-good-mark)',
    },
    {
      key: 'ca-gap',
      label: 'Not approved',
      value: `₱${parseAmount(t.shortfall)}`,
      mark: 'var(--dash-warn-mark)',
    },
    {
      key: 'ca-share',
      label: 'Approved share',
      value: t.approvalPct == null ? '—' : `${Math.round(t.approvalPct)}%`,
      mark: 'var(--dash-neutral-mark)',
    },
  ]
})

const activeTiles = computed(() => (isCashAdvance.value ? cashAdvanceTiles.value : statTiles.value))

const tilesLoading = computed(() =>
  isCashAdvance.value ? loadingCashAdvance.value : loadingDashboards.value,
)

// "/" focuses search, matching the other list pages.
function onGlobalKey(e) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
  e.preventDefault()
  searchRef.value?.focus()
}

onMounted(() => window.addEventListener('keydown', onGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))

const paginatedRuns = computed(() => {
  if (!listRows.value) return []
  const start = (page.value - 1) * pageSize.value
  return listRows.value.slice(start, start + pageSize.value)
})

/**
 * `?cutoff_id=` / `?cutoff=` opens the list already narrowed to one cutoff. The
 * dashboard's "Previous cutoff is still open" alert links here that way, so its
 * button lands on the groups it is complaining about rather than on the whole
 * list of open cutoffs.
 *
 * Read before the rows arrive so the table renders narrowed once, rather than
 * showing everything and then visibly dropping to a subset.
 */
function applyDeepLink() {
  const linkedId = route.query.cutoff_id
  const linkedLabel = route.query.cutoff
  let applied = false

  if (typeof linkedId === 'string' && linkedId.trim()) {
    cutoffFilterId.value = linkedId.trim()
    applied = true
  }
  if (typeof linkedLabel === 'string' && linkedLabel.trim()) {
    cutoffFilterLabel.value = linkedLabel.trim()
    applied = true
  }

  if (!applied) return

  page.value = 1
  // Consumed once. Left in the URL, a reload would re-apply a narrowing the
  // reader had since dismissed, and the list would look permanently short.
  router.replace({ query: {} })
}

onMounted(async () => {
  applyDeepLink()
  try {
    const raw = await fetchCutoffInstances()
    const cutoffs = Array.isArray(raw) ? raw : raw?.results ?? []

    if (!cutoffs.length) {
      loading.value = false
      return
    }

    // PHASE 1: Fetch payout groups for all cutoffs (batched) and show table immediately
    const allGroups = await fetchWithConcurrency(
      cutoffs,
      (c) => fetchPayoutGroupInstances(companyId.value, c.id).catch(() => null),
      10,
    )
    // `fetchWithConcurrency` returns its results in input order, so the index
    // still names the cutoff each batch of groups came from. The id is carried
    // onto the row because the payload identifies a cutoff only by name, and a
    // name is not something to filter an exact selection on.
    rows.value = allGroups.flatMap((g, i) => (g || []).map((item) => ({
      id: item.id,
      cutoffId: cutoffs[i]?.id ?? null,
      group: item.payout_group_name,
      cutoff: item.cutoff_instance_name,
      method: item.payout_method_name,
      employees: item.employees,
      netAmount: parseFloat(item.net_amount || 0),
      status: item.payout_status,
      statusDisplay: item.payout_status_display,
    })))
    loading.value = false
    notifyLoaded('Payout groups', rows.value.length, {
      noun: 'payout group',
      nounPlural: 'payout groups',
    })

    // PHASE 2: Background-fetch dashboard summaries and aggregate stats
    loadingDashboards.value = true
    const dashboardResults = await fetchWithConcurrency(
      cutoffs,
      (c) => fetchDashboardSummary(companyId.value, c.id).catch(() => null),
      10,
    )
    dashboard.value = aggregateDashboards(dashboardResults.filter(Boolean))
  } catch (err) {
    console.error('[DisbursementListPage] load failed:', err)
  } finally {
    loading.value = false
    loadingDashboards.value = false
  }
})

/**
 * Opens the run where it actually is — the step its own progress bar names —
 * rather than always at Review.
 *
 * The step pages also show the run's name and cutoff in their header, and no
 * step endpoint returns either, so the row that already has them passes them on.
 * They are a courtesy, not a contract: a deep link that arrives without them
 * resolves the same facts from the API.
 */
function openRun(row) {
  router.push({
    path: `/app/payroll/${stepRouteForPgiStatus(row.status)}/${row.id}`,
    query: {
      pgi_status: row.status,
      group: row.group || undefined,
      cutoff: row.cutoff || undefined,
    },
  })
}

/**
 * Fills the cash advance view, one request per run.
 *
 * Lazy and once: the endpoint answers about a single payout group instance, so
 * this is N requests for one table, and most visits never open the view. It is
 * batched the same way the dashboard summaries are, and behind a request token,
 * because a reader can switch views and workspaces faster than dozens of
 * requests come back — without the guard an earlier sweep can land last and
 * publish another cutoff's figures under the current one's rows.
 *
 * A run whose summary fails is kept with an empty reading rather than dropped:
 * a list that quietly loses rows is worse than one that shows a run with no
 * figures, since only the second is visible as a problem.
 */
async function loadCashAdvances() {
  if (!rows.value.length) return
  const token = cashAdvanceGuard.next()
  loadingCashAdvance.value = true
  try {
    // The roster only feeds the expanded rows' photographs, so it is not worth
    // blocking the figures on: it is started here and awaited after, and
    // `useEmployees` caches per company and de-duplicates in-flight requests.
    const roster = fetchEmployees().catch(() => null)

    const summaries = await fetchWithConcurrency(
      rows.value,
      (run) => fetchEmployeeReviewSummary(run.id, { cache: true }).catch(() => null),
      8,
    )
    await roster

    if (!cashAdvanceGuard.isCurrent(token)) return

    const next = new Map()
    rows.value.forEach((run, i) => next.set(run.id, summariseCashAdvance(summaries[i])))
    cashAdvanceById.value = next
    cashAdvanceLoaded.value = true
  } catch (err) {
    console.error('[DisbursementListPage] cash advance summaries failed:', err)
  } finally {
    if (cashAdvanceGuard.isCurrent(token)) loadingCashAdvance.value = false
  }
}

function exportRuns() {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const cashAdvance = isCashAdvance.value

    doc.setFontSize(16)
    doc.text(cashAdvance ? 'Cash Advances' : 'Disbursement Runs', 14, 20)
    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-PH')}`, 14, 27)
    // The PDF is of the table on screen, so it has to say which table that was —
    // otherwise a cash advance export and a payout export differ only by their
    // column headings.
    doc.text(scopeLabel.value, 14, 32)

    // The list as narrowed, not every row: the button is already disabled on it,
    // and a PDF that ignored the toolbar would not be what the reader exported.
    const headers = cashAdvance
      ? [['Group', 'Cutoff', 'Employees', 'Requested', 'Approved', 'Not approved', 'Stage']]
      : [['Group', 'Cutoff', 'Method', 'Employees', 'Net Amount', 'Status']]

    const body = listRows.value.map((run) =>
      cashAdvance
        ? [
            run.group || '',
            run.cutoff || '',
            `${run.summary.advanceCount} of ${run.summary.headcount}`,
            `₱${parseAmount(run.summary.requested)}`,
            `₱${parseAmount(run.summary.approved)}`,
            `₱${parseAmount(run.summary.shortfall)}`,
            run.status || '',
          ]
        : [
            run.group || '',
            run.cutoff || '',
            run.method || '',
            run.employees ?? 0,
            `₱${(run.netAmount ?? 0).toLocaleString('en-PH')}`,
            run.status || '',
          ],
    )

    doc.autoTable({
      head: headers,
      body,
      startY: 37,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [16, 35, 53], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })

    doc.save(`${cashAdvance ? 'cash-advances' : 'disbursement-runs'}-${todayIso()}.pdf`)
    toast.success('PDF exported successfully')
  } catch (err) {
    toast.error('Failed to export PDF')
    console.error('[DisbursementListPage] PDF export error:', err)
  }
}

async function fetchWithConcurrency(items, fn, concurrency = 10) {
  const results = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

function aggregateDashboards(allDashboards) {
  const agg = {
    open_payout_groups: 0,
    review_required: 0,
    awaiting_acknowledgement: 0,
    ready_for_funding: 0,
    ready_for_funding_amount: 0,
    funded: 0,
    funded_amount: 0,
    disbursing: 0,
    disbursing_amount: 0,
    completed_this_cutoff: 0,
  }
  for (const d of allDashboards) {
    agg.open_payout_groups += d.open_payout_groups || 0
    agg.review_required += d.review_required || 0
    agg.awaiting_acknowledgement += d.awaiting_acknowledgement || 0
    agg.ready_for_funding += d.ready_for_funding || 0
    agg.ready_for_funding_amount += parseFloat(d.ready_for_funding_amount || 0)
    agg.funded += d.funded || 0
    agg.funded_amount += parseFloat(d.funded_amount || 0)
    agg.disbursing += d.disbursing || 0
    agg.disbursing_amount += parseFloat(d.disbursing_amount || 0)
    agg.completed_this_cutoff += d.completed_this_cutoff || 0
  }
  return agg
}

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

// Both reset to page 1: narrowing the list while on page 3 would otherwise land
// on a page that no longer exists. Search was previously reset by a `filterRuns`
// handler on the input; a watcher covers it without the template wiring.
watch([pageSize, searchTerm, groupFilter, cutoffFilter, onlyWithAdvances, view], () => {
  page.value = 1
})

/**
 * The cash advance figures are fetched the first time the view is opened, and
 * again here if the rows had not arrived yet when it was — switching views
 * during the initial load would otherwise leave the table permanently empty,
 * since `loadCashAdvances` has nothing to ask about until the runs exist.
 */
watch(view, (next) => {
  if (next === VIEW_CASH_ADVANCE && !cashAdvanceLoaded.value) loadCashAdvances()
})

watch(rows, () => {
  if (isCashAdvance.value && !cashAdvanceLoaded.value) loadCashAdvances()
})

/**
 * Hands a deep-linked cutoff over to the select as soon as the rows make it
 * resolvable, so the narrowing shows up as a filter the reader can change rather
 * than as a chip beside an untouched dropdown. The chip's own state is cleared
 * once the select owns it; it stays only for a link that matched nothing.
 */
watch(rows, () => {
  if (!cutoffFilterId.value && !cutoffFilterLabel.value) return
  const wantedId = cutoffFilterId.value ? `id:${cutoffFilterId.value}` : null
  const wantedLabel = cutoffFilterLabel.value.toLowerCase()
  const match = cutoffSelectOptions.value.find(
    (o) => o.value && (o.value === wantedId || o.label.toLowerCase() === wantedLabel),
  )
  if (!match) return
  cutoffFilter.value = match.value
  cutoffFilterId.value = ''
  cutoffFilterLabel.value = ''
})
</script>

<style scoped>
/* A chip that is also the control for removing itself, so it needs the button
   element's semantics without its chrome. */
.disb-cutoff-chip {
  border: 1px solid var(--dash-info-line);
  cursor: pointer;
  font-family: inherit;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.disb-cutoff-chip__x {
  margin-left: 2px;
  opacity: 0.65;
}
.disb-cutoff-chip:hover .disb-cutoff-chip__x {
  opacity: 1;
}

/* ============================================================================
   DISBURSEMENT LIST
   ----------------------------------------------------------------------------
   Entry point to the five-step flow. Was one card stacking header / a seven-cell
   grey stats strip / a section heading / table / pagination. Now: page header,
   a pipeline summary, and one list card — the same shape as Employees,
   Attendance and Schedule.
   ========================================================================== */
.disb-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.disb-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.disb-head__titles {
  min-width: 0;
}

.disb-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.disb-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.btn-outline {
  height: 38px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink-2);
}

/* ── Pipeline summary ──
   Seven tiles that wrap, rather than seven segments divided by vertical rules in
   a fixed row — the old strip could not fit its own content once the drawer took
   its share, so labels truncated before the numbers did. */
.disb-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 10px;
}

.disb-stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  padding: 11px 13px 12px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  box-shadow: var(--dash-shadow-xs);
}

.disb-stat__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.disb-stat__mark {
  width: 3px;
  height: 10px;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}

.disb-stat__label {
  font-size: 12px;
  color: var(--dash-ink-3);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disb-stat__value {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--dash-ink);
}

.disb-stat__skeleton {
  width: 62px;
  height: 16px;
}

/* ── List card ── */
.disb-list {
  overflow: hidden;
}

.disb-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

.disb-search {
  flex: 1 1 220px;
  min-width: 0;
  max-width: 360px;
}
.disb-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.disb-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.disb-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

/* The view switcher. Same 34px rung as the rest of the toolbar so the row still
   reads as one band of controls, but on the page's surface with a stronger
   border and weightier label: it decides what the table *is*, and sitting in
   identical chrome beside two filters it read as a third filter. */
.disb-view {
  width: 176px;
  flex-shrink: 0;
}
.disb-view :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  padding: 0 8px 0 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
}
.disb-view :deep(.q-field__control:before) {
  border-color: var(--dash-line-strong);
}
.disb-view :deep(.q-field__native) {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  padding: 0;
  min-height: 34px;
}
.disb-view :deep(.q-field__marginal) {
  height: 34px;
  min-width: 0;
  padding: 0;
  color: var(--dash-ink-3);
}
.disb-view :deep(.q-field__prepend) {
  padding-right: 7px;
}

/* A chip that is also its own toggle. Off, it keeps the chip's shape so the row
   does not reflow when it is switched — only its tint goes. */
.disb-only-chip {
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.disb-only-chip.dash-chip--info {
  border-color: var(--dash-info-line);
}
.disb-only-chip--off {
  background: transparent;
  border-color: var(--dash-line);
  color: var(--dash-ink-4);
}
.disb-only-chip--off .dash-chip__dot {
  background: var(--dash-n-300);
}
.disb-only-chip--off:hover {
  border-color: var(--dash-line-strong);
  color: var(--dash-ink-2);
}

/* Level with the search field rather than at Quasar's 56px default, so the
   toolbar reads as one row of controls. */
.disb-filter {
  width: 178px;
  flex-shrink: 0;
}
.disb-filter--cutoff {
  width: 196px;
}
.disb-filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  padding: 0 8px 0 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.disb-filter :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  padding: 0;
  min-height: 34px;
}
.disb-filter :deep(.q-field__marginal) {
  height: 34px;
  min-width: 0;
  padding: 0;
  color: var(--dash-ink-4);
}
.disb-filter :deep(.q-field__prepend) {
  padding-right: 7px;
}

.disb-toolbar__count {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* The progress column carries five step nodes, so the table needs room to
   scroll sideways on a laptop rather than crushing them. */
.disb-table-wrap {
  overflow-x: auto;
  padding: 0 6px;
}

/* ── Footer ── */
.disb-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 16px;
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  flex-wrap: wrap;
}

.disb-foot__left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.disb-foot__range {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.disb-foot__size {
  width: 132px;
}
.disb-foot__size :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.disb-foot__size :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink-2);
  min-height: 32px;
  padding: 0;
}
.disb-foot__size :deep(.q-field__marginal) {
  height: 32px;
  color: var(--dash-ink-4);
}

.disb-pager :deep(.q-btn) {
  min-width: 30px;
  min-height: 30px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
}
.disb-pager :deep(.q-btn:hover) {
  background: var(--dash-n-100);
  color: var(--dash-ink);
}
.disb-pager :deep(.q-btn--active) {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line-strong);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}

/* ── Responsive ── */
@media (max-width: 1023px) {
  .disb-head__title {
    font-size: 20px;
  }
  .disb-toolbar,
  .disb-foot {
    padding: 10px 14px;
  }
  .disb-search {
    flex: 1 1 100%;
    max-width: none;
  }
  /* The switcher keeps its own line above the search box: it is the control that
     decides what everything below it means, and wrapped into a row of filters it
     stops reading as one. */
  .disb-view {
    flex: 1 1 100%;
    width: auto;
  }
  .disb-filter,
  .disb-filter--cutoff {
    flex: 1 1 150px;
    width: auto;
  }
  .disb-toolbar__count {
    display: none;
  }
}

@media (max-width: 640px) {
  .disb-head {
    align-items: stretch;
  }
  .disb-head .btn-outline {
    width: 100%;
  }
  .disb-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .disb-foot {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .disb-foot__left {
    justify-content: space-between;
  }
  .disb-pager {
    align-self: center;
  }
}
</style>

<style>
/* QSelect popups teleport to the body. */
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
