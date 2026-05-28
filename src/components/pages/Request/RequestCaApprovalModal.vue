<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card approval-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-icon name="edit" class="modal-icon" />
          <div>
            <div class="modal-title">Approve Cash Advance Request</div>
            <div class="modal-subtitle">{{ request?.employee_name || '' }}</div>
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
                <span class="detail-value">{{ request?.employee_name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Requested Amount:</span>
                <span class="detail-value amount-highlight">&#8369;{{ formatAmount(request?.requested_amount) }}</span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">Approval Details</div>
            <div class="form-grid">
              <q-select
                outlined
                :model-value="approvalData.status"
                @update:model-value="$emit('update:approvalData', { ...approvalData, status: $event })"
                :options="['approved', 'rejected']"
                label="Status *"
                :rules="[(val) => !!val || 'Status is required']"
                class="col-span-2"
              />
              <q-input
                outlined
                :model-value="approvalData.remarks"
                @update:model-value="$emit('update:approvalData', { ...approvalData, remarks: $event })"
                label="Remarks"
                type="textarea"
                rows="3"
                class="col-span-2"
              />
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-footer">
        <div class="form-actions">
          <q-btn flat label="Cancel" color="grey-7" @click="$emit('update:modelValue', false)" />
          <q-btn label="Submit Approval" color="primary" @click="$emit('submit')" :loading="submitting" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  request: Object,
  approvalData: Object,
  submitting: Boolean,
})
defineEmits(['update:modelValue', 'update:approvalData', 'submit'])

const formatAmount = (num) => {
  const n = Number(num || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
.modal-icon {
  font-size: 24px;
  color: #3b82f6;
  background: #eff6ff;
  padding: 8px;
  border-radius: 10px;
}
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
.amount-highlight { font-weight: 700; font-size: 15px; color: #111827; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.col-span-2 { grid-column: 1 / -1; }
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
  .form-grid { grid-template-columns: 1fr; gap: 12px; }
  .col-span-2 { grid-column: span 1; }
  .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
  .detail-value { text-align: left; }
}
@media (max-width: 480px) {
  .modal-title { font-size: 15px; }
}
</style>
