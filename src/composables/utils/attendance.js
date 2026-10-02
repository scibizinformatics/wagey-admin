/**
 * Shared read accessors and display maps for attendance records.
 *
 * `getEmployeeName` and `getEmployeePhoto` were duplicated verbatim between
 * AttendancePage.vue and AttendanceTable.vue — and a card view would have made
 * three copies. The `employee` field arrives as an id, a uuid, or a nested
 * object depending on the endpoint, so every consumer needs the same unwrapping.
 */
import { formatInTimezone } from '@/composables/utils/timezone'
import { leaveTypeFromIndex } from '@/composables/utils/leaveTypes'
import { decimalHoursLabel } from '@/composables/utils/format'

export function getEmployeeId(employee) {
  if (!employee) return null
  if (typeof employee === 'object') return employee.uuid || employee.id || employee.employee_id
  return employee
}

/**
 * Does this attendance row belong to `wanted`?
 *
 * The id a caller holds comes from the employee dropdown (`uuid || id`) while a
 * row's `employee` may be a bare id or a nested object, so every identifier the
 * row carries is checked against it.
 */
export function rowMatchesEmployee(row, wanted) {
  const employee = row?.employee
  if (!employee || wanted == null || wanted === '') return false

  const target = String(wanted)
  if (typeof employee !== 'object') return String(employee) === target

  return [employee.uuid, employee.id, employee.employee_id].some(
    (candidate) => candidate != null && String(candidate) === target,
  )
}

/**
 * `employees` is the roster used to resolve a bare id back to a person.
 */
export function getEmployeeName(employee, employees = []) {
  if (!employee) return 'Unknown Employee'

  if (typeof employee === 'number' || typeof employee === 'string') {
    const found = employees.find((emp) => emp.id === employee || emp.id === parseInt(employee))
    if (found) {
      const fullName = `${found.first_name || found.firstName || ''} ${
        found.last_name || found.lastName || ''
      }`.trim()
      return fullName || found.name || found.username || found.email || 'Unknown Employee'
    }
    return `Employee #${employee}`
  }

  if (typeof employee === 'object') {
    const fullName = `${
      employee.first_name || employee.firstName || employee.firstname || ''
    } ${employee.last_name || employee.lastName || employee.lastname || ''}`.trim()
    return (
      fullName ||
      employee.name ||
      employee.fullName ||
      employee.full_name ||
      employee.username ||
      employee.email ||
      'Unknown Employee'
    )
  }

  return 'Unknown Employee'
}

// Endpoints disagree about where a person's picture lives, so every spelling the
// API has been seen to use is tried. `picture_url` matters especially: the
// employee roster (`/user/companies/{id}/employees/`) puts it on a nested `user`
// object, which is why the Employees table reads `row.user.picture_url` directly
// and why a resolver that only looked at top-level keys came back empty for
// every row the roster supplied.
const PHOTO_KEYS = [
  'photo',
  'image',
  'profile_picture',
  'profile_photo',
  'avatar',
  'picture',
  'picture_url',
]

function pickPhoto(source) {
  if (!source || typeof source !== 'object') return null

  const own = PHOTO_KEYS.map((key) => source[key]).find(Boolean)
  if (own) return own

  const user = source.user
  if (user && typeof user === 'object') {
    return PHOTO_KEYS.map((key) => user[key]).find(Boolean) ?? null
  }
  return null
}

export function getEmployeePhoto(employee, employees = []) {
  if (!employee) return null

  if (typeof employee === 'object') return pickPhoto(employee)

  // Compared as strings: the same employee arrives as a number from one endpoint
  // and a string from another, and `===` quietly missed the match.
  const target = String(employee)
  const found = employees.find((emp) => String(emp?.id) === target || String(emp?.uuid) === target)
  return found ? pickPhoto(found) : null
}

