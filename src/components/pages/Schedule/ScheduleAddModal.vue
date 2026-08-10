<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card">
      <q-card-section class="modal-header">
        <div class="modal-title">Add New Schedule</div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-card-section class="modal-body">
        <q-form @submit.prevent="onSubmit" class="schedule-form">
          <!-- Schedule Type Selection -->
          <q-select
            :model-value="newSchedule.scheduleType"
            @update:model-value="updateField('scheduleType', $event)"
            :options="[
              { label: 'One-Time Schedule', value: 'one-time' },
              { label: 'Recurring Schedule', value: 'recurring' },
              { label: 'Rotating Schedule', value: 'rotating' },
            ]"
            option-value="value"
            option-label="label"
            label="Schedule Type"
            outlined
            emit-value
            map-options
            class="form-field full-width"
          >
            <template #hint>Choose whether this is a single schedule or repeats weekly</template>
          </q-select>

          <!-- Employee Selection -->
          <q-select
            ref="employeeSelectRef"
            :model-value="newSchedule.userIds"
            @update:model-value="updateField('userIds', $event)"
            :options="filteredEmployeeOptions"
            option-value="value"
            option-label="label"
            label="Select Employees"
            outlined
            emit-value
            map-options
            multiple
            use-chips
            use-input
            input-debounce="0"
            @filter="filterEmployees"
            class="form-field full-width"
            :rules="[(val) => (val && val.length > 0) || 'At least one employee is required']"
            :loading="loadingEmployees"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">No employees found</q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- One-Time: Multi-date picker + Shift rows -->
          <template v-if="newSchedule.scheduleType === 'one-time'">
            <div class="one-time-calendar-section">
              <div class="one-time-calendar-header">
                <div style="display: flex; align-items: center; gap: 6px">
                  <q-icon name="event_note" size="16px" color="primary" />
                  <span class="calendar-preview-title">Select Date(s)</span>
                </div>
                <q-badge
                  :color="(newSchedule.selectedDates || []).length ? 'primary' : 'grey'"
                  :label="(newSchedule.selectedDates || []).length ? `${newSchedule.selectedDates.length} selected` : 'None selected'"
                />
              </div>
              <div class="legend-row">
                <span class="legend-dot legend-dot-active"></span>
                <span class="legend-text">Click dates to select or deselect</span>
              </div>
              <!-- Dual calendar -->
              <div class="dual-calendar-panel dual-calendar-panel--inline">
                <div class="dual-calendar-grid">
                  <div class="mini-calendar">
                    <div class="mini-calendar-header">
                      <q-btn flat round dense icon="chevron_left" size="sm" @click="oneTimePrevMonth" class="cal-nav-btn" />
                      <span class="mini-calendar-title">{{ leftMonthLabel }}</span>
                      <div style="width: 32px" />
                    </div>
                    <div class="mini-calendar-weekdays">
                      <span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d">{{ d }}</span>
                    </div>
                    <div class="mini-calendar-days">
                      <span
                        v-for="(cell, i) in leftCells"
                        :key="'ol'+i"
                        class="cal-day"
                        :class="getDayCellClass(cell, leftYear, leftMonth)"
                        @click="cell.day ? toggleDate(cell.day, leftYear, leftMonth) : null"
                      >{{ cell.day || '' }}</span>
                    </div>
                  </div>
                  <div class="mini-calendar">
                    <div class="mini-calendar-header">
                      <div style="width: 32px" />
                      <span class="mini-calendar-title">{{ rightMonthLabel }}</span>
                      <q-btn flat round dense icon="chevron_right" size="sm" @click="oneTimeNextMonth" class="cal-nav-btn" />
                    </div>
                    <div class="mini-calendar-weekdays">
                      <span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d">{{ d }}</span>
                    </div>
                    <div class="mini-calendar-days">
                      <span
                        v-for="(cell, i) in rightCells"
                        :key="'or'+i"
                        class="cal-day"
                        :class="getDayCellClass(cell, rightYear, rightMonth)"
                        @click="cell.day ? toggleDate(cell.day, rightYear, rightMonth) : null"
                      >{{ cell.day || '' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="(newSchedule.selectedDates || []).length > 0" class="calendar-weekdays-summary">
                <span class="weekdays-label">Selected:</span>
                <q-chip
                  v-for="date in sortedSelectedDates"
                  :key="date"
                  dense color="primary" text-color="white" size="sm" removable
                  @remove="removeDate(date)"
                >{{ formatDisplayDate(date) }}</q-chip>
              </div>
              <div v-else class="calendar-weekdays-summary" style="color: #ef4444; font-size: 12px">
                <q-icon name="info" size="14px" color="negative" />
                Please select at least one date
              </div>
            </div>

            <!-- Shift rows -->
            <div v-for="(shift, index) in newSchedule.oneTimeShifts" :key="index" class="shift-row">
              <div class="shift-row-header">
                <span class="row-label">
                  <q-icon name="schedule" size="16px" />
                  Shift {{ index + 1 }}
                </span>
                <q-btn
                  v-if="newSchedule.oneTimeShifts.length > 1"
                  flat dense round icon="close" size="sm"
                  @click="removeShift(index)"
                  class="remove-btn"
                />
              </div>
              <div class="shift-fields">
                <q-select
                  :model-value="shift.shiftTemplate"
                  @update:model-value="updateShift(index, 'shiftTemplate', $event)"
                  :options="shiftTemplateOptions"
                  option-value="value"
                  option-label="label"
                  label="Shift Template"
                  outlined dense emit-value map-options clearable
                  class="form-field full-width"
                  :rules="[(val) => !!val || 'Shift template is required']"
                >
                  <template #option="scope">
                    <q-item v-bind="scope.itemProps" style="min-width: 0; max-width: 100%">
                      <q-item-section>
                        <template v-if="scope.opt.label && scope.opt.label.includes(' / ')">
                          <q-item-label v-for="(part, i) in scope.opt.label.split(' / ')" :key="i" style="font-size: 13px; line-height: 1.5">{{ part }}</q-item-label>
                        </template>
                        <q-item-label v-else style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px">{{ scope.opt.label }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
            </div>
          </template>

          <!-- Recurring: Date Range -->
          <template v-if="newSchedule.scheduleType === 'recurring'">
            <div class="form-row">
              <q-input
                :model-value="newSchedule.recurringStartDate"
                @update:model-value="updateField('recurringStartDate', $event)"
                label="Start Date" outlined class="form-field"
                placeholder="YYYY-MM-DD"
                :rules="[(val) => !!val || 'Start date is required']"
                readonly
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date
                        :model-value="newSchedule.recurringStartDate"
                        @update:model-value="updateField('recurringStartDate', $event)"
                        mask="YYYY-MM-DD"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
              <q-input
                :model-value="newSchedule.recurringEndDate"
                @update:model-value="updateField('recurringEndDate', $event)"
                label="End Date" outlined class="form-field"
                placeholder="YYYY-MM-DD"
                :rules="[(val) => !!val || 'End date is required']"
                readonly
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date
                        :model-value="newSchedule.recurringEndDate"
                        @update:model-value="updateField('recurringEndDate', $event)"
                        mask="YYYY-MM-DD"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>

            <q-select
              :model-value="newSchedule.recurringSchedule"
              @update:model-value="updateField('recurringSchedule', $event); $emit('template-change', $event)"
              :options="recurringScheduleOptions"
              option-value="value"
              option-label="label"
              label="Use Recurring Template"
              outlined emit-value map-options
              class="form-field full-width"
              clearable
            >
              <template #hint>Select a template to auto-fill schedule details</template>
            </q-select>

            <q-select
              :model-value="newSchedule.department"
              @update:model-value="updateField('department', $event)"
              :options="departmentOptions"
              option-value="value"
              option-label="label"
              label="Department"
              outlined emit-value map-options
              class="form-field full-width"
              clearable
            />

            <q-input
              :model-value="newSchedule.repeatInterval"
              @update:model-value="updateField('repeatInterval', $event)"
              label="Repeat Every (weeks)" type="number" outlined
              min="1"
              class="form-field full-width"
            >
              <template #hint>1 = every week, 2 = every other week, etc.</template>
            </q-input>

            <q-checkbox
              :model-value="newSchedule.isRotating"
              @update:model-value="updateField('isRotating', $event)"
              label="This is a rotating schedule"
              class="full-width"
            />
          </template>

          <!-- Rotating: Date Range + Details -->
          <template v-if="newSchedule.scheduleType === 'rotating'">
            <div class="form-row">
              <q-input
                :model-value="newSchedule.recurringStartDate"
                @update:model-value="updateField('recurringStartDate', $event)"
                label="Start Date" outlined class="form-field"
                placeholder="YYYY-MM-DD"
                :rules="[(val) => !!val || 'Start date is required']"
                readonly
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date
                        :model-value="newSchedule.recurringStartDate"
                        @update:model-value="updateField('recurringStartDate', $event)"
                        mask="YYYY-MM-DD"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
              <q-input
                :model-value="newSchedule.recurringEndDate"
                @update:model-value="updateField('recurringEndDate', $event)"
                label="End Date" outlined class="form-field"
                placeholder="YYYY-MM-DD"
                :rules="[(val) => !!val || 'End date is required']"
                readonly
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date
                        :model-value="newSchedule.recurringEndDate"
                        @update:model-value="updateField('recurringEndDate', $event)"
                        mask="YYYY-MM-DD"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>

            <div class="form-row">
              <q-select
                :model-value="newSchedule.rotatingPayrollGroups"
                @update:model-value="updateField('rotatingPayrollGroups', $event)"
                :options="payrollGroupOptions"
                option-value="value"
                option-label="label"
                label="Payroll Groups"
                outlined
                emit-value
                map-options
                multiple
                use-chips
                class="form-field"
                clearable
              />
              <q-select
                :model-value="newSchedule.rotatingSites"
                @update:model-value="updateField('rotatingSites', $event)"
                :options="siteOptions"
                option-value="value"
                option-label="label"
                label="Sites"
                outlined
                emit-value
                map-options
                multiple
                use-chips
                class="form-field"
                clearable
              />
            </div>

            <q-select
              :model-value="newSchedule.rotatingShiftTemplate"
              @update:model-value="updateField('rotatingShiftTemplate', $event)"
              :options="shiftTemplateOptions"
              option-value="value"
              option-label="label"
              label="Shift Template"
              outlined emit-value map-options
              class="form-field full-width"
              :rules="[(val) => !!val || 'Shift template is required']"
            />

            <q-select
              :model-value="newSchedule.rotationMode"
              @update:model-value="updateField('rotationMode', $event)"
              :options="[
                { label: 'Full Template', value: 'full_template' },
              ]"
              option-value="value"
              option-label="label"
              label="Rotation Mode"
              outlined emit-value map-options
              class="form-field full-width"
            />

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
              label="Weekdays"
              outlined
              emit-value
              map-options
              multiple
              use-chips
              class="form-field full-width"
              :rules="[(val) => (val && val.length > 0) || 'Select at least one weekday']"
            />
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
          <div class="modal-actions">
            <q-btn flat label="Cancel" @click="$emit('update:modelValue', false)" class="cancel-btn" />
            <q-btn
              type="submit"
              color="primary"
              :label="
                newSchedule.scheduleType === 'recurring'
                  ? 'Create Recurring Schedule'
                  : newSchedule.scheduleType === 'rotating'
                    ? 'Create Rotating Schedule'
                    : 'Add Schedule'
              "
              unelevated
              class="submit-btn"
              :loading="checkingConflict"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

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
      rotatingPayrollGroups: [],
      rotatingSites: [],
      rotatingShiftTemplate: null,
      rotationMode: 'full_template',
    }),
  },
  filteredEmployeeOptions: { type: Array, default: () => [] },
  shiftTemplateOptions: { type: Array, default: () => [] },
  recurringScheduleOptions: { type: Array, default: () => [] },
  departmentOptions: { type: Array, default: () => [] },
  conflictWarning: { type: Boolean, default: false },
  checkingConflict: { type: Boolean, default: false },
  loadingEmployees: { type: Boolean, default: false },
  siteOptions: { type: Array, default: () => [] },
  payrollGroupOptions: { type: Array, default: () => [] },
});

