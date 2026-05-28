<template>
  <div class="table-section">
      <div class="table-header">
        <div class="table-title-section">
          <h2 class="table-title">Cash Advance Requests</h2>
        </div>
        <div class="table-actions">
          <q-select
            :model-value="caFilterStatus"
            @update:model-value="$emit('update:caFilterStatus', $event)"
            :options="caStatusOptions"
            label="Filter by Status"
            class="filter-select"
            dense
            outlined
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="filter_list" />
            </template>
          </q-select>
        </div>
      </div>
      <div v-if="loading" class="loading-state">
        <q-spinner size="48px" color="primary" :thickness="4" />
        <div class="loading-text">Loading cash advance requests...</div>
      </div>
      <div v-else-if="rows.length > 0" class="modern-table-container">
        <q-table
          :rows="rows"
          :columns="caColumns"
          row-key="id"
          flat
          :loading="loading"
          no-data-label="No cash advance requests found"
          class="cash-advance-table"
          :pagination="caPagination"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Employee</q-th>
              <q-th class="table-header-cell">Requested Amount</q-th>
              <q-th class="table-header-cell">Request Date</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell">Repayment</q-th>
              <q-th class="table-header-cell">Repaid</q-th>
              <q-th class="table-header-cell table-header-actions">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell employee-name-cell">
                <div class="employee-info">
                  <q-avatar size="32px" :color="getAvatarColor(props.row.employee_name)" text-color="white">
                    {{ getInitials(props.row.employee_name) }}
                  </q-avatar>
                  <span class="employee-name">{{ props.row.employee_name }}</span>
                </div>
              </q-td>
              <q-td class="table-body-cell amount-cell">
                <div class="amount-info">
                  <span class="amount-value">&#8369;{{ formatAmount(props.row.requested_amount) }}</span>
                </div>
              </q-td>
              <q-td class="table-body-cell">{{ props.row.request_date }}</q-td>
              <q-td class="table-body-cell">
                <div :class="['status-badge', getCaStatusClass(props.row.status)]">
                  {{ capitalizeStatus(props.row.status) }}
                </div>
              </q-td>
              <q-td class="table-body-cell">
                <div :class="['repayment-badge', getRepaymentClass(props.row.repayment_method)]">
                  {{ capitalizeStatus(props.row.repayment_method) }}
                </div>
              </q-td>
              <q-td class="table-body-cell repaid-cell">
                <q-icon
                  :name="props.row.is_repaid ? 'check_circle' : 'schedule'"
                  :color="props.row.is_repaid ? 'positive' : 'warning'"
                  size="20px"
                />
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <div class="action-buttons">
                  <q-btn flat round icon="visibility" size="sm" class="action-btn view-btn" @click="$emit('view', props.row)">
                    <q-tooltip>View Details</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="props.row.status === 'pending'"
                    flat round icon="edit" size="sm"
                    class="action-btn edit-btn"
                    @click="$emit('approve', props.row)"
                  >
                    <q-tooltip>Approve/Reject</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon"><q-icon name="search_off" size="64px" color="grey-4" /></div>
        <div class="empty-title">No cash advance requests found</div>
        <div class="empty-subtitle">Try adjusting your search or filters</div>
      </div>
    </div>
</template>

<script setup>
const AVATAR_COLORS = ['primary', 'secondary', 'accent', 'purple', 'deep-orange']

defineProps({
  rows: Array,
  loading: Boolean,
  caFilterStatus: String,
  caStatusOptions: Array,
  caPagination: Object,
})
defineEmits(['update:caFilterStatus', 'view', 'approve'])

const caColumns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'employee_name', label: 'Employee', field: 'employee_name', align: 'left', sortable: true },
  { name: 'requested_amount', label: 'Requested Amount', field: 'requested_amount', align: 'left', sortable: true },
  { name: 'request_date', label: 'Request Date', field: 'request_date', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'repayment_method', label: 'Repayment Method', field: 'repayment_method', align: 'center', sortable: true },
  { name: 'is_repaid', label: 'Repaid?', field: 'is_repaid', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', align: 'center' },
]

const getInitials = (name) => {
  if (!name || name === 'N/A') return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}
const capitalizeStatus = (status) => {
  if (!status) return 'N/A'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
const formatAmount = (num) => {
  const n = Number(num || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const getCaStatusClass = (status) => {
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}
const getRepaymentClass = (method) => {
  if (method === 'manual') return 'repayment-manual'
  if (method === 'automatic') return 'repayment-automatic'
  return 'repayment-default'
}
const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0]
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
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
.table-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.filter-select { min-width: 160px; }
.modern-table-container { overflow: hidden; margin: 0 16px 16px 16px; }
.cash-advance-table { background: #ffffff; width: 100%; table-layout: fixed; }
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
.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 13px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle !important;
}
.employee-info { display: flex; align-items: center; gap: 10px; }
.employee-name-cell { font-weight: 500; }
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
.repayment-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #e5e7eb;
}
.repayment-manual { background: #fffbeb; color: #92400e; border-color: #fde68a; }
.repayment-automatic { background: #f0fdf4; color: #065f46; border-color: #bbf7d0; }
.repayment-default { background: #f3f4f6; color: #6b7280; }
.amount-value { font-weight: 600; color: #111827; }
.amount-cell { font-size: 13px; }
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
.edit-btn { background: #fffbeb; color: #d97706; }
.edit-btn:hover { background: #fef3c7; }
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
  .cash-advance-table { min-width: 750px; }
}
@media (max-width: 480px) {
  .table-header-cell, .table-body-cell { padding: 10px 10px !important; font-size: 12px; }
  .action-btn { width: 28px; height: 28px; min-width: 28px; }
}
</style>
