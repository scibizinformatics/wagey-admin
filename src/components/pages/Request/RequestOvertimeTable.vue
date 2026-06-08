<template>
  <div class="table-section">
      <div class="table-header">
        <div class="table-title-section">
          <h2 class="table-title">Overtime Requests</h2>
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
      <div v-if="loading" class="loading-state">
        <q-spinner size="48px" color="primary" :thickness="4" />
        <div class="loading-text">Loading overtime requests...</div>
      </div>
      <div v-else-if="rows.length > 0" class="modern-table-container">
        <q-table
          :rows="rows"
          :columns="otColumns"
          row-key="id"
          flat
          :loading="loading"
          no-data-label="No overtime requests found"
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
              <q-th key="actions" :props="props" class="table-header-cell table-header-actions" style="width: 120px">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row" :class="{ 'rejected-row': props.row.status === 'rejected' }" :props="props">
              <q-td key="employeeName" :props="props" class="table-body-cell employee-name-cell" style="width: 220px">
                <div class="employee-info">
                  <q-avatar size="32px" color="primary" text-color="white">
                    {{ getInitials(props.row.employeeName) }}
                  </q-avatar>
                  <div class="employee-details">
                    <span class="employee-name">{{ props.row.employeeName }}</span>
                  </div>
                </div>
              </q-td>
              <q-td key="type" :props="props" class="table-body-cell" style="width: 160px">
                <div class="type-badge">{{ props.row.categoryName }}</div>
              </q-td>
              <q-td key="dates" :props="props" class="table-body-cell dates-cell" style="width: 190px">
                <div class="date-range">
                  <div class="start-date">{{ formatDate(props.row.date) }}</div>
                </div>
                <div class="duration">{{ props.row.hours }}h requested</div>
              </q-td>
              <q-td key="reason" :props="props" class="table-body-cell reason-cell">
                <div class="reason-text">{{ props.row.reason || 'No reason provided' }}</div>
              </q-td>
              <q-td key="status" :props="props" class="table-body-cell" style="width: 120px; text-align: center">
                <div :class="['status-badge', getLeaveStatusClass(props.row)]">
                  {{ capitalizeStatus(props.row.status) }}
                </div>
              </q-td>
              <q-td key="actions" :props="props" class="table-body-cell actions-cell" style="width: 120px">
                <div class="action-buttons">
                  <q-btn flat round icon="visibility" size="sm" class="action-btn view-btn" @click="$emit('view-approve', props.row)">
                    <q-tooltip>View / Approve</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="props.row.status === 'pending'"
                    flat round icon="edit" size="sm"
                    class="action-btn approve-btn"
                    @click="$emit('view-approve', props.row)"
                  >
                    <q-tooltip>Approve / Reject</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon"><q-icon name="search_off" size="64px" color="grey-4" /></div>
        <div class="empty-title">No overtime requests found</div>
        <div class="empty-subtitle">Try adjusting your search or filters</div>
      </div>
    </div>
</template>

<script setup>
defineProps({
  rows: Array,
  loading: Boolean,
  statusFilter: String,
})
defineEmits(['update:statusFilter', 'view-approve'])

const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const otColumns = [
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left', style: 'width: 220px' },
  { name: 'type', label: 'Type', field: 'categoryName', align: 'left', style: 'width: 160px' },
  { name: 'dates', label: 'Period', field: 'date', align: 'left', style: 'width: 190px' },
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
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
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
.table-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.filter-select { min-width: 160px; }
.modern-table-container { overflow: hidden; margin: 0 16px 16px 16px; }
.request-table { background: #ffffff; width: 100%; table-layout: fixed; }
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
}
.table-header-actions { text-align: center !important; }
.table-body-row { transition: background 0.15s ease; }
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
}

.table-body-row:last-child .table-body-cell {
  border-bottom: none !important;
}
.employee-info { display: flex; align-items: center; gap: 10px; }
.employee-name-cell { font-weight: 500; }
.employee-details { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.status-pending { background: #fffbeb; color: #92400e; }
.status-approved { background: #f0fdf4; color: #16a34a; }
.status-rejected { background: #fef2f2; color: #dc2626; }
.status-default { background: #f3f4f6; color: #6b7280; }
.type-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.date-range { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.start-date, .end-date { color: #374151; font-weight: 500; }
.date-separator { color: #9ca3af; font-size: 10px; }
.duration { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.reason-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #6b7280;
}
.reason-cell { max-width: 220px; }
.dates-cell { font-size: 13px; }
.actions-cell {
  text-align: center !important;
  width: 120px;
  min-width: 120px;
  vertical-align: middle !important;
}
.action-buttons { display: flex; gap: 4px; justify-content: center; align-items: center; }
.action-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.view-btn { background: #eff6ff; color: #3b82f6; }
.view-btn:hover { background: #dbeafe; }
.approve-btn { background: #f0fdf4; color: #16a34a; }
.approve-btn:hover { background: #dcfce7; }
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}
.loading-text { font-size: 14px; color: #6b7280; }
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 8px;
  text-align: center;
}
.empty-icon { color: #d1d5db; margin-bottom: 6px; }
.empty-title { font-size: 15px; font-weight: 600; color: #374151; }
.empty-subtitle { font-size: 13px; color: #9ca3af; }
@media (max-width: 1024px) {
  .modern-table-container { margin: 0 14px 14px 14px; }
  .table-header-cell, .table-body-cell { padding: 10px 10px !important; font-size: 12px; }
  .filter-select { min-width: 140px; }
}
@media (max-width: 768px) {
  .table-header { flex-direction: column; align-items: stretch; gap: 10px; }
  .table-actions { width: 100%; }
  .filter-select { width: 100%; min-width: unset; }
  .modern-table-container { margin: 0 10px 10px 10px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .request-table { min-width: 700px; }
}
@media (max-width: 480px) {
  .table-header-cell, .table-body-cell { padding: 10px 10px !important; font-size: 12px; }
  .action-btn { width: 28px; height: 28px; min-width: 28px; }
}
</style>
