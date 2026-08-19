<template>
  <ContributionTableSkeleton
    v-if="loading && !rows.length"
    :rows="7"
    :cols="columns.length"
    label="employee contributions"
  />

  <div v-else class="tbl-wrap">
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="employee_id"
      flat
      :loading="loading"
      hide-pagination
      :rows-per-page-options="[0]"
      separator="none"
      class="dash-qtable"
    >
      <template v-slot:header="props">
        <q-tr>
          <q-th auto-width />
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
          <q-td auto-width class="cell-expand">
            <q-btn
              flat
              dense
              round
              size="sm"
              :icon="isOpen(props.row) ? 'expand_less' : 'expand_more'"
              class="expander"
              :aria-label="isOpen(props.row) ? 'Hide breakdown' : 'Show breakdown'"
              :aria-expanded="isOpen(props.row)"
              @click="toggle(props.row)"
            />
          </q-td>

          <q-td key="employee_name" :props="props">
            <div class="who">
              <q-avatar
                size="28px"
                class="who__avatar"
                :style="{ background: getAvatarColor(props.row.employee_name) }"
              >
                <span class="who__initials">{{ getInitials(props.row.employee_name) }}</span>
              </q-avatar>
              <span class="who__name">{{ props.row.employee_name }}</span>
            </div>
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

        <!-- Per-contribution breakdown for the expanded employee. Built from a
             CSS grid, not a nested <table>: a table inside this one inherits the
             outer cell rules from `.dash-qtable .q-table td`, so its padding and
             hairlines were being set by the parent table rather than by itself. -->
        <q-tr v-if="isOpen(props.row) && openBreakdown" class="brk-row">
          <q-td colspan="100%" class="brk-cell">
            <div class="brk">
              <div class="brk__head">
                <span class="brk__title">Contribution breakdown</span>
                <span v-if="periodLabel" class="brk__period">{{ periodLabel }}</span>
                <span class="brk__spacer" />
                <span
                  class="dash-chip brk__verdict"
                  :class="openBreakdown.outstanding > 0 ? 'dash-chip--warn' : 'dash-chip--good'"
                >
                  <q-icon
                    :name="openBreakdown.outstanding > 0 ? 'o_pending_actions' : 'o_task_alt'"
                    size="13px"
                  />
                  {{
                    openBreakdown.outstanding > 0
                      ? `${formatCurrency(openBreakdown.outstanding)} outstanding`
                      : 'Fully collected'
                  }}
                </span>
              </div>

              <div v-if="openBreakdown.items.length" class="brk__card">
                <div class="brk__grid brk__grid--head">
                  <span>Contribution</span>
                  <span class="brk__num">Due</span>
                  <span class="brk__num">Deducted</span>
                  <span class="brk__num">Undeducted</span>
                  <span>Collected</span>
                </div>

                <div v-for="item in openBreakdown.items" :key="item.key" class="brk__grid">
                  <span class="brk__name">
                    <span class="dash-swatch brk__swatch" :style="{ background: item.mark }" />
                    <span class="brk__name-text">{{ item.name }}</span>
                  </span>
                  <span class="brk__num">{{ formatCurrency(item.due) }}</span>
                  <span class="brk__num">{{ formatCurrency(item.deducted) }}</span>
                  <span class="brk__num" :class="item.undeducted > 0 ? 'is-owed' : 'is-settled'">
                    {{ formatCurrency(item.undeducted) }}
                  </span>
                  <ContributionRateBar :pct="item.pct" />
                </div>

                <!-- Reconciles to the employee's row above, so the two can be
                     read against each other without adding the column up. -->
                <div class="brk__grid brk__grid--total">
                  <span>All contributions</span>
                  <span class="brk__num">{{ formatCurrency(openBreakdown.due) }}</span>
                  <span class="brk__num">{{ formatCurrency(openBreakdown.deducted) }}</span>
                  <span
                    class="brk__num"
                    :class="openBreakdown.outstanding > 0 ? 'is-owed' : 'is-settled'"
                  >
                    {{ formatCurrency(openBreakdown.outstanding) }}
                  </span>
                  <ContributionRateBar :pct="openBreakdown.pct" />
                </div>
              </div>

              <p v-else class="brk__empty">
                <q-icon name="o_info" size="15px" />
                No per-contribution breakdown was returned for this employee.
              </p>
            </div>
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div v-if="!loading" class="dash-empty">
          <span class="dash-featured-icon">
            <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_person'" size="20px" />
          </span>
          <p class="dash-empty__title">
            {{ isFiltered ? 'No employees match this search' : 'No employee contributions' }}
          </p>
          <p class="dash-empty__sub">
            {{
              isFiltered
                ? 'Nobody in this period matches what you typed.'
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
 * The month, person by person, with each employee's contributions expandable.
 *
 * The expander was previously keyed on the row's index within the table, so
 * sorting or filtering the list moved the open panel onto whichever employee
 * happened to inherit that position. It is keyed on the employee now.
 *
 * Column staging matches the annual table: the combined employer+employee total
 * drops at 1440 and the deduction-case count at 1280; below 1024 the page swaps
 * in the card list.
 */
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { formatCurrency } from 'src/composables/utils/format'
import { getAvatarColor, getInitials } from 'src/composables/utils/attendance'
import {
  balanceOf,
  collectedPct,
  deductedOf,
  dueOf,
  markForName,
  num,
} from 'src/composables/utils/contributions'
import ContributionRateBar from '@/components/pages/Deductions/ContributionRateBar.vue'
import ContributionTableSkeleton from '@/components/pages/Deductions/ContributionTableSkeleton.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
  /** e.g. "August 2026" — named in the expanded panel so the figures have a period. */
  periodLabel: { type: String, default: '' },
})

