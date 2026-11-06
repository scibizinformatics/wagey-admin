<template>
  <div class="prog" :class="{ 'prog--complete': allDone }">
    <!-- Four segments rather than five circles joined by lines. The rail plus a
         caption says both "which stage" and "how far" in about 110px, which is
         what the progress column has. -->
    <div class="prog__rail" role="img" :aria-label="ariaLabel">
      <button
        v-for="(step, i) in steps"
        :key="step.name"
        type="button"
        class="prog__seg"
        :class="[`prog__seg--${step.state}`, { 'prog__seg--here': i === currentIndex && !allDone }]"
        :disabled="step.state === 'pending'"
        :aria-label="`${labels[i]} — ${STATE_WORDS[step.state]}`"
        @click.stop="goToStep(i)"
        @keydown.stop
      >
        <q-tooltip v-if="step.state !== 'pending'" :delay="300" class="ca-prog-tip">
          {{ labels[i] }} · {{ STATE_WORDS[step.state] }}
        </q-tooltip>
      </button>
    </div>

    <!-- Stage name, then position in the sequence. -->
    <span v-if="steps.length" class="prog__caption">
      <span class="prog__stage">{{ currentLabel }}</span>
      <span v-if="!allDone" class="prog__pos dash-num"
        >Step {{ currentIndex + 1 }} of {{ steps.length }}</span
      >
      <span v-else class="prog__pos">All steps done</span>
    </span>
    <span v-else-if="noAdvances" class="prog__caption prog__caption--empty">
      No cash advance
    </span>
    <span v-else class="prog__caption prog__caption--empty">—</span>
  </div>
</template>

<script setup>
/**
 * A payout group's position in the cash-advance flow, for the list table's
 * progress column.
 *
 * The cash-advance flow has four steps, not the payroll flow's five — there is no
 * Payslips stage — so the payroll table's rail cannot be reused here. This is a
 * deliberate copy of `Payroll/PayoutProgressStepper.vue` with the step set and
 * route base swapped: the cash-advance table is the only consumer, and keeping
 * the working payroll stepper untouched is worth the duplication.
 *
 * The stages come from the PGI row's `cash_advance_status` first — that is the
 * field the cash-advance flow actually moves — and fall back to the payroll
 * status only when the row carries no cash-advance status at all. Unknown
 * statuses open Review, the same fallback the row uses.
 *
 * A row that explicitly answers `na` has no advances, so it renders that instead
 * of a rail: quoting the payroll stage in a four-step advance rail read as
 * "Review · step 1 of 4" on a run with nothing to review.
 *
 * When the visual contract changes, change it here *and* in the payroll stepper.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  CA_STEP_LABELS,
  CA_STEP_ROUTES,
  cashAdvanceStepIndex,
  normalizeStatusKey,
} from 'src/constants/cashAdvanceStatus'
import { isCashAdvanceNone } from 'src/composables/utils/payoutProgress'

const router = useRouter()

const props = defineProps({
  groupId: { type: [Number, String], required: true },
  /** The PGI row's cash-advance status; preferred over `pgiStatus`. */
  caStatus: { type: String, default: null },
  pgiStatus: { type: String, default: null },
  /** Carried to the step page, which no cash-advance endpoint returns. */
  groupName: { type: String, default: '' },
  cutoffName: { type: String, default: '' },
})

const labels = CA_STEP_LABELS
const STATE_WORDS = { done: 'done', active: 'in progress', pending: 'locked' }

/**
 * The cash-advance status when it is a stage this flow knows, otherwise the
 * payroll status. Only a blank cash-advance status falls through — `na` is an
 * answer ("no advances"), not a stage, and renders its own caption below.
 */
const sourceStatus = computed(() => {
  if (isCashAdvanceNone(props.caStatus)) return null
  return cashAdvanceStepIndex(props.caStatus) != null ? props.caStatus : props.pgiStatus
})

