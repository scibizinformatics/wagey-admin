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

          <!-- One cutoff at a time. The options come from the cutoff *list*, not
               from the rows, because only the selected cutoff's runs are fetched —
               building them from rows would leave the dropdown holding whichever
               cutoff happened to load first, and no ongoing cutoff at all until
               somebody opened it. Hidden while the Completed toggle is on, since
               that view spans every completed cutoff and a single-cutoff picker
               would have nothing to pick from. -->
          <q-select
            v-if="!completedOnly && cutoffSelectOptions.length > 1"
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

          <!-- History across every finished cutoff. Shaped like the Manning
               board's "Needs attention" button rather than the chip beside it:
               same outline, icon and counted label, because it is the same kind of
               control — a visible, pressed-looking shortcut rather than a silent
               rule, since a table showing a subset without saying so reads as a
               table missing rows. -->
          <q-btn
            outline
            no-caps
            dense
            size="12px"
            icon="o_check_circle"
            :label="completedLabel"
            class="disb-completed-btn"
            :class="{ 'disb-completed-btn--on': completedOnly }"
            :disable="!cutoffs.length && !completedOnly"
            @click="completedOnly = !completedOnly"
          >
            <q-tooltip>
              {{
                completedOnly
                  ? 'Showing every cutoff whose payout groups have all finished — press to go back to one at a time'
                  : 'Show every cutoff whose payout groups have all finished'
              }}
              <span v-if="completedSweepSummary">
                <br />
                {{ completedSweepSummary }}
              </span>
            </q-tooltip>
          </q-btn>

          <!-- The deep-link narrowing that the cutoff select could *not* take
               over, because neither the id nor the name matched a cutoff the
               list actually holds. It stays visible because a list that
               silently shows a subset reads as a list that is missing rows. -->
          <button
            v-if="unmatchedCutoffChip"
            type="button"
            class="dash-chip dash-chip--info disb-cutoff-chip"
            @click="clearCutoffFilter"
          >
            <span class="dash-chip__dot" />
            {{ unmatchedCutoffChip }}
            <q-icon name="close" size="13px" class="disb-cutoff-chip__x" />
            <q-tooltip>Clear this cutoff filter</q-tooltip>
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
import { stepRouteForPgiStatus, isCompletePgiStatus } from 'src/constants/pgiStatus'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { useCompany } from 'src/composables/page/useCompany'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { useToast } from 'src/composables/useToast'
import { todayIso } from 'src/composables/utils/calendarDate'
import { buildEmployeeNameIndex } from 'src/composables/utils/employee'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { normalizeCutoffInstance } from 'src/composables/utils/leaveCutoffs'
import {
  companyCutoffShapes,
  defaultCutoff,
  narrowCutoffsByShape,
} from 'src/composables/utils/cutoffState'
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
  fetchCompanyCutoffs,
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
 * cutoff key.
 *
 * The group options are still derived from the loaded rows, because a second
 * lookup could offer a group that has no run in scope — a filter that empties the
 * table for no visible reason. The *cutoff* options no longer are, because the
 * rows are one cutoff's and the list is the whole workspace: they come from
 * `cutoffs` below, which is fetched before any runs.
 */
const groupFilter = ref(null)
const cutoffFilter = ref(null)

/**
 * Every cutoff the workspace has, as metadata only — id, name, window, state —
 * read from `cutoff-instances` with no runs behind them.
 *
 * This list is what the dropdown is built from, which is the point of fetching it
 * separately: the table used to load every cutoff's payout groups at once and
 * derive its options from the rows it had already fetched, so the dropdown only
 * ever offered cutoffs somebody had paid for. Now the ongoing cutoff is offered
 * whether or not it has runs yet, and selecting a cutoff costs one request for
 * that cutoff rather than a request for all of them.
 */
const cutoffs = ref([])

/**
 * History view: every completed cutoff's runs in one table, instead of one cutoff
 * at a time. Off by default, so the page opens on the most recent finished
 * cutoff — a working list — and the heavier all-completed load happens only when
 * somebody asks for it.
 */
const completedOnly = ref(false)

/**
 * Every cutoff's runs, keyed by cutoff, from the last sweep.
 *
 * Held rather than discarded because classifying a cutoff as completed means
 * asking that question of its runs, and the runs are what the sweep paid for.
 * Dropping them would make going back and forth between the two views refetch
 * every cutoff each time.
 */
const runsByCutoff = ref(new Map())

