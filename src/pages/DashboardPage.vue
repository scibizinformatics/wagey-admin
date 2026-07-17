<template>
  <PageShell full-height flex-column>
    <q-inner-loading :showing="pageLoading" color="primary" />

    <!-- Header: title + segmented view toggle (Current / Monthly / Annual) -->
    <div class="dash-header">
      <div class="dash-header-left">
        <q-btn-toggle
          v-model="activeView"
          class="view-toggle"
          no-caps
          unelevated
          toggle-color="primary"
          color="white"
          text-color="grey-8"
          :options="[
            { label: 'Current Cutoff', value: 'current' },
            { label: 'Monthly Summary', value: 'monthly' },
            { label: 'Annual Summary', value: 'annual' },
          ]"
        />
      </div>
      <div class="dash-header-right">
        <q-select
          v-model="departmentFilter"
          :options="departmentFilterOptions"
          dense
          outlined
          emit-value
          map-options
          class="header-filter"
        />
        <div class="last-sync">
          <q-icon name="sync" size="14px" />
          Data as of {{ formattedToday }}
        </div>
      </div>
    </div>

    <!-- Top KPI stats row — tab-aware -->
    <DashboardStatsRow :stats-cards="statsCards" :page-loading="pageLoading" />
    <div v-if="activeView === 'annual'" class="annual-note">
      <q-icon name="check_circle" size="16px" color="positive" class="q-mr-sm" />
      12 of 12 scheduled cutoffs completed
    </div>

    <!-- Tabbed payroll summary section -->
    <div class="summary-section">
      <keep-alive>
        <CurrentCutoffTab
          v-if="activeView === 'current'"
          key="current"
          :fmt-currency="fmtCurrencyPeso"
          :loading="summaryLoading"
          :current-cutoff="currentCutoff"
        />
        <MonthlySummaryTab
          v-else-if="activeView === 'monthly'"
          key="monthly"
          :months="monthlySummaries"
          :thirteenth-month-pay="thirteenthMonthPay"
          :component-breakdown="componentBreakdown"
          :fmt-currency="fmtCurrencyPeso"
          :today="formattedToday"
          :loading="summaryLoading"
        />
        <AnnualSummaryTab
          v-else
          key="annual"
          :annual="annualSummary"
          :trend-labels="monthlyTrendSeries.map((m) => m.label)"
          :trend-values="monthlyTrendSeries.map((m) => m.value)"
          :thirteenth-month-pay="thirteenthMonthPay"
          :component-breakdown="componentBreakdown"
          :fmt-currency="fmtCurrencyPeso"
          :loading="summaryLoading"
        />
      </keep-alive>
    </div>

    <!-- Operational panels — hidden for redesigned Current Cutoff tab -->
    <div v-if="activeView !== 'current'" class="main-grid">
      <PayrollStatusPanel
        :rows="payrollRows"
        :columns="payrollColumns"
        :loading="payrollLoading"
      />
      <RecentActivityPanel
        :activities="recentActivities"
        :loading="attendanceLoading || requestsLoading"
      />
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, computed, onMounted } from 'vue'
import { useEmployees } from '@/composables/page/useEmployees'
import { useAttendance } from '@/composables/page/useAttendance'
import { usePayroll } from '@/composables/page/usePayroll'
import { useRequests } from '@/composables/page/useRequests'
import { useCompany, resolvedCompanyId } from '@/composables/page/useCompany'
import { useNotifications } from 'src/composables/useNotifications'
import { useDashboardSummary } from '@/composables/page/useDashboardSummary'

import DashboardStatsRow from '@/components/pages/Dashboard/DashboardStatsRow.vue'
import PayrollStatusPanel from '@/components/pages/Dashboard/PayrollStatusPanel.vue'
import RecentActivityPanel from '@/components/pages/Dashboard/RecentActivityPanel.vue'
import CurrentCutoffTab from '@/components/pages/Dashboard/CurrentCutoffTab.vue'
import MonthlySummaryTab from '@/components/pages/Dashboard/MonthlySummaryTab.vue'
import AnnualSummaryTab from '@/components/pages/Dashboard/AnnualSummaryTab.vue'

// ─── Composables ─────────────────────────────────────────────────────────────
useCompany()

