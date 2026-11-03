/**
 * Statutory contribution settings — the shared reading of
 *   GET  /payroll/contributions/types/{company_id}/
 *   GET  /payroll/contributions/components/{company_id}/
 *
 * A *type* is the scheme a component files under ("SSS", "PhilHealth",
 * "Pag-IBIG"); a *component* (the API's word for a bracket) is one income band
 * carrying the employee and employer share taken from that band. A component may
 * have no type yet — the panel is built so bands can be entered before the
 * schemes are set up.
 *
 * The two are read together everywhere this panel appears: the component table
 * names its type in a column, the type dialog counts the components filed under
 * each row, and the component form picks from the same list. So the normalisation
 * and the payload shapes live here rather than in each component.
 *
 * Three things about the payload drive the helpers below.
 *
 * First, **every money and rate is a decimal string** (`"-7.71"`, `"0.6"`, `""`).
 * They are read into numbers for display but travel back as the text the admin
 * typed, so a value is never rounded by a `parseFloat` round-trip on its way to
 * the server.
 *
 * Second, **`type` is the type's id**, not its code, so a component row cannot
 * print the scheme's name without the type list beside it. `typeId` stays the raw
 * id so a form can send back exactly what it was given.
 *
 * Third, **`fixed_amount` is the employer share** and `employee_fixed` /
 * `employee_percent` are the employee's — the endpoint documents only the
 * employee side, but the field is present on every row and this panel names it
 * for what it is rather than leaving an unlabelled figure in a payroll table.
 */

import { longLabel, todayIso } from 'src/composables/utils/calendarDate'
import { formatCurrencyPrecise } from 'src/composables/utils/format'

/** Ids cross the wire as numbers here and as strings elsewhere. */
export function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

/** The list envelope this API uses, tolerating a bare array and a `results` page. */
function rowsFrom(payload) {
  if (Array.isArray(payload)) return payload
  const direct = payload?.data ?? payload?.results
  if (Array.isArray(direct)) return direct
  const nested = direct?.results ?? direct?.data
  return Array.isArray(nested) ? nested : []
}

/**
 * A decimal field into a number, or null when it carries no figure.
 *
 * `null` is not `0`: an employer share the backend sent as `""` is "not set",
 * and printing it as `₱0.00` would claim a zero deduction that was never
 * configured. `Number('')` is `0`, which is exactly the trap this avoids.
 */
