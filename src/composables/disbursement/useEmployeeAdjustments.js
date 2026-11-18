import { api } from 'boot/axios'
import { BASE } from 'src/composables/utils/http'

/**
 * One employee payroll item's manual adjustments, and the two writes that move
 * them.
 *
 *   GET  /payroll/admin/epi-adjustments/{epi_id}/
 *   POST /payroll/admin/apply-adjustment/
 *   POST /payroll/admin/revert-adjustment/
 *
 * An adjustment is money a person decided rather than money the law required —
 * a bonus, a loan repayment, a correction. It is reverted one entry at a time,
 * by its own id, which is why these three calls live here and not beside the
 * statutory contributions: the two modules share no endpoint, no payload and no
 * state.
 */
export function useEmployeeAdjustments() {
  /**
   * Every manual addition and deduction on one employee payroll item.
   *
   * Answers the item's own totals as well as the rows, so a client never has to
   * sum its way to `total_deductions` and disagree with the server about it.
   */
  async function fetchEpiAdjustments(epiId) {
    const { data } = await api.get(`${BASE}/payroll/admin/epi-adjustments/${epiId}/`)
    return data
  }

  /**
   * Records one manual addition or deduction against an employee payroll item.
   *
   * Returns the server's response; callers should refetch, since applying moves
   * `net_pay` and both manual totals.
   */
  async function applyAdjustment(payload) {
    const { data } = await api.post(`${BASE}/payroll/admin/apply-adjustment/`, payload)
    return data
  }

  /**
   * Undoes one applied adjustment. Takes the adjustment's own id rather than the
   * payroll item's, because several can be open on one item and a revert is
   * always about one of them.
   */
  async function revertAdjustment(adjustmentId) {
    const { data } = await api.post(`${BASE}/payroll/admin/revert-adjustment/`, {
      adjustment_id: adjustmentId,
    })
    return data
  }

  return {
    fetchEpiAdjustments,
    applyAdjustment,
    revertAdjustment,
  }
}
