<template>
  <div class="stat-chips">
    <span class="stat-total">
      <strong>{{ stats.total }}</strong>
      <span class="stat-chip-label">total</span>
    </span>
    <span
      v-for="seg in segments"
      :key="seg.key"
      :class="['stat-chip', `stat-chip--${seg.key}`]"
    >
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

// Every bucket stays visible so the row does not reflow as counts change. The
// overtime endpoint reports no rejected count at all, so that chip is dropped
// there rather than always showing a hard-coded zero.
const segments = computed(() => {
  const s = stats.value
  const list = [
    { key: 'pending', label: 'pending', value: s.pending },
    { key: 'approved', label: 'approved', value: s.approved },
  ]
  if (props.activeTab !== 'overtime') {
    list.push({ key: 'rejected', label: 'rejected', value: s.rejected })
  }
  return list
})
</script>

<style scoped>
.stat-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}
/* The total reads as plain text so the three tinted chips carry the colour on
   their own — four bordered pills in a row was busier than it was informative. */
.stat-total {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding-right: 4px;
  font-size: 11.5px;
  font-weight: 500;
  color: #94a3b8;
  white-space: nowrap;
}
.stat-total strong {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  font-variant-numeric: tabular-nums;
}
.stat-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
}
.stat-chip strong {
  font-size: 12.5px;
  font-weight: 700;
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
  background: #fef6e4;
  color: #b45309;
}
.stat-chip--pending strong {
  color: #92400e;
}
.stat-chip--pending .stat-chip-dot {
  background: #f59e0b;
}

.stat-chip--approved {
  background: #eefbf2;
  color: #15803d;
}
.stat-chip--approved strong {
  color: #14532d;
}
.stat-chip--approved .stat-chip-dot {
  background: #22c55e;
}

.stat-chip--rejected {
  background: #fdf1f1;
  color: #b91c1c;
}
.stat-chip--rejected strong {
  color: #7f1d1d;
}
.stat-chip--rejected .stat-chip-dot {
  background: #ef4444;
}

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
