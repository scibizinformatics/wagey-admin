<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="savings" size="18px" class="panel-icon" />
      <span class="panel-title">
        {{ mode === 'annual' ? '13th Month Pay Accrual (YTD)' : '13th Month Pay Accrual' }}
      </span>
    </div>
    <div class="panel-body">
      <!-- Skeleton / no-data state -->
      <div v-if="loading || !hasData" class="skeleton-body">
        <div
          class="eps-shimmer"
          v-for="n in 6"
          :key="n"
          :style="{ width: n % 2 === 0 ? '60%' : '80%', animationDelay: `${n * 0.12}s` }"
        />
      </div>

      <!-- Data state -->
      <template v-else>
        <div class="thirteenth-table-wrap">
          <div class="thirteenth-header">
            <div class="th-cell">Month</div>
            <div class="th-cell th-right">Basic Pay</div>
            <div class="th-cell th-right">Accrued (1/12)</div>
          </div>
          <div
            v-for="item in data.monthly"
            :key="item.month"
            class="thirteenth-row"
          >
            <div class="td-cell">{{ item.label }}</div>
            <div class="td-cell td-right">{{ fmtCurrency(item.basic_pay) }}</div>
            <div class="td-cell td-right">{{ fmtCurrency(item.accrued) }}</div>
          </div>
        </div>

        <div class="thirteenth-summary">
          <div class="summary-row">
            <span class="summary-label">Months Counted</span>
            <span class="summary-value">{{ data.months_counted }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">YTD Basic Pay</span>
            <span class="summary-value">{{ fmtCurrency(data.ytd_basic_pay) }}</span>
          </div>
          <div class="summary-row highlight">
            <span class="summary-label">YTD 13th Month Accrued</span>
            <span class="summary-value">{{ fmtCurrency(data.ytd_accrued) }}</span>
          </div>
          <div class="summary-asof">As of {{ data.as_of }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'monthly' }, // 'monthly' | 'annual'
  loading: { type: Boolean, default: false },
})

const hasData = computed(() =>
  Array.isArray(props.data?.monthly) && props.data.monthly.length > 0,
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
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.panel-body {
  padding: 12px 16px;
}

/* Skeleton */
.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 180px;
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

/* Table */
.thirteenth-table-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
}
.thirteenth-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fb;
  border-radius: 8px;
}
.th-cell {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.th-right { text-align: right; }

.thirteenth-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid #f1f3f5;
}
.thirteenth-row:last-child {
  border-bottom: none;
}
.td-cell {
  font-size: 13px;
  color: #374151;
}
.td-right { text-align: right; font-weight: 500; }

/* Summary */
.thirteenth-summary {
  background: #f8f9fb;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.summary-label {
  font-size: 12px;
  color: #6b7280;
}
.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.summary-row.highlight .summary-value {
  color: #1a73e8;
  font-size: 15px;
}
.summary-asof {
  font-size: 10.5px;
  color: #9ca3af;
  text-align: right;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
  .panel-body { padding: 10px 12px; }
  .thirteenth-header,
  .thirteenth-row {
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 6px;
    padding: 8px 10px;
  }
}
</style>
