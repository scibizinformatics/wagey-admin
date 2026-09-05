<template>
  <!-- Centred, matching AttendanceAddDialog — this used to open pinned to the
       top of the viewport, which read as a dropdown rather than a dialog. -->
  <q-dialog
    :model-value="modelValue"
    persistent
    :maximized="$q.screen.lt.sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="dash-modal dash-modal--lg">
      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="date_range" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Review attendance</div>
            <div class="dash-modal__sub">{{ headerSummary }}</div>
          </div>
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <!-- ── Employee ─────────────────────────────────────────────────── -->
        <label class="dash-modal__field">
          <span class="dash-modal__field-label">Employee</span>
          <q-select
            v-model="employee"
            :options="filteredEmployeeOptions"
            :loading="optionsLoading"
            hint="Leave blank to review everyone over the same dates"
            outlined
            dense
            clearable
            emit-value
            map-options
            use-input
            fill-input
            hide-selected
            input-debounce="200"
            class="dash-field rr-field"
            @filter="onEmployeeFilter"
            hide-bottom-space
            popup-content-class="dash-popup dash-popup--modal"
          >
            <template v-slot:prepend>
              <q-icon name="person" size="xs" />
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey-6">No employee matches</q-item-section>
              </q-item>
            </template>
          </q-select>
        </label>

        <!-- ── Presets ──────────────────────────────────────────────────── -->
        <!-- Attendance review is nearly always a recent window, so the common
             spans are one click rather than two calendar hunts. -->
        <div class="rr-presets">
          <button
            v-for="preset in presets"
            :key="preset.key"
            type="button"
            class="rr-preset"
            :class="{ 'rr-preset--on': activePreset === preset.key }"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- ── Calendar ─────────────────────────────────────────────────── -->
        <div class="rr-cal">
          <div class="rr-cal__bar">
            <button
              type="button"
              class="rr-nav rr-nav--prev"
              aria-label="Previous month"
              @click="shiftMonths(-1)"
            >
              <q-icon name="chevron_left" size="18px" />
            </button>
            <div class="rr-cal__labels">
              <span v-for="pane in panes" :key="pane.key" class="rr-cal__label">
                {{ pane.label }}
              </span>
            </div>
            <button
              type="button"
              class="rr-nav rr-nav--next"
              aria-label="Next month"
              :disabled="atLatestMonth"
              @click="shiftMonths(1)"
            >
              <q-icon name="chevron_right" size="18px" />
            </button>
          </div>

          <div class="rr-cal__panes" @mouseleave="hovered = ''">
            <div v-for="pane in panes" :key="pane.key" class="rr-pane">
              <div class="rr-grid">
                <span v-for="day in weekdays" :key="day" class="rr-weekday">{{ day }}</span>
                <span
                  v-for="(cell, index) in pane.cells"
                  :key="index"
                  class="rr-slot"
                  :class="cell ? slotClasses(cell) : null"
                >
                  <button
                    v-if="cell"
                    type="button"
                    class="rr-day"
                    :class="dayClasses(cell)"
                    :disabled="cell.disabled"
                    @click="pick(cell.iso)"
                    @mouseenter="hovered = cell.disabled ? '' : cell.iso"
                  >
                    {{ cell.day }}
                  </button>
                </span>
              </div>
            </div>
          </div>

          <p class="rr-hint">
            {{ picking ? 'Now pick the end date' : 'Click a day to start a new range' }}
          </p>
        </div>

        <!-- ── Selection summary ────────────────────────────────────────── -->
        <div class="rr-summary" :class="{ 'rr-summary--empty': !isComplete }">
          <q-icon :name="isComplete ? 'o_event_available' : 'o_event'" size="18px" />
          <span v-if="isComplete" class="rr-summary__text">
            <strong>{{ longLabel(range.from) }}</strong> to
            <strong>{{ longLabel(range.to) }}</strong>
          </span>
          <span v-else class="rr-summary__text">No dates selected yet</span>
          <span v-if="isComplete" class="rr-summary__count">
            {{ dayCount }} {{ dayCount === 1 ? 'day' : 'days' }}
          </span>
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Clear" class="rr-clear" @click="clearSelection" />
        <q-space />
        <q-btn
          flat
          no-caps
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          label="Apply"
          class="dash-modal__submit"
          :disable="!isComplete"
          @click="onApply"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Employee + date-range picker for reviewing an attendance log.
 *
 * The calendar is hand-built rather than a QDate: range selection needed a
 * continuous highlight bar, a hover preview of the pending end date, and future
 * days disabled — all of which meant fighting QDate's internals harder than
 * drawing seven columns.
 */
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import {
  pad,
  toIso,
  fromIso,
  todayIso,
  shiftIso,
  longLabel,
} from 'src/composables/utils/calendarDate'

