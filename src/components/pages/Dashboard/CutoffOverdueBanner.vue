<template>
  <div v-if="overdue" class="overdue" role="alert">
    <span class="dash-featured-icon overdue__icon">
      <q-icon name="priority_high" size="18px" />
    </span>

    <div class="overdue__text">
      <p class="overdue__title">Previous cutoff is still open</p>
      <p class="overdue__message">
        {{ overdue.cutoff_range }} has
        <strong>{{ overdue.groups_count }}</strong>
        {{ overdue.groups_count === 1 ? 'payout group' : 'payout groups' }} still awaiting
        disbursement.
      </p>
    </div>

    <q-btn
      label="Open previous cutoff"
      no-caps
      dense
      unelevated
      size="12px"
      class="overdue__btn"
      @click="$emit('openCutoff', overdue)"
    />
  </div>
</template>

<script setup>
/**
 * Alert for a prior cutoff that never finished disbursing.
 *
 * Moved to the top of the Current Cutoff tab. It used to render below the
 * payout table, where the most urgent thing on the page sat furthest from the
 * reader's entry point — an alert nobody scrolls to is not an alert.
 *
 * Styled critical rather than warning: an unpaid cutoff is money owed, not a
 * caution. `role="alert"` so it is announced when it appears.
 */
defineProps({
  overdue: { type: Object, default: null },
})

defineEmits(['openCutoff'])
</script>

<style scoped>
.overdue {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
  border-radius: var(--dash-r-lg);
  flex-wrap: wrap;
}

/* A ringed featured icon rather than a bare glyph plus a left rule. The old
   banner used three separate signals — tint, rule and icon — for one message. */
.overdue__icon {
  background: var(--dash-surface);
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
  box-shadow: 0 0 0 4px rgba(180, 35, 24, 0.06);
  width: 36px;
  height: 36px;
}

.overdue__text {
  flex: 1;
  min-width: 200px;
}

.overdue__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: #912018;
  letter-spacing: -0.006em;
}

.overdue__message {
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dash-critical);
}
.overdue__message strong {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.overdue__btn {
  flex-shrink: 0;
  background: var(--dash-surface);
  color: #912018;
  border: 1px solid var(--dash-critical-line);
  box-shadow: var(--dash-shadow-xs);
  border-radius: var(--dash-r-md);
  padding: 6px 14px;
  font-weight: 600;
}
.overdue__btn:hover {
  background: var(--dash-critical-bg);
}

@media (max-width: 600px) {
  .overdue {
    align-items: flex-start;
  }
  .overdue__btn {
    width: 100%;
  }
}
</style>
