/**
 * The salary breakdown behind one employee's net pay in a run.
 *
 * WHY THIS EXISTS. The Funding step lists net pay per employee, which is the
 * figure a decision is made on and the one figure that explains nothing. This is
 * the way into how that number was arrived at — the per-day earnings that made it
 * up.
 *
 * WHY IT IS A PLAIN READ. This module used to normalise `…/earnings/` by alias,
 * sweeping the payload for money under any of a dozen spellings, and handing back
 * every field it did *not* claim so a wrong guess would be visible in the dialog
 * rather than print as `₱0.00`. That guessing is gone: every field below is a
 * direct read of a named key, and a field that is missing is missing, which is a
 * different and easier thing to diagnose.
 *
 * WHY IT STILL NAMES TWO KEYS PER FIELD. Because `…/earnings/` has answered in two
 * vocabularies for the same arithmetic. A live response sends the day list as
 * `entries` with `hours`, `gross`, `ut`, `ut_amount`, `net` and the person nested
 * under `employee.name`; the endpoint's own documented schema calls those
 * `daily_earnings`, `total_hours`, `gross_pay`, `undertime_hours`,
 * `undertime_amount`, `net_pay` and `full_name`. Reading only the documented
 * names rendered a populated response as a dialog claiming the employee had no
 * earnings at all. Both spellings are therefore read per field — see
 * `amountFrom`. If a third shape turns up, that is the one place to extend; it
 * is not a reason to reintroduce a sweep.
 *
 * Money still goes through `toAmount`, because this API family sends figures as
 * decimal strings. `null` means "the endpoint did not send this", and `null` is
 * never rendered as `₱0.00` — a zero is a claim, and a missing field is not.
 */

import { formatCurrency } from 'src/composables/utils/format'

/**
 * Money in, number out.
 *
 * This API family sends figures as decimal strings ("5500.00"), so the naive
 * `Number(v)` is fine but a formatted value is not. A value that cannot be read
 * is `null` rather than `0`, so "we could not read this" never prints as a peso
 * figure that happens to be zero.
 */
export function toAmount(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const cleaned = String(value).replace(/[₱,]/g, '').trim()
  if (cleaned === '') return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

/** Sum a numeric field across rows, or `null` when no row carries one. */
function total(rows, key) {
  let sum = 0
  let seen = false
  for (const row of rows) {
    const value = row[key]
    if (value === null || value === undefined) continue
    sum += value
    seen = true
  }
  return seen ? sum : null
}

/**
 * First value present under any of `keys`, read as money.
 *
 * This endpoint answers in two vocabularies for the same arithmetic: the list is
 * `entries` and a day spells its hours `hours` and its gross `gross`, while the
 * endpoint's own documented schema calls the same fields `daily_earnings`,
 * `total_hours` and `gross_pay`. Both are in circulation, so each figure is read
 * under both names rather than one being pinned at the cost of the other — which
 * is exactly what happened when only the documented names were read and a live
 * response rendered as an empty dialog.
 *
 * An unreadable value is `null`, not `0`: "the endpoint sent nothing here" and
 * "this employee earned nothing here" are different claims.
 */
function amountFrom(entry, ...keys) {
  for (const key of keys) {
    const amount = toAmount(entry?.[key])
    if (amount !== null) return amount
  }
  return null
}

/**
 * The per-day earnings, one row per day.
 *
 * A day with no figure for a column keeps the row and renders an em dash: a
 * per-day table that silently drops a day the admin can see on their timesheet is
 * worse than one showing a blank. The row key is the date, which is unique per
 * run and stable across re-fetches — Quasar needs it unique or the table warns
 * and mis-renders.
 */
function extractDaily(payload) {
  const list = Array.isArray(payload?.entries)
    ? payload.entries
    : Array.isArray(payload?.daily_earnings)
      ? payload.daily_earnings
      : null
  if (!list) return []

  return list
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => ({
      key: entry.date ?? `day-${index}`,
      date: entry.date ?? '',
      hours: amountFrom(entry, 'hours', 'total_hours'),
      hourlyRate: amountFrom(entry, 'rate_per_hour', 'hourly_rate'),
      dailyRate: amountFrom(entry, 'rate_per_day', 'daily_rate'),
      ctoHours: amountFrom(entry, 'cto', 'cto_offset_hours'),
      otHours: amountFrom(entry, 'ot', 'ot_hours'),
      undertimeHours: amountFrom(entry, 'ut', 'undertime_hours'),
      gross: amountFrom(entry, 'gross', 'gross_pay'),
      ot: amountFrom(entry, 'ot_amount'),
      nd: amountFrom(entry, 'nd_amount'),
      undertime: amountFrom(entry, 'ut_amount', 'undertime_amount'),
      net: amountFrom(entry, 'net', 'net_pay'),
    }))
}

