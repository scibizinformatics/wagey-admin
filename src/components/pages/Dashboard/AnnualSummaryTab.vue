<template>
  <div class="tab-grid">
    <!-- Row 1: Monthly Payroll Trend (2026) | YTD Payroll Breakdown -->
    <div class="row-weighted row-1">
      <MonthlyPayrollTrendPanel
        :title="`Monthly Payroll Trend (${annual.year})`"
        :labels="trendLabels"
        :values="trendValues"
        chart-type="bar"
        :loading="loading"
      />
      <YtdPayrollBreakdownPanel :breakdown="componentBreakdown(annual)" :loading="loading" />
    </div>

    <!-- Row 2: Monthly Comparison Table | Payroll by Company (donut) | Other Employee Releases YTD -->
    <div class="row-weighted row-2">
      <MonthlyComparisonTablePanel :months="monthlyComparison" :loading="loading" />
      <PayrollByCompanyDonutPanel :companies="ytdPayrollByCompany" :loading="loading" />
      <OtherEmployeeReleasesPanel :releases="ytdEmployeeReleases" :total="ytdEmployeeReleasesTotal" :loading="loading" />
    </div>

    <!-- Row 3: Payment Channel Summary | Key Annual Indicators | YTD Comparison -->
    <div class="row-three">
      <PaymentChannelsPanel :channels="ytdPaymentChannels" :total-row="ytdPaymentChannelsTotal" :loading="loading" />
      <KeyAnnualIndicatorsPanel :indicators="computedIndicators" :loading="loading" />
      <YtdComparisonPanel :data="ytdComparison" :loading="loading" />
    </div>

    <ThirteenthMonthPayPanel :data="thirteenthMonthPay" mode="annual" :loading="loading" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MonthlyPayrollTrendPanel from '@/components/pages/Dashboard/MonthlyPayrollTrendPanel.vue'
import YtdPayrollBreakdownPanel from '@/components/pages/Dashboard/YtdPayrollBreakdownPanel.vue'
import MonthlyComparisonTablePanel from '@/components/pages/Dashboard/MonthlyComparisonTablePanel.vue'
import PayrollByCompanyDonutPanel from '@/components/pages/Dashboard/PayrollByCompanyDonutPanel.vue'
import OtherEmployeeReleasesPanel from '@/components/pages/Dashboard/OtherEmployeeReleasesPanel.vue'
import PaymentChannelsPanel from '@/components/pages/Dashboard/PaymentChannelsPanel.vue'
import KeyAnnualIndicatorsPanel from '@/components/pages/Dashboard/KeyAnnualIndicatorsPanel.vue'
import YtdComparisonPanel from '@/components/pages/Dashboard/YtdComparisonPanel.vue'
import ThirteenthMonthPayPanel from '@/components/pages/Dashboard/ThirteenthMonthPayPanel.vue'

const props = defineProps({
  annual: { type: Object, required: true },
  trendLabels: { type: Array, required: true },
  trendValues: { type: Array, required: true },
  thirteenthMonthPay: { type: Object, required: true },
  componentBreakdown: { type: Function, required: true },
  monthlyComparison: { type: Array, default: () => [] },
  payrollByCompany: { type: Array, default: () => [] },
  employeeReleases: { type: Array, default: () => [] },
  paymentChannels: { type: Array, default: () => [] },
  annualIndicators: { type: Object, default: () => ({}) },
  ytdComparison: { type: Object, default: () => ({}) },
  fmtCurrency: { type: Function, required: true },
  loading: { type: Boolean, default: false },
})

const ytdPayrollByCompany = computed(() => {
  if (!props.payrollByCompany.length) return []
  return props.payrollByCompany[props.payrollByCompany.length - 1]?.companies ?? []
})

const ytdEmployeeReleases = computed(() => {
  if (!props.employeeReleases.length) return []
  return props.employeeReleases[props.employeeReleases.length - 1]?.releases ?? []
})

const ytdEmployeeReleasesTotal = computed(() => {
  if (!props.employeeReleases.length) return 0
  return props.employeeReleases[props.employeeReleases.length - 1]?.total ?? 0
})