const emit = defineEmits([
  'update:modelValue',
  'update:newSchedule',
  'submit',
  'filter-employees',
  'template-change',
]);

watch(
  () => props.newSchedule.scheduleType,
  (type) => {
    if (type === 'rotating' && !(props.newSchedule.weekdays && props.newSchedule.weekdays.length)) {
      emit('update:newSchedule', {
        ...props.newSchedule,
        weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      });
    }
  },
);

// ─── Calendar state ─────────────────────────────────────────────────────────
const _today = new Date();
const leftMonth = ref(_today.getMonth());
const leftYear = ref(_today.getFullYear());

const rightMonth = computed(() => (leftMonth.value + 1) % 12);
const rightYear = computed(() => (leftMonth.value === 11 ? leftYear.value + 1 : leftYear.value));

const _MONTH_NAMES = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

const leftMonthLabel = computed(() => `${_MONTH_NAMES[leftMonth.value]} ${leftYear.value}`);
const rightMonthLabel = computed(() => `${_MONTH_NAMES[rightMonth.value]} ${rightYear.value}`);

function buildCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  return cells;
}

const leftCells = computed(() => buildCalendarCells(leftYear.value, leftMonth.value));
const rightCells = computed(() => buildCalendarCells(rightYear.value, rightMonth.value));

