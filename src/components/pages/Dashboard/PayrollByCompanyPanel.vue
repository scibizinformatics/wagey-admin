<template>
  <ShareBreakdownPanel
    title="Payroll by company"
    icon="business"
    amount-label="Final payroll"
    :rows="companies"
    :total-row="totalRow"
    :loading="loading"
    empty-title="No company breakdown yet"
    empty-sub="This appears once the month's payroll is finalised across companies."
  />
</template>

<script setup>
/**
 * Payroll split by company for the selected month.
 * Thin wrapper — the table itself lives in ShareBreakdownPanel.
 */
import ShareBreakdownPanel from '@/components/pages/Dashboard/ShareBreakdownPanel.vue'

defineProps({
  companies: { type: Array, default: () => [] },
  totalRow: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
</script>
