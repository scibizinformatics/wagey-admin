<template>
  <div class="seg" role="tablist" aria-label="Contribution breakdown">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      class="seg__item dash-focusable"
      :class="{ 'seg__item--on': modelValue === tab.value }"
      :aria-selected="modelValue === tab.value"
      :aria-controls="panelId"
      @click="$emit('update:modelValue', tab.value)"
    >
      <q-icon :name="tab.icon" size="16px" class="seg__icon" />
      <span class="seg__label">{{ tab.label }}</span>
      <span v-if="counts[tab.value] != null" class="seg__count dash-num">
        {{ counts[tab.value] }}
      </span>
    </button>
  </div>
</template>

<script setup>
/**
 * The three views of the same period: the year month-by-month, the month
 * person-by-person, and the month department-by-department.
 *
 * Rendered as one segmented control on an inset track rather than as three
 * free-standing pills. The pills read as three independent filter chips —
 * nothing in their shape said "pick exactly one of these", and the selected one
 * inverted to solid navy, which made a view switch the loudest element on the
 * page. A segmented track shows the full set of choices and moves a light plate
 * between them, so selection is legible without shouting.
 *
 * Labels are sentence case and short ("Annual", "By employee") because the
 * panel they sit in already says what the numbers are.
 */
defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  /** Optional row count per tab, keyed by tab value. */
  counts: {
    type: Object,
    default: () => ({}),
  },
  /** id of the element the tabs drive, for aria-controls. */
  panelId: {
    type: String,
    default: undefined,
  },
})

defineEmits(['update:modelValue'])

// Ordered widest scope to narrowest: the year, then the month by department, then
// the month by person.
const tabs = [
  { label: 'Annual', value: 'annual', icon: 'o_calendar_month' },
  { label: 'By department', value: 'department', icon: 'o_apartment' },
  { label: 'By employee', value: 'employee', icon: 'o_person' },
]
</script>

<style scoped>
.seg {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: var(--dash-n-100);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  min-width: 0;
}

.seg__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  height: 30px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: var(--dash-r-sm);
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
}

.seg__item:hover:not(.seg__item--on) {
  color: var(--dash-ink-2);
  background: rgba(255, 255, 255, 0.6);
}

/* The active segment is a raised white plate, matching how a panel sits on the
   canvas — one level up from its surroundings, not a colour reversal. */
.seg__item--on {
  background: var(--dash-surface);
  border-color: var(--dash-line);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}

.seg__icon {
  color: var(--dash-ink-4);
  flex-shrink: 0;
  transition: color var(--dash-fast) var(--dash-ease);
}
.seg__item--on .seg__icon {
  color: var(--dash-accent);
}

.seg__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Row count for the loaded view — the number lives with the thing it counts
   instead of in a separate "N records" caption. */
.seg__count {
  padding: 0 5px;
  border-radius: var(--dash-r-xs);
  background: var(--dash-n-100);
  font-size: 11px;
  font-weight: 600;
  color: var(--dash-ink-3);
  line-height: 17px;
}
.seg__item--on .seg__count {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
}

/* ── Responsive ──────────────────────────────────────────────────────────────
   Tablet portrait and below: the control goes full width and the three
   segments share it equally, so it reads as a row of tabs rather than a floating
   cluster. Under 420px the labels give way to their icons; the counts go first,
   since the panel header still carries the total. */
@media (max-width: 1023px) {
  .seg {
    display: flex;
    width: 100%;
  }
  .seg__item {
    flex: 1 1 0;
    padding: 0 8px;
  }
}

@media (max-width: 600px) {
  .seg__count {
    display: none;
  }
}

@media (max-width: 420px) {
  .seg__label {
    display: none;
  }
  .seg__item {
    gap: 0;
    height: 32px;
  }
}
</style>
