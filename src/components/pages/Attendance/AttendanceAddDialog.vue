<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent :maximized="$q.screen.lt.sm">
    <q-card class="compact-dialog-card">
      <q-card-section class="compact-dialog-header">
        <div>
          <div class="dialog-title">Add Attendance</div>
          <div class="dialog-subtitle">
            Record time in and time out for {{ formattedDate }}
          </div>
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" v-close-popup />
      </q-card-section>

      <q-card-section class="compact-dialog-body">
        <q-form @submit.prevent="onSubmit" class="compact-form">
          <div class="form-row">
            <q-select
              filled
              dense
              :model-value="record.employee"
              @update:model-value="updateField('employee', $event)"
              :options="employeeOptions"
              label="Employee *"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              use-input
              fill-input
              hide-selected
              input-debounce="300"
              @filter="filterEmployees"
              class="form-field"
              :rules="[(val) => !!val || 'Required']"
            >
              <template v-slot:prepend>
                <q-icon name="person" size="xs" />
              </template>
            </q-select>

            <q-input
              filled
              dense
              :model-value="record.date"
              label="Date"
              class="form-field"
              readonly
            >
              <template v-slot:prepend>
                <q-icon name="event" size="xs" />
              </template>
              <template v-slot:append>
                <q-icon name="lock" size="xs" color="grey-5" />
              </template>
            </q-input>
          </div>

          <q-banner
            v-if="schedule && schedule.length > 0 && record.employee && record.date"
            dense
            rounded
            :class="schedule.length > 1 ? 'schedule-banner bg-deep-purple-1' : 'schedule-banner bg-blue-1'"
          >
            <template v-slot:avatar>
              <q-icon :name="schedule.length > 1 ? 'alt_route' : 'schedule'" :color="schedule.length > 1 ? 'deep-purple' : 'primary'" />
            </template>
            <div class="schedule-compact">
              <template v-for="(s, idx) in schedule" :key="idx">
                <div
                  class="schedule-compact-block"
                  :class="{ 'shift-disabled': isRecorded(s), 'shift-selected': record.selected_assignment_id != null && record.selected_assignment_id === s.assignment_id }"
                  @click="selectShift(s)"
                >
                  <div class="schedule-compact-row">
                    <span
                      class="shift-label"
                      :class="{ 'shift-label--selected': record.selected_assignment_id != null && record.selected_assignment_id === s.assignment_id }"
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

          <div class="form-row">
            <q-input
              filled
              dense
              :model-value="record.time_in"
              @update:model-value="updateField('time_in', $event)"
              label="Time In *"
              type="time"
              class="form-field"
              :disable="!!addBlockReason"
              :rules="addBlockReason ? [] : [(val) => !!val || 'Required']"
            >
              <template v-slot:prepend>
                <q-icon :name="addBlockReason ? 'lock' : 'login'" size="xs" />
              </template>
            </q-input>

            <q-input
              filled
              dense
              :model-value="record.time_out"
              @update:model-value="updateField('time_out', $event)"
              label="Time Out"
              type="time"
              class="form-field"
              :disable="!!addBlockReason"
            >
              <template v-slot:prepend>
                <q-icon :name="addBlockReason ? 'lock' : 'logout'" size="xs" />
              </template>
            </q-input>
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

      <q-separator />

      <q-card-actions align="right" class="compact-dialog-actions">
        <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" v-close-popup />
        <q-btn
          unelevated
          color="primary"
          label="Save"
          icon="check"
          class="primary-btn"
          @click="onSubmit"
          :loading="saving"
          :disable="!record.employee || !record.time_in || saving || selectionRequired || !!addBlockReason"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

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
});

const emit = defineEmits(['update:modelValue', 'update:record', 'submit', 'filter-employees', 'fetch-schedule']);

