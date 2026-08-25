<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="modal-card details-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar
            size="64px"
            :color="getAvatarColor(request?.employee_name)"
            text-color="white"
            class="modal-avatar"
          >
            {{ request ? getInitials(request.employee_name) : '?' }}
          </q-avatar>
          <div>
            <div class="modal-title">{{ request?.employee_name || 'Cash advance details' }}</div>
            <div class="modal-subtitle">Request information</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          class="modal-close-btn"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content" v-if="request">
        <div class="detail-sections">
          <div class="detail-section">
            <div class="section-title">Basic information</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Employee:</span>
                <span class="detail-value">{{ request.employee_name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Request date:</span>
                <span class="detail-value">{{ formatDate(request.request_date) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Approval date:</span>
                <span class="detail-value">{{
                  request.approval_date ? formatDate(request.approval_date) : '-'
                }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payout date:</span>
                <span class="detail-value">{{
                  request.payout_date ? formatDate(request.payout_date) : '-'
                }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Approved by:</span>
                <span class="detail-value">{{ request.approved_by || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <div :class="['status-badge', getCaStatusClass(request.status)]">
                    {{ request.status_display || capitalizeStatus(request.status) }}
                  </div>
                </span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">Amount details</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Requested amount:</span>
                <span class="detail-value amount-highlight"
                  >&#8369;{{ formatAmount(request.requested_amount) }}</span
                >
              </div>
            </div>
          </div>
          <div v-if="request.reason || request.remarks" class="detail-section">
            <div class="section-title">Additional information</div>
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
          <q-btn
            flat
            no-caps
            label="Close"
            class="cancel-btn"
            @click="$emit('update:modelValue', false)"
          />
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
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
const capitalizeStatus = (status) => {
  if (!status) return 'N/A'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
const formatAmount = (num) => {
  const n = Number(num || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const getCaStatusClass = (status) => {
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}
const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0]
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}
</script>

<style scoped src="./requestModal.css"></style>
