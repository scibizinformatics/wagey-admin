<template>
  <div class="cutoff-section">
    <div v-if="loading" class="cutoff-loading">
      <q-spinner color="primary" size="20px" />
      <span>Loading disbursement logs...</span>
    </div>

    <div v-else-if="logs.length === 0" class="cutoff-empty dash-empty">
      <span class="dash-featured-icon">
        <q-icon name="o_event_busy" size="20px" />
      </span>
      <p class="dash-empty__title">No cutoffs found</p>
      <p class="dash-empty__sub">
        Cash advances are grouped by the payroll cutoff they are drawn against. Once a cutoff is
        created, it appears here as a card you can expand.
      </p>
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
              :style="{
                transform: expandedLogId === log.id ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }"
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
            <div class="cutoff-stat-col cutoff-stat-col--status">
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
              <div class="grid-empty-icon">
                <q-icon name="account_balance_wallet" size="26px" />
              </div>
              <div class="grid-empty-title">
                {{
                  isNarrowed
                    ? 'No cash advances match your search'
                    : 'No cash advances in this cutoff'
                }}
              </div>
              <div class="grid-empty-text">
                {{
                  isNarrowed
                    ? 'Clear the search or switch back to All statuses to see every request in this cutoff.'
                    : 'Cash advances drawn against this cutoff will appear here.'
                }}
              </div>
            </div>

            <div v-else class="cutoff-table-container dash-scroll-x">
              <q-table
                :rows="filteredCutoffRequests"
                :columns="cutoffColumns"
                row-key="id"
                flat
                hide-pagination
                :rows-per-page-options="[0]"
                class="dash-qtable dash-qtable--flush request-grid cutoff-grid"
              >
                <template v-slot:header="props">
                  <q-tr class="grid-head-row" :props="props">
                    <q-th key="employeeName" :props="props" class="grid-head-cell cut-cell-employee"
                      >Employee</q-th
                    >
                    <q-th
                      key="requestedAmount"
                      :props="props"
                      class="grid-head-cell grid-head-cell--right cut-cell-amount"
                      >Amount</q-th
                    >
                    <q-th key="requestDate" :props="props" class="grid-head-cell cut-cell-date"
                      >Requested</q-th
                    >
                    <q-th key="payoutDate" :props="props" class="grid-head-cell cut-cell-date"
                      >Payout</q-th
                    >
                    <q-th key="status" :props="props" class="grid-head-cell cut-cell-status"
                      >Status</q-th
                    >
                    <q-th
                      key="actions"
                      :props="props"
                      class="grid-head-cell grid-head-cell--right cut-cell-actions"
                      >Actions</q-th
                    >
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr
                    class="dash-qtable__row grid-row"
                    :class="{ 'grid-row--waiting': props.row.status === 'pending' }"
                    :props="props"
                  >
                    <q-td key="employeeName" :props="props" class="grid-cell cut-cell-employee">
                      <div class="identity">
                        <span class="identity-avatar">{{
                          getInitials(props.row.employee_name)
                        }}</span>
                        <span class="identity-text">
                          <span class="identity-name">{{ props.row.employee_name }}</span>
                        </span>
                      </div>
                    </q-td>
                    <q-td
                      key="requestedAmount"
                      :props="props"
                      class="grid-cell grid-cell--right cut-cell-amount"
                    >
                      <span class="amount"
                        >&#8369;{{ formatAmount(props.row.requested_amount) }}</span
                      >
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
                      <div v-if="approverName(props.row)" class="status-note">
                        by {{ approverName(props.row) }}
                      </div>
                    </q-td>
                    <q-td key="actions" :props="props" class="grid-cell cut-cell-actions">
                      <div class="grid-actions">
                        <q-btn
                          flat
                          dense
                          round
                          icon="visibility"
                          size="sm"
                          class="grid-action"
                          @click.stop="$emit('view', props.row)"
                        >
                          <q-tooltip>View details</q-tooltip>
                        </q-btn>
                        <q-btn
                          v-if="props.row.status === 'pending'"
                          flat
                          dense
                          round
                          icon="rule"
                          size="sm"
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
import { getApproverName as approverName } from 'src/composables/utils/employee'

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
        (r.employee_name || '').toLowerCase().includes(search) || String(r.id).includes(search),
    )
  }
  return filtered
})

const isNarrowed = computed(() => statusFilter.value !== 'all' || !!(props.search || '').trim())