function oneTimePrevMonth() {
  if (leftMonth.value === 0) {
    leftMonth.value = 11;
    leftYear.value--;
  } else {
    leftMonth.value--;
  }
}
function oneTimeNextMonth() {
  if (leftMonth.value === 11) {
    leftMonth.value = 0;
    leftYear.value++;
  } else {
    leftMonth.value++;
  }
}

function _toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDayCellClass(cell, year, month) {
  if (!cell.day) return 'cal-day--empty';
  const dateStr = _toDateStr(year, month, cell.day);
  const todayStr = _toDateStr(_today.getFullYear(), _today.getMonth(), _today.getDate());
  const isPast = dateStr < todayStr;
  const isSelected = (props.newSchedule.selectedDates || []).includes(dateStr);
  return {
    'cal-day--past': isPast,
    'cal-day--disabled': isPast,
    'cal-day--selected': isSelected,
    'cal-day--multi': isSelected,
  };
}

function toggleDate(day, year, month) {
  const dateStr = _toDateStr(year, month, day);
  const todayStr = _toDateStr(_today.getFullYear(), _today.getMonth(), _today.getDate());
  if (dateStr < todayStr) return;
  const current = [...(props.newSchedule.selectedDates || [])];
  if (current.includes(dateStr)) {
    updateField('selectedDates', current.filter((d) => d !== dateStr));
  } else {
    updateField('selectedDates', [...current, dateStr]);
  }
}

