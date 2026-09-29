/**
 * Leave requests — the shared reading of `GET /attendance/leave-list/`.
 *
 * The payload gives the same span two readings that disagree precisely when it
 * matters:
 *
 *   - `total_days` is how many calendar days the request touches. A half day
 *     still touches one date, so it reports `1`;
 *   - `total_day_value` is the accrued value of the request. Half days count
 *     `0.5`, so the same request reports `"0.50"` — which is the figure a
 *     ledger deducts.
 *
 * The `days` array carries the per-date flag underneath (`is_half_day`), but
 * the table only ever shows the request as one span, and `total_day_value` is
 * already the sum of those flags. Displaying `total_days` therefore shows a
 * half-day request as a full one. `leaveRequestDurationLabel` reads the value
 * first so the table, the details modal and any future consumer all say the
 * same number.
 *
 * The write side of the same array lives here too: `leaveDayValue` is what
 * `POST /attendance/leave/apply-for-employee/` is built from, so the running
 * total shown in the apply dialog and the duration printed in the table are one
 * rule applied twice rather than two rules free to drift apart.
 */

import { formatDays } from 'src/composables/utils/leaveTypes'

/**
 * How long a leave request runs, as the number the ledger counts.
 *
 * `total_day_value` wins when present — it is the only field that distinguishes
 * `total_days: 1` at half pay from a full day. It falls back to `total_days`,
 * then to hours, then to a placeholder, in the order the old inline mapping
 * tried them, so full-day rows and hourly requests render exactly as before.
 */
export function leaveRequestDurationLabel(item) {
  if (!item || typeof item !== 'object') return 'N/A'

  const value = item.total_day_value
  if (value !== null && value !== undefined && value !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return `${formatDays(value)} day(s)`
  }

  if (item.total_days != null) {
    const parsed = Number(item.total_days)
    if (Number.isFinite(parsed)) return `${parsed} day(s)`
  }

  if (item.hours !== null && item.hours !== undefined && item.hours !== '') {
    return `${item.hours}h`
  }

  return 'N/A'
}

/**
 * The accrued value of a `days` array — half a point per half day, one per
 * full — as a number.
 *
 * This is the write side of `leaveRequestDurationLabel`, which reads the same
 * arithmetic back out of the server's `total_day_value`. Computing it here means
 * the total an admin sees while filling in the apply form and the total the
 * table prints afterwards are derived by one rule rather than two.
 *
 * `is_half_day` is read as a truthy flag rather than a strict `true`, because it
 * arrives from a date input's own state as a boolean but from a stored request
 * as either a boolean or the string some serializers produce.
 *
 * @param {Array<{date: string, is_half_day?: boolean}>} days
 * @returns {number} rounded to 2dp so `0.1 + 0.2` never reaches the payload
 */
export function leaveDayValue(days) {
  if (!Array.isArray(days)) return 0
  const total = days.reduce((sum, day) => sum + (day?.is_half_day ? 0.5 : 1), 0)
  return Math.round(total * 100) / 100
}

/**
 * A `days` array as the string a person reads, in the same shape
 * `leaveRequestDurationLabel` produces for a saved request.
 * @param {Array<{date: string, is_half_day?: boolean}>} days
 * @returns {string}
 */
export function leaveDayValueLabel(days) {
  const value = leaveDayValue(days)
  if (!value) return '0 day(s)'
  return `${formatDays(value)} day(s)`
}

/** Nothing the endpoint can be said to have reported. */
const UNREADABLE_OUTCOME = { updated: 0, skipped: 0, failed: 0, skipMessage: '', readable: false }

