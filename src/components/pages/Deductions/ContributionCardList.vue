<template>
  <div class="cards">
    <!-- Loading -->
    <template v-if="loading">
      <div v-for="n in 4" :key="`sk-${n}`" class="card card--sk">
        <div class="card__head">
          <div class="card__sk-lines">
            <span class="dash-shimmer" style="width: 58%" />
            <span class="dash-shimmer" style="width: 32%; height: 8px" />
          </div>
        </div>
        <span class="dash-shimmer" style="height: 6px" />
        <div class="card__metrics">
          <span v-for="m in 4" :key="`skm-${n}-${m}`" class="dash-shimmer" style="height: 30px" />
        </div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="!items.length" class="dash-empty cards__empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : emptyIcon" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this search' : emptyTitle }}
      </p>
      <p class="dash-empty__sub">
        {{ isFiltered ? 'No rows in this period match what you typed.' : emptySub }}
      </p>
      <q-btn
        v-if="isFiltered"
        outline
        no-caps
        dense
        size="12px"
        icon="filter_alt_off"
        label="Clear search"
        class="cards__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <!-- Rows -->
    <article v-for="item in items" v-else :key="item.key" class="card">
      <div class="card__head">
        <q-avatar
          v-if="item.avatar"
          size="34px"
          class="card__avatar"
          :style="{ background: item.avatar.color }"
        >
          <span class="card__initials">{{ item.avatar.initials }}</span>
        </q-avatar>

        <div class="card__identity">
          <p class="card__title">{{ item.title }}</p>
          <p v-if="item.subtitle" class="card__sub">{{ item.subtitle }}</p>
        </div>

        <span v-if="item.chip" class="dash-chip card__chip" :class="chipClass(item.chip.tone)">
          <span class="dash-chip__dot" />
          {{ item.chip.label }}
        </span>
      </div>

      <!-- Collected share. On a card there is room to label the bar, which the
           table has to leave to its column header. -->
      <div v-if="item.rate" class="card__rate">
        <div class="card__rate-top">
          <span class="card__rate-label">Collected</span>
          <span class="card__rate-value dash-num" :class="`is-${item.rate.tone}`">
            {{ item.rate.pct.toFixed(1) }}%
          </span>
        </div>
        <div
          class="dash-bar__track"
          :class="`dash-bar__track--${item.rate.tone}`"
          role="progressbar"
          :aria-valuenow="Math.round(item.rate.pct)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="dash-bar__fill"
            :class="`dash-bar__fill--${item.rate.tone}`"
            :style="{ width: `${Math.min(100, Math.max(0, item.rate.pct))}%` }"
          />
        </div>
      </div>

      <dl class="card__metrics">
        <div v-for="m in item.metrics" :key="m.label" class="metric">
          <dt class="metric__label">{{ m.label }}</dt>
          <dd class="metric__value dash-num" :class="{ 'metric__value--strong': m.strong }">
            {{ m.value }}
          </dd>
        </div>
      </dl>

      <!-- Per-contribution breakdown, where the row carries one. -->
      <template v-if="item.details">
        <button
          type="button"
          class="card__toggle dash-focusable"
          :aria-expanded="open === item.key"
          @click="toggle(item.key)"
        >
          <q-icon :name="open === item.key ? 'expand_less' : 'expand_more'" size="17px" />
          <span>
            {{ open === item.key ? 'Hide breakdown' : 'Show breakdown' }}
            <template v-if="item.details.length">({{ item.details.length }})</template>
          </span>
        </button>

        <q-slide-transition>
          <div v-show="open === item.key" class="brk">
            <div v-if="item.details.length" class="brk__list">
              <div v-for="(d, i) in item.details" :key="`${item.key}-${i}`" class="brk__row">
                <span class="brk__name">{{ d.name }}</span>
                <span class="brk__figures dash-num">
                  <span class="brk__fig"> <span class="brk__fig-label">Due</span>{{ d.due }} </span>
                  <span class="brk__fig">
                    <span class="brk__fig-label">Deducted</span>{{ d.deducted }}
                  </span>
                  <span class="brk__fig">
                    <span class="brk__fig-label">Undeducted</span>{{ d.undeducted }}
                  </span>
                </span>
              </div>
            </div>
            <p v-else class="brk__empty">No per-contribution breakdown for this period.</p>
          </div>
        </q-slide-transition>
      </template>
    </article>
  </div>
