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
                <div class="schedule-compact-row">
                  <span v-if="schedule.length > 1" class="text-caption text-weight-medium text-deep-purple">
                    Shift {{ idx + 1 }}
                  </span>
                  <span v-else class="text-weight-medium">{{ s.employee_name }}</span>
                  <q-badge :color="statusColor(s.status)">{{ s.status }}</q-badge>
                </div>
                <div class="schedule-compact-row text-caption text-grey-7">
                  <span>{{ s.site }} • {{ s.position }}</span>
                  <span>{{ s.shift_start }} - {{ s.shift_end }}</span>
                </div>
                <q-separator v-if="idx < schedule.length - 1" class="q-my-xs" />
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

          <div class="form-row">
            <q-input
              filled
              dense
              :model-value="record.time_in"
              @update:model-value="updateField('time_in', $event)"
              label="Time In *"
              type="time"
              class="form-field"
              :rules="[(val) => !!val || 'Required']"
            >
              <template v-slot:prepend>
                <q-icon name="login" size="xs" />
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
            >
              <template v-slot:prepend>
                <q-icon name="logout" size="xs" />
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
          :disable="!record.employee || !record.time_in || saving"
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

function filterEmployees(val, update) {
  emit('filter-employees', val, update);
}

function statusColor(status) {
  const colors = { active: 'positive', completed: 'info', cancelled: 'negative', pending: 'warning' };
  return colors[status?.toLowerCase()] || 'grey';
}

function onSubmit() {
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
  gap: 4px;
  font-size: 13px;
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
