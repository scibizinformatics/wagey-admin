<template>
  <q-dialog :model-value="showAcknowledgeDialog" persistent @update:model-value="$emit('update:show-acknowledge-dialog', $event)">
    <q-card style="min-width: 460px; max-width: 95vw; border-radius: 14px">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon" color="blue-1">
            <q-icon name="fact_check" size="22px" color="blue" />
          </q-avatar>
          <div>
            <div class="modal-title">Payslip Review &amp; Acknowledge</div>
            <div class="modal-subtitle" v-if="target">
              {{ target.employee_name || target.employee }}
            </div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="$emit('close')" />
      </q-card-section>

      <q-separator />

      <q-card-section class="modal-content" v-if="target">
        <div v-if="dialogLoading" style="display: flex; align-items: center; gap: 10px; padding: 16px 0">
          <q-spinner color="primary" size="20px" />
          <span style="font-size: 13px; color: #6b7280">Loading payslip details...</span>
        </div>

        <template v-else>
          <div class="info-banner">
            <q-icon name="info" color="blue" size="18px" />
            <span style="font-size: 13px; color: #1d4ed8">
              Review the payslip details below. The employee must acknowledge before payment can be released.
            </span>
          </div>

          <div class="modal-section-title">Pay summary</div>
          <div class="detail-grid-cards">
            <div class="detail-card">
              <div class="detail-card-label">Net Pay</div>
              <div class="detail-card-value amount-blue">{{ formatCurrency(target.net_pay) }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Payment Method</div>
              <div class="detail-card-value">{{ target.payment_method || '—' }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Current Status</div>
              <div class="detail-card-value">
                <q-badge :color="statusColor(target?.status)" :label="statusLabel(target?.status)" />
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Review Status</div>
              <div class="detail-card-value">{{ target.review_status || 'pending' }}</div>
            </div>
          </div>

          <div class="note-box">
            Once acknowledged, the payslip moves to <strong>Ready for Payment</strong> and the
            admin will be able to disburse it.
          </div>
        </template>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" no-caps @click="$emit('close')" class="dialog-btn" />
        <q-btn
          unelevated
          color="blue"
          label="Acknowledge Payslip"
          icon="check_circle"
          no-caps
          :loading="acknowledgeLoading"
          :disable="target?.status !== 'pending_review'"
          @click="$emit('acknowledge-payslip')"
          class="dialog-btn primary-btn"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { formatCurrency } from 'src/composables/utils/format'

defineProps({
  showAcknowledgeDialog: { type: Boolean, default: false },
  target: { type: Object, default: null },
  acknowledgeLoading: { type: Boolean, default: false },
  dialogLoading: { type: Boolean, default: false },
})

const statusColor = (status) => {
  const colors = {
    draft: 'grey', pending_review: 'orange', ready_for_payment: 'teal',
    disbursed: 'amber', completed: 'positive',
  }
  return colors[status] || 'grey'
}

const statusLabel = (status) => {
  const labels = {
    draft: 'Draft', pending_review: 'Pending Review', ready_for_payment: 'Ready for Payment',
    disbursed: 'Disbursed', completed: 'Completed',
  }
  return labels[status] || status || 'Unknown'
}

defineEmits(['update:show-acknowledge-dialog', 'close', 'acknowledge-payslip'])
</script>

<style scoped>
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

.modal-avatar-icon {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
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
.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
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

.amount-blue { color: #2563eb; }

.dialog-btn {
  border-radius: 8px !important;
  font-size: 13px;
  text-transform: none;
}
.primary-btn { font-weight: 500; }

.info-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #eff6ff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.note-box {
  font-size: 12px;
  color: #6b7280;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
}
</style>
