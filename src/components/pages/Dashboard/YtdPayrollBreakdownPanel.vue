<template>
  <DashPanel
    icon="donut_large"
    title="YTD payroll breakdown"
    subtitle="By pay component"
    :loading="loading"
    :empty="!breakdown.length"
    empty-icon="donut_large"
    empty-title="No breakdown yet"
    empty-sub="Components appear once at least one month has closed."
    skeleton="chart"
  >
    <DonutChart :data="breakdown" show-legend />
  </DashPanel>
</template>

<script setup>
/**
 * Year-to-date payroll split by component (basic, overtime, allowances, and so
 * on). The donut's own hole carries the YTD total.
 */
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import DonutChart from '@/components/pages/Dashboard/DonutChart.vue'

defineProps({
  breakdown: { type: Array, default: () => [] }, // [{ name, value }]
  loading: { type: Boolean, default: false },
})
</script>
