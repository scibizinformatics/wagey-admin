<template>
  <div class="modern-table-container">
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      :loading="loading"
      no-data-label="No invitations found"
      class="loan-table"
      hide-pagination
      :rows-per-page-options="[0]"
    >
      <template v-slot:loading>
        <q-inner-loading showing color="primary" />
      </template>

      <template v-slot:header>
        <q-tr class="table-header-row">
          <q-th class="table-header-cell th-sl">#</q-th>
          <q-th class="table-header-cell th-email">Email Address</q-th>
          <q-th class="table-header-cell th-company">Company</q-th>
          <q-th class="table-header-cell th-role">Role</q-th>
          <q-th class="table-header-cell th-code">Invitation Code</q-th>
          <q-th class="table-header-cell th-status">Status</q-th>
          <q-th class="table-header-cell th-used">Used</q-th>
          <q-th class="table-header-cell th-created">Created</q-th>
          <q-th class="table-header-cell th-expires">Expires</q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr class="table-body-row">
          <q-td class="table-body-cell sl-cell td-sl">
            {{ String(props.rowIndex + 1).padStart(2, '0') }}.
          </q-td>

          <q-td class="table-body-cell email-name-cell td-email">
            <div class="employee-info">
              <q-avatar size="34px" class="avatar-fallback">
                {{ getInitials(props.row.email) }}
              </q-avatar>
              <span class="employee-name">{{ props.row.email }}</span>
            </div>
          </q-td>

          <q-td class="table-body-cell td-company">
            {{ props.row.company || 'N/A' }}
          </q-td>

          <q-td class="table-body-cell td-role">
            <span class="role-chip">{{ getRoleLabel(props.row.role ?? props.row.user_role) }}</span>
          </q-td>

          <q-td class="table-body-cell td-code">
            <code class="code-text">{{ props.row.code || 'N/A' }}</code>
          </q-td>

          <q-td class="table-body-cell td-status">
            <div :class="['status-badge', getStatusClass(props.row.status)]">
              <span class="status-dot"></span>
              {{ props.row.status || 'Pending' }}
            </div>
          </q-td>

          <q-td class="table-body-cell td-used">
            <div :class="['status-badge', props.row.is_used ? 'status-active' : 'status-unused']">
              <span class="status-dot"></span>
              {{ props.row.is_used ? 'Used' : 'Unused' }}
            </div>
          </q-td>

          <q-td class="table-body-cell td-created">
            {{ formatDate(props.row.created_at) }}
          </q-td>

          <q-td class="table-body-cell td-expires">
            {{ formatDate(props.row.expires_at) }}
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div class="empty-state">
          <q-icon name="mail_outline" size="48px" class="empty-state-icon" />
          <div class="empty-state-title">No invitations found</div>
          <div class="empty-state-sub">
            Try adjusting your search or send a new invitation.
          </div>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  userRoleOptions: { type: Array, default: () => [] },
})

defineEmits(['refresh'])

const columns = ref([
  { name: 'sl_no', label: '#', field: 'id', align: 'left' },
  { name: 'email', label: 'Email Address', field: 'email', align: 'left' },
  { name: 'company', label: 'Company', field: 'company', align: 'left' },
  { name: 'role', label: 'Role', field: 'role', align: 'left' },
  { name: 'code', label: 'Invitation Code', field: 'code', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'is_used', label: 'Used', field: 'is_used', align: 'center' },
  { name: 'created_at', label: 'Created', field: 'created_at', align: 'left' },
  { name: 'expires_at', label: 'Expires', field: 'expires_at', align: 'left' },
])

const getInitials = (email) => {
  if (!email) return '?'
  const parts = email.split('@')[0].split('.')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return email.substring(0, 2).toUpperCase()
}

const getStatusClass = (status) => {
  if (!status) return 'status-default'
  const s = status.toLowerCase()
  if (s === 'accepted' || s === 'active') return 'status-active'
  if (s === 'declined' || s === 'expired' || s === 'cancelled') return 'status-terminated'
  return 'status-default'
}

const getRoleLabel = (roleValue) => {
  if (!roleValue && roleValue !== 0) return 'N/A'
  const match = props.userRoleOptions.find((r) => r.value === Number(roleValue))
  return match ? match.label : roleValue
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<style scoped>
.modern-table-container {
  overflow-x: auto;
}

.loan-table {
  width: 100%;
  min-width: 900px;
}

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
  text-align: left !important;
}

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

.table-body-row:last-child .table-body-cell {
  border-bottom: none !important;
}

.sl-cell {
  color: #9ca3af;
  font-size: 12px !important;
  width: 48px;
}

.th-sl,
.td-sl {
  width: 52px;
  min-width: 52px;
  text-align: left !important;
}

.th-email,
.td-email {
  min-width: 200px;
  text-align: left !important;
}

.th-company,
.td-company {
  min-width: 120px;
  text-align: left !important;
}

.th-role,
.td-role {
  min-width: 110px;
  text-align: left !important;
}

.th-code,
.td-code {
  min-width: 130px;
  text-align: left !important;
}

.th-status,
.td-status {
  min-width: 110px;
  text-align: left !important;
}

.th-used,
.td-used {
  min-width: 100px;
  text-align: left !important;
}

.th-created,
.td-created {
  min-width: 110px;
  text-align: left !important;
}

.th-expires,
.td-expires {
  min-width: 110px;
  text-align: left !important;
}

.email-name-cell {
  min-width: 220px;
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
  word-break: break-all;
}

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

.code-text {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  background: #f3f4f6;
  padding: 3px 7px;
  border-radius: 4px;
  color: #374151;
  border: 1px solid #e5e7eb;
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

.status-unused {
  background: #fffbeb;
  color: #d97706;
}
.status-unused .status-dot {
  background: #f59e0b;
}

.status-default {
  background: #f3f4f6;
  color: #6b7280;
}
.status-default .status-dot {
  background: #9ca3af;
}

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
}

@media (max-width: 480px) {
  .table-header-cell,
  .table-body-cell {
    padding: 10px 10px !important;
    font-size: 12px;
  }
}
</style>
