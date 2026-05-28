<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card details-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="64px" color="primary" text-color="white" class="modal-avatar">
            {{ request ? getInitials(request.requested_by_name) : '?' }}
          </q-avatar>
          <div>
            <div class="modal-title">{{ request?.requested_by_name || 'Swap Request Details' }}</div>
            <div class="modal-subtitle">Swap Request Information</div>
          </div>
        </div>
        <q-btn icon="close" flat round class="modal-close-btn" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content" v-if="request">
        <div class="detail-sections">
          <div class="detail-section">
            <div class="section-title">Swap Details</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">From Employee:</span>
                <span class="detail-value">{{ request.from_employee_name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">To Employee:</span>
                <span class="detail-value">{{ request.to_employee_name }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">Original Assignment</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">{{ formatDate(request.original_date) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Site:</span>
                <span class="detail-value">{{ request.original_assignment?.site || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shift:</span>
                <span class="detail-value">{{ request.original_assignment?.shift_type || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">New Assignment</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">{{ formatDate(request.new_date) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Site:</span>
                <span class="detail-value">{{ request.new_assignment?.site || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shift:</span>
                <span class="detail-value">{{ request.new_assignment?.shift_type || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">Status Information</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <div :class="['status-badge', getStatusClass(request)]">
                    {{ getStatusLabel(request) }}
                  </div>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Requested At:</span>
                <span class="detail-value">{{ formatDateTime(request.requested_at) }}</span>
              </div>
              <div v-if="request.admin_approved_at" class="detail-row">
                <span class="detail-label">Admin Approved At:</span>
                <span class="detail-value">{{ formatDateTime(request.admin_approved_at) }}</span>
              </div>
            </div>
          </div>

          <div v-if="isPendingApproval(request)" class="detail-section">
            <div class="section-title">Employee Approvals</div>
            <div class="approval-info">
              <div class="approval-item">
                <q-icon
                  :name="request.to_employee_approved ? 'check_circle' : 'schedule'"
                  :color="request.to_employee_approved ? 'positive' : 'warning'"
                  size="20px"
                />
                <span>
                  {{ request.to_employee_name }}:
                  <span :class="request.to_employee_approved ? 'text-positive' : 'text-warning'">
                    {{ request.to_employee_approved ? 'Approved' : 'Pending' }}
                  </span>
                </span>
              </div>
              <div v-if="canAdminApprove(request)" class="approval-item ready">
                <q-icon name="admin_panel_settings" color="positive" size="20px" />
                <span class="text-positive">Ready for admin approval</span>
              </div>
              <div v-else class="approval-item waiting">
                <q-icon name="info" color="orange" size="20px" />
                <span class="text-orange">Waiting for employee approval</span>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-footer">
        <div class="form-actions">
          <q-btn
            v-if="isPendingApproval(request)"
            label="Reject"
            flat
            color="negative"
            @click="$emit('reject', request)"
          />
          <q-btn
            v-if="isPendingApproval(request)"
            label="Approve"
            color="positive"
            :disable="!canAdminApprove(request)"
            @click="$emit('approve', request)"
          >
            <q-tooltip v-if="!canAdminApprove(request)">
              Waiting for employee approval
            </q-tooltip>
          </q-btn>
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
})
defineEmits(['update:modelValue', 'approve', 'reject'])

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
  })
}
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A'
  return new Date(dateTimeString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}
const getStatusClass = (request) => {
  if (!request) return 'status-default'
  const status = request.status
  if (status === 'pending') return 'status-pending'
  if (status === 'to_employee_approved') return 'status-employee-approved'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}
const getStatusLabel = (request) => {
  if (!request) return ''
  const labels = {
    pending: 'Pending',
    to_employee_approved: 'Employee Approved',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return labels[request.status] || request.status
}
const isPendingApproval = (request) => {
  if (!request) return false
  return request.status === 'pending' || request.status === 'to_employee_approved'
}
const canAdminApprove = (request) => {
  if (!request) return false
  return isPendingApproval(request) && request.to_employee_approved === true
}
</script>

<style scoped>
.modal-card {
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}
.details-modal { max-width: 700px; }
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9fafb;
  flex-shrink: 0;
}
.modal-title-section { display: flex; align-items: center; gap: 12px; }
.modal-avatar { flex-shrink: 0; }
.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.modal-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }
.modal-close-btn { color: #6b7280; }
.modal-close-btn:hover { background: #f3f4f6; }
.modal-content { padding: 20px; overflow-y: auto; flex: 1; }
.detail-sections { display: flex; flex-direction: column; gap: 16px; }
.detail-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}
.detail-grid { display: flex; flex-direction: column; gap: 10px; }
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}
.detail-row:last-child { border-bottom: none; }
.detail-label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
  margin-right: 16px;
}
.detail-value {
  font-size: 13px;
  color: #111827;
  text-align: right;
  word-break: break-word;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  width: fit-content;
}
.status-pending { background: #fef3c7; color: #d97706; }
.status-employee-approved { background: #dbeafe; color: #2563eb; }
.status-approved { background: #dcfce7; color: #16a34a; }
.status-rejected { background: #fee2e2; color: #dc2626; }
.status-default { background: #f3f4f6; color: #374151; }
.approval-info { display: flex; flex-direction: column; gap: 12px; }
.approval-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #ffffff;
  border-radius: 6px;
  font-size: 13px;
}
.approval-item.ready { background: #f0fdf4; font-weight: 500; }
.approval-item.waiting { background: #fff7ed; font-weight: 500; }
.modal-footer { padding: 0; flex-shrink: 0; }
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}
.modal-content::-webkit-scrollbar { width: 6px; }
.modal-content::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
.modal-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.modal-content::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
@media (max-width: 1024px) {
  .modal-card { max-width: 90vw; }
}
@media (max-width: 768px) {
  .modal-card { margin: 12px; max-width: calc(100vw - 24px); max-height: calc(100vh - 24px); }
  .modal-header { padding: 16px; }
  .modal-title-section { gap: 12px; }
  .modal-title { font-size: 18px; }
  .modal-subtitle { font-size: 13px; }
  .modal-content { padding: 16px; }
  .detail-section { padding: 16px; }
  .section-title { font-size: 15px; margin-bottom: 12px; }
  .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px 0; }
  .detail-value { text-align: left; }
  .form-actions { flex-direction: column-reverse; gap: 8px; padding: 16px; }
  .form-actions button { width: 100%; }
}
</style>
