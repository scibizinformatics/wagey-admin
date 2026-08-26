<template>
  <DashPanel
    :icon="icon"
    :title="title"
    :loading="loading"
    :empty="!rows.length"
    :empty-icon="icon"
    :empty-title="emptyTitle"
    :empty-sub="emptySub"
    skeleton="table"
    :skeleton-rows="5"
  >
    <DashTable :columns="columns" :rows="rows" row-key="name" :min-width="380">
      <template #cell-name="{ row, index }">
        <span class="name">
          <span class="dash-swatch" :style="{ background: seriesColor(index) }" />
          <span class="name__text">{{ row.name }}</span>
        </span>
      </template>

      <template #cell-amount="{ row }">
        {{ fmtCurrency(row.amount) }}
      </template>

      <template #cell-share="{ row, index }">
        <span class="dash-bar">
          <span class="dash-bar__track">
            <span
              class="dash-bar__fill"
              :style="{ width: `${row.share}%`, background: seriesColor(index) }"
            />
          </span>
          <span class="dash-bar__label">{{ row.share }}%</span>
        </span>
      </template>

      <template v-if="totalRow" #total="{ colStyle }">
        <span :style="colStyle(columns[0])">Total</span>
        <span :style="colStyle(columns[1])">{{ totalRow.employees }}</span>
        <span :style="colStyle(columns[2])">{{ fmtCurrency(totalRow.amount) }}</span>
        <span :style="colStyle(columns[3])">100%</span>
      </template>
    </DashTable>
  </DashPanel>
</template>

<script setup>
/**
 * A named breakdown with employee counts, an amount and a share bar.
 *
 * The per-company and per-channel splits were once the same ~130-line component
 * twice over, differing only in title, icon and the name of the array prop. The
 * table lives here instead, so any panel of this shape — PaymentChannelsPanel
 * today — is a thin wrapper and they cannot drift apart again.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import DashTable from '@/components/pages/Dashboard/DashTable.vue'

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'donut_small' },
  /** [{ name, employees, amount, share }] */
  rows: { type: Array, default: () => [] },
  totalRow: { type: Object, default: null },
  amountLabel: { type: String, default: 'Amount' },
  emptyTitle: { type: String, default: 'No breakdown yet' },
  emptySub: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

// Fixed categorical order, matching the ramp in src/css/dashboard.scss. Rows
// past the sixth take the neutral mark rather than restarting the ramp — a
// repeated hue would imply two entries are related when they are not.
const SERIES = [
  'var(--dash-cat-1)',
  'var(--dash-cat-2)',
  'var(--dash-cat-3)',
  'var(--dash-cat-4)',
  'var(--dash-cat-5)',
  'var(--dash-cat-6)',
]

const columns = computed(() => [
  { key: 'name', label: 'Name', flex: 1.5, strong: true },
  { key: 'employees', label: 'Employees', flex: 0.8, num: true },
  { key: 'amount', label: props.amountLabel, flex: 1.1, num: true },
  { key: 'share', label: 'Share', flex: 1 },
])

function seriesColor(i) {
  return SERIES[i] ?? 'var(--dash-neutral-mark)'
}

function fmtCurrency(n) {
  return `₱${Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}
</script>

<style scoped>
.name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.name__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
