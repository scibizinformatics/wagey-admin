<template>
  <div class="stats-section">
    <div class="stats-card total-card">
      <div class="stats-icon-wrapper">
        <q-icon name="people" class="stats-icon" />
      </div>
      <div class="stats-content">
        <q-skeleton v-if="loading" type="text" class="text-h5" />
        <div v-else class="stats-amount">{{ stats.total }}</div>
        <div class="stats-label">Total Records</div>
      </div>
    </div>

    <div class="stats-card pending-card">
      <div class="stats-icon-wrapper">
        <q-icon name="phone_android" class="stats-icon" />
      </div>
      <div class="stats-content">
        <q-skeleton v-if="loading" type="text" class="text-h5" />
        <div v-else class="stats-amount">{{ stats.app }}</div>
        <div class="stats-label">App</div>
      </div>
    </div>

    <div class="stats-card approved-card">
      <div class="stats-icon-wrapper">
        <q-icon name="computer" class="stats-icon" />
      </div>
      <div class="stats-content">
        <q-skeleton v-if="loading" type="text" class="text-h5" />
        <div v-else class="stats-amount">{{ stats.terminal }}</div>
        <div class="stats-label">Terminal</div>
      </div>
    </div>

    <div class="stats-card scheduled-card">
      <div class="stats-icon-wrapper">
        <q-icon name="schedule" class="stats-icon" />
      </div>
      <div class="stats-content">
        <q-skeleton v-if="loading" type="text" class="text-h5" />
        <div v-else class="stats-amount">{{ stats.system }}</div>
        <div class="stats-label">System</div>
      </div>
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
});
</script>

<style scoped>
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid #e8ecf0;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  transition: box-shadow 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.stats-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stats-icon {
  font-size: 20px;
}

.stats-content {
  min-width: 0;
}

.stats-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stats-amount {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

/* Stat card color variants */
.total-card .stats-icon-wrapper,
.personal-card .stats-icon-wrapper {
  background: #eff6ff;
  color: #3b82f6;
}

.pending-card .stats-icon-wrapper {
  background: #fefce8;
  color: #ca8a04;
}

.approved-card .stats-icon-wrapper,
.active-card .stats-icon-wrapper,
.business-card .stats-icon-wrapper {
  background: #f0fdf4;
  color: #22c55e;
}

.scheduled-card .stats-icon-wrapper,
.custom-card .stats-icon-wrapper {
  background: #f5f3ff;
  color: #8b5cf6;
}

@media (max-width: 1024px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .stats-card {
    padding: 14px 16px;
  }
  .stats-amount {
    font-size: 24px;
  }
}

@media (max-width: 768px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .stats-card {
    padding: 12px 14px;
    gap: 10px;
  }
  .stats-icon-wrapper {
    width: 38px;
    height: 38px;
  }
  .stats-icon {
    font-size: 18px;
  }
  .stats-amount {
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  .stats-card {
    padding: 10px 12px;
    gap: 8px;
  }
  .stats-icon-wrapper {
    width: 32px;
    height: 32px;
  }
  .stats-icon {
    font-size: 16px;
  }
  .stats-amount {
    font-size: 20px;
  }
  .stats-label {
    font-size: 11px;
  }
}
</style>
