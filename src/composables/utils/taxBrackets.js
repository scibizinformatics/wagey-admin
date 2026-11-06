/**
 * Withholding tax brackets — the shared reading of
 *   GET    /payroll/admin/tax-brackets/?company=<company_id>
 *   POST   /payroll/admin/tax-brackets/?company=<company_id>
 *   PATCH  /payroll/admin/tax-brackets/<pk>/?company=<company_id>
 *   DELETE /payroll/admin/tax-brackets/<pk>/?company=<company_id>
 *
 * A *tax bracket* is one income band carrying the withholding tax taken from
 * it: a fixed amount plus a rate charged on the income above the band's
 * minimum. The endpoint calls each row a bracket and so does the UI.
 *
 * The current endpoint is company-scoped by query parameter. The proposed
 * path-kwarg routes (`/tax-brackets/<company_id>/…`) are documented but not
 * implemented, so nothing here uses them.
 *
 * Two things about the payload drive the helpers below.
 *
 * First, **every money and rate is a decimal string** (`"20833.01"`, `"15.00"`).
 * They are read into numbers for display but travel back as the text the admin
 * typed, so a value is never rounded by a `parseFloat` round-trip on its way to
 * the server.
 *
 * Second, **the endpoint has no `is_active` flag** — a bracket is retired by
 * deleting it, not by switching it off, so no toggle exists anywhere in the UI.
 */

import { formatCurrencyPrecise } from 'src/composables/utils/format'
import { rowsFrom } from 'src/composables/utils/contributionSettings'

