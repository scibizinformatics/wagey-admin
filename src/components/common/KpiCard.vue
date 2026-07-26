<template>
  <div class="kpi-card" :class="{ 'kpi-card--loading': loading }">
    <div v-if="loading" class="kpi-shimmer">
      <div class="eps-shimmer" style="width:36px;height:36px;border-radius:10px" />
      <div class="eps-shimmer" style="width:60%;height:14px;margin-top:12px" />
      <div class="eps-shimmer" style="width:40%;height:10px;margin-top:6px" />
    </div>
    <template v-else>
      <div class="kpi-icon" :style="{ background: iconBg, color: iconColor }">
        <q-icon :name="icon" size="18px" />
      </div>
      <div class="kpi-value" :style="{ color: valueColor }">{{ displayValue }}</div>
      <div class="kpi-label">{{ label }}</div>
      <div v-if="trend !== undefined" class="kpi-trend" :class="trend >= 0 ? 'trend-up' : 'trend-down'">
        <q-icon :name="trend >= 0 ? 'arrow_upward' : 'arrow_downward'" size="12px" />
        <span>{{ Math.abs(trend) }}%</span>
        <span v-if="trendLabel" class="trend-label">{{ trendLabel }}</span>
      </div>
      <slot name="footer" />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, default: 'payments' },
  label: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
  currency: { type: Boolean, default: false },
  trend: { type: Number, default: undefined },
  trendLabel: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  iconBg: { type: String, default: '#e8f0fe' },
  iconColor: { type: String, default: '#1a73e8' },
  valueColor: { type: String, default: '#111827' },
})

const displayValue = computed(() => {
  if (props.value === '' || props.value === null || props.value === undefined) return '\u2014'
  if (props.currency) {
    const num = typeof props.value === 'string' ? parseFloat(props.value) : props.value
    if (isNaN(num)) return '\u2014'
    return `\u20B1${num.toLocaleString('en-PH')}`
  }
  return props.value
})
</script>

<style scoped>
.kpi-card {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kpi-card--loading {
  padding: 16px;
}
.kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.kpi-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}
.kpi-label {
  font-size: 12px;
  color: #6b7280;
}
.kpi-trend {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  font-weight: 600;
  margin-top: 2px;
}
.trend-up { color: #16a34a; }
.trend-down { color: #dc2626; }
.trend-label {
  font-weight: 400;
  color: #9ca3af;
  margin-left: 2px;
}
.kpi-shimmer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.eps-shimmer {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e8ecf0 0%, #d1d9e0 50%, #e8ecf0 100%);
  background-size: 200% 100%;
  animation: eps-pulse 1.6s ease-in-out infinite;
  transform-origin: left center;
}
@keyframes eps-pulse {
  0%, 100% { opacity: 0.45; transform: scaleX(1); }
  50% { opacity: 0.85; transform: scaleX(1.015); }
}
</style>
