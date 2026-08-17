<template>
  <VChart class="trend-chart" :option="option" autoresize />
</template>

<script setup>
/**
 * Bar / line trend chart.
 *
 * Restyled to the dashboard's chart language: recessive axes and gridlines, a
 * 2px line weight, 8px markers, rounded data-ends anchored to the baseline, and
 * a tooltip that matches the panel chrome. A single series carries no legend —
 * the panel title already names it.
 *
 * Requires: echarts, vue-echarts.
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
  color: { type: String, default: '#2e4fd4' },
  valueFormatter: { type: Function, default: (v) => `₱${Number(v).toLocaleString('en-PH')}` },
})

// ECharts is canvas-rendered, so it cannot resolve CSS custom properties. These
// mirror the neutral ramp in src/css/dashboard.scss — keep them in step.
const INK = '#101828'
const INK_3 = '#667085'
const LINE = '#eaecf0'
const LINE_SOFT = '#f2f4f7'
const SURFACE = '#ffffff'

// Peso figures get compact axis labels; the tooltip still shows them in full.
function compactPeso(v) {
  const n = Number(v)
  if (Math.abs(n) >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `₱${Math.round(n / 1_000)}k`
  return `₱${n}`
}

const option = computed(() => ({
  grid: { left: 8, right: 12, top: 18, bottom: 4, containLabel: true },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: props.type === 'line' ? 'line' : 'shadow',
      lineStyle: { color: INK_3, width: 1, type: 'dashed' },
      shadowStyle: { color: 'rgba(46, 79, 212, 0.06)' },
    },
    backgroundColor: SURFACE,
    borderColor: LINE,
    borderWidth: 1,
    padding: [9, 12],
    textStyle: { color: INK, fontSize: 12 },
    extraCssText:
      'box-shadow: 0 4px 6px -2px rgba(16,24,40,.03), 0 12px 16px -4px rgba(16,24,40,.08); border-radius: 8px;',
    valueFormatter: (v) => props.valueFormatter(v),
  },
  xAxis: {
    type: 'category',
    data: props.labels,
    axisLine: { lineStyle: { color: LINE } },
    axisLabel: { color: INK_3, fontSize: 11.5 },
    axisTick: { show: false },
    boundaryGap: props.type === 'bar',
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: INK_3, fontSize: 11.5, formatter: compactPeso },
    // Gridlines are reference, not content: solid but barely there. Dashed rules
    // add texture the eye has to resolve before it can read the data.
    splitLine: { lineStyle: { color: LINE_SOFT } },
  },
  series: [
    {
      type: props.type,
      name: 'Payroll',
      data: props.values,
      itemStyle: {
        color: props.color,
        // Rounded data-end only, anchored square to the baseline.
        borderRadius: props.type === 'bar' ? [4, 4, 0, 0] : 0,
      },
      lineStyle: props.type === 'line' ? { width: 2, color: props.color } : undefined,
      areaStyle:
        props.type === 'line'
          ? {
              // A whisper of fill to seat the line on the baseline without
              // reading as an area chart.
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: `${props.color}22` },
                  { offset: 1, color: `${props.color}00` },
                ],
              },
            }
          : undefined,
      smooth: props.type === 'line' ? 0.28 : false,
      symbol: 'circle',
      symbolSize: 8,
      showSymbol: props.type === 'line',
      emphasis: { itemStyle: { borderColor: SURFACE, borderWidth: 2 } },
      barMaxWidth: 30,
    },
  ],
}))
</script>

<style scoped>
.trend-chart {
  width: 100%;
  height: 210px;
  min-height: 160px;
  flex: 1;
}

@media (min-width: 1441px) {
  .trend-chart {
    height: 236px;
  }
}

@media (max-width: 1024px) {
  .trend-chart {
    height: 180px;
  }
}
</style>
