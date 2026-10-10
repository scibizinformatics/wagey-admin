<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <ConfirmCard
      v-if="confirm"
      :confirm="confirm"
      :loading="loading"
      @ok="$emit('confirm')"
      @cancel="$emit('update:modelValue', false)"
    />
  </q-dialog>
</template>

<script setup>
/**
 * A `q-dialog` around the shared confirm chrome.
 *
 * This is the host for flows that hold a `confirm` ref in a page and recompute
 * its facts from live reactive state — Requests, Access Cards, Funding and
 * Disbursement all do, and none of them should have to restructure to match a
 * component that renders imperatively.
 *
 * The chrome itself lives in `ConfirmCard.vue`, extracted so that a feature
 * needing something the plain `confirm` object cannot say — a recap list, say —
 * can reuse the exact same head and footer instead of retyping it.
 *
 * The mapping in the template is the whole difference between the two hosts:
 * `ConfirmCard` emits `ok` / `cancel` because those are the names Quasar's
 * Dialog plugin listens for, and this component re-exposes them as `confirm` and
 * `update:modelValue` so its callers are untouched.
 *
 * There is deliberately no close button in the head. Cancel is the only exit, so
 * a stray Enter, Escape or backdrop click cannot commit something the reader did
 * not actually decide on — `boot/dialogA11y` is what keeps the backdrop from
 * stealing focus while the shake still reads.
 */
import ConfirmCard from '@/components/common/ConfirmCard.vue'

defineProps({
  modelValue: Boolean,
  // The object a `build*Confirm` helper returns. Null while nothing is pending.
  confirm: { type: Object, default: null },
  loading: Boolean,
})

defineEmits(['update:modelValue', 'confirm'])
</script>
