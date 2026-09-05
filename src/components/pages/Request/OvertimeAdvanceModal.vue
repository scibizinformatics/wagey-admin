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
            <q-icon name="assignment" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Overtime advance</div>
            <div class="dash-modal__sub">Create overtime advance request</div>
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
          <div class="dash-modal__section-title">Request details</div>
          <div class="dash-modal__grid">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Employees<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.employee_ids"
                @update:model-value="form.employee_ids = $event"
                :options="employeeOptions"
                use-input
                use-chips
                multiple
                @filter="onFilter"
                :rules="[(val) => (val && val.length > 0) || 'At least one employee is required']"
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
                >Category<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.category"
                @update:model-value="form.category = $event"
                :options="categories"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Category is required']"
                class="dash-field dash-modal__span-2"
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Date<span class="dash-modal__req">*</span></span
              >
              <q-input
                outlined
                :model-value="form.date"
                @update:model-value="form.date = $event"
                type="date"
                :rules="[(val) => !!val || 'Date is required']"
                class="dash-field dash-modal__span-2"
                dense
                hide-bottom-space
              />
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Limit hours</span>
              <q-input
                outlined
                :model-value="form.limit_hours"
                @update:model-value="form.limit_hours = $event"
                type="text"
                hint="Accepts negative values like -5.9"
                class="dash-field dash-modal__span-2"
                dense
                hide-bottom-space
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
          label="Submit"
          class="dash-modal__submit"
          :loading="submitting"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive } from 'vue'

defineProps({
  modelValue: Boolean,
  categories: { type: Array, default: () => [] },
  employeeOptions: { type: Array, default: () => [] },
  submitting: Boolean,
  companyId: String,
})

const emit = defineEmits(['update:modelValue', 'submit', 'filter-employees'])

const form = reactive({
  employee_ids: [],
  category: null,
  date: '',
  limit_hours: '',
  reason: '',
})

const onFilter = (val, update) => {
  emit('filter-employees', val)
  update(() => {})
}

const onSubmit = () => {
  const payload = {
    employee_ids: form.employee_ids,
    category: form.category,
    date: form.date,
    reason: form.reason,
  }
  if (form.limit_hours !== '' && form.limit_hours !== null) {
    payload.limit_hours = form.limit_hours
  }
  emit('submit', payload)
}
</script>

<style scoped src="./requestModal.css"></style>
