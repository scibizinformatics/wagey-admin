/**
 * Reading a payroll cutoff instance: when it ran, what shape it follows, and
 * whether it has finished.
 *
 * `GET /payroll/admin/cutoff-instances/` is the one list answering "which cutoffs
 * does this workspace have", and the Disbursement list reads it to scope its
 * table. `normalizeCutoffInstance` (in `leaveCutoffs.js`) is that endpoint's
 * reader, and until now it kept only the id, the name and the window — so the
 * answer to "is this one done?" was thrown away, and the Disbursement list had
 * no way to tell a finished cutoff from the one in progress.
 *
 * whole list: it answers with every cutoff *type* in the workspace, so a company
 * running a semi-monthly cutoff is also handed the weekly, bi-weekly, monthly and
 * annual ones. Offering those raw fills a dropdown with a dozen periods the company
 * cannot pay against. `companyCutoffShapes` / `narrowCutoffsByShape` below fix that
 * by learning the company's shape from the one company-scoped source there is,
 * `payroll-trend`, and keeping only the windows that match it.
 *
 * It also never said whether a cutoff had finished, which is why the status reading
 * below exists.
 *
 * The reading is deliberately tolerant rather than exact, the same posture
 * `normalizeCutoffInstance` already takes over this endpoint's name and window
 * spellings: several field names and several words for "finished" are accepted.
 *
 * An unrecognised value is *reported, not guessed*. Guessing "finished" would
 * quietly drop a cutoff out of the Completed view; guessing "unfinished" would
 * park it in the default scope forever. Both are silent, and both are the kind
 * of wrong that nobody notices until a payroll run is missing. So an unknown
 * token counts as not-completed and is named in the console exactly once, where
 * `console.warn` survives the production build and `console.log` does not.
 */

import { fromIso, todayIso } from 'src/composables/utils/calendarDate'

/** The shapes a semi-monthly cutoff type is made of. */
export const SEMI_MONTHLY_SHAPES = ['1-15', '16-last']

/** A `YYYY-MM-DD` (or a datetime starting with one) as `{year, month, day}`. */
function dayParts(iso) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? '').trim())
  return matched
    ? { year: Number(matched[1]), month: Number(matched[2]), day: Number(matched[3]) }
    : null
}

/**
 * A cutoff window reduced to the pattern it follows — `1-15`, `16-last`, `1-30`.
 *
 * Two cutoffs of the same type share a shape even though their dates differ: a
 * semi-monthly company's March 16–31 and February 16–28 are both `16-last`, and
 * that shared shape is the only thing that lets one company recognise its own
 * cutoffs in a list every company in the workspace contributed to.
 *
 * The year, and the month length, are left out on purpose for the same reason.
 * "last" rather than a literal end day, because 28/30/31 are one cutoff and a
 * shape test that spelled them out separately would need three rules for what is
 * one.
 *
 * @param {unknown} startIso
 * @param {unknown} endIso
 * @returns {string|null} null when either bound is not a readable day
 */
export function cutoffShape(startIso, endIso) {
  const start = dayParts(startIso)
  const end = dayParts(endIso)
  if (!start || !end) return null
  const lastDay = new Date(end.year, end.month, 0).getDate()
  return `${start.day}-${end.day === lastDay ? 'last' : end.day}`
}

// `startIso`/`endIso` from this module's own reader, `start_date`/`end_date` from
// `payroll-trend` — the two sources describe the same window under different names,
// and this is the one place that has to read either.
const startOf = (cutoff) => cutoff?.startIso ?? cutoff?.start_date ?? cutoff?.period_start ?? null
const endOf = (cutoff) => cutoff?.endIso ?? cutoff?.end_date ?? cutoff?.period_end ?? null

