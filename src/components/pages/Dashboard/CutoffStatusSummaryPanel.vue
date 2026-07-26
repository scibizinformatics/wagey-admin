<template>
  <div class="side-panel">
    <div class="panel-head">
      <q-icon name="assessment" size="16px" class="panel-icon" />
      <span class="panel-title">Cutoff Status</span>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="skeleton-body">
        <div class="eps-shimmer" v-for="n in 5" :key="n" :style="{ width: n % 2 === 0 ? '60%' : '75%', animationDelay: `${n * 0.12}s` }" />
      </div>
      <template v-else>
        <div v-for="(item, i) in statusRows" :key="i" class="status-row">
          <CutoffStatusBadge :status="item.status" />
          <span class="status-count">{{ item.count }}</span>
        </div>
        <div v-if="statusRows.length === 0" class="empty-status">
          No status data available
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CutoffStatusBadge from '@/components/pages/Dashboard/CutoffStatusBadge.vue'

const STATUS_ORDER = [
  'needs_attention',
  'under_review',
  'awaiting_acknowledgment',
  'ready_for_funding',
  'funded',
  'disbursing',
  'complete',
]

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

const statusRows = computed(() =>
  STATUS_ORDER
    .filter((s) => (props.data[s] ?? 0) > 0)
    .map((status) => ({
      status,
      count: props.data[status] ?? 0,
    }))
)
</script>

<style scoped>
.side-panel {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border-bottom: 1px solid #f1f3f5;
}

.panel-icon { color: #1a73e8; }

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.panel-body {
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-count {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.empty-status {
  font-size: 11.5px;
  color: #9ca3af;
  text-align: center;
  padding: 8px 0;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
</style>
