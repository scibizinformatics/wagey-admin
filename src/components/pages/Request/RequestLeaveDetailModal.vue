<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="modal-card details-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="40px" class="modal-avatar">
            {{ request ? getInitials(request.employeeName) : '?' }}
          </q-avatar>
          <div>
            <div class="modal-title">{{ request?.employeeName || 'Request details' }}</div>
            <div class="modal-subtitle">{{ request?.department || 'General' }}</div>
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
            <div class="section-title">Request status</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <div :class="['status-badge', getLeaveStatusClass(request)]">
                    {{ capitalizeStatus(request.status) }}
                  </div>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">
                  <div class="type-badge">{{ request.type }}</div>
                </span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">Request information</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Start date:</span>
                <span class="detail-value">{{ formatDate(request.startDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">End date:</span>
                <span class="detail-value">{{ formatDate(request.endDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">{{ request.duration }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Submitted:</span>
                <span class="detail-value">{{ formatDateTime(request.submittedDate) }}</span>
              </div>
            </div>
          </div>
          <div v-if="request.reason" class="detail-section">
            <div class="section-title">Reason</div>
            <div class="reason-content">{{ request.reason }}</div>
          </div>
          <div v-if="request.message" class="detail-section">
            <div class="section-title">Additional message</div>
            <div class="message-content">{{ request.message }}</div>
          </div>
          <div v-if="request.adminResponse" class="detail-section">
            <div class="section-title">Admin response</div>
            <div class="admin-response">{{ request.adminResponse }}</div>
            <div v-if="request.respondedBy" class="response-meta">
              By {{ request.respondedBy }} &bull; {{ formatDateTime(request.respondedDate) }}
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-footer">
        <!-- Close first, Approve last: the primary action of the dialog sits at
             the end of the row, where the eye finishes. -->
        <div class="form-actions">
          <q-btn
            flat
            no-caps
            label="Close"
            class="cancel-btn"
            @click="$emit('update:modelValue', false)"
          />
          <q-btn
            v-if="request && request.status === 'pending'"
            flat
            no-caps
            label="Reject"
            class="reject-btn"
            @click="$emit('reject', request)"
            :loading="actionLoading === `reject-${request.id}`"
          />
          <q-btn
            v-if="request && request.status === 'pending'"
            unelevated
            no-caps
            label="Approve"
            class="approve-btn"
            @click="$emit('approve', request)"
            :loading="actionLoading === `approve-${request.id}`"
          />
        </div>
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
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}
</script>

<style scoped src="./requestModal.css"></style>