function toAmount(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** The text a decimal field should travel back as. Blank stays blank. */
function decimalText(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** One contribution type into the shape every renderer reads. */
export function normalizeContributionType(raw) {
  return {
    id: raw?.id ?? null,
    companyId: raw?.company?.id ?? raw?.company ?? null,
    code: String(raw?.code ?? '').trim(),
    name: String(raw?.name ?? '').trim(),
  }
}

export function normalizeContributionTypes(payload) {
  return rowsFrom(payload)
    .map(normalizeContributionType)
    .filter((type) => type.id != null)
}

/**
 * One bracket into the shape every renderer reads.
 *
 * A row with no id is dropped — there would be nothing to edit or delete. A row
 * with no readable income bounds is kept: it is still a record the admin can
 * repair, and hiding it would leave a bracket in the payroll it cannot see.
 */
export function normalizeContributionBracket(raw) {
  return {
    id: raw?.id ?? null,
    companyId: raw?.company?.id ?? raw?.company ?? null,
    typeId: raw?.type?.id ?? raw?.type ?? null,
    name: String(raw?.name ?? '').trim(),
    employeeFixed: toAmount(raw?.employee_fixed),
    employeePercent: toAmount(raw?.employee_percent),
    incomeFrom: toAmount(raw?.income_from),
    incomeTo: toAmount(raw?.income_to),
    employerFixed: toAmount(raw?.fixed_amount),
    effectiveDate: String(raw?.effective_date ?? ''),
    isActive: raw?.is_active ?? true,
  }
}

export function normalizeContributionBrackets(payload) {
  return rowsFrom(payload)
    .map(normalizeContributionBracket)
    .filter((bracket) => bracket.id != null)
}

// ─── Labels ────────────────────────────────────────────────────────────────

/** The name a type is offered and printed under. */
export function contributionTypeLabel(type) {
  if (!type) return 'Unassigned type'
  return type.name || type.code || `Type ${type.id}`
}

/**
 * A percentage as the integer or decimal the row carries.
 *
 * Not `formatCurrencyPrecise`: a rate is not money, and a `₱` in front of 4.5
 * reads as four pesos fifty.
 */
export function percentLabel(value) {
  const n = toAmount(value)
  if (n == null) return ''
  return `${n.toLocaleString('en-PH', { maximumFractionDigits: 4 })}%`
}

/** The income band, as "₱0.00 – ₱10,000.00" with open ends spelled out. */
export function bracketRangeLabel(bracket) {
  const from = bracket?.incomeFrom ?? null
  const to = bracket?.incomeTo ?? null
  if (from == null && to == null) return 'Any income'
  if (from == null) return `Up to ${formatCurrencyPrecise(to)}`
  if (to == null) return `${formatCurrencyPrecise(from)} and above`
  return `${formatCurrencyPrecise(from)} – ${formatCurrencyPrecise(to)}`
}

/**
 * What the employee pays in this band: a flat amount, a rate, or both.
 *
 * A zero half is omitted rather than printed — `₱0.00 + 4%` reads as a fixed
 * charge that is not there. Both zero is a real answer and prints as a dash.
 */
export function employeeShareLabel(bracket) {
  const parts = []
  const fixed = toAmount(bracket?.employeeFixed)
  const percent = toAmount(bracket?.employeePercent)
  if (fixed) parts.push(formatCurrencyPrecise(fixed))
  if (percent) parts.push(percentLabel(percent))
  return parts.length ? parts.join(' + ') : '—'
}

/** The employer's share of this band; blank when the row carries none. */
export function employerShareLabel(bracket) {
  const amount = toAmount(bracket?.employerFixed)
  return amount == null ? '—' : formatCurrencyPrecise(amount)
}

/** The row's own title: its name, or the band when it was never named. */
export function bracketTitle(bracket) {
  if (!bracket) return 'Component'
  return bracket.name || bracketRangeLabel(bracket)
}

/** The effective date in the app's calendar words, or the raw value if odd. */
export function bracketEffectiveLabel(bracket) {
  return bracket?.effectiveDate ? longLabel(bracket.effectiveDate) : '—'
}

// ─── Type forms ────────────────────────────────────────────────────────────

export function emptyContributionTypeForm() {
  return { id: null, name: '', code: '' }
}

export function contributionTypeToForm(type) {
  return {
    id: type?.id ?? null,
    name: type?.name ?? '',
    code: type?.code ?? '',
  }
}

/** A message worth showing a person, or null when the form can be saved. */
export function validateContributionTypeForm(form) {
  if (!String(form?.name ?? '').trim()) return 'Contribution type name is required'
  if (!String(form?.code ?? '').trim()) return 'Contribution type code is required'
  return null
}

/**
 * The write body for a type. `company` is added by the composable on create
 * only — a partial update must not be able to move a row to another workspace.
 */
export function contributionTypePayload(form) {
  return {
    name: String(form?.name ?? '').trim(),
    code: String(form?.code ?? '').trim(),
  }
}

// ─── Bracket forms ─────────────────────────────────────────────────────────

export function emptyBracketForm(typeId = null) {
  return {
    id: null,
    type: typeId,
    name: '',
    employee_fixed: '',
    employee_percent: '',
    income_from: '',
    income_to: '',
    fixed_amount: '',
    effective_date: todayIso(),
    is_active: true,
  }
}

export function bracketToForm(bracket) {
  const text = (value) => (value == null ? '' : String(value))
  return {
    id: bracket?.id ?? null,
    type: bracket?.typeId ?? null,
    name: bracket?.name ?? '',
    employee_fixed: text(bracket?.employeeFixed),
    employee_percent: text(bracket?.employeePercent),
    income_from: text(bracket?.incomeFrom),
    income_to: text(bracket?.incomeTo),
    fixed_amount: text(bracket?.employerFixed),
    effective_date: bracket?.effectiveDate || todayIso(),
    is_active: bracket?.isActive ?? true,
  }
}

/**
 * A message worth showing a person, or null when the form can be saved.
 *
 * The band is the one thing a bracket cannot be wrong about: an inverted or
 * empty range silently matches nobody, so it is refused here rather than left
 * for a pay run to discover. Overlap between neighbouring brackets is not
 * checked — the server owns that rule, and two overlapping bands are a question
 * about policy rather than a malformed form.
 */
export function validateBracketForm(form) {
  const from = toAmount(form?.income_from)
  const to = toAmount(form?.income_to)
  if (from == null) return 'Income from is required'
  if (to == null) return 'Income to is required'
  if (from < 0) return 'Income from cannot be negative'
  if (to < 0) return 'Income to cannot be negative'
  if (from >= to) return 'Income from has to be lower than income to'

  for (const [field, label] of [
    ['employee_fixed', 'Employee fixed amount'],
    ['employee_percent', 'Employee percentage'],
    ['fixed_amount', 'Employer share'],
  ]) {
    const value = toAmount(form?.[field])
    if (value != null && value < 0) return `${label} cannot be negative`
  }

  const percent = toAmount(form?.employee_percent)
  if (percent != null && percent > 100) return 'Employee percentage cannot be more than 100'

  if (!String(form?.effective_date ?? '').trim()) return 'The effective date is required'
  return null
}

/**
 * The write body for a bracket.
 *
 * `company` is passed on create only; PATCH is partial and a row already
 * belongs to a company. Every decimal travels back as text, blank included,
 * because that is the shape the endpoint documents.
 */
export function bracketPayload(form, { companyId = null } = {}) {
  const payload = {
    type: form?.type ?? null,
    name: String(form?.name ?? '').trim(),
    employee_fixed: decimalText(form?.employee_fixed),
    employee_percent: decimalText(form?.employee_percent),
    income_from: decimalText(form?.income_from),
    income_to: decimalText(form?.income_to),
    fixed_amount: decimalText(form?.fixed_amount),
    effective_date: String(form?.effective_date ?? '').trim(),
    is_active: form?.is_active ?? true,
  }
  if (companyId != null) payload.company = companyId
  return payload
}
