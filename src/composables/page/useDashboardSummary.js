/**
 * useDashboardSummary.js
 * ------------------------------------------------------------------
 * Payroll / 13th-Month-Pay summary composable for the Owner Dashboard.
 *
 * ⚠️ TO WIRE UP YOUR REAL ENDPOINT: edit only the block marked
 *    "1. CONFIGURE YOUR ENDPOINT" below. Nothing else needs to change —
 *    every computed value (monthly summaries, annual summary, 13th month
 *    pay, chart series) derives from `cutoffs.value`, so once the fetch
 *    returns real data in the expected shape, the whole dashboard is live.
 *
 * EXPECTED API RESPONSE SHAPE (array of cutoff objects, or
 * { data: [...] } / { results: [...] } wrapper — all three are handled):
 * {
 *   id, company, month: 'YYYY-MM', period_label: 'Jul 1-15, 2026',
 *   start_date: 'YYYY-MM-DD', end_date: 'YYYY-MM-DD',
 *   status: 'completed' | 'in_progress' | 'upcoming',
 *   employees_paid: number,
 *   basic_pay, overtime, night_diff, holiday_pay, allowances, deductions,
 *   total_payroll: number,
 *   payout_groups: [
 *     { id, name, channel, employees, amount, status: 'funded' | 'pending' | 'disputed' }
 *   ],
 * }
 * If your backend uses different field names, adjust ONLY
 * `normalizeCutoff()` in section 2 below — everything downstream stays
 * the same either way.
 *
 * BUSINESS RULES IMPLEMENTED HERE:
 * 1. A cutoff only counts as "done" if status === 'completed' AND
 *    every one of its payout_groups is 'funded'.
 * 2. A MONTH only appears in the Monthly Summary once ALL cutoffs
 *    belonging to it are "done" (e.g. on Jul 16, Jul 1-15 may be done
 *    but Jul 16-31 hasn't started — July is excluded until both close).
 * 3. 13th Month Pay accrual (PH labor standard) = total BASIC PAY
 *    earned across all "done" cutoffs in the calendar year, divided
 *    by 12. Pure earned-to-date VIEW — no release/action lives here.
 * ------------------------------------------------------------------
 */
import { computed, ref } from 'vue'

// ────────────────────────────────────────────────────────────────────
// 1. CONFIGURE YOUR ENDPOINT — this is the only section you should
//    need to touch to go live.
// ────────────────────────────────────────────────────────────────────

// Match whatever your other composables import for HTTP calls.
// Common patterns in this codebase (usePayroll, useEmployees, etc.) —
// uncomment whichever matches, or point it at your own api client:
import { api } from 'boot/axios'
// import apiClient from '@/services/apiClient'
// import { api } from '@/composables/useApi'

const DASHBOARD_SUMMARY_ENDPOINT = '/api/payroll/dashboard/cutoff-summaries'
// e.g. GET /api/payroll/dashboard/cutoff-summaries?company_id=12&year=2026

async function requestCutoffSummaries(params) {
  const { data } = await api.get(DASHBOARD_SUMMARY_ENDPOINT, { params })
  return data
}

