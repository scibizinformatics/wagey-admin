<template>
  <PageShell>
    <div class="ded-page">
      <!-- ── Page header ───────────────────────────────────────────────────
           Title and period out on the canvas, not inside the card. The period
           governs all three views, so it belongs above them rather than in the
           header of one of them. -->
      <header class="ded-head">
        <div class="ded-head__titles">
          <h1 class="ded-head__title">Contributions</h1>
          <p class="ded-head__sub">{{ headSummary }}</p>
        </div>

        <div class="ded-period" role="group" aria-label="Reporting period">
          <q-select
            v-model="period.year"
            :options="yearOptions"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            :popup-content-class="'ded-popup'"
            class="ded-period__field ded-period__field--year dash-field"
            aria-label="Year"
          >
            <template v-slot:prepend>
              <q-icon name="o_event" size="16px" />
            </template>
          </q-select>

          <!-- The annual view is a whole year, so the month picker has nothing
               to change there. It stays visible but inert rather than vanishing,
               which would shift the header every time the tab changes. -->
          <q-select
            v-model="period.month"
            :options="monthOptions"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            :disable="activeTab === 'annual'"
            :popup-content-class="'ded-popup'"
            class="ded-period__field ded-period__field--month dash-field"
            aria-label="Month"
          >
            <q-tooltip
              v-if="activeTab === 'annual'"
              anchor="bottom middle"
              self="top middle"
              class="ded-tip"
            >
              The annual view covers the whole year
            </q-tooltip>
          </q-select>

          <q-btn
            v-if="!isCurrentPeriod"
            flat
            dense
            no-caps
            size="12px"
            label="This month"
            class="ded-period__reset"
            @click="resetPeriod"
          />
        </div>
      </header>

      <!-- ── Summary ───────────────────────────────────────────────────────
           The same four readings for every tab — scope, due, deducted, still
           owed — so switching view does not reshuffle the summary under the
           reader. Figures are whole pesos here and exact in the tables. -->
      <div class="ded-stats">
        <article v-for="tile in tiles" :key="tile.key" class="ded-stat">
          <div class="ded-stat__head">
            <span class="ded-stat__mark" :style="{ background: tile.mark }" />
            <span class="ded-stat__label">{{ tile.label }}</span>
          </div>

          <span v-if="busy" class="dash-shimmer ded-stat__sk" />
          <span v-else class="ded-stat__value dash-num" :class="tile.valueClass">
            {{ tile.value }}
          </span>

          <div v-if="tile.key === 'collected' && !busy" class="ded-stat__bar">
            <span
              class="dash-bar__track"
              :class="`dash-bar__track--${collectedTone(totals.pct)}`"
              role="progressbar"
              :aria-valuenow="Math.round(totals.pct ?? 0)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span
                class="dash-bar__fill"
                :class="`dash-bar__fill--${collectedTone(totals.pct)}`"
                :style="{ width: `${Math.min(100, Math.max(0, totals.pct ?? 0))}%` }"
              />
            </span>
          </div>
          <span v-else-if="tile.foot && !busy" class="ded-stat__foot">{{ tile.foot }}</span>
        </article>
      </div>

      <!-- ── Error ─────────────────────────────────────────────────────────
           A QBanner with an avatar slot was heavier chrome than the message
           needed; this is one line in the critical tone with a dismiss. -->
      <div v-if="error" class="ded-alert" role="alert">
        <q-icon name="o_error" size="18px" class="ded-alert__icon" />
        <p class="ded-alert__text">{{ error }}</p>
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          label="Retry"
          class="ded-alert__btn"
          @click="refresh"
        />
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="close"
          aria-label="Dismiss"
          class="ded-alert__close"
          @click="clearError"
        />
      </div>

      <!-- ── Detail ────────────────────────────────────────────────────────-->
      <section class="dash-panel ded-panel">
        <div class="ded-panel__head">
          <DeductionsTabPills v-model="activeTab" :counts="tabCounts" panel-id="ded-view" />

          <div class="ded-panel__tools">
            <q-input
              v-if="searchable"
              ref="searchRef"
              v-model="search"
              :placeholder="activeTab === 'employee' ? 'Search employee' : 'Search department'"
              dense
              outlined
              clearable
              hide-bottom-space
              debounce="200"
              class="ded-search dash-field"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" />
              </template>
            </q-input>

            <q-btn
              flat
              dense
              round
              size="sm"
              icon="refresh"
              :loading="busy"
              class="ded-refresh"
              aria-label="Refresh"
              @click="refresh"
            >
              <q-tooltip anchor="bottom middle" self="top middle" class="ded-tip"
                >Refresh</q-tooltip
              >
            </q-btn>
          </div>
        </div>

        <transition name="ded-swap" mode="out-in">
          <div :key="activeTab" id="ded-view" class="ded-view" role="tabpanel">
            <!-- Annual -->
            <template v-if="activeTab === 'annual'">
              <AnnualSummaryTable v-if="!isNarrow" :rows="annualContributions" :loading="busy" />
              <ContributionCardList
                v-else
                :items="annualCards"
                :loading="busy"
                empty-icon="o_calendar_month"
                empty-title="No contributions for this year"
                empty-sub="Nothing has been posted for the selected year yet. Pick another year above."
              />
            </template>

            <!-- By department -->
            <template v-else-if="activeTab === 'department'">
              <DepartmentSummaryTable
                v-if="!isNarrow"
                :rows="filteredDepartments"
                :loading="busy"
                :is-filtered="!!search"
                @clear-filters="search = ''"
              />
              <ContributionCardList
                v-else
                :items="departmentCards"
                :loading="busy"
                :is-filtered="!!search"
                empty-icon="o_apartment"
                empty-title="No department contributions"
                empty-sub="Nothing has been posted for this month. Try another month or year."
                @clear-filters="search = ''"
              />
            </template>

            <!-- By employee -->
            <template v-else>
              <EmployeeSummaryTable
                v-if="!isNarrow"
                :rows="filteredEmployees"
                :loading="busy"
                :is-filtered="!!search"
                :period-label="periodLabel"
                @clear-filters="search = ''"
              />
              <ContributionCardList
                v-else
                :items="employeeCards"
                :loading="busy"
                :is-filtered="!!search"
                empty-icon="o_person"
                empty-title="No employee contributions"
                empty-sub="Nothing has been posted for this month. Try another month or year."
                @clear-filters="search = ''"
              />
            </template>
          </div>
        </transition>
      </section>
    </div>
  </PageShell>
