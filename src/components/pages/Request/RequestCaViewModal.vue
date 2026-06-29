<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card details-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="64px" :color="getAvatarColor(request?.employee_name)" text-color="white" class="modal-avatar">
            {{ request ? getInitials(request.employee_name) : '?' }}
          </q-avatar>
          <div>
            <div class="modal-title">{{ request?.employee_name || 'Cash Advance Details' }}</div>
            <div class="modal-subtitle">Request Information</div>
          </div>
        </div>
        <q-btn icon="close" flat round class="modal-close-btn" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content" v-if="request">
        <div class="detail-sections">
          <div class="detail-section">
            <div class="section-title">Basic Information</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Employee:</span>
                <span class="detail-value">{{ request.employee_name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Request Date:</span>
                <span class="detail-value">{{ request.request_date }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <div :class="['status-badge', getCaStatusClass(request.status)]">
                    {{ capitalizeStatus(request.status) }}
                  </div>
                </span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">Amount Details</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Requested Amount:</span>
                <span class="detail-value amount-highlight">&#8369;{{ formatAmount(request.requested_amount) }}</span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">Repayment Information</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Repayment Method:</span>
                <span class="detail-value">
                  <div :class="['repayment-badge', getRepaymentClass(request.repayment_method)]">
                    {{ capitalizeStatus(request.repayment_method) }}
                  </div>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Repaid Status:</span>
                <span class="detail-value">
                  <q-icon
                    :name="request.is_repaid ? 'check_circle' : 'schedule'"
                    :color="request.is_repaid ? 'positive' : 'warning'"
                    size="20px"
                  />
                  <span :class="request.is_repaid ? 'text-positive' : 'text-warning'">
                    {{ request.is_repaid ? 'Repaid' : 'Pending' }}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div v-if="request.reason || request.remarks" class="detail-section">
            <div class="section-title">Additional Information</div>
            <div v-if="request.reason" class="info-content">
              <div class="info-label">Reason:</div>
              <div class="info-text">{{ request.reason }}</div>
            </div>
            <div v-if="request.remarks" class="info-content">
              <div class="info-label">Remarks:</div>
              <div class="info-text">{{ request.remarks }}</div>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-footer">
        <div class="form-actions">
          <q-btn label="Close" flat color="grey-7" @click="$emit('update:modelValue', false)" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
const AVATAR_COLORS = ['primary', 'secondary', 'accent', 'purple', 'deep-orange']

defineProps({
  modelValue: Boolean,
  request: Object,
})
defineEmits(['update:modelValue'])

const getInitials = (name) => {
  if (!name || name === 'N/A') return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}
const capitalizeStatus = (status) => {
  if (!status) return 'N/A'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
const formatAmount = (num) => {
  const n = Number(num || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const getCaStatusClass = (status) => {
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}
const getRepaymentClass = (method) => {
  if (method === 'manual') return 'repayment-manual'
  if (method === 'automatic') return 'repayment-automatic'
  return 'repayment-default'
}
const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0]
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
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
  background: #102335;
}
.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}
.modal-avatar { flex-shrink: 0; }
.modal-title { font-size: 16px; font-weight: 600; color: #ffffff; }
.modal-subtitle { font-size: 12px; color: rgba(255, 255, 255, 0.8); margin-top: 2px; }
.modal-close-btn { color: rgba(255, 255, 255, 0.8) !important; flex-shrink: 0; }
.modal-close-btn:hover { background: rgba(255, 255, 255, 0.15) !important; color: #ffffff !important; }
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
.amount-highlight { font-weight: 700; font-size: 15px; color: #111827; }
.repayment-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #e5e7eb;
}
.repayment-manual { background: #fffbeb; color: #92400e; border-color: #fde68a; }
.repayment-automatic { background: #f0fdf4; color: #065f46; border-color: #bbf7d0; }
.repayment-default { background: #f3f4f6; color: #6b7280; }
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
.info-content { margin-bottom: 8px; }
.info-label { font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 4px; }
.info-text { font-size: 13px; color: #374151; line-height: 1.5; }
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
