<template>
  <div class="overtime-panel">
    <div class="overtime-panel-header">
      <div class="employees-panel-title">
        <q-icon name="schedule" size="16px" color="primary" />
        <span>Overtime Requests</span>
        <span class="employees-panel-count">{{ requests.length }}</span>
        <span v-if="selectedIds.size > 0" class="employees-panel-selected">
          &middot; {{ selectedIds.size }} selected
        </span>
      </div>
      <div class="employees-panel-actions">
        <q-checkbox
          :model-value="allSelected"
          label="Select All"
          dense
          @update:model-value="$emit('toggle-select-all')"
          class="select-all-checkbox"
        />
        <q-select
          :model-value="statusFilter"
          @update:model-value="$emit('update:status-filter', $event)"
          :options="[
            { label: 'All Status', value: 'all' },
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
          ]"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          label="Filter by Status"
          class="overtime-status-filter"
          dense
          outlined
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="filter_list" />
          </template>
        </q-select>
        <q-btn
          v-if="selectedIds.size > 0"
          unelevated
          dense
          no-caps
          icon="check"
          color="positive"
          label="Approve Selected"
          :loading="submitting.size > 0"
          @click="$emit('bulk-approve')"
        />
        <q-btn
          v-if="selectedIds.size > 0"
          flat
          dense
          label="Clear"
          @click="$emit('clear-selection')"
        />
      </div>
    </div>

    <div v-if="loading" class="overtime-panel-loading">
      <q-spinner color="primary" size="20px" />
      <span>Loading overtime requests...</span>
    </div>

    <div v-else-if="requests.length === 0" class="overtime-panel-empty">
      <q-icon name="search_off" size="48px" color="grey-4" />
      <div class="empty-title">No overtime requests found</div>
      <div class="empty-subtitle">Try adjusting your search or filters</div>
    </div>

    <div v-else>
      <div class="overtime-table-container">
        <div class="overtime-table-header">
          <div class="overtime-th"></div>
          <div class="overtime-th">Employee</div>
          <div class="overtime-th">Date</div>
          <div class="overtime-th">Hours</div>
          <div class="overtime-th">Status</div>
          <div class="overtime-th">Actions</div>
        </div>

        <div
          v-for="row in requests"
          :key="row.id"
          :class="['overtime-table-row', { 'selected-row': selectedIds.has(row.id) }]"
        >
          <div class="overtime-td">
            <q-checkbox
              v-if="row.status === 'pending'"
              :model-value="selectedIds.has(row.id)"
              @update:model-value="$emit('toggle-selection', row.id)"
              dense
            />
          </div>
          <div class="overtime-td employee-cell">
            <div class="employee-info">
              <q-avatar size="32px" class="avatar-fallback">
                {{
                  row.employeeName
                    ? row.employeeName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : '?'
                }}
              </q-avatar>
              <div class="employee-details">
                <div class="employee-name">{{ row.employeeName }}</div>
                <div class="employee-id">{{ row.employeeId || 'N/A' }}</div>
              </div>
            </div>
          </div>
          <div class="overtime-td">
            <div class="date-text">
              {{
                row.date
                  ? new Date(row.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A'
              }}
            </div>
          </div>
          <div class="overtime-td">
            <div class="hours-cell-content">
              <q-input
                v-if="row.status === 'pending'"
                :model-value="editableHours[row.id] ?? row.hours"
                @update:model-value="$emit('update:editable-hours', row.id, $event)"
                @click.stop
                dense
                outlined
                type="number"
                step="0.01"
                class="hours-input"
              />
              <span v-else class="hours-badge">
                {{ row.hours === '-' ? '-' : row.hours + 'h' }}
              </span>
              <span v-if="row.convertedToCto" class="cto-badge">CTO</span>
            </div>
          </div>
          <div class="overtime-td">
            <q-badge :color="statusColor(row.status)" :label="statusLabel(row.status)" />
          </div>
          <div class="overtime-td">
            <div class="action-buttons">
              <q-btn flat round dense icon="more_horiz" class="menu-btn" @click.stop>
                <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                  <q-list dense style="min-width: 160px">
                    <q-item
                      clickable
                      v-close-popup
                      @click="$emit('view-detail', row)"
                      class="dropdown-item"
                    >
                      <q-item-section avatar
                        ><q-icon name="visibility" size="16px"
                      /></q-item-section>
                      <q-item-section>View Details</q-item-section>
                    </q-item>
                    <q-item
                      v-if="row.status === 'pending'"
                      clickable
                      v-close-popup
                      @click.stop="$emit('approve', row)"
                      class="dropdown-item"
                    >
                      <q-item-section avatar
                        ><q-icon name="check" size="16px" color="positive"
                      /></q-item-section>
                      <q-item-section>Approve</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
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
  requests: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  selectedIds: { type: Set, default: () => new Set() },
  submitting: { type: Set, default: () => new Set() },
  editableHours: { type: Object, default: () => ({}) },
  statusFilter: { type: String, default: 'all' },
})

