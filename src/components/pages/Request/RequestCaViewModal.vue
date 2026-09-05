<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            {{ request ? getInitials(request.employee_name) : '?' }}
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              {{ request?.employee_name || 'Cash advance details' }}
            </div>
            <div class="dash-modal__sub">Request information</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>
      <q-card-section class="dash-modal__body" v-if="request">
        <div class="dash-modal__stack">
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Basic information</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Employee:</span>
                <span class="dash-modal__value">{{ request.employee_name }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Request date:</span>
                <span class="dash-modal__value">{{ formatDate(request.request_date) }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Approval date:</span>
                <span class="dash-modal__value">{{
                  request.approval_date ? formatDate(request.approval_date) : '-'
                }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Payout date:</span>
                <span class="dash-modal__value">{{
                  request.payout_date ? formatDate(request.payout_date) : '-'
                }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Approved by:</span>
                <span class="dash-modal__value">{{ approverName(request) || '-' }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Status:</span>
                <span class="dash-modal__value">
                  <div :class="['dash-chip', getCaStatusClass(request.status)]">
                    {{ request.status_display || capitalizeStatus(request.status) }}
                  </div>
                </span>
              </div>
            </div>
          </div>
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Amount details</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Requested amount:</span>
                <span class="dash-modal__value dash-modal__value--strong"
                  >&#8369;{{ formatAmount(request.requested_amount) }}</span
                >
              </div>
            </div>
          </div>
          <div v-if="request.reason || request.remarks" class="dash-modal__section">
            <div class="dash-modal__section-title">Additional information</div>
            <div v-if="request.reason" class="info-content">
              <div class="dash-modal__field-label">Reason:</div>
              <div class="dash-modal__note">{{ request.reason }}</div>
            </div>
            <div v-if="request.remarks" class="info-content">
              <div class="dash-modal__field-label">Remarks:</div>
              <div class="dash-modal__note">{{ request.remarks }}</div>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-section class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Close"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { getApproverName as approverName } from 'src/composables/utils/employee'

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
  if (status === 'pending') return 'dash-chip--warn'
  if (status === 'approved') return 'dash-chip--good'
  if (status === 'rejected') return 'dash-chip--critical'
  return ''
}
</script>

<style scoped src="./requestModal.css"></style>
