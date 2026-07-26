<template>
  <PageShell full-height flex-column>
    <q-inner-loading :showing="pageLoading" color="primary" />

    <!-- Header: title + segmented view toggle (Current / Monthly / Annual) -->
    <div class="dash-header">
      <div class="dash-header-left">
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
      <div class="dash-header-right">
        <q-input
          v-if="activeView === 'today'"
          v-model="todayDate"
          dense outlined class="date-picker" readonly
        >
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale"
                anchor="bottom left" self="top left">
                <q-date v-model="todayDate" mask="YYYY-MM-DD" />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>

        <template v-if="activeView === 'current'">
          <q-toggle
            v-model="hideCompleted"
            dense label="Hide completed"
            class="hide-completed-toggle" size="sm"
          />
          <span class="cutoff-label">Cutoff</span>
          <q-select
            v-if="cutoffOptions.length"
            v-model="selectedCutoff" :options="cutoffOptions"
            dense outlined class="cutoff-picker"
            emit-value map-options placeholder="Select period"
          >
            <template v-slot:append>
              <q-icon name="date_range" />
            </template>
          </q-select>
          <span v-if="secondaryCutoffNotice" class="cutoff-notice">
            {{ secondaryCutoffNotice }}
          </span>
        </template>

        <div class="last-sync">
          <q-icon name="sync" size="14px" />
          Data as of {{ formattedToday }}
        </div>
      </div>
    </div>

    <!-- Top KPI stats row — hidden for current cutoff tab (has its own inside) -->
    <DashboardStatsRow
      v-if="activeView !== 'current'"
      :stats-cards="activeView === 'today' ? currentStatsCards : statsCards"
      :page-loading="activeView === 'today' ? currentCutoffLoading : pageLoading"
    />

    <div v-if="activeView === 'annual'" class="annual-note">
      <q-icon name="check_circle" size="16px" color="positive" class="q-mr-sm" />
      {{ annualSummary.closedMonthsCount ?? 0 }} of 12 scheduled cutoffs completed
    </div>

    <!-- Tabbed payroll summary section -->
    <div class="summary-section" :class="{ 'summary-section--current': activeView === 'current' }">
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
const {
  fetchLeaveRequests,
  fetchOvertimeRequests,
  fetchCashAdvanceRequests,
} = useRequests()

// ── Payroll summary / 13th-month-pay data ──
const {
  monthlySummaries,
  annualSummary,
  thirteenthMonthPay,
  monthlyTrendSeries,
  componentBreakdown,
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
  console.log('[Dashboard] Date changed to', newDate)
  const cid = resolvedCompanyId()
  if (cid && activeView.value === 'today') {
    fetchTodayTabData(cid, newDate)
  }
})

// ─── Page-level loading ─────────────────────────────────────────────────────
const pageLoading = ref(true)

