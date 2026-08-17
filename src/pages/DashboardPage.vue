<template>
  <PageShell full-height flex-column>
    <!-- ── Header: tab rail + the controls that belong to the active tab ──── -->
    <header class="dash-header">
      <div class="dash-header__lead">
        <q-btn-toggle
          v-model="activeView"
          class="view-toggle"
          no-caps
          unelevated
          toggle-color="primary"
          color="white"
          text-color="grey-8"
          :options="[
            { label: 'Today', value: 'today' },
            { label: 'Current Cutoff', value: 'current' },
            { label: 'Monthly Summary', value: 'monthly' },
            { label: 'Annual Summary', value: 'annual' },
          ]"
        />
      </div>

      <div class="dash-header__controls">
        <template v-if="activeView === 'today'">
          <label class="control">
            <span class="dash-eyebrow control__label">Date</span>
            <q-input
              v-model="todayDate"
              dense
              outlined
              readonly
              class="control__field control__field--date dash-field"
            >
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy
                    cover
                    transition-show="scale"
                    transition-hide="scale"
                    anchor="bottom left"
                    self="top left"
                  >
                    <q-date v-model="todayDate" mask="YYYY-MM-DD" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </label>
        </template>

        <template v-if="activeView === 'current'">
          <label v-if="cutoffOptions.length" class="control">
            <span class="dash-eyebrow control__label">Cutoff</span>
            <q-select
              v-model="selectedCutoff"
              :options="cutoffOptions"
              dense
              outlined
              emit-value
              map-options
              class="control__field control__field--select dash-field"
              placeholder="Select period"
            >
              <template v-slot:append>
                <q-icon name="date_range" />
              </template>
            </q-select>
          </label>
          <q-toggle v-model="hideCompleted" dense size="sm" label="Hide completed" class="control__toggle" />
          <span v-if="secondaryCutoffNotice" class="dash-chip dash-chip--critical">
            <span class="dash-chip__dot" />
            {{ secondaryCutoffNotice }}
          </span>
        </template>

        <template v-if="activeView === 'monthly'">
          <label v-if="monthOptions.length" class="control">
            <span class="dash-eyebrow control__label">Month</span>
            <q-select
              v-model="selectedMonth"
              :options="monthOptions"
              dense
              outlined
              emit-value
              map-options
              class="control__field control__field--select dash-field"
            />
          </label>
        </template>

        <template v-if="activeView === 'annual'">
          <span class="dash-chip dash-chip--good">
            <q-icon name="event_available" size="12px" />
            {{ annualSummary.closedMonthsCount ?? 0 }} of 12 cutoffs closed
          </span>
        </template>

        <p class="last-sync">
          <q-icon name="sync" size="13px" />
          <span>Data as of {{ formattedToday }}</span>
        </p>
      </div>
    </header>

    <!-- ── Top KPI row. The Current Cutoff tab carries its own, tuned to that
         cutoff, so it is suppressed here rather than shown twice. ────────── -->
    <DashboardStatsRow
      v-if="activeView !== 'current'"
      :stats-cards="activeView === 'today' ? currentStatsCards : statsCards"
      :page-loading="activeView === 'today' ? currentCutoffLoading : false"
    />

    <!-- ── Active tab. Scrolls in its own right so the header and KPI row stay
         put — PageShell clips at 100vh, which previously cut the taller
         Monthly and Annual tabs off at the bottom of the viewport. ───────── -->
    <div class="summary-section">
      <keep-alive>
        <TodayTab
          v-if="activeView === 'today'"
          :loading="currentCutoffLoading"
          :priority-items="priorityItems"
          :attention-summary="needsAttention"
          :workforce-status="workforceStatus"
          :pending-requests="pendingRequests"
        />
        <CurrentCutoffTab
          v-else-if="activeView === 'current'"
          :fmt-currency="fmtCurrencyPeso"
          :loading="summaryLoading || currentCutoffLoading"
          :cutoff-stats="cutoffStats"
          :payout-group-details="payoutGroupDetails"
          :cutoff-summary-rollup="cutoffSummaryRollup"
          :cutoff-status-summary="cutoffStatusSummary"
          :previous-cutoff-incomplete="previousCutoffIncomplete"
          :hide-completed="hideCompleted"
        />
        <MonthlySummaryTab
          v-else-if="activeView === 'monthly'"
          :months="monthlySummaries"
          :selected-month="selectedMonth"
          :monthly-trend-series="monthlyTrendSeries"
          :thirteenth-month-pay="thirteenthMonthPay"
          :component-breakdown="componentBreakdown"
          :payroll-by-company="payrollByCompany"
          :payment-channels="paymentChannels"
          :employee-releases="employeeReleases"
          :fmt-currency="fmtCurrencyPeso"
          :today="formattedToday"
          :loading="summaryLoading"
        />
        <AnnualSummaryTab
          v-else
          :annual="annualSummary"
          :trend-labels="monthlyTrendSeries.map((m) => m.label)"
          :trend-values="monthlyTrendSeries.map((m) => m.value)"
          :thirteenth-month-pay="thirteenthMonthPay"
          :component-breakdown="componentBreakdown"
          :monthly-comparison="monthlyComparison"
          :payroll-by-company="payrollByCompany"
          :employee-releases="employeeReleases"
          :payment-channels="paymentChannels"
          :annual-indicators="annualIndicators"
          :ytd-comparison="ytdComparison"
          :fmt-currency="fmtCurrencyPeso"
          :loading="summaryLoading"
        />
      </keep-alive>
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, computed, watch, onMounted } from 'vue'
import { useEmployees } from '@/composables/page/useEmployees'
import { useAttendance } from '@/composables/page/useAttendance'
import { usePayroll } from '@/composables/page/usePayroll'
import { useRequests } from '@/composables/page/useRequests'
import { useCompany, resolvedCompanyId } from '@/composables/page/useCompany'
import { useNotifications } from 'src/composables/useNotifications'
import { useDashboardSummary } from '@/composables/page/useDashboardSummary'

