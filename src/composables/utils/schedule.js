/**
 * Shift interpretation helpers for the weekly scheduler.
 *
 * A "shift" as the page builds it looks like:
 *   { id, userId, day: 0-6, startTime: 'HH:MM'|null, endTime: 'HH:MM'|null,
 *     site, siteName, position, isLeave, leaveTypeName, status, is_off, ... }
 *
 * These were inline in ScheduleTable, which meant the grid could not report
 * totals without duplicating the same parsing. Pulling them out lets the header
 * show per-day hours and the employee column show a weekly total from exactly
 * the same rules the cells render by.
 */

/** Minutes since midnight for an 'HH:MM' string, or null. */
function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

/**
 * Length of a shift in hours. An end earlier than its start is treated as
 * crossing midnight rather than as negative time — a 22:00–06:00 night shift is
 * eight hours, not minus sixteen.
 */
export function shiftHours(shift) {
  const start = toMinutes(shift?.startTime)
  const end = toMinutes(shift?.endTime)
  if (start === null || end === null) return 0
  const span = end >= start ? end - start : end + 24 * 60 - start
  return span / 60
}

/** Trims trailing zeros so totals read "8h" and "7.5h", never "8.0h". */
export function formatHours(hours) {
  if (!hours) return '0h'
  const rounded = Math.round(hours * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}h`
}

export function isDayOff(shift, positionName = null) {
  if (!shift) return false

  const name = (
    typeof shift.position === 'string' ? shift.position : (positionName ?? '')
  )?.toLowerCase()

  const byName =
    name.includes('day off') ||
    name.includes('dayoff') ||
    name.includes('rest day') ||
    name.includes('off day') ||
    name === 'off'

  const byStatus =
    shift.status === 'day_off' ||
    shift.status === 'off' ||
    shift.is_day_off === true ||
    shift.is_off === true

  // A shift with neither a start nor an end is not a shift.
  const byTime = !shift.startTime && !shift.endTime

  return byName || byStatus || byTime
}

/**
 * What a cell should render, split by kind:
 *
 *   special  leave and day-off entries, rendered as they are
 *   working  every working shift, earliest first, each rendered as its own card
 *   group    a synthetic element carrying all working shifts, or null
 *
 * Working shifts are returned individually rather than collapsed into one card,
 * so a second shift is visible with its own start and end. An earlier version
 * merged them and printed a combined span *plus* each shift's times, which meant
 * three time strings for a two-shift day — the redundancy this split removes.
 * Each time now appears exactly once.
 *
 * `group` exists only for the "day off, both shifts" action, which needs a single
 * element holding every shift of the day.
 */
export function splitDayShifts(dayShifts, resolvePosition) {
  const special = dayShifts.filter((s) => s.isLeave || isDayOff(s, resolvePosition?.(s.position)))

  const working = dayShifts
    .filter((s) => !s.isLeave && !isDayOff(s, resolvePosition?.(s.position)))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

  const group =
    working.length > 1
      ? {
          id: `merged-${working[0].userId}-${working[0].day}`,
          userId: working[0].userId,
          day: working[0].day,
          isMerged: true,
          shifts: working,
        }
      : null

  return { special, working, group }
}

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  'var(--dash-cat-1)',
  'var(--dash-cat-2)',
  'var(--dash-cat-3)',
  'var(--dash-cat-4)',
  'var(--dash-cat-5)',
  'var(--dash-cat-6)',
]

export function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

/**
 * Rail colour for a working shift card — exactly two, and they encode one thing:
 * how many shifts the card holds.
 *
 *   SINGLE  indigo   one shift that day
 *   DUAL    rust     two or more shifts merged into one card
 *
 * This deliberately replaced a six-colour ramp hashed off the shift type. Six
 * hues across a 20 x 7 grid meant the reader had to learn a legend before the
 * colour told them anything, and the one distinction that actually matters when
 * scanning a week — is this person working once or twice today — was the one the
 * colour did not carry. Two colours answer that question at a glance and need no
 * legend.
 *
 * Both values come from the app's categorical ramp (validated for colour-vision
 * separation in src/css/dashboard.scss) and are far apart in hue. Colour lands
 * only on the 3px rail, never on text: parts of that ramp sit between 3:1 and
 * 4.5:1 against white, fine for a solid mark but failing for 11px type.
 */
export const RAIL_SINGLE = 'var(--dash-cat-1)'
export const RAIL_DUAL = 'var(--dash-cat-3)'

export function shiftRail(isMerged) {
  return isMerged ? RAIL_DUAL : RAIL_SINGLE
}


export function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
