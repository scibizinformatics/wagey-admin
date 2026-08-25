<template>
  <q-table
    :rows="rows"
    :columns="columns"
    :loading="loading"
    :pagination="{ rowsPerPage: 0 }"
    row-key="id"
    flat
    hide-pagination
    hide-no-data
    class="dash-qtable dash-qtable--flush payout-table"
  >
    <template #body="props">
      <!-- The whole row opens the run. It used to take a click on one specific
           cell, which on a 7-column row meant most of the target did nothing. -->
      <q-tr
        :props="props"
        class="dash-qtable__row dash-qtable__row--clickable run"
        tabindex="0"
        :aria-label="`Open ${props.row.group}`"
        @click="$emit('view', props.row)"
        @keydown.enter="$emit('view', props.row)"
        @keydown.space.prevent="$emit('view', props.row)"
      >
        <q-td key="group" :props="props">
          <!-- Group and cutoff were two columns saying one thing: which payout
               this is. They now read as one identity block. -->
          <div class="run__id">
            <span class="run__name">{{ props.row.group }}</span>
            <span class="run__cutoff">{{ props.row.cutoff || '—' }}</span>
          </div>
        </q-td>

        <q-td key="method" :props="props">
          <span class="run__method">
            <q-icon :name="methodIcon(props.row.method)" size="15px" />
            {{ props.row.method || '—' }}
          </span>
        </q-td>

        <q-td key="employees" :props="props" class="col-num">
          <span class="dash-num">{{ props.row.employees ?? '—' }}</span>
        </q-td>

        <!-- The money is the anchor: largest type in the row, tabular so the
             column reads as a column of figures. -->
        <q-td key="netAmount" :props="props" class="col-num">
          <span class="run__amount dash-num">{{ formatPeso(props.row.netAmount) }}</span>
        </q-td>

        <q-td key="progress" :props="props">
          <PayoutProgressStepper
            :group-id="props.row.id"
            :pgi-status="props.row.status"
            :group-name="props.row.group"
            :cutoff-name="props.row.cutoff"
          />
        </q-td>

        <q-td key="open" :props="props" class="col-open">
          <q-icon name="chevron_right" size="18px" class="run__chevron" />
        </q-td>
      </q-tr>
    </template>

    <template #no-data>
      <div class="dash-empty">
        <span class="dash-featured-icon">
          <q-icon name="o_payments" size="20px" />
        </span>
        <p class="dash-empty__title">No disbursement runs</p>
        <p class="dash-empty__sub">
          Runs appear here once a cutoff opens and its payout groups are generated.
        </p>
      </div>
    </template>
  </q-table>
</template>

<script setup>
/**
 * The disbursement runs table.
 *
 * Went from seven columns to five by merging the pairs that said one thing twice:
 *
 *   Group + Cutoff  ->  one identity cell (name over cutoff)
 *   Status + Progress -> one progress cell (rail over stage name)
 *
 * Status was derived from the progress stage, so the badge and the stepper were
 * two renderings of the same fact — and between them they took roughly 280px, on
 * a table that already did not fit a laptop. A trailing chevron replaces them as
 * the affordance that the row opens.
 */
import PayoutProgressStepper from 'src/components/pages/Payroll/PayoutProgressStepper.vue'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

defineEmits(['view'])

// The `columns` prop is gone. Rows are now rendered by an explicit #body slot, so
// a caller-supplied column set would have moved the headers while the cells
// stayed put — a prop that appears to work and does not. The single consumer
// never passed it.
const columns = [
  {
    name: 'group',
    label: 'Payout group',
    field: 'group',
    align: 'left',
    sortable: true,
    style: 'min-width: 200px',
  },
  {
    name: 'method',
    label: 'Method',
    field: 'method',
    align: 'left',
    sortable: true,
    style: 'width: 132px',
  },
  {
    name: 'employees',
    label: 'Employees',
    field: 'employees',
    align: 'right',
    sortable: true,
    style: 'width: 100px',
    headerClasses: 'col-num',
  },
  {
    name: 'netAmount',
    label: 'Net amount',
    field: 'netAmount',
    align: 'right',
    sortable: true,
    style: 'width: 132px',
    headerClasses: 'col-num',
  },
  {
    name: 'progress',
    label: 'Progress',
    field: 'status',
    align: 'left',
    style: 'width: 156px',
  },
  { name: 'open', label: '', field: 'open', align: 'right', style: 'width: 40px' },
]

const METHOD_ICONS = {
  cash: 'o_payments',
  bank: 'o_account_balance',
  'bank transfer': 'o_account_balance',
  gcash: 'o_smartphone',
  check: 'o_receipt_long',
  cheque: 'o_receipt_long',
}

function methodIcon(method) {
  const key = String(method || '').toLowerCase()
  const hit = Object.keys(METHOD_ICONS).find((k) => key.includes(k))
  return hit ? METHOD_ICONS[hit] : 'o_account_balance_wallet'
}

function formatPeso(value) {
  return `₱${Number(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}
</script>

<style scoped>
/* Card reset, header strip, row rhythm, hover plate, dividers, the pointer
   cursor and the keyboard focus ring all come from `dash-qtable` in
   src/css/dashboard.scss. The row padding here was 13px against the system's
   11px, which made a payroll row visibly taller than the same row on the
   contributions page. */
.payout-table {
  width: 100%;
}
.payout-table :deep(thead .col-num) {
  text-align: right;
}

/* `dash-qtable--flush` zeroes the header's top padding, on the theory that the
   band above already supplies the space. Under the runs toolbar it does not:
   the column labels came up against its hairline and read as a second line of
   the bar rather than as the top of the table. Matched to the five step tables,
   so the flow's list and its steps share one header strip.
   The progress row is excluded — it carries the loading bar and must stay at
   zero, or the header jumps down mid-fetch. */
.payout-table :deep(.q-table thead tr:not(.q-table__progress) th) {
  padding-top: 14px;
}

/* ── Identity ── */
.run__id {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}

.run__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.run__cutoff {
  font-size: 12px;
  color: var(--dash-ink-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Method ── */
.run__method {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  white-space: nowrap;
}
.run__method .q-icon {
  color: var(--dash-ink-4);
  flex-shrink: 0;
}

/* ── Figures ── */
.payout-table :deep(.col-num) {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.run__amount {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--dash-ink);
}

/* ── Open affordance ── */
.payout-table :deep(.col-open) {
  text-align: right;
  padding-left: 0 !important;
}

.run__chevron {
  color: var(--dash-n-300);
  transition: color var(--dash-fast) var(--dash-ease),
    transform var(--dash-fast) var(--dash-ease);
}
.payout-table :deep(.run:hover) .run__chevron {
  color: var(--dash-accent);
  transform: translateX(2px);
}

@media (max-width: 1279px) {
  /* Same selector shape as the rule above, so the laptop step still wins on
     order rather than losing the top padding back to zero. */
  .payout-table :deep(.q-table thead tr:not(.q-table__progress) th) {
    padding: 12px 9px 10px;
  }
  .payout-table :deep(.q-table tbody td) {
    padding: 12px 9px;
  }
}
</style>
