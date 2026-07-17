<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="swap_horiz" size="16px" class="panel-icon panel-icon--amber" />
      <span class="panel-title">Pending Swaps</span>
      <q-badge
        v-if="pendingSwaps.length"
        color="warning"
        :label="pendingSwaps.length"
        class="q-ml-auto"
      />
    </div>
    <div class="notif-list">
      <template v-if="loading">
        <div v-for="n in 2" :key="n" class="notif-item">
          <q-skeleton type="circle" size="7px" />
          <q-skeleton type="text" style="flex: 1" />
        </div>
      </template>
      <template v-else-if="pendingSwaps.length">
        <div v-for="(swap, i) in pendingSwaps.slice(0, 4)" :key="i" class="notif-item">
          <q-icon name="circle" size="7px" color="warning" class="notif-dot" />
          <span class="notif-text">
            {{ swap.requester_name ?? swap.employee_name ?? 'Employee' }}
            wants to swap with
            {{ swap.requested_name ?? swap.target_name ?? 'teammate' }}
          </span>
        </div>
      </template>
      <div v-else class="empty-panel-state">
        <div
          class="eps-shimmer"
          v-for="n in 2"
          :key="n"
          :style="{ width: n % 2 === 0 ? '55%' : '70%', animationDelay: `${n * 0.16}s` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  pendingSwaps: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})
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
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-shrink: 0;
}
.panel-icon {
  color: #1a73e8;
}
.panel-icon--amber {
  color: #f59e0b;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.notif-list {
  padding: 2px 0;
}
.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.notif-item:last-child {
  border-bottom: none;
}
.notif-dot {
  margin-top: 3px;
  flex-shrink: 0;
}
.notif-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.4;
}

/* Empty panel state */
@keyframes eps-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.85;
    transform: scaleX(1.015);
  }
}
.empty-panel-state {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  min-height: 100px;
}
.eps-shimmer {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e8ecf0 0%, #d1d9e0 50%, #e8ecf0 100%);
  background-size: 200% 100%;
  animation: eps-pulse 1.6s ease-in-out infinite;
  transform-origin: left center;
}

@media (max-width: 768px) {
  .panel-head {
    padding: 12px 14px;
  }
  .panel-title {
    font-size: 14px;
  }
  .notif-item {
    padding: 10px 14px;
  }
}
</style>
