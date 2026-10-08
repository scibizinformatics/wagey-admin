export function toUTC(dateStr, timeStr, timezone) {
  if (!timezone) {
    return new Date(`${dateStr}T${timeStr}:00`).toISOString()
  }

  const [y, m, d] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  const refUTC = Date.UTC(y, m - 1, d, 12, 0, 0)
  const refDate = new Date(refUTC)
  const tzTime = refDate.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  })
  const [refH, refM] = tzTime.split(':').map(Number)

  let offset = refH * 60 + refM - 720
  if (offset > 720) offset -= 1440
  if (offset < -720) offset += 1440

  const localMin = hours * 60 + minutes
  let utcMin = localMin - offset
  let dayDelta = 0
  if (utcMin < 0) {
    utcMin += 1440
    dayDelta = -1
  } else if (utcMin >= 1440) {
    utcMin -= 1440
    dayDelta = 1
  }

  const result = new Date(Date.UTC(y, m - 1, d + dayDelta, Math.floor(utcMin / 60), utcMin % 60, 0))
  return result.toISOString()
}

/**
 * The `toLocaleTimeString` options that print a clock time the company's way.
 *
 * Shared by every surface that formats a time by hand rather than through
 * `formatInTimezone`, so a 24-hour company cannot end up with a table reading
 * 18:00 next to an audit stamp reading 6:00 PM.
 *
 * `h23` rather than `h24` on the 24-hour side: both render 18:00 identically, but
 * h24 prints midnight as 24:00 — the one clock reading that looks like a bug to
 * anyone who has not been taught the convention.
 *
 * @param {string} [format] '12h' | '24h'. Anything unrecognised is 12h, which is
 *   what the app printed before the setting existed.
 */
export function clockTimeOptions(format) {
  return format === '24h' ? { hour12: false, hourCycle: 'h23' } : { hour12: true }
}

/**
 * The current wall-clock time in the viewer's own timezone, as canonical 24h
 * `HH:mm`.
 *
 * The default a punch field opens on, so it is deliberately dynamic: a fixed
 * `18:00` is wrong for every admin who clocks in before six and wrong again for
 * the graveyard shift after midnight. Read the local hour and minute fields
 * directly rather than deriving them from `toISOString()`, which reports UTC —
 * the same trap `calendarDate.js` documents for dates, and eight hours of
 * "current time" is a worse mistake than the one it looks like.
 *
 * A function rather than a constant: the value is only correct until the next
 * minute, and a module-level capture would leave an open tab defaulting a punch
 * to whenever it was loaded. Call it per use — at the moment the field opens.
 *
 * @returns {string} `HH:mm` between `00:00` and `23:59`.
 */
export function nowClock() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * A bare wall-clock `HH:mm` printed the company's way, with no zone applied.
 *
 * Distinct from `formatInTimezone`, which takes an *instant* and moves it to the
 * employee's zone. A shift's start, or the value held in a `type="time"` /
 * `QTime` input, is wall-clock with no offset — so it is placed on a fixed local
 * day and read back with `toLocaleTimeString`. Routing one of these through
 * `formatInTimezone` is what would shift a 08:00 start to 16:00 west of
 * Greenwich, so the two must not be merged.
 *
 * Accepts `HH:mm` and `HH:mm:ss`, and ignores anything else rather than printing
 * `NaN:NaN` — an unparseable clock is shown as-is by the caller's own fallback,
 * since a legible wrong-shaped value beats a string of NaNs.
 *
 * @param {string} clock `HH:mm` or `HH:mm:ss`.
 * @param {'12h'|'24h'} [format]
 * @returns {string} The printed clock, or '' when there is nothing to print.
 */
export function formatClockTime(clock, format = '12h') {
  if (!clock) return ''
  const match = String(clock).match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return ''

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return ''

  try {
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      ...clockTimeOptions(format),
    })
  } catch {
    return ''
  }
}

