/**
 * Shared read accessors and display maps for attendance records.
 *
 * `getEmployeeName` and `getEmployeePhoto` were duplicated verbatim between
 * AttendancePage.vue and AttendanceTable.vue — and a card view would have made
 * three copies. The `employee` field arrives as an id, a uuid, or a nested
 * object depending on the endpoint, so every consumer needs the same unwrapping.
 */
import { formatInTimezone } from '@/composables/utils/timezone'

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

export function getShiftName(row) {
  return row?.employee_assignment?.schedule?.shift_type?.name || '—'
}

export function formatTime(dateTimeString, timezone) {
  if (!dateTimeString) return null
  return formatInTimezone(dateTimeString, timezone || undefined) || null
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
