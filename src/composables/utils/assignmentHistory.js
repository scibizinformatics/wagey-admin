/**
 * Shift-assignment history rows, as the audit page reads them.
 *
 * `GET /audit/assignment/history/` answers with one entry per saved change to a
 * person's shift on a day:
 *
 *   { updater_name, employee_name, shift_date, new_shift, previous_shift,
 *     updated_at }
 *
 * Everything the page shows is derived here rather than in the table, because
 * the table and the card list below 1024px render the same rows and must agree
 * on what each one *says* — which of the two shift names is current, whether
 * the row is an assignment or a removal, and how it sorts. Two renderers
 * deriving that separately is how one change ends up labelled "Reassigned" in
 * the table and "Assigned" in the cards.
 *
 * Two traps in this payload:
 *
 *   - `previous_shift` is legitimately null. That is a *first* assignment, not
 *     a missing value, and it must not render as "— to Morning".
 *   - `updated_at` arrives already formatted for display ("Sep 02, 2026
 *     10:30:45 AM"), in the server's timezone. It is passed through untouched
 *     rather than reparsed and reformatted: the server knows which timezone the
 *     stamp belongs to and the browser does not. It is parsed *only* to sort
 *     (see `stampToMs`), where one uniform offset across every row leaves the
 *     ordering correct even when the absolute instant is not.
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
 * Returns `NaN` when it will not parse, which callers treat as "cannot say"
 * and fall back to the server's order for. Returning 0 instead would sort every
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
 * Derived from the pair of shift names, because the payload carries no field
 * naming it. `unchanged` is kept rather than discarded: a save that did not
 * move the shift still records who touched the record and when, which is the
 * question an audit trail exists to answer.
 */
export const CHANGE_KINDS = {
  assigned: { key: 'assigned', label: 'Assigned', tone: 'good', icon: 'o_person_add' },
  changed: { key: 'changed', label: 'Reassigned', tone: 'info', icon: 'o_swap_horiz' },
  removed: { key: 'removed', label: 'Unassigned', tone: 'warn', icon: 'o_person_remove' },
  unchanged: { key: 'unchanged', label: 'Re-saved', tone: 'neutral', icon: 'o_history' },
}

/** Toolbar filter options, in the order they read best. */
export const CHANGE_FILTERS = [
  { value: 'all', label: 'All changes' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'changed', label: 'Reassigned' },
  { value: 'removed', label: 'Unassigned' },
]

function changeKind(previous, next) {
  if (!previous && next) return CHANGE_KINDS.assigned
  if (previous && !next) return CHANGE_KINDS.removed
  if (previous && next && previous !== next) return CHANGE_KINDS.changed
  return CHANGE_KINDS.unchanged
}

/** `dash-chip` modifier for a change tone. Neutral is the unmodified chip. */
export function chipClass(tone) {
  return tone && tone !== 'neutral' ? `dash-chip--${tone}` : ''
}

// Avatars are not built here. A trail entry names a person but carries no
// photograph and no id, so the face has to come from the employee list — see
// `buildEmployeeNameIndex` / `avatarFor` in `composables/utils/employee.js`,
// which the page applies to the rows it is about to render. Keeping it there
// means the audit avatar is the same construction as the Employees table's,
// initials and identity colour included, rather than a second one that drifts.

/**
 * One payload entry to the row both renderers read.
 *
 * @param {object} entry
 * @param {number} index  position in the server's response, kept as a stable
 *                        tiebreaker so a sort cannot shuffle equal stamps.
 */
