<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="flash_on" size="18px" class="panel-icon" />
      <span class="panel-title">Quick Actions</span>
    </div>
    <div class="quick-actions-grid">
      <div
        v-for="action in actions"
        :key="action.label"
        class="action-card"
        @click="goTo(action.route)"
      >
        <div class="action-icon-wrap" :class="action.colorClass">
          <q-icon :name="action.icon" size="20px" />
        </div>
        <span class="action-label">{{ action.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const actions = [
  { label: 'Employees', icon: 'groups', route: '/app/employees', colorClass: 'color-blue' },
  { label: 'Schedule', icon: 'calendar_month', route: '/app/schedule', colorClass: 'color-green' },
  { label: 'Attendance', icon: 'event_available', route: '/app/attendance', colorClass: 'color-orange' },
  { label: 'Payroll', icon: 'paid', route: '/app/payroll', colorClass: 'color-cyan' },
  { label: 'Requests', icon: 'mark_email_unread', route: '/app/requests', colorClass: 'color-purple' },
]

function goTo(route) {
  router.push(route)
}
</script>

<style scoped>
.panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  flex-shrink: 0;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  flex-shrink: 0;
}
.panel-icon {
  color: #1a73e8;
}
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 10px 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s, transform 0.15s;
}
.action-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.09);
  transform: translateY(-1px);
}

.action-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Colour accents per action */
.color-blue {
  background: #d2e4ff;
  color: #1a73e8;
}
.color-green {
  background: #c8e6c9;
  color: #388e3c;
}
.color-orange {
  background: #ffe0b2;
  color: #f57c00;
}
.color-cyan {
  background: #b2ebf2;
  color: #0097a7;
}
.color-purple {
  background: #e1bee7;
  color: #7b1fa2;
}

.action-label {
  font-size: 11px;
  font-weight: 500;
  color: #374151;
  text-align: center;
}

/* Responsive */
@media (max-width: 1200px) {
  .quick-actions-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
    padding: 8px 12px;
  }
  .action-card {
    padding: 10px 8px;
  }
}
</style>