// ────────────────────────────────────────────────────────────────────
// 2. Response normalization — adjust field names here only if your
//    API differs from the shape documented above.
// ────────────────────────────────────────────────────────────────────
function normalizeCutoff(raw) {
  return {
    id: raw.id ?? raw.cutoff_id,
    company: raw.company ?? raw.company_name ?? '',
    month: raw.month ?? String(raw.start_date ?? '').slice(0, 7),
    period_label: raw.period_label ?? raw.label ?? raw.period ?? '',
    start_date: raw.start_date ?? raw.period_start,
    end_date: raw.end_date ?? raw.period_end,
    status: raw.status ?? raw.cutoff_status ?? 'upcoming',
    employees_paid: raw.employees_paid ?? raw.total_employees ?? raw.employee_count ?? 0,
    basic_pay: Number(raw.basic_pay ?? 0),
    overtime: Number(raw.overtime ?? raw.authorized_overtime ?? 0),
    night_diff: Number(raw.night_diff ?? raw.night_differential ?? 0),
    holiday_pay: Number(raw.holiday_pay ?? 0),
    allowances: Number(raw.allowances ?? 0),
    deductions: Number(raw.deductions ?? 0),
    total_payroll: Number(raw.total_payroll ?? raw.total_net_pay ?? raw.calculated_amount ?? 0),
    payout_groups: (raw.payout_groups ?? raw.payoutGroups ?? []).map((g) => ({
      id: g.id,
      name: g.name ?? g.group_name,
      channel: g.channel ?? g.payment_channel,
      employees: g.employees ?? g.employee_count ?? 0,
      amount: Number(g.amount ?? g.total_amount ?? 0),
      status: g.status ?? g.funding_status ?? 'pending', // must resolve to 'funded' | 'pending' | 'disputed'
    })),
  }
}

