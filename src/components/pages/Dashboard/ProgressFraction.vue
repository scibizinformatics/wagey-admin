<template>
  <span class="frac">
    <span class="frac__text" :class="complete ? 'frac__text--done' : 'frac__text--pending'">
      {{ done }}/{{ total }}
    </span>
    <span class="frac__track">
      <span
        class="frac__fill"
        :style="{ width: `${pct}%`, background: complete ? 'var(--dash-good-mark)' : 'var(--dash-warn-mark)' }"
      />
    </span>
  </span>
</template>

<script setup>
/**
 * "3 of 12 reviewed", as a figure plus a hairline track.
 *
 * The payout table showed these as bare coloured fractions, which left the
 * reader to work out how close a group was to clearing. The track answers that
 * at a glance while the fraction keeps the exact counts.
 */
import { computed } from 'vue'

const props = defineProps({
  done: { type: [Number, String], default: 0 },
  total: { type: [Number, String], default: 0 },
})

const doneNum = computed(() => Number(props.done ?? 0))
const totalNum = computed(() => Number(props.total ?? 0))
const complete = computed(() => totalNum.value > 0 && doneNum.value >= totalNum.value)
const pct = computed(() =>
  totalNum.value > 0 ? Math.min(100, (doneNum.value / totalNum.value) * 100) : 0,
)
</script>

<style scoped>
.frac {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 62px;
}

.frac__text {
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.frac__text--done {
  color: var(--dash-good);
}
.frac__text--pending {
  color: var(--dash-ink-2);
}

.frac__track {
  height: 4px;
  border-radius: var(--dash-r-pill);
  background: var(--dash-n-100);
  overflow: hidden;
}

.frac__fill {
  display: block;
  height: 100%;
  border-radius: var(--dash-r-pill);
  transition: width var(--dash-slow) var(--dash-ease);
}
</style>
