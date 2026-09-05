<template>
  <div class="stat-chips">
    <span class="stat-total">
      <strong>{{ stats.total }}</strong>
      <span class="stat-chip-label">total</span>
    </span>
    <span v-for="seg in segments" :key="seg.key" :class="['stat-chip', `stat-chip--${seg.key}`]">
      <span class="stat-chip-dot" aria-hidden="true"></span>
      <strong>{{ seg.value }}</strong>
      <span class="stat-chip-label">{{ seg.label }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activeTab: String,
  leaveStats: Object,
  overtimeStats: Object,
  caStatistics: Object,
  swapStatistics: Object,
})

const EMPTY = { total: 0, pending: 0, approved: 0, rejected: 0 }

const stats = computed(() => {
  const source =
    {
      leave: props.leaveStats,
      overtime: props.overtimeStats,
      swap: props.swapStatistics,
    }[props.activeTab] || props.caStatistics
  return { ...EMPTY, ...(source || {}) }
})

// Every bucket stays visible so the row does not reflow as counts change. Every
// queue now counts its own rows, overtime included — it used to read a summary
// endpoint that reported no rejected count, so that chip had to be dropped.
const segments = computed(() => {
  const s = stats.value
  return [
    { key: 'pending', label: 'pending', value: s.pending },
    { key: 'approved', label: 'approved', value: s.approved },
    { key: 'rejected', label: 'rejected', value: s.rejected },
  ]
})
</script>

<style scoped>
/*
 * Bordered chips — a tint plus a 1px ring in the same hue — rather than the
 * flat pastel fills these used to carry. On the white tab strip a fill alone
 * goes muddy, and the ring is what the status pills in the tables below already
 * use, so the band and the rows read as one system. Colours come from the
 * status tokens in src/css/dashboard.scss.
 */
.stat-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
/* The total reads as plain text so the tinted chips carry the colour on their
   own — four bordered pills in a row was busier than it was informative. */
.stat-total {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding-right: 2px;
  font-size: 12px;
  font-weight: 400;
  color: var(--dash-ink-3);
  white-space: nowrap;
}
.stat-total strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
}
.stat-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--dash-r-sm);
  border: 1px solid var(--dash-neutral-line);
  background: var(--dash-neutral-bg);
  color: var(--dash-neutral);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
  white-space: nowrap;
}
.stat-chip strong {
  font-size: 12.5px;
  font-weight: 600;
  color: inherit;
  font-variant-numeric: tabular-nums;
}
.stat-chip-dot {
  align-self: center;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stat-chip--pending {
  background: var(--dash-warn-bg);
  border-color: var(--dash-warn-line);
  color: var(--dash-warn);
}
.stat-chip--pending .stat-chip-dot {
  background: var(--dash-warn-mark);
}

.stat-chip--approved {
  background: var(--dash-good-bg);
  border-color: var(--dash-good-line);
  color: var(--dash-good);
}
.stat-chip--approved .stat-chip-dot {
  background: var(--dash-good-mark);
}

.stat-chip--rejected {
  background: var(--dash-critical-bg);
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
}
.stat-chip--rejected .stat-chip-dot {
  background: var(--dash-critical-mark);
}

/* On a laptop the band shares its row with the search field, so the chips drop
   to their dot and figure. Below tablet the row wraps and the words return. */
@media (max-width: 1279px) {
  .stat-chip-label {
    display: none;
  }
}

@media (max-width: 1023px) {
  .stat-chip-label {
    display: inline;
  }
}
</style>
