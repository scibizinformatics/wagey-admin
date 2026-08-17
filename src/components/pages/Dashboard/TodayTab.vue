<template>
  <div class="today">
    <!-- Lead row: the queue you act on, with the open-item counters beside it. -->
    <div class="today__row today__row--lead">
      <PriorityItemsPanel class="today__primary" :items="priorityItems" :loading="loading" />
      <AttentionSummaryPanel
        class="today__secondary"
        :attention-summary="attentionSummary"
        :loading="loading"
      />
    </div>

    <!-- Supporting row: where the day stands, once the queue is handled. -->
    <div class="today__row">
      <WorkforceStatusPanel class="today__primary" :sites="workforceStatus" :loading="loading" />
      <RequestsPanel class="today__secondary" :requests="pendingRequests" :loading="loading" />
    </div>

    <TodayGuidePanel />
  </div>
</template>

<script setup>
/**
 * Today tab layout.
 *
 * Two rows, each a wide primary panel with a narrow companion, rather than the
 * previous four-slot grid where a static glossary card held the same visual
 * weight as the live action queue. Reading order now matches priority: what
 * needs doing, how much is open, whether sites are covered, what is queued.
 */
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
.today {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

.today__row {
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) minmax(0, 1fr);
  gap: var(--dash-gap);
  align-items: stretch;
}

/* The lead row gets a floor so the action queue has room to show several rows
   without the companion panel collapsing to a sliver. */
.today__row--lead {
  min-height: 268px;
}

.today__primary,
.today__secondary {
  min-width: 0;
}

@media (max-width: 1024px) {
  .today__row,
  .today__row--lead {
    grid-template-columns: 1fr;
    min-height: 0;
  }
}
</style>
