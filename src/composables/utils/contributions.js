/**
 * Shared arithmetic and tone rules for the Contributions page.
 *
 * The three summaries (annual / employee / department) report the same pair of
 * figures under different names — what was due and what was actually deducted —
 * and both the tables and the tablet card list need to derive the collected
 * share from them the same way. Keeping the ratio and its thresholds here stops
 * the page, its three tables and its card list from each inventing their own.
 */

/** What the row was due, in employee-share terms, across the three payloads. */
export function dueOf(row) {
  return num(row?.total_contribution_due_employee_share ?? row?.total_contributions_due)
}

/** What was actually deducted from the employee. */
export function deductedOf(row) {
  return num(row?.total_deduction_employee_share ?? row?.total_deduction)
}

/** What is still outstanding. */
export function balanceOf(row) {
  return num(row?.undeducted_balance_employee_share ?? row?.balance)
}

export function num(val) {
  const n = Number(val ?? 0)
  return Number.isFinite(n) ? n : 0
}

/**
 * Deducted as a percentage of due. `null` when nothing was due — a period with
 * no obligation is not 0% collected, it has no rate at all, and showing an empty
 * red bar for it would read as a failure.
 */
export function collectedPct(deducted, due) {
  const d = num(due)
  if (d <= 0) return null
  return (num(deducted) / d) * 100
}

/**
 * Collected share → status tone, in four bands so the fill colour tracks the
 * percentage rather than painting almost every row the same green.
 *
 *   >= 99.5   good      settled — the period is collected
 *   80–99.4   info      on track, still collecting; normal mid-cutoff state
 *   50–79.9   warn      behind — a real shortfall, but not yet alarming
 *   < 50      critical  materially short
 *   no due    neutral   nothing was owed, so there is no rate to read
 *
 * The middle band exists because the previous three-band scale treated anything
 * under 99.5% as a warning: a department at 96% and one at 40% both went amber,
 * which is the same as having no scale. All four are drawn from the reserved
 * status ramp (never the categorical series), and the percentage is always
 * printed beside the bar, so the reading never rests on colour alone.
 */
export function collectedTone(pct) {
  if (pct == null) return 'neutral'
  if (pct >= 99.5) return 'good'
  if (pct >= 80) return 'info'
  if (pct >= 50) return 'warn'
  return 'critical'
}

/** Sum a field across rows, tolerating strings and nulls from the API. */
export function sumBy(rows, pick) {
  return (rows ?? []).reduce((total, row) => total + num(pick(row)), 0)
}

/**
 * Whole pesos, for summary tiles. Centavos are shown in the tables, where a
 * figure is a record; a tile is a reading and two decimals there only make the
 * headline number harder to scan.
 */
export function formatPesoRounded(val) {
  return '₱' + Math.round(num(val)).toLocaleString('en-PH')
}

/**
 * Stable identity colour for a name, from the design system's categorical ramp.
 * Used for the department marks and the per-contribution marks in the employee
 * breakdown, so the same contribution keeps the same colour down the page.
 */
const MARKS = [
  'var(--dash-cat-1)',
  'var(--dash-cat-2)',
  'var(--dash-cat-3)',
  'var(--dash-cat-4)',
  'var(--dash-cat-5)',
  'var(--dash-cat-6)',
]

export function markForName(name) {
  const text = String(name ?? '')
  if (!text) return MARKS[0]
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  return MARKS[Math.abs(hash) % MARKS.length]
}
