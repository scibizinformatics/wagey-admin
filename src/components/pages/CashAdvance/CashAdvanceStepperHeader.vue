<template>
  <nav class="steps" aria-label="Cash advance progress">
    <ol class="steps__list">
      <li
        v-for="(step, i) in steps"
        :key="step.routeKey"
        class="step"
        :class="`step--${step.state}`"
        :aria-current="step.state === 'current' ? 'step' : undefined"
      >
        <!-- The rail belongs to the step it leads *into*, so it fills only once
             the step before it is done. -->
        <span
          v-if="i > 0"
          class="step__rail"
          :class="{ 'step__rail--done': steps[i - 1].state === 'completed' }"
        />

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
 * The four-step cash-advance progress header.
 *
 * A copy of `components/pages/Payroll/PayoutGroupStepperHeader.vue` carrying the
 * same markup and the same styles, so the two flows read as one control. It is a
 * copy rather than a shared component on purpose: the payroll header resolves its
 * states from a step-numbered payload plus a status map, and the cash-advance
 * flow historically had no progress source at all. Sharing the component would
 * mean teaching it a second, weaker mode; keeping them separate means the
 * working five-step flow is not touched at all.
 *
 * The bar has three sources now, furthest-along wins:
 *
 *  - the `payout-group-progress` payload's `ca_progress` array — the flow's own
 *    per-step truth, handed in by the step shell — used whenever the payload
 *    actually carries one (`has_cash_advance` false sends an all-locked
 *    placeholder, which quotes nothing);
 *  - `ca_current_progress` inside the same payload for the "moved on" notice the
 *    shell draws;
 *  - the derived `stage` the page hands in, the pre-payload fallback and the
 *    optimistic reading right after an action.
 *
 * The first fixes the case `waiting_admin_approval`: a status word the status
 * map never placed, over a flow the payload describes perfectly.
 *
 * When the visual contract changes, change it here *and* in the payroll header.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCarriedRunQuery } from 'src/composables/disbursement/useCarriedRunQuery'
import {
  CA_STEP_LABELS,
  CA_STEP_ROUTES,
  cashAdvanceStepIndex,
} from 'src/constants/cashAdvanceStatus'
import {
  cashAdvanceStepsFromProgress,
  hasCashAdvanceTrack,
} from 'src/composables/utils/payoutProgress'

const route = useRoute()
const carriedQuery = useCarriedRunQuery()

const props = defineProps({
  pgiId: { type: [String, Number], required: true },
  /** `review` / `funding` / `disburse` / `complete`, or a status word. */
  stage: { type: String, default: null },
  /**
   * The `payout-group-progress` payload, fetched by the step shell around this
   * header — it needs the same call for its "moved on" notice, so this header
   * does not fetch a second time. `null` reads as "not loaded yet".
   */
  progress: { type: Object, default: null },
})

const BASE_PATH = '/app/payroll/cash-advance'

const stepDefs = CA_STEP_ROUTES.map((routeKey, i) => ({
  routeKey,
  label: CA_STEP_LABELS[i],
}))

const STATE_LABELS = {
  completed: 'Done',
  current: 'In progress',
  locked: 'Locked',
}

const stateLabel = (state) => STATE_LABELS[state] ?? ''

const withRoute = (def) => ({
  ...def,
  route: `${BASE_PATH}/${props.pgiId}/${def.routeKey}`,
})

// The status is a hint that travels in the query, so a deep link or a refresh
// can still place the run when the page has not fetched its payload yet. An
// unknown value opens Review, the same fallback the list uses.
const stageIndex = computed(() => {
  const status = props.stage || route.query.ca_status || route.query.pgi_status
  return cashAdvanceStepIndex(status) ?? 0
})

/** The bar as this page's derived stage places it — everything before done. */
const stageSteps = computed(() =>
  stepDefs.map((def, i) => ({
    ...def,
    ...withRoute(def),
    state: i < stageIndex.value ? 'completed' : i === stageIndex.value ? 'current' : 'locked',
  })),
)

/** A per-step progress word onto this header's rendering states. */
const stateFor = (state) =>
  state === 'in_progress' ? 'current' : state === 'completed' ? 'completed' : 'locked'

/** The bar as the run's own `ca_progress` describes it, per step. */
const progressSteps = computed(() => {
  const mapped = cashAdvanceStepsFromProgress(props.progress, CA_STEP_ROUTES)
  if (!mapped || !hasCashAdvanceTrack(props.progress)) return []
  return mapped.map((s, i) => ({
    ...stepDefs[i],
    ...withRoute(stepDefs[i]),
    state: stateFor(s.state),
  }))
})

/** How far along the flow a given reading of the bar puts it. */
function positionOf(stepList) {
  let position = -1
  stepList.forEach((step, i) => {
    if (step.state === 'completed' || step.state === 'current') position = Math.max(position, i)
  })
  return position
}

/**
 * Two readings, both able to be behind: the payload is fetched once, so an
 * action taken since reads stale, while the page's stage can also get ahead of
 * the status its payload carries. A run only ever moves forward, so the
 * further-along one wins and "behind" — which is the same thing as stale — loses.
 */
const steps = computed(() => {
  const fromProgress = progressSteps.value
  if (!fromProgress.length) return stageSteps.value
  return positionOf(fromProgress) >= stageIndex.value ? fromProgress : stageSteps.value
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
  box-shadow:
    0 0 0 2px var(--dash-n-25),
    0 0 0 4px var(--dash-accent-ring);
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
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
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

/* Below 1024 the four steps cannot all carry a label, so they compress to nodes
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
