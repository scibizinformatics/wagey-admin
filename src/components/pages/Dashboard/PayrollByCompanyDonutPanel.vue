<template>
  <DashPanel
    icon="donut_large"
    title="Payroll by company"
    subtitle="Year to date"
    :loading="loading"
    :empty="!items.length"
    empty-icon="business"
    empty-title="No company data for this view"
    empty-sub="Switch the grouping, or check that payroll has closed for the year so far."
    skeleton="chart"
  >
    <template #actions>
      <q-btn-toggle
        v-model="viewMode"
        class="group-toggle"
        no-caps
        unelevated
        toggle-color="primary"
        color="white"
        text-color="grey-8"
        size="10px"
        :options="[
          { label: 'Company', value: 'company' },
          { label: 'Department', value: 'department' },
          { label: 'Payroll group', value: 'payroll_group' },
        ]"
      />
    </template>

    <div class="split">
      <DonutChart class="split__chart" :data="donutData" />
      <DashTable class="split__table" :columns="columns" :rows="items" row-key="name" :min-width="300">
        <template #cell-name="{ row, index }">
          <span class="name">
            <span class="dash-swatch" :style="{ background: seriesColor(index) }" />
            <span class="name__text">{{ row.name }}</span>
          </span>
        </template>
        <template #cell-amount="{ row }">{{ fmtCurrency(row.amount) }}</template>
        <template #cell-share="{ row }">
          <span class="dash-num">{{ row.share }}%</span>
        </template>
      </DashTable>
    </div>
  </DashPanel>
</template>

<script setup>
/**
 * YTD payroll split by company, department or payroll group.
 *
 * The grouping toggle moved from the middle of the panel body into the header,
 * where the panel's other controls live — it scopes the whole panel, so it
 * should not sit inside the thing it scopes. The donut drops its own legend
 * because the table beside it already names every slice with its figures.
 *
 * Note: the toggle currently re-renders the same `companies` prop for all three
 * modes. Wiring department and payroll-group data is a backend change and is
 * out of scope for this redesign.
 */
import { ref, computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import DashTable from '@/components/pages/Dashboard/DashTable.vue'
import DonutChart from '@/components/pages/Dashboard/DonutChart.vue'

const props = defineProps({
  companies: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const viewMode = ref('company')

const SERIES = [
  'var(--dash-cat-1)',
  'var(--dash-cat-2)',
  'var(--dash-cat-3)',
  'var(--dash-cat-4)',
  'var(--dash-cat-5)',
  'var(--dash-cat-6)',
]

const columns = [
  { key: 'name', label: 'Name', flex: 1.5, strong: true },
  { key: 'employees', label: 'Employees', flex: 0.8, num: true },
  { key: 'amount', label: 'Amount', flex: 1.1, num: true },
  { key: 'share', label: 'Share', flex: 0.6, align: 'right' },
]

const items = computed(() => props.companies ?? [])

const donutData = computed(() => items.value.map((c) => ({ name: c.name, value: c.amount })))

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
.split {
  display: grid;
  grid-template-columns: minmax(150px, 0.8fr) minmax(0, 1.4fr);
  gap: var(--dash-gap);
  align-items: center;
  flex: 1;
}

.split__chart,
.split__table {
  min-width: 0;
}

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

@media (max-width: 1024px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* QBtnToggle renders its buttons outside this component's template, so the rail
   styling has to be unscoped. Scoped to .group-toggle so it cannot leak. */
/* Same recessed-track / raised-pill segmented control as the page tab rail,
   one size down. Consistency here matters more than variety: two segmented
   controls on one screen that behave alike should look alike. */
.group-toggle {
  background: var(--dash-n-100);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  padding: 2px;
  display: inline-flex;
  gap: 2px;
}

.group-toggle .q-btn {
  border-radius: var(--dash-r-xs) !important;
  padding: 4px 10px;
  min-height: unset;
  font-size: 12px;
  font-weight: 500;
  box-shadow: none;
  white-space: nowrap;
}

.group-toggle .q-btn::before {
  box-shadow: none;
}

.group-toggle .q-btn.bg-primary {
  background: var(--dash-surface) !important;
  color: var(--dash-ink) !important;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs) !important;
}

.group-toggle .q-btn.bg-white {
  background: transparent !important;
  color: var(--dash-ink-3) !important;
}

.group-toggle .q-btn.bg-white:hover {
  color: var(--dash-ink-2) !important;
}
</style>