// ────────────────────────────────────────────────────────────────────
// 3. Composable — no changes needed below this line
// ────────────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  return `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const MONTH_LABEL = (ym) => {
  if (!ym) return ''
  return new Date(`${ym}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function useDashboardSummary() {
  const loading = ref(false)
  const cutoffs = ref([])
  const today = ref(new Date())

  /**
   * Call this from your page's onMounted, same as your other
   * fetchXxx() composable functions, e.g.:
   *   await fetchDashboardSummary({ company_id: cid, year: 2026 })
   */
  async function fetchDashboardSummary(params = {}) {
    loading.value = true
    try {
      const raw = await requestCutoffSummaries(params)
      const list = Array.isArray(raw) ? raw : (raw?.data ?? raw?.results ?? [])
      cutoffs.value = list.map(normalizeCutoff)
    } catch (err) {
      console.error('[useDashboardSummary] failed to fetch cutoff summaries:', err)
      cutoffs.value = []
    } finally {
      loading.value = false
    }
  }

  // ─── Derived / business logic ────────────────────────────────────
  const isCutoffDone = (c) =>
    c.status === 'completed' && c.payout_groups.length > 0 && c.payout_groups.every((g) => g.status === 'funded')

  const cutoffsByMonth = computed(() => {
    const map = new Map()
    for (const c of cutoffs.value) {
      if (!c.month) continue
      if (!map.has(c.month)) map.set(c.month, [])
      map.get(c.month).push(c)
    }
    return map
  })

  // A month qualifies for Monthly Summary ONLY when every cutoff
  // belonging to it is "done" (completed + fully funded).
  const closedMonths = computed(() => {
    const result = []
    for (const [month, list] of cutoffsByMonth.value.entries()) {
      if (list.length && list.every(isCutoffDone)) result.push(month)
    }
    return result.sort()
  })

  const currentCutoff = computed(
    () =>
      cutoffs.value.find((c) => c.status === 'in_progress') ??
      [...cutoffs.value].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0] ??
      null,
  )

  function aggregateCutoffs(list) {
    const sum = (key) => list.reduce((acc, c) => acc + (c[key] || 0), 0)
    return {
      basic_pay: sum('basic_pay'),
      overtime: sum('overtime'),
      night_diff: sum('night_diff'),
      holiday_pay: sum('holiday_pay'),
      allowances: sum('allowances'),
      deductions: sum('deductions'),
      total_payroll: sum('total_payroll'),
      employees_paid: list.length ? Math.max(...list.map((c) => c.employees_paid || 0)) : 0,
    }
  }

  // ─── Monthly Summary (per closed month) ──────────────────────────
  const monthlySummaries = computed(() =>
    closedMonths.value.map((month) => {
      const list = cutoffsByMonth.value.get(month)
      const agg = aggregateCutoffs(list)
      return {
        month,
        label: MONTH_LABEL(month),
        cutoffs: list,
        ...agg,
        thirteenth_month_accrual: agg.basic_pay / 12,
      }
    }),
  )

  // ─── Annual Summary (YTD across all closed months only) ──────────
  const annualSummary = computed(() => {
    const closed = monthlySummaries.value
    const agg = aggregateCutoffs(closed.flatMap((m) => m.cutoffs))
    return {
      year: today.value.getFullYear(),
      closedMonthsCount: closed.length,
      ...agg,
      thirteenth_month_ytd: agg.basic_pay / 12,
    }
  })

  // ─── 13th Month Pay — dedicated view-only summary ────────────────
  // NOTE: This is an earned-to-date figure only. No release/action
  // is implied or triggered anywhere in this composable.
  const thirteenthMonthPay = computed(() => {
    const monthly = monthlySummaries.value.map((m) => ({
      month: m.month,
      label: m.label,
      basic_pay: m.basic_pay,
      accrued: m.basic_pay / 12,
    }))
    const ytdBasicPay = monthly.reduce((acc, m) => acc + m.basic_pay, 0)
    return {
      monthly,
      ytd_basic_pay: ytdBasicPay,
      ytd_accrued: ytdBasicPay / 12,
      months_counted: monthly.length,
      as_of: today.value.toISOString().slice(0, 10),
    }
  })

  // ─── Trend series for charts ──────────────────────────────────────
  const monthlyTrendSeries = computed(() =>
    monthlySummaries.value.map((m) => ({ label: m.label.split(' ')[0], value: m.total_payroll })),
  )

  const componentBreakdown = (source) => [
    { name: 'Basic Pay', value: source?.basic_pay ?? 0 },
    { name: 'Authorized OT', value: source?.overtime ?? 0 },
    { name: 'Night Differential', value: source?.night_diff ?? 0 },
    { name: 'Holiday Pay', value: source?.holiday_pay ?? 0 },
    { name: 'Allowances', value: source?.allowances ?? 0 },
  ]

  // ─── Placeholder data for dashboard panels (will populate when backend endpoints exist) ──
  const payrollByCompany = computed(() =>
    monthlySummaries.value.map((m) => ({
      month: m.month,
      companies: [], // [{ name, employees, amount, share }]
    })),
  )

  const paymentChannels = computed(() =>
    monthlySummaries.value.map((m) => ({
      month: m.month,
      channels: [], // [{ name, employees, amount, share }]
    })),
  )

  const employeeReleases = computed(() =>
    monthlySummaries.value.map((m) => ({
      month: m.month,
      releases: [], // [{ label, amount }]
      total: 0,
    })),
  )

  const monthlyComparison = computed(() =>
    monthlySummaries.value.map((m) => ({
      month: m.month,
      label: m.label,
      payroll: m.total_payroll,
      employeesPaid: m.employees_paid,
      avgPerEmployee: m.employees_paid ? Math.round(m.total_payroll / m.employees_paid) : 0,
      changePercent: 0,
    })),
  )

  const annualIndicators = computed(() => ({
    highestPayrollMonth: null,
    lowestPayrollMonth: null,
    largestComponent: 'Basic Pay',
    avgOvertimePercent: 0,
    avgMonthlyEmployeeCount: 0,
    avgMonthlyPayrollGrowth: 0,
    highestCostCompany: null,
  }))

  const ytdComparison = computed(() => ({
    currentYearLabel: String(today.value.getFullYear()),
    previousYearLabel: String(today.value.getFullYear() - 1),
    currentAmount: annualSummary.value.total_payroll,
    previousAmount: 0,
    difference: 0,
    changePercent: 0,
  }))

  return {
    loading,
    today,
    cutoffs,
    fetchDashboardSummary,
    currentCutoff,
    monthlySummaries,
    annualSummary,
    thirteenthMonthPay,
    monthlyTrendSeries,
    componentBreakdown,
    payrollByCompany,
    paymentChannels,
    employeeReleases,
    monthlyComparison,
    annualIndicators,
    ytdComparison,
    isCutoffDone,
    fmtCurrency,
  }
}
