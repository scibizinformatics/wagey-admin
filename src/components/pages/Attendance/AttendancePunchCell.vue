<template>
  <div class="punch" :class="{ 'punch--empty': !formatted }">
    <!-- Selfie sits with its punch rather than in a column of its own. When
         there is no photo the slot collapses instead of holding a dash, so a
         column of records without selfies does not read as a column of errors. -->
    <button
      v-if="selfie"
      type="button"
      class="punch__thumb"
      :aria-label="`View ${label} selfie`"
      @click="$emit('view-selfie', selfie, label)"
    >
      <img :src="selfie" :alt="`${label} selfie`" loading="lazy" />
    </button>
    <span v-else class="punch__thumb punch__thumb--none" aria-hidden="true">
      <q-icon :name="kind === 'in' ? 'o_login' : 'o_logout'" size="14px" />
    </span>

    <div class="punch__body">
      <!-- Locked: the shift this record belongs to already has a completed
           attendance elsewhere, so this one must not take a manual time. It
           stays a static field rather than a disabled button so it cannot be
           focused or clicked at all, and carries the reason on hover. -->
      <span
        v-if="locked"
        class="punch__time punch__time--locked dash-num"
        :class="{ 'punch__time--set': !!formatted }"
        :aria-label="`${label}: ${formatted ?? 'not recorded'}. Locked — ${lockedReason}`"
      >
        <span class="punch__value">{{ formatted ?? '--:--' }}</span>
        <q-icon name="o_lock" size="12px" class="punch__pencil" />
        <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 6]">
          {{ lockedReason }}
        </q-tooltip>
      </span>

      <button
        v-else
        type="button"
        class="punch__time dash-num"
        :class="{ 'punch__time--set': !!formatted }"
        :title="formatted ? `Edit ${label.toLowerCase()}` : `Set ${label.toLowerCase()}`"
        :aria-label="
          formatted
            ? `${label}: ${formatted}. Click to edit.`
            : `${label} not recorded. Click to set.`
        "
        @click="$emit('edit')"
      >
        <span class="punch__value">{{ formatted ?? '--:--' }}</span>
        <q-icon name="o_edit" size="12px" class="punch__pencil" />
      </button>

      <span v-if="formatted" class="punch__source" :class="sourceToneClass(source)">
        {{ formatSource(source) }}
      </span>
    </div>
  </div>
</template>

<script setup>
/**
 * One clock event — its time, its selfie and how it was captured — as a single
 * cell.
 *
 * The table previously spread each punch across three columns (Time / Photo /
 * Source) and did it twice, for nine columns total needing ~1000px. Grouping
 * them means five columns, which is what lets the table survive a laptop
 * viewport at all. It also reads better: a punch is one event, so its details
 * belong together rather than scattered across the row.
 *
 * The time itself is styled as an editable field — bordered, with a visible
 * pencil — because correcting a mis-punched time is routine admin work and the
 * control has to advertise itself rather than wait to be hovered over.
 */
import { computed } from 'vue'
import { formatTime, formatSource, sourceToneClass } from '@/composables/utils/attendance'

const props = defineProps({
  time: { type: String, default: null },
  timezone: { type: String, default: '' },
  selfie: { type: String, default: '' },
  source: { type: String, default: '' },
  /** 'in' | 'out' — only affects the placeholder glyph and the label. */
  kind: { type: String, default: 'in' },
  /**
   * Set when this record's shift already has a completed attendance on another
   * record. The time then becomes read-only: an admin correcting the shift
   * should edit the record that actually holds it, not add a manual time to a
   * duplicate.
   */
  locked: { type: Boolean, default: false },
  lockedReason: {
    type: String,
    default: 'This shift already has a completed attendance record.',
  },
})

defineEmits(['edit', 'view-selfie'])

const label = computed(() => (props.kind === 'in' ? 'Time in' : 'Time out'))
const formatted = computed(() => formatTime(props.time, props.timezone))
</script>

<style scoped>
.punch {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

/* ── Selfie ── */
.punch__thumb {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-50);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color var(--dash-fast) var(--dash-ease);
}
.punch__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.punch__thumb:hover {
  border-color: var(--dash-accent);
}
.punch__thumb:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

.punch__thumb--none {
  cursor: default;
  color: var(--dash-n-300);
  background: var(--dash-n-25);
  border-style: dashed;
}
.punch__thumb--none:hover {
  border-color: var(--dash-line);
}

/* ── Time + source ── */
.punch__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

/* The time reads as a quiet input, not as plain text: a permanent hairline
   border, a permanent pencil, and an accent-tinted hover. These records are
   corrected often enough that the affordance has to be visible at rest —
   revealing it only on hover meant nobody who did not already know could tell
   the times were editable at all. */
.punch__time {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 7px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink-4);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--dash-fast) var(--dash-ease),
    border-color var(--dash-fast) var(--dash-ease),
    background var(--dash-fast) var(--dash-ease);
}

.punch__time--set {
  color: var(--dash-ink);
  font-weight: 600;
}

/* Nothing recorded yet: a dashed edge reads as an empty field waiting for a
   value, rather than as a value that happens to be missing. */
.punch__time:not(.punch__time--set) {
  border-style: dashed;
  background: var(--dash-n-25);
}

.punch__time:hover:not(.punch__time--locked) {
  color: var(--dash-accent);
  border-color: var(--dash-accent);
  border-style: solid;
  background: var(--dash-accent-bg);
}

.punch__time:focus-visible {
  outline: none;
  border-color: var(--dash-accent);
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

.punch__value {
  font-variant-numeric: tabular-nums;
}

.punch__pencil {
  flex-shrink: 0;
  color: var(--dash-n-400);
  transition: color var(--dash-fast) var(--dash-ease);
}
.punch__time:hover:not(.punch__time--locked) .punch__pencil,
.punch__time:focus-visible .punch__pencil {
  color: var(--dash-accent);
}

/* Locked reads as a field that is filled in and settled — flat, greyed, no
   hover response — rather than as a broken control. The lock glyph replaces the
   pencil in place so the row keeps its rhythm against unlocked rows. */
.punch__time--locked {
  cursor: not-allowed;
  color: var(--dash-ink-3);
  background: var(--dash-n-25);
  border-style: dashed;
}
.punch__time--locked.punch__time--set {
  color: var(--dash-ink-3);
  font-weight: 500;
}
.punch__time--locked .punch__pencil {
  color: var(--dash-n-400);
}

.punch__source {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}
.punch__source.src--qr {
  color: #6941c6;
}
.punch__source.src--manual {
  color: var(--dash-accent);
}
.punch__source.src--auto {
  color: var(--dash-good);
}
</style>