/**
 * Which window shapes count as this company's cutoffs.
 *
 * Nothing in the app knows a cutoff *type* — `cutoff-instances` sends a name and a
 * window and no type or company field, and the labor-rule settings endpoint carries
 * only `time_format`. So the type is learned from the one source already scoped to
 * the company: `payroll-trend` answers about this workspace's own cutoffs, so
 * whatever shape those follow is the shape this company uses.
 *
 * The semi-monthly pair is completed deliberately. A company whose history so far
 * holds only one half — a new company, or a year not yet past the 16th — would
 * otherwise have the other half filtered out, and that other half is usually the
 * cutoff in progress, the one the reader most wants to open.
 *
 * Falling back to the semi-monthly pair when nothing could be learned at all is the
 * same bet the Dashboard makes, and a safe one for the common case: a company we
 * cannot describe is most often one running the default fortnightly payroll, and
 * dropping *its* cutoffs would be worse than keeping two it does not recognise.
 *
 * @param {Array} companyCutoffs cutoffs from the company-scoped source
 * @returns {Set<string>}
 */
export function companyCutoffShapes(companyCutoffs) {
  const known = new Set(
    (Array.isArray(companyCutoffs) ? companyCutoffs : [])
      .map((cutoff) => cutoffShape(startOf(cutoff), endOf(cutoff)))
      .filter(Boolean),
  )
  if (!known.size) return new Set(SEMI_MONTHLY_SHAPES)
  if (SEMI_MONTHLY_SHAPES.some((shape) => known.has(shape))) {
    for (const shape of SEMI_MONTHLY_SHAPES) known.add(shape)
  }
  return known
}

/**
 * Only the cutoffs following one of these shapes.
 *
 * @param {Array} cutoffs normalized cutoff instances
 * @param {Set<string>|Array<string>} shapes
 * @returns {Array}
 */
export function narrowCutoffsByShape(cutoffs, shapes) {
  const allowed = shapes instanceof Set ? shapes : new Set(shapes ?? [])
  return (Array.isArray(cutoffs) ? cutoffs : []).filter((cutoff) =>
    allowed.has(cutoffShape(startOf(cutoff), endOf(cutoff))),
  )
}

/** Fields that have been seen carrying a cutoff's state, most specific first. */
const STATUS_FIELDS = ['status', 'cutoff_status', 'state', 'cutoff_state', 'phase']

/** Flat boolean flags, for a payload that says it is done rather than saying so. */
const COMPLETED_FLAGS = ['is_completed', 'is_complete', 'is_closed', 'is_finished']
const ONGOING_FLAGS = ['is_open', 'is_ongoing', 'is_current', 'is_in_progress', 'is_active']

/** Words meaning the cutoff is over. */
const COMPLETED_VALUES = new Set([
  'completed',
  'complete',
  'closed',
  'done',
  'finished',
  'finalized',
  'finalised',
  'paid',
  'settled',
])

/** Words meaning the cutoff is still running. */
const ONGOING_VALUES = new Set([
  'in_progress',
  'ongoing',
  'open',
  'active',
  'current',
  'running',
  'pending',
])

/** Tokens already warned about, so a busy page says it once rather than per row. */
const warnedTokens = new Set()

/**
 * `In Progress` and `in-progress` and `in_progress` are one word, and so is
 * ` `, `.` and `-` between words. Keyed lookups run through this, so a new
 * spelling only has to be added as a clean token rather than in four variants.
 */
function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

/** The first non-empty of these fields, as a token. */
function readStatusField(raw) {
  for (const field of STATUS_FIELDS) {
    const value = raw?.[field]
    if (value === null || value === undefined) continue
    const token = normalizeKey(value)
    if (token) return token
  }
  return ''
}

/** True / false from a boolean field, or null when the payload has no such flag. */
function readFlag(raw, fields) {
  for (const field of fields) {
    const value = raw?.[field]
    if (typeof value === 'boolean') return value
  }
  return null
}

/**
 * A cutoff's state as one token, from whichever of the shapes this endpoint has
 * used. Falls back to the first non-empty status field, so a cutoff carrying
 * nothing this module recognises reports `''` rather than being called finished.
 *
 * @param {object|unknown} raw a cutoff instance, or a bare status value
 * @returns {string} a normalized token, possibly empty
 */
