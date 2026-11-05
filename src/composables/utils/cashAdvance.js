/**
 * Cash advance readings for a payout group instance.
 *
 * Two families of payload meet here. The disbursement list's cash advance view
 * reads `/payroll/admin/employee-review-summary/{pgi_id}/`, which answers about
 * the Review step's whole workload — leave, OT, contributions and review status
 * alongside the two cash advance amounts. The four-step cash-advance flow reads
 * its own endpoints: `/cash_advance/admin/review-employees/`, `/funding/`,
 * `/disbursement-summary/` and `/completed-progress/`. The second half of this
 * module normalises those four.
 *
 * It exists for the usual reason the other `composables/utils/*` derivation
 * modules do: the list's table, the Review step's tiles and employee lines, the
 * Funding gap, the Disburse selection and the Complete export all state the same
 * figures, and each computing them separately is how two screens come to
 * disagree about whether a run is fully approved or fully funded.
 *
 * Traps in the payload, all of which the readings below take a position on:
 *
 *   - Every amount arrives as a *decimal string* ("0.00", "1500.00"). Compared
 *     or sorted as text, "900.00" sorts above "1500.00"; added as text they
 *     concatenate. Everything here goes through `amount()` first.
 *   - Most employees have no cash advance at all, so the rows are dominated by
 *     zeros. "Employees with an advance" is therefore counted against the run's
 *     headcount rather than reported alone — 3 of 7 is a reading, 3 is not.
 *   - An approved amount *below* what was requested is never a missing value: it
 *     is either a decision somebody made in part or one still to be made, and it
 *     is the case the Review step exists to surface. It is carried as its own
 *     `shortfall` figure rather than left for the reader to subtract two columns.
 *   - Requested nothing and approved nothing is not 0% approved, it is "no
 *     advances" — a percentage there would draw an empty bar on a run that has
 *     nothing to approve. `approvalPct` is null in that case, and the tone is
 *     neutral rather than critical.
 */

import { getApproverName } from 'src/composables/utils/employee'

/** Decimal strings in, numbers out. Anything unparseable reads as zero. */
export function amount(value) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Counts arrive as numbers, numeric strings, or not at all. */
function toCount(value) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** A trimmed string, for status words that arrive with uneven spacing. */
function text(value) {
  return String(value ?? '').trim()
}

/**
 * One employee's cash advance line, from a row of the payload's `employees`.
 *
 * `epiId` is kept because it is the id every other payroll admin endpoint takes
 * for an employee *within a run*, so a row here can be acted on without a second
 * lookup; `employeeId` is the person, who exists outside this cutoff.
 */
export function normaliseCashAdvanceEmployee(row = {}) {
  const requested = amount(row.requested_cash_advance)
  const approved = amount(row.approved_cash_advance)
  return {
    employeeId: row.employee_id ?? null,
    epiId: row.epi_id ?? null,
    name: row.employee || 'Unnamed employee',
    position: row.position || '',
    department: row.department || '',
    requested,
    approved,
    shortfall: Math.max(0, requested - approved),
    reviewStatus: row.review_status || '',
  }
}

/**
 * Tone for a run's approval state, in the design system's status vocabulary.
 *
 * Deliberately not a threshold on the percentage: the three cases a person acts
 * on differently are "nothing to do", "all decided" and "something still
 * outstanding", and a run that approved 99% of its pesos is in the same position
 * as one that approved 10% — somebody still has to decide the rest.
 */
export function cashAdvanceTone({ requested, approved }) {
  if (!requested) return 'neutral'
  if (approved >= requested) return 'good'
  if (approved > 0) return 'warn'
  return 'critical'
}

/**
 * The whole cash advance reading for one run, from the endpoint's payload.
 *
 * Returns a stable shape even for a payload that failed to arrive (`null`), so a
 * run whose summary could not be fetched renders as a row with no figures rather
 * than dropping out of a table that claims to list every run.
 */
export function summariseCashAdvance(payload) {
  const rows = Array.isArray(payload?.employees) ? payload.employees : []
  const employees = rows.map(normaliseCashAdvanceEmployee)
  // Only the people who actually asked for money. An employee approved without
  // a request would be a payload we have never seen, but it is still an advance
  // and belongs in the list rather than silently outside the count.
  const withAdvance = employees.filter((e) => e.requested > 0 || e.approved > 0)

  const requested = withAdvance.reduce((sum, e) => sum + e.requested, 0)
  const approved = withAdvance.reduce((sum, e) => sum + e.approved, 0)
  const shortfall = withAdvance.reduce((sum, e) => sum + e.shortfall, 0)

  return {
    /** True once a payload has been seen at all — false is "not fetched / failed". */
    loaded: payload != null,
    cutoffName: payload?.cutoff_name || '',
    startDate: payload?.start_date || null,
    endDate: payload?.end_date || null,
    headcount: employees.length,
    advances: withAdvance,
    advanceCount: withAdvance.length,
    /**
     * Employees approved for less than they asked for. Deliberately not called
     * "pending": the payload cannot say whether the gap is a decision nobody has
     * made yet or one somebody made in part, so nothing here claims which.
     */
    pendingCount: withAdvance.filter((e) => e.shortfall > 0).length,
    requested,
    approved,
    shortfall,
    approvalPct: requested > 0 ? Math.min(100, (approved / requested) * 100) : null,
    tone: cashAdvanceTone({ requested, approved }),
  }
}