const { fetchEmployees } = useEmployees()
const { attendanceData, loading: attendanceLoading, fetchAttendanceByDate } = useAttendance()
const { payrollRunsSummary, isLoading, fetchPayrollRunsSummary } = usePayroll()
const payrollLoading = computed(() => isLoading('fetchingPayrollRunsSummary'))
const { onDataUpdate } = useNotifications()
const {
  leaveRequests,
  loading: requestsLoading,
  fetchLeaveRequests,
  fetchOvertimeRequests,
  fetchCashAdvanceRequests,
} = useRequests()

// ── Payroll summary / 13th-month-pay data ──
const {
  currentCutoff,
  monthlySummaries,
  annualSummary,
  thirteenthMonthPay,
  monthlyTrendSeries,
  componentBreakdown,
  fmtCurrency: fmtCurrencyPeso,
  today: summaryToday,
  loading: summaryLoading,
  fetchDashboardSummary,
} = useDashboardSummary()

const activeView = ref('current')
const formattedToday = computed(() =>
  summaryToday.value?.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
)

// ── Header filters ──────────────────────────────────────────────────────
// departmentFilter is UI-ready but not yet wired to a fetch param — add one
// once your endpoint supports filtering by department/site.
const departmentFilter = ref('all')
const departmentFilterOptions = computed(() => [
  { label: 'All Departments', value: 'all' },
  // ...map real departments here
])

// ─── Page-level loading ─────────────────────────────────────────────────────
const pageLoading = ref(true)

// ─── Payroll table columns (unchanged) ─────────────────────────────────────
const payrollColumns = [
  { name: 'group', label: 'Group Name', field: 'group', align: 'left' },
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'start', label: 'Start', field: 'start', align: 'left' },
  { name: 'end', label: 'End', field: 'end', align: 'left' },
  { name: 'employees', label: 'No. of Employees', field: 'employees', align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'date', label: 'Date Released', field: 'date', align: 'left' },
  { name: 'amount', label: 'Total Amount', field: 'amount', align: 'right' },
]

