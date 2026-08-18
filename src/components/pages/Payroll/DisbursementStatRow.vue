<template>
  <div class="stat-row">
    <div v-for="tile in tiles" :key="tile.key ?? tile.label" class="stat">
      <div class="stat__head">
        <span class="stat__mark" :style="{ background: tile.mark || 'var(--dash-n-300)' }" />
        <span class="stat__label" :title="tile.label">{{ tile.label }}</span>
      </div>
      <span v-if="loading" class="dash-shimmer stat__skeleton" />
      <span v-else class="stat__value" :class="{ 'dash-num': tile.numeric !== false }">
        {{ tile.value }}
      </span>
    </div>
  </div>
</template>

<script setup>
/**
 * The figures strip shared by all five disbursement steps.
 *
 * Each step previously rendered its own copy of a `.stats-bar` — a grey band of
 * label/value segments separated by vertical rules — with its own dot colours and
 * its own ~60 lines of CSS, five times over. Worse, a fixed row of six segments
 * could not fit its own labels once the navigation rail took its share, so labels
 * truncated before the numbers did.
 *
 * Tiles wrap instead, and take their marks from the design system's ramps.
 *
 * Tiles: [{ key?, label, value, mark?, numeric? }]
 *   mark     — a CSS colour for the leading rule; defaults to neutral.
 *   numeric  — set false for a value that is not a figure (a date, a status), so
 *              it does not get tabular spacing meant for digits.
 */
defineProps({
  tiles: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
</script>

<style scoped>
.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 10px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  padding: 11px 13px 12px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  box-shadow: var(--dash-shadow-xs);
}

.stat__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.stat__mark {
  width: 3px;
  height: 10px;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}

.stat__label {
  font-size: 12px;
  color: var(--dash-ink-3);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat__value {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--dash-ink);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat__skeleton {
  width: 66px;
  height: 16px;
}

@media (max-width: 640px) {
  .stat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .stat__value {
    font-size: 17px;
  }
}
</style>
