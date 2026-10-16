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
import { computed, ref, watch, onScopeDispose } from 'vue'
import { api } from 'boot/axios'
import { BASE } from 'src/composables/utils/http'
import { resolvedCompanyId } from 'src/composables/page/useCompany'
import { todayIso } from 'src/composables/utils/calendarDate'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { normalizeCutoffInstance } from 'src/composables/utils/leaveCutoffs'
import {
  companyCutoffShapes as companyCutoffShapesShared,
  cutoffShape,
} from 'src/composables/utils/cutoffState'
import { countCutoffStages, normalizeCutoffStage } from 'src/composables/utils/cutoffStatus'

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

// `cutoffShape`, `SEMI_MONTHLY_SHAPES` and `companyCutoffShapes` now live in
// `utils/cutoffState.js`, where the Disbursement list reads them too. They used to
// live here, which meant the one rule for "which cutoffs are this company's" was
// only available to the one screen that needed it. Re-exported below because this
// module's own doc and callers still name `cutoffShape`.

export { cutoffShape }

export function useDashboardSummary() {
  const loading = ref(false)
  const cutoffs = ref([])

  /**
   * Every cutoff the reader may pick from, which is a superset of `cutoffs`.
   *
   * `cutoffs` comes from `payroll-trend` and carries the money; it is what every
   * aggregation reads, and folding extra rows into it would change what those
   * aggregations mean — a zero-money in-progress cutoff added to a month would
   * flip that month out of `closedMonths` and quietly move the 13th-month ledger.
   *
   * The picker, though, has to offer every cutoff the company has, including one
   * no payroll has been run for yet, or the reader cannot ask about it. Those come
   * from `cutoff-instances` — the same list the Disbursement page and the leave
   * filters read — so the two screens cannot disagree about which cutoffs exist.
   * `normalizeCutoffInstance` is that module's reader of the payload's several
   * spellings for a name and a window; only `id`, `period_label` and the window
   * travel over, because that is all the current-cutoff fetches ask for.
   */
  const allCutoffs = ref([])

  /**
   * "Today", in the viewer's timezone, kept current.
   *
   * Two bugs used to live in these two refs.
   *
   * The dates were computed in UTC — `new Date().toISOString().slice(0, 10)` —
   * which in Manila (UTC+8) reports *yesterday* until 08:00 local. `todayDate`
   * is a path segment on `/attendance/today-summary/{company}/{date}/` and
   * `/attendance/attendance-issues/...`, so an admin opening the dashboard at
   * 7am was shown yesterday's attendance labelled as today's. It corrected
   * itself at 08:00, which is why it survived. Both now go through
   * `todayIso()` (composables/utils/calendarDate.js), which reads local
   * calendar fields instead of serialising an instant.
   *
   * And both were captured once, when the composable was created, so a
   * dashboard left open overnight — the sort of screen people never close —
   * kept reporting the previous day, and `currentYearLabel` stayed stale for
   * the whole of January. The rollover check below fixes that.
   */
  const today = ref(new Date())
  const todayDate = ref(todayIso())

  // Checked once a minute rather than scheduled for midnight: a laptop that
  // sleeps through midnight never fires a timer set for it, and a minute of
  // staleness on a date label is not worth the complexity of rescheduling.
  let lastIso = todayDate.value
  const rolloverTimer = setInterval(() => {
    const current = todayIso()
    if (current === lastIso) return

    today.value = new Date()
    // `todayDate` is also the model of the dashboard's date picker, so it is
    // only advanced while it still tracks the real today. Once a person has
    // picked a different day, rolling it over under them would move the page
    // out from under a reader.
    if (todayDate.value === lastIso) todayDate.value = current
    lastIso = current
  }, 60_000)

  onScopeDispose(() => clearInterval(rolloverTimer))

  /**
   * Which window shapes count as this company's cutoffs.
   *
   * Nothing in the app knows a cutoff *type* — `cutoff-instances` sends a name and
   * a window and no type or company field, and the labor-rule settings endpoint
   * carries only `time_format`. So the type is learned from the one source that
   * is already scoped to the company: `payroll-trend` answers about this
   * workspace's own cutoffs, so whatever shape those follow is the shape this
   * company uses. `cutoff-instances` is not scoped the same way and lists every
   * cutoff type in the workspace, which is why it needs narrowing before it can
   * be offered.
   *
   * The semi-monthly pair is completed deliberately. A company whose history so
   * far holds only one half — a new company, or a year not yet past the 16th —
   * would otherwise have the other half filtered out, and that other half is
   * usually the cutoff in progress, the one the reader most wants to open.
   *
   * @returns {Set<string>}
   */
  function companyCutoffShapes() {
    return companyCutoffShapesShared(cutoffs.value)
  }

  /**
   * Widens the pickable cutoff list beyond what `payroll-trend` returned.
   *
   * Best-effort by design: the trend figures above stand on their own, so a
   * failure here must not empty the dashboard. It only costs the reader the
   * cutoffs nobody has run payroll for, and `mergeAllCutoffs` is called again on
   * the next load.
   *
   * Only cutoffs of the company's own type are kept. If the shapes agree with
   * nothing — the two endpoints describing their windows differently — the filter
   * drops every extra row and the picker falls back to the `payroll-trend`
   * cutoffs, which is the list this tab had before it was widened. Losing the
   * extra options is recoverable; offering cutoffs of a type the company's own
   * payroll rejects is not.
   */
  async function loadAllCutoffs() {
    const { fetchCutoffInstances } = useDisbursementApi()
    try {
      const raw = await fetchCutoffInstances()
      const list = Array.isArray(raw) ? raw : (raw?.results ?? raw?.data ?? [])
      const allowedShapes = companyCutoffShapes()
      const extra = (Array.isArray(list) ? list : [])
        .map(normalizeCutoffInstance)
        .filter((c) => c && c.id !== null && c.startIso && c.endIso)
        .filter((c) => allowedShapes.has(cutoffShape(c.startIso, c.endIso)))
        .map((c) => ({
          id: c.id,
          period_label: c.label,
          start_date: c.startIso,
          end_date: c.endIso,
          month: c.startIso.slice(0, 7),
          // No money: this row exists so the reader can select a cutoff, not so
          // it can be totalled. `cutoffs` remains the only source of figures.
        }))
      mergeAllCutoffs(extra)
    } catch (err) {
      console.error('[useDashboardSummary] could not widen the cutoff list:', err)
    }
  }

  /**
   * The union, keyed by id, rebuilt from scratch each time so a cutoff the
   * backend has stopped returning does not linger in the picker.
   *
   * `cutoffs` is applied second and therefore wins where both carry the same
   * cutoff: it is the row holding the figures, and letting an `cutoff-instances`
   * row overwrite it would leave the tab reading zero for a month that has money.
   */
  function mergeAllCutoffs(extra) {
    const byId = new Map()
    for (const c of extra) byId.set(String(c.id), c)
    for (const c of cutoffs.value) {
      if (c.id != null) byId.set(String(c.id), c)
    }
    allCutoffs.value = [...byId.values()].sort(
      (a, b) => new Date(a.start_date ?? 0) - new Date(b.start_date ?? 0),
    )
  }

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
        allCutoffs.value = []
        return
      }
      const raw = await requestCutoffSummaries(company_id, rest)
      const list = raw?.cutoffs ?? (Array.isArray(raw) ? raw : raw?.data ?? raw?.results ?? [])
      cutoffs.value = list.map(normalizeCutoff)
      // The trend rows go in first so the picker is usable even if the wider list
      // below fails: `mergeAllCutoffs` reads `cutoffs.value`, so it has to be
      // populated before either merge runs.
      mergeAllCutoffs([])
      await loadAllCutoffs()
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
      // Defensive only: `normalizeCutoff` coerces `period_label` to `''`, and
      // everything in `cutoffs.value` goes through it, so this cannot be null
      // today. Kept because the cost is one `|| ''` and the failure mode is
      // disproportionate — a `.split` on null throws *inside a computed*, which
      // takes down the render of every panel on the tab, not just this chart.
      labels: sorted.map((c) => (c.period_label || '').split(',')[0]),
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

  // ─── The whole calendar year, closed or not ───────────────────────
  // `monthlySummaries` above is deliberately the closed months only: it backs the
  // 13th-month ledger and the YTD channel totals, which must not count a month
  // twice and must not read an open month as "latest". The month picker, the
  // annual chart and the annual "Month by month" table want the opposite — the
  // full year — so they read this instead.
  //
  // Every month aggregates whatever cutoffs it actually holds, so a month that is
  // still running shows its actual-to-date figures instead of a row of zeros that
  // reads like "nobody was paid". `closed` and `hasData` are carried per entry so
  // a renderer can tell the two cases apart: a month with no cutoffs yet is not
  // the same statement as a month that earned nothing.
  const yearMonths = computed(() => {
    const year = today.value.getFullYear()
    return Array.from({ length: 12 }, (_, i) => {
      const month = `${year}-${String(i + 1).padStart(2, '0')}`
      const list = cutoffsByMonth.value.get(month) ?? []
      const agg = aggregateCutoffs(list)
      return {
        month,
        label: MONTH_LABEL(month),
        cutoffs: list,
        hasData: list.length > 0,
        closed: list.length > 0 && list.every(isCutoffDone),
        ...agg,
        thirteenth_month_accrual: agg.basic_pay / 12,
      }
    })
  })

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
      as_of: todayIso(),
    }
  })

  // ─── Trend series for charts ──────────────────────────────────────
  // The whole year, for the annual tab. The `split` turns "January 2026" into the
  // axis label "January"; the year is already in the panel's title.
  const yearTrendSeries = computed(() =>
    yearMonths.value.map((m) => ({ label: m.label.split(' ')[0], value: m.total_payroll })),
  )

  // ─── Month picker (Monthly tab) ───────────────────────────────────
  // Kept here beside the cutoff picker for the same reason: both scope a tab's
  // panels to one period, and both are read by a computed series that needs the
  // selection. The options are all twelve months rather than the closed ones, so
  // a reader can open a month that has not closed yet and see what it holds so
  // far, instead of being unable to name it at all.
  const selectedMonth = ref(null)

  const monthOptions = computed(() =>
    yearMonths.value.map((m) => ({ label: m.label, value: m.month })),
  )

  watch(
    yearMonths,
    (list) => {
      if (!list.length) return
      // A selection that still exists is left alone, so a refetch cannot move the
      // month out from under the reader mid-session.
      if (selectedMonth.value && list.some((m) => m.month === selectedMonth.value)) return
      // Otherwise the most recent month that has actually closed — the only one
      // whose figures are final — falling back to the current month on a company
      // whose first payroll has not run yet.
      const closed = list.filter((m) => m.closed)
      selectedMonth.value =
        closed[closed.length - 1]?.month ?? list[today.value.getMonth()]?.month ?? list[0].month
    },
    { immediate: true },
  )

  // The Monthly tab's six-month window runs FORWARD from the selected month, so
  // the selection is the left-hand point rather than the last one. A month near
  // the end of the year therefore shows months ahead of it that nothing has
  // happened in yet — which is the honest answer, and why the panel's subtitle
  // skips empty months rather than reporting a fall to zero.
  const monthlyTrendWindow = computed(() => {
    const list = yearMonths.value
    const found = list.findIndex((m) => m.month === selectedMonth.value)
    const start = found >= 0 ? found : Math.max(0, list.length - 1)
    return list.slice(start, start + 6)
  })

  const monthlyTrendSeries = computed(() =>
    monthlyTrendWindow.value.map((m) => ({ label: m.label.split(' ')[0], value: m.total_payroll })),
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

  // The annual "Month by month" table — one row per month of the year, closed or
  // not. `hasData` travels so the table can print an em dash for a month nothing
  // has run in yet: "no payroll has happened" and "payroll of zero" are different
  // statements, and ₱0 would assert the second one.
  //
  // The change column compares each month with the one before it, and is skipped
  // entirely unless both months have figures and the earlier one is non-zero,
  // because a percentage against nothing is not a percentage.
  const monthlyComparison = computed(() =>
    yearMonths.value.map((m, i, list) => {
      const prev = list[i - 1]
      const comparable = Boolean(prev && prev.hasData && m.hasData && prev.total_payroll > 0)
      return {
        month: m.month,
        label: m.label,
        payroll: m.total_payroll,
        employeesPaid: m.employees_paid,
        avgPerEmployee: m.employees_paid ? Math.round(m.total_payroll / m.employees_paid) : 0,
        changePercent: comparable
          ? Math.round(((m.total_payroll - prev.total_payroll) / prev.total_payroll) * 1000) / 10
          : null,
        hasData: m.hasData,
        closed: m.closed,
      }
    }),
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

  /**
   * Backs the alert at the top of the Current Cutoff tab: a prior cutoff that
   * never finished disbursing.
   *
   * This used to be a stub — `fetchPreviousCutoffStatus()` slept 200ms and
   * assigned a hardcoded "July 1-15, 2026 has 1 payout group", so the banner
   * said the same thing for every company on every day, and its button had
   * nothing real behind it to open. It is derived from the cutoffs the
   * dashboard already holds instead, by the same rule `secondaryCutoffNotice`
   * below applies: a payout group is outstanding until it is funded or
   * complete. When nothing is outstanding the alert does not render at all,
   * which is the behaviour the stub could never produce.
   *
   * `cutoff_id` is what makes it actionable — the Disbursement list narrows to
   * a cutoff by id. The label travels alongside it because the two screens read
   * cutoffs from different endpoints (`payroll-trend` here, `cutoff-instances`
   * there) and this code cannot prove they number them the same way; the list
   * falls back to matching on the label if the id finds nothing.
   */
  const previousCutoffIncomplete = computed(() => {
    const prev = previousCutoff.value
    if (!prev) return null
    const incomplete = prev.payout_groups.filter(
      (g) => g.status !== 'funded' && g.status !== 'complete',
    )
    if (!incomplete.length) return null
    return {
      cutoff_id: prev.id ?? null,
      cutoff_range: prev.period_label || 'Previous cutoff',
      groups_count: incomplete.length,
    }
  })

  /**
   * The cutoff the tab is currently showing, in the shape the Disbursement list
   * accepts as a deep link.
   *
   * "Where this cutoff stands" counts work that is only actionable over there —
   * a group still under review, a payslip nobody has acknowledged, a salary not
   * yet released — so the panel's footer link has to name the cutoff it is
   * counting rather than hand the reader every open one and let them find it.
   *
   * Null when no cutoff resolves at all, which is what lets the panel drop the
   * link instead of offering a button that lands nowhere. Both keys travel for
   * the same reason `previousCutoffIncomplete` sends both: the two screens read
   * cutoffs from different endpoints and may not number them alike.
   */
  const currentCutoffLink = computed(() => {
    const cutoff = resolveCutoff()
    if (!cutoff) return null
    return {
      cutoff_id: cutoff.id ?? null,
      cutoff_range: cutoff.period_label || 'Current cutoff',
    }
  })

  const cutoffStatusSummary = ref({})

  /**
   * Whether the stage summary actually arrived.
   *
   * Separate from `cutoffStatusSummary` being empty, because the two mean opposite
   * things to the reader: a genuinely empty summary is a cutoff with nothing stuck
   * in it, while a failed or unanswered fetch is a pipeline that could not be read.
   * Both render as an empty rail, and only one of them is good news — so the rail
   * is told which it is and never claims a cutoff has cleared when it simply did
   * not check.
   */
  const cutoffStatusLoaded = ref(false)

  const hideCompleted = ref(false)

  const selectedCutoff = ref(null)

  /**
   * The cutoff the Current Cutoff tab is showing.
   *
   * The reader's explicit pick comes FIRST. It used to come last — `currentCutoff`
   * was returned whenever it had dates, and it always has them, so `selectedCutoff`
   * was only ever consulted in the case where no current cutoff existed. Choosing
   * a different cutoff re-ran the three fetches below against the same current
   * cutoff they had just run, which made the picker look inert.
   *
   * `currentCutoff` stays as the fallback so the tab still opens on something
   * before the reader has chosen, and so a selection whose id no longer resolves
   * lands on the current cutoff rather than on nothing.
   *
   * It reads `allCutoffs`, not `cutoffs`, because a reader may legitimately pick a
   * cutoff no payroll has been run for yet — that cutoff has no `payroll-trend`
   * row, and looking only there would find nothing and fall back silently.
   */
  function resolveCutoff() {
    const sel = selectedCutoff.value
    if (sel) {
      const picked = allCutoffs.value.find((c) => (c.id ?? c.period_label) === sel)
      if (picked) return picked
    }
    const cc = currentCutoff.value
    return cc?.start_date && cc?.end_date ? cc : null
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
      payoutGroupDetails.value = list.map((g) => {
        // The stage a group sits at, read once and used for both the badge and the
        // rail's filter. Normalised through the shared module because the filter
        // compares against the rail's stage names: an un-normalised status here
        // renders a badge that reads sensibly while matching no segment, so the
        // reader clicks a stage and the table empties.
        const raw = g.status ?? g.funding_status ?? 'needs_attention'
        const status = normalizeCutoffStage(raw) ?? raw
        return {
          id: g.id ?? g.payout_group,
          payout_group: g.payout_group,
          date_range: cutoff.period_label || `${cutoff.start_date} – ${cutoff.end_date}`,
          disbursement_type: g.disbursement_type ?? 'Cash',
          employees: g.employees ?? 0,
          reviewed: g.reviewed ?? 0,
          acknowledged: g.acknowledged ?? 0,
          payroll_amount: Number(g.payroll_amount ?? g.final_amount ?? 0),
          status,
          next_action: computeNextAction(status),
          notes: [],
        }
      })
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
    if (!cutoff?.start_date || !cutoff?.end_date) {
      // Nothing to ask about, which is not the same as an answer of nothing — the
      // rail would otherwise claim the cutoff is clear when it was never asked.
      cutoffStatusLoaded.value = false
      return
    }
    try {
      const { data } = await api.get(
        `${BASE}/payroll/admin/current-cutoff-status-summary/${companyId}/${cutoff.start_date}/${cutoff.end_date}/`
      )
      const { counts, unknown } = countCutoffStages(data)
      // Named out loud rather than dropped. A status with no stage is a group
      // sitting in a place this tab cannot show, and silence is what made the
      // pipeline look empty in the first place.
      if (Object.keys(unknown).length) {
        console.warn(
          '[useDashboardSummary] statuses the stage rail has no segment for:',
          unknown,
        )
      }
      cutoffStatusSummary.value = counts
      cutoffStatusLoaded.value = true
    } catch (err) {
      console.error('[useDashboardSummary] fetchCutoffStatusSummary failed:', err)
      cutoffStatusSummary.value = {}
      cutoffStatusLoaded.value = false
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
  // Every cutoff the company has, oldest first, so the picker reads as a
  // timeline. `allCutoffs` rather than `cutoffs`, because a cutoff nobody has run
  // payroll for is still a cutoff an owner may want to ask about.
  const cutoffOptions = computed(() =>
    allCutoffs.value.map((c) => ({
      label: c.period_label || `${c.start_date} – ${c.end_date}`,
      value: c.id ?? c.period_label,
      cutoff: c,
    })),
  )

  watch(cutoffOptions, (opts) => {
    if (!opts.length) return
    // A pick that is still in the list is kept, so a background refetch cannot
    // reset the tab to the current cutoff under the reader.
    if (selectedCutoff.value && opts.some((o) => o.value === selectedCutoff.value)) return
    const match = opts.find((o) => o.cutoff?.id === currentCutoff.value?.id)
    selectedCutoff.value = match?.value ?? opts[opts.length - 1].value
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
    // Every month of the year, closed or not — the month picker, the annual
    // chart and the annual table read this; `monthlySummaries` stays the closed
    // months for the ledgers.
    yearMonths,
    yearTrendSeries,
    annualSummary,
    thirteenthMonthPay,
    selectedMonth,
    monthOptions,
    monthlyTrendWindow,
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
    currentCutoffLink,
    cutoffStatusSummary,
    cutoffStatusLoaded,
    hideCompleted,
    selectedCutoff,
    cutoffOptions,
    secondaryCutoffNotice,
    fetchCutoffStats,
    fetchPayoutGroupDetails,
    fetchCutoffSummaryRollup,
    fetchCutoffStatusSummary,
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
