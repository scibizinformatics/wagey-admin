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
                  icon="visibility"
                  size="sm"
                  class="grid-action"
                  @click.stop="$emit('view', props.row)"
                >
                  <q-tooltip>View details</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="props.row.status === 'pending'"
                  flat
                  dense
                  round
                  icon="rule"
                  size="sm"
                  class="grid-action grid-action--approve"
                  @click.stop="$emit('approve', props.row)"
                >
                  <q-tooltip>Approve or reject</q-tooltip>
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
import { getApproverName as approverName } from 'src/composables/utils/employee'

const props = defineProps({
  rows: Array,
  loading: Boolean,
  caFilterStatus: String,
  caStatusOptions: Array,
  caPagination: Object,
  search: String,
})
defineEmits(['update:caFilterStatus', 'update:search', 'view', 'approve'])

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

const isNarrowed = computed(() => !!props.caFilterStatus || !!(props.search || '').trim())

const emptyTitle = computed(() =>
  isNarrowed.value ? 'No requests match your search' : 'No cash advance requests',
)
const emptyText = computed(() =>
  isNarrowed.value
    ? 'Clear the search or switch back to All to see every request in this queue.'
    : 'Cash advance requests from employees appear here for review.',
)

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
.cell-actions {
  width: 100px;
}

.ca-grid :deep(.q-table__bottom) {
  padding: 10px 20px;
  border-top: 1px solid var(--dash-line) !important;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  min-height: unset;
}
</style>
