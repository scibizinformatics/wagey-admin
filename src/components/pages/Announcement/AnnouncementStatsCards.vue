<template>
  <div class="stats-section">
    <div class="stats-card total-card">
      <div class="stats-icon-wrapper">
        <q-icon name="announcement" class="stats-icon" />
      </div>
      <div class="stats-content">
        <div class="stats-amount">{{ total }}</div>
        <div class="stats-label">Total Announcements</div>
      </div>
    </div>

    <div class="stats-card active-card">
      <div class="stats-icon-wrapper">
        <q-icon name="check_circle" class="stats-icon" />
      </div>
      <div class="stats-content">
        <div class="stats-amount">{{ active }}</div>
        <div class="stats-label">Active</div>
      </div>
    </div>

    <div class="stats-card scheduled-card">
      <div class="stats-icon-wrapper">
        <q-icon name="schedule" class="stats-icon" />
      </div>
      <div class="stats-content">
        <div class="stats-amount">{{ scheduled }}</div>
        <div class="stats-label">Scheduled</div>
      </div>
    </div>

    <div class="stats-card urgent-card">
      <div class="stats-icon-wrapper">
        <q-icon name="priority_high" class="stats-icon" />
      </div>
      <div class="stats-content">
        <div class="stats-amount">{{ urgent }}</div>
        <div class="stats-label">Urgent</div>
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
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.stats-icon-wrapper {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.total-card .stats-icon-wrapper {
  background: #dbeafe;
}
.active-card .stats-icon-wrapper {
  background: #dcfce7;
}
.scheduled-card .stats-icon-wrapper {
  background: #fef3c7;
}
.urgent-card .stats-icon-wrapper {
  background: #fee2e2;
}

.total-card .stats-icon {
  color: #3b82f6;
  font-size: 22px;
}
.active-card .stats-icon {
  color: #22c55e;
  font-size: 22px;
}
.scheduled-card .stats-icon {
  color: #f59e0b;
  font-size: 22px;
}
.urgent-card .stats-icon {
  color: #ef4444;
  font-size: 22px;
}

.stats-amount {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.stats-label {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
}

@media (max-width: 1024px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .stats-card {
    padding: 14px;
  }
  .stats-amount {
    font-size: 22px;
  }
  .stats-icon-wrapper {
    width: 42px;
    height: 42px;
  }
}

@media (max-width: 768px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 12px;
  }
  .stats-card {
    padding: 12px;
    gap: 10px;
  }
  .stats-icon-wrapper {
    width: 38px;
    height: 38px;
  }
  .stats-icon {
    font-size: 20px;
  }
  .stats-amount {
    font-size: 20px;
  }
  .stats-label {
    font-size: 11px;
  }
}
</style>
