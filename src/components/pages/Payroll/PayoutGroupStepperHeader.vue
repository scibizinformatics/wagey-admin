<template>
  <nav class="steps" aria-label="Disbursement progress">
    <!-- Skeleton keeps the header's height while progress loads, so the page
         below does not jump once the steps resolve. -->
    <ol v-if="!steps.length" class="steps__list steps__list--loading" aria-hidden="true">
      <li v-for="n in stepDefs.length" :key="n" class="step">
        <span class="dash-shimmer step__skeleton-node" />
        <span class="dash-shimmer step__skeleton-label" />
      </li>
    </ol>

    <ol v-else class="steps__list">
      <li
        v-for="(step, i) in steps"
        :key="step.routeKey"
        class="step"
        :class="`step--${step.state}`"
        :aria-current="step.state === 'current' ? 'step' : undefined"
      >
        <!-- The rail belongs to the step it leads *into*, so it fills only once
             the step before it is done. -->
        <span v-if="i > 0" class="step__rail" :class="{ 'step__rail--done': steps[i - 1].state === 'completed' }" />

        <component
          :is="step.state === 'locked' ? 'div' : 'router-link'"
          :to="step.state === 'locked' ? undefined : { path: step.route, query: carriedQuery }"
          class="step__body"
          :class="{ 'step__body--locked': step.state === 'locked' }"
        >
          <span class="step__node">
            <q-icon v-if="step.state === 'completed'" name="check" size="15px" />
            <q-icon v-else-if="step.state === 'locked'" name="lock" size="12px" />
            <span v-else class="step__num dash-num">{{ i + 1 }}</span>
          </span>

          <span class="step__text">
            <span class="step__label">{{ step.label }}</span>
            <span class="step__state">{{ stateLabel(step.state) }}</span>
          </span>
        </component>
      </li>
    </ol>
  </nav>
</template>

<script setup>
/**
 * The five-step disbursement progress header.
 *
 * Redesigned from a row of coloured circles with a caption underneath. Changes
 * that matter beyond looks:
 *
 *  - Each step now states its own condition ("Done", "In progress", "Locked")
 *    rather than encoding it in the circle's colour alone.
 *  - Locked steps show a padlock, so it is clear they are not merely upcoming —
 *    previously locked and upcoming differed only by grey tone.
 *  - Marked up as an <ol> of steps with aria-current, so the sequence and the
 *    reader's position in it survive without sight of the colours.
 *  - The connecting rail belongs to the step it leads into and fills from the
 *    step before, which is what makes the run of completed work legible.
 *
 * Progress still comes from either the `pgiStatus` prop / query param (mapped by
 * computeStepsFromPgiStatus) or the progress endpoint, unchanged.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { computeStepsFromPgiStatus } from 'src/constants/pgiStatus'

const route = useRoute()
const { fetchPayoutGroupProgress } = useDisbursementApi()

const props = defineProps({
  groupId: { type: [String, Number], required: true },
  pgiStatus: { type: String, default: null },
})

const BASE_PATH = '/app/payroll'

/**
 * Moving between steps used to drop the query, so the run's status and name —
 * which the list page hands over and no step endpoint returns — survived only
 * the first page you landed on. Every step after it fell back to a shimmering
 * header and a stepper that had to refetch its progress. The identity of the
 * run does not change between its own steps, so it travels with the link.
 */
const carriedQuery = computed(() => {
  const { pgi_status: status, group, cutoff } = route.query
  const query = {}
  if (status) query.pgi_status = status
  if (group) query.group = group
  if (cutoff) query.cutoff = cutoff
  return query
})

const stepDefs = [
  { label: 'Review', routeKey: 'review' },
  { label: 'Payslips', routeKey: 'payslips' },
  { label: 'Funding', routeKey: 'funding' },
  { label: 'Disbursement', routeKey: 'disburse' },
  { label: 'Complete', routeKey: 'complete' },
]

const progressData = ref(null)

const STATE_LABELS = {
  completed: 'Done',
  current: 'In progress',
  locked: 'Locked',
  upcoming: 'Not started',
}

const stateLabel = (state) => STATE_LABELS[state] ?? ''

const withRoute = (def) => ({
  ...def,
  route: `${BASE_PATH}/${def.routeKey}/${props.groupId}`,
})

/** The bar as the run's own progress endpoint describes it. */
const progressSteps = computed(() => {
  const progress = progressData.value?.progress
  if (!Array.isArray(progress) || !progress.length) return []
  return stepDefs.map((def, i) => {
    const prog = progress[i]
    let state = 'upcoming'
    if (prog?.status === 'completed') state = 'completed'
    else if (prog?.status === 'in_progress') state = 'current'
    else if (prog?.status === 'locked') state = 'locked'
    return { ...withRoute(def), state }
  })
})

