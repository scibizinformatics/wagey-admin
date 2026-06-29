<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="modal-card view-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="52px" class="avatar-fallback avatar-fallback-lg">
            {{ getInitials(invitation?.email) }}
          </q-avatar>
          <div>
            <div class="modal-title">{{ invitation?.email }}</div>
            <div class="modal-subtitle">
              <span
                :class="['status-badge', getStatusClass(invitation?.status)]"
                style="font-size: 11px"
              >
                <span class="status-dot"></span>{{ invitation?.status || 'Pending' }}
              </span>
            </div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          dense
          class="modal-close-btn"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="modal-content">
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Email</div>
            <div class="detail-card-value">{{ invitation?.email || 'N/A' }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Company</div>
            <div class="detail-card-value">{{ invitation?.company || 'N/A' }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Role</div>
            <div class="detail-card-value">
              {{ getRoleLabel(invitation?.role ?? invitation?.user_role) }}
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Status</div>
            <div class="detail-card-value">
              <span :class="['status-badge', getStatusClass(invitation?.status)]">
                <span class="status-dot"></span>{{ invitation?.status || 'Pending' }}
              </span>
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Used</div>
            <div class="detail-card-value">
              <span :class="['status-badge', invitation?.is_used ? 'status-active' : 'status-unused']">
                <span class="status-dot"></span>{{ invitation?.is_used ? 'Yes' : 'No' }}
              </span>
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Created</div>
            <div class="detail-card-value">{{ formatDate(invitation?.created_at) }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Expires</div>
            <div class="detail-card-value">{{ formatDate(invitation?.expires_at) }}</div>
          </div>
          <div class="detail-card detail-card-full">
            <div class="detail-card-label">Invitation Code</div>
            <div class="detail-card-value">
              <code class="code-text">{{ invitation?.code || 'N/A' }}</code>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  invitation: { type: Object, default: null },
  userRoleOptions: { type: Array, default: () => [] },
})

defineEmits(['update:modelValue'])

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
.modal-card {
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.view-modal {
  max-width: 560px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #102335 !important;
  border-bottom: none !important;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff !important;
}

.modal-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8) !important;
  margin-top: 2px;
}

.modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
  background: #f9fafb !important;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
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

@media (max-width: 768px) {
  .detail-grid-cards {
    grid-template-columns: 1fr;
  }
  .detail-card-full {
    grid-column: span 1;
  }
}
</style>
