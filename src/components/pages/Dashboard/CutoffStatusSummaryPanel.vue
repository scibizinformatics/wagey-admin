<template>
  <DashPanel
    icon="linear_scale"
    title="Cutoff pipeline"
    :subtitle="subtitle"
    tone="accent"
    :loading="loading"
  >
    <template #actions>
      <q-btn
        v-if="activeFilter"
        flat
        dense
        no-caps
        size="11px"
        icon="close"
        label="Clear filter"
        class="clear-btn"
        @click="clear"
      />
    </template>

    <CutoffStageRail ref="railRef" :data="data" :loading="loading" @filter="onFilter" />
  </DashPanel>
</template>

<script setup>
/**
 * Hosts the cutoff stage rail — the Current Cutoff tab's lead element.
 *
 * This was a vertical list of status badges with counts. The list gave the
 * numbers but not the shape: which stage is holding the most groups, and how
 * far the cutoff has moved overall. The rail encodes both, and doubles as a
 * filter for the payout table below it.
 */
import { computed, ref } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import CutoffStageRail from '@/components/pages/Dashboard/CutoffStageRail.vue'

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['filter'])

const activeFilter = ref(null)
const railRef = ref(null)

const total = computed(() =>
  Object.values(props.data ?? {}).reduce((acc, v) => acc + Number(v ?? 0), 0),
)

const subtitle = computed(() => {
  if (props.loading || !total.value) return ''
  return `${total.value} payout ${total.value === 1 ? 'group' : 'groups'} in this cutoff`
})

function onFilter(status) {
  activeFilter.value = status
  emit('filter', status)
}

function clear() {
  // Route through the rail so its own selected state clears with the filter.
  railRef.value?.reset()
}
</script>

<style scoped>
.clear-btn {
  color: var(--dash-ink-3);
}
</style>
