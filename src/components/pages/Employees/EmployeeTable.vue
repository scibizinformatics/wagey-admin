<template>
  <div class="table-section">
    <!-- Employee Table -->
    <div class="modern-table-container">
      <q-table
        :rows="employees"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        no-data-label="No employees found"
        class="loan-table"
        hide-pagination
        :rows-per-page-options="[0]"
        selection="multiple"
        :selected="selected"
        @update:selected="(val) => $emit('update:selected', val)"
      >
        <template v-slot:header="props">
          <q-tr class="table-header-row">
            <q-th auto-width>
              <q-checkbox
                :model-value="props.selected"
                :indeterminate="props.selected === 'some'"
                @update:model-value="
                  () => $emit('update:selected', selected.length > 0 ? [] : [...employees])
                "
                size="sm"
              />
            </q-th>
            <q-th key="name" :props="props" class="table-header-cell">Employee</q-th>
            <q-th key="role" :props="props" class="table-header-cell">Role</q-th>
            <q-th key="status" :props="props" class="table-header-cell">Status</q-th>
            <q-th
              v-for="(lt, idx) in visibleLeaveTypes"
              :key="`leave_${idx}`"
              :props="props"
              class="table-header-cell leave-header-cell"
            >
              {{ lt.name || `Leave ${idx + 1}` }}
            </q-th>
            <q-th key="ctoBalance" :props="props" class="table-header-cell">CTO</q-th>
            <q-th key="contract" :props="props" class="table-header-cell">Contract</q-th>
            <q-th key="actions" :props="props" class="table-header-cell table-header-actions"
              >Actions</q-th
            >
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr class="table-body-row">
            <q-td auto-width>
              <q-checkbox v-model="props.selected" :val="props.row" size="sm" />
            </q-td>
            <!-- Employee name + avatar + email merged cell -->
            <q-td key="name" :props="props" class="table-body-cell employee-name-cell">
              <div class="employee-info">
                <q-avatar
                  size="34px"
                  v-if="props.row.user?.picture_url"
                  class="clickable-avatar"
                  @click="$emit('view-photo', props.row)"
                >
                  <img
                    :src="props.row.user.picture_url"
                    :alt="getFullName(props.row)"
                    @error="handleImageError"
                  />
                </q-avatar>
                <q-avatar
                  v-else
                  size="34px"
                  class="avatar-fallback clickable-avatar"
                  @click="$emit('view-photo', props.row)"
                >
                  {{ getInitials(getFullName(props.row)) }}
                </q-avatar>
                <div class="employee-name-block">
                  <span class="employee-name">{{ getFullName(props.row) }}</span>
                  <a :href="`mailto:${getEmail(props.row)}`" class="email-link">
                    {{ getEmail(props.row) }}
                  </a>
                </div>
              </div>
            </q-td>

            <q-td key="role" :props="props" class="table-body-cell">
              <span class="role-chip">{{ getRole(props.row) }}</span>
            </q-td>

            <q-td key="status" :props="props" class="table-body-cell">
              <div :class="['status-badge', getStatusClass(props.row)]">
                <span class="status-dot"></span>
                {{ getStatus(props.row) }}
              </div>
            </q-td>

            <q-td
              v-for="(lt, idx) in visibleLeaveTypes"
              :key="`leave_${idx}`"
              :props="props"
              class="table-body-cell leave-cell"
            >
              <q-skeleton
                v-if="isLoadingBalance(props.row)"
                type="text"
                style="width: 40px; height: 16px"
                class="skeleton-inline"
              />
              <span v-else class="balance-text">{{ getLeaveBalanceForType(props.row, lt.id) }}</span>
            </q-td>

            <q-td key="ctoBalance" :props="props" class="table-body-cell">
              <q-skeleton
                v-if="isLoadingBalance(props.row)"
                type="text"
                style="width: 40px; height: 16px"
                class="skeleton-inline"
              />
              <span v-else class="balance-text">{{ getCtoBalance(props.row) }}</span>
            </q-td>

            <q-td key="contract" :props="props" class="table-body-cell">
              <q-skeleton
                v-if="isLoadingContract(props.row)"
                type="text"
                style="width: 60px; height: 16px"
                class="skeleton-inline"
              />
              <span
                v-else
                :class="[
                  'contract-badge',
                  getContract(props.row) === 'No Contract' ? 'contract-none' : 'contract-active',
                ]"
              >
                {{ getContract(props.row) }}
              </span>
            </q-td>

            <!-- Actions: ⋯ dropdown -->
            <q-td key="actions" :props="props" class="table-body-cell actions-cell">
              <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                  <q-list dense style="min-width: 150px">
                    <q-item
                      clickable
                      v-close-popup
                      @click="$emit('view', props.row)"
                      class="dropdown-item"
                    >
                      <q-item-section avatar
                        ><q-icon name="visibility" size="16px"
                      /></q-item-section>
                      <q-item-section>View details</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="$emit('edit', props.row)"
                      :disable="getStatus(props.row) === 'Terminated'"
                      class="dropdown-item"
                    >
                      <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
                      <q-item-section>Edit</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="$emit('assign', props.row)"
                      :disable="getStatus(props.row) === 'Terminated'"
                      class="dropdown-item"
                    >
                      <q-item-section avatar
                        ><q-icon name="assignment" size="16px"
                      /></q-item-section>
                      <q-item-section>{{
                        getContract(props.row) !== 'No Contract'
                          ? 'Renew Payroll Profile'
                          : 'Assign Payroll Profile'
                      }}</q-item-section>
                    </q-item>
                    <q-item
                      v-if="getStatus(props.row) !== 'Terminated'"
                      clickable
                      v-close-popup
                      @click="$emit('add-leave-balance', props.row)"
                      class="dropdown-item"
                    >
                      <q-item-section avatar
                        ><q-icon name="event_note" size="16px" color="primary"
                      /></q-item-section>
                      <q-item-section>Add Leave Balance</q-item-section>
                    </q-item>
                    <q-item
                      v-if="getStatus(props.row) !== 'Terminated'"
                      clickable
                      v-close-popup
                      @click="$emit('add-cto-balance', props.row)"
                      class="dropdown-item"
                    >
                      <q-item-section avatar
                        ><q-icon name="more_time" size="16px" color="secondary"
                      /></q-item-section>
                      <q-item-section>Add CTO Balance</q-item-section>
                    </q-item>
                    <q-separator v-if="getStatus(props.row) !== 'Terminated'" />
                    <q-item
                      v-if="getStatus(props.row) !== 'Terminated'"
                      clickable
                      v-close-popup
                      @click="$emit('terminate', props.row)"
                      class="dropdown-item dropdown-item-danger"
                    >
                      <q-item-section avatar><q-icon name="block" size="16px" /></q-item-section>
                      <q-item-section>Terminate</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>
          </q-tr>
        </template>

        <!-- Empty state (only shown when not loading) -->
        <template v-slot:no-data>
          <div v-if="!loading" class="empty-state">
            <q-icon name="group_off" size="48px" class="empty-state-icon" />
            <div class="empty-state-title">No employees found</div>
            <div class="empty-state-sub">Try adjusting your search or filters.</div>
          </div>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  employees: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  contracts: { type: Object, default: () => ({}) },
  companyId: { type: [Number, String], default: null },
  selected: { type: Array, default: () => [] },
  leaveTypes: { type: Array, default: () => [] },
  loadingContractIds: { type: Object, default: () => new Set() },
  loadingBalanceIds: { type: Object, default: () => new Set() },
})

