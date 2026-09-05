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
            {{ request ? getInitials(request.requested_by_name) : '?' }}
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              {{ request?.requested_by_name || 'Swap request details' }}
            </div>
            <div class="dash-modal__sub">Swap request</div>
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
            <div class="dash-modal__section-title">Swap details</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">From employee:</span>
                <span class="dash-modal__value">{{ request.from_employee_name || EM_DASH }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">To employee:</span>
                <span class="dash-modal__value">{{ request.to_employee_name || EM_DASH }}</span>
              </div>
            </div>
          </div>

          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Original assignment</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Date:</span>
                <span class="dash-modal__value">{{ request.original_date_label || EM_DASH }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Site:</span>
                <span class="dash-modal__value">{{ request.original_site_label || EM_DASH }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Shift:</span>
                <span class="dash-modal__value">{{ request.original_shift_label || EM_DASH }}</span>
              </div>
            </div>
          </div>

          <div class="dash-modal__section">
            <div class="dash-modal__section-title">New assignment</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Date:</span>
                <span class="dash-modal__value">{{ request.new_date_label || EM_DASH }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Site:</span>
                <span class="dash-modal__value">{{ request.new_site_label || EM_DASH }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Shift:</span>
                <span class="dash-modal__value">{{ request.new_shift_label || EM_DASH }}</span>
              </div>
            </div>
          </div>

          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Status information</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Status:</span>
                <span class="dash-modal__value">
                  <div :class="['dash-chip', statusBadgeClass(request)]">
                    {{ request.status_label }}
                  </div>
                </span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Requested at:</span>
                <span class="dash-modal__value">{{ request.requested_at_label || EM_DASH }}</span>
              </div>
              <div v-if="request.admin_approved_at_label" class="dash-modal__row">
                <span class="dash-modal__label">Admin approved at:</span>
                <span class="dash-modal__value">{{ request.admin_approved_at_label }}</span>
              </div>
            </div>
          </div>

          <div v-if="isPendingApproval(request)" class="dash-modal__section">
            <div class="dash-modal__section-title">Employee approvals</div>
            <div class="approval-info">
              <div class="approval-item">
                <q-icon
                  :name="request.to_employee_approved ? 'check_circle' : 'schedule'"
                  :color="request.to_employee_approved ? 'positive' : 'warning'"
                  size="20px"
                />
                <span>
                  {{ request.to_employee_name || 'The other employee' }}:
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
      <q-card-section class="dash-modal__foot">
        <!-- Close first, Approve last: the primary action of the dialog sits at
             the end of the row, where the eye finishes. -->
        <q-btn
          flat
          no-caps
          label="Close"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          v-if="isPendingApproval(request)"
          flat
          no-caps
          label="Reject"
          class="dash-modal__reject"
          @click="$emit('reject', request)"
        />
        <q-btn
          v-if="isPendingApproval(request)"
          unelevated
          no-caps
          label="Approve"
          class="dash-modal__approve"
          :disable="!canAdminApprove(request)"
          @click="$emit('approve', request)"
        >
          <q-tooltip v-if="!canAdminApprove(request)"> Waiting for employee approval </q-tooltip>
        </q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { EM_DASH } from 'src/composables/utils/swapRequests'

defineProps({
  modelValue: Boolean,
  request: Object,
})
defineEmits(['update:modelValue', 'approve', 'reject'])

// Dates, names, shift and site labels and the status wording arrive already
// resolved on the request (composables/utils/swapRequests.js), so this dialog
// and the grid behind it can never phrase the same request differently.

const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
// The badge palette in requestModal.css is keyed by these class names; the tone
// on the request is the shared vocabulary that maps onto them.
const BADGE_CLASSES = {
  pending: 'dash-chip--warn',
  info: 'dash-chip--info',
  approved: 'dash-chip--good',
  rejected: 'dash-chip--critical',
  default: '',
}
const statusBadgeClass = (request) => BADGE_CLASSES[request?.status_tone] || ''
const isPendingApproval = (request) => {
  if (!request) return false
  return request.status === 'pending' || request.status === 'to_employee_approved'
}
const canAdminApprove = (request) => {
  if (!request) return false
  return isPendingApproval(request) && request.to_employee_approved === true
}
</script>

<style scoped src="./requestModal.css"></style>
