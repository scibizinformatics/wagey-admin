<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--sm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="o_contactless" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ row?.employee_name || 'Card taps' }}</div>
            <div class="dash-modal__sub">{{ dayLabel }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="ct-hero">
          <div class="ct-hero__stat">
            <span class="ct-hero__label">First tap</span>
            <span class="ct-hero__value dash-num">{{ timeLabel(row?.first_tap) }}</span>
          </div>
          <div class="ct-hero__stat">
            <span class="ct-hero__label">Last tap</span>
            <span class="ct-hero__value dash-num">{{ timeLabel(row?.last_tap) }}</span>
          </div>
          <div class="ct-hero__stat">
            <span class="ct-hero__label">Duration</span>
            <span class="ct-hero__value dash-num">{{ durationLabel }}</span>
          </div>
        </div>

        <div class="dash-modal__group">
          <p class="dash-modal__group-label">
            Taps
            <span class="ct-list__count">{{ tapCount(row) }} {{ tapCount(row) === 1 ? 'tap' : 'taps' }}</span>
          </p>
          <!-- Delivered newest-first by the API, so no reversed pass is applied —
               the reader sees the same order the payload carried. -->
          <ul class="ct-list">
            <li v-for="(tap, index) in row?.taps || []" :key="`${index}-${tap}`" class="ct-list__item dash-num">
              {{ tap }}
            </li>
          </ul>
        </div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Close" class="dash-modal__cancel" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * A single employee-day's worth of card taps.
 *
 * Renders the fully-normalised row the page already holds — no fetch of its
 * own, matching every other dialog in the app. The tap times are the payload's
 * own 12-hour display strings (server clock) and are shown as-is; the same rule
 * that governs the access-card `last_tap` reading.
 */
import { computed } from 'vue'
import { longLabel } from 'src/composables/utils/calendarDate'
import { tapCount } from 'src/composables/utils/cardTaps'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** A flattened card-taps row — one employee, one day. */
  row: { type: Object, default: null },
})

defineEmits(['update:modelValue'])

const dayLabel = computed(() => longLabel(props.row?.date) || '—')

const durationLabel = computed(() => props.row?.duration || '—')

function timeLabel(tap) {
  return tap || '—'
}
</script>

<style scoped>
/* ── Day summary ── */
.ct-hero {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 11px 12px;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
}
.ct-hero__stat {
  min-width: 0;
}
.ct-hero__label {
  display: block;
  font-size: 11px;
  color: var(--dash-ink-4);
}
.ct-hero__value {
  display: block;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}

/* ── Tap list ── */
.ct-list__count {
  font-weight: 400;
  color: var(--dash-ink-3);
}
.ct-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}
.ct-list__item {
  padding: 7px 10px;
  border-radius: var(--dash-r-sm);
  border: 1px solid var(--dash-line);
  background: var(--dash-surface);
  font-size: 12.5px;
  color: var(--dash-ink);
}
</style>