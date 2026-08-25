import { api } from 'boot/axios'
import { BASE } from 'src/composables/utils/http'

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

export function useDisbursementApi() {

  // ── Cutoff Instances ──
  async function fetchCutoffInstances() {
    const key = cacheKey('cutoffs')
    const cached = getCached(key)
    if (cached) return cached
    const { data } = await api.get(`${BASE}/payroll/admin/cutoff-instances/`)
    setCached(key, data)
    return data
  }

  // ── List Page ──
  async function fetchDashboardSummary(companyId, cutoffInstanceId) {
    const key = cacheKey('dashboard', companyId, cutoffInstanceId)
    const cached = getCached(key)
    if (cached) return cached
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-dashboard/${companyId}/${cutoffInstanceId}/`)
    setCached(key, data)
    return data
  }

  async function fetchPayoutGroupInstances(companyId, cutoffInstanceId) {
    const key = cacheKey('pgi', companyId, cutoffInstanceId)
    const cached = getCached(key)
    if (cached) return cached
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-instances/${companyId}/${cutoffInstanceId}/`)
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
   */
  async function fetchEmployeeReviewSummary(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/employee-review-summary/${payoutGroupInstanceId}/`)
    return data
  }

  /**
   * One employee's statutory contributions for a run: the cutoff and tax month
   * they fall in, the item's overall `epi_contribution_status`, and a row per
   * contribution carrying whether it has been deducted and from which cutoff.
   *
   * Scoped by both ids because a contribution is a fact about an employee
   * payroll item *within* a payout group instance, not about the employee alone.
   */
  async function fetchEpiContributions(payoutGroupInstanceId, epiId) {
    const { data } = await api.get(
      `${BASE}/payroll/admin/epi-contributions/${payoutGroupInstanceId}/${epiId}/`,
    )
    return data
  }

  /**
   * Deducts the named contributions from an employee payroll item by hand — the
   * fallback when a contribution did not come off automatically. Returns the
   * server's response; callers should refetch, since deducting changes both the
   * item's contribution status and the run's review figures.
   */
  async function deductContributions(epiId, contributionIds = []) {
    const { data } = await api.post(`${BASE}/payroll/admin/deduct-contributions/`, {
      epi_id: epiId,
      contribution_ids: contributionIds,
    })
    return data
  }

  async function fetchEmployeePayrollItem(id) {
    const { data } = await api.get(`${BASE}/payroll/admin/employee-payroll-item/${id}/`)
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

  return {
    fetchCutoffInstances,
    fetchDashboardSummary,
    fetchPayoutGroupInstances,
    fetchPayoutGroupProgress,
    fetchReviewOverview,
    fetchAttendanceSummary,
    fetchEmployeeReviewSummary,
    fetchEpiContributions,
    deductContributions,
    fetchEmployeePayrollItem,
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
