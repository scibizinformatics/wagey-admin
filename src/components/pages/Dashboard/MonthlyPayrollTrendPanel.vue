<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="show_chart" size="18px" class="panel-icon" />
      <span class="panel-title">{{ title }}</span>
    </div>
    <div class="panel-body">
      <div v-if="loading || !values.length" class="skeleton-body">
        <div
          class="eps-shimmer"
          v-for="n in 6"
          :key="n"
          :style="{ width: n % 2 === 0 ? '55%' : '75%', animationDelay: `${n * 0.12}s` }"
        />
      </div>
      <TrendChart v-else :labels="labels" :values="values" :type="chartType" :color="color" />
    </div>
  </div>
</template>

<script setup>
import TrendChart from '@/components/pages/Dashboard/TrendChart.vue'

defineProps({
  title: { type: String, default: 'Payroll Trend' },
  labels: { type: Array, default: () => [] },
  values: { type: Array, default: () => [] },
  chartType: { type: String, default: 'line' }, // 'line' | 'bar'
  color: { type: String, default: '#1a73e8' },
  loading: { type: Boolean, default: false },
})
</script>

<style scoped>
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
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.panel-body {
  padding: 12px 16px;
  flex: 1;
  min-height: 0;
}
.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 180px;
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
@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 14px; }
}
</style>
