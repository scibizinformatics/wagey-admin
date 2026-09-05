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
            <q-icon name="beach_access" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Apply leave</div>
            <div class="dash-modal__sub">Assign leave to an employee</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          dense
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="form-section">
          <div class="dash-modal__section-title">Leave details</div>
          <div class="dash-modal__grid">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Employee<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.employee_id"
                @update:model-value="form.employee_id = $event"
                :options="employeeOptions"
                use-input
                use-chips
                @filter="onFilter"
                :rules="[(val) => !!val || 'Employee is required']"
                class="dash-field dash-modal__span-2"
                :input-debounce="0"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-6"> No employees found </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Leave type<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.leave_type"
                @update:model-value="form.leave_type = $event"
                :options="leaveTypeOptions"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Leave type is required']"
                class="dash-field dash-modal__span-2"
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-6"> No leave types found </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Start date<span class="dash-modal__req">*</span></span
              >
              <q-input
                outlined
                :model-value="form.start_date"
                @update:model-value="form.start_date = $event"
                type="date"
                :rules="[(val) => !!val || 'Start date is required']"
                dense
                hide-bottom-space
                class="dash-field"
              />
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >End date<span class="dash-modal__req">*</span></span
              >
              <q-input
                outlined
                :model-value="form.end_date"
                @update:model-value="form.end_date = $event"
                type="date"
                :rules="[(val) => !!val || 'End date is required']"
                dense
                hide-bottom-space
                class="dash-field"
              />
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Hours<span class="dash-modal__req">*</span></span
              >
              <q-input
                outlined
                :model-value="form.hours"
                @update:model-value="form.hours = $event"
                type="number"
                :rules="[(val) => (val !== null && val !== '') || 'Hours is required']"
                dense
                hide-bottom-space
                class="dash-field"
              />
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Reason</span>
              <q-input
                outlined
                :model-value="form.reason"
                @update:model-value="form.reason = $event"
                type="textarea"
                rows="3"
                class="dash-field dash-modal__span-2"
                dense
                hide-bottom-space
              />
            </label>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          label="Assign leave"
          class="dash-modal__submit"
          :loading="submitting"
          @click="onSubmit"
        />
      </q-card-actions>
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
