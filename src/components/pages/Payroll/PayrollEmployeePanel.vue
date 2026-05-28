<template>
  <div class="employees-panel">
    <div class="employees-panel-header">
      <div class="employees-panel-title">
        <q-icon name="people" size="16px" color="primary" />
        <span>Employees</span>
        <span class="employees-panel-count">{{ employees.length }}</span>
        <span v-if="selectedCount > 0" class="employees-panel-selected">
          &middot; {{ selectedCount }} selected
        </span>
      </div>
      <div class="employees-panel-actions">
        <q-input
          dense outlined
          :model-value="searchQuery"
          placeholder="Search employees..."
          class="employee-search-input"
          clearable
          style="min-width: 180px"
          @update:model-value="$emit('update:search-query', $event)"
        >
          <template v-slot:prepend><q-icon name="search" size="16px" /></template>
        </q-input>
        <q-checkbox
          :model-value="selectAll"
          label="Select All"
          dense
          @update:model-value="$emit('toggle-select-all', $event)"
          :disable="actionableCount === 0"
          class="select-all-checkbox"
        />
        <q-btn
          v-if="showReleaseBtn"
          unelevated dense no-caps size="sm" icon="send" color="orange"
          :label="releaseBtnLabel" :loading="saving"
          @click="$emit('bulk-release')"
        />
        <q-btn
          v-if="showDisburseReadyBtn"
          unelevated dense no-caps size="sm" icon="payments" color="teal"
          label="Disburse Ready" :loading="saving"
          @click="$emit('bulk-disburse')"
        />
        <q-btn
          v-if="showDisburseSelectedBtn"
          unelevated dense no-caps size="sm" icon="payments" color="teal"
          :label="disburseBtnLabel" :loading="saving"
          @click="$emit('bulk-disburse')"
        />
      </div>
    </div>

    <div v-if="loading" style="display: flex; align-items: center; gap: 10px; padding: 20px 24px">
      <q-spinner color="primary" size="20px" />
      <span style="font-size: 13px; color: #6b7280">Loading employees...</span>
    </div>

    <div v-if="showEarlyDisbursalBannerFirst" class="early-disbursal-banner">
      <q-icon name="payments" size="16px" color="teal" />
      <span>
        <strong>{{ earlyDisbursalCount }} employee(s)</strong>
        have acknowledged their payslip and can be disbursed early. Select them
        individually or use <strong>Select All</strong> to release their salary now.
      </span>
    </div>

    <div v-if="showEarlyDisbursalBannerSecond" class="early-disbursal-banner">
      <q-icon name="payments" size="16px" color="teal" />
      <span>
        <strong>{{ earlyDisbursalCount }} employee(s)</strong>
        have acknowledged their payslip and can be disbursed early. Select them
        individually to disburse their salary now.
      </span>
    </div>

    <div class="employees-table-container">
      <div class="employees-table-header">
        <div class="employees-th"></div>
        <div class="employees-th">Employee</div>
        <div class="employees-th">Status</div>
        <div class="employees-th">Gross Pay</div>
        <div class="employees-th">Net Pay</div>
        <div class="employees-th">Total Hours</div>
        <div class="employees-th">Actions</div>
      </div>

      <div v-if="employees.length > 0" class="virtual-scroll-container">
        <q-virtual-scroll
          :items="employees"
          virtual-scroll-slice-size="50"
          virtual-scroll-item-size="72"
          class="employee-virtual-scroll"
          style="max-height: 600px"
        >
          <template v-slot="{ item: emp }">
            <div
              class="employees-table-row"
              :class="{ 'selected-row': emp._selected, 'failed-row': emp._hasError }"
              :key="`${runId}-${emp.employee_id || emp.payslip_id || emp.id}-${emp.status}`"
            >
              <div class="employees-td" @click.stop>
                <q-checkbox
                  v-if="emp._checkboxType === 'pending_review'"
                  :model-value="false" disable dense
                  checked-icon="hourglass_top" color="orange"
                >
                  <q-tooltip>Waiting for employee acknowledgement</q-tooltip>
                </q-checkbox>
                <q-checkbox
                  v-else-if="emp._canCheck"
                  :model-value="emp._selected"
                  @update:model-value="$emit('toggle-selection', emp.employee_id)"
                  dense
                >
                  <q-tooltip v-if="workflowStage === 'pending_review'">Acknowledged &mdash; select to disburse early</q-tooltip>
                </q-checkbox>
                <q-icon v-else-if="['disbursed', 'completed'].includes(emp.status)"
                  name="task_alt" color="positive" size="20px" />
                <span v-else class="text-grey-5">&mdash;</span>
              </div>
              <div class="employees-td employee-cell">
                <div class="employee-info">
                  <q-avatar size="32px" class="avatar-fallback">{{ emp._initials }}</q-avatar>
                  <div class="employee-details">
                    <div class="employee-name">{{ emp.employee_name || emp.employee }}</div>
                    <div class="employee-id">{{ emp.employee_id || 'N/A' }}</div>
                  </div>
                </div>
              </div>
              <div class="employees-td">
                <q-badge :color="emp._statusColor" :label="emp._statusLabel" />
                <q-tooltip v-if="emp._hasError" class="bg-negative">{{ emp.lastError }}</q-tooltip>
              </div>
              <div class="employees-td amount-cell">
                <div class="amount-display">{{ emp._grossPayFormatted }}</div>
                <div class="amount-progress">
                  <div class="amount-bar gross-bar" :style="{ width: emp._grossBarWidth + '%' }"></div>
                </div>
              </div>
              <div class="employees-td amount-cell">
                <div class="amount-display">{{ emp._netPayFormatted }}</div>
                <div class="amount-progress">
                  <div class="amount-bar net-bar" :style="{ width: emp._netBarWidth + '%' }"></div>
                </div>
              </div>
              <div class="employees-td">
                <div class="hours-badge">{{ emp._totalHours }}h</div>
              </div>
              <div class="employees-td actions-cell">
                <div class="workflow-actions-cell">
                  <q-btn v-if="emp._hasError" flat dense icon="refresh" color="negative" size="sm"
                    @click.stop="$emit('menu-action', 'retry', emp)" round>
                    <q-tooltip>Retry</q-tooltip>
                  </q-btn>
                  <q-btn flat round dense icon="more_horiz" class="action-menu-btn" @click.stop>
                    <q-menu anchor="bottom right" self="top right" class="action-dropdown"
                      @before-show="menuTarget = emp">
                      <q-list dense style="min-width: 180px">
                        <q-item v-if="menuTarget?.status === 'draft'" clickable v-close-popup
                          @click="$emit('menu-action', 'release', menuTarget)" class="dropdown-item">
                          <q-item-section avatar><q-icon name="send" size="16px" color="orange" /></q-item-section>
                          <q-item-section>Release for Review</q-item-section>
                        </q-item>
                        <q-item v-if="menuTarget?.status === 'pending_review'" clickable v-close-popup
                          @click="$emit('menu-action', 'acknowledge', menuTarget)" class="dropdown-item">
                          <q-item-section avatar><q-icon name="fact_check" size="16px" color="blue" /></q-item-section>
                          <q-item-section>View &amp; Acknowledge</q-item-section>
                        </q-item>
                        <q-item v-if="menuTarget?.status === 'ready_for_payment' && menuTarget?.review_status !== 'pending'"
                          clickable v-close-popup @click="$emit('menu-action', 'disburse', menuTarget)" class="dropdown-item">
                          <q-item-section avatar><q-icon name="payments" size="16px" color="teal" /></q-item-section>
                          <q-item-section>Disburse</q-item-section>
                        </q-item>
                        <q-item v-if="menuTarget?.status === 'disbursed' && menuTarget?.payment_method === 'cash'"
                          clickable v-close-popup @click="$emit('menu-action', 'markComplete', menuTarget)" class="dropdown-item">
                          <q-item-section avatar><q-icon name="handshake" size="16px" color="positive" /></q-item-section>
                          <q-item-section>Confirm Money Received</q-item-section>
                        </q-item>
                        <q-item v-if="menuTarget?.status === 'disbursed' && menuTarget?.payment_method !== 'cash'"
                          disable class="dropdown-item">
                          <q-item-section avatar><q-icon name="hourglass_top" size="16px" color="grey" /></q-item-section>
                          <q-item-section class="text-grey-6">Processing bank transfer&hellip;</q-item-section>
                        </q-item>
                        <q-separator v-if="!['completed'].includes(menuTarget?.status)" spaced />
                        <q-item clickable v-close-popup @click="$emit('menu-action', 'view', menuTarget)" class="dropdown-item">
                          <q-item-section avatar><q-icon name="visibility" size="16px" /></q-item-section>
                          <q-item-section>View details</q-item-section>
                        </q-item>
                        <q-item clickable v-close-popup @click="$emit('menu-action', 'download', menuTarget)" class="dropdown-item">
                          <q-item-section avatar><q-icon name="description" size="16px" /></q-item-section>
                          <q-item-section>Download payslip</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
              </div>
            </div>
          </template>
        </q-virtual-scroll>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <span class="text-grey-5">No employees found</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  employees: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  selectAll: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 },
  workflowStage: { type: String, default: '' },
  runId: { type: [Number, String], default: null },
  actionableCount: { type: Number, default: 0 },
  showReleaseBtn: { type: Boolean, default: false },
  showDisburseReadyBtn: { type: Boolean, default: false },
  showDisburseSelectedBtn: { type: Boolean, default: false },
  showEarlyDisbursalBannerFirst: { type: Boolean, default: false },
  showEarlyDisbursalBannerSecond: { type: Boolean, default: false },
  earlyDisbursalCount: { type: Number, default: 0 },
  releaseBtnLabel: { type: String, default: 'Release' },
  disburseBtnLabel: { type: String, default: 'Disburse Selected' },
})

