<template>
  <div class="stats-row">
    <DashboardStatCard
      v-for="(stat, i) in statsCards"
      :key="i"
      :icon="stat.icon"
      :label="stat.label"
      :value="stat.count"
      :loading="pageLoading"
      :icon-bg="stat.iconBg || colorFor(i).bg"
      :icon-color="stat.iconColor || colorFor(i).color"
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

// Fallback palette when stat doesn't provide its own colors
const PALETTE = [
  { bg: '#e8f0fe', color: '#1a73e8' },
  { bg: '#fdecea', color: '#dc2626' },
  { bg: '#e6f6ea', color: '#22c55e' },
  { bg: '#fdf0e6', color: '#f97316' },
  { bg: '#f3e8ff', color: '#7e22ce' },
  { bg: '#e0f7fa', color: '#0e7490' },
]

function colorFor(i) {
  return PALETTE[i % PALETTE.length]
}
</script>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  flex-shrink: 0;
}

@media (min-width: 1441px) {
  .stats-row {
    gap: 16px;
  }
}
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}
@media (max-width: 420px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
