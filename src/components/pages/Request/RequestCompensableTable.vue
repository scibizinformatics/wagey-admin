<template>
  <div class="table-section dash-page-body">
    <div class="grid-toolbar grid-toolbar--sub">
      <q-input
        :model-value="search"
        @update:model-value="$emit('update:search', $event)"
        placeholder="Search employee, category or notes"
        dense
        outlined
        clearable
        class="grid-search dash-field"
      >
        <template v-slot:prepend>
          <q-icon name="search" size="18px" />
        </template>
      </q-input>
      <q-select
        :model-value="statusFilter || 'all'"
        @update:model-value="$emit('update:statusFilter', $event)"
        :options="statusOptions"
        emit-value
        map-options
        dense
        outlined
        hide-bottom-space
        popup-content-class="dash-popup"
        class="grid-filter dash-field"
        aria-label="Filter by status"
      >
        <template v-slot:prepend>
          <q-icon name="o_filter_alt" size="16px" />
        </template>
      </q-select>
      <!-- Payout group, resolved from each employee's active contract — the same
           source and the same wording the Employees, Attendance and Schedule
           filters use, so one reviewer's "group A" means one thing app-wide.
           Hidden entirely when the company has no groups set up, rather than
           offering a select whose only option is "All". -->
      <q-select
        v-if="payrollGroupOptions.length"
        :model-value="payrollGroupFilter"
        @update:model-value="$emit('update:payrollGroupFilter', $event)"
        :options="payrollGroupSelectOptions"
        emit-value
        map-options
        dense
        outlined
        hide-bottom-space
        popup-content-class="dash-popup"
        class="grid-filter grid-filter--wide dash-field"
        aria-label="Filter by payout group"
      >
        <template v-slot:prepend>
          <q-icon name="o_groups" size="16px" />
        </template>
      </q-select>
      <div class="grid-footer-info">
        <strong>{{ rows.length }}</strong> {{ rows.length === 1 ? 'request' : 'requests' }}
      </div>
    </div>

    <!-- Loading. Built from the live `compensableColumns`, so the placeholder
         shares the real table's columns, labels and alignment. -->
    <TableSkeleton v-if="loading" :columns="compensableColumns" wrap-class="request-tskel" />

    <!-- Empty -->
    <div v-else-if="rows.length === 0" class="grid-empty">
      <div class="grid-empty-icon"><q-icon name="work_history" size="26px" /></div>
      <div class="grid-empty-title">{{ emptyTitle }}</div>
      <div class="grid-empty-text">{{ emptyText }}</div>
    </div>

    <template v-else>
      <!-- Selection is a state, not an outcome, so the band is informational
           rather than the green "everything succeeded" bar of a finished action. -->
      <div v-if="selectedIds.size > 0" class="bulk-actions-bar">
        <span class="bulk-count">{{ selectedIds.size }} selected</span>
        <q-btn
          unelevated
          dense
          no-caps
          icon="check"
          color="positive"
          label="Approve selected"
          :loading="submitting.size > 0"
          @click="$emit('bulk-approve')"
        />
        <q-btn
          unelevated
          dense
          no-caps
          icon="close"
          color="negative"
          label="Reject selected"
          :loading="submitting.size > 0"
          @click="$emit('bulk-reject')"
        />
        <q-btn flat dense no-caps label="Clear" @click="$emit('clear-selection')" />
      </div>

      <!-- Grid -->
      <div class="grid-scroll dash-scroll-x">
        <q-table
          :rows="rows"
          :columns="compensableColumns"
          row-key="id"
          flat
          class="dash-qtable dash-qtable--flush request-grid compensable-grid"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header="props">
            <q-tr class="grid-head-row" :props="props">
              <q-th
                key="select"
                :props="props"
                class="grid-head-cell grid-cell--center ct-cell-select"
              >
                <q-checkbox
                  :model-value="allSelected"
                  @update:model-value="$emit('toggle-select-all')"
                  :disable="actionableCount === 0"
                  dense
                  size="xs"
                >
                  <q-tooltip v-if="actionableCount">
                    {{ allSelected ? 'Clear selection' : selectAllHint }}
                  </q-tooltip>
                </q-checkbox>
              </q-th>
              <q-th key="employeeName" :props="props" class="grid-head-cell">Employee</q-th>
              <q-th key="category" :props="props" class="grid-head-cell">Category</q-th>
              <q-th key="dates" :props="props" class="grid-head-cell">Dates</q-th>
              <q-th key="duration" :props="props" class="grid-head-cell">Duration</q-th>
              <q-th key="notes" :props="props" class="grid-head-cell">Notes</q-th>
              <q-th key="status" :props="props" class="grid-head-cell">Status</q-th>
              <q-th key="actions" :props="props" class="grid-head-cell grid-head-cell--right">
                Actions
              </q-th>
            </q-tr>
          </template>

          <template v-slot:body="props">
            <q-tr
              class="dash-qtable__row grid-row"
              :class="{ 'grid-row--waiting': props.row.status === 'pending' }"
              :props="props"
            >
              <q-td key="select" :props="props" class="grid-cell grid-cell--center ct-cell-select">
                <q-checkbox
                  v-if="props.row.status === 'pending'"
                  :model-value="selectedIds.has(props.row.id)"
                  @update:model-value="$emit('toggle-selection', props.row.id)"
                  dense
                  size="xs"
                />
              </q-td>

              <q-td key="employeeName" :props="props" class="grid-cell ct-cell-employee">
                <div class="identity">
                  <!-- A face when the name resolves to exactly one roster employee
                       who has one, otherwise the person's initials on their
                       identity colour — the same construction as the Card taps,
                       Audit and Deductions tables. -->
                  <q-avatar
                    v-if="avatarOf(props.row.employeeName).pictureUrl"
                    size="30px"
                    class="identity-avatar"
                  >
                    <img
                      :src="avatarOf(props.row.employeeName).pictureUrl"
                      :alt="props.row.employeeName || 'Employee'"
                    />
                  </q-avatar>
                  <q-avatar
                    v-else
                    size="30px"
                    class="identity-avatar"
                    :style="{ background: avatarOf(props.row.employeeName).color }"
                  >
                    <span class="identity-initials">
                      {{ avatarOf(props.row.employeeName).initials }}
                    </span>
                  </q-avatar>
                  <span class="identity-text">
                    <span class="identity-name">{{ props.row.employeeName || 'Unknown' }}</span>
                    <!-- Rendered only when the backend stamped the application. An
                         empty sub-line still costs the stack's 1px gap, which
                         pushes the name off the avatar's centre line. -->
                    <span v-if="filedLabel(props.row)" class="identity-sub">
                      {{ filedLabel(props.row) }}
                    </span>
                  </span>
                </div>
              </q-td>

              <!-- The category a person would recognise ("Holiday worked") over
                   the narrower one filed under it ("Regular day off"), so the
                   subcategory reads as the refinement it is rather than as a
                   second, competing category. -->
              <q-td key="category" :props="props" class="grid-cell ct-cell-category">
                <span class="type-pill">{{ props.row.categoryName || '—' }}</span>
                <div v-if="props.row.subCategoryName" class="range-meta">
                  {{ props.row.subCategoryName }}
                </div>
              </q-td>

              <!-- The span the days collapse to, read once by the queue's normalizer. The
                   full text rides along as the title so truncation hides the
                   ellipsis, never the dates. -->
              <q-td key="dates" :props="props" class="grid-cell ct-cell-dates">
                <span class="note note--dates" :title="props.row.datesLabel">
                  {{ props.row.datesLabel }}
                </span>
                <!-- A half day is invisible in a span, and it is half the day's
                     value — so it gets its own line. -->
                <div v-if="props.row.halfDayCount" class="range-meta">
                  {{ halfDayLabel(props.row.halfDayCount) }}
                </div>
              </q-td>

              <!-- The accrued value rather than the calendar-day count, resolved
                   once by the queue's normalizer, so a half day reads as half a
                   day here exactly as it does on the leave queue. -->
              <q-td key="duration" :props="props" class="grid-cell ct-cell-duration">
                <span class="stat-num">{{ props.row.duration }}</span>
              </q-td>

              <q-td key="notes" :props="props" class="grid-cell ct-cell-notes">
                <span class="note" :title="props.row.notes || ''">
                  {{ props.row.notes || '—' }}
                </span>
              </q-td>

              <q-td key="status" :props="props" class="grid-cell ct-cell-status">
                <!-- The pill answers with the application's status; the
                     recommendation is a warn-toned annotation about the answer,
                     kept on one line so neither badge has to read as the other.
                     On a pending row the pill is already amber, so the flag keeps
                     its icon — that is what marks it as advice rather than as a
                     second status. -->
                <div class="status-inline">
                  <span :class="['status-pill', statusPillClass(props.row.status)]">
                    {{ props.row.statusLabel }}
                  </span>
                  <div
                    v-if="props.row.recommendedForRejection"
                    class="dash-chip dash-chip--warn reject-flag"
                  >
                    <q-icon name="o_flag" size="13px" />
                    Rejection recommended
                  </div>
                </div>
              </q-td>

              <q-td key="actions" :props="props" class="grid-cell ct-cell-actions">
                <div class="grid-actions">
                  <q-btn
                    flat
                    dense
                    round
                    icon="more_horiz"
                    size="sm"
                    class="grid-action"
                    :loading="isBusy(props.row)"
                    aria-label="Row actions"
                    @click.stop
                  >
                    <RequestRowMenu
                      :actions="rowActions(props.row)"
                      @select="$emit($event, props.row)"
                    />
                  </q-btn>
                </div>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import RequestRowMenu from './RequestRowMenu.vue'
