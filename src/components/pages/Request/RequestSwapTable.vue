<template>
  <div class="table-section">
    <div class="grid-toolbar grid-toolbar--sub">
      <q-input
        :model-value="search"
        @update:model-value="$emit('update:search', $event)"
        placeholder="Search employee"
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
        :model-value="sortBy"
        @update:model-value="$emit('update:sortBy', $event)"
        :options="sortOptions"
        emit-value
        map-options
        dense
        outlined
        hide-bottom-space
        popup-content-class="dash-popup"
        class="grid-filter dash-field"
        aria-label="Sort swap requests"
      >
        <template v-slot:prepend>
          <q-icon name="o_swap_vert" size="16px" />
        </template>
      </q-select>
      <div class="grid-footer-info">
        <strong>{{ totalRecords }}</strong> {{ totalRecords === 1 ? 'request' : 'requests' }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid-loading">
      <q-spinner size="32px" color="primary" :thickness="4" />
      <div class="grid-loading-text">Loading swap requests</div>
    </div>

    <!-- Empty -->
    <div v-else-if="rows.length === 0" class="grid-empty">
      <div class="grid-empty-icon"><q-icon name="swap_horiz" size="26px" /></div>
      <div class="grid-empty-title">No swap requests</div>
      <div class="grid-empty-text">
        When employees ask to trade shifts, their requests appear here for approval.
      </div>
    </div>

    <!-- Grid -->
    <template v-else>
      <div class="grid-scroll">
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="id"
          flat
          class="request-grid swap-grid"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="grid-head-row">
              <q-th class="grid-head-cell cell-requester">Requested by</q-th>
              <q-th class="grid-head-cell cell-employees">Employees</q-th>
              <q-th class="grid-head-cell cell-move">Shift moved</q-th>
              <q-th class="grid-head-cell cell-status">Status</q-th>
              <q-th class="grid-head-cell grid-head-cell--right cell-actions">Actions</q-th>
            </q-tr>
          </template>

          <template v-slot:body="props">
            <q-tr class="grid-row" :class="{ 'grid-row--waiting': isPendingApproval(props.row) }">
              <q-td class="grid-cell cell-requester">
                <div class="identity">
                  <span class="identity-avatar">{{ getInitials(props.row.requested_by_name) }}</span>
                  <span class="identity-text">
                    <span class="identity-name">{{ props.row.requested_by_name || 'N/A' }}</span>
                    <span class="identity-sub">{{ formatDateTime(props.row.requested_at) }}</span>
                  </span>
                </div>
              </q-td>

              <q-td class="grid-cell cell-employees">
                <div class="swap-pair">
                  <span class="swap-from">{{ props.row.from_employee_name }}</span>
                  <span class="swap-arrow">
                    <q-icon name="south" size="12px" />
                  </span>
                  <span class="swap-to">{{ props.row.to_employee_name }}</span>
                </div>
              </q-td>

              <q-td class="grid-cell cell-move">
                <div class="range">
                  <span>{{ formatDate(props.row.original_date) }}</span>
                  <span class="range-sep">&rarr;</span>
                  <span>{{ formatDate(props.row.new_date) }}</span>
                </div>
                <div class="range-meta">
                  {{ props.row.original_assignment?.shift_type || '—' }}
                  &rarr;
                  {{ props.row.new_assignment?.shift_type || '—' }}
                </div>
              </q-td>

              <q-td class="grid-cell cell-status">
                <span :class="['status-pill', statusPillClass(props.row)]">
                  {{ getStatusLabel(props.row) }}
                </span>
                <div
                  v-if="isPendingApproval(props.row)"
                  :class="['status-note', { 'status-note--ready': canAdminApprove(props.row) }]"
                >
                  {{ getApprovalProgressText(props.row) }}
                </div>
              </q-td>

              <q-td class="grid-cell cell-actions">
                <div class="grid-actions">
                  <q-btn
                    flat dense round
                    icon="visibility"
                    size="sm"
                    class="grid-action"
                    @click.stop="$emit('view', props.row)"
                  >
                    <q-tooltip>View details</q-tooltip>
                  </q-btn>
                  <template v-if="isPendingApproval(props.row)">
                    <q-btn
                      flat dense round
                      icon="check"
                      size="sm"
                      class="grid-action grid-action--approve"
                      :disable="!canAdminApprove(props.row)"
                      :loading="processingId === `approve-${props.row.id}`"
                      @click.stop="$emit('approve', props.row)"
                    >
                      <q-tooltip>
                        {{
                          canAdminApprove(props.row)
                            ? 'Approve'
                            : `Waiting for ${props.row.to_employee_name}`
                        }}
                      </q-tooltip>
                    </q-btn>
                    <q-btn
                      flat dense round
                      icon="close"
                      size="sm"
                      class="grid-action grid-action--reject"
                      :loading="processingId === `reject-${props.row.id}`"
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

      <div class="grid-footer">
        <div class="grid-footer-info">
          Showing <strong>{{ rows.length }}</strong> of <strong>{{ totalRecords }}</strong> requests
        </div>
        <q-pagination
          :model-value="pagination.page"
          @update:model-value="$emit('update:pagination', { ...pagination, page: $event })"
          :max="Math.ceil(totalRecords / pagination.rowsPerPage) || 1"
          :max-pages="6"
          direction-links
          boundary-links
          flat
          color="grey-7"
          active-color="primary"
          class="grid-pagination"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  rows: Array,
  loading: Boolean,
  sortBy: String,
  processingId: [String, Number],
  pagination: Object,
  totalRecords: Number,
  search: String,
})
defineEmits(['update:sortBy', 'update:pagination', 'update:search', 'view', 'approve', 'reject'])