function removeDate(date) {
  updateField('selectedDates', (props.newSchedule.selectedDates || []).filter((d) => d !== date));
}

const sortedSelectedDates = computed(() => [...(props.newSchedule.selectedDates || [])].sort());

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d).padStart(2, '0')} ${months[parseInt(m) - 1]} ${y}`;
}

// ─── Form helpers ───────────────────────────────────────────────────────────
function updateField(key, value) {
  emit('update:newSchedule', { ...props.newSchedule, [key]: value });
}

function updateShift(index, field, value) {
  const updated = { ...props.newSchedule };
  updated.oneTimeShifts = [...updated.oneTimeShifts];
  updated.oneTimeShifts[index] = { ...updated.oneTimeShifts[index], [field]: value };
  emit('update:newSchedule', updated);
}

function removeShift(index) {
  const updated = { ...props.newSchedule };
  updated.oneTimeShifts = [...updated.oneTimeShifts];
  updated.oneTimeShifts.splice(index, 1);
  emit('update:newSchedule', updated);
}

function filterEmployees(val, update) {
  emit('filter-employees', val, update);
}

function onSubmit() {
  emit('submit');
}
</script>

<style scoped>
.modal-card {
  border-radius: 14px !important;
  width: 500px !important;
  min-width: 500px !important;
  max-width: 95vw !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  background: #102335;
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}
.modal-header .q-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.modal-header .q-btn:hover {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}
.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 70vh;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.modal-body::-webkit-scrollbar {
  display: none;
}
.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
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
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f3f5;
}
.cancel-btn {
  background: #102335;
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 8px !important;
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}
.submit-btn {
  background: #102335 !important;
  color: white;
  padding: 6px 16px;
  border-radius: 8px !important;
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}
.submit-btn:hover {
  background: #193d5c !important;
}
.cancel-btn:hover {
  background: #193d5c;
}
.warning-banner {
  margin-top: 14px;
  background-color: #fffbeb;
  border: 1px solid #fcd34d;
  padding: 12px;
  border-radius: 8px;
}
.shift-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.row-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.remove-btn {
  color: #9ca3af;
}
.remove-btn:hover {
  color: #ef4444;
  background: #fef2f2 !important;
}
.shift-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
/* Calendar */
.one-time-calendar-section {
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 16px;
}
.one-time-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.calendar-preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #4338ca;
  flex: 1;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.legend-dot-active {
  background-color: #6366f1;
}
.legend-text {
  font-size: 11px;
  color: #6b7280;
}
.dual-calendar-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.dual-calendar-panel--inline {
  box-shadow: none;
  border: 1px solid #e0e7ff;
  padding: 8px;
}
.dual-calendar-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.mini-calendar {
  min-width: 0;
}
.mini-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.mini-calendar-title {
  font-size: 11px;
  font-weight: 700;
  color: #1a3a5c;
  letter-spacing: 0.03em;
  text-align: center;
  flex: 1;
}
.cal-nav-btn {
  color: #6b7280 !important;
}
.mini-calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 2px;
}
.mini-calendar-weekdays span {
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  padding: 2px 0;
}
.mini-calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}
.cal-day {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  font-size: 11px;
  color: #1a3a5c;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}
.cal-day:not(.cal-day--empty):not(.cal-day--disabled):hover {
  background: #e8edf5;
}
.cal-day--empty {
  cursor: default;
}
.cal-day--disabled {
  color: #d1d5db;
  cursor: not-allowed;
}
.cal-day--selected {
  background: #1a3a5c !important;
  color: #fff !important;
  border-radius: 50% !important;
  font-weight: 700;
}
.cal-day--multi {
  background: #1a3a5c !important;
  color: #fff !important;
  border-radius: 50% !important;
  font-weight: 700;
}
.calendar-weekdays-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e7ff;
}
.weekdays-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}
@media (max-width: 768px) {
  .modal-card {
    min-width: unset !important;
    max-width: calc(100vw - 20px) !important;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
  .full-width {
    grid-column: span 1;
  }
}
</style>
