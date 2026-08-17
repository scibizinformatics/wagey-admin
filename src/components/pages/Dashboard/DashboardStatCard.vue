<template>
  <div class="stat">
    <div class="stat__head">
      <span class="dash-swatch stat__mark" :style="{ background: markColor }" />
      <p class="dash-eyebrow stat__label" :title="label">{{ label }}</p>
    </div>

    <div class="stat__value-row">
      <span v-if="loading" class="dash-shimmer stat__skeleton" />
      <p v-else class="dash-metric stat__value">{{ value }}</p>
      <q-icon :name="icon" size="17px" class="stat__icon" />
    </div>

    <p v-if="subtitle" class="stat__meta">{{ subtitle }}</p>
    <p v-if="sub" class="stat__meta" :class="subClass ? `stat__meta--${subClass}` : ''">{{ sub }}</p>
  </div>
</template>

<script setup>
/**
 * A single KPI tile.
 *
 * Structure follows the pattern every current SaaS dashboard converges on,
 * because it is the one that scans fastest: a small muted label on top, the
 * figure below it at size, supporting text underneath. The row of cards then
 * reads as a row of numbers on a common baseline rather than as five separate
 * compositions.
 *
 * The colour mark is a 8px swatch beside the label, not a filled icon tile. A
 * 40px tinted tile per card put five competing focal points next to the numbers
 * they were supposed to support; the icon survives as a muted glyph trailing
 * the value, where it identifies the metric without shouting.
 *
 * `iconBg` is still accepted so existing callers keep working, but the design
 * no longer uses a filled tile.
 */
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  subtitle: { type: String, default: '' },
  sub: { type: String, default: '' },
  subClass: { type: String, default: '' },
  // Retained for API compatibility with existing callers; unused by the design.
  iconBg: { type: String, default: '' },
  iconColor: { type: String, default: '' },
  valueColor: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

// `valueColor` used to paint the figure itself. Text now wears text ink and the
// colour moves to the mark, so the row of values reads as one column of figures
// rather than a rainbow, and a colour-blind reader loses nothing.
const markColor = computed(() => props.iconColor || props.valueColor || 'var(--dash-n-300)')
</script>

<style scoped>
.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 16px 18px 18px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
}

.stat__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.stat__mark {
  /* Slightly taller than wide so it reads as a marker, not a bullet. */
  width: 4px;
  height: 12px;
  border-radius: var(--dash-r-pill);
}

.stat__label {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat__value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 30px;
}

.stat__value {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat__icon {
  color: var(--dash-n-300);
  flex-shrink: 0;
}

.stat__skeleton {
  height: 22px;
  width: 82px;
  border-radius: var(--dash-r-sm);
}

.stat__meta {
  margin: 0;
  font-size: 12px;
  color: var(--dash-ink-3);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat__meta--positive {
  color: var(--dash-good);
  font-weight: 500;
}
.stat__meta--negative {
  color: var(--dash-critical);
  font-weight: 500;
}

@media (max-width: 1024px) {
  .stat {
    padding: 13px 14px 15px;
    gap: 6px;
  }
  .stat__label {
    white-space: normal;
  }
}
</style>
