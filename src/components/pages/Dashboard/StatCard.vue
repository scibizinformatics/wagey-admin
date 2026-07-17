<template>
  <div class="stat-card">
    <div class="stat-icon" :style="{ background: iconBg, color: iconColor }">
      <q-icon :name="icon" size="20px" />
    </div>
    <div class="stat-info">
      <div class="stat-label">{{ label }}</div>
      <q-skeleton v-if="loading" type="text" width="36px" class="stat-skeleton" />
      <div v-else class="stat-value">{{ value }}</div>
      <div v-if="sub" class="stat-sub" :class="subClass">{{ sub }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  sub: { type: String, default: '' },
  subClass: { type: String, default: '' },
  iconBg: { type: String, default: '#e8f0fe' },
  iconColor: { type: String, default: '#1a73e8' },
  loading: { type: Boolean, default: false },
})
</script>

<style scoped>
.stat-card {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-info {
  min-width: 0;
}
.stat-label {
  font-size: 11.5px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  line-height: 1.25;
}
.stat-skeleton {
  margin-top: 2px;
}
.stat-sub {
  font-size: 10.5px;
  color: #9ca3af;
  margin-top: 1px;
}
.stat-sub.positive {
  color: #16a34a;
}
.stat-sub.negative {
  color: #dc2626;
}

@media (max-width: 1024px) {
  .stat-card {
    padding: 14px 16px;
    gap: 12px;
  }
  .stat-icon {
    width: 38px;
    height: 38px;
  }
  .stat-value {
    font-size: 18px;
  }
}
@media (max-width: 768px) {
  .stat-card {
    padding: 12px 14px;
    gap: 10px;
  }
  .stat-icon {
    width: 34px;
    height: 34px;
  }
  .stat-label {
    font-size: 10.5px;
    white-space: normal;
  }
  .stat-value {
    font-size: 16px;
  }
}
</style>
