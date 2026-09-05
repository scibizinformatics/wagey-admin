<template>
  <div class="man-stats">
    <article v-for="tile in tiles" :key="tile.key" class="man-stat">
      <div class="man-stat__head">
        <span class="man-stat__mark" :style="{ background: tile.mark }" />
        <span class="man-stat__label">{{ tile.label }}</span>
        <q-icon v-if="tile.hint" name="o_info" size="13px" class="man-stat__info">
          <q-tooltip anchor="bottom middle" self="top middle" class="man-tip">
            {{ tile.hint }}
          </q-tooltip>
        </q-icon>
      </div>

      <span v-if="loading" class="dash-shimmer man-stat__sk" />
      <span v-else class="man-stat__value dash-num" :class="tile.valueClass">
        {{ tile.value }}
      </span>

      <!-- Only the manned tile carries a bar: it is the one figure on the strip
           that is a share of something rather than a count. -->
      <div v-if="tile.key === 'working' && !loading" class="man-stat__bar">
        <span class="dash-bar">
          <span
            class="dash-bar__track"
            :class="`dash-bar__track--${mannedTone}`"
            role="progressbar"
            :aria-valuenow="Math.round(mannedPctValue ?? 0)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`${totals.working} of ${target} ${targetLabel} working`"
          >
            <span
              class="dash-bar__fill"
              :class="`dash-bar__fill--${mannedTone}`"
              :style="{ width: fillWidth }"
            />
          </span>
          <!-- The denominator, not the percentage. "0%" beside a value of 0 says
               the same nothing twice; "of 6 assigned" is the fact the tile is
               otherwise missing, and it still reads when the bar is empty. -->
          <span class="dash-bar__label man-stat__of">of {{ target }} {{ targetLabel }}</span>
        </span>
      </div>
      <span v-else-if="tile.foot && !loading" class="man-stat__foot">{{ tile.foot }}</span>
    </article>
  </div>
</template>

<script setup>
/**
 * The day's manning in five readings.
 *
 * The strip answers, left to right: how big is the board, how many people are
 * actually on it, who is missing from a shift they were put on, who is absent
 * without leave, and who is legitimately away. Required is folded into the
 * manned tile as the bar's denominator when the company sets requirements, and
 * the sixth tile (positions short of target) only appears when there are
 * targets to be short of — a company with no requirements would otherwise read
 * a permanent, meaningless zero.
 *
 * The totals come from `sumManning` in composables/utils/manning.js, over the
 * same filtered rows the table renders, so a tile and the column it summarises
 * cannot disagree — and narrowing to one site retunes the strip with it.
 */
import { computed } from 'vue'
import { coverageToneFor } from 'src/composables/utils/manning'