/**
 * What `PATCH /attendance/leave-approval/bulk/` did, in one object.
 *
 * The endpoint replaces the old one-call-per-row loop with a single call that
 * decides the whole batch itself and reports three outcomes, not two:
 *
 *   - `updated` — the request's status moved;
 *   - `skipped_recommended` — deliberately untouched, because the request
 *     carries a rejection recommendation. Not a failure, and the reason it is a
 *     bucket of its own is that the server refuses to action it at all;
 *   - `failed` — the server tried and could not.
 *
 * Collapsing the last two would report "1 of 2 approved" for a batch where one
 * request was protected and another genuinely broke, which are opposite problems
 * with opposite fixes.
 *
 * Counts come from the **lengths of the `details` arrays**, not from `summary`.
 * `details` is the work that happened; `summary` is a denormalised copy of it
 * that happens to agree today. A summary that drifted from the arrays would
 * report work that never occurred, and a reviewer has no way to tell that from a
 * real count.
 *
 * `readable` is what makes the 500 tolerance honest: it is true only when the
 * body genuinely carries a summary, so a bodyless 500 stays a real failure
 * instead of being reported as an empty — but successful — batch.
 *
 * @param {object} body - the response body, from either a 200 or a 500
 * @returns {{updated: number, skipped: number, failed: number, skipMessage: string, readable: boolean}}
 */
export function bulkLeaveOutcome(body) {
  const details = body?.details && typeof body.details === 'object' ? body.details : null
  const summary = body?.summary && typeof body.summary === 'object' ? body.summary : null
  if (!details && !summary) return { ...UNREADABLE_OUTCOME }

  const count = (key) => {
    if (details && Array.isArray(details[key])) return details[key].length
    const value = Number(summary?.[key])
    return Number.isFinite(value) ? value : 0
  }

  const skippedRows =
    details && Array.isArray(details.skipped_recommended) ? details.skipped_recommended : []

  return {
    updated: count('updated'),
    skipped: count('skipped_recommended'),
    failed: count('failed'),
    // The server writes a specific explanation per skipped request, and it is
    // better copy than anything this module could invent — it names the reason
    // and the way out of it. The first one becomes the toast caption; a toast is
    // not the place for ten identical paragraphs.
    skipMessage: skippedRows[0]?.message || '',
    readable: true,
  }
}

/**
 * The closing toast for a bulk leave run, as `{ type, message, caption }`.
 *
 * Four cases, because `skipped_recommended` and `failed` are not the same
 * event and the reviewer acts on them differently. The all-skipped case is
 * `info` rather than `error` on purpose: nothing broke, the endpoint did exactly
 * what it is built to do, and an error toast would send someone looking for a
 * fault that is not there.
 *
 * @param {{updated: number, skipped: number, failed: number, skipMessage: string}} outcome
 * @param {number} requested - how many ids the client sent, which is the
 *   reviewer's own yardstick: a batch is only "all" if everything they picked
 *   moved, whatever the server says it accounted for
 * @param {string} past - the verb's past tense, for the message
 */
export function bulkLeaveOutcomeToast(outcome, requested, past) {
  const { updated, skipped, failed, skipMessage } = outcome
  const caption = skipMessage || undefined
  const noun = (n) => `${n} leave request${n === 1 ? '' : 's'}`

  if (updated >= requested) {
    return { type: 'success', message: `${noun(updated)} ${past}` }
  }

  if (updated > 0) {
    const parts = [`${updated} ${past}`]
    if (skipped) parts.push(`${skipped} skipped`)
    if (failed) parts.push(`${failed} failed`)
    return { type: 'warning', message: `${parts.join(', ')}.`, caption }
  }

  if (skipped > 0 && failed === 0) {
    return {
      type: 'info',
      message: `Nothing was ${past} — ${skipped} recommended for rejection`,
      caption,
    }
  }

  // A run that moved nothing and reported no reason at all is the one case with
  // nothing to explain, so the sentence says so rather than naming buckets that
  // are all zero.
  if (failed === 0 && skipped === 0) {
    return { type: 'error', message: `None of these requests could be ${past}.` }
  }

  const parts = []
  if (failed) parts.push(`${failed} failed`)
  if (skipped) parts.push(`${skipped} skipped`)
  return { type: 'error', message: `Nothing was ${past} — ${parts.join(', ')}`, caption }
}
