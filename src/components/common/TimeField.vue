<template>
  <!--
    One value, two dropdowns: an hour select and a minute select, with a colon
    between them.

    They are two *separate* outlined `q-select`s rather than two borderless ones
    inside a shared `q-field` on purpose. The shared-field version nested a
    control inside another control's control slot, and the two fought over focus
    and over the popup — the minute half in particular stopped behaving like a
    control you could open and pick from. Two independent selects are two
    independent dropdowns, and that is the whole requirement.

    `use-input` + `fill-input` on each keeps them editable as well as pickable:
    type `9` and the hour reads `09`, type `47` and the minute reads `47` — on
    Enter, on Tab, or on click-away. `new-value-mode` is what lets a typed value
    be committed at all.
  -->
  <div class="row items-center no-wrap">
    <q-select
      :model-value="hour"
      :options="filteredHourOptions"
      :rules="allRules"
      :error="!!inputError"
      class="col q-mb-none dash-field"
      input-class="text-center"
      aria-label="Hour"
      outlined
      dense
      hide-bottom-space
      use-input
      fill-input
      hide-selected
      new-value-mode="add-unique"
      input-debounce="0"
      :disable="disable"
      @filter="onHourFilter"
      @input-value="onHourInput"
      @new-value="onHourNewValue"
      @keydown="onKeydown"
      @blur="onHourBlur"
      @update:model-value="commitHour"
    >
      <template v-if="prependIcon" v-slot:prepend>
        <q-icon :name="prependIcon" size="xs" />
      </template>
    </q-select>

    <span class="q-px-sm text-h6" aria-hidden="true">:</span>

    <q-select
      :model-value="minute"
      :options="filteredMinuteOptions"
      :error="!!inputError"
      :error-message="inputError"
      class="col q-mb-none dash-field"
      input-class="text-center"
      aria-label="Minute"
      outlined
      dense
      hide-bottom-space
      use-input
      fill-input
      hide-selected
      new-value-mode="add-unique"
      input-debounce="0"
      :disable="disable"
      @filter="onMinuteFilter"
      @input-value="onMinuteInput"
      @new-value="onMinuteNewValue"
      @keydown="onKeydown"
      @blur="onMinuteBlur"
      @update:model-value="commitMinute"
    />
  </div>
</template>

<script setup>
/**
 * `modelValue` is always canonical 24h `HH:mm` (or `''`). Neither half ever holds
 * anything else: each option is already a zero-padded `HH` / `MM`, and every
 * typed value goes through the same normalizer before it is committed, so there
 * is no 12h spelling anywhere in this component and nothing can be reinterpreted
 * by passing through it.
 *
 * Setting one half commits both: `09` with an empty minute is `09:00`, not a
 * half-finished model the caller would have to interpret. The empty-half default
 * is `00` because `HH:mm` is the contract — `07:00` is a time the admin can see
 * and correct, where `07:` is a string nothing downstream can read.
 *
 * Rejected input never reaches the model. `9` and `47` commit as `09` and `47`;
 * `25` as an hour, `75` as a minute, or a letter commits nothing and shows
 * `Use 24-hour format (HH:mm)` instead.
 */
import { computed, ref } from 'vue'

const ERROR_MESSAGE = 'Use 24-hour format (HH:mm)'

