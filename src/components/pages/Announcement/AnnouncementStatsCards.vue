<template>
  <div class="ann-stats">
    <article v-for="tile in tiles" :key="tile.key" class="ann-stat">
      <div class="ann-stat__head">
        <span class="ann-stat__mark" :style="{ background: tile.mark }" />
        <span class="ann-stat__label">{{ tile.label }}</span>
      </div>

      <span v-if="loading" class="dash-shimmer ann-stat__sk" />
      <span v-else class="ann-stat__value dash-num" :class="tile.valueClass">{{ tile.value }}</span>

      <!-- The live tile carries a bar: "6 of 14 are on screen right now" is the
           reading this page is opened for, and the bar answers it without making
           anyone divide. -->
      <div v-if="tile.key === 'live' && !loading" class="ann-stat__bar">
        <span
          class="dash-bar__track"
          :class="`dash-bar__track--${liveTone}`"
          role="progressbar"
          :aria-valuenow="Math.round(liveRate)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${Math.round(liveRate)} percent live`"
        >
          <span
            class="dash-bar__fill"
            :class="`dash-bar__fill--${liveTone}`"
            :style="{ width: `${Math.min(100, Math.max(0, liveRate))}%` }"
          />
        </span>
      </div>
      <span v-else-if="!loading" class="ann-stat__foot" :class="{ 'is-blank': !tile.foot }">
        {{ tile.foot || '—' }}
      </span>
    </article>
  </div>
</template>

<script setup>
/**
 * The four readings for the announcement board. They describe the whole board,
 * not the current filter, so narrowing the table never reshuffles the summary
 * under the reader.
 */
import { computed } from 'vue'

const props = defineProps({
  total: { type: Number, default: 0 },
  live: { type: Number, default: 0 },
  scheduled: { type: Number, default: 0 },
  inactive: { type: Number, default: 0 },
  urgent: { type: Number, default: 0 },
  urgentLive: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const liveRate = computed(() => (props.total > 0 ? (props.live / props.total) * 100 : 0))

const liveTone = computed(() => {
  if (props.total === 0 || props.live === 0) return 'neutral'
  return 'good'
})

const tiles = computed(() => [
  {
    key: 'total',
    label: 'Announcements',
    value: props.total,
    mark: 'var(--dash-n-400)',
    foot:
      props.inactive > 0
        ? `${props.inactive} switched off`
        : props.total > 0
          ? 'All switched on'
          : '',
  },
  {
    key: 'live',
    label: 'Live now',
    value: props.live,
    mark: 'var(--dash-good-mark)',
    valueClass: props.live > 0 ? 'is-good' : '',
  },
  {
    key: 'scheduled',
    label: 'Scheduled',
    value: props.scheduled,
    mark: 'var(--dash-info-mark)',
    valueClass: props.scheduled > 0 ? 'is-info' : '',
    foot: props.scheduled > 0 ? 'Not visible yet' : 'Nothing queued',
  },
  {
    key: 'urgent',
    label: 'Urgent',
    value: props.urgent,
    mark: 'var(--dash-critical-mark)',
    valueClass: props.urgent > 0 ? 'is-critical' : '',
    // Urgent is a type, not a state, so the count alone does not say whether any
    // of them are actually on screen — the foot supplies that half.
    foot: props.urgent > 0 ? `${props.urgentLive} of them live` : 'None flagged urgent',
  },
])
</script>

<style scoped>
.ann-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.ann-stat {
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

.ann-stat__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

/* A 3px rule, not a dot: it marks a category beside the label rather than
   reading as a status light, which is what the table's chips are for. */
.ann-stat__mark {
  width: 3px;
  height: 11px;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}

.ann-stat__label {
  font-size: 12px;
  color: var(--dash-ink-3);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ann-stat__value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.024em;
  line-height: 1.1;
  color: var(--dash-ink);
}
.ann-stat__value.is-good {
  color: var(--dash-good);
}
.ann-stat__value.is-info {
  color: var(--dash-info);
}
.ann-stat__value.is-critical {
  color: var(--dash-critical);
}

.ann-stat__foot {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Holds the tile's height against the one tile that carries a bar, so the row's
   baselines line up instead of stepping. */
.ann-stat__foot.is-blank {
  visibility: hidden;
}

.ann-stat__bar {
  padding: 5px 0 3px;
}

.ann-stat__sk {
  width: 58px;
  height: 20px;
}

@media (max-width: 1279px) {
  .ann-stat {
    padding: 11px 12px 12px;
  }
  .ann-stat__value {
    font-size: 20px;
  }
}

/* Tablet: two per row. Four across at this width left every tile narrower than
   its own label, so all four truncated. */
@media (max-width: 1023px) {
  .ann-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 479px) {
  .ann-stats {
    grid-template-columns: 1fr;
  }
  .ann-stat__value {
    font-size: 19px;
  }
}
</style>
