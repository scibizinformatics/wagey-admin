<template>
  <span class="meter" :class="{ 'meter--empty': !target }">
    <!-- Nothing to measure against: no requirement and nobody assigned. A bar or
         a row of pips here would imply a target that does not exist. -->
    <template v-if="!target">
      <span class="meter__none">—</span>
    </template>

    <template v-else>
      <!-- One pip per person. A percentage bar cannot show the difference
           between "0 of 2 in" and "no data": both are an empty track. Two
           hollow pips say it plainly, and at these headcounts the reader can
           count them faster than they can read a percentage. -->
      <span v-if="usePips" class="meter__pips" aria-hidden="true">
        <span
          v-for="index in target"
          :key="index"
          class="meter__pip"
          :class="index <= filled ? `is-${tone}` : ''"
        />
      </span>

      <!-- Above ten the pips stop being countable, so a bar takes over. Its fill
           has a floor so that one person in forty is still a visible mark rather
           than a sliver that rounds away to nothing. -->
      <span v-else class="dash-bar meter__bar" aria-hidden="true">
        <span class="dash-bar__track" :class="`dash-bar__track--${tone}`">
          <span
            class="dash-bar__fill"
            :class="`dash-bar__fill--${tone}`"
            :style="{ width: fillWidth }"
          />
        </span>
      </span>

      <span class="meter__value" :class="`is-${tone}`">{{ working }}</span>
      <!-- Overstaffed against a requirement — worth marking rather than silently
           clamping the pips at full. -->
      <span v-if="extra" class="meter__extra">+{{ extra }}</span>

      <q-tooltip anchor="bottom middle" self="top middle" class="man-tip">
        {{ readout }}
      </q-tooltip>
    </template>
  </span>
</template>

<script setup>
/**
 * How many of the people a position is measured against are actually working.
 *
 * This replaces a bare `dash-bar`. The bar was accurate and unreadable: on a day
 * before anyone has clocked in, every row is 0 of n, every fill is 0px wide, and
 * a table of empty tracks looks like a rendering failure rather than a fact
 * about the morning. Pips fix that — an empty slot is still a visible slot — and
 * they suit the data, since manning is counted in whole people and usually in
 * single digits.
 *
 * The target is the requirement where a position sets one and the number
 * assigned otherwise; the caller resolves that with `mannedTarget()` and passes
 * the noun, which is all this component needs to describe itself in a tooltip.
 */
import { computed } from 'vue'
import { coverageToneFor } from 'src/composables/utils/manning'

// Above this the pips stop being countable at a glance.
const MAX_PIPS = 10

// Enough to be seen as a mark, small enough not to overstate a single person.
const MIN_FILL_PCT = 4

const props = defineProps({
  working: { type: Number, default: 0 },
  /** Requirement where the position has one, assigned otherwise. */
  target: { type: Number, default: 0 },
  /** 'required' or 'assigned' — what the target actually is, for the tooltip. */
  targetNoun: { type: String, default: 'assigned' },
})

const usePips = computed(() => props.target > 0 && props.target <= MAX_PIPS)

/** Pips light up to the target and no further; the surplus is marked separately. */
const filled = computed(() => Math.min(props.working, props.target))

const extra = computed(() => Math.max(0, props.working - props.target))

const pct = computed(() => {
  if (!props.target) return null
  return Math.min(100, (props.working / props.target) * 100)
})

const tone = computed(() => coverageToneFor(props.working, props.target))

const fillWidth = computed(() => {
  if (!props.working) return '0%'
  return `${Math.max(MIN_FILL_PCT, pct.value)}%`
})

const readout = computed(() => {
  if (!props.target) return 'Nobody assigned and no requirement set'
  return `${props.working} of ${props.target} ${props.targetNoun} working`
})
</script>

<style scoped>
.meter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.meter__none {
  color: var(--dash-ink-4);
}

.meter__pips {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

/* An empty pip is a visible, ringed slot — that is the whole point. The ring is
   a soft inset rather than a saturated border: these repeat down every row of
   the table, and a hard edge at that frequency vibrates while scrolling. */
.meter__pip {
  width: 9px;
  height: 9px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-n-100);
  box-shadow: inset 0 0 0 1px var(--dash-n-300);
}

.meter__pip.is-good {
  background: var(--dash-good-mark);
  box-shadow: inset 0 0 0 1px rgba(6, 118, 71, 0.35);
}
.meter__pip.is-warn {
  background: var(--dash-warn-mark);
  box-shadow: inset 0 0 0 1px rgba(181, 71, 8, 0.3);
}
.meter__pip.is-critical {
  background: var(--dash-critical-mark);
  box-shadow: inset 0 0 0 1px rgba(180, 35, 24, 0.3);
}
.meter__pip.is-neutral {
  background: var(--dash-neutral-mark);
}

.meter__bar {
  display: flex;
  width: 96px;
  flex-shrink: 0;
}

.meter__value {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dash-ink);
  min-width: 12px;
  text-align: right;
}
.meter__value.is-good {
  color: var(--dash-good);
}
.meter__value.is-warn {
  color: var(--dash-warn);
}
.meter__value.is-critical {
  color: var(--dash-critical);
}
.meter__value.is-neutral {
  color: var(--dash-ink-4);
}

.meter__extra {
  font-size: 11px;
  font-weight: 600;
  color: var(--dash-good);
}

@media (max-width: 1279px) {
  .meter__pip {
    width: 8px;
    height: 8px;
  }
  .meter__bar {
    width: 78px;
  }
}
</style>
