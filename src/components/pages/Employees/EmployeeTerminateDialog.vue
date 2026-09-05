<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--confirm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon dash-modal__head-icon--danger">
            <q-icon name="block" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Terminate employee?</div>
            <div class="dash-modal__sub">{{ fullName }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <!-- The sentence says what changes AND that it can be undone: a
             confirmation that only warns leaves the reader guessing at the cost
             of getting it wrong. -->
        <div class="dash-modal__confirm-text">
          <strong>{{ fullName }}</strong> is marked Terminated and loses access to the app. You can
          restore them later.
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          label="Terminate"
          class="dash-modal__danger"
          :loading="loading"
          @click="$emit('confirm')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employee: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirm'])

const fullName = computed(() => {
  if (!props.employee) return 'N/A'
  return (
    `${props.employee.user?.first_name || ''} ${props.employee.user?.last_name || ''}`.trim() ||
    props.employee.user?.username ||
    'N/A'
  )
})
</script>