defineEmits([
  'update:search-query', 'toggle-select-all', 'bulk-release', 'bulk-disburse',
  'toggle-selection', 'menu-action',
])

const menuTarget = ref(null)
</script>

<style scoped>
.employees-panel {
  background: #f4f7fb;
  border-top: 1px solid #dde3ec;
  border-left: 4px solid #3b82f6;
  margin-left: 0;
}

.employees-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 20px 10px 20px;
  background: #eef2f9;
  border-bottom: 1px solid #dde3ec;
}

.employees-panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.employees-panel-count {
  background: #3b82f6;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  padding: 1px 7px;
  line-height: 1.6;
}

.employees-panel-selected {
  font-size: 12px;
  font-weight: 400;
  color: #6b7280;
}

.employees-panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.employee-search-input { font-size: 13px; }
.select-all-checkbox { font-size: 13px; color: #374151; }

.early-disbursal-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #f0fdf4;
  border-left: 3px solid #14b8a6;
  margin: 8px 14px 0;
  border-radius: 6px;
  font-size: 13px;
  color: #0f766e;
}

.employees-table-container {
  width: 100%;
  overflow: hidden;
  overflow-x: auto;
}

.employees-table-header {
  display: flex;
  background: #f1f5f9;
  border-bottom: 2px solid #e2e8f0;
  padding: 14px 20px;
  font-weight: 700;
  font-size: 11px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  min-width: 700px;
}