/**
 * Free-typed clock text read back as a canonical 24h `HH:mm`.
 *
 * The inverse of `formatClockTime`, and what lets an admin type a punch instead
 * of picking one off a clock: `6:00 PM`, `6pm`, `0600PM`, `0600` and `18:00` all
 * resolve to the same value. Accepting both shapes regardless of the company's
 * `time_format` is deliberate — an admin who has typed `6:00 PM` for years is not
 * going to be told a 24h company's field only wants digits.
 *
 * Returns `null` for anything that is not yet a complete, in-range time, and the
 * caller holds its last good value rather than clearing. That is the whole point
 * of the `null`: `6:` and `6:0` are a time mid-type, not a time of 6:00, and a
 * field that committed them would blank itself under the caret.
 *
 * Minutes must be exactly two digits once a colon is present, so `6:0` stays
 * incomplete until the second one lands. Allowing `\d{1,2}` there commits `06:00`
 * on the way to `06:05`, which makes the dialog's elapsed preview flicker for
 * every punch typed after the hour.
 *
 * `HH:mm` is the identity function here — canonical input comes back unchanged —
 * so a value produced by another write path can never be reinterpreted by
 * passing through this field.
 *
 * @param {string} text What the admin typed.
 * @returns {string|null} `HH:mm`, or null when incomplete or out of range.
 */
export function parseClockTime(text) {
  if (!text) return null
  const raw = String(text).trim().toUpperCase()
  if (!raw) return null

  // Split a trailing meridiem off first, so `6:00 PM` reduces to the same `6:00`
  // the 24h branch reads. A bare `A`/`P` is accepted because that is what a mask
  // or a fast typist produces; anything else trailing is not a meridiem and is
  // rejected below as unparseable.
  let body = raw
  let meridiem = null
  const meridiemMatch = raw.match(/^([0-9:]*)\s*(AM|PM|A|P)$/)
  if (meridiemMatch) {
    body = meridiemMatch[1]
    meridiem = meridiemMatch[2] === 'AM' || meridiemMatch[2] === 'A' ? 'am' : 'pm'
  }

  let hours
  let minutes = 0

  const colon = body.match(/^(\d{1,2}):(\d{2})(?::(\d{1,2}))?$/)
  const fourDigits = body.match(/^(\d{2})(\d{2})$/)
  const bareHour = body.match(/^(\d{1,2})$/)

  if (colon) {
    hours = Number(colon[1])
    minutes = Number(colon[2])
  } else if (fourDigits) {
    hours = Number(fourDigits[1])
    minutes = Number(fourDigits[2])
  } else if (bareHour) {
    // A lone hour is only meaningful with a meridiem. Without one, "6" is as
    // likely a half-typed 6:00 PM as a shorthand for it, and guessing wrong here
    // is the exact failure the canonical-24h value exists to prevent.
    if (!meridiem) return null
    hours = Number(bareHour[1])
  } else {
    return null
  }

  if (minutes > 59) return null

  if (meridiem) {
    // 12 AM is 00:00 and 12 PM is 12:00 — the one pair where the hour does not
    // simply move by 12.
    if (hours < 1 || hours > 12) return null
    if (meridiem === 'am') hours = hours === 12 ? 0 : hours
    else hours = hours === 12 ? 12 : hours + 12
  } else if (hours > 23) {
    return null
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function formatInTimezone(isoString, timezone, format = '12h') {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return ''

    const opts = {
      timeZone: timezone || undefined,
      hour: '2-digit',
      minute: '2-digit',
      ...clockTimeOptions(format),
    }

    return date.toLocaleTimeString('en-US', opts)
  } catch {
    return ''
  }
}

export function extractTimezone(employee, employeesList, cache = {}) {
  if (!employee) return null

  const empId =
    typeof employee === 'object' ? employee.uuid || employee.id || employee.employee_id : employee

  if (typeof employee === 'object' && employee.timezone) {
    if (empId) cache[empId] = employee.timezone
    return employee.timezone
  }

  if (empId) {
    if (cache[empId]) return cache[empId]

    if (Array.isArray(employeesList)) {
      const found = employeesList.find(
        (e) => e.uuid === empId || e.id === empId || e.employee_id === empId,
      )
      if (found?.timezone) {
        cache[empId] = found.timezone
        return found.timezone
      }
    }
  }

  return null
}
