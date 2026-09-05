/**
 * Overtime requests — the shared reading of `GET /payroll/overtime-list/`.
 *
 * One row is one employee's overtime on one date. The payload is thin and
 * carries three traps that must not reach the screen unprocessed:
 *
 *   - the person arrives as `employee_company`, a bare primary key, and only
 *     sometimes as a nested `employee` object or a flat `employee_name`. A key
 *     printed in the Employee column tells the approver nothing, so it is
 *     resolved against the company roster instead (see `buildEmployeeDirectory`
 *     in `swapRequests.js`, which this module reuses rather than duplicating);
 *   - hours arrive as strings (`"-83"`, `"-2"`) and there are three of them —
 *     `hours` is what the employee claimed, `qualified_hours` what the rules
 *     allowed, `approved_hours` what an admin settled on. They are distinct
 *     readings, so the table shows the claim and the modal shows the rest;
 *   - the status vocabulary is wider than the four states the UI used to know.
 *     `admin_approved` is the backend's name for an approval that came from
 *     this dashboard, and it means the same thing to a reader as `approved` —
 *     the same equivalence `swapRequests.js` already makes.
 *
 * The table, the details modal and the tab counters all render the same
 * request, so the labels, the pill colour and the "can I still act on this?"
 * test live here once instead of being re-invented in each of them.
 */

import { buildEmployeeDirectory, humanize, personName } from 'src/composables/utils/swapRequests'

export { buildEmployeeDirectory }

export const EM_DASH = '—'

/**
 * States that still await a decision. A row in any of these is selectable, gets
 * the waiting row tint, and shows its hours as an editable field — an approver
 * may settle on fewer hours than were claimed.
 */
const ACTIONABLE = new Set(['requested', 'qualified', 'pending'])

/**
 * Copy for the states this app knows. Anything else is humanised rather than
 * passed through, so a state the backend adds later reads as a state and not as
 * a leaked token.
 */
const STATUS_LABELS = {
  requested: 'Requested',
  pending: 'Requested',
  qualified: 'Qualified',
  approved: 'Approved',
  admin_approved: 'Approved',
  rejected: 'Rejected',
  admin_rejected: 'Rejected',
  cancelled: 'Cancelled',
  converted: 'Converted',
}

const STATUS_TONES = {
  requested: 'status-pill--pending',
  pending: 'status-pill--pending',
  qualified: 'status-pill--info',
  approved: 'status-pill--approved',
  admin_approved: 'status-pill--approved',
  rejected: 'status-pill--rejected',
  admin_rejected: 'status-pill--rejected',
  cancelled: 'status-pill--default',
  converted: 'status-pill--info',
}

/** Lowercase token form, so `REQUESTED` and `requested` compare equal. */
export function normalizeOvertimeStatus(raw) {
  if (raw === null || raw === undefined) return ''
  return String(raw).trim().toLowerCase()
}

export function overtimeStatusLabel(status) {
  const key = normalizeOvertimeStatus(status)
  if (!key) return 'Unknown'
  return STATUS_LABELS[key] || humanize(key) || 'Unknown'
}

export function overtimeStatusPillClass(status) {
  return STATUS_TONES[normalizeOvertimeStatus(status)] || 'status-pill--default'
}

export function isActionableOvertimeStatus(status) {
  return ACTIONABLE.has(normalizeOvertimeStatus(status))
}

/**
 * The four buckets a reader filters and counts by. `admin_approved` and
 * `approved` are one outcome to the person looking at the queue, so they answer
 * the same filter option — otherwise picking "Approved" hides half the
 * approvals and the tab counter disagrees with the rows on screen.
 */
export function overtimeStatusGroup(status) {
  const key = normalizeOvertimeStatus(status)
  if (!key) return 'other'
  if (key === 'qualified') return 'qualified'
  if (ACTIONABLE.has(key)) return 'requested'
  if (key.includes('approved')) return 'approved'
  if (key.includes('rejected')) return 'rejected'
  return 'other'
}

/**
 * The claimed hours as a number, or null when the field is absent or is one of
 * the placeholder strings the API sends for "not recorded". Callers format it;
 * this only decides whether there is a figure at all, so an empty cell and a
 * genuine `0` stay distinguishable.
 */
function toHours(value) {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (!raw || raw === '-' || raw === EM_DASH) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/** `2.5` -> `2.5h`, `3` -> `3h`, null -> em dash. Trailing zeros are dropped. */
export function formatOvertimeHours(value) {
  const hours = typeof value === 'number' ? value : toHours(value)
  if (hours === null) return EM_DASH
  return `${Number(hours.toFixed(2))}h`
}

export function normalizeOvertimeRequest(item, directory = null) {
  if (!item || typeof item !== 'object') return null
  const status = normalizeOvertimeStatus(item.status)
  const hours = toHours(item.hours)
  const qualifiedHours = toHours(item.qualified_hours)
  return {
    id: item.id,
    employeeCompany: item.employee_company,
    // `employee_name` and a nested `employee` both appear depending on which
    // serializer answered; the id is the last resort and only resolves through
    // the roster.
    employeeName:
      personName(item.employee_name, directory) ||
      personName(item.employee, directory) ||
      personName(item.employee_company, directory) ||
      'Unknown',
    category: item.category ?? null,
    categoryName: item.category_name || 'Uncategorised',
    date: item.date || '',
    // The claim is what the row is about; qualified hours stand in only when the
    // claim itself was never recorded.
    hours: hours ?? qualifiedHours,
    qualifiedHours,
    approvedHours: toHours(item.approved_hours),
    attendances: Array.isArray(item.attendances) ? item.attendances : [],
    schedules: Array.isArray(item.schedules) ? item.schedules : [],
    status,
    statusLabel: overtimeStatusLabel(status),
    statusGroup: overtimeStatusGroup(status),
    actionable: isActionableOvertimeStatus(status),
    approvedByName: item.approved_by_name || '',
    convertedToCto: Boolean(item.converted_to_cto),
    reason: item.reason || '',
    submittedDate: item.submitted_at || item.created_at || '',
  }
}

export function normalizeOvertimeRequests(list, directory = null) {
  if (!Array.isArray(list)) return []
  return list.map((item) => normalizeOvertimeRequest(item, directory)).filter(Boolean)
}
