<template>
  <q-dialog :model-value="showDetailModal" persistent @update:model-value="$emit('update:show-detail-modal', $event)">
    <q-card class="detail-modal-card">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon">
            <q-icon name="receipt_long" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">Payroll Details</div>
            <div class="modal-subtitle" v-if="record">{{ record.employee }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="$emit('close')" />
      </q-card-section>

      <q-separator />

      <q-card-section class="modal-content" v-if="record">
        <div class="modal-section-title">Employee information</div>
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Name</div>
            <div class="detail-card-value">{{ record.employee }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Employee ID</div>
            <div class="detail-card-value">{{ record.employee_id || 'N/A' }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Period</div>
            <div class="detail-card-value">{{ record.period }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Run</div>
            <div class="detail-card-value">#{{ record.run }}</div>
          </div>
        </div>
        <div class="modal-section-title">Pay information</div>
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Gross Pay</div>
            <div class="detail-card-value amount-green">{{ formatCurrency(record.gross_pay) }}</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Net Pay</div>
            <div class="detail-card-value amount-blue">{{ formatCurrency(record.net_pay) }}</div>
          </div>
          <div class="detail-card detail-card-full">
            <div class="detail-card-label">Deductions</div>
            <div class="detail-card-value amount-red">{{ formatCurrency(record.gross_pay - record.net_pay) }}</div>
          </div>
        </div>
        <div class="modal-section-title">Hours breakdown</div>
        <div class="detail-grid-cards">
          <div class="detail-card">
            <div class="detail-card-label">Regular</div>
            <div class="detail-card-value">{{ record.breakdown?.attendance?.regular_hours || 0 }}h</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Overtime</div>
            <div class="detail-card-value amount-amber">{{ record.breakdown?.attendance?.overtime_hours || 0 }}h</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Holiday</div>
            <div class="detail-card-value amount-purple">{{ record.breakdown?.attendance?.holiday_hours || 0 }}h</div>
          </div>
          <div class="detail-card">
            <div class="detail-card-label">Total</div>
            <div class="detail-card-value">{{ record.breakdown?.attendance?.total_hours_worked || 0 }}h</div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Close" @click="$emit('close')" class="dialog-btn" no-caps />
        <q-btn
          color="primary"
          label="Download Payslip"
          @click="$emit('download-payslip')"
          class="dialog-btn primary-btn"
          no-caps
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  showDetailModal: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

defineEmits(['update:show-detail-modal', 'close', 'download-payslip'])

const formatCurrency = (val) => {
  const n = Number(val ?? 0)
  return '\u20B1' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.detail-modal-card {
  width: 560px;
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

.modal-avatar-icon {
  background: #eff6ff !important;
  color: #3b82f6 !important;
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}
.modal-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.modal-close-btn {
  color: #9ca3af !important;
  flex-shrink: 0;
}
.modal-close-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
}

.modal-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 16px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f3f5;
}
.modal-section-title:first-child {
  margin-top: 0;
}

.detail-grid-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
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
  font-weight: 500;
  color: #111827;
  word-break: break-word;
}

.amount-green { color: #16a34a; }
.amount-blue { color: #2563eb; }
.amount-red { color: #dc2626; }
.amount-amber { color: #d97706; }
.amount-purple { color: #7c3aed; }

.dialog-btn {
  border-radius: 8px !important;
  font-size: 13px;
  text-transform: none;
}
.primary-btn { font-weight: 500; }

@media (max-width: 768px) {
  .detail-grid-cards {
    grid-template-columns: 1fr;
  }
  .detail-card-full {
    grid-column: span 1;
  }
}
</style>
