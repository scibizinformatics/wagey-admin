<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--sm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="bolt" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Quick add shifts</div>
          </div>
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-form @submit.prevent="onSubmit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
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

          <div
            v-for="(shift, index) in quickAdd.shifts"
            :key="index"
            class="dash-modal__group shift-row"
          >
            <div class="dash-modal__group-head">
              <span class="row-label">
                <q-icon name="schedule" size="16px" />
                Shift {{ index + 1 }}
              </span>
              <q-btn
                v-if="quickAdd.shifts.length > 1"
                flat
                dense
                round
                icon="close"
                size="sm"
                @click="$emit('remove-shift', index)"
                class="remove-btn"
              />
            </div>
            <div class="shift-fields">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Shift template</span>
                <q-select
                  :model-value="shift.shiftTemplate"
                  @update:model-value="updateShift(index, 'shiftTemplate', $event)"
                  :options="shiftTemplateOptions"
                  option-value="value"
                  option-label="label"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  class="dash-field form-field full-width"
                  :rules="[(val) => !!val || 'Shift template is required']"
                  hide-bottom-space
                  popup-content-class="dash-popup dash-popup--modal"
                >
                  <template #option="scope">
                    <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                      <q-item-section>
                        <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                          <q-item-label
                            v-for="(part, i) in scope.opt.label.split(' / ')"
                            :key="i"
                            style="font-size: 13px; line-height: 1.5"
                            >{{ part }}</q-item-label
                          >
                        </template>
                        <q-item-label
                          v-else
                          style="
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            font-size: 13px;
                          "
                        >
                          {{ scope.opt.label }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </label>
            </div>
          </div>
          <q-banner class="info-banner" dense>
            <template #avatar>
              <q-icon name="info" color="primary" />
            </template>
            <span style="font-size: 12px">
              Adding {{ quickAdd.shifts.length }} shift{{
                quickAdd.shifts.length > 1 ? 's' : ''
              }}
              for <strong>{{ dayLabel }}</strong>
            </span>
          </q-banner>
        </q-card-section>
        <q-card-actions class="dash-modal__foot">
          <q-btn
            flat
            label="Cancel"
            @click="$emit('update:modelValue', false)"
            class="dash-modal__cancel"
          />
          <q-btn
            type="submit"
            label="Add shift"
            unelevated
            class="dash-modal__submit"
            :loading="adding"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  quickAdd: {
    type: Object,
    default: () => ({ userId: null, day: null, shifts: [], leaveType: null }),
  },
  shiftTemplateOptions: { type: Array, default: () => [] },
  employeeName: { type: String, default: '' },
  dayLabel: { type: String, default: '' },
  adding: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'update:quickAdd', 'submit', 'remove-shift'])

function updateShift(index, field, value) {
  const updated = { ...props.quickAdd }
  updated.shifts = [...updated.shifts]
  updated.shifts[index] = { ...updated.shifts[index], [field]: value }
  emit('update:quickAdd', updated)
}

function onSubmit() {
  emit('submit')
}
</script>

<style scoped>
.row-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink-2);
}
.remove-btn {
  color: var(--dash-ink-4);
}
.remove-btn:hover {
  color: var(--dash-critical-mark);
  background: var(--dash-critical-bg) !important;
}
.shift-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.form-field {
  width: 100%;
}
.full-width {
  grid-column: 1 / -1;
}
.quick-info {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--dash-n-25);
  border-radius: var(--dash-r-md);
  border: 1px solid var(--dash-line);
}
.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.info-banner {
  margin-top: 14px;
  padding: 12px;
  background: var(--dash-info-bg);
  border: 1px solid var(--dash-info-line);
  border-radius: var(--dash-r-md);
}
</style>
