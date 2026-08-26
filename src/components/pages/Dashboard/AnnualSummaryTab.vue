<template>
  <div class="annual">
    <!-- Lead: the year's shape, and what it is made of. -->
    <div class="annual__row annual__row--lead">
      <MonthlyPayrollTrendPanel
        :title="`Monthly payroll (${annual.year})`"
        :labels="trendLabels"
        :values="trendValues"
        chart-type="bar"
        :loading="loading"
      />
      <YtdPayrollBreakdownPanel :breakdown="componentBreakdown(annual)" :loading="loading" />
    </div>

    <!-- The year read two ways: month over month, and by payment channel. -->
    <div class="annual__row annual__row--pair">
      <MonthlyComparisonTablePanel :months="monthlyComparison" :loading="loading" />
      <PaymentChannelsPanel
        :channels="ytdPaymentChannels"
        :total-row="ytdPaymentChannelsTotal"
        :loading="loading"
      />
    </div>

    <!-- Derived figures and the year-on-year headline. -->
    <div class="annual__row annual__row--three">
      <KeyAnnualIndicatorsPanel :indicators="computedIndicators" :loading="loading" />
      <YtdComparisonPanel :data="ytdComparison" :loading="loading" />
      <OtherEmployeeReleasesPanel
        :releases="ytdEmployeeReleases"
        :total="ytdEmployeeReleasesTotal"
        :loading="loading"
      />
    </div>

    <ThirteenthMonthPayPanel :data="thirteenthMonthPay" mode="annual" :loading="loading" />
  </div>
</template>

<script setup>
/**
 * Annual Summary tab layout.
 *
 * Three rows of equal-weight panels became a lead row plus two supporting rows,
 * so the year's trend and composition are read first and the derived figures
 * sit beneath them. The 13th month accrual closes the tab on its own, since it
 * is a statutory ledger rather than another slice of the same total.
 */
import { computed } from 'vue'
import MonthlyPayrollTrendPanel from '@/components/pages/Dashboard/MonthlyPayrollTrendPanel.vue'
import YtdPayrollBreakdownPanel from '@/components/pages/Dashboard/YtdPayrollBreakdownPanel.vue'
import MonthlyComparisonTablePanel from '@/components/pages/Dashboard/MonthlyComparisonTablePanel.vue'
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
  employeeReleases: { type: Array, default: () => [] },
  paymentChannels: { type: Array, default: () => [] },
  annualIndicators: { type: Object, default: () => ({}) },
  ytdComparison: { type: Object, default: () => ({}) },
  fmtCurrency: { type: Function, required: true },
  loading: { type: Boolean, default: false },
})

// These arrays are ordered oldest to newest, so the last entry is the running
// year-to-date total.
function latest(list) {
  return list.length ? list[list.length - 1] : null
}

const ytdEmployeeReleases = computed(() => latest(props.employeeReleases)?.releases ?? [])
const ytdEmployeeReleasesTotal = computed(() => latest(props.employeeReleases)?.total ?? 0)
const ytdPaymentChannels = computed(() => latest(props.paymentChannels)?.channels ?? [])

const ytdPaymentChannelsTotal = computed(() => {
  const channels = ytdPaymentChannels.value
  if (!channels.length) return null
  return {
    employees: channels.reduce((acc, c) => acc + (Number(c.employees) || 0), 0),
    amount: channels.reduce((acc, c) => acc + (Number(c.amount) || 0), 0),
  }
})

// Declared once so the indicator list keeps a stable order and colour per
// metric no matter which of them the backend actually returns.
const INDICATORS = [
  { key: 'highestPayrollMonth', icon: 'trending_up', label: 'Highest payroll month', color: 'var(--dash-good)' },
  { key: 'lowestPayrollMonth', icon: 'trending_down', label: 'Lowest payroll month', color: 'var(--dash-critical)' },
  { key: 'largestComponent', icon: 'pie_chart', label: 'Largest component', color: 'var(--dash-cat-4)' },
  { key: 'avgOvertimePercent', icon: 'schedule', label: 'Overtime share of payroll', color: 'var(--dash-cat-3)', suffix: '%' },
  { key: 'avgMonthlyEmployeeCount', icon: 'people', label: 'Avg monthly employees', color: 'var(--dash-cat-2)' },
  { key: 'avgMonthlyPayrollGrowth', icon: 'show_chart', label: 'Avg monthly growth', color: 'var(--dash-cat-1)', suffix: '%' },
]

const computedIndicators = computed(() =>
  INDICATORS.filter((i) => props.annualIndicators?.[i.key]).map((i) => ({
    icon: i.icon,
    label: i.label,
    color: i.color,
    value: `${props.annualIndicators[i.key]}${i.suffix ?? ''}`,
  })),
)
</script>

<style scoped>
.annual {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

.annual__row {
  display: grid;
  gap: var(--dash-gap);
  align-items: stretch;
}

.annual__row--lead {
  grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
}

.annual__row--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* Two even columns: the by-company donut used to sit here, and the month-by-month
   table and channel split take the freed width rather than leaving a gap. */
.annual__row--pair {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 1024px) and (max-width: 1439px) {
  .annual__row--three {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@media (max-width: 1024px) {
  .annual__row--lead,
  .annual__row--three,
  .annual__row--pair {
    grid-template-columns: 1fr;
  }
}
</style>