defineEmits([
  'update:status-filter',
  'toggle-selection',
  'toggle-select-all',
  'clear-selection',
  'view-detail',
  'approve',
  'bulk-approve',
  'update:editable-hours',
])

const statusColor = (s) =>
  ({ pending: 'warning', approved: 'positive', rejected: 'negative' })[s] || 'grey'
const statusLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'N/A')

const allSelected = computed(() => {
  const actionable = props.requests.filter((r) => r.status === 'pending').map((r) => r.id)
  return actionable.length > 0 && actionable.every((id) => props.selectedIds.has(id))
})
</script>

<style scoped>
/* ==============================
   OVERTIME EXPANDED PANEL
   (matches PayrollEmployeePanel design)
   ============================== */
.overtime-panel {
  background: #f4f7fb;
  border-top: 1px solid #dde3ec;
  border-left: 4px solid #3b82f6;
  margin-left: 0;
}

.overtime-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 20px;
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
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.overtime-status-filter {
  min-width: 160px;
  max-width: 200px;
}

.select-all-checkbox {
  font-size: 13px;
}

.overtime-panel-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  font-size: 13px;
  color: #6b7280;
}

.overtime-panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 8px;
  text-align: center;
}

.empty-title {
  font-size: 15px;
  font-weight: 500;
  color: #334155;
}

.empty-subtitle {
  font-size: 13px;
  color: #94a3b8;
}

/* ==============================
   OVERTIME FLEX TABLE
   (matches PayrollEmployeePanel table design)
   ============================== */
.overtime-table-container {
  width: 100%;
  overflow: hidden;
  overflow-x: auto;
}

.overtime-table-header {
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

.overtime-th {
  padding: 0 12px;
  text-align: left;
  font-size: 11px;
  color: #475569;
  letter-spacing: 0.07em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.overtime-th:nth-child(1) {
  flex: 0 0 44px;
  padding: 0;
  text-align: center;
}
.overtime-th:nth-child(2) {
  flex: 3 1 220px;
}
.overtime-th:nth-child(3) {
  flex: 1.5 1 120px;
}
.overtime-th:nth-child(4) {
  flex: 0 0 110px;
  text-align: center;
}
.overtime-th:nth-child(5) {
  flex: 0 0 100px;
  text-align: center;
}
.overtime-th:nth-child(6) {
  flex: 0 0 100px;
  text-align: center;
}

.overtime-table-row {
  display: flex;
  padding: 16px 20px;
  border-bottom: 1px solid #edf0f4;
  transition: background-color 0.15s ease;
  min-height: 72px;
  align-items: center;
  min-width: 700px;
}

.overtime-table-row:hover {
  background-color: #f8fafc;
}

.overtime-table-row.selected-row {
  background-color: #eff6ff;
}

.overtime-td {
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

.overtime-td:nth-child(1) {
  flex: 0 0 44px;
  justify-content: center;
  padding: 0;
}
.overtime-td:nth-child(2) {
  flex: 3 1 220px;
}
.overtime-td:nth-child(3) {
  flex: 1.5 1 120px;
}
.overtime-td:nth-child(4) {
  flex: 0 0 110px;
  justify-content: center;
}
.overtime-td:nth-child(5) {
  flex: 0 0 100px;
  justify-content: center;
}
.overtime-td:nth-child(6) {
  flex: 0 0 100px;
  justify-content: center;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.employee-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.employee-id {
  font-size: 11.5px;
  color: #94a3b8;
  font-family: monospace;
  letter-spacing: 0.02em;
}

.employee-cell {
  min-width: 200px;
}

.date-text {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

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

.cto-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  background: #e0f2fe;
  color: #0369a1;
  margin-left: 6px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}

.menu-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 6px !important;
  color: #6b7280 !important;
  transition: background-color 0.15s ease;
}

.menu-btn:hover {
  background: #f3f4f6 !important;
}

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

.dropdown-item:hover {
  background: #f9fafb !important;
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

.hours-input {
  max-width: 90px;
}

.hours-input :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  padding: 0 8px;
}

.hours-input :deep(.q-field__native) {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.hours-cell-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ==============================
   Responsive overrides
   ============================== */
@media (max-width: 1024px) {
  .overtime-table-header,
  .overtime-table-row {
    min-width: 720px;
  }
}

@media (max-width: 768px) {
  .overtime-panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
  }
  .employees-panel-actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 6px;
  }
  .overtime-table-header,
  .overtime-table-row {
    min-width: 600px;
  }
}

@media (max-width: 480px) {
  .overtime-panel-header {
    flex-direction: column;
    align-items: stretch;
    padding: 8px 10px;
  }
  .employees-panel-actions {
    width: 100%;
  }
  .overtime-status-filter {
    max-width: 100%;
    width: 100%;
  }
  .employees-panel-actions .q-field {
    width: 100%;
  }
  .overtime-table-header,
  .overtime-table-row {
    min-width: 580px;
  }
}
</style>
