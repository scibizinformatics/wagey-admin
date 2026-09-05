<template>
  <div class="aud-toolbar">
    <q-input
      ref="searchRef"
      :model-value="search"
      placeholder="Search employee, editor or shift"
      dense
      outlined
      clearable
      hide-bottom-space
      debounce="200"
      class="aud-search dash-field"
      @update:model-value="(value) => emit('update:search', value ?? '')"
    >
      <template v-slot:prepend>
        <q-icon name="search" size="18px" />
      </template>
    </q-input>

    <q-select
      :model-value="kind"
      :options="CHANGE_FILTERS"
      emit-value
      map-options
      dense
      outlined
      hide-bottom-space
      class="aud-filter dash-field"
      aria-label="Filter by kind of change"
      @update:model-value="(value) => emit('update:kind', value)"
    >
      <template v-slot:prepend>
        <q-icon name="o_filter_alt" size="16px" />
      </template>
    </q-select>

    <!-- Shift date span.
         A calendar the reader drags across, not a pair of typed date fields:
         picking "the week the roster kept moving" is a shape you recognise on a
         month grid and have to reconstruct from two ISO strings. The presets
         cover the spans people actually ask for, so the calendar is for the
         one time they want something else. -->
    <q-btn
      outline
      no-caps
      dense
      size="12px"
      icon="o_event"
      :label="rangeLabel"
      class="aud-range-btn"
      :class="{ 'aud-range-btn--on': hasRange }"
    >
      <!-- The explanation lives inside the menu rather than in a tooltip on the
           button: a tooltip anchored under the button would sit on top of the
           menu the same click opens. -->
      <q-menu anchor="bottom left" self="top left" class="aud-range-menu">
        <div class="aud-range">
          <p class="aud-range__title">Date of the shift that changed</p>
          <div class="aud-range__presets">
            <button
              v-for="preset in PRESETS"
              :key="preset.key"
              type="button"
              class="aud-range__preset"
              :class="{ 'aud-range__preset--on': activePreset === preset.key }"
              @click="applyPreset(preset)"
            >
              {{ preset.label }}
            </button>
          </div>

          <q-date
            :model-value="calendarModel"
            range
            minimal
            mask="YYYY-MM-DD"
            class="aud-range__cal"
            @update:model-value="onCalendar"
          />

          <div class="aud-range__foot">
            <span class="aud-range__read">{{ rangeReadout }}</span>
            <q-btn
              flat
              dense
              no-caps
              size="12px"
              label="Clear"
              class="aud-range__clear"
              :disable="!hasRange"
              @click="clearRange"
            />
          </div>
        </div>
      </q-menu>
    </q-btn>

    <q-select
      :model-value="sort"
      :options="SORT_OPTIONS"
      emit-value
      map-options
      dense
      outlined
      hide-bottom-space
      class="aud-filter aud-filter--sort dash-field"
      aria-label="Sort changes"
      @update:model-value="(value) => emit('update:sort', value)"
    >
      <template v-slot:prepend>
        <q-icon name="o_swap_vert" size="16px" />
      </template>
    </q-select>

    <span class="aud-toolbar__count dash-num">
      {{ count.toLocaleString() }} {{ count === 1 ? 'change' : 'changes' }}
    </span>

    <q-btn
      flat
      dense
      round
      size="sm"
      icon="refresh"
      :loading="loading"
      class="aud-refresh"
      aria-label="Refresh"
      @click="emit('refresh')"
    >
      <q-tooltip>Refresh</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup>
/**
 * Audit trail toolbar: which changes, over which shift dates, in what order.
 *
 * Every control here narrows or reorders the *whole* trail the page holds, not
 * the page slice on screen — the page applies them before it cuts a page out,
 * so "Oldest first" means the oldest change there is and not the oldest of the
 * fifty currently rendered.
 *
 * The date span filters on `shift_date`, the day whose roster changed, and says
 * so on the control. It deliberately does not filter on `updated_at`: that
 * stamp arrives pre-formatted in the server's timezone and is only ever parsed
 * well enough to sort by, which is not a good enough basis for including or
 * excluding a row.
 */
import { computed, ref } from 'vue'
import { CHANGE_FILTERS, SORT_OPTIONS } from 'src/composables/utils/assignmentHistory'
import { longLabel, shiftIso, todayIso } from 'src/composables/utils/calendarDate'