export function normalizeCutoffStatus(raw) {
  if (!raw || typeof raw !== 'object') return normalizeKey(raw)
  if (readFlag(raw, COMPLETED_FLAGS) === true) return 'completed'
  if (readFlag(raw, ONGOING_FLAGS) === true) return 'ongoing'
  return readStatusField(raw)
}

function warnUnknown(token) {
  if (warnedTokens.has(token)) return
  warnedTokens.add(token)
  console.warn(
    `[cutoffs] unrecognised cutoff status "${token}" — treated as NOT completed. ` +
      'Add it to COMPLETED_VALUES or ONGOING_VALUES in utils/cutoffState.js.',
  )
}

/** True when the token means the cutoff has finished. */
export function isCompletedCutoffStatus(status) {
  const key = normalizeKey(status)
  if (!key) return false
  if (COMPLETED_VALUES.has(key)) return true
  if (ONGOING_VALUES.has(key)) return false
  warnUnknown(key)
  return false
}

/** True when the token means the cutoff is still running. */
export function isOngoingCutoffStatus(status) {
  const key = normalizeKey(status)
  if (!key) return false
  if (ONGOING_VALUES.has(key)) return true
  if (COMPLETED_VALUES.has(key)) return false
  warnUnknown(key)
  return false
}

/** Lowercase month abbreviation for a local-midnight Date, e.g. "Oct". */
function monthShort(date) {
  return date.toLocaleDateString('en-US', { month: 'short' })
}

/**
 * A cutoff's window as the reader is meant to see it: `Oct 1–15, 2026`.
 *
 * Built from the cutoff's own dates rather than from its name, because the name
 * is the one part of the payload this endpoint never agrees on — a company
 * running a semi-monthly cutoff sends "Semi-monthly" for every one of them, which
 * is no use at all in a list. The dates are the identity.
 *
 * The end day is whatever the month really ends on, so the second half of the
 * month needs no special case: October reads `16–31`, November `16–30`, February
 * `16–28`. A window that crosses a month or a year spells both ends out in full,
 * because "Oct 28 – Nov 3, 2026" and "Dec 28, 2026 – Jan 3, 2027" are the cases
 * where a bare day range would be ambiguous.
 *
 * `fromIso` rather than `new Date(iso)` — a bare ISO string parses as UTC midnight
 * and renders as the day before, everywhere west of Greenwich.
 *
 * @param {string|null} startIso `YYYY-MM-DD`
 * @param {string|null} endIso `YYYY-MM-DD`
 * @returns {string} `''` when neither bound is a readable day
 */
