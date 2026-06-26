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
                  <q-avatar size="34px" class="avatar-fallback">
                    {{ getInitials(props.row.employee_name) }}
                  </q-avatar>
                  <div class="employee-name-block">
                    <span class="employee-name">{{ props.row.employee_name }}</span>
                  </div>
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
                  <span class="status-dot"></span>
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
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn" @click.stop>
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 160px">
                      <q-item clickable v-close-popup @click="$emit('view', props.row)" class="dropdown-item">
                        <q-item-section avatar><q-icon name="visibility" size="16px" /></q-item-section>
                        <q-item-section>View Details</q-item-section>
                      </q-item>
                      <q-item v-if="props.row.status === 'pending'" clickable v-close-popup @click="$emit('approve', props.row)" class="dropdown-item">
                        <q-item-section avatar><q-icon name="check" size="16px" color="positive" /></q-item-section>
                        <q-item-section>Approve/Reject</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
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
.modern-table-container { overflow-x: auto; position: relative; }
.cash-advance-table { width: 100%; min-width: 700px; }

.cash-advance-table,
.cash-advance-table :deep(.q-table__container),
.cash-advance-table :deep(.q-table__card),
.cash-advance-table.q-table__container,
.cash-advance-table :deep(.q-table__bottom-border),
.cash-advance-table :deep(.q-table__top),
.cash-advance-table :deep(.q-table__bottom),
.cash-advance-table :deep(.q-table) {
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

.table-body-row:last-child .table-body-cell {
  border-bottom: none !important;
}

.table-body-cell {
  font-size: 13px;
  color: #334155;
  padding: 9px 14px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle !important;
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

.repayment-badge {
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
.repayment-manual { background: #fffbeb; color: #92400e; border-color: #fde68a; }
.repayment-automatic { background: #f0fdf4; color: #065f46; border-color: #bbf7d0; }
.repayment-default { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }

.amount-value { font-weight: 600; color: #0f172a; }
.amount-cell { font-size: 13px; }

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

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}
.loading-text { font-size: 14px; color: #94a3b8; }
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 8px;
  text-align: center;
}
.empty-icon { color: #cbd5e1; margin-bottom: 6px; }
.empty-title { font-size: 15px; font-weight: 500; color: #334155; }
.empty-subtitle { font-size: 13px; color: #94a3b8; }

@media (max-width: 1440px) {
  .cash-advance-table { min-width: 680px; }
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
  .cash-advance-table { min-width: 700px; }
}
@media (max-width: 480px) {
  .table-header-cell, .table-body-cell { padding: 10px 12px !important; font-size: 12px; }
}
</style>
