/**
 * The readings every audit source shares, and the row both renderers read.
 *
 * `GET /audit/assignment/history/` and `GET /audit/contracts/history/` answer with
 * the same six fields today, so the derivations that turn those fields into a row
 * — parsing a pre-formatted stamp, splitting it for layout, deciding what kind of
 * change it was, composing a stable key — are written once here rather than
 * copied into a per-source module that would quietly become a second opinion.
 *
 * ── Why the row keys are NEUTRAL ─────────────────────────────────────────────
 * `previousShift` / `newShift` / `shiftDateLabel` would be a row that describes
 * one source, read by a table that now serves two. The values here are named for
 * what they are — the value before the edit, the value after it, the day — so a
 * renderer holding a contract row is not reaching for a field called "shift", and
 * a later backend change that sends `contract_term` / `effective_date` is a change
 * in one normaliser rather than a rename across three components.
 *
 * The *labels* are the part that genuinely differs per source, and they live in
 * `composables/utils/auditSources.js` alongside the columns and the empty states.
 *
 * ── Traps in this payload ────────────────────────────────────────────────────
 *   - The "previous" value is legitimately null. That is a *first* addition, not a
 *     missing value, and it must not render as "— to Morning".
 *   - `updated_at` arrives already formatted for display ("Sep 02, 2026
 *     10:30:45 AM"), in the server's timezone. It is passed through untouched
 *     rather than reparsed and reformatted: the server knows which timezone the
 *     stamp belongs to and the browser does not. It is parsed *only* to sort (see
 *     `stampToMs`), where one uniform offset across every row leaves the ordering
 *     correct even when the absolute instant is not.
 */

import { longLabel } from 'src/composables/utils/calendarDate'
import { buildEmployeeNameIndex, hasEmployeeName } from 'src/composables/utils/employee'

/** Trimmed string, or ''. The payload uses null, '' and absent interchangeably. */
function text(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value.trim() : String(value).trim()
}

// "Sep 02, 2026 10:30:45 AM" — the shape this endpoint sends. Matched by hand
// rather than left to `new Date(string)` alone so that a change in the server's
// formatting is visible here instead of silently producing NaN sort keys.
const STAMP =
  /^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]\.?M\.?)?$/i

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * A display stamp to milliseconds, for sorting only.
 *
 * Returns `NaN` when it will not parse, which callers treat as "cannot say" and
 * fall back to the server's order for. Returning 0 instead would sort every
 * unparseable row to one far end of the list as if it were the oldest.
 *
 * @param {string} value
 * @returns {number}
 */
export function stampToMs(value) {
  const raw = text(value)
  if (!raw) return NaN

  const match = raw.match(STAMP)
  if (match) {
    const [, monthName, day, year, hour12, minute, second, meridiem] = match
    const month = MONTHS.indexOf(monthName.slice(0, 3).toLowerCase())
    if (month >= 0) {
      let hour = Number(hour12)
      const suffix = (meridiem || '').replace(/\./g, '').toUpperCase()
      if (suffix === 'PM' && hour < 12) hour += 12
      if (suffix === 'AM' && hour === 12) hour = 0
      return new Date(
        Number(year),
        month,
        Number(day),
        hour,
        Number(minute),
        Number(second || 0),
      ).getTime()
    }
  }

  // Anything else the platform understands, e.g. a plain ISO stamp if this
  // endpoint ever stops pre-formatting.
  const parsed = Date.parse(raw)
  return Number.isNaN(parsed) ? NaN : parsed
}

// "Sep 02, 2026 10:30:45 AM" -> the day and the clock time, as two runs of the
// original string. Split at the year so the table can stack them and the cards
// can print them apart; neither renderer reformats either half.
const STAMP_SPLIT = /^(.*\d{4}),?\s+(\d{1,2}:\d{2}.*)$/

/**
 * A display stamp split for layout: `{ day, time }`.
 *
 * A *split*, never a reformat — both halves are substrings of what the server
 * sent, so the timezone question the module header describes never arises. A
 * stamp that does not match comes back whole in `day`, which prints as itself
 * rather than as a blank cell.
 */
export function splitStamp(value) {
  const raw = text(value)
  const match = raw.match(STAMP_SPLIT)
  return match ? { day: match[1], time: match[2] } : { day: raw, time: '' }
}

/**
 * What kind of change an entry records.
 *
 * Derived from the pair of values, because the payload carries no field naming
 * it. `kinds` is the source's vocabulary, so the logic is written once and only
 * the wording differs — see `changeKind` in `auditSources.js`.
 */
function kindFor(previous, next, kinds) {
  if (!previous && next) return kinds.assigned
  if (previous && !next) return kinds.removed
  if (previous && next && previous !== next) return kinds.changed
  return kinds.unchanged
}

/** `dash-chip` modifier for a change tone. Neutral is the unmodified chip. */
export function chipClass(tone) {
  return tone && tone !== 'neutral' ? `dash-chip--${tone}` : ''
}

