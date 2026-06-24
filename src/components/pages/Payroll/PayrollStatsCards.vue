<template>
  <div class="stats-bar">
    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-employees"></span>
        Total Employees
      </div>
      <div class="stats-segment-value">{{ totalEmployees }}</div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-gross"></span>
        Total Gross Pay
      </div>
      <div class="stats-segment-value">{{ totalGrossPay }}</div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-net"></span>
        Total Net Pay
      </div>
      <div class="stats-segment-value">{{ totalNetPay }}</div>
    </div>

    <div class="stats-divider"></div>

    <div class="stats-segment">
      <div class="stats-segment-label">
        <span class="stats-dot stats-dot-runs"></span>
        Total Payroll Runs
      </div>
      <div class="stats-segment-value">{{ totalPayrollRuns }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  totalEmployees: { type: Number, default: 0 },
  totalGrossPay: { type: String, default: '₱0.00' },
  totalNetPay: { type: String, default: '₱0.00' },
  totalPayrollRuns: { type: Number, default: 0 },
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

.stats-dot-employees {
  background: #6366f1;
}

.stats-dot-gross {
  background: #f59e0b;
}

.stats-dot-net {
  background: #10b981;
}

.stats-dot-runs {
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
