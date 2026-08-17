<template>
  <!-- aria-busy + a screen-reader label so the loading state is announced rather
       than read as an empty region. -->
  <div class="dash-skeleton" :class="`dash-skeleton--${variant}`" aria-busy="true" aria-live="polite">
    <span class="sr-only">Loading</span>

    <template v-if="variant === 'table'">
      <div class="dash-skeleton__head">
        <span v-for="c in columns" :key="`h${c}`" class="dash-shimmer" :style="headStyle(c)" />
      </div>
      <div v-for="r in rows" :key="r" class="dash-skeleton__row">
        <span
          v-for="c in columns"
          :key="`${r}-${c}`"
          class="dash-shimmer"
          :style="cellStyle(r, c)"
        />
      </div>
    </template>

    <template v-else-if="variant === 'chart'">
      <div class="dash-skeleton__chart">
        <span
          v-for="n in 7"
          :key="n"
          class="dash-shimmer dash-skeleton__bar"
          :style="barStyle(n)"
        />
      </div>
    </template>

    <template v-else-if="variant === 'tiles'">
      <div class="dash-skeleton__tiles">
        <span v-for="n in rows" :key="n" class="dash-shimmer dash-skeleton__tile" :style="delay(n)" />
      </div>
    </template>

    <template v-else>
      <span
        v-for="n in rows"
        :key="n"
        class="dash-shimmer"
        :style="lineStyle(n)"
      />
    </template>
  </div>
</template>

<script setup>
/**
 * One skeleton for the whole dashboard.
 *
 * Replaces the ~12 hand-copied `eps-shimmer` + `@keyframes eps-pulse` blocks
 * that had drifted apart across the panel files. The shape mirrors the content
 * it stands in for, so the panel does not visibly jump when data lands.
 */
defineProps({
  /** lines | table | chart | tiles */
  variant: { type: String, default: 'lines' },
  rows: { type: Number, default: 5 },
  columns: { type: Number, default: 4 },
})

// Deterministic pseudo-random widths — varying the bars stops the skeleton
// reading as a loading *pattern* instead of standing-in content, and keeping it
// deterministic avoids a reflow on every re-render.
function pseudo(seed) {
  return (Math.sin(seed * 12.9898) * 43758.5453) % 1
}

function lineStyle(n) {
  const w = 55 + Math.abs(pseudo(n)) * 35
  return { width: `${w.toFixed(1)}%`, animationDelay: `${n * 0.09}s` }
}

function headStyle(c) {
  return { flex: c === 1 ? 1.6 : 1, height: '9px', animationDelay: `${c * 0.05}s` }
}

function cellStyle(r, c) {
  const w = 50 + Math.abs(pseudo(r * 7 + c)) * 45
  return {
    flex: c === 1 ? 1.6 : 1,
    maxWidth: `${w.toFixed(1)}%`,
    animationDelay: `${(r * 0.08 + c * 0.04).toFixed(2)}s`,
  }
}

function barStyle(n) {
  const h = 30 + Math.abs(pseudo(n * 3)) * 65
  return { height: `${h.toFixed(1)}%`, animationDelay: `${n * 0.07}s` }
}

function delay(n) {
  return { animationDelay: `${n * 0.08}s` }
}
</script>

<style scoped>
.dash-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 120px;
  justify-content: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ── table ── */
.dash-skeleton--table {
  justify-content: flex-start;
  gap: 0;
}
/* Mirrors DashTable's header strip so the panel does not shift when data lands. */
.dash-skeleton__head {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 0 10px 11px;
  border-bottom: 1px solid var(--dash-line);
}
.dash-skeleton__row {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 14px 10px;
  border-bottom: 1px solid var(--dash-line-soft);
}
.dash-skeleton__row:last-child {
  border-bottom: none;
}

/* ── chart ── */
.dash-skeleton--chart {
  justify-content: flex-end;
}
.dash-skeleton__chart {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 100%;
  min-height: 150px;
  padding-top: 10px;
}
.dash-skeleton__bar {
  flex: 1;
  height: auto;
  border-radius: var(--dash-r-sm) var(--dash-r-sm) 2px 2px;
}

/* ── tiles ── */
.dash-skeleton--tiles {
  justify-content: flex-start;
}
.dash-skeleton__tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.dash-skeleton__tile {
  height: 46px;
  border-radius: var(--dash-r-md);
}
</style>
