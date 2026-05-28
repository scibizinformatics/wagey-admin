<template>
  <div class="panel panel--flex">
    <div class="panel-head">
      <span class="panel-title">Recent Activity</span>
    </div>
    <div class="activity-list">
      <template v-if="loading">
        <div v-for="n in 3" :key="n" class="activity-row">
          <q-skeleton type="QAvatar" size="36px" />
          <div class="activity-info">
            <q-skeleton type="text" width="120px" />
            <q-skeleton type="text" width="80px" />
          </div>
        </div>
      </template>
      <template v-else-if="activities.length">
        <div v-for="activity in activities" :key="activity.id" class="activity-row">
          <q-avatar size="36px" class="activity-avatar">
            {{ activity.initial }}
          </q-avatar>
          <div class="activity-info">
            <div class="activity-user">{{ activity.user }}</div>
            <div class="activity-time">{{ activity.time }}</div>
          </div>
          <div class="activity-status-badge">{{ activity.status }}</div>
          <div class="activity-details">{{ activity.details }}</div>
        </div>
      </template>
      <div v-else class="empty-panel-state">
        <div
          class="eps-shimmer"
          v-for="n in 3"
          :key="n"
          :style="{ width: n % 2 === 0 ? '50%' : '70%', animationDelay: `${n * 0.13}s` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activities: { type: Array, required: true },
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
.panel--flex {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-shrink: 0;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.activity-list {
  padding: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.activity-row:last-child {
  border-bottom: none;
}
.activity-avatar {
  background: linear-gradient(135deg, #1a73e8, #6c63ff);
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}
.activity-info {
  flex: 1;
  min-width: 0;
}
.activity-user {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.activity-time {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 1px;
}
.activity-status-badge {
  font-size: 10px;
  font-weight: 600;
  color: #1a73e8;
  background: #e8f4ff;
  padding: 2px 6px;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}
.activity-details {
  font-size: 10px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
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
  .activity-details {
    display: none;
  }
}
</style>
