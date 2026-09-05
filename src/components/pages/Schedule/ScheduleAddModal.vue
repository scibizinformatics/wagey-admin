<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="event_available" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Add new schedule</div>
            <div class="dash-modal__sub">Place one or more shifts on the calendar</div>
          </div>
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-form @submit.prevent="onSubmit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
          <!-- Schedule Type Selection -->
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Schedule type</span>
            <q-select
              :model-value="newSchedule.scheduleType"
              @update:model-value="updateField('scheduleType', $event)"
              :options="[
                { label: 'One-time schedule', value: 'one-time' },
                { label: 'Recurring schedule', value: 'recurring' },
                { label: 'Rotating schedule', value: 'rotating' },
              ]"
              option-value="value"
              option-label="label"
              outlined
              emit-value
              map-options
              class="dash-field form-field full-width"
              dense
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            >
              <template #hint>Choose whether this is a single schedule or repeats weekly</template>
            </q-select>
          </label>

          <!-- Employee Selection -->
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Select employees</span>
            <q-select
              ref="employeeSelectRef"
              :model-value="newSchedule.userIds"
              @update:model-value="updateField('userIds', $event)"
              :options="filteredEmployeeOptions"
              option-value="value"
              option-label="label"
              outlined
              emit-value
              map-options
              multiple
              use-chips
              use-input
              input-debounce="0"
              @filter="filterEmployees"
              class="dash-field form-field full-width"
              :rules="[(val) => (val && val.length > 0) || 'At least one employee is required']"
              :loading="loadingEmployees"
              dense
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">No employees found</q-item-section>
                </q-item>
              </template>
            </q-select>
          </label>

          <!-- Rotating only, and deliberately right under the employees it
               applies to: the rotation spreads the picked people across these
               sites, so the two fields are read together. -->
          <label v-if="newSchedule.scheduleType === 'rotating'" class="dash-modal__field">
            <span class="dash-modal__field-label">Select sites</span>
            <q-select
              :model-value="newSchedule.rotatingSites"
              @update:model-value="updateField('rotatingSites', $event)"
              :options="siteOptions"
              option-value="value"
              option-label="label"
              outlined
              emit-value
              map-options
              multiple
              use-chips
              class="dash-field form-field full-width"
              :rules="[(val) => (val && val.length > 0) || 'At least one site is required']"
              dense
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            >
              <template #hint>The sites this rotation covers</template>
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">No sites found</q-item-section>
                </q-item>
              </template>
            </q-select>
          </label>

          <!-- One-Time: Multi-date picker + Shift rows -->
          <template v-if="newSchedule.scheduleType === 'one-time'">
            <ScheduleRangeCalendar
              :model-value="oneTimeRange"
              @update:model-value="onOneTimeRangeChange"
              title="Select dates"
              empty-text="No dates selected yet — pick a start and end date"
            />

            <!-- Shift rows -->
            <div
              v-for="(shift, index) in newSchedule.oneTimeShifts"
              :key="index"
              class="dash-modal__group shift-row"
            >
              <div class="dash-modal__group-head">
                <span class="row-label">
                  <q-icon name="schedule" size="16px" />
                  Shift {{ index + 1 }}
                </span>
                <q-btn
                  v-if="newSchedule.oneTimeShifts.length > 1"
                  flat
                  dense
                  round
                  icon="close"
                  size="sm"
                  @click="removeShift(index)"
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
                            >{{ scope.opt.label }}</q-item-label
                          >
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </label>
              </div>
            </div>
          </template>

          <!-- Recurring: Date Range -->
          <template v-if="newSchedule.scheduleType === 'recurring'">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Use recurring template</span>
              <q-select
                :model-value="newSchedule.recurringSchedule"
                @update:model-value="onRecurringTemplateChange"
                :options="recurringScheduleOptions"
                option-value="value"
                option-label="label"
                outlined
                emit-value
                map-options
                class="dash-field form-field full-width"
                clearable
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #hint>Select a template to auto-fill schedule details</template>
              </q-select>
            </label>

            <ScheduleRangeCalendar
              :model-value="recurringRange"
              @update:model-value="onRecurringRangeChange"
              :occurrence-weekdays="occurrenceWeekdays"
              title="Schedule dates"
              empty-text="No dates selected yet — pick the first and last day this schedule runs"
              unit-label="shift"
              unit-label-plural="shifts"
            />

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Department</span>
              <q-select
                :model-value="newSchedule.department"
                @update:model-value="updateField('department', $event)"
                :options="departmentOptions"
                option-value="value"
                option-label="label"
                outlined
                emit-value
                map-options
                class="dash-field form-field full-width"
                clearable
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              />
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Repeat every (weeks)</span>
              <q-input
                :model-value="newSchedule.repeatInterval"
                @update:model-value="updateField('repeatInterval', $event)"
                type="number"
                outlined
                min="1"
                class="dash-field form-field full-width"
                dense
                hide-bottom-space
              >
                <template #hint>1 = every week, 2 = every other week, etc.</template>
              </q-input>
            </label>

            <q-checkbox
              :model-value="newSchedule.isRotating"
              @update:model-value="updateField('isRotating', $event)"
              label="This is a rotating schedule"
              class="full-width"
            />
          </template>

          <!-- Rotating: Date Range + Details -->
          <template v-if="newSchedule.scheduleType === 'rotating'">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Weekdays</span>
              <q-select
                :model-value="newSchedule.weekdays"
                @update:model-value="updateField('weekdays', $event)"
                :options="[
                  { label: 'Monday', value: 'monday' },
                  { label: 'Tuesday', value: 'tuesday' },
                  { label: 'Wednesday', value: 'wednesday' },
                  { label: 'Thursday', value: 'thursday' },
                  { label: 'Friday', value: 'friday' },
                  { label: 'Saturday', value: 'saturday' },
                  { label: 'Sunday', value: 'sunday' },
                ]"
                option-value="value"
                option-label="label"
                outlined
                emit-value
                map-options
                multiple
                use-chips
                class="dash-field form-field full-width"
                :rules="[(val) => (val && val.length > 0) || 'Select at least one weekday']"
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #hint>The calendar fills in the days these weekdays land on</template>
              </q-select>
            </label>

            <ScheduleRangeCalendar
              :model-value="recurringRange"
              @update:model-value="onRecurringRangeChange"
              :occurrence-weekdays="occurrenceWeekdays"
              title="Rotation dates"
              empty-text="No dates selected yet — pick the first and last day of the rotation"
              unit-label="shift"
              unit-label-plural="shifts"
            />

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">24-hour shift template</span>
              <q-select
                :model-value="newSchedule.rotatingShiftTemplate"
                @update:model-value="updateField('rotatingShiftTemplate', $event)"
                :options="rotatingShiftTemplateOptions"
                option-value="value"
                option-label="label"
                outlined
                emit-value
                map-options
                class="dash-field form-field full-width"
                :rules="[(val) => !!val || 'Shift template is required']"
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #hint>The round-the-clock template this rotation cycles through</template>
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey">No 24-hour templates found</q-item-section>
                  </q-item>
                </template>
              </q-select>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Rotation mode</span>
              <q-select
                :model-value="newSchedule.rotationMode"
                @update:model-value="updateField('rotationMode', $event)"
                :options="[
                  { label: 'Daily', value: 'daily' },
                  { label: 'Full Template', value: 'full_template' },
                ]"
                option-value="value"
                option-label="label"
                outlined
                emit-value
                map-options
                class="dash-field form-field full-width"
                dense
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template #hint>
                  Daily cycles one shift per day; full template assigns the whole day's chain
                </template>
              </q-select>
            </label>
          </template>

          <!-- Conflict Warning -->
          <q-banner v-if="conflictWarning" class="warning-banner">
            <template #avatar>
              <q-icon name="warning" />
            </template>
            <strong>Schedule Conflict Detected!</strong><br />
            This employee already has a schedule on the selected date/time.
          </q-banner>

          <!-- Actions -->
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
            :label="
              newSchedule.scheduleType === 'recurring'
                ? 'Create Recurring Schedule'
                : newSchedule.scheduleType === 'rotating'
                  ? 'Create Rotating Schedule'
                  : 'Add schedule'
            "
            unelevated
            class="dash-modal__submit"
            :loading="checkingConflict"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ScheduleRangeCalendar from './ScheduleRangeCalendar.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  newSchedule: {
    type: Object,
    default: () => ({
      userIds: [],
      selectedDates: [],
      oneTimeShifts: [{ shiftTemplate: null }],
      scheduleType: 'one-time',
      recurringStartDate: null,
      recurringEndDate: null,
      recurringSchedule: null,
      department: null,
      repeatInterval: 1,
      isRotating: false,
      rotatingSites: [],
      rotatingShiftTemplate: null,
      rotationMode: 'daily',
    }),
  },
  filteredEmployeeOptions: { type: Array, default: () => [] },
  siteOptions: { type: Array, default: () => [] },
  shiftTemplateOptions: { type: Array, default: () => [] },
  // Rotating schedules assign a 24-hour template, a different list from the
  // plain shift templates the one-time flow picks from.
  rotatingShiftTemplateOptions: { type: Array, default: () => [] },
  recurringScheduleOptions: { type: Array, default: () => [] },
  departmentOptions: { type: Array, default: () => [] },
  conflictWarning: { type: Boolean, default: false },
  checkingConflict: { type: Boolean, default: false },
  loadingEmployees: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:modelValue',
  'update:newSchedule',
  'submit',
  'filter-employees',
  'template-change',
])