export function getInitials(name) {
  if (!name || name === 'Unknown Employee') return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Identity colour for an avatar, from the design system's categorical ramp. */
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
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * How a punch was captured. Reads as sentence case rather than the previous
 * SHOUTED, UNDERSCORE-STRIPPED form.
 */
const SOURCE_LABELS = {
  qr_scan: 'QR scan',
  manual: 'Manual',
  auto_login: 'Auto',
  app: 'App',
  terminal: 'Terminal',
  system: 'System',
  admin: 'Admin',
}

export function formatSource(source) {
  if (!source) return '—'
  return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ')
}

/**
 * Source is metadata, not status, so it takes neutral chrome — reserving the
 * status palette for things that actually mean good/bad.
 */
export function sourceToneClass(source) {
  switch (source) {
    case 'qr_scan':
      return 'src--qr'
    case 'manual':
    case 'admin':
      return 'src--manual'
    case 'auto_login':
    case 'app':
      return 'src--auto'
    default:
      return ''
  }
}

export function workTypeToneClass(workType) {
  if (!workType) return ''
  switch (String(workType).toLowerCase()) {
    case 'regular':
      return 'dash-chip--good'
    case 'probationary':
      return 'dash-chip--warn'
    case 'contractual':
      return 'dash-chip--info'
    default:
      return ''
  }
}

// ── Issue filter ─────────────────────────────────────────────────────────────
//
// The endpoint takes `?issue=flagged|suspicious|all`, so the list is narrowed
// server-side. `matchesIssueFilter` is the same narrowing expressed locally, and
// both are needed: a backend that ignores an unknown query param answers with the
// whole month, and the reader would be looking at every record under a chip that
// claims "Flagged only" — nothing on screen contradicts the claim.
//
// `all` is either flag, *not* "no filter". Hence four options rather than three,
// and the first one's value is `null`, which is what keeps the parameter off the
// request entirely when the filter is unused — sending `issue=` would key the
// month cache differently and throw away a month already in hand.
//
// `auto_closed` is deliberately absent: it is not part of what the endpoint's
// `issue` means, so a record the audit dot marks for that reason alone falls out
// of "Any issue". The dot's own rule is wider, and cannot be reconciled here — a
// server-narrowed set cannot be widened after the fact.
export const ATTENDANCE_ISSUE_FILTERS = [
  { label: 'All records', value: null },
  { label: 'Any issue', value: 'all' },
  { label: 'Flagged only', value: 'flagged' },
  { label: 'Suspicious only', value: 'suspicious' },
]

/**
 * @param {object} row  An attendance record.
 * @param {'flagged'|'suspicious'|'all'|null} issue
 * @returns {boolean}
 */
export function matchesIssueFilter(row, issue) {
  switch (issue) {
    case 'flagged':
      return Boolean(row?.flagged)
    case 'suspicious':
      return Boolean(row?.is_suspicious)
    case 'all':
      return Boolean(row?.flagged || row?.is_suspicious)
    default:
      return true
  }
}

export function getShiftName(row) {
  return row?.employee_assignment?.schedule?.shift_type?.name || '—'
}

/**
 * A punch, printed in the employee's timezone and in the company's clock style.
 *
 * `format` is the company's `time_format` ('12h' | '24h'); it defaults to 12h so
 * every caller that has not been threaded with the setting keeps today's
 * behaviour. It is a *display* argument only — nothing parses a value this
 * function produces, and `formatTimeForInput` in the attendance page stays 24h
 * because it fills a `type="time"` input.
 *
 * @param {string|null} dateTimeString
 * @param {string} [timezone] IANA zone for the record's employee.
 * @param {'12h'|'24h'} [format]
 */
export function formatTime(dateTimeString, timezone, format = '12h') {
  if (!dateTimeString) return null
  return formatInTimezone(dateTimeString, timezone || undefined, format) || null
}

/**
 * The assignment a record is filed against — the backend's own id for one
 * employee's one shift on one day.
 *
 * It arrives under a different name on almost every endpoint, and is absent on
 * some, so every caller needs the same fallback chain rather than picking one
 * spelling and silently reading undefined on the others.
 */
export function getAssignmentId(row) {
  return (
    row?.assignment_id ??
    row?.employee_assignment_id ??
    row?.employee_assignment?.id ??
    row?.employee_assignment?.schedule?.id ??
    null
  )
}

/**
 * The shift a record belongs to, as a comparison key.
 *
 * The backend identifies a shift by its assignment, but that id arrives under
 * three different names depending on the endpoint and is sometimes absent
 * entirely. When it is missing the shift's display name stands in, which is
 * enough to recognise two records of the same employee's same shift on the same
 * day — the duplicate case this exists to catch. Employee and date are always
 * part of the key so an assignment id that repeats across people or days cannot
 * collapse unrelated records together.
 *
 * Returns null when the row carries nothing that identifies a shift, so callers
 * can skip it rather than bucket every unidentifiable row together.
 */
export function getShiftKey(row) {
  if (!row) return null

  const assignment = getAssignmentId(row)
  const shiftName = getShiftName(row)
  const identity =
    assignment != null ? `a:${assignment}` : shiftName !== '—' ? `s:${shiftName}` : null
  if (!identity) return null

  const employeeId = getEmployeeId(row.employee)
  const date = row.date || row.attendance_date || row.log_date || ''
  return `${employeeId ?? '?'}|${date}|${identity}`
}

/** A record is complete once both punches are in — the shift has been worked. */
export function isRecordComplete(row) {
  return Boolean(row?.time_in && row?.time_out)
}

/**
 * Elapsed time between two punches in milliseconds, or null when the pair
 * cannot say.
 *
 * This is the raw wall clock between the two punches — it does **not** know
 * about the unpaid break the backend takes off, so it reads an hour longer than
 * the hours actually worked. `attendanceDurationMs` is what the API's own
 * `duration` is reconciled against, not what the reader is shown.
 *
 * A missing punch says nothing about duration, and a negative span means the
 * stored pair is inconsistent — every write path bumps an overnight time_out
 * to the next day before sending, so a payload only ever carries a pair that
 * answers this positively.
 */
export function attendanceDurationMs(timeIn, timeOut) {
  if (!timeIn || !timeOut) return null
  const inMs = new Date(timeIn).getTime()
  const outMs = new Date(timeOut).getTime()
  if (isNaN(inMs) || isNaN(outMs)) return null
  const diff = outMs - inMs
  return diff < 0 ? null : diff
}

/**
 * `"8h 30m"` for a pair of punches, `"—"` when there is no answer. Minutes are
 * floored: whole minutes are all a reader acts on, and the seconds a terminal
 * stamps would only make two rows on the same shift disagree on a digit that
 * means nothing.
 *
 * Elapsed, not worked — see `attendanceDurationLabelOf` for the figure the
 * attendance views show.
 */
export function attendanceDurationLabel(timeIn, timeOut) {
  const ms = attendanceDurationMs(timeIn, timeOut)
  if (ms == null) return '—'
  return formatMinutes(Math.floor(ms / 60000))
}

/** Minutes to `"8h 30m"`. Shared so every renderer of a duration reads alike. */
function formatMinutes(minutes) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

// ── Backend duration ─────────────────────────────────────────────────────────
// The attendance endpoint returns a numeric `duration` per record, already net
// of the unpaid break — it is the figure payroll is built from, and the one the
// reader is reconciling their own hours against.
//
// The unit is stated nowhere in the payload or its docs, so it is pinned here
// and nowhere else. `hours` is this product's convention for a plain numeric
// duration — shift templates carry `total_hours`, contracts carry
// `work_hours_per_week` — and a completed record reports `8` for an eight-hour
// net shift. If that ever changes, flip this one constant: the span checks
// below mean a wrong pin degrades to elapsed time and a console warning, never
// to a wrong number in the column.
const DURATION_UNIT = 'hours'

const MS_PER_UNIT = { seconds: 1000, minutes: 60000, hours: 3600000 }
const MS_PER_DURATION_UNIT = MS_PER_UNIT[DURATION_UNIT] || MS_PER_UNIT.hours

/**
 * How much of its own shift a record's worked time must account for.
 *
 * The upper bound (worked ≤ elapsed) is not enough on its own: a figure read in
 * the wrong unit comes out *small*, and passes it — which is how a correct
 * eight-hour net shift rendered as `0h 8m`, a plausible-looking wrong number
 * with nothing to notice it by. A break is not 80% of a day, so a record whose
 * worked time is under a fifth of its elapsed span is a misread figure, not a
 * very short shift. Deliberately generous: this has to catch orders-of-magnitude
 * errors, not adjudicate a genuine split shift with a long unpaid gap.
 */
const MIN_NET_FRACTION_OF_ELAPSED = 0.2

/** Below this span the fraction says nothing — a 5-minute clock-in/clock-out
 *  is 100% of itself, and must not be second-guessed. */
const MIN_ELAPSED_FOR_FRACTION_MS = 30 * 60 * 1000

/** Warned once per reason, so a wrong unit is noticed rather than read as truth. */
const warnedAboutDuration = new Set()

function warnAboutDuration(row, raw, reason) {
  if (warnedAboutDuration.has(reason)) return
  warnedAboutDuration.add(reason)
  console.warn(
    `[attendance] Backend duration unusable (${reason}); showing elapsed time instead.`,
    { id: row?.id, duration: raw },
  )
}

/**
 * The API's own `duration` for one record, in milliseconds, or null when the
 * row cannot answer.
 *
 * Four things make a stored figure untrustworthy, and each falls back to null
 * rather than to a number nobody can defend:
 *
 *   - absent, null, blank, non-numeric or negative — nothing was computed;
 *   - a record with no finished pair of punches — an open shift has no worked
 *     time to report, whatever the stored column claims;
 *   - more time than the punches actually span — stale, or the wrong unit;
 *   - a fraction of that span too small to be a shorter shift — the wrong unit.
 *
 * `0` on a *completed* record is kept: two punches seconds apart is a real
 * answer, and flattening it to "unknown" would hide a short shift.
 */
export function attendanceNetDurationMs(row) {
  const raw = row?.duration
  if (raw == null || raw === '') return null

  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    warnAboutDuration(row, raw, `not a usable figure (${typeof raw})`)
    return null
  }

  // One finished pair is the test everywhere on this page — it is what decides
  // whether a shift has been worked at all, and whether a second record is a
  // duplicate. A stored figure does not get to say otherwise: an open record
  // reporting eight worked hours would print eight hours for a shift nobody has
  // clocked out of, and that is not a figure anybody can act on.
  if (!isRecordComplete(row)) return null

  const ms = value * MS_PER_DURATION_UNIT
  const elapsedMs = attendanceDurationMs(row?.time_in, row?.time_out)

  if (elapsedMs != null) {
    if (ms > elapsedMs) {
      warnAboutDuration(row, raw, 'more time than the punches span')
      return null
    }
    // A stored `0` is exempt: it is the one figure too small to be a unit
    // misread, because no misreading of a non-zero value lands on exactly zero.
    // Without this the floor below would quietly undo the rule above and report a
    // completed record's genuine zero as a full elapsed shift.
    if (
      value > 0 &&
      elapsedMs >= MIN_ELAPSED_FOR_FRACTION_MS &&
      ms < elapsedMs * MIN_NET_FRACTION_OF_ELAPSED
    ) {
      warnAboutDuration(
        row,
        raw,
        `too small a fraction of the punches span (${Math.round((ms / elapsedMs) * 100)}%)`,
      )
      return null
    }
  }

  return ms
}

