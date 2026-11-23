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

    <CutoffStageRail
      ref="railRef"
      :data="data"
      :loaded="loaded"
      :loading="loading"
      :totals="totals"
      :fmt-currency="fmtCurrency"
      @filter="onFilter"
    />
  </DashPanel>
</template>

<script setup>
/**
 * Hosts the cutoff stage rail — the Current Cutoff tab's lead element.
 *
 * This was a vertical list of status badges with counts, then a proportional bar
 * that folded to a single full-width block whenever one stage held the whole
 * cutoff. The rail now draws one row per stage, always seven, so the reader sees
 * where the cutoff is stuck, how much is stuck there, and how far it has to go.
 * It doubles as a filter for the payout table below it.
 */
import { computed, ref } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import CutoffStageRail from '@/components/pages/Dashboard/CutoffStageRail.vue'

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  /**
   * Whether the summary actually arrived.
   *
   * Passed down rather than inferred from `data` being empty, because an empty
   * summary and a failed fetch look identical here and mean opposite things.
   */
  loaded: { type: Boolean, default: true },
  /**
   * Money and headcount per stage, keyed like `data`. Forwarded untouched; the
   * rail decides whether it can render it.
   */
  totals: { type: Object, default: () => ({}) },
  /** The app's money formatter, for the per-stage amount under a row. */
  fmtCurrency: { type: Function, default: null },
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