/**
 * One payload entry to the row both renderers read.
 *
 * @param {object}   entry      a raw `results[]` item
 * @param {number}   index      position in the server's response, kept as a stable
 *                               tiebreaker so a sort cannot shuffle equal stamps
 * @param {object}   options
 * @param {object}   options.kinds  the source's `changeKinds`
 * @param {Function} [options.readPrevious]  how to read the value before the edit
 * @param {Function} [options.readNext]      how to read the value after it
 * @param {Function} [options.readDate]      how to read the day the change concerns
 */
export function buildAuditEntry(entry, index = 0, options = {}) {
  const {
    kinds,
    readPrevious = (e) => text(e?.previous_shift),
    readNext = (e) => text(e?.new_shift),
    readDate = (e) => text(e?.shift_date),
  } = options

  const previousValue = readPrevious(entry)
  const newValue = readNext(entry)
  const dateValue = readDate(entry)
  const updatedAt = text(entry?.updated_at)
  const employeeName = text(entry?.employee_name)
  const stamp = splitStamp(updatedAt)

  return {
    // The payload carries no id. Composed from the fields that together identify
    // the change, plus the index, so `row-key` stays unique even when one
    // person's record is edited twice inside the same second.
    key: `${dateValue}|${employeeName}|${updatedAt}|${index}`,
    index,
    employeeName: employeeName || 'Unknown employee',
    updaterName: text(entry?.updater_name) || 'Unknown',
    dateValue,
    // "Sep 2, 2026", via calendarDate so a bare YYYY-MM-DD is read as a calendar
    // day rather than shifted back one by a UTC-midnight parse.
    dateLabel: longLabel(dateValue),
    previousValue,
    newValue,
    updatedAt,
    // Pre-split rather than split in the template: both renderers stack the day
    // over the time, and doing it per render meant three calls per row per paint
    // for a value that never changes.
    updatedAtDay: stamp.day,
    updatedAtTime: stamp.time,
    // The two halves rejoined for the card list, which prints them on one line.
    // Built here rather than interpolated in the template: doing it there needs a
    // whitespace-sensitive inline `<template>` that the formatter rewraps into
    // something no one can read.
    updatedAtStamp: stamp.time ? `${stamp.day} · ${stamp.time}` : stamp.day,
    updatedAtMs: stampToMs(updatedAt),
    change: kindFor(previousValue, newValue, kinds),
  }
}

/**
 * Drop the entries that belong to another workspace.
 *
 * These endpoints answer with a bare `employee_name` and no company field of any
 * kind, so a response cannot be checked against the company that was asked for —
 * and in practice it comes back holding every company the caller can see. The
 * company's own employee roster is therefore the only thing available that can
 * say whether a row belongs on this screen: a change to somebody who is not on the
 * roster is a change in some other workspace.
 *
 * Two consequences worth stating rather than discovering later:
 *
 *   - Matching is by name, through the same index the avatars use, so a person the
 *     roster no longer lists at all drops out of the trail with them. That is the
 *     intended trade — a name from another company on an audit screen is a worse
 *     failure than a missing row — but it is a trade.
 *   - An empty or unavailable roster means "cannot say", not "nothing belongs
 *     here". The entries pass through unfiltered in that case and `scoped` is
 *     false, so a failed roster fetch never empties a trail that does have rows.
 *
 * @param {Array} entries    raw payload entries, before normalisation
 * @param {Array} employees  the roster, as `useEmployees` returns it
 * @returns {{ entries: Array, scoped: boolean, dropped: number }}
 */
export function scopeEntriesToRoster(entries, employees) {
  const list = Array.isArray(entries) ? entries : []
  const index = buildEmployeeNameIndex(employees)
  if (!index.size) return { entries: list, scoped: false, dropped: 0 }

  const kept = list.filter((entry) => hasEmployeeName(index, entry?.employee_name))
  return { entries: kept, scoped: true, dropped: list.length - kept.length }
}

/**
 * Newer-first difference, treating an unparseable stamp as "cannot say".
 *
 * Returns 0 rather than throwing a row to one end when either side will not
 * parse, so the caller falls back to the server's own order for that pair instead
 * of silently reordering everything around it.
 */
export function byStamp(a, b) {
  if (Number.isNaN(a.updatedAtMs) || Number.isNaN(b.updatedAtMs)) return 0
  return a.updatedAtMs - b.updatedAtMs
}

/**
 * The text a search term is matched against.
 *
 * Both values are searched as well as both people: "Night" is a reasonable thing
 * to type when hunting for who was moved off it, and the value somebody was moved
 * *from* is as searchable a fact as the one they were moved to.
 *
 * @param {object} row   a normalised row
 * @returns {string}
 */
export function searchText(row) {
  return [
    row.employeeName,
    row.updaterName,
    row.previousValue,
    row.newValue,
    row.dateLabel,
    row.dateValue,
  ]
    .filter(Boolean)
    .join(' ')
}
