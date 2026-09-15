/**
 * Cash advance readings for a payout group instance.
 *
 * The figures come from `/payroll/admin/employee-review-summary/{pgi_id}/`, an
 * endpoint that answers about the Review step's whole workload — leave, OT,
 * contributions and review status alongside the two cash advance amounts. This
 * module is the cash advance half of that payload and nothing else.
 *
 * It exists for the usual reason the other `composables/utils/*` derivation
 * modules do: the disbursement list's cash advance table, its expanded employee
 * rows, its summary tiles and its PDF export all state the same totals, and
 * three of them computing `approved / requested` separately is how two parts of
 * one screen come to disagree about whether a run is fully approved.
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

/** Decimal strings in, numbers out. Anything unparseable reads as zero. */
export function amount(value) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
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
    { requested: 0, approved: 0, shortfall: 0, advanceCount: 0, pendingCount: 0, runsWithAdvances: 0 },
  )
  return {
    ...totals,
    runs: loaded.length,
    approvalPct: totals.requested > 0 ? Math.min(100, (totals.approved / totals.requested) * 100) : null,
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