const formattedDate = computed(() => {
  if (!props.record.date) return '-';
  return new Date(props.record.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
});

const isOvernight = computed(() => {
  if (!props.record.time_in || !props.record.time_out) return false;
  const [inH, inM] = props.record.time_in.split(':').map(Number);
  const [outH, outM] = props.record.time_out.split(':').map(Number);
  return outH * 60 + outM < inH * 60 + inM;
});

const timeOutDate = computed(() => {
  if (!props.record.date) return '';
  const next = new Date(props.record.date);
  next.setDate(next.getDate() + 1);
  return next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
});

const workingHours = computed(() => {
  if (!props.record.time_in || !props.record.time_out) return '0h 0m';
  const [inHours, inMinutes] = props.record.time_in.split(':').map(Number);
  const [outHours, outMinutes] = props.record.time_out.split(':').map(Number);
  let diff = outHours * 60 + outMinutes - (inHours * 60 + inMinutes);
  if (diff < 0) diff += 24 * 60;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
});

function updateField(field, value) {
  emit('update:record', { ...props.record, [field]: value });
}

function isRecorded(s) {
  return Boolean(s.assignment_id) && props.recordedAssignments.includes(s.assignment_id);
}

// A shift that has been clocked in and out is finished, and a second record for
// it would have payroll counting the day twice.
function isCompleted(s) {
  return Boolean(s.assignment_id) && props.completedAssignments.includes(s.assignment_id);
}

function selectShift(s) {
  if (isRecorded(s) || s.assignment_id == null) return;
  updateField('selected_assignment_id', s.assignment_id);
}

/**
 * The shift this dialog would file the new record against, when that shift
 * already has one. A single shift is implied rather than clicked, so without
 * this the one case that most needs blocking — one scheduled shift, already
 * clocked in and out — was the one case Save stayed enabled for.
 */
const blockedShift = computed(() => {
  const sched = props.schedule || [];
  if (!sched.length) return null;

  const selectedId = props.record.selected_assignment_id;
  const target =
    selectedId != null
      ? sched.find((s) => s.assignment_id === selectedId)
      : sched.length === 1
        ? sched[0]
        : null;

  return target && isRecorded(target) ? target : null;
});

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
  if (!props.record.employee || !props.record.date) return null;

  // Nothing to compare against until the day's shifts are known. A day with no
  // schedule at all is refused separately, on the page, with its own message.
  const sched = props.schedule || [];
  if (props.scheduleLoading || !sched.length) return null;

  if (props.completedRecordCount >= sched.length) {
    return sched.length > 1
      ? 'Every shift scheduled for this day has already been clocked in and out. Edit one of those records instead — a new one would count the day twice.'
      : 'This employee already has an attendance with a time in and time out on this day. Edit that record instead — a new one would count the day twice.';
  }

  if (blockedShift.value) {
    return isCompleted(blockedShift.value)
      ? 'That shift has already been clocked in and out. Edit its record instead — a new one would count the shift twice.'
      : 'That shift already has an attendance record. Edit that record instead — a new one would count the shift twice.';
  }

  return null;
});

const selectionRequired = computed(() => {
  if (props.schedule && props.schedule.length > 1) {
    const allMissingAssignmentId = props.schedule.every((s) => s.assignment_id == null);
    if (allMissingAssignmentId) return false;
    return !props.record.selected_assignment_id;
  }
  return false;
});

function filterEmployees(val, update) {
  emit('filter-employees', val, update);
}

function statusColor(status) {
  const colors = { active: 'positive', completed: 'info', cancelled: 'negative', pending: 'warning' };
  return colors[status?.toLowerCase()] || 'grey';
}

function onSubmit() {
  if (addBlockReason.value) return;
  emit('submit', props.record);
}

watch(() => props.record.employee, (employeeId) => {
  if (employeeId && props.record.date) {
    emit('fetch-schedule', employeeId, props.record.date);
  }
});

watch(() => props.record.date, (newDate) => {
  if (props.record.employee && newDate) {
    emit('fetch-schedule', props.record.employee, newDate);
  }
});

// A lone shift selects itself so the reader does not have to click the only
// option — unless it already has a record, in which case selecting it would
// arm a Save that must not happen.
watch(() => props.schedule, (sched) => {
  if (sched && sched.length === 1 && sched[0].assignment_id && !isRecorded(sched[0])) {
    updateField('selected_assignment_id', sched[0].assignment_id);
  }
}, { immediate: true });
</script>

<style scoped>
.compact-dialog-card {
  width: 100%;
  max-width: 550px;
  border-radius: 12px;
}
.compact-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  gap: 12px;
  background: #102335;
}
.compact-dialog-header .q-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.compact-dialog-header .q-btn:hover {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}
.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
}
.dialog-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}
.compact-dialog-body {
  padding: 16px 20px;
  max-height: 70vh;
  overflow-y: auto;
}
.compact-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-row {
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
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: #fff;
  border: 1px solid #e5e7eb;
}
.schedule-compact-block:hover:not(.shift-disabled):not(.shift-selected) {
  background: #f5f7fa;
}
.schedule-compact-block.shift-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f3f4f6;
}
.schedule-compact-block.shift-selected {
  background: #102335;
  border: 1px solid #102335;
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
  background: #102335;
}
.shift-label {
  font-weight: 500;
  font-size: 13px;
  color: #374151;
}
.shift-label--selected {
  font-weight: 700;
  color: #102335;
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
  border-radius: 8px;
  margin-top: 8px;
}
.working-hours-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.compact-dialog-actions {
  padding: 12px 20px;
}
.primary-btn {
  background: #102335 !important;
  color: white;
}
.primary-btn:hover {
  background: #193d5c !important;
}
@media (max-width: 768px) {
  .compact-dialog-card { max-width: 95vw; margin: 12px; }
  .form-row { grid-template-columns: 1fr; gap: 12px; }
  .compact-dialog-actions { flex-direction: column-reverse; }
  .compact-dialog-actions .q-btn { width: 100%; }
}
</style>
