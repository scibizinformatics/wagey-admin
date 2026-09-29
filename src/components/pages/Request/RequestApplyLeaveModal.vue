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
            <q-icon name="beach_access" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Apply leave</div>
            <div class="dash-modal__sub">Assign leave to an employee</div>
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
          <div class="dash-modal__section-title">Leave details</div>
          <div class="dash-modal__grid">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Employee<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.employee_id"
                @update:model-value="form.employee_id = $event"
                :options="employeeOptions"
                use-input
                use-chips
                @filter="onFilter"
                :rules="[(val) => !!val || 'Employee is required']"
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
                >Leave type<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                :model-value="form.leave_type"
                @update:model-value="form.leave_type = $event"
                :options="leaveTypeOptions"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Leave type is required']"
                class="dash-field dash-modal__span-2"
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-6"> No leave types found </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Start date<span class="dash-modal__req">*</span></span
              >
              <q-input
                outlined
                :model-value="form.start_date"
                @update:model-value="form.start_date = $event"
                type="date"
                :rules="[(val) => !!val || 'Start date is required']"
                dense
                hide-bottom-space
                class="dash-field"
              />
            </label>
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >End date<span class="dash-modal__req">*</span></span
              >
              <q-input
                outlined
                :model-value="form.end_date"
                @update:model-value="form.end_date = $event"
                type="date"
                :error="Boolean(rangeError)"
                :error-message="rangeError"
                dense
                class="dash-field"
              />
            </label>
            <label class="dash-modal__field dash-modal__span-2">
              <span class="dash-modal__field-label">Reason</span>
              <q-input
                outlined
                :model-value="form.reason"
                @update:model-value="form.reason = $event"
                type="textarea"
                rows="3"
                class="dash-field"
                dense
                hide-bottom-space
              />
            </label>
          </div>
        </div>

        <!--
          The dates the request actually books.

          The endpoint takes a `days` array rather than a start/end pair, so the
          range above is only the way this list gets built. Each row is one
          entry, and the toggle is the one decision the array adds over the old
          form: a half day. A single global switch could not express the mixed
          case, which is the case leave is actually taken in.
        -->
        <div class="form-section">
          <div class="dash-modal__section-title">Dates</div>

          <div v-if="!form.days.length" class="day-list__empty">
            Pick a start and end date to choose which days are half days.
          </div>

          <div v-else class="day-list">
            <div v-for="day in form.days" :key="day.date" class="day-list__row">
              <div class="day-list__date">
                <q-icon name="event" size="16px" class="day-list__date-icon" />
                <span>{{ longLabel(day.date) }}</span>
                <span class="day-list__iso">{{ day.date }}</span>
              </div>
              <q-btn-toggle
                :model-value="day.is_half_day ? 'half' : 'full'"
                @update:model-value="setHalfDay(day.date, $event)"
                unelevated
                no-caps
                dense
                :options="[
                  { label: 'Full', value: 'full' },
                  { label: 'Half', value: 'half' },
                ]"
                class="day-list__toggle"
              />
            </div>
          </div>

          <div v-if="form.days.length" class="day-list__total">
            <span class="day-list__total-label">Total</span>
            <span class="day-list__total-value">{{ totalLabel }}</span>
          </div>
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
          label="Assign leave"
          class="dash-modal__submit"
          :loading="submitting"
          :disable="!canSubmit"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { isoRange, longLabel } from 'src/composables/utils/calendarDate'
import { leaveDayValueLabel } from 'src/composables/utils/leaveRequests'

const props = defineProps({
  modelValue: Boolean,
  employeeOptions: { type: Array, default: () => [] },
  leaveTypes: { type: Array, default: () => [] },
  submitting: Boolean,
})

const emit = defineEmits(['update:modelValue', 'submit', 'filter-employees'])

/**
 * How many days one request may span.
 *
 * The endpoint takes the list day by day, so the range is expanded client-side
 * into one entry per calendar date — every date, not just the weekdays: a day
 * the admin did not ask for must never be dropped on the way to the server, and
 * what counts toward a balance is the backend's call, not this form's.
 */
const MAX_DAYS = 60

const emptyForm = () => ({
  employee_id: null,
  leave_type: null,
  start_date: '',
  end_date: '',
  days: [],
  reason: '',
})

const form = reactive(emptyForm())

const leaveTypeOptions = computed(() =>
  props.leaveTypes.map((lt) => ({ id: lt.id, name: lt.name })),
)

/**
 * The rebuilt range, or why it could not be built.
 *
 * `isoRange` answers `null` for a span past `MAX_DAYS`, which is deliberately
 * not the same as the `[]` of an unfinished range: the first is a request the
 * admin has to narrow, the second is a request that is simply not filled in
 * yet, and they need different words on screen.
 */
const range = computed(() => {
  if (!form.start_date || !form.end_date) return { days: [], error: '' }
  if (form.end_date < form.start_date) {
    return { days: [], error: 'End date cannot be before the start date' }
  }
  const expanded = isoRange(form.start_date, form.end_date, MAX_DAYS)
  if (expanded === null) {
    return { days: [], error: `A request cannot span more than ${MAX_DAYS} days` }
  }
  return { days: expanded, error: '' }
})

const rangeError = computed(() => range.value.error)

const totalLabel = computed(() => leaveDayValueLabel(form.days))

const canSubmit = computed(() => !range.value.error && form.days.length > 0 && !props.submitting)

/**
 * Rebuild `days` whenever the range moves, keeping the half-day flags already
 * set on any date that survives.
 *
 * Without this, nudging the end date one day later — the ordinary way to correct
 * a range — silently returned every row to a full day, so an admin who had
 * marked three half days lost them to an edit that changed nothing about those
 * three dates. A date the new range drops is dropped; one it keeps keeps its
 * answer.
 */
watch(range, (next) => {
  const previous = new Map(form.days.map((day) => [day.date, day.is_half_day]))
  form.days = next.days.map((date) => ({ date, is_half_day: previous.get(date) === true }))
})

/**
 * The dialog opened empty.
 *
 * The form outlives the dialog — the same component is reused for every request
 * — and nothing cleared it between visits, so a second leave request arrived
 * pre-filled with the first one's employee and dates, and a mistaken submit
 * booked a duplicate. Resetting on open is the only point at which stale state
 * is still invisible to the admin.
 */
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    Object.assign(form, emptyForm())
  },
)

function setHalfDay(date, value) {
  const day = form.days.find((entry) => entry.date === date)
  if (day) day.is_half_day = value === 'half'
}

const onFilter = (val, update) => {
  emit('filter-employees', val)
  update(() => {})
}

const onSubmit = () => {
  if (!canSubmit.value) return
  emit('submit', {
    employee_id: form.employee_id,
    leave_type: form.leave_type,
    // Re-read from the range, not from the form: these are the entries the
    // payload is defined by, and a `days` array rebuilt by the watcher is the
    // one the admin actually saw and toggled.
    days: form.days.map((day) => ({ date: day.date, is_half_day: day.is_half_day })),
    reason: form.reason || '',
  })
}
</script>

<style scoped src="./requestModal.css"></style>
