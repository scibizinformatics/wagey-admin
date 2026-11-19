/**
 * Employment statuses: the company-defined list an employee can be moved
 * between. Admin settings owns the list; the Employees page consumes it — the
 * row menu offers it as the Cancel action's choices, and the table, card list and
 * detail modal read it to label each employee's current status and colour it by
 * category.
 *
 *   GET    /user/companies/{company_id}/employment-statuses/
 *   POST   /user/companies/{company_id}/employment-statuses/
 *   GET    /user/companies/{company_id}/employment-statuses/{id}/
 *   PATCH  /user/companies/{company_id}/employment-statuses/{id}/
 *   DELETE /user/companies/{company_id}/employment-statuses/{id}/
 *
 * `DELETE` does not remove a status — it retires it (`is_selectable: false`)
 * and keeps the row, because employees already on it keep it and `employee_count`
 * stays truthful. `PATCH { is_selectable: true }` is therefore the restore verb,
 * even though the API documents no separate one.
 *
 * The three categories are the API's own enum. Everything else here is a display
 * decision so the panel, the Employees dialog and any later caller cannot
 * disagree about a label or about what an absent flag means.
 */

import { employmentStatusIdOf, getStatus, nameKey } from '@/composables/utils/employee'

const asText = (value) => (value == null ? '' : String(value).trim())

/**
 * `active` is where a currently-working employee is; `inactive` is a pause;
 * `separated` is the end of employment. The hints are deliberately short — the
 * API says nothing more about what a company should put in each, and inventing
 * policy here would be guessing.
 */
export const EMPLOYMENT_STATUS_CATEGORIES = [
  { value: 'active', label: 'Active', hint: 'Currently employed.' },
  { value: 'inactive', label: 'Inactive', hint: 'Still employed, but not currently working.' },
  { value: 'separated', label: 'Separated', hint: 'No longer employed.' },
]

const CATEGORY_VALUES = new Set(EMPLOYMENT_STATUS_CATEGORIES.map((category) => category.value))

/**
 * The categories the Employees row menu's Cancel action may move somebody to.
 * `active` is excluded on purpose: it is what that action moves people *away*
 * from, and offering it would make the dialog a second, unexplained way to put
 * somebody back — restoring is a separate action with its own consequences.
 * Listed rather than inferred, and an unknown category is not offered either,
 * because it would need a label nobody has defined.
 */
export const EMPLOYEE_MOVE_STATUS_CATEGORIES = ['inactive', 'separated']

/**
 * The three categories as the Employees page names them. `separated` is the
 * API's own word for the end of employment; the page has always called that
 * "Terminated", and so does the row menu, so the filter keeps that vocabulary
 * rather than surfacing a fourth word for the same state.
 */
export const EMPLOYEE_STATUS_CATEGORY_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'separated', label: 'Terminated' },
]

/** Category → `.dash-chip--*` modifier, shared by the table, cards and modal. */
const CHIP_CLASS_BY_CATEGORY = {
  active: 'dash-chip--good',
  inactive: 'dash-chip--warn',
  separated: 'dash-chip--critical',
}

/** The code format the endpoint documents: lowercase, digits, underscores. */
export const EMPLOYMENT_STATUS_CODE_PATTERN = /^[a-z0-9][a-z0-9_]*$/

/**
 * The list endpoints answer a bare array, but the app's `{ data }` envelope and
 * DRF's `results` shape are both seen elsewhere in this API, so both are
 * accepted rather than trusting one.
 */
export function unwrapEmploymentStatusList(payload) {
  if (Array.isArray(payload)) return payload
  const rows = payload?.data ?? payload?.results ?? payload?.items
  return Array.isArray(rows) ? rows : []
}