import DashboardStatsRow from '@/components/pages/Dashboard/DashboardStatsRow.vue'
import TodayTab from '@/components/pages/Dashboard/TodayTab.vue'
import CurrentCutoffTab from '@/components/pages/Dashboard/CurrentCutoffTab.vue'
import MonthlySummaryTab from '@/components/pages/Dashboard/MonthlySummaryTab.vue'
import AnnualSummaryTab from '@/components/pages/Dashboard/AnnualSummaryTab.vue'

// ─── Composables ─────────────────────────────────────────────────────────────
useCompany()

const { fetchEmployees } = useEmployees()
const { fetchAttendanceByDate } = useAttendance()
const { fetchPayrollRunsSummary } = usePayroll()
const { onDataUpdate } = useNotifications()
const { fetchLeaveRequests, fetchOvertimeRequests, fetchCashAdvanceRequests } = useRequests()

// ── Payroll summary / 13th-month-pay data ──
const {
  monthlySummaries,
  annualSummary,
  thirteenthMonthPay,
  monthlyTrendSeries,
  componentBreakdown,
  payrollByCompany,
  paymentChannels,
  employeeReleases,
  monthlyComparison,
  annualIndicators,
  ytdComparison,
  fmtCurrency: fmtCurrencyPeso,
  today: summaryToday,
  loading: summaryLoading,
  currentCutoffLoading,
  fetchDashboardSummary,
  fetchCurrentCutoff,
  // current-cutoff panels
  needsAttention,
  currentStatsCards,
  // today tab data
  priorityItems,
  workforceStatus,
  pendingRequests,
  todayDate,
  fetchTodayTabData,
  // new cutoff dashboard data
  cutoffStats,
  payoutGroupDetails,
  cutoffSummaryRollup,
  cutoffStatusSummary,
  previousCutoffIncomplete,
  hideCompleted,
  selectedCutoff,
  cutoffOptions,
  secondaryCutoffNotice,
} = useDashboardSummary()

