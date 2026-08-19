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
                  v-model="statusFilter"
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
              </div>
            </div>

            <div v-if="cutoffLoading" class="cutoff-panel-loading">
              <q-spinner color="primary" size="20px" />
              <span>Loading cash advance requests...</span>
            </div>

            <div v-else-if="filteredCutoffRequests.length === 0" class="grid-empty">
              <div class="grid-empty-icon"><q-icon name="account_balance_wallet" size="26px" /></div>
              <div class="grid-empty-title">
                {{ isNarrowed ? 'No cash advances match your search' : 'No cash advances in this cutoff' }}
              </div>
              <div class="grid-empty-text">
                {{
                  isNarrowed
                    ? 'Clear the search or switch back to All statuses to see every request in this cutoff.'
                    : 'Cash advances drawn against this cutoff will appear here.'
                }}
              </div>
            </div>

            <div v-else class="cutoff-table-container">
              <q-table
                :rows="filteredCutoffRequests"
                :columns="cutoffColumns"
                row-key="id"
                flat
                hide-pagination
                :rows-per-page-options="[0]"
                class="request-grid cutoff-grid"
              >
                <template v-slot:header="props">
                  <q-tr class="grid-head-row" :props="props">
                    <q-th key="employeeName" :props="props" class="grid-head-cell cut-cell-employee">Employee</q-th>
                    <q-th key="requestedAmount" :props="props" class="grid-head-cell grid-head-cell--right cut-cell-amount">Amount</q-th>
                    <q-th key="requestDate" :props="props" class="grid-head-cell cut-cell-date">Requested</q-th>
                    <q-th key="payoutDate" :props="props" class="grid-head-cell cut-cell-date">Payout</q-th>
                    <q-th key="status" :props="props" class="grid-head-cell cut-cell-status">Status</q-th>
                    <q-th key="actions" :props="props" class="grid-head-cell grid-head-cell--right cut-cell-actions">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr
                    class="grid-row"
                    :class="{ 'grid-row--waiting': props.row.status === 'pending' }"
                    :props="props"
                  >
                    <q-td key="employeeName" :props="props" class="grid-cell cut-cell-employee">
                      <div class="identity">
                        <span class="identity-avatar">{{ getInitials(props.row.employee_name) }}</span>
                        <span class="identity-text">
                          <span class="identity-name">{{ props.row.employee_name }}</span>
                        </span>
                      </div>
                    </q-td>
                    <q-td key="requestedAmount" :props="props" class="grid-cell grid-cell--right cut-cell-amount">
                      <span class="amount">&#8369;{{ formatAmount(props.row.requested_amount) }}</span>
                    </q-td>
                    <q-td key="requestDate" :props="props" class="grid-cell cut-cell-date">
                      <span class="stat-num">{{ formatDate(props.row.request_date) }}</span>
                    </q-td>
                    <q-td key="payoutDate" :props="props" class="grid-cell cut-cell-date">
                      <span :class="['stat-num', { muted: !props.row.payout_date }]">
                        {{ props.row.payout_date ? formatDate(props.row.payout_date) : '—' }}
                      </span>
                      <div v-if="props.row.approval_date" class="range-meta">
                        approved {{ formatDate(props.row.approval_date) }}
                      </div>
                    </q-td>
                    <q-td key="status" :props="props" class="grid-cell cut-cell-status">
                      <span :class="['status-pill', statusPillClass(props.row.status)]">
                        {{ props.row.status_display || capitalize(props.row.status) }}
                      </span>
                      <div v-if="props.row.approved_by" class="status-note">
                        by {{ props.row.approved_by }}
                      </div>
                    </q-td>
                    <q-td key="actions" :props="props" class="grid-cell cut-cell-actions">
                      <div class="grid-actions">
                        <q-btn flat dense round icon="visibility" size="sm" class="grid-action" @click.stop="$emit('view', props.row)">
                          <q-tooltip>View details</q-tooltip>
                        </q-btn>
                        <q-btn
                          v-if="props.row.status === 'pending'"
                          flat dense round icon="rule" size="sm"
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

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
  { name: 'requestedAmount', label: 'Amount', field: 'requested_amount', align: 'right' },
  { name: 'requestDate', label: 'Requested', field: 'request_date', align: 'left' },
  { name: 'payoutDate', label: 'Payout', field: 'payout_date', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
]

// Status lives here rather than on RequestPage: this panel already filters its
// own rows, and the parent has no other use for it.
const statusFilter = ref('all')
const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const filteredCutoffRequests = computed(() => {
  let filtered = [...props.cutoffRequests]
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter((r) => r.status === statusFilter.value)
  }
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

const isNarrowed = computed(
  () => statusFilter.value !== 'all' || !!(props.search || '').trim(),
)

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

const statusPillClass = (status) => {
  if (status === 'pending') return 'status-pill--pending'
  if (status === 'approved') return 'status-pill--approved'
  if (status === 'rejected') return 'status-pill--rejected'
  return 'status-pill--default'
}
</script>

<style scoped src="./requestGrid.css"></style>

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
.cutoff-panel-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  font-size: 13px;
  color: #6b7280;
}
.cutoff-table-container {
  background: #ffffff;
  border: 1px solid #e6ebf1;
  border-radius: 12px;
  overflow: auto;
}
.cutoff-grid {
  min-width: 780px;
}
.cut-cell-employee {
  width: 230px;
}
.cut-cell-amount {
  width: 130px;
}
.cut-cell-date {
  width: 140px;
  white-space: nowrap;
}
.cut-cell-status {
  width: 160px;
}
.cut-cell-actions {
  width: 100px;
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
  .panel-actions .grid-search { flex: 1 1 100%; max-width: 100%; }
  .panel-actions .grid-filter { width: 100%; }
}
@media (max-width: 480px) {
  .cutoff-card-header { flex-direction: column; align-items: flex-start; padding: 10px 12px; gap: 8px; }
  .cutoff-name-group { width: 100%; }
  .cutoff-stat-cols { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
}
</style>