/** One status row into the shape the table, dialog and confirm read. */
export function normaliseEmploymentStatus(raw) {
  const src = raw || {}
  const sortOrder = Number(src.sort_order)
  const employeeCount = Number(src.employee_count)

  return {
    id: src.id ?? null,
    companyId: src.company ?? null,
    companyName: asText(src.company_name),
    name: asText(src.name) || asText(src.code) || 'Untitled status',
    code: asText(src.code),
    category: asText(src.category).toLowerCase(),
    description: asText(src.description),
    isDefault: src.is_default === true,
    isSystem: src.is_system === true,
    // Read `false`-only: a row carrying no flag at all is selectable, which is
    // the same reading the overtime category and identity-document lists use.
    isSelectable: src.is_selectable !== false,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    // `null`, not `0`, when the payload does not carry a count: "we could not
    // read this" must never print as an empty company.
    employeeCount: Number.isFinite(employeeCount) ? employeeCount : null,
    dateCreated: src.date_created || '',
  }
}

/** `sort_order` first, then name — the order the API's own field asks for. */
export function sortEmploymentStatuses(rows = []) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

/**
 * Index a company's statuses for the employee list.
 *
 * The employee row carries its status as a **pk** (`companies[0].employment_status`
 * — see `employmentStatusIdOf`), and some payloads carry only a code or a name.
 * All three are indexed so a row can be resolved without a request per employee,
 * and retired statuses are deliberately included: an employee still sitting on a
 * retired status must keep reading that status, not fall back to "Active".
 *
 * @param {Array} rows  raw or already-normalised employment statuses
 * @returns {{ byId: Map<string, object>, byCode: Map<string, object>, byName: Map<string, object> }}
 */
export function buildEmploymentStatusIndex(rows = []) {
  const byId = new Map()
  const byCode = new Map()
  const byName = new Map()

  for (const raw of Array.isArray(rows) ? rows : []) {
    const status = normaliseEmploymentStatus(raw)
    if (status.id != null) byId.set(String(status.id), status)
    if (status.code) byCode.set(status.code.toLowerCase(), status)
    if (status.name) byName.set(nameKey(status.name), status)
  }

  return { byId, byCode, byName }
}

/**
 * A status *code* from a row, or '' when the row carries only a pk.
 *
 * `companies[0].employment_status` is the pk on the employee list, but a code on
 * payloads written by the status-change endpoints. A numeric string is a pk, not
 * a code, so it is skipped here rather than looked up in `byCode`.
 */
function statusCodeOf(employee) {
  if (!employee) return ''
  const block = employee.companies?.[0]

  for (const raw of [employee.status_code, block?.employment_status, employee.status]) {
    if (raw && typeof raw === 'object') {
      const nested = asText(raw.code).toLowerCase()
      if (nested) return nested
      continue
    }
    const text = asText(raw).toLowerCase()
    if (text && !/^\d+$/.test(text)) return text
  }

  return ''
}

/**
 * The catalogue record an employee row is on, or `null`.
 *
 * Id first (the authoritative field), then code, then display name. Name is the
 * last resort for a payload that carries `status_name` but no pk — without it
 * such a row would show the right label with the wrong chip colour.
 */
export function resolveEmploymentStatus(employee, index) {
  if (!employee || !index) return null

  const id = employmentStatusIdOf(employee)
  if (id != null) {
    const match = index.byId?.get(String(id))
    if (match) return match
  }

  const code = statusCodeOf(employee)
  if (code) {
    const match = index.byCode?.get(code)
    if (match) return match
  }

  const label = asText(employee.status_name ?? employee.companies?.[0]?.status_name)
  if (label) {
    const match = index.byName?.get(nameKey(label))
    if (match) return match
  }

  return null
}

/**
 * The employee's category: `active` | `inactive` | `separated`.
 *
 * A resolved catalogue row wins. When the catalogue has not loaded (or the row
 * carries no resolvable status) this degrades to the same signals `getStatus`
 * has always read — an inline `employment_status_category` if the payload has
 * one, then the code/flag heuristics — so the page still renders sensibly and
 * the chip colour never depends on a request having succeeded.
 */