/**
 * Worked time for one record in milliseconds — the backend figure when it can
 * be trusted, the elapsed punch pair when it cannot.
 *
 * Every duration on the attendance page reads through here, so the table, the
 * card list and the sort order cannot disagree about the same record.
 */
export function attendanceDurationOf(row) {
  const netMs = attendanceNetDurationMs(row)
  if (netMs != null) return netMs
  return attendanceDurationMs(row?.time_in, row?.time_out)
}

/**
 * Worked time in whole minutes — the minute reading of a record.
 *
 * Minutes are the unit a break and a shift are argued in, so this is what the
 * hover tooltip shows beside the decimal cell. Rounded rather than floored: the
 * terminal stamps seconds, and a shift worked to 4h51m40s is a 4h52m shift.
 */
export function attendanceWorkedMinutesOf(row) {
  const ms = attendanceDurationOf(row)
  if (ms == null) return null
  return Math.round(ms / MS_PER_UNIT.minutes)
}

/**
 * Worked hours as a decimal, or null when the row cannot answer.
 *
 * Off the exact milliseconds, deliberately *not* off `attendanceWorkedMinutesOf`.
 * Rounding to a minute and then dividing by 60 rounds twice, and the second
 * rounding is the one the reader can catch: 4h51m31s is 4.8586 hours, which is
 * `4.86`, but via 292 whole minutes it prints `4.87` — a minute and a half
 * overstated, and a figure payroll would not agree with.
 *
 * Decimal because that is the unit this product keeps durations in — shift
 * templates store `total_hours` and `break_hours` as decimals — and because the
 * backend's own `duration` arrives in exactly this form, so the column shows the
 * figure payroll is computed from rather than a re-derived approximation of it.
 */
