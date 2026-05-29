<template>
  <div class="stats-section">
    <div class="stats-card">
      <div class="stats-icon-wrapper stats-icon-blue">
        <q-icon name="mail" />
      </div>
      <div class="stats-content">
        <div class="stats-label">Total Invitations</div>
        <div class="stats-amount">{{ total }}</div>
        <div class="stats-delta stats-delta-neutral">All time</div>
      </div>
    </div>

    <div class="stats-card">
      <div class="stats-icon-wrapper stats-icon-yellow">
        <q-icon name="schedule" />
      </div>
      <div class="stats-content">
        <div class="stats-label">Unused</div>
        <div class="stats-amount">{{ unused }}</div>
        <div class="stats-delta stats-delta-neutral">
          {{ total > 0 ? Math.round((unused / total) * 100) : 0 }}% of total
        </div>
      </div>
    </div>

    <div class="stats-card">
      <div class="stats-icon-wrapper stats-icon-green">
        <q-icon name="check_circle" />
      </div>
      <div class="stats-content">
        <div class="stats-label">Used</div>
        <div class="stats-amount">{{ used }}</div>
        <div class="stats-delta stats-delta-positive">
          {{ total > 0 ? Math.round((used / total) * 100) : 0 }}% of total
        </div>
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
.stats-icon-yellow {
  background: #fffbeb;
  color: #f59e0b;
}
.stats-icon-green {
  background: #f0fdf4;
  color: #22c55e;
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
.stats-delta-neutral {
  color: #9ca3af;
}

@media (max-width: 900px) {
  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
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
    font-size: 22px;
  }
}
</style>
