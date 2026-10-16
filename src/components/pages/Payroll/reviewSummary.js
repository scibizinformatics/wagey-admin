/**
 * Readings of the payroll review summary's `absent_days`, for the two dialogs that
 * print it directly beside `days_worked`.
 *
 * `absent_days` is named like a day count and is not one. It matches the number of
 * `absent` entries in `issues`, and those entries repeat per **shift**: in a real
 * payload a single date carries two byte-identical `Absent Without Leave` rows, and
 * six dates appear in `days_worked` *and* `absent_days` at once. So one employee
 * reported 13 absences spanning 8 dates, while `days_worked` — whose row count
 * happens to equal its date count, since no worked date carries two `Work` rows —
 * was 10. The pair cannot be added up against the 15-day cutoff either way: 10 + 13
 * is 23 dates, and even in days 10 + 8 is 18, because those six dates are counted
 * twice.
 *
 * Nothing here recomputes the figure. The endpoint owns `absent_days`, and a tile
 * that quietly printed a different number than `summary` would be a worse lie than
 * one that names its own unit. What is added is the date span the record count
 * hides, so a reader who wants days can see them without the endpoint's number
 * being contradicted.
 */

/**
 * Tooltip for the absence tile's label.
 *
 * Says what the number is rather than what went wrong, and points at the tile
 * beside it — because the honest complaint about this figure is that the two
 * attendance tiles cannot be reconciled, which is only visible side by side.
 */
export const ABSENT_SHIFTS_TIP =
  'One absence per shift, not per day — a date can carry more than one, which is why this does not add up to "Days worked" beside it.'

/**
 * The dates `absent_days` spans, as the tile's sub-line.
 *
 * Counted from `issues` rather than from `attendance` because `absent_days` counts
 * those entries: this is the day count of the very same records the figure above it
 * totals, not a second tally sourced differently and free to disagree with it.
 *
 * Returns `''` whenever the sub-line would add nothing, or would say something it
 * cannot stand behind — no absences, an unreadable `absent_days`, an `issues` array
 * that did not arrive (so there are no dates to count), or a span that already
 * equals the figure, where repeating it is noise.
 *
 * @param {{ absent_days?: number }} [summary] The endpoint's `summary` object.
 * @param {Array<{ type?: string, date?: string }>} [issues] The endpoint's `issues` array.
 * @returns {string} e.g. `across 8 days`, or `''` when there is nothing to add.
 */
export function absentDaySpanLabel(summary, issues) {
  const records = Number(summary?.absent_days)
  if (!Number.isFinite(records) || records <= 0) return ''
  if (!Array.isArray(issues) || !issues.length) return ''
  const dates = new Set()
  for (const issue of issues) {
    if (!issue || typeof issue !== 'object') continue
    if (issue.type !== 'absent') continue
    const date = String(issue.date ?? '').trim()
    if (date) dates.add(date)
  }
  if (!dates.size || dates.size === records) return ''
  return `across ${dates.size} ${dates.size === 1 ? 'day' : 'days'}`
}