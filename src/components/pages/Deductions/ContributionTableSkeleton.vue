<template>
  <div class="tsk" :class="wrapClass" :aria-label="`Loading ${label}`" role="status">
    <div class="tsk__head">
      <span v-for="c in cols" :key="`h-${c}`" class="dash-shimmer tsk__cell tsk__cell--head" />
    </div>
    <div v-for="r in rows" :key="`r-${r}`" class="tsk__row">
      <span
        v-for="c in cols"
        :key="`c-${r}-${c}`"
        class="dash-shimmer tsk__cell"
        :style="{ width: widthFor(r, c) }"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * Loading state for the three contribution tables.
 *
 * The tables previously showed nothing but Quasar's 2px progress bar while the
 * three period requests were in flight, so the panel collapsed to an empty
 * strip and then jumped to full height. Skeleton rows hold the layout at
 * roughly its final size, which is the difference between "loading" and
 * "briefly broken".
 *
 * Cell widths vary per row from a fixed pattern rather than at random, so the
 * placeholder reads as tabular data without needing Math.random() (which would
 * also re-roll on every re-render).
 */
defineProps({
  /**
   * Placeholder rows to draw. Sixteen brings the block to roughly the content
   * floor (`--dash-body-min`, 580px) these panels carry — see the note on the
   * same prop in `components/common/TableSkeleton.vue`, which this mirrors so
   * the two skeletons cannot drift apart.
   */
  rows: { type: Number, default: 16 },
  cols: { type: Number, default: 6 },
  label: { type: String, default: 'data' },
  /**
   * Extra class for the wrapper, applied the way `TableSkeleton.vue` does it.
   *
   * This skeleton is a sibling of the table it stands in for rather than a
   * child of it, so there is no shared root to put a layout class on — the two
   * branches each carry what they need, and this is how the skeleton branch gets
   * it.
   */
  wrapClass: { type: [String, Array, Object], default: '' },
})

const WIDTHS = ['82%', '58%', '70%', '46%', '64%', '76%', '52%']

function widthFor(row, col) {
  return WIDTHS[(row * 3 + col) % WIDTHS.length]
}
</script>

<style scoped>
.tsk {
  padding: 0 12px;
}

.tsk__head,
.tsk__row {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* Matches `.dash-qtable`'s header padding so the panel does not jump height when
   the real table replaces this. */
.tsk__head {
  padding: 13px 6px 11px;
  border-bottom: 1px solid var(--dash-line);
}

.tsk__row {
  padding: var(--dash-row-y) 6px;
  border-bottom: 1px solid var(--dash-line-soft);
  min-height: 42px;
}
.tsk__row:last-child {
  border-bottom: none;
}

/* The first column is the label column in all three tables, so it stays wider
   than the numeric ones. */
.tsk__cell {
  flex: 1 1 0;
  min-width: 0;
  height: 11px;
}
.tsk__cell:first-child {
  flex: 1.6 1 0;
}

.tsk__cell--head {
  height: 8px;
  width: 54% !important;
  opacity: 0.75;
}

@media (max-width: 1279px) {
  .tsk {
    padding: 0 8px;
  }
  .tsk__head {
    padding: 12px 6px 10px;
  }
}
</style>
