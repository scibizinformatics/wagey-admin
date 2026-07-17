<template>
  <div class="panel-card">
    <div class="panel-head">
      <span class="panel-title">Needs Your Attention</span>
    </div>
    <div class="panel-body">
      <div class="attention-list">
        <div v-for="(item, i) in alerts" :key="i" class="attention-item">
          <div class="attention-left">
            <div class="attention-dot" :class="`severity--${item.severity}`" />
            <span class="attention-text">{{ item.message }}</span>
          </div>
          <q-btn
            dense
            flat
            size="sm"
            :label="item.action"
            class="attention-action"
            @click="$emit('action', item)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  alerts: {
    type: Array,
    default: () => [
      { severity: 'high', message: '2 absent employees', action: 'Review' },
      { severity: 'medium', message: '1 unfilled cashier position', action: 'Review' },
      { severity: 'medium', message: '3 overtime requests pending approval', action: 'Approve' },
      { severity: 'medium', message: '2 payroll disputes', action: 'Resolve' },
      { severity: 'high', message: '1 failed payout transfer', action: 'Resolve' },
    ],
  },
})

defineEmits(['action'])
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
  overflow-y: auto;
}

.attention-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.attention-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
}
.attention-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.attention-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.severity--high {
  background: #ef4444;
}
.severity--medium {
  background: #f59e0b;
}
.severity--low {
  background: #22c55e;
}
.attention-text {
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.attention-action {
  color: #1a73e8;
  font-weight: 500;
  font-size: 12px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .attention-item {
    align-items: flex-start;
    flex-wrap: wrap;
    row-gap: 6px;
  }
  .attention-text {
    white-space: normal;
    font-size: 12.5px;
  }
  .attention-action {
    margin-left: auto;
  }
}
</style>
