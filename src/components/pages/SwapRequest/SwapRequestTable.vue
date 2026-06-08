<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Swap Request Overview</h2>
      </div>
      <div class="table-actions">
        <q-select
          :model-value="sortBy"
          @update:model-value="$emit('update:sortBy', $event)"
          :options="sortOptions"
          label="Sort by"
          class="sort-select"
          dense
          outlined
        >
          <template v-slot:prepend>
            <q-icon name="sort" />
          </template>
        </q-select>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <q-spinner size="48px" color="primary" :thickness="4" />
      <div class="loading-text">Loading swap requests...</div>
    </div>

    <div v-else-if="rows.length > 0" class="modern-table-container">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        no-data-label="No swap requests found"
        class="swap-table"
        hide-pagination
        :rows-per-page-options="[0]"
      >
        <template v-slot:header>
          <q-tr class="table-header-row">
            <q-th class="table-header-cell th-sl-no">SL No</q-th>
            <q-th class="table-header-cell th-requested-by">Requested By</q-th>
            <q-th class="table-header-cell th-employees">Employees</q-th>
            <q-th class="table-header-cell th-date">Original Date</q-th>
            <q-th class="table-header-cell th-date">New Date</q-th>
            <q-th class="table-header-cell th-status">Status</q-th>
            <q-th class="table-header-cell th-requested-date">Requested Date</q-th>
            <q-th class="table-header-cell th-actions">Actions</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr class="table-body-row" :class="{ 'rejected-row': props.row.status === 'rejected' }">
            <q-td class="table-body-cell td-sl-no">
              {{ String((pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1).padStart(2, '0') }}.
            </q-td>

            <q-td class="table-body-cell td-requested-by">
              <div class="employee-info">
                <q-avatar size="28px" color="primary" text-color="white">
                  {{ getInitials(props.row.requested_by_name) }}
                </q-avatar>
                <span class="employee-name">{{ props.row.requested_by_name || 'N/A' }}</span>
              </div>
            </q-td>

            <q-td class="table-body-cell td-employees">
              <div class="swap-employees">
                <div class="employee-from">{{ props.row.from_employee_name }}</div>
                <div class="swap-icon"><q-icon name="swap_vert" size="14px" color="grey-7" /></div>
                <div class="employee-to">{{ props.row.to_employee_name }}</div>
              </div>
            </q-td>

            <q-td class="table-body-cell td-date">
              <div class="date-info">
                <div class="date-main">{{ formatDate(props.row.original_date) }}</div>
                <div class="date-sub">{{ props.row.original_assignment?.shift_type || 'N/A' }}</div>
              </div>
            </q-td>

            <q-td class="table-body-cell td-date">
              <div class="date-info">
                <div class="date-main">{{ formatDate(props.row.new_date) }}</div>
                <div class="date-sub">{{ props.row.new_assignment?.shift_type || 'N/A' }}</div>
              </div>
            </q-td>

            <q-td class="table-body-cell td-status">
              <div :class="['status-badge', getStatusClass(props.row)]">
                {{ getStatusLabel(props.row) }}
              </div>

              <div v-if="isPendingApproval(props.row)" class="approval-progress">
                <q-linear-progress
                  :value="getApprovalProgress(props.row)"
                  :color="canAdminApprove(props.row) ? 'positive' : 'warning'"
                  size="3px"
                  rounded
                />
                <div class="progress-text" :class="canAdminApprove(props.row) ? 'text-positive' : 'text-warning'">
                  {{ getApprovalProgressText(props.row) }}
                </div>
              </div>

              <div v-if="props.row.status === 'approved'" class="status-extra">
                <q-icon name="check_circle" size="12px" color="positive" />
                <span class="status-extra-text">Approved</span>
              </div>
              <div v-if="props.row.status === 'rejected'" class="status-extra">
                <q-icon name="cancel" size="12px" color="negative" />
                <span class="status-extra-text">Rejected</span>
              </div>
            </q-td>

            <q-td class="table-body-cell td-requested-date">
              {{ formatDateTime(props.row.requested_at) }}
            </q-td>

            <q-td class="table-body-cell td-actions">
              <div class="action-buttons-wrapper">
                <q-btn flat round icon="visibility" size="xs" class="action-btn view-btn" @click="$emit('view', props.row)">
                  <q-tooltip>View Details</q-tooltip>
                </q-btn>

                <q-btn
                  v-if="isPendingApproval(props.row)"
                  flat round icon="check" size="xs"
                  class="action-btn approve-btn"
                  :disable="!canAdminApprove(props.row) || processingId === props.row.id"
                  :loading="processingId === props.row.id"
                  @click="$emit('approve', props.row)"
                >
                  <q-tooltip>
                    {{ canAdminApprove(props.row) ? 'Approve Swap Request' : `Waiting for ${props.row.to_employee_name} to approve` }}
                  </q-tooltip>
                </q-btn>

                <q-btn
                  v-if="isPendingApproval(props.row)"
                  flat round icon="close" size="xs"
                  class="action-btn reject-btn"
                  :disable="processingId === props.row.id"
                  :loading="processingId === props.row.id"
                  @click="$emit('reject', props.row)"
                >
                  <q-tooltip>Reject Request</q-tooltip>
                </q-btn>

                <div v-if="!isPendingApproval(props.row)" class="action-placeholder"></div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>

      <div class="table-footer">
        <div class="footer-info">
          Total <span class="footer-count">{{ totalRecords }} Records</span>
        </div>
        <q-pagination
          :model-value="pagination.page"
          @update:model-value="$emit('update:pagination', { ...pagination, page: $event })"
          :max="Math.ceil(totalRecords / pagination.rowsPerPage) || 1"
          :max-pages="6"
          direction-links
          boundary-links
          color="primary"
          active-color="primary"
        />
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon"><q-icon name="search_off" size="64px" color="grey-4" /></div>
      <div class="empty-title">No swap requests found</div>
      <div class="empty-subtitle">Try adjusting your search or filters</div>
    </div>
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
})
defineEmits(['update:sortBy', 'update:pagination', 'view', 'approve', 'reject'])

