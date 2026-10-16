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
 * The category an overtime row carries when the backend recorded none. A row
 * with no category is a CTO conversion in this workspace, so it reads as the
 * acronym and explains itself on hover — the same wording the table's
 * `cto-badge` and the detail modal's "Converted to CTO" row already use.
 */
export const CTO_CATEGORY_LABEL = 'CTO'
export const CTO_CATEGORY_TOOLTIP = 'Compensatory Time Off'

/**
 * True when a row's *displayed* category is the CTO acronym. Matched on the
 * label rather than on `category` so the fallback and a real backend category
 * named "CTO" are both covered, and so a row whose category already spells the
 * words out gets no hover.
 */
export function isCtoCategory(name) {
  const label = String(name ?? '')
    .trim()
    .toUpperCase()
  return label === CTO_CATEGORY_LABEL
}

/**
 * True when a row reads as CTO in the Category column: it was converted to CTO,
 * or it carries no category at all. An uncategorised row's fallback label is the
 * acronym, so it is flagged the same way rather than left as a bare pill.
 */
export function isCtoRow(row) {
  return Boolean(row?.convertedToCto) || isCtoCategory(row?.categoryName)
}

/**
 * The id of the company's CTO overtime category, or null when none is
 * configured. A category qualifies when its name contains "CTO" — the acronym,
 * as "Overtime Converted to CTO" spells it — or spells the words out.
 * Case-insensitive; the first match wins.
 */
export function findCtoCategoryId(categories) {
  if (!Array.isArray(categories)) return null
  const match = categories.find((c) => {
    const name = String(c?.name ?? '')
      .trim()
      .toLowerCase()
    return name.includes('cto') || name === 'compensatory time off'
  })
  return match?.id ?? null
}

/**
 * States that still await a decision. A row in any of these is selectable, gets
 * the waiting row tint, and can be approved or rejected.
 */
const ACTIONABLE = new Set(['requested', 'qualified', 'pending'])

/**
 * States whose hours the approver may still settle. Narrower than
 * `ACTIONABLE` on purpose: an approver negotiates the figure only while the
 * employee has merely *asked*. Once the backend has said the employee
 * qualified (`qualified`), the hours are that verdict's arithmetic rather than
 * the approver's to change, so the cell is read-only text while the row stays
 * selectable and approvable.
 *
 * Two capabilities, not one — conflating them is what let a qualified row carry
 * an editable input the approver could settle below the qualified figure.
 */
const EDITABLE = new Set(['requested', 'pending'])

export function isEditableOvertimeStatus(status) {
  return EDITABLE.has(normalizeOvertimeStatus(status))
}

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
  // Not a backend status — the API answers `requested`, `qualified`,
  // `approved`, `admin_approved`, `rejected` or `cancelled`. "Unqualified" is
  // derived from `cancelled` for display; see `DISPLAY_STATUS_OVERRIDES`.
  unqualified: 'Unqualified',
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
  // Neutral rather than red: an unqualified row is an outcome the rules
  // produced, not a rejection somebody chose, and painting it with the rejected
  // tone would make it read as a decision the approver never made.
  unqualified: 'status-pill--default',
}

/**
 * Backend statuses this workspace reads as a different state on screen.
 *
 * `cancelled` is how the API reports an employee who did not qualify for a
 * pre-approved overtime, so it is presented as **Unqualified** rather than
 * Cancelled. That reading is provisional — the list payload has not yet been
 * seen to carry a `cancelled` row — so the mapping lives in this one map,
 * deliberately, to keep it a one-line revert if the backend turns out to use
 * `cancelled` for other reasons too (an admin withdrawal, a superseded record),
 * in which case it should be scoped rather than removed.
 *
 * Nothing else about such a row changes: it stays non-actionable, its hours
 * stay read-only, and it is excluded from the pending count — an unqualified
 * request is not something an approver can act on. The backend's own value is
 * preserved on the row as `rawStatus` for diagnostics.
 */
const DISPLAY_STATUS_OVERRIDES = {
  cancelled: 'unqualified',
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
  if (key === 'unqualified') return 'unqualified'
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
  // The backend's own status, kept verbatim for diagnostics, and the status the
  // screen shows, which may be one of `DISPLAY_STATUS_OVERRIDES` — see that map
  // for why `cancelled` reads as Unqualified.
  const rawStatus = normalizeOvertimeStatus(item.status)
  const status = DISPLAY_STATUS_OVERRIDES[rawStatus] || rawStatus
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
    categoryName: item.category_name || CTO_CATEGORY_LABEL,
    date: item.date || '',
    // The claim is what the row is about; qualified hours stand in only when the
    // claim itself was never recorded.
    hours: hours ?? qualifiedHours,
    qualifiedHours,
    approvedHours: toHours(item.approved_hours),
    attendances: Array.isArray(item.attendances) ? item.attendances : [],
    schedules: Array.isArray(item.schedules) ? item.schedules : [],
    status,
    // The backend's own value, untouched by `DISPLAY_STATUS_OVERRIDES`, so a
    // row reading "Unqualified" can still be traced back to `cancelled`.
    rawStatus,
    statusLabel: overtimeStatusLabel(status),
    statusGroup: overtimeStatusGroup(status),
    actionable: isActionableOvertimeStatus(status),
    // Whether the Hours cell is an input or settled text. Decided separately
    // from `actionable`: a `qualified` row can still be approved or rejected,
    // it just cannot have its hours retyped under it.
    hoursEditable: isEditableOvertimeStatus(status),
    // The other candidate signal for "unqualified" — a populated
    // `qualified_hours` of 0 on a still-undecided row — remains unwired because
    // `GET /payroll/overtime-list/` currently sends `qualified_hours: null` on
    // every row. If the backend ever populates it, the derivation is
    // `rawStatus` actionable && qualifiedHours === 0, forced false for
    // `actionable` and `hoursEditable` exactly as `DISPLAY_STATUS_OVERRIDES`
    // already does for `cancelled`.
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
