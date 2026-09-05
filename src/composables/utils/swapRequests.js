/**
 * Swap requests — the shared reading of `GET /organization/swap-requests/`.
 *
 * A swap request says that one employee wants to hand a scheduled assignment to
 * another, and the payload describes it with three kinds of value that must not
 * reach the screen unprocessed:
 *
 *   - people, which arrive either as a flat `*_name` string or as a nested
 *     employee object (`{ id, first_name, last_name, … }`), depending on which
 *     serializer answered;
 *   - references (shift type, site), which arrive as a bare primary key, a
 *     nested object, or a backend enum token such as `NIGHT_SHIFT`;
 *   - stamps (`original_date`, `requested_at`, shift start/end times), which are
 *     ISO strings.
 *
 * Printing any of those straight is how the grid ends up showing `14`,
 * `[object Object]`, `to_employee_approved` or `2026-08-28T09:15:00Z` in a cell
 * a person is meant to read. The rules below are the single place that decides
 * what a cell says, because the table, the details modal and the tab counters
 * all render the same request and must not disagree about it.
 *
 * Two deliberate choices:
 *
 * First, an id is not a label. A value that is only a primary key (a number, a
 * numeric string, a UUID) carries no meaning for the reader, so it resolves to
 * nothing and the caller prints an em dash instead of a number that looks like
 * a shift name but isn't.
 *
 * Second, an unknown status is humanised rather than passed through. The
 * backend can add states this app has no copy for, and `to_employee_rejected`
 * rendered as a pill reads as a bug; "To Employee Rejected" reads as a state.
 */

export const EM_DASH = '—'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_ONLY_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/

/** True for values that are only a primary key — nothing a reader can use. */
export function isIdLike(value) {
  if (typeof value === 'number') return true
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) || UUID_RE.test(trimmed)
}

/**
 * Turn a backend token into sentence-shaped text: `NIGHT_SHIFT` into
 * `Night Shift`, `to_employee_approved` into `To Employee Approved`. Text that
 * already reads as prose (mixed case, no separators) is returned untouched so
 * proper nouns keep their own capitalisation.
 */
export function humanize(value) {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (!/[_-]/.test(raw) && raw !== raw.toUpperCase()) return raw
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) =>
      word.length <= 3 && word === word.toUpperCase() && /[A-Z]/.test(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ')
}

/** First non-empty value in a list, ignoring nulls and blank strings. */
function firstFilled(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text) return text
  }
  return ''
}

/**
 * A person's name out of whatever shape the serializer used.
 *
 * `directory` is the company's employee list keyed by every id an employee can
 * be referenced by (see `buildEmployeeDirectory`). This endpoint names people
 * by primary key alone, so without the directory a bare id resolves to nothing
 * — printing "12" tells the approver less than a blank does, and the whole
 * column then reads "Unknown employee".
 */
export function personName(value, directory = null) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') {
    if (!isIdLike(value)) return String(value).trim()
    return directory ? directory.get(String(value).trim()) || '' : ''
  }
  if (typeof value !== 'object') return ''
  const composed = [value.first_name, value.middle_name, value.last_name]
    .filter((part) => part !== null && part !== undefined && String(part).trim())
    .join(' ')
  return firstFilled(
    value.full_name,
    value.name,
    value.employee_name,
    value.display_name,
    composed,
    personName(value.employee, directory),
    personName(value.user, directory),
    value.username,
    value.email,
    // An object carrying nothing but its own key is still just a reference.
    directory && value.id !== undefined ? personName(value.id, directory) : '',
  )
}

/**
 * An id -> name lookup over the company's employees.
 *
 * Keyed by every id a request can point at, because the payload's `*_by` /
 * `*_employee` fields are not consistent about which one they carry: the
 * employee record's own id, the underlying user's id, and the
 * employee-company id are all in circulation across these endpoints.
 */
export function buildEmployeeDirectory(employees) {
  const directory = new Map()
  if (!Array.isArray(employees)) return directory
  for (const employee of employees) {
    if (!employee || typeof employee !== 'object') continue
    const name = personName(employee)
    if (!name) continue
    const ids = [
      employee.id,
      employee.employee_id,
      employee.user?.id,
      employee.user_id,
      employee.employee_company,
      employee.employee_company_id,
    ]
    for (const id of ids) {
      if (id === null || id === undefined) continue
      const key = String(id).trim()
      if (!key) continue
      // The id spaces overlap — employee #3 and user #3 are different people —
      // so a key that two employees both answer to is dropped rather than
      // guessed. Naming the wrong person on an approval screen is worse than
      // naming nobody.
      if (directory.has(key) && directory.get(key) !== name) directory.set(key, '')
      else if (!directory.has(key)) directory.set(key, name)
    }
  }
  return directory
}

/** A reference's label — nested object, enum token, or nothing if it's an id. */
export function referenceLabel(value, keys = ['name', 'title', 'label', 'code']) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') {
    return isIdLike(value) ? '' : humanize(value)
  }
  if (typeof value !== 'object') return ''
  for (const key of keys) {
    const found = value[key]
    if (found !== null && found !== undefined && String(found).trim()) return humanize(found)
  }
  return ''
}

