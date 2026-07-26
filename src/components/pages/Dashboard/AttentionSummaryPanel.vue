<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="notifications" size="18px" class="panel-icon" />
      <span class="panel-title">Attention Summary</span>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="skeleton-body">
        <div class="eps-shimmer" style="width: 70%; height: 14px" />
        <div class="eps-shimmer" style="width: 50%; height: 12px; margin-top: 8px" />
      </div>
      <div v-else-if="!hasItems" class="empty-state">
        <q-icon name="check_circle" size="28px" color="positive" />
        <div class="empty-title">All clear</div>
        <div class="empty-sub">No items need attention.</div>
      </div>
      <div v-else class="attention-list">
        <div v-for="(val, key) in attentionSummary" :key="key" v-show="val > 0" class="attention-row">
          <span class="attention-label">{{ formatLabel(key) }}</span>
          <span class="attention-count">{{ val }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  attentionSummary: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

const hasItems = computed(() =>
  Object.values(props.attentionSummary).some((v) => v > 0)
)

const labelMap = {
  attendance_issues: 'Attendance Issues',
  pending_ot_approvals: 'Pending OT Approvals',
  staffing_gaps: 'Staffing Gaps',
}

function formatLabel(key) {
  return labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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
  height: 100%;
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
.panel-body { padding: 12px 16px; flex: 1; min-height: 0; display: flex; flex-direction: column; }

.skeleton-body {
  padding: 16px;
  flex: 1;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px;
}
.empty-title { font-size: 14px; font-weight: 600; color: #6b7280; }
.empty-sub { font-size: 12px; color: #9ca3af; }

.attention-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.attention-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 12px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
}
.attention-row:last-child { border-bottom: none; }
.attention-count {
  font-weight: 600;
  color: #111827;
}

@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
}
</style>
