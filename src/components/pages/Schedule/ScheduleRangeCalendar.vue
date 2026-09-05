<template>
  <div class="rc">
    <div class="rc__head">
      <span class="rc__title">{{ title }}</span>
      <span class="rc__meta">
        <button v-if="hasStart" type="button" class="rc__clear" @click="clear">Clear</button>
        <span class="rc__count" :class="{ 'rc__count--on': isComplete }">
          {{ countLabel }}
        </span>
      </span>
    </div>

    <div class="rc__cal">
      <div class="rc__bar">
        <button
          type="button"
          class="rc__nav"
          aria-label="Previous month"
          :disabled="atEarliestMonth"
          @click="shiftMonths(-1)"
        >
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="rc__labels">
          <span v-for="pane in panes" :key="pane.key" class="rc__label">{{ pane.label }}</span>
        </div>
        <button type="button" class="rc__nav" aria-label="Next month" @click="shiftMonths(1)">
          <q-icon name="chevron_right" size="18px" />
        </button>
      </div>

      <div class="rc__panes" @mouseleave="hovered = ''">
        <div v-for="pane in panes" :key="pane.key" class="rc__pane">
          <div class="rc__grid">
            <span v-for="day in WEEKDAY_LABELS" :key="pane.key + day" class="rc__weekday">
              {{ day }}
            </span>
            <span
              v-for="(cell, index) in pane.cells"
              :key="pane.key + '-' + index"
              class="rc__slot"
              :class="cell ? slotClasses(cell) : null"
            >
              <button
                v-if="cell"
                type="button"
                class="rc__day"
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

      <p class="rc__hint">{{ hintText }}</p>
    </div>

    <div class="rc__summary" :class="summaryClasses">
      <q-icon :name="isComplete ? 'o_event_available' : 'o_event'" size="18px" />
      <span v-if="!hasStart" class="rc__summary-text">{{ emptyText }}</span>
      <span v-else-if="!isComplete" class="rc__summary-text">
        Starting <strong>{{ longLabel(modelValue.from) }}</strong> — pick the end date
      </span>
      <span v-else class="rc__summary-text">
        <strong>{{ longLabel(modelValue.from) }}</strong> to
        <strong>{{ longLabel(modelValue.to) }}</strong>
      </span>
      <span v-if="isComplete" class="rc__summary-count">
        {{ occurrenceCount }} {{ occurrenceCount === 1 ? unitLabel : unitLabelPlural }}
      </span>
    </div>

    <!-- Only meaningful once a weekday pattern narrows the span -->
    <p v-if="marksSubset" class="rc__legend">
      <span class="rc__legend-swatch" aria-hidden="true"></span>
      Filled days are the ones that get a shift, from the selected pattern.
    </p>
  </div>
</template>

<script setup>
/**
 * Dual-month range picker shared by every Add Schedule type.
 *
 * The one-time flow wants every day in the span; the recurring and rotating
 * flows only create shifts on the weekdays their template covers. Rather than
 * two calendars, this one takes `occurrenceWeekdays` and dims the in-range days
 * that will not produce a shift — so the span you drag and the shifts you get
 * are visible in the same place.
 *
 * The model is `{ from, to }` with `to: ''` standing for a half-finished pick,
 * which is what makes the hover preview possible without extra state.
 */
import { ref, computed, watch } from 'vue'
import { pad, toIso, fromIso, todayIso, longLabel } from 'src/composables/utils/calendarDate'

