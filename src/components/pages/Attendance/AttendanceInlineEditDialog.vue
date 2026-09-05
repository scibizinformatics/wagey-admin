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
        <label class="dash-modal__field">
          <span class="dash-modal__field-label">
            {{ field === 'time_in' ? 'New time in' : 'New time out' }}
          </span>
          <q-input
            :model-value="value"
            type="time"
            outlined
            dense
            autofocus
            hide-bottom-space
            class="dash-field"
            @update:model-value="$emit('update:value', $event)"
          />
        </label>
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
defineProps({
  modelValue: { type: Boolean, default: false },
  field: { type: String, default: '' },
  employeeName: { type: String, default: '' },
  date: { type: String, default: '' },
  value: { type: String, default: '' },
  saving: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'update:value', 'save'])
</script>
