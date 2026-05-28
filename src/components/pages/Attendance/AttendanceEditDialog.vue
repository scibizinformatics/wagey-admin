<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="edit-dialog-card">
      <q-card-section>
        <div class="dialog-title">Edit Attendance</div>
      </q-card-section>

      <q-card-section class="q-pt-none" v-if="record">
        <q-form @submit.prevent="onSubmit" class="edit-form">
          <q-input
            filled
            :model-value="record.date"
            label="Date"
            type="date"
            class="form-field"
            readonly
            disable
          >
            <template v-slot:append>
              <q-icon name="lock" />
            </template>
          </q-input>

          <div class="time-inputs">
            <q-input
              filled
              :model-value="record.time_in"
              @update:model-value="updateField('time_in', $event)"
              label="Time In"
              type="time"
              class="form-field"
            />

            <q-input
              filled
              :model-value="record.time_out"
              @update:model-value="updateField('time_out', $event)"
              label="Time Out"
              type="time"
              class="form-field"
            />
          </div>

          <q-select
            filled
            :model-value="record.cost_center_id"
            @update:model-value="updateField('cost_center_id', $event)"
            :options="costCenterOptions"
            label="Cost Center"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            clearable
            :loading="optionsLoading"
            class="form-field q-mt-sm"
            behavior="menu"
            menu-anchor="bottom left"
            menu-self="top left"
          >
            <template v-slot:prepend>
              <q-icon name="account_balance_wallet" />
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">No cost centers found</q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" class="dialog-btn" />
        <q-btn
          color="primary"
          label="Update"
          @click="onSubmit"
          :loading="saving"
          class="dialog-btn primary-btn"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  record: { type: Object, default: null },
  costCenterOptions: { type: Array, default: () => [] },
  optionsLoading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'update:record', 'submit']);

function updateField(field, value) {
  emit('update:record', { ...props.record, [field]: value });
}

function onSubmit() {
  emit('submit', props.record);
}
</script>

<style scoped>
.edit-dialog-card {
  width: 100%;
  max-width: 500px;
  border-radius: 12px;
}
.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
  line-height: 1.3;
}
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.dialog-btn {
  padding: 7px 14px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
}
.primary-btn {
  background: #3b82f6;
  color: white;
}
@media (max-width: 768px) {
  .edit-dialog-card { max-width: 95vw; }
  .time-inputs { grid-template-columns: 1fr; }
}
</style>
