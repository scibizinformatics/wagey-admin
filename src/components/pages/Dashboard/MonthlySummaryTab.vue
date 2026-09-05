<template>
  <div class="monthly">
    <div v-if="!loading && !months.length" class="notice" role="status">
      <q-icon name="hourglass_empty" size="18px" class="notice__icon" />
      <div>
        <p class="notice__title">No closed month yet</p>
        <p class="notice__body">
          A month appears here once every cutoff inside it is complete and every payout group is
          fully funded. As of {{ today }}, none qualifies.
        </p>
      </div>
    </div>

    <template v-if="loading || months.length">
      <!-- Lead: where this month sits in the run of months, and what it is made of. -->
      <div class="monthly__row monthly__row--lead">
        <MonthlyPayrollTrendPanel
          title="Six-month payroll trend"
          :labels="monthlyTrendSeries.map((m) => m.label)"
          :values="monthlyTrendSeries.map((m) => m.value)"
          chart-type="line"
          :loading="loading"
        />
        <DashPanel
          icon="pie_chart"
          title="Payroll breakdown"
          :subtitle="selected?.label ?? ''"
          :loading="loading"
          :empty="!breakdown.length"
          empty-icon="pie_chart"
          empty-title="No breakdown for this month"
          skeleton="chart"
        >
          <DonutChart :data="breakdown" show-legend />
        </DashPanel>
      </div>

      <!-- Detail: how the month divides across cutoffs and payment channels. -->
      <div class="monthly__row monthly__row--pair">
        <DashPanel
          icon="bar_chart"
          title="Cutoff comparison"
          :subtitle="selected?.label ?? ''"
          :loading="loading"
          :empty="!cutoffLabels.length"
          empty-icon="bar_chart"
          empty-title="No cutoffs closed this month"
          skeleton="chart"
        >
          <TrendChart :labels="cutoffLabels" :values="cutoffValues" type="bar" />
        </DashPanel>

        <PaymentChannelsPanel
          :channels="currentPaymentChannels"
          :total-row="currentPaymentChannelsTotal"
          :loading="loading"
        />
      </div>

      <div class="monthly__row monthly__row--split">
        <OtherEmployeeReleasesPanel
          :releases="currentEmployeeReleases"
          :total="currentEmployeeReleasesTotal"
          :loading="loading"
        />
        <ThirteenthMonthPayPanel :data="thirteenthMonthPay" mode="monthly" :loading="loading" />
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Monthly Summary tab layout.
 *
 * Ordered so the month is understood before it is dissected: the trend places
 * the month in context and the donut says what it is made of, then the two
 * splits (by cutoff, by channel) explain it, then the two supporting ledgers
 * close the tab.
 */
import { computed } from 'vue'
import DashPanel from '@/components/pages/Dashboard/DashPanel.vue'
import TrendChart from '@/components/pages/Dashboard/TrendChart.vue'
import DonutChart from '@/components/pages/Dashboard/DonutChart.vue'
import MonthlyPayrollTrendPanel from '@/components/pages/Dashboard/MonthlyPayrollTrendPanel.vue'
import PaymentChannelsPanel from '@/components/pages/Dashboard/PaymentChannelsPanel.vue'
import OtherEmployeeReleasesPanel from '@/components/pages/Dashboard/OtherEmployeeReleasesPanel.vue'
import ThirteenthMonthPayPanel from '@/components/pages/Dashboard/ThirteenthMonthPayPanel.vue'

const props = defineProps({
  months: { type: Array, required: true },
  monthlyTrendSeries: { type: Array, default: () => [] },
  thirteenthMonthPay: { type: Object, required: true },
  componentBreakdown: { type: Function, required: true },
  paymentChannels: { type: Array, default: () => [] },
  employeeReleases: { type: Array, default: () => [] },
  fmtCurrency: { type: Function, required: true },
  today: { type: String, required: true },
  loading: { type: Boolean, default: false },
  selectedMonth: { type: String, default: null },
})

const selected = computed(
  () =>
    props.months.find((m) => m.month === props.selectedMonth) ??
    props.months[props.months.length - 1],
)

const breakdown = computed(() => (selected.value ? props.componentBreakdown(selected.value) : []))

const cutoffs = computed(() => selected.value?.cutoffs ?? [])
// Defensive only — these cutoffs reach here already normalised, so
// `period_label` is a string. Guarded anyway because an unguarded `.split` in a
// computed blanks the whole tab rather than just this label row.
const cutoffLabels = computed(() =>
  cutoffs.value.map((c) => (c.period_label || '').split(',')[0]),
)
const cutoffValues = computed(() => cutoffs.value.map((c) => c.total_payroll))

// The splits below are each stored as a list of per-month entries, so they both
// resolve the same way: find this month's entry, or fall back to empty.
function entryForSelectedMonth(list) {
  const month = selected.value?.month
  if (!month) return null
  return list.find((p) => p.month === month) ?? null
}

function sumBy(rows, key) {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0)
}

function totalsFor(rows) {
  if (!rows.length) return null
  return { employees: sumBy(rows, 'employees'), amount: sumBy(rows, 'amount') }
}

const currentPaymentChannels = computed(
  () => entryForSelectedMonth(props.paymentChannels)?.channels ?? [],
)
const currentPaymentChannelsTotal = computed(() => totalsFor(currentPaymentChannels.value))

const currentEmployeeReleases = computed(
  () => entryForSelectedMonth(props.employeeReleases)?.releases ?? [],
)
const currentEmployeeReleasesTotal = computed(
  () => entryForSelectedMonth(props.employeeReleases)?.total ?? 0,
)
</script>

<style scoped>
.monthly {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

.monthly__row {
  display: grid;
  gap: var(--dash-gap);
  align-items: stretch;
}

/* The trend is the context; the donut only has to hold a ring and a legend. */
.monthly__row--lead {
  grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
}

/* Two even columns: the by-company split used to sit here, and the cutoff and
   channel panels take the freed width rather than leaving a gap. */
.monthly__row--pair {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.monthly__row--split {
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
}

/* ── Notice ── */
.notice {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  border-radius: var(--dash-r-lg);
  padding: 14px 16px;
}

.notice__icon {
  color: var(--dash-warn-mark);
  flex-shrink: 0;
  margin-top: 1px;
}

.notice__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: #93370d;
  letter-spacing: -0.006em;
}

.notice__body {
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dash-warn);
  max-width: 78ch;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .monthly__row--lead,
  .monthly__row--pair,
  .monthly__row--split {
    grid-template-columns: 1fr;
  }
}
</style>
