<template>
  <ContributionTableSkeleton
    v-if="loading && !rows.length"
    :rows="8"
    :cols="columns.length"
    label="annual contributions"
  />

  <div v-else class="tbl-wrap">
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="month"
      flat
      :loading="loading"
      hide-pagination
      :rows-per-page-options="[0]"
      separator="none"
      class="dash-qtable"
    >
      <template v-slot:header="props">
        <q-tr>
          <q-th
            v-for="col in columns"
            :key="col.name"
            :props="props"
            :class="col.align === 'right' ? 'num' : ''"
          >
            {{ col.label }}
            <q-tooltip v-if="col.hint" anchor="bottom middle" self="top middle" class="ded-tip">
              {{ col.hint }}
            </q-tooltip>
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props" class="dash-qtable__row">
          <q-td key="month" :props="props" class="strong">
            {{ props.row.month }}
          </q-td>

          <q-td v-if="showEmployees" key="employees" :props="props" class="num">
            {{ num(props.row.employees).toLocaleString('en-PH') }}
          </q-td>

          <q-td v-if="showTotalDue" key="total_contributions_due" :props="props" class="num">
            {{ formatCurrency(props.row.total_contributions_due) }}
          </q-td>

          <q-td key="employee_share_due" :props="props" class="num strong">
            {{ formatCurrency(props.row.total_contribution_due_employee_share) }}
          </q-td>

          <q-td key="deducted" :props="props" class="num">
            {{ formatCurrency(props.row.total_deduction_employee_share) }}
          </q-td>

          <q-td key="undeducted" :props="props" class="num">
            <span :class="{ 'is-owed': balanceOf(props.row) > 0 }">
              {{ formatCurrency(props.row.undeducted_balance_employee_share) }}
            </span>
          </q-td>

          <q-td key="collected" :props="props">
            <ContributionRateBar :pct="pctOf(props.row)" />
          </q-td>

          <q-td v-if="showCases" key="cases" :props="props" class="num">
            {{ num(props.row.no_of_payroll_deduction_cases).toLocaleString('en-PH') }}
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div v-if="!loading" class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon name="o_calendar_month" size="20px" />
          </span>
          <p class="dash-empty__title">No contributions for this year</p>
          <p class="dash-empty__sub">
            Nothing has been posted for the selected year yet. Pick another year above.
          </p>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
/**
 * The year, month by month — the widest of the three summaries.
 *
 * Eight columns do not fit a laptop once the nav rail takes its share, so the
 * two that are context rather than the point (headcount, and the combined
 * employer+employee total) drop at 1440 and the deduction-case count at 1280,
 * leaving month / due / deducted / undeducted / collected at every table width.
 * The previous version kept all eight at every size and shrank its own type to
 * 10px to cope. Below 1024 the page swaps this table for a card list, so nothing
 * here needs to survive a phone.
 */
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { formatCurrency } from 'src/composables/utils/format'
import {
  balanceOf,
  collectedPct,
  deductedOf,
  dueOf,
  num,
} from 'src/composables/utils/contributions'
import ContributionRateBar from '@/components/pages/Deductions/ContributionRateBar.vue'
import ContributionTableSkeleton from '@/components/pages/Deductions/ContributionTableSkeleton.vue'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const $q = useQuasar()

const showEmployees = computed(() => $q.screen.width >= 1440)
const showTotalDue = computed(() => $q.screen.width >= 1440)
const showCases = computed(() => $q.screen.width >= 1280)

const columns = computed(() => {
  const cols = [
    { name: 'month', label: 'Month', field: 'month', align: 'left', style: 'min-width: 96px' },
  ]

  if (showEmployees.value) {
    cols.push({
      name: 'employees',
      label: 'Employees',
      field: 'employees',
      align: 'right',
      style: 'width: 96px',
      sortable: true,
    })
  }

  if (showTotalDue.value) {
    cols.push({
      name: 'total_contributions_due',
      label: 'Total due',
      field: 'total_contributions_due',
      align: 'right',
      hint: 'Employer and employee share combined',
      sortable: true,
    })
  }

  cols.push(
    {
      name: 'employee_share_due',
      label: 'Employee share',
      field: 'total_contribution_due_employee_share',
      align: 'right',
      hint: 'The employee’s share of what was due this month',
      sortable: true,
    },
    {
      name: 'deducted',
      label: 'Deducted',
      field: 'total_deduction_employee_share',
      align: 'right',
      hint: 'Employee share actually withheld through payroll',
      sortable: true,
    },
    {
      name: 'undeducted',
      label: 'Undeducted',
      field: 'undeducted_balance_employee_share',
      align: 'right',
      hint: 'Employee share still outstanding',
      sortable: true,
    },
    {
      name: 'collected',
      label: 'Collected',
      field: (row) => collectedPct(deductedOf(row), dueOf(row)) ?? -1,
      align: 'left',
      style: 'width: 150px',
      hint: 'Deducted as a share of the employee share due',
      sortable: true,
    },
  )

  if (showCases.value) {
    cols.push({
      name: 'cases',
      label: 'Cases',
      field: 'no_of_payroll_deduction_cases',
      align: 'right',
      style: 'width: 84px',
      hint: 'Payroll runs that carried a deduction',
      sortable: true,
    })
  }

  return cols
})

function pctOf(row) {
  return collectedPct(deductedOf(row), dueOf(row))
}
</script>

<style scoped>
.tbl-wrap {
  overflow-x: auto;
  padding: 0 6px;
}

/* An outstanding balance is the one figure on the row a payroll officer has to
   act on, so it carries weight. Amount and colour together, never colour alone. */
.is-owed {
  font-weight: 600;
  color: var(--dash-warn);
}

@media (max-width: 1279px) {
  .tbl-wrap {
    padding: 0 2px;
  }
  .dash-qtable :deep(.q-table th) {
    padding: 12px 9px 10px;
  }
  .dash-qtable :deep(.q-table td) {
    padding: var(--dash-row-y) 9px;
  }
}
</style>