const props = defineProps({
  search: { type: String, default: '' },
  kind: { type: String, default: 'all' },
  sort: { type: String, default: 'newest' },
  /** `{ from, to }` as ISO days, either side null for "open". */
  range: { type: Object, default: () => ({ from: null, to: null }) },
  count: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:search', 'update:kind', 'update:sort', 'update:range', 'refresh'])

const searchRef = ref(null)

// Exposed so the page's "/" shortcut can put the cursor here, matching the
// other list pages.
defineExpose({
  focusSearch: () => searchRef.value?.focus(),
})

// ─── Presets ──────────────────────────────────────────────────────────────────
// `todayIso()` is called inside each preset rather than captured once: this
// toolbar can outlive a local midnight on a tab left open, and a stale "today"
// would quietly shift every span by a day.
const PRESETS = [
  { key: 'all', label: 'All dates', span: () => ({ from: null, to: null }) },
  {
    key: '7',
    label: 'Last 7 days',
    span: () => ({ from: shiftIso(todayIso(), -6), to: todayIso() }),
  },
  {
    key: '30',
    label: 'Last 30 days',
    span: () => ({ from: shiftIso(todayIso(), -29), to: todayIso() }),
  },
  {
    key: 'ahead',
    // Roster edits land ahead of the day they affect, and "what has been moved
    // on next week" is the question this page gets asked before a week starts.
    label: 'Next 14 days',
    span: () => ({ from: todayIso(), to: shiftIso(todayIso(), 14) }),
  },
]

const hasRange = computed(() => Boolean(props.range?.from || props.range?.to))

/** Which preset, if any, the current span is exactly. */
const activePreset = computed(() => {
  const { from = null, to = null } = props.range || {}
  const match = PRESETS.find((preset) => {
    const span = preset.span()
    return (span.from || null) === (from || null) && (span.to || null) === (to || null)
  })
  return match?.key ?? null
})

function applyPreset(preset) {
  emit('update:range', preset.span())
}

function clearRange() {
  emit('update:range', { from: null, to: null })
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
/**
 * QDate wants `{ from, to }` for a span and a bare string for a single day, and
 * hands back whichever the reader produced. A half-open span has no QDate
 * representation, so it shows as the day that is set.
 */
const calendarModel = computed(() => {
  const { from, to } = props.range || {}
  if (from && to) return from === to ? from : { from, to }
  return from || to || null
})

function onCalendar(value) {
  if (!value) {
    clearRange()
    return
  }
  if (typeof value === 'string') {
    // A single click is a one-day span rather than an open-ended one, which is
    // what a reader clicking one square means.
    emit('update:range', { from: value, to: value })
    return
  }
  emit('update:range', { from: value.from || null, to: value.to || null })
}

// ─── Labels ───────────────────────────────────────────────────────────────────
const rangeLabel = computed(() => {
  const { from, to } = props.range || {}
  if (!from && !to) return 'All dates'
  const preset = PRESETS.find((p) => p.key === activePreset.value)
  if (preset && preset.key !== 'all') return preset.label
  if (from && to) return from === to ? longLabel(from) : `${longLabel(from)} – ${longLabel(to)}`
  return from ? `From ${longLabel(from)}` : `Until ${longLabel(to)}`
})

const rangeReadout = computed(() => {
  const { from, to } = props.range || {}
  if (!from && !to) return 'Every shift date'
  if (from && to) return from === to ? longLabel(from) : `${longLabel(from)} – ${longLabel(to)}`
  return from ? `${longLabel(from)} onwards` : `Up to ${longLabel(to)}`
})
</script>

<style scoped>
.aud-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

/* ── Search ── */
.aud-search {
  flex: 1 1 200px;
  min-width: 0;
  max-width: 300px;
}
.aud-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.aud-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.aud-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

/* ── Selects ── */
.aud-filter {
  width: 165px;
  flex-shrink: 0;
}
.aud-filter--sort {
  width: 158px;
}
.aud-filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.aud-filter :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink);
  min-height: 34px;
  padding: 0;
}
.aud-filter :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

/* ── Date span ── */
.aud-range-btn {
  height: 34px;
  flex-shrink: 0;
  padding: 0 11px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-2);
  font-weight: 500;
}
.aud-range-btn :deep(.q-btn__content) {
  gap: 6px;
}
/* A set filter is marked by a tinted face, not by a saturated outline — the
   control sits in a row of neutral chrome and a hard ring would shout across
   it. */
.aud-range-btn--on {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
}

.aud-range {
  padding: 10px;
  min-width: 264px;
}

.aud-range__title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dash-ink-4);
}

.aud-range__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.aud-range__preset {
  padding: 4px 10px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-pill);
  background: var(--dash-surface);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    border-color var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.aud-range__preset:hover {
  background: var(--dash-n-50);
  border-color: var(--dash-line-strong);
}
.aud-range__preset--on {
  background: var(--dash-accent-bg);
  border-color: var(--dash-info-line);
  color: var(--dash-accent);
}

.aud-range__cal {
  box-shadow: none;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
}

.aud-range__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}

.aud-range__read {
  font-size: 11.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
}

.aud-range__clear {
  color: var(--dash-ink-3);
}

/* ── Count + refresh ── */
.aud-toolbar__count {
  margin-left: auto;
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.aud-refresh {
  color: var(--dash-ink-3);
  flex-shrink: 0;
}
.aud-refresh:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

@media (max-width: 1023px) {
  .aud-toolbar {
    padding: 10px 12px;
  }
  .aud-search {
    max-width: none;
  }
  /* The count stops claiming the row's spare space once the controls wrap;
     pinned right on its own line it reads as a stray figure. */
  .aud-toolbar__count {
    margin-left: 0;
  }
}
</style>