defineEmits(['update:selected', 'view', 'edit', 'assign', 'terminate', 'restore', 'view-photo', 'add-leave-balance', 'add-cto-balance'])

const visibleLeaveTypes = computed(() =>
  props.leaveTypes
    .filter((lt) => !lt.name?.toLowerCase().includes('unpaid'))
    .slice(0, 3),
)

/* ─── Helper Functions ─────────────────────────────────────────────────────── */

const getFullName = (employee) => {
  if (!employee) return 'N/A'
  return (
    `${employee.user?.first_name || ''} ${employee.user?.last_name || ''}`.trim() ||
    employee.user?.username ||
    'N/A'
  )
}

const getEmail = (employee) => employee?.user?.email || 'N/A'

const getRole = (employee) => {
  if (!employee) return 'N/A'
  if (employee.user_role_name) return String(employee.user_role_name)
  if (employee.user_role?.name) return String(employee.user_role.name)
  if (employee.companies?.length > 0) {
    const role = employee.companies[0].user_role
    return role?.name ? String(role.name) : 'N/A'
  }
  return 'N/A'
}

const getStatus = (employee) => {
  if (!employee) return 'N/A'
  if (employee.status?.toLowerCase() === 'terminated') return 'Terminated'
  if (employee.is_active === false) return 'Terminated'
  const empStatus = employee.companies?.[0]?.employment_status
  if (empStatus?.toLowerCase() === 'terminated') return 'Terminated'
  return 'Active'
}

