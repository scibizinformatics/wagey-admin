<template>
  <div class="stats-section">
    <template v-if="activeTab === 'leave'">
      <div class="stats-card total-card">
        <div class="stats-icon-wrapper leave-icon-bg">
          <q-icon name="event_note" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ leaveStats.total }}</div>
          <div class="stats-label">Total Leave</div>
        </div>
      </div>
      <div class="stats-card pending-card">
        <div class="stats-icon-wrapper">
          <q-icon name="schedule" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ leaveStats.pending }}</div>
          <div class="stats-label">Pending</div>
        </div>
      </div>
      <div class="stats-card approved-card">
        <div class="stats-icon-wrapper">
          <q-icon name="check_circle" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ leaveStats.approved }}</div>
          <div class="stats-label">Approved</div>
        </div>
      </div>
      <div class="stats-card rejected-card">
        <div class="stats-icon-wrapper">
          <q-icon name="cancel" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ leaveStats.rejected }}</div>
          <div class="stats-label">Rejected</div>
        </div>
      </div>
    </template>

    <template v-else-if="activeTab === 'overtime'">
      <div class="stats-card overtime-total-card">
        <div class="stats-icon-wrapper overtime-icon-bg">
          <q-icon name="more_time" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ overtimeStats.total }}</div>
          <div class="stats-label">Total Overtime</div>
        </div>
      </div>
      <div class="stats-card pending-card">
        <div class="stats-icon-wrapper">
          <q-icon name="schedule" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ overtimeStats.pending }}</div>
          <div class="stats-label">Pending</div>
        </div>
      </div>
      <div class="stats-card approved-card">
        <div class="stats-icon-wrapper">
          <q-icon name="check_circle" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ overtimeStats.approved }}</div>
          <div class="stats-label">Approved</div>
        </div>
      </div>
      <div class="stats-card rejected-card">
        <div class="stats-icon-wrapper">
          <q-icon name="cancel" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ overtimeStats.rejected }}</div>
          <div class="stats-label">Rejected</div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="stats-card total-card">
        <div class="stats-icon-wrapper">
          <q-icon name="account_balance_wallet" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ caStatistics.total }}</div>
          <div class="stats-label">Total Requests</div>
        </div>
      </div>
      <div class="stats-card pending-card">
        <div class="stats-icon-wrapper">
          <q-icon name="schedule" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ caStatistics.pending }}</div>
          <div class="stats-label">Pending</div>
        </div>
      </div>
      <div class="stats-card approved-card">
        <div class="stats-icon-wrapper">
          <q-icon name="check_circle" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ caStatistics.approved }}</div>
          <div class="stats-label">Approved</div>
        </div>
      </div>
      <div class="stats-card rejected-card">
        <div class="stats-icon-wrapper">
          <q-icon name="cancel" class="stats-icon" />
        </div>
        <div class="stats-content">
          <div class="stats-amount">{{ caStatistics.rejected }}</div>
          <div class="stats-label">Rejected</div>
        </div>
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
.leave-icon-bg,
.stats-icon-wrapper:has(.q-icon[name='event_note']) {
  background: #eff6ff;
  color: #3b82f6;
}
.overtime-icon-bg {
  background: #faf5ff;
  color: #8b5cf6;
}
.stats-card .stats-icon-wrapper {
  background: #eff6ff;
  color: #3b82f6;
}
.total-card .stats-icon-wrapper {
  background: #eff6ff;
  color: #3b82f6;
}
.overtime-total-card .stats-icon-wrapper {
  background: #faf5ff;
  color: #8b5cf6;
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
@media (max-width: 1024px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .stats-amount { font-size: 24px; }
}
@media (max-width: 768px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .stats-card { padding: 14px; }
  .stats-amount { font-size: 22px; }
}
@media (max-width: 480px) {
  .stats-section { gap: 6px; }
  .stats-card { padding: 12px; }
  .stats-amount { font-size: 20px; }
}
</style>
