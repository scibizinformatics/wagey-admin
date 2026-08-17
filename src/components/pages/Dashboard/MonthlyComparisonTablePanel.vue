<template>
  <DashPanel
    icon="table_rows"
    title="Month by month"
    :loading="loading"
    :empty="!months.length"
    empty-icon="table_rows"
    empty-title="No closed months yet"
    empty-sub="Each month joins this table once all of its cutoffs are complete."
    skeleton="table"
    :skeleton-rows="6"
    scroll
  >
    <DashTable :columns="columns" :rows="months" row-key="label" :min-width="480">
      <template #cell-payroll="{ row }">{{ fmtCurrency(row.payroll) }}</template>
      <template #cell-avgPerEmployee="{ row }">{{ fmtCurrency(row.avgPerEmployee) }}</template>

      <template #cell-changePercent="{ row }">
        <!-- The sign is spelled out, so the direction survives without colour. -->
        <span class="dash-delta" :class="deltaClass(row.changePercent)">
          {{ row.changePercent >= 0 ? '+' : '−' }}{{ Math.abs(row.changePercent) }}%
        </span>
      </template>
    </DashTable>
  </DashPanel>
</template>

<script setup>
/**
 * Payroll per closed month, with the month-over-month change.
 *
 * Renamed from "Monthly Comparison Table" — a panel does not need to tell the
 * reader it is a table, they can see that.
 */
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import DashTable from '@/components/pages/Dashboard/DashTable.vue'

defineProps({
  months: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const columns = [
  { key: 'label', label: 'Month', flex: 1.1, strong: true },
  { key: 'payroll', label: 'Payroll', flex: 1.1, num: true },
  { key: 'employeesPaid', label: 'Employees', flex: 0.8, num: true },
  { key: 'avgPerEmployee', label: 'Avg / employee', flex: 1.1, num: true },
  { key: 'changePercent', label: 'Change', flex: 0.75, align: 'right' },
]

function deltaClass(pct) {
  if (pct > 0) return 'dash-delta--up'
  if (pct < 0) return 'dash-delta--down'
  return 'dash-delta--flat'
}

function fmtCurrency(n) {
  return `₱${Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}
</script>
