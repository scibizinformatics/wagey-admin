<template>
  <div class="tab-grid">
    <div v-if="!loading && !months.length" class="no-month-banner">
      <q-icon name="info" size="18px" />
      <div>
        <div class="banner-title">No closed month yet</div>
        <div class="banner-sub">
          A month appears here only once every cutoff inside it is completed and every payout group
          is fully funded. As of {{ today }}, no month qualifies yet.
        </div>
      </div>
    </div>

    <template v-if="loading || months.length">
      <div class="month-picker" v-if="!loading">
        <span class="mp-label">Month</span>
        <q-select
          v-model="selectedMonth"
          :options="monthOptions"
          dense
          outlined
          emit-value
          map-options
          class="mp-select"
        />
      </div>
      <div class="month-picker-skeleton" v-else>
        <div class="eps-shimmer" style="width: 120px" />
      </div>

      <!-- Row 1: Cutoff Comparison | Monthly Payroll Breakdown | 6-Month Payroll Trend -->
      <div class="row-three">
        <div class="panel">
          <div class="panel-head">
            <q-icon name="bar_chart" size="18px" class="panel-icon" />
            <span class="panel-title">
              {{ loading ? 'Cutoff Comparison' : `Cutoff Comparison — ${selected.label}` }}
            </span>
          </div>
          <div class="panel-body">
            <div v-if="loading" class="skeleton-body">
              <div
                class="eps-shimmer"
                v-for="n in 6"
                :key="n"
                :style="{ width: n % 2 === 0 ? '55%' : '75%', animationDelay: `${n * 0.12}s` }"
              />
            </div>
            <TrendChart
              v-else
              :labels="selected.cutoffs.map((c) => c.period_label.split(',')[0])"
              :values="selected.cutoffs.map((c) => c.total_payroll)"
              type="bar"
              color="#1a73e8"
            />
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <q-icon name="pie_chart" size="18px" class="panel-icon" />
            <span class="panel-title">Monthly Payroll Breakdown</span>
          </div>
          <div class="panel-body split">
            <div v-if="loading" class="skeleton-body">
              <div
                class="eps-shimmer"
                v-for="n in 5"
                :key="n"
                :style="{ width: n % 2 === 0 ? '60%' : '80%', animationDelay: `${n * 0.12}s` }"
              />
            </div>
            <DonutChart v-else :data="componentBreakdown(selected)" show-legend />
          </div>
        </div>

        <MonthlyPayrollTrendPanel
          :title="'6-Month Payroll Trend'"
          :labels="monthlyTrendSeries.map((m) => m.label)"
          :values="monthlyTrendSeries.map((m) => m.value)"
          chart-type="line"
          :loading="loading"
        />
      </div>

      <!-- Row 2: Payroll by Company | Payment Channels | Other Employee Releases -->
      <div class="row-three">
        <PayrollByCompanyPanel :companies="currentPayrollByCompany" :total-row="currentPayrollByCompanyTotal" :loading="loading" />
        <PaymentChannelsPanel :channels="currentPaymentChannels" :total-row="currentPaymentChannelsTotal" :loading="loading" />
        <OtherEmployeeReleasesPanel :releases="currentEmployeeReleases" :total="currentEmployeeReleasesTotal" :loading="loading" />
      </div>

      <ThirteenthMonthPayPanel :data="thirteenthMonthPay" mode="monthly" :loading="loading" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import TrendChart from '@/components/pages/Dashboard/TrendChart.vue'
import DonutChart from '@/components/pages/Dashboard/DonutChart.vue'
import MonthlyPayrollTrendPanel from '@/components/pages/Dashboard/MonthlyPayrollTrendPanel.vue'
import PayrollByCompanyPanel from '@/components/pages/Dashboard/PayrollByCompanyPanel.vue'
import PaymentChannelsPanel from '@/components/pages/Dashboard/PaymentChannelsPanel.vue'
import OtherEmployeeReleasesPanel from '@/components/pages/Dashboard/OtherEmployeeReleasesPanel.vue'
import ThirteenthMonthPayPanel from '@/components/pages/Dashboard/ThirteenthMonthPayPanel.vue'