export function employmentStatusCategoryOf(employee, index) {
  if (!employee) return 'active'

  const resolved = asText(resolveEmploymentStatus(employee, index)?.category).toLowerCase()
  if (isKnownEmploymentStatusCategory(resolved)) return resolved

  const inline = asText(
    employee.employment_status_category ?? employee.companies?.[0]?.employment_status_category,
  ).toLowerCase()
  if (isKnownEmploymentStatusCategory(inline)) return inline

  const code = statusCodeOf(employee)
  if (code === 'terminated' || code === 'separated') return 'separated'
  if (code === 'inactive') return 'inactive'

  const label = employmentStatusLabelOf(employee, index).toLowerCase()
  if (label === 'terminated' || label === 'separated') return 'separated'
  if (label === 'inactive') return 'inactive'

  if (employee.is_active === false) return 'separated'

  return 'active'
}

/**
 * The label to print: the company's own status name where it can be resolved,
 * otherwise the same fallback ladder the rest of the app uses (`getStatus`).
 */
export function employmentStatusLabelOf(employee, index) {
  if (!employee) return 'N/A'
  return resolveEmploymentStatus(employee, index)?.name || getStatus(employee)
}

/** The category's display word — "Terminated" for `separated`, as the page says it. */
export function employmentStatusCategoryLabel(value) {
  const raw = asText(value).toLowerCase()
  const match = EMPLOYEE_STATUS_CATEGORY_FILTERS.find((category) => category.value === raw)
  return match?.label ?? categoryLabel(raw)
}

/** The chip tone for a category; '' lets the base `.dash-chip` styling apply. */
export function employmentStatusChipClass(category) {
  return CHIP_CLASS_BY_CATEGORY[asText(category).toLowerCase()] || ''
}

/**
 * A code suggestion from the status name, matching the documented format.
 *
 * Applied on the way out rather than as you type, so a half-typed name is not
 * rewritten under the cursor. A leading underscore is impossible because the
 * pattern requires the first character to be a letter or digit.
 */
export function suggestStatusCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** A category's display label, falling back to the raw value rather than blank. */
export function categoryLabel(value) {
  const raw = asText(value)
  if (!raw) return 'Uncategorised'
  const known = EMPLOYMENT_STATUS_CATEGORIES.find(
    (category) => category.value === raw.toLowerCase(),
  )
  if (known) return known.label
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function isKnownEmploymentStatusCategory(value) {
  return CATEGORY_VALUES.has(asText(value).toLowerCase())
}

/** The employee-count fact, which is never a bare `0` where a word reads better. */
export function employeeCountLabel(count) {
  if (count == null || !Number.isFinite(Number(count))) return 'Unknown'
  const n = Number(count)
  if (n === 0) return 'No employees yet'
  return `${n} employee${n === 1 ? '' : 's'}`
}

/**
 * The code a form will actually save: what the admin typed, or a slug of the
 * name. The code field is optional in the dialog, but the endpoint still
 * documents `code` as required on create, so a blank field cannot send nothing.
 */
export function employmentStatusCodeFor(form) {
  return asText(form?.code).toLowerCase() || suggestStatusCode(form?.name)
}

/**
 * The body for the company-level POST / PATCH.
 *
 * `code` and `category` are omitted for a system status on edit: the endpoint
 * refuses to change either on one (`"The code of a system status cannot be
 * changed."`), and sending back the unchanged value invites that refusal for no
 * reason.
 *
 * The code field is optional in the form. On create a blank one is derived from
 * the name (the API requires a code); on edit of a non-system status a blank one
 * is omitted so the existing code stays. `is_default` is deliberately never
 * sent — changing it is a row action of its own (`{ is_default: true }`) because
 * the API refuses to unset it.
 *
 * @param {object}  form
 * @param {boolean} [options.editing]
 * @returns {object}
 */
export function employmentStatusPayload(form, { editing = false } = {}) {
  const sortOrder = Number(form?.sortOrder)
  const payload = {
    name: asText(form?.name),
    description: asText(form?.description),
    is_selectable: form?.isSelectable !== false,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  }

  if (!editing || !form?.isSystem) {
    const code = employmentStatusCodeFor(form)
    // Create sends the derived value; edit sends a code only when one was
    // typed, so clearing the field preserves the status's identity.
    if (!editing || code) payload.code = code
    payload.category = asText(form?.category).toLowerCase()
  }

  return payload
}
