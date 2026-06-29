<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card" style="max-width: 500px">
      <q-card-section class="modal-header">
        <div class="modal-title">Quick Add Shifts</div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-card-section class="modal-body">
        <div class="quick-info">
          <div class="info-item">
            <q-icon name="person" size="20px" />
            <span>{{ employeeName }}</span>
          </div>
          <div class="info-item">
            <q-icon name="today" size="20px" />
            <span>{{ dayLabel }}</span>
          </div>
        </div>
        <q-form @submit.prevent="onSubmit" class="schedule-form">
          <div v-for="(shift, index) in quickAdd.shifts" :key="index" class="shift-row">
            <div class="shift-row-header">
              <span class="row-label">
                <q-icon name="schedule" size="16px" />
                Shift {{ index + 1 }}
              </span>
              <q-btn
                v-if="quickAdd.shifts.length > 1"
                flat dense round icon="close" size="sm"
                @click="$emit('remove-shift', index)"
                class="remove-btn"
              />
            </div>
            <div class="shift-fields">
              <q-select
                :model-value="shift.shiftTemplate"
                @update:model-value="updateShift(index, 'shiftTemplate', $event)"
                :options="shiftTemplateOptions"
                option-value="value"
                option-label="label"
                label="Shift Template"
                outlined dense emit-value map-options clearable
                class="form-field full-width"
                :rules="[(val) => !!val || 'Shift template is required']"
              >
                <template #option="scope">
                  <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                    <q-item-section>
                      <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                        <q-item-label
                          v-for="(part, i) in scope.opt.label.split(' / ')"
                          :key="i"
                          style="font-size: 13px; line-height: 1.5"
                        >{{ part }}</q-item-label>
                      </template>
                      <q-item-label v-else style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px">
                        {{ scope.opt.label }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
          </div>
          <q-banner class="info-banner" dense>
            <template #avatar>
              <q-icon name="info" color="primary" />
            </template>
            <span style="font-size: 12px">
              Adding {{ quickAdd.shifts.length }} shift{{ quickAdd.shifts.length > 1 ? 's' : '' }} for <strong>{{ dayLabel }}</strong>
            </span>
          </q-banner>
          <div class="modal-actions">
            <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" class="cancel-btn" />
            <q-btn
              type="submit"
              color="primary"
              label="Add Shift"
              unelevated
              class="submit-btn"
              :loading="adding"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  quickAdd: { type: Object, default: () => ({ userId: null, day: null, shifts: [], leaveType: null }) },
  shiftTemplateOptions: { type: Array, default: () => [] },
  employeeName: { type: String, default: '' },
  dayLabel: { type: String, default: '' },
  adding: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'update:quickAdd', 'submit', 'remove-shift']);

function updateShift(index, field, value) {
  const updated = { ...props.quickAdd };
  updated.shifts = [...updated.shifts];
  updated.shifts[index] = { ...updated.shifts[index], [field]: value };
  emit('update:quickAdd', updated);
}

function onSubmit() {
  emit('submit');
}
</script>

<style scoped>
.modal-card {
  border-radius: 14px !important;
  width: 500px !important;
  min-width: 500px !important;
  max-width: 95vw !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  background: #102335;
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}
.modal-header .q-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.modal-header .q-btn:hover {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}
.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 70vh;
}
.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.shift-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.row-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.remove-btn {
  color: #9ca3af;
}
.remove-btn:hover {
  color: #ef4444;
  background: #fef2f2 !important;
}
.shift-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-field {
  width: 100%;
}
.full-width {
  grid-column: 1 / -1;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f3f5;
}
.cancel-btn {
  background: #102335;
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 8px !important;
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}
.submit-btn {
  background: #102335 !important;
  color: white;
  padding: 6px 16px;
  border-radius: 8px !important;
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}
.submit-btn:hover {
  background: #193d5c !important;
}
.cancel-btn:hover {
  background: #193d5c;
}
.quick-info {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.info-banner {
  margin-top: 14px;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 12px;
  border-radius: 8px;
}
@media (max-width: 768px) {
  .modal-card {
    min-width: unset !important;
    max-width: calc(100vw - 20px) !important;
  }
}
</style>
