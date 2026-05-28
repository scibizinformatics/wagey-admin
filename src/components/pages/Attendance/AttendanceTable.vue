<template>
  <div class="table-section">
    <div class="table-header">
      <h2 class="table-title">Attendance Overview</h2>
      <div class="table-actions">
        <q-btn flat round icon="refresh" class="header-btn" @click="$emit('refresh')" />
        <q-select
          dense
          outlined
          label="Filter by Cost Center"
          :model-value="costCenterFilter"
          @update:model-value="$emit('update:costCenterFilter', $event)"
          :options="costCenterOptions"
          :loading="optionsLoading"
          class="site-filter-dropdown"
          clearable
          map-options
          emit-value
          behavior="menu"
          menu-anchor="bottom left"
          menu-self="top left"
          style="min-width: 180px"
        >
          <template v-slot:prepend>
            <q-icon name="account_balance_wallet" />
          </template>
        </q-select>
      </div>
    </div>

    <div class="modern-table-container">
      <div class="table-wrapper">
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="id"
          flat
          :loading="loading"
          class="attendance-table"
          hide-pagination
          :rows-per-page-options="[0]"
          :grid="$q.screen.xs"
          table-header-class="table-header-custom"
          separator="none"
        >
          <template v-slot:item="props" v-if="$q.screen.xs">
            <div class="q-pa-xs col-xs-12 col-sm-6 col-md-4">
              <q-card class="mobile-card">
                <q-card-section>
                  <div class="mobile-employee">{{ getEmployeeName(props.row.employee) }}</div>
                  <div class="mobile-date">{{ props.row.date }}</div>
                </q-card-section>
                <q-card-section class="q-pt-none">
                  <div class="mobile-details">
                    Time In: {{ formatTime(props.row.time_in) }}<br />
                    Time Out: {{ formatTime(props.row.time_out) }}<br />
                    Source: {{ formatSource(props.row.source) }}
                  </div>
                  <div class="mobile-selfies q-mt-md">
                    <div v-if="props.row.time_in_selfie" class="mobile-selfie-item">
                      <span class="mobile-selfie-label">Time In Photo:</span>
                      <img
                        :src="props.row.time_in_selfie"
                        alt="Time In"
                        class="mobile-selfie-img"
                        loading="lazy"
                        @click="$emit('view-selfie', props.row.time_in_selfie, 'Time In')"
                      />
                    </div>
                    <div v-if="props.row.time_out_selfie" class="mobile-selfie-item">
                      <span class="mobile-selfie-label">Time Out Photo:</span>
                      <img
                        :src="props.row.time_out_selfie"
                        alt="Time Out"
                        class="mobile-selfie-img"
                        loading="lazy"
                        @click="$emit('view-selfie', props.row.time_out_selfie, 'Time Out')"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </template>

          <template v-slot:header="props">
            <q-tr :props="props" class="table-header-row">
              <q-th key="employee" :props="props" class="table-header-cell employee-col">Employee</q-th>
              <q-th key="work_type" :props="props" class="table-header-cell employment-status-col">Work Type</q-th>
              <q-th key="cost_center" :props="props" class="table-header-cell cost-center-col">Cost Center</q-th>
              <q-th key="time_in" :props="props" class="table-header-cell time-col">Time In</q-th>
              <q-th key="time_in_photo" :props="props" class="table-header-cell photo-col">Photo</q-th>
              <q-th key="time_in_source" :props="props" class="table-header-cell source-mini-col">In Source</q-th>
              <q-th key="time_out" :props="props" class="table-header-cell time-col">Time Out</q-th>
              <q-th key="time_out_photo" :props="props" class="table-header-cell photo-col">Photo</q-th>
              <q-th key="time_out_source" :props="props" class="table-header-cell source-mini-col">Out Source</q-th>
            </q-tr>
          </template>

          <template v-slot:body="props">
            <q-tr :props="props" class="table-body-row">
              <q-td key="employee" :props="props" class="table-body-cell employee-col">
                <div class="employee-info">
                  <q-avatar
                    size="32px"
                    class="employee-avatar clickable-avatar"
                    @click="$emit('view-photo', props.row.employee)"
                  >
                    <img
                      v-if="getEmployeePhoto(props.row.employee)"
                      :src="getEmployeePhoto(props.row.employee)"
                      alt="Employee Photo"
                      class="avatar-image"
                      loading="lazy"
                    />
                    <span v-else class="avatar-initials">
                      {{ getEmployeeName(props.row.employee).charAt(0) }}
                    </span>
                  </q-avatar>
                  <span class="employee-name">{{ getEmployeeName(props.row.employee) }}</span>
                </div>
              </q-td>
              <q-td key="work_type" :props="props" class="table-body-cell employment-status-col">
                <div
                  v-if="props.row.work_type"
                  class="employment-status-badge"
                  :class="getEmploymentStatusClass(props.row.work_type)"
                >
                  {{ props.row.work_type }}
                </div>
                <span v-else class="no-photo">-</span>
              </q-td>
              <q-td key="cost_center" :props="props" class="table-body-cell cost-center-col">
                <div
                  class="cost-center-badge time-editable"
                  @click="$emit('edit-cost-center', props.row)"
                  title="Click to edit cost center"
                >
                  <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                    <div style="display: flex; align-items: center;">
                      <q-icon name="account_balance_wallet" size="12px" class="q-mr-xs" />
                      {{ getCostCenterName(props.row.cost_center) || 'None' }}
                      <q-icon name="edit" size="10px" class="edit-icon q-ml-xs" />
                    </div>
                    <div
                      v-if="props.row.site"
                      style="display: flex; align-items: center; font-size: 11px; color: #6b7280;"
                    >
                      <q-icon name="location_on" size="11px" class="q-mr-xs" />
                      {{ getSiteName(props.row.site) }}
                    </div>
                  </div>
                </div>
              </q-td>
              <q-td key="time_in" :props="props" class="table-body-cell time-col">
                <div
                  class="time-badge time-in"
                  :class="{ 'has-time': props.row.time_in, 'time-editable': true }"
                  @click="$emit('edit-time', props.row, 'time_in')"
                  title="Click to edit"
                >
                  {{ props.row.time_in ? formatTime(props.row.time_in) : '--:--' }}
                  <q-icon name="edit" size="10px" class="edit-icon q-ml-xs" />
                </div>
              </q-td>
              <q-td key="time_in_photo" :props="props" class="table-body-cell photo-col">
                <div class="selfie-container">
                  <img
                    v-if="props.row.time_in_selfie"
                    :src="props.row.time_in_selfie"
                    alt="Time In Selfie"
                    class="selfie-thumbnail"
                    loading="lazy"
                    @click="$emit('view-selfie', props.row.time_in_selfie, 'Time In')"
                  />
                  <span v-else class="no-photo">-</span>
                </div>
              </q-td>
              <q-td key="time_in_source" :props="props" class="table-body-cell source-mini-col">
                <div
                  class="source-mini-badge"
                  :class="getSourceClass(props.row.time_in_source || props.row.source)"
                >
                  {{ formatSource(props.row.time_in_source || props.row.source) }}
                </div>
              </q-td>
              <q-td key="time_out" :props="props" class="table-body-cell time-col">
                <div
                  class="time-badge time-out"
                  :class="{ 'has-time': props.row.time_out, 'time-editable': true }"
                  @click="$emit('edit-time', props.row, 'time_out')"
                  title="Click to edit"
                >
                  {{ props.row.time_out ? formatTime(props.row.time_out) : '--:--' }}
                  <q-icon name="edit" size="10px" class="edit-icon q-ml-xs" />
                </div>
              </q-td>
              <q-td key="time_out_photo" :props="props" class="table-body-cell photo-col">
                <div class="selfie-container">
                  <img
                    v-if="props.row.time_out_selfie"
                    :src="props.row.time_out_selfie"
                    alt="Time Out Selfie"
                    class="selfie-thumbnail"
                    loading="lazy"
                    @click="$emit('view-selfie', props.row.time_out_selfie, 'Time Out')"
                  />
                  <span v-else class="no-photo">-</span>
                </div>
              </q-td>
              <q-td key="time_out_source" :props="props" class="table-body-cell source-mini-col">
                <div
                  v-if="props.row.time_out"
                  class="source-mini-badge"
                  :class="getSourceClass(props.row.time_out_source || props.row.source)"
                >
                  {{ formatSource(props.row.time_out_source || props.row.source) }}
                </div>
                <span v-else class="no-photo">-</span>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </div>

      <div class="table-footer">
        <div class="footer-info">
          <span class="total-label">Total</span>
          <span class="total-records">{{ rows.length }} Records</span>
        </div>
        <div class="pagination-controls">
          <q-btn
            flat
            icon="chevron_left"
            class="pagination-btn"
            :disable="page === 1"
            @click="$emit('prev-page')"
          />
          <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
          <q-btn
            flat
            icon="chevron_right"
            class="pagination-btn"
            :disable="page === totalPages"
            @click="$emit('next-page')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar';

