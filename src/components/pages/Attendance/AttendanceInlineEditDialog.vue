<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="inline-edit-card">
      <q-card-section class="inline-edit-header">
        <div>
          <div class="dialog-title">Edit {{ field === 'time_in' ? 'Time In' : 'Time Out' }}</div>
          <div class="dialog-subtitle text-grey-6 text-caption">
            {{ employeeName }} — {{ date }}
          </div>
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pt-md q-pb-md">
        <q-input
          filled
          dense
          :model-value="value"
          @update:model-value="$emit('update:value', $event)"
          :label="field === 'time_in' ? 'New Time In' : 'New Time Out'"
          type="time"
          class="form-field"
          autofocus
        >
          <template v-slot:prepend>
            <q-icon :name="field === 'time_in' ? 'login' : 'logout'" size="xs" />
          </template>
        </q-input>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-sm">
        <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" size="sm" />
        <q-btn
          unelevated
          color="primary"
          label="Save"
          icon="check"
          size="sm"
          @click="$emit('save')"
          :loading="saving"
          :disable="!value"
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
});

defineEmits(['update:modelValue', 'update:value', 'save']);
</script>

<style scoped>
.inline-edit-card {
  width: 100%;
  max-width: 320px;
  border-radius: 12px;
}
.inline-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 16px;
}
.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
  line-height: 1.3;
}
.dialog-subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}
</style>
