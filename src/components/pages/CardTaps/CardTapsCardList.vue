<template>
  <div class="cards">
    <template v-if="loading">
      <div v-for="n in 6" :key="`sk-${n}`" class="ct-card">
        <div class="ct-card__top">
          <span class="dash-shimmer ct-card__sk-avatar" />
          <div class="ct-card__sk-lines">
            <span class="dash-shimmer" style="width: 56%" />
            <span class="dash-shimmer" style="width: 34%; height: 8px" />
          </div>
        </div>
        <div class="ct-card__punches">
          <span class="dash-shimmer" style="height: 34px" />
          <span class="dash-shimmer" style="height: 34px" />
        </div>
      </div>
    </template>

    <div v-else-if="!rows.length" class="dash-empty cards__empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_contactless'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'No taps match these filters' : 'No card taps for this date' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'Nothing here fits the current search and filters.'
            : 'No access cards were tapped on this date. Pick another day, or open the date range to review a longer span.'
        }}
      </p>
      <q-btn
        v-if="isFiltered"
        outline
        no-caps
        dense
        size="12px"
        icon="filter_alt_off"
        label="Clear filters"
        class="cards__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <article v-for="row in rows" v-else :key="row.key" class="ct-card">
      <div class="ct-card__top">
        <q-avatar size="36px" class="ct-card__avatar" :style="{ background: getAvatarColor(row.employee_name) }">
          <span class="ct-card__initials">{{ getInitials(row.employee_name) }}</span>
        </q-avatar>

        <!-- Every card is the same person during a single-employee range, so the
             date leads instead of the name — mirrors the table. -->
        <div class="ct-card__identity">
          <p class="ct-card__name">{{ singleEmployee ? rowDateLabel(row) : row.employee_name }}</p>
          <p class="ct-card__meta">{{ singleEmployee ? row.employee_name : rowDateLabel(row) }}</p>
        </div>

        <button
          type="button"
          class="ct-card__taps"
          :aria-label="`View the ${tapCount(row)} taps on ${rowDateLabel(row)}`"
          @click="$emit('view-taps', row)"
        >
          <q-icon name="o_visibility" size="16px" />
          <span class="ct-card__taps-count">{{ tapCount(row) }}</span>
          <q-tooltip>View all taps</q-tooltip>
        </button>
      </div>

      <div class="ct-card__punches">
        <div class="ct-slot">
          <span class="ct-slot__label">First tap</span>
          <span class="ct-slot__value dash-num">{{ timeLabel(row.first_tap) }}</span>
        </div>
        <div class="ct-slot">
          <span class="ct-slot__label">Last tap</span>
          <span class="ct-slot__value dash-num">{{ timeLabel(row.last_tap) }}</span>
        </div>
        <div class="ct-slot">
          <span class="ct-slot__label">Duration</span>
          <span class="ct-slot__value dash-num">{{ durationLabel(row) }}</span>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
/**
 * Card taps as cards, for tablet width and below.
 *
 * The table answers 1024px up; a panel of cards keeps every reading at full size
 * without the sideways scroll a seven-column table would demand below that.
 */
import { getInitials, getAvatarColor } from '@/composables/utils/attendance'
import { tapCount } from '@/composables/utils/cardTaps'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
  // Set while the list is narrowed to one employee over a date range: the
  // Employee column carries no information then, so Date takes its place.
  singleEmployee: { type: Boolean, default: false },
})

const { singleEmployee } = props

defineEmits(['view-taps', 'clear-filters'])

// Pinned to local midnight — a bare YYYY-MM-DD parses as UTC and can shift a day
function rowDateLabel(row) {
  const iso = row?.date || ''
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function timeLabel(tap) {
  return tap || '—'
}

function durationLabel(row) {
  return row?.duration || '—'
}
</script>

<style scoped>
/* Both the skeleton and the card list here use .ct-* beyond the shared .cards
   / .dash-empty chrome: the page's own readings, so the narrow renderer can
   never surprise the table. */
.cards {
  position: relative;
}

.cards__empty {
  padding: 46px 18px 44px;
}

.cards__empty-btn {
  margin-top: 10px;
}

/* ── Skeleton ── */
.ct-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--dash-line);
}
.ct-card:last-child {
  border-bottom: none;
}
.ct-card__top {
  display: flex;
  align-items: center;
  gap: 11px;
}
.ct-card__sk-avatar {
  border-radius: 50%;
}
.ct-card__sk-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Identity ── */
.ct-card__avatar {
  flex-shrink: 0;
}
.ct-card__initials {
  font-size: 11.5px;
  font-weight: 600;
  color: #fff;
}
.ct-card__identity {
  flex: 1;
  min-width: 0;
}
.ct-card__name {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ct-card__meta {
  margin: 1px 0 0;
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Tap-count button ── */
.ct-card__taps {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border: 1px solid var(--dash-line-strong);
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
  color: var(--dash-ink-3);
  cursor: pointer;
  transition:
    border-color var(--dash-fast, 0.15s) var(--dash-ease, ease),
    color var(--dash-fast, 0.15s) var(--dash-ease, ease),
    background var(--dash-fast, 0.15s) var(--dash-ease, ease);
}
.ct-card__taps:hover {
  border-color: var(--dash-accent);
  color: var(--dash-accent);
  background: var(--dash-accent-bg);
}
.ct-card__taps-count {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ── Tap facts ── */
.ct-card__punches {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.ct-slot {
  min-width: 0;
  padding: 9px 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
}
.ct-slot__label {
  display: block;
  font-size: 11px;
  color: var(--dash-ink-4);
}
.ct-slot__value {
  display: block;
  margin-top: 2px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>