/** An empty reading, for a run whose summary has not been fetched yet. */
export function emptyCashAdvanceSummary() {
  return summariseCashAdvance(null)
}

/**
 * Adds a set of per-run readings into one, for the page's summary tiles.
 *
 * Counts runs that *have* an advance rather than runs fetched, because a cutoff
 * where two of forty groups requested anything is a different fact from forty.
 */
export function aggregateCashAdvance(summaries = []) {
  const loaded = summaries.filter((s) => s?.loaded)
  const totals = loaded.reduce(
    (acc, s) => {
      acc.requested += s.requested
      acc.approved += s.approved
      acc.shortfall += s.shortfall
      acc.advanceCount += s.advanceCount
      acc.pendingCount += s.pendingCount
      if (s.advanceCount > 0) acc.runsWithAdvances += 1
      return acc
    },
    {
      requested: 0,
      approved: 0,
      shortfall: 0,
      advanceCount: 0,
      pendingCount: 0,
      runsWithAdvances: 0,
    },
  )
  return {
    ...totals,
    runs: loaded.length,
    approvalPct:
      totals.requested > 0 ? Math.min(100, (totals.approved / totals.requested) * 100) : null,
  }
}

/**
 * Bar width for an approval share.
 *
 * A floor rather than the raw percentage, for the same reason `ManningMeter`
 * carries one: a single ₱500 approval against ₱60,000 requested is a sliver that
 * rounds away to an empty track, which reads as "nothing approved" — the one
 * thing it is not.
 */
const MIN_FILL_PCT = 4

export function approvalFillWidth(pct, approved) {
  if (!approved) return '0%'
  if (pct == null) return '0%'
  return `${Math.max(MIN_FILL_PCT, pct)}%`
}

/* ============================================================================
   The new four-step flow
   ============================================================================
   Everything below reads one of the flow's four payloads. It lives here, beside
   the list's reading, for the same reason the module exists at all: the Review
   step's table, the Funding step's tiles, the Disburse step's bulk selection and
   the Complete step's export all state the same figures, and four files doing
   their own arithmetic is how one screen comes to disagree with another.
   ========================================================================== */

/**
 * One cash advance request, from the Review step's per-employee list.
 *
 * The request endpoints answer `{ id, requested_amount, status, approval_date,
 * approved_by }`; `approved_by` is an id rather than a name, so it goes through
 * the shared approver reader instead of printing "by 14".
 */
export function normaliseCashAdvanceRequest(row = {}) {
  return {
    id: row.id ?? row.cash_advance_id ?? row.request_id ?? null,
    amount: amount(row.requested_amount ?? row.amount ?? row.cash_advance_amount),
    status: text(row.status).toLowerCase(),
    statusDisplay: row.status_display || text(row.status),
    approvalDate: row.approval_date || null,
    approvedBy: getApproverName(row),
    remarks: row.remarks || '',
  }
}

/** A request is actionable only while the backend still calls it pending. */
export function isCashAdvanceRequestPending(request) {
  return text(request?.status).toLowerCase() === 'pending'
}

/** The requests nested on a review-employees row, under any spelling in use. */
function requestsOf(row = {}) {
  const raw = Array.isArray(row?.requests)
    ? row.requests
    : Array.isArray(row?.cash_advances)
      ? row.cash_advances
      : Array.isArray(row?.cash_advance_requests)
        ? row.cash_advance_requests
        : []
  return raw.map(normaliseCashAdvanceRequest)
}

/**
 * A top-level `requests[]` grouped by employee payroll item.
 *
 * The backend may put the individual requests beside `employees[]` rather than
 * inside each row. Both shapes are accepted so the page does not have to know
 * which one shipped; an employee whose requests are absent simply renders as a
 * summary line with no actions.
 */
function groupRequestsByEpi(payload) {
  const grouped = new Map()
  const rows = Array.isArray(payload?.requests)
    ? payload.requests
    : Array.isArray(payload?.cash_advances)
      ? payload.cash_advances
      : Array.isArray(payload?.cash_advance_requests)
        ? payload.cash_advance_requests
        : []
  rows.forEach((row) => {
    const keys = [row?.epi_id, row?.employee_payroll_item_id, row?.epiId, row?.employee_id]
      .map(text)
      .filter(Boolean)
    keys.forEach((key) => {
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(row)
    })
  })
  return grouped
}