const props = defineProps({
  modelValue: { type: Object, default: () => ({ from: '', to: '' }) },
  // Lowercase weekday names ('monday', …). `null` means every day counts,
  // which is how the one-time flow uses it.
  occurrenceWeekdays: { type: Array, default: null },
  title: { type: String, default: 'Select dates' },
  emptyText: { type: String, default: 'No dates selected yet — pick a start and end date' },
  unitLabel: { type: String, default: 'day' },
  unitLabelPlural: { type: String, default: 'days' },
  // Earliest selectable day: any date by default, since schedules are also
  // filled in after the fact. Pass 'today' to forbid backdating, or a
  // YYYY-MM-DD string for any other floor.
  minDate: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// ─── Date helpers ───────────────────────────────────────────────────────────
// pad / toIso / fromIso / longLabel live in composables/utils/calendarDate.js —
// this component and AttendanceDateRangePicker.vue held identical copies, and
// the header comment there explains the UTC day-shift they exist to avoid.
const now = new Date()

// Resolved once per mount: the calendar is opened, used and closed, so it never
// outlives the day it read. Anything long-lived should call todayIso() per use.
const today = todayIso()
const minIso = computed(() => (props.minDate === 'today' ? today : props.minDate || null))

// ─── Selection ──────────────────────────────────────────────────────────────
const hovered = ref('')

const hasStart = computed(() => Boolean(props.modelValue?.from))
const isComplete = computed(() => Boolean(props.modelValue?.from && props.modelValue?.to))

// While picking, the hovered day stands in for the end date so the highlight
// bar tracks the cursor.
const effectiveRange = computed(() => {
  const from = props.modelValue?.from || ''
  if (!from) return { from: '', to: '' }
  if (props.modelValue.to) return { from, to: props.modelValue.to }
  const preview = hovered.value && hovered.value >= from ? hovered.value : from
  return { from, to: preview }
})

function pick(iso) {
  const from = props.modelValue?.from || ''
  // A completed range, or a click before the current start, begins a new one
  if (!from || props.modelValue.to || iso < from) {
    emit('update:modelValue', { from: iso, to: '' })
    return
  }
  emit('update:modelValue', { from, to: iso })
}

function clear() {
  hovered.value = ''
  emit('update:modelValue', { from: '', to: '' })
}

// ─── Occurrences ────────────────────────────────────────────────────────────
// A weekday list that covers all seven days marks nothing out, so the legend
// and the dimming both stay off in that case.
const marksSubset = computed(() => {
  const days = props.occurrenceWeekdays
  return Array.isArray(days) && days.length < 7
})

function isOccurrence(iso) {
  if (!marksSubset.value) return true
  const key = WEEKDAY_KEYS[fromIso(iso).getDay()]
  return props.occurrenceWeekdays.some((day) => String(day).toLowerCase() === key)
}

const occurrenceCount = computed(() => {
  if (!isComplete.value) return 0
  let count = 0
  const cursor = fromIso(props.modelValue.from)
  const end = fromIso(props.modelValue.to)
  while (cursor <= end) {
    if (isOccurrence(toIso(cursor))) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
})

const spanCount = computed(() => {
  if (!isComplete.value) return 0
  const ms = fromIso(props.modelValue.to) - fromIso(props.modelValue.from)
  return Math.round(ms / 86400000) + 1
})

const countLabel = computed(() => {
  if (!isComplete.value) return hasStart.value ? 'Pick an end date' : 'None selected'
  if (!marksSubset.value) return `${spanCount.value} selected`
  return `${occurrenceCount.value} of ${spanCount.value} days`
})

const hintText = computed(() => {
  if (hasStart.value && !isComplete.value) return 'Now pick the end date'
  if (marksSubset.value) return 'Click a day to start a new range'
  if (Array.isArray(props.occurrenceWeekdays) && props.occurrenceWeekdays.length === 0) {
    return 'Pick a template first to see which days get a shift'
  }
  return 'Click a day to start a new range'
})

const summaryClasses = computed(() => ({
  'rc__summary--empty': !hasStart.value,
  'rc__summary--partial': hasStart.value && !isComplete.value,
}))

// ─── Month panes ────────────────────────────────────────────────────────────
function normalize(year, month) {
  return { year: year + Math.floor(month / 12), month: ((month % 12) + 12) % 12 }
}

// Anchored on the current month, the common starting point; the ‹ arrow pages
// back from there into past months.
const anchor = ref(normalize(now.getFullYear(), now.getMonth()))

// A recurring template can carry a start date months in the past; clamp to the
// earliest selectable month so the view never lands on an all-disabled grid.
function anchorOnStart(iso) {
  if (!iso) return
  const clamped = minIso.value !== null && iso < minIso.value ? minIso.value : iso
  const date = fromIso(clamped)
  anchor.value = normalize(date.getFullYear(), date.getMonth())
}

function buildCells(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate() // day 0 of next month
  const leadingBlanks = new Date(year, month, 1).getDay()
  const cells = Array.from({ length: leadingBlanks }, () => null)

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`
    cells.push({ day, iso, disabled: minIso.value !== null && iso < minIso.value })
  }
  return cells
}

const panes = computed(() =>
  Array.from({ length: 2 }, (unused, offset) => {
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

// Don't page back into months that are entirely unselectable
const atEarliestMonth = computed(() => {
  if (minIso.value === null) return false
  return `${anchor.value.year}-${pad(anchor.value.month + 1)}` <= minIso.value.slice(0, 7)
})

function shiftMonths(delta) {
  if (delta < 0 && atEarliestMonth.value) return
  anchor.value = normalize(anchor.value.year, anchor.value.month + delta)
}

// A parent may fill the range in for us — a recurring template carries its own
// start and end dates — so follow it rather than stranding the view on today.
watch(
  () => props.modelValue?.from,
  (from) => {
    if (!from) return
    const date = fromIso(from)
    const paneMonths = panes.value.map((pane) => pane.key)
    if (!paneMonths.includes(`${date.getFullYear()}-${date.getMonth()}`)) anchorOnStart(from)
  },
  { immediate: true },
)

// ─── Cell state ─────────────────────────────────────────────────────────────
// The continuous highlight bar lives on the slot, not the button, so adjacent
// days butt together with no seam.
function slotClasses(cell) {
  const { from, to } = effectiveRange.value
  if (!from || !to || cell.iso < from || cell.iso > to) return null
  return {
    'rc__slot--range': true,
    'rc__slot--start': cell.iso === from,
    'rc__slot--end': cell.iso === to,
    'rc__slot--preview': !props.modelValue.to,
  }
}

function dayClasses(cell) {
  const { from, to } = effectiveRange.value
  const inRange = Boolean(from && to && cell.iso >= from && cell.iso <= to)
  const isEdge = cell.iso === from || (Boolean(to) && cell.iso === to)
  const occurs = inRange && isOccurrence(cell.iso)

  return {
    'rc__day--occurrence': occurs,
    // An edge that isn't an occurrence still has to read as the boundary, so it
    // gets an outline instead of the fill.
    'rc__day--edge-only': isEdge && !occurs,
    'rc__day--skipped': inRange && !occurs,
    'rc__day--today': cell.iso === today,
    'rc__day--disabled': cell.disabled,
  }
}
</script>

<style scoped>
.rc {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rc__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* The same weight and colour as a field label. It sits in a column of them —
   "Schedule type", "Select employees", then this — and at 13px/600 in full ink
   it read as a heading over the fields above it rather than as the label for
   the calendar under it. */
.rc__title {
  font-size: 12px;
  font-weight: 500;
  color: var(--dash-ink-2, #475467);
}

.rc__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rc__clear {
  padding: 0;
  border: none;
  background: none;
  color: var(--dash-ink-3, #667085);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.rc__clear:hover {
  color: var(--dash-ink, #101828);
}

.rc__count {
  padding: 2px 9px;
  border: 1px solid var(--dash-line, #eaecf0);
  border-radius: 999px;
  background: var(--dash-sunken, #f9fafb);
  color: var(--dash-ink-3, #667085);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.rc__count--on {
  border-color: var(--dash-info-line, #c7d2fe);
  background: var(--dash-accent-bg, #eef2ff);
  color: var(--dash-accent, #2e4fd4);
}

/* ── Calendar ─────────────────────────────────────────────────────────────── */
.rc__cal {
  border: 1px solid var(--dash-line, #eaecf0);
  border-radius: 12px;
  padding: 12px 12px 6px;
  background: var(--dash-surface, #fff);
}

.rc__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.rc__labels {
  display: flex;
  flex: 1;
  min-width: 0;
}

.rc__label {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink, #101828);
  letter-spacing: 0.1px;
}

.rc__nav {
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

.rc__nav:hover:not(:disabled) {
  background: var(--dash-hover, #f9fafb);
  color: var(--dash-ink, #101828);
}

.rc__nav:disabled {
  opacity: 0.35;
  cursor: default;
}

.rc__panes {
  display: flex;
  gap: 16px;
}

.rc__pane {
  flex: 1;
  min-width: 0;
}

.rc__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  /* No column gap: the range highlight has to run unbroken across a week. */
  row-gap: 2px;
}

.rc__weekday {
  padding: 6px 0 4px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--dash-ink-4, #98a2b3);
}

.rc__slot {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* The continuous bar behind an in-range week */
.rc__slot--range::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--dash-accent-bg, #eef2ff);
}

.rc__slot--start::before {
  left: 2px;
  border-radius: 999px 0 0 999px;
}

.rc__slot--end::before {
  right: 2px;
  border-radius: 0 999px 999px 0;
}

.rc__slot--start.rc__slot--end::before {
  border-radius: 999px;
}

/* Softer while the end date is only a hover preview */
.rc__slot--preview::before {
  opacity: 0.55;
}

.rc__day {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 32px;
  aspect-ratio: 1;
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

.rc__day:hover:not(:disabled):not(.rc__day--occurrence) {
  background: var(--dash-n-200, #eaecf0);
}

.rc__day--occurrence,
.rc__day--occurrence:hover {
  background: var(--dash-accent, #2e4fd4);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(46, 79, 212, 0.35);
}

/* Range boundary that the weekday pattern skips */
.rc__day--edge-only {
  box-shadow: inset 0 0 0 1.5px var(--dash-accent, #2e4fd4);
  color: var(--dash-accent, #2e4fd4);
  font-weight: 700;
}

/* In the span, but no shift lands here */
.rc__day--skipped:not(.rc__day--edge-only) {
  color: var(--dash-ink-4, #98a2b3);
}

/* Ring rather than fill, so it never competes with a selected day */
.rc__day--today:not(.rc__day--occurrence):not(.rc__day--edge-only) {
  box-shadow: inset 0 0 0 1.5px var(--dash-line-strong, #d0d5dd);
  font-weight: 700;
}

.rc__day--disabled,
.rc__day--disabled:hover {
  color: var(--dash-ink-4, #98a2b3);
  background: transparent;
  cursor: default;
}

.rc__hint {
  margin: 8px 0 4px;
  text-align: center;
  font-size: 11.5px;
  color: var(--dash-ink-3, #667085);
}

/* ── Summary ──────────────────────────────────────────────────────────────── */
.rc__summary {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border: 1px solid var(--dash-info-line, #c7d2fe);
  border-radius: 10px;
  background: var(--dash-accent-bg, #eef2ff);
  color: var(--dash-accent, #2e4fd4);
  font-size: 13px;
}

.rc__summary--empty {
  border-color: var(--dash-critical-line, #fecdca);
  background: var(--dash-critical-bg, #fef3f2);
  color: var(--dash-critical, #b42318);
}

.rc__summary--partial {
  border-color: var(--dash-warn-line, #fedf89);
  background: var(--dash-warn-bg, #fffaeb);
  color: var(--dash-warn, #b54708);
}

.rc__summary-text {
  min-width: 0;
}

.rc__summary-count {
  margin-left: auto;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.rc__legend {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 11.5px;
  color: var(--dash-ink-3, #667085);
}

.rc__legend-swatch {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 999px;
  background: var(--dash-accent, #2e4fd4);
}

@media (max-width: 768px) {
  .rc__panes {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
