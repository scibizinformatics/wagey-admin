<template>
  <div class="table-section">
    <div class="grid-toolbar grid-toolbar--sub">
      <q-input
        :model-value="search"
        @update:model-value="$emit('update:search', $event)"
        placeholder="Search employee or reason"
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

    <!-- Loading. Built from the live `otColumns`, so the placeholder shares
         the real table's columns, labels and alignment. -->
    <TableSkeleton v-if="loading" :columns="otColumns" :rows="5" flush />

    <!-- Empty -->
    <div v-else-if="rows.length === 0" class="grid-empty">
      <div class="grid-empty-icon"><q-icon name="more_time" size="26px" /></div>
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
          :columns="otColumns"
          row-key="id"
          flat
          class="dash-qtable dash-qtable--flush request-grid overtime-grid"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header="props">
            <q-tr class="grid-head-row" :props="props">
              <q-th key="select" :props="props" class="grid-head-cell ot-cell-select">
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
              <q-th key="employeeName" :props="props" class="grid-head-cell ot-cell-employee">
                Employee
              </q-th>
              <q-th key="category" :props="props" class="grid-head-cell ot-cell-category">
                Category
              </q-th>
              <q-th key="date" :props="props" class="grid-head-cell ot-cell-date">Date</q-th>
              <q-th key="hours" :props="props" class="grid-head-cell ot-cell-hours">Hours</q-th>
              <q-th key="reason" :props="props" class="grid-head-cell ot-cell-reason">Reason</q-th>
              <q-th key="status" :props="props" class="grid-head-cell ot-cell-status">Status</q-th>
              <q-th
                key="actions"
                :props="props"
                class="grid-head-cell grid-head-cell--right ot-cell-actions"
              >
                Actions
              </q-th>
            </q-tr>
          </template>

          <template v-slot:body="props">
            <q-tr
              class="dash-qtable__row grid-row"
              :class="{ 'grid-row--waiting': props.row.actionable }"
              :props="props"
            >
              <q-td key="select" :props="props" class="grid-cell grid-cell--center ot-cell-select">
                <q-checkbox
                  v-if="props.row.actionable"
                  :model-value="selectedIds.has(props.row.id)"
                  @update:model-value="$emit('toggle-selection', props.row.id)"
                  dense
                  size="xs"
                />
              </q-td>

              <q-td key="employeeName" :props="props" class="grid-cell ot-cell-employee">
                <div class="identity">
                  <span class="identity-avatar">{{ getInitials(props.row.employeeName) }}</span>
                  <span class="identity-text">
                    <span class="identity-name">{{ props.row.employeeName }}</span>
                    <!-- Rendered only when the backend stamped the request. An
                         empty sub-line still costs the stack's 1px gap, which
                         pushes the name off the avatar's centre line. -->
                    <span v-if="filedLabel(props.row)" class="identity-sub">
                      {{ filedLabel(props.row) }}
                    </span>
                  </span>
                </div>
              </q-td>

              <q-td key="category" :props="props" class="grid-cell ot-cell-category">
                <span class="type-pill">{{ props.row.categoryName }}</span>
              </q-td>

              <q-td key="date" :props="props" class="grid-cell ot-cell-date">
                <span class="stat-num">{{ formatDate(props.row.date) }}</span>
              </q-td>

              <!-- An open request is still negotiable, so its hours are a field
                   an approver can settle; a decided one is a fact, so it is text. -->
              <q-td key="hours" :props="props" class="grid-cell ot-cell-hours">
                <div class="hours-cell-content">
                  <q-input
                    v-if="props.row.actionable"
                    :model-value="editableHours[props.row.id] ?? props.row.hours"
                    @update:model-value="$emit('update:editable-hours', props.row.id, $event)"
                    @click.stop
                    dense
                    outlined
                    type="number"
                    step="0.01"
                    class="hours-input"
                    :aria-label="'Approved hours for ' + props.row.employeeName"
                  />
                  <span v-else class="amount">{{ formatHours(props.row.hours) }}</span>
                  <span v-if="props.row.convertedToCto" class="cto-badge">
                    CTO
                    <q-tooltip>Converted to compensatory time off</q-tooltip>
                  </span>
                </div>
              </q-td>

              <q-td key="reason" :props="props" class="grid-cell ot-cell-reason">
                <span class="note" :title="props.row.reason || ''">
                  {{ props.row.reason || '—' }}
                </span>
              </q-td>

              <q-td key="status" :props="props" class="grid-cell ot-cell-status">
                <span :class="['status-pill', statusPillClass(props.row.status)]">
                  {{ props.row.statusLabel }}
                </span>
              </q-td>

              <q-td key="actions" :props="props" class="grid-cell ot-cell-actions">
                <div class="grid-actions">
                  <q-btn
                    flat
                    dense
                    round
                    icon="more_horiz"
                    size="sm"
                    class="grid-action"
                    :loading="submitting.has(props.row.id)"
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
import {
  formatOvertimeHours,
  overtimeStatusPillClass,
} from 'src/composables/utils/overtimeRequests'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: Boolean,
  submitting: { type: Set, default: () => new Set() },
  selectedIds: { type: Set, default: () => new Set() },
  editableHours: { type: Object, default: () => ({}) },
  statusFilter: { type: String, default: 'all' },
  search: { type: String, default: '' },
  // Null is "all groups"; ids arrive from the payroll-groups endpoint, which
  // numbers them, but a string id would compare just as well.
  payrollGroupFilter: { type: [Number, String], default: null },
  payrollGroupOptions: { type: Array, default: () => [] },
})

