<template>
  <div class="quick-actions">
    <q-btn
      v-for="(action, i) in actions"
      :key="i"
      unelevated
      no-caps
      class="action-btn"
      @click="handleAction(action)"
    >
      <div class="action-content">
        <q-icon :name="action.icon" size="20px" class="action-icon" />
        <span class="action-label">{{ action.label }}</span>
      </div>
    </q-btn>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

defineProps({
  actions: {
    type: Array,
    default: () => [
      { icon: 'people', label: 'Review Attendance', route: '/app/attendance' },
      { icon: 'check_circle', label: 'Approvals', route: '/app/requests' },
      { icon: 'receipt', label: 'Review Payroll', route: '/app/payroll' },
      { icon: 'account_balance', label: 'Fund Payout Group', action: 'fund' },
      { icon: 'payments', label: 'Release Cash/Check', action: 'release' },
    ],
  },
})

const emit = defineEmits(['fund', 'release'])
const router = useRouter()

function handleAction(action) {
  if (action.route) {
    router.push(action.route)
  } else if (action.action === 'fund') {
    emit('fund')
  } else if (action.action === 'release') {
    emit('release')
  }
}
</script>

<style scoped>
.quick-actions {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.action-btn {
  background: #ffffff;
  border: 1px solid #e8ecf0;
  border-radius: 10px;
  padding: 12px 8px;
  min-height: 56px;
  color: #374151;
  transition: all 0.2s ease;
}
.action-btn:hover {
  background: #f8fafc;
  border-color: #d1d5db;
  transform: translateY(-1px);
}
.action-content {
  display: flex;
  align-items: center;
  gap: 10px;
}
.action-icon {
  color: #1a73e8;
  flex-shrink: 0;
}
.action-label {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 1441px) {
  .quick-actions {
    gap: 16px;
  }
}
@media (max-width: 1024px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .action-content {
    gap: 8px;
  }
  .action-label {
    font-size: 12px;
  }
}
</style>
