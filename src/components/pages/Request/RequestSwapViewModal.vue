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
            {{ request ? getInitials(request.requested_by_name) : '?' }}
          </q-avatar>
          <div>
            <div class="modal-title">
              {{ request?.requested_by_name || 'Swap request details' }}
            </div>
            <div class="modal-subtitle">Swap request</div>
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
            <div class="section-title">Swap details</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">From employee:</span>
                <span class="detail-value">{{ request.from_employee_name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">To employee:</span>
                <span class="detail-value">{{ request.to_employee_name }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">Original assignment</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">{{ formatDate(request.original_date) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Site:</span>
                <span class="detail-value">{{ request.original_assignment?.site || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shift:</span>
                <span class="detail-value">{{
                  request.original_assignment?.shift_type || 'N/A'
                }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">New assignment</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">{{ formatDate(request.new_date) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Site:</span>
                <span class="detail-value">{{ request.new_assignment?.site || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shift:</span>
                <span class="detail-value">{{ request.new_assignment?.shift_type || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">Status information</div>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <div :class="['status-badge', getStatusClass(request)]">
                    {{ getStatusLabel(request) }}
                  </div>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Requested at:</span>
                <span class="detail-value">{{ formatDateTime(request.requested_at) }}</span>
              </div>
              <div v-if="request.admin_approved_at" class="detail-row">
                <span class="detail-label">Admin approved at:</span>
                <span class="detail-value">{{ formatDateTime(request.admin_approved_at) }}</span>
              </div>
            </div>
          </div>

          <div v-if="isPendingApproval(request)" class="detail-section">
            <div class="section-title">Employee approvals</div>
            <div class="approval-info">
              <div class="approval-item">
                <q-icon
                  :name="request.to_employee_approved ? 'check_circle' : 'schedule'"
                  :color="request.to_employee_approved ? 'positive' : 'warning'"
                  size="20px"
                />
                <span>
                  {{ request.to_employee_name }}:
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
            v-if="isPendingApproval(request)"
            flat
            no-caps
            label="Reject"
            class="reject-btn"
            @click="$emit('reject', request)"
          />
          <q-btn
            v-if="isPendingApproval(request)"
            unelevated
            no-caps
            label="Approve"
            class="approve-btn"
            :disable="!canAdminApprove(request)"
            @click="$emit('approve', request)"
          >
            <q-tooltip v-if="!canAdminApprove(request)"> Waiting for employee approval </q-tooltip>
          </q-btn>
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
defineEmits(['update:modelValue', 'approve', 'reject'])

const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A'
  return new Date(dateTimeString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
const getStatusClass = (request) => {
  if (!request) return 'status-default'
  const status = request.status
  if (status === 'pending') return 'status-pending'
  if (status === 'to_employee_approved') return 'status-employee-approved'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}
const getStatusLabel = (request) => {
  if (!request) return ''
  const labels = {
    pending: 'Pending',
    to_employee_approved: 'Employee Approved',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return labels[request.status] || request.status
}
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
