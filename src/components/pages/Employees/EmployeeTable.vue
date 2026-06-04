<template>
  <div class="table-section">

    <!-- Employee Table -->
    <div class="modern-table-container">
      <!-- Centered loading spinner overlay -->
      <div v-if="loading" class="table-spinner-overlay">
        <q-spinner-oval color="primary" size="52px" />
      </div>
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
      >
        <!-- suppress default loading bar -->
        <template v-slot:loading></template>

        <template v-slot:header="props">
          <q-tr class="table-header-row">
            <q-th key="name" :props="props" class="table-header-cell">Employee</q-th>
            <q-th key="role" :props="props" class="table-header-cell">Role</q-th>
            <q-th key="status" :props="props" class="table-header-cell">Status</q-th>
            <q-th key="contract" :props="props" class="table-header-cell">Contract</q-th>
            <q-th key="actions" :props="props" class="table-header-cell table-header-actions">Actions</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr class="table-body-row">
            <!-- Employee name + avatar + email merged cell -->
            <q-td key="name" :props="props" class="table-body-cell employee-name-cell">
              <div class="employee-info">
                <q-avatar size="34px" v-if="props.row.user?.picture_url" class="clickable-avatar" @click="$emit('view-photo', props.row)">
                  <img
                    :src="props.row.user.picture_url"
                    :alt="getFullName(props.row)"
                    @error="handleImageError"
                  />
                </q-avatar>
                <q-avatar v-else size="34px" class="avatar-fallback clickable-avatar" @click="$emit('view-photo', props.row)">
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

            <q-td key="contract" :props="props" class="table-body-cell">
              <span
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
                    <q-item clickable v-close-popup @click="$emit('view', props.row)" class="dropdown-item">
                      <q-item-section avatar><q-icon name="visibility" size="16px" /></q-item-section>
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
                      <q-item-section avatar><q-icon name="assignment" size="16px" /></q-item-section>
                      <q-item-section>Assign Contract</q-item-section>
                    </q-item>
                    <q-separator />
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
                    <q-item
                      v-else
                      clickable
                      v-close-popup
                      @click="$emit('restore', props.row)"
                      class="dropdown-item dropdown-item-restore"
                    >
                      <q-item-section avatar><q-icon name="restore" size="16px" /></q-item-section>
                      <q-item-section>Restore</q-item-section>
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
const props = defineProps({
  employees: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  contracts: { type: Object, default: () => ({}) },
  companyId: { type: [Number, String], default: null },
})



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

const columns = [
  { name: 'name', label: 'Employee', field: (row) => getFullName(row), align: 'left' },
  { name: 'role', label: 'Role', field: (row) => getRole(row), align: 'left' },
  { name: 'status', label: 'Status', field: (row) => getStatus(row), align: 'left' },
  { name: 'contract', label: 'Contract', field: (row) => getContract(row), align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
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
}

.modern-table-container {
  overflow-x: auto;
  min-height: 420px;
  position: relative;
}

.loan-table {
  width: 100%;
  min-width: 700px;
}

/* Table header */
.table-header-row {
  background: #f8fafc;
}

.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #6b7280 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 11px 16px !important;
  border-bottom: 1px solid #e8ecf0 !important;
}

.table-header-actions {
  text-align: center !important;
}

/* Table body */
.table-body-row {
  transition: background 0.15s ease;
}

.table-body-row:hover .table-body-cell {
  background: #f9fafb;
}

.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle;
}

/* Employee info cell */
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
  gap: 1px;
  min-width: 0;
}

.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-link {
  font-size: 11px;
  color: #6b7280;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-link:hover {
  color: #3b82f6;
  text-decoration: underline;
}

/* Avatar fallback */
.avatar-fallback {
  background: #e0e7ff !important;
  color: #4338ca !important;
  font-weight: 600 !important;
  min-width: 34px !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}

.avatar-fallback :deep(.q-avatar__content) {
  font-size: 12px !important;
  line-height: 1 !important;
}

.clickable-avatar {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.clickable-avatar:hover {
  transform: scale(1.08);
}

/* Role chip */
.role-chip {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  white-space: nowrap;
}

/* Status badge */
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

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-active {
  background: #f0fdf4;
  color: #16a34a;
}

.status-active .status-dot {
  background: #22c55e;
}

.status-terminated {
  background: #fef2f2;
  color: #dc2626;
}

.status-terminated .status-dot {
  background: #ef4444;
}

.status-default {
  background: #f3f4f6;
  color: #6b7280;
}

.status-default .status-dot {
  background: #9ca3af;
}

/* Contract badge */
.contract-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.contract-active {
  background: #eff6ff;
  color: #2563eb;
}

.contract-none {
  background: #f3f4f6;
  color: #6b7280;
}

/* Action menu */
.actions-cell {
  text-align: center !important;
  width: 60px;
}

.action-menu-btn {
  color: #6b7280 !important;
  border-radius: 6px !important;
}

.action-menu-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
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

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 56px 20px;
  text-align: center;
}

.empty-state-icon {
  color: #d1d5db;
  margin-bottom: 12px;
}

.empty-state-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.empty-state-sub {
  font-size: 13px;
  color: #9ca3af;
  margin-bottom: 16px;
}

/* Table loading */
.table-spinner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background: rgba(255, 255, 255, 0.75);
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
    padding: 10px 10px !important;
    font-size: 12px;
  }
}
</style>
