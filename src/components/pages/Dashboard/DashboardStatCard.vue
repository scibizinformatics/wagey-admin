<template>
  <div class="dash-stat-card">
    <div class="dash-stat-icon" :style="{ background: iconBg, color: iconColor }">
      <q-icon :name="icon" size="20px" />
    </div>
    <div class="dash-stat-info">
      <div class="dash-stat-label">{{ label }}</div>
      <q-skeleton v-if="loading" type="text" width="36px" class="dash-stat-skeleton" />
      <div v-else class="dash-stat-value" :style="valueStyle">{{ value }}</div>
      <div v-if="subtitle" class="dash-stat-subtitle">{{ subtitle }}</div>
      <div v-if="sub" class="dash-stat-sub" :class="subClass">{{ sub }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  subtitle: { type: String, default: '' },
  sub: { type: String, default: '' },
  subClass: { type: String, default: '' },
  iconBg: { type: String, default: '#e8f0fe' },
  iconColor: { type: String, default: '#1a73e8' },
  valueColor: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const valueStyle = computed(() => {
  if (!props.valueColor) return {}
  return { color: props.valueColor }
})
</script>

<style scoped>
.dash-stat-card {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.dash-stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dash-stat-info {
  min-width: 0;
}
.dash-stat-label {
  font-size: 11.5px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dash-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  line-height: 1.25;
}
.dash-stat-skeleton {
  margin-top: 2px;
}
.dash-stat-subtitle {
  font-size: 10.5px;
  color: #9ca3af;
  margin-top: 1px;
}
.dash-stat-sub {
  font-size: 10.5px;
  color: #9ca3af;
  margin-top: 1px;
}
.dash-stat-sub.positive {
  color: #16a34a;
}
.dash-stat-sub.negative {
  color: #dc2626;
}

@media (max-width: 1024px) {
  .dash-stat-card {
    padding: 14px 16px;
    gap: 12px;
  }
  .dash-stat-icon {
    width: 38px;
    height: 38px;
  }
  .dash-stat-value {
    font-size: 18px;
  }
}
@media (max-width: 768px) {
  .dash-stat-card {
    padding: 12px 14px;
    gap: 10px;
  }
  .dash-stat-icon {
    width: 34px;
    height: 34px;
  }
  .dash-stat-label {
    font-size: 10.5px;
    white-space: normal;
  }
  .dash-stat-value {
    font-size: 16px;
  }
}
</style>