/**
 * A row that explicitly answers `na`: no advances on this run, so there is no
 * advance rail to draw at all.
 */
const noAdvances = computed(() => isCashAdvanceNone(props.caStatus))

/**
 * A finished run reads as all four segments done, the same way the payroll
 * stepper reads `complete` as a green, fully-filled rail rather than as the last
 * segment merely being current.
 */
const finished = computed(() => {
  const key = normalizeStatusKey(sourceStatus.value)
  return key === 'complete' || key === 'completed'
})

const currentIndex = computed(() => {
  if (finished.value) return CA_STEP_ROUTES.length - 1
  return cashAdvanceStepIndex(sourceStatus.value) ?? 0
})

const steps = computed(() => {
  if (noAdvances.value) return []
  return CA_STEP_ROUTES.map((name, i) => ({
    name,
    state: finished.value
      ? 'done'
      : i < currentIndex.value
        ? 'done'
        : i === currentIndex.value
          ? 'active'
          : 'pending',
  }))
})

const allDone = computed(
  () => steps.value.length > 0 && steps.value.every((step) => step.state === 'done'),
)

const currentLabel = computed(() =>
  allDone.value ? 'Complete' : (labels[currentIndex.value] ?? labels[0]),
)

const ariaLabel = computed(() => {
  if (noAdvances.value) return 'No cash advances on this run'
  if (!steps.value.length) return 'Progress unavailable'
  if (allDone.value) return 'Progress: complete, all 4 steps done'
  return `Progress: step ${currentIndex.value + 1} of ${steps.value.length}, ${currentLabel.value}`
})

function goToStep(index) {
  if (steps.value[index]?.state === 'pending') return
  if (!CA_STEP_ROUTES[index]) return
  router.push({
    path: `/app/payroll/cash-advance/${props.groupId}/${CA_STEP_ROUTES[index]}`,
    query: {
      pgi_status: props.pgiStatus || undefined,
      ca_status: props.caStatus || undefined,
      group: props.groupName || undefined,
      cutoff: props.cutoffName || undefined,
    },
  })
}
</script>

<style scoped>
.prog {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 112px;
}

/* ── Rail ──
   Slightly taller and fully rounded, so each segment reads as a discrete step
   rather than a sliced-up bar. Gaps do the separating. */
.prog__rail {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 12px;
}

.prog__seg {
  position: relative;
  flex: 1;
  height: 6px;
  min-width: 13px;
  padding: 0;
  border: none;
  border-radius: var(--dash-r-pill);
  background: var(--dash-n-200);
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    height var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
}
.prog__seg:disabled {
  cursor: default;
}

/* Hover thickens the segment instead of scaling it — a transform on a 6px bar
   visibly blurs its edges. */
.prog__seg:hover:not(:disabled) {
  height: 8px;
}

.prog__seg:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

/* Completed work behind you. */
.prog__seg--done,
.prog__seg--active {
  background: var(--dash-accent);
}

/* Where the run is *now*: a taller segment with a soft halo, so "current" is
   visible without introducing a third colour. */
.prog__seg--here {
  height: 10px;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}
.prog__seg--here:hover:not(:disabled) {
  height: 10px;
}

/* A finished run goes green, so complete is distinguishable from far-along. */
.prog--complete .prog__seg--done {
  background: var(--dash-good-mark);
}

/* ── Caption ──
   Stage on its own line above the position: the name is what gets read, the
   position is the reference. */
.prog__caption {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.prog__stage {
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.006em;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prog--complete .prog__stage {
  color: var(--dash-good);
}

.prog__pos {
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

.prog__caption--empty {
  color: var(--dash-ink-4);
  font-size: 12px;
}
</style>

<style>
.ca-prog-tip {
  background: var(--dash-ink);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--dash-r-sm);
  padding: 5px 9px;
  box-shadow: var(--dash-shadow-lg);
}
</style>
