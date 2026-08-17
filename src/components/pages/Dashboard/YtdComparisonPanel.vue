<template>
  <DashPanel
    icon="compare_arrows"
    title="Year on year"
    :subtitle="`${data.currentYearLabel} vs ${data.previousYearLabel}`"
    :loading="loading"
    :empty="!data.currentAmount"
    empty-icon="compare_arrows"
    empty-title="Nothing to compare yet"
    empty-sub="A comparison needs closed payroll in both years."
    skeleton="lines"
    :skeleton-rows="4"
  >
    <!-- The headline is the change, not the two amounts it is derived from —
         those move to the supporting rows beneath it. -->
    <div class="lead">
      <p class="dash-eyebrow">Change year on year</p>
      <p class="dash-metric dash-metric--lg lead__value" :class="deltaClass">
        {{ signed(data.changePercent) }}%
      </p>
      <p class="lead__amount" :class="deltaClass">
        {{ data.difference >= 0 ? '+' : '−' }}{{ fmtCurrency(Math.abs(data.difference)) }}
      </p>
    </div>

    <dl class="rows">
      <div class="row">
        <dt class="row__label">January – June {{ data.currentYearLabel }}</dt>
        <dd class="row__value dash-num">{{ fmtCurrency(data.currentAmount) }}</dd>
      </div>
      <div class="row">
        <dt class="row__label">January – June {{ data.previousYearLabel }}</dt>
        <dd class="row__value dash-num">{{ fmtCurrency(data.previousAmount) }}</dd>
      </div>
    </dl>
  </DashPanel>
</template>

<script setup>
/**
 * This year's payroll against last year's, over the same window.
 *
 * The panel was a four-row table in which the two raw amounts, the difference
 * and the percentage all carried equal weight. The percentage is the answer
 * people come here for, so it now leads and the rest supports it.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

const deltaClass = computed(() => {
  const pct = Number(props.data?.changePercent ?? 0)
  if (pct > 0) return 'is-up'
  if (pct < 0) return 'is-down'
  return 'is-flat'
})

// The glyph is always printed, so direction never depends on colour alone.
function signed(pct) {
  const n = Number(pct ?? 0)
  return `${n >= 0 ? '+' : '−'}${Math.abs(n)}`
}

function fmtCurrency(n) {
  return `₱${Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}
</script>

<style scoped>
.lead {
  padding: 4px 0 14px;
  border-bottom: 1px solid var(--dash-line-soft);
}

.lead__value {
  margin: 3px 0 0;
}

.lead__amount {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.is-up {
  color: var(--dash-good);
}
.is-down {
  color: var(--dash-critical);
}
.is-flat {
  color: var(--dash-ink-2);
}

.rows {
  margin: 0;
  padding-top: 4px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--dash-line-soft);
}
.row:last-child {
  border-bottom: none;
}

.row__label {
  margin: 0;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  min-width: 0;
}

.row__value {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  flex-shrink: 0;
}
</style>
