<template>
  <div class="side-panel">
    <div class="panel-head">
      <q-icon name="summarize" size="16px" class="panel-icon" />
      <span class="panel-title">Cutoff Summary</span>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="skeleton-body">
        <div class="eps-shimmer" v-for="n in 4" :key="n" :style="{ width: n % 2 === 0 ? '55%' : '70%', animationDelay: `${n * 0.12}s` }" />
      </div>
      <template v-else>
        <div class="summary-item">
          <span class="summary-label">Payout groups ready for funding</span>
          <span class="summary-value">{{ data.groups_ready_for_funding }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Payout groups under review</span>
          <span class="summary-value">{{ data.groups_under_review }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Employees still needing to acknowledge payslips</span>
          <span class="summary-value">{{ data.employees_needing_acknowledgment }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Salaries still pending release</span>
          <span class="summary-value">{{ data.salaries_pending_release }}</span>
        </div>
        <div class="summary-link">
          <q-btn flat dense no-caps icon="arrow_forward" label="View employee-level issues →" size="11px" color="primary" @click="$emit('viewIssues')" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  data: {
    type: Object,
    default: () => ({
      groups_ready_for_funding: 0,
      groups_under_review: 0,
      employees_needing_acknowledgment: 0,
      salaries_pending_release: 0,
    }),
  },
  loading: { type: Boolean, default: false },
})

defineEmits(['viewIssues'])
</script>

<style scoped>
.side-panel {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border-bottom: 1px solid #f1f3f5;
}

.panel-icon { color: #1a73e8; }

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.panel-body {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.summary-label {
  font-size: 11.5px;
  color: #6b7280;
  line-height: 1.35;
  flex: 1;
}

.summary-value {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  flex-shrink: 0;
}

.summary-link {
  padding-top: 4px;
  border-top: 1px solid #f1f3f5;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@keyframes eps-pulse {
  0%, 100% { opacity: 0.45; transform: scaleX(1); }
  50% { opacity: 0.85; transform: scaleX(1.015); }
}

.eps-shimmer {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e8ecf0 0%, #d1d9e0 50%, #e8ecf0 100%);
  background-size: 200% 100%;
  animation: eps-pulse 1.6s ease-in-out infinite;
  transform-origin: left center;
}
</style>