const $q = useQuasar();

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  costCenterFilter: { type: [String, Number], default: '' },
  costCenterOptions: { type: Array, default: () => [] },
  optionsLoading: { type: Boolean, default: false },
  employees: { type: Array, default: () => [] },
});

defineEmits([
  'refresh',
  'update:costCenterFilter',
  'view-selfie',
  'view-photo',
  'edit-time',
  'edit-cost-center',
  'prev-page',
  'next-page',
]);

const columns = [
  { name: 'employee', label: 'Employee', align: 'left', field: 'employee', sortable: true },
  { name: 'work_type', label: 'Work Type', align: 'left', field: 'work_type', sortable: true },
  { name: 'cost_center', label: 'Cost Center', align: 'left', field: 'cost_center', sortable: false },
  { name: 'time_in', label: 'Time In', align: 'center', field: 'time_in', sortable: true },
  { name: 'time_in_photo', label: 'Photo', align: 'center', field: 'time_in_selfie', sortable: false },
  { name: 'time_in_source', label: 'In Source', align: 'center', field: 'source', sortable: false },
  { name: 'time_out', label: 'Time Out', align: 'center', field: 'time_out', sortable: true },
  { name: 'time_out_photo', label: 'Photo', align: 'center', field: 'time_out_selfie', sortable: false },
  { name: 'time_out_source', label: 'Out Source', align: 'center', field: 'source', sortable: false },
];

