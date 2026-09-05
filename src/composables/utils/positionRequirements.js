/**
 * Site position requirements — the shared reading of
 * `GET /organization/sites/{site_id}/position-requirements/`.
 *
 * A requirement is one line of "this site needs N of this position":
 *
 *   { id, site, position_id, quantity_needed, effective_from, effective_to,
 *     is_active }
 *
 * Three things about the payload drive the helpers below.
 *
 * First, the row names a position by id only. The list endpoint never sends a
 * position name, so every renderer has to resolve it against the company's
 * positions — which is why `normalizeRequirement` takes a lookup rather than
 * each caller doing its own `positions.find(...)` and disagreeing about what to
 * print when the position has since been deleted.
 *
 * Second, a requirement is dated. `effective_from` / `effective_to` bound the
 * window it applies to and `effective_to` is legitimately null, meaning
 * open-ended. A row that is `is_active` but whose window has closed is history,
 * not a target — so "how many does this site need" has to be asked about a
 * particular day, never about the raw list length.
 *
 * Third, and following from that: an absent requirement is not a requirement of
 * zero. A site with no line for a position has no target set for it, the same
 * distinction `composables/utils/manning.js` keeps for `has_requirement`. The
 * summary below therefore reports `hasAny` separately from the totals, so the
 * table can print an em dash for "nothing set" instead of a confident 0.
 *
 * These live in utils because the Sites table column and the requirements
 * dialog both render the same figures; the same arithmetic copied into both is
 * how a column ends up disagreeing with the dialog it opens.
 */

/** A count. Anything unparseable is 0. */
function num(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Today, in the browser's own calendar — not UTC, which is a day off past 4pm here. */
export function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Ids cross the wire as numbers in this payload and as strings in others. */
export function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

/**
 * Is this requirement in force on `isoDate`?
 *
 * Both bounds are inclusive and both are optional: no `effective_from` means it
 * has always applied, no `effective_to` means it still does. ISO dates compare
 * correctly as strings, so no Date parsing (and no timezone) is involved.
 */
export function isEffectiveOn(requirement, isoDate = todayIso()) {
  if (!requirement?.isActive) return false
  if (requirement.effectiveFrom && requirement.effectiveFrom > isoDate) return false
  if (requirement.effectiveTo && requirement.effectiveTo < isoDate) return false
  return true
}

/**
 * One API row into the shape every renderer reads.
 *
 * @param {object} raw           a row from the list endpoint
 * @param {Array}  positions     the company's positions, `[{ id, name }]`
 * @param {string} isoDate       the day `effective` is judged against
 */
export function normalizeRequirement(raw, positions = [], isoDate = todayIso()) {
  const positionId = raw?.position_id ?? raw?.position ?? null
  const match = positions.find((p) => sameId(p.id, positionId))

  const requirement = {
    id: raw?.id ?? null,
    siteId: raw?.site ?? null,
    positionId,
    // A requirement can outlive the position it names. Saying so is better than
    // printing a bare id or an empty cell, either of which reads as a bug.
    positionName: match?.name || (positionId != null ? `Position #${positionId}` : 'Unknown'),
    positionMissing: !match,
    quantityNeeded: num(raw?.quantity_needed),
    effectiveFrom: raw?.effective_from || null,
    effectiveTo: raw?.effective_to || null,
    isActive: raw?.is_active !== false,
  }

  requirement.effective = isEffectiveOn(requirement, isoDate)
  return requirement
}

/** A whole response, newest-looking rows last — the API's own order is kept. */
export function normalizeRequirements(rows, positions = [], isoDate = todayIso()) {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizeRequirement(row, positions, isoDate))
}

/**
 * What the Sites table column and the dialog header both say about a site.
 *
 * Counts only the requirements in force today: an expired or deactivated line
 * is not a target the site is currently held to. `hasAny` reports whether the
 * site has any requirement at all, which is what separates "no target set"
 * (em dash) from "targets set, none current" (0).
 */
export function summarizeRequirements(requirements = []) {
  const effective = requirements.filter((r) => r.effective)
  return {
    hasAny: requirements.length > 0,
    total: requirements.length,
    positions: effective.length,
    headcount: effective.reduce((sum, r) => sum + r.quantityNeeded, 0),
  }
}

/** "From 30 Aug 2026", "Until 30 Sep 2026", "30 Aug – 30 Sep 2026", or "Always". */
export function formatEffectiveWindow(requirement) {
  const day = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return iso
    return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const from = day(requirement?.effectiveFrom)
  const to = day(requirement?.effectiveTo)
  if (from && to) return `${from} – ${to}`
  if (from) return `From ${from}`
  if (to) return `Until ${to}`
  return 'Always'
}
