<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--sm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="edit_calendar" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Edit attendance</div>
            <div class="dash-modal__sub">{{ record?.date || 'Punch times and cost center' }}</div>
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

      <q-form v-if="record" class="dash-modal__form" @submit.prevent="onSubmit">
        <q-card-section class="dash-modal__body">
          <div class="dash-modal__stack">
            <!-- The date is what identifies the record, so it is shown rather
                 than hidden — but it is not editable here: moving a punch to
                 another day is a different record, not an edit of this one. -->
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Date</span>
              <q-input
                :model-value="record.date"
                type="date"
                outlined
                dense
                readonly
                disable
                hide-bottom-space
                class="dash-field"
              >
                <template v-slot:append>
                  <q-icon name="lock" size="18px" />
                </template>
              </q-input>
            </label>

            <div class="dash-modal__grid">
              <div class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Time In<span class="dash-modal__req">*</span></span
                >
                <!--
                  Which widget this renders is decided inside
                  `AttendanceTimeField`, on the company's `time_format`: a 12h
                  company keeps the native input, a 24h company gets the shared
                  `TimeField` (hour and minute as separate dropdowns). This
                  dialog does not branch on the format itself, so the two dialogs
                  can never drift apart on what a time field looks like.
                -->
                <AttendanceTimeField
                  :model-value="record.time_in"
                  :time-format="timeFormat"
                  :rules="[(val) => !!val || 'Required']"
                  prepend-icon="login"
                  @update:model-value="updateField('time_in', $event)"
                />
              </div>

              <div class="dash-modal__field">
                <span class="dash-modal__field-label">Time Out</span>
                <AttendanceTimeField
                  :model-value="record.time_out"
                  :time-format="timeFormat"
                  prepend-icon="logout"
                  @update:model-value="updateField('time_out', $event)"
                />
              </div>
            </div>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Cost center</span>
              <q-select
                :model-value="record.cost_center_id"
                :options="costCenterOptions"
                :loading="optionsLoading"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                clearable
                outlined
                dense
                hide-bottom-space
                behavior="menu"
                menu-anchor="bottom left"
                menu-self="top left"
                popup-content-class="dash-popup"
                class="dash-field"
                @update:model-value="updateField('cost_center_id', $event)"
              >
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="dash-modal__field-hint">
                      No cost centers found
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <span class="dash-modal__field-hint">
                Which center this shift's hours are charged to.
              </span>
            </label>
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
            type="submit"
            unelevated
            no-caps
            label="Update"
            class="dash-modal__submit"
            :loading="saving"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import AttendanceTimeField from '@/components/pages/Attendance/AttendanceTimeField.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  record: { type: Object, default: null },
  costCenterOptions: { type: Array, default: () => [] },
  optionsLoading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  // The company's `time_format` — '12h' | '24h'. Decides how the punch fields
  // print; `record.time_in` / `time_out` stay 24h `HH:mm` either way.
  timeFormat: { type: String, default: '12h' },
})

const emit = defineEmits(['update:modelValue', 'update:record', 'submit'])

function updateField(field, value) {
  emit('update:record', { ...props.record, [field]: value })
}

function onSubmit() {
  emit('submit', props.record)
}
</script>
