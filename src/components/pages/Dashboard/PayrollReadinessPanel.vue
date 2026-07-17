<template>
  <div class="panel-card">
    <div class="panel-head">
      <span class="panel-title">Payroll Readiness</span>
    </div>
    <div class="panel-body">
      <div class="readiness-list">
        <div v-for="(item, i) in items" :key="i" class="readiness-item">
          <div class="readiness-left">
            <q-icon
              :name="statusIcon(item.status)"
              size="18px"
              :color="statusColor(item.status)"
              class="readiness-icon"
            />
            <span class="readiness-label">{{ item.label }}</span>
          </div>
          <div class="readiness-right">
            <span v-if="item.completed != null && item.total != null" class="readiness-count">
              {{ item.completed }}/{{ item.total }}
            </span>
            <span
              v-else-if="item.count != null"
              class="readiness-count"
              :class="`text--${item.status}`"
            >
              {{ item.count }}
            </span>
            <q-chip
              v-else-if="item.status === 'complete'"
              dense
              color="green-1"
              text-color="green-8"
              size="sm"
            >
              <q-icon name="check_circle" size="14px" class="q-mr-xs" /> Complete
            </q-chip>
            <q-chip
              v-else-if="item.status === 'blocked'"
              dense
              color="red-1"
              text-color="red-8"
              size="sm"
            >
              No
            </q-chip>
            <span v-else-if="item.message" class="readiness-message">{{ item.message }}</span>
          </div>
        </div>
      </div>
      <div v-if="blockedMessage" class="readiness-blocked">
        <q-icon name="warning" size="16px" color="orange" class="q-mr-sm" />
        {{ blockedMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [
      { label: 'Attendance Reviewed', completed: 38, total: 40, status: 'progress' },
      { label: 'Payroll Computed', status: 'complete' },
      { label: 'Payslips Generated', status: 'complete' },
      { label: 'Employee Acknowledgments', completed: 34, total: 40, status: 'progress' },
      { label: 'Disputes', count: 2, status: 'warning' },
      { label: 'Ready for Funding', status: 'blocked' },
    ],
  },
})

const blockedMessage = computed(() => {
  const blocked = props.items.find((i) => i.status === 'blocked')
  return blocked ? 'Blocked by unresolved disputes' : ''
})

function statusIcon(status) {
  return (
    {
      complete: 'check_circle',
      progress: 'schedule',
      warning: 'error_outline',
      blocked: 'cancel',
    }[status] ?? 'help'
  )
}

function statusColor(status) {
  return (
    {
      complete: '#22c55e',
      progress: '#1a73e8',
      warning: '#f59e0b',
      blocked: '#ef4444',
    }[status] ?? '#6b7280'
  )
}
</script>

<style scoped>
.panel-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.panel-body {
  padding: 12px 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.readiness-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.readiness-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.readiness-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.readiness-icon {
  flex-shrink: 0;
}
.readiness-label {
  font-size: 13px;
  color: #374151;
}
.readiness-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.readiness-count {
  font-size: 13px;
  font-weight: 600;
  color: #1a73e8;
}
.readiness-count.text--warning {
  color: #ef4444;
}
.readiness-count.text--blocked {
  color: #ef4444;
}
.readiness-message {
  font-size: 12px;
  color: #9ca3af;
}
.readiness-blocked {
  margin-top: auto;
  padding: 10px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  font-size: 12px;
  color: #c2410c;
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .readiness-label {
    font-size: 12.5px;
  }
  .readiness-item {
    flex-wrap: wrap;
  }
}
</style>
