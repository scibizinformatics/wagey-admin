/**
 * One reading of `GET /payroll/admin/payout-group-progress/{pgi_id}/`.
 *
 * The endpoint answers about *two* flows on one payload: the payroll run's five
 * `progress` steps, and the cash advances' four `ca_progress` steps. Normally the
 * payroll list is the only thing a reader wants, and the array is read as-is by
 * the step header. The complication is the pause: an active cash advance holds
 * the payroll from Payslips onward, and while it does the payload says so three
 * ways — `current_progress` is the non-stage word `"cash_advance"`, the payroll
 * array is frozen wherever the run was, and the CA array carries the live work.
 *
 * `"cash_advance"` is a signal, not a stage: the array it accompanies describes
 * where payroll *will* resume, not where the work is. So `isPayrollPaused` is the
 * gate every caller checks before drawing anything, and the CA stage comes from
 * `ca_current_progress` (note the spelling — `disbursement`, not the route key
 * `disburse`) rather than from the payroll steps.
 *
 * Everything here is a pure derivation: no requests, no reactive state. Callers
 * own the fetch and pass the payload in, so a header and the shell around it
 * cannot disagree about whether the run is paused.
 *
 * The list page's rows (`payout-group-instances`) do not carry `current_progress`,
 * so there the pause is *inferred* from the two statuses the row has —
 * `isPayrollPausedByStatus`. It is deliberately conservative: an active advance
 * over a payroll still in Review is the endpoint's own edge case where the run is
 * *not* paused, and an unreadable status must never read as paused either.
 */

import { currentStepIndexForPgiStatus } from 'src/constants/pgiStatus'
import { normalizeStatusKey } from 'src/constants/cashAdvanceStatus'

/**
 * The value `current_progress` takes while an active cash advance holds the
 * payroll. Not a payroll stage name: the progress array beside it is frozen at
 * wherever the run was, describing where payroll resumes, not where work is.
 */
export const CASH_ADVANCE_PAUSE_SIGNAL = 'cash_advance'

/**
 * The pause only starts once payroll has reached Payslips — a run still in
 * Review keeps moving while the advances are decided (`current_progress` stays
 * `"review"`). This is the 0-based index of the first pausable step.
 */
const FIRST_PAUSABLE_STEP = 1

/**
 * Cash-advance status words that mean "no advances on this run at all". Already
 * normalised (`normalizeStatusKey` folds spaces, so `"N/A"` arrives as `n/a`).
 */
const CA_NONE_STATUSES = ['na', 'n/a', 'not_applicable']

/** Cash-advance status words that mean the advance track has finished. */
const CA_DONE_STATUSES = ['complete', 'completed']

/**
 * `ca_current_progress` → the CA flow's route keys. The endpoint spells the
 * release stage `disbursement`; the routes spell it `disburse`. Both accepted,
 * plus the completed form, so a caller never has to normalise this twice.
 */
const CA_CURRENT_ROUTES = {
  review: 'review',
  funding: 'funding',
  disburse: 'disburse',
  disbursement: 'disburse',
  complete: 'complete',
  completed: 'complete',
}

/**
 * Whether the advance track on this run is a real, unfinished flow. A `na` or
 * finished advance is not one the reader can act on, and a blank status is
 * "unknown" rather than "absent" — the list may simply not carry the field yet.
 */
export function isCashAdvanceActive(status) {
  const key = normalizeStatusKey(status)
  if (!key) return false
  if (CA_NONE_STATUSES.includes(key)) return false
  return !CA_DONE_STATUSES.includes(key)
}

/**
 * Whether the row explicitly says it has no advances (`cash_advance_status`:
 * `"na"`). A blank status is *not* this — it may be an older payload that never
 * sent the field, and callers that treat blank as "no advances" would blank out
 * every row on such a list.
 */
export function isCashAdvanceNone(status) {
  const key = normalizeStatusKey(status)
  return key !== '' && CA_NONE_STATUSES.includes(key)
}

/**
 * Whether the payload holds the run: an active advance has taken it over.
 *
 * Only the endpoint's own word decides this. `has_cash_advance` alone is not
 * enough (a *completed* advance is still `true` without pausing anything), and
 * the frozen array alone is not enough (a payroll that simply has not moved yet
 * is frozen too, without an advance in sight).
 */
export function isPayrollPaused(payload) {
  return normalizeStatusKey(payload?.current_progress) === CASH_ADVANCE_PAUSE_SIGNAL
}

