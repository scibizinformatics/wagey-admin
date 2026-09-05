<template>
  <div class="man-toolbar">
    <!-- The day being viewed leads the toolbar: on a manning board it is the
         primary control, not a filter. Same stepper as Attendance, so the two
         day-scoped pages are navigated the same way. -->
    <div class="daynav">
      <q-btn
        flat
        dense
        round
        size="11px"
        icon="chevron_left"
        class="daynav__btn"
        aria-label="Previous day"
        @click="emit('prev-day')"
      />
      <q-input
        :model-value="date"
        type="date"
        dense
        outlined
        hide-bottom-space
        class="daynav__field dash-field"
        aria-label="Date"
        @update:model-value="onDateInput"
      />
      <q-btn
        flat
        dense
        round
        size="11px"
        icon="chevron_right"
        class="daynav__btn"
        aria-label="Next day"
        @click="emit('next-day')"
      />
      <!-- Both directions stay open: checking tomorrow's coverage before the
           day starts is as much the point of this board as reviewing
           yesterday's. The badge marks today; the jump button appears only once
           you have navigated off it. -->
      <span v-if="isToday" class="daynav__badge">Today</span>
      <q-btn
        v-else
        flat
        dense
        round
        size="11px"
        icon="o_today"
        class="daynav__btn daynav__jump"
        aria-label="Go to today"
        @click="emit('go-today')"
      >
        <q-tooltip>Go to today</q-tooltip>
      </q-btn>
    </div>

    <q-input
      ref="searchRef"
      :model-value="search"
      placeholder="Search site or position"
      dense
      outlined
      clearable
      hide-bottom-space
      debounce="200"
      class="man-search dash-field"
      @update:model-value="(value) => emit('update:search', value ?? '')"
    >
      <template v-slot:prepend>
        <q-icon name="search" size="18px" />
      </template>
    </q-input>

    <q-select
      v-if="siteOptions.length > 1"
      :model-value="site"
      :options="siteSelectOptions"
      emit-value
      map-options
      dense
      outlined
      hide-bottom-space
      :popup-content-class="'man-popup'"
      class="man-filter dash-field"
      aria-label="Filter by site"
      @update:model-value="(value) => emit('update:site', value)"
    >
      <template v-slot:prepend>
        <q-icon name="o_store" size="16px" />
      </template>
    </q-select>

    <!-- A board of green rows is the normal case, and the reason to open the
         page is usually the handful that are not. This is the shortcut to them,
         rather than a filter buried in a menu. -->
    <q-btn
      outline
      no-caps
      dense
      size="12px"
      icon="o_report_problem"
      :label="attentionLabel"
      class="man-gaps-btn"
      :class="{ 'man-gaps-btn--on': onlyGaps }"
      :disable="!attentionCount && !onlyGaps"
      @click="emit('update:onlyGaps', !onlyGaps)"
    >
      <q-tooltip>
        {{
          onlyGaps
            ? 'Showing only positions that are short, AWOL or not timed in'
            : 'Show only positions that are short, AWOL or not timed in'
        }}
      </q-tooltip>
    </q-btn>

    <span class="man-toolbar__count">
      {{ count }} {{ count === 1 ? 'position' : 'positions' }}
    </span>

    <q-btn
      flat
      dense
      round
      size="sm"
      icon="refresh"
      :loading="loading"
      class="man-refresh"
      aria-label="Refresh"
      @click="emit('refresh')"
    >
      <q-tooltip>Refresh</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup>
/**
 * Manning board toolbar: which day, and which slice of it.
 *
 * Everything here is state the page owns — the toolbar reads props and emits —
 * so the day the fetch uses and the day the stepper shows cannot drift apart.
 */
import { computed, ref } from 'vue'

const props = defineProps({
  date: { type: String, default: '' },
  today: { type: String, default: '' },
  search: { type: String, default: '' },
  site: { type: String, default: null },
  siteOptions: { type: Array, default: () => [] },
  onlyGaps: { type: Boolean, default: false },
  /** How many positions are on screen after filtering. */
  count: { type: Number, default: 0 },
  /** How many need a person, before filtering — the count on the button. */
  attentionCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:date',
  'update:search',
  'update:site',
  'update:onlyGaps',
  'prev-day',
  'next-day',
  'go-today',
  'refresh',
])