</template>

<script setup>
/**
 * CONTRIBUTIONS
 * ----------------------------------------------------------------------------
 * Statutory contributions for a company, in three views of one period: the year
 * month by month, the month person by person, and the month department by
 * department.
 *
 * Rebuilt on the app design system (src/css/dashboard.scss) to match Employees,
 * Attendance and Disbursement. What changed, and why:
 *
 *   - One card holding header / tabs / table became a page header, a summary
 *     strip and a single detail panel. The period selects governed all three
 *     views but sat in the header of the card, reading as if they filtered only
 *     what was directly below them.
 *   - The page gave no totals at all: the answer to "how much is outstanding
 *     this month" had to be summed by eye down a column. Four tiles now carry
 *     scope, due, deducted and still-owed, plus the collected share.
 *   - Every colour was a literal hex (#0f172a, #f8fafc, #102335…) duplicated
 *     across four files. All of it is tokens now, so density and palette retune
 *     with the rest of the app.
 *   - Tablet was unusable: seven to eight numeric columns held at every width
 *     behind a horizontal scrollbar, with the type shrunk to 9–11px to fit.
 *     Below 1024px the tables are replaced by a card list at full size.
 *
 * Fetching: the three endpoints are independent, so all three load on mount and
 * whenever company or period changes, and switching tabs no longer refires the
 * request for the tab being opened — the data is already there. `busy` tracks
 * the batch, because the composable's own `loading` clears when the *first* of
 * the three settles.
 */
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { useDeductions } from 'src/composables/page/useDeductions'
import { formatCurrency } from 'src/composables/utils/format'
import { getAvatarColor, getInitials } from 'src/composables/utils/attendance'
import {
  balanceOf,
  collectedPct,
  collectedTone,
  deductedOf,
  dueOf,
  formatPesoRounded,
  num,
  sumBy,
} from 'src/composables/utils/contributions'
import PageShell from '@/components/layout/PageShell.vue'
import DeductionsTabPills from '@/components/pages/Deductions/DeductionsTabPills.vue'
import AnnualSummaryTable from '@/components/pages/Deductions/AnnualSummaryTable.vue'
import EmployeeSummaryTable from '@/components/pages/Deductions/EmployeeSummaryTable.vue'
import DepartmentSummaryTable from '@/components/pages/Deductions/DepartmentSummaryTable.vue'
import ContributionCardList from '@/components/pages/Deductions/ContributionCardList.vue'

