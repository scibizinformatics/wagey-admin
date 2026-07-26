<template>
  <div class="cutoff-dashboard">
    <CutoffStatCardsRow
      :stats="cutoffStats"
      :loading="loading"
      :fmt-currency="fmtCurrency"
    />

    <div class="cutoff-main">
      <div class="cutoff-table-col">
        <div class="panel-head">
          <q-icon name="groups" size="16px" class="panel-icon" />
          <span class="panel-title">Payout Groups</span>
        </div>
        <CutoffPayoutGroupTable
          :groups="payoutGroupDetails"
          :loading="loading"
          :fmt-currency="fmtCurrency"
          :hide-completed="hideCompleted"
          @action="onGroupAction"
          @update:pagination="onPaginationUpdate"
        />
      </div>
      <div class="cutoff-sidebar-col">
        <CutoffStatusSummaryPanel
          class="stretch-panel"
          :data="cutoffStatusSummary"
          :loading="loading"
        />
        <CutoffSummaryPanel
          :data="cutoffSummaryRollup"
          :loading="loading"
          @view-issues="onViewIssues"
        />
      </div>
    </div>

    <CutoffOverdueBanner
      :overdue="previousCutoffIncomplete"
      @open-cutoff="onOpenPreviousCutoff"
    />
  </div>
</template>

<script setup>
import CutoffStatCardsRow from '@/components/pages/Dashboard/CutoffStatCardsRow.vue'
import CutoffPayoutGroupTable from '@/components/pages/Dashboard/CutoffPayoutGroupTable.vue'
import CutoffStatusSummaryPanel from '@/components/pages/Dashboard/CutoffStatusSummaryPanel.vue'
import CutoffSummaryPanel from '@/components/pages/Dashboard/CutoffSummaryPanel.vue'
import CutoffOverdueBanner from '@/components/pages/Dashboard/CutoffOverdueBanner.vue'

defineProps({
  fmtCurrency: { type: Function, required: true },
  loading: { type: Boolean, default: false },
  cutoffStats: { type: Object, default: () => ({}) },
  payoutGroupDetails: { type: Array, default: () => [] },
  cutoffSummaryRollup: { type: Object, default: () => ({}) },
  cutoffStatusSummary: { type: Object, default: () => ({}) },
  previousCutoffIncomplete: { type: Object, default: null },
  hideCompleted: { type: Boolean, default: false },
})

function onGroupAction(row) {
  console.log('[CurrentCutoffTab] group action:', row)
}

function onPaginationUpdate(pp) {
  console.log('[CurrentCutoffTab] pagination:', pp)
}

function onViewIssues() {
  console.log('[CurrentCutoffTab] view issues')
}

function onOpenPreviousCutoff(data) {
  console.log('[CurrentCutoffTab] open previous cutoff:', data)
}
</script>

<style scoped>
.cutoff-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cutoff-main {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 16px;
  align-items: stretch;
}

.cutoff-table-col {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
}

.cutoff-table-col .panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border-bottom: 1px solid #f1f3f5;
}

.cutoff-table-col .panel-icon {
  color: #1a73e8;
}

.cutoff-table-col .panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.cutoff-sidebar-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stretch-panel {
  flex: 1;
}

@media (max-width: 1200px) {
  .cutoff-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .cutoff-dashboard {
    gap: 12px;
  }
}
</style>
