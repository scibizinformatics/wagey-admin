<template>
  <div class="day-part" role="radiogroup" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="day-part__option dash-focusable"
      :class="{ 'day-part__option--on': modelValue === option.value }"
      :aria-checked="modelValue === option.value"
      @click="$emit('update:modelValue', option.value)"
    >
      <span class="day-part__mark" :class="`day-part__mark--${option.value}`" aria-hidden="true" />
      <span class="day-part__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Whole day or half day — the one decision a leave request adds over a plain
 * date, and the only per-row control the date list carries besides the day
 * itself.
 *
 * Built as its own control rather than a `q-btn-toggle` for two reasons. The
 * markers are CSS discs, and `QBtnToggle` renders an option's icon through
 * `q-icon`, where the outlined set that backs the `o_` prefix has no solid disc
 * to point at. And the mark colours are fixed per option — a dark whole day and
 * an accent half — rather than following `currentColor`, so which one is
 * *selected* is carried by the white plate alone and the two days stay legible as
 * themselves even when neither is chosen.
 *
 * The construction is `DeductionsTabPills`' `.seg` at dialog density: a recessed
 * track with a raised white plate for the selection, which reads as one surface
 * lifted out of another rather than as a button that changes colour. `q-btn`
 * would also have put three elements in the row's flex chain instead of one, for
 * no gain.
 *
 * Written once and used by both apply dialogs. The leave dialog takes the default
 * Full/Half pair and cannot drift from it; the compensable dialog passes its own
 * list because a day there can also carry **excess hours with no base day**, and
 * "full or half" alone cannot say that. The options come in as a prop for exactly
 * that reason — so the two callers differ in how many states a day has without
 * either growing a second control.
 */
const props = defineProps({
  modelValue: { type: String, default: 'full' },
  // Named rather than left generic: the group has to announce what it selects,
  // and a radiogroup labelled "Day part" says nothing on its own.
  ariaLabel: { type: String, default: 'Day part' },
  /**
   * The states a day can be in, in fixed order. Defaults to the Full/Half pair
   * every non-compensable caller means; only the compensable apply dialog adds
   * the `excess` segment.
   */
  options: {
    type: Array,
    default: () => [
      { value: 'full', label: 'Full' },
      { value: 'half', label: 'Half' },
    ],
  },
})

defineEmits(['update:modelValue'])

const options = computed(() => props.options)
</script>

<style scoped>
.day-part {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  /* The row is a flex chain, so the control must not be the thing that flexes. */
  flex: 0 0 auto;
  background: var(--dash-n-100);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-pill);
}
.day-part__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--dash-r-pill);
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: var(--dash-ink-3);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
}
.day-part__option:hover:not(.day-part__option--on) {
  background: rgba(255, 255, 255, 0.6);
  color: var(--dash-ink-2);
}
/* The chosen half is a raised white plate, matching how a panel sits on the
   canvas — one level up from its surroundings, not a colour reversal. */
.day-part__option--on {
  background: var(--dash-surface);
  border-color: var(--dash-line);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}

/* The marks. A whole day is a solid disc; a half day is the same disc with only
   its left half filled — the same language as the day grid the date came from,
   where a half day is one half of a whole one. An excess-only day has no base at
   all, so it gets a hollow ring: the shape of a day with nothing filled in.

   Drawn rather than iconified on purpose: the outlined set behind the `o_`
   prefix offers a ring and a contrast glyph, neither of which is the solid disc
   this needs, and a ring would read as a hollow day. */
.day-part__mark {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
}
.day-part__mark--full {
  background: var(--dash-ink);
}
.day-part__mark--half {
  background: linear-gradient(90deg, var(--dash-accent) 50%, transparent 50%);
  border: 1px solid var(--dash-accent);
  /* The gradient is measured to the padding box, so the border shifts the fill a
     pixel off centre; fixing the box keeps the split exactly down the middle. */
  box-sizing: border-box;
}
.day-part__mark--excess {
  /* Hollow: a base day left empty, the accent reading as the extra hours on top. */
  background: transparent;
  border: 1.5px solid var(--dash-accent);
  box-sizing: border-box;
}
</style>