/**
 * One employee's cash advance line on the Review step.
 *
 * The counts are taken from the payload's own totals where present and fall
 * back to the request list only when a total is missing. A missing count is not
 * evidence of zero requests — the payload's aggregates are authoritative when
 * they exist.
 */
export function normaliseReviewEmployee(row = {}, extraRequests = []) {
  const requests = [...requestsOf(row), ...extraRequests.map(normaliseCashAdvanceRequest)]
  return {
    epiId: row.epi_id ?? null,
    employeeId: row.employee_id ?? null,
    name: row.employee || 'Unnamed employee',
    position: row.position || '',
    department: row.department || '',
    requests,
    requestedCount: row.total_requested != null ? toCount(row.total_requested) : requests.length,
    approvedCount: toCount(row.total_approved),
    rejectedCount: toCount(row.total_rejected),
    pendingCount: toCount(row.total_pending),
    requestedAmount: amount(row.total_requested_amount),
    approvedAmount: amount(row.total_approved_amount),
  }
}

/** Every employee on the Review step, with their individual requests attached. */
export function reviewEmployeesFromPayload(payload) {
  const grouped = groupRequestsByEpi(payload)
  const rows = Array.isArray(payload?.employees) ? payload.employees : []
  return rows.map((row) => {
    const epiKey = text(row?.epi_id)
    const personKey = text(row?.employee_id)
    const extra = grouped.get(epiKey) ?? grouped.get(personKey) ?? []
    return normaliseReviewEmployee(row, extra)
  })
}

/** The Review step's headline figures and rows. */
export function summariseCashAdvanceReview(payload) {
  const employees = reviewEmployeesFromPayload(payload)
  return {
    loaded: payload != null,
    employees,
    totalRequests:
      payload?.total_requests != null
        ? toCount(payload.total_requests)
        : employees.reduce((sum, employee) => sum + employee.requestedCount, 0),
    pending: toCount(payload?.total_pending),
    approved: toCount(payload?.total_approved),
    rejected: toCount(payload?.total_rejected),
    currentTotal: amount(payload?.current_total),
    payoutDate: payload?.payout_date || null,
    requestedAmount: employees.reduce((sum, employee) => sum + employee.requestedAmount, 0),
    approvedAmount: employees.reduce((sum, employee) => sum + employee.approvedAmount, 0),
  }
}

/* ── Funding ─────────────────────────────────────────────────────────────── */

/** One recorded funding entry. */
export function normaliseFundingEntry(row = {}) {
  return {
    source: row.funding_source || '',
    amount: amount(row.amount),
    reference: row.reference_no || '',
    preparedBy: row.prepared_by || row.prepared_by_name || '',
    preparedDate: row.prepared_date || null,
    custodian: row.custodian || row.custodian_name || '',
    notes: row.notes || '',
  }
}

/**
 * The Funding step's reading: what the advances come to, what has been recorded,
 * and the gap between them.
 *
 * A group with no funding row yet answers 404; that is the starting state, not a
 * failure, so it produces a stable empty reading rather than an error. `loaded`
 * is false only when nothing has been read at all.
 */
export function summariseCashAdvanceFunding(payload) {
  const history = (Array.isArray(payload?.funding_history) ? payload.funding_history : []).map(
    normaliseFundingEntry,
  )
  const total = amount(payload?.total_cash_advance)
  const funded = history.reduce((sum, entry) => sum + entry.amount, 0)
  const bch = payload?.bch_contract
  return {
    loaded: payload != null,
    total,
    funded,
    remaining: Math.max(0, total - funded),
    // A group with nothing to fund is already covered: the flow has no figure to
    // wait for, so it should not sit on a funding step forever.
    fullyFunded: payload != null && (total <= 0 || funded >= total),
    employees: toCount(payload?.employees),
    groupStatus: payload?.group_status || '',
    history,
    bchContract: bch
      ? {
          address: bch.bch_address || bch.contract_address || '',
          status: bch.status || '',
          statusDisplay: bch.status_display || bch.status || '',
          contractId: bch.contract_id ?? null,
          employeeCount: toCount(bch.employee_count),
          totalSats: toCount(bch.total_sats),
        }
      : null,
  }
}

/* ── Disburse ────────────────────────────────────────────────────────────── */

/**
 * Claim statuses that mean the advance has already been dealt with.
 *
 * Everything not listed here — including the backend's `pending` — still has a
 * release owed against it. The direction is deliberate, the same one the payroll
 * disburse step uses: an unlisted status shows the release action rather than
 * silently hiding money the company still has to hand over.
 */
