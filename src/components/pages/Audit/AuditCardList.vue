<template>
  <div class="aud-cards">
    <div v-if="loading" class="aud-cards__list">
      <div v-for="n in 5" :key="`sk-${n}`" class="aud-card aud-card--skeleton">
        <div class="aud-card__top">
          <span class="dash-shimmer aud-sk aud-sk--avatar" />
          <span class="dash-shimmer aud-sk aud-sk--name" />
          <span class="dash-shimmer aud-sk aud-sk--chip" />
        </div>
        <span class="dash-shimmer aud-sk aud-sk--line" />
        <span class="dash-shimmer aud-sk aud-sk--foot" />
      </div>
    </div>

    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_history'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : 'No shift changes recorded' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'No change matches what you typed, the kind you picked, or the dates you chose.'
            : 'Once somebody assigns or moves a shift, the change appears here with who made it and when.'
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
        class="aud-cards__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <div v-else class="aud-cards__list">
      <article v-for="row in rows" :key="row.key" class="aud-card">
        <div class="aud-card__top">
          <!-- Same construction as the table and the Employees page: the
               photograph when the name resolves to exactly one employee who has
               one, otherwise initials on that person's identity colour. -->
          <q-avatar v-if="row.avatar?.pictureUrl" size="28px" class="aud-card__avatar">
            <img :src="row.avatar.pictureUrl" :alt="row.employeeName" />
          </q-avatar>
          <q-avatar
            v-else
            size="28px"
            class="aud-card__avatar"
            :style="{ background: row.avatar?.color }"
          >
            <span class="aud-card__initials">{{ row.avatar?.initials || '?' }}</span>
          </q-avatar>
          <span class="aud-card__name">{{ row.employeeName }}</span>
          <span class="dash-chip" :class="chipClass(row.change.tone)">
            <span class="dash-chip__dot" />
            {{ row.change.label }}
          </span>
        </div>

        <!-- The move leads the card body: on a phone it is the one line worth
             reading first, and the two people are context for it. -->
        <div class="aud-card__move">
          <span v-if="row.previousShift" class="move__from">{{ row.previousShift }}</span>
          <q-icon
            v-if="row.previousShift && row.newShift"
            name="arrow_right_alt"
            size="16px"
            class="move__arrow"
          />
          <span v-if="row.newShift" class="move__to">{{ row.newShift }}</span>
          <span v-else class="move__none">no shift</span>
          <span class="aud-card__on">on {{ row.shiftDateLabel || '—' }}</span>
        </div>

        <div class="aud-card__foot">
          <span class="aud-card__by">
            <q-icon name="o_person" size="14px" />
            {{ row.updaterName }}
          </span>
          <span class="aud-card__when">{{ row.updatedAtStamp }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
/**
 * Tablet and phone view of the shift-assignment trail, swapped in below 1024px.
 *
 * Reads the same normalised rows as AuditTable, from
 * `composables/utils/assignmentHistory.js` — which is the point of that module:
 * the two renderers cannot end up describing the same change differently.
 */
import { chipClass } from 'src/composables/utils/assignmentHistory'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['clear-filters'])
</script>

<style scoped>
.aud-cards__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.aud-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  background: var(--dash-surface);
}

/* ── Header row ── */
.aud-card__top {
  display: flex;
  align-items: center;
  gap: 9px;
}

.aud-card__avatar {
  flex-shrink: 0;
}
.aud-card__initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.aud-card__name {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Move ── */
.aud-card__move {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
}
.move__from {
  font-size: 12.5px;
  color: var(--dash-ink-4);
}
.move__arrow {
  color: var(--dash-ink-4);
}
.move__to {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink);
}
.move__none {
  font-size: 12.5px;
  font-style: italic;
  color: var(--dash-ink-4);
}
.aud-card__on {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

/* ── Footer ── */
.aud-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;
  color: var(--dash-ink-3);
}
.aud-card__by {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.aud-card__when {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ── Skeleton ──
   Mirrors the card's own metrics so nothing shifts when the rows land. */
.aud-card--skeleton {
  gap: 10px;
}
.aud-sk {
  display: block;
  height: 11px;
  border-radius: var(--dash-r-sm);
}
.aud-sk--avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex: none;
}
.aud-sk--name {
  flex: 1;
  height: 13px;
}
.aud-sk--chip {
  width: 78px;
  height: 18px;
  flex: none;
}
.aud-sk--line {
  height: 34px;
}
.aud-sk--foot {
  width: 62%;
}

.aud-cards__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}
</style>
