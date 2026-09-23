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
            <div class="dash-modal__title">Update Contract?</div>
            <div v-if="employeeName" class="dash-modal__sub">{{ employeeName }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="dash-modal__confirm-text">
          Saving changes to this contract will recalculate all salary, overtime, and deductions
          within the current cutoff (up to today) for this employee. This cannot be undone.
        </div>
        <div class="confirm-note">
          Note: This update will only apply if your company has contract updates enabled in its
          labor settings. If not, the save will be blocked.
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
          label="Save & Recalculate"
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
  employee: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirm'])

const employeeName = computed(() => {
  if (!props.employee) return ''
  return (
    `${props.employee.user?.first_name || ''} ${props.employee.user?.last_name || ''}`.trim() ||
    props.employee.user?.username ||
    'N/A'
  )
})
</script>

<style scoped>
.confirm-note {
  margin-top: 10px;
  padding: 4px 0 0;
  font-size: 12px;
  color: var(--dash-ink-3);
}
</style>