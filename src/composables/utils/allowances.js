/**
 * Allowance-type readings shared by the Allowances page's table, card list and
 * form dialog. Keeping them here means the three renderers cannot each invent
 * their own label for the same payout policy or tax flag.
 *
 * The API answers `payout_policy` as a fixed enum token and `payout_policy_display`
 * as the server's label for the row. The select in the form dialog needs the
 * value→label pairs on its own, so extend `PAYOUT_POLICY_OPTIONS` as the backend
 * adds policies — never invent a new option inside a component.
 */

export const PAYOUT_POLICY_OPTIONS = [
  { value: 'equal_half', label: 'Equal half per cutoff' },
]

/** Label for a policy token; prefers the row's own display value when sent. */
export function payoutPolicyLabel(policy, display) {
  if (display) return display
  const match = PAYOUT_POLICY_OPTIONS.find((opt) => opt.value === policy)
  return match?.label ?? (policy ?? '—')
}

/** The screen reads `is_taxable` as a noun, not a flag, in both the table and the cards. */
export function taxableLabel(isTaxable) {
  return isTaxable ? 'Taxable' : 'Non-taxable'
}

/**
 * One row of an employee's allowance list (the employee 3-dot menu's "Assign
 * allowance" dialog reads `GET /allowance/.../employee/{id}/`).
 *
 * The whole payload travels as decimal strings — `amount: "573.9"` — so the
 * readings below keep both sides of the coin: a Number for display and the raw
 * string for a write, since PATCH round-trips the amount verbatim and sending
 * a reformatted number can change trailing precision the admin never saw.
 */
export function normalizeEmployeeAllowance(row = {}) {
  const type = row.allowance_type ?? {}
  return {
    id: row.id ?? null,
    typeId: type.id ?? null,
    typeName: type.name || 'Allowance',
    taxable: Boolean(type.is_taxable),
    policy: type.payout_policy ?? null,
    policyLabel: payoutPolicyLabel(type.payout_policy, type.payout_policy_display),
    /** Raw decimal string, exactly as the server sent it — for PATCH round-trip. */
    amountRaw: String(row.amount ?? ''),
    amount: Number(row.amount ?? 0),
    effectiveDate: row.effective_date ?? null,
    isActive: Boolean(row.is_active),
  }
}