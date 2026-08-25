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
            <q-icon name="assignment" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">Overtime advance</div>
            <div class="modal-subtitle">Create overtime advance request</div>
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
          <div class="section-title">Request details</div>
          <div class="form-grid">
            <q-select
              outlined
              :model-value="form.employee_ids"
              @update:model-value="form.employee_ids = $event"
              :options="employeeOptions"
              label="Employees *"
              use-input
              use-chips
              multiple
              @filter="onFilter"
              :rules="[(val) => (val && val.length > 0) || 'At least one employee is required']"
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
              :model-value="form.category"
              @update:model-value="form.category = $event"
              :options="categories"
              label="Category *"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              :rules="[(val) => !!val || 'Category is required']"
              class="col-span-2"
            />
            <q-input
              outlined
              :model-value="form.date"
              @update:model-value="form.date = $event"
              label="Date *"
              type="date"
              :rules="[(val) => !!val || 'Date is required']"
              class="col-span-2"
            />
            <q-input
              outlined
              :model-value="form.limit_hours"
              @update:model-value="form.limit_hours = $event"
              label="Limit hours (optional)"
              type="text"
              hint="Accepts negative values like -5.9"
              class="col-span-2"
            />
            <q-input
              outlined
              :model-value="form.reason"
              @update:model-value="form.reason = $event"
              label="Reason"
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
            label="Submit"
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
