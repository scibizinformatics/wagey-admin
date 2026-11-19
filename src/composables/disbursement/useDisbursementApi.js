import { api } from 'boot/axios'
import { BASE } from 'src/composables/utils/http'
import { useCompany } from 'src/composables/page/useCompany'

// ── Simple module-level cache for list-page data ──
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function cacheKey(fn, ...args) {
  return `${fn}:${args.join(':')}`
}

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() })
}

/**
 * Drops cached list-page data after a mutation. A review, a payslip release or a
 * disbursement moves the run's status and its figures, and the dashboard and
 * payout-group lists hold both for five minutes — long enough to send a person
 * back to a list still describing the run they just moved.
 *
 * Pass a `fn` prefix ('dashboard', 'pgi', 'cutoffs') to clear one family of
 * entries; pass nothing to clear the lot.
 */
function invalidateCache(fn) {
  if (!fn) {
    cache.clear()
    return
  }
  for (const key of [...cache.keys()]) {
    if (key === fn || key.startsWith(`${fn}:`)) cache.delete(key)
  }
}

export function useDisbursementApi() {
  // The endpoint takes no company argument — it reads the workspace off the
  // session — so the cache key has to carry it. It used to be the bare string
  // 'cutoffs', one global entry: after a workspace switch the next reader was
  // served the *previous* company's cutoffs for up to five minutes, and a filter
  // built from them matched nothing at all.
  const { companyId } = useCompany()

  // ── Cutoff Instances ──
  async function fetchCutoffInstances() {
    const key = cacheKey('cutoffs', companyId.value ?? '')
    const cached = getCached(key)
    if (cached) return cached
    const { data } = await api.get(`${BASE}/payroll/admin/cutoff-instances/`)
    setCached(key, data)
    return data
  }

  // ── List Page ──
  //
  // `expectedStatuses: [404]` on both calls below, because both are only ever
  // invoked while enumerating the company's cutoffs. `cutoff-instances` returns
  // some that fall outside the company's cutoff type, and the payout-group and
  // dashboard routes reject those with 404 "Cutoff instance does not match this
  // company's cutoff type". That is an answer — this cutoff has no runs for this
  // company — and not a failure: `DisbursementListPage` and `usePayoutGroupIdentity`
  // already treat a rejected cutoff as "nothing here" and swallow it with a
  // catch, so without this the console filled with an error both callers had
  // already handled. The promise still rejects, so that handling is unchanged.
  async function fetchDashboardSummary(companyId, cutoffInstanceId) {
    const key = cacheKey('dashboard', companyId, cutoffInstanceId)
    const cached = getCached(key)
    if (cached) return cached
    const { data } = await api.get(
      `${BASE}/payroll/admin/payout-group-dashboard/${companyId}/${cutoffInstanceId}/`,
      { expectedStatuses: [404] },
    )
    setCached(key, data)
    return data
  }

  async function fetchPayoutGroupInstances(companyId, cutoffInstanceId) {
    const key = cacheKey('pgi', companyId, cutoffInstanceId)
    const cached = getCached(key)
    if (cached) return cached
    const { data } = await api.get(
      `${BASE}/payroll/admin/payout-group-instances/${companyId}/${cutoffInstanceId}/`,
      { expectedStatuses: [404] },
    )
    setCached(key, data)
    return data
  }

  // ── Progress ──
  async function fetchPayoutGroupProgress(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-progress/${payoutGroupInstanceId}/`)
    return data
  }

  // ── Review (Step 1) ──
  async function fetchReviewOverview(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/review-overview/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchAttendanceSummary(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/attendance-summary/${payoutGroupInstanceId}/`)
    return data
  }

  /**
   * Per-employee review rows for step 1: leave requests, cash advance
   * (requested vs approved), OT requests, contributions and review status —
   * plus the cutoff's name and date range at the top level.
   *
   * This is what the Review table reads. It supersedes `fetchAttendanceSummary`
   * there: the step is about the requests and deductions that still need a
   * decision, not about raw attendance tallies. Rows carry `epi_id`, which is
   * the id `reviewToReady`, `releasePayslips` and `fetchEmployeePayrollItem`
   * all expect, so no id translation is needed at the call site.
   *
   * `cache: true` opts into the module cache above, which is off by default.
   *
   * The list page's cash advance view asks this endpoint once per run — dozens
   * of requests for one table — and its figures sit beside the payout-group and
   * dashboard lists, which are cached the same way and for the same five
   * minutes. The Review step deliberately does not opt in: it is the screen that
   * *changes* these rows, and a step that reads its own work back from a cache
   * written before the change would show the review it just cleared as pending.
   */
  async function fetchEmployeeReviewSummary(payoutGroupInstanceId, { cache = false } = {}) {
    const key = cacheKey('review-summary', payoutGroupInstanceId)
    if (cache) {
      const cached = getCached(key)
      if (cached) return cached
    }
    const { data } = await api.get(`${BASE}/payroll/admin/employee-review-summary/${payoutGroupInstanceId}/`)
    if (cache) setCached(key, data)
    return data
  }

  /**
   * One employee's withholding tax for a run: the cutoff and tax month they
   * fall in, whether the tax is applied or has been reverted, and — when it is
   * applied — the bracket it was computed from and the monthly tax row behind
   * it.
   *
   * Read apart from `fetchEpiContributions` on purpose: tax is applied or
   * reverted as a whole against the payroll item, while contributions are
   * row-by-row, and the contributions endpoint carries neither the tax figure nor
   * its bracket.
   *
   * No `expectedStatuses`: the no-tax-month case is an answer in the body, not
   * a 404 (`tax_month` comes back `null` and `tax.details` empty), so a reject
   * here is a genuine failure.
   *
   * `period` is the optional second question, the tax twin of the one
   * `fetchEpiContributions` takes: the EPI resolves the tax through its own tax
   * month, which the cutoff that closes the month owns. A first-half cutoff asks
   * for its calendar month instead (`?year=&month=`), and reads the same
   * `monthly_tax` row the closing run settles. Until the route answers that
   * parameter the request is an ordinary unanswered one — the caller keeps the
   * documented payload it already had.
   */
  async function fetchEpiTax(epiId, period = null) {
    const config = {}
    if (period?.year && period?.month) {
      config.params = { year: period.year, month: period.month }
    }
    const { data } = await api.get(`${BASE}/payroll/admin/epi-tax/${epiId}/`, config)
    return data
  }

  /**
   * Applies withholding tax to the named employee payroll items — the manual
   * fallback when the run did not take it off automatically, and the way back
   * in after a revert.
   *
   * `force` defaults to false like the endpoint does: an already-applied item
   * is worth reporting as `skipped` with its own reason, not overwritten.
   * Returns the per-item response; callers should refetch, since applying
   * moves the item's money and the run's figures.
   *
   * `period` names the month to settle when the item itself carries no tax month
   * — the first half of a semi-monthly period. It is sent only when the caller
   * has one, so a closing cutoff's request is byte-for-byte what it was; a
   * backend that does not read the field ignores it, and the endpoint's own
   * double-apply guard still answers `skipped`.
   */
  async function applyTax(epiIds = [], { force = false, period = null } = {}) {
    const body = { epi_ids: epiIds, force }
    if (period?.year && period?.month) {
      body.year = period.year
      body.month = period.month
    }
    const { data } = await api.post(`${BASE}/payroll/admin/apply-tax/`, body)
    return data
  }

  /**
   * Undoes an applied withholding tax, the mirror of `applyTax` and the way out
   * of tax taken from the wrong bracket. The reason is required by the payload
   * shape and is what `fetchEpiTax` reads back after it — so it always reaches
   * this as a non-empty string from the dialog that collected it.
   *
   * Returns the per-item response; callers should refetch, and `skipped` here is
   * "this item had nothing applied to revert", not a failure.
   *
   * `period` is the mirror of `applyTax`'s: a first-half cutoff can only name the
   * month it wants reverted, because the tax is held by the run that settled it.
   * Omitted when the item owns its own tax month.
   */
  async function revertTax(epiIds = [], reason = '', period = null) {
    const body = { epi_ids: epiIds, reason }
    if (period?.year && period?.month) {
      body.year = period.year
      body.month = period.month
    }
    const { data } = await api.post(`${BASE}/payroll/admin/revert-tax/`, body)
    return data
  }

  async function fetchEmployeePayrollItem(id) {
    const { data } = await api.get(`${BASE}/payroll/admin/employee-payroll-item/${id}/`)
    return data
  }

  /**
   * One employee's money for a run: the per-day earnings behind the net pay the
   * Funding step lists them at.
   *
   * A sibling of `fetchEmployeePayrollItem`, not a replacement — that one is what
   * `EmployeeDetailDialog` reads for the attendance half of the same record, and
   * it stays as it is. This route additionally carries `daily_earnings` (hours,
   * rates, gross, overtime, night differential, undertime and net per day), which
   * is the evidence for a net pay figure rather than a component list.
   */
  async function fetchEmployeePayrollItemEarnings(id) {
    const { data } = await api.get(`${BASE}/payroll/admin/employee-payroll-item/${id}/earnings/`)
    return data
  }

  /**
   * Moves one employee payroll item into another payroll group's run.
   *
   * The cutoff is not part of the payload — the backend keeps the item on the
   * cutoff it was created for, which is why the caller must not offer a group
   * that has no run in this cutoff (see `usePayoutGroupIdentity`'s siblings).
   * The item leaves this run's rows, so callers should refetch, and the cached
   * dashboard and payout-group lists are stale the moment it moves.
   */
  async function transferEmployeePayrollItem(epiId, targetPayrollGroupId) {
    const { data } = await api.post(
      `${BASE}/payroll/admin/employee-payroll-item/${epiId}/transfer/`,
      { target_payroll_group_id: targetPayrollGroupId },
    )
    return data
  }

  // ── Payslips (Step 2) ──
  async function fetchPayslipOverview(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payslip-overview/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchEmployeePayslips(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/employee-payslips/${payoutGroupInstanceId}/`)
    return data
  }

  // ── Funding (Step 3) ──
  async function fetchPayoutGroupInstanceAmounts(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-instance-amounts/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchTopEarners(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/top-earners/${payoutGroupInstanceId}/`)
    return data
  }

  // ── Disburse (Step 4) ──
  async function fetchPayoutGroupInstanceSummary(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-instance-summary/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchDisbursementEmployees(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/disbursement-employees/${payoutGroupInstanceId}/`)
    return data
  }

  // ── Complete (Step 5) ──
  async function fetchPayoutGroupCompletion(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-completion/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchPayoutSummaryByEmployee(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-summary-by-employee/${payoutGroupInstanceId}/`)
    return data
  }

  // ── Phase 1: Admin Review & Release ──
  async function reviewToReady(pgiId, epiIds = []) {
    const { data } = await api.post(`${BASE}/payroll/admin/pgi/${pgiId}/review-to-ready/`, { epi_ids: epiIds })
    return data
  }

  async function releasePayslips(pgiId, epiIds = []) {
    const { data } = await api.post(`${BASE}/payroll/admin/pgi/${pgiId}/release-payslips/`, { epi_ids: epiIds })
    return data
  }

  /**
   * The body both recalibration endpoints take.
   *
   * `epi_ids` is optional on each and, when omitted, means "every EPI in the
   * PGI". An empty list is a different statement — no employee at all — so the
   * key is left out rather than sent empty.
   */
  const epiResetBody = (epiIds = []) => (epiIds.length ? { epi_ids: epiIds } : {})

  /**
   * Undo the payslip release: released EPIs go back to `in_progress` and the
   * acknowledgement/claim fields they carry are cleared.
   *
   * Refused once employees have acted — an acknowledged payslip, a pending or
   * claimed advance, a dispute, on-chain funding — so a 4xx here describes the
   * run's state, and the backend's sentence names what is in the way.
   */
  async function resetRelease(pgiId, epiIds = []) {
    const { data } = await api.post(
      `${BASE}/payroll/admin/pgi/${pgiId}/reset-release/`,
      epiResetBody(epiIds),
    )
    return data
  }

  /**
   * Undo the review-to-ready transition: every targeted EPI is set back to
   * `review_status: 'needs_attention'`, while payslip status and claim fields
   * are left exactly as they are.
   */
  async function resetReview(pgiId, epiIds = []) {
    const { data } = await api.post(
      `${BASE}/payroll/admin/pgi/${pgiId}/reset-review/`,
      epiResetBody(epiIds),
    )
    return data
  }

  // ── Phase 2: Employee Payslip Operations ──
  async function fetchEmployeePayslipDetail(epiId) {
    const { data } = await api.get(`${BASE}/payroll/employee/payslips/${epiId}/`)
    return data
  }

  async function acknowledgePayslip(epiId) {
    const { data } = await api.post(`${BASE}/payroll/employee/payslips/${epiId}/acknowledge/`)
    return data
  }

  async function reportIssue(epiId, payload) {
    const { data } = await api.post(`${BASE}/payroll/employee/payslips/${epiId}/report-issue/`, payload)
    return data
  }

  async function confirmMoneyReceived(epiId) {
    const { data } = await api.post(`${BASE}/payroll/employee/payslips/${epiId}/money-received/`)
    return data
  }

  // ── Phase 2: Admin Issue Resolution ──
  async function fetchPayslipIssues(epiId) {
    const { data } = await api.get(`${BASE}/payroll/admin/employee-payslips/${epiId}/issues/`)
    return data
  }

  async function resolveIssue(issueId, payload) {
    const { data } = await api.patch(`${BASE}/payroll/admin/issues/${issueId}/resolve/`, payload)
    return data
  }

  async function rejectIssue(issueId, payload) {
    const { data } = await api.patch(`${BASE}/payroll/admin/issues/${issueId}/reject/`, payload)
    return data
  }

  // ── Phase 3: Funding ──
  async function createPgiFunding(pgiId, payload) {
    const { data } = await api.post(`${BASE}/payroll/admin/payout-group-fundings/salary/${pgiId}/`, payload)
    return data
  }

  // ── Phase 4: Disbursement ──
  async function disbursePgi(pgiId, epiIds = []) {
    const { data } = await api.post(`${BASE}/payroll/admin/disburse/${pgiId}/`, { epi_ids: epiIds })
    return data
  }

  /**
   * This company's own cutoffs, from `payroll-trend`.
   *
   * Exists because `cutoff-instances` above is workspace-wide: it lists every
   * cutoff *type* in the workspace, so a company running a semi-monthly payroll is
   * also handed weekly, bi-weekly, monthly and annual cutoffs. Anything that needs
   * to tell "this company's cutoffs" from "every cutoff in the workspace" learns
   * the shape from this endpoint, which is scoped to the company, and filters the
   * wider list with it — see `utils/cutoffState.js`.
   *
   * It also carries a `status` per cutoff (`in_progress` / `completed`), so it is
   * the trustworthy answer where `cutoff-instances` is only best-effort. It does
   * not list a cutoff nobody has run payroll for, so it cannot replace the wider
   * list — it narrows it.
   *
   * Cached like its neighbours. The `year` param is left off deliberately: this is
   * read for the *shape* its windows follow and for statuses, neither of which is
   * about a particular year, and pinning one would make a January dashboard unable
   * to describe a December cutoff.
   */
  async function fetchCompanyCutoffs(companyId) {
    const key = cacheKey('payroll-trend', companyId ?? '')
    const cached = getCached(key)
    if (cached) return cached
    const { data } = await api.get(`${BASE}/payroll/admin/payroll-trend/${companyId}/`)
    const list = data?.cutoffs ?? (Array.isArray(data) ? data : (data?.data ?? data?.results ?? []))
    setCached(key, list)
    return list
  }

  return {
    invalidateCache,
    fetchCutoffInstances,
    fetchCompanyCutoffs,
    fetchDashboardSummary,
    fetchPayoutGroupInstances,
    fetchPayoutGroupProgress,
    fetchReviewOverview,
    fetchAttendanceSummary,
    fetchEmployeeReviewSummary,
    fetchEpiTax,
    applyTax,
    revertTax,
    fetchEmployeePayrollItem,
    fetchEmployeePayrollItemEarnings,
    transferEmployeePayrollItem,
    fetchPayslipOverview,
    fetchEmployeePayslips,
    fetchPayoutGroupInstanceAmounts,
    fetchTopEarners,
    fetchPayoutGroupInstanceSummary,
    fetchDisbursementEmployees,
    fetchPayoutGroupCompletion,
    fetchPayoutSummaryByEmployee,
    // Phase 1
    reviewToReady,
    releasePayslips,
    resetReview,
    resetRelease,
    // Phase 2 - Employee
    fetchEmployeePayslipDetail,
    acknowledgePayslip,
    reportIssue,
    confirmMoneyReceived,
    // Phase 2 - Admin
    fetchPayslipIssues,
    resolveIssue,
    rejectIssue,
    // Phase 3
    createPgiFunding,
    // Phase 4
    disbursePgi,
  }
}
