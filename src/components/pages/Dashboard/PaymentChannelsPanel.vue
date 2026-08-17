<template>
  <ShareBreakdownPanel
    title="Payment channels"
    icon="account_balance_wallet"
    amount-label="Final released"
    :rows="channels"
    :total-row="totalRow"
    :loading="loading"
    empty-title="No channel breakdown yet"
    empty-sub="This appears once salaries have been released through at least one channel."
  />
</template>

<script setup>
/**
 * Released pay split by disbursement channel (cash, bank, GCash).
 * Thin wrapper — the table itself lives in ShareBreakdownPanel.
 */
import ShareBreakdownPanel from '@/components/pages/Dashboard/ShareBreakdownPanel.vue'

defineProps({
  channels: { type: Array, default: () => [] },
  totalRow: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
</script>
