<template>
  <DashPanel
    icon="account_balance_wallet"
    title="Other employee releases"
    :loading="loading"
    :empty="!releases.length"
    empty-icon="account_balance_wallet"
    empty-title="No other releases"
    empty-sub="Cash advances, reimbursements and similar payouts appear here."
    skeleton="lines"
    :skeleton-rows="5"
  >
    <ul class="releases">
      <li v-for="(item, i) in releases" :key="item.label || i" class="release">
        <span class="release__label">{{ item.label }}</span>
        <span class="release__value dash-num">{{ fmtCurrency(item.amount) }}</span>
      </li>
    </ul>

    <template #footer>
      <div class="total">
        <span class="total__label">Total employee-related cash released</span>
        <span class="dash-metric dash-metric--sm total__value">{{ fmtCurrency(total) }}</span>
      </div>
    </template>
  </DashPanel>
</template>

<script setup>
/**
 * Non-salary cash paid to employees (cash advances, reimbursements, and so on).
 *
 * The total moved into the panel footer. It is a different kind of figure from
 * the line items above it — a sum, not another row — so it now sits behind a
 * structural rule rather than pretending to be the last entry in the list.
 */
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'

defineProps({
  releases: { type: Array, default: () => [] }, // [{ label, amount }]
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

function fmtCurrency(n) {
  return `₱${Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}
</script>

<style scoped>
.releases {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.release {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--dash-line-soft);
}
.release:last-child {
  border-bottom: none;
}

.release__label {
  font-size: 13px;
  color: var(--dash-ink-2);
  min-width: 0;
}

.release__value {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  flex-shrink: 0;
}

.total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.total__label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
  line-height: 1.4;
}

.total__value {
  color: var(--dash-accent);
  flex-shrink: 0;
}
</style>
