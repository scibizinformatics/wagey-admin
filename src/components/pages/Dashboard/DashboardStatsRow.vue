<template>
  <div class="stats-row">
    <div v-for="(stat, i) in statsCards" :key="i" class="stat-tile" :class="`tile-${i}`">
      <div class="tile-icon-wrap">
        <q-icon :name="stat.icon" size="22px" />
      </div>
      <div class="tile-body">
        <div class="tile-count">
          <q-skeleton v-if="pageLoading" type="text" width="40px" />
          <template v-else>{{ stat.count }}</template>
        </div>
        <div class="tile-label">{{ stat.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  statsCards: { type: Array, required: true },
  pageLoading: { type: Boolean, default: false },
})
</script>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  flex-shrink: 0;
}
.stat-tile {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: box-shadow 0.2s;
}
.stat-tile:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

/* Colour accents per tile */
.tile-0 .tile-icon-wrap {
  background: #e8f4ff;
  color: #1a73e8;
}
.tile-1 .tile-icon-wrap {
  background: #fdecea;
  color: #d32f2f;
}
.tile-2 .tile-icon-wrap {
  background: #e8f5e9;
  color: #388e3c;
}
.tile-3 .tile-icon-wrap {
  background: #fff3e0;
  color: #f57c00;
}
.tile-4 .tile-icon-wrap {
  background: #f3e5f5;
  color: #7b1fa2;
}
.tile-5 .tile-icon-wrap {
  background: #e0f7fa;
  color: #0097a7;
}

.tile-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tile-count {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}
.tile-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  margin-top: 1px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 1200px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