function getSiteName(site) {
  if (!site) return '';
  let name = typeof site === 'object' ? site.name || site.site_name || site.title || '' : String(site);
  name = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  const dashIndex = name.indexOf('-');
  return dashIndex !== -1 ? name.substring(0, dashIndex).trim() : name;
}

function getCostCenterName(costCenter) {
  if (!costCenter) return '';
  if (typeof costCenter === 'object') return costCenter.name || costCenter.cost_center_name || '';
  return String(costCenter);
}

function getEmployeeName(employee) {
  if (!employee) return 'Unknown Employee';
  if (typeof employee === 'number' || typeof employee === 'string') {
    const found = props.employees.find((emp) => emp.id === employee || emp.id === parseInt(employee));
    if (found) {
      const fullName = `${found.first_name || found.firstName || ''} ${found.last_name || found.lastName || ''}`.trim();
      return fullName || found.name || found.username || found.email || 'Unknown Employee';
    }
    return `Employee #${employee}`;
  }
  if (typeof employee === 'object') {
    const fullName = `${employee.first_name || employee.firstName || employee.firstname || ''} ${employee.last_name || employee.lastName || employee.lastname || ''}`.trim();
    return fullName || employee.name || employee.fullName || employee.full_name || employee.username || employee.email || 'Unknown Employee';
  }
  return 'Unknown Employee';
}

function getEmployeePhoto(employee) {
  if (!employee) return null;
  if (typeof employee === 'object') {
    return employee.photo || employee.image || employee.profile_picture || employee.profile_photo || employee.avatar || employee.picture || null;
  }
  const found = props.employees.find((emp) => emp.id === employee || emp.uuid === employee);
  return found ? found.photo || found.image || found.profile_picture || found.profile_photo || found.avatar || found.picture || null : null;
}

function getSourceClass(source) {
  switch (source) {
    case 'qr_scan': return 'source-qr';
    case 'manual': return 'source-manual';
    case 'auto_login': return 'source-auto';
    default: return 'source-default';
  }
}

function getEmploymentStatusClass(status) {
  if (!status) return '';
  switch (status.toLowerCase()) {
    case 'regular': return 'employment-status-regular';
    case 'probationary': return 'employment-status-probationary';
    case 'contractual': return 'employment-status-contractual';
    case 'part-time': return 'employment-status-parttime';
    default: return 'employment-status-default';
  }
}

function formatSource(source) {
  if (!source) return '-';
  return source.replace('_', ' ').toUpperCase();
}