export function attendanceDecimalHoursOf(row) {
  const ms = attendanceDurationOf(row)
  if (ms == null) return null
  return ms / MS_PER_UNIT.hours
}

/**
 * `"4.85"` — two decimals, always.
 *
 * Fixed rather than trimmed so the column aligns: `4.50` and `4.85` are the same
 * width under `dash-num`'s tabular figures, and payroll reads these column-wise.
 * The trailing zero is the format, not noise.
 */
export function attendanceDecimalHoursLabelOf(row) {
  const hours = attendanceDecimalHoursOf(row)
  if (hours == null) return '—'
  return decimalHoursLabel(hours)
}

/**
 * `"4h 51m"` — the same duration read in whole minutes.
 *
 * The hover companion to the decimal cell, and correct to the minute rather than
 * to two places: both are roundings of one exact figure, so neither contradicts
 * the other, they simply answer at different resolutions.
 */
export function attendanceDurationLabelOf(row) {
  const minutes = attendanceWorkedMinutesOf(row)
  if (minutes == null) return '—'
  return formatMinutes(minutes)
}

/**
 * Punches captured by a device rather than typed in by an admin. A shift's
 * device-captured record is the one that actually happened, so it outranks a
 * hand-entered duplicate when deciding which record owns the shift.
 */
