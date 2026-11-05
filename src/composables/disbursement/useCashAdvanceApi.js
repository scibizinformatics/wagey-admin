import { api } from 'boot/axios'
import { BASE } from 'src/composables/utils/http'

const CASH_ADVANCE = `${BASE}/cash_advance/admin`
const PAYROLL = `${BASE}/payroll/admin`

/**
 * Most cash-advance endpoints answer `{ success, data, message }`; the funding
 * POST answers a flat object instead (its own `message` and `bch_contract` sit
 * at the top level). This reads either shape without the caller having to know
 * which endpoint it came from.
 */
function unwrap(payload) {
  return payload?.data ?? payload
}

/**
 * The cash-advance flow's API.
 *
 * One function per endpoint the four step pages use — Review, Funding, Disburse
 * and Complete. Nothing here caches: these are the screens that *change* the
 * figures, and a step that read its own work back from a cache written before
 * the change would show a request it just approved as still pending. The list
 * page's per-run reading is cached in `useDisbursementApi` and is invalidated by
 * the callers after a write.
 *
 * `expectedStatuses` is used where a 4xx is an answer rather than a failure:
 * a group with no funding row yet, and a completion endpoint that refuses to
 * report on a run that is still disbursing. It only silences the console; the
 * promise still rejects, and the pages handle the rejection as the state it is.
 */
export function useCashAdvanceApi() {
  // ── Step 1: Review ──

  /**
   * Every cash advance request against one payout group instance, grouped by
   * employee. Totals at the top, individual requests under each employee.
   */
  async function fetchCashAdvanceReviewEmployees(payoutGroupInstanceId) {
    const { data } = await api.get(`${CASH_ADVANCE}/review-employees/${payoutGroupInstanceId}/`)
    return { data: unwrap(data), message: data?.message ?? '' }
  }

  /** Approve or reject one request. Only pending requests can be acted on. */
  async function actOnCashAdvanceRequest(requestId, status) {
    const { data } = await api.patch(`${CASH_ADVANCE}/cash-advances/${requestId}/action/`, {
      status,
    })
    return { data: unwrap(data), message: data?.message ?? '' }
  }

  /** Remove a request. Refused with 409 once its funding has started. */
  async function deleteCashAdvanceRequest(requestId) {
    const { data } = await api.delete(`${CASH_ADVANCE}/cash-advances/${requestId}/`)
    return { data: unwrap(data), message: data?.message ?? '' }
  }

  // ── Step 2: Funding ──

  /** What the group's advances come to, plus every funding entry already recorded. */
  async function fetchCashAdvanceFunding(payoutGroupInstanceId) {
    const { data } = await api.get(`${CASH_ADVANCE}/funding/${payoutGroupInstanceId}/`, {
      // Before the first funding entry the group has no funding row, and that is
      // the step's starting state rather than an error.
      expectedStatuses: [404],
    })
    return { data: unwrap(data), message: data?.message ?? '' }
  }

  /**
   * Records a funding entry. Answers a flat object — no `success`/`data` wrapper —
   * and may carry a `bch_contract` when the payment method is BCH.
   */
  async function createCashAdvanceFunding(payoutGroupInstanceId, payload) {
    const { data } = await api.post(
      `${PAYROLL}/payout-group-fundings/cash-advance/${payoutGroupInstanceId}/`,
      payload,
    )
    return { data, message: data?.message ?? '' }
  }

  // ── Step 3: Disburse ──

  /** What has been funded and what each employee has claimed. */
  async function fetchCashAdvanceDisbursementSummary(payoutGroupInstanceId) {
    const { data } = await api.get(
      `${CASH_ADVANCE}/disbursement-summary/${payoutGroupInstanceId}/`,
      { expectedStatuses: [404] },
    )
    return { data: unwrap(data), message: data?.message ?? '' }
  }

  /** Marks the selected employee payroll items for cash advance release. */
  async function disburseCashAdvances(payoutGroupInstanceId, epiIds = []) {
    const { data } = await api.post(
      `${CASH_ADVANCE}/cash-advances/disburse/${payoutGroupInstanceId}/`,
      { epi_ids: epiIds },
    )
    return { data: unwrap(data), message: data?.message ?? '' }
  }

  // ── Step 4: Complete ──

  /**
   * The finished record. Answers 400 while the run is not complete, which is a
   * state the page renders rather than an error it reports.
   */
  async function fetchCashAdvanceCompletedProgress(payoutGroupInstanceId) {
    const { data } = await api.get(`${CASH_ADVANCE}/completed-progress/${payoutGroupInstanceId}/`, {
      expectedStatuses: [400],
    })
    return { data: unwrap(data), message: data?.message ?? '' }
  }

  return {
    fetchCashAdvanceReviewEmployees,
    actOnCashAdvanceRequest,
    deleteCashAdvanceRequest,
    fetchCashAdvanceFunding,
    createCashAdvanceFunding,
    fetchCashAdvanceDisbursementSummary,
    disburseCashAdvances,
    fetchCashAdvanceCompletedProgress,
  }
}
