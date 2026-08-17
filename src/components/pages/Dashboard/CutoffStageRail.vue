<template>
  <div class="rail">
    <div v-if="loading" class="rail__skeleton">
      <span class="dash-shimmer rail__skeleton-bar" />
      <div class="rail__skeleton-legend">
        <span v-for="n in 4" :key="n" class="dash-shimmer rail__skeleton-chip" />
      </div>
    </div>

    <template v-else-if="total > 0">
      <!-- The rail itself. Ordered left to right in the direction payroll
           actually moves, so the widest early segment is the bottleneck. -->
      <div
        class="rail__track"
        role="img"
        :aria-label="ariaSummary"
      >
        <button
          v-for="seg in segments"
          :key="seg.status"
          type="button"
          class="rail__seg dash-focusable"
          :class="{ 'rail__seg--active': active === seg.status }"
          :style="{ flexGrow: seg.count, background: seg.color }"
          :title="`${seg.label}: ${seg.count} of ${total}`"
          @click="toggle(seg.status)"
        >
          <span v-if="seg.share >= 0.1" class="rail__seg-count dash-num">{{ seg.count }}</span>
        </button>
      </div>

      <!-- Identity is never colour-alone: every segment is also named here with
           its count, so the rail is readable without distinguishing the hues. -->
      <ul class="rail__legend">
        <li
          v-for="seg in segments"
          :key="seg.status"
          class="rail__legend-item"
          :class="{ 'rail__legend-item--dim': active && active !== seg.status }"
        >
          <button type="button" class="rail__legend-btn dash-focusable" @click="toggle(seg.status)">
            <span class="dash-swatch" :style="{ background: seg.color }" />
            <span class="rail__legend-label">{{ seg.label }}</span>
            <span class="rail__legend-count dash-num">{{ seg.count }}</span>
          </button>
        </li>
      </ul>

      <p v-if="bottleneck" class="rail__note">
        <q-icon name="filter_alt" size="13px" />
        <span>
          <strong>{{ bottleneck.count }}</strong>
          {{ bottleneck.count === 1 ? 'group is' : 'groups are' }} held at
          <strong>{{ bottleneck.label }}</strong> — the earliest stage still holding work.
        </span>
      </p>
    </template>

    <div v-else class="dash-empty">
      <q-icon name="done_all" size="26px" :style="{ color: 'var(--dash-good)' }" />
      <p class="dash-empty__title">No open payout groups</p>
      <p class="dash-empty__sub">Every group in this cutoff has cleared the pipeline.</p>
    </div>
  </div>
</template>

<script setup>
/**
 * The cutoff stage rail — the Current Cutoff tab's lead element.
 *
 * Replaces a vertical list of status/count pairs. A list tells you the counts;
 * the rail tells you the *shape* of the cutoff: stages run left to right in the
 * order payroll actually moves through them, each segment sized by how many
 * payout groups are sitting in it. A fat segment on the left is a bottleneck, a
 * rail weighted to the right is a cutoff about to close — neither of which the
 * list made visible.
 *
 * Clicking a segment emits `filter` so the payout table below can narrow to it.
 */
import { computed, ref } from 'vue'

const STAGES = [
  { status: 'needs_attention', label: 'Needs attention', color: 'var(--dash-critical-mark)' },
  { status: 'under_review', label: 'Under review', color: 'var(--dash-warn-mark)' },
  { status: 'awaiting_acknowledgment', label: 'Awaiting ack', color: 'var(--dash-cat-4)' },
  { status: 'ready_for_funding', label: 'Ready to fund', color: 'var(--dash-cat-1)' },
  { status: 'funded', label: 'Funded', color: 'var(--dash-cat-2)' },
  { status: 'disbursing', label: 'Disbursing', color: 'var(--dash-info-mark)' },
  { status: 'complete', label: 'Complete', color: 'var(--dash-neutral-mark)' },
]

// Stages before money is committed. The first of these still holding groups is
// what is actually blocking the cutoff.
const BLOCKING = ['needs_attention', 'under_review', 'awaiting_acknowledgment']

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['filter'])

const active = ref(null)

const segments = computed(() => {
  const rows = STAGES.map((s) => ({ ...s, count: Number(props.data?.[s.status] ?? 0) })).filter(
    (s) => s.count > 0,
  )
  const sum = rows.reduce((acc, s) => acc + s.count, 0) || 1
  return rows.map((s) => ({ ...s, share: s.count / sum }))
})

const total = computed(() => segments.value.reduce((acc, s) => acc + s.count, 0))

const bottleneck = computed(() =>
  segments.value.find((s) => BLOCKING.includes(s.status)) ?? null,
)

const ariaSummary = computed(
  () =>
    `Payout groups by stage: ${segments.value
      .map((s) => `${s.label} ${s.count}`)
      .join(', ')}. ${total.value} total.`,
)

function toggle(status) {
  active.value = active.value === status ? null : status
  emit('filter', active.value)
}

function reset() {
  if (active.value === null) return
  active.value = null
  emit('filter', null)
}

// Lets the hosting panel's "Clear filter" action drop the selection without
// reaching into the rail's internal state.
defineExpose({ reset })
</script>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

/* ── Track ──
   Individually rounded segments separated by a real gap, rather than one bar
   sliced by hairlines. Each stage reads as its own object, which is what it is. */
.rail__track {
  display: flex;
  gap: 3px;
  height: 36px;
}

.rail__seg {
  position: relative;
  flex-basis: 0;
  min-width: 10px;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--dash-r-sm);
  transition: opacity var(--dash-fast) var(--dash-ease),
    flex-grow var(--dash-slow) var(--dash-ease);
}
.rail__seg:hover {
  opacity: 0.85;
}
/* A white inner ring plus a dark outer one, so the selected segment reads as
   selected against any of the seven stage colours. */
.rail__seg--active {
  box-shadow: 0 0 0 2px var(--dash-surface), 0 0 0 4px var(--dash-ink);
  z-index: 1;
}

/* Direct label, but only where the segment is actually wide enough to hold it —
   a number crammed into a 6px sliver is noise. The rest are named in the legend. */
.rail__seg-count {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(15, 32, 51, 0.35);
  pointer-events: none;
}

/* ── Legend ── */
.rail__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.rail__legend-item {
  transition: opacity var(--dash-fast) var(--dash-ease);
}
.rail__legend-item--dim {
  opacity: 0.4;
}
.rail__legend-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 2px 0;
  cursor: pointer;
  font: inherit;
}
.rail__legend-label {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}
.rail__legend-count {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
}

/* ── Bottleneck note ── */
.rail__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dash-ink-2);
}
.rail__note strong {
  color: var(--dash-ink);
  font-weight: 600;
}
.rail__note .q-icon {
  color: var(--dash-ink-4);
  margin-top: 2px;
  flex-shrink: 0;
}

/* ── Skeleton ── */
.rail__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rail__skeleton-bar {
  height: 36px;
  border-radius: var(--dash-r-sm);
}
.rail__skeleton-legend {
  display: flex;
  gap: 14px;
}
.rail__skeleton-chip {
  height: 11px;
  width: 84px;
}

@media (max-width: 1024px) {
  .rail__track {
    height: 34px;
  }
  .rail__legend {
    gap: 4px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rail__seg:hover {
    transform: none;
  }
}
</style>