const DEVICE_SOURCES = new Set(['terminal', 'qr_scan', 'app', 'auto_login', 'system'])

function isDeviceCaptured(row) {
  const sources = [row?.time_in_source, row?.time_out_source, row?.source].filter(Boolean)
  return sources.some((s) => DEVICE_SOURCES.has(s))
}

/**
 * How strongly a record claims to be *the* record for its shift. Lower wins.
 * Device capture first, then a finished pair of punches, then the earliest time
 * in, and finally the id purely so the choice is stable rather than dependent on
 * the order the API happened to return.
 */
function primacyRank(row) {
  const timeIn = row?.time_in ? new Date(row.time_in).getTime() : NaN
  return [
    isDeviceCaptured(row) ? 0 : 1,
    isRecordComplete(row) ? 0 : 1,
    Number.isNaN(timeIn) ? Infinity : timeIn,
    String(row?.id ?? ''),
  ]
}

function comparePrimacy(a, b) {
  const ra = primacyRank(a)
  const rb = primacyRank(b)
  for (let i = 0; i < ra.length; i++) {
    if (ra[i] < rb[i]) return -1
    if (ra[i] > rb[i]) return 1
  }
  return 0
}

/**
 * Ids of the attendance records whose times must not be edited because their
 * shift has already been completed by a different record.
 *
 * A shift with a finished pair of punches has been worked, and the second row an
 * employee sometimes ends up with for it — usually an empty one, or one an admin
 * started filling in by hand — is a duplicate, not a correction. Typing times
 * into the duplicate produces two attendances for one shift and the payroll run
 * then counts the day twice, so those rows are read-only. The record that owns
 * the shift stays editable, because a mis-punched terminal time still has to be
 * correctable somewhere.
 *
 * Pass the widest set of records available (the whole loaded month, not one
 * page): the completed record and its duplicate can easily land on different
 * pages, and a lock that depends on what is currently on screen is no lock.
 */
export function getLockedShiftRecordIds(rows = []) {
  const byShift = new Map()

  for (const row of rows) {
    if (row?.id == null) continue
    const key = getShiftKey(row)
    if (!key) continue
    if (!byShift.has(key)) byShift.set(key, [])
    byShift.get(key).push(row)
  }

  const locked = new Set()

  for (const group of byShift.values()) {
    // One record for the shift is never a duplicate of itself, and a shift
    // nobody has finished yet is still open for editing.
    if (group.length < 2) continue
    if (!group.some(isRecordComplete)) continue

    // Seeded with the first row rather than relying on reduce's no-initial-value
    // form, which throws on an empty array. The `group.length < 2` guard above
    // means that cannot happen today, but the guard and the reduce are free to
    // drift apart; comparePrimacy(row, row) is 0, so seeding costs nothing.
    const primary = group.reduce(
      (best, row) => (comparePrimacy(row, best) < 0 ? row : best),
      group[0],
    )
    for (const row of group) {
      if (row.id !== primary.id) locked.add(row.id)
    }
  }

  return locked
}

// ── Leave types ──────────────────────────────────────────────────────────────
//
// A record can be a leave day, and then there are no punches to read — the row is
// otherwise indistinguishable from somebody who never clocked in. Naming the
// leave type is what tells those two apart, and the name lives in the leave-types
// list, keyed by whatever the record carries.
//
// Nothing in the attendance payload contract says which field that is, and this
// file already absorbs that class of disagreement (`getShiftName`,
// `getAssignmentId`), so every spelling is read rather than one being picked and
// quietly missing on the others. Two shapes recur: a reference sitting directly on
// the record, and one hanging off the schedule entry the record is filed against
// — the same `employee_assignment.schedule` chain the shift name reads.