/**
 * The same question for a list row, which carries statuses but not
 * `current_progress`.
 *
 * An active advance **and** a payroll at Payslips or later. Both halves matter:
 * the endpoint's edge case leaves an active advance un-paused while the payroll
 * is still in Review, and `currentStepIndexForPgiStatus` answers `null` for a
 * status word this app cannot place — `null >= 1` is false, so an unknown
 * payroll position never reads as paused.
 */
export function isPayrollPausedByStatus(caStatus, pgiStatus) {
  if (!isCashAdvanceActive(caStatus)) return false
  const index = currentStepIndexForPgiStatus(pgiStatus)
  return index != null && index >= FIRST_PAUSABLE_STEP
}

/** One progress entry, matched to a 0-based step index by `step` number first. */
function entryAt(progress, index) {
  return progress.find((entry) => Number(entry?.step) === index + 1) ?? progress[index]
}

/**
 * The payroll run's five steps, in the payload's own words. States stay the
 * `completed` / `in_progress` / `locked` vocabulary
 * `computeStepsFromPgiStatus` already speaks, so renderers translate the same
 * way they do for a status-mapped sequence.
 *
 * `null` when there is no array at all — a payload without one is a payload the
 * caller should place from its status instead, and an empty answer here must
 * never be read as "everything locked".
 */
export function payrollStepsFromProgress(payload, stepDefs) {
  const progress = Array.isArray(payload?.progress) ? payload.progress : []
  if (!progress.length) return null
  return stepDefs.map((def, i) => {
    const state = stateOf(entryAt(progress, i))
    return { ...def, state }
  })
}

/**
 * The cash-advance flow's steps, from `ca_progress`. A completed advance is
 * forced all-done: `cash_advance_status: "complete"` is the run's own closing
 * word, and an array missing an entry beside it is a lag in one field, not work
 * still owed.
 */
export function cashAdvanceStepsFromProgress(payload, stepDefs) {
  const progress = Array.isArray(payload?.ca_progress) ? payload.ca_progress : []
  if (!progress.length) return null
  const finished = CA_DONE_STATUSES.includes(normalizeStatusKey(payload?.cash_advance_status))
  return stepDefs.map((def, i) => {
    const state = finished ? 'completed' : stateOf(entryAt(progress, i))
    return { ...def, state }
  })
}

/**
 * The cash-advance flow's route key from the payload — where the advances
 * actually are. `ca_current_progress` wins because it is one word for the
 * stage; the array is the fallback for a payload that carries it without the
 * current word, read off the in-progress step, or the last done one when
 * nothing is in progress.
 *
 * `null` is meaningful: no usable signal, and callers keep whatever they
 * already had rather than being pulled to Review.
 */
export function cashAdvanceStageRoute(payload) {
  const raw = normalizeStatusKey(payload?.ca_current_progress)
  if (CA_CURRENT_ROUTES[raw]) return CA_CURRENT_ROUTES[raw]

  const steps = cashAdvanceStepsFromProgress(payload, ['review', 'funding', 'disburse', 'complete'])
  if (!steps) return null
  const active = steps.findIndex((step) => step.state === 'in_progress')
  if (active >= 0) return ['review', 'funding', 'disburse', 'complete'][active]
  const lastDone = steps.reduce((latest, step, i) => (step.state === 'completed' ? i : latest), -1)
  if (lastDone < 0) return null
  // A fully done sequence is Complete; otherwise the stage after the last done
  // step is the one being worked on.
  return lastDone >= steps.length - 1
    ? 'complete'
    : ['review', 'funding', 'disburse', 'complete'][lastDone + 1]
}

/**
 * Whether the payload carries a live advance track worth drawing.
 *
 * `has_cash_advance` decides when it is explicit — `false` means the payload's
 * `ca_progress` is the all-locked placeholder the endpoint sends for a run with
 * no advances, and quoting it would draw a rail the reader cannot follow. When
 * the flag is absent, the array itself decides: any done or in-progress step is
 * a track, an all-locked one is not.
 */
export function hasCashAdvanceTrack(payload) {
  if (!payload) return false
  if (payload.has_cash_advance === true) return true
  if (payload.has_cash_advance === false) return false
  const steps = cashAdvanceStepsFromProgress(payload, ['review', 'funding', 'disburse', 'complete'])
  return Boolean(steps?.some((step) => step.state !== 'locked'))
}

/** A progress entry's status, read onto the shared three-word state. */
function stateOf(entry) {
  const status = normalizeStatusKey(entry?.status)
  if (status === 'completed') return 'completed'
  if (status === 'in_progress') return 'in_progress'
  return 'locked'
}
