<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <!-- One field, so this is the narrowest step of the width ladder. -->
    <q-card class="dash-modal dash-modal--xs">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon">
            <q-icon :name="field === 'time_in' ? 'login' : 'logout'" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">
              Edit {{ field === 'time_in' ? 'time in' : 'time out' }}
            </div>
            <div class="dash-modal__sub">{{ employeeName }} &middot; {{ date }}</div>
          </div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <!--
          A `div`, not a `label`: a 24h field renders as two selects (hour and
          minute), and a label may only wrap one control — with two, a click on
          the label text activates the *first* one, so clicking the minute sent
          focus back to the hour. The label span above is what names the field.
        -->
        <div class="dash-modal__field">
          <span class="dash-modal__field-label">
            {{ field === 'time_in' ? 'New time in' : 'New time out' }}
          </span>
          <AttendanceTimeField
            :model-value="value"
            :time-format="timeFormat"
            autofocus
            @update:model-value="$emit('update:value', $event)"
          />
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
          label="Save"
          class="dash-modal__submit"
          :loading="saving"
          :disable="!value"
          @click="$emit('save')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import AttendanceTimeField from '@/components/pages/Attendance/AttendanceTimeField.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  field: { type: String, default: '' },
  employeeName: { type: String, default: '' },
  date: { type: String, default: '' },
  value: { type: String, default: '' },
  saving: { type: Boolean, default: false },
  // The company's `time_format` — '12h' | '24h'. Decides how the punch prints;
  // `value` stays 24h `HH:mm` either way.
  timeFormat: { type: String, default: '12h' },
})

defineEmits(['update:modelValue', 'update:value', 'save'])
</script>