/** `08:00:00` or an ISO stamp becomes `8:00 AM`. */
export function formatTime(value) {
  if (!value) return ''
  const text = String(value).trim()
  const timeOnly = text.match(TIME_ONLY_RE)
  if (timeOnly) {
    const hours = Number(timeOnly[1])
    if (!Number.isFinite(hours)) return ''
    const minutes = timeOnly[2]
    const suffix = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 === 0 ? 12 : hours % 12
    return `${hour12}:${minutes} ${suffix}`
  }
  const date = new Date(text)
  if (isNaN(date)) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/**
 * A calendar date. Date-only strings are split by hand rather than handed to
 * `new Date()`, which reads them as UTC midnight and can print the day before.
 */
export function formatSwapDate(value) {
  if (!value) return ''
  const text = String(value).trim()
  const dateOnly = text.match(DATE_ONLY_RE)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(text)
  if (isNaN(date)) return ''
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

/** A submitted/approved stamp: date and clock time together. */
export function formatSwapDateTime(value) {
  if (!value) return ''
  const date = new Date(String(value).trim())
  if (isNaN(date)) return ''
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * What shift an assignment is for. A named shift wins; when the payload only
 * carries the clock, the hours are the name the reader recognises anyway.
 */
export function shiftLabel(assignment) {
  if (!assignment || typeof assignment !== 'object') return ''
  const named = firstFilled(
    referenceLabel(assignment.shift_type_name),
    referenceLabel(assignment.shift_name),
    referenceLabel(assignment.shift_type),
    referenceLabel(assignment.shift),
    referenceLabel(assignment.shift_template),
    referenceLabel(assignment.schedule?.shift_type),
    referenceLabel(assignment.schedule?.shift_type_name),
  )
  if (named) return named
  const start = formatTime(
    assignment.start_time ?? assignment.shift?.start_time ?? assignment.schedule?.start_time,
  )
  const end = formatTime(
    assignment.end_time ?? assignment.shift?.end_time ?? assignment.schedule?.end_time,
  )
  if (start && end) return `${start} – ${end}`
  return start || end || ''
}

/** Where an assignment is worked. */
export function siteLabel(assignment) {
  if (!assignment || typeof assignment !== 'object') return ''
  const siteKeys = ['name', 'site_name', 'title', 'label', 'code']
  return firstFilled(
    referenceLabel(assignment.site_name),
    referenceLabel(assignment.site, siteKeys),
    referenceLabel(assignment.location, siteKeys),
    referenceLabel(assignment.schedule?.site, siteKeys),
  )
}

const STATUS_LABELS = {
  pending: 'Pending',
  to_employee_approved: 'Employee approved',
  to_employee_rejected: 'Employee rejected',
  admin_approved: 'Approved',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  completed: 'Completed',
  expired: 'Expired',
}

const STATUS_TONES = {
  pending: 'pending',
  to_employee_approved: 'info',
  to_employee_rejected: 'rejected',
  admin_approved: 'approved',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'default',
  canceled: 'default',
  completed: 'approved',
  expired: 'default',
}

/** Copy for a status, humanised rather than passed through when unrecognised. */
export function statusLabel(status) {
  const key = String(status ?? '')
    .trim()
    .toLowerCase()
  if (!key) return 'Unknown'
  return STATUS_LABELS[key] || humanize(key)
}

/** Pill tone for a status; unknown states stay neutral rather than guessing. */
export function statusTone(status) {
  const key = String(status ?? '')
    .trim()
    .toLowerCase()
  return STATUS_TONES[key] || 'default'
}

/** Booleans arrive as `true`, `"true"` or `1` depending on the serializer. */
export function toBool(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.trim().toLowerCase())
  return false
}

/**
 * One request, with every field the UI prints resolved to display text.
 *
 * The raw keys are kept alongside so callers that branch on `status` or `id`
 * keep working; the `*_label` keys are the ones meant for the screen.
 */
export function normalizeSwapRequest(raw, directory = null) {
  if (!raw || typeof raw !== 'object') return raw
  const original = raw.original_assignment ?? raw.original_schedule ?? raw.from_assignment ?? null
  const next = raw.new_assignment ?? raw.new_schedule ?? raw.to_assignment ?? null

  const requestedBy = firstFilled(
    personName(raw.requested_by_name, directory),
    personName(raw.requested_by, directory),
    personName(raw.requested_by_id, directory),
    personName(raw.requester_name, directory),
    personName(raw.requester, directory),
    personName(raw.requested_by_employee, directory),
    personName(raw.created_by, directory),
    // The requester is normally the employee giving up the shift, so their name
    // is the honest fallback when only the swap's own sides are identifiable.
    personName(raw.from_employee_name, directory),
    personName(raw.from_employee, directory),
    personName(original?.employee, directory),
  )
  const fromEmployee = firstFilled(
    personName(raw.from_employee_name, directory),
    personName(raw.from_employee, directory),
    personName(raw.from_employee_id, directory),
    personName(original?.employee, directory),
    personName(raw.employee, directory),
  )
  const toEmployee = firstFilled(
    personName(raw.to_employee_name, directory),
    personName(raw.to_employee, directory),
    personName(raw.to_employee_id, directory),
    personName(next?.employee, directory),
    personName(raw.target_employee, directory),
  )

  const status = String(raw.status ?? '')
    .trim()
    .toLowerCase()

  return {
    ...raw,
    status,
    requested_by_name: requestedBy,
    from_employee_name: fromEmployee,
    to_employee_name: toEmployee,
    to_employee_approved: toBool(raw.to_employee_approved),
    original_date_label: formatSwapDate(raw.original_date ?? original?.date),
    new_date_label: formatSwapDate(raw.new_date ?? next?.date),
    original_shift_label: shiftLabel(original),
    new_shift_label: shiftLabel(next),
    original_site_label: siteLabel(original),
    new_site_label: siteLabel(next),
    requested_at_label: formatSwapDateTime(raw.requested_at ?? raw.created_at),
    admin_approved_at_label: formatSwapDateTime(raw.admin_approved_at),
    status_label: statusLabel(status),
    status_tone: statusTone(status),
  }
}

/** The list form, tolerant of a payload that isn't an array. */
export function normalizeSwapRequests(list, directory = null) {
  if (!Array.isArray(list)) return []
  return list.map((raw) => normalizeSwapRequest(raw, directory))
}
