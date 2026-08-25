<template>
  <div class="inv-stats">
    <article v-for="tile in tiles" :key="tile.key" class="inv-stat">
      <div class="inv-stat__head">
        <span class="inv-stat__mark" :style="{ background: tile.mark }" />
        <span class="inv-stat__label">{{ tile.label }}</span>
      </div>

      <span v-if="loading" class="dash-shimmer inv-stat__sk" />
      <span v-else class="inv-stat__value dash-num" :class="tile.valueClass">{{ tile.value }}</span>

      <!-- Acceptance carries a bar rather than a second number: "18 of 24" is
           the reading people want from this tile, and the bar answers it without
           making them do the division. -->
      <div v-if="tile.key === 'accepted' && !loading" class="inv-stat__bar">
        <span
          class="dash-bar__track"
          :class="`dash-bar__track--${rateTone}`"
          role="progressbar"
          :aria-valuenow="Math.round(acceptedRate)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${Math.round(acceptedRate)} percent accepted`"
        >
          <span
            class="dash-bar__fill"
            :class="`dash-bar__fill--${rateTone}`"
            :style="{ width: `${Math.min(100, Math.max(0, acceptedRate))}%` }"
          />
        </span>
      </div>
      <span v-else-if="tile.foot && !loading" class="inv-stat__foot">{{ tile.foot }}</span>
      <span v-else-if="!loading" class="inv-stat__foot inv-stat__foot--blank">&nbsp;</span>
    </article>
  </div>
</template>

<script setup>
/**
 * The four readings for the invitation queue. Same four at every width and in
 * every filter, so switching filter never reshuffles the summary under the
 * reader — the tiles describe the whole queue, the table describes the filter.
 */
import { computed } from 'vue'

const props = defineProps({
  total: { type: Number, default: 0 },
  accepted: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  expiring: { type: Number, default: 0 },
  expired: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const acceptedRate = computed(() => (props.total > 0 ? (props.accepted / props.total) * 100 : 0))

const rateTone = computed(() => {
  if (props.total === 0) return 'neutral'
  if (acceptedRate.value >= 75) return 'good'
  if (acceptedRate.value >= 40) return 'info'
  return 'warn'
})

const tiles = computed(() => [
  {
    key: 'total',
    label: 'Invitations sent',
    value: props.total,
    mark: 'var(--dash-n-400)',
    foot: props.total === 1 ? '1 recipient' : `${props.total} recipients`,
  },
  {
    key: 'accepted',
    label: 'Accepted',
    value: props.accepted,
    mark: 'var(--dash-good-mark)',
    valueClass: 'is-good',
  },
  {
    key: 'pending',
    label: 'Awaiting acceptance',
    value: props.pending,
    mark: 'var(--dash-info-mark)',
    valueClass: props.pending > 0 ? 'is-info' : '',
    // Only the subset that still needs someone to chase it gets called out.
    foot: props.expiring > 0 ? `${props.expiring} expiring within 3 days` : 'None expiring soon',
  },
  {
    key: 'expired',
    label: 'Expired',
    value: props.expired,
    mark: 'var(--dash-neutral-mark)',
    valueClass: props.expired > 0 ? 'is-muted' : '',
    foot: props.expired > 0 ? 'Send a fresh invite to re-invite' : 'Nothing has lapsed',
  },
])
</script>

<style scoped>
.inv-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.inv-stat {
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

.inv-stat__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

/* A 3px rule rather than a dot: it reads as a category marker beside the label
   instead of a status light, which is what the chips in the table are for. */
.inv-stat__mark {
  width: 3px;
  height: 11px;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}

.inv-stat__label {
  font-size: 12px;
  color: var(--dash-ink-3);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inv-stat__value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.024em;
  line-height: 1.1;
  color: var(--dash-ink);
}
.inv-stat__value.is-good {
  color: var(--dash-good);
}
.inv-stat__value.is-info {
  color: var(--dash-info);
}
.inv-stat__value.is-muted {
  color: var(--dash-ink-2);
}

.inv-stat__foot {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Holds the tile's height steady against the one tile that carries a bar, so
   the row's baselines line up instead of stepping. */
.inv-stat__foot--blank {
  visibility: hidden;
}

.inv-stat__bar {
  padding: 5px 0 3px;
}

.inv-stat__sk {
  width: 58px;
  height: 20px;
}

/* Laptop: four tiles still fit, they just get tighter. */
@media (max-width: 1279px) {
  .inv-stat__value {
    font-size: 20px;
  }
  .inv-stat {
    padding: 11px 12px 12px;
  }
}

/* Tablet: two per row. Four across at this width left each tile narrower than
   its own label, which truncated every one of them. */
@media (max-width: 1023px) {
  .inv-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 479px) {
  .inv-stats {
    grid-template-columns: 1fr;
  }
  .inv-stat__value {
    font-size: 19px;
  }
}
</style>