</template>

<script setup>
/**
 * Contribution rows as cards, for tablet width and below.
 *
 * All three summaries are six-to-eight numeric columns wide. The old tables kept
 * every column at every width and answered a narrow viewport by dropping their
 * own type to 9–11px behind a horizontal scrollbar, which is not a table you can
 * read on an iPad. Cards keep each figure at full size, label it, and remove the
 * sideways scroll.
 *
 * Deliberately generic: the annual, employee and department views differ only in
 * which figures they carry, so they pass a normalised `items` array rather than
 * each shipping a near-identical card component.
 */
import { ref } from 'vue'

defineProps({
  /**
   * [{ key, title, subtitle?, avatar?: { initials, color }, chip?: { label, tone },
   *    rate?: { pct, tone }, metrics: [{ label, value, strong? }],
   *    details?: [{ name, due, deducted, undeducted }] }]
   * All figures arrive pre-formatted — the card does no number formatting.
   */
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
  emptyIcon: { type: String, default: 'o_receipt_long' },
  emptyTitle: { type: String, default: 'Nothing to show' },
  emptySub: { type: String, default: 'Try another period.' },
})

defineEmits(['clear-filters'])

// One card open at a time, matching the table's expander.
const open = ref(null)

function toggle(key) {
  open.value = open.value === key ? null : key
}

function chipClass(tone) {
  return tone ? `dash-chip--${tone}` : ''
}
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 12px;
  padding: 14px 16px 16px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
}

/* ── Head ── */
.card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.card__avatar {
  flex-shrink: 0;
}

.card__initials {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.card__identity {
  flex: 1;
  min-width: 0;
}

.card__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.008em;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__chip {
  flex-shrink: 0;
  text-transform: capitalize;
}

/* ── Collected bar ── */
.card__rate-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.card__rate-label {
  font-size: 12px;
  color: var(--dash-ink-3);
}

.card__rate-value {
  font-size: 12.5px;
  font-weight: 600;
}

.card__rate-value.is-good {
  color: var(--dash-good);
}
.card__rate-value.is-info {
  color: var(--dash-info);
}
.card__rate-value.is-warn {
  color: var(--dash-warn);
}
.card__rate-value.is-critical {
  color: var(--dash-critical);
}

/* Fill tone and stripes come from `.dash-bar__fill--*` in the design system, the
   same classes the table's bar uses. */

/* ── Metrics ── */
.card__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px 12px;
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid var(--dash-line-soft);
}

.metric {
  min-width: 0;
}

.metric__label {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  line-height: 1.3;
}

.metric__value {
  margin: 3px 0 0;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.metric__value--strong {
  font-weight: 600;
  color: var(--dash-ink);
}

/* ── Breakdown ── */
.card__toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  padding: 4px 8px 4px 5px;
  margin-top: -2px;
  border: none;
  border-radius: var(--dash-r-sm);
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-accent);
  cursor: pointer;
  transition: background var(--dash-fast) var(--dash-ease);
}
.card__toggle:hover {
  background: var(--dash-accent-bg);
}

.brk {
  padding: 11px 12px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-50);
  border: 1px solid var(--dash-line-soft);
}

.brk__row {
  padding: 9px 0;
  border-bottom: 1px solid var(--dash-line);
}
.brk__row:first-child {
  padding-top: 0;
}
.brk__row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.brk__name {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  margin-bottom: 5px;
}

.brk__figures {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}

.brk__fig {
  font-size: 12.5px;
  color: var(--dash-ink-2);
}

.brk__fig-label {
  display: block;
  font-size: 11px;
  color: var(--dash-ink-4);
}

.brk__empty {
  margin: 0;
  font-size: 12.5px;
  color: var(--dash-ink-3);
}

/* ── Empty + skeleton ── */
.cards__empty {
  grid-column: 1 / -1;
}

.cards__empty-btn {
  margin-top: 6px;
  padding: 0 12px;
  height: 32px;
  border-radius: var(--dash-r-md);
  font-weight: 500;
  color: var(--dash-ink-2);
}

.card--sk {
  gap: 14px;
}

.card__sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

@media (max-width: 599px) {
  .cards {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  .card__metrics {
    gap: 10px;
  }
}
</style>
