<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card" style="width: 520px; max-width: 95vw">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
            <q-icon name="beach_access" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">Apply Leave</div>
            <div class="modal-subtitle">Assign leave to an employee</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section class="modal-content">
        <div class="form-section">
          <div class="section-title">Leave Details</div>
          <div class="form-grid">
            <q-select
              outlined
              :model-value="form.employee_id"
              @update:model-value="form.employee_id = $event"
              :options="employeeOptions"
              label="Employee *"
              use-input
              use-chips
              @filter="onFilter"
              :rules="[(val) => !!val || 'Employee is required']"
              class="col-span-2"
              :input-debounce="0"
              option-value="id"
              option-label="name"
              emit-value
              map-options
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey-6">
                    No employees found
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-select
              outlined
              :model-value="form.leave_type"
              @update:model-value="form.leave_type = $event"
              :options="leaveTypeOptions"
              label="Leave Type *"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              :rules="[(val) => !!val || 'Leave type is required']"
              class="col-span-2"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey-6">
                    No leave types found
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-input
              outlined
              :model-value="form.start_date"
              @update:model-value="form.start_date = $event"
              label="Start Date *"
              type="date"
              :rules="[(val) => !!val || 'Start date is required']"
            />
            <q-input
              outlined
              :model-value="form.end_date"
              @update:model-value="form.end_date = $event"
              label="End Date *"
              type="date"
              :rules="[(val) => !!val || 'End date is required']"
            />
            <q-input
              outlined
              :model-value="form.hours"
              @update:model-value="form.hours = $event"
              label="Hours *"
              type="number"
              :rules="[(val) => val !== null && val !== '' || 'Hours is required']"
            />
            <q-input
              outlined
              :model-value="form.reason"
              @update:model-value="form.reason = $event"
              label="Reason (optional)"
              type="textarea"
              rows="3"
              class="col-span-2"
            />
          </div>
        </div>

        <div class="form-actions">
          <q-btn flat label="Cancel" class="cancel-btn" @click="$emit('update:modelValue', false)" />
          <q-btn unelevated label="Assign Leave" class="submit-btn" :loading="submitting" @click="onSubmit" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive, computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  employeeOptions: { type: Array, default: () => [] },
  leaveTypes: { type: Array, default: () => [] },
  submitting: Boolean,
})

const emit = defineEmits(['update:modelValue', 'submit', 'filter-employees'])

const form = reactive({
  employee_id: null,
  leave_type: null,
  start_date: '',
  end_date: '',
  hours: 8,
  reason: '',
})

const leaveTypeOptions = computed(() =>
  props.leaveTypes.map((lt) => ({ id: lt.id, name: lt.name })),
)

const onFilter = (val, update) => {
  emit('filter-employees', val)
  update(() => {})
}

const onSubmit = () => {
  const payload = {
    employee_id: form.employee_id,
    leave_type: form.leave_type,
    start_date: form.start_date,
    end_date: form.end_date,
    hours: String(form.hours),
    reason: form.reason || '',
  }
  emit('submit', payload)
}
</script>

<style scoped>
.modal-card {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
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

.modal-avatar-add {
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
  margin-bottom: 20px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.col-span-2 {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #f1f3f5;
  margin-top: 8px;
}

.cancel-btn {
  background: #102335 !important;
  color: #ffffff !important;
  border-radius: 10px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  padding: 0 18px !important;
  min-height: 38px !important;
}
.cancel-btn:hover {
  background: #193d5c !important;
}
.submit-btn {
  background: #102335 !important;
  color: white;
  border-radius: 10px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  min-height: 38px !important;
  padding: 0 22px !important;
}
.submit-btn:hover {
  background: #193d5c !important;
  box-shadow: 0 4px 12px rgba(16, 35, 53, 0.3) !important;
}

@media (max-width: 768px) {
  .modal-card {
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 24px);
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .col-span-2 {
    grid-column: span 1;
  }
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions .q-btn {
    width: 100%;
  }
}

.modal-content :deep(input[type=number])::-webkit-outer-spin-button,
.modal-content :deep(input[type=number])::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.modal-content :deep(input[type=number]) {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
