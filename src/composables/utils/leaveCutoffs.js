/**
 * Which payroll cutoff a leave request belongs to.
 *
 * The leave queue has no cutoff of its own. `/attendance/leave-list/` sends a
 * span — `start_date` to `end_date` — and nothing else that says when it will be
 * paid, so a reviewer narrowing the queue to the cutoff they are working cannot
 * do it from the rows in front of them. This module supplies that join from the
 * one place that knows the answer: the cutoff instances themselves, which carry
 * the window they cover.
 *
 * Everything here is deliberately derived rather than fetched per filter, for
 * the reason the payout-group filter next to it is too: `/attendance/leave-list/`
 * neither returns a cutoff nor accepts one as a query param, so the narrowing has
 * to happen here or not at all.
 *
 * Two rules make this safe to show as a dropdown:
 *
 *   - **Overlap, not containment.** A leave request that runs from the 28th into
 *     the 3rd straddles two cutoffs. Testing containment would hide it from both,
 *     so a reviewer working either cutoff would not see it — the request silently
 *     missing from the run it is paid in is the one failure this control cannot
 *     have. Overlap puts it under both, which is honest: it is genuinely in both.
 *
 *   - **A cutoff we cannot place is dropped, not offered.** `cutoff-instances`
 *     date fields are not documented anywhere in this repo, and a cutoff with no
 *     readable window would match nothing — a filter that empties the queue the
 *     moment it is touched. `normalizeLeaveCutoffs` reports what it could not
 *     place so the caller can say so, instead of the dropdown quietly offering a
 *     dead option.
 *
 * Keys follow `DisbursementListPage.vue`'s `cutoffKey` in preferring the id over
 * the name, for the same reason it does — two cutoffs may carry the same name —
 * and go one step further, because that screen always has an id to hand while an
 * id-less cutoff here would otherwise collapse a year of "Semi-monthly" into a
 * single option.
 *
 * The cutoff's own state is read too, even though the leave queue never asks for
 * it: this is the one reader of this endpoint, so the Disbursement list's
 * completed-cutoff scope comes through here rather than through a second
 * hand-rolled parser that would drift. See `utils/cutoffState.js` for the
 * tolerant reading and for what an unrecognised value does.
 */

import { fromIso } from 'src/composables/utils/calendarDate'
import { formatCutoffWindow, normalizeCutoffStatus } from 'src/composables/utils/cutoffState'

/** A bare calendar day. Anything longer is truncated before it is tested. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * A `YYYY-MM-DD` (or a datetime starting with one) as a bare calendar day, or
 * null when it is not a day at all.
 *
 * The truncation matters because neither endpoint is contracted for a bare date.
 * A `start_date` arriving as `2026-03-01T00:00:00Z` is still the 1st, and
 * `fromIso` would refuse it outright by appending a second `T00:00:00`.
 */
function dayIso(value) {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (!raw) return null
  const day = ISO_DAY.test(raw) ? raw : raw.slice(0, 10)
  return ISO_DAY.test(day) ? day : null
}

/**
 * The same day as local-midnight milliseconds, or null.
 *
 * Local midnight because a cutoff window is a pair of calendar days, not two
 * instants: `fromIso` pins the parse to local midnight so a cutoff closing on
 * the 15th closes on the 15th everywhere. A UTC parse would put a Manila
 * cutoff's closing day one day short in negative-offset timezones.
 *
 * `null` rather than a partial guess, so an unparseable value can never become
 * the zero timestamp that overlaps every window there is.
 */
function dayStartMs(value) {
  const day = dayIso(value)
  if (day === null) return null
  const ms = fromIso(day).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** The first of these the payload carries, trimmed — the cutoff's own name. */
const NAME_FIELDS = [
  'cutoff_instance_name',
  'cutoff_name',
  'name',
  'period_label',
  'label',
  'period',
  'cutoff',
]

/** The cutoff's window, under any of the spellings the two endpoints use. */
const START_FIELDS = ['start_date', 'period_start', 'cutoff_start', 'start', 'from']
const END_FIELDS = ['end_date', 'period_end', 'cutoff_end', 'end', 'to']

function firstText(raw, fields) {
  for (const field of fields) {
    const value = raw[field]
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text) return text
  }
  return ''
}

/** A window as `"Mar 1 – Mar 15"`, for a cutoff the payload left unnamed. */
function windowLabel(startMs, endMs) {
  const day = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return startMs === endMs ? day(startMs) : `${day(startMs)} – ${day(endMs)}`
}

/**
 * One cutoff as this filter needs it.
 *
 * Returns null for a payload that is not a cutoff at all — nothing named and
 * nothing dated is not something a reader can choose.
 *
 * The key prefers the id, and falls back to the name *qualified by the window it
 * covers*. A bare name is not enough on its own: "Semi-monthly" is the name of
 * every cutoff in a year, so keying two of them the same way merges them into a
 * single option that selects both — and a reviewer narrowing to March would be
 * looking at April. The window is the only other thing that tells two same-named
 * cutoffs apart.
 *
 * @param {object} raw
 * @returns {{key: string, id: number|string|null, label: string, windowLabel: string,
 *   status: string, startIso: string|null, endIso: string|null, startMs: number|null,
 *   endMs: number|null}|null}
 */