const props = defineProps({
  /** A `sumManning()` result over the rows currently on the board. */
  totals: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

const count = (value) => Number(value ?? 0).toLocaleString('en-PH')

/** Working is measured against the requirement where there is one, the
 *  assignment otherwise — the same rule the table's rows use. */
const target = computed(() => {
  const needed = props.totals?.needed
  return needed != null && needed > 0 ? needed : Number(props.totals?.assigned ?? 0)
})

const targetLabel = computed(() =>
  props.totals?.needed != null && props.totals.needed > 0 ? 'required' : 'assigned',
)

const mannedPctValue = computed(() => {
  if (!target.value) return null
  return (Number(props.totals?.working ?? 0) / target.value) * 100
})

const mannedTone = computed(() => coverageToneFor(props.totals?.working, target.value))

// A fill floor, so one person in forty is a visible mark rather than a sliver
// that rounds away to nothing. Exactly zero stays zero — an empty track is the
// honest picture of nobody being in yet.
const MIN_FILL_PCT = 4

const fillWidth = computed(() => {
  const pct = mannedPctValue.value
  if (!pct) return '0%'
  return `${Math.min(100, Math.max(MIN_FILL_PCT, pct))}%`
})

const tiles = computed(() => {
  const totals = props.totals ?? {}
  const needed = totals.needed

  const list = [
    {
      key: 'assigned',
      label: 'Assigned',
      mark: 'var(--dash-cat-1)',
      value: count(totals.assigned),
      foot: `${count(totals.positions)} ${totals.positions === 1 ? 'position' : 'positions'} · ${count(totals.sites)} ${totals.sites === 1 ? 'site' : 'sites'}`,
      hint: 'People the schedule put on a shift today',
    },
    {
      key: 'working',
      label: 'Working',
      mark: 'var(--dash-good-mark)',
      value: count(totals.working),
      // Toned by coverage, never fixed. This read `is-good` unconditionally,
      // which printed a green 0 on a morning when nobody had timed in yet —
      // the page's worst state, in the colour reserved for its best.
      valueClass: `is-${mannedTone.value}`,
      hint:
        needed != null
          ? `Timed in and on the floor, against a requirement of ${count(needed)}`
          : 'Timed in and on the floor, against the number assigned',
    },
    {
      key: 'notTimedIn',
      label: 'Not timed in',
      mark: 'var(--dash-warn-mark)',
      value: count(totals.notTimedIn),
      valueClass: totals.notTimedIn ? 'is-warn' : '',
      foot: totals.notTimedIn ? 'Assigned but no punch yet' : 'Everyone assigned has punched in',
      hint: 'Assigned to a shift today with no time in recorded',
    },
    {
      key: 'awol',
      label: 'AWOL',
      mark: 'var(--dash-critical-mark)',
      value: count(totals.awol),
      valueClass: totals.awol ? 'is-critical' : '',
      foot: totals.awol ? 'Needs following up' : 'None today',
      hint: 'Absent without leave',
    },
    {
      key: 'away',
      label: 'Away',
      mark: 'var(--dash-n-400)',
      value: count(totals.away),
      foot: `${count(totals.leave)} leave · ${count(totals.cto)} CTO · ${count(totals.off)} off`,
      hint: 'Accounted for, but not expected on site: on leave, on CTO, or scheduled off',
    },
  ]

  // Only meaningful where a headcount target exists.
  if (needed != null) {
    list.push({
      key: 'short',
      label: 'Below target',
      mark: 'var(--dash-cat-3)',
      value: count(totals.understaffed),
      valueClass: totals.understaffed ? 'is-critical' : 'is-good',
      foot: `of ${count(totals.withRequirement)} with a requirement`,
      hint: 'Positions with fewer people working than the requirement asks for',
    })
  }

  return list
})
</script>

<style scoped>
.man-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  gap: 10px;
}

.man-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 12px 14px 13px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
}

.man-stat__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.man-stat__mark {
  width: 3px;
  height: 11px;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}

.man-stat__label {
  font-size: 12px;
  color: var(--dash-ink-3);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.man-stat__info {
  color: var(--dash-ink-4);
  flex-shrink: 0;
  cursor: help;
}

.man-stat__value {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.022em;
  line-height: 1.15;
  color: var(--dash-ink);
}
.man-stat__value.is-good {
  color: var(--dash-good);
}
.man-stat__value.is-warn {
  color: var(--dash-warn);
}
.man-stat__value.is-critical {
  color: var(--dash-critical);
}
/* Nothing to measure against — no requirement and nobody assigned. */
.man-stat__value.is-neutral {
  color: var(--dash-ink-4);
}

.man-stat__foot {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Layout and tone come from the design system's `.dash-bar__*` classes — the
   tile adds only the space around the bar. */
.man-stat__bar {
  padding: 4px 0 2px;
}
.man-stat__bar .dash-bar {
  display: flex;
}
/* The shared label is a right-aligned percentage with a fixed minimum; this one
   is a phrase, so it drops the minimum and keeps the track from being squeezed
   to nothing beside it. */
.man-stat__of {
  min-width: 0;
  font-weight: 400;
  color: var(--dash-ink-4);
}
.man-stat__bar .dash-bar__track {
  min-width: 40px;
}

.man-stat__sk {
  width: 64px;
  height: 17px;
}
</style>
