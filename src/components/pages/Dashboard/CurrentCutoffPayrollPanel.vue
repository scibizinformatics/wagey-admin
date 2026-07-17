<template>
  <div class="panel-card">
    <div class="panel-head">
      <span class="panel-title">Current Cutoff Payroll</span>
    </div>
    <div class="panel-body">
      <!-- Top row: Estimated / Previous / Change -->
      <div class="payroll-summary">
        <div class="payroll-col">
          <div class="payroll-label">Estimated Payroll</div>
          <div class="payroll-value large">{{ fmtCurrency(data.estimated) }}</div>
        </div>
        <div class="payroll-col">
          <div class="payroll-label">Previous Cutoff</div>
          <div class="payroll-value">{{ fmtCurrency(data.previous) }}</div>
        </div>
        <div class="payroll-col">
          <div class="payroll-label">Change</div>
          <div class="payroll-value" :class="data.changeDirection">
            {{ changeSign }}{{ data.changePercent }}%
          </div>
        </div>
      </div>

      <!-- Component breakdown bars -->
      <div class="breakdown-list">
        <div v-for="(comp, i) in data.components" :key="i" class="breakdown-item">
          <div class="breakdown-header">
            <div class="breakdown-dot" :style="{ background: comp.color }" />
            <span class="breakdown-name">{{ comp.name }}</span>
            <span class="breakdown-amount">{{ fmtCurrency(comp.amount) }}</span>
          </div>
          <div class="breakdown-bar-wrap">
            <div
              class="breakdown-bar"
              :style="{ width: barPercent(comp.amount) + '%', background: comp.color }"
            />
          </div>
        </div>
      </div>

      <!-- Mini trend chart -->
      <div class="mini-chart">
        <TrendChart
          :labels="trendLabels"
          :values="trendValues"
          type="line"
          color="#1a73e8"
          :value-formatter="fmtCurrency"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TrendChart from '@/components/pages/Dashboard/TrendChart.vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      estimated: 418350,
      previous: 397200,
      changePercent: 5.3,
      changeDirection: 'up',
      components: [
        { name: 'Basic Pay', amount: 362400, color: '#1a73e8' },
        { name: 'Authorized OT', amount: 21650, color: '#22c55e' },
        { name: 'Night Diff', amount: 8300, color: '#8b5cf6' },
        { name: 'Holiday Pay', amount: 12000, color: '#f97316' },
        { name: 'Allowances', amount: 25000, color: '#06b6d4' },
        { name: 'Deductions (combined)', amount: -11000, color: '#ef4444' },
      ],
    }),
  },
  trendLabels: { type: Array, default: () => ['Jun 1', 'Jun 16', 'Jul 1', 'Jul 16', 'Jul 31'] },
  trendValues: { type: Array, default: () => [380000, 390000, 400000, 410000, 418350] },
  fmtCurrency: { type: Function, default: (v) => `₱${Number(v).toLocaleString()}` },
})

const changeSign = computed(() => (props.data.changeDirection === 'up' ? '+' : '-'))

const maxComponentAmount = computed(() =>
  Math.max(...props.data.components.map((c) => Math.abs(c.amount))),
)

function barPercent(amount) {
  return (Math.abs(amount) / maxComponentAmount.value) * 100
}
</script>

<style scoped>
.panel-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.panel-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.payroll-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.payroll-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.payroll-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}
.payroll-value {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}
.payroll-value.large {
  font-size: 22px;
}
.payroll-value.up {
  color: #22c55e;
}
.payroll-value.down {
  color: #ef4444;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.breakdown-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.breakdown-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.breakdown-name {
  font-size: 12px;
  color: #374151;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.breakdown-amount {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  flex-shrink: 0;
}
.breakdown-bar-wrap {
  height: 6px;
  background: #f1f3f5;
  border-radius: 3px;
  overflow: hidden;
}
.breakdown-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.mini-chart {
  margin-top: auto;
  min-height: 120px;
}
.mini-chart :deep(.trend-chart) {
  height: 120px;
}

@media (max-width: 1024px) {
  .panel-body {
    padding: 14px;
  }
  .payroll-value.large {
    font-size: 20px;
  }
}
@media (max-width: 768px) {
  .payroll-summary {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .payroll-value.large {
    font-size: 22px;
  }
  .mini-chart {
    min-height: 100px;
  }
  .mini-chart :deep(.trend-chart) {
    height: 100px;
  }
}
</style>