export const SETTLED_CA_CLAIM_STATUSES = [
  'claimed',
  'released',
  'received',
  'paid',
  'confirmed',
  'disbursed',
  'settled',
]

export function isCashAdvanceClaimSettled(status) {
  return SETTLED_CA_CLAIM_STATUSES.includes(text(status).toLowerCase())
}

/** One employee's row on the Disburse step. */
export function normaliseCashAdvanceDisbursementEmployee(row = {}) {
  const claimStatus = row.claim_status || ''
  const claimKey = text(claimStatus).toLowerCase()
  // `na` / `N/A` is the backend's "no claim yet" sentinel — the same
  // `ca_claim_status = "na"` the release endpoint requires — not a missing
  // value. It reads as "Not released" instead of leaking the sentinel into the
  // table. A blank status is treated the same way.
  const notReleased = ['na', 'n/a', 'not_applicable', 'not applicable', ''].includes(claimKey)

  return {
    epiId: row.epi_id ?? null,
    name: row.employee || 'Unnamed employee',
    amount: amount(row.cash_advance_amount),
    method: row.payout_method || '',
    claimStatus,
    claimStatusDisplay: notReleased ? 'Not released' : row.claim_status_display || claimStatus,
    claimedOn: row.claimed_on || null,
    reference: row.reference || '',
    proof: row.proof || '',
    settled: isCashAdvanceClaimSettled(claimStatus),
  }
}

/** The Disburse step's headline figures and rows. */
export function summariseCashAdvanceDisbursement(payload) {
  const employees = (Array.isArray(payload?.employees) ? payload.employees : []).map(
    normaliseCashAdvanceDisbursementEmployee,
  )
  return {
    loaded: payload != null,
    fundedAmount: amount(payload?.cash_advance_funded_amount),
    released: toCount(payload?.released),
    pending: toCount(payload?.pending),
    failed: toCount(payload?.failed),
    groupStatus: payload?.group_status || '',
    employees,
    total: employees.length,
  }
}

/**
 * A unique employee name → `epi_id` map, from the Review step's payload.
 *
 * The release endpoint keys on employee payroll item ids, but the disbursement
 * summary does not always carry them. The Review payload does (`employees[].epi_id`),
 * and the employee name is the only key the two payloads share. A name that
 * belongs to two people maps to `null` on purpose — the same refusal to guess
 * `buildEmployeeNameIndex` makes for photographs — so the release is never sent
 * against the wrong person's payroll item.
 */
export function buildEpiIdByName(payload) {
  const grouped = new Map()
  const rows = Array.isArray(payload?.employees) ? payload.employees : []
  rows.forEach((row) => {
    const name = text(row?.employee).toLowerCase()
    if (!name) return
    if (!grouped.has(name)) grouped.set(name, [])
    grouped.get(name).push(row?.epi_id ?? null)
  })

  const map = new Map()
  grouped.forEach((ids, name) => {
    map.set(name, ids.length === 1 ? ids[0] : null)
  })
  return map
}

/**
 * Fills `epi_id` on the disbursement summary's rows from the Review map.
 *
 * An `epi_id` the summary already sent wins; the map only fills the gap. A row
 * whose name is absent or ambiguous stays `null`, which keeps it out of the bulk
 * release and surfaces through the page's "ids unavailable" notice.
 */
export function withResolvedEpiIds(payload, epiIdByName) {
  if (!payload) return null
  const employees = (Array.isArray(payload.employees) ? payload.employees : []).map((row) => ({
    ...row,
    epi_id: row.epi_id ?? epiIdByName?.get(text(row.employee).toLowerCase()) ?? null,
  }))
  return { ...payload, employees }
}

/* ── Complete ────────────────────────────────────────────────────────────── */

/** One employee's row on the Complete step. */
export function normaliseCashAdvanceCompletedEmployee(row = {}) {
  return {
    name: row.employee || 'Unnamed employee',
    method: row.payment_method || '',
    reference: row.reference_no || '',
    amount: amount(row.cash_advance),
    status: row.status || '',
    releasedOn: row.released_on || null,
    receivedBy: row.received_by || '',
  }
}

/** The Complete step's headline figures and rows. */
export function summariseCashAdvanceCompletion(payload) {
  const employees = (Array.isArray(payload?.employees) ? payload.employees : []).map(
    normaliseCashAdvanceCompletedEmployee,
  )
  return {
    loaded: payload != null,
    fundedAmount: amount(payload?.cash_advance_funded_amount),
    totalEmployees: toCount(payload?.total_employee),
    claimedEmployees: toCount(payload?.total_claimed_employee),
    completionDate: payload?.completion_date || null,
    employees,
  }
}