defineEmits(['clear-filters'])

const $q = useQuasar()

const showTotalDue = computed(() => $q.screen.width >= 1440)
const showCases = computed(() => $q.screen.width >= 1280)

const columns = computed(() => {
  const cols = [
    {
      name: 'employee_name',
      label: 'Employee',
      field: 'employee_name',
      align: 'left',
      style: 'min-width: 200px',
      sortable: true,
    },
  ]

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

const openKey = ref(null)

function keyOf(row) {
  return row.employee_id ?? row.employee ?? row.employee_name
}

function isOpen(row) {
  return openKey.value !== null && openKey.value === keyOf(row)
}

function toggle(row) {
  openKey.value = isOpen(row) ? null : keyOf(row)
}

// A new period is a different set of figures, so an open panel from the previous
// one should not stay open over the top of it.
watch(
  () => props.rows,
  () => {
    openKey.value = null
  },
)

function detailsOf(row) {
  return row.breakdown_data || row.details || row.contributions || []
}

/**
 * The open employee's breakdown, normalised and totalled once per render rather
 * than re-derived by every cell in the panel. Only one row is ever open, so the
 * open row is resolved from `rows` instead of being threaded out of the body slot.
 */
const openBreakdown = computed(() => {
  if (openKey.value === null) return null
  const row = props.rows.find((r) => keyOf(r) === openKey.value)
  if (!row) return null

  const items = detailsOf(row).map((item, i) => {
    const name = item.contribution_name || item.name || 'Unnamed contribution'
    const due = num(item.employee_share_due)
    const deducted = num(item.employee_share_deducted)
    return {
      key: `${name}-${i}`,
      name,
      mark: markForName(name),
      due,
      deducted,
      undeducted: num(item.undeducted_balance),
      pct: collectedPct(deducted, due),
    }
  })

  // Totalled from the breakdown itself, so a mismatch with the employee's own
  // row is visible rather than papered over by reusing the row's figures.
  const due = items.reduce((t, d) => t + d.due, 0)
  const deducted = items.reduce((t, d) => t + d.deducted, 0)
  const outstanding = items.reduce((t, d) => t + d.undeducted, 0)

  return { items, due, deducted, outstanding, pct: collectedPct(deducted, due) }
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

.cell-expand {
  padding-right: 0 !important;
}

.expander {
  color: var(--dash-ink-4);
}
.expander:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

/* ── Employee ── */
.who {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.who__avatar {
  flex-shrink: 0;
}

.who__initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.who__name {
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

/* ── Expanded breakdown ── */
.brk-row :deep(td),
.brk-cell {
  border-bottom: 1px solid var(--dash-line) !important;
}

/* The expanded region is an inset surface with an accent rail down its left
   edge, aligned under the expander column — so it reads as belonging to the row
   above rather than as a new section that happens to be grey. */
.brk-cell {
  padding: 0 !important;
  background: var(--dash-n-50);
  box-shadow: inset 3px 0 0 var(--dash-accent);
}

.brk {
  padding: 13px 16px 15px 46px;
  animation: brk-in var(--dash-slow) var(--dash-ease);
}

@keyframes brk-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brk {
    animation: none;
  }
}

.brk__head {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 880px;
  margin-bottom: 9px;
}

.brk__title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
}

.brk__period {
  font-size: 12px;
  color: var(--dash-ink-4);
}
.brk__period::before {
  content: '·';
  margin-right: 7px;
}

.brk__spacer {
  flex: 1;
}

/* The one thing the reader came here to find out — whether anything is still
   owed — stated in words at the top instead of inferred from a column of zeroes. */
.brk__verdict {
  flex-shrink: 0;
}

/* ── Breakdown grid ──
   A grid, not a nested table: see the template comment. Columns are fixed so the
   three peso columns line up with each other, and the name column takes the
   slack. */
.brk__card {
  max-width: 880px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  box-shadow: var(--dash-shadow-xs);
  overflow: hidden;
}

.brk__grid {
  display: grid;
  grid-template-columns: minmax(150px, 1.5fr) 116px 116px 116px 138px;
  align-items: center;
  gap: 14px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--dash-line-soft);
  font-size: 12.5px;
  color: var(--dash-ink-2);
  transition: background var(--dash-fast) var(--dash-ease);
}
.brk__grid:hover:not(.brk__grid--head):not(.brk__grid--total) {
  background: var(--dash-n-25);
}

.brk__grid--head {
  padding: 9px 14px 8px;
  background: var(--dash-n-25);
  border-bottom: 1px solid var(--dash-line);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.brk__grid--total {
  border-bottom: none;
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  font-weight: 600;
  color: var(--dash-ink);
}

.brk__name {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  font-weight: 500;
  color: var(--dash-ink);
}

.brk__swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.brk__name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brk__num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  white-space: nowrap;
}

/* A settled line is quiet; only an outstanding one asks for attention. */
.brk__num.is-settled {
  color: var(--dash-ink-4);
}
.brk__num.is-owed {
  font-weight: 600;
  color: var(--dash-warn);
}

.brk__empty {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 12.5px;
  color: var(--dash-ink-3);
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
  .brk {
    padding: 12px 12px 14px 40px;
  }
  /* Laptop: the peso columns give up a few pixels each rather than the whole
     panel picking up a horizontal scrollbar inside the one it already sits in. */
  .brk__grid {
    grid-template-columns: minmax(128px, 1.4fr) 104px 104px 104px 118px;
    gap: 10px;
    padding: 9px 11px;
  }
  .brk__grid--head {
    padding: 9px 11px 8px;
  }
}
</style>
