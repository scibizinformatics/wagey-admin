<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="inline-edit-card">
      <q-card-section class="inline-edit-header">
        <div>
          <div class="dialog-title">Edit Cost Center</div>
          <div class="dialog-subtitle text-grey-6 text-caption">
            {{ employeeName }} — {{ date }}
          </div>
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section class="q-pt-md q-pb-md">
        <q-select
          filled
          dense
          :model-value="value"
          @update:model-value="$emit('update:value', $event)"
          :options="costCenterOptions"
          label="Cost Center"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          clearable
          :loading="loading"
          class="form-field"
          behavior="menu"
          menu-anchor="bottom left"
          menu-self="top left"
          autofocus
        >
          <template v-slot:prepend>
            <q-icon name="account_balance_wallet" size="xs" />
          </template>
          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-grey">No cost centers found</q-item-section>
            </q-item>
          </template>
        </q-select>
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
          class="primary-btn"
          @click="$emit('save')"
          :loading="saving"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  employeeName: { type: String, default: '' },
  date: { type: String, default: '' },
  value: { type: [String, Number], default: null },
  costCenterOptions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
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
  background: #102335;
}
.inline-edit-header .q-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.inline-edit-header .q-btn:hover {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}
.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
}
.dialog-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8) !important;
  margin-top: 2px;
}
.primary-btn {
  background: #102335 !important;
  color: white;
}
.primary-btn:hover {
  background: #193d5c !important;
}
</style>
