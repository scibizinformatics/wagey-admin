<template>
  <div class="panel">
    <div class="panel-head">
      <q-icon name="priority_high" size="18px" class="panel-icon" />
      <span class="panel-title">Priority Items</span>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="skeleton-body">
        <div class="skeleton-header">
          <div class="skeleton-cell">Employee</div>
          <div class="skeleton-cell">Site</div>
          <div class="skeleton-cell">Issue</div>
          <div class="skeleton-cell">Need Action</div>
        </div>
        <div v-for="n in 4" :key="n" class="skeleton-row">
          <div class="skeleton-cell"><q-skeleton type="text" width="100px" /></div>
          <div class="skeleton-cell"><q-skeleton type="text" width="80px" /></div>
          <div class="skeleton-cell"><q-skeleton type="text" width="120px" /></div>
          <div class="skeleton-cell"><q-skeleton type="text" width="70px" /></div>
        </div>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <q-icon name="check_circle" size="32px" color="positive" />
        <div class="empty-title">No priority items today</div>
        <div class="empty-sub">All attendance and payroll items are up to date.</div>
      </div>
      <div v-else class="priority-table">
        <div class="pt-header">
          <div class="pt-cell">Employee</div>
          <div class="pt-cell">Site</div>
          <div class="pt-cell">Issue</div>
          <div class="pt-cell">Need Action</div>
        </div>
        <div v-for="(item, i) in items" :key="i" class="pt-row">
          <div class="pt-cell">
            <div class="employee-cell">
              <q-avatar size="28px" :style="{ background: getAvatarColor(item.employee) }" class="emp-avatar">
                <span class="avatar-text">{{ getInitials(item.employee) }}</span>
              </q-avatar>
              <span class="emp-name">{{ item.employee }}</span>
            </div>
          </div>
          <div class="pt-cell">{{ item.site }}</div>
          <div class="pt-cell">
            <span class="issue-text">{{ item.issue }}</span>
          </div>
          <div class="pt-cell">
            <q-btn :label="item.actionType" dense unelevated rounded size="11px" :style="badgeStyle(item.actionType)" class="action-btn" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function getAvatarColor(name) {
  if (!name) return '#1a73e8'
  const colors = ['#1a73e8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function badgeStyle(impact) {
  const styles = {
    'May Affect Payroll': { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    'Attendance Incomplete': { background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' },
    'Affects Staffing': { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
  }
  return styles[impact] || {}
}
</script>

<style scoped>
.panel {
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
  flex-shrink: 0;
}
.panel-icon { color: #1a73e8; }
.panel-title { font-size: 13px; font-weight: 600; color: #111827; }
.panel-body { padding: 12px 16px; flex: 1; min-height: 0; display: flex; flex-direction: column; }

.skeleton-body { min-height: 180px; flex: 1; }
.skeleton-header {
  display: grid; grid-template-columns: 1.2fr 0.8fr 1.2fr 0.8fr; gap: 8px;
  background: #f8fafc; border-radius: 8px; padding: 8px 12px;
}
.skeleton-header-cell {
  font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;
}
.skeleton-row {
  display: grid; grid-template-columns: 1.2fr 0.8fr 1.2fr 0.8fr; gap: 8px;
  align-items: center; padding: 10px 12px; border-bottom: 1px solid #f1f3f5;
}
.skeleton-row:last-child { border-bottom: none; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #9ca3af;
}
.empty-title { font-size: 14px; font-weight: 600; color: #6b7280; }
.empty-sub { font-size: 12px; color: #9ca3af; text-align: center; }

.priority-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 400px;
  overflow-y: auto;
}
.pt-header {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 1.2fr 0.8fr;
  gap: 8px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
}
.pt-header-cell {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.pt-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 1.2fr 0.8fr;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid #f1f3f5;
}
.pt-row:last-child { border-bottom: none; }
.pt-cell { font-size: 13px; color: #374151; }
.action-btn { font-size: 11px; }

.employee-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.emp-avatar {
  flex-shrink: 0;
}
.avatar-text {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}
.emp-name {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.issue-text {
  font-size: 13px;
  color: #374151;
}

@media (max-width: 768px) {
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 12px; }
}
</style>
