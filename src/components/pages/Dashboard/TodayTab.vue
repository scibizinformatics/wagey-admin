<template>
  <div class="today-tab">
    <!-- Top section: Priority Items (tall) + Today's Guide + Attention Summary -->
    <div class="top-grid">
      <div class="top-priority">
        <PriorityItemsPanel :items="priorityItems" :loading="loading" />
      </div>
      <div class="top-guide">
        <TodayGuidePanel />
      </div>
      <div class="top-attention">
        <AttentionSummaryPanel :attention-summary="attentionSummary" :loading="loading" />
      </div>
    </div>

    <!-- Bottom section: Workforce Status + Requests -->
    <div class="bottom-grid">
      <div class="bottom-workforce">
        <WorkforceStatusPanel :sites="workforceStatus" :loading="loading" />
      </div>
      <div class="bottom-requests">
        <RequestsPanel :requests="pendingRequests" :loading="loading" />
      </div>
    </div>
  </div>
</template>

<script setup>
import PriorityItemsPanel from '@/components/pages/Dashboard/PriorityItemsPanel.vue'
import AttentionSummaryPanel from '@/components/pages/Dashboard/AttentionSummaryPanel.vue'
import WorkforceStatusPanel from '@/components/pages/Dashboard/WorkforceStatusPanel.vue'
import RequestsPanel from '@/components/pages/Dashboard/RequestsPanel.vue'
import TodayGuidePanel from '@/components/pages/Dashboard/TodayGuidePanel.vue'

defineProps({
  loading: { type: Boolean, default: false },
  priorityItems: { type: Array, default: () => [] },
  attentionSummary: { type: Object, default: () => ({}) },
  workforceStatus: { type: Array, default: () => [] },
  pendingRequests: { type: Array, default: () => [] },
})
</script>

<style scoped>
.today-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Top section grid: Priority (tall) + Guide + Attention ── */
.top-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: 1fr;
  gap: 12px;
  align-items: stretch;
}

.top-priority {
  grid-column: span 8;
  grid-row: 1 / 3;
  min-height: 0;
}

.top-guide {
  grid-column: span 4;
  grid-row: 1;
  min-height: 160px;
}

.top-attention {
  grid-column: span 4;
  grid-row: 2;
  min-height: 160px;
}

/* ── Bottom section grid: Workforce + Requests ── */
.bottom-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
  align-items: stretch;
}

.bottom-workforce {
  grid-column: span 8;
}

.bottom-requests {
  grid-column: span 4;
}

/* ── Responsive: collapse to single column at ≤1024px ── */
@media (max-width: 1024px) {
  .top-grid, .bottom-grid {
    grid-template-columns: 1fr;
  }
  .top-priority,
  .top-guide,
  .top-attention,
  .bottom-workforce,
  .bottom-requests {
    grid-column: 1 / -1;
    grid-row: auto;
  }
}

@media (min-width: 1441px) {
  .today-tab { gap: 20px; }
  .top-grid { gap: 20px; }
  .bottom-grid { gap: 20px; }
}

@media (max-width: 768px) {
  .today-tab { gap: 12px; }
  .top-grid { gap: 12px; }
  .bottom-grid { gap: 12px; }
}
</style>