const getContract = (employee) => {
  if (!employee) return 'N/A'
  if (!props.companyId) return 'N/A'

  // Get contract for current company
  const companyContracts = props.contracts[props.companyId]
  if (!companyContracts) return 'No Contract'

  const contract = companyContracts[employee.id]
  if (!contract) return 'No Contract'

  // Handle array response (API returns array of contracts)
  if (Array.isArray(contract) && contract.length > 0) {
    return contract[0].pay_type
  }
  // Handle single contract object (direct contract object with pay_type)
  if (contract?.pay_type) {
    return contract.pay_type
  }
  // Handle nested format (contract inside companies)
  if (contract?.contract?.name) {
    return contract.contract.name
  }
  // Handle empty response (contract was deleted/unassigned)
  if (contract === null || (contract && Object.keys(contract).length === 0)) {
    return 'No Contract'
  }
  return 'No Contract'
}

const getStatusClass = (employee) => {
  const status = getStatus(employee)
  if (status === 'Active') return 'status-active'
  if (status === 'Terminated') return 'status-terminated'
  return 'status-default'
}

const getInitials = (name) =>
  name && name !== 'N/A'
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

const handleImageError = (event) => {
  event.target.src = ''
  event.target.style.display = 'none'
}

const getLeaveBalanceForType = (employee, leaveTypeId) => {
  const balances = employee?._balance?.leaveBalances || []
  const match = balances.find(
    (b) => b.leave_type_id === leaveTypeId || b.id === leaveTypeId,
  )
  if (!match) return '\u2014'
  return match.balance ?? match.days ?? match.hours ?? 0
}

const getCtoBalance = (employee) => {
  let cto = employee?._balance?.ctoBalance
  if (cto === null || cto === undefined || cto === '') return '\u2014'

  // Handle object response: { remaining: "7.00", ... }
  if (typeof cto === 'object') {
    cto = cto.remaining ?? cto.hours ?? null
  }

  return cto !== null && cto !== undefined ? `${cto}h` : '\u2014'
}

const isLoadingContract = (employee) => props.loadingContractIds.has(employee.id)
const isLoadingBalance = (employee) => props.loadingBalanceIds.has(employee.id)

