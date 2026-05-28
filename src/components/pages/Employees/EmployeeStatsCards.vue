<template>
  <div class="stats-section">
    <div class="stats-card stats-total">
      <div class="stats-icon-wrapper stats-icon-blue">
        <q-icon name="people" />
      </div>
      <div class="stats-content">
        <div class="stats-label">Total Employees</div>
        <div class="stats-amount">{{ stats.total }}</div>
        <div class="stats-delta stats-delta-neutral">All time</div>
      </div>
    </div>

    <div class="stats-card stats-active">
      <div class="stats-icon-wrapper stats-icon-green">
        <q-icon name="check_circle" />
      </div>
      <div class="stats-content">
        <div class="stats-label">Active</div>
        <div class="stats-amount">{{ stats.active }}</div>
        <div class="stats-delta stats-delta-positive">
          {{ stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0 }}% of total
        </div>
      </div>
    </div>

    <div class="stats-card stats-terminated">
      <div class="stats-icon-wrapper stats-icon-red">
        <q-icon name="remove_circle" />
      </div>
      <div class="stats-content">
        <div class="stats-label">Terminated</div>
        <div class="stats-amount">{{ stats.terminated }}</div>
        <div class="stats-delta stats-delta-negative">
          {{ stats.total > 0 ? Math.round((stats.terminated / stats.total) * 100) : 0 }}% of total
        </div>
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
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
  font-size: 20px;
}

.stats-icon-blue {
  background: #eff6ff;
  color: #3b82f6;
}
.stats-icon-green {
  background: #f0fdf4;
  color: #22c55e;
}
.stats-icon-red {
  background: #fef2f2;
  color: #ef4444;
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

.stats-delta {
  font-size: 12px;
  margin-top: 3px;
  font-weight: 500;
}

.stats-delta-positive {
  color: #22c55e;
}
.stats-delta-negative {
  color: #ef4444;
}
.stats-delta-neutral {
  color: #9ca3af;
}

@media (max-width: 900px) {
  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .stats-amount {
    font-size: 22px;
  }
}

@media (max-width: 768px) {
  .stats-section {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .stats-amount {
    font-size: 20px;
  }
}
</style>