const $q = useQuasar()
const { companyId } = useCompany()
const {
  annualContributions,
  employeeContributions,
  departmentContributions,
  error,
  clearError,
  fetchAnnualContributions,
  fetchEmployeeContributions,
  fetchDepartmentContributions,
} = useDeductions()

const activeTab = ref('annual')
const search = ref('')
const searchRef = ref(null)
const busy = ref(false)

// Cards below 1024px, tables above — the same threshold Attendance uses.
const isNarrow = computed(() => $q.screen.lt.md)

const now = new Date()
const period = reactive({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
})

const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

const yearOptions = computed(() => {
  const years = []
  for (let y = currentYear; y >= currentYear - 10; y--) {
    years.push({ label: String(y), value: y })
  }
  return years
})

const monthOptions = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

const monthLabel = computed(() => monthOptions.find((m) => m.value === period.month)?.label ?? '')
const periodLabel = computed(() => `${monthLabel.value} ${period.year}`)
const isCurrentPeriod = computed(() => period.year === currentYear && period.month === currentMonth)

// ── Search ──────────────────────────────────────────────────────────────────
// The annual view is twelve rows; searching them would be theatre.
const searchable = computed(() => activeTab.value !== 'annual')

function matches(haystack) {
  return String(haystack ?? '')
    .toLowerCase()
    .includes(search.value.trim().toLowerCase())
}

const filteredEmployees = computed(() => {
  if (!search.value.trim()) return employeeContributions.value
  return employeeContributions.value.filter((r) => matches(r.employee_name))
})

const filteredDepartments = computed(() => {
  if (!search.value.trim()) return departmentContributions.value
  return departmentContributions.value.filter((r) => matches(r.department))
})

const tabCounts = computed(() => ({
  department: departmentContributions.value.length,
  employee: employeeContributions.value.length,
}))

// ── Summary ─────────────────────────────────────────────────────────────────
/** Rows behind the current view, so the tiles always describe what is on screen. */
const activeRows = computed(() => {
  if (activeTab.value === 'annual') return annualContributions.value
  if (activeTab.value === 'department') return filteredDepartments.value
  return filteredEmployees.value
})

const totals = computed(() => {
  const rows = activeRows.value
  const due = sumBy(rows, dueOf)
  const deducted = sumBy(rows, deductedOf)
  const balance = sumBy(rows, balanceOf)
  return { due, deducted, balance, pct: collectedPct(deducted, due) }
})

const scopeTile = computed(() => {
  if (activeTab.value === 'annual') {
    return { label: 'Months posted', value: String(annualContributions.value.length) }
  }
  if (activeTab.value === 'department') {
    const n = filteredDepartments.value.length
    return { label: n === 1 ? 'Department' : 'Departments', value: String(n) }
  }
  const n = filteredEmployees.value.length
  return { label: n === 1 ? 'Employee' : 'Employees', value: String(n) }
})