import { avatarFor } from '@/composables/utils/employee'
import { compensableStatusPillClass } from 'src/composables/utils/compensableTime'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: Boolean,
  // Name → employee record, to put a face on each row; built once per page and
  // shared by every tab. A name held by two employees resolves to null, so a row
  // draws initials rather than the wrong photo. See `avatarFor`.
  employeeIndex: { type: Object, default: null },
  submitting: { type: Set, default: () => new Set() },
  selectedIds: { type: Set, default: () => new Set() },
  statusFilter: { type: String, default: 'all' },
  search: { type: String, default: '' },
  // Null is "all groups"; ids arrive from the payroll-groups endpoint, which
  // numbers them, but a string id would compare just as well.
  payrollGroupFilter: { type: [Number, String], default: null },
  payrollGroupOptions: { type: Array, default: () => [] },
  // Which row a recommendation write is in flight for, so the row's spinner
  // covers it. Separate from `submitting` because a recommendation is a different
  // endpoint from approve/reject, and one of the two can be busy while the other
  // is not — a single slot would blank the wrong spinner.
  recommendLoading: { type: String, default: null },
})

defineEmits([
  'update:statusFilter',
  'update:search',
  'update:payrollGroupFilter',
  'toggle-selection',
  'toggle-select-all',
  'clear-selection',
  'view-details',
  'approve',
  'reject',
  'recommend-rejection',
  'remove-recommendation',
  'bulk-approve',
  'bulk-reject',
])

