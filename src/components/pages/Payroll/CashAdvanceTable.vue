<template>
  <div class="ca-tbl dash-page-body">
    <!-- First paint, when there is nothing to keep on screen. Built from the same
         `columns` the table renders, so the placeholder shares its column edges,
         labels and alignment. -->
    <TableSkeleton
      v-if="loading"
      :columns="columns"
      :rows="SKELETON_ROWS"
      :min-width="908"
      aria-label="Loading payout groups"
    />

    <!-- Emptiness is a normal state here, since "Only groups with advances" hides
         every run in a quiet cutoff, so it gets the panel empty state the rest of
         the app uses. It used to hang off Quasar's `#no-data` slot, which also
         meant it could not be drawn without the table around it; as a sibling of
         it, nothing is claimed before the summaries have arrived. -->
    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon name="o_request_quote" size="20px" />
      </span>
      <p class="dash-empty__title">No cash advances</p>
      <p class="dash-empty__sub">
        Advances appear here once an employee in an open payout group requests one.
      </p>
    </div>

    <q-table
      v-else
      :rows="rows"
      :columns="columns"
      :pagination="{ sortBy: sort.sortBy, descending: sort.descending, rowsPerPage: 0 }"
      :sort-method="passThrough"
      row-key="id"
      flat
      hide-pagination
      class="dash-qtable dash-qtable--flush ca-table"
      @update:pagination="onPagination"
    >
      <template #body="props">
        <!-- The whole row opens the cash-advance flow for that run, exactly as
             the payout-group table opens the run. It used to expand an inline
             list of employees, which made the same click mean two different
             things depending on which view of the list you were in. -->
        <q-tr
          :props="props"
          class="dash-qtable__row dash-qtable__row--clickable ca-row"
          tabindex="0"
          :aria-label="`Open cash advances for ${props.row.group}`"
          @click="$emit('view', props.row)"
          @keydown.enter="$emit('view', props.row)"
          @keydown.space.prevent="$emit('view', props.row)"
        >
          <!-- Same identity block as the payout-group table, so the two views of
               the same list read as the same rows. -->
          <q-td key="group" :props="props">
            <div class="ca-id">
              <span class="ca-id__name">{{ props.row.group }}</span>
              <span class="ca-id__cutoff">{{ props.row.cutoff || '—' }}</span>
            </div>
          </q-td>

          <!-- How many of the run's people asked for an advance, against how many
               it pays. The count alone would not say whether three requests is the
               whole group or a corner of it. -->
          <q-td key="advances" :props="props" class="col-num">
            <span v-if="props.row.summary.advanceCount" class="dash-num ca-count">
              <span class="ca-count__n">{{ props.row.summary.advanceCount }}</span>
              <span class="ca-count__of">of {{ props.row.summary.headcount }}</span>
            </span>
            <span v-else class="ca-none">{{ props.row.summary.loaded ? 'None' : '—' }}</span>
          </q-td>

          <q-td key="requested" :props="props" class="col-num">
            <span class="dash-num" :class="{ 'ca-zero': !props.row.summary.requested }">
              {{ formatCurrency(props.row.summary.requested) }}
            </span>
          </q-td>

          <!-- Approved below requested is the row worth looking at — either a
               decision nobody has made yet or one somebody made in part — so it is
               toned rather than left as one more figure. The same call the Review
               step's table makes on the same two numbers. -->
          <q-td key="approved" :props="props" class="col-num">
            <span
              class="dash-num ca-approved"
              :class="{
                'ca-zero': !props.row.summary.approved && !props.row.summary.shortfall,
                'ca-approved--short': props.row.summary.shortfall > 0,
              }"
            >
              {{ formatCurrency(props.row.summary.approved) }}
            </span>
            <q-tooltip v-if="props.row.summary.shortfall > 0" :delay="300">
              {{ formatCurrency(props.row.summary.shortfall) }} of
              {{ formatCurrency(props.row.summary.requested) }} not approved
            </q-tooltip>
          </q-td>

          <!-- The share of what was asked for that has been approved. A run with
               nothing requested draws no track at all: an empty bar there would
               read as "nothing approved", which is the one thing it is not. -->
          <q-td key="approval" :props="props">
            <span v-if="props.row.summary.approvalPct != null" class="dash-bar ca-bar">
              <span class="dash-bar__track" :class="`dash-bar__track--${props.row.summary.tone}`">
                <span
                  class="dash-bar__fill"
                  :class="`dash-bar__fill--${props.row.summary.tone}`"
                  :style="{
                    width: approvalFillWidth(
                      props.row.summary.approvalPct,
                      props.row.summary.approved,
                    ),
                  }"
                />
              </span>
              <span class="ca-bar__pct dash-num" :class="`is-${props.row.summary.tone}`">
                {{ Math.round(props.row.summary.approvalPct) }}%
              </span>
              <q-tooltip :delay="300">
                {{ formatCurrency(props.row.summary.approved) }} approved of
                {{ formatCurrency(props.row.summary.requested) }} requested
              </q-tooltip>
            </span>
            <span v-else class="ca-none">—</span>
          </q-td>

          <!-- Four cash-advance steps, not the payroll flow's five: there is no
               Payslips stage here. -->
          <q-td key="progress" :props="props">
            <CashAdvanceProgressStepper
              :group-id="props.row.id"
              :ca-status="props.row.cashAdvanceStatus"
              :pgi-status="props.row.status"
              :group-name="props.row.group"
              :cutoff-name="props.row.cutoff"
            />
          </q-td>

          <q-td key="open" :props="props" class="col-open">
            <q-icon name="chevron_right" size="18px" class="ca-open" />
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script setup>
/**
 * The disbursement list read as cash advances rather than as payouts.
 *
 * Same rows as `PayoutTable` — one per payout group instance — with the money
 * columns swapped for what the run's employees asked for and what has been
 * approved. The progress column is the cash-advance flow's four-step rail, not
 * the payroll run's five-step one: the list is about advances here, so it drops
 * the Payslips stage.
 *
 * The whole row opens the cash-advance flow for that run, exactly as a payout
 * row opens the run. The per-employee breakdown lives in the flow's Review step,
 * which is where the approve/reject actions are; the list no longer expands an
 * inline panel of its own.
 *
 * Every figure here comes from `composables/utils/cashAdvance.js`; nothing in
 * this file does arithmetic on the payload. That is what keeps the row totals
 * and the page's summary tiles from disagreeing.
 *
 * Sorting is the caller's, not Quasar's. `sort-method` is a pass-through and the
 * page sorts the whole filtered set before it slices a page out — a table that
 * sorted the rows it was handed would be re-ordering one page of results and
 * calling it a sorted list.
 */
