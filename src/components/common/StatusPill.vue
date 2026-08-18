<template>
  <span class="dash-chip" :class="[toneClass, `pill--${size}`]">
    <span class="dash-chip__dot" />
    {{ displayLabel }}
  </span>
</template>

<script setup>
/**
 * Status chip, used across the payroll and disbursement pages.
 *
 * Built on the shared `.dash-chip` language rather than a private palette of hex
 * triples, so a status here reads the same as one on the dashboard, employees or
 * attendance pages — and its text, tint and ring always agree.
 */
import { computed } from 'vue'
import { statusTone } from 'src/composables/utils/statusColors'

const props = defineProps({
  status: { type: String, default: '' },
  /** sm | md */
  size: { type: String, default: 'sm' },
})

const tone = computed(() => statusTone(props.status))

const toneClass = computed(() =>
  tone.value === 'neutral' ? '' : `dash-chip--${tone.value}`,
)

const displayLabel = computed(() => {
  if (!props.status) return '—'
  // "pending_review" -> "Pending review": sentence case, not Title Case, which
  // is what the rest of the app uses for status labels.
  const words = String(props.status).replace(/_/g, ' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
})
</script>

<style scoped>
.pill--md {
  font-size: 12.5px;
  padding: 4px 11px 4px 9px;
}

/* `violet` is local to payroll statuses (awaiting acknowledgment, ready for
   funding) — it is not one of the reserved status tones, so it is defined here
   rather than in the design system. */
.dash-chip--violet {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #6941c6;
}
</style>
