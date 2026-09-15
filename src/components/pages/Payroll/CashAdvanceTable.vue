<template>
  <q-table
    :rows="rows"
    :columns="columns"
    :loading="loading"
    :pagination="{ sortBy: sort.sortBy, descending: sort.descending, rowsPerPage: 0 }"
    :sort-method="passThrough"
    row-key="id"
    flat
    hide-pagination
    class="dash-qtable dash-qtable--flush ca-table"
    @update:pagination="onPagination"
  >
    <template #body="props">
      <q-tr
        :props="props"
        class="dash-qtable__row ca-row"
        :class="{ 'ca-row--open': isExpanded(props.row.id) }"
        :tabindex="props.row.summary.advanceCount ? 0 : -1"
        :aria-expanded="props.row.summary.advanceCount ? isExpanded(props.row.id) : undefined"
        :aria-label="rowLabel(props.row)"
        @click="toggle(props.row)"
        @keydown.enter="toggle(props.row)"
        @keydown.space.prevent="toggle(props.row)"
      >
        <!-- Same identity block as the payout-group table, so the two views of
             the same list read as the same rows. The caret is the only addition:
             a run with no advances has nothing to open, so it does not get one. -->
        <q-td key="group" :props="props">
          <div class="ca-id">
            <q-icon
              v-if="props.row.summary.advanceCount"
              name="chevron_right"
              size="17px"
              class="ca-id__caret"
              :class="{ 'ca-id__caret--open': isExpanded(props.row.id) }"
            />
            <span v-else class="ca-id__caret ca-id__caret--none" aria-hidden="true" />
            <span class="ca-id__text">
              <span class="ca-id__name">{{ props.row.group }}</span>
              <span class="ca-id__cutoff">{{ props.row.cutoff || '—' }}</span>
            </span>
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

        <q-td key="progress" :props="props">
          <PayoutProgressStepper
            :group-id="props.row.id"
            :pgi-status="props.row.status"
            :group-name="props.row.group"
            :cutoff-name="props.row.cutoff"
          />
        </q-td>

        <!-- The row opens the advances; the run itself is a separate target.
             In the payout-group view the whole row opens the run, and leaving
             that on the row here would mean the caret and the row disagreed
             about what a click does. -->
        <q-td key="open" :props="props" class="col-open">
          <q-btn
            flat
            round
            dense
            size="11px"
            icon="chevron_right"
            class="ca-open"
            :aria-label="`Open ${props.row.group}`"
            @click.stop="$emit('view', props.row)"
          >
            <q-tooltip :delay="300">Open run</q-tooltip>
          </q-btn>
        </q-td>
      </q-tr>

      <!-- ── The employees behind the totals ──────────────────────────────────
           A panel inside one full-width cell, with its own three headings, not
           extra rows borrowed from the table's column grid: the columns above
           measure runs and these measure people, and a sub-row that lines up
           under "Employees" and "Requested" while meaning something else is
           exactly the drift that makes a table hard to read. -->
      <q-tr
        v-if="isExpanded(props.row.id)"
        :key="`${props.row.id}-detail`"
        :props="props"
        no-hover
        class="ca-detail-row"
      >
        <q-td colspan="100%" class="ca-detail-cell">
          <div class="ca-detail">
            <div class="ca-detail__head">
              <span class="ca-detail__title">Cash advances in {{ props.row.group }}</span>
              <span class="ca-detail__meta dash-num">
                {{ props.row.summary.advanceCount }}
                {{ props.row.summary.advanceCount === 1 ? 'employee' : 'employees' }}
                <template v-if="props.row.summary.pendingCount">
                  · {{ props.row.summary.pendingCount }} short of the request
                </template>
              </span>
            </div>

            <div class="ca-detail__grid" role="table">
              <div class="ca-detail__hrow" role="row">
                <span role="columnheader">Employee</span>
                <span role="columnheader" class="col-num">Requested</span>
                <span role="columnheader" class="col-num">Approved</span>
                <span role="columnheader">Review</span>
              </div>
              <div
                v-for="person in props.row.summary.advances"
                :key="person.epiId ?? person.employeeId ?? person.name"
                class="ca-detail__row"
                role="row"
              >
                <span class="who" role="cell">
                  <q-avatar v-if="avatarOf(person.name).pictureUrl" size="26px" class="who__avatar">
                    <img :src="avatarOf(person.name).pictureUrl" :alt="person.name" />
                  </q-avatar>
                  <q-avatar
                    v-else
                    size="26px"
                    class="who__avatar"
                    :style="{ background: avatarOf(person.name).color }"
                  >
                    <span class="who__initials">{{ avatarOf(person.name).initials || '?' }}</span>
                  </q-avatar>
                  <span class="who__text">
                    <span class="who__name">{{ person.name }}</span>
                    <span v-if="roleLine(person)" class="who__role">{{ roleLine(person) }}</span>
                  </span>
                </span>

                <span class="dash-num col-num" role="cell">
                  {{ formatCurrency(person.requested) }}
                </span>

                <span
                  class="dash-num col-num ca-approved"
                  :class="{ 'ca-approved--short': person.shortfall > 0 }"
                  role="cell"
                >
                  {{ formatCurrency(person.approved) }}
                  <q-tooltip v-if="person.shortfall > 0" :delay="300">
                    {{ formatCurrency(person.shortfall) }} short of the request
                  </q-tooltip>
                </span>

                <span role="cell">
                  <StatusPill :status="person.reviewStatus" />
                </span>
              </div>
            </div>
          </div>
        </q-td>
      </q-tr>
    </template>

    <!-- `hide-no-data` is deliberately *not* set: it suppresses this slot
         outright, so a table carrying it renders nothing at all when it is
         empty — a header strip over blank space. Emptiness is a normal state
         here, since "Only groups with advances" hides every run in a quiet
         cutoff, so it gets the panel empty state the rest of the app uses.

         Nothing is drawn while the summaries are still arriving, though: an
         empty table mid-fetch is not yet an answer, and saying "no cash
         advances" before the requests come back would be wrong for as long as
         they take. -->
    <template #no-data>
      <div v-if="!loading" class="dash-empty">
        <span class="dash-featured-icon">
          <q-icon name="o_request_quote" size="20px" />
        </span>
        <p class="dash-empty__title">No cash advances</p>
        <p class="dash-empty__sub">
          Advances appear here once an employee in an open payout group requests one.
        </p>
      </div>
    </template>
  </q-table>
