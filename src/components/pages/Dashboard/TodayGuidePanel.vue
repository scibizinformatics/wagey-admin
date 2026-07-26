<template>
  <div class="guide-panel">
    <div class="guide-head">
      <q-icon name="help_outline" size="16px" color="primary" />
      <span class="guide-title">Today's Guide</span>
    </div>
    <div class="guide-body">
      <div class="guide-item">
        <span class="guide-dot" style="background: #1a73e8" />
        <span><strong>Scheduled</strong> — total employees expected today</span>
      </div>
      <div class="guide-item">
        <span class="guide-dot" style="background: #22c55e" />
        <span><strong>Clocked In</strong> — employees who have clocked in</span>
      </div>
      <div class="guide-item">
        <span class="guide-dot" style="background: #f59e0b" />
        <span><strong>Needs Attention</strong> — items requiring review</span>
      </div>
      <div class="guide-item">
        <span class="guide-dot" style="background: #8b5cf6" />
        <span><strong>Pending Requests</strong> — open leave, OT, and other requests</span>
      </div>
      <div class="guide-item">
        <span class="guide-dot" style="background: #0e7490" />
        <span><strong>Est. Payroll</strong> — projected payroll for today</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guide-panel {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
}
.guide-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.guide-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.guide-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.guide-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}
.guide-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