const isToday = computed(() => Boolean(props.date) && props.date === props.today)

const attentionLabel = computed(() =>
  props.attentionCount ? `Needs attention (${props.attentionCount})` : 'Needs attention',
)

// Carries an explicit "all" row so clearing the filter is a choice in the list
// rather than only a clear button.
const siteSelectOptions = computed(() => [
  { label: 'All sites', value: null },
  ...props.siteOptions.map((name) => ({ label: name, value: name })),
])

// The page owns the "/" shortcut every list page in this app has, but the input
// it focuses lives here.
const searchRef = ref(null)
defineExpose({ focusSearch: () => searchRef.value?.focus() })

function onDateInput(value) {
  // A cleared field would otherwise fetch a day the board cannot show. The
  // native date input also emits mid-typing, so an incomplete value is dropped
  // rather than sent.
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return
  emit('update:date', value)
}
</script>

<style scoped>
.man-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

/* ── Day navigation ── */
.daynav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding: 2px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
  box-shadow: var(--dash-shadow-xs);
}

.daynav__btn {
  color: var(--dash-ink-3);
}
.daynav__btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

.daynav__field {
  width: 138px;
}
.daynav__field :deep(.q-field__control) {
  height: 30px;
  min-height: 30px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.daynav__field :deep(.q-field__control:before),
.daynav__field :deep(.q-field__control:after) {
  border: none;
}
.daynav__field :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  padding: 0;
  min-height: 30px;
}

/* A state marker, not a control — it says "you are on today". */
.daynav__badge {
  margin: 0 2px;
  padding: 2px 8px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-accent-bg);
  border: 1px solid var(--dash-info-line);
  color: var(--dash-accent);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.daynav__jump {
  color: var(--dash-accent);
}
.daynav__jump:hover {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
}

/* ── Filters ── */
.man-search {
  flex: 1 1 180px;
  min-width: 0;
  max-width: 260px;
}
.man-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.man-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.man-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.man-filter {
  width: 170px;
  flex-shrink: 0;
}
.man-filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  padding: 0 8px 0 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.man-filter :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  padding: 0;
  min-height: 34px;
}
.man-filter :deep(.q-field__marginal) {
  height: 34px;
  min-width: 0;
  padding: 0;
  color: var(--dash-ink-4);
}
.man-filter :deep(.q-field__prepend) {
  padding-right: 7px;
}

.man-gaps-btn {
  height: 34px;
  padding: 0 11px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-2);
  font-weight: 500;
  flex-shrink: 0;
}
.man-gaps-btn :deep(.q-btn__content) {
  gap: 6px;
}
/* Active state is the warn tone, because that is what the filter selects for —
   a neutral "on" pill would say the filter is enabled without saying what it
   narrowed the board to. */
.man-gaps-btn--on {
  background: var(--dash-warn-bg);
  color: var(--dash-warn);
}
.man-gaps-btn--on :deep(.q-btn__content) {
  color: var(--dash-warn);
}

/* ── Meta ── */
.man-toolbar__count {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.man-refresh {
  color: var(--dash-ink-3);
  flex-shrink: 0;
}
.man-refresh:hover {
  color: var(--dash-ink);
}

@media (max-width: 1023px) {
  .man-toolbar {
    padding: 10px 14px;
  }
  .daynav {
    width: 100%;
    justify-content: center;
  }
  .daynav__field {
    flex: 1;
    width: auto;
  }
  .man-search,
  .man-filter {
    flex: 1 1 150px;
    width: auto;
    max-width: none;
  }
  .man-toolbar__count {
    margin-left: 0;
  }
}

@media (max-width: 640px) {
  .man-search,
  .man-filter,
  .man-gaps-btn {
    flex: 1 1 100%;
    width: auto;
  }
}
</style>

<style>
/* Select popups teleport to the body, so this cannot be scoped. */
.man-popup {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  padding: 4px;
}
.man-popup .q-item {
  min-height: 32px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.man-popup .q-item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.man-popup .q-item--active {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}
</style>
