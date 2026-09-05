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
            {{ request ? getInitials(request.employeeName) : '?' }}
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ request?.employeeName || 'Request details' }}</div>
            <div class="dash-modal__sub">{{ request?.department || 'General' }}</div>
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
            <div class="dash-modal__section-title">Request status</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Status:</span>
                <span class="dash-modal__value">
                  <div :class="['dash-chip', getLeaveStatusClass(request)]">
                    {{ capitalizeStatus(request.status) }}
                  </div>
                </span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Type:</span>
                <span class="dash-modal__value">
                  <div class="type-badge">{{ request.type }}</div>
                </span>
              </div>
            </div>
          </div>
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Request information</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Start date:</span>
                <span class="dash-modal__value">{{ formatDate(request.startDate) }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">End date:</span>
                <span class="dash-modal__value">{{ formatDate(request.endDate) }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Duration:</span>
                <span class="dash-modal__value">{{ request.duration }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Submitted:</span>
                <span class="dash-modal__value">{{ formatDateTime(request.submittedDate) }}</span>
              </div>
            </div>
          </div>
          <div v-if="request.reason" class="dash-modal__section">
            <div class="dash-modal__section-title">Reason</div>
            <div class="dash-modal__note">{{ request.reason }}</div>
          </div>
          <div v-if="request.message" class="dash-modal__section">
            <div class="dash-modal__section-title">Additional message</div>
            <div class="dash-modal__note">{{ request.message }}</div>
          </div>
          <div v-if="request.adminResponse" class="dash-modal__section">
            <div class="dash-modal__section-title">Admin response</div>
            <div class="dash-modal__note">{{ request.adminResponse }}</div>
            <div v-if="request.respondedBy" class="dash-modal__meta">
              By {{ request.respondedBy }} &bull; {{ formatDateTime(request.respondedDate) }}
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
          v-if="request && request.status === 'pending'"
          flat
          no-caps
          label="Reject"
          class="dash-modal__reject"
          @click="$emit('reject', request)"
          :loading="actionLoading === `reject-${request.id}`"
        />
        <q-btn
          v-if="request && request.status === 'pending'"
          unelevated
          no-caps
          label="Approve"
          class="dash-modal__approve"
          @click="$emit('approve', request)"
          :loading="actionLoading === `approve-${request.id}`"
        />
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
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
const getLeaveStatusClass = (request) => {
  const status = request.status
  if (status === 'pending') return 'dash-chip--warn'
  if (status === 'approved') return 'dash-chip--good'
  if (status === 'rejected') return 'dash-chip--critical'
  return ''
}
</script>

<style scoped src="./requestModal.css"></style>
