<template>
  <div class="stats-bar">
    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-total"></span>
        Total Records
      </div>
      <q-skeleton v-if="loading" type="text" width="40px" class="stats-segment-value" />
      <div v-else class="stats-segment-value">{{ stats.total }}</div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-app"></span>
        App
      </div>
      <q-skeleton v-if="loading" type="text" width="40px" class="stats-segment-value" />
      <div v-else class="stats-segment-value">{{ stats.app }}</div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-terminal"></span>
        Terminal
      </div>
      <q-skeleton v-if="loading" type="text" width="40px" class="stats-segment-value" />
      <div v-else class="stats-segment-value">{{ stats.terminal }}</div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-system"></span>
        System
      </div>
      <q-skeleton v-if="loading" type="text" width="40px" class="stats-segment-value" />
      <div v-else class="stats-segment-value">{{ stats.system }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  stats: {
    type: Object,
    default: () => ({
      total: 0,
      system: 0,
      app: 0,
      terminal: 0,
    }),
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
.stats-dot-app {
  background: #ca8a04;
}
.stats-dot-terminal {
  background: #22c55e;
}
.stats-dot-system {
  background: #8b5cf6;
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
