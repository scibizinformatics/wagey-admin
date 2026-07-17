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
        <span class="mp-closed">Closed</span>
      </div>
      <div class="month-picker-skeleton" v-else>
        <div class="eps-shimmer" style="width: 120px" />
      </div>

      <div class="three-col">
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
          :labels="months.map((m) => m.label.split(' ')[0])"
          :values="months.map((m) => m.total_payroll)"
          chart-type="line"
          :loading="loading"
        />
      </div>

      <div class="three-col">
        <PayrollByCompanyPanel :companies="[]" :loading="loading" />
        <PaymentChannelsPanel :channels="[]" :loading="loading" />
        <OtherEmployeeReleasesPanel :releases="[]" :total="0" :loading="loading" />
      </div>

      <ThirteenthMonthPayPanel :data="thirteenthMonthPay" mode="monthly" :loading="loading" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import TrendChart from '@/components/pages/Dashboard/TrendChart.vue'
import DonutChart from '@/components/pages/Dashboard/DonutChart.vue'
import ThirteenthMonthPayPanel from '@/components/pages/Dashboard/ThirteenthMonthPayPanel.vue'

const props = defineProps({
  months: { type: Array, required: true }, // monthlySummaries
  thirteenthMonthPay: { type: Object, required: true },
  componentBreakdown: { type: Function, required: true },
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
.mp-closed {
  font-size: 10.5px;
  font-weight: 700;
  color: #2e7d32;
  background: #e8f5e9;
  padding: 3px 10px;
  border-radius: 999px;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.two-col {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
  align-items: start;
}
.panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
}
.panel-icon {
  color: #1a73e8;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.panel-body {
  padding: 12px 16px;
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

@media (min-width: 1441px) {
  .stat-row,
  .two-col {
    gap: 16px;
  }
}
@media (max-width: 1024px) {
  .stat-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .two-col {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .stat-row {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .month-picker {
    flex-wrap: wrap;
  }
  .mp-select {
    min-width: 0;
    flex: 1;
  }
  .panel-body {
    padding: 10px 12px;
  }
}
</style>
