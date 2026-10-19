<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="close">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="event_available" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ editing ? 'Edit holiday' : 'Add holiday' }}</div>
            <div class="dash-modal__sub">A date on the calendar, and the kind it is</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="close" />
      </q-card-section>

      <q-form @submit.prevent="submit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Holiday</p>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">
                Name<span class="dash-modal__req">*</span>
              </span>
              <q-input
                v-model="form.name"
                outlined
                dense
                hide-bottom-space
                class="dash-field"
                placeholder="Christmas Day"
                maxlength="150"
              >
                <template v-slot:prepend><q-icon name="label" size="18px" /></template>
              </q-input>
            </label>

            <!-- `q-date` writes `YYYY-MM-DD` straight into the same field, so
                 the two ends of the mask cannot disagree about the shape. -->
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">
                Date<span class="dash-modal__req">*</span>
              </span>
              <q-input
                v-model="form.date"
                mask="####-##-##"
                outlined
                dense
                hide-bottom-space
                class="dash-field"
                placeholder="YYYY-MM-DD"
              >
                <template v-slot:append>
                  <q-icon name="o_event" size="18px" class="cursor-pointer">
                    <q-popup-proxy transition-show="scale" transition-hide="scale">
                      <q-date v-model="form.date" mask="YYYY-MM-DD" />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
              <span class="dash-modal__field-hint">The day the holiday falls on.</span>
            </label>

            <!-- Values are codes, not ids: a holiday attaches itself to a type
                 by code, and the row it was opened from preselects one. -->
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">
                Holiday type<span class="dash-modal__req">*</span>
              </span>
              <q-select
                v-model="form.holiday_type"
                :options="typeOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                options-dense
                hide-bottom-space
                class="dash-field"
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template v-slot:prepend><q-icon name="celebration" size="18px" /></template>
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey-7">
                      No holiday types in this company yet
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <span class="dash-modal__field-hint">
                Attached by the type's code, so renaming the type later does not detach this
                holiday.
              </span>
            </label>
          </div>

          <div class="dash-modal__group">
            <p class="dash-modal__group-label">Every year</p>
            <div class="toggle-item">
              <q-toggle
                v-model="form.is_recurring"
                color="primary"
                size="md"
                class="brand-toggle"
                aria-label="Repeats every year"
              />
              <div class="toggle-label-group">
                <div class="toggle-label">Repeats every year</div>
                <div class="toggle-hint">
                  A recurring holiday comes back on the same date each year. Switch it off for a
                  date that happens once.
                </div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" @click="close" />
          <q-btn
            :label="editing ? 'Update' : 'Add holiday'"
            type="submit"
            no-caps
            unelevated
            class="dash-modal__submit"
            :loading="saving"
            :disable="!canSubmit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The editable half of a holiday: one date, the kind it is, and whether it comes
 * back each year — the same four fields whether it is being added or corrected.
 *
 * `holiday` is the whole mode switch: absent means add, present means edit, and
 * it doubles as the form's initial values. No parallel `editing` flag to keep in
 * step with it, which is the kind of pair that survives a re-open reporting
 * "Edit holiday" over a blank form.
 *
 * Presentational on purpose — `AdminSettingsPanelHolidays` owns
 * `useAdminHolidays`, so the same composable that opens this dialog is the one
 * that saves it, rather than a second instance holding its own dialog flag.
 * The form is local for the same reason `HolidayTypePoliciesDialog` keeps its
 * draft local: it is rebuilt on every open and only leaves as the object handed
 * to `submit`.
 */
import { computed, ref, watch } from 'vue'
import {
  emptyHolidayForm,
  holidayToForm,
  holidayTypeOptions,
  isIsoDay,
} from '@/composables/utils/holidays'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  holidayTypes: { type: Array, default: () => [] },
  /** The row being edited, or null to add a new one. */
  holiday: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const editing = computed(() => Boolean(props.holiday))

const form = ref(emptyHolidayForm())

// Reopened, not continued: yesterday's half-filled holiday is not the one being
// added now. Reading `holiday` here rather than at construction takes the row the
// parent set in the same tick as `modelValue`.
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    form.value = props.holiday ? holidayToForm(props.holiday) : emptyHolidayForm()
  },
)

const typeOptions = computed(() => holidayTypeOptions(props.holidayTypes))

/**
 * The submit button carries the rules rather than waiting to be told about one.
 *
 * `isIsoDay` is the same check `validateHolidayForm` makes, so a masked but
 * half-typed date (`2026-0_-__`) leaves the button disabled instead of posting
 * something the composable will refuse.
 */
const canSubmit = computed(
  () =>
    Boolean(String(form.value.name || '').trim()) &&
    isIsoDay(form.value.date) &&
    Boolean(form.value.holiday_type),
)

function close() {
  emit('update:modelValue', false)
}

/** A copy, so what is saved is the form as it was submitted. */
function submit() {
  emit('submit', { ...form.value })
}
</script>

<style scoped lang="scss">
/* Imported rather than inherited: `AdminSettingsPanelShared.scss` is scoped, so
   the toggle row below would otherwise render unstyled — a scoped block reaches
   only its own component's elements, not a child dialog's. Every other dialog in
   this folder imports it for the same reason. */
@import './AdminSettingsPanelShared.scss';
</style>
