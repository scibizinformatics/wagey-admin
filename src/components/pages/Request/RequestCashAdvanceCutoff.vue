<template>
  <div class="cutoff-section">
    <div v-if="loading" class="cutoff-loading">
      <q-spinner color="primary" size="20px" />
      <span>Loading disbursement logs...</span>
    </div>

    <div v-else-if="logs.length === 0" class="cutoff-empty">
      <q-icon name="search_off" size="48px" color="grey-4" />
      <div class="empty-title">No disbursement logs found</div>
      <div class="empty-subtitle">Try adjusting your search or filters</div>
    </div>

    <div v-else class="cutoff-list">
      <div
        v-for="log in logs"
        :key="log.id"
        :class="['cutoff-card', { active: expandedLogId === log.id }]"
        @click="$emit('expand', log.id)"
      >
        <div class="cutoff-card-header">
          <div class="cutoff-name-group">
            <q-icon
              name="expand_more"
              :style="{ transform: expandedLogId === log.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }"
              size="18px"
              class="expand-icon"
            />
            <div class="cutoff-name-stack">
              <div class="cutoff-name">{{ log.name }}</div>
              <div class="cutoff-period" v-if="log.start_date && log.end_date">
                {{ formatDate(log.start_date) }} - {{ formatDate(log.end_date) }}
              </div>
            </div>
          </div>

          <div class="cutoff-stat-cols">
            <div class="cutoff-stat-col">
              <span class="cutoff-stat-label">Type</span>
              <span class="cutoff-stat-val">{{ log.type_display || log.type || '-' }}</span>
            </div>
            <div class="cutoff-stat-col">
              <span class="cutoff-stat-label">Status</span>
              <span class="cutoff-stat-val">
                <div :class="['status-badge-mini', getStatusClass(log.status)]">
                  {{ log.status_display || capitalize(log.status) }}
                </div>
              </span>
            </div>
            <div class="cutoff-stat-col">
              <span class="cutoff-stat-label">Total CA</span>
              <span class="cutoff-stat-val">{{ log.total_cash_advances ?? 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Expanded Panel -->
        <div v-if="expandedLogId === log.id" class="cutoff-panel-wrapper" @click.stop>
          <div class="cutoff-panel">
            <div class="cutoff-panel-header">
              <div class="panel-title">
                <q-icon name="account_balance_wallet" size="16px" color="primary" />
                <span>Cash Advance Requests</span>
                <span class="panel-count">{{ cutoffRequests.length }}</span>
              </div>
              <div class="panel-actions">
                <q-input
                  :model-value="search"
                  @update:model-value="$emit('update:search', $event)"
                  dense outlined
                  placeholder="Search employees..."
                  class="cutoff-search-input"
                  clearable
                >
                  <template v-slot:prepend>
                    <q-icon name="search" size="16px" />
                  </template>
                </q-input>
              </div>
            </div>

            <div v-if="cutoffLoading" class="cutoff-panel-loading">
              <q-spinner color="primary" size="20px" />
              <span>Loading cash advance requests...</span>
            </div>

            <div v-else-if="filteredCutoffRequests.length === 0" class="cutoff-panel-empty">
              <q-icon name="search_off" size="48px" color="grey-4" />
              <div class="empty-title">No cash advance requests found</div>
              <div class="empty-subtitle">Try adjusting your search</div>
            </div>

            <div v-else class="cutoff-table-container">
              <q-table
                :rows="filteredCutoffRequests"
                :columns="cutoffColumns"
                row-key="id"
                flat
                hide-pagination
                :rows-per-page-options="[0]"
                class="cutoff-table"
              >
                <template v-slot:header="props">
                  <q-tr class="table-header-row" :props="props">
                    <q-th key="employeeName" :props="props" class="table-header-cell">Employee</q-th>
                    <q-th key="requestedAmount" :props="props" class="table-header-cell">Amount</q-th>
                    <q-th key="requestDate" :props="props" class="table-header-cell">Request Date</q-th>
                    <q-th key="approvalDate" :props="props" class="table-header-cell">Approval Date</q-th>
                    <q-th key="payoutDate" :props="props" class="table-header-cell">Payout Date</q-th>
                    <q-th key="status" :props="props" class="table-header-cell">Status</q-th>
                    <q-th key="approvedBy" :props="props" class="table-header-cell">Approved By</q-th>
                    <q-th key="actions" :props="props" class="table-header-cell">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row" :props="props">
                    <q-td key="employeeName" :props="props" class="table-body-cell">
                      <div class="employee-info">
                        <q-avatar size="28px" color="primary" text-color="white">
                          {{ getInitials(props.row.employee_name) }}
                        </q-avatar>
                        <span class="employee-name">{{ props.row.employee_name }}</span>
                      </div>
                    </q-td>
                    <q-td key="requestedAmount" :props="props" class="table-body-cell">
                      <span class="amount-text">&#8369;{{ formatAmount(props.row.requested_amount) }}</span>
                    </q-td>
                    <q-td key="requestDate" :props="props" class="table-body-cell">
                      <div class="date-text">{{ formatDate(props.row.request_date) }}</div>
                    </q-td>
                    <q-td key="approvalDate" :props="props" class="table-body-cell">
                      <div class="date-text">{{ props.row.approval_date ? formatDate(props.row.approval_date) : '-' }}</div>
                    </q-td>
                    <q-td key="payoutDate" :props="props" class="table-body-cell">
                      <div class="date-text">{{ props.row.payout_date ? formatDate(props.row.payout_date) : '-' }}</div>
                    </q-td>
                    <q-td key="status" :props="props" class="table-body-cell">
                      <div :class="['status-badge', getStatusClass(props.row.status)]">
                        {{ props.row.status_display || capitalize(props.row.status) }}
                      </div>
                    </q-td>
                    <q-td key="approvedBy" :props="props" class="table-body-cell">
                      <span class="meta-text">{{ props.row.approved_by || '-' }}</span>
                    </q-td>
                    <q-td key="actions" :props="props" class="table-body-cell">
                      <div class="action-buttons">
                        <q-btn flat round icon="visibility" size="sm" class="action-btn view-btn" @click.stop="$emit('view', props.row)">
                          <q-tooltip>View Details</q-tooltip>
                        </q-btn>
                        <q-btn
                          v-if="props.row.status === 'pending'"
                          flat round icon="check" size="sm"
                          class="action-btn approve-btn"
                          @click.stop="$emit('approve', props.row)"
                        >
                          <q-tooltip>Approve / Reject</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  logs: { type: Array, default: () => [] },
  loading: Boolean,
  expandedLogId: [Number, String, null],
  cutoffRequests: { type: Array, default: () => [] },
  cutoffLoading: Boolean,
  search: String,
})

