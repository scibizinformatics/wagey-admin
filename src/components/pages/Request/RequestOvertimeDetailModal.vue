<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="modal-card">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-icon name="more_time" class="modal-icon" />
          <div>
            <div class="modal-title">Overtime Details</div>
            <div class="modal-subtitle">{{ request?.employeeName || '' }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round class="modal-close-btn" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content">
        <div class="detail-sections">
          <div class="detail-section">
            <div class="section-title">Request Information</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Employee:</span>
                <span class="detail-value">{{ request?.employeeName }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">{{ formatDate(request?.date) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Hours:</span>
                <span class="detail-value">{{ request?.hours === '-' ? '-' : request?.hours + 'h' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">{{ request?.categoryName }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <div :class="['status-badge', getStatusClass(request?.status)]">
                    {{ capitalizeStatus(request?.status) }}
                  </div>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Converted to CTO:</span>
                <span class="detail-value">{{ request?.convertedToCto ? 'Yes' : 'No' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Submitted:</span>
                <span class="detail-value">{{ formatDate(request?.submittedDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Approved By:</span>
                <span class="detail-value">{{ request?.approvedByName || 'N/A' }}</span>
              </div>
            </div>
            <div v-if="request?.reason" class="info-content">
              <div class="info-label">Reason:</div>
              <div class="info-text">{{ request.reason }}</div>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-footer">
        <div class="form-actions">
          <q-btn flat label="Close" color="grey-7" @click="$emit('update:modelValue', false)" />
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
defineEmits(['update:modelValue'])

const capitalizeStatus = (status) => {
  if (!status) return 'N/A'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const getStatusClass = (status) => {
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
  background: #102335;
}
.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}
.modal-icon {
  font-size: 24px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px;
  border-radius: 10px;
}
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
.info-content { margin-bottom: 8px; margin-top: 10px; }
.info-label { font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 4px; }
.info-text { font-size: 13px; color: #374151; line-height: 1.5; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
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
