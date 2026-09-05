<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
    :maximized="$q.screen.lt.sm"
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="more_time" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Add attendance</div>
            <div class="dash-modal__sub">Record time in and time out for {{ formattedDate }}</div>
          </div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          @click="$emit('update:modelValue', false)"
          v-close-popup
        />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <q-form @submit.prevent="onSubmit" class="dash-modal__stack">
          <div class="dash-modal__grid">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Employee<span class="dash-modal__req">*</span></span
              >
              <q-select
                outlined
                dense
                :model-value="record.employee"
                @update:model-value="updateField('employee', $event)"
                :options="filteredEmployeeOptions"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                use-input
                fill-input
                hide-selected
                input-debounce="300"
                @filter="onEmployeeFilter"
                class="dash-field form-field"
                :rules="[(val) => !!val || 'Required']"
                hide-bottom-space
                popup-content-class="dash-popup dash-popup--modal"
              >
                <template v-slot:prepend>
                  <q-icon name="person" size="xs" />
                </template>
              </q-select>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Date</span>
              <q-input
                outlined
                dense
                :model-value="record.date"
                class="dash-field form-field"
                readonly
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="event" size="xs" />
                </template>
                <template v-slot:append>
                  <q-icon name="lock" size="xs" color="grey-5" />
                </template>
              </q-input>
            </label>
          </div>

          <q-banner
            v-if="schedule && schedule.length > 0 && record.employee && record.date"
            dense
            rounded
            :class="
              schedule.length > 1 ? 'schedule-banner bg-deep-purple-1' : 'schedule-banner bg-blue-1'
            "
          >
            <template v-slot:avatar>
              <q-icon
                :name="schedule.length > 1 ? 'alt_route' : 'schedule'"
                :color="schedule.length > 1 ? 'deep-purple' : 'primary'"
              />
            </template>
            <div class="schedule-compact">
              <template v-for="(s, idx) in schedule" :key="idx">
                <div
                  class="schedule-compact-block"
                  :class="{
                    'shift-disabled': isRecorded(s),
                    'shift-selected':
                      record.selected_assignment_id != null &&
                      record.selected_assignment_id === s.assignment_id,
                  }"
                  @click="selectShift(s)"
                >
                  <div class="schedule-compact-row">
                    <span
                      class="shift-label"
                      :class="{
                        'shift-label--selected':
                          record.selected_assignment_id != null &&
                          record.selected_assignment_id === s.assignment_id,
                      }"
                    >
                      {{ schedule.length > 1 ? `Shift ${idx + 1}` : s.employee_name }}
                    </span>
                    <q-badge v-if="isCompleted(s)" color="grey">Already completed</q-badge>
                    <q-badge v-else-if="isRecorded(s)" color="grey">Already recorded</q-badge>
                    <q-badge v-else :color="statusColor(s.status)">{{ s.status }}</q-badge>
                  </div>
                  <div class="schedule-compact-row text-caption text-grey-7">
                    <span>{{ s.site }} • {{ s.position }}</span>
                    <span>{{ s.shift_start }} - {{ s.shift_end }}</span>
                  </div>
                </div>
              </template>
            </div>
          </q-banner>

          <q-banner
            v-else-if="scheduleLoading && record.employee && record.date"
            dense
            rounded
            class="bg-grey-2"
          >
            <template v-slot:avatar>
              <q-spinner color="primary" size="sm" />
            </template>
            Loading schedule...
          </q-banner>

          <q-banner v-if="addBlockReason" dense rounded class="bg-orange-1 q-mb-sm">
            <template v-slot:avatar>
              <q-icon name="lock" color="orange-9" />
            </template>
            <span class="text-orange-10 text-caption text-weight-medium">{{ addBlockReason }}</span>
          </q-banner>

          <div class="dash-modal__grid">
            <label class="dash-modal__field">
              <span class="dash-modal__field-label"
                >Time In<span class="dash-modal__req">*</span></span
              >
              <q-input
                outlined
                dense
                :model-value="record.time_in"
                @update:model-value="updateField('time_in', $event)"
                type="time"
                class="dash-field form-field"
                :disable="!!addBlockReason"
                :rules="addBlockReason ? [] : [(val) => !!val || 'Required']"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon :name="addBlockReason ? 'lock' : 'login'" size="xs" />
                </template>
              </q-input>
            </label>

            <label class="dash-modal__field">
              <span class="dash-modal__field-label">Time Out</span>
              <q-input
                outlined
                dense
                :model-value="record.time_out"
                @update:model-value="updateField('time_out', $event)"
                type="time"
                class="dash-field form-field"
                :disable="!!addBlockReason"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon :name="addBlockReason ? 'lock' : 'logout'" size="xs" />
                </template>
              </q-input>
            </label>
          </div>

          <q-banner
            v-if="record.time_in && record.time_out && isOvernight"
            dense
            rounded
            class="bg-deep-purple-1 q-mb-sm"
          >
            <template v-slot:avatar>
              <q-icon name="dark_mode" color="deep-purple" />
            </template>
            <span class="text-deep-purple text-caption text-weight-medium">
              Graveyard shift detected — Time Out is on <strong>{{ timeOutDate }}</strong>
            </span>
          </q-banner>

          <div v-if="record.time_in && record.time_out" class="working-hours-compact bg-green-1">
            <q-icon name="schedule" color="positive" size="sm" />
            <div class="working-hours-text">
              <span class="text-caption text-grey-7">Total Hours</span>
              <span class="text-h6 text-positive text-weight-bold">{{ workingHours }}</span>
            </div>
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Cancel"
          class="dash-modal__cancel"
          v-close-popup
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          label="Save"
          class="dash-modal__submit"
          @click="onSubmit"
          :loading="saving"
          :disable="
            !record.employee || !record.time_in || saving || selectionRequired || !!addBlockReason
          "
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  record: { type: Object, default: () => ({}) },
  costCenterOptions: { type: Array, default: () => [] },
  employeeOptions: { type: Array, default: () => [] },
  schedule: { type: Array, default: () => [] },
  scheduleLoading: { type: Boolean, default: false },
  optionsLoading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  recordedAssignments: { type: Array, default: () => [] },
  // The subset of recordedAssignments whose record already has both punches.
  // Only changes the wording — both sets are equally unselectable.
  completedAssignments: { type: Array, default: () => [] },
  // How many of the employee's attendances on this date are clocked in *and*
  // out. A count rather than ids, so the dialog can still refuse a duplicate day
  // when nothing carries an assignment id to match shift-by-shift.
  completedRecordCount: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue', 'update:record', 'submit', 'fetch-schedule'])

