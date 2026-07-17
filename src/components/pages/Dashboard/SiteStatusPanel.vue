<template>
  <div class="panel-card">
    <div class="panel-head">
      <span class="panel-title">Site Status</span>
    </div>
    <div class="panel-body">
      <div class="site-list">
        <div v-for="(site, i) in sites" :key="i" class="site-item">
          <span class="site-name">{{ site.name }}</span>
          <span class="site-badge" :class="`status--${site.status}`">
            {{ statusLabel(site.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  sites: {
    type: Array,
    default: () => [
      { name: 'LGK', status: 'needs_attention' },
      { name: 'Secret Recipe', status: 'good' },
      { name: 'White Kubo', status: 'watch' },
      { name: 'Admin Office', status: 'good' },
    ],
  },
})

function statusLabel(status) {
  return (
    {
      needs_attention: 'Needs Attention',
      good: 'Good',
      watch: 'Watch',
    }[status] ?? status
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
}

.site-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.site-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
}
.site-name {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}
.site-badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.status--needs_attention {
  background: #fdecea;
  color: #c62828;
}
.status--good {
  background: #e8f5e9;
  color: #2e7d32;
}
.status--watch {
  background: #fff8e1;
  color: #f57f17;
}

@media (max-width: 768px) {
  .site-name {
    font-size: 12.5px;
  }
  .site-badge {
    font-size: 10px;
    padding: 3px 8px;
  }
}
</style>
