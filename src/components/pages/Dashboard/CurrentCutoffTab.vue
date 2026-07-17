<template>
  <div class="tab-grid">
    <!-- Middle Row: 3 columns -->
    <div class="middle-row">
      <div class="panel">
        <div class="panel-head">
          <q-icon name="notifications_active" size="18px" class="panel-icon" />
          <span class="panel-title">Needs Your Attention</span>
        </div>
        <div class="panel-body">
          <div v-if="loading || !currentCutoff" class="skeleton-body">
            <div
              class="eps-shimmer"
              v-for="n in 5"
              :key="n"
              :style="{ width: n % 2 === 0 ? '60%' : '80%', animationDelay: `${n * 0.12}s` }"
            />
          </div>
          <NeedsYourAttentionPanel v-else />
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <q-icon name="receipt_long" size="18px" class="panel-icon" />
          <span class="panel-title">Current Cutoff Payroll</span>
        </div>
        <div class="panel-body">
          <div v-if="loading || !currentCutoff" class="skeleton-body">
            <div
              class="eps-shimmer"
              v-for="n in 8"
              :key="n"
              :style="{ width: n % 2 === 0 ? '55%' : '75%', animationDelay: `${n * 0.12}s` }"
            />
          </div>
          <CurrentCutoffPayrollPanel
            v-else
            :data="payrollData"
            :trend-labels="trendLabels"
            :trend-values="trendValues"
            :fmt-currency="fmtCurrency"
          />
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <q-icon name="task_alt" size="18px" class="panel-icon" />
          <span class="panel-title">Payroll Readiness</span>
        </div>
        <div class="panel-body">
          <div v-if="loading || !currentCutoff" class="skeleton-body">
            <div
              class="eps-shimmer"
              v-for="n in 4"
              :key="n"
              :style="{ width: n % 2 === 0 ? '65%' : '85%', animationDelay: `${n * 0.12}s` }"
            />
          </div>
          <PayrollReadinessPanel v-else />
        </div>
      </div>
    </div>

    <!-- Bottom Row: 3 columns -->
    <div class="bottom-row">
      <div class="panel">
        <div class="panel-head">
          <q-icon name="groups" size="18px" class="panel-icon" />
          <span class="panel-title">Payout Groups</span>
        </div>
        <div class="panel-body">
          <div v-if="loading || !currentCutoff" class="skeleton-body">
            <div
              class="eps-shimmer"
              v-for="n in 4"
              :key="n"
              :style="{ width: n % 2 === 0 ? '60%' : '80%', animationDelay: `${n * 0.12}s` }"
            />
          </div>
          <PayoutGroupsPanel v-else :fmt-currency="fmtCurrency" />
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <q-icon name="account_balance" size="18px" class="panel-icon" />
          <span class="panel-title">Funding Summary</span>
        </div>
        <div class="panel-body">
          <div v-if="loading || !currentCutoff" class="skeleton-body">
            <div
              class="eps-shimmer"
              v-for="n in 5"
              :key="n"
              :style="{ width: n % 2 === 0 ? '55%' : '75%', animationDelay: `${n * 0.12}s` }"
            />
          </div>
          <CutoffFundingSummaryPanel v-else :fmt-currency="fmtCurrency" />
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <q-icon name="location_on" size="18px" class="panel-icon" />
          <span class="panel-title">Site Status</span>
        </div>
        <div class="panel-body">
          <div v-if="loading || !currentCutoff" class="skeleton-body">
            <div
              class="eps-shimmer"
              v-for="n in 4"
              :key="n"
              :style="{ width: n % 2 === 0 ? '65%' : '85%', animationDelay: `${n * 0.12}s` }"
            />
          </div>
          <SiteStatusPanel v-else />
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <QuickActionsBar />
  </div>
</template>

<script setup>
import NeedsYourAttentionPanel from '@/components/pages/Dashboard/NeedsYourAttentionPanel.vue'
import CurrentCutoffPayrollPanel from '@/components/pages/Dashboard/CurrentCutoffPayrollPanel.vue'
import PayrollReadinessPanel from '@/components/pages/Dashboard/PayrollReadinessPanel.vue'
import PayoutGroupsPanel from '@/components/pages/Dashboard/PayoutGroupsPanel.vue'
import CutoffFundingSummaryPanel from '@/components/pages/Dashboard/CutoffFundingSummaryPanel.vue'
import SiteStatusPanel from '@/components/pages/Dashboard/SiteStatusPanel.vue'
import QuickActionsBar from '@/components/pages/Dashboard/QuickActionsBar.vue'

defineProps({
  fmtCurrency: { type: Function, required: true },
  loading: { type: Boolean, default: false },
  currentCutoff: { type: Object, default: null },
})

// ─── Payroll data ────────────────────────────────────────────────────────────
const payrollData = {
  estimated: 418350,
  previous: 397200,
  changePercent: 5.3,
  changeDirection: 'up',
  components: [
    { name: 'Basic Pay', amount: 362400, color: '#1a73e8' },
    { name: 'Authorized OT', amount: 21650, color: '#22c55e' },
    { name: 'Night Diff', amount: 8300, color: '#8b5cf6' },
    { name: 'Holiday Pay', amount: 12000, color: '#f97316' },
    { name: 'Allowances', amount: 25000, color: '#06b6d4' },
    { name: 'Deductions (combined)', amount: -11000, color: '#ef4444' },
  ],
}

const trendLabels = ['Jun 1', 'Jun 16', 'Jul 1', 'Jul 16', 'Jul 31']
const trendValues = [380000, 390000, 400000, 410000, 418350]
</script>

<style scoped>
.tab-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.middle-row {
  display: grid;
  grid-template-columns: 1fr 1.3fr 1fr;
  gap: 16px;
  align-items: stretch;
}
.bottom-row {
  display: grid;
  grid-template-columns: 1fr 1.3fr 1fr;
  gap: 16px;
  align-items: stretch;
}

/* Panel shell reused from other dashboard components */
.panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.panel-body {
  padding: 12px 16px;
  flex: 1;
  min-height: 0;
}

/* Skeleton */
.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100px;
}

@keyframes eps-pulse {
  0%, 100% {
    opacity: 0.45;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.85;
    transform: scaleX(1.015);
  }
}
.eps-shimmer {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e8ecf0 0%, #d1d9e0 50%, #e8ecf0 100%);
  background-size: 200% 100%;
  animation: eps-pulse 1.6s ease-in-out infinite;
  transform-origin: left center;
}

@media (min-width: 1441px) {
  .tab-grid {
    gap: 20px;
  }
  .middle-row,
  .bottom-row {
    gap: 20px;
  }
}

/* 1024px: drop to 2 columns — the wider "payroll" panel takes the second slot
   full-width so it isn't squeezed, remaining panels share the first column. */
@media (max-width: 1024px) {
  .middle-row,
  .bottom-row {
    grid-template-columns: 1fr 1fr;
  }
  .middle-row > :nth-child(2),
  .bottom-row > :nth-child(2) {
    grid-column: 1 / -1;
  }
}

/* 768px: single column, stacked */
@media (max-width: 768px) {
  .tab-grid {
    gap: 12px;
  }
  .middle-row,
  .bottom-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .middle-row > :nth-child(2),
  .bottom-row > :nth-child(2) {
    grid-column: auto;
  }
  .panel-head { padding: 12px 14px; }
  .panel-title { font-size: 14px; }
}
</style>