const $q = useQuasar()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  initialRange: { type: Object, default: () => ({ from: '', to: '' }) },
  initialEmployee: { type: [String, Number], default: null },
  employeeOptions: { type: Array, default: () => [] },
  optionsLoading: { type: Boolean, default: false },
  // Latest selectable day. Attendance cannot exist in the future, so this
  // defaults to today; pass an empty string to allow any date.
  maxDate: { type: String, default: 'today' },
})

const emit = defineEmits(['update:modelValue', 'apply'])

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ─── Date helpers ─────────────────────────────────────────────────────────────
// pad / toIso / fromIso / longLabel / shiftIso live in composables/utils/
// calendarDate.js — this component and ScheduleRangeCalendar.vue held identical
// copies, and the header comment there explains the UTC day-shift they exist to
// avoid.

// Resolved once per mount: the picker is opened, used and closed, so it never
// outlives the day it read. Anything long-lived should call todayIso() per use.
const today = todayIso()
const maxIso = computed(() => (props.maxDate === 'today' ? today : props.maxDate || null))

// ─── Selection ────────────────────────────────────────────────────────────────
const range = ref({ from: '', to: '' })
const employee = ref(null)
const employeeNeedle = ref('')
const hovered = ref('')

// True between the first and second click, when the end date is still open
const picking = computed(() => Boolean(range.value.from && !range.value.to))

const isComplete = computed(() => Boolean(range.value.from && range.value.to))

// While picking, the hovered day stands in for the end date so the highlight
// tracks the cursor.
const previewEnd = computed(() => {
  if (!picking.value) return ''
  if (!hovered.value || hovered.value < range.value.from) return ''
  return hovered.value
})

const effectiveRange = computed(() => ({
  from: range.value.from,
  to: range.value.to || previewEnd.value,
}))

const dayCount = computed(() => {
  if (!isComplete.value) return 0
  const ms = fromIso(range.value.to) - fromIso(range.value.from)
  return Math.round(ms / 86400000) + 1
})

function pick(iso) {
  // A completed range, or a click before the current start, begins a new one
  if (!range.value.from || range.value.to || iso < range.value.from) {
    range.value = { from: iso, to: '' }
    return
  }
  range.value = { ...range.value, to: iso }
}

function clearSelection() {
  range.value = { from: '', to: '' }
  employee.value = null
  hovered.value = ''
}

// ─── Presets ──────────────────────────────────────────────────────────────────
const presets = [
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
]

function presetRange(key) {
  const now = new Date()

  if (key === 'last7') return { from: shiftIso(today, -6), to: today }
  if (key === 'last30') return { from: shiftIso(today, -29), to: today }

  if (key === 'thisMonth') {
    const first = toIso(new Date(now.getFullYear(), now.getMonth(), 1))
    // Clamped to today: a month-to-date span should not reach into the future
    return { from: first, to: today }
  }

  const firstOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastOfLast = new Date(now.getFullYear(), now.getMonth(), 0)
  return { from: toIso(firstOfLast), to: toIso(lastOfLast) }
}

const activePreset = computed(() => {
  if (!isComplete.value) return ''
  const match = presets.find((preset) => {
    const candidate = presetRange(preset.key)
    return candidate.from === range.value.from && candidate.to === range.value.to
  })
  return match?.key ?? ''
})

function applyPreset(preset) {
  range.value = presetRange(preset.key)
  anchorOnEnd(range.value.to)
}

// ─── Month panes ──────────────────────────────────────────────────────────────
const monthCount = computed(() => ($q.screen.lt.sm ? 1 : 2))

function normalize(year, month) {
  return { year: year + Math.floor(month / 12), month: ((month % 12) + 12) % 12 }
}

const now = new Date()
// Anchor the LAST pane on the current month: with future days disabled, a
// trailing next-month pane would be entirely dead space.
const anchor = ref(normalize(now.getFullYear(), now.getMonth() - 1))