const props = defineProps({
  /** Canonical 24h `HH:mm`, or `''` when unset. */
  modelValue: { type: String, default: '' },
  /** Field label, e.g. "Time In". */
  label: { type: String, default: '' },
  /** Extra Quasar rules, appended after the built-in format rule. */
  rules: { type: Array, default: () => [] },
  /** Optional glyph in front of the hour box, e.g. "login" / "logout". */
  prependIcon: { type: String, default: '' },
  /** Both boxes disabled together. */
  disable: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

/** Set when a typed half could not be read as a time. */
const inputError = ref('')

/** The text each box last reported, so a click-away can normalize it. */
const rawHour = ref('')
const rawMinute = ref('')

/** What is being typed, used to narrow each half's options. */
const hourFilter = ref('')
const minuteFilter = ref('')

function twoDigits(value) {
  return String(value).padStart(2, '0')
}

/** `00` … `23`. */
const hourOptions = Array.from({ length: 24 }, (_, hour) => twoDigits(hour))
/** `00` … `59` — every minute, so any minute is pickable as well as typeable. */
const minuteOptions = Array.from({ length: 60 }, (_, minute) => twoDigits(minute))

/**
 * The two halves of the model.
 *
 * Parsed rather than sliced at fixed offsets, so a caller handing over `9:05`
 * still shows `09` and `05` in two boxes rather than `9:` and `05`.
 */
const parts = computed(() => {
  const match = String(props.modelValue || '')
    .trim()
    .match(/^(\d{1,2}):(\d{1,2})/)
  if (!match) return { hour: '', minute: '' }
  return { hour: twoDigits(match[1]), minute: twoDigits(match[2]) }
})

const hour = computed(() => parts.value.hour)
const minute = computed(() => parts.value.minute)

/**
 * The options narrowed by what is being typed.
 *
 * `includes` as well as `startsWith`, because a numeric keypad types `9` for the
 * hour `09` and `4` for the minute `04` — neither is a prefix of the two-digit
 * value until the second digit lands, and dropping them mid-entry is what makes a
 * combo box feel broken.
 */
function narrow(options, needle) {
  const text = String(needle || '').trim()
  if (!text) return options
  return options.filter((option) => option.startsWith(text) || option.includes(text))
}

const filteredHourOptions = computed(() => narrow(hourOptions, hourFilter.value))
const filteredMinuteOptions = computed(() => narrow(minuteOptions, minuteFilter.value))

/**
 * One half of the time read back as a zero-padded two-digit string, or `null` when
 * it is not one. `9` -> `09`; `25` as an hour, `75` as a minute and anything
 * non-numeric are rejected rather than clamped, since a silently clamped `25`
 * would store a different time than the one that was typed.
 */
function normalizePart(raw, max) {
  if (raw == null) return null

  const text = String(raw).trim()
  if (!/^\d{1,2}$/.test(text)) return null

  const value = Number(text)
  if (value < 0 || value > max) return null

  return twoDigits(value)
}

/**
 * Run one caller-supplied rule against the whole `HH:mm` value.
 *
 * The rules are written against the time, not against one of its halves — a
 * `Required` rule means "no time at all", and a format rule means "a whole time".
 * The hour select is the one carrying them (so `QForm` gates the submit exactly
 * once), but each is handed the combined value rather than the `HH` it happens
 * to be attached to.
 */
function applyRule(rule, value) {
  const result = typeof rule === 'function' ? rule(value) : rule
  if (result === true || result == null) return true
  if (result === false) return ERROR_MESSAGE
  if (typeof result === 'string') return result
  if (typeof result === 'object' && result.message) return result.message
  return ERROR_MESSAGE
}

const allRules = computed(() => [
  () => !props.modelValue || /^\d{2}:\d{2}$/.test(props.modelValue) || ERROR_MESSAGE,
  ...props.rules.map((rule) => () => applyRule(rule, props.modelValue)),
])

function clearError() {
  inputError.value = ''
}

/**
 * Digits only, enforced at the keystroke.
 *
 * `use-input` takes any character, so without this the box happily holds `1a:3`
 * and the reader only learns it is wrong when the value is refused on commit.
 * Blocking the key means the field never holds anything but digits, which is what
 * each half can actually be.
 *
 * Shortcuts (Ctrl/Cmd/Alt) and the non-character keys — Backspace, Delete, Tab,
 * Enter, the arrows, Home/End — are passed through untouched; only a single
 * printable character that is not `0-9` is refused. `preventDefault` on
 * `keydown` is enough: `keypress` fires too late to stop the character.
 *
 * A paste slips past this, because pasted text arrives without keystrokes; the
 * normalizer still refuses it on commit rather than storing it.
 */
function onKeydown(event) {
  clearError()

  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.key.length !== 1) return

  if (!/[0-9]/.test(event.key)) event.preventDefault()
}

/** The two halves as one canonical value; an unset half is `00`. */
function combine(h, m) {
  return `${h || '00'}:${m || '00'}`
}

function commitHour(value) {
  const normalized = normalizePart(value, 23)
  if (normalized === null) {
    inputError.value = ERROR_MESSAGE
    return
  }
  clearError()
  emit('update:modelValue', combine(normalized, minute.value))
}

function commitMinute(value) {
  const normalized = normalizePart(value, 59)
  if (normalized === null) {
    inputError.value = ERROR_MESSAGE
    return
  }
  clearError()
  emit('update:modelValue', combine(hour.value, normalized))
}

function onHourInput(value) {
  rawHour.value = value == null ? '' : String(value)
}

function onMinuteInput(value) {
  rawMinute.value = value == null ? '' : String(value)
}

function onHourFilter(value, update) {
  update(() => {
    hourFilter.value = value || ''
  })
}

function onMinuteFilter(value, update) {
  update(() => {
    minuteFilter.value = value || ''
  })
}

/**
 * Enter / Space / Tab on a typed hour. `done()` is what commits it, so an
 * unreadable value never reaches the model — the box keeps what was typed and
 * shows the error rather than storing a time nobody asked for.
 */
function onHourNewValue(value, done) {
  const normalized = normalizePart(value, 23)
  if (normalized === null) {
    inputError.value = ERROR_MESSAGE
    return
  }
  clearError()
  done(normalized)
}

/** The minute equivalent of `onHourNewValue`. */
function onMinuteNewValue(value, done) {
  const normalized = normalizePart(value, 59)
  if (normalized === null) {
    inputError.value = ERROR_MESSAGE
    return
  }
  clearError()
  done(normalized)
}

/** Click-away commit for the hour, which `@new-value` never saw. */
function onHourBlur() {
  const raw = String(rawHour.value || '').trim()
  if (!raw || raw === hour.value) return
  commitHour(raw)
}

/** Click-away commit for the minute. */
function onMinuteBlur() {
  const raw = String(rawMinute.value || '').trim()
  if (!raw || raw === minute.value) return
  commitMinute(raw)
}
</script>
