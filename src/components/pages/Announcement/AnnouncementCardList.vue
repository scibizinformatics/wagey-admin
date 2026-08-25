<template>
  <div class="ann-cards">
    <!-- Loading -->
    <template v-if="loading">
      <div v-for="n in 4" :key="`sk-${n}`" class="ann-card ann-card--sk">
        <div class="ann-card__top">
          <div class="ann-card__sk-lines">
            <span class="dash-shimmer" style="width: 54%" />
            <span class="dash-shimmer" style="width: 88%; height: 8px" />
          </div>
        </div>
        <div class="ann-card__facts">
          <span v-for="f in 2" :key="`skf-${n}-${f}`" class="dash-shimmer" style="height: 28px" />
        </div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_campaign'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : 'No announcements yet' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'No announcement matches what you typed or the filters you picked.'
            : 'Post an announcement and it appears here with its audience and schedule.'
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
        class="ann-cards__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <!-- Rows -->
    <article
      v-for="row in rows"
      v-else
      :key="row.id"
      class="ann-card"
      :class="{
        'ann-card--urgent': row.announcement_type === 'urgent',
        'ann-card--off': row._state.key === 'inactive' || row._state.key === 'ended',
      }"
    >
      <div class="ann-card__top">
        <div class="ann-card__identity">
          <p class="ann-card__title">{{ row.title || 'Untitled' }}</p>
          <p class="ann-card__type">
            <span class="ann-card__type-dot" :style="{ background: row._type.mark }" />
            {{ row._type.label }}
          </p>
        </div>
        <span class="dash-chip ann-card__chip" :class="chipClass(row._state.tone)">
          <span class="dash-chip__dot" />
          {{ row._state.label }}
        </span>
      </div>

      <p class="ann-card__message">{{ messagePreview(row.message) }}</p>

      <dl class="ann-card__facts">
        <div class="ann-card__fact">
          <dt>Audience</dt>
          <dd>
            {{ row._audience.everyone ? 'Everyone' : row._audience.summary }}
            <span
              v-if="!row._audience.everyone && row._audience.names.length"
              class="ann-card__rel"
            >
              {{ row._audience.names.slice(0, 2).join(', ')
              }}<template v-if="row._audience.names.length > 2">
                +{{ row._audience.names.length - 2 }}</template
              >
            </span>
          </dd>
        </div>
        <div class="ann-card__fact">
          <dt>Schedule</dt>
          <dd>
            {{ windowLabel(row) }}
            <span class="ann-card__rel">{{ windowNote(row) }}</span>
          </dd>
        </div>
      </dl>

      <!-- Buttons are labelled here rather than icon-only: on a touch target a
           28px glyph beside another 28px glyph is a coin-flip between edit and
           delete. -->
      <div class="ann-card__actions">
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          icon="o_edit"
          label="Edit"
          class="ann-card__action"
          @click="$emit('edit', row)"
        />
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          icon="o_delete"
          label="Delete"
          class="ann-card__action ann-card__action--danger"
          @click="$emit('delete', row)"
        />
      </div>
    </article>
  </div>
</template>

<script setup>
/**
 * Tablet and phone view of the announcement board, standing in for
 * AnnouncementTable below 1024px. Six columns become one card per announcement,
 * so nothing has to scroll sideways.
 */
import { chipClass, messagePreview, windowLabel, windowNote } from './announcementStatus'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['edit', 'delete', 'clear-filters'])
</script>

<style scoped>
.ann-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.ann-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 13px 14px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
  overflow: hidden;
}
.ann-card--urgent::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--dash-critical-mark);
}
.ann-card--off {
  background: var(--dash-n-25);
}

/* ── Top ── */
.ann-card__top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}
.ann-card__identity {
  flex: 1;
  min-width: 0;
}
.ann-card__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
  line-height: 1.35;
}
.ann-card__type {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 3px 0 0;
  font-size: 11.5px;
  color: var(--dash-ink-4);
}
.ann-card__type-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}
.ann-card__chip {
  flex: none;
}

.ann-card__message {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dash-ink-3);
}

/* ── Facts ── */
.ann-card__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid var(--dash-line-soft);
}
.ann-card__fact {
  min-width: 0;
}
.ann-card__fact dt {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--dash-ink-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.ann-card__fact dd {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ann-card__rel {
  display: block;
  font-size: 11px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Actions ── */
.ann-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  padding-top: 2px;
}
.ann-card__action {
  padding: 0 10px;
  border-radius: var(--dash-r-sm);
  color: var(--dash-ink-2);
  font-weight: 500;
}
.ann-card__action:hover {
  background: var(--dash-n-100);
  color: var(--dash-ink);
}
.ann-card__action--danger {
  color: var(--dash-ink-3);
}
.ann-card__action--danger:hover {
  background: var(--dash-critical-bg);
  color: var(--dash-critical);
}

.ann-card__sk-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.ann-cards__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}

@media (max-width: 599px) {
  .ann-cards {
    padding: 10px;
  }
  .ann-card__facts {
    grid-template-columns: 1fr;
    row-gap: 10px;
  }
}
</style>
