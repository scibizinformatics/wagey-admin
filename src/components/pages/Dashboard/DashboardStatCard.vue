<template>
  <div class="stat">
    <div class="stat__head">
      <span class="dash-swatch stat__mark" :style="{ background: markColor }" />
      <p class="dash-eyebrow stat__label" :title="label">{{ label }}</p>
      <q-icon :name="icon" size="15px" class="stat__icon" />
    </div>

    <div class="stat__value-row">
      <span v-if="loading" class="dash-shimmer stat__skeleton" />
      <p v-else class="dash-metric stat__value">{{ value }}</p>

      <p v-if="subtitle" class="stat__meta" :title="subtitle">{{ subtitle }}</p>
      <p
        v-if="sub"
        class="stat__meta"
        :class="subClass ? `stat__meta--${subClass}` : ''"
        :title="sub"
      >
        {{ sub }}
      </p>
    </div>
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
 * The tile is deliberately two lines tall, not three. Supporting text
 * ("Year to date", a funded amount) sits on the value's baseline beside the
 * figure rather than on a line of its own: a third line cost ~40px of height on
 * every card in the row — the grid stretches all cards to the tallest — which
 * pushed the actual dashboard content below the fold on the Annual tab, where
 * all five cards carry a subtitle. Beside the number it also reads better,
 * because the qualifier is attached to the figure it qualifies.
 *
 * The value row wraps, so a card too narrow to hold figure and qualifier side
 * by side drops the qualifier underneath instead of squeezing either. The
 * figure itself never shrinks or truncates — a clipped peso amount is a wrong
 * number, so the meta gives way first.
 *
 * The colour mark is a small swatch beside the label, not a filled icon tile. A
 * 40px tinted tile per card put five competing focal points next to the numbers
 * they were supposed to support; the icon survives as a muted glyph closing the
 * label row, where it identifies the metric without shouting.
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
  gap: 6px;
  min-width: 0;
  padding: 13px 15px 14px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
}

.stat__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.stat__mark {
  /* Slightly taller than wide so it reads as a marker, not a bullet. */
  width: 3px;
  height: 11px;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}

.stat__label {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-size: 11.5px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat__icon {
  color: var(--dash-n-300);
  flex-shrink: 0;
}

.stat__value-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  column-gap: 8px;
  row-gap: 1px;
  min-width: 0;
  /* Holds the baseline steady across cards whose figure is still loading. */
  min-height: 25px;
}

.stat__value {
  margin: 0;
  /* One step down from .dash-metric: at 24px the figure set the whole tile's
     height, and 21px still reads as the loudest thing on the card. */
  font-size: 21px;
  line-height: 1.18;
  /* Never shrinks — the meta beside it wraps away instead of the number
     truncating. */
  flex: 0 0 auto;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat__skeleton {
  height: 20px;
  width: 78px;
  border-radius: var(--dash-r-sm);
  /* Baseline alignment would hang the placeholder off the top of the row; the
     loaded figure fills the row's full height, so centre it to keep the tile
     from shifting when the value lands. */
  align-self: center;
}

.stat__meta {
  margin: 0;
  flex: 0 1 auto;
  min-width: 0;
  font-size: 11px;
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

@media (min-width: 1441px) {
  .stat {
    padding: 14px 17px 15px;
  }
  .stat__value {
    font-size: 22px;
  }
}

@media (max-width: 1024px) {
  .stat {
    padding: 10px 12px 11px;
    gap: 4px;
  }
  .stat__label {
    white-space: normal;
  }
  .stat__value {
    font-size: 19px;
  }
  .stat__value-row {
    min-height: 22px;
  }
}
</style>
