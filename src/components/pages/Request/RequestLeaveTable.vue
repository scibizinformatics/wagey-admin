<template>
  <div class="table-section">
      <div class="table-header">
        <div class="table-title-section">
          <h2 class="table-title">Leave Requests</h2>
        </div>
        <div class="table-actions">
          <q-select
            :model-value="statusFilter"
            @update:model-value="$emit('update:statusFilter', $event)"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            label="Filter by Status"
            class="filter-select"
            dense
            outlined
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="check_circle" />
            </template>
          </q-select>
        </div>
      </div>
      <!-- Skeleton: visible when loading OR no data (persists on 404) -->
      <div v-if="loading || rows.length === 0" class="modern-table-container">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell" style="flex: 2.2">Employee</div>
            <div class="skeleton-header-cell" style="flex: 1.6">Type</div>
            <div class="skeleton-header-cell" style="flex: 1.9">Period</div>
            <div class="skeleton-header-cell" style="flex: 2">Reason</div>
            <div class="skeleton-header-cell" style="flex: 1.2; text-align: center">Status</div>
            <div class="skeleton-header-cell" style="flex: 0 0 72px">Actions</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell" style="flex: 2.2"><q-skeleton type="text" width="160px" /></div>
            <div class="skeleton-cell" style="flex: 1.6"><q-skeleton type="text" width="100px" /></div>
            <div class="skeleton-cell" style="flex: 1.9"><q-skeleton type="text" width="140px" /></div>
            <div class="skeleton-cell" style="flex: 2"><q-skeleton type="text" width="180px" /></div>
            <div class="skeleton-cell" style="flex: 1.2"><q-skeleton type="text" width="80px" /></div>
            <div class="skeleton-cell" style="flex: 0 0 72px"><q-skeleton type="text" width="40px" /></div>
          </div>
        </div>
      </div>

      <div v-else class="modern-table-container">
        <q-table
          :rows="rows"
          :columns="leaveColumns"
          row-key="id"
          flat
          :loading="loading"
          no-data-label="No leave requests found"
          class="request-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header="props">
            <q-tr class="table-header-row" :props="props">
              <q-th key="employeeName" :props="props" class="table-header-cell" style="width: 220px">Employee</q-th>
              <q-th key="type" :props="props" class="table-header-cell" style="width: 160px">Type</q-th>
              <q-th key="dates" :props="props" class="table-header-cell" style="width: 190px">Period</q-th>
              <q-th key="reason" :props="props" class="table-header-cell">Reason</q-th>
              <q-th key="status" :props="props" class="table-header-cell" style="width: 120px; text-align: center">Status</q-th>
              <q-th key="actions" :props="props" class="table-header-cell table-header-actions" style="width: 72px">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row" :class="{ 'rejected-row': props.row.status === 'rejected' }" :props="props">
              <q-td key="employeeName" :props="props" class="table-body-cell employee-name-cell" style="width: 220px">
                <div class="employee-info">
                  <q-avatar size="34px" class="avatar-fallback">
                    {{ getInitials(props.row.employeeName) }}
                  </q-avatar>
                  <div class="employee-name-block">
                    <span class="employee-name">{{ props.row.employeeName }}</span>
                    <span class="employee-dept">{{ props.row.department || 'General' }}</span>
                  </div>
                </div>
              </q-td>
              <q-td key="type" :props="props" class="table-body-cell" style="width: 160px">
                <div class="type-badge">{{ props.row.type }}</div>
              </q-td>
              <q-td key="dates" :props="props" class="table-body-cell dates-cell" style="width: 190px">
                <div class="date-range">
                  <div class="start-date">{{ formatDate(props.row.startDate) }}</div>
                  <div class="date-separator">&rarr;</div>
                  <div class="end-date">{{ formatDate(props.row.endDate) }}</div>
                </div>
                <div class="duration">{{ props.row.duration }}</div>
              </q-td>
              <q-td key="reason" :props="props" class="table-body-cell reason-cell">
                <div class="reason-text">{{ props.row.reason || 'No reason provided' }}</div>
              </q-td>
              <q-td key="status" :props="props" class="table-body-cell" style="width: 120px; text-align: center">
                <div :class="['status-badge', getLeaveStatusClass(props.row)]">
                  <span class="status-dot"></span>
                  {{ capitalizeStatus(props.row.status) }}
                </div>
              </q-td>
              <q-td key="actions" :props="props" class="table-body-cell actions-cell" style="width: 72px">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn" @click.stop>
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 160px">
                      <q-item clickable v-close-popup @click="$emit('view-details', props.row)" class="dropdown-item">
                        <q-item-section avatar><q-icon name="visibility" size="16px" /></q-item-section>
                        <q-item-section>View Details</q-item-section>
                      </q-item>
                      <q-item v-if="props.row.status === 'pending'" clickable v-close-popup @click="$emit('approve', props.row)" class="dropdown-item">
                        <q-item-section avatar><q-icon name="check" size="16px" color="positive" /></q-item-section>
                        <q-item-section>Approve</q-item-section>
                      </q-item>
                      <q-item v-if="props.row.status === 'pending'" clickable v-close-popup @click="$emit('reject', props.row)" class="dropdown-item">
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
      </div>
    </div>
