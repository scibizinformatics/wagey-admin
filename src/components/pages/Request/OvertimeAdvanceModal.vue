<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="assignment" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Overtime advance</div>
            <div class="dash-modal__sub">Create overtime advance request</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          dense
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="form-section">
          <div class="dash-modal__section-title">Request details</div>
          <!-- A `q-form`, because a rule nobody calls is decoration: without one
               `onSubmit` emitted regardless of what these fields said, so the
               rules below only ever painted the field red while the write went
               ahead. With it, the limit rule actually blocks the submit — and so
               do the three required-field rules that were already on screen but
               unenforced. That is a behaviour change, and it is the point: a
               rejected advance is better than one stored with a typo. -->
          <!-- `@submit.prevent` because this is a real `<form>` now: without it, an
               Enter keypress that triggered implicit submission would navigate
               the SPA instead of validating. Submit goes through the same
               validated path as the button. -->
          <q-form ref="formRef" class="dash-modal__grid" @submit.prevent="onSubmit">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Employees<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.employee_ids"
                @update:model-value="form.employee_ids = $event"
                :options="employeeOptions"
                use-input
                use-chips
                multiple
                @filter="onFilter"
                :rules="[(val) => (val && val.length > 0) || 'At least one employee is required']"
                class="dash-field dash-modal__span-2"
                :input-debounce="0"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-6"> No employees found </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Category<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.category"
                @update:model-value="form.category = $event"
                :options="categories"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Category is required']"
                class="dash-field dash-modal__span-2"
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <!-- An empty menu reads as a broken control. This says which of
                     the two it is: the company has no overtime categories set up. -->
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-6"> No categories found </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Date<span class="dash-modal__req">*</span></span
              >
              <q-input
                v-model="form.date"
                mask="####-##-##"
                outlined
                dense
                placeholder="YYYY-MM-DD"
                :rules="[(val) => !!val || 'Date is required']"
                hide-bottom-space
                class="dash-field dash-modal__span-2"
              >
                <!-- The allowance dialog's date field, reused: a form field stays
                     typeable (masked), with the calendar beside it rather than
                     instead of it. `mask="YYYY-MM-DD"` on the QDate keeps the
                     model the ISO day `onSubmit` sends. -->
                <template v-slot:append>
                  <q-icon name="o_event" size="18px" class="cursor-pointer">
                    <q-popup-proxy transition-show="scale" transition-hide="scale">
                      <q-date v-model="form.date" mask="YYYY-MM-DD" />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </label>
            <!-- Optional, but a number when present. Stays `type="text"` on
                 purpose: `type="number"` fights the negative values this field
                 explicitly exists to accept, and the backend takes the decimal as
                 a string either way. `inputmode` nudges a numeric keypad on a
                 phone without changing how the value parses. -->
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Limit hours</span>
              <q-input
                outlined
                :model-value="form.limit_hours"
                @update:model-value="form.limit_hours = $event"
                :rules="[limitHoursRule]"
                type="text"
                inputmode="decimal"
                hint="Accepts negative values like -5.9. Leave blank for no limit."
                class="dash-field dash-modal__span-2"
                dense
                hide-bottom-space
              />
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Reason</span>
              <q-input
                outlined
                :model-value="form.reason"
                @update:model-value="form.reason = $event"
                type="textarea"
                rows="3"
                class="dash-field dash-modal__span-2"
                dense
                hide-bottom-space
              />
            </label>
          </q-form>
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          label="Submit"
          class="dash-modal__submit"
          :loading="submitting"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive, ref } from 'vue'

defineProps({
  modelValue: Boolean,
  categories: { type: Array, default: () => [] },
  employeeOptions: { type: Array, default: () => [] },
  submitting: Boolean,
})

const emit = defineEmits(['update:modelValue', 'submit', 'filter-employees'])

// `validate()` in `onSubmit` has to reach this, hence the ref rather than the
// rules merely decorating the field.
const formRef = ref(null)

const form = reactive({
  employee_ids: [],
  category: null,
  date: '',
  limit_hours: '',
  reason: '',
})

// Blank is allowed — the limit is optional, and "no limit" is a real answer.
// Anything present has to parse as a decimal, negative included: this field
// used to accept any text at all and hand `"abc"` straight to the backend,
// which rejected it in a toast that named none of the fields. The decimal is
// deliberately not capped at 2dp, because statutory rates elsewhere in the app
// carry more precision and silently truncating one is worse than sending it.
const LIMIT_HOURS_PATTERN = /^-?\d+(\.\d+)?$/
const limitHoursRule = (value) => {
  const raw = String(value ?? '').trim()
  if (raw === '') return true
  return LIMIT_HOURS_PATTERN.test(raw) || 'Enter a number, e.g. 4 or -5.9'
}

const onFilter = (val, update) => {
  emit('filter-employees', val)
  update(() => {})
}

const onSubmit = async () => {
  // Rules are only enforced when something asks them to; without this the
  // whole form was decorative and the write went ahead regardless.
  const valid = await formRef.value?.validate()
  if (!valid) return

  const payload = {
    employee_ids: form.employee_ids,
    category: form.category,
    date: form.date,
    reason: form.reason,
  }

  // The one place that decides whether a limit travels. It used to be decided
  // twice — here and again in `submitOvertimeAdvance`, which tested truthiness
  // and so dropped a legitimate `0`. Whitespace-only counts as blank, and a
  // blank limit omits the key rather than sending an empty string the backend
  // could store as the text of its own placeholder.
  const limit = String(form.limit_hours ?? '').trim()
  if (limit !== '') payload.limit_hours = limit

  emit('submit', payload)
}
</script>

<style scoped src="./requestModal.css"></style>