/** A leave reference in whichever shape it arrives, or null when absent. */
function leaveRefFrom(value) {
  if (value == null || value === '') return null
  if (typeof value === 'object') {
    const id = value.id ?? value.leave_type_id ?? null
    const name = value.name || value.leave_type_name || ''
    // An object carrying neither says nothing, and taking it as an answer would
    // mask the reference sitting further along the chain.
    if (id == null && !name) return null
    return { id, name }
  }
  return { id: value, name: '' }
}

/**
 * The leave type a record refers to, as `{ id, name }` with either half possibly
 * null, or null when the record is not a leave day.
 */
export function attendanceLeaveRef(row) {
  if (!row) return null
  const schedule = row.employee_assignment?.schedule
  // A name the payload already carries costs no lookup, and is the only answer
  // available when the reference is an id the list does not hold.
  const name = row.leave_type_name || schedule?.leave_type_name || ''

  const ref =
    leaveRefFrom(row.leave_type) ||
    leaveRefFrom(schedule?.leave_type) ||
    leaveRefFrom(row.leave_type_id)

  if (ref) return { id: ref.id, name: name || ref.name }
  return name ? { id: null, name } : null
}

/**
 * The leave type's name for one record, or null.
 *
 * A name the row carries beats a lookup, since it is what the backend said about
 * that row rather than about the type. A record that resolves to nothing is null
 * rather than a stand-in label: "not a leave day" and "a leave day whose type is
 * missing from the list" are different problems, and flattening them hides the
 * second. `SchedulePage.vue` can fall back to the words "On leave" because it is
 * walking a schedule it already knows is a leave — here the question is open.
 *
 * @param {object} row   an attendance record
 * @param {Map}   index  from `buildLeaveTypeIndex`
 */
export function attendanceLeaveLabel(row, index) {
  const ref = attendanceLeaveRef(row)
  if (!ref) return null
  if (ref.name) return ref.name
  return leaveTypeFromIndex(index, ref.id)?.name || null
}

/** Warned once per reason, so a payload problem is noticed, not repeated. */
const warnedAboutLeave = new Set()

/**
 * What the loaded records could say about their leave types, reported once.
 *
 * This is what a manual read of the payload would otherwise have to supply. A
 * record that names a leave type the list does not hold is one problem; a record
 * with no punches and no leave type is the other, and neither is papered over
 * with a name nobody can defend.
 *
 * A record carrying no reference is only worth reporting when something on the
 * page could plausibly *be* a leave day — an empty punch pair, which is
 * otherwise indistinguishable from somebody who forgot to clock in. Most days
 * hold no leave at all, and warning about those would make the warning noise.
 *
 * @param {Array}  rows        the loaded records
 * @param {Map}    index       from `buildLeaveTypeIndex`
 * @param {number} typesLoaded how many types the list resolved to
 */
export function reportLeaveTypeCoverage(rows, index, typesLoaded) {
  if (!typesLoaded) return

  let referenced = 0
  let unlabelled = 0
  const unresolved = new Set()

  for (const row of Array.isArray(rows) ? rows : []) {
    const ref = attendanceLeaveRef(row)
    if (!ref) {
      if (!row?.time_in && !row?.time_out) unlabelled += 1
      continue
    }
    referenced += 1
    if (!attendanceLeaveLabel(row, index) && ref.id != null) unresolved.add(ref.id)
  }

  if (unresolved.size) {
    const sample = [...unresolved].slice(0, 5).join(', ')
    warnAboutLeave(
      'unresolved',
      `${unresolved.size} leave type id(s) are not in the ${typesLoaded}-type list: ${sample}. ` +
        'Expected for a leave type that keeps no balance; a gap if the id is one you have never seen.',
    )
  }

  if (referenced === 0 && unlabelled > 0) {
    warnAboutLeave(
      'no-reference',
      `${unlabelled} record(s) carry no punches and name no leave type, so a leave day cannot ` +
        'be told apart from a missed clock-in here. Looked at leave_type, leave_type_id and ' +
        'leave_type_name, on the record and under employee_assignment.schedule.',
    )
  }
}

function warnAboutLeave(reason, message) {
  if (warnedAboutLeave.has(reason)) return
  warnedAboutLeave.add(reason)
  console.warn(`[attendance] ${message}`)
}
