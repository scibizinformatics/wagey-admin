<template>
  <span v-if="pct == null" class="rate rate--none">—</span>
  <span
    v-else
    class="rate dash-bar"
    role="progressbar"
    :aria-valuenow="Math.round(pct)"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="`Collected ${pct.toFixed(1)}%`"
  >
    <span class="dash-bar__track" :class="`dash-bar__track--${tone}`">
      <span
        class="dash-bar__fill"
        :class="`dash-bar__fill--${tone}`"
        :style="{ width: `${Math.min(100, Math.max(0, pct))}%` }"
      />
    </span>
    <span class="dash-bar__label rate__label" :class="`rate-ink--${tone}`">
      {{ pct.toFixed(1) }}%
    </span>
  </span>
</template>

<script setup>
/**
 * Deducted as a share of due, inside a table cell.
 *
 * The three summaries all carried the two figures but left the reader to divide
 * one by the other across a row of near-identical peso columns. A bar answers
 * "is this period collected?" at a glance, and the tone carries the same
 * thresholds everywhere (see composables/utils/contributions.js). The percentage
 * is always printed next to it, so the reading never depends on colour alone.
 */
import { computed } from 'vue'
import { collectedTone } from 'src/composables/utils/contributions'

const props = defineProps({
  /** 0–100, or null when nothing was due. */
  pct: { type: Number, default: null },
})

const tone = computed(() => collectedTone(props.pct))
</script>

<style scoped>
.rate {
  min-width: 108px;
}

.rate--none {
  display: inline-block;
  color: var(--dash-ink-4);
  text-align: right;
  width: 100%;
}

.rate__label {
  min-width: 44px;
}

/* The track and fill tones are design-system classes (`.dash-bar__track--*` and
   `.dash-bar__fill--*` in dashboard.scss) — only the label ink is local. */
.rate-ink--good {
  color: var(--dash-good);
}
.rate-ink--info {
  color: var(--dash-info);
}
.rate-ink--warn {
  color: var(--dash-warn);
}
.rate-ink--critical {
  color: var(--dash-critical);
}

@media (max-width: 1279px) {
  .rate {
    min-width: 92px;
  }
  .rate__label {
    min-width: 40px;
    font-size: 11.5px;
  }
}
</style>