</template>

<script setup>
/**
 * The disbursement list read as cash advances rather than as payouts.
 *
 * Same rows as `PayoutTable` — one per payout group instance, carrying the same
 * five-step progress rail — with the money columns swapped for what the run's
 * employees asked for and what has been approved. The two views are deliberately
 * the same list seen twice rather than two lists, so a run's position in the flow
 * means the same thing in both and the toolbar narrows them identically.
 *
 * Every figure here comes from `composables/utils/cashAdvance.js`; nothing in
 * this file does arithmetic on the payload. That is what keeps the row totals,
 * the expanded per-employee lines and the page's summary tiles from disagreeing.
 *
 * Sorting is the caller's, not Quasar's. `sort-method` is a pass-through and the
 * page sorts the whole filtered set before it slices a page out — a table that
 * sorted the rows it was handed would be re-ordering one page of results and
 * calling it a sorted list.
 */
import { ref } from 'vue'
import PayoutProgressStepper from 'src/components/pages/Payroll/PayoutProgressStepper.vue'
import StatusPill from 'src/components/common/StatusPill.vue'
import { formatCurrency } from 'src/composables/utils/format'
import { approvalFillWidth } from 'src/composables/utils/cashAdvance'
import { avatarFor } from 'src/composables/utils/employee'

const props = defineProps({
  /** `{ id, group, cutoff, status, summary }`, summary from `summariseCashAdvance`. */
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  /** `{ sortBy, descending }`, owned by the page. */
  sort: { type: Object, default: () => ({ sortBy: 'requested', descending: true }) },
  /** From `buildEmployeeNameIndex`, for the expanded rows' photographs. */
  employeeIndex: { type: Object, default: null },
})

const emit = defineEmits(['view', 'update:sort'])

