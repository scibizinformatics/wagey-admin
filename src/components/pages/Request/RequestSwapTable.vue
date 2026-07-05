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
                <q-avatar size="34px" class="avatar-fallback">
                  {{ getInitials(props.row.requested_by_name) }}
                </q-avatar>
                <div class="employee-name-block">
                  <span class="employee-name">{{ props.row.requested_by_name || 'N/A' }}</span>
                </div>
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
                <span class="status-dot"></span>
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
              <q-btn flat round dense icon="more_horiz" class="action-menu-btn" @click.stop>
                <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                  <q-list dense style="min-width: 160px">
                    <q-item clickable v-close-popup @click="$emit('view', props.row)" class="dropdown-item">
                      <q-item-section avatar><q-icon name="visibility" size="16px" /></q-item-section>
                      <q-item-section>View Details</q-item-section>
                    </q-item>
                    <q-item v-if="isPendingApproval(props.row)" clickable v-close-popup @click="canAdminApprove(props.row) && $emit('approve', props.row)" class="dropdown-item" :disable="!canAdminApprove(props.row)">
                      <q-item-section avatar><q-icon name="check" size="16px" :color="canAdminApprove(props.row) ? 'positive' : 'grey'" /></q-item-section>
                      <q-item-section>{{ canAdminApprove(props.row) ? 'Approve' : 'Awaiting Employee' }}</q-item-section>
                    </q-item>
                    <q-item v-if="isPendingApproval(props.row)" clickable v-close-popup @click="$emit('reject', props.row)" class="dropdown-item">
                      <q-item-section avatar><q-icon name="close" size="16px" color="negative" /></q-item-section>
                      <q-item-section>Reject</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
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
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  flex-wrap: wrap;
  gap: 10px;
}
.table-title-section { min-width: 0; }
.table-title {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.table-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sort-select { min-width: 160px; }

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}
.loading-text { font-size: 14px; color: #94a3b8; }

.modern-table-container { overflow-x: auto; position: relative; }
.swap-table { width: 100%; min-width: 700px; }

.swap-table,
.swap-table :deep(.q-table__container),
.swap-table :deep(.q-table__card),
.swap-table.q-table__container,
.swap-table :deep(.q-table__bottom-border),
.swap-table :deep(.q-table__top),
.swap-table :deep(.q-table__bottom),
.swap-table :deep(.q-table) {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.table-header-row { background: #f8fafc; }

.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #94a3b8 !important;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 14px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-body-row { transition: background 0.12s ease; }
.table-body-row:hover .table-body-cell { background: #f8fafc; }
.rejected-row { opacity: 0.65; }
.rejected-row .table-body-cell { background: #fef2f2; }
.rejected-row:hover .table-body-cell { background: #fee2e2; }

.table-body-row:last-child .table-body-cell {
  border-bottom: none !important;
}

.table-body-cell {
  font-size: 13px;
  color: #334155;
  padding: 9px 14px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-info { display: flex; align-items: center; gap: 10px; }
.employee-name-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.employee-name {
  font-weight: 500;
  color: #0f172a;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.avatar-fallback {
  background: #eef2ff !important;
  color: #4338ca !important;
  font-weight: 600 !important;
  min-width: 28px !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  font-size: 11px !important;
}

.swap-employees {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.employee-from {
  font-weight: 500;
  color: #0f172a;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.swap-icon { display: flex; align-items: center; justify-content: center; margin: 1px 0; }
.employee-to {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-info { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.date-main { font-weight: 500; color: #334155; font-size: 12px; white-space: nowrap; }
.date-sub { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  margin-bottom: 4px;
  width: fit-content;
}
.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-pending { background: #fffbeb; color: #92400e; }
.status-pending .status-dot { background: #f59e0b; }
.status-employee-approved { background: #dbeafe; color: #2563eb; }
.status-employee-approved .status-dot { background: #3b82f6; }
.status-approved { background: #d1fae5; color: #065f46; }
.status-approved .status-dot { background: #10b981; }
.status-rejected { background: #fee2e2; color: #991b1b; }
.status-rejected .status-dot { background: #f87171; }
.status-default { background: #f1f5f9; color: #64748b; }
.status-default .status-dot { background: #94a3b8; }

.approval-progress { margin-top: 4px; }
.progress-text { font-size: 11px; margin-top: 2px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-extra { display: flex; align-items: center; gap: 3px; margin-top: 4px; }
.status-extra-text { font-size: 11px; font-weight: 500; }

.td-actions { text-align: center !important; }
.action-menu-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 8px;
  color: #94a3b8;
  transition: all 0.15s ease;
}
.action-menu-btn:hover {
  background: #f1f5f9;
  color: #334155;
}
.action-dropdown {
  border-radius: 10px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 8px 24px rgba(15,23,42,0.08) !important;
}
.dropdown-item {
  font-size: 13px !important;
  color: #334155 !important;
  min-height: 36px !important;
  padding: 0 12px !important;
  border-radius: 6px !important;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-top: 1px solid #f1f5f9;
}
.footer-info { font-size: 13px; color: #6b7280; font-weight: 500; }
.footer-count { font-weight: 700; }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { margin-bottom: 16px; }
.empty-title { font-size: 15px; font-weight: 500; color: #334155; margin-bottom: 8px; }
.empty-subtitle { font-size: 13px; color: #94a3b8; }

@media (max-width: 1440px) {
  .swap-table { min-width: 680px; }
}
@media (max-width: 1024px) {
  .table-header { padding: 14px; }
  .table-header-cell, .table-body-cell { padding: 8px 12px !important; font-size: 12px; }
  .modern-table-container { overflow-x: auto; }
}
@media (max-width: 768px) {
  .table-header { flex-direction: column; align-items: stretch; padding: 16px; gap: 12px; }
  .table-actions { width: 100%; }
  .sort-select { width: 100%; }
  .modern-table-container { overflow-x: auto; }
  .swap-table { min-width: 700px; }
  .table-footer { flex-direction: column; gap: 12px; align-items: center; }
}
@media (max-width: 480px) {
  .table-header-cell, .table-body-cell { padding: 10px 12px !important; font-size: 12px; }
}
</style>