// Self-describing labels: the field is 34px tall, too short for a Quasar
// stacked label, so the option text has to say which dimension it controls.
const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const payrollGroupSelectOptions = computed(() => [
  { label: 'All payout groups', value: null },
  ...props.payrollGroupOptions,
])

const compensableColumns = [
  { name: 'select', label: '', field: '', align: 'center' },
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'category', label: 'Category', field: 'categoryName', align: 'left' },
  { name: 'dates', label: 'Dates', field: 'dates', align: 'left' },
  { name: 'duration', label: 'Duration', field: 'duration', align: 'left' },
  { name: 'notes', label: 'Notes', field: 'notes', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
]

/**
 * The row's own actions, in the order a reviewer works through them. The menu
 * emits the event name back, so the keys are the events this table already
 * declares and no extra mapping layer sits in between.
 *
 * Approve and Reject stay live on a row carrying a rejection recommendation. The
 * *batch* endpoint refuses to action one, but this row is decided through the
 * single per-application endpoint, which does not — so a greyed-out pair here
 * would explain a rule that does not apply to the click it was guarding, which is
 * worse in a queue than offering the action and letting the server answer.
 */
const rowActions = (row) => {
  const actions = [{ key: 'view-details', label: 'View details', icon: 'o_visibility' }]
  if (row.status === 'pending') {
    actions.push(
      { key: 'approve', label: 'Approve', icon: 'o_check_circle', tone: 'good' },
      { key: 'reject', label: 'Reject', icon: 'o_cancel', tone: 'danger' },
    )
    // Advisory, and it is the only item here that describes state rather than
    // performing an act, so it reads as "Recommended for rejection" — a noun
    // phrase, not a verb that looks like a third way to decide the request. The
    // wording is what keeps it from being read as a synonym for Reject, since
    // both are in this menu and the request can still be approved afterwards.
    actions.push(
      row.recommendedForRejection
        ? {
            key: 'remove-recommendation',
            label: 'Remove rejection recommendation',
            icon: 'o_flag',
            tone: 'danger',
          }
        : {
            key: 'recommend-rejection',
            label: 'Recommend rejection',
            icon: 'o_flag',
            tone: 'danger',
          },
    )
  }
  return actions
}

// The spinner covers every write this row is the subject of, including the bulk
// path, whose loading rides the same `submitting` Set the batch bar reads.
const isBusy = (row) =>
  props.submitting.has(row.id) ||
  props.recommendLoading === `recommend-${row.id}` ||
  props.recommendLoading === `unrecommend-${row.id}`

const actionableCount = computed(() => props.rows.filter((row) => row.status === 'pending').length)

