<template>
  <div class="panel-card">
    <div class="panel-head">
      <span class="panel-title">Cutoff Funding Summary</span>
    </div>
    <div class="panel-body">
      <div class="funding-grid">
        <div v-for="(item, i) in items" :key="i" class="funding-card">
          <div class="funding-icon" :style="{ background: item.iconBg, color: item.iconColor }">
            <q-icon :name="item.icon" size="22px" />
          </div>
          <div class="funding-info">
            <div class="funding-label">{{ item.label }}</div>
            <div class="funding-value" :style="{ color: item.valueColor }">
              {{ formatCurrency(item.amount) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Segmented bar -->
      <div class="segmented-bar">
        <div
          v-for="(seg, i) in segments"
          :key="i"
          class="segment"
          :style="{ width: seg.percent + '%', background: seg.color }"
          :title="`${seg.label}: ${formatCurrency(seg.amount)}`"
        />
      </div>
      <div class="segmented-legend">
        <div v-for="(seg, i) in segments" :key="i" class="legend-item">
          <div class="legend-dot" :style="{ background: seg.color }" />
          <span class="legend-label">{{ seg.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      totalPayroll: 741700,
      readyToFund: 284500,
      alreadyFunded: 331200,
      successfullyReleased: 305400,
      pendingEmployeeClaim: 25800,
    }),
  },
  fmtCurrency: { type: Function, default: (v) => `₱${Number(v).toLocaleString()}` },
})

const items = computed(() => [
  {
    icon: 'wallet',
    label: 'Total Payroll\nfor Cutoff',
    amount: props.data.totalPayroll,
    iconBg: '#e8f0fe',
    iconColor: '#1a73e8',
    valueColor: '#1a73e8',
  },
  {
    icon: 'verified',
    label: 'Ready to Fund',
    amount: props.data.readyToFund,
    iconBg: '#e6f6ea',
    iconColor: '#22c55e',
    valueColor: '#22c55e',
  },
  {
    icon: 'account_balance',
    label: 'Already Funded',
    amount: props.data.alreadyFunded,
    iconBg: '#f3e8ff',
    iconColor: '#7e22ce',
    valueColor: '#7e22ce',
  },
  {
    icon: 'check_circle',
    label: 'Successfully\nReleased',
    amount: props.data.successfullyReleased,
    iconBg: '#e0f7fa',
    iconColor: '#0e7490',
    valueColor: '#0e7490',
  },
  {
    icon: 'person',
    label: 'Pending Employee\nClaim',
    amount: props.data.pendingEmployeeClaim,
    iconBg: '#fff7ed',
    iconColor: '#f97316',
    valueColor: '#f97316',
  },
])

const segments = computed(() => {
  const total = props.data.totalPayroll || 1
  return [
    {
      label: 'Ready to Fund',
      amount: props.data.readyToFund,
      color: '#22c55e',
      percent: (props.data.readyToFund / total) * 100,
    },
    {
      label: 'Already Funded',
      amount: props.data.alreadyFunded,
      color: '#7e22ce',
      percent: (props.data.alreadyFunded / total) * 100,
    },
    {
      label: 'Successfully Released',
      amount: props.data.successfullyReleased,
      color: '#0e7490',
      percent: (props.data.successfullyReleased / total) * 100,
    },
    {
      label: 'Pending Claim',
      amount: props.data.pendingEmployeeClaim,
      color: '#f97316',
      percent: (props.data.pendingEmployeeClaim / total) * 100,
    },
  ]
})

function formatCurrency(val) {
  return props.fmtCurrency(val)
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
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.funding-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.funding-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}
.funding-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.funding-label {
  font-size: 10px;
  color: #6b7280;
  line-height: 1.3;
  white-space: pre-line;
}
.funding-value {
  font-size: 14px;
  font-weight: 700;
}

.segmented-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}
.segment {
  height: 100%;
  transition: width 0.3s ease;
}

.segmented-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: auto;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-label {
  font-size: 11px;
  color: #6b7280;
}

@media (min-width: 1441px) {
  .funding-grid {
    gap: 16px;
  }
}
@media (max-width: 1024px) {
  .funding-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .funding-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px 10px;
  }
  .funding-value {
    font-size: 13px;
  }
  .segmented-legend {
    gap: 8px 12px;
  }
}
</style>
