<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="compare_arrows" size="18px" class="panel-icon" />
      <span class="panel-title">YTD Comparison: {{ data.currentYearLabel }} vs {{ data.previousYearLabel }}</span>
    </div>
    <div class="panel-body">
      <div v-if="loading || !data.currentAmount" class="skeleton-body">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell" style="flex: 1.5">Period</div>
            <div class="skeleton-header-cell" style="flex: 1">Amount</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell" style="flex: 1.5"><q-skeleton type="text" width="140px" /></div>
            <div class="skeleton-cell" style="flex: 1"><q-skeleton type="text" width="100px" /></div>
          </div>
        </div>
      </div>
      <template v-else>
        <div class="comparison-table">
          <div class="comparison-header">
            <div class="ch-cell" style="flex: 1.5">Period</div>
            <div class="ch-cell" style="flex: 1">Amount</div>
          </div>
          <div class="comparison-row">
            <div class="cr-cell" style="flex: 1.5">January – June {{ data.currentYearLabel }}</div>
            <div class="cr-cell" style="flex: 1">{{ fmtCurrency(data.currentAmount) }}</div>
          </div>
          <div class="comparison-row">
            <div class="cr-cell" style="flex: 1.5">January – June {{ data.previousYearLabel }}</div>
            <div class="cr-cell" style="flex: 1">{{ fmtCurrency(data.previousAmount) }}</div>
          </div>
          <div class="comparison-row highlight">
            <div class="cr-cell" style="flex: 1.5">Difference</div>
            <div class="cr-cell" style="flex: 1" :class="data.difference >= 0 ? 'positive' : 'negative'">
              {{ data.difference >= 0 ? '+' : '' }}{{ fmtCurrency(data.difference) }}
            </div>
          </div>
          <div class="comparison-row highlight">
            <div class="cr-cell" style="flex: 1.5">Change</div>
            <div class="cr-cell" style="flex: 1" :class="data.changePercent >= 0 ? 'positive' : 'negative'">
              {{ data.changePercent >= 0 ? '+' : '' }}{{ data.changePercent }}%
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  data: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

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
  display: flex; align-items: center; gap: 8px;
  padding: 14px 20px; border-bottom: 1px solid #f1f3f5; flex-shrink: 0;
}
.panel-icon { color: #1a73e8; }
.panel-title { font-size: 13px; font-weight: 600; color: #111827; }
.panel-body { padding: 12px 16px; flex: 1; min-height: 0; }

.skeleton-body { min-height: 160px; }
.table-skeleton { display: flex; flex-direction: column; gap: 2px; }
.skeleton-header {
  display: flex; background: #f8fafc; border-radius: 8px; padding: 8px 12px; gap: 8px;
}
.skeleton-header-cell {
  font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em;
}
.skeleton-row {
  display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid #f1f3f5; gap: 8px;
}
.skeleton-row:last-child { border-bottom: none; }
.skeleton-cell { flex: 1; }

.comparison-table { display: flex; flex-direction: column; gap: 2px; }
.comparison-header {
  display: flex; background: #f8fafc; border-radius: 8px; padding: 8px 12px; gap: 8px;
}
.ch-cell {
  font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px;
}
.comparison-row {
  display: flex; align-items: center; padding: 9px 12px; border-bottom: 1px solid #f1f3f5; gap: 8px;
}
.comparison-row:last-child { border-bottom: none; }
.comparison-row.highlight { background: #f8fafc; border-radius: 6px; margin-top: 2px; }
.cr-cell { font-size: 13px; color: #374151; font-weight: 500; }
.cr-cell.positive { color: #16a34a; font-weight: 700; }
.cr-cell.negative { color: #dc2626; font-weight: 700; }
@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
}
</style>
