<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="assignment" size="18px" class="panel-icon" />
      <span class="panel-title">Requests</span>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="skeleton-body">
        <div class="skeleton-header">
          <div class="skeleton-cell">Type</div>
          <div class="skeleton-cell">Pending</div>
        </div>
        <div v-for="n in 4" :key="n" class="skeleton-row">
          <div class="skeleton-cell"><q-skeleton type="text" width="100px" /></div>
          <div class="skeleton-cell"><q-skeleton type="text" width="40px" /></div>
        </div>
      </div>
      <div v-else-if="!requests.length" class="empty-state">
        <q-icon name="task_alt" size="28px" color="grey-4" />
        <div class="empty-title">No pending requests</div>
      </div>
      <div v-else class="requests-table">
        <div class="req-header">
          <div class="req-cell">Type</div>
          <div class="req-cell">Pending</div>
        </div>
        <div v-for="(r, i) in requests" :key="i" class="req-row">
          <div class="req-cell">
            <q-icon :name="r.icon || 'description'" size="14px" class="req-icon" />
            {{ r.label || r.type }}
          </div>
          <div class="req-cell count">{{ r.count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  requests: { type: Array, default: () => [] },
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

.skeleton-body { min-height: 150px; flex: 1; }
.skeleton-header {
  display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 8px;
  background: #f8fafc; border-radius: 8px; padding: 8px 12px;
}
.skeleton-header-cell {
  font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;
}
.skeleton-row {
  display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 8px;
  align-items: center; padding: 10px 12px; border-bottom: 1px solid #f1f3f5;
}
.skeleton-row:last-child { border-bottom: none; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #9ca3af;
}
.empty-title { font-size: 14px; font-weight: 600; color: #6b7280; }

.req-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.req-header {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 8px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
}
.req-header-cell {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.req-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid #f1f3f5;
}
.req-row:last-child { border-bottom: none; }
.req-cell { font-size: 13px; color: #374151; }
.req-icon { margin-right: 6px; color: #6b7280; }

@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
}
</style>