/**
 * The cutoffs whose every payout group reached the final step.
 *
 * Empty until a sweep has run, which is why the toggle cannot promise a count
 * before it has been pressed: the answer only exists once every cutoff's runs have
 * been read, and no cheaper endpoint answers it.
 */
const completedCutoffKeys = ref(new Set())

/** The completed cutoffs the toggle shows, for its label and its count. */
const completedCutoffOptions = computed(() =>
  cutoffs.value.filter((cutoff) => completedCutoffKeys.value.has(cutoff.key)),
)

/**
 * The toggle's own label, counting what it would show.
 *
 * Mirrors the Manning board's "Needs attention (4)": the count is the reason the
 * control exists. It stays bare until the first sweep, because a count before then
 * would be a guess dressed as a fact — and a guess that turned out to be zero on
 * press is worse than admitting it had not looked.
 */
const completedLabel = computed(() => {
  const count = completedCutoffOptions.value.length
  return count ? `Completed (${count})` : 'Completed'
})

/**
 * What the sweep found, for the toggle's tooltip.
 *
 * The count of scanned cutoffs is here because "0 completed" means two very
 * different things — nothing has finished, or nothing has been looked at — and the
 * button cannot tell the reader which without saying it.
 */
const completedSweepSummary = computed(() => {
  // Only while the history view is open. Leaving it up afterwards would report
  // "1 cutoff · 0 fully paid" after a return to the single-cutoff view, which
  // reads as a finding about the company rather than as the default scope.
  if (!completedOnly.value) return ''
  const scanned = runsByCutoff.value.size
  const done = completedCutoffKeys.value.size
  return `Scanned ${scanned} cutoff${scanned === 1 ? '' : 's'} · ${done} fully paid`
})

// Guards for the two re-run loads, so a reader flipping the dropdown or the toggle
// faster than the API answers cannot land an older scope's rows on screen.
const runsGuard = createRequestToken()
const dashboardGuard = createRequestToken()

/**
 * Whether the cutoff list has settled, so the dropdown watcher can tell a reader
 * asking for a different cutoff from the page choosing its own default.
 *
 * Without it, `loadCutoffs` setting `cutoffFilter` would look exactly like a
 * reader picking a cutoff, and the page would fire two loads for one visit.
 */
const ready = ref(false)

/**
 * The dropdown's options, in the endpoint's own order.
 *
 * Insertion order, not alphabetical: the rows arrive in the order the cutoff
 * endpoint returned its cutoffs, which is chronological, and sorting names like
 * "Oct 1–15" as text would shuffle them.
 *
 * Each option reads as the window it covers rather than as the cutoff's own name.
 * The names are not usable in a list — a company running a semi-monthly cutoff
 * calls every one of them the same thing — while the window is what tells two
 * cutoffs apart, which is exactly what an option has to do.
 */
const cutoffSelectOptions = computed(() =>
  cutoffs.value.map((cutoff) => ({
    label: cutoff.windowLabel || cutoff.label,
    value: cutoff.key,
  })),
)

const groupSelectOptions = computed(() => {
  const names = new Set()
  for (const run of rows.value) if (run.group) names.add(run.group)
  return [
    { label: 'All payout groups', value: null },
    ...[...names].sort((a, b) => a.localeCompare(b)).map((n) => ({ label: n, value: n })),
  ]
})

const activeCutoffLabel = computed(() => {
  if (completedOnly.value) return 'every completed cutoff'
  const match = cutoffSelectOptions.value.find((o) => o.value === cutoffFilter.value)
  return match?.label || ''
})

/**
 * The deep-link chip's own copy, which outlives the filter it failed to set.
 *
 * Only shown when a linked cutoff matched nothing in `cutoffs` — once the select
 * owns the narrowing, the chip's state is cleared.
 */
const unmatchedCutoffChip = computed(() => cutoffFilterLabel.value)

/**
 * Everything the toolbar narrowing leaves, before the search term. Kept apart
 * from `filteredRuns` because the subtitle counts the scope the reader chose,
 * not what they are part-way through typing.
 *
 * No cutoff narrowing here: the runs on screen already *are* the selected
 * cutoff (or, with the toggle on, the completed ones), so filtering them again
 * by cutoff would be a no-cost pass over a list that cannot contain anything
 * else.
 */
