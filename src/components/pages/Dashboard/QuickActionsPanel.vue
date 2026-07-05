<template>
  <div class="panel">
    <div class="panel-head">
      <div class="panel-icon-wrap">
        <q-icon name="flash_on" size="18px" class="panel-icon" />
      </div>
      <span class="panel-title">Quick Actions</span>
    </div>
    <div class="quick-actions-grid">
      <div
        v-for="(action, i) in actions"
        :key="action.label"
        class="action-card"
        :class="`action-${i}`"
        @click="goTo(action.route)"
      >
        <div class="action-icon-wrap">
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
  { label: 'Employees', icon: 'groups', route: '/app/employees' },
  { label: 'Schedule', icon: 'calendar_month', route: '/app/schedule' },
  { label: 'Attendance', icon: 'event_available', route: '/app/attendance' },
  { label: 'Payroll', icon: 'paid', route: '/app/payroll' },
  { label: 'Requests', icon: 'mark_email_unread', route: '/app/requests' },
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
  gap: 8px;
  padding: 12px 16px;
  flex-shrink: 0;
}
.panel-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4px 12px #3b82f640;
  flex-shrink: 0;
}
.panel-icon {
  color: #fff;
}
.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  letter-spacing: 0.01em;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 12px 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 8px;
  border-radius: 10px;
  border: 1px solid #e8ecf0;
  background: #ffffff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}
.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.09);
}

/* ── Icon wraps with jewel tone gradients ── */
.action-0 .action-icon-wrap {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4px 12px #3b82f640;
}
.action-1 .action-icon-wrap {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  box-shadow: 0 4px 12px #22c55e40;
}
.action-2 .action-icon-wrap {
  background: linear-gradient(135deg, #f97316, #ea580c);
  box-shadow: 0 4px 12px #f9731640;
}
.action-3 .action-icon-wrap {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  box-shadow: 0 4px 12px #06b6d440;
}
.action-4 .action-icon-wrap {
  background: linear-gradient(135deg, #a855f7, #9333ea);
  box-shadow: 0 4px 12px #a855f740;
}

.action-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  transition: transform 0.2s;
}
.action-card:hover .action-icon-wrap {
  transform: scale(1.05);
}

.action-label {
  font-size: 11px;
  font-weight: 600;
  color: #111827;
  text-align: center;
  letter-spacing: 0.02em;
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
    padding: 10px 12px;
  }
  .action-card {
    padding: 12px 8px;
  }
}
</style>
