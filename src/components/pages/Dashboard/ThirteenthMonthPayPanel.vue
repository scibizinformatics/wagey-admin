<template>
  <DashPanel
    icon="savings"
    :title="mode === 'annual' ? '13th month pay accrual (YTD)' : '13th month pay accrual'"
    :subtitle="data.as_of ? `As of ${data.as_of}` : ''"
    :loading="loading"
    :empty="!hasData"
    empty-icon="savings"
    empty-title="No accrual recorded yet"
    empty-sub="A row appears for each month once its basic pay is finalised."
    skeleton="table"
    :skeleton-rows="6"
  >
    <div class="thirteenth">
      <DashTable class="thirteenth__table" :columns="columns" :rows="data.monthly" row-key="month" :min-width="320">
        <template #cell-basic_pay="{ row }">{{ fmtCurrency(row.basic_pay) }}</template>
        <template #cell-accrued="{ row }">{{ fmtCurrency(row.accrued) }}</template>
      </DashTable>

      <!-- The three figures the table is building toward, lifted out so they do
           not have to be found at the bottom of a scrolling list of months. -->
      <dl class="summary">
        <div class="summary__row">
          <dt class="summary__label">Months counted</dt>
          <dd class="summary__value dash-num">{{ data.months_counted }}</dd>
        </div>
        <div class="summary__row">
          <dt class="summary__label">YTD basic pay</dt>
          <dd class="summary__value dash-num">{{ fmtCurrency(data.ytd_basic_pay) }}</dd>
        </div>
        <div class="summary__row summary__row--lead">
          <dt class="summary__label">YTD 13th month accrued</dt>
          <dd class="dash-metric summary__value summary__value--lead">
            {{ fmtCurrency(data.ytd_accrued) }}
          </dd>
        </div>
      </dl>
    </div>
  </DashPanel>
</template>

<script setup>
/**
 * 13th month pay accrual — a statutory Philippine payroll obligation accrued at
 * one twelfth of basic pay per month.
 *
 * The month-by-month table and the running totals used to stack vertically,
 * which pushed the totals — the part an admin actually reports on — below the
 * fold on the annual view. They now sit side by side, so the accrued figure is
 * visible whatever the table's length.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import DashTable from '@/components/pages/Dashboard/DashTable.vue'

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'monthly' }, // 'monthly' | 'annual'
  loading: { type: Boolean, default: false },
})

const columns = [
  { key: 'label', label: 'Month', flex: 1, strong: true },
  { key: 'basic_pay', label: 'Basic pay', flex: 1.1, num: true },
  { key: 'accrued', label: 'Accrued (1/12)', flex: 1.1, num: true },
]

const hasData = computed(
  () => Array.isArray(props.data?.monthly) && props.data.monthly.length > 0,
)

function fmtCurrency(n) {
  return `₱${Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}
</script>

<style scoped>
.thirteenth {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(240px, 1fr);
  gap: var(--dash-gap);
  align-items: start;
  flex: 1;
}

.thirteenth__table {
  min-width: 0;
}

.summary {
  margin: 0;
  padding: 15px 16px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.summary__row--lead {
  padding-top: 11px;
  border-top: 1px solid var(--dash-line);
  align-items: center;
}

.summary__label {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  margin: 0;
  min-width: 0;
}

.summary__value {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  flex-shrink: 0;
}

.summary__value--lead {
  color: var(--dash-accent);
}

@media (max-width: 1024px) {
  .thirteenth {
    grid-template-columns: 1fr;
  }
}
</style>
