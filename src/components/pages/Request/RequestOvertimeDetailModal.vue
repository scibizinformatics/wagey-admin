<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="more_time" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Overtime details</div>
            <div class="dash-modal__sub">{{ request?.employeeName || '' }}</div>
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
      <q-card-section class="dash-modal__body">
        <div class="dash-modal__stack">
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Request information</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Employee:</span>
                <span class="dash-modal__value">{{ request?.employeeName }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Date:</span>
                <span class="dash-modal__value">{{ formatDate(request?.date) }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Hours:</span>
                <span class="dash-modal__value">{{ formatOvertimeHours(request?.hours) }}</span>
              </div>
              <div v-if="request?.qualifiedHours !== null" class="dash-modal__row">
                <span class="dash-modal__label">Qualified hours:</span>
                <span class="dash-modal__value">{{
                  formatOvertimeHours(request?.qualifiedHours)
                }}</span>
              </div>
              <div v-if="request?.approvedHours !== null" class="dash-modal__row">
                <span class="dash-modal__label">Approved hours:</span>
                <span class="dash-modal__value">{{
                  formatOvertimeHours(request?.approvedHours)
                }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Category:</span>
                <span class="dash-modal__value">{{ request?.categoryName }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Status:</span>
                <span class="dash-modal__value">
                  <div :class="['dash-chip', getStatusClass(request?.status)]">
                    {{ overtimeStatusLabel(request?.status) }}
                  </div>
                </span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Converted to CTO:</span>
                <span class="dash-modal__value">{{ request?.convertedToCto ? 'Yes' : 'No' }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Submitted:</span>
                <span class="dash-modal__value">{{ formatDate(request?.submittedDate) }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Approved by:</span>
                <span class="dash-modal__value">{{ request?.approvedByName || 'Pending' }}</span>
              </div>
              <div v-if="request?.attendances?.length" class="dash-modal__row">
                <span class="dash-modal__label">Attendance:</span>
                <span class="dash-modal__value">
                  {{ request.attendances[0]?.time_in }} - {{ request.attendances[0]?.time_out }}
                </span>
              </div>
              <div v-if="request?.schedules?.length" class="dash-modal__row">
                <span class="dash-modal__label">Schedule:</span>
                <span class="dash-modal__value">
                  {{ request.schedules[0]?.actual_start }} - {{ request.schedules[0]?.actual_end }}
                </span>
              </div>
            </div>
            <div v-if="request?.reason" class="info-content">
              <div class="dash-modal__field-label">Reason:</div>
              <div class="dash-modal__note">{{ request.reason }}</div>
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
// Wording and hour formatting come from the shared overtime module, so this
// modal and the queue behind it cannot disagree about the same request.
import { formatOvertimeHours, overtimeStatusLabel } from 'src/composables/utils/overtimeRequests'

defineProps({
  modelValue: Boolean,
  request: Object,
})
defineEmits(['update:modelValue'])

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const getStatusClass = (status) => {
  const key = String(status || '').toLowerCase()
  if (key === 'qualified') return 'dash-chip--info'
  if (key === 'requested' || key === 'pending') return 'dash-chip--warn'
  if (key.includes('approved')) return 'dash-chip--good'
  if (key.includes('rejected')) return 'dash-chip--critical'
  return ''
}
</script>

<style scoped src="./requestModal.css"></style>