// Values stay 'Newest' | 'Oldest' | 'Status' — RequestPage's sort compares
// against those exact strings. Only the visible labels are spelled out, since
// the 34px field has no room for a stacked label.
const sortOptions = [
  { label: 'Newest first', value: 'Newest' },
  { label: 'Oldest first', value: 'Oldest' },
  { label: 'By status', value: 'Status' },
]

// Original/new date are merged into one "Shift moved" column and the submitted
// timestamp rides under the requester name, so the grid fits the content column
// without horizontal cut-off. Full per-field detail is in RequestSwapViewModal.
const columns = [
  { name: 'requested_by', label: 'Requested by', field: 'requested_by_name', align: 'left' },
  { name: 'employees', label: 'Employees', field: 'from_employee_name', align: 'left' },
  { name: 'move', label: 'Shift moved', field: 'original_date', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
]

const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date)) return dateString
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A'
  const date = new Date(dateTimeString)
  if (isNaN(date)) return dateTimeString
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
const statusPillClass = (request) => {
  if (!request) return 'status-pill--default'
  const status = request.status
  if (status === 'pending') return 'status-pill--pending'
  if (status === 'to_employee_approved') return 'status-pill--info'
  if (status === 'approved') return 'status-pill--approved'
  if (status === 'rejected') return 'status-pill--rejected'
  return 'status-pill--default'
}
const getStatusLabel = (request) => {
  if (!request) return ''
  const labels = {
    pending: 'Pending',
    to_employee_approved: 'Employee approved',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return labels[request.status] || request.status
}
const isPendingApproval = (request) => {
  if (!request) return false
  return request.status === 'pending' || request.status === 'to_employee_approved'
}
const canAdminApprove = (request) => {
  if (!request) return false
  return isPendingApproval(request) && request.to_employee_approved === true
}
const getApprovalProgressText = (request) => {
  if (canAdminApprove(request)) return 'Ready for your approval'
  return `Waiting for ${request.to_employee_name}`
}
</script>

<style scoped src="./requestGrid.css"></style>

<style scoped>
.table-section {
  background: #ffffff;
}
.swap-grid {
  min-width: 780px;
}

.cell-requester {
  width: 210px;
}
.cell-employees {
  width: 180px;
}
.cell-move {
  width: 210px;
}
.cell-status {
  width: 180px;
}
.cell-actions {
  width: 110px;
}

.swap-pair {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.swap-from {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.swap-arrow {
  display: flex;
  align-items: center;
  color: #cbd5e1;
  line-height: 1;
}
.swap-to {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grid-pagination :deep(.q-btn) {
  min-width: 30px;
  min-height: 30px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 1023px) {
  .grid-footer {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
}
</style>
