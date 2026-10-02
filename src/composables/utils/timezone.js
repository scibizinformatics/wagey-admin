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
