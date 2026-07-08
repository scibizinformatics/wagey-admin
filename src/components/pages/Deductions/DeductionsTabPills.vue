<template>
  <div class="tabs-section">
    <div class="tab-pills">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-pill', { active: modelValue === tab.value }]"
        @click="$emit('update:modelValue', tab.value)"
      >
        <q-icon :name="tab.icon" class="tab-pill-icon" />
        <span>{{ tab.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true,
  },
})

defineEmits(['update:modelValue'])

const tabs = [
  { label: 'Annual Summary', value: 'annual', icon: 'calendar_view_year' },
  { label: 'Employee Summary', value: 'employee', icon: 'people' },
  { label: 'Department Summary', value: 'department', icon: 'business' },
]
</script>

<style scoped>
.tabs-section {
  padding: 10px 14px;
  border-bottom: 1px solid #f1f3f5;
}

.tab-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.tab-pill:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.tab-pill.active {
  background: #102335;
  border-color: #102335;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(16, 35, 53, 0.3);
}

.tab-pill-icon {
  font-size: 15px;
}

@media (min-width: 1440px) {
  .tabs-section { padding: 12px 18px; }
  .tab-pill { padding: 9px 18px; font-size: 14px; }
}

@media (max-width: 1024px) {
  .tabs-section { padding: 8px 12px; }
  .tab-pill { padding: 6px 12px; font-size: 12px; }
}

@media (max-width: 768px) {
  .tabs-section { padding: 8px 10px; }
  .tab-pills { gap: 5px; }
  .tab-pill { padding: 7px 12px; font-size: 12px; flex: 1; justify-content: center; }
}

@media (max-width: 480px) {
  .tab-pill span { display: none; }
  .tab-pill-icon { font-size: 16px; }
  .tab-pill { padding: 8px 14px; }
}
</style>
