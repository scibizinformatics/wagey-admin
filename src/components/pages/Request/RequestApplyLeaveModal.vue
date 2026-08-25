<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="modal-card" style="width: 520px; max-width: 95vw">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="38px" class="modal-avatar-icon modal-avatar-add">
            <q-icon name="beach_access" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">Apply leave</div>
            <div class="modal-subtitle">Assign leave to an employee</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          dense
          class="modal-close-btn"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="modal-content">
        <div class="form-section">
          <div class="section-title">Leave details</div>
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
                  <q-item-section class="text-grey-6"> No employees found </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-select
              outlined
              :model-value="form.leave_type"
              @update:model-value="form.leave_type = $event"
              :options="leaveTypeOptions"
              label="Leave type *"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              :rules="[(val) => !!val || 'Leave type is required']"
              class="col-span-2"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey-6"> No leave types found </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-input
              outlined
              :model-value="form.start_date"
              @update:model-value="form.start_date = $event"
              label="Start date *"
              type="date"
              :rules="[(val) => !!val || 'Start date is required']"
            />
            <q-input
              outlined
              :model-value="form.end_date"
              @update:model-value="form.end_date = $event"
              label="End date *"
              type="date"
              :rules="[(val) => !!val || 'End date is required']"
            />
            <q-input
              outlined
              :model-value="form.hours"
              @update:model-value="form.hours = $event"
              label="Hours *"
              type="number"
              :rules="[(val) => (val !== null && val !== '') || 'Hours is required']"
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
          <q-btn
            flat
            label="Cancel"
            class="cancel-btn"
            @click="$emit('update:modelValue', false)"
          />
          <q-btn
            unelevated
            label="Assign leave"
            class="submit-btn"
            :loading="submitting"
            @click="onSubmit"
          />
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

<style scoped src="./requestModal.css"></style>
