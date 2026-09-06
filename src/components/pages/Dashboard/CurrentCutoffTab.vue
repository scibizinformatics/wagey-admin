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
        :can-open="Boolean(currentCutoffLink)"
        @open-cutoff="onOpenCurrentCutoff"
      />
    </div>

    <!-- Detail: the groups themselves, narrowed by whatever the rail selected. -->
    <DashPanel
      icon="groups"
      title="Payout groups"
      :subtitle="tableSubtitle"
      flush
      class="cutoff__table"
      :empty="isTableEmpty"
      :empty-icon="emptyState.icon"
      :empty-title="emptyState.title"
      :empty-sub="emptyState.sub"
    >
      <template v-if="stageFilter" #actions>
        <span class="dash-chip dash-chip--info">
          <span class="dash-chip__dot" />
          Filtered by stage
        </span>
      </template>

      <!-- An empty state names the next move where there is one. Only the stage
           filter is this component's to undo — "hide completed" is a control on
           the page header above it — so the button appears only when clearing
           the stage is what would actually bring rows back. -->
      <template v-if="emptyState.canClearStage" #empty-action>
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          label="Show all stages"
          class="cutoff__empty-btn"
          @click="stageFilter = null"
        />
      </template>

      <CutoffPayoutGroupTable
        :groups="payoutGroupDetails"
        :loading="loading"
        :fmt-currency="fmtCurrency"
        :hide-completed="hideCompleted"
        :status-filter="stageFilter"
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
import { useRouter } from 'vue-router'
import { cutoffEmptyReason } from '@/composables/utils/cutoffPayoutGroups'
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
  /**
   * The cutoff this tab is showing, as `{ cutoff_id, cutoff_range }` — the
   * shape the Disbursement list accepts as a deep link. Null when none
   * resolves, which is what makes the roll-up drop its footer link.
   */
  currentCutoffLink: { type: Object, default: null },
  hideCompleted: { type: Boolean, default: false },
})

const router = useRouter()

const stageFilter = ref(null)

const tableSubtitle = computed(() => {
  if (props.loading) return ''
  const n = props.payoutGroupDetails.length
  if (!n) return ''
  return `${n} ${n === 1 ? 'group' : 'groups'} in this cutoff`
})

/**
 * The panel renders the empty state rather than the table doing it, so that an
 * empty cutoff reads as the card in the rest of the dashboard does — a centred
 * icon, a sentence and the next move — instead of a column header strip with a
 * pager under it and nothing in between.
 *
 * The reason comes from the same module the table filters with, so the two
 * cannot disagree about whether there is anything to show.
 */
const emptyReason = computed(() =>
  props.loading
    ? null
    : cutoffEmptyReason(props.payoutGroupDetails, {
        hideCompleted: props.hideCompleted,
        statusFilter: stageFilter.value,
      }),
)

const isTableEmpty = computed(() => emptyReason.value !== null)

const emptyState = computed(() => {
  // Hidden by the reader's own narrowing: recoverable, and worth saying how.
  if (emptyReason.value === 'filtered') {
    return {
      icon: 'filter_alt_off',
      title: 'No payout groups match this view',
      sub: props.hideCompleted
        ? 'Every group in this cutoff is filtered out by the stage selection or by "hide completed".'
        : 'Every group in this cutoff sits at a different stage than the one selected.',
      canClearStage: Boolean(stageFilter.value),
    }
  }
  // Genuinely nothing in the cutoff. Nothing to clear, so nothing is offered.
  return {
    icon: 'groups',
    title: 'No payout groups in this cutoff',
    sub: 'Groups appear here once payroll has been run for this period.',
    canClearStage: false,
  }
})

function onStageFilter(status) {
  stageFilter.value = status
}

/**
 * Opens a cutoff where its unfinished work actually lives: the Disbursement
 * list, narrowed to that cutoff's payout groups.
 *
 * Both keys go up. The list prefers `cutoff_id`, and falls back to matching the
 * label against the cutoff name on each row — the two screens read cutoffs from
 * different endpoints, so an id that matches nothing there is a real
 * possibility, and a link that opens an unfiltered list is a worse answer than
 * one that finds the rows by name.
 */
function openCutoff(data) {
  if (!data) return
  router.push({
    name: 'disbursement-list',
    query: {
      ...(data.cutoff_id ? { cutoff_id: String(data.cutoff_id) } : {}),
      ...(data.cutoff_range ? { cutoff: data.cutoff_range } : {}),
    },
  })
}

// The overdue banner names a *prior* cutoff; the roll-up names the one on
// screen. Same destination, same query, two different cutoffs — so they share
// the navigation and differ only in what they hand it.
function onOpenPreviousCutoff(data) {
  openCutoff(data)
}

function onOpenCurrentCutoff() {
  openCutoff(props.currentCutoffLink)
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

/* Quiet: the empty state's job is to explain, and the way back is a smaller
   offer than any of the real actions on this tab. */
.cutoff__empty-btn {
  color: var(--dash-accent);
  font-weight: 600;
}

@media (max-width: 1024px) {
  .cutoff__lead {
    grid-template-columns: 1fr;
  }
}
</style>
