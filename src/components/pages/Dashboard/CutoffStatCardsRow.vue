<template>
  <div class="cutoff-stats-row">
    <DashboardStatCard
      v-for="s in cardItems"
      :key="s.label"
      :icon="s.icon"
      :label="s.label"
      :value="s.value"
      :loading="loading"
      :icon-color="s.mark"
      :sub="s.sub"
      :sub-class="s.subClass"
    />
  </div>
</template>

<script setup>
/**
 * KPI row for the Current Cutoff tab.
 *
 * The marks follow the payroll cycle rather than a decorative palette: the two
 * blocking stages take the warning/critical colours, the ready and remaining
 * figures take good and critical respectively. Reading left to right is reading
 * the cutoff from "not started" to "still owed".
 */
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
    label: 'Open payout groups',
    value: String(props.stats.open_payout_groups ?? 0),
    mark: 'var(--dash-warn-mark)',
  },
  {
    icon: 'rate_review',
    label: 'Employees needing review',
    value: String(props.stats.employees_needing_review ?? 0),
    mark: 'var(--dash-cat-1)',
  },
  {
    icon: 'how_to_reg',
    label: 'Awaiting acknowledgment',
    value: String(props.stats.awaiting_acknowledgment ?? 0),
    mark: 'var(--dash-cat-4)',
  },
  {
    icon: 'check_circle',
    label: 'Ready to fund',
    value: String(props.stats.ready_for_funding_groups ?? 0),
    mark: 'var(--dash-good-mark)',
    sub: props.fmtCurrency(props.stats.ready_for_funding_amount),
    subClass: 'positive',
  },
  {
    icon: 'payments',
    label: 'Remaining to disburse',
    value: props.fmtCurrency(props.stats.remaining_to_disburse),
    mark: 'var(--dash-critical-mark)',
  },
])
</script>

<style scoped>
.cutoff-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--dash-gap);
}

@media (max-width: 1024px) {
  .cutoff-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 420px) {
  .cutoff-stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
