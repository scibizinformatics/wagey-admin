/**
 * Status → design-system chip tone.
 *
 * Replaces a private palette of hex triples (`{ bg, text, dot }`) that existed
 * nowhere else in the app. `tone` names a `.dash-chip--*` modifier from
 * src/css/dashboard.scss, so a payroll status chip now matches every other
 * status chip in the product.
 *
 * Note the old table also carried a `text` colour that StatusPill never applied —
 * it set only `backgroundColor` — so a "disputed" pill rendered a red tint behind
 * default dark text. Using shared classes removes that class of bug: tint, ring
 * and text always travel together.
 */

/** good | warn | critical | info | violet | neutral */
export const STATUS_TONES = {
  // ── Neutral / not started ──
  draft: 'neutral',
  pending: 'neutral',
  not_applicable: 'neutral',

  // ── Needs a person ──
  needs_attention: 'warn',
  pending_review: 'warn',
  missing_date: 'warn',
  // The same condition, spelled two ways by one endpoint. On the disbursement
  // review step the overview counter is `missing_date`, but the row's own
  // `review_status` arrives as the display string "Missing Data" — and
  // `statusTone` lower-cases and underscore-writes it to `missing_data`. With
  // only the first spelling mapped, that row fell through to the neutral
  // default and rendered grey on a page whose tile counts it as a warning.
  missing_data: 'warn',
  disbursing: 'warn',
  // Contributions: a department that has not finished collecting for the month.
  incomplete: 'warn',

  // ── In flight ──
  under_review: 'info',
  awaiting_acknowledgment: 'violet',
  ready_for_funding: 'violet',

  // ── Settled ──
  reviewed: 'good',
  approved: 'good',
  acknowledged: 'good',
  funded: 'good',
  disbursed: 'good',
  complete: 'good',
  completed: 'good',
  claimed: 'good',
  paid: 'good',

  // ── Wrong ──
  disputed: 'critical',
  failed: 'critical',
  rejected: 'critical',
}

export function statusTone(status) {
  if (!status) return 'neutral'
  return STATUS_TONES[String(status).toLowerCase().replace(/\s+/g, '_')] ?? 'neutral'
}
