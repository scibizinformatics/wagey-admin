<template>
  <DashPanel
    icon="table_rows"
    title="Month by month"
    :loading="loading"
    :empty="!months.some((m) => m.closed)"
    empty-icon="table_rows"
    empty-title="No closed months yet"
    empty-sub="Each month joins this table once all of its cutoffs are complete."
    skeleton="table"
    :skeleton-rows="6"
    scroll
  >
    <DashTable :columns="columns" :rows="months" row-key="month" :min-width="480">
      <!-- A month payroll has not reached yet prints an em dash rather than ₱0.
           Nothing having happened in a month is not the same statement as that
           month's payroll being zero, and a zero is what an admin would read and
           act on. -->
      <template #cell-payroll="{ row }">
        {{ row.hasData ? fmtCurrency(row.payroll) : '—' }}
      </template>
      <template #cell-avgPerEmployee="{ row }">
        {{ row.hasData ? fmtCurrency(row.avgPerEmployee) : '—' }}
      </template>
      <template #cell-employeesPaid="{ row }">{{ row.hasData ? row.employeesPaid : '—' }}</template>

      <!-- Null where there is nothing to compare against — the first month of the
           year, and any month following one with no figures. A percentage against
           nothing is not a percentage, and "+0%" would claim the two are equal. -->
      <template #cell-changePercent="{ row }">
        <span
          v-if="row.changePercent != null"
          class="dash-delta"
          :class="deltaClass(row.changePercent)"
        >
          {{ row.changePercent >= 0 ? '+' : '−' }}{{ Math.abs(row.changePercent) }}%
        </span>
        <span v-else class="dash-delta dash-delta--flat">—</span>
      </template>
    </DashTable>
  </DashPanel>
</template>

<script setup>
/**
 * Payroll month by month across the year, with the month-over-month change.
 *
 * Every month of the calendar year has a row, not only the closed ones — the
 * reader needs to see where the year is still to run. A month nothing has been
 * run in yet says so with an em dash rather than a zero.
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