const ytdPaymentChannels = computed(() => {
  if (!props.paymentChannels.length) return []
  return props.paymentChannels[props.paymentChannels.length - 1]?.channels ?? []
})

const ytdPaymentChannelsTotal = computed(() => {
  const channels = ytdPaymentChannels.value
  if (!channels.length) return null
  return {
    employees: channels.reduce((s, c) => s + (c.employees || 0), 0),
    amount: channels.reduce((s, c) => s + (c.amount || 0), 0),
  }
})

const computedIndicators = computed(() => {
  const ind = props.annualIndicators
  const list = []
  if (ind.highestPayrollMonth) {
    list.push({ icon: 'trending_up', label: 'Highest Payroll Month', value: ind.highestPayrollMonth, color: '#22c55e' })
  }
  if (ind.lowestPayrollMonth) {
    list.push({ icon: 'trending_down', label: 'Lowest Payroll Month', value: ind.lowestPayrollMonth, color: '#ef4444' })
  }
  if (ind.largestComponent) {
    list.push({ icon: 'pie_chart', label: 'Largest Component', value: ind.largestComponent, color: '#8b5cf6' })
  }
  if (ind.avgOvertimePercent) {
    list.push({ icon: 'schedule', label: 'OT % of Payroll', value: `${ind.avgOvertimePercent}%`, color: '#f97316' })
  }
  if (ind.avgMonthlyEmployeeCount) {
    list.push({ icon: 'people', label: 'Avg Monthly Employees', value: ind.avgMonthlyEmployeeCount, color: '#06b6d4' })
  }
  if (ind.avgMonthlyPayrollGrowth) {
    list.push({ icon: 'trending_up', label: 'Avg Monthly Growth', value: `${ind.avgMonthlyPayrollGrowth}%`, color: '#8b5cf6' })
  }
  return list
})

</script>

<style scoped>
.tab-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Row 1: weighted 2.6fr 1.6fr ── */
.row-1 {
  display: grid;
  grid-template-columns: 2.6fr 1.6fr;
  gap: 12px;
  align-items: stretch;
}

/* ── Row 2: weighted 1.1fr 1.5fr 1.0fr ── */
.row-2 {
  display: grid;
  grid-template-columns: 1.1fr 1.5fr 1.0fr;
  gap: 12px;
  align-items: stretch;
}

/* ── Row 3: equal thirds ── */
.row-three {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  align-items: stretch;
}

.panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-shrink: 0;
}
.panel-icon { color: #1a73e8; }
.panel-title { font-size: 13px; font-weight: 600; color: #111827; }
.panel-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}
.panel-body.split { padding: 12px 8px; }

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100px;
}

@keyframes eps-pulse {
  0%, 100% { opacity: 0.45; transform: scaleX(1); }
  50% { opacity: 0.85; transform: scaleX(1.015); }
}
.eps-shimmer {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e8ecf0 0%, #d1d9e0 50%, #e8ecf0 100%);
  background-size: 200% 100%;
  animation: eps-pulse 1.6s ease-in-out infinite;
  transform-origin: left center;
}

/* ── Responsive ── */
@media (min-width: 1441px) {
  .tab-grid { gap: 16px; }
  .row-1, .row-2, .row-three { gap: 16px; }
}

@media (max-width: 1024px) {
  .row-1 {
    grid-template-columns: 1fr 1fr;
  }
  .row-2 {
    grid-template-columns: 1fr 1fr;
  }
  .row-2 > :nth-child(3) {
    grid-column: 1 / -1;
  }
  .row-three {
    grid-template-columns: 1fr 1fr;
  }
  .row-three > :nth-child(3) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .tab-grid { gap: 10px; }
  .row-1, .row-2, .row-three {
    grid-template-columns: 1fr;
  }
  .row-2 > :nth-child(3),
  .row-three > :nth-child(3) {
    grid-column: auto;
  }
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
  .panel-body { padding: 10px 12px; }
}
</style>