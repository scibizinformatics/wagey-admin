<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card details-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="64px" color="primary" text-color="white" class="modal-avatar">
            {{ request ? getInitials(request.employeeName) : '?' }}
          </q-avatar>
          <div>
            <div class="modal-title">{{ request?.employeeName || 'Request Details' }}</div>
            <div class="modal-subtitle">{{ request?.department || 'General' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round class="modal-close-btn" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content" v-if="request">
        <div class="detail-sections">
          <div class="detail-section">
            <div class="section-title">Request Status</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <div :class="['status-badge', getLeaveStatusClass(request)]">
                    {{ capitalizeStatus(request.status) }}
                  </div>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">
                  <div class="type-badge">{{ request.type }}</div>
                </span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">Request Information</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">{{ formatDate(request.startDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">End Date:</span>
                <span class="detail-value">{{ formatDate(request.endDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">{{ request.duration }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Submitted:</span>
                <span class="detail-value">{{ formatDateTime(request.submittedDate) }}</span>
              </div>
            </div>
          </div>
          <div v-if="request.reason" class="detail-section">
            <div class="section-title">Reason</div>
            <div class="reason-content">{{ request.reason }}</div>
          </div>
          <div v-if="request.message" class="detail-section">
            <div class="section-title">Additional Message</div>
            <div class="message-content">{{ request.message }}</div>
          </div>
          <div v-if="request.adminResponse" class="detail-section">
            <div class="section-title">Admin Response</div>
            <div class="admin-response">{{ request.adminResponse }}</div>
            <div v-if="request.respondedBy" class="response-meta">
              By {{ request.respondedBy }} &bull; {{ formatDateTime(request.respondedDate) }}
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-footer">
        <div class="form-actions">
          <q-btn
            v-if="request && request.status === 'pending'"
            label="Reject"
            flat
            color="negative"
            @click="$emit('reject', request)"
            :loading="actionLoading === `reject-${request.id}`"
          />
          <q-btn
            v-if="request && request.status === 'pending'"
            label="Approve"
            color="positive"
            @click="$emit('approve', request)"
            :loading="actionLoading === `approve-${request.id}`"
          />
          <q-btn label="Close" flat color="grey-7" @click="$emit('update:modelValue', false)" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  request: Object,
  actionLoading: String,
})
defineEmits(['update:modelValue', 'approve', 'reject'])

const getInitials = (name) => {
  if (!name || name === 'N/A') return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}
const capitalizeStatus = (status) => {
  if (!status) return 'N/A'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
const getLeaveStatusClass = (request) => {
  const status = request.status
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}
</script>

<style scoped>
.modal-card {
  width: 600px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 14px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #ffffff;
}
.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}
.modal-avatar { flex-shrink: 0; }
.modal-title { font-size: 16px; font-weight: 600; color: #111827; }
.modal-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
.modal-close-btn { color: #9ca3af !important; flex-shrink: 0; }
.modal-close-btn:hover { background: #f3f4f6 !important; color: #374151 !important; }
.modal-content { padding: 20px !important; overflow-y: auto; flex: 1; }
.modal-footer {
  padding: 14px 20px;
  background: #f9fafb;
  border-top: 1px solid #f1f3f5;
}
.detail-sections { display: flex; flex-direction: column; gap: 16px; }
.detail-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 14px 18px;
  border: 1px solid #f1f3f5;
}
.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f5;
}
.detail-grid { display: flex; flex-direction: column; }
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid #f1f3f5;
}
.detail-row:last-child { border-bottom: none; padding-bottom: 0; }
.detail-label { font-size: 13px; color: #6b7280; font-weight: 500; }
.detail-value {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  text-align: right;
  display: flex;
  align-items: center;
  gap: 6px;
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
.status-pending { background: #fffbeb; color: #92400e; }
.status-approved { background: #f0fdf4; color: #16a34a; }
.status-rejected { background: #fef2f2; color: #dc2626; }
.status-default { background: #f3f4f6; color: #6b7280; }
.type-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.reason-content, .message-content, .admin-response {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
  padding: 4px 0;
}
.response-meta { font-size: 12px; color: #9ca3af; margin-top: 6px; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 1024px) {
  .modal-card { min-width: unset; max-width: 680px; }
}
@media (max-width: 768px) {
  .modal-card { margin: 10px; min-width: unset; max-width: calc(100vw - 20px); max-height: calc(100vh - 20px); width: 100%; }
  .modal-content { padding: 14px !important; }
  .modal-footer { padding: 12px 14px; }
  .form-actions { flex-direction: column-reverse; gap: 8px; }
  .form-actions button { width: 100%; }
  .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
  .detail-value { text-align: left; }
}
@media (max-width: 480px) {
  .modal-title { font-size: 15px; }
}
</style>
