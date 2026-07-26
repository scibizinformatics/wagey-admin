<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="payments" size="18px" class="panel-icon" />
      <span class="panel-title">Other Employee Releases</span>
    </div>
    <div class="panel-body">
      <div v-if="loading || !releases.length" class="skeleton-body">
        <div
          class="eps-shimmer"
          v-for="n in 5"
          :key="n"
          :style="{ width: n % 2 === 0 ? '60%' : '80%', animationDelay: `${n * 0.12}s` }"
        />
      </div>
      <template v-else>
        <div class="release-list">
          <div v-for="(item, i) in releases" :key="i" class="release-row">
            <span class="release-label">{{ item.label }}</span>
            <span class="release-value">{{ fmtCurrency(item.amount) }}</span>
          </div>
        </div>
        <div class="release-total">
          <span class="total-label">Total Employee-Related Cash Released</span>
          <span class="total-value">{{ fmtCurrency(total) }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  releases: { type: Array, default: () => [] }, // [{ label, amount }]
  total: { type: Number, default: 0 },
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

.skeleton-body {
  display: flex; flex-direction: column; gap: 10px; min-height: 150px;
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

.release-list { display: flex; flex-direction: column; gap: 2px; }
.release-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 0; border-bottom: 1px solid #f1f3f5;
}
.release-row:last-child { border-bottom: none; }
.release-label { font-size: 13px; color: #6b7280; }
.release-value { font-size: 13px; font-weight: 600; color: #374151; }
.release-total {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 10px; padding-top: 10px; border-top: 2px solid #e8ecf0;
}
.total-label { font-size: 13px; font-weight: 700; color: #111827; }
.total-value { font-size: 15px; font-weight: 700; color: #1a73e8; }
@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
}
</style>