const tiles = computed(() => [
  {
    key: 'scope',
    label: scopeTile.value.label,
    value: scopeTile.value.value,
    mark: 'var(--dash-cat-1)',
    foot: activeTab.value === 'annual' ? String(period.year) : periodLabel.value,
  },
  {
    key: 'due',
    label: 'Total due',
    value: formatPesoRounded(totals.value.due),
    mark: 'var(--dash-neutral-mark)',
    foot: 'Employee share',
  },
  {
    key: 'deducted',
    label: 'Deducted',
    value: formatPesoRounded(totals.value.deducted),
    mark: 'var(--dash-cat-2)',
    foot: 'Withheld through payroll',
  },
  {
    key: 'balance',
    label: 'Undeducted',
    value: formatPesoRounded(totals.value.balance),
    mark: 'var(--dash-warn-mark)',
    valueClass: totals.value.balance > 0 ? 'is-owed' : '',
    foot: 'Still outstanding',
  },
  {
    key: 'collected',
    label: 'Collected',
    value: totals.value.pct == null ? '—' : `${totals.value.pct.toFixed(1)}%`,
    mark: `var(--dash-${collectedTone(totals.value.pct)}-mark)`,
    valueClass: `is-${collectedTone(totals.value.pct)}`,
  },
])

const headSummary = computed(() => {
  if (busy.value) return 'Loading contributions…'
  if (activeTab.value === 'annual') {
    const n = annualContributions.value.length
    return n
      ? `${n} ${n === 1 ? 'month' : 'months'} posted in ${period.year}`
      : `Nothing posted in ${period.year}`
  }
  const n =
    activeTab.value === 'employee'
      ? employeeContributions.value.length
      : departmentContributions.value.length
  const noun = activeTab.value === 'employee' ? 'employee' : 'department'
  return n
    ? `${n} ${n === 1 ? noun : noun + 's'} · ${periodLabel.value}`
    : `Nothing posted for ${periodLabel.value}`
})

// ── Card rows (tablet and below) ────────────────────────────────────────────
// Formatting happens here rather than in the card component, so the cards stay
// a presentation shell shared by all three views.
const annualCards = computed(() =>
  annualContributions.value.map((row) => ({
    key: row.month,
    title: row.month,
    subtitle: `${num(row.employees).toLocaleString('en-PH')} employees · ${num(
      row.no_of_payroll_deduction_cases,
    ).toLocaleString('en-PH')} deduction cases`,
    rate: rateFor(row),
    metrics: [
      {
        label: 'Employee share due',
        value: formatCurrency(row.total_contribution_due_employee_share),
        strong: true,
      },
      { label: 'Deducted', value: formatCurrency(row.total_deduction_employee_share) },
      { label: 'Undeducted', value: formatCurrency(row.undeducted_balance_employee_share) },
      { label: 'Total due (all)', value: formatCurrency(row.total_contributions_due) },
    ],
  })),
)

const employeeCards = computed(() =>
  filteredEmployees.value.map((row, i) => ({
    key: row.employee_id ?? row.employee ?? `${row.employee_name}-${i}`,
    title: row.employee_name,
    subtitle: `${num(row.no_of_payroll_deduction_cases).toLocaleString('en-PH')} deduction cases · ${periodLabel.value}`,
    avatar: {
      initials: getInitials(row.employee_name),
      color: getAvatarColor(row.employee_name),
    },
    rate: rateFor(row),
    metrics: [
      {
        label: 'Employee share due',
        value: formatCurrency(row.total_contribution_due_employee_share),
        strong: true,
      },
      { label: 'Deducted', value: formatCurrency(row.total_deduction_employee_share) },
      { label: 'Undeducted', value: formatCurrency(row.undeducted_balance_employee_share) },
      { label: 'Total due (all)', value: formatCurrency(row.total_contributions_due) },
    ],
    details: (row.breakdown_data || row.details || row.contributions || []).map((d) => ({
      name: d.contribution_name || d.name || '—',
      due: formatCurrency(d.employee_share_due),
      deducted: formatCurrency(d.employee_share_deducted),
      undeducted: formatCurrency(d.undeducted_balance),
    })),
  })),
)