</template>

<script setup>
defineProps({
  rows: Array,
  loading: Boolean,
  actionLoading: String,
  statusFilter: String,
})
defineEmits(['update:statusFilter', 'view-details', 'approve', 'reject'])

const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const leaveColumns = [
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left', style: 'width: 220px' },
  { name: 'type', label: 'Type', field: 'type', align: 'left', style: 'width: 160px' },
  { name: 'dates', label: 'Period', field: 'startDate', align: 'left', style: 'width: 190px' },
  { name: 'reason', label: 'Reason', field: 'reason', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', style: 'width: 120px' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center', style: 'width: 120px' },
]

const getInitials = (name) => {
  if (!name || name === 'N/A') return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}
const capitalizeStatus = (status) => {
  if (!status) return 'N/A'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const getLeaveStatusClass = (request) => {
  const status = request.status
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
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

.filter-select { min-width: 160px; }

.modern-table-container {
  overflow-x: auto;
  position: relative;
}

.request-table {
  width: 100%;
  min-width: 700px;
}

.request-table,
.request-table :deep(.q-table__container),
.request-table :deep(.q-table__card),
.request-table.q-table__container,
.request-table :deep(.q-table__bottom-border),
.request-table :deep(.q-table__top),
.request-table :deep(.q-table__bottom),
.request-table :deep(.q-table) {
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
}

.table-header-actions { text-align: center !important; }

.table-body-row { transition: background 0.12s ease; }

.table-body-row:hover .table-body-cell { background: #f8fafc; }

.rejected-row { opacity: 0.65; }
.rejected-row .table-body-cell { background: #fef2f2; }
.rejected-row:hover .table-body-cell { background: #fee2e2; }

.table-body-cell {
  font-size: 13px;
  color: #334155;
  padding: 9px 14px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle !important;
}

.table-body-row:last-child .table-body-cell {
  border-bottom: none !important;
}

.employee-info { display: flex; align-items: center; gap: 10px; }
.employee-name-cell { min-width: 200px; }
.employee-name-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.employee-name {
  font-weight: 500;
  color: #0f172a;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.employee-dept { font-size: 11px; color: #94a3b8; }

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

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-pending { background: #fffbeb; color: #92400e; }
.status-pending .status-dot { background: #f59e0b; }
.status-approved { background: #d1fae5; color: #065f46; }
.status-approved .status-dot { background: #10b981; }
.status-rejected { background: #fee2e2; color: #991b1b; }
.status-rejected .status-dot { background: #f87171; }
.status-default { background: #f1f5f9; color: #64748b; }
.status-default .status-dot { background: #94a3b8; }

.type-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
}

.date-range { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.start-date, .end-date { color: #334155; font-weight: 500; }
.date-separator { color: #94a3b8; font-size: 10px; }
.duration { font-size: 11px; color: #94a3b8; margin-top: 2px; }

.reason-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #64748b;
}

.reason-cell { max-width: 220px; }
.dates-cell { font-size: 13px; }

.actions-cell {
  text-align: center !important;
  width: 72px;
  min-width: 72px;
}
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

.table-skeleton {
  min-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 14px 14px;
}
.skeleton-header {
  display: flex;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 14px;
  gap: 8px;
}
.skeleton-header-cell {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.skeleton-row {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f3f5;
  gap: 8px;
}
.skeleton-row:last-child {
  border-bottom: none;
}
.skeleton-cell {
  flex: 1;
}

@media (max-width: 1440px) {
  .request-table { min-width: 680px; }
}
@media (max-width: 1024px) {
  .modern-table-container { overflow-x: auto; }
  .table-header-cell, .table-body-cell { padding: 8px 12px !important; font-size: 12px; }
  .employee-name-cell { min-width: 170px; }
  .filter-select { min-width: 140px; }
}
@media (max-width: 768px) {
  .table-header { flex-direction: column; align-items: stretch; gap: 10px; }
  .table-actions { width: 100%; }
  .filter-select { width: 100%; min-width: unset; }
  .modern-table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .request-table { min-width: 700px; }
  .employee-dept { display: none; }
}
@media (max-width: 480px) {
  .table-header-cell, .table-body-cell { padding: 10px 12px !important; font-size: 12px; }
}
</style>