const columns = computed(() => [
  { name: 'name', label: 'Employee', field: (row) => getFullName(row), align: 'left', style: 'width: 200px; min-width: 200px' },
  { name: 'role', label: 'Role', field: (row) => getRole(row), align: 'left', style: 'width: 120px; min-width: 120px' },
  { name: 'status', label: 'Status', field: (row) => getStatus(row), align: 'left', style: 'width: 100px; min-width: 100px' },
  ...visibleLeaveTypes.value.map((lt, idx) => ({
    name: `leave_${idx}`,
    label: lt.name || `Leave ${idx + 1}`,
    field: (row) => getLeaveBalanceForType(row, lt.id),
    align: 'left',
    style: 'width: 110px; min-width: 110px',
  })),
  { name: 'ctoBalance', label: 'CTO', field: (row) => getCtoBalance(row), align: 'left', style: 'width: 70px; min-width: 70px' },
  { name: 'contract', label: 'Contract', field: (row) => getContract(row), align: 'left', style: 'width: 100px; min-width: 100px' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center', style: 'width: 60px; min-width: 60px' },
])
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

.table-title {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.modern-table-container {
  overflow-x: auto;
  position: relative;
}

.loan-table {
  width: 100%;
  min-width: 700px;
}

.loan-table,
.loan-table :deep(.q-table__container),
.loan-table :deep(.q-table__card),
.loan-table.q-table__container,
.loan-table :deep(.q-table__bottom-border),
.loan-table :deep(.q-table__top),
.loan-table :deep(.q-table__bottom),
.loan-table :deep(.q-table) {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* ── Table header ── */
.table-header-row {
  background: #f8fafc;
}

.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #94a3b8 !important;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 14px !important;
  border-bottom: 1px solid #f1f3f5 !important;
}

.table-header-actions {
  text-align: center !important;
}

/* ── Table body ── */
.table-body-row {
  transition: background 0.12s ease;
}

.table-body-row:hover .table-body-cell {
  background: #f8fafc;
}

.table-body-row:last-child .table-body-cell {
  border-bottom: none !important;
}

.table-body-cell {
  font-size: 13px;
  color: #334155;
  padding: 9px 14px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle;
}

/* ── Employee cell ── */
.employee-name-cell {
  min-width: 200px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-name-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.employee-name {
  font-weight: 500;
  color: #0f172a;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-link {
  font-size: 11px;
  color: #94a3b8;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-link:hover {
  color: #6366f1;
  text-decoration: underline;
}

/* ── Avatar ── */
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
}

.avatar-fallback :deep(.q-avatar__content) {
  font-size: 11px !important;
  line-height: 1 !important;
  font-weight: 600 !important;
}

.clickable-avatar {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.clickable-avatar:hover {
  transform: scale(1.08);
}

/* ── Role chip ── */
.role-chip {
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

/* ── Position / department text ── */
.position-text,
.department-text {
  color: #64748b;
  font-size: 13px;
}

/* ── Status badge ── */
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

.status-active {
  background: #d1fae5;
  color: #065f46;
}

.status-active .status-dot {
  background: #10b981;
}

.status-terminated {
  background: #fee2e2;
  color: #991b1b;
}

.status-terminated .status-dot {
  background: #f87171;
}

.status-default {
  background: #f1f5f9;
  color: #64748b;
}

.status-default .status-dot {
  background: #94a3b8;
}

/* ── Balance text ── */
.balance-text {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

/* ── Leave columns ── */
.leave-header-cell {
  width: 110px;
  min-width: 110px;
}
.leave-cell {
  width: 110px;
  min-width: 110px;
}

/* ── Contract badge ── */
.contract-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  text-transform: capitalize;
}

.contract-active {
  background: #eef2ff;
  color: #3730a3;
}

.contract-none {
  background: #f8fafc;
  color: #94a3b8;
  border: 1px solid #e2e8f0;
  font-weight: 500;
}

/* ── Actions ── */
.actions-cell {
  text-align: center !important;
  width: 60px;
}

.action-menu-btn {
  color: #94a3b8 !important;
  border-radius: 8px !important;
}

.action-menu-btn:hover {
  background: #f1f5f9 !important;
  color: #334155 !important;
}

.action-dropdown {
  border-radius: 10px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08) !important;
}

.dropdown-item {
  font-size: 13px !important;
  color: #334155 !important;
  min-height: 36px !important;
  padding: 0 12px !important;
  border-radius: 6px !important;
}

.dropdown-item:hover {
  background: #f8fafc !important;
}

.dropdown-item-danger {
  color: #dc2626 !important;
}

.dropdown-item-danger:hover {
  background: #fef2f2 !important;
}

.dropdown-item-restore {
  color: #16a34a !important;
}

.dropdown-item-restore:hover {
  background: #f0fdf4 !important;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 60px 20px;
  text-align: center;
}

.empty-state-icon {
  color: #cbd5e1;
  margin-bottom: 14px;
}

.empty-state-title {
  font-size: 15px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 6px;
}

.empty-state-sub {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 16px;
}

@media (max-width: 1440px) {
  .loan-table {
    min-width: 680px;
  }
}

@media (max-width: 1024px) {
  .modern-table-container {
    overflow-x: auto;
  }

  .loan-table {
    min-width: 640px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 8px 12px !important;
  }

  .employee-name-cell {
    min-width: 170px;
  }
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .modern-table-container {
    overflow-x: auto;
  }

  .loan-table {
    min-width: 600px;
  }
}

@media (max-width: 480px) {
  .table-header-cell,
  .table-body-cell {
    padding: 10px 12px !important;
    font-size: 12px;
  }
}

.skeleton-inline {
  display: inline-block;
  border-radius: 4px;
}
</style>
