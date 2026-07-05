<template>
  <div class="stats-row">
    <div v-for="(stat, i) in statsCards" :key="i" class="stat-tile" :class="`tile-${i}`">
      <span class="tile-badge">{{ badgeText(i) }}</span>
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

function badgeText(i) {
  const badges = ['Total', 'On Leave', 'Live', 'Today', 'Pending', 'Pending']
  return badges[i] ?? ''
}
</script>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  flex-shrink: 0;
}
.stat-tile {
  position: relative;
  border-radius: 12px;
  border: none;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: transform 0.2s, box-shadow 0.2s;
  color: #fff;
  overflow: hidden;
}
.stat-tile:hover {
  transform: translateY(-2px);
}

/* ── Premium dark navy + jewel tone gradients ── */
.tile-0 {
  background: linear-gradient(135deg, #1e40af, #0f172a 60%);
  box-shadow: 0 8px 32px #3b82f652;
}
.tile-0:hover {
  box-shadow: 0 12px 40px #3b82f670;
}
.tile-1 {
  background: linear-gradient(135deg, #991b1b, #0f172a 60%);
  box-shadow: 0 8px 32px #ef444452;
}
.tile-1:hover {
  box-shadow: 0 12px 40px #ef444470;
}
.tile-2 {
  background: linear-gradient(135deg, #166534, #0f172a 60%);
  box-shadow: 0 8px 32px #22c55e52;
}
.tile-2:hover {
  box-shadow: 0 12px 40px #22c55e70;
}
.tile-3 {
  background: linear-gradient(135deg, #9a3412, #0f172a 60%);
  box-shadow: 0 8px 32px #f9731652;
}
.tile-3:hover {
  box-shadow: 0 12px 40px #f9731670;
}
.tile-4 {
  background: linear-gradient(135deg, #7e22ce, #0f172a 60%);
  box-shadow: 0 8px 32px #a855f752;
}
.tile-4:hover {
  box-shadow: 0 12px 40px #a855f770;
}
.tile-5 {
  background: linear-gradient(135deg, #0e7490, #0f172a 60%);
  box-shadow: 0 8px 32px #06b6d452;
}
.tile-5:hover {
  box-shadow: 0 12px 40px #06b6d470;
}

/* ── Decorative bubble circles ── */
.stat-tile::before,
.stat-tile::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

/* Tile 0 — Active */
.tile-0::before {
  width: 110px;
  height: 110px;
  top: -25px;
  right: -15px;
  background: rgba(255, 255, 255, 0.04);
}
.tile-0::after {
  width: 70px;
  height: 70px;
  bottom: -10px;
  right: 30px;
  background: rgba(255, 255, 255, 0.03);
}

/* Tile 1 — Paid Leave */
.tile-1::before {
  width: 100px;
  height: 100px;
  top: -20px;
  right: -20px;
  background: rgba(255, 255, 255, 0.04);
}
.tile-1::after {
  width: 60px;
  height: 60px;
  bottom: 10px;
  right: 50px;
  background: rgba(255, 255, 255, 0.03);
}

/* Tile 2 — Clocked In */
.tile-2::before {
  width: 120px;
  height: 120px;
  top: -30px;
  right: -10px;
  background: rgba(255, 255, 255, 0.04);
}
.tile-2::after {
  width: 65px;
  height: 65px;
  bottom: -5px;
  right: 40px;
  background: rgba(255, 255, 255, 0.03);
}

/* Tile 3 — Absent */
.tile-3::before {
  width: 105px;
  height: 105px;
  top: -15px;
  right: -25px;
  background: rgba(255, 255, 255, 0.04);
}
.tile-3::after {
  width: 75px;
  height: 75px;
  bottom: 5px;
  right: 20px;
  background: rgba(255, 255, 255, 0.03);
}

/* Tile 4 — Time Off */
.tile-4::before {
  width: 115px;
  height: 115px;
  top: -25px;
  right: -15px;
  background: rgba(255, 255, 255, 0.04);
}
.tile-4::after {
  width: 55px;
  height: 55px;
  bottom: 15px;
  right: 55px;
  background: rgba(255, 255, 255, 0.03);
}

/* Tile 5 — Requests */
.tile-5::before {
  width: 100px;
  height: 100px;
  top: -20px;
  right: -20px;
  background: rgba(255, 255, 255, 0.04);
}
.tile-5::after {
  width: 70px;
  height: 70px;
  bottom: 0px;
  right: 35px;
  background: rgba(255, 255, 255, 0.03);
}

/* ── Top-right badge pill ── */
.tile-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  padding: 4px 10px;
  border-radius: 999px;
  z-index: 2;
  line-height: 1;
}

/* ── Icon wrap (glass effect) ── */
.tile-icon-wrap {
  position: relative;
  z-index: 1;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  color: #fff;
}

/* ── Typography ── */
.tile-body {
  position: relative;
  z-index: 1;
}
.tile-count {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.1;
}
.tile-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  margin-bottom: 2px;
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
