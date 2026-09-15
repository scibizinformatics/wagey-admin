<template>
  <div class="acc-cards">
    <div v-if="loading" class="acc-cards__list">
      <div v-for="n in 5" :key="`sk-${n}`" class="acc-card acc-card--skeleton">
        <div class="acc-card__top">
          <span class="dash-shimmer acc-sk acc-sk--uid" />
          <span class="dash-shimmer acc-sk acc-sk--chip" />
        </div>
        <span class="dash-shimmer acc-sk acc-sk--line" />
        <span class="dash-shimmer acc-sk acc-sk--foot" />
      </div>
    </div>

    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_contactless'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : 'No access cards yet' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'No card matches what you typed, the status you picked, or who it is assigned to.'
            : 'Cards appear here the first time they are tapped on a reader. Assign one to an employee to let it through.'
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
        class="acc-cards__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <div v-else class="acc-cards__list">
      <article
        v-for="row in rows"
        :key="row.key"
        class="acc-card"
        tabindex="0"
        @click="$emit('view', row)"
        @keydown.enter.prevent="$emit('view', row)"
      >
        <!-- The uid leads: on a phone it is the line that identifies the card,
             and the person holding it is the answer to the question below. -->
        <div class="acc-card__top">
          <button
            type="button"
            class="uid"
            :aria-label="`Copy card UID ${row.uid}`"
            @click.stop="$emit('copy', row)"
          >
            <span class="uid__text dash-num">{{ formatUid(row.uid) }}</span>
            <q-icon name="o_content_copy" size="13px" class="uid__icon" />
          </button>
          <span class="dash-chip" :class="chipClass(row.status.tone)">
            <span class="dash-chip__dot" />
            {{ row.status.label }}
          </span>
        </div>

        <div class="acc-card__holder">
          <template v-if="row.assigned">
            <q-avatar v-if="row.avatar?.pictureUrl" size="26px" class="acc-card__avatar">
              <img :src="row.avatar.pictureUrl" :alt="row.employeeName" />
            </q-avatar>
            <q-avatar
              v-else
              size="26px"
              class="acc-card__avatar"
              :style="{ background: row.avatar?.color }"
            >
              <span class="acc-card__initials">{{ row.avatar?.initials || '?' }}</span>
            </q-avatar>
            <span class="acc-card__name">{{ row.employeeName }}</span>
          </template>
          <span v-else class="acc-card__free">
            <q-icon name="o_person_off" size="15px" />
            Not yet assigned
          </span>

          <q-btn
            flat
            dense
            no-caps
            size="12px"
            :icon="row.assigned ? 'o_swap_horiz' : 'o_person_add'"
            :label="row.assigned ? 'Reassign' : 'Assign'"
            class="acc-card__action"
            @click.stop="$emit('assign', row)"
          />
        </div>

        <!-- The mismatch between status and holder, said in words. It is the
             one thing on the card a reader cannot get by looking at the two
             lines above separately. -->
        <p v-if="row.alert" class="acc-card__alert">
          <q-icon name="o_warning" size="15px" />
          <span
            ><strong>{{ row.alert.label }}</strong> — {{ row.alert.detail }}</span
          >
        </p>

        <div class="acc-card__foot">
          <span class="acc-card__type">{{ row.cardType.toUpperCase() }}</span>
          <span class="acc-card__when">
            <template v-if="row.lastTapDay">
              Last tap {{ row.lastTapDay }}
              <template v-if="row.lastTapAgo"> · {{ row.lastTapAgo }}</template>
            </template>
            <template v-else>Never tapped</template>
          </span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
/**
 * Tablet and phone view of the access-card roll, swapped in below 1024px.
 *
 * Reads the same normalised rows as AccessCardTable, from
 * `composables/utils/accessCards.js` — which is the point of that module: the
 * two renderers cannot end up describing the same card differently.
 */
import { chipClass, formatUid } from 'src/composables/utils/accessCards'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['view', 'assign', 'copy', 'clear-filters'])
</script>

<style scoped>
.acc-cards__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.acc-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  background: var(--dash-surface);
  cursor: pointer;
}
.acc-card:focus-visible {
  outline: 2px solid var(--dash-accent);
  outline-offset: 2px;
}

/* ── Header row ── */
.acc-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
}

.uid {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 7px;
  margin-left: -7px;
  border: 1px solid transparent;
  border-radius: var(--dash-r-sm);
  background: transparent;
  cursor: pointer;
}
.uid:hover {
  background: var(--dash-n-50);
  border-color: var(--dash-line);
}
.uid__text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--dash-ink);
}
.uid__icon {
  color: var(--dash-ink-4);
  flex: none;
}

/* ── Holder ── */
.acc-card__holder {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
}
.acc-card__avatar {
  flex-shrink: 0;
}
.acc-card__initials {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.acc-card__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.acc-card__free {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12.5px;
  font-style: italic;
  color: var(--dash-ink-4);
}
.acc-card__action {
  flex: none;
  color: var(--dash-accent);
  font-weight: 500;
  padding: 0 6px;
}

/* ── Alert ── */
.acc-card__alert {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  font-size: 12px;
  line-height: 1.45;
  color: var(--dash-warn);
}
.acc-card__alert .q-icon {
  flex: none;
  margin-top: 1px;
}

/* ── Footer ── */
.acc-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;
  color: var(--dash-ink-3);
}
.acc-card__type {
  letter-spacing: 0.04em;
  color: var(--dash-ink-4);
}
.acc-card__when {
  white-space: nowrap;
  text-align: right;
}

/* ── Skeleton ──
   Mirrors the card's own metrics so nothing shifts when the rows land. */
.acc-card--skeleton {
  gap: 10px;
}
.acc-sk {
  display: block;
  height: 11px;
  border-radius: var(--dash-r-sm);
}
.acc-sk--uid {
  width: 128px;
  height: 14px;
  flex: none;
}
.acc-sk--chip {
  width: 72px;
  height: 18px;
  flex: none;
}
.acc-sk--line {
  height: 42px;
}
.acc-sk--foot {
  width: 58%;
}

.acc-cards__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}
</style>
