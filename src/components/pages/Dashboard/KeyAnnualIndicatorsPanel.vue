<template>
  <DashPanel
    icon="insights"
    title="Key indicators"
    subtitle="Year to date"
    :loading="loading"
    :empty="!indicators.length"
    empty-icon="insights"
    empty-title="Not enough closed months"
    empty-sub="Indicators need at least two closed months to compare."
    skeleton="tiles"
    :skeleton-rows="6"
  >
    <dl class="indicators">
      <div v-for="item in indicators" :key="item.label" class="indicator">
        <q-icon :name="item.icon" size="17px" class="indicator__icon" :style="{ color: item.color }" />
        <div class="indicator__text">
          <dt class="indicator__label" :title="item.label">{{ item.label }}</dt>
          <dd class="indicator__value dash-num">{{ item.value }}</dd>
        </div>
      </div>
    </dl>
  </DashPanel>
</template>

<script setup>
/**
 * The handful of derived figures worth calling out for the year — highest and
 * lowest payroll month, largest component, overtime share, and so on.
 *
 * A definition list rather than a set of divs: each row genuinely is a term and
 * its value, and screen readers get that structure for free.
 */
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'

defineProps({
  indicators: { type: Array, default: () => [] }, // [{ icon, label, value, color? }]
  loading: { type: Boolean, default: false },
})
</script>

<style scoped>
.indicators {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  flex: 1;
  align-content: start;
}

.indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  min-width: 0;
}

.indicator__icon {
  flex-shrink: 0;
}

.indicator__text {
  min-width: 0;
}

.indicator__label {
  margin: 0;
  font-size: 12px;
  font-weight: 400;
  color: var(--dash-ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.indicator__value {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 480px) {
  .indicators {
    grid-template-columns: 1fr;
  }
}
</style>
