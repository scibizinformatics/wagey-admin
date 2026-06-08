<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Announcement Overview</h2>
      </div>
      <q-select
        :model-value="typeFilter"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        emit-value
        map-options
        label="Filter by Type"
        class="type-select"
        dense
        outlined
        clearable
        @update:model-value="$emit('update:typeFilter', $event)"
      >
        <template v-slot:prepend>
          <q-icon name="filter_list" />
        </template>
      </q-select>
    </div>

    <div v-if="loading" class="loading-wrapper">
      <q-spinner size="lg" color="primary" />
    </div>

    <div v-else-if="rows.length === 0" class="empty-state">
      <q-icon name="inbox" size="80px" color="grey-4" />
      <div class="empty-title">No announcements found</div>
      <div class="empty-subtitle">Create your first announcement to get started</div>
    </div>

    <div v-else class="modern-table-container">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        flat
        no-data-label="No announcements found"
        class="announcement-table"
        hide-pagination
        :rows-per-page-options="[0]"
      >
        <template v-slot:header>
          <q-tr class="table-header-row">
            <q-th class="table-header-cell col-title">Title</q-th>
            <q-th class="table-header-cell col-type">Type</q-th>
            <q-th class="table-header-cell col-message">Message</q-th>
            <q-th class="table-header-cell col-target">Target</q-th>
            <q-th class="table-header-cell col-schedule">Schedule</q-th>
            <q-th class="table-header-cell col-status">Status</q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr
            class="table-body-row"
            :class="{ 'urgent-row': props.row.announcement_type === 'urgent' }"
          >
            <q-td class="table-body-cell title-cell col-title">
              <span class="announcement-title-text">{{ props.row.title }}</span>
            </q-td>
            <q-td class="table-body-cell col-type">
              <div :class="['type-badge', getTypeBadgeClass(props.row.announcement_type)]">
                {{ props.row.announcement_type }}
              </div>
            </q-td>
            <q-td class="table-body-cell message-cell col-message">
              <span class="message-preview">{{ props.row.message }}</span>
            </q-td>
            <q-td class="table-body-cell col-target">
              <span v-if="props.row.target_everyone" class="target-everyone">
                <q-icon name="group" size="14px" /> Everyone
              </span>
              <div v-else class="target-chips">
                <q-chip
                  v-for="(pos, idx) in props.row.target_positions"
                  :key="`pos-${idx}`"
                  size="xs"
                  dense
                  color="blue-1"
                  text-color="blue-9"
                  icon="work"
                >
                  {{ getPositionName(pos) }}
                </q-chip>
                <q-chip
                  v-for="(role, idx) in props.row.target_roles"
                  :key="`role-${idx}`"
                  size="xs"
                  dense
                  color="purple-1"
                  text-color="purple-9"
                  icon="badge"
                >
                  {{ getRoleName(role) }}
                </q-chip>
                <q-chip
                  v-for="(user, idx) in props.row.target_users"
                  :key="`user-${idx}`"
                  size="xs"
                  dense
                  color="green-1"
                  text-color="green-9"
                  icon="person"
                >
                  {{ getUserName(user) }}
                </q-chip>
              </div>
            </q-td>
            <q-td class="table-body-cell schedule-cell col-schedule">
              <div v-if="props.row.start_at || props.row.end_at" class="schedule-info">
                <div v-if="props.row.start_at" class="time-item">
                  <q-icon name="schedule" size="13px" />
                  <span>{{ formatDate(props.row.start_at) }}</span>
                </div>
                <div v-if="props.row.end_at" class="time-item">
                  <q-icon name="event" size="13px" />
                  <span>{{ formatDate(props.row.end_at) }}</span>
                </div>
              </div>
              <span v-else class="no-schedule">&mdash;</span>
            </q-td>
            <q-td class="table-body-cell col-status">
              <div :class="['status-badge', props.row.is_active ? 'status-active' : 'status-inactive']">
                {{ props.row.is_active ? 'Active' : 'Inactive' }}
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  typeFilter: { type: String, default: null },
  typeOptions: { type: Array, default: () => [] },
  positions: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
  roles: { type: Array, default: () => [] },
})

defineEmits(['update:typeFilter', 'refresh'])

const columns = ref([
  { name: 'title', label: 'Title', field: 'title', align: 'left' },
  { name: 'type', label: 'Type', field: 'announcement_type', align: 'left' },
  { name: 'message', label: 'Message', field: 'message', align: 'left' },
  { name: 'target', label: 'Target', field: 'target_everyone', align: 'left' },
  { name: 'schedule', label: 'Schedule', field: 'start_at', align: 'left' },
  { name: 'status', label: 'Status', field: 'is_active', align: 'left' },
])

const getRoleName = (roleId) => {
  const role = props.roles.find((r) => r.value === roleId)
  return role ? role.label : `Role #${roleId}`
}

const getPositionName = (posId) => {
  const pos = props.positions.find((p) => p.value === posId)
  return pos ? pos.label : `Position #${posId}`
}

const getUserName = (userId) => {
  const user = props.users.find((u) => u.id === userId)
  return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : `User #${userId}`
}

const getTypeBadgeClass = (type) => {
  const classes = {
    general: 'type-general',
    urgent: 'type-urgent',
    maintenance: 'type-maintenance',
    policy: 'type-policy',
  }
  return classes[type] || 'type-general'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
  border-bottom: 1px solid #f3f4f6;
}

.table-title {
  font-size: 17px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.type-select {
  min-width: 180px;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  gap: 10px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.empty-subtitle {
  font-size: 14px;
  color: #9ca3af;
}

.modern-table-container {
  overflow-x: auto;
}

.announcement-table {
  border-radius: 0;
}

.table-header-row {
  background: #f9fafb;
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

.table-body-row:hover {
  background: #f9fafb;
}

.urgent-row {
  border-left: 3px solid #ef4444;
}

.table-body-cell {
  padding: 12px 16px !important;
  font-size: 13px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle;
}

.table-body-row:last-child .table-body-cell {
  border-bottom: none !important;
}

.col-title { min-width: 160px; }
.col-type { min-width: 110px; }
.col-message { min-width: 200px; }
.col-target { min-width: 160px; }
.col-schedule { min-width: 140px; }
.col-status { min-width: 90px; }

.announcement-title-text {
  font-weight: 500;
  color: #111827;
}

.message-cell .message-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 260px;
  color: #6b7280;
  font-size: 12px;
}

.target-everyone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.target-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.schedule-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.no-schedule {
  color: #d1d5db;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.type-general {
  background: #e0f2fe;
  color: #0369a1;
}
.type-urgent {
  background: #fee2e2;
  color: #dc2626;
}
.type-maintenance {
  background: #fef3c7;
  color: #d97706;
}
.type-policy {
  background: #f3e8ff;
  color: #7c3aed;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #dcfce7;
  color: #16a34a;
}
.status-inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.edit-btn {
  color: #3b82f6;
}
.edit-btn:hover {
  background: #dbeafe;
}
.delete-btn {
  color: #ef4444;
}
.delete-btn:hover {
  background: #fecaca;
}

@media (max-width: 1024px) {
  .type-select {
    min-width: 160px;
  }
  .modern-table-container {
    overflow-x: auto;
  }
  .announcement-table {
    min-width: 700px;
  }
  .message-cell .message-preview {
    max-width: 180px;
  }
}

@media (max-width: 768px) {
  .table-header {
    padding: 12px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .table-title {
    font-size: 15px;
  }
  .type-select {
    width: 100%;
    min-width: unset;
  }
  .modern-table-container {
    margin: 0 8px 8px 8px;
    overflow-x: auto;
    border-radius: 8px;
  }
  .announcement-table {
    min-width: 640px;
  }
  .table-header-cell,
  .table-body-cell {
    padding: 10px 8px;
    font-size: 12px;
  }
  .message-cell .message-preview {
    max-width: 140px;
    font-size: 11px;
  }
}
</style>
