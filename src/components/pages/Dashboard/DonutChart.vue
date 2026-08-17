<template>
  <div class="donut">
    <VChart class="donut__chart" :option="option" autoresize />
    <p v-if="total" class="donut__center">
      <span class="donut__center-label">Total</span>
      <span class="donut__center-value dash-num">{{ compactPeso(total) }}</span>
    </p>
  </div>
</template>

<script setup>
/**
 * Part-to-whole donut.
 *
 * Uses the dashboard's fixed categorical order rather than an ad-hoc colour
 * list, so the same component keeps the same hue across every panel that shows
 * it. Slices past the sixth fold into "Other" instead of cycling the ramp — a
 * repeated hue implies two categories are related when they are not.
 *
 * The hole carries the total, which is the number readers reach for first and
 * which a donut otherwise makes them add up themselves.
 */
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent])

// Mirrors the neutral ramp in src/css/dashboard.scss — ECharts renders to
// canvas and cannot read CSS custom properties.
const OTHER = '#98a2b3'
const SURFACE = '#ffffff'
const LINE = '#eaecf0'
const INK = '#101828'
const INK_2 = '#475467'

const props = defineProps({
  data: { type: Array, required: true }, // [{ name, value }]
  // Mirrors the categorical ramp in src/css/dashboard.scss — ECharts renders to
  // canvas and cannot read CSS custom properties, so the hexes are repeated
  // here. Keep the two in step. Inlined rather than referencing a const because
  // a prop default cannot close over a local binding.
  colors: {
    type: Array,
    default: () => ['#2e4fd4', '#0e9384', '#c4320a', '#8b5cf6', '#b58b00', '#be185d'],
  },
  showLegend: { type: Boolean, default: false },
})

// Largest first, so the ramp's strongest hue lands on the biggest slice and the
// reading order round the donut matches the legend.
const slices = computed(() => {
  const sorted = [...props.data]
    .filter((d) => Number(d.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value))

  if (sorted.length <= props.colors.length) return sorted

  const head = sorted.slice(0, props.colors.length - 1)
  const tail = sorted.slice(props.colors.length - 1)
  return [
    ...head,
    {
      name: `Other (${tail.length})`,
      value: tail.reduce((acc, d) => acc + Number(d.value), 0),
      itemStyle: { color: OTHER },
    },
  ]
})

const total = computed(() => slices.value.reduce((acc, d) => acc + Number(d.value), 0))

function compactPeso(v) {
  const n = Number(v)
  if (Math.abs(n) >= 1_000_000) return `₱${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `₱${Math.round(n / 1_000)}k`
  return `₱${n}`
}

const option = computed(() => ({
  color: props.colors,
  tooltip: {
    trigger: 'item',
    backgroundColor: SURFACE,
    borderColor: LINE,
    borderWidth: 1,
    padding: [9, 12],
    textStyle: { color: INK, fontSize: 12 },
    extraCssText:
      'box-shadow: 0 4px 6px -2px rgba(16,24,40,.03), 0 12px 16px -4px rgba(16,24,40,.08); border-radius: 8px;',
    formatter: (p) =>
      `${p.marker} ${p.name}<br/><strong>₱${Number(p.value).toLocaleString('en-PH')}</strong> · ${p.percent}%`,
  },
  legend: props.showLegend
    ? {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 10,
        icon: 'roundRect',
        // Legend text wears text ink; the swatch beside it carries identity.
        textStyle: { fontSize: 12, color: INK_2 },
      }
    : { show: false },
  series: [
    {
      type: 'pie',
      // A wider ring than before, so the hole can hold the total legibly.
      radius: ['62%', '86%'],
      center: props.showLegend ? ['33%', '50%'] : ['50%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      labelLine: { show: false },
      // 2px surface gap between segments, per the dashboard's mark spec.
      itemStyle: { borderColor: SURFACE, borderWidth: 2 },
      emphasis: { scaleSize: 4 },
      data: slices.value,
    },
  ],
}))
</script>

<style scoped>
.donut {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.donut__chart {
  width: 100%;
  height: 196px;
}

/* Pinned to the ring's centre, which shifts left when the legend is shown. */
.donut__center {
  position: absolute;
  top: 50%;
  left: v-bind('showLegend ? "33%" : "50%"');
  transform: translate(-50%, -50%);
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  pointer-events: none;
  text-align: center;
}

.donut__center-label {
  font-size: 12px;
  font-weight: 400;
  color: var(--dash-ink-3);
}

.donut__center-value {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--dash-ink);
}

@media (min-width: 1441px) {
  .donut__chart {
    height: 218px;
  }
  .donut__center-value {
    font-size: 16px;
  }
}

@media (max-width: 1024px) {
  .donut__chart {
    height: 172px;
  }
}
</style>
