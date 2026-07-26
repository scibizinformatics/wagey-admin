<template>
  <div v-if="progress.total > 0" class="migration-badge" :title="tooltipText">
    <div class="badge-bar">
      <div class="badge-fill" :style="{ width: progress.percent + '%' }" />
    </div>
    <span class="badge-text">{{ progress.completed }}/{{ progress.total }}</span>
    <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 8]">
      <div class="tooltip-list">
        <div v-for="(name, key) in pageNames" :key="key" class="tooltip-row">
          <q-icon :name="flags[key] ? 'check_circle' : 'radio_button_unchecked'" :color="flags[key] ? 'positive' : 'grey-5'" size="14px" />
          <span>{{ name }}</span>
        </div>
      </div>
    </q-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDisbursementFeatureFlags } from 'src/composables/disbursement/useDisbursementFeatureFlags'

const { flags, migrationProgress, pageNames } = useDisbursementFeatureFlags()

const progress = computed(() => migrationProgress.value)

const tooltipText = computed(() => `${progress.value.completed} of ${progress.value.total} pages migrated`)
</script>

<style scoped>
.migration-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  position: relative;
}
.badge-bar {
  width: 40px;
  height: 4px;
  background: #e8ecf0;
  border-radius: 4px;
  overflow: hidden;
}
.badge-fill {
  height: 100%;
  background: #1a73e8;
  border-radius: 4px;
  transition: width 0.4s ease;
}
.badge-text {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
}
.tooltip-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
</style>
