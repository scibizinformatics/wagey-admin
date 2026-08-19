<template>
  <ContributionTableSkeleton
    v-if="loading && !rows.length"
    :rows="6"
    :cols="columns.length"
    label="department contributions"
  />

  <div v-else class="tbl-wrap">
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="department"
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
          <q-td key="department" :props="props">
            <div class="dept">
              <span class="dash-swatch dept__mark" :style="{ background: markFor(props.row) }" />
              <span class="dept__name">{{ props.row.department }}</span>
            </div>
          </q-td>

          <q-td v-if="showEmployees" key="employee_count" :props="props" class="num">
            {{ num(props.row.employee_count).toLocaleString('en-PH') }}
          </q-td>

          <q-td key="total_contributions_due" :props="props" class="num strong">
            {{ formatCurrency(props.row.total_contributions_due) }}
          </q-td>

          <q-td key="total_deduction" :props="props" class="num">
            {{ formatCurrency(props.row.total_deduction) }}
          </q-td>

          <q-td key="balance" :props="props" class="num">
            <span :class="{ 'is-owed': num(props.row.balance) > 0 }">
              {{ formatCurrency(props.row.balance) }}
            </span>
          </q-td>

          <q-td key="rate" :props="props">
            <ContributionRateBar :pct="pctOf(props.row)" />
          </q-td>

          <q-td key="status" :props="props">
            <StatusPill :status="props.row.status" />
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div v-if="!loading" class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_apartment'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ isFiltered ? 'No departments match this search' : 'No department contributions' }}
          </p>
          <p class="dash-empty__sub">
            {{
              isFiltered
                ? 'No department in this period matches what you typed.'
                : 'Nothing has been posted for this month. Try another month or year.'
            }}
          </p>
          <q-btn
            v-if="isFiltered"
            outline
            no-caps
            dense
            size="12px"
            icon="filter_alt_off"
            label="Clear search"
            class="empty-btn"
            @click="$emit('clear-filters')"
          />
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
/**
 * The month, department by department.
 *
 * Two changes beyond the chrome. The status column was a QBadge in raw
 * green/orange/grey; it now uses the shared StatusPill, so a "complete" here
 * reads exactly like a "complete" on payroll or disbursement. And the rate
 * column was a bare "97.30%" — the same figure now carries a bar, since the
 * question being asked of this table is which departments are behind.
 *
 * The API's own `rate` is preferred over deducted ÷ due so the bar agrees with
 * whatever the backend considers the collection rate; the ratio is only computed
 * when `rate` is absent.
 */
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { formatCurrency } from 'src/composables/utils/format'
import { collectedPct, markForName, num } from 'src/composables/utils/contributions'
import StatusPill from '@/components/common/StatusPill.vue'
import ContributionRateBar from '@/components/pages/Deductions/ContributionRateBar.vue'
import ContributionTableSkeleton from '@/components/pages/Deductions/ContributionTableSkeleton.vue'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['clear-filters'])

const $q = useQuasar()

const showEmployees = computed(() => $q.screen.width >= 1280)

const columns = computed(() => {
  const cols = [
    {
      name: 'department',
      label: 'Department',
      field: 'department',
      align: 'left',
      style: 'min-width: 190px',
      sortable: true,
    },
  ]

  if (showEmployees.value) {
    cols.push({
      name: 'employee_count',
      label: 'Employees',
      field: 'employee_count',
      align: 'right',
      style: 'width: 96px',
      sortable: true,
    })
  }

  cols.push(
    {
      name: 'total_contributions_due',
      label: 'Total due',
      field: 'total_contributions_due',
      align: 'right',
      hint: 'Contributions due from this department this month',
      sortable: true,
    },
    {
      name: 'total_deduction',
      label: 'Deducted',
      field: 'total_deduction',
      align: 'right',
      hint: 'Amount actually withheld through payroll',
      sortable: true,
    },
    {
      name: 'balance',
      label: 'Balance',
      field: 'balance',
      align: 'right',
      hint: 'Still outstanding',
      sortable: true,
    },
    {
      name: 'rate',
      label: 'Collected',
      field: (row) => pctOf(row) ?? -1,
      align: 'left',
      style: 'width: 150px',
      hint: 'Deducted as a share of what was due',
      sortable: true,
    },
    {
      name: 'status',
      label: 'Status',
      field: 'status',
      align: 'left',
      style: 'width: 130px',
      sortable: true,
    },
  )

  return cols
})

function markFor(row) {
  return markForName(row?.department)
}

function pctOf(row) {
  const rate = row?.rate
  if (rate !== null && rate !== undefined && rate !== '') return num(rate)
  return collectedPct(row?.total_deduction, row?.total_contributions_due)
}
</script>

<style scoped>
.tbl-wrap {
  overflow-x: auto;
  padding: 0 6px;
}

.dept {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.dept__mark {
  width: 3px;
  height: 15px;
  border-radius: var(--dash-r-pill);
}

.dept__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.is-owed {
  font-weight: 600;
  color: var(--dash-warn);
}

.empty-btn {
  margin-top: 6px;
  padding: 0 12px;
  height: 32px;
  border-radius: var(--dash-r-md);
  font-weight: 500;
  color: var(--dash-ink-2);
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