const selectAllHint = computed(() => `Select all ${actionableCount.value} awaiting a decision`)

const allSelected = computed(
  () =>
    actionableCount.value > 0 &&
    props.rows.every((row) => row.status !== 'pending' || props.selectedIds.has(row.id)),
)

const isNarrowed = computed(
  () =>
    (!!props.statusFilter && props.statusFilter !== 'all') ||
    !!(props.search || '').trim() ||
    props.payrollGroupFilter !== null,
)

const emptyTitle = computed(() =>
  isNarrowed.value ? 'No requests match your filters' : 'No compensable time requests',
)
// Names only the controls actually in use: the payout-group select is hidden for
// a company with no groups set up, so a fixed sentence listing all three would
// point at a field that isn't on screen.
const emptyText = computed(() => {
  if (!isNarrowed.value) return 'Compensable time claimed by employees lands here for review.'
  const parts = []
  if ((props.search || '').trim()) parts.push('clearing the search')
  if (props.statusFilter && props.statusFilter !== 'all') {
    parts.push('switching back to All statuses')
  }
  if (props.payrollGroupFilter !== null) parts.push('switching back to All payout groups')
  const list =
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}` : parts[0]
  return `Try ${list} to see every request in this queue.`
})

const avatarOf = (name) => avatarFor(props.employeeIndex, name)

// The sub-line under a name says when the application arrived, which is what
// tells an approver how long a row has been waiting. Rows the backend never
// stamped get no sub-line at all.
const filedLabel = (row) => {
  if (!row?.submittedDate) return ''
  const date = new Date(row.submittedDate)
  if (isNaN(date)) return ''
  return `Filed ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

const statusPillClass = compensableStatusPillClass

/** `1 half day` / `3 half days`. Said only when there is one, from the table. */
const halfDayLabel = (count) => `${count} half day${count === 1 ? '' : 's'}`
</script>

<style scoped src="./requestGrid.css"></style>

<style scoped>
.table-section {
  background: #ffffff;
}
.compensable-grid {
  min-width: 1060px;
}
/* Selection is a state, not an outcome — an informational band, rather than
   the green "everything succeeded" bar a finished action would earn. */
.bulk-actions-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  /* Sits between the toolbar and the header row, so it keeps the toolbar's own
     14px gutter rather than the wider page one. */
  margin: 10px 14px;
  background: var(--dash-info-bg);
  border: 1px solid var(--dash-info-line);
  border-radius: var(--dash-r-md);
  flex-wrap: wrap;
}
.bulk-count {
  margin-right: 2px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-info);
  font-variant-numeric: tabular-nums;
}
.bulk-actions-bar :deep(.q-btn) {
  height: 28px;
  min-height: 28px;
  padding: 0 10px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: var(--dash-r-sm);
}
.ct-cell-select {
  width: 44px;
}
.ct-cell-employee {
  width: 210px;
}
.ct-cell-category {
  width: 165px;
}
/* Two lines now — the span and, when it applies, the half-day count — so the
   column buys the height rather than truncating both. */
.ct-cell-dates {
  width: 175px;
}
.ct-cell-duration {
  width: 110px;
}
.ct-cell-notes {
  width: 130px;
}
.ct-cell-status {
  width: 228px;
}
/* One 30px menu trigger, so the column only has to clear its own header
   label. */
.ct-cell-actions {
  width: 76px;
}
/* `dates` is a span rather than a one-line note, so it needs more room than the
   shared `.note` allows and its own cap instead of inheriting the 260px that
   would let a long span push every later column off screen. */
.note--dates {
  max-width: 100%;
}
/* One line, pill left then flag right, both centred on the row's middle so
   neither badge claims to be the other. Both stay at natural width — a chip
   that shrank would clip its label, so the column (not the row) absorbs any
   overflow. */
.status-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* A recommendation is an annotation on the application, not a second status —
   its own `dash-chip--warn` supplies the colour, and it keeps its base nowrap so
   the pair stays on one line. */
.reject-flag {
  font-size: 11px;
  flex-shrink: 0;
}
/* Material outlined glyphs carry internal whitespace below the painted shape,
   so the flag sits high inside its own box and `align-items` on the chip cannot
   centre the drawn icon against the label. `line-height: 1` kills the icon
   font's own line box and `translateY` lifts the glyph onto the text line. */
.reject-flag .q-icon {
  flex: none;
  align-self: center;
  line-height: 1;
  transform: translateY(-1px);
}

@media (max-width: 1024px) {
  .ct-cell-category {
    width: 145px;
  }
  .ct-cell-employee {
    width: 190px;
  }
}
</style>
