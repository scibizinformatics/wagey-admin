<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="groups" size="18px" class="panel-icon" />
      <span class="panel-title">Workforce Status</span>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="skeleton-body">
        <div class="skeleton-header">
          <div class="skeleton-cell">Site</div>
          <div class="skeleton-cell">Scheduled</div>
          <div class="skeleton-cell">Clocked In</div>
          <div class="skeleton-cell">Late</div>
          <div class="skeleton-cell">No Show</div>
        </div>
        <div v-for="n in 4" :key="n" class="skeleton-row">
          <div class="skeleton-cell"><q-skeleton type="text" width="80px" /></div>
          <div class="skeleton-cell"><q-skeleton type="text" width="40px" /></div>
          <div class="skeleton-cell"><q-skeleton type="text" width="40px" /></div>
          <div class="skeleton-cell"><q-skeleton type="text" width="40px" /></div>
          <div class="skeleton-cell"><q-skeleton type="text" width="40px" /></div>
        </div>
      </div>
      <div v-else-if="!sites.length" class="empty-state">
        <q-icon name="business" size="28px" color="grey-4" />
        <div class="empty-title">No site data available</div>
      </div>
      <div v-else class="workforce-table">
        <div class="wf-header">
          <div class="wf-cell">Site</div>
          <div class="wf-cell">Scheduled</div>
          <div class="wf-cell">Clocked In</div>
          <div class="wf-cell">Late</div>
          <div class="wf-cell">No Show</div>
        </div>
        <div v-for="(site, i) in sites" :key="i" class="wf-row">
          <div class="wf-cell">{{ site.name }}</div>
          <div class="wf-cell">{{ site.scheduled }}</div>
          <div class="wf-cell">{{ site.clockedIn }}</div>
          <div class="wf-cell">{{ site.late }}</div>
          <div class="wf-cell">{{ site.noShow }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  sites: { type: Array, default: () => [] },
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
  display: grid; grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr; gap: 8px;
  background: #f8fafc; border-radius: 8px; padding: 8px 12px;
}
.skeleton-header-cell {
  font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;
}
.skeleton-row {
  display: grid; grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr; gap: 8px;
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

.wf-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wf-header {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr;
  gap: 8px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
}
.wf-header-cell {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.wf-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid #f1f3f5;
}
.wf-row:last-child { border-bottom: none; }
.wf-cell { font-size: 13px; color: #374151; }

@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
}
</style>
