<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="donut_large" size="18px" class="panel-icon" />
      <span class="panel-title">YTD Payroll Breakdown</span>
    </div>
    <div class="panel-body split">
      <div v-if="loading || !breakdown.length" class="skeleton-body">
        <div
          class="eps-shimmer"
          v-for="n in 5"
          :key="n"
          :style="{ width: n % 2 === 0 ? '60%' : '80%', animationDelay: `${n * 0.12}s` }"
        />
      </div>
      <template v-else>
        <DonutChart :data="breakdown" show-legend />
      </template>
    </div>
  </div>
</template>

<script setup>
import DonutChart from '@/components/pages/Dashboard/DonutChart.vue'

defineProps({
  breakdown: { type: Array, default: () => [] }, // [{ name, value }]
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
  display: flex; align-items: center; gap: 8px;
  padding: 14px 20px; border-bottom: 1px solid #f1f3f5; flex-shrink: 0;
}
.panel-icon { color: #1a73e8; }
.panel-title { font-size: 15px; font-weight: 600; color: #111827; }
.panel-body { padding: 12px 16px; flex: 1; min-height: 0; }
.panel-body.split { padding: 12px 8px; }

.skeleton-body {
  display: flex; flex-direction: column; gap: 10px; min-height: 180px;
}
@keyframes eps-pulse {
  0%, 100% { opacity: 0.45; transform: scaleX(1); }
  50% { opacity: 0.85; transform: scaleX(1.015); }
}
.eps-shimmer {
  height: 10px; border-radius: 6px;
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