export function normalizeCutoffInstance(raw) {
  if (!raw || typeof raw !== 'object') return null

  const id = raw.id ?? raw.cutoff_id ?? raw.cutoff_instance_id ?? null
  const name = firstText(raw, NAME_FIELDS)
  const startIso = dayIso(firstText(raw, START_FIELDS))
  const endIso = dayIso(firstText(raw, END_FIELDS))
  const startMs = dayStartMs(startIso)
  const endMs = dayStartMs(endIso)

  if (id === null && !name && startIso === null) return null

  return {
    key: id !== null ? `id:${id}` : `name:${name.toLowerCase()}@${startIso ?? '?'}`,
    id,
    label: name || (startMs !== null && endMs !== null ? windowLabel(startMs, endMs) : ''),
    // The same window again, written the way a reader is meant to see it —
    // "Oct 1–15, 2026". A separate field rather than a replacement for `label`,
    // because the payload's own name is sometimes the better word for it and the
    // leave queue still shows that one.
    windowLabel: formatCutoffWindow(startIso, endIso),
    status: normalizeCutoffStatus(raw),
    startIso,
    endIso,
    startMs,
    endMs,
  }
}

/**
 * Whether a cutoff can answer a date-overlap question at all.
 *
 * Both bounds are needed. Half a window would match a request that fell entirely
 * on the far side of the missing bound, which is a wrong answer rather than no
 * answer — the failure mode `normalizeCutoffInstance` deliberately cannot
 * produce, because it leaves the fields null instead of substituting a default.
 */
export function isPlaceableCutoff(cutoff) {
  return Boolean(cutoff && cutoff.startMs !== null && cutoff.endMs !== null && cutoff.label)
}

/**
 * The cutoff list as the filter consumes it.
 *
 * `undated` comes back alongside so the caller can report a payload it could not
 * read. Dropping those cutoffs silently would leave a reviewer looking at a
 * shorter dropdown than the payroll run actually has, with nothing to explain the
 * gap.
 *
 * @param {object|Array} payload the endpoint body, or an unwrapped array
 * @returns {{cutoffs: Array, undated: number}}
 */
export function normalizeLeaveCutoffs(payload) {
  const list = Array.isArray(payload)
    ? payload
    : (payload?.results ?? payload?.data ?? payload?.cutoffs ?? [])
  const normalized = (Array.isArray(list) ? list : []).map(normalizeCutoffInstance).filter(Boolean)
  const placeable = normalized.filter(isPlaceableCutoff)
  return { cutoffs: placeable, undated: normalized.length - placeable.length }
}

/**
 * The one cutoff a key names.
 *
 * @param {Array} cutoffs
 * @param {string|null} key
 * @returns {object|null}
 */
export function findLeaveCutoff(cutoffs, key) {
  if (!key) return null
  const list = Array.isArray(cutoffs) ? cutoffs : []
  return list.find((cutoff) => cutoff?.key === key) ?? null
}

/**
 * Whether a leave request touches a cutoff's window.
 *
 * Inclusive at both ends, so a request whose last day is the cutoff's closing day
 * is in that cutoff — the boundary case is the common one, not the exotic one.
 * A reversed span is ordered rather than trusted, because a stored `end_date`
 * before `start_date` would otherwise return a confidently wrong "no".
 *
 * A row with no readable span is not in any cutoff. That is a real answer: the
 * join cannot place it, and claiming otherwise would put an undated request under
 * every cutoff at once.
 *
 * @param {{startDate?: string, endDate?: string}} row a normalized leave row
 * @param {{startMs: number, endMs: number}|null} cutoff
 * @returns {boolean}
 */
export function leavePeriodOverlapsCutoff(row, cutoff) {
  if (!isPlaceableCutoff(cutoff)) return false
  const start = dayStartMs(row?.startDate)
  const end = dayStartMs(row?.endDate) ?? start
  if (start === null || end === null) return false
  const from = Math.min(start, end)
  const to = Math.max(start, end)
  return from <= cutoff.endMs && to >= cutoff.startMs
}

/**
 * The select's options, newest cutoff first.
 *
 * Newest first because that is the order a reviewer reads a queue in: the cutoff
 * being worked is the current one. The Disbursement list keeps the endpoint's own
 * order instead, which works only because it assembles its options from rows it
 * has already sorted; here the list is raw, so the order is set explicitly rather
 * than assumed.
 *
 * "All cutoffs" leads, worded to match the payout-group select beside it.
 *
 * Unplaceable cutoffs are dropped here as well as in `normalizeLeaveCutoffs`, so
 * the function is safe on its own for a caller holding a raw list: an option with
 * a null window sorts first (null coerces to 0 in the subtraction below, and no
 * window can match a date), which would read as "this cutoff contains everything".
 *
 * @param {Array} cutoffs
 * @returns {Array<{label: string, value: string|null}>}
 */
export function buildLeaveCutoffOptions(cutoffs) {
  const placeable = (Array.isArray(cutoffs) ? cutoffs : []).filter(isPlaceableCutoff)
  const ordered = [...placeable].sort(
    (a, b) => b.startMs - a.startMs || a.label.localeCompare(b.label),
  )
  return [
    { label: 'All cutoffs', value: null },
    ...ordered.map((cutoff) => ({ label: cutoff.label, value: cutoff.key })),
  ]
}
