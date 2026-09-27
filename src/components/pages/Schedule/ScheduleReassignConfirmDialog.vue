<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--confirm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon dash-modal__head-icon--warn">
            <q-icon name="o_warning_amber" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              {{ reassignData.isDualShift ? 'Update both shifts?' : 'Update this shift?' }}
            </div>
            <div v-if="subtitle" class="dash-modal__sub">{{ subtitle }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="dash-modal__confirm-text">
          {{ reassignData.isDualShift ? 'Both shifts are' : 'The shift is' }} replaced, and the
          attendance log for that day is removed along with it. Hours logged there will no longer
          count. This cannot be undone.
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
          :label="reassignData.isDualShift ? 'Update both shifts' : 'Update Shift'"
          class="dash-modal__submit"
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
  reassignData: { type: Object, default: () => ({}) },
  employeeName: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirm'])

// "Name · date" reads as the subject of the warning in the head; the date is the
// part that identifies *which* day loses its log, so it is not optional here.
const subtitle = computed(() => {
  const date = props.reassignData.date
  return [props.employeeName, date].filter(Boolean).join(' · ')
})
</script>