const departmentCards = computed(() =>
  filteredDepartments.value.map((row, i) => ({
    key: `${row.department}-${i}`,
    title: row.department,
    subtitle: `${num(row.employee_count).toLocaleString('en-PH')} employees · ${periodLabel.value}`,
    chip: row.status ? { label: String(row.status), tone: departmentTone(row.status) } : null,
    rate: rateFor(row, row.rate),
    metrics: [
      { label: 'Total due', value: formatCurrency(row.total_contributions_due), strong: true },
      { label: 'Deducted', value: formatCurrency(row.total_deduction) },
      { label: 'Balance', value: formatCurrency(row.balance) },
      { label: 'Employees', value: num(row.employee_count).toLocaleString('en-PH') },
    ],
  })),
)

function rateFor(row, explicitRate) {
  const pct =
    explicitRate !== null && explicitRate !== undefined && explicitRate !== ''
      ? num(explicitRate)
      : collectedPct(deductedOf(row), dueOf(row))
  if (pct == null) return null
  return { pct, tone: collectedTone(pct) }
}

function departmentTone(status) {
  switch (String(status).toLowerCase()) {
    case 'complete':
    case 'completed':
      return 'good'
    case 'incomplete':
      return 'warn'
    default:
      return ''
  }
}

// ── Data ────────────────────────────────────────────────────────────────────
function cid() {
  return Number(companyId.value)
}

async function fetchAll() {
  const id = cid()
  if (!id) return
  busy.value = true
  try {
    await Promise.all([
      fetchAnnualContributions(id, period.year),
      fetchEmployeeContributions(id, period.year, period.month),
      fetchDepartmentContributions(id, period.year, period.month),
    ])
  } finally {
    busy.value = false
  }
}

function refresh() {
  clearError()
  fetchAll()
}

function resetPeriod() {
  period.year = currentYear
  period.month = currentMonth
}

watch([() => companyId.value, () => period.year, () => period.month], fetchAll)

// A search typed against one list should not silently filter the next one.
// Focus is deliberately not moved into the new search box — a view switch is
// not a request to start typing.
watch(activeTab, () => {
  search.value = ''
})

// "/" focuses search, matching the other list pages.
function onGlobalKey(e) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
  if (!searchable.value) return
  e.preventDefault()
  searchRef.value?.focus()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
  fetchAll()
})

onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<style scoped>
.ded-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.ded-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.ded-head__titles {
  min-width: 0;
}

.ded-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.ded-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Period ── */
.ded-period {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ded-period__field :deep(.q-field__control) {
  height: 36px;
  min-height: 36px;
  padding: 0 8px 0 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.ded-period__field :deep(.q-field__native) {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  padding: 0;
  min-height: 36px;
}
.ded-period__field :deep(.q-field__marginal) {
  height: 36px;
  min-width: 0;
  padding: 0;
  color: var(--dash-ink-4);
}
.ded-period__field :deep(.q-field__prepend) {
  padding-right: 7px;
}

.ded-period__field--year {
  width: 124px;
}
.ded-period__field--month {
  width: 148px;
}

.ded-period__reset {
  color: var(--dash-accent);
  font-weight: 600;
  padding: 0 8px;
}

/* ── Summary tiles ── */
.ded-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  gap: 10px;
}

.ded-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 12px 14px 13px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
}

.ded-stat__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.ded-stat__mark {
  width: 3px;
  height: 11px;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}