export function normaliseAssignmentEntry(entry, index = 0) {
  const previousShift = text(entry?.previous_shift)
  const newShift = text(entry?.new_shift)
  const shiftDate = text(entry?.shift_date)
  const updatedAt = text(entry?.updated_at)
  const employeeName = text(entry?.employee_name)
  const stamp = splitStamp(updatedAt)

  return {
    // The payload carries no id. Composed from the fields that together
    // identify the change, plus the index, so `row-key` stays unique even when
    // one person's shift is edited twice inside the same second.
    key: `${shiftDate}|${employeeName}|${updatedAt}|${index}`,
    index,
    employeeName: employeeName || 'Unknown employee',
    updaterName: text(entry?.updater_name) || 'Unknown',
    shiftDate,
    // "Sep 2, 2026", via calendarDate so a bare YYYY-MM-DD is read as a
    // calendar day rather than shifted back one by a UTC-midnight parse.
    shiftDateLabel: longLabel(shiftDate),
    previousShift,
    newShift,
    updatedAt,
    // Pre-split rather than split in the template: both renderers stack the day
    // over the time, and doing it per render meant three calls per row per
    // paint for a value that never changes.
    updatedAtDay: stamp.day,
    updatedAtTime: stamp.time,
    // The two halves rejoined for the card list, which prints them on one line.
    // Built here rather than interpolated in the template: doing it there needs
    // a whitespace-sensitive inline `<template>` that the formatter rewraps into
    // something no one can read.
    updatedAtStamp: stamp.time ? `${stamp.day} · ${stamp.time}` : stamp.day,
    updatedAtMs: stampToMs(updatedAt),
    change: changeKind(previousShift, newShift),
  }
}

/**
 * Drop the entries that belong to another workspace.
 *
 * This endpoint answers with a bare `employee_name` and no company field of any
 * kind, so a response cannot be checked against the company that was asked for
 * — and in practice it comes back holding every company the caller can see.
 * The company's own employee roster is therefore the only thing available that
 * can say whether a row belongs on this screen: a change to somebody who is not
 * on the roster is a change in some other workspace.
 *
 * Two consequences worth stating rather than discovering later:
 *
 *   - Matching is by name, through the same index the avatars use, so a person
 *     the roster no longer lists at all drops out of the trail with them. That
 *     is the intended trade — a name from another company on an audit screen is
 *     a worse failure than a missing row — but it is a trade.
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

/** The whole response to rows, in the order the server sent them. */
export function normaliseAssignmentHistory(entries) {
  return (Array.isArray(entries) ? entries : []).map(normaliseAssignmentEntry)
}

/**
 * Does this row match what was typed?
 *
 * Both shift names are searched as well as both people: "Night" is a reasonable
 * thing to type when hunting for who was moved off it, and the shift somebody
 * was moved *from* is as searchable a fact as the one they were moved to.
 *
 * @param {object} row   a normalised row
 * @param {string} term  already lowercased and trimmed by the caller
 */
export function matchesSearch(row, term) {
  if (!term) return true
  const haystack = `${row.employeeName} ${row.updaterName} ${row.previousShift} ${row.newShift} ${row.shiftDateLabel} ${row.shiftDate}`
  return haystack.toLowerCase().includes(term)
}

/** Newer-first difference, treating an unparseable stamp as "cannot say". */
function byStamp(a, b) {
  if (Number.isNaN(a.updatedAtMs) || Number.isNaN(b.updatedAtMs)) return 0
  return a.updatedAtMs - b.updatedAtMs
}

/**
 * Sort comparators, keyed by the toolbar's sort options.
 *
 * Every one falls back to the server's original index, so rows the comparator
 * cannot separate — two changes saved in the same second, or two stamps that
 * would not parse — hold a stable order instead of shuffling on each recompute.
 */
export const SORTS = {
  newest: (a, b) => byStamp(b, a) || a.index - b.index,
  oldest: (a, b) => byStamp(a, b) || a.index - b.index,
  employee: (a, b) =>
    a.employeeName.localeCompare(b.employeeName) || byStamp(b, a) || a.index - b.index,
  shiftDate: (a, b) =>
    (b.shiftDate || '').localeCompare(a.shiftDate || '') || byStamp(b, a) || a.index - b.index,
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'shiftDate', label: 'Shift date' },
  { value: 'employee', label: 'Employee A–Z' },
]
