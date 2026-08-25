<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="modal-card">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-icon name="more_time" class="modal-icon" />
          <div>
            <div class="modal-title">Overtime details</div>
            <div class="modal-subtitle">{{ request?.employeeName || '' }}</div>
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
      <q-card-section class="modal-content">
        <div class="detail-sections">
          <div class="detail-section">
            <div class="section-title">Request information</div>
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
                <span class="detail-value">{{
                  request?.hours === '-' ? '-' : request?.hours + 'h'
                }}</span>
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
                <span class="detail-label">Approved by:</span>
                <span class="detail-value">{{ request?.approvedByName || 'N/A' }}</span>
              </div>
              <div v-if="request?.attendances?.length" class="detail-row">
                <span class="detail-label">Attendance:</span>
                <span class="detail-value">
                  {{ request.attendances[0]?.time_in }} - {{ request.attendances[0]?.time_out }}
                </span>
              </div>
              <div v-if="request?.schedules?.length" class="detail-row">
                <span class="detail-label">Schedule:</span>
                <span class="detail-value">
                  {{ request.schedules[0]?.actual_start }} - {{ request.schedules[0]?.actual_end }}
                </span>
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
  if (status === 'requested') return 'status-requested'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  if (status === 'qualified') return 'status-qualified'
  return 'status-default'
}
</script>

<style scoped src="./requestModal.css"></style>
