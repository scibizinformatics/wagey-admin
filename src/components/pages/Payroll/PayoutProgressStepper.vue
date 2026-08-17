<template>
  <div class="prog" :class="{ 'prog--complete': allDone }">
    <!-- Five segments rather than five circles joined by lines. The circles ran
         about 166px in a table cell and still needed a separate Status column to
         say what stage they meant; a rail plus a caption says both in less than
         half the width. -->
    <div class="prog__rail" role="img" :aria-label="ariaLabel">
      <button
        v-for="(step, i) in steps"
        :key="step.name"
        type="button"
        class="prog__seg"
        :class="[
          `prog__seg--${step.state}`,
          { 'prog__seg--here': i === currentIndex && !allDone },
        ]"
        :disabled="step.state === 'pending'"
        :aria-label="`${STEP_LABELS[i]} — ${STATE_WORDS[step.state]}`"
        @click.stop="goToStep(i)"
      >
        <q-tooltip v-if="step.state !== 'pending'" :delay="300" class="prog-tip">
          {{ STEP_LABELS[i] }} · {{ STATE_WORDS[step.state] }}
        </q-tooltip>
      </button>
    </div>

    <!-- Stage name, then position in the sequence. The count used to be the
         number of *finished* steps beside the name of the *current* one — so a
         run sitting on step 3 read "Funding 2/5", two numbers describing the same
         place and disagreeing. -->
    <span v-if="steps.length" class="prog__caption">
      <span class="prog__stage">{{ currentLabel }}</span>
      <span v-if="!allDone" class="prog__pos dash-num">Step {{ currentIndex + 1 }} of {{ steps.length }}</span>
      <span v-else class="prog__pos">All steps done</span>
    </span>
    <span v-else class="prog__caption prog__caption--empty">—</span>
  </div>
</template>

<script setup>
/**
 * A payout group's position in the five-step flow, for a table row.
 *
 * Replaces a row of circles-and-connectors. Segments stay individually clickable,
 * so jumping straight to a reachable step still works; pending steps are disabled
 * buttons rather than merely un-styled, so keyboard users cannot tab into a step
 * they are not allowed to open.
 *
 * The caption names the current stage. That is the information the table's
 * separate Status column was carrying, which is why this component now replaces
 * both.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { computeStepsFromPgiStatus, PGI_STATUS_MAP } from 'src/constants/pgiStatus'

const router = useRouter()
const { fetchPayoutGroupProgress } = useDisbursementApi()

const props = defineProps({
  groupId: { type: [Number, String], required: true },
  pgiStatus: { type: String, default: null },
})

const ROUTES = ['review', 'payslips', 'funding', 'disburse', 'complete']
const STEP_LABELS = ['Review', 'Payslips', 'Funding', 'Disbursement', 'Complete']
const STATE_WORDS = { done: 'done', active: 'in progress', pending: 'locked' }

const stepDefs = ROUTES.map((r) => ({ name: r }))
const progressData = ref(null)

const steps = computed(() => {
  if (props.pgiStatus) {
    // Fast path: a known status maps to the whole sequence without a request.
    const mapped = computeStepsFromPgiStatus(props.pgiStatus, stepDefs)
    if (mapped) {
      return mapped.map((s) => ({
        ...s,
        state: s.state === 'completed' ? 'done' : s.state === 'in_progress' ? 'active' : 'pending',
      }))
    }
  }

  if (!progressData.value) return []

  return progressData.value.progress.map((p) => ({
    ...p,
    state: p.status === 'in_progress' ? 'active' : p.status === 'completed' ? 'done' : 'pending',
  }))
})

const allDone = computed(() => steps.value.length > 0 && steps.value.every((s) => s.state === 'done'))

/**
 * Where the run actually is: the in-progress step, or failing that the first one
 * still locked — that is where the work has stalled.
 */
const currentIndex = computed(() => {
  const active = steps.value.findIndex((s) => s.state === 'active')
  if (active >= 0) return active
  const firstPending = steps.value.findIndex((s) => s.state === 'pending')
  return firstPending >= 0 ? firstPending : 0
})

const currentLabel = computed(() =>
  allDone.value ? 'Complete' : (STEP_LABELS[currentIndex.value] ?? STEP_LABELS[0]),
)

const ariaLabel = computed(() => {
  if (!steps.value.length) return 'Progress unavailable'
  if (allDone.value) return 'Progress: complete, all 5 steps done'
  return `Progress: step ${currentIndex.value + 1} of ${steps.value.length}, ${currentLabel.value}`
})

onMounted(async () => {
  // Only the backend can resolve a status outside the known map.
  if (!props.pgiStatus || PGI_STATUS_MAP[props.pgiStatus]) return
  try {
    progressData.value = await fetchPayoutGroupProgress(props.groupId)
  } catch (err) {
    console.error('[PayoutProgressStepper] fetch failed:', err)
  }
})

function goToStep(index) {
  if (steps.value[index]?.state === 'pending') return
  if (ROUTES[index]) router.push(`/app/payroll/${ROUTES[index]}/${props.groupId}`)
}
</script>

<style scoped>
.prog {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 112px;
}

/* ── Rail ──────────────────────────────────────────────────────────────────
   Slightly taller and fully rounded, so each segment reads as a discrete step
   rather than a sliced-up bar. Gaps do the separating; no dividers needed. */
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
  transition: background var(--dash-fast) var(--dash-ease),
    height var(--dash-fast) var(--dash-ease), box-shadow var(--dash-fast) var(--dash-ease);
}
.prog__seg:disabled {
  cursor: default;
}

/* Hover thickens the segment a touch instead of scaling it — a transform on a
   6px bar visibly blurs its edges. */
.prog__seg:hover:not(:disabled) {
  height: 8px;
}

.prog__seg:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dash-surface), 0 0 0 4px var(--dash-accent-ring);
}

/* Completed work behind you. */
.prog__seg--done,
.prog__seg--active {
  background: var(--dash-accent);
}

/* Where the run is *now*. Done and current used to be the same flat colour, so
   the one thing a reader wants from a progress bar — where am I — was the one
   thing it did not show. A taller segment with a soft halo marks it without
   introducing a third colour. */
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
   position is the reference. Side by side they competed. */
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
.prog-tip {
  background: var(--dash-ink);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--dash-r-sm);
  padding: 5px 9px;
  box-shadow: var(--dash-shadow-lg);
}
</style>
