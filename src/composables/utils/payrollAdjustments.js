/**
 * The manual adjustments on one employee payroll item.
 *
 * An adjustment is money a person decided rather than money the law required: a
 * bonus, a loan repayment, a correction. The endpoint answers with the item's own
 * totals *and* the rows behind them, and this module keeps the two from being
 * summed independently — a client that re-added the rows to reach
 * `total_deductions` would eventually disagree with the server about whether a
 * reverted row counts, and that disagreement would be a wrong number on a payroll.
 *
 * So: totals are read from the payload, never recomputed. The rows are only
 * labelled, toned and — not reordered. The endpoint already sends them newest
 * first (the sample has `id` 2 ahead of `id` 1, applied a minute later), and
 * sorting by id or by timestamp here would be a second opinion about an order the
 * server is better placed to set.
 */

import { formatCurrencyPrecise } from 'src/composables/utils/format'

/** The two things an adjustment can be, and how each reads. */
export const ADJUSTMENT_TYPES = [
  { value: 'addition', label: 'Addition', tone: 'good', icon: 'o_add_circle' },
  { value: 'deduction', label: 'Deduction', tone: 'danger', icon: 'o_remove_circle' },
]

/**
 * Decimal strings ("2000.00") arrive from the API. `null` rather than 0 for an
 * unreadable value, so a missing amount can never be shown as ₱0.00 — which would
 * read as "this adjustment was for nothing" instead of "we could not read it".
 */
export function toAmount(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const cleaned = String(value).replace(/[₱,]/g, '').trim()
  if (cleaned === '') return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

/** The type descriptor for a row, falling back to the raw value rather than a guess. */
export function adjustmentType(type) {
  const key = String(type || '').trim().toLowerCase()
  const known = ADJUSTMENT_TYPES.find((t) => t.value === key)
  if (known) return known
  return {
    value: key,
    label: key ? key.charAt(0).toUpperCase() + key.slice(1) : '—',
    tone: 'neutral',
    icon: 'o_tune',
  }
}

/**
 * Whether an adjustment is still in force.
 *
 * `reverted` is the only end state the endpoint documents, so that is what is
 * tested. An unrecognised status is treated as **applied**: it is on the payslip,
 * and quietly hiding money that was actually taken off — or quietly offering to
 * revert something that cannot be — is the worse of the two mistakes.
 */
export function isApplied(adjustment) {
  return String(adjustment?.status || '').trim().toLowerCase() !== 'reverted'
}

/** One row, ready to render. Never invents a label it was not given. */
function normalizeRow(raw) {
  const type = adjustmentType(raw?.type)
  const applied = isApplied(raw)
  return {
    id: raw?.id ?? null,
    type: type.value,
    typeLabel: type.label,
    typeTone: type.tone,
    typeIcon: type.icon,
    category: String(raw?.category ?? '').trim(),
    description: String(raw?.description ?? '').trim(),
    amount: toAmount(raw?.amount),
    status: String(raw?.status ?? '').trim(),
    applied,
    appliedBy: String(raw?.applied_by ?? '').trim(),
    appliedAt: raw?.applied_at ?? null,
    revertedBy: String(raw?.reverted_by ?? '').trim(),
    revertedAt: raw?.reverted_at ?? null,
  }
}

/**
 * The whole payload, split into what reads and what is spent.
 *
 * Reverted rows are kept rather than filtered: they are the record of why a
 * figure is *not* on this payslip, and a reader checking a number wants to see
 * the entry that used to be there. `appliedRows` is what the UI acts on.
 *
 * @param {object} payload the `epi-adjustments` response
 * @returns {{
 *   rows: Array<object>, appliedRows: Array<object>,
 *   manualAdditions: number|null, manualDeductions: number|null,
 *   totalDeductions: number|null, netPay: number|null,
 *   hasAny: boolean,
 * }}
 */
export function normalizeAdjustments(payload) {
  const list = Array.isArray(payload?.adjustments) ? payload.adjustments : []
  const rows = list
    .map(normalizeRow)
    .filter((row) => row.id !== null)

  return {
    rows,
    appliedRows: rows.filter((row) => row.applied),
    // Totals are the server's. See the module header for why.
    manualAdditions: toAmount(payload?.manual_additions),
    manualDeductions: toAmount(payload?.manual_deductions),
    totalDeductions: toAmount(payload?.total_deductions),
    netPay: toAmount(payload?.net_pay),
    hasAny: rows.length > 0,
  }
}

/**
 * The sign a row's amount should read with, as text.
 *
 * An addition adds, a deduction takes — and a reverted one is neither, because it
 * is no longer in force. Rendered as a leading `+` / `−` rather than colour alone,
 * so the direction survives a screenshot or a printed payroll.
 */
export function signedAmount(row) {
  if (row?.amount === null || row?.amount === undefined) return '—'
  const sign = !row.applied ? '' : row.type === 'addition' ? '+' : '−'
  return sign + formatCurrencyPrecise(row.amount)
}

/** Whether a typed apply-form body is complete enough to send. */
export function isValidAdjustment(form) {
  if (!form) return false
  const type = String(form.type || '').trim().toLowerCase()
  if (type !== 'addition' && type !== 'deduction') return false
  const amount = toAmount(form.amount)
  return amount !== null && amount > 0
}