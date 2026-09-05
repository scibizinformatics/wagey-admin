<template>
  <div class="table-section">
    <div class="grid-toolbar grid-toolbar--sub">
      <q-input
        :model-value="search"
        @update:model-value="$emit('update:search', $event)"
        placeholder="Search employee or ID"
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
        :model-value="caFilterStatus || ''"
        @update:model-value="$emit('update:caFilterStatus', $event)"
        :options="statusChips"
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
    <!-- Loading. Built from the live `caColumns`, so the placeholder shares
         the real table's columns, labels and alignment. -->
    <TableSkeleton v-if="loading" :columns="caColumns" :rows="5" flush />

    <!-- Empty -->
    <div v-else-if="rows.length === 0" class="grid-empty">
      <div class="grid-empty-icon"><q-icon name="account_balance_wallet" size="26px" /></div>
      <div class="grid-empty-title">{{ emptyTitle }}</div>
      <div class="grid-empty-text">{{ emptyText }}</div>
    </div>

    <!-- Grid -->
    <div v-else class="grid-scroll dash-scroll-x">
      <q-table
        :rows="rows"
        :columns="caColumns"
        row-key="id"
        flat
        class="dash-qtable dash-qtable--flush request-grid ca-grid"
        :pagination="caPagination"
      >
        <template v-slot:header>
          <q-tr class="grid-head-row">
            <q-th class="grid-head-cell cell-employee">Employee</q-th>
            <q-th class="grid-head-cell grid-head-cell--right cell-amount">Amount</q-th>
            <q-th class="grid-head-cell cell-date">Requested</q-th>
            <q-th class="grid-head-cell cell-date">Payout</q-th>
            <q-th class="grid-head-cell cell-status">Status</q-th>
            <q-th class="grid-head-cell grid-head-cell--right cell-actions">Actions</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr
            class="dash-qtable__row grid-row"
            :class="{ 'grid-row--waiting': props.row.status === 'pending' }"
          >
            <q-td class="grid-cell cell-employee">
              <div class="identity">
                <span class="identity-avatar">{{ getInitials(props.row.employee_name) }}</span>
                <span class="identity-text">
                  <span class="identity-name">{{ props.row.employee_name }}</span>
                </span>
              </div>
            </q-td>

            <q-td class="grid-cell grid-cell--right cell-amount">
              <span class="amount">&#8369;{{ formatAmount(props.row.requested_amount) }}</span>
            </q-td>

            <q-td class="grid-cell cell-date">
              <span class="stat-num">{{ formatDate(props.row.request_date) }}</span>
            </q-td>

            <q-td class="grid-cell cell-date">
              <span :class="['stat-num', { muted: !props.row.payout_date }]">
                {{ props.row.payout_date ? formatDate(props.row.payout_date) : '—' }}
              </span>
              <div v-if="props.row.approval_date" class="range-meta">
                approved {{ formatDate(props.row.approval_date) }}
              </div>
            </q-td>

            <q-td class="grid-cell cell-status">
              <span :class="['status-pill', statusPillClass(props.row.status)]">
                {{ props.row.status_display || capitalizeStatus(props.row.status) }}
              </span>
              <div v-if="approverName(props.row)" class="status-note">
                by {{ approverName(props.row) }}
              </div>
            </q-td>

            <q-td class="grid-cell cell-actions">
              <div class="grid-actions">
                <q-btn
                  flat
                  dense
                  round
                  icon="more_horiz"
                  size="sm"
                  class="grid-action"
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
import { getApproverName as approverName } from 'src/composables/utils/employee'

const props = defineProps({
  rows: Array,
  loading: Boolean,
  caFilterStatus: String,
  caStatusOptions: Array,
  caPagination: Object,
  search: String,
  // Null is "all groups"; ids arrive from the payroll-groups endpoint, which
  // numbers them, but a string id would compare just as well.
  payrollGroupFilter: { type: [Number, String], default: null },
  payrollGroupOptions: { type: Array, default: () => [] },
})
defineEmits([
  'update:caFilterStatus',
  'update:search',
  'update:payrollGroupFilter',
  'view',
  'approve',
])

// The row's own actions. A cash advance is not decided in place — both outcomes
// happen in the review modal — so the single decision item opens it rather than
// offering an Approve and a Reject that would both lead to the same dialog.
const rowActions = (row) => {
  const actions = [{ key: 'view', label: 'View details', icon: 'o_visibility' }]
  if (row.status === 'pending') {
    actions.push({ key: 'approve', label: 'Approve or reject', icon: 'o_rule', tone: 'good' })
  }
  return actions
}

// Self-describing labels: the field is 34px tall, too short for a Quasar
// stacked label, so the option text has to say which dimension it controls.
const STATUS_LABELS = {
  '': 'All statuses',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

const statusChips = computed(() =>
  (props.caStatusOptions || []).map((value) => ({
    value,
    label: STATUS_LABELS[value] || capitalizeStatus(value),
  })),
)

const payrollGroupSelectOptions = computed(() => [
  { label: 'All payout groups', value: null },
  ...props.payrollGroupOptions,
])

const isNarrowed = computed(
  () =>
    !!props.caFilterStatus || !!(props.search || '').trim() || props.payrollGroupFilter !== null,
)

const emptyTitle = computed(() =>
  isNarrowed.value ? 'No requests match your filters' : 'No cash advance requests',
)
// Names only the controls actually in use: the payout-group select is hidden for
// a company with no groups set up, so a fixed sentence listing all three would
// point at a field that isn't on screen.
const emptyText = computed(() => {
  if (!isNarrowed.value) return 'Cash advance requests from employees appear here for review.'
  const parts = []
  if ((props.search || '').trim()) parts.push('clearing the search')
  if (props.caFilterStatus) parts.push('switching back to All statuses')
  if (props.payrollGroupFilter !== null) parts.push('switching back to All payout groups')
  const list =
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}` : parts[0]
  return `Try ${list} to see every request in this queue.`
})

// The approval date rides under Payout and the approver under Status, so six
// columns cover what eight did. RequestCaViewModal still lists every field.
const caColumns = [
  { name: 'employee_name', label: 'Employee', field: 'employee_name', align: 'left' },
  { name: 'requested_amount', label: 'Amount', field: 'requested_amount', align: 'right' },
  { name: 'request_date', label: 'Requested', field: 'request_date', align: 'left' },
  { name: 'payout_date', label: 'Payout', field: 'payout_date', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'right' },
]

const getInitials = (name) => {
  if (!name || name === 'N/A') return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
function capitalizeStatus(status) {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
const formatAmount = (num) => {
  const value = Number(num || 0)
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date)) return dateStr
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
.ca-grid {
  min-width: 800px;
}

.cell-employee {
  width: 230px;
}
.cell-amount {
  width: 130px;
}
.cell-date {
  width: 140px;
  white-space: nowrap;
}
.cell-status {
  width: 160px;
}
/* One 30px menu trigger, so the column only has to clear its own header
   label. It used to be sized for up to three side-by-side buttons. */
.cell-actions {
  width: 76px;
}

.ca-grid :deep(.q-table__bottom) {
  padding: 10px 20px;
  border-top: 1px solid var(--dash-line) !important;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  min-height: unset;
}
</style>