// ─── Helpers (unchanged from original) ─────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10)
}
function fmtDate(str) {
  if (!str) return '-'
  const d = new Date(str)
  return isNaN(d)
    ? str
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function cleanGroupName(name) {
  if (!name) return '-'
  let cleaned = String(name)
  cleaned = cleaned.replace(
    /\s*\|?\s*\d{4}[-/]\d{2}[-/]\d{2}\s*[-–]\s*\d{4}[-/]\d{2}[-/]\d{2}\s*$/,
    '',
  )
  cleaned = cleaned.replace(/\s*\|\s*\w+\s*$/, '')
  return cleaned.trim() || '-'
}
function fmtTime(str) {
  if (!str) return ''
  const d = new Date(str)
  return isNaN(d)
    ? str
    : d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}
function fmtCurrency(val) {
  if (val == null) return '-'
  return Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function getEmployeeName(record) {
  if (!record) return ''
  if (record.full_name) return record.full_name
  if (record.name) return record.name
  const u = record.user ?? record.employee ?? record
  if (u.full_name) return u.full_name
  if (u.name) return u.name
  const first = u.first_name ?? u.firstname ?? ''
  const last = u.last_name ?? u.lastname ?? ''
  const full = `${first} ${last}`.trim()
  if (full) return full
  return u.email ?? u.username ?? ''
}

// ─── Stats cards — tab-aware ────────────────────────────────────────────────
const statsCards = computed(() => {
  if (activeView.value === 'current') {
    return [
      {
        icon: 'event',
        label: 'Scheduled',
        count: 42,
        iconBg: '#e8f0fe',
        iconColor: '#1a73e8',
        valueColor: '#1a73e8',
      },
      {
        icon: 'check_circle',
        label: 'Present',
        count: 31,
        iconBg: '#e6f6ea',
        iconColor: '#22c55e',
        valueColor: '#22c55e',
      },
      {
        icon: 'schedule',
        label: 'Late',
        count: 3,
        iconBg: '#fff8e1',
        iconColor: '#f59e0b',
        valueColor: '#f59e0b',
      },
      {
        icon: 'person_off',
        label: 'Absent',
        count: 2,
        iconBg: '#fdecea',
        iconColor: '#ef4444',
        valueColor: '#ef4444',
      },
      {
        icon: 'beach_access',
        label: 'On Leave',
        count: 1,
        iconBg: '#ede9fe',
        iconColor: '#8b5cf6',
        valueColor: '#8b5cf6',
      },
      {
        icon: 'work_off',
        label: 'Unfilled',
        count: 1,
        iconBg: '#fff7ed',
        iconColor: '#f97316',
        valueColor: '#f97316',
      },
    ]
  }

  if (activeView.value === 'monthly') {
    return [
      {
        icon: 'payments',
        label: 'Total Payroll',
        count: '₱1,444,100',
        iconBg: '#e8f0fe',
        iconColor: '#1a73e8',
        valueColor: '#1a73e8',
      },
      {
        icon: 'groups',
        label: 'Employees Paid',
        count: 40,
        iconBg: '#e6f6ea',
        iconColor: '#22c55e',
        valueColor: '#22c55e',
      },
      {
        icon: 'groups_2',
        label: 'Payroll Groups',
        count: 6,
        iconBg: '#ede9fe',
        iconColor: '#8b5cf6',
        valueColor: '#8b5cf6',
      },
      {
        icon: 'account_balance',
        label: 'Total Released',
        count: '₱1,444,100',
        iconBg: '#e0f7fa',
        iconColor: '#0e7490',
        valueColor: '#0e7490',
      },
      {
        icon: 'person',
        label: 'Average Payroll / Employee',
        count: '₱36,103',
        iconBg: '#fff7ed',
        iconColor: '#f97316',
        valueColor: '#f97316',
      },
    ]
  }

  // Annual
  return [
    {
      icon: 'payments',
      label: 'Total Payroll',
      count: '₱8,120,400',
      subtitle: 'Year-to-Date',
      iconBg: '#e8f0fe',
      iconColor: '#1a73e8',
      valueColor: '#1a73e8',
    },
    {
      icon: 'attach_money',
      label: 'Total Employee-Related Cash Released',
      count: '₱8,614,900',
      subtitle: 'Year-to-Date',
      iconBg: '#e0f7fa',
      iconColor: '#0e7490',
      valueColor: '#0e7490',
    },
    {
      icon: 'people',
      label: 'Unique Employees Paid',
      count: 46,
      subtitle: 'Year-to-Date',
      iconBg: '#ede9fe',
      iconColor: '#8b5cf6',
      valueColor: '#8b5cf6',
    },
    {
      icon: 'trending_up',
      label: 'Average Monthly Payroll',
      count: '₱1,353,400',
      subtitle: 'Year-to-Date',
      iconBg: '#fff8e1',
      iconColor: '#f59e0b',
      valueColor: '#f59e0b',
    },
    {
      icon: 'person',
      label: 'Average Payroll per Employee',
      count: '₱176,530',
      subtitle: 'Year-to-Date',
      iconBg: '#e0f7fa',
      iconColor: '#0e7490',
      valueColor: '#0e7490',
    },
  ]
})

// ─── Payroll rows (unchanged) ───────────────────────────────────────────────
const payrollRows = computed(() => {
  const list = Array.isArray(payrollRunsSummary.value)
    ? payrollRunsSummary.value
    : Array.isArray(payrollRunsSummary.value?.data)
      ? payrollRunsSummary.value.data
      : Array.isArray(payrollRunsSummary.value?.results)
        ? payrollRunsSummary.value.results
        : []
  return list.slice(0, 10).map((p, i) => {
    let startDate = '-'
    let endDate = '-'
    if (p.start_date && p.end_date) {
      startDate = fmtDate(p.start_date)
      endDate = fmtDate(p.end_date)
    } else if (p.period) {
      const parts = String(p.period).split(' - ')
      startDate = parts[0] ?? '-'
      endDate = parts[1] ?? '-'
    } else if (p.name) {
      const match = String(p.name).match(
        /(\d{4}[-/]\d{2}[-/]\d{2})\s*[-–]\s*(\d{4}[-/]\d{2}[-/]\d{2})/,
      )
      if (match) {
        startDate = fmtDate(match[1])
        endDate = fmtDate(match[2])
      }
    }
    const releasedAt = p.released_at ?? p.date_released
    const releaseDate = releasedAt ? fmtDate(releasedAt) : '-'
    return {
      id: p.id ?? i,
      group: cleanGroupName(p.name),
      type: p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : 'Payroll Run',
      start: startDate,
      end: endDate,
      employees:
        p.total_employees ?? p.number_of_employee ?? p.employee_count ?? p.employees ?? '-',
      status: p.status ?? '-',
      date: releaseDate,
      amount: fmtCurrency(p.total_net_pay ?? p.calculated_amount),
    }
  })
})

// ─── Recent Activity (unchanged) ────────────────────────────────────────────
const recentActivities = computed(() => {
  const activities = []
  const todayStr = today()
  attendanceData.value
    .filter((a) => {
      const d = a.date ?? a.attendance_date ?? a.time_in ?? a.clock_in ?? ''
      return String(d).startsWith(todayStr) && (a.time_in ?? a.clock_in ?? a.check_in)
    })
    .slice(0, 6)
    .forEach((a) => {
      const name =
        (getEmployeeName(a.employee ?? a.user ?? a) || a.employee_name || a.full_name) ?? null
      if (!name) return
      activities.push({
        id: `att-${a.id}`,
        user: name,
        initial: name.charAt(0).toUpperCase(),
        time: fmtTime(a.time_in ?? a.clock_in ?? a.check_in),
        status: (a.time_out ?? a.clock_out ?? a.check_out) ? 'Clocked-Out' : 'Clocked-In',
        details: a.location_name ?? a.site_name ?? a.source ?? a.cost_center_name ?? '',
      })
    })
  leaveRequests.value.slice(0, 4).forEach((r) => {
    const nameCandidate =
      r.employee_name || r.full_name || getEmployeeName(r.employee ?? r.user ?? r) || null
    const name = nameCandidate && nameCandidate !== 'Unknown' ? nameCandidate : null
    if (!name) return
    activities.push({
      id: `leave-${r.id}`,
      user: name,
      initial: name.charAt(0).toUpperCase(),
      time: fmtTime(r.created_at ?? r.applied_at ?? r.date_applied ?? r.start_date),
      status:
        r.status === 'approved'
          ? 'Leave Approved'
          : r.status === 'pending'
            ? 'Leave Request'
            : `Leave ${r.status ?? ''}`.trim(),
      details: r.leave_type?.name ?? r.leave_type ?? r.type ?? '',
    })
  })
  return activities
    .filter((a) => a.user)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 6)
})

// ─── Bootstrap ───────────────────────────────────────────────────────────────
onMounted(async () => {
  const cid = resolvedCompanyId()

  onDataUpdate('attendance', () => fetchAttendanceByDate(today()))
  onDataUpdate('leave', () => fetchLeaveRequests())
  onDataUpdate('overtime', () => fetchOvertimeRequests())

  await Promise.allSettled([
    fetchEmployees(),
    fetchAttendanceByDate(today()),
    fetchPayrollRunsSummary({ company_id: cid }),
    fetchDashboardSummary({
      company_id: cid,
      year: summaryToday.value.getFullYear(),
    }),
  ])
  await Promise.allSettled([
    fetchLeaveRequests(),
    fetchOvertimeRequests(),
  ])
  if (cid) {
    await Promise.allSettled([fetchCashAdvanceRequests(cid)])
  }
  pageLoading.value = false
})
</script>

<style scoped>
/* ── Header ── */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.dash-header-left,
.dash-header-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.view-toggle {
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  overflow: hidden;
}
.header-filter {
  min-width: 150px;
}
.header-filter :deep(.q-field__control) {
  border-radius: 8px;
  min-height: 38px;
  background: #ffffff;
}
.last-sync {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: #9ca3af;
  white-space: nowrap;
}

/* ── Layout ── */
.summary-section {
  margin: 14px 0;
}
.main-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.annual-note {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #374151;
  margin-top: -6px;
  margin-bottom: 8px;
}

/* ── Responsive: 1440px (wide desktop) ── */
@media (min-width: 1441px) {
  .main-grid {
    gap: 16px;
  }
}

/* ── Responsive: 1024px (tablet / small laptop) ── */
@media (max-width: 1024px) {
  .dash-header {
    gap: 10px;
  }
  .header-filter {
    min-width: 130px;
  }
}

/* ── Responsive: 768px (mobile) ── */
@media (max-width: 768px) {
  .dash-header {
    flex-direction: column;
    align-items: stretch;
  }
  .dash-header-left,
  .dash-header-right {
    width: 100%;
  }
  .dash-header-right {
    justify-content: space-between;
  }
  .view-toggle {
    width: 100%;
  }
  .view-toggle :deep(.q-btn-group) {
    width: 100%;
  }
  .view-toggle :deep(.q-btn) {
    font-size: 11px;
    padding: 6px 8px;
    flex: 1;
  }
  .header-filter {
    min-width: 0;
    flex: 1;
  }
  .dash-title {
    font-size: 18px;
  }
  .last-sync {
    display: none;
  }
}
</style>

<style>
/* Dashboard toggle — matches MainLayout company-tab-active exactly */
.view-toggle .q-btn.bg-primary {
  background: #102335 !important;
  border-color: #102335 !important;
  box-shadow: 0 2px 8px rgba(16, 35, 53, 0.3) !important;
}
</style>
