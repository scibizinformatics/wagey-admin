<template>
  <div class="stats-section">
    <div class="stats-card">
      <div class="stats-icon-wrapper stats-icon-blue">
        <q-icon name="groups" />
      </div>
      <div class="stats-content">
        <div class="stats-label">Total Employees</div>
        <div class="stats-amount">{{ activeEmployees }}</div>
      </div>
    </div>
    <div class="stats-card">
      <div class="stats-icon-wrapper stats-icon-green">
        <q-icon name="event" />
      </div>
      <div class="stats-content">
        <div class="stats-label">Active Schedules</div>
        <div class="stats-amount">{{ totalShifts }}</div>
      </div>
    </div>
    <div class="stats-card">
      <div class="stats-icon-wrapper stats-icon-purple">
        <q-icon name="work" />
      </div>
      <div class="stats-content">
        <div class="stats-label">Positions Filled</div>
        <div class="stats-amount">{{ positionsCount }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeEmployees: { type: Number, default: 0 },
  totalShifts: { type: Number, default: 0 },
  positionsCount: { type: Number, default: 0 },
});
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
.stats-icon-purple {
  background: #f5f3ff;
  color: #8b5cf6;
}
.stats-content {
  min-width: 0;
}
.stats-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.stats-amount {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
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
    grid-template-columns: 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }
  .stats-card {
    padding: 12px 14px;
  }
  .stats-icon-wrapper {
    width: 38px;
    height: 38px;
  }
  .stats-amount {
    font-size: 22px;
  }
}
@media (max-width: 480px) {
  .stats-section {
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
  .stats-amount {
    font-size: 20px;
  }
  .stats-label {
    font-size: 11px;
  }
}
</style>