export function formatCutoffWindow(startIso, endIso) {
  const start = startIso ? fromIso(startIso) : null
  const end = endIso ? fromIso(endIso) : null
  const startOk = Boolean(start) && !isNaN(start.getTime())
  const endOk = Boolean(end) && !isNaN(end.getTime())
  if (!startOk && !endOk) return ''

  // One bound readable: name that one day rather than dropping the cutoff. A
  // half-window still tells a reader which period they are looking at, which is
  // more than an empty dropdown option would.
  if (!startOk || !endOk) {
    const only = startOk ? start : end
    return only.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const year = start.getFullYear()
  const month = monthShort(start)

  if (year === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${month} ${start.getDate()}–${end.getDate()}, ${year}`
  }
  if (year === end.getFullYear()) {
    return `${month} ${start.getDate()} – ${monthShort(end)} ${end.getDate()}, ${year}`
  }
  const full = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${full(start)} – ${full(end)}`
}

/** True when the app recognises this token as a state rather than a mystery. */
function isRecognisedStatus(value) {
  const key = normalizeKey(value)
  if (!key) return false
  return COMPLETED_VALUES.has(key) || ONGOING_VALUES.has(key)
}

/**
 * True when a normalized cutoff instance has finished.
 *
 * Layered, and the lower layer is the calendar. A status this app recognises is
 * authoritative — that is the backend's own answer and nothing should overrule it.
 * But the status is the half of this that cannot be relied on yet: the list
 * endpoint has never been seen to send one, and when it sends something this
 * module does not recognise, the honest answer is "we do not know", not "not
 * finished".
 *
 * So where there is no usable status, the cutoff's own closing date decides: a
 * period that ended before today is over, whatever anybody's flag says. That is
 * the same rule `defaultCutoff` uses to decide where the page opens, so the list
 * the Completed button shows and the cutoff the page defaults to cannot end up
 * disagreeing about which periods are in the past.
 *
 * The cost is one mild over-report: a cutoff whose period has ended but whose
 * payroll is still in review counts as completed. It is the safer of the two
 * errors — the alternative is a button that is permanently disabled, which is
 * exactly what this fallback exists to prevent — and it disappears on its own as
 * soon as the backend sends a status this module reads.
 *
 * @param {object} cutoff a normalized cutoff instance
 * @param {string} [today] `YYYY-MM-DD`, for a caller holding a fixed clock
 * @returns {boolean}
 */
export function isCompletedCutoff(cutoff, today = todayIso()) {
  if (isRecognisedStatus(cutoff?.status)) return isCompletedCutoffStatus(cutoff.status)
  const key = normalizeKey(cutoff?.status)
  if (key) warnUnknown(key)
  // Strictly before today: a cutoff closing *on* today still contains today, so
  // it is the period in progress rather than one that has finished.
  return Boolean(cutoff?.endIso) && cutoff.endIso < today
}

/** True when this normalized cutoff instance is the one still running. */
export function isOngoingCutoff(cutoff) {
  return isOngoingCutoffStatus(cutoff?.status)
}

/**
 * Which of two cutoffs finished more recently, ascending.
 *
 * The end of the window, not the start, because a company's cutoffs do not
 * overlap and two cutoffs of the same length would otherwise order as ties. A
 * cutoff with no readable window sorts last — it cannot be placed, and placing it
 * first would make it the default for a company whose other cutoffs are placed.
 *
 * @returns {number}
 */
export function compareCutoffRecency(a, b) {
  const left = a?.endMs ?? a?.startMs ?? null
  const right = b?.endMs ?? b?.startMs ?? null
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return left - right
}

/**
 * The cutoff a reader lands on: the one *before* the period they are living in.
 *
 * A date rule rather than a status rule, because "where am I now" is a fact about
 * the calendar and needs nothing from the backend to answer it. Today being
 * Oct 17 means the cutoff in progress is Oct 16–31, so the page opens on
 * Oct 1–15 — the last one that has actually closed.
 *
 * "Ended" is strict, `endIso < today`: a cutoff closing *on* today still contains
 * today, so it is the current one and the one before it is the default. On Oct 1
 * that correctly gives the previous month rather than a cutoff that is not over
 * until the 15th.
 *
 * Falling back to the newest cutoff of any kind is deliberate — a workspace
 * running its very first payroll has nothing that has closed yet, and an empty
 * table with an empty dropdown cannot tell the reader whether the page is broken
 * or the workspace is new.
 *
 * The comparison is a string compare on `YYYY-MM-DD`, which orders correctly as
 * text and cannot be shifted by a timezone the way parsing it as an instant
 * could. Cutoffs with no readable end date are excluded from "has closed" rather
 * than assumed to have closed.
 *
 * @param {Array} cutoffs normalized cutoff instances
 * @param {string} [today] `YYYY-MM-DD`, for a caller holding a fixed clock
 * @returns {object|null}
 */
export function defaultCutoff(cutoffs, today = todayIso()) {
  const list = (Array.isArray(cutoffs) ? cutoffs : []).filter(Boolean)
  if (!list.length) return null
  const newestFirst = [...list].sort((a, b) => compareCutoffRecency(b, a))
  const closed = newestFirst.find((cutoff) => cutoff?.endIso && cutoff.endIso < today)
  return closed ?? newestFirst[0] ?? null
}
