<template>
  <div class="controls-section">
    <div class="controls-top">
      <h2 class="section-title">Schedule Overview</h2>
      <div class="controls-row">
        <div class="filter-group">
          <q-select
            :model-value="filters.site"
            @update:model-value="updateFilter('site', $event)"
            :options="siteFilterOptions"
            option-value="value"
            option-label="label"
            label="Filter by Site"
            outlined
            dense
            class="filter-select"
            clearable
            emit-value
            map-options
          />
          <q-select
            :model-value="filters.employee"
            @update:model-value="updateFilter('employee', $event)"
            :options="[{ label: 'All Employees', value: null }, ...userOptions]"
            option-value="value"
            option-label="label"
            label="Employee"
            outlined
            dense
            class="filter-select"
            clearable
            emit-value
            map-options
          />
        </div>
        <div class="week-nav">
          <q-btn flat round icon="chevron_left" @click="$emit('prev-week')" class="nav-btn" size="sm" />
          <div class="week-display">
            {{ weekStartStr }} – {{ weekEndStr }}
          </div>
          <q-btn flat round icon="chevron_right" @click="$emit('next-week')" class="nav-btn" size="sm" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  filters: { type: Object, default: () => ({ site: null, employee: null }) },
  siteFilterOptions: { type: Array, default: () => [] },
  userOptions: { type: Array, default: () => [] },
  selectedWeek: {
    type: Object,
    default: () => ({ start: new Date(), end: new Date() }),
  },
});

const emit = defineEmits(['update:filters', 'prev-week', 'next-week']);

const weekStartStr = computed(() =>
  props.selectedWeek.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
);
const weekEndStr = computed(() =>
  props.selectedWeek.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
);

function updateFilter(key, value) {
  emit('update:filters', { ...props.filters, [key]: value });
}
</script>

<style scoped>
.controls-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
}
.controls-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  gap: 10px;
  flex: 1;
  flex-wrap: wrap;
}
.filter-select {
  min-width: 160px;
}
.week-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
}
.nav-btn {
  color: #6b7280 !important;
  width: 28px;
  height: 28px;
  border-radius: 6px !important;
}
.nav-btn:hover {
  background: #f3f4f6 !important;
}
.week-display {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  min-width: 160px;
  text-align: center;
}
</style>
