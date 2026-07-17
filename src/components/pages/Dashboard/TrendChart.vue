<template>
  <VChart class="trend-chart" :option="option" autoresize />
</template>

<script setup>
/**
 * Thin wrapper around vue-echarts for bar / line trend charts.
 * Install:  npm install echarts vue-echarts
 */
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

const props = defineProps({
  labels: { type: Array, required: true },
  values: { type: Array, required: true },
  type: { type: String, default: 'bar' }, // 'bar' | 'line'
  color: { type: String, default: '#1a73e8' },
  valueFormatter: { type: Function, default: (v) => `₱${Number(v).toLocaleString()}` },
})

const option = computed(() => ({
  grid: { left: 48, right: 16, top: 24, bottom: 28 },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v) => props.valueFormatter(v),
  },
  xAxis: {
    type: 'category',
    data: props.labels,
    axisLine: { lineStyle: { color: '#e8ecf0' } },
    axisLabel: { color: '#6b7280', fontSize: 11 },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: '#6b7280',
      fontSize: 11,
      formatter: (v) => (v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : v),
    },
    splitLine: { lineStyle: { color: '#f1f3f5' } },
  },
  series: [
    {
      type: props.type,
      data: props.values,
      itemStyle: { color: props.color, borderRadius: props.type === 'bar' ? [4, 4, 0, 0] : 0 },
      smooth: props.type === 'line',
      symbolSize: 6,
      barMaxWidth: 32,
    },
  ],
}))
</script>

<style scoped>
.trend-chart {
  width: 100%;
  height: 220px;
}

@media (max-width: 768px) {
  .trend-chart {
    height: 180px;
  }
}
</style>
