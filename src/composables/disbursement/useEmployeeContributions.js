import { api } from 'boot/axios'
import { BASE } from 'src/composables/utils/http'

/**
 * One employee payroll item's statutory contributions, and the two writes that
 * move them.
 *
 *   GET  /payroll/admin/epi-contributions/{pgi_id}/{epi_id}/
 *   POST /payroll/admin/deduct-contributions/
 *   POST /payroll/admin/revert-contributions/
 *
 * Kept apart from the manual-adjustment service next door on purpose.
 * Contributions are what the law requires and move row by row; adjustments are
 * what a person decided and are reverted one entry at a time. They share neither
 * endpoint nor response shape, so they share no module either — a change here
 * cannot reach the adjustment panel.
 *
 * Withholding tax is neither: it is applied or reverted as a whole against the
 * item, and its endpoints stay in `useDisbursementApi` with the rest of the
 * payroll-admin calls.
 */
export function useEmployeeContributions() {
  /**
   * One employee's statutory contributions for a run: the cutoff and tax month
   * they fall in, the item's overall `epi_contribution_status`, and a row per
   * contribution carrying whether it has been deducted and from which cutoff.
   *
   * Scoped by both ids because a contribution is a fact about an employee
   * payroll item *within* a payout group instance, not about the employee alone.
   *
   * `period` is the second question the route can answer. Without it the endpoint
   * resolves the rows through the EPI's tax month, and a cutoff that carries none
   * — the first half of a semi-monthly period — answers 404. A cutoff still sits
   * inside a calendar month, so the caller that gets that 404 passes the run's own
   * `{ year, month }` and asks again; the rows are the same ones the cutoff that
   * closes the month settles. `data.tax_month` is null in that answer, which is
   * why nothing here derives the period from the response.
   *
   * `expectedStatuses: [404]` because this endpoint answers a question rather
   * than failing when the run has no tax month configured — the answer is a 404
   * reading "No tax month found for this cutoff." Every employee on such a cutoff
   * asks this, so without it the console filled with one red line per row and
   * buried the genuine failures. The promise still rejects, so the panel gets to
   * read the 404 as the empty state it is.
   */
  async function fetchEpiContributions(payoutGroupInstanceId, epiId, period = null) {
    const config = { expectedStatuses: [404] }
    if (period?.year && period?.month) {
      config.params = { year: period.year, month: period.month }
    }
    const { data } = await api.get(
      `${BASE}/payroll/admin/epi-contributions/${payoutGroupInstanceId}/${epiId}/`,
      config,
    )
    // This route's body is undocumented — the schema declares `No response body`
    // — so read the containers this payroll family is known to answer with
    // rather than trusting one. `{ data: ... }` is the wrapper several sibling
    // endpoints use, and a bare array of the same rows `DeductContributionItem`
    // documents (id / name / amount / deducted / deducted_from) is the other.
    //
    // Getting this wrong is not a visible failure: the panel's
    // `data.contributions` reads `undefined`, the list renders empty, and the
    // dialog says "nothing is due from this employee" — the one reading a reader
    // cannot tell apart from a genuinely empty period.
    const payload = data?.data ?? data
    if (Array.isArray(payload)) {
      console.warn(
        '[useEmployeeContributions] epi-contributions answered a bare array; cutoff and status travel with the object shape only.',
      )
      return { contributions: payload }
    }
    return payload
  }

  /**
   * Deducts the named contributions from an employee payroll item by hand — the
   * fallback when a contribution did not come off automatically.
   *
   * Returns the server's response, which names what actually changed
   * (`updated_contribution_ids`), what it refused (`skipped_contribution_ids`)
   * and the item's new `net_pay`. Callers must read it and refetch: a green
   * toast over a skipped row is a payroll that disagrees with itself.
   */
  async function deductContributions(epiId, contributionIds = []) {
    const { data } = await api.post(`${BASE}/payroll/admin/deduct-contributions/`, {
      epi_id: epiId,
      contribution_ids: contributionIds,
    })
    return data
  }

  /**
   * Undoes a manual or automatic deduction, putting the named contributions
   * back to pending. The mirror of `deductContributions` and the way out of a
   * contribution deducted from the wrong cutoff; same response-reading and
   * refetch obligation, since reverting moves the item's contribution status
   * back off complete.
   */
  async function revertContributions(epiId, contributionIds = []) {
    const { data } = await api.post(`${BASE}/payroll/admin/revert-contributions/`, {
      epi_id: epiId,
      contribution_ids: contributionIds,
    })
    return data
  }

  return {
    fetchEpiContributions,
    deductContributions,
    revertContributions,
  }
}
