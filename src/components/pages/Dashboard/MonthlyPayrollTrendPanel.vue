<template>
  <DashPanel
    :icon="chartType === 'bar' ? 'bar_chart' : 'show_chart'"
    :title="title"
    :subtitle="subtitle"
    :loading="loading"
    :empty="!values.length"
    empty-icon="show_chart"
    empty-title="No trend data yet"
    empty-sub="A point appears here for each month once its payroll is closed."
    skeleton="chart"
  >
    <TrendChart :labels="labels" :values="values" :type="chartType" :color="color" />
  </DashPanel>
</template>

<script setup>
/**
 * Payroll over time. Used on both summary tabs — as a line for the rolling
 * six-month view, as bars for the twelve-month annual view.
 *
 * The subtitle carries the period-over-period change, so the panel answers
 * "is payroll going up?" without the reader having to compare two bars by eye.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import TrendChart from '@/components/pages/Dashboard/TrendChart.vue'

const props = defineProps({
  title: { type: String, default: 'Payroll trend' },
  labels: { type: Array, default: () => [] },
  values: { type: Array, default: () => [] },
  chartType: { type: String, default: 'line' }, // 'line' | 'bar'
  color: { type: String, default: '#2e4fd4' },
  loading: { type: Boolean, default: false },
})

const subtitle = computed(() => {
  if (props.loading || props.values.length < 2) return ''
  const vals = props.values.map(Number)
  const latest = vals[vals.length - 1]
  const prior = vals[vals.length - 2]
  if (!prior) return ''
  const pct = ((latest - prior) / prior) * 100
  const dir = pct >= 0 ? 'up' : 'down'
  return `${dir} ${Math.abs(pct).toFixed(1)}% on ${props.labels[props.labels.length - 2] ?? 'the prior period'}`
})
</script>
