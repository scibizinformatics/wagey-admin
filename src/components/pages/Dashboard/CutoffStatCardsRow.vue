<template>
  <div class="cutoff-stats-row">
    <DashboardStatCard
      v-for="(s, i) in cardItems"
      :key="i"
      :icon="s.icon"
      :label="s.label"
      :value="s.value"
      :loading="loading"
      :icon-bg="s.iconBg"
      :icon-color="s.iconColor"
      :value-color="s.valueColor"
      :sub="s.sub"
      :sub-class="s.subClass"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import DashboardStatCard from '@/components/pages/Dashboard/DashboardStatCard.vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({
      open_payout_groups: 0,
      employees_needing_review: 0,
      awaiting_acknowledgment: 0,
      ready_for_funding_groups: 0,
      ready_for_funding_amount: 0,
      remaining_to_disburse: 0,
    }),
  },
  loading: { type: Boolean, default: false },
  fmtCurrency: { type: Function, default: (v) => `₱${Number(v || 0).toLocaleString('en-PH')}` },
})

const cardItems = computed(() => [
  {
    icon: 'folder_open',
    label: 'Open Payout Groups',
    value: String(props.stats.open_payout_groups),
    iconBg: '#fff7ed',
    iconColor: '#f97316',
    valueColor: '#c2410c',
    sub: '',
  },
  {
    icon: 'rate_review',
    label: 'Employees Needing Review',
    value: String(props.stats.employees_needing_review),
    iconBg: '#eff6ff',
    iconColor: '#3b82f6',
    valueColor: '#1d4ed8',
    sub: '',
  },
  {
    icon: 'how_to_reg',
    label: 'Awaiting Acknowledgment',
    value: String(props.stats.awaiting_acknowledgment),
    iconBg: '#f5f3ff',
    iconColor: '#8b5cf6',
    valueColor: '#6d28d9',
    sub: '',
  },
  {
    icon: 'check_circle',
    label: 'Ready for Funding',
    value: String(props.stats.ready_for_funding_groups),
    iconBg: '#f0fdf4',
    iconColor: '#22c55e',
    valueColor: '#15803d',
    sub: props.fmtCurrency(props.stats.ready_for_funding_amount),
    subClass: 'positive',
  },
  {
    icon: 'payments',
    label: 'Remaining to Disburse',
    value: props.fmtCurrency(props.stats.remaining_to_disburse),
    iconBg: '#fef2f2',
    iconColor: '#ef4444',
    valueColor: '#dc2626',
    sub: '',
  },
])
</script>

<style scoped>
.cutoff-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

@media (min-width: 1441px) {
  .cutoff-stats-row { gap: 16px; }
}

@media (max-width: 1024px) {
  .cutoff-stats-row { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .cutoff-stats-row { grid-template-columns: repeat(2, 1fr); gap: 10px; }
}

@media (max-width: 420px) {
  .cutoff-stats-row { grid-template-columns: 1fr; }
}
</style>
