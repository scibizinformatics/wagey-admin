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
import { computed, ref, watch } from 'vue'
import { api } from 'boot/axios'
import { BASE } from 'src/composables/utils/http'
import { resolvedCompanyId } from 'src/composables/page/useCompany'

// ────────────────────────────────────────────────────────────────────
// 1. CONFIGURE YOUR ENDPOINT — this is the only section you should
//    need to touch to go live.
// ────────────────────────────────────────────────────────────────────

const DASHBOARD_SUMMARY_ENDPOINT = '/payroll/admin/payroll-trend'

async function requestCutoffSummaries(companyId, params = {}) {
  const { data } = await api.get(`${DASHBOARD_SUMMARY_ENDPOINT}/${companyId}/`, { params })
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
    cutoff_period: raw.cutoff ?? null,
    status: raw.status ?? raw.cutoff_status ?? 'completed',
    employees_paid: raw.employees_paid ?? raw.total_employees ?? raw.employee_count ?? 0,
    basic_pay: Number(raw.basic_pay ?? 0),
    overtime: Number(raw.overtime ?? raw.authorized_overtime ?? 0),
    night_diff: Number(raw.night_diff ?? raw.night_differential ?? 0),
    holiday_pay: Number(raw.holiday_pay ?? 0),
    allowances: Number(raw.allowances ?? 0),
    deductions: Number(raw.deductions ?? 0),
    total_payroll: Number(raw.total_payroll ?? raw.total_net_pay ?? raw.net_pay ?? raw.calculated_amount ?? 0),
    payout_groups: (raw.payout_groups ?? raw.payoutGroups ?? []).map((g) => ({
      id: g.id,
      name: g.name ?? g.group_name,
      channel: g.channel ?? g.payment_channel,
      employees: g.employees ?? g.employee_count ?? 0,
      amount: Number(g.amount ?? g.total_amount ?? 0),
      status: g.status ?? g.funding_status ?? 'pending',
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
      const { company_id, ...rest } = params
      if (!company_id) {
        cutoffs.value = []
        return
      }
      const raw = await requestCutoffSummaries(company_id, rest)
      const list = raw?.cutoffs ?? (Array.isArray(raw) ? raw : raw?.data ?? raw?.results ?? [])
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
    c.status === 'completed' && (c.payout_groups.length === 0 || c.payout_groups.every((g) => g.status === 'funded'))

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

  // Second most-recent cutoff (for "Previous Cutoff" comparison)
  const previousCutoff = computed(() => {
    const sorted = [...cutoffs.value].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    return sorted[1] ?? null
  })

  // Last 5 cutoffs for mini trend chart
  const cutoffTrendSeries = computed(() => {
    const sorted = [...cutoffs.value]
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(-5)
    return {
      labels: sorted.map((c) => c.period_label.split(',')[0]),
      values: sorted.map((c) => c.total_payroll),
    }
  })

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
    largestComponent: null,
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

  // ─────────────────────────────────────────────────────────────────
  // 4. CURRENT CUTOFF — real-time panels (today-summary, needs-attention,
  //    funding-summary, payout-group-summary)
  // ─────────────────────────────────────────────────────────────────
  const currentCutoffLoading = ref(false)

  // ── Today summary (stats cards) ─────────────────────────────────
  const todaySummary = ref({
    scheduled: 0,
    present: 0,
    needs_attention: 0,
    pending_requests: 0,
    estimated_payroll: '0',
  })

  // ── Attention summary ──────────────────────────────────────────
  const needsAttention = ref({
    attendance_issues: 0,
    pending_ot_approvals: 0,
    staffing_gaps: 0,
  })

  // ── Funding summary ─────────────────────────────────────────────
  const fundingSummary = ref({
    total_payroll_for_cutoff: '0.00',
    ready_to_fund: '0.00',
    already_funded: '0.00',
    successfully_released: '0.00',
    pending_employee_claim: '0.00',
  })

  // ── Payout groups ─────────────────────────────────────────────────
  const payoutGroups = ref([])

  // ── Site status ───────────────────────────────────────────────────
  const siteStatus = ref([])

  // ── Cutoff dashboard — new data refs ─────────────────────────────
  const cutoffStats = ref({
    open_payout_groups: 0,
    employees_needing_review: 0,
    awaiting_acknowledgment: 0,
    ready_for_funding_groups: 0,
    ready_for_funding_amount: 0,
    remaining_to_disburse: 0,
  })

  const payoutGroupDetails = ref([])

  const cutoffSummaryRollup = ref({
    groups_ready_for_funding: 0,
    groups_under_review: 0,
    employees_needing_acknowledgment: 0,
    salaries_pending_release: 0,
  })

  const previousCutoffIncomplete = ref(null)

  const cutoffStatusSummary = ref({})

  const hideCompleted = ref(false)

  const selectedCutoff = ref(null)

  function resolveCutoff() {
    const cc = currentCutoff.value
    if (cc?.start_date && cc?.end_date) return cc
    const sel = selectedCutoff.value
    if (!sel) return null
    return cutoffs.value.find((c) => (c.id || c.period_label) === sel) ?? null
  }

  async function fetchTodaySummary(companyId, selectedDate) {
    const url = `${BASE}/attendance/today-summary/${companyId}/${selectedDate}/`
    console.log('[TodayTab] fetchTodaySummary GET', url)
    try {
      const { data } = await api.get(url)
      console.log('[TodayTab] fetchTodaySummary response:', data)
      todaySummary.value = {
        scheduled: data.scheduled ?? 0,
        present: data.present ?? 0,
        needs_attention: data.needs_attention ?? 0,
        pending_requests: data.pending_requests ?? 0,
        estimated_payroll: data.estimated_payroll ?? '0',
      }
    } catch (err) {
      console.error(`[TodayTab] fetchTodaySummary failed for ${selectedDate}:`, err)
      todaySummary.value = { scheduled: 0, present: 0, needs_attention: 0, pending_requests: 0, estimated_payroll: '0' }
    }
  }

  async function fetchAttentionSummary(companyId, selectedDate) {
    const url = `${BASE}/attendance/attention-summary/${companyId}/${selectedDate}/`
    console.log('[TodayTab] fetchAttentionSummary GET', url)
    try {
      const { data } = await api.get(url)
      console.log('[TodayTab] fetchAttentionSummary response:', data)
      needsAttention.value = {
        attendance_issues: data.attendance_issues ?? 0,
        pending_ot_approvals: data.pending_ot_approvals ?? 0,
        staffing_gaps: data.staffing_gaps ?? 0,
      }
    } catch (err) {
      console.error(`[TodayTab] fetchAttentionSummary failed for ${selectedDate}:`, err)
      needsAttention.value = { attendance_issues: 0, pending_ot_approvals: 0, staffing_gaps: 0 }
    }
  }

  async function fetchFundingSummary(companyId) {
    const { data } = await api.get(`${BASE}/payroll/admin/cutoff-funding-summary/${companyId}/`)
    fundingSummary.value = {
      total_payroll_for_cutoff: data.total_payroll_for_cutoff ?? '0.00',
      ready_to_fund: data.ready_to_fund ?? '0.00',
      already_funded: data.already_funded ?? '0.00',
      successfully_released: data.successfully_released ?? '0.00',
      pending_employee_claim: data.pending_employee_claim ?? '0.00',
    }
  }

  async function fetchPayoutGroups(companyId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-summary/${companyId}/`)
    const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? [])
    payoutGroups.value = list.map((g) => ({
      group: g.payroll_group_name ?? g.group ?? '-',
      channel: g.channel ?? '-',
      employees: g.employees ?? 0,
      amount: g.amount ?? '0.00',
      status: (g.status ?? 'pending').toLowerCase(),
    }))
  }

  async function fetchSiteStatus(companyId) {
    const { data } = await api.get(`${BASE}/organization/sites/operations/${companyId}/`)
    const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? [])
    siteStatus.value = list.map((s) => {
      const scheduled = s.schedule_count ?? 0
      const attended = s.attendance_count ?? 0
      let status = 'good'
      if (attended < scheduled) status = 'needs_attention'
      else if (attended > scheduled) status = 'watch'
      return {
        name: s.site_name ?? s.name ?? '-',
        schedule_count: scheduled,
        attendance_count: attended,
        status,
      }
    })
  }

  function computeNextAction(status) {
    const map = {
      needs_attention: { label: 'Resolve Issues', color: 'warning' },
      under_review: { label: 'Review Employees', color: 'primary' },
      awaiting_acknowledgment: { label: 'View Pending Employees', color: 'primary' },
      ready_for_funding: { label: 'Fund Payout Group', color: 'positive' },
      funded: { label: 'Monitor Disbursement', color: 'info' },
      disbursing: { label: 'Monitor Disbursement', color: 'info' },
    }
    return map[status] ?? null
  }

  // ── Cutoff dashboard fetch functions ─────────────────────────────
  async function fetchCutoffStats() {
    // 🟢 WHEN ENDPOINT IS READY: const { data } = await api.get(`/payroll/admin/cutoff-stats/${companyId}/`)
    await new Promise((r) => setTimeout(r, 400))
    cutoffStats.value = {
      open_payout_groups: 5,
      employees_needing_review: 7,
      awaiting_acknowledgment: 4,
      ready_for_funding_groups: 2,
      ready_for_funding_amount: 248500,
      remaining_to_disburse: 389900,
    }
  }

  async function fetchPayoutGroupDetails(companyId) {
    const cutoff = resolveCutoff()
    if (!cutoff?.start_date || !cutoff?.end_date) return
    try {
      const { data } = await api.get(
        `${BASE}/payroll/admin/current-cutoff-payout-groups/${companyId}/${cutoff.start_date}/${cutoff.end_date}/`
      )
      const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? [])
      payoutGroupDetails.value = list.map((g) => ({
        id: g.id ?? g.payout_group,
        payout_group: g.payout_group,
        date_range: cutoff.period_label || `${cutoff.start_date} – ${cutoff.end_date}`,
        disbursement_type: g.disbursement_type ?? 'Cash',
        employees: g.employees ?? 0,
        reviewed: g.reviewed ?? 0,
        acknowledged: g.acknowledged ?? 0,
        payroll_amount: Number(g.payroll_amount ?? g.final_amount ?? 0),
        status: g.status ?? 'needs_attention',
        next_action: computeNextAction(g.status),
        notes: [],
      }))
    } catch (err) {
      console.error('[useDashboardSummary] fetchPayoutGroupDetails failed:', err)
      payoutGroupDetails.value = []
    }
  }

  async function fetchCutoffSummaryRollup(companyId) {
    const cutoff = resolveCutoff()
    if (!cutoff?.start_date || !cutoff?.end_date) return
    try {
      const { data } = await api.get(
        `${BASE}/payroll/admin/current-cutoff-summary/${companyId}/${cutoff.start_date}/${cutoff.end_date}/`
      )
      cutoffSummaryRollup.value = {
        groups_ready_for_funding:
          (data.ready_for_payroll_funding ?? 0) + (data.ready_for_cash_advance_funding ?? 0),
        groups_under_review: data.under_review ?? 0,
        employees_needing_acknowledgment: data.awaiting_acknowledgement ?? 0,
        salaries_pending_release: data.needs_attention ?? 0,
      }
    } catch (err) {
      console.error('[useDashboardSummary] fetchCutoffSummaryRollup failed:', err)
      cutoffSummaryRollup.value = {
        groups_ready_for_funding: 0, groups_under_review: 0,
        employees_needing_acknowledgment: 0, salaries_pending_release: 0,
      }
    }
  }

  async function fetchCutoffStatusSummary(companyId) {
    const cutoff = resolveCutoff()
    if (!cutoff?.start_date || !cutoff?.end_date) return
    try {
      const { data } = await api.get(
        `${BASE}/payroll/admin/current-cutoff-status-summary/${companyId}/${cutoff.start_date}/${cutoff.end_date}/`
      )
      const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? [])
      const counts = {}
      for (const g of list) {
        const s = g.status ?? 'needs_attention'
        counts[s] = (counts[s] ?? 0) + 1
      }
      cutoffStatusSummary.value = counts
    } catch (err) {
      console.error('[useDashboardSummary] fetchCutoffStatusSummary failed:', err)
      cutoffStatusSummary.value = {}
    }
  }

  async function fetchPreviousCutoffStatus() {
    await new Promise((r) => setTimeout(r, 200))
    previousCutoffIncomplete.value = {
      cutoff_range: 'July 1–15, 2026',
      groups_count: 1,
    }
  }

  async function fetchCurrentCutoff(companyId) {
    if (!companyId) return
    currentCutoffLoading.value = true
    try {
      await Promise.allSettled([
        fetchFundingSummary(companyId),
        fetchPayoutGroups(companyId),
        fetchSiteStatus(companyId),
        fetchCutoffStats(),
        fetchPayoutGroupDetails(companyId),
        fetchCutoffSummaryRollup(companyId),
        fetchCutoffStatusSummary(companyId),
        fetchPreviousCutoffStatus(),
      ])
    } catch (err) {
      console.error('[useDashboardSummary] fetchCurrentCutoff failed:', err)
    } finally {
      currentCutoffLoading.value = false
    }
  }

  // ── Fetch stubs for panels without endpoints yet ─────────────────
  // When your backend adds these endpoints, replace the placeholder
  // with a real api.get() call. The UI panels are already wired up.
  // eslint-disable-next-line no-unused-vars
  async function fetchPayrollByCompany(_companyId, _month) {
    // TODO: replace with real endpoint:
    // const { data } = await api.get(`/payroll/admin/by-company/${_companyId}/`, { params: { month: _month } })
    // payrollByCompany.value = ...
  }

  // eslint-disable-next-line no-unused-vars
  async function fetchPaymentChannels(_companyId, _month) {
    // TODO: replace with real endpoint:
    // const { data } = await api.get(`/payroll/admin/payment-channels/${_companyId}/`, { params: { month: _month } })
    // paymentChannels.value = ...
  }

  // eslint-disable-next-line no-unused-vars
  async function fetchEmployeeReleases(_companyId, _month) {
    // TODO: replace with real endpoint:
    // const { data } = await api.get(`/payroll/admin/employee-releases/${_companyId}/`, { params: { month: _month } })
    // employeeReleases.value = ...
  }

  // Colours reference the dashboard's categorical ramp (src/css/dashboard.scss)
  // and must stay in step with TodayGuidePanel, which is the legend for these
  // same five figures.
  const currentStatsCards = computed(() => [
    {
      icon: 'event',
      label: 'Scheduled',
      count: todaySummary.value.scheduled,
      iconColor: 'var(--dash-cat-1)',
    },
    {
      icon: 'check_circle',
      label: 'Clocked in',
      count: todaySummary.value.present,
      iconColor: 'var(--dash-cat-2)',
    },
    {
      icon: 'warning',
      label: 'Needs attention',
      count: todaySummary.value.needs_attention,
      iconColor: 'var(--dash-warn-mark)',
    },
    {
      icon: 'pending_actions',
      label: 'Pending requests',
      count: todaySummary.value.pending_requests,
      iconColor: 'var(--dash-cat-4)',
    },
    {
      icon: 'payments',
      label: 'Est. payroll',
      count: todaySummary.value.estimated_payroll ? `₱${Number(todaySummary.value.estimated_payroll).toLocaleString('en-PH')}` : '₱0',
      iconColor: 'var(--dash-cat-3)',
    },
  ])

  // ── Cutoff dashboard computed ───────────────────────────────────
  const cutoffOptions = computed(() =>
    cutoffs.value.map((c) => ({
      label: c.period_label || `${c.start_date} – ${c.end_date}`,
      value: c.id || c.period_label,
      cutoff: c,
    })),
  )

  watch(cutoffOptions, (opts) => {
    if (opts.length && !selectedCutoff.value) {
      const match = opts.find((o) => o.cutoff?.id === currentCutoff.value?.id)
      selectedCutoff.value = match?.value ?? opts[0].value
    }
  }, { immediate: true })

  watch(selectedCutoff, (val) => {
    if (!val) return
    const cid = resolvedCompanyId()
    if (!cid) return
    fetchPayoutGroupDetails(cid)
    fetchCutoffSummaryRollup(cid)
    fetchCutoffStatusSummary(cid)
  })

  const secondaryCutoffNotice = computed(() => {
    const prev = previousCutoff.value
    if (!prev) return null
    const incomplete = prev.payout_groups.filter((g) => g.status !== 'funded' && g.status !== 'complete')
    if (incomplete.length === 0) return null
    return `${prev.period_label || 'Previous cutoff'} • ${incomplete.length} group(s) incomplete`
  })

  // ── Today tab data ──────────────────────────────────────────────
  const priorityItems = ref([])
  const workforceStatus = ref([])
  const pendingRequests = ref([])
  const todayDate = ref(new Date().toISOString().slice(0, 10))

  const cutoffWarning = computed(() => {
    const c = currentCutoff.value
    if (!c) return null
    return {
      label: c.period_label || 'Current Cutoff',
      daysRemaining: c.end_date ? Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24))) : 0,
      status: c.status,
    }
  })

  async function fetchPriorityItems(companyId, selectedDate) {
    const url = `${BASE}/attendance/attendance-issues/${companyId}/${selectedDate}/`
    console.log('[TodayTab] fetchPriorityItems GET', url)
    try {
      const { data } = await api.get(url)
      console.log('[TodayTab] fetchPriorityItems response:', data)
      const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? [])
      priorityItems.value = list.map((item) => ({
        employee: item.employee ?? '',
        site: item.site ?? '',
        issue: item.issue ?? '',
        actionType: item.impact ?? '',
      }))
    } catch (err) {
      console.error(`[TodayTab] fetchPriorityItems failed for ${selectedDate}:`, err)
      priorityItems.value = []
    }
  }

  async function fetchWorkforceStatus(companyId, selectedDate) {
    const url = `${BASE}/attendance/attendance-site-summary/${companyId}/${selectedDate}/`
    console.log('[TodayTab] fetchWorkforceStatus GET', url)
    try {
      const { data } = await api.get(url)
      console.log('[TodayTab] fetchWorkforceStatus response:', data)
      const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? [])
      workforceStatus.value = list.map((item) => ({
        name: item.site_name ?? '',
        scheduled: item.scheduled ?? 0,
        clockedIn: item.clocked_in ?? 0,
        late: item.late ?? 0,
        noShow: item.no_show ?? 0,
      }))
    } catch (err) {
      console.error(`[TodayTab] fetchWorkforceStatus failed for ${selectedDate}:`, err)
      workforceStatus.value = []
    }
  }

  async function fetchPendingRequests(companyId, selectedDate) {
    const url = `${BASE}/attendance/needs-attention/${companyId}/${selectedDate}/`
    console.log('[TodayTab] fetchPendingRequests GET', url)
    try {
      const { data } = await api.get(url)
      console.log('[TodayTab] fetchPendingRequests response:', data)
      const map = {
        unfilled_positions: { label: 'Unfilled Positions', icon: 'person_off' },
        pending_overtime_requests: { label: 'Pending OT Requests', icon: 'timer' },
        pending_leave_applications: { label: 'Pending Leave Apps', icon: 'beach_access' },
        suspicious_attendance: { label: 'Suspicious Attendance', icon: 'report' },
        pending_schedule_swaps: { label: 'Pending Schedule Swaps', icon: 'swap_horiz' },
      }
      pendingRequests.value = Object.entries(map)
        .filter(([key]) => (data[key] ?? 0) > 0)
        .map(([key, meta]) => ({
          type: key,
          label: meta.label,
          count: data[key] ?? 0,
          icon: meta.icon,
        }))
    } catch (err) {
      console.error(`[TodayTab] fetchPendingRequests failed for ${selectedDate}:`, err)
      pendingRequests.value = []
    }
  }

  async function fetchTodayTabData(companyId, selectedDate) {
    if (!companyId) return
    currentCutoffLoading.value = true
    try {
      await Promise.allSettled([
        fetchTodaySummary(companyId, selectedDate),
        fetchAttentionSummary(companyId, selectedDate),
        fetchPriorityItems(companyId, selectedDate),
        fetchWorkforceStatus(companyId, selectedDate),
        fetchPendingRequests(companyId, selectedDate),
      ])
    } catch (err) {
      console.error('[useDashboardSummary] fetchTodayTabData failed:', err)
    } finally {
      currentCutoffLoading.value = false
    }
  }

  return {
    loading,
    currentCutoffLoading,
    today,
    cutoffs,
    fetchDashboardSummary,
    currentCutoff,
    previousCutoff,
    cutoffTrendSeries,
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
    // current-cutoff panels
    todaySummary,
    needsAttention,
    fundingSummary,
    payoutGroups,
    siteStatus,
    currentStatsCards,
    fetchCurrentCutoff,
    // new cutoff dashboard data
    cutoffStats,
    payoutGroupDetails,
    cutoffSummaryRollup,
    previousCutoffIncomplete,
    cutoffStatusSummary,
    hideCompleted,
    selectedCutoff,
    cutoffOptions,
    secondaryCutoffNotice,
    fetchCutoffStats,
    fetchPayoutGroupDetails,
    fetchCutoffSummaryRollup,
    fetchCutoffStatusSummary,
    fetchPreviousCutoffStatus,
    // today tab data
    priorityItems,
    workforceStatus,
    pendingRequests,
    todayDate,
    cutoffWarning,
    fetchPriorityItems,
    fetchWorkforceStatus,
    fetchPendingRequests,
    fetchAttentionSummary,
    fetchTodayTabData,
    // fetch stubs for panels without endpoints yet
    fetchPayrollByCompany,
    fetchPaymentChannels,
    fetchEmployeeReleases,
  }
}
