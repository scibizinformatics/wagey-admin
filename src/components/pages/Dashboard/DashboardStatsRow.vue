<template>
  <div class="stats-row">
    <DashboardStatCard
      v-for="(stat, i) in statsCards"
      :key="stat.label || i"
      :icon="stat.icon"
      :label="stat.label"
      :value="stat.count"
      :loading="pageLoading"
      :icon-color="stat.iconColor || seriesColor(i)"
      :value-color="stat.valueColor"
      :subtitle="stat.subtitle"
    />
  </div>
</template>

<script setup>
import DashboardStatCard from '@/components/pages/Dashboard/DashboardStatCard.vue'

defineProps({
  statsCards: { type: Array, required: true },
  pageLoading: { type: Boolean, default: false },
})

// Fixed series order, taken from the validated categorical ramp in
// src/css/dashboard.scss. Cards past the sixth reuse the neutral mark rather
// than cycling the ramp — a cycled hue implies a relationship that isn't there.
const SERIES = [
  'var(--dash-cat-1)',
  'var(--dash-cat-2)',
  'var(--dash-cat-3)',
  'var(--dash-cat-4)',
  'var(--dash-cat-5)',
  'var(--dash-cat-6)',
]

function seriesColor(i) {
  return SERIES[i] ?? 'var(--dash-neutral-mark)'
}
</script>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--dash-gap);
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 420px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
