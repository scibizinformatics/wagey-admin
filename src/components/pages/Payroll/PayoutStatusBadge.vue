<template>
  <q-chip
    :color="statusDef.color"
    :text-color="statusDef.textColor"
    size="11px"
    dense
    square
    class="payout-badge"
  >
    {{ statusDef.label }}
  </q-chip>
</template>

<script setup>
import { computed } from 'vue'
import { getPayoutStatus } from 'src/constants/payoutStatus'

const props = defineProps({
  status: { type: String, default: '' },
})

const statusDef = computed(() => getPayoutStatus(props.status))
</script>

<style scoped>
.payout-badge {
  border-radius: 4px;
  font-weight: 600;
  padding: 0 8px;
  height: 22px;
}
.payout-badge :deep(.q-chip__content) {
  font-size: 10.5px;
}
</style>
