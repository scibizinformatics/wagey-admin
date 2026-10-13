<template>
  <DashPanel
    :icon="chartType === 'bar' ? 'bar_chart' : 'show_chart'"
    :title="title"
    :subtitle="subtitle"
    :loading="loading"
    :empty="!values.length"
    empty-icon="show_chart"
    empty-title="No trend data yet"
    empty-sub="Payroll appears here month by month as each month is run."
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

// The change between the two most recent periods that actually have a figure.
//
// Not the last two slots in the series: the Monthly tab's window runs forward
// from the selected month, so it routinely ends in months payroll has not reached
// yet. Comparing those would report a collapse to zero — "down 100% on December"
// for a December that has not happened — and a figure the reader acts on. Only a
// month carrying money can take part, so empty ones are skipped rather than
// treated as a value of zero.
const subtitle = computed(() => {
  if (props.loading || props.values.length < 2) return ''
  const pairs = props.labels.map((label, i) => ({ label, value: Number(props.values[i]) }))
  const withMoney = pairs.filter((p) => Number.isFinite(p.value) && p.value > 0)
  if (withMoney.length < 2) return ''
  const latest = withMoney[withMoney.length - 1]
  const prior = withMoney[withMoney.length - 2]
  const pct = ((latest.value - prior.value) / prior.value) * 100
  const dir = pct >= 0 ? 'up' : 'down'
  return `${dir} ${Math.abs(pct).toFixed(1)}% on ${prior.label || 'the prior period'}`
})
</script>