import TableSkeleton from 'src/components/common/TableSkeleton.vue'
import CashAdvanceProgressStepper from 'src/components/pages/CashAdvance/CashAdvanceProgressStepper.vue'
import { formatCurrency } from 'src/composables/utils/format'
import { approvalFillWidth } from 'src/composables/utils/cashAdvance'

const props = defineProps({
  /** `{ id, group, cutoff, status, summary }`, summary from `summariseCashAdvance`. */
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  /** `{ sortBy, descending }`, owned by the page. */
  sort: { type: Object, default: () => ({ sortBy: 'requested', descending: true }) },
})

const emit = defineEmits(['view', 'update:sort'])

/**
 * How many placeholder rows the loading skeleton draws — the list page's default
 * page size, so the placeholder is the height of the table that replaces it. The
 * page owns its page size; this is only the guess made before the first fetch
 * answers, and the card's footer is hidden until then anyway.
 */
const SKELETON_ROWS = 10

const columns = [
  {
    name: 'group',
    label: 'Payout group',
    field: 'group',
    align: 'left',
    sortable: true,
    style: 'min-width: 210px',
    // Quasar reads only `style`, and ignores a width it does not know; the
    // loading skeleton reads `minWidth`/`width`. Declaring both is what lets the
    // placeholder line its column edges up with the table that replaces it.
    minWidth: 210,
  },
  {
    name: 'advances',
    label: 'Employees',
    field: (row) => row.summary.advanceCount,
    align: 'right',
    sortable: true,
    style: 'width: 108px',
    width: 108,
    headerClasses: 'col-num',
  },
  {
    name: 'requested',
    label: 'Requested',
    field: (row) => row.summary.requested,
    align: 'right',
    sortable: true,
    style: 'width: 126px',
    width: 126,
    headerClasses: 'col-num',
  },
  {
    name: 'approved',
    label: 'Approved',
    field: (row) => row.summary.approved,
    align: 'right',
    sortable: true,
    style: 'width: 126px',
    width: 126,
    headerClasses: 'col-num',
  },
  {
    name: 'approval',
    label: 'Approved share',
    field: (row) => row.summary.approvalPct ?? -1,
    align: 'left',
    sortable: true,
    style: 'width: 138px',
    width: 138,
  },
  {
    name: 'progress',
    label: 'Progress',
    field: 'status',
    align: 'left',
    style: 'width: 156px',
    width: 156,
  },
  { name: 'open', label: '', field: 'open', align: 'right', style: 'width: 44px', width: 44 },
]