const formattedDate = computed(() => {
  if (!props.record.date) return '-'
  return new Date(props.record.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const isOvernight = computed(() => {
  if (!props.record.time_in || !props.record.time_out) return false
  const [inH, inM] = props.record.time_in.split(':').map(Number)
  const [outH, outM] = props.record.time_out.split(':').map(Number)
  return outH * 60 + outM < inH * 60 + inM
})

const timeOutDate = computed(() => {
  if (!props.record.date) return ''
  const next = new Date(props.record.date)
  next.setDate(next.getDate() + 1)
  return next.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})

const workingHours = computed(() => {
  if (!props.record.time_in || !props.record.time_out) return '0h 0m'
  const [inHours, inMinutes] = props.record.time_in.split(':').map(Number)
  const [outHours, outMinutes] = props.record.time_out.split(':').map(Number)
  let diff = outHours * 60 + outMinutes - (inHours * 60 + inMinutes)
  if (diff < 0) diff += 24 * 60
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
})

function updateField(field, value) {
  emit('update:record', { ...props.record, [field]: value })
}

function isRecorded(s) {
  return Boolean(s.assignment_id) && props.recordedAssignments.includes(s.assignment_id)
}

// A shift that has been clocked in and out is finished, and a second record for
// it would have payroll counting the day twice.
function isCompleted(s) {
  return Boolean(s.assignment_id) && props.completedAssignments.includes(s.assignment_id)
}

function selectShift(s) {
  if (isRecorded(s) || s.assignment_id == null) return
  updateField('selected_assignment_id', s.assignment_id)
}

/**
 * The shift this dialog would file the new record against, when that shift
 * already has one. A single shift is implied rather than clicked, so without
 * this the one case that most needs blocking — one scheduled shift, already
 * clocked in and out — was the one case Save stayed enabled for.
 */
const blockedShift = computed(() => {
  const sched = props.schedule || []
  if (!sched.length) return null

  const selectedId = props.record.selected_assignment_id
  const target =
    selectedId != null
      ? sched.find((s) => s.assignment_id === selectedId)
      : sched.length === 1
        ? sched[0]
        : null

  return target && isRecorded(target) ? target : null
})

/**
 * Why this attendance cannot be added, or null when it can.
 *
 * The rule the page is built around: a shift that has been clocked in and out
 * is finished, so a second record for it would have payroll counting the day
 * twice. Two checks, because either one alone leaves a hole.
 *
 * The count check is the load-bearing one and needs no ids to work — once the
 * day's completed records cover every shift scheduled for it, there is nothing
 * left to file a new record against. The per-shift check then catches the case
 * the counts allow: two shifts scheduled, one of them already recorded, and it
 * is that one the reader has picked.
 */
const addBlockReason = computed(() => {
  if (!props.record.employee || !props.record.date) return null

  // Nothing to compare against until the day's shifts are known. A day with no
  // schedule at all is refused separately, on the page, with its own message.
  const sched = props.schedule || []
  if (props.scheduleLoading || !sched.length) return null

  if (props.completedRecordCount >= sched.length) {
    return sched.length > 1
      ? 'Every shift scheduled for this day has already been clocked in and out. Edit one of those records instead — a new one would count the day twice.'
      : 'This employee already has an attendance with a time in and time out on this day. Edit that record instead — a new one would count the day twice.'
  }

  if (blockedShift.value) {
    return isCompleted(blockedShift.value)
      ? 'That shift has already been clocked in and out. Edit its record instead — a new one would count the shift twice.'
      : 'That shift already has an attendance record. Edit that record instead — a new one would count the shift twice.'
  }

  return null
})

const selectionRequired = computed(() => {
  if (props.schedule && props.schedule.length > 1) {
    const allMissingAssignmentId = props.schedule.every((s) => s.assignment_id == null)
    if (allMissingAssignmentId) return false
    return !props.record.selected_assignment_id
  }
  return false
})

// Typed text narrows a copy, never `employeeOptions` itself. The page hands the
// same array to the date-range picker, and this used to hand the needle back up
// for the page to filter that shared array in place — so whatever was typed here
// stayed applied, and the other dialog opened showing only the leftovers.
const employeeNeedle = ref('')

// QSelect's `fill-input` writes the chosen employee's name into the box, and
// `showPopup` re-runs the filter with whatever the box holds. Reopening the menu
// therefore filters by the name already selected, leaving just that person — and
// anyone who happens to share part of their name — in a list that should be
// showing everybody. An echo of the selection is treated as no filter at all.
const selectedEmployeeLabel = computed(() => {
  if (!props.record.employee) return ''
  const match = props.employeeOptions.find(
    (option) => String(option.value) === String(props.record.employee),
  )
  return match?.label ?? ''
})

const filteredEmployeeOptions = computed(() => {
  const needle = employeeNeedle.value.trim().toLowerCase()
  if (!needle) return props.employeeOptions
  return props.employeeOptions.filter((option) =>
    String(option.label ?? '')
      .toLowerCase()
      .includes(needle),
  )
})

function onEmployeeFilter(val, update) {
  update(() => {
    const typed = val || ''
    employeeNeedle.value = typed === selectedEmployeeLabel.value ? '' : typed
  })
}

function statusColor(status) {
  const colors = {
    active: 'positive',
    completed: 'info',
    cancelled: 'negative',
    pending: 'warning',
  }
  return colors[status?.toLowerCase()] || 'grey'
}

function onSubmit() {
  if (addBlockReason.value) return
  emit('submit', props.record)
}

watch(
  () => props.record.employee,
  (employeeId) => {
    if (employeeId && props.record.date) {
      emit('fetch-schedule', employeeId, props.record.date)
    }
  },
)

watch(
  () => props.record.date,
  (newDate) => {
    if (props.record.employee && newDate) {
      emit('fetch-schedule', props.record.employee, newDate)
    }
  },
)

// A lone shift selects itself so the reader does not have to click the only
// option — unless it already has a record, in which case selecting it would
// arm a Save that must not happen.
watch(
  () => props.schedule,
  (sched) => {
    if (sched && sched.length === 1 && sched[0].assignment_id && !isRecorded(sched[0])) {
      updateField('selected_assignment_id', sched[0].assignment_id)
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.dash-modal__stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dash-modal__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-field {
  margin-bottom: 0;
}
.schedule-banner {
  padding: 10px 12px;
  margin: 8px 0;
}
.schedule-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.schedule-compact-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: var(--dash-r-md);
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
}
.schedule-compact-block:hover:not(.shift-disabled):not(.shift-selected) {
  background: var(--dash-n-50);
}
.schedule-compact-block.shift-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--dash-n-100);
}
.schedule-compact-block.shift-selected {
  background: var(--dash-brand);
  border: 1px solid var(--dash-brand);
  box-shadow: 0 2px 6px rgba(16, 35, 53, 0.25);
}
.schedule-compact-block.shift-selected .shift-label--selected {
  color: #ffffff;
  font-weight: 700;
}
.schedule-compact-block.shift-selected .schedule-compact-row.text-caption {
  color: rgba(255, 255, 255, 0.8) !important;
}
.schedule-compact-block.shift-selected:hover {
  background: var(--dash-brand);
}
.shift-label {
  font-weight: 500;
  font-size: 13px;
  color: var(--dash-ink-2);
}
.shift-label--selected {
  font-weight: 700;
  color: var(--dash-brand);
}
.schedule-compact-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.working-hours-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--dash-r-md);
  margin-top: 8px;
}
.working-hours-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
@media (max-width: 768px) {
  .dash-modal__grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
