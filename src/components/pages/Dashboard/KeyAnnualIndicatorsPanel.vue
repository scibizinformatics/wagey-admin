<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="insights" size="18px" class="panel-icon" />
      <span class="panel-title">Key Annual Indicators</span>
    </div>
    <div class="panel-body">
      <div v-if="loading || !indicators.length" class="skeleton-body">
        <div class="indicators-grid">
          <div
            class="indicator-skeleton"
            v-for="n in 6"
            :key="n"
          >
            <q-skeleton type="circle" size="32px" />
            <div class="indicator-skeleton-text">
              <q-skeleton type="text" width="100px" />
              <q-skeleton type="text" width="80px" />
            </div>
          </div>
        </div>
      </div>
      <div v-else class="indicators-grid">
        <div v-for="(item, i) in indicators" :key="i" class="indicator-card">
          <q-icon :name="item.icon" size="24px" :style="{ color: item.color || '#1a73e8' }" />
          <div class="indicator-info">
            <div class="indicator-label">{{ item.label }}</div>
            <div class="indicator-value">{{ item.value }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  indicators: { type: Array, default: () => [] }, // [{ icon, label, value, color? }]
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
.panel-title { font-size: 13px; font-weight: 600; color: #111827; }
.panel-body { padding: 12px 16px; flex: 1; min-height: 0; }

.skeleton-body { min-height: 160px; }
.indicators-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.indicator-skeleton {
  display: flex; align-items: center; gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
}
.indicator-skeleton-text {
  display: flex; flex-direction: column; gap: 4px; flex: 1;
}
.indicator-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
}
.indicator-info { min-width: 0; }
.indicator-label {
  font-size: 11px; color: #6b7280; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.indicator-value {
  font-size: 13px; font-weight: 600; color: #111827;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
}
</style>