// ─── Helpers ────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Stats cards — tab-aware ────────────────────────────────────────────────
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
        iconBg: '#e8f0fe',
        iconColor: '#1a73e8',
        valueColor: '#1a73e8',
      },
      {
        icon: 'groups',
        label: 'Employees Paid',
        count: 40,
        iconBg: '#e6f6ea',
        iconColor: '#22c55e',
        valueColor: '#22c55e',
      },
      {
        icon: 'groups_2',
        label: 'Payroll Groups',
        count: 6,
        iconBg: '#ede9fe',
        iconColor: '#8b5cf6',
        valueColor: '#8b5cf6',
      },
      {
        icon: 'account_balance',
        label: 'Total Released',
        count: '₱1,444,100',
        iconBg: '#e0f7fa',
        iconColor: '#0e7490',
        valueColor: '#0e7490',
      },
      {
        icon: 'person',
        label: 'Average Payroll / Employee',
        count: '₱36,103',
        iconBg: '#fff7ed',
        iconColor: '#f97316',
        valueColor: '#f97316',
      },
    ]
  }

  // Annual
  return [
    {
      icon: 'payments',
      label: 'Total Payroll',
      count: '₱8,120,400',
      subtitle: 'Year-to-Date',
      iconBg: '#e8f0fe',
      iconColor: '#1a73e8',
      valueColor: '#1a73e8',
    },
    {
      icon: 'attach_money',
      label: 'Total Employee-Related Cash Released',
      count: '₱8,614,900',
      subtitle: 'Year-to-Date',
      iconBg: '#e0f7fa',
      iconColor: '#0e7490',
      valueColor: '#0e7490',
    },
    {
      icon: 'people',
      label: 'Unique Employees Paid',
      count: 46,
      subtitle: 'Year-to-Date',
      iconBg: '#ede9fe',
      iconColor: '#8b5cf6',
      valueColor: '#8b5cf6',
    },
    {
      icon: 'trending_up',
      label: 'Average Monthly Payroll',
      count: '₱1,353,400',
      subtitle: 'Year-to-Date',
      iconBg: '#fff8e1',
      iconColor: '#f59e0b',
      valueColor: '#f59e0b',
    },
    {
      icon: 'person',
      label: 'Average Payroll per Employee',
      count: '₱176,530',
      subtitle: 'Year-to-Date',
      iconBg: '#e0f7fa',
      iconColor: '#0e7490',
      valueColor: '#0e7490',
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
  await Promise.allSettled([
    fetchLeaveRequests(),
    fetchOvertimeRequests(),
  ])
  if (cid) {
    await Promise.allSettled([fetchCashAdvanceRequests(cid)])
  }
  pageLoading.value = false
})
</script>

<style scoped>
/* ── Header ── */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.dash-header-left,
.dash-header-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.view-toggle {
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  overflow: hidden;
}
.date-picker {
  min-width: 180px;
}
.date-picker :deep(.q-field__control) {
  border-radius: 8px;
  min-height: 38px;
  background: #ffffff;
  cursor: pointer;
}
.date-picker :deep(.q-field__append) {
  cursor: pointer;
}
.last-sync {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: #9ca3af;
  white-space: nowrap;
}

/* ── Layout ── */
.summary-section {
  margin: 14px 0;
}
.summary-section--current {
  margin: 0;
}
.annual-note {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #374151;
  margin-top: -6px;
  margin-bottom: 8px;
}

/* ── Cutoff dashboard header controls ── */
.hide-completed-toggle {
  margin-right: 8px;
  font-size: 12px;
}
.cutoff-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-right: 4px;
  white-space: nowrap;
}
.cutoff-picker {
  min-width: 160px;
  max-width: 220px;
  margin-right: 8px;
}
.cutoff-picker :deep(.q-field__native) {
  font-size: 12px;
}
.cutoff-notice {
  font-size: 12px;
  color: #b91c1c;
  background: #fef2f2;
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
  font-weight: 500;
}

/* ── Responsive: 1024px (tablet / small laptop) ── */
@media (max-width: 1024px) {
  .dash-header {
    gap: 10px;
  }
}

/* ── Responsive: 768px (mobile) ── */
@media (max-width: 768px) {
  .dash-header {
    flex-direction: column;
    align-items: stretch;
  }
  .dash-header-left,
  .dash-header-right {
    width: 100%;
  }
  .dash-header-right {
    justify-content: space-between;
  }
  .view-toggle {
    width: 100%;
  }
  .view-toggle :deep(.q-btn-group) {
    width: 100%;
  }
  .view-toggle :deep(.q-btn) {
    font-size: 11px;
    padding: 6px 8px;
    flex: 1;
  }
  .date-picker {
    min-width: 0;
    flex: 1;
  }
  .dash-title {
    font-size: 18px;
  }
  .last-sync {
    display: none;
  }
}
</style>

<style>
/* Dashboard toggle — matches MainLayout company-tab-active exactly */
.view-toggle .q-btn.bg-primary {
  background: #102335 !important;
  border-color: #102335 !important;
  box-shadow: 0 2px 8px rgba(16, 35, 53, 0.3) !important;
}
</style>