const sortOptions = ['Newest', 'Oldest', 'Status']

const columns = [
  { name: 'sl_no', label: 'SL No', field: 'id', align: 'left' },
  { name: 'requested_by', label: 'Requested By', field: 'requested_by_name', align: 'left' },
  { name: 'employees', label: 'Employees', field: 'from_employee_name', align: 'left' },
  { name: 'original_date', label: 'Original Date', field: 'original_date', align: 'left' },
  { name: 'new_date', label: 'New Date', field: 'new_date', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'requested_at', label: 'Requested Date', field: 'requested_at', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
  })
}
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A'
  return new Date(dateTimeString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}
const getStatusClass = (request) => {
  if (!request) return 'status-default'
  const status = request.status
  if (status === 'pending') return 'status-pending'
  if (status === 'to_employee_approved') return 'status-employee-approved'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}
const getStatusLabel = (request) => {
  if (!request) return ''
  const labels = {
    pending: 'Pending',
    to_employee_approved: 'Employee Approved',
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
const getApprovalProgress = (request) => {
  return request.to_employee_approved ? 1 : 0
}
const getApprovalProgressText = (request) => {
  if (canAdminApprove(request)) return 'Ready for admin approval'
  return `Waiting for ${request.to_employee_name}`
}
</script>

<style scoped>
.table-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-wrap: wrap;
  gap: 10px;
}
.table-title-section { min-width: 0; }
.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.table-actions { display: flex; gap: 10px; flex-shrink: 0; }
.sort-select { min-width: 160px; }
.sort-select .q-field__control { border-radius: 8px; height: 36px; }
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}
.loading-text { color: #64748b; font-size: 14px; font-weight: 500; }
.modern-table-container { overflow-x: auto; }
.swap-table {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  table-layout: fixed;
  width: 100%;
}
.th-sl-no, .td-sl-no { width: 50px; min-width: 50px; max-width: 50px; }
.th-requested-by, .td-requested-by { width: 140px; min-width: 140px; max-width: 140px; }
.th-employees, .td-employees { width: 150px; min-width: 150px; max-width: 150px; }
.th-date, .td-date { width: 115px; min-width: 115px; max-width: 115px; }
.th-status, .td-status { width: 150px; min-width: 150px; max-width: 150px; }
.th-requested-date, .td-requested-date { width: 130px; min-width: 130px; max-width: 130px; }
.th-actions, .td-actions { width: 130px; min-width: 130px; max-width: 130px; }
.table-header-row { background: #f8fafc; }
.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #6b7280 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 11px 16px !important;
  border-bottom: 1px solid #e8ecf0 !important;
  vertical-align: middle !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.table-body-row { border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease; }
.table-body-row:hover .table-body-cell { background: #f9fafb; }
.rejected-row { opacity: 0.65; }
.rejected-row .table-body-cell { background: #fef2f2; }
.rejected-row:hover .table-body-cell { background: #fee2e2; }
.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-body-row:last-child .table-body-cell {
  border-bottom: none !important;
}
.employee-info { display: flex; align-items: center; gap: 6px; overflow: hidden; }
.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.swap-employees {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.employee-from {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.swap-icon { display: flex; align-items: center; justify-content: center; margin: 1px 0; }
.employee-to {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.date-info { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.date-main { font-weight: 500; color: #374151; font-size: 12px; white-space: nowrap; }
.date-sub { font-size: 11px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  margin-bottom: 4px;
  width: fit-content;
}
.status-pending { background: #fef3c7; color: #d97706; }
.status-employee-approved { background: #dbeafe; color: #2563eb; }
.status-approved { background: #dcfce7; color: #16a34a; }
.status-rejected { background: #fee2e2; color: #dc2626; }
.status-default { background: #f3f4f6; color: #374151; }
.approval-progress { margin-top: 4px; }
.progress-text { font-size: 11px; margin-top: 2px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-extra { display: flex; align-items: center; gap: 3px; margin-top: 4px; }
.status-extra-text { font-size: 11px; font-weight: 500; }
.action-buttons-wrapper {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
  min-height: 32px;
  padding: 2px 0;
}
.action-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  max-width: 32px;
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.action-placeholder { width: 68px; height: 32px; }
.view-btn { color: #6b7280; }
.view-btn:hover { background: #eff6ff !important; color: #3b82f6 !important; }
.approve-btn { color: #6b7280; }
.approve-btn:hover:not(:disabled) { background: #f0fdf4 !important; color: #16a34a !important; }
.approve-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.reject-btn { color: #6b7280; }
.reject-btn:hover { background: #fef2f2 !important; color: #ef4444 !important; }
.action-btn :deep(.q-icon) { font-size: 16px; }
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-top: 1px solid #f1f5f9;
  margin-top: 16px;
}
.footer-info { font-size: 13px; color: #6b7280; font-weight: 500; }
.footer-count { font-weight: 700; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { margin-bottom: 16px; }
.empty-title { font-size: 16px; font-weight: 600; color: #475569; margin-bottom: 8px; }
.empty-subtitle { color: #64748b; font-size: 13px; }
@media (max-width: 1024px) {
  .table-header { padding: 14px; }
  .modern-table-container { margin: 0 14px 0 14px; }
}
@media (max-width: 768px) {
  .table-header { flex-direction: column; align-items: stretch; padding: 16px; gap: 12px; }
  .table-actions { width: 100%; }
  .sort-select { width: 100%; }
  .modern-table-container { margin: 0 12px 0 12px; overflow-x: auto; border-radius: 8px; }
  .swap-table { min-width: 1000px; }
  .table-footer { flex-direction: column; gap: 12px; align-items: center; }
}
</style>