function formatTime(dateTimeString) {
  if (!dateTimeString) return '-';
  try {
    return new Date(dateTimeString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '-';
  }
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
.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.header-btn {
  color: #6b7280 !important;
  width: 36px;
  height: 36px;
  border-radius: 8px !important;
}
.header-btn:hover { background: #f3f4f6 !important; }
.modern-table-container {
  overflow-x: auto;
  margin: 0 16px 16px 16px;
}
.table-wrapper { overflow-x: visible; overflow-y: visible; }
.attendance-table {
  background: white;
  width: 100%;
  table-layout: fixed;
}
.attendance-table :deep(.q-table__bottom-border),
.attendance-table :deep(thead tr:last-child th),
.attendance-table :deep(.q-table__top),
.attendance-table :deep(.q-table__bottom) { border: none !important; }
.attendance-table :deep(.q-table) { border-bottom: none !important; }
.employee-col { width: 15%; }
.cost-center-col { width: 10%; }
.time-col { width: 9%; }
.photo-col { width: 6%; }
.source-mini-col { width: 8%; }
.employment-status-col { width: 9%; }
.table-header-row { background: #f8fafc; }
.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #6b7280 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 11px 10px !important;
  border-bottom: 1px solid #e8ecf0 !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.table-body-row { transition: background 0.15s ease; }
.table-body-row:hover .table-body-cell { background: #f9fafb; }
.table-body-cell {
  font-size: 13px !important;
  color: #374151;
  padding: 10px 10px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.employee-info { display: flex; align-items: center; gap: 10px; }
.employee-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
  display: block;
}
.employee-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  font-size: 12px !important;
  flex-shrink: 0;
}
.clickable-avatar { cursor: pointer; transition: all 0.2s ease; border: 2px solid transparent; }
.clickable-avatar:hover { transform: scale(1.1); border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
.avatar-image { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.avatar-initials { font-weight: 600; font-size: 14px; }
.time-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  background: #f1f5f9;
  color: #64748b;
  white-space: nowrap;
  min-width: 80px;
}
.time-badge.has-time.time-in { background: #dcfce7; color: #166534; }
.time-badge.has-time.time-out { background: #fef2f2; color: #991b1b; }
.time-editable { cursor: pointer; transition: all 0.15s ease; user-select: none; }
.time-editable:hover { filter: brightness(0.93); transform: scale(1.04); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); }
.edit-icon { opacity: 1; transition: opacity 0.15s ease; color: inherit; }
.selfie-container { display: flex; justify-content: center; align-items: center; }
.selfie-thumbnail {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  object-fit: cover;
  cursor: pointer;
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease;
}
.selfie-thumbnail:hover { transform: scale(1.1); border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
.no-photo { font-size: 13px; color: #94a3b8; font-weight: 500; }
.source-mini-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.source-qr { background: #f3e8ff; color: #7c3aed; }
.source-manual { background: #dbeafe; color: #2563eb; }
.source-auto { background: #dcfce7; color: #16a34a; }
.source-default { background: #f1f5f9; color: #64748b; }
.cost-center-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}
.employment-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}
.employment-status-regular { background: #d1fae5; color: #065f46; }
.employment-status-probationary { background: #fef3c7; color: #92400e; }
.employment-status-contractual { background: #dbeafe; color: #1e40af; }
.employment-status-parttime { background: #ede9fe; color: #5b21b6; }
.employment-status-default { background: #f1f5f9; color: #475569; }
.table-footer {
  background: #f8fafc;
  padding: 14px 16px;
  border-top: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.footer-info { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.total-label { font-size: 13px; font-weight: 600; color: #ef4444; }
.total-records { font-size: 13px; font-weight: 600; color: #374151; }
.pagination-controls { display: flex; align-items: center; gap: 12px; }
.pagination-btn { color: #64748b; padding: 4px; width: 32px; height: 32px; }
.pagination-btn:hover:not(:disabled) { background: #f1f5f9; }
.page-info { font-size: 13px; color: #374151; font-weight: 500; }
.mobile-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}
.mobile-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.mobile-employee { font-size: 16px; font-weight: 600; color: #1a202c; }
.mobile-date { font-size: 14px; color: #64748b; margin-top: 4px; }
.mobile-details { font-size: 13px; color: #4b5563; line-height: 1.4; }
.mobile-selfies { display: flex; gap: 12px; flex-wrap: wrap; }
.mobile-selfie-item { display: flex; align-items: center; gap: 8px; }
.mobile-selfie-label { font-size: 12px; font-weight: 500; color: #64748b; }
.mobile-selfie-img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; cursor: pointer; border: 2px solid #e2e8f0; }
.mobile-selfie-img:hover { border-color: #3b82f6; }
@media (max-width: 1024px) {
  .table-header-cell { font-size: 11px; padding: 10px 4px; }
  .table-body-cell { font-size: 11px; padding: 8px 4px; }
  .modern-table-container { margin: 0 14px 14px 14px; }
}
@media (max-width: 768px) {
  .table-header { flex-direction: column; align-items: stretch; gap: 10px; }
  .table-actions { width: 100%; flex-direction: row; justify-content: space-between; }
  .modern-table-container { margin: 0 10px 10px 10px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .table-wrapper { overflow-x: visible; }
  .attendance-table { width: 100%; }
  .table-header-cell { font-size: 10px; padding: 8px 3px; white-space: normal; word-break: break-word; }
  .table-body-cell { font-size: 10px; padding: 7px 3px; }
  .selfie-thumbnail { width: 28px; height: 28px; }
  .employee-avatar { width: 26px !important; height: 26px !important; }
  .source-mini-badge { font-size: 9px; padding: 2px 4px; }
  .table-footer { flex-direction: column; align-items: stretch; gap: 10px; }
  .footer-info { justify-content: center; }
  .pagination-controls { justify-content: center; }
}
</style>
