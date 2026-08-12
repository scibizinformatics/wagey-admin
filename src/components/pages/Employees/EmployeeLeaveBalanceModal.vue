<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon modal-avatar-leave">
            <q-icon name="event_note" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">Add Leave Balance</div>
            <div class="modal-subtitle">{{ employeeName }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="cancel" />
      </q-card-section>

      <q-card-section class="modal-content">
        <q-form @submit="submit" class="edit-form">
          <div class="form-section">
            <div class="section-title">Leave Balance Details</div>
            <div class="form-grid">
              <q-select
                v-model="form.leave_type_id"
                :options="leaveTypeOptions"
                option-label="name"
                option-value="id"
                emit-value
                map-options
                label="Leave Type *"
                outlined
                dense
                :loading="loadingLeaveTypes"
                :rules="[(val) => !!val || 'Leave type is required']"
              />
              <q-input
                v-model.number="form.days"
                type="number"
                step="0.01"
                label="Days *"
                outlined
                dense
                :rules="[
                  (val) => val !== null && val !== '' || 'Days is required',
                  (val) => !isNaN(val) || 'Must be a number',
                ]"
              />
            </div>
          </div>

          <div class="form-actions">
            <q-btn label="Cancel" flat class="cancel-btn" @click="cancel" />
            <q-btn label="Add Balance" type="submit" unelevated class="submit-btn" :loading="submitting" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  employee: { type: Object, default: () => ({}) },
  leaveTypeOptions: { type: Array, default: () => [] },
  loadingLeaveTypes: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const form = ref({
  leave_type_id: null,
  days: null,
})

const employeeName = computed(() => {
  const emp = props.employee
  if (!emp) return 'Unknown'
  return `${emp.user?.first_name || ''} ${emp.user?.last_name || ''}`.trim() || emp.user?.username || 'Unknown'
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.value = {
        leave_type_id: null,
        days: null,
      }
    }
  },
)

const submit = () => {
  const emp = props.employee || {}
  emit('submit', {
    employee_ids: [emp.id],
    company_id: emp.companies?.[0]?.company_id || 0,
    leave_type_id: form.value.leave_type_id,
    days: String(form.value.days),
  })
}

const cancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-card {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  width: 560px;
  max-width: 95vw !important;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: #102335 !important;
  border-bottom: none !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.modal-header .q-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.modal-header .q-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-avatar-leave {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
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

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  max-height: 70vh;
  flex: 1;
  background: #f9fafb !important;
}

.modal-content::-webkit-scrollbar {
  width: 4px;
}
.modal-content::-webkit-scrollbar-track {
  background: transparent;
}
.modal-content::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

.modal-content :deep(.q-field__control) {
  background: #ffffff !important;
  border-radius: 10px !important;
}
.modal-content :deep(.q-field--outlined .q-field__control:before) {
  border-color: #e2e8f0 !important;
  border-radius: 10px !important;
}
.modal-content :deep(.q-field--outlined .q-field__control:hover:before) {
  border-color: #2563eb !important;
}
.modal-content :deep(.q-field--outlined.q-field--focused .q-field__control:before) {
  border-color: #2563eb !important;
  border-width: 2px !important;
}

.form-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  text-transform: none;
  font-weight: 500;
  font-size: 13px;
  border-radius: 8px;
  min-height: 36px;
  padding: 0 16px;
  color: #475569;
}

.submit-btn {
  text-transform: none;
  font-weight: 500;
  font-size: 13px;
  border-radius: 8px;
  min-height: 36px;
  padding: 0 16px;
  background: #102335 !important;
  color: #ffffff !important;
}

@media (max-width: 480px) {
  .modal-card {
    width: 95vw;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
