<template>
  <span class="dash-chip" :class="toneClass">
    <span class="dash-chip__dot" />
    {{ statusDef.label }}
  </span>
</template>

<script setup>
/**
 * Status chip for a payout group.
 *
 * Was a QChip drawing on Quasar's stock palette (`green-1` / `green-9`), which
 * belongs to no other surface in this app. It now uses the shared chip language,
 * so a payout status reads the same as a cutoff status or an employee status —
 * tint plus a 1px ring plus a dot, and always with its label, never colour alone.
 */
import { computed } from 'vue'
import { getPayoutStatus } from 'src/constants/payoutStatus'

const props = defineProps({
  status: { type: String, default: '' },
})

const statusDef = computed(() => getPayoutStatus(props.status))

const toneClass = computed(() =>
  statusDef.value.tone && statusDef.value.tone !== 'neutral'
    ? `dash-chip--${statusDef.value.tone}`
    : '',
)
</script>
