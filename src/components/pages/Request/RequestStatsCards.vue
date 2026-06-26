<template>
  <div class="stats-bar">
    <template v-if="activeTab === 'leave'">
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-total"></span>
          Total Leave
        </div>
        <div class="stats-segment-value">{{ leaveStats.total }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-pending"></span>
          Pending
        </div>
        <div class="stats-segment-value">{{ leaveStats.pending }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-approved"></span>
          Approved
        </div>
        <div class="stats-segment-value">{{ leaveStats.approved }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-rejected"></span>
          Rejected
        </div>
        <div class="stats-segment-value">{{ leaveStats.rejected }}</div>
      </div>
    </template>

    <template v-else-if="activeTab === 'swap'">
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-total"></span>
          Total Requests
        </div>
        <div class="stats-segment-value">{{ swapStatistics.total }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-pending"></span>
          Pending
        </div>
        <div class="stats-segment-value">{{ swapStatistics.pending }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-approved"></span>
          Approved
        </div>
        <div class="stats-segment-value">{{ swapStatistics.approved }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-rejected"></span>
          Rejected
        </div>
        <div class="stats-segment-value">{{ swapStatistics.rejected }}</div>
      </div>
    </template>

    <template v-else-if="activeTab === 'overtime'">
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-overtime"></span>
          Total Overtime
        </div>
        <div class="stats-segment-value">{{ overtimeStats.total }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-pending"></span>
          Pending
        </div>
        <div class="stats-segment-value">{{ overtimeStats.pending }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-approved"></span>
          Approved
        </div>
        <div class="stats-segment-value">{{ overtimeStats.approved }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-rejected"></span>
          Rejected
        </div>
        <div class="stats-segment-value">{{ overtimeStats.rejected }}</div>
      </div>
    </template>

    <template v-else>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-total"></span>
          Total Requests
        </div>
        <div class="stats-segment-value">{{ caStatistics.total }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-pending"></span>
          Pending
        </div>
        <div class="stats-segment-value">{{ caStatistics.pending }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-approved"></span>
          Approved
        </div>
        <div class="stats-segment-value">{{ caStatistics.approved }}</div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-segment">
        <div class="stats-segment-label">
          <span class="stats-dot stats-dot-rejected"></span>
          Rejected
        </div>
        <div class="stats-segment-value">{{ caStatistics.rejected }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  activeTab: String,
  leaveStats: Object,
  overtimeStats: Object,
  caStatistics: Object,
  swapStatistics: Object,
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
  background: #3b82f6;
}

.stats-dot-overtime {
  background: #8b5cf6;
}

.stats-dot-pending {
  background: #f59e0b;
}

.stats-dot-approved {
  background: #22c55e;
}

.stats-dot-rejected {
  background: #ef4444;
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
