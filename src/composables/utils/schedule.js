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

import { safeParseJson } from '@/composables/utils/storage'

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
/**
 * A day's scheduled shifts in start-time order, earliest first.
 *
 * Null-safe on purpose, and the reason this lives here rather than in the page:
 * AttendancePage sorted the same payload with a bare
 * `a.start_time.localeCompare(b.start_time)`, so one shift with a null
 * `start_time` threw a TypeError. It was inside a `try`, so it surfaced as
 * "Failed to load schedule" — and the add-record dialog then refused the day
 * for what looked like a missing schedule rather than a malformed one. Twenty
 * lines below, `splitDayShifts` was already doing this comparison correctly
 * with `(a.startTime || '')`.
 *
 * Returns a new array; the caller's input is not reordered. The field name
 * differs by payload — the monthly grid normalises to `startTime`, the
 * per-employee endpoint answers with `start_time` — so both are read.
 *
 * @param {Array<object>} shifts
 * @returns {Array<object>} a new, sorted array
 */
export function sortShiftsByStart(shifts = []) {
  const startOf = (s) => s?.startTime ?? s?.start_time ?? ''
  return [...shifts].sort((a, b) => String(startOf(a)).localeCompare(String(startOf(b))))
}

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

// Re-exported rather than copied: the list of field names a photo can arrive
// under is long and backend-dependent, and schedule and attendance disagreeing
// about it would mean the same person showing a picture on one page and initials
// on the other.
export { getEmployeePhoto } from '@/composables/utils/attendance'

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
 * Colour for a working shift card — exactly two hues, and they encode one thing:
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
 * Each hue ships as a pair rather than as one value: a softened edge and a very
 * faint fill (see the -soft/-tint tokens in src/css/dashboard.scss). The card
 * is read as a tinted block, not as an outline. At full strength a saturated
 * 1px edge repeated down a scrolling grid of small cards shimmers and is tiring
 * to look at, so the strong hue is kept for single marks like the leave icon.
 *
 * Both hues come from the app's categorical ramp (validated for colour-vision
 * separation in src/css/dashboard.scss) and are far apart in hue. Colour never
 * lands on text: parts of that ramp sit between 3:1 and 4.5:1 against white,
 * fine for a solid mark but failing for 11px type.
 */
const SINGLE_TONE = {
  '--chip-edge': 'var(--dash-cat-1-soft)',
  '--chip-tint': 'var(--dash-cat-1-tint)',
}
const DUAL_TONE = {
  '--chip-edge': 'var(--dash-cat-3-soft)',
  '--chip-tint': 'var(--dash-cat-3-tint)',
}

/** The pair of custom properties a shift card is drawn with. */
export function shiftChipTone(isMerged) {
  return isMerged ? DUAL_TONE : SINGLE_TONE
}

export function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * What a *shift-type template* is, as opposed to what a scheduled shift became.
 *
 * The reassign dialog has to answer "what will this replace the current shift
 * with" before anything is written, so the only thing it can read is the
 * template's own payload — and that payload is awkward in three ways this
 * function absorbs:
 *
 *   - `shifts_detail` arrives either as an array or as a JSON string, and a
 *     template that predates it carries `shifts` instead.
 *   - each segment names its times as `start_time`/`end_time` on the detail
 *     payload but `default_start_time`/`default_end_time` on the plain one, and
 *     a time may come back as `HH:MM:SS`.
 *   - the site sits on the segment (`site: {id, name}` or `site_id`) for a
 *     per-site template and only on the template itself for a rotating one, so
 *     both have to be tried before falling back to the sites lookup.
 *
 * A split template has more than one segment, which is why the dialog cannot
 * print a single site and time for it — `segments` is the honest answer and
 * `isMulti` says whether to use it.
 *
 * @param {object} template raw shift-type template from the API
 * @param {(siteId: number|string) => string|null} [resolveSiteName] sites lookup
 * @returns {{name: string, segments: Array<{siteName: string, startTime: string,
 *   endTime: string, timeLabel: string}>, isMulti: boolean, siteName: string,
 *   timeLabel: string}}
 */
export function describeShiftTemplate(template, resolveSiteName = () => null) {
  const empty = { name: '', segments: [], isMulti: false, siteName: '', timeLabel: '' }
  if (!template) return empty

  const parse = (value) => {
    if (Array.isArray(value)) return value
    const parsed = safeParseJson(value, [])
    return Array.isArray(parsed) ? parsed : []
  }
  // `HH:MM:SS` and `HH:MM` both occur; the grid renders `HH:MM`, so match it.
  const asTime = (value) => (value ? String(value).slice(0, 5) : '')

  const raw = parse(template.shifts_detail).length
    ? parse(template.shifts_detail)
    : parse(template.shifts)

  const templateSiteName =
    template.site?.name ||
    resolveSiteName(template.site?.id ?? template.site ?? template.site_id) ||
    ''

  const segments = raw.map((segment) => {
    const startTime = asTime(segment.start_time || segment.default_start_time)
    const endTime = asTime(segment.end_time || segment.default_end_time)
    return {
      siteName:
        segment.site?.name ||
        segment.site_name ||
        resolveSiteName(segment.site?.id ?? segment.site ?? segment.site_id) ||
        templateSiteName,
      startTime,
      endTime,
      timeLabel: startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime,
    }
  })

  // A template with no segment list at all still usually carries its own times.
  if (!segments.length) {
    const startTime = asTime(template.start_time || template.default_start_time)
    const endTime = asTime(template.end_time || template.default_end_time)
    if (startTime || endTime || templateSiteName) {
      segments.push({
        siteName: templateSiteName,
        startTime,
        endTime,
        timeLabel: startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime,
      })
    }
  }

  return {
    name: template.name || template.time_display || '',
    segments,
    isMulti: segments.length > 1,
    siteName: segments[0]?.siteName || templateSiteName,
    timeLabel: segments[0]?.timeLabel || '',
  }
}