watch(
  () => props.newSchedule.scheduleType,
  (type) => {
    if (type === 'rotating' && !(props.newSchedule.weekdays && props.newSchedule.weekdays.length)) {
      emit('update:newSchedule', {
        ...props.newSchedule,
        weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      })
    }
  },
)

// ─── Date range selection ───────────────────────────────────────
// All three schedule types pick their dates on the same dual-month calendar.
// One-time hands the parent a flat list of every day in the span; recurring and
// rotating hand it a start/end pair and let the weekday pattern decide which
// days inside that span actually get a shift.

function _toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function expandRange(from, to) {
  const out = []
  const cursor = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  while (cursor <= end) {
    out.push(_toDateStr(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

// One-time keeps the range local because the parent's contract is still the
// flat `selectedDates` list: a finished range expands into it, a half-picked one
// contributes only its start day.
const oneTimeRange = ref({ from: '', to: '' })

function onOneTimeRangeChange(range) {
  oneTimeRange.value = range
  const { from, to } = range
  if (!from) return updateField('selectedDates', [])
  updateField('selectedDates', to ? expandRange(from, to) : [from])
}

// The parent empties selectedDates after a successful submit and when the
// dialog reopens — don't leave a stale half-picked range behind.
watch(
  () => props.newSchedule.selectedDates,
  (dates) => {
    if (!dates || !dates.length) oneTimeRange.value = { from: '', to: '' }
  },
)

watch(
  () => props.modelValue,
  (open) => {
    if (open && !props.newSchedule.selectedDates?.length) {
      oneTimeRange.value = { from: '', to: '' }
    }
  },
)

// Recurring and rotating write straight through to the parent's start/end
// fields. An empty `to` means the range is still half-picked, so the end date
// goes back as null rather than keeping its previous value.
const recurringRange = computed(() => ({
  from: props.newSchedule.recurringStartDate || '',
  to: props.newSchedule.recurringEndDate || '',
}))

function onRecurringRangeChange({ from, to }) {
  emit('update:newSchedule', {
    ...props.newSchedule,
    recurringStartDate: from || null,
    recurringEndDate: to || null,
  })
}

// Which days in the span get a shift: the weekdays the chosen recurring
// template covers, or the ones picked by hand on a rotating schedule. Empty
// until a template is loaded, which the calendar reports as such.
const occurrenceWeekdays = computed(() => {
  const days = props.newSchedule.weekdays
  return Array.isArray(days) ? days : []
})

// ─── Form helpers ───────────────────────────────────────────────────────────
function updateField(key, value) {
  emit('update:newSchedule', { ...props.newSchedule, [key]: value })
}

// Two statements, so it lives here rather than inline in the template.
function onRecurringTemplateChange(value) {
  updateField('recurringSchedule', value)
  emit('template-change', value)
}

function updateShift(index, field, value) {
  const updated = { ...props.newSchedule }
  updated.oneTimeShifts = [...updated.oneTimeShifts]
  updated.oneTimeShifts[index] = { ...updated.oneTimeShifts[index], [field]: value }
  emit('update:newSchedule', updated)
}

function removeShift(index) {
  const updated = { ...props.newSchedule }
  updated.oneTimeShifts = [...updated.oneTimeShifts]
  updated.oneTimeShifts.splice(index, 1)
  emit('update:newSchedule', updated)
}

function filterEmployees(val, update) {
  emit('filter-employees', val, update)
}

function onSubmit() {
  emit('submit')
}
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-field {
  width: 100%;
}
.full-width {
  grid-column: 1 / -1;
}
.warning-banner {
  margin-top: 14px;
  padding: 12px;
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  border-radius: var(--dash-r-md);
}
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

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .full-width {
    grid-column: span 1;
  }
}
</style>