.ded-stat__label {
  font-size: 12px;
  color: var(--dash-ink-3);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ded-stat__value {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.022em;
  line-height: 1.15;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ded-stat__value.is-owed {
  color: var(--dash-warn);
}
.ded-stat__value.is-good {
  color: var(--dash-good);
}
.ded-stat__value.is-info {
  color: var(--dash-info);
}
.ded-stat__value.is-warn {
  color: var(--dash-warn);
}
.ded-stat__value.is-critical {
  color: var(--dash-critical);
}

.ded-stat__foot {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Layout, tone and stripes all come from the design system's `.dash-bar__*`
   classes — the tile adds only the space around the bar. */
.ded-stat__bar {
  padding: 4px 0 2px;
}

.ded-stat__sk {
  width: 64px;
  height: 17px;
}

/* ── Error ── */
.ded-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
}

.ded-alert__icon {
  color: var(--dash-critical-mark);
  flex-shrink: 0;
}

.ded-alert__text {
  flex: 1;
  margin: 0;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-critical);
}

.ded-alert__btn {
  color: var(--dash-critical);
  font-weight: 600;
  padding: 0 8px;
}

.ded-alert__close {
  color: var(--dash-critical);
}

/* ── Detail panel ── */
.ded-panel {
  overflow: hidden;
}

.ded-panel__head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

.ded-panel__tools {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  min-width: 0;
}

.ded-search {
  width: 240px;
}
.ded-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.ded-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.ded-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.ded-refresh {
  color: var(--dash-ink-4);
}
.ded-refresh:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

.ded-view {
  min-height: 220px;
}

/* Views cross-fade rather than sliding: the three tables are different widths,
   and a horizontal slide between them drags a scrollbar across the panel. */
.ded-swap-enter-active,
.ded-swap-leave-active {
  transition: opacity var(--dash-fast) var(--dash-ease);
}
.ded-swap-enter-from,
.ded-swap-leave-to {
  opacity: 0;
}

/* ============================================================================
   RESPONSIVE
   ----------------------------------------------------------------------------
     >= 1440   full tables — headcount and the combined employer+employee total
               are visible on annual and employee
     1280-1439 those two columns drop; deduction cases stay
     1024-1279 cases drop as well, leaving the four figures that matter plus the
               collected bar; cell padding tightens
     < 1024    tablet portrait — the tables give way to the card list, the period
               selects and the segmented tabs go full width
     < 600     one card per row, tiles two-up, search full width

   The old page had none of this: the same eight columns at every width, with
   9–11px type and a horizontal scrollbar doing the work.
   ========================================================================== */
@media (max-width: 1279px) {
  .ded-search {
    width: 200px;
  }
}

@media (max-width: 1023px) {
  .ded-head {
    align-items: stretch;
  }
  .ded-head__title {
    font-size: 20px;
  }
  .ded-period {
    width: 100%;
  }
  .ded-period__field--year,
  .ded-period__field--month {
    flex: 1 1 0;
    width: auto;
  }
  .ded-stats {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  .ded-panel__head {
    padding: 10px 14px;
    gap: 10px;
  }
  /* The segmented control takes the first line on its own; search and refresh
     share the second. */
  .ded-panel__tools {
    width: 100%;
    margin-left: 0;
  }
  .ded-search {
    flex: 1;
    width: auto;
  }
}

@media (max-width: 599px) {
  .ded-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ded-stat__value {
    font-size: 17px;
  }
  .ded-period {
    flex-wrap: wrap;
  }
  .ded-period__reset {
    width: 100%;
  }
  .ded-alert {
    flex-wrap: wrap;
  }
  .ded-alert__text {
    flex: 1 1 100%;
    order: 3;
  }
}
</style>

<style>
/* Select popups and header tooltips teleport to the body, so they sit outside
   this component's style scope. */
.ded-popup {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  padding: 4px;
}
.ded-popup .q-item {
  min-height: 32px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.ded-popup .q-item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.ded-popup .q-item--active {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}

.ded-tip {
  max-width: 240px;
  padding: 7px 10px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-800);
  font-size: 12px;
  line-height: 1.45;
}
</style>