const props = defineProps({
  months: { type: Array, required: true },
  monthlyTrendSeries: { type: Array, default: () => [] },
  thirteenthMonthPay: { type: Object, required: true },
  componentBreakdown: { type: Function, required: true },
  payrollByCompany: { type: Array, default: () => [] },
  paymentChannels: { type: Array, default: () => [] },
  employeeReleases: { type: Array, default: () => [] },
  fmtCurrency: { type: Function, required: true },
  today: { type: String, required: true },
  loading: { type: Boolean, default: false },
})

const monthOptions = computed(() => props.months.map((m) => ({ label: m.label, value: m.month })))
const selectedMonth = ref(props.months.length ? props.months[props.months.length - 1].month : null)
watch(
  () => props.months,
  (list) => {
    if (list.length && !list.find((m) => m.month === selectedMonth.value)) {
      selectedMonth.value = list[list.length - 1].month
    }
  },
)
const selected = computed(
  () =>
    props.months.find((m) => m.month === selectedMonth.value) ??
    props.months[props.months.length - 1],
)

const currentPayrollByCompany = computed(() => {
  const month = selected.value?.month
  if (!month) return []
  const entry = props.payrollByCompany.find((p) => p.month === month)
  return entry?.companies ?? []
})

const currentPayrollByCompanyTotal = computed(() => {
  const companies = currentPayrollByCompany.value
  if (!companies.length) return null
  return {
    employees: companies.reduce((s, c) => s + (c.employees || 0), 0),
    amount: companies.reduce((s, c) => s + (c.amount || 0), 0),
  }
})

const currentPaymentChannels = computed(() => {
  const month = selected.value?.month
  if (!month) return []
  const entry = props.paymentChannels.find((p) => p.month === month)
  return entry?.channels ?? []
})

const currentPaymentChannelsTotal = computed(() => {
  const channels = currentPaymentChannels.value
  if (!channels.length) return null
  return {
    employees: channels.reduce((s, c) => s + (c.employees || 0), 0),
    amount: channels.reduce((s, c) => s + (c.amount || 0), 0),
  }
})

const currentEmployeeReleases = computed(() => {
  const month = selected.value?.month
  if (!month) return []
  const entry = props.employeeReleases.find((p) => p.month === month)
  return entry?.releases ?? []
})

const currentEmployeeReleasesTotal = computed(() => {
  const month = selected.value?.month
  if (!month) return 0
  const entry = props.employeeReleases.find((p) => p.month === month)
  return entry?.total ?? 0
})
</script>

<style scoped>
.tab-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.no-month-banner {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #fff8e1;
  border: 1px solid #ffe4a3;
  color: #92610a;
  border-radius: 12px;
  padding: 14px 16px;
}
.banner-title {
  font-weight: 600;
  font-size: 13px;
}
.banner-sub {
  font-size: 12px;
  margin-top: 2px;
  line-height: 1.5;
}

.month-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}
.month-picker-skeleton {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.mp-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}
.mp-select {
  min-width: 200px;
}

/* ── Row 1 & 2: equal thirds, stretch ── */
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
.panel-icon {
  color: #1a73e8;
}
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.panel-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}
.panel-body.split {
  padding: 12px 8px;
}

/* Skeleton */
.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100px;
}

@keyframes eps-pulse {
  0%, 100% {
    opacity: 0.45;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.85;
    transform: scaleX(1.015);
  }
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
  .row-three { gap: 16px; }
}

@media (max-width: 1024px) {
  .row-three {
    grid-template-columns: 1fr 1fr;
  }
  .row-three > :nth-child(3) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .tab-grid { gap: 10px; }
  .row-three {
    grid-template-columns: 1fr;
  }
  .row-three > :nth-child(3) {
    grid-column: auto;
  }
  .month-picker { flex-wrap: wrap; }
  .mp-select { min-width: 0; flex: 1; }
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
  .panel-body { padding: 10px 12px; }
}
</style>