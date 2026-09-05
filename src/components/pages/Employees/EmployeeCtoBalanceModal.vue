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
            <q-icon name="more_time" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Add CTO balance</div>
            <div class="dash-modal__sub">{{ employeeName }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="cancel" />
      </q-card-section>

      <q-form @submit="submit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <div class="form-section">
            <div class="dash-modal__section-title">CTO balance details</div>
            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Hours<span class="dash-modal__req">*</span></span
                >
                <q-input
                  v-model.number="form.hours"
                  type="number"
                  step="0.01"
                  outlined
                  dense
                  :rules="[
                    (val) => (val !== null && val !== '') || 'Hours is required',
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
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const form = ref({
  hours: null,
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
        hours: null,
      }
    }
  },
)

const submit = () => {
  const emp = props.employee || {}
  emit('submit', {
    employee_ids: [emp.id],
    company_id: emp.companies?.[0]?.company_id || 0,
    hours: String(form.value.hours),
  })
}

const cancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped></style>
