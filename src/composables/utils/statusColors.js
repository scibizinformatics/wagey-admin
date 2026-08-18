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
  disbursing: 'warn',

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
