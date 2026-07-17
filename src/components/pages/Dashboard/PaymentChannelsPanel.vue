<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="credit_card" size="18px" class="panel-icon" />
      <span class="panel-title">Payment Channels</span>
    </div>
    <div class="panel-body">
      <div v-if="loading || !channels.length" class="skeleton-body">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell" style="flex: 1.2">Channel</div>
            <div class="skeleton-header-cell" style="flex: 0.8">Employees</div>
            <div class="skeleton-header-cell" style="flex: 1">Final Released</div>
            <div class="skeleton-header-cell" style="flex: 0.8">Share</div>
          </div>
          <div class="skeleton-row" v-for="n in 5" :key="n">
            <div class="skeleton-cell" style="flex: 1.2"><q-skeleton type="text" width="100px" /></div>
            <div class="skeleton-cell" style="flex: 0.8"><q-skeleton type="text" width="50px" /></div>
            <div class="skeleton-cell" style="flex: 1"><q-skeleton type="text" width="100px" /></div>
            <div class="skeleton-cell" style="flex: 0.8"><q-skeleton type="text" width="60px" /></div>
          </div>
        </div>
      </div>
      <template v-else>
        <div class="channel-table">
          <div class="channel-header">
            <div class="ch-cell" style="flex: 1.2">Channel</div>
            <div class="ch-cell" style="flex: 0.8">Employees</div>
            <div class="ch-cell" style="flex: 1">Final Released</div>
            <div class="ch-cell" style="flex: 0.8">Share</div>
          </div>
          <div v-for="(c, i) in channels" :key="i" class="channel-row">
            <div class="cr-cell" style="flex: 1.2">{{ c.name }}</div>
            <div class="cr-cell" style="flex: 0.8">{{ c.employees }}</div>
            <div class="cr-cell" style="flex: 1">{{ fmtCurrency(c.amount) }}</div>
            <div class="cr-cell" style="flex: 0.8">
              <div class="share-bar-wrap">
                <div class="share-bar" :style="{ width: c.share + '%', background: shareColor(i) }" />
                <span class="share-label">{{ c.share }}%</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="totalRow" class="channel-total">
          <span>Total</span>
          <span>{{ totalRow.employees }}</span>
          <span>{{ fmtCurrency(totalRow.amount) }}</span>
          <span>100%</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  channels: { type: Array, default: () => [] },
  totalRow: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

const shareColors = ['#1a73e8', '#22c55e', '#8b5cf6', '#f97316', '#06b6d4', '#ef4444']
function shareColor(i) {
  return shareColors[i % shareColors.length]
}
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
.panel-title { font-size: 15px; font-weight: 600; color: #111827; }
.panel-body { padding: 12px 16px; flex: 1; min-height: 0; }

.skeleton-body { min-height: 180px; }
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

.channel-table { display: flex; flex-direction: column; gap: 2px; }
.channel-header {
  display: flex; background: #f8fafc; border-radius: 8px; padding: 8px 12px; gap: 8px;
}
.ch-cell {
  font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px;
}
.channel-row {
  display: flex; align-items: center; padding: 9px 12px; border-bottom: 1px solid #f1f3f5; gap: 8px;
}
.channel-row:last-child { border-bottom: none; }
.cr-cell { font-size: 13px; color: #374151; }
.share-bar-wrap { display: flex; align-items: center; gap: 6px; }
.share-bar {
  height: 6px; border-radius: 3px; flex: 1; min-width: 20px;
}
.share-label { font-size: 11px; color: #6b7280; font-weight: 500; }
.channel-total {
  display: flex; align-items: center; padding: 10px 12px; margin-top: 4px;
  background: #f8fafc; border-radius: 8px; gap: 8px;
  font-size: 13px; font-weight: 700; color: #111827;
}
@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 14px; }
}
</style>
