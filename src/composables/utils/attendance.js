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

const PHOTO_KEYS = ['photo', 'image', 'profile_picture', 'profile_photo', 'avatar', 'picture']

export function getEmployeePhoto(employee, employees = []) {
  if (!employee) return null

  const pick = (obj) => PHOTO_KEYS.map((k) => obj?.[k]).find(Boolean) ?? null

  if (typeof employee === 'object') return pick(employee)

  const found = employees.find((emp) => emp.id === employee || emp.uuid === employee)
  return found ? pick(found) : null
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
