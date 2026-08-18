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

const router = useRouter()

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
