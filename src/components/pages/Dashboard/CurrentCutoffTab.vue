<template>
  <div class="cutoff">
    <!-- Overdue money first. This sat at the foot of the tab before, below the
         table, which put the single most urgent thing on the page furthest from
         where the reader starts. -->
    <CutoffOverdueBanner :overdue="previousCutoffIncomplete" @open-cutoff="onOpenPreviousCutoff" />

    <CutoffStatCardsRow :stats="cutoffStats" :loading="loading" :fmt-currency="fmtCurrency" />

    <!-- Lead: the pipeline, and the roll-up that explains it. -->
    <div class="cutoff__lead">
      <CutoffStatusSummaryPanel
        class="cutoff__rail"
        :data="cutoffStatusSummary"
        :loading="loading"
        @filter="onStageFilter"
      />
      <CutoffSummaryPanel
        class="cutoff__rollup"
        :data="cutoffSummaryRollup"
        :loading="loading"
        @view-issues="onViewIssues"
      />
    </div>

    <!-- Detail: the groups themselves, narrowed by whatever the rail selected. -->
    <DashPanel
      icon="groups"
      title="Payout groups"
      :subtitle="tableSubtitle"
      flush
      class="cutoff__table"
    >
      <template v-if="stageFilter" #actions>
        <span class="dash-chip dash-chip--info">
          <span class="dash-chip__dot" />
          Filtered by stage
        </span>
      </template>

      <CutoffPayoutGroupTable
        :groups="payoutGroupDetails"
        :loading="loading"
        :fmt-currency="fmtCurrency"
        :hide-completed="hideCompleted"
        :status-filter="stageFilter"
        @action="onGroupAction"
        @update:pagination="onPaginationUpdate"
      />
    </DashPanel>
  </div>
</template>

<script setup>
/**
 * Current Cutoff tab layout.
 *
 * Reading order now follows urgency: anything overdue, then the headline
 * figures, then the pipeline showing where the cutoff is stuck, then the groups
 * themselves. Selecting a stage on the rail narrows the table below it, so the
 * lead element does real work rather than only reporting.
 */
import { computed, ref } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import CutoffStatCardsRow from '@/components/pages/Dashboard/CutoffStatCardsRow.vue'
import CutoffPayoutGroupTable from '@/components/pages/Dashboard/CutoffPayoutGroupTable.vue'
import CutoffStatusSummaryPanel from '@/components/pages/Dashboard/CutoffStatusSummaryPanel.vue'
import CutoffSummaryPanel from '@/components/pages/Dashboard/CutoffSummaryPanel.vue'
import CutoffOverdueBanner from '@/components/pages/Dashboard/CutoffOverdueBanner.vue'

const props = defineProps({
  fmtCurrency: { type: Function, required: true },
  loading: { type: Boolean, default: false },
  cutoffStats: { type: Object, default: () => ({}) },
  payoutGroupDetails: { type: Array, default: () => [] },
  cutoffSummaryRollup: { type: Object, default: () => ({}) },
  cutoffStatusSummary: { type: Object, default: () => ({}) },
  previousCutoffIncomplete: { type: Object, default: null },
  hideCompleted: { type: Boolean, default: false },
})

const stageFilter = ref(null)

const tableSubtitle = computed(() => {
  if (props.loading) return ''
  const n = props.payoutGroupDetails.length
  if (!n) return ''
  return `${n} ${n === 1 ? 'group' : 'groups'} in this cutoff`
})

function onStageFilter(status) {
  stageFilter.value = status
}

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
.cutoff {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* The rail needs width to be readable as a proportion; the roll-up is a column
   of four figures and does not. */
.cutoff__lead {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(0, 1fr);
  gap: var(--dash-gap);
  align-items: stretch;
}

.cutoff__rail,
.cutoff__rollup,
.cutoff__table {
  min-width: 0;
}

@media (max-width: 1024px) {
  .cutoff__lead {
    grid-template-columns: 1fr;
  }
}
</style>
