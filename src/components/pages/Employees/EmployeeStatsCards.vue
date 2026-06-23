<template>
  <div class="stats-bar">
    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-total"></span>
        Total Employees
      </div>
      <div class="stats-segment-value">{{ stats.total }}</div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-active"></span>
        Active
      </div>
      <div class="stats-segment-value">
        {{ stats.active }}
        <span class="stats-segment-percent percent-active">
          {{ stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0 }}%
        </span>
      </div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-terminated"></span>
        Terminated
      </div>
      <div class="stats-segment-value">
        {{ stats.terminated }}
        <span class="stats-segment-percent percent-terminated">
          {{ stats.total > 0 ? Math.round((stats.terminated / stats.total) * 100) : 0 }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({ total: 0, active: 0, terminated: 0 }),
  },
})
</script>

<style scoped>
.stats-bar {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-bottom: 1px solid #f1f3f5;
  padding: 10px 24px;
  gap: 0;
}

.stats-segment {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats-divider {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
  margin: 0 20px;
  flex-shrink: 0;
}

.stats-segment-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  white-space: nowrap;
}

.stats-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stats-dot-total {
  background: #6366f1;
}
.stats-dot-active {
  background: #10b981;
}
.stats-dot-terminated {
  background: #f87171;
}

.stats-segment-value {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.stats-segment-percent {
  font-size: 11px;
  font-weight: 500;
}

.percent-active {
  color: #10b981;
}
.percent-terminated {
  color: #f87171;
}

@media (max-width: 1440px) {
  .stats-bar {
    padding: 10px 20px;
  }
  .stats-divider {
    margin: 0 16px;
  }
}

@media (max-width: 1024px) {
  .stats-bar {
    padding: 10px 16px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .stats-divider {
    margin: 0 12px;
  }
  .stats-segment-value {
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 16px;
  }
  .stats-divider {
    display: none;
  }
}
</style>
