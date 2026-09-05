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
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Time in</span>
                <q-input
                  :model-value="record.time_in"
                  type="time"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                  @update:model-value="updateField('time_in', $event)"
                />
              </label>

              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Time out</span>
                <q-input
                  :model-value="record.time_out"
                  type="time"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                  @update:model-value="updateField('time_out', $event)"
                />
              </label>
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
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  record: { type: Object, default: null },
  costCenterOptions: { type: Array, default: () => [] },
  optionsLoading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'update:record', 'submit'])

function updateField(field, value) {
  emit('update:record', { ...props.record, [field]: value })
}

function onSubmit() {
  emit('submit', props.record)
}
</script>
