<template>
  <div class="man-cards">
    <template v-if="loading && !rows.length">
      <div v-for="n in 4" :key="`sk-${n}`" class="man-card man-card--sk">
        <span class="dash-shimmer" style="width: 40%; height: 13px" />
        <span class="dash-shimmer" style="width: 100%; height: 7px; margin-top: 12px" />
        <span class="dash-shimmer" style="width: 70%; height: 11px; margin-top: 12px" />
      </div>
    </template>

    <div v-else-if="!rows.length" class="dash-empty">
      <span class="dash-featured-icon">
        <q-icon :name="isFiltered ? 'filter_alt_off' : 'o_store'" size="20px" />
      </span>
      <p class="dash-empty__title">
        {{ isFiltered ? 'No positions match these filters' : 'No manning for this day' }}
      </p>
      <p class="dash-empty__sub">
        {{
          isFiltered
            ? 'Nothing on this day matches the site, search or attention filter you set.'
            : 'No site has a position scheduled on this date. Try another day.'
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
        class="man-empty-btn"
        @click="$emit('clear-filters')"
      />
    </div>

    <template v-else>
      <article v-for="row in rows" :key="row.key" class="man-card">
        <div class="man-card__head">
          <div class="man-card__titles">
            <!-- The site leads as an eyebrow rather than a section heading, for
                 the same reason it is a column and not a group row on desktop:
                 every card then stands on its own. -->
            <p class="man-card__site">
              <q-icon name="o_store" size="13px" />
              {{ row.site }}
            </p>
            <h3 class="man-card__position">{{ row.position }}</h3>
          </div>
          <ManningMeter
            :working="row.working"
            :target="mannedTarget(row)"
            :target-noun="row.needed ? 'required' : 'assigned'"
          />
        </div>

        <p class="man-card__figures dash-num">
          <span v-if="showRequired">
            Required
            <strong>{{ row.needed === null ? '—' : row.needed }}</strong>
          </span>
          <span>
            Assigned
            <strong>{{ row.assigned }}</strong>
          </span>
          <span>
            Working
            <strong>{{ row.working }}</strong>
          </span>
        </p>

        <div v-if="attentionChips(row).length" class="man-card__flags">
          <span
            v-for="chip in attentionChips(row)"
            :key="chip.key"
            class="dash-chip man-card__flag"
            :class="chip.tone === 'neutral' ? '' : `dash-chip--${chip.tone}`"
          >
            <span class="dash-chip__dot" />
            {{ chip.label }}
          </span>
        </div>
        <span v-else-if="row.assigned" class="man-card__ok">
          <q-icon name="o_check" size="14px" />
          All present
        </span>
        <span v-else class="man-card__ok">Nobody assigned</span>

        <button
          v-if="row.shifts.length"
          type="button"
          class="man-card__more"
          :aria-expanded="isExpanded(row.key)"
          @click="toggle(row.key)"
        >
          <q-icon :name="isExpanded(row.key) ? 'expand_less' : 'expand_more'" size="16px" />
          {{ isExpanded(row.key) ? 'Hide' : 'Show' }} {{ row.shifts.length }}
          {{ row.shifts.length === 1 ? 'shift' : 'shifts' }}
        </button>

        <ManningShiftBreakdown
          v-if="isExpanded(row.key)"
          :shifts="row.shifts"
          :show-required="showRequired"
        />
      </article>
    </template>
  </div>
</template>

<script setup>
/**
 * The manning board below 1024px.
 *
 * One card per site + position, carrying the same readings as the desktop table
 * in the same order — required, assigned, working, then whatever needs
 * attention — so moving between a laptop and a phone is not moving between two
 * different reports. Row order follows the table, which follows the backend.
 */
import { ref } from 'vue'
import { attentionChips, mannedTarget } from 'src/composables/utils/manning'
import ManningMeter from '@/components/pages/Manning/ManningMeter.vue'
import ManningShiftBreakdown from '@/components/pages/Manning/ManningShiftBreakdown.vue'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  showRequired: { type: Boolean, default: false },
  isFiltered: { type: Boolean, default: false },
})

defineEmits(['clear-filters'])

const expanded = ref(new Set())

function isExpanded(key) {
  return expanded.value.has(key)
}

function toggle(key) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}
</script>

<style scoped>
.man-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.man-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 13px 13px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
}

.man-card--sk {
  display: block;
}

.man-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.man-card__titles {
  min-width: 0;
}

.man-card__site {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 11.5px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.man-card__position {
  margin: 2px 0 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.man-card__figures {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid var(--dash-line-soft);
  font-size: 12px;
  color: var(--dash-ink-3);
}
.man-card__figures strong {
  font-weight: 600;
  color: var(--dash-ink);
}

.man-card__flags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.man-card__flag {
  font-size: 11.5px;
  padding: 2px 8px 2px 6px;
}

.man-card__ok {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--dash-ink-4);
}

.man-card__more {
  display: flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  padding: 4px 8px 4px 5px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
  color: var(--dash-ink-2);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.man-card__more:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.man-card__more:focus-visible {
  outline: 2px solid var(--dash-accent);
  outline-offset: 1px;
}

.man-empty-btn {
  border-color: var(--dash-line-strong);
  color: var(--dash-ink-2);
  border-radius: var(--dash-r-md);
}
</style>
