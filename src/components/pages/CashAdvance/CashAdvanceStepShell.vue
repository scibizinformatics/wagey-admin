<template>
  <div class="step-page">
    <!-- ── Page header ─────────────────────────────────────────────────────── -->
    <header class="step-head">
      <div class="step-head__lead">
        <!-- One way back, always in the same place. Same construction as the
             five payroll steps, so the two flows read as one. -->
        <q-btn
          flat
          dense
          round
          size="12px"
          icon="arrow_back"
          class="step-head__back"
          aria-label="Back to cash advances"
          @click="goBack"
        >
          <q-tooltip>Back to cash advances</q-tooltip>
        </q-btn>

        <div class="step-head__titles">
          <p class="step-head__eyebrow">Step {{ stepNumber }} of 4 · {{ stepName }}</p>
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
      <!-- `stepperKey` makes the shell refetch the run's progress after an
           action that advances the flow; the payload also revises the "moved
           on" notice below. -->
      <CashAdvanceStepperHeader
        :key="stepperKey"
        :pgi-id="pgiId"
        :stage="stage"
        :progress="progressPayload"
      />

      <div :class="['step-board__body', { 'step-board__body--flush': flush }]">
        <!-- The cash-advance flow can move on without this page knowing: a
             decision, a funding entry or a release changes the derived stage as
             soon as the page refetches. The step still renders — a finished step
             is worth reading back — but it says so, and offers the one link
             forward, rather than leaving the reader to work out where the work
             went. -->
        <div v-if="movedOn" class="step-moved" role="status">
          <q-icon name="o_info" size="16px" class="step-moved__icon" />
          <span class="step-moved__text">
            These advances have moved on to <strong>{{ runStepLabel }}</strong
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
 * Common chrome for the four cash-advance steps.
 *
 * A copy of `components/pages/Payroll/DisbursementStepShell.vue` carrying the
 * same header, back affordance, board and "moved on" notice, so the cash-advance
 * flow is visually the payroll flow with four steps instead of five. It is a copy
 * rather than a shared component on purpose: the payroll shell resolves its
 * position from `PGI_STATUS_MAP` plus the payroll progress array, and this one
 * resolves it from the cash-advance stage the page derives, corrected by the
 * payload's `ca_progress` / `ca_current_progress`. Sharing would mean teaching
 * the payroll shell a second mode and touching the working five-step flow; the
 * two copies are deliberately kept small and identical in layout.
 *
 * `stage` and `status` are separate on purpose. `stage` places the run in the
 * four-step flow and drives the progress bar; `status` is the payout/group status
 * the badge names. They are not the same vocabulary, and conflating them put a
 * chip reading "Funding" where the backend status belongs.
 *
 * When the visual contract changes, change it here *and* in the payroll shell.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import CashAdvanceStepperHeader from 'src/components/pages/CashAdvance/CashAdvanceStepperHeader.vue'
import PayoutStatusBadge from 'src/components/pages/Payroll/PayoutStatusBadge.vue'
import { useCarriedRunQuery } from 'src/composables/disbursement/useCarriedRunQuery'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import {
  CA_STEP_LABELS,
  CA_STEP_ROUTES,
  cashAdvanceStepIndex,
} from 'src/constants/cashAdvanceStatus'
import { cashAdvanceStageRoute } from 'src/composables/utils/payoutProgress'

const router = useRouter()
const carriedQuery = useCarriedRunQuery()
const { fetchPayoutGroupProgress } = useDisbursementApi()

const props = defineProps({
  pgiId: { type: [String, Number], required: true },
  /** 1–4 */
  step: { type: Number, required: true },
  /** The derived cash-advance stage: review / funding / disburse / complete. */
  stage: { type: String, default: '' },
  /** The payout/group status the badge names. */
  status: { type: String, default: '' },
  /** Payout group name; renders a placeholder until it arrives. */
  groupName: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  /** Drop body padding, for a step whose content owns its own edges. */
  flush: { type: Boolean, default: false },
  /** Bump to remount the progress header, e.g. after a decision. */
  stepperKey: { type: [Number, String], default: 0 },
})

const stepNumber = computed(() => props.step)
const stepName = computed(() => CA_STEP_LABELS[props.step - 1] ?? '')

/**
 * The run's progress payload, fetched here and handed to the header. The
 * cash-advance payload's `ca_progress` array is the one place the flow's steps
 * are spelled out step by step, and `ca_current_progress` names the stage even
 * when `cash_advance_status` is a state this app does not map (e.g.
 * `waiting_admin_approval`). The header draws its rail from it; this shell
 * reads the same stage for its "moved on" notice, so a bar and the notice under
 * it cannot disagree about where the advances went.
 *
 * The `stepperKey` bump refetches after a state-advancing action, exactly as it
 * used to remount the header for its own fetch.
 */
const progressPayload = ref(null)

async function loadProgress() {
  if (!props.pgiId) return
  try {
    progressPayload.value = await fetchPayoutGroupProgress(props.pgiId)
  } catch (err) {
    console.error('[CashAdvanceStepShell] progress fetch failed:', err)
  }
}

onMounted(loadProgress)
watch(() => [props.pgiId, props.stepperKey], loadProgress)

/** The 0-based index of the step this page renders. */
const pageStepIndex = computed(() => props.step - 1)

/**
 * Where the cash-advance flow sits, as the further-along of the stage the page
 * derives and the payload's `ca_current_progress` / `ca_progress`.
 *
 * The two lag in opposite directions — the page's stage advances optimistically
 * when its own payload leaves nothing to do, the fetched payload lags behind a
 * just-taken action — so the further-along one wins, the same rule the payroll
 * header applies. `null` from either side falls back to the other; both `null`
 * is "unknown", which is not a position and never reads as "behind".
 */
const runStepIndex = computed(() => {
  const pageIndex = cashAdvanceStepIndex(props.stage)
  const progressIndex = cashAdvanceStepIndex(cashAdvanceStageRoute(progressPayload.value))
  if (pageIndex == null) return progressIndex
  if (progressIndex == null) return pageIndex
  return Math.max(pageIndex, progressIndex)
})

/** Whether the flow has moved past the step on screen. Strictly greater. */
const movedOn = computed(
  () => runStepIndex.value != null && runStepIndex.value > pageStepIndex.value,
)

// The label the progress header uses, so the notice names the step the same way
// the bar the reader just looked at does.
const runStepLabel = computed(() => CA_STEP_LABELS[runStepIndex.value ?? 0] ?? '')
const runStepRoute = computed(
  () => `/app/payroll/cash-advance/${props.pgiId}/${CA_STEP_ROUTES[runStepIndex.value ?? 0]}`,
)

function goBack() {
  router.push('/app/payroll?view=cash_advance')
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
   is behind the flow. */
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
