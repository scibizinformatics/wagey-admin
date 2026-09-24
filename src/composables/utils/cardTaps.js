/**
 * Readings for the NFC card-taps review page.
 *
 * `GET /audit/card-taps/{company_id}/` answers one object per employee, each
 * holding an array of days. The page reads it as a flat list of employee-day
 * rows — that is what the date navigator, the date-range review and the
 * employee search all filter over — and deriving that flattening here keeps the
 * table, the card list and the tap-count chip from each inventing its own.
 *
 * Payload traps:
 * - `employee_id` is a uuid *string* (the attendance roster usually keys by
 *   numeric id), so it is only ever used as its own identity, never as a roster
 *   lookup.
 * - `taps` arrive as 12-hour display strings in the server's clock, newest
 *   first. They are split and never reformatted — the same rule as the access
 *   card `last_tap`.
 * - `duration` is pre-formatted ("2h 9m 32s") — display, not data. Comparing
 *   spans means comparing the numeric tap fields, not this string.
 * - `first_tap` / `last_tap` are the oldest and newest taps of the day, so the
 *   difference between them *is* the session span even though the payload also
 *   carries `duration` separately.
 */

/**
 * One employee-day row per (employee, day) pair in the payload.
 *
 * @param {Array} payload - raw `GET /audit/card-taps/{company_id}/` list.
 * @returns {Array<object>} rows with
 *   `{ key, employee_id, employee_name, date, first_tap, last_tap, duration, taps, tapCount }`.
 */
export function flattenCardTaps(payload) {
  if (!Array.isArray(payload)) return []

  const rows = []
  for (const employee of payload) {
    const dates = Array.isArray(employee?.dates) ? employee.dates : []
    for (const day of dates) {
      if (!day?.date) continue
      rows.push({
        key: `${employee.employee_id ?? ''}|${day.date}`,
        employee_id: employee.employee_id,
        employee_name: employee.employee_name || 'Unknown Employee',
        date: day.date,
        first_tap: day.first_tap || '',
        last_tap: day.last_tap || '',
        duration: day.duration || '',
        taps: Array.isArray(day.taps) ? day.taps : [],
      })
    }
  }
  return rows
}

/** How many times an employee tapped their card on a day. */
export function tapCount(row) {
  return row?.taps?.length ?? 0
}

/**
 * Minutes in a pre-formatted duration string ("2h 9m 32s", "8h 30m", "45m").
 * Seconds are floored — the toolbar total never reports a fraction of a minute
 * the per-row labels don't either.
 */
export function durationToMinutes(value) {
  if (!value) return 0
  const str = String(value)
  const h = Number((str.match(/(\d+(?:\.\d+)?)\s*h/) || [])[1] || 0)
  const m = Number((str.match(/(\d+(?:\.\d+)?)\s*m/) || [])[1] || 0)
  const s = Number((str.match(/(\d+(?:\.\d+)?)\s*s/) || [])[1] || 0)
  return Math.floor(h * 60 + m + s / 60)
}

/** Total duration of a set of rows as "Xh Ym", minutes floored. */
export function totalDurationLabel(rows) {
  let minutes = 0
  for (const row of rows || []) minutes += durationToMinutes(row?.duration)
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** Every distinct employee name in a set of rows, in first-seen order. */
export function employeeNamesFromRows(rows) {
  const out = []
  const seen = new Set()
  for (const row of rows) {
    const name = row?.employee_name
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/**
 * Display label for a 12-hour tap time, as-sent from the server's clock.
 * This is deliberately a passthrough: reformatting the string would move the
 * reading between timezones the way the card tap timestamp never should.
 */
export function tapTimeLabel(tap) {
  return tap || '—'
}