/**
 * A decimal field into a number, or null when it carries no figure.
 *
 * `null` is not `0`: a rate the backend sent as `""` is "not set", and printing
 * it as `0%` would claim a rate that was never configured. `Number('')` is `0`,
 * which is exactly the trap this avoids. Same shape as `toAmount` in
 * `contributionSettings` — kept beside the tax payload because that module's
 * decimal helpers are its own; extended when a third consumer appears.
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

/** How many digits a decimal text carries after the point. */
function decimalPlaces(value) {
  const text = decimalText(value)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

/**
 * One tax bracket into the shape every renderer reads.
 *
 * A row with no id is dropped — there would be nothing to edit or delete. A row
 * with unreadable bounds is kept: it is still a record the admin can repair,
 * and hiding it would leave a bracket in the payroll it cannot see.
 */
export function normalizeTaxBracket(raw) {
  return {
    id: raw?.id ?? null,
    companyId: raw?.company?.id ?? raw?.company ?? null,
    minimum: toAmount(raw?.minimum),
    maximum: toAmount(raw?.maximum),
    fixedTax: toAmount(raw?.fixed_tax),
    percentOver: toAmount(raw?.percent_over),
  }
}

export function normalizeTaxBrackets(payload) {
  return rowsFrom(payload)
    .map(normalizeTaxBracket)
    .filter((bracket) => bracket.id != null)
}

/** Low end first: the bracket a payroll reads first is the one it falls into. */
export function sortTaxBrackets(brackets) {
  return [...brackets].sort((a, b) => {
    const min = (a.minimum ?? Infinity) - (b.minimum ?? Infinity)
    return min !== 0 ? min : (a.maximum ?? Infinity) - (b.maximum ?? Infinity)
  })
}

// ─── Labels ────────────────────────────────────────────────────────────────

/** The band, as "₱20,833.01 – ₱33,333.00" with open ends spelled out. */
export function taxBracketRangeLabel(bracket) {
  const from = bracket?.minimum ?? null
  const to = bracket?.maximum ?? null
  if (from == null && to == null) return 'Any income'
  if (from == null) return `Up to ${formatCurrencyPrecise(to)}`
  if (to == null) return `${formatCurrencyPrecise(from)} and above`
  return `${formatCurrencyPrecise(from)} – ${formatCurrencyPrecise(to)}`
}

/** The fixed amount this band charges; blank when the row carries none. */
export function taxBracketFixedLabel(bracket) {
  const amount = toAmount(bracket?.fixedTax)
  return amount == null ? '—' : formatCurrencyPrecise(amount)
}

/**
 * A percentage as the integer or decimal the row carries.
 *
 * Not `formatCurrencyPrecise`: a rate is not money, and `15.00%` carries no
 * more information than `15%`.
 */
export function taxPercentLabel(value) {
  const n = toAmount(value)
  if (n == null) return '—'
  return `${n.toLocaleString('en-PH', { maximumFractionDigits: 4 })}%`
}

/** The row's own title: the band. */
export function taxBracketTitle(bracket) {
  return taxBracketRangeLabel(bracket)
}

// ─── Forms ─────────────────────────────────────────────────────────────────

export function emptyTaxBracketForm() {
  return {
    id: null,
    minimum: '',
    maximum: '',
    fixed_tax: '0.00',
    percent_over: '0.00',
  }
}

export function taxBracketToForm(bracket) {
  const text = (value) => (value == null ? '' : String(value))
  return {
    id: bracket?.id ?? null,
    minimum: text(bracket?.minimum),
    maximum: text(bracket?.maximum),
    fixed_tax: text(bracket?.fixedTax),
    percent_over: text(bracket?.percentOver),
  }
}

/**
 * A message worth showing a person, or null when the form can be saved.
 *
 * All four figures are required, matching the endpoint's payload examples: a
 * bracket with a zero fixed tax and a zero rate is a real answer (an exempt
 * band), so it is entered as `0.00` rather than left blank.
 *
 * The band is the thing a bracket cannot be wrong about: an inverted or empty
 * range silently matches nobody, so it is refused here rather than left for a
 * pay run to discover. Overlap between neighbouring brackets is not checked —
 * the server owns that rule, and two overlapping bands are a question about tax
 * policy rather than a malformed form.
 */
export function validateTaxBracketForm(form) {
  const minimum = toAmount(form?.minimum)
  const maximum = toAmount(form?.maximum)
  if (minimum == null) return 'Minimum is required'
  if (maximum == null) return 'Maximum is required'
  if (minimum < 0) return 'Minimum cannot be negative'
  if (maximum < 0) return 'Maximum cannot be negative'
  if (minimum >= maximum) return 'Minimum has to be lower than maximum'

  const percent = toAmount(form?.percent_over)
  if (percent == null) return 'Percent over is required'
  if (percent > 100) return 'Percent over cannot be more than 100'

  // Required rather than defaulted: `0.00` is a legitimate fixed tax, so a blank
  // field means the admin has not answered yet, and sending `''` would let the
  // server decide what that means.
  if (toAmount(form?.fixed_tax) == null) return 'Fixed tax is required'

  for (const [field, label] of [
    ['minimum', 'Minimum'],
    ['maximum', 'Maximum'],
    ['fixed_tax', 'Fixed tax'],
    ['percent_over', 'Percent over'],
  ]) {
    const value = toAmount(form?.[field])
    if (value != null && value < 0) return `${label} cannot be negative`
    // The endpoint stores two decimal places; a third would be refused by the
    // server with a message about the field rather than a readable sentence.
    if (decimalPlaces(form?.[field]) > 2) return `${label} can have at most two decimal places`
  }
  return null
}

/**
 * The write body for a bracket.
 *
 * `company` travels on both create and update, matching the endpoint's
 * documented payload — and it is always the *active* company, never a value
 * from the draft, so a form left open across a workspace switch cannot move the
 * row into another company.
 *
 * Every decimal travels back as the text the admin typed, blanks included.
 */
export function taxBracketPayload(form, { companyId = null } = {}) {
  const payload = {
    minimum: decimalText(form?.minimum),
    maximum: decimalText(form?.maximum),
    fixed_tax: decimalText(form?.fixed_tax),
    percent_over: decimalText(form?.percent_over),
  }
  if (companyId != null) payload.company = companyId
  return payload
}
