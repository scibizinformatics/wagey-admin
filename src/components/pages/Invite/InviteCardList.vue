<template>
  <div class="inv-cards">
    <!-- Loading -->
    <template v-if="loading">
      <div v-for="n in 4" :key="`sk-${n}`" class="inv-card inv-card--sk">
        <div class="inv-card__head">
          <span class="dash-shimmer inv-card__sk-avatar" />
          <div class="inv-card__sk-lines">
            <span class="dash-shimmer" style="width: 62%" />
            <span class="dash-shimmer" style="width: 34%; height: 8px" />
          </div>
        </div>
        <div class="inv-card__facts">
          <span v-for="f in 3" :key="`skf-${n}-${f}`" class="dash-shimmer" style="height: 28px" />
        </div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_mark_email_read'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'Nothing matches this filter' : 'No invitations yet' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'No invitation matches what you typed or the status you picked.'
            : 'Invite an employee and their invitation appears here with its join code and expiry.'
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
        class="inv-cards__empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <!-- Rows -->
    <article
      v-for="row in rows"
      v-else
      :key="row.id"
      class="inv-card"
      :class="{ 'inv-card--lapsed': isLapsed(row) }"
      tabindex="0"
      role="button"
      :aria-label="`View invitation for ${row.email}`"
      @click="$emit('view', row)"
      @keydown.enter.prevent="$emit('view', row)"
    >
      <div class="inv-card__head">
        <span class="inv-card__avatar">{{ inviteInitials(row.email) }}</span>
        <div class="inv-card__identity">
          <p class="inv-card__email">{{ row.email || '—' }}</p>
          <p class="inv-card__sub">{{ row._role }}</p>
        </div>
        <span class="dash-chip inv-card__chip" :class="chipClass(row._state.tone)">
          <span class="dash-chip__dot" />
          {{ row._state.label }}
        </span>
      </div>

      <!-- Three facts, always the same three, so scanning down the list does not
           mean re-reading each card's layout. -->
      <dl class="inv-card__facts">
        <div class="inv-card__fact">
          <dt>Join code</dt>
          <dd>
            <button
              v-if="row.code"
              type="button"
              class="inv-card__code"
              :aria-label="`Copy join code ${row.code}`"
              @click.stop="$emit('copy', row)"
            >
              <span class="inv-card__code-text">{{ row.code }}</span>
              <q-icon name="o_content_copy" size="13px" />
            </button>
            <span v-else class="inv-card__muted">—</span>
          </dd>
        </div>

        <div class="inv-card__fact">
          <dt>Sent</dt>
          <dd>
            {{ formatDate(row.created_at) }}
            <span class="inv-card__rel">{{ relativeDay(row.created_at) }}</span>
          </dd>
        </div>

        <div class="inv-card__fact">
          <dt>{{ row.is_used ? 'Accepted' : 'Expires' }}</dt>
          <dd v-if="row.is_used" class="inv-card__muted">Invite used</dd>
          <dd v-else>
            {{ formatDate(row.expires_at) }}
            <span class="inv-card__rel" :class="expiryClass(row)">
              {{ relativeDay(row.expires_at) }}
            </span>
          </dd>
        </div>
      </dl>
    </article>
  </div>
</template>

<script setup>
/**
 * Tablet and phone view of the invitation queue, standing in for InviteTable
 * below 1024px. Same rows, same derived state — the seven columns become one
 * card per invite so nothing has to scroll sideways.
 */
import { chipClass, formatDate, inviteInitials, relativeDay, daysUntil } from './inviteStatus'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['view', 'copy', 'clear-filters'])

const isLapsed = (row) => row._state.key === 'expired' || row._state.key === 'cancelled'

const expiryClass = (row) => {
  const left = daysUntil(row.expires_at)
  if (left === null) return ''
  if (left < 0) return 'inv-card__rel--past'
  if (left <= 3) return 'inv-card__rel--soon'
  return ''
}
</script>

<style scoped>
.inv-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.inv-card {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 13px 14px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
  cursor: pointer;
  transition:
    border-color var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
}
.inv-card:hover {
  border-color: var(--dash-line-strong);
  box-shadow: var(--dash-shadow-sm);
}
.inv-card:focus-visible {
  outline: none;
  border-color: var(--dash-accent);
  box-shadow: 0 0 0 4px var(--dash-accent-ring);
}
.inv-card--sk,
.inv-card--sk:hover {
  cursor: default;
  border-color: var(--dash-line);
  box-shadow: var(--dash-shadow-xs);
}
.inv-card--lapsed {
  background: var(--dash-n-25);
}

/* ── Head ── */
.inv-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.inv-card__avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  background: var(--dash-n-100);
  border: 1px solid var(--dash-line);
  color: var(--dash-ink-2);
  font-size: 11px;
  font-weight: 600;
}
.inv-card__identity {
  min-width: 0;
  flex: 1;
}
.inv-card__email {
  margin: 0;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv-card__sub {
  margin: 1px 0 0;
  font-size: 11.5px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv-card__chip {
  flex: none;
  align-self: flex-start;
}

/* ── Facts ──
   Three columns on a tablet, stacked label-over-value on a phone. */
.inv-card__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid var(--dash-line-soft);
}
.inv-card__fact {
  min-width: 0;
}
.inv-card__fact dt {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--dash-ink-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.inv-card__fact dd {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv-card__rel {
  display: block;
  font-size: 11px;
  color: var(--dash-ink-4);
}
.inv-card__rel--soon {
  color: var(--dash-warn);
  font-weight: 500;
}
.inv-card__muted {
  color: var(--dash-ink-4);
}

.inv-card__code {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 2px 7px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-n-50);
  color: var(--dash-ink-4);
  font: inherit;
  cursor: pointer;
}
.inv-card__code:active {
  background: var(--dash-n-100);
}
.inv-card__code-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inv-card__sk-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex: none;
}
.inv-card__sk-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.inv-cards__empty-btn {
  margin-top: 4px;
  color: var(--dash-ink-2);
  border-color: var(--dash-line-strong);
}

@media (max-width: 599px) {
  .inv-cards {
    padding: 10px;
  }
  .inv-card__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 10px;
  }
}
</style>