/** Quasar has already been handed a sorted page; re-sorting it would undo that. */
function passThrough(rows) {
  return rows
}

function onPagination(pagination) {
  if (pagination.sortBy === props.sort.sortBy && pagination.descending === props.sort.descending) {
    return
  }
  emit('update:sort', { sortBy: pagination.sortBy, descending: pagination.descending })
}
</script>

<style scoped>
/* Card reset, header strip, row rhythm, hover plate and dividers all come from
   `dash-qtable` in src/css/dashboard.scss. */
.ca-table {
  width: 100%;
}
.ca-table :deep(thead .col-num) {
  text-align: right;
}

/* `dash-qtable--flush` zeroes the header's top padding on the theory that the
   band above supplies it. Under the runs toolbar it does not, and the labels
   come up against its hairline. Matched to `PayoutTable`, so switching views
   does not move the header strip. */
.ca-table :deep(.q-table thead tr th) {
  padding-top: 14px;
}

/* ── Identity ── */
.ca-id {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}

.ca-id__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ca-id__cutoff {
  font-size: 12px;
  color: var(--dash-ink-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Figures ── */
.ca-table :deep(.col-num) {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ca-count {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}
.ca-count__n {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
}
.ca-count__of {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.ca-approved {
  font-weight: 600;
  color: var(--dash-ink);
}
.ca-approved--short {
  color: var(--dash-warn);
}

/* A zero is a fact, but it is not the fact the row is about; it recedes so the
   runs that do have advances carry the eye. */
.ca-zero {
  color: var(--dash-ink-4);
  font-weight: 400;
}

.ca-none {
  font-size: 12.5px;
  color: var(--dash-ink-4);
}

.ca-bar {
  width: 100%;
  max-width: 126px;
}
.ca-bar__pct {
  font-size: 12px;
  font-weight: 600;
  min-width: 30px;
  text-align: right;
  flex-shrink: 0;
  color: var(--dash-ink-2);
}
.ca-bar__pct.is-good {
  color: var(--dash-good);
}
.ca-bar__pct.is-warn {
  color: var(--dash-warn);
}
.ca-bar__pct.is-critical {
  color: var(--dash-critical);
}

/* ── Open affordance ──
   The shared `dash-qtable__row--clickable` supplies the pointer cursor and the
   focus ring; only the chevron's hover treatment is local. */
.ca-open {
  color: var(--dash-n-300);
  transition:
    color var(--dash-fast) var(--dash-ease),
    transform var(--dash-fast) var(--dash-ease);
}
.ca-table :deep(.ca-row:hover) .ca-open {
  color: var(--dash-accent);
  transform: translateX(2px);
}
.ca-table :deep(.col-open) {
  text-align: right;
  padding-left: 0 !important;
}

@media (max-width: 1279px) {
  /* Same selector shape as the header rule above, so this step still wins on
     order rather than losing the top padding back to zero. */
  .ca-table :deep(.q-table thead tr th) {
    padding: 12px 9px 10px;
  }
  .ca-table :deep(.q-table tbody td) {
    padding: 12px 9px;
  }
}
</style>