const getInitials = (name) => {
  if (!name || name === 'N/A') return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
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
/*
 * Cutoff cards — the cash-advance twin of the payroll-run cards on the Overtime
 * tab, and deliberately identical to them now. This view used to tint its whole
 * card header blue (#eef3fb, deepening to #deeaf8 when open) against the
 * overtime tab's neutral grey, so switching queues looked like switching
 * products. Both now sit on the shared `--dash-*` neutral ramp and carry state
 * in the border and a hover plate rather than in a hue.
 */
.cutoff-section {
  padding: 0;
}
.cutoff-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 28px var(--dash-pad-x);
  font-size: 13px;
  color: var(--dash-ink-3);
}
.cutoff-empty {
  padding: 10px 20px 26px;
}
.cutoff-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: var(--dash-pad-y) var(--dash-pad-x);
}
.cutoff-card {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--dash-fast) var(--dash-ease);
}
.cutoff-card:hover,
.cutoff-card.active {
  border-color: var(--dash-line-strong);
}
.cutoff-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid transparent;
  background: var(--dash-surface);
  transition:
    background var(--dash-fast) var(--dash-ease),
    border-color var(--dash-fast) var(--dash-ease);
}
.cutoff-card:hover .cutoff-card-header {
  background: var(--dash-hover);
}
.cutoff-card.active .cutoff-card-header {
  background: var(--dash-n-25);
  border-bottom-color: var(--dash-line);
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
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.cutoff-period {
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.cutoff-stat-cols {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}
.cutoff-stat-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 0 14px;
  border-right: 1px solid var(--dash-line);
}
.cutoff-stat-col:first-child {
  padding-left: 0;
}
.cutoff-stat-col:last-of-type {
  border-right: none;
  padding-right: 0;
}
/* Sentence case, matching the run cards on the Overtime tab and every table
   header in the app; the tracked-out 10px capitals they replaced were the
   loudest thing in the row. */
.cutoff-stat-label {
  font-size: 12px;
  font-weight: 400;
  color: var(--dash-ink-3);
  white-space: nowrap;
}
.cutoff-stat-val {
  font-size: 14px;
  font-weight: 600;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
/* The status column carries a chip rather than a figure, so it drops the
   numeric weight and sits on the label's own line height. */
.cutoff-stat-col--status .cutoff-stat-val {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
}
.expand-icon {
  flex-shrink: 0;
  color: var(--dash-ink-4);
  transition: transform 0.24s var(--dash-ease);
}

/* ===== Expanded cutoff ===== */
.cutoff-panel-wrapper {
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
}
.cutoff-panel {
  padding: 14px 16px 16px;
}
.cutoff-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}
.panel-count {
  padding: 0 6px;
  border-radius: var(--dash-r-xs);
  background: var(--dash-n-100);
  color: var(--dash-ink-3);
  font-size: 11px;
  font-weight: 600;
  line-height: 17px;
  font-variant-numeric: tabular-nums;
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
  padding: 20px 4px;
  font-size: 13px;
  color: var(--dash-ink-3);
}
.cutoff-table-container {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
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

/* Bordered status chip — a tint plus a 1px ring in the same hue, matching the
   pills in the tables below rather than the flat 20px-radius pastel pill this
   used to be. */
.status-badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 7px;
  border-radius: var(--dash-r-sm);
  border: 1px solid var(--dash-neutral-line);
  background: var(--dash-neutral-bg);
  color: var(--dash-neutral);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 17px;
  white-space: nowrap;
}
.status-badge-mini.status-pending {
  background: var(--dash-warn-bg);
  border-color: var(--dash-warn-line);
  color: var(--dash-warn);
}
.status-badge-mini.status-approved {
  background: var(--dash-good-bg);
  border-color: var(--dash-good-line);
  color: var(--dash-good);
}
.status-badge-mini.status-rejected {
  background: var(--dash-critical-bg);
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
}
.status-badge-mini.status-default {
  background: var(--dash-neutral-bg);
  border-color: var(--dash-neutral-line);
  color: var(--dash-neutral);
}

@media (max-width: 1279px) {
  .cutoff-stat-col {
    padding: 0 11px;
  }
}
@media (max-width: 1023px) {
  .cutoff-card-header {
    padding: 12px 14px;
    gap: 12px;
  }
}
@media (max-width: 768px) {
  .cutoff-card-header {
    flex-wrap: wrap;
    gap: 10px;
  }
  .cutoff-name-group {
    flex: 1 1 100%;
    min-width: 0;
  }
  .cutoff-stat-cols {
    flex: 1 1 auto;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .cutoff-stat-col {
    padding: 0 10px;
  }
  .cutoff-panel {
    padding: 12px 12px 14px;
  }
  .panel-actions .grid-search {
    flex: 1 1 100%;
    max-width: 100%;
  }
  .panel-actions .grid-filter {
    width: 100%;
  }
}
@media (max-width: 599px) {
  .cutoff-list {
    padding: 12px;
  }
}
@media (max-width: 480px) {
  .cutoff-card-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;
    gap: 10px;
  }
  .cutoff-name-group {
    width: 100%;
  }
  .cutoff-stat-cols {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .cutoff-stat-col:last-of-type {
    padding-right: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cutoff-card,
  .cutoff-card-header,
  .expand-icon {
    transition: none;
  }
}
</style>
