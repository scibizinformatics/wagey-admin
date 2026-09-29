/**
 * Calendar dates in the viewer's own timezone.
 *
 * A `YYYY-MM-DD` string in this app is a *calendar day* — the day a shift was
 * worked, the day a cutoff closes — not an instant. JavaScript's two obvious
 * tools both convert it to an instant on the way past, and both shift the day:
 *
 *   new Date().toISOString().slice(0, 10)   // the UTC day, not the local one.
 *                                           // In Manila (UTC+8) this reports
 *                                           // yesterday until 08:00 local.
 *   new Date('2026-09-02')                  // parses as UTC midnight, so
 *                                           // .toLocaleDateString() renders
 *                                           // 2026-09-01 anywhere west of
 *                                           // Greenwich.
 *
 * `toIso` reads the local field values instead of serialising an instant, and
 * `fromIso` pins the parse to local midnight, so a round trip through either
 * one lands on the day it started on in every timezone.
 *
 * These four were duplicated verbatim in AttendanceDateRangePicker.vue and
 * ScheduleRangeCalendar.vue; both read from here now. Anything that needs
 * "today" as a string wants `todayIso()` — call it, don't cache it, or a tab
 * left open overnight keeps reporting yesterday.
 */

/** Two-digit zero-padded number, for building an ISO date by hand. */
export function pad(value) {
  return String(value).padStart(2, '0')
}

/**
 * A Date → `YYYY-MM-DD`, using its local calendar fields.
 * @param {Date} date
 * @returns {string}
 */
export function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * `YYYY-MM-DD` → a Date at local midnight on that day.
 * @param {string} iso
 * @returns {Date}
 */
export function fromIso(iso) {
  return new Date(`${iso}T00:00:00`)
}

/**
 * Today as `YYYY-MM-DD`, in the viewer's timezone.
 *
 * A function rather than a constant on purpose: the value is only correct until
 * the next local midnight.
 * @returns {string}
 */
export function todayIso() {
  return toIso(new Date())
}

/**
 * `YYYY-MM-DD` shifted by whole days, staying on the calendar.
 *
 * Goes through `Date.setDate`, which handles month and year ends and — because
 * `fromIso` anchored it to local midnight — daylight-saving transitions too.
 * @param {string} iso
 * @param {number} days - may be negative
 * @returns {string}
 */
export function shiftIso(iso, days) {
  const date = fromIso(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

/**
 * Every calendar day from one ISO date to another, inclusive of both ends.
 *
 * Built by stepping `shiftIso` rather than by looping `date.setDate` on a Date,
 * for the reason `fromIso` exists: a range assembled from UTC parsing reports
 * one day short at the start in negative-offset timezones, which for a leave
 * request means silently sending a day the admin did not ask for.
 *
 * `maxDays` is a guard, not a truncation. A span past it returns `null` — which
 * is a different answer from the `[]` of a reversed or absent range, so the
 * caller can say "that range is too long" instead of quietly submitting a
 * shortened request.
 *
 * @param {string} startIso - inclusive, `YYYY-MM-DD`
 * @param {string} endIso - inclusive, `YYYY-MM-DD`
 * @param {number} maxDays - longest span accepted before `null`
 * @returns {string[]|null} ascending ISO dates, `[]` when the range is empty or
 *   reversed, `null` when it is longer than `maxDays`
 */
export function isoRange(startIso, endIso, maxDays = 60) {
  if (!startIso || !endIso) return []
  if (isNaN(fromIso(startIso).getTime()) || isNaN(fromIso(endIso).getTime())) return []

  const days = []
  let cursor = startIso
  while (cursor <= endIso) {
    days.push(cursor)
    if (days.length > maxDays) return null
    cursor = shiftIso(cursor, 1)
  }
  return days
}

/**
 * The first day of the month an ISO date falls in, as `YYYY-MM-DD`.
 *
 * Built from the local calendar fields rather than by string-slicing, so it is
 * right in every timezone and for the 1st of a month alike. Callers that report
 * "this month" need both ends, and this is the end that is not today.
 * @param {string} iso
 * @returns {string}
 */
export function monthStartIso(iso) {
  const date = fromIso(iso)
  if (isNaN(date.getTime())) return iso
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`
}

/**
 * `YYYY-MM-DD` → "Sep 2, 2026". Returns the input unchanged if it will not
 * parse, so a malformed value from an endpoint shows as itself rather than as
 * "Invalid Date".
 * @param {string} iso
 * @returns {string}
 */
export function longLabel(iso) {
  if (!iso) return ''
  const date = fromIso(iso)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
