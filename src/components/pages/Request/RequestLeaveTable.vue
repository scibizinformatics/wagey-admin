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
    <!-- Loading. Built from the live `leaveColumns`, so the placeholder shares
         the real table's columns, labels and alignment. -->
    <TableSkeleton v-if="loading" :columns="leaveColumns" :rows="5" flush />

    <!-- Empty -->
    <div v-else-if="rows.length === 0" class="grid-empty">
      <div class="grid-empty-icon"><q-icon name="event_available" size="26px" /></div>
      <div class="grid-empty-title">{{ emptyTitle }}</div>
      <div class="grid-empty-text">{{ emptyText }}</div>
    </div>

    <!-- Grid -->
    <div v-else class="grid-scroll dash-scroll-x">
      <q-table
        :rows="rows"
        :columns="leaveColumns"
        row-key="id"
        flat
        class="dash-qtable dash-qtable--flush request-grid leave-grid"
        hide-pagination
        :rows-per-page-options="[0]"
      >
        <template v-slot:header="props">
          <q-tr class="grid-head-row" :props="props">
            <q-th key="employeeName" :props="props" class="grid-head-cell">Employee</q-th>
            <q-th key="type" :props="props" class="grid-head-cell">Type</q-th>
            <q-th key="dates" :props="props" class="grid-head-cell">Period</q-th>
            <q-th key="reason" :props="props" class="grid-head-cell">Reason</q-th>
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
            <q-td key="employeeName" :props="props" class="grid-cell cell-employee">
              <div class="identity">
                <span class="identity-avatar">{{ getInitials(props.row.employeeName) }}</span>
                <span class="identity-text">
                  <span class="identity-name">{{ props.row.employeeName || 'Unknown' }}</span>
                  <span class="identity-sub">{{ props.row.department || 'General' }}</span>
                </span>
              </div>
            </q-td>

            <q-td key="type" :props="props" class="grid-cell cell-type">
              <span class="type-pill">{{ props.row.type }}</span>
            </q-td>

            <q-td key="dates" :props="props" class="grid-cell cell-period">
              <div class="range">
                <span>{{ formatDate(props.row.startDate) }}</span>
                <span class="range-sep">&rarr;</span>
                <span>{{ formatDate(props.row.endDate) }}</span>
              </div>
              <div class="range-meta">{{ props.row.duration }}</div>
            </q-td>

            <q-td key="reason" :props="props" class="grid-cell cell-reason">
              <span class="note" :title="props.row.reason || ''">
                {{ props.row.reason || '—' }}
              </span>
            </q-td>

            <q-td key="status" :props="props" class="grid-cell cell-status">
              <span :class="['status-pill', statusPillClass(props.row.status)]">
                {{ capitalizeStatus(props.row.status) }}
              </span>
            </q-td>

            <q-td key="actions" :props="props" class="grid-cell cell-actions">
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import RequestRowMenu from './RequestRowMenu.vue'

const props = defineProps({
  rows: Array,
  loading: Boolean,
  actionLoading: String,
  statusFilter: String,
  search: String,
  // Null is "all groups"; ids arrive from the payroll-groups endpoint, which
  // numbers them, but a string id would compare just as well.
  payrollGroupFilter: { type: [Number, String], default: null },
  payrollGroupOptions: { type: Array, default: () => [] },
})
defineEmits([
  'update:statusFilter',
  'update:search',
  'update:payrollGroupFilter',
  'view-details',
  'approve',
  'reject',
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

const leaveColumns = [
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'dates', label: 'Period', field: 'startDate', align: 'left' },
  { name: 'reason', label: 'Reason', field: 'reason', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
]

// The row's own actions, in the order a reviewer works through them. The menu
// emits the event name back, so the keys are the events this table already
// declares and no extra mapping layer sits in between.
const rowActions = (row) => {
  const actions = [{ key: 'view-details', label: 'View details', icon: 'o_visibility' }]
  if (row.status === 'pending') {
    actions.push(
      { key: 'approve', label: 'Approve', icon: 'o_check_circle', tone: 'good' },
      { key: 'reject', label: 'Reject', icon: 'o_cancel', tone: 'danger' },
    )
  }
  return actions
}

// The spinner moved from the individual approve/reject buttons onto the trigger,
// which is the only control still on the row once the menu has closed.
const isBusy = (row) =>
  props.actionLoading === `approve-${row.id}` || props.actionLoading === `reject-${row.id}`

const isNarrowed = computed(
  () =>
    (!!props.statusFilter && props.statusFilter !== 'all') ||
    !!(props.search || '').trim() ||
    props.payrollGroupFilter !== null,
)

const emptyTitle = computed(() =>
  isNarrowed.value ? 'No requests match your filters' : 'No leave requests',
)
// Names only the controls actually in use: the payout-group select is hidden for
// a company with no groups set up, so a fixed sentence listing all three would
// point at a field that isn't on screen.
const emptyText = computed(() => {
  if (!isNarrowed.value) return 'Leave requests submitted by employees land here for review.'
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
  if (!name || name === 'N/A') return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
const capitalizeStatus = (status) => {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date)) return dateString
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const statusPillClass = (status) => {
  if (status === 'pending') return 'status-pill--pending'
  if (status === 'approved') return 'status-pill--approved'
  if (status === 'rejected') return 'status-pill--rejected'
  return 'status-pill--default'
}
</script>

<style scoped src="./requestGrid.css"></style>

<style scoped>
.table-section {
  background: #ffffff;
}
.leave-grid {
  min-width: 780px;
}
.cell-employee {
  width: 220px;
}
.cell-type {
  width: 130px;
}
.cell-period {
  width: 190px;
}
.cell-status {
  width: 130px;
}
/* One 30px menu trigger, so the column only has to clear its own header
   label. It used to be sized for up to three side-by-side buttons. */
.cell-actions {
  width: 76px;
}
</style>
