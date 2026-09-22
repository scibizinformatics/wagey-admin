/**
 * Leave requests — the shared reading of `GET /attendance/leave-list/`.
 *
 * The payload gives the same span two readings that disagree precisely when it
 * matters:
 *
 *   - `total_days` is how many calendar days the request touches. A half day
 *     still touches one date, so it reports `1`;
 *   - `total_day_value` is the accrued value of the request. Half days count
 *     `0.5`, so the same request reports `"0.50"` — which is the figure a
 *     ledger deducts.
 *
 * The `days` array carries the per-date flag underneath (`is_half_day`), but
 * the table only ever shows the request as one span, and `total_day_value` is
 * already the sum of those flags. Displaying `total_days` therefore shows a
 * half-day request as a full one. `leaveRequestDurationLabel` reads the value
 * first so the table, the details modal and any future consumer all say the
 * same number.
 */

import { formatDays } from 'src/composables/utils/leaveTypes'

/**
 * How long a leave request runs, as the number the ledger counts.
 *
 * `total_day_value` wins when present — it is the only field that distinguishes
 * `total_days: 1` at half pay from a full day. It falls back to `total_days`,
 * then to hours, then to a placeholder, in the order the old inline mapping
 * tried them, so full-day rows and hourly requests render exactly as before.
 */
export function leaveRequestDurationLabel(item) {
  if (!item || typeof item !== 'object') return 'N/A'

  const value = item.total_day_value
  if (value !== null && value !== undefined && value !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return `${formatDays(value)} day(s)`
  }

  if (item.total_days != null) {
    const parsed = Number(item.total_days)
    if (Number.isFinite(parsed)) return `${parsed} day(s)`
  }

  if (item.hours !== null && item.hours !== undefined && item.hours !== '') {
    return `${item.hours}h`
  }

  return 'N/A'
}