const activeView = ref('today')
const formattedToday = computed(() =>
  summaryToday.value?.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
)

watch(todayDate, (newDate) => {
  const cid = resolvedCompanyId()
  if (cid && activeView.value === 'today') {
    fetchTodayTabData(cid, newDate)
  }
})

// ─── Monthly Summary — month picker (lives in the header) ────────────────────
const selectedMonth = ref(null)
const monthOptions = computed(() =>
  monthlySummaries.value.map((m) => ({ label: m.label, value: m.month })),
)
watch(
  monthlySummaries,
  (list) => {
    if (list.length && !list.find((m) => m.month === selectedMonth.value)) {
      selectedMonth.value = list[list.length - 1].month
    }
  },
  { immediate: true },
)

// ─── Helpers ────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Stats cards — tab-aware ────────────────────────────────────────────────
// Colours reference the validated categorical ramp in src/css/dashboard.scss and
// are assigned in fixed order, so a card keeps its hue regardless of the tab.
const statsCards = computed(() => {
  if (activeView.value === 'current') {
    return currentStatsCards.value
  }

  if (activeView.value === 'monthly') {
    return [
      {
        icon: 'payments',
        label: 'Total Payroll',
        count: '₱1,444,100',
        iconColor: 'var(--dash-cat-1)',
      },
      {
        icon: 'groups',
        label: 'Employees Paid',
        count: 40,
        iconColor: 'var(--dash-cat-2)',
      },
      {
        icon: 'groups_2',
        label: 'Payroll Groups',
        count: 6,
        iconColor: 'var(--dash-cat-4)',
      },
      {
        icon: 'account_balance',
        label: 'Total Released',
        count: '₱1,444,100',
        iconColor: 'var(--dash-cat-3)',
      },
      {
        icon: 'person',
        label: 'Average Payroll / Employee',
        count: '₱36,103',
        iconColor: 'var(--dash-cat-5)',
      },
    ]
  }

  // Annual
  return [
    {
      icon: 'payments',
      label: 'Total Payroll',
      count: '₱8,120,400',
      subtitle: 'Year to date',
      iconColor: 'var(--dash-cat-1)',
    },
    {
      icon: 'attach_money',
      label: 'Employee-Related Cash Released',
      count: '₱8,614,900',
      subtitle: 'Year to date',
      iconColor: 'var(--dash-cat-2)',
    },
    {
      icon: 'people',
      label: 'Unique Employees Paid',
      count: 46,
      subtitle: 'Year to date',
      iconColor: 'var(--dash-cat-4)',
    },
    {
      icon: 'trending_up',
      label: 'Average Monthly Payroll',
      count: '₱1,353,400',
      subtitle: 'Year to date',
      iconColor: 'var(--dash-cat-5)',
    },
    {
      icon: 'person',
      label: 'Average Payroll per Employee',
      count: '₱176,530',
      subtitle: 'Year to date',
      iconColor: 'var(--dash-cat-3)',
    },
  ]
})

// ─── Bootstrap ───────────────────────────────────────────────────────────────
onMounted(async () => {
  const cid = resolvedCompanyId()

  onDataUpdate('attendance', () => fetchAttendanceByDate(today()))
  onDataUpdate('leave', () => fetchLeaveRequests())
  onDataUpdate('overtime', () => fetchOvertimeRequests())

  await fetchDashboardSummary({ company_id: cid })

  await fetchCurrentCutoff(cid)

  await Promise.allSettled([
    fetchEmployees(),
    fetchAttendanceByDate(today()),
    fetchPayrollRunsSummary({ company_id: cid }),
    fetchTodayTabData(cid, todayDate.value),
  ])
  await Promise.allSettled([fetchLeaveRequests(), fetchOvertimeRequests()])
  if (cid) {
    await Promise.allSettled([fetchCashAdvanceRequests(cid)])
  }
})
</script>

<style scoped>
/* ── Header ────────────────────────────────────────────────────────────────
   The tab rail owns the left edge; everything that scopes the active tab
   (date, cutoff, month) sits together on the right, so the controls read as
   belonging to the tab rather than to the page. */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  flex-shrink: 0;
}

