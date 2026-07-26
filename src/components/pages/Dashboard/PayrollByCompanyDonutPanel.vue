<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="donut_large" size="18px" class="panel-icon" />
      <span class="panel-title">Payroll by Company</span>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="skeleton-body">
        <div class="eps-shimmer" v-for="n in 6" :key="n" :style="{ width: n % 2 === 0 ? '55%' : '75%', animationDelay: `${n * 0.12}s` }" />
      </div>
      <template v-else>
        <div class="toggle-row">
          <q-btn-toggle
            v-model="viewMode"
            class="view-toggle"
            no-caps
            unelevated
            toggle-color="primary"
            color="white"
            text-color="grey-8"
            size="11px"
            :options="[
              { label: 'By Company', value: 'company' },
              { label: 'By Department', value: 'department' },
              { label: 'By Payroll Group', value: 'payroll_group' },
            ]"
          />
        </div>

        <div v-if="!items.length" class="empty-state">
          <q-icon name="info" size="16px" color="grey-4" />
          <span class="empty-text">No data available for this view</span>
        </div>

        <div v-else class="chart-section">
          <DonutChart :data="donutData" show-legend />
          <div class="legend-table">
            <div class="legend-header">
              <div class="lh-cell" style="flex: 1.5">Name</div>
              <div class="lh-cell" style="flex: 0.8">Employees</div>
              <div class="lh-cell" style="flex: 1">Amount</div>
              <div class="lh-cell" style="flex: 0.8">Share</div>
            </div>
            <div v-for="(item, i) in items" :key="i" class="legend-row">
              <div class="lr-cell" style="flex: 1.5">
                <span class="lr-dot" :style="{ background: shareColor(i) }" />
                {{ item.name }}
              </div>
              <div class="lr-cell" style="flex: 0.8">{{ item.employees }}</div>
              <div class="lr-cell" style="flex: 1">{{ fmtCurrency(item.amount) }}</div>
              <div class="lr-cell" style="flex: 0.8">
                <div class="share-bar-wrap">
                  <div class="share-bar" :style="{ width: item.share + '%', background: shareColor(i) }" />
                  <span class="share-label">{{ item.share }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DonutChart from '@/components/pages/Dashboard/DonutChart.vue'

const props = defineProps({
  companies: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const viewMode = ref('company')

const shareColors = ['#1a73e8', '#22c55e', '#8b5cf6', '#f97316', '#06b6d4', '#ef4444']
function shareColor(i) {
  return shareColors[i % shareColors.length]
}

const items = computed(() => {
  if (!props.companies.length) return []
  return props.companies
})

const donutData = computed(() =>
  items.value.map((c) => ({ name: c.name, value: c.amount })),
)

function fmtCurrency(n) {
  return `\u20b1${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
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
.panel-icon { color: #1a73e8; }
.panel-title { font-size: 13px; font-weight: 600; color: #111827; }
.panel-body { padding: 12px 16px; flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; }

.toggle-row {
  display: flex;
  justify-content: center;
}
.view-toggle {
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  overflow: hidden;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 0;
  color: #9ca3af;
  font-size: 13px;
}

.legend-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.legend-header {
  display: flex;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
}
.lh-cell {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.legend-row {
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid #f1f3f5;
  gap: 8px;
}
.legend-row:last-child { border-bottom: none; }
.lr-cell {
  font-size: 13px;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 6px;
}
.lr-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.share-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.share-bar {
  height: 6px;
  border-radius: 3px;
  flex: 1;
  min-width: 20px;
}
.share-label { font-size: 11px; color: #6b7280; font-weight: 500; }

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
  .panel-title { font-size: 12px; }
}
</style>