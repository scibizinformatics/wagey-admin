<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card view-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="52px" v-if="employee?.user?.picture_url">
            <img :src="employee.user.picture_url" :alt="fullName" />
          </q-avatar>
          <q-avatar v-else size="52px" class="avatar-fallback avatar-fallback-lg">
            {{ initials }}
          </q-avatar>
          <div>
            <div class="modal-title">{{ fullName }}</div>
            <div class="modal-subtitle">
              <span :class="['status-badge', statusClass]" style="font-size: 11px">
                <span class="status-dot"></span>{{ status }}
              </span>
            </div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="close" />
      </q-card-section>

      <!-- Tabs -->
      <q-tabs v-model="tab" dense align="left" class="view-tabs" indicator-color="white" active-color="white">
        <q-tab name="user" label="User info" />
        <q-tab name="personal" label="Personal" />
        <q-tab name="employment" label="Employment" />
      </q-tabs>

      <q-card-section class="modal-content">
        <q-tab-panels v-model="tab" animated>
          <!-- User Info Tab -->
          <q-tab-panel name="user" class="q-pa-none">
            <div class="detail-grid-cards">
              <div class="detail-card"><div class="detail-card-label">Username</div><div class="detail-card-value">{{ employee?.user?.username || 'N/A' }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Email</div><div class="detail-card-value">{{ email }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Full Name</div><div class="detail-card-value">{{ fullName }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Role</div><div class="detail-card-value">{{ role }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Status</div><div class="detail-card-value"><span :class="['status-badge', statusClass]"><span class="status-dot"></span>{{ status }}</span></div></div>
            </div>
          </q-tab-panel>

          <!-- Personal Tab -->
          <q-tab-panel name="personal" class="q-pa-none">
            <div class="detail-grid-cards">
              <div class="detail-card"><div class="detail-card-label">Civil Status</div><div class="detail-card-value">{{ civilStatus }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Birthday</div><div class="detail-card-value">{{ formatDate(employee?.birthday) || 'N/A' }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Phone</div><div class="detail-card-value">{{ phone }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Emergency Contact</div><div class="detail-card-value">{{ employee?.emergency_contact || 'N/A' }}</div></div>
              <div class="detail-card detail-card-full"><div class="detail-card-label">Address</div><div class="detail-card-value">{{ employee?.address || 'N/A' }}</div></div>
            </div>
          </q-tab-panel>

          <!-- Employment Tab -->
          <q-tab-panel name="employment" class="q-pa-none">
            <div class="detail-grid-cards">
              <div class="detail-card"><div class="detail-card-label">Bank Account</div><div class="detail-card-value">{{ employee?.bank_acct || 'N/A' }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Timezone</div><div class="detail-card-value">{{ employee?.timezone || 'N/A' }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Last Updated</div><div class="detail-card-value">{{ formatDateTime(employee?.last_date_updated) || 'N/A' }}</div></div>
              <div class="detail-card"><div class="detail-card-label">Updated By</div><div class="detail-card-value">{{ employee?.updated_by || 'N/A' }}</div></div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employee: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const tab = ref('user')

watch(() => props.modelValue, (val) => {
  if (val) tab.value = 'user'
})

const fullName = computed(() => {
  if (!props.employee) return 'N/A'
  return `${props.employee.user?.first_name || ''} ${props.employee.user?.last_name || ''}`.trim() || props.employee.user?.username || 'N/A'
})

const email = computed(() => props.employee?.user?.email || 'N/A')

const role = computed(() => {
  if (!props.employee) return 'N/A'
  if (props.employee.user_role_name) return String(props.employee.user_role_name)
  if (props.employee.user_role?.name) return String(props.employee.user_role.name)
  if (props.employee.companies?.length > 0) {
    const role = props.employee.companies[0].user_role
    return role?.name ? String(role.name) : 'N/A'
  }
  return 'N/A'
})

const status = computed(() => {
  if (!props.employee) return 'N/A'
  if (props.employee.status?.toLowerCase() === 'terminated') return 'Terminated'
  if (props.employee.is_active === false) return 'Terminated'
  const empStatus = props.employee.companies?.[0]?.employment_status
  if (empStatus?.toLowerCase() === 'terminated') return 'Terminated'
  return 'Active'
})

const statusClass = computed(() => {
  if (status.value === 'Active') return 'status-active'
  if (status.value === 'Terminated') return 'status-terminated'
  return 'status-default'
})

const initials = computed(() => {
  const name = fullName.value
  return name && name !== 'N/A'
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
})

const civilStatus = computed(() => props.employee?.civil_status || 'N/A')
const phone = computed(() => props.employee?.phone_number || 'N/A')

const formatDate = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const formatDateTime = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const close = () => emit('update:modelValue', false)
</script>

<style scoped>
.modal-card {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  width: 560px;
  max-width: 95vw !important;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: #102335 !important;
  border-bottom: none !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.modal-header .q-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.modal-header .q-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.modal-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  flex-shrink: 0;
}

.view-tabs {
  background: #102335;
  padding: 0 20px;
  font-size: 13px;
}
.view-tabs :deep(.q-tab) {
  color: rgba(255, 255, 255, 0.7) !important;
  text-transform: none;
  font-weight: 500;
}
.view-tabs :deep(.q-tab--active) {
  color: #ffffff !important;
}
.view-tabs :deep(.q-tab__indicator) {
  background: #ffffff !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  max-height: 70vh;
  flex: 1;
  background: #f9fafb !important;
}

.modal-content::-webkit-scrollbar {
  width: 4px;
}
.modal-content::-webkit-scrollbar-track {
  background: transparent;
}
.modal-content::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
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

.avatar-fallback-lg {
  min-width: 52px !important;
  width: 52px !important;
  height: 52px !important;
}

.avatar-fallback-lg :deep(.q-avatar__content) {
  font-size: 16px !important;
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

/* Detail grid cards */
.detail-grid-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #f1f3f5;
}

.detail-card-full {
  grid-column: 1 / -1;
}

.detail-card-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.detail-card-value {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  word-break: break-word;
}

@media (max-width: 768px) {
  .modal-card {
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 24px);
  }
  .detail-grid-cards {
    grid-template-columns: 1fr;
  }
}
</style>
