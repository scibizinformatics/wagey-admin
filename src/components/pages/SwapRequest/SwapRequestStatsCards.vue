<template>
  <div class="stats-section">
    <div class="stats-card total-card">
      <div class="stats-icon-wrapper">
        <q-icon name="swap_horiz" class="stats-icon" />
      </div>
      <div class="stats-content">
        <div class="stats-amount">{{ statistics.total }}</div>
        <div class="stats-label">Total Requests</div>
      </div>
    </div>
    <div class="stats-card pending-card">
      <div class="stats-icon-wrapper">
        <q-icon name="pending" class="stats-icon" />
      </div>
      <div class="stats-content">
        <div class="stats-amount">{{ statistics.pending }}</div>
        <div class="stats-label">Pending</div>
      </div>
    </div>
    <div class="stats-card approved-card">
      <div class="stats-icon-wrapper">
        <q-icon name="check_circle" class="stats-icon" />
      </div>
      <div class="stats-content">
        <div class="stats-amount">{{ statistics.approved }}</div>
        <div class="stats-label">Approved</div>
      </div>
    </div>
    <div class="stats-card rejected-card">
      <div class="stats-icon-wrapper">
        <q-icon name="cancel" class="stats-icon" />
      </div>
      <div class="stats-content">
        <div class="stats-amount">{{ statistics.rejected }}</div>
        <div class="stats-label">Rejected</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  statistics: Object,
})
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
  font-size: 20px;
}
.stats-icon { font-size: 20px; }
.total-card .stats-icon-wrapper {
  background: #eff6ff;
  color: #3b82f6;
}
.pending-card .stats-icon-wrapper {
  background: #fffbeb;
  color: #f59e0b;
}
.approved-card .stats-icon-wrapper {
  background: #f0fdf4;
  color: #22c55e;
}
.rejected-card .stats-icon-wrapper {
  background: #fef2f2;
  color: #ef4444;
}
.stats-content { flex: 1; min-width: 0; }
.stats-amount {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}
.stats-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
@media (max-width: 1024px) {
  .stats-section { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .stats-card { padding: 14px; }
  .stats-icon-wrapper { width: 44px; height: 44px; }
  .stats-icon { font-size: 22px; }
  .stats-amount { font-size: 24px; }
  .stats-label { font-size: 12px; }
}
@media (max-width: 768px) {
  .stats-section { grid-template-columns: 1fr; gap: 12px; margin-bottom: 16px; }
  .stats-card { padding: 16px; }
  .stats-icon-wrapper { width: 44px; height: 44px; }
  .stats-icon { font-size: 22px; }
  .stats-amount { font-size: 24px; }
  .stats-label { font-size: 13px; }
}
@media (max-width: 480px) {
  .stats-card { padding: 14px; }
  .stats-icon-wrapper { width: 40px; height: 40px; }
  .stats-icon { font-size: 20px; }
}
</style>