// Anchored on the range's END month rather than its start: the last pane is the
// one the eye lands on, and a range that runs up to today would otherwise sit
// beside a next-month pane where every day is disabled.
function anchorOnEnd(iso) {
  if (!iso) return
  const date = fromIso(iso)
  anchor.value = normalize(date.getFullYear(), date.getMonth() - (monthCount.value - 1))
}

function buildCells(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate() // day 0 of next month
  const leadingBlanks = new Date(year, month, 1).getDay()
  const cells = Array.from({ length: leadingBlanks }, () => null)

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`
    cells.push({ day, iso, disabled: maxIso.value !== null && iso > maxIso.value })
  }
  return cells
}

const panes = computed(() =>
  Array.from({ length: monthCount.value }, (unused, offset) => {
    const { year, month } = normalize(anchor.value.year, anchor.value.month + offset)
    return {
      key: `${year}-${month}`,
      label: new Date(year, month, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      cells: buildCells(year, month),
    }
  }),
)

// Don't page forward into months that are entirely unselectable
const atLatestMonth = computed(() => {
  if (maxIso.value === null) return false
  const last = normalize(anchor.value.year, anchor.value.month + monthCount.value - 1)
  return `${last.year}-${pad(last.month + 1)}` >= maxIso.value.slice(0, 7)
})

function shiftMonths(delta) {
  anchor.value = normalize(anchor.value.year, anchor.value.month + delta)
}

// ─── Cell state ───────────────────────────────────────────────────────────────
// The continuous highlight bar lives on the slot, not the button, so adjacent
// days butt together with no seam.
function slotClasses(cell) {
  const { from, to } = effectiveRange.value
  if (!from || !to) return null
  if (cell.iso < from || cell.iso > to) return null

  return {
    'rr-slot--range': true,
    'rr-slot--start': cell.iso === from,
    'rr-slot--end': cell.iso === to,
    'rr-slot--preview': !range.value.to,
  }
}

function dayClasses(cell) {
  const { from, to } = effectiveRange.value
  return {
    'rr-day--edge': cell.iso === from || (Boolean(to) && cell.iso === to),
    'rr-day--today': cell.iso === today,
    'rr-day--disabled': cell.disabled,
  }
}

// ─── Employee options ─────────────────────────────────────────────────────────
// Filtered here rather than through the parent's shared `employeeOptions`, which
// the add-attendance dialog also reads — narrowing it there would leak across.
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
    // QSelect's `fill-input` puts the selected employee's name in the box, and
    // `showPopup` re-runs the filter with whatever the box holds — so reopening
    // the menu with someone already chosen filtered the list down to that one
    // name. An echo of the current selection means "no filter", not "show me
    // only them".
    const typed = val || ''
    employeeNeedle.value = typed === employeeName.value ? '' : typed
  })
}

const employeeName = computed(() => {
  if (!employee.value) return ''
  const match = props.employeeOptions.find((o) => String(o.value) === String(employee.value))
  return match?.label ?? ''
})

const headerSummary = computed(() => {
  if (!isComplete.value) {
    return employeeName.value
      ? `${employeeName.value} — pick a period`
      : 'Pick an employee and a period'
  }
  const span = `${longLabel(range.value.from)} – ${longLabel(range.value.to)}`
  return employeeName.value ? `${employeeName.value} · ${span}` : span
})

function onApply() {
  if (!isComplete.value) return
  emit('apply', { ...range.value, employee: employee.value ?? null })
}

// ─── Open / reset ─────────────────────────────────────────────────────────────
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return

    const initial = props.initialRange
    range.value =
      initial?.from && initial?.to ? { from: initial.from, to: initial.to } : { from: '', to: '' }
    employee.value = props.initialEmployee ?? null
    employeeNeedle.value = ''
    hovered.value = ''

    if (range.value.to) anchorOnEnd(range.value.to)
    else anchor.value = normalize(now.getFullYear(), now.getMonth() - (monthCount.value - 1))
  },
)
</script>

<style scoped>
.rr-field {
  margin-bottom: 0;
}

/* ── Presets ───────────────────────────────────────────────────────────────── */
.rr-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.rr-preset {
  padding: 6px 12px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-pill);
  background: var(--dash-surface);
  color: var(--dash-ink-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.rr-preset:hover {
  background: var(--dash-hover);
  border-color: var(--dash-line-strong);
}

.rr-preset--on {
  background: var(--dash-accent-bg);
  border-color: var(--dash-accent);
  color: var(--dash-accent);
  font-weight: 600;
}

/* ── Calendar ──────────────────────────────────────────────────────────────── */
.rr-cal {
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  padding: 12px 12px 6px;
  background: var(--dash-surface);
}

.rr-cal__bar {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

/* Each title has to sit over the grid it names. The nav buttons used to take
   their width out of this row, so the two labels were centred inside a track
   72px narrower than the panes below — pulling July ~23px right of its grid and
   August ~23px left of its own. Taking the buttons out of the flow leaves the
   labels sharing the full width on the same two tracks, with the same 20px gap,
   as .rr-cal__panes. */
.rr-cal__labels {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 20px;
}

.rr-cal__label {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  letter-spacing: 0.1px;
}

.rr-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
  color: var(--dash-ink-2);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.rr-nav--prev {
  left: 0;
}

.rr-nav--next {
  right: 0;
}

.rr-nav:hover:not(:disabled) {
  background: var(--dash-hover);
  color: var(--dash-ink);
}

.rr-nav:disabled {
  opacity: 0.35;
  cursor: default;
}

.rr-cal__panes {
  display: flex;
  gap: 20px;
}

.rr-pane {
  flex: 1;
  min-width: 0;
}

.rr-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  /* No column gap: the range highlight has to run unbroken across a week. */
  row-gap: 2px;
}

.rr-weekday {
  padding: 6px 0 4px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--dash-ink-4);
}

.rr-slot {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* The continuous bar behind an in-range week */
.rr-slot--range::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 32px;
  transform: translateY(-50%);
  background: var(--dash-accent-bg);
}

.rr-slot--start::before {
  left: 2px;
  border-radius: 999px 0 0 999px;
}

.rr-slot--end::before {
  right: 2px;
  border-radius: 0 999px 999px 0;
}

.rr-slot--start.rr-slot--end::before {
  border-radius: var(--dash-r-pill);
}

/* Softer while the end date is only a hover preview */
.rr-slot--preview::before {
  opacity: 0.55;
}

.rr-day {
  position: relative;
  z-index: 1;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--dash-r-pill);
  background: transparent;
  color: var(--dash-ink);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.rr-day:hover:not(:disabled):not(.rr-day--edge) {
  background: var(--dash-n-200);
}

.rr-day--edge,
.rr-day--edge:hover {
  background: var(--dash-accent);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(46, 79, 212, 0.35);
}

/* Ring rather than fill, so it never competes with a selected edge */
.rr-day--today:not(.rr-day--edge) {
  box-shadow: inset 0 0 0 1.5px var(--dash-accent);
  color: var(--dash-accent);
  font-weight: 700;
}

.rr-day--disabled,
.rr-day--disabled:hover {
  color: var(--dash-ink-4);
  background: transparent;
  cursor: default;
}

.rr-hint {
  margin: 8px 0 4px;
  text-align: center;
  font-size: 11.5px;
  color: var(--dash-ink-3);
}

/* ── Summary ───────────────────────────────────────────────────────────────── */
.rr-summary {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border: 1px solid var(--dash-info-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-size: 13px;
}

.rr-summary--empty {
  border-color: var(--dash-line);
  background: var(--dash-sunken);
  color: var(--dash-ink-3);
}

.rr-summary__text {
  min-width: 0;
}

.rr-summary__count {
  margin-left: auto;
  padding: 2px 9px;
  border-radius: var(--dash-r-pill);
  background: rgba(255, 255, 255, 0.75);
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

/* A third action, quieter than Cancel: it edits the selection rather than
   ending the dialog, so it stays plain text at the far left of the footer. */
.rr-clear {
  min-height: 36px;
  padding: 0 10px;
  color: var(--dash-ink-3);
  font-size: 13px;
  font-weight: 500;
}
.rr-clear:hover {
  color: var(--dash-ink);
}

/* ── Narrow ────────────────────────────────────────────────────────────────── */
@media (max-width: 599px) {
  .rr-cal__panes {
    gap: 0;
  }

  .dash-modal__foot {
    flex-wrap: wrap;
  }
}
</style>