defineEmits(['expand', 'view', 'approve', 'update:search'])

const cutoffColumns = [
  { name: 'employeeName', label: 'Employee', field: 'employee_name', align: 'left' },
  { name: 'requestedAmount', label: 'Amount', field: 'requested_amount', align: 'left' },
  { name: 'requestDate', label: 'Request Date', field: 'request_date', align: 'left' },
  { name: 'approvalDate', label: 'Approval Date', field: 'approval_date', align: 'left' },
  { name: 'payoutDate', label: 'Payout Date', field: 'payout_date', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'approvedBy', label: 'Approved By', field: 'approved_by', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const filteredCutoffRequests = computed(() => {
  let filtered = [...props.cutoffRequests]
  if ((props.search || '').trim()) {
    const search = props.search.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        (r.employee_name || '').toLowerCase().includes(search) ||
        String(r.id).includes(search),
    )
  }
  return filtered
})

const getInitials = (name) => {
  if (!name || name === 'N/A') return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const capitalize = (str) => {
  if (!str) return '-'
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const formatAmount = (num) => {
  const n = Number(num || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getStatusClass = (status) => {
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}
</script>

<style scoped>
.cutoff-section { padding: 0; }
.cutoff-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 32px;
  font-size: 13px;
  color: #6b7280;
}
.cutoff-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 8px;
  text-align: center;
}
.cutoff-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
.cutoff-card {
  background: #ffffff;
  border: 1px solid #e0e7ef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}
.cutoff-card:hover {
  background: #eef3fb;
}
.cutoff-card.active {
  background: #ffffff;
}
.cutoff-card-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  gap: 16px;
  flex-wrap: nowrap;
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #d8e4f0;
  background: #eef3fb;
}
.cutoff-card.active .cutoff-card-header {
  border-bottom-color: #bfdbfe;
  background: #deeaf8;
}
.cutoff-name-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}
.cutoff-name-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}
.cutoff-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.cutoff-period {
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.cutoff-stat-cols {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 0 0 auto;
}
.cutoff-stat-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding: 0 12px;
  border-right: 1px solid #d1dce8;
}
.cutoff-stat-col:first-child { padding-left: 0; }
.cutoff-stat-col:last-of-type { border-right: none; }
.cutoff-stat-label {
  font-size: 10px;
  font-weight: 600;
  color: #8a9ab5;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.cutoff-stat-val {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}
.expand-icon {
  flex-shrink: 0;
  color: #6b7280;
  transition: transform 0.3s ease;
}
.cutoff-panel-wrapper {
  border-top: 1px solid #d1dce8;
  background: #f8fafc;
}
.cutoff-panel {
  padding: 16px 20px;
}
.cutoff-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}
.panel-count {
  background: #eef3fb;
  color: #3b82f6;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}
.panel-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.cutoff-search-input {
  min-width: 180px;
  max-width: 220px;
}
.cutoff-panel-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  font-size: 13px;
  color: #6b7280;
}
.cutoff-panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 8px;
  text-align: center;
}
.cutoff-table-container {
  background: #ffffff;
  border-radius: 0 0 8px 8px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}
