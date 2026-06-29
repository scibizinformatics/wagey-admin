<template>
  <div class="stats-bar">
    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-total"></span>
        Total Invitations
      </div>
      <div class="stats-segment-value">{{ total }}</div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-used"></span>
        Used
      </div>
      <div class="stats-segment-value">
        {{ used }}
        <span class="stats-segment-percent percent-used">
          {{ total > 0 ? Math.round((used / total) * 100) : 0 }}%
        </span>
      </div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-unused"></span>
        Unused
      </div>
      <div class="stats-segment-value">
        {{ unused }}
        <span class="stats-segment-percent percent-unused">
          {{ total > 0 ? Math.round((unused / total) * 100) : 0 }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  total: { type: Number, default: 0 },
  unused: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
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
.stats-dot-used {
  background: #10b981;
}
.stats-dot-unused {
  background: #f59e0b;
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

.percent-used {
  color: #10b981;
}
.percent-unused {
  color: #f59e0b;
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