/** The bar as the status this header was handed maps it. */
const statusSteps = computed(() => {
  const effectiveStatus = props.pgiStatus || route.query.pgi_status
  if (!effectiveStatus) return []
  const mapped = computeStepsFromPgiStatus(
    effectiveStatus,
    stepDefs.map((d) => ({ name: d.routeKey })),
  )
  if (!mapped) return []
  return mapped.map((s, i) => ({
    ...withRoute(stepDefs[i]),
    state: s.state === 'completed' ? 'completed' : s.state === 'in_progress' ? 'current' : 'locked',
  }))
})

/** How far along the run a given reading of the bar puts it. */
function positionOf(steps) {
  let position = -1
  steps.forEach((step, i) => {
    if (step.state === 'completed' || step.state === 'current') position = Math.max(position, i)
  })
  return position
}

/**
 * Two sources, both fallible in opposite directions, so the further-along one
 * wins — a run only ever moves forward, which makes "behind" the tell for stale.
 *
 * The status is a snapshot. It reaches this header from the list page's query,
 * and on a refresh that query still says whatever the run was when the list last
 * loaded, so a run that has since reached payslips read "Review, in progress" on
 * every reload. That reading is behind, and loses.
 *
 * The progress endpoint is authoritative but is fetched once on mount, so it is
 * the one that lags right after an action: release the payslips and the page
 * knows the run has moved to awaiting acknowledgment before a refetch could say
 * so. That reading is behind too, and loses in its turn. Ties go to progress,
 * which describes each step rather than inferring it from one status.
 */
const steps = computed(() => {
  const fromProgress = progressSteps.value
  const fromStatus = statusSteps.value
  if (!fromProgress.length) return fromStatus
  if (!fromStatus.length) return fromProgress
  return positionOf(fromProgress) >= positionOf(fromStatus) ? fromProgress : fromStatus
})

onMounted(async () => {
  try {
    progressData.value = await fetchPayoutGroupProgress(props.groupId)
  } catch (err) {
    console.error('[PayoutGroupStepperHeader] fetch failed:', err)
  }
})
</script>

<style scoped>
.steps {
  padding: 14px var(--dash-pad-x);
  border-bottom: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  overflow-x: auto;
}

.steps__list {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: min-content;
}

.step {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

/* ── Rail ── */
.step__rail {
  flex: 1;
  min-width: 18px;
  height: 2px;
  margin: 0 8px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-line);
  transition: background var(--dash-slow) var(--dash-ease);
}
.step__rail--done {
  background: var(--dash-good-mark);
}

/* ── Body ── */
.step__body {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 5px 9px 5px 5px;
  border-radius: var(--dash-r-pill);
  text-decoration: none;
  transition: background var(--dash-fast) var(--dash-ease);
}
.step__body:not(.step__body--locked):hover {
  background: var(--dash-surface);
}
.step__body:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dash-n-25), 0 0 0 4px var(--dash-accent-ring);
}
.step__body--locked {
  cursor: default;
}

/* ── Node ── */
.step__node {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  transition: background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease), box-shadow var(--dash-fast) var(--dash-ease);
}

.step__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.step__label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
  white-space: nowrap;
}

/* The step's condition in words, so state is never carried by colour alone. */
.step__state {
  font-size: 11px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

/* ── States ── */
.step--completed .step__node {
  background: var(--dash-good-bg);
  color: var(--dash-good);
  box-shadow: inset 0 0 0 1px var(--dash-good-line);
}
.step--completed .step__label {
  color: var(--dash-ink);
}
.step--completed .step__state {
  color: var(--dash-good);
}

.step--current .step__node {
  background: var(--dash-accent);
  color: #fff;
  box-shadow: 0 0 0 3px var(--dash-accent-ring);
}
.step--current .step__label {
  color: var(--dash-ink);
  font-weight: 600;
}
.step--current .step__state {
  color: var(--dash-accent);
  font-weight: 500;
}

.step--upcoming .step__node {
  background: var(--dash-surface);
  color: var(--dash-ink-4);
  box-shadow: inset 0 0 0 1px var(--dash-line-strong);
}

.step--locked .step__node {
  background: var(--dash-n-100);
  color: var(--dash-n-400);
}
.step--locked .step__label,
.step--locked .step__state {
  color: var(--dash-ink-4);
}

/* ── Skeleton ── */
.steps__list--loading .step {
  gap: 9px;
  padding: 5px 9px 5px 5px;
}
.step__skeleton-node {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
}
.step__skeleton-label {
  width: 74px;
  height: 10px;
}

/* Below 1024 the five steps cannot all carry a label, so they compress to nodes
   and rails — the current step keeps its label, since that is the one the reader
   needs. */
@media (max-width: 1023px) {
  .steps {
    padding: 12px 14px;
  }
  .step__body {
    padding: 4px;
  }
  .step__text {
    display: none;
  }
  .step--current .step__text {
    display: flex;
  }
  .step__rail {
    margin: 0 6px;
  }
}
</style>