.cutoff-table {
  background: #ffffff;
  width: 100%;
}
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
.table-body-row { transition: background 0.15s ease; }
.table-body-row:hover { background: #f9fafb; }
.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle !important;
}
.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
}
.amount-text {
  font-weight: 600;
  color: #0f172a;
}
.date-text {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}
.meta-text {
  font-size: 13px;
  color: #6b7280;
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
.status-default { background: #f1f5f9; color: #64748b; }
.status-badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.status-badge-mini.status-pending { background: #fffbeb; color: #92400e; }
.status-badge-mini.status-approved { background: #f0fdf4; color: #16a34a; }
.status-badge-mini.status-rejected { background: #fef2f2; color: #dc2626; }
.status-badge-mini.status-default { background: #f1f5f9; color: #64748b; }
.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}
.action-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  background: #102335;
  color: #ffffff;
}
.action-btn:hover {
  background: #193d5c;
}
.empty-title { font-size: 15px; font-weight: 500; color: #334155; }
.empty-subtitle { font-size: 13px; color: #94a3b8; }

@media (max-width: 1024px) {
  .cutoff-stat-col { padding: 0 10px; }
  .cutoff-stat-label { font-size: 9px; }
  .cutoff-stat-val { font-size: 13px; }
  .cutoff-card-header { padding: 12px 16px; gap: 12px; }
}
@media (max-width: 768px) {
  .cutoff-card-header { flex-wrap: wrap; padding: 12px 14px; gap: 10px; }
  .cutoff-name-group { flex: 1 1 100%; min-width: 0; }
  .cutoff-stat-cols { flex: 1 1 auto; overflow-x: auto; padding-bottom: 2px; }
  .cutoff-stat-col { padding: 0 8px; }
  .cutoff-panel { padding: 12px 14px; }
  .cutoff-search-input { width: 100%; max-width: 100%; }
}
@media (max-width: 480px) {
  .cutoff-card-header { flex-direction: column; align-items: flex-start; padding: 10px 12px; gap: 8px; }
  .cutoff-name-group { width: 100%; }
  .cutoff-stat-cols { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
}
</style>
