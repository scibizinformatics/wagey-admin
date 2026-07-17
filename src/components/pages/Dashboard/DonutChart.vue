<template>
  <VChart class="donut-chart" :option="option" autoresize />
</template>

<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent])

const props = defineProps({
  data: { type: Array, required: true }, // [{ name, value }]
  colors: {
    type: Array,
    default: () => ['#6d5ce8', '#22c55e', '#f59e0b', '#1a73e8', '#ec4899', '#06b6d4'],
  },
  showLegend: { type: Boolean, default: false },
})

const option = computed(() => ({
  color: props.colors,
  tooltip: {
    trigger: 'item',
    valueFormatter: (v) => `₱${Number(v).toLocaleString()}`,
  },
  legend: props.showLegend
    ? {
        orient: 'vertical',
        right: 4,
        top: 'center',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11, color: '#374151' },
      }
    : { show: false },
  series: [
    {
      type: 'pie',
      radius: ['55%', '80%'],
      center: props.showLegend ? ['35%', '50%'] : ['50%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      labelLine: { show: false },
      data: props.data,
    },
  ],
}))
</script>

<style scoped>
.donut-chart {
  width: 100%;
  height: 200px;
}

@media (max-width: 768px) {
  .donut-chart {
    height: 170px;
  }
}
</style>
