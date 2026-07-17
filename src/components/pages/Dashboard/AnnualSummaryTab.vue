<template>
  <div class="tab-grid">
    <div class="two-col">
      <div class="panel">
        <div class="panel-head">
          <q-icon name="show_chart" size="18px" class="panel-icon" />
          <span class="panel-title">
            {{ loading ? 'Monthly Payroll Trend' : `Monthly Payroll Trend (${annual.year})` }}
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
          <TrendChart v-else :labels="trendLabels" :values="trendValues" type="line" color="#1a73e8" />
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <q-icon name="pie_chart" size="18px" class="panel-icon" />
          <span class="panel-title">YTD Payroll Breakdown</span>
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
          <DonutChart v-else :data="componentBreakdown(annual)" show-legend />
        </div>
      </div>
    </div>

    <ThirteenthMonthPayPanel :data="thirteenthMonthPay" mode="annual" :loading="loading" />
  </div>
</template>

<script setup>
import TrendChart from '@/components/pages/Dashboard/TrendChart.vue'
import DonutChart from '@/components/pages/Dashboard/DonutChart.vue'
import ThirteenthMonthPayPanel from '@/components/pages/Dashboard/ThirteenthMonthPayPanel.vue'

defineProps({
  annual: { type: Object, required: true },
  trendLabels: { type: Array, required: true },
  trendValues: { type: Array, required: true },
  thirteenthMonthPay: { type: Object, required: true },
  componentBreakdown: { type: Function, required: true },
  fmtCurrency: { type: Function, required: true },
  loading: { type: Boolean, default: false },
})
</script>

<style scoped>
.tab-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  .panel-body {
    padding: 10px 12px;
  }
}
</style>