const columns = [
  {
    name: 'group',
    label: 'Payout group',
    field: 'group',
    align: 'left',
    sortable: true,
    style: 'min-width: 210px',
  },
  {
    name: 'advances',
    label: 'Employees',
    field: (row) => row.summary.advanceCount,
    align: 'right',
    sortable: true,
    style: 'width: 108px',
    headerClasses: 'col-num',
  },
  {
    name: 'requested',
    label: 'Requested',
    field: (row) => row.summary.requested,
    align: 'right',
    sortable: true,
    style: 'width: 126px',
    headerClasses: 'col-num',
  },
  {
    name: 'approved',
    label: 'Approved',
    field: (row) => row.summary.approved,
    align: 'right',
    sortable: true,
    style: 'width: 126px',
    headerClasses: 'col-num',
  },
  {
    name: 'approval',
    label: 'Approved share',
    field: (row) => row.summary.approvalPct ?? -1,
    align: 'left',
    sortable: true,
    style: 'width: 138px',
  },
  {
    name: 'progress',
    label: 'Progress',
    field: 'status',
    align: 'left',
    style: 'width: 156px',
  },
  { name: 'open', label: '', field: 'open', align: 'right', style: 'width: 44px' },
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

// Expansion is per row id and survives paging back and forth, which is cheap and
// is what a reader expects after opening two runs to compare them.
const expanded = ref(new Set())

function isExpanded(id) {
  return expanded.value.has(id)
}

function toggle(row) {
  if (!row.summary.advanceCount) return
  const next = new Set(expanded.value)
  if (next.has(row.id)) next.delete(row.id)
  else next.add(row.id)
  expanded.value = next
}

function rowLabel(row) {
  if (!row.summary.advanceCount) return `${row.group} — no cash advances`
  return `${isExpanded(row.id) ? 'Hide' : 'Show'} cash advances in ${row.group}`
}

function roleLine(person) {
  return [person.position, person.department].filter(Boolean).join(' · ')
}

function avatarOf(name) {
  return avatarFor(props.employeeIndex, name)
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
   does not move the header strip. The progress row is excluded — it carries the
   loading bar and must stay at zero, or the header jumps down mid-fetch. */
.ca-table :deep(.q-table thead tr:not(.q-table__progress) th) {
  padding-top: 14px;
}

/* Quasar renders the empty state inside its bottom bar, which is built for a
   pagination row: 48px min-height, side padding and a top hairline. The panel
   brings its own spacing, so without this reset it sits inset and double-ruled
   under the header. */
.ca-table :deep(.q-table__bottom--nodata) {
  min-height: 0;
  padding: 0;
  border-top: none;
}

/* ── Identity ── */
.ca-id {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ca-id__caret {
  flex-shrink: 0;
  width: 17px;
  color: var(--dash-n-300);
  transition: transform var(--dash-fast) var(--dash-ease), color var(--dash-fast) var(--dash-ease);
}
.ca-id__caret--open {
  transform: rotate(90deg);
  color: var(--dash-accent);
}
/* A run with nothing to open still reserves the caret's width, so the group
   names stay in one column instead of stepping in and out by 25px. */
.ca-id__caret--none {
  height: 17px;
}
.ca-table :deep(.ca-row:hover) .ca-id__caret {
  color: var(--dash-accent);
}

.ca-id__text {
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

/* ── Row affordances ── */
.ca-table :deep(.ca-row) {
  cursor: pointer;
}
.ca-table :deep(.ca-row:focus-visible) {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--dash-accent-ring);
}
/* An open row and its panel are one object, so the row keeps a tinted plate
   while its detail is showing rather than snapping back to white above it. */
.ca-table :deep(.ca-row--open) > td {
  background: var(--dash-n-25);
}

.ca-open {
  color: var(--dash-n-300);
}
.ca-table :deep(.ca-row:hover) .ca-open {
  color: var(--dash-accent);
}
.ca-table :deep(.col-open) {
  text-align: right;
  padding-left: 0 !important;
}

/* ── Detail panel ── */
.ca-table :deep(.ca-detail-row) > td {
  padding: 0 !important;
  background: var(--dash-n-25);
  border-bottom: 1px solid var(--dash-line);
}

.ca-detail {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 16px 15px 41px;
}

.ca-detail__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ca-detail__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--dash-ink-2);
}

.ca-detail__meta {
  font-size: 11.5px;
  color: var(--dash-ink-4);
}

.ca-detail__grid {
  display: flex;
  flex-direction: column;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: hidden;
}

.ca-detail__hrow,
.ca-detail__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 126px 126px 132px;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
}

.ca-detail__hrow {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--dash-ink-4);
  background: var(--dash-n-25);
  border-bottom: 1px solid var(--dash-line);
}

.ca-detail__row {
  font-size: 13px;
  color: var(--dash-ink-2);
  border-bottom: 1px solid var(--dash-line);
}
.ca-detail__row:last-child {
  border-bottom: none;
}

.ca-detail__grid .col-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ── Person ──
   Same construction as the Employees and Audit tables: the photograph when the
   name resolves to exactly one employee who has one, initials on that person's
   identity colour otherwise. */
.who {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.who__avatar {
  flex-shrink: 0;
}
.who__initials {
  font-size: 10.5px;
  font-weight: 600;
  color: #fff;
}
.who__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}
.who__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.who__role {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1279px) {
  /* Same selector shape as the header rule above, so this step still wins on
     order rather than losing the top padding back to zero. */
  .ca-table :deep(.q-table thead tr:not(.q-table__progress) th) {
    padding: 12px 9px 10px;
  }
  .ca-table :deep(.q-table tbody td) {
    padding: 12px 9px;
  }
  .ca-detail {
    padding: 12px 12px 14px;
  }
  .ca-detail__hrow,
  .ca-detail__row {
    grid-template-columns: minmax(0, 1fr) 108px 108px 118px;
    gap: 8px;
  }
}

@media (max-width: 767px) {
  /* The four-column detail grid stops fitting well before the table does; the
     figures move under the name rather than being squeezed into 60px. */
  .ca-detail__hrow {
    display: none;
  }
  .ca-detail__row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 6px;
  }
  .ca-detail__row .who {
    grid-column: 1 / -1;
  }
}
</style>
