<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="event_note" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Add leave balance</div>
            <div class="dash-modal__sub">{{ employeeName }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="cancel" />
      </q-card-section>

      <q-form @submit="submit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <div class="form-section">
            <div class="dash-modal__section-title">Leave balance details</div>
            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Leave type<span class="dash-modal__req">*</span></span
                >
                <q-select
                  v-model="form.leave_type_id"
                  :options="leaveTypeOptions"
                  option-label="name"
                  option-value="id"
                  emit-value
                  map-options
                  outlined
                  dense
                  :loading="loadingLeaveTypes"
                  :rules="[(val) => !!val || 'Leave type is required']"
                  hide-bottom-space
                  class="dash-field"
                  popup-content-class="dash-popup dash-popup--modal"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Days<span class="dash-modal__req">*</span></span
                >
                <q-input
                  v-model.number="form.days"
                  type="number"
                  step="0.01"
                  outlined
                  dense
                  :rules="[
                    (val) => (val !== null && val !== '') || 'Days is required',
                    (val) => !isNaN(val) || 'Must be a number',
                  ]"
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn label="Cancel" flat class="dash-modal__cancel" @click="cancel" />
          <q-btn
            label="Add balance"
            type="submit"
            unelevated
            class="dash-modal__submit"
            :loading="submitting"
          />
        </q-card-actions>
      </q-form>
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
  return (
    `${emp.user?.first_name || ''} ${emp.user?.last_name || ''}`.trim() ||
    emp.user?.username ||
    'Unknown'
  )
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

<style scoped></style>
