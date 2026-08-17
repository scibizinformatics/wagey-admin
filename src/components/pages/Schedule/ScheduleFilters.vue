<template>
  <div class="sched-toolbar">
    <!-- Week navigation leads: on a scheduler, which week you are looking at is
         the primary control, not a filter tucked to one side. -->
    <div class="weeknav">
      <q-btn
        flat
        dense
        round
        size="11px"
        icon="chevron_left"
        class="weeknav__btn"
        aria-label="Previous week"
        @click="$emit('prev-week')"
      />
      <!-- No year here: the page header already reads "Week of August 11 – 17,
           2026", so repeating it in the stepper said it twice. -->
      <span class="weeknav__range">{{ rangeLabel }}</span>

      <q-btn
        flat
        dense
        round
        size="11px"
        icon="chevron_right"
        class="weeknav__btn"
        aria-label="Next week"
        @click="$emit('next-week')"
      />

      <!-- "This week" marks the week you are actually on. It used to be a
           jump-back button shown on every *other* week, which made it read as a
           label asserting that the week on screen was the current one. Returning
           to today is now the calendar button, which only appears when you have
           navigated away. -->
      <span v-if="isCurrentWeek" class="weeknav__badge">This week</span>
      <q-btn
        v-else
        flat
        dense
        round
        size="11px"
        icon="o_today"
        class="weeknav__btn weeknav__jump"
        aria-label="Go to this week"
        @click="$emit('this-week')"
      >
        <q-tooltip>Go to this week</q-tooltip>
      </q-btn>
    </div>

    <div class="sched-toolbar__filters">
      <q-input
        :model-value="search"
        placeholder="Search employees"
        dense
        outlined
        clearable
        hide-bottom-space
        debounce="300"
        class="sched-search dash-field"
        @update:model-value="(v) => $emit('update:search', v ?? '')"
      >
        <template #prepend>
          <q-icon name="search" size="17px" />
        </template>
      </q-input>

      <!-- Payout group, not site. The employee dropdown that used to sit beside
           it is gone: the search box does the same job faster, and a select of
           every employee duplicated it. -->
      <q-select
        :model-value="filters.payrollGroup"
        :options="groupSelectOptions"
        emit-value
        map-options
        dense
        outlined
        hide-bottom-space
        :popup-content-class="'sched-popup'"
        class="sched-filter sched-filter--wide dash-field"
        aria-label="Filter by payout group"
        @update:model-value="updateFilter('payrollGroup', $event)"
      >
        <template #prepend>
          <q-icon name="o_groups" size="16px" />
        </template>
      </q-select>
    </div>

    <div class="sched-toolbar__meta">
      <span class="sched-toolbar__tz">
        <q-icon name="o_public" size="13px" />
        {{ timezone }}
      </span>
    </div>
  </div>
</template>

<script setup>
/**
 * Scheduler toolbar: which week, and which slice of it.
 *
 * Replaces a "Schedule Overview" heading with two floating label selects and a
 * week stepper pushed to the right. Props and the filter/prev/next emits are
 * unchanged; `update:search` and `this-week` are new.
 */
import { computed } from 'vue'
import { isSameDate } from '@/composables/utils/schedule'

const props = defineProps({
  filters: { type: Object, default: () => ({ payrollGroup: null }) },
  payrollGroupOptions: { type: Array, default: () => [] },
  selectedWeek: { type: Object, default: () => ({ start: new Date(), end: new Date() }) },
  search: { type: String, default: '' },
  timezone: { type: String, default: '' },
})

const emit = defineEmits([
  'update:filters',
  'update:search',
  'prev-week',
  'next-week',
  'this-week',
])

// "Mar 3 – 9" when a week sits inside one month, "Mar 31 – Apr 6" when it
// straddles two. Repeating the month on both ends reads as clutter.
const rangeLabel = computed(() => {
  const { start, end } = props.selectedWeek
  const sameMonth = start.getMonth() === end.getMonth()
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString(
    'en-US',
    sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' },
  )
  return `${startStr} – ${endStr}`
})

function mondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

const isCurrentWeek = computed(() =>
  isSameDate(mondayOf(props.selectedWeek.start), mondayOf(new Date())),
)

// Carries an explicit "all" row so clearing the filter is a choice in the list
// rather than only a clear button.
const groupSelectOptions = computed(() => {
  const provided = props.payrollGroupOptions ?? []
  const hasAll = provided.some((o) => o.value === null)
  return hasAll ? provided : [{ label: 'All payout groups', value: null }, ...provided]
})

function updateFilter(key, value) {
  emit('update:filters', { ...props.filters, [key]: value })
}
</script>

<style scoped>
.sched-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

/* ── Week navigation ── */
.weeknav {
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

.weeknav__btn {
  color: var(--dash-ink-3);
}
.weeknav__btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

/* One line now that the year is gone. The min-width keeps the stepper from
   twitching as the range text changes length between weeks. */
.weeknav__range {
  min-width: 104px;
  padding: 0 6px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dash-ink);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* A state marker, not a control — it says "you are on the current week". */
.weeknav__badge {
  margin-left: 2px;
  padding: 2px 8px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-accent-bg);
  border: 1px solid var(--dash-info-line);
  color: var(--dash-accent);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.weeknav__jump {
  margin-left: 2px;
  color: var(--dash-accent);
}
.weeknav__jump:hover {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
}

/* ── Filters ── */
.sched-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.sched-search {
  flex: 1 1 170px;
  min-width: 0;
  max-width: 250px;
}
.sched-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.sched-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.sched-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.sched-filter {
  width: 150px;
  flex-shrink: 0;
}
.sched-filter--wide {
  width: 172px;
}
.sched-filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  padding: 0 8px 0 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.sched-filter :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  padding: 0;
  min-height: 34px;
}
.sched-filter :deep(.q-field__marginal) {
  height: 34px;
  min-width: 0;
  padding: 0;
  color: var(--dash-ink-4);
}
.sched-filter :deep(.q-field__prepend) {
  padding-right: 7px;
}

/* ── Meta ── */
.sched-toolbar__meta {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.sched-toolbar__tz {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

@media (max-width: 1279px) {
  .sched-toolbar__meta {
    display: none;
  }
}

@media (max-width: 1023px) {
  .sched-toolbar {
    padding: 10px 14px;
  }
  .weeknav {
    width: 100%;
    justify-content: center;
  }
  .weeknav__range {
    flex: 1;
  }
  .sched-toolbar__filters {
    width: 100%;
  }
  .sched-search,
  .sched-filter,
  .sched-filter--wide {
    flex: 1 1 140px;
    width: auto;
    max-width: none;
  }
}

@media (max-width: 640px) {
  .sched-search,
  .sched-filter,
  .sched-filter--wide {
    flex: 1 1 100%;
  }
}
</style>

<style>
/* Select popups teleport to the body. */
.sched-popup {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  padding: 4px;
}
.sched-popup .q-item {
  min-height: 32px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.sched-popup .q-item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.sched-popup .q-item--active {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}
</style>
