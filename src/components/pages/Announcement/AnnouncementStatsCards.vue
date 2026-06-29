<template>
  <div class="stats-bar">
    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-total"></span>
        Total
      </div>
      <div class="stats-segment-value">{{ total }}</div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-active"></span>
        Active
      </div>
      <div class="stats-segment-value">
        {{ active }}
        <span class="stats-segment-percent percent-active">
          {{ total > 0 ? Math.round((active / total) * 100) : 0 }}%
        </span>
      </div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-scheduled"></span>
        Scheduled
      </div>
      <div class="stats-segment-value">
        {{ scheduled }}
        <span class="stats-segment-percent percent-scheduled">
          {{ total > 0 ? Math.round((scheduled / total) * 100) : 0 }}%
        </span>
      </div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-urgent"></span>
        Urgent
      </div>
      <div class="stats-segment-value">
        {{ urgent }}
        <span class="stats-segment-percent percent-urgent">
          {{ total > 0 ? Math.round((urgent / total) * 100) : 0 }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  total: { type: Number, default: 0 },
  active: { type: Number, default: 0 },
  scheduled: { type: Number, default: 0 },
  urgent: { type: Number, default: 0 },
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
  flex-wrap: wrap;
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
.stats-dot-scheduled {
  background: #f59e0b;
}
.stats-dot-urgent {
  background: #ef4444;
}

.stats-segment-value {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats-segment-percent {
  font-size: 12px;
  font-weight: 500;
}

.percent-active {
  color: #10b981;
}
.percent-scheduled {
  color: #f59e0b;
}
.percent-urgent {
  color: #ef4444;
}

@media (max-width: 768px) {
  .stats-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 12px 16px;
  }
  .stats-divider {
    width: 100%;
    height: 1px;
    margin: 0;
  }
  .stats-segment {
    justify-content: space-between;
  }
}
</style>
