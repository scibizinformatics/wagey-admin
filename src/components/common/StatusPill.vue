<template>
  <span class="status-pill" :class="[sizeClass]" :style="pillStyle">
    <span class="status-dot" :style="{ background: colors.dot }" />
    {{ displayLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusColor } from 'src/composables/utils/statusColors'

const props = defineProps({
  status: { type: String, default: '' },
  size: { type: String, default: 'sm' },
})

const colors = computed(() => statusColor(props.status))

const sizeClass = computed(() => `pill-${props.size}`)

const pillStyle = computed(() => ({ backgroundColor: colors.value.bg }))

const displayLabel = computed(() => {
  if (!props.status) return '\u2014'
  return props.status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
})
</script>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 20px;
  font-weight: 600;
  white-space: nowrap;
}
.pill-sm {
  font-size: 11px;
  padding: 2px 10px;
}
.pill-md {
  font-size: 12px;
  padding: 4px 14px;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