defineEmits([
  'update:statusFilter',
  'update:search',
  'update:payrollGroupFilter',
  'update:editable-hours',
  'toggle-selection',
  'toggle-select-all',
  'clear-selection',
  'view-details',
  'approve',
  'reject',
  'bulk-approve',
  'bulk-reject',
])

// Self-describing labels: the field is 34px tall, too short for a Quasar
// stacked label, so the option text has to say which dimension it controls.
const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Requested', value: 'requested' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const payrollGroupSelectOptions = computed(() => [
  { label: 'All payout groups', value: null },
  ...props.payrollGroupOptions,
])

const otColumns = [
  { name: 'select', label: '', field: '', align: 'center' },
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'category', label: 'Category', field: 'categoryName', align: 'left' },
  { name: 'date', label: 'Date', field: 'date', align: 'left' },
  { name: 'hours', label: 'Hours', field: 'hours', align: 'left' },
  { name: 'reason', label: 'Reason', field: 'reason', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
]

// The row's own actions, in the order a reviewer works through them. The menu
// emits the event name back, so the keys are the events this table already
// declares and no extra mapping layer sits in between.
const rowActions = (row) => {
  const actions = [{ key: 'view-details', label: 'View details', icon: 'o_visibility' }]
  if (row.actionable) {
    actions.push(
      { key: 'approve', label: 'Approve', icon: 'o_check_circle', tone: 'good' },
      { key: 'reject', label: 'Reject', icon: 'o_cancel', tone: 'danger' },
    )
  }
  return actions
}

const actionableCount = computed(() => props.rows.filter((row) => row.actionable).length)

const selectAllHint = computed(() => `Select all ${actionableCount.value} awaiting a decision`)

const allSelected = computed(
  () =>
    actionableCount.value > 0 &&
    props.rows.every((row) => !row.actionable || props.selectedIds.has(row.id)),
)

const isNarrowed = computed(
  () =>
    (!!props.statusFilter && props.statusFilter !== 'all') ||
    !!(props.search || '').trim() ||
    props.payrollGroupFilter !== null,
)

const emptyTitle = computed(() =>
  isNarrowed.value ? 'No requests match your filters' : 'No overtime requests',
)
// Names only the controls actually in use: the payout-group select is hidden for
// a company with no groups set up, so a fixed sentence listing all three would
// point at a field that isn't on screen.
const emptyText = computed(() => {
  if (!isNarrowed.value) return 'Overtime logged by employees lands here for review.'
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

const getInitials = (name) => {
  if (!name || name === 'Unknown') return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date)) return dateString
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
// The sub-line under a name says when the request arrived, which is what tells
// an approver how long a row has been waiting. It is worded "Filed …" so it
// cannot be read as a second copy of the Date column, which is the date the
// overtime was worked. Rows the backend never stamped get no sub-line at all.
const filedLabel = (row) => {
  if (!row?.submittedDate) return ''
  const date = new Date(row.submittedDate)
  if (isNaN(date)) return ''
  return `Filed ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}
const formatHours = formatOvertimeHours
const statusPillClass = overtimeStatusPillClass
</script>

<style scoped src="./requestGrid.css"></style>

<style scoped>
.table-section {
  background: #ffffff;
}
.overtime-grid {
  min-width: 940px;
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
.ot-cell-select {
  width: 44px;
}
.ot-cell-employee {
  width: 210px;
}
.ot-cell-category {
  width: 150px;
}
.ot-cell-date {
  width: 130px;
}
.ot-cell-hours {
  width: 130px;
}
.ot-cell-status {
  width: 120px;
}
/* One 30px menu trigger, so the column only has to clear its own header
   label. It used to be sized for up to three side-by-side buttons. */
.ot-cell-actions {
  width: 76px;
}
/* An acronym, so it keeps its capitals — but not the extra tracking and 700
   weight that turned it into a shout inside a 13px cell. */
.cto-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: var(--dash-r-xs);
  background: var(--dash-info-bg);
  border: 1px solid var(--dash-info-line);
  color: var(--dash-info);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 15px;
}
.hours-input {
  max-width: 84px;
}
.hours-input :deep(.q-field__control) {
  height: 30px;
  min-height: 30px;
  padding: 0 8px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.hours-input :deep(.q-field__native) {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.hours-cell-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 1024px) {
  .ot-cell-category {
    width: 130px;
  }
  .ot-cell-employee {
    width: 190px;
  }
}
</style>
