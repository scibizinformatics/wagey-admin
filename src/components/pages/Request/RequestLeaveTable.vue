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
      <div class="grid-footer-info">
        <strong>{{ rows.length }}</strong> {{ rows.length === 1 ? 'request' : 'requests' }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid-scroll">
      <div class="skel-head">
        <div class="skel-head-cell" style="flex: 2.2">Employee</div>
        <div class="skel-head-cell" style="flex: 1.4">Type</div>
        <div class="skel-head-cell" style="flex: 1.9">Period</div>
        <div class="skel-head-cell" style="flex: 2">Reason</div>
        <div class="skel-head-cell" style="flex: 1.2">Status</div>
        <div class="skel-head-cell" style="flex: 0 0 110px">Actions</div>
      </div>
      <div class="skel-row" v-for="n in 5" :key="n">
        <div class="skel-cell" style="flex: 2.2"><q-skeleton type="text" width="160px" /></div>
        <div class="skel-cell" style="flex: 1.4"><q-skeleton type="text" width="90px" /></div>
        <div class="skel-cell" style="flex: 1.9"><q-skeleton type="text" width="140px" /></div>
        <div class="skel-cell" style="flex: 2"><q-skeleton type="text" width="180px" /></div>
        <div class="skel-cell" style="flex: 1.2"><q-skeleton type="text" width="80px" /></div>
        <div class="skel-cell" style="flex: 0 0 110px"><q-skeleton type="text" width="70px" /></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="rows.length === 0" class="grid-empty">
      <div class="grid-empty-icon"><q-icon name="event_available" size="26px" /></div>
      <div class="grid-empty-title">{{ emptyTitle }}</div>
      <div class="grid-empty-text">{{ emptyText }}</div>
    </div>

    <!-- Grid -->
    <div v-else class="grid-scroll">
      <q-table
        :rows="rows"
        :columns="leaveColumns"
        row-key="id"
        flat
        class="request-grid leave-grid"
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
            class="grid-row"
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
                  flat dense round
                  icon="visibility"
                  size="sm"
                  class="grid-action"
                  @click.stop="$emit('view-details', props.row)"
                >
                  <q-tooltip>View details</q-tooltip>
                </q-btn>
                <template v-if="props.row.status === 'pending'">
                  <q-btn
                    flat dense round
                    icon="check"
                    size="sm"
                    class="grid-action grid-action--approve"
                    :loading="actionLoading === `approve-${props.row.id}`"
                    @click.stop="$emit('approve', props.row)"
                  >
                    <q-tooltip>Approve</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat dense round
                    icon="close"
                    size="sm"
                    class="grid-action grid-action--reject"
                    :loading="actionLoading === `reject-${props.row.id}`"
                    @click.stop="$emit('reject', props.row)"
                  >
                    <q-tooltip>Reject</q-tooltip>
                  </q-btn>
                </template>
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

const props = defineProps({
  rows: Array,
  loading: Boolean,
  actionLoading: String,
  statusFilter: String,
  search: String,
})
defineEmits(['update:statusFilter', 'update:search', 'view-details', 'approve', 'reject'])

// Self-describing labels: the field is 34px tall, too short for a Quasar
// stacked label, so the option text has to say which dimension it controls.
const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const leaveColumns = [
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'dates', label: 'Period', field: 'startDate', align: 'left' },
  { name: 'reason', label: 'Reason', field: 'reason', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
]

const isNarrowed = computed(
  () =>
    (!!props.statusFilter && props.statusFilter !== 'all') || !!(props.search || '').trim(),
)

const emptyTitle = computed(() =>
  isNarrowed.value ? 'No requests match your search' : 'No leave requests',
)
const emptyText = computed(() =>
  isNarrowed.value
    ? 'Clear the search or switch back to All to see every request in this queue.'
    : 'Leave requests submitted by employees land here for review.',
)

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
.cell-actions {
  width: 110px;
}
</style>