.employees-th {
  padding: 0 12px;
  text-align: left;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.employees-th:nth-child(1) { flex: 0 0 44px; padding: 0; text-align: center; }
.employees-th:nth-child(2) { flex: 3 1 220px; }
.employees-th:nth-child(3) { flex: 0 0 165px; }
.employees-th:nth-child(4) { flex: 1.5 1 130px; }
.employees-th:nth-child(5) { flex: 1.5 1 130px; }
.employees-th:nth-child(6) { flex: 0 0 100px; text-align: center; }
.employees-th:nth-child(7) { flex: 0 0 80px; text-align: center; }

.virtual-scroll-container { width: 100%; }
.employee-virtual-scroll { width: 100%; }

.employees-table-row {
  display: flex;
  padding: 16px 20px;
  border-bottom: 1px solid #edf0f4;
  transition: background-color 0.15s ease;
  min-height: 72px;
  align-items: center;
  min-width: 700px;
}

.employees-table-row:hover { background-color: #f8fafc; }
.employees-table-row.selected-row { background-color: #eff6ff; }
.employees-table-row.failed-row { background-color: #fef2f2; }

.employees-td {
  padding: 0 12px;
  font-size: 13.5px;
  color: #1e293b;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  flex: 1;
}

.employees-td:nth-child(1) { flex: 0 0 44px; justify-content: center; padding: 0; }
.employees-td:nth-child(2) { flex: 3 1 220px; }
.employees-td:nth-child(3) { flex: 0 0 165px; overflow: visible; }
.employees-td:nth-child(4) { flex: 1.5 1 130px; }
.employees-td:nth-child(5) { flex: 1.5 1 130px; }
.employees-td:nth-child(6) { flex: 0 0 100px; justify-content: center; }
.employees-td:nth-child(7) { flex: 0 0 72px; justify-content: center; }

.employee-cell { min-width: 200px; }

.employee-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.employee-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-id {
  font-size: 11.5px;
  color: #94a3b8;
  font-family: monospace;
  letter-spacing: 0.02em;
}

.avatar-fallback {
  background: #e0e7ff !important;
  color: #4338ca !important;
  font-weight: 700 !important;
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}

.avatar-fallback :deep(.q-avatar__content) {
  font-size: 11px !important;
  line-height: 1 !important;
}

.amount-cell { min-width: 120px; }

.amount-display {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  margin-bottom: 4px;
}

.amount-progress {
  height: 3px;
  background: #f1f3f5;
  border-radius: 2px;
  overflow: hidden;
}

.amount-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.gross-bar { background: #f59e0b; }
.net-bar { background: #22c55e; }

.hours-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  white-space: nowrap;
}

.actions-cell { text-align: center; width: 60px; }

.action-menu-btn {
  color: #6b7280 !important;
  border-radius: 6px !important;
}
.action-menu-btn:hover { background: #f3f4f6 !important; }

.action-dropdown {
  border-radius: 8px !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

.dropdown-item {
  font-size: 13px !important;
  color: #374151 !important;
  min-height: 36px !important;
  padding: 0 12px !important;
}
.dropdown-item:hover { background: #f9fafb !important; }

.workflow-actions-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.text-grey-5 { color: #b0b8c1; font-size: 12px; }

/* Virtual scroll & responsive */
@media (max-width: 1024px) {
  .employees-table-header,
  .employees-table-row { min-width: 720px; }
}

@media (max-width: 768px) {
  .employees-panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
  }
  .employees-panel-actions { width: 100%; flex-wrap: wrap; gap: 6px; }
  .employee-search-input { flex: 1 1 100% !important; min-width: 0 !important; }
  .employees-table-header,
  .employees-table-row { min-width: 600px; }
  .employees-th:nth-child(2), .employees-td:nth-child(2) { flex: 2 1 140px; }
  .employees-th:nth-child(4), .employees-td:nth-child(4) { flex: 1.2 1 100px; }
  .employees-th:nth-child(5), .employees-td:nth-child(5) { flex: 1.2 1 100px; }
}

@media (max-width: 480px) {
  .employees-panel-header { padding: 8px 10px; }
  .employees-table-header,
  .employees-table-row { min-width: 580px; }
  .employees-th:nth-child(6), .employees-td:nth-child(6) { flex: 0 0 70px; }
}
</style>