const narrowedRuns = computed(() => {
  let out = rows.value
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
  parts.push(activeCutoffLabel.value || 'the selected cutoff')
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

/**
 * Hands a deep-linked cutoff over to the select as soon as the cutoff list makes
 * it resolvable, so the narrowing shows up as a filter the reader can change
 * rather than as a chip beside an untouched dropdown.
 *
 * Resolved against the cutoff *list* now rather than against fetched rows, which
 * is what a one-cutoff-at-a-time page requires — the linked cutoff's runs have not
 * been asked for at this point, so matching against rows would find nothing and
 * the link would silently lose its narrowing.
 *
 * A link that matches nothing is left as a chip: the reader sees that a cutoff was
 * asked for and that this workspace has no such cutoff, rather than being handed
 * the default with no explanation for the link that brought them.
 */
function resolveDeepLink() {
  const fallback = () => {
    if (!cutoffFilter.value) cutoffFilter.value = defaultCutoff(cutoffs.value)?.key ?? null
  }

  if (!cutoffFilterId.value && !cutoffFilterLabel.value) {
    fallback()
    return
  }
  const wantedId = cutoffFilterId.value ? `id:${cutoffFilterId.value}` : null
  const wantedLabel = cutoffFilterLabel.value.toLowerCase()
  const match = cutoffs.value.find(
    (cutoff) => cutoff.key === wantedId || cutoff.label.toLowerCase() === wantedLabel,
  )
  // A link that matched nothing falls back to the default cutoff rather than to an
  // empty table. The chip stays up, so the reader is told the cutoff they were
  // sent here for is not one this workspace has — an empty table would say that
  // less clearly, and would look like the page is broken rather than the link.
  if (!match) {
    fallback()
    return
  }
  cutoffFilter.value = match.key
  cutoffFilterId.value = ''
  cutoffFilterLabel.value = ''
}

/**
 * Reads the cutoff list — metadata only, no runs behind it — and narrows it to
 * this company's own cutoffs.
 *
 * Two requests, because the workspace-wide list cannot answer that on its own.
 * `cutoff-instances` lists every cutoff *type* in the workspace, so it arrives
 * carrying weekly, bi-weekly, monthly and annual cutoffs alongside this company's
 * fortnightly ones. Offering those raw filled the dropdown with a dozen periods
 * this company cannot pay against.
 *
 * `payroll-trend` is company-scoped, so the windows *it* reports are this
 * company's. Its shapes are therefore the filter: `1-15` and `16-last` for a
 * semi-monthly payroll, which keeps `Oct 1–15` and `Oct 16–31` and drops
 * everything else in that list. This is the same narrowing the Dashboard already
 * applies, now shared rather than duplicated.
 *
 * The ids still come from `cutoff-instances`, because that is the endpoint whose
 * ids `payout-group-instances` takes — `payroll-trend` is used for the shape and
 * the status, never as the key a payout run is fetched by.
 *
 * Deliberately the one pair of requests that touches every cutoff: the dropdown
 * has to know what exists before anything is selected. What it deliberately does
 * *not* do is ask each of those cutoffs for its payout groups, which is what this
 * page used to do and what made it slow — a workspace with a few years of cutoffs
 * paid one request per cutoff on every visit, only to show the reader a list they
 * had to narrow before it was readable.
 *
 * If the filter matches nothing — the two endpoints describing their windows in
 * ways this code cannot align — the narrowed-empty list is *not* what the reader
 * gets. A noisy dropdown is recoverable and the reader can see why; an empty one
 * looks like a broken page.
 */
async function loadCutoffs() {
  // Settled rather than caught, because "this call failed" is the single most
  // useful thing to know here: the cutoff list and the payroll-trend list feed two
  // different halves of this function, and only one of them failing looks like a
  // working page. Swallowed into `null` both times, they are indistinguishable
  // from an empty answer.
  const [instancesResult, companyResult] = await Promise.allSettled([
    fetchCutoffInstances(),
    fetchCompanyCutoffs(companyId.value),
  ])
  const instancesRaw = instancesResult.status === 'fulfilled' ? instancesResult.value : null
  const companyRaw = companyResult.status === 'fulfilled' ? companyResult.value : null

  if (instancesResult.status === 'rejected') {
    console.error('[DisbursementListPage] cutoff-instances failed', instancesResult.reason)
  }
  if (companyResult.status === 'rejected') {
    console.error('[DisbursementListPage] payroll-trend failed', companyResult.reason)
  }

  const instanceList = Array.isArray(instancesRaw)
    ? instancesRaw
    : (instancesRaw?.results ?? instancesRaw?.data ?? [])
  const instances = (Array.isArray(instanceList) ? instanceList : [])
    .map(normalizeCutoffInstance)
    .filter(Boolean)

  const companyList = Array.isArray(companyRaw)
    ? companyRaw
    : (companyRaw?.cutoffs ?? companyRaw?.results ?? companyRaw?.data ?? [])
  const companyCutoffs = Array.isArray(companyList) ? companyList : []

  const shapes = companyCutoffShapes(companyCutoffs)
  let narrowed = narrowCutoffsByShape(instances, shapes)
  if (!narrowed.length && instances.length) {
    console.warn(
      `[DisbursementListPage] no cutoff matched this company's shapes ` +
        `(${[...shapes].join(', ')}); offering the full workspace list`,
    )
    narrowed = instances
  }

  cutoffs.value = narrowed

  // What actually came back, in the one place that can see both ends of it. The
  // dropdown depends on the *shape* narrowing — the list arriving unfiltered is
  // the failure mode, and it looks like nothing is wrong until you notice a dozen
  // periods the company cannot pay against.
  console.log(
    '[DisbursementListPage] cutoffs:',
    `workspace=${instances.length} kept=${narrowed.length}`,
    `| payroll-trend=${companyCutoffs.length}`,
    `| shapes=${[...shapes].join('+') || '(none)'}`,
  )

  if (narrowed.length) return true
  console.warn('[DisbursementListPage] no cutoffs returned for this workspace')
  return false
}

/**
 * The runs for whatever is in scope, fetched now.
 *
 * One request per cutoff in scope, so the default view costs one and the
 * Completed view costs one per finished cutoff — the heavy load the reader opts
 * into by pressing the toggle rather than paying it on every visit. A cutoff
 * with no id cannot be asked about and is skipped rather than requested with
 * `undefined` in the path.
 *
 * `expectedStatuses: [404]` in the composable is why a cutoff this company has no
 * runs for answers instead of throwing; a rejected cutoff is a fact about the
 * workspace, not an error, and the table showing nothing for it is correct.
 */
/** One payout group as a table row, tagged with the cutoff it was fetched under. */
function toRunRow(item, cutoff) {
  return {
    id: item.id,
    cutoffId: cutoff?.id ?? null,
    // The cutoff the row was asked for, not just the one the payload names: the
    // payload identifies its cutoff by name only, and a name is not something to
    // key a selection on.
    cutoffKey: cutoff?.key ?? null,
    group: item.payout_group_name,
    // The window the row belongs to, in the same words the dropdown uses, so a
    // reader can tell at a glance which option produced this row. The payload's
    // own `cutoff_instance_name` is the fallback for a cutoff whose dates were
    // unreadable — better a possibly long name than a blank.
    cutoff: cutoff?.windowLabel || item.cutoff_instance_name || '',
    method: item.payout_method_name,
    employees: item.employees,
    netAmount: parseFloat(item.net_amount || 0),
    status: item.payout_status,
    statusDisplay: item.payout_status_display,
  }
}

/**
 * One request per cutoff, batched, returning the runs keyed by cutoff.
 *
 * A cutoff with no id cannot be asked about and is skipped rather than requested
 * with `undefined` in the path.
 */
async function fetchRunsByCutoff(scope) {
  const batches = await fetchWithConcurrency(
    scope,
    (cutoff) =>
      cutoff?.id == null
        ? null
        : fetchPayoutGroupInstances(companyId.value, cutoff.id).catch(() => null),
    10,
  )
  const map = new Map()
  scope.forEach((cutoff, i) => {
    map.set(
      cutoff.key,
      (batches[i] || []).map((item) => toRunRow(item, cutoff)),
    )
  })
  return map
}

/**
 * The rows for whatever is in scope, fetched now.
 *
 * The default view asks about one cutoff, which is the whole point of the page
 * having stopped fetching every cutoff in the workspace. The Completed view cannot
 * be that cheap: "has this payroll finished" is a property of its payout groups
 * and exists nowhere else, so classifying every cutoff means reading all of them.
 * That cost is opt-in — paid on the press, cached for five minutes afterwards, and
 * never on the default view.
 *
 * A cutoff qualifies when it has at least one run and *every* run is finished. One
 * group still sitting in Funding means the payroll is not done, whatever the rest
 * of the cutoff looks like; a cutoff with no runs at all has no payroll to call
 * finished and is not history either.
 */
async function loadRuns() {
  const token = runsGuard.next()
  loading.value = true
  try {
    if (!completedOnly.value) {
      const scope = cutoffs.value.filter((cutoff) => cutoff.key === cutoffFilter.value)
      const map = await fetchRunsByCutoff(scope)
      if (!runsGuard.isCurrent(token)) return
      runsByCutoff.value = map
      completedCutoffKeys.value = new Set()
      rows.value = scope.flatMap((cutoff) => map.get(cutoff.key) || [])
      return
    }

    const scope = cutoffs.value
    const map = await fetchRunsByCutoff(scope)
    if (!runsGuard.isCurrent(token)) return
    runsByCutoff.value = map

    const finished = new Set()
    for (const cutoff of scope) {
      const runs = map.get(cutoff.key) || []
      if (runs.length && runs.every((run) => isCompletePgiStatus(run.status))) {
        finished.add(cutoff.key)
      }
    }
    completedCutoffKeys.value = finished
    rows.value = scope
      .filter((cutoff) => finished.has(cutoff.key))
      .flatMap((cutoff) => map.get(cutoff.key))
  } catch (err) {
    console.error('[DisbursementListPage] runs failed:', err)
  } finally {
    if (runsGuard.isCurrent(token)) loading.value = false
  }
}

/**
 * The pipeline tiles for the selected cutoff.
 *
 * One cutoff, deliberately — the tiles sit directly above the table and used to
 * aggregate every cutoff while the table showed all of them, which agreed by
 * accident. With the table scoped, the tiles describe the same cutoff. In the
 * Completed view they keep describing the *selected* cutoff rather than summing
 * every completed one: the toggle is a history view, and a total across
 * arbitrary past cutoffs would answer a question nobody asked.
 */
async function loadDashboard() {
  const cutoff = cutoffs.value.find((c) => c.key === cutoffFilter.value)
  if (cutoff?.id == null) {
    dashboard.value = null
    return
  }
  const token = dashboardGuard.next()
  loadingDashboards.value = true
  try {
    const summary = await fetchDashboardSummary(companyId.value, cutoff.id).catch(() => null)
    if (!dashboardGuard.isCurrent(token)) return
    dashboard.value = summary ? aggregateDashboards([summary]) : null
  } finally {
    if (dashboardGuard.isCurrent(token)) loadingDashboards.value = false
  }
}

onMounted(async () => {
  applyDeepLink()
  try {
    const hasCutoffs = await loadCutoffs()
    resolveDeepLink()
    // Past this point the dropdown owns the scope, so a change to it is a reader
    // asking for something different — not the page settling itself up.
    ready.value = true

    await loadRuns()
    if (hasCutoffs) await loadDashboard()
    notifyLoaded('Payout groups', rows.value.length, {
      noun: 'payout group',
      nounPlural: 'payout groups',
    })
  } catch (err) {
    console.error('[DisbursementListPage] load failed:', err)
  } finally {
    loading.value = false
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
watch(
  [pageSize, searchTerm, groupFilter, cutoffFilter, onlyWithAdvances, view, completedOnly],
  () => {
    page.value = 1
  },
)

/**
 * A change of scope re-runs both loads.
 *
 * This is what the single-cutoff page costs per change: one request for the newly
 * selected cutoff, plus one for its dashboard figures. It is also why the toggle
 * is opt-in — pressing it is the only thing on this page that fetches more than
 * one cutoff at a time.
 *
 * The dashboard follows only the selected cutoff, never the toggle: the tiles
 * describe one cutoff in both modes.
 */
watch([cutoffFilter, completedOnly], () => {
  if (!ready.value) return
  loadRuns()
  if (!completedOnly.value) loadDashboard()
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
  if (!isCashAdvance.value) return
  // Re-read whenever the runs change, not only on the first pass. Changing cutoff
  // replaces the rows wholesale, and a table that kept the previous cutoff's
  // summaries — or none at all — under the new cutoff's groups would put one
  // cutoff's cash advances beside another's payroll.
  loadCashAdvances()
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

/* The completed-cutoff toggle, cut from the Manning toolbar's "Needs attention"
   button: same outline, same 34px rung, same counted label. Re-declared rather
   than shared because each page scopes its own toolbar, and a page-wide
   cross-component class for one button is a wider coupling than this is worth. */
.disb-completed-btn {
  height: 34px;
  padding: 0 11px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-2);
  font-weight: 500;
  flex-shrink: 0;
}
.disb-completed-btn :deep(.q-btn__content) {
  gap: 6px;
}
/* Info rather than warn, which is what the Manning equivalent uses. Warn would be
   right there because that filter selects for problems; this one selects for a
   neutral slice of history, and a warning tone on it would say something the
   table is not saying. */
.disb-completed-btn--on {
  background: var(--dash-info-bg);
  color: var(--dash-info);
}
.disb-completed-btn--on :deep(.q-btn__content) {
  color: var(--dash-info);
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