.dash-header__lead {
  min-width: 0;
}

.dash-header__controls {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  flex-wrap: wrap;
}

/* ── Contextual controls ── */
.control {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.control__label {
  padding-left: 1px;
}

.control__field :deep(.q-field__control) {
  min-height: 36px;
  height: 36px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
  box-shadow: var(--dash-shadow-xs);
}
/* Border, hover and focus ring all come from `.dash-field` in the design system,
   which also removes Quasar's second `:after` outline so focus is a single
   1px border plus a halo rather than two stacked borders. */
.control__field :deep(.q-field__native),
.control__field :deep(.q-field__input) {
  font-size: 13px;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
}
.control__field :deep(.q-field__marginal) {
  height: 36px;
  color: var(--dash-ink-4);
}
.control__field--date {
  width: 158px;
}
.control__field--date :deep(.q-field__control),
.control__field--date :deep(.q-field__append) {
  cursor: pointer;
}
.control__field--select {
  width: 190px;
}

.control__toggle {
  font-size: 13px;
  color: var(--dash-ink-2);
  padding-bottom: 7px;
}

.last-sync {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* ── Active tab region ──
   PageShell pins the page to 100vh with overflow hidden, so the tab has to own
   its own scroll or the taller tabs get clipped at the fold. */
.summary-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  margin-top: 2px;
  padding-bottom: 4px;
  scrollbar-gutter: stable;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .dash-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .dash-header__lead,
  .dash-header__controls {
    width: 100%;
  }
  .dash-header__controls {
    justify-content: space-between;
  }
  .control__field--date,
  .control__field--select {
    width: 100%;
  }
  .control {
    flex: 1;
  }
  .last-sync {
    display: none;
  }
}
</style>

<style>
/* Dashboard tab rail. Intentionally unscoped: QBtnToggle renders its
   <button class="q-btn"> children outside this component's template, so scoped
   CSS cannot reach them without :deep() on every rule.

   A recessed grey track with a raised white pill for the active tab — the
   segmented control every current SaaS product uses, and a straight swap for
   the solid navy pill this replaced. Navy-on-grey read as a filled button
   sitting in a bar; white-on-grey reads as one surface lifted out of another,
   which is what a tab actually is. */
.view-toggle {
  background: var(--dash-n-100);
  border: 1px solid var(--dash-line);
  padding: 3px;
  border-radius: var(--dash-r-md);
  display: inline-flex;
  gap: 2px;
  flex-wrap: nowrap;
}

.view-toggle .q-btn {
  border-radius: var(--dash-r-sm) !important;
  padding: 7px 16px;
  min-height: unset;
  font-weight: 500;
  font-size: 13px;
  letter-spacing: -0.006em;
  transition: background-color var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease), box-shadow var(--dash-fast) var(--dash-ease);
  box-shadow: none;
  white-space: nowrap;
}

/* Quasar draws a focus/ripple helper via ::before; neutralise its shadow so the
   pills stay flat against the track. */
.view-toggle .q-btn::before {
  box-shadow: none;
}

.view-toggle .q-btn.bg-primary {
  background: var(--dash-surface) !important;
  color: var(--dash-ink) !important;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs) !important;
}

.view-toggle .q-btn.bg-white {
  background: transparent !important;
  color: var(--dash-ink-3) !important;
}

.view-toggle .q-btn.bg-white:hover {
  color: var(--dash-ink-2) !important;
}

.view-toggle .q-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dash-canvas), 0 0 0 4px var(--dash-accent-ring) !important;
}

.view-toggle .q-btn__content,
.view-toggle .q-btn .block {
  white-space: nowrap;
  flex-wrap: nowrap;
}

@media (max-width: 1024px) {
  .view-toggle {
    width: 100%;
  }
  .view-toggle .q-btn {
    font-size: 11px;
    padding: 6px 10px;
    flex: 1;
  }
}
</style>
