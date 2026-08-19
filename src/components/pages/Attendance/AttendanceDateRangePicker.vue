<template>
  <!-- Centred, matching AttendanceAddDialog — this used to open pinned to the
       top of the viewport, which read as a dropdown rather than a dialog. -->
  <q-dialog
    :model-value="modelValue"
    persistent
    :maximized="$q.screen.lt.sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="rr-card">
      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <q-card-section class="rr-head">
        <div>
          <div class="rr-head__title">Review attendance</div>
          <div class="rr-head__sub">{{ headerSummary }}</div>
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section class="rr-body">
        <!-- ── Employee ─────────────────────────────────────────────────── -->
        <q-select
          v-model="employee"
          :options="filteredEmployeeOptions"
          :loading="optionsLoading"
          label="Employee"
          hint="Leave blank to review everyone over the same dates"
          filled
          dense
          clearable
          emit-value
          map-options
          use-input
          fill-input
          hide-selected
          input-debounce="200"
          class="rr-field"
          @filter="onEmployeeFilter"
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
              class="rr-nav"
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
              class="rr-nav"
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

      <q-separator />

      <q-card-actions align="right" class="rr-actions">
        <q-btn flat no-caps label="Clear" class="rr-btn-quiet" @click="clearSelection" />
        <q-space />
        <q-btn flat no-caps label="Cancel" @click="$emit('update:modelValue', false)" />
        <q-btn
          unelevated
          no-caps
          label="Apply"
          icon="check"
          class="rr-btn-primary"
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
function pad(value) {
  return String(value).padStart(2, '0')
}

function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const todayIso = toIso(new Date())
const maxIso = computed(() => (props.maxDate === 'today' ? todayIso : props.maxDate || null))

// Bare YYYY-MM-DD parses as UTC and can shift a day west of Greenwich
function fromIso(iso) {
  return new Date(`${iso}T00:00:00`)
}

function longLabel(iso) {
  if (!iso) return ''
  const date = fromIso(iso)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shiftIso(iso, days) {
  const date = fromIso(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

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

  if (key === 'last7') return { from: shiftIso(todayIso, -6), to: todayIso }
  if (key === 'last30') return { from: shiftIso(todayIso, -29), to: todayIso }

  if (key === 'thisMonth') {
    const first = toIso(new Date(now.getFullYear(), now.getMonth(), 1))
    // Clamped to today: a month-to-date span should not reach into the future
    return { from: first, to: todayIso }
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
    'rr-day--today': cell.iso === todayIso,
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
    employeeNeedle.value = val || ''
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
/* ── Shell ─────────────────────────────────────────────────────────────────── */
.rr-card {
  width: 100%;
  max-width: 620px;
  border-radius: 14px;
  overflow: hidden;
}

.rr-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  background: var(--dash-brand, #102335);
}

.rr-head__title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
}

.rr-head__sub {
  margin-top: 2px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.rr-head :deep(.q-btn) {
  color: rgba(255, 255, 255, 0.8);
}

.rr-head :deep(.q-btn:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

.rr-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
  max-height: 72vh;
  overflow-y: auto;
}

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
  border: 1px solid var(--dash-line, #eaecf0);
  border-radius: 999px;
  background: var(--dash-surface, #fff);
  color: var(--dash-ink-2, #475467);
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
  background: var(--dash-hover, #f9fafb);
  border-color: var(--dash-line-strong, #d0d5dd);
}

.rr-preset--on {
  background: var(--dash-accent-bg, #eef2ff);
  border-color: var(--dash-accent, #2e4fd4);
  color: var(--dash-accent, #2e4fd4);
  font-weight: 600;
}

/* ── Calendar ──────────────────────────────────────────────────────────────── */
.rr-cal {
  border: 1px solid var(--dash-line, #eaecf0);
  border-radius: 12px;
  padding: 12px 12px 6px;
  background: var(--dash-surface, #fff);
}

.rr-cal__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.rr-cal__labels {
  display: flex;
  flex: 1;
  min-width: 0;
}

.rr-cal__label {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink, #101828);
  letter-spacing: 0.1px;
}

.rr-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border: 1px solid var(--dash-line, #eaecf0);
  border-radius: 8px;
  background: var(--dash-surface, #fff);
  color: var(--dash-ink-2, #475467);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.rr-nav:hover:not(:disabled) {
  background: var(--dash-hover, #f9fafb);
  color: var(--dash-ink, #101828);
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
  color: var(--dash-ink-4, #98a2b3);
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
  background: var(--dash-accent-bg, #eef2ff);
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
  border-radius: 999px;
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
  border-radius: 999px;
  background: transparent;
  color: var(--dash-ink, #101828);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.rr-day:hover:not(:disabled):not(.rr-day--edge) {
  background: var(--dash-n-200, #eaecf0);
}

.rr-day--edge,
.rr-day--edge:hover {
  background: var(--dash-accent, #2e4fd4);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(46, 79, 212, 0.35);
}

/* Ring rather than fill, so it never competes with a selected edge */
.rr-day--today:not(.rr-day--edge) {
  box-shadow: inset 0 0 0 1.5px var(--dash-accent, #2e4fd4);
  color: var(--dash-accent, #2e4fd4);
  font-weight: 700;
}

.rr-day--disabled,
.rr-day--disabled:hover {
  color: var(--dash-ink-4, #98a2b3);
  background: transparent;
  cursor: default;
}

.rr-hint {
  margin: 8px 0 4px;
  text-align: center;
  font-size: 11.5px;
  color: var(--dash-ink-3, #667085);
}

/* ── Summary ───────────────────────────────────────────────────────────────── */
.rr-summary {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border: 1px solid var(--dash-info-line, #c7d2fe);
  border-radius: 10px;
  background: var(--dash-accent-bg, #eef2ff);
  color: var(--dash-accent, #2e4fd4);
  font-size: 13px;
}

.rr-summary--empty {
  border-color: var(--dash-line, #eaecf0);
  background: var(--dash-sunken, #f9fafb);
  color: var(--dash-ink-3, #667085);
}

.rr-summary__text {
  min-width: 0;
}

.rr-summary__count {
  margin-left: auto;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Actions ───────────────────────────────────────────────────────────────── */
.rr-actions {
  padding: 12px 20px;
}

.rr-btn-quiet {
  color: var(--dash-ink-3, #667085);
}

.rr-btn-primary {
  background: var(--dash-brand, #102335);
  color: #fff;
}

.rr-btn-primary:hover {
  background: #193d5c;
}

/* ── Narrow ────────────────────────────────────────────────────────────────── */
@media (max-width: 599px) {
  .rr-card {
    max-width: 100%;
    border-radius: 0;
  }

  .rr-body {
    max-height: none;
  }

  .rr-cal__panes {
    gap: 0;
  }

  .rr-actions {
    flex-wrap: wrap;
  }
}
</style>