/**
 * Everything the dialog draws, derived from one raw response.
 *
 * `fallbackNet` is the row's own `net_pay`, passed in by the page. The table it
 * came from and the item being broken down are the same figure, so the days'
 * net is reconciled against it and a disagreement is shown rather than hidden —
 * the sum of a person's days should come to the net they are about to be paid.
 *
 * @param {object} payload   the `employee-payroll-item/…/earnings/` response
 * @param {object} [options]
 * @param {number|string} [options.fallbackNet] net pay from the earners row
 * @returns {{
 *   name: string, position: string, employeeId: string|null, cutoff: string,
 *   daily: Array<object>,
 *   totals: {gross: number|null, ot: number|null, nd: number|null,
 *            undertime: number|null, net: number|null},
 *   summary: object|null, issues: Array<object>,
 *   net: number|null, reportedNet: number|null, fallbackNet: number|null,
 *   netMatches: boolean|null, drift: number|null,
 *   hasFigures: boolean, hasDays: boolean,
 * }}
 */
export function buildSalaryBreakdown(payload, { fallbackNet = null } = {}) {
  const daily = extractDaily(payload)
  const totals = {
    gross: total(daily, 'gross'),
    ot: total(daily, 'ot'),
    nd: total(daily, 'nd'),
    undertime: total(daily, 'undertime'),
    net: total(daily, 'net'),
  }

  const reportedNet = totals.net
  const fallback = toAmount(fallbackNet)

  // Prefer what the endpoint said; fall back to the table's figure only when it
  // said nothing at all — an employee with no daily rows is a real case, and the
  // row's net is the better answer than nothing.
  const net = reportedNet ?? fallback ?? null

  // Only meaningful when both sides exist: the drift between the days and a net
  // the endpoint never reported is not an arithmetic failure.
  const drift = reportedNet !== null && fallback !== null ? reportedNet - fallback : null

  return {
    // This endpoint nests the person as an object and spells it `employee.name`;
    // the documented schema carries `full_name` beside `position` instead. Both
    // are read so the header is never blank when one of them answers.
    name: payload?.employee?.name || payload?.full_name || '',
    position: payload?.position || '',
    employeeId: payload?.employee?.id ?? payload?.employee_id ?? null,
    // Which cutoff this run settles. There is no position on this payload, so the
    // period is the one thing that actually distinguishes one item's breakdown
    // from another's in the header.
    cutoff: payload?.cutoff?.name || '',
    daily,
    totals,
    summary: payload?.summary && typeof payload.summary === 'object' ? payload.summary : null,
    issues: Array.isArray(payload?.issues) ? payload.issues.filter(Boolean) : [],
    net,
    reportedNet,
    fallbackNet: fallback,
    netMatches:
      reportedNet !== null && fallback !== null ? Math.abs(reportedNet - fallback) < 0.005 : null,
    drift,
    hasFigures: daily.length > 0 || totals.net !== null,
    hasDays: daily.length > 0,
  }
}

export { formatCurrency }
