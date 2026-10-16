<template>
  <div class="step-page">
    <!-- ── Page header ─────────────────────────────────────────────────────── -->
    <header class="step-head">
      <div class="step-head__lead">
        <!-- One way back, always in the same place. Each step used to roll its
             own back affordance, so the exit moved as you advanced. -->
        <q-btn
          flat
          dense
          round
          size="12px"
          icon="arrow_back"
          class="step-head__back"
          aria-label="Back to disbursement runs"
          @click="goBack"
        >
          <q-tooltip>Back to runs</q-tooltip>
        </q-btn>

        <div class="step-head__titles">
          <p class="step-head__eyebrow">
            Step {{ stepNumber }} of 5 · {{ stepName }}
          </p>
          <h1 class="step-head__title">
            <span v-if="groupName">{{ groupName }}</span>
            <span v-else class="dash-shimmer step-head__title-skeleton" />
          </h1>
          <p v-if="subtitle" class="step-head__sub">{{ subtitle }}</p>
        </div>
      </div>

      <div class="step-head__meta">
        <PayoutStatusBadge v-if="status" :status="status" />
        <slot name="header-actions" />
      </div>
    </header>

    <!-- ── Progress + content ──────────────────────────────────────────────── -->
    <section class="dash-panel step-board">
      <!-- `stepperKey` lets a step force the progress header to refetch after an
           action that advances the flow — incrementing it remounts the header. -->
      <PayoutGroupStepperHeader :key="stepperKey" :group-id="groupId" :pgi-status="status" />

      <!-- No footer slot by design. A step's primary action belongs in its list
           toolbar, beside search, where it is visible without scrolling past the
           table to find it. -->
      <div :class="['step-board__body', { 'step-board__body--flush': flush }]">
        <!-- The run moves on without this page knowing: a stale list row can
             route an open into a step the run has already left, and a run can
             advance while the page sits open. The step still renders — a
             completed step is worth reading back — but it says so, and offers
             the one link forward, rather than leaving its own forward action
             pointing at a step the run has passed. -->
        <div v-if="movedOn" class="step-moved" role="status">
          <q-icon name="o_info" size="16px" class="step-moved__icon" />
          <span class="step-moved__text">
            This run has moved on to <strong>{{ runStepLabel }}</strong
            >. You are viewing an earlier step.
          </span>
          <q-btn
            unelevated
            no-caps
            dense
            :label="`Go to ${runStepLabel}`"
            icon-right="o_arrow_forward"
            class="step-moved__btn"
            :to="{ path: runStepRoute, query: carriedQuery }"
          />
        </div>

        <slot />
      </div>
    </section>
  </div>
</template>

<script setup>
/**
 * Common chrome for the five disbursement steps.
 *
 * Each step page previously built its own header, back button and stepper
 * placement, so the frame shifted as you moved through the flow — different
 * paddings, different title sizes, the exit in a different spot. This holds the
 * frame still: the only thing that changes between steps is the content slot.
 *
 * Layout is the same page-header-plus-card pattern as Employees, Attendance and
 * Schedule, so the disbursement flow stops being the odd one out.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PayoutGroupStepperHeader from 'src/components/pages/Payroll/PayoutGroupStepperHeader.vue'
import PayoutStatusBadge from 'src/components/pages/Payroll/PayoutStatusBadge.vue'
import { useCarriedRunQuery } from 'src/composables/disbursement/useCarriedRunQuery'
import {
  PGI_STEP_LABELS,
  currentStepIndexForPgiStatus,
  stepRouteForPgiStatus,
} from 'src/constants/pgiStatus'

const router = useRouter()
const carriedQuery = useCarriedRunQuery()

const props = defineProps({
  groupId: { type: [String, Number], required: true },
  /** 1–5 */
  step: { type: Number, required: true },
  /** Payout group name; renders a placeholder until it arrives. */
  groupName: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  status: { type: String, default: '' },
  /** Drop body padding, for a step whose content owns its own edges. */
  flush: { type: Boolean, default: false },
  /** Bump to remount the progress header, e.g. after releasing payslips. */
  stepperKey: { type: [Number, String], default: 0 },
})

const STEP_NAMES = ['Review employees', 'Payslips', 'Funding', 'Disbursement', 'Complete']

const stepNumber = computed(() => props.step)
const stepName = computed(() => STEP_NAMES[props.step - 1] ?? '')

/** The 0-based index of the step this page renders. */
const pageStepIndex = computed(() => props.step - 1)

/**
 * Where the run itself sits, when its status is one this app can place. `null`
 * before the status resolves — an unknown position is not a position, and must
 * not be read as "behind".
 */
const runStepIndex = computed(() => currentStepIndexForPgiStatus(props.status))

/**
 * Whether the run has moved past the step on screen. Strictly greater: a run on
 * this page's own step has not moved on, and one on a later step has.
 */
const movedOn = computed(
  () => runStepIndex.value != null && runStepIndex.value > pageStepIndex.value,
)

// The label the progress header uses, so the notice names the step the same way
// the bar the reader just looked at does.
const runStepLabel = computed(() => PGI_STEP_LABELS[runStepIndex.value ?? 0] ?? '')
const runStepRoute = computed(
  () => `/app/payroll/${stepRouteForPgiStatus(props.status)}/${props.groupId}`,
)

function goBack() {
  router.push('/app/payroll')
}
</script>

<style scoped>
.step-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Header ── */
.step-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.step-head__lead {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.step-head__back {
  color: var(--dash-ink-3);
  margin-top: 2px;
  flex-shrink: 0;
}
.step-head__back:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

.step-head__titles {
  min-width: 0;
}

/* Where you are in the sequence, above the thing you are working on. */
.step-head__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--dash-accent);
}

.step-head__title {
  margin: 2px 0 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: var(--dash-ink);
}

.step-head__title-skeleton {
  display: inline-block;
  width: 200px;
  height: 20px;
  vertical-align: middle;
}

.step-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.step-head__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

/* ── Board ── */
.step-board {
  overflow: hidden;
}

.step-board__body {
  padding: var(--dash-pad-y) var(--dash-pad-x);
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
  min-width: 0;
}
.step-board__body--flush {
  padding: 0;
}

/* ── "Moved on" notice ──
   A state of the step, not an error: quiet surface, one line, one way forward.
   The link wears the app's navy action rather than the outline the step's own
   buttons use, because it is the one thing worth pressing on a page whose work
   is behind the run. */
.step-moved {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  font-size: 13px;
  color: var(--dash-ink-2);
}

.step-moved__icon {
  color: var(--dash-accent);
  flex-shrink: 0;
}

.step-moved__text {
  flex: 1;
  min-width: 0;
}

.step-moved__text strong {
  color: var(--dash-ink);
  font-weight: 600;
}

.step-moved__btn {
  flex-shrink: 0;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}
.step-moved__btn:hover {
  background: #193d5c;
}

@media (max-width: 1023px) {
  .step-head__title {
    font-size: 20px;
  }
}

@media (max-width: 640px) {
  .step-head {
    align-items: stretch;
  }
}
</style>
