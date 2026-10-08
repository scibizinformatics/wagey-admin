/**
 * The salary breakdown behind one employee's payslip in a run.
 *
 * WHY THIS EXISTS. `GET /payroll/admin/employee-payroll-item/{epi_id}/` is the
 * one endpoint that describes what an individual was paid, and it is what
 * `EmployeeDetailDialog` already reads — but that dialog only ever rendered the
 * attendance half of it (days worked, undertime, the daily rows). The money was
 * in the payload and never drawn. This module turns it into the earnings and
 * deductions a funding decision is being made against.
 *
 * WHY IT GUESSES. The response shape is not documented in this repo, and the
 * committed stub (`stubData.js`) predates the money being returned at all, so
 * every field below is an alias rather than a confirmed name. That is why this
 * is a normaliser and not a direct read: it accepts each component under any of
 * the spellings this API family is known to use, ignores an alias it cannot find
 * rather than failing, and — the important part — hands back
 * `unrecognised`, every numeric field it did *not* claim. A wrong guess shows up
 * as an empty section and a list of what actually arrived, instead of a dialog
 * that quietly says "₱0.00".
 *
 * Delete an alias once its real name is confirmed here. Nothing else needs to
 * change: the dialog reads the normalised shape, not the payload.
 */

import { formatCurrency } from 'src/composables/utils/format'

/**
 * Money in, number out.
 *
 * This API family sends figures as decimal strings ("5500.00"), so the naive
 * `Number(v)` is fine but a formatted or already-paginated value is not. A value
 * that cannot be read is `null` rather than `0`, so "we could not read this"
 * never prints as a peso figure that happens to be zero.
 */
export function toAmount(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const cleaned = String(value).replace(/[₱,]/g, '').trim()
  if (cleaned === '') return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

/** Turn a snake_case key into something a person can read in a table. */
function humanise(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

/**
 * The earnings components, in the order a payroll would list them.
 *
 * `total_overtime` is deliberately absent from the overtime aliases: on this
 * endpoint that key is a *duration* ("9h 39m") belonging to the attendance half,
 * and aliasing it here would paint 9 as a peso figure.
 */
const EARNINGS = [
  { label: 'Basic pay', keys: ['basic_pay', 'basic', 'base_pay', 'basic_salary', 'monthly_salary', 'salary'] },
  { label: 'Overtime', keys: ['overtime', 'overtime_pay', 'ot_pay', 'authorized_overtime'] },
  { label: 'Night differential', keys: ['night_diff', 'night_differential', 'night_day_pay'] },
  { label: 'Holiday pay', keys: ['holiday_pay', 'holiday_premium', 'holiday'] },
  { label: '13th month pay', keys: ['thirteenth_month_pay', 'thirteenth_month', 'thirteen_month_pay', '13th_month_pay'] },
  { label: 'Allowances', keys: ['allowances', 'allowance', 'allowance_pay', 'other_allowances'] },
  { label: 'Bonuses', keys: ['bonus', 'bonuses', 'incentives', 'other_earnings'] },
]

/**
 * The deduction components.
 *
 * The bare `deductions` key is NOT here — it is a total, not a line, and
 * counting it as both a row and a total would double every figure. It is read
 * as a total below instead, and used as a fallback row when no component is
 * named.
 */
const DEDUCTIONS = [
  { label: 'Statutory contributions', keys: ['contribution', 'contributions', 'total_contributions', 'statutory_contributions', 'government_contributions'] },
  { label: 'Cash advance', keys: ['cash_advance', 'cash_advances', 'cash_advance_amount', 'approved_cash_advance', 'advance'] },
  { label: 'Absence', keys: ['absence_deduction', 'absent_deduction', 'absence'] },
  { label: 'Late', keys: ['late_deduction'] },
  { label: 'Undertime', keys: ['undertime_deduction'] },
  { label: 'Loan', keys: ['loan_deduction', 'salary_loan'] },
  { label: 'Other deductions', keys: ['other_deductions', 'other_deductions_amount'] },
]

/** Reported totals. None of these is ever rendered as a line item. */
const GROSS_KEYS = ['gross_pay', 'gross', 'total_gross', 'total_gross_pay', 'gross_amount']
const DEDUCTION_TOTAL_KEYS = ['deductions', 'total_deductions', 'deduction', 'total_deduction', 'total_deductions_amount']
const NET_KEYS = ['net_pay', 'net', 'total_net_pay', 'final_amount', 'amount_payable', 'net_amount', 'payable_amount']

/**
 * Fields this endpoint carries that are *not* money.
 *
 * Needed twice: to stop the earnings/deduction sweeps claiming one, and to keep
 * the "what I did not recognise" list to figures a person might actually want to
 * see. An unrecognised list stuffed with `days_worked: 11` is noise that hides
 * the field you were looking for.
 */
const NON_FIGURE_KEYS = new Set([
  'company', 'full_name', 'name', 'employee', 'position', 'position_name', 'department',
  'days_worked', 'absent_days', 'late', 'leaves',
  'total_undertime', 'total_overtime', 'undertime', 'hours_worked', 'work_type',
  'date', 'type', 'description', 'id_number', 'cutoff', 'cutoff_name', 'status',
])

/**
 * Ids, by rule rather than by list.
 *
 * The endpoint's keys for identifiers are the least stable thing about it and the
 * least interesting: this API family names the same id `id`, `epi_id`,
 * `pgi_id` and `payout_group_instance_id` across different routes, and all of
 * them are the same two things in a list of earnings. A first cut enumerated
 * four of them and the fifth printed itself as a peso figure.
 *
 * The *rule* is what holds — anything ending `_id`/`id`/`_ids` is an identifier
 * until proven to be money, and nothing in this API family is both.
 */
const ID_KEY = /(^|_)(id|ids)$/i

/** Where a per-day earnings list might be named. */
const DAY_LIST_KEYS = [
  'days', 'daily', 'daily_earnings', 'daily_breakdown', 'day_breakdown', 'days_breakdown',
  'attendance', 'daily_pay', 'daily_pays',
]

/** How a single day names its own figures. */
const DAY_AMOUNT_KEYS = [
  'amount', 'earnings', 'pay', 'daily_pay', 'net_pay', 'total', 'salary', 'rate', 'pay_amount',
  'gross_amount', 'net_amount', 'computed_pay', 'payroll_amount', 'total_pay', 'amount_paid',
  'daily_earning', 'compensation',
]
const DAY_HOURS_KEYS = ['hours', 'hours_worked', 'worked_hours', 'total_hours', 'ot_hours']
const DAY_DATE_KEYS = ['date', 'day', 'work_date', 'pay_date', 'period']
const DAY_NOTE_KEYS = ['reason', 'note', 'notes', 'type', 'work_type', 'description', 'label', 'status']

/** Where a total hides when the day's money is an object rather than a number. */
const NESTED_TOTAL_KEYS = [
  'total', 'amount', 'net', 'net_pay', 'value', 'subtotal', 'gross', 'earnings', 'pay', 'total_pay',
]

/** First value present for any of `keys`, tried in order. */
function pickFrom(entry, keys) {
  if (!entry || typeof entry !== 'object') return null
  const index = keyIndex(entry)
  for (const key of keys) {
    const actual = index.get(normaliseKey(key))
    if (actual === undefined) continue
    const value = entry[actual]
    if (value === null || value === undefined || value === '') continue
    return value
  }
  return null
}

/** How deep a day's money may hide before this stops being a breakdown. */
const MAX_AMOUNT_DEPTH = 4

/**
 * What one day was paid.
 *
 * Read flat first, then all the way down. The nesting is the likeliest reason a
 * per-day amount shows as an em dash while the endpoint plainly sent one: a day
 * reading `{ date, hours_worked, pay: { gross: { total } } }` has its figure two
 * nodes in, and a lookup that only tries `entry.amount` never reaches it. Depth
 * is capped because past a few nodes this stops being "find the day's total" and
 * starts being an arbitrary pick out of a ledger.
 */
function dayAmount(entry, depth = 0) {
  const flat = toAmount(pickFrom(entry, DAY_AMOUNT_KEYS))
  if (flat !== null) return flat
  const nested = toAmount(pickFrom(entry, NESTED_TOTAL_KEYS))
  if (nested !== null) return nested
  if (depth >= MAX_AMOUNT_DEPTH) return null

  for (const value of Object.values(entry)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const deeper = dayAmount(value, depth + 1)
    if (deeper !== null) return deeper
  }
  return null
}

/**
 * The payload's own shape, rendered.
 *
 * This endpoint is undocumented and its money fields are guesses, so the fastest
 * way to settle a wrong guess is to show what actually arrived. Two views: every
 * top-level key with its type and a short value, and the first day row verbatim.
 * Temporary — removed once the real field names are mapped into the alias lists
 * above, which is the only reason it needs to exist at all.
 */
function payloadDebug(payload, sample) {
  const shape =
    payload && typeof payload === 'object'
      ? Object.entries(payload).map(([key, value]) => ({
          key,
          label: humanise(key),
          type: Array.isArray(value)
            ? `array[${value.length}]`
            : value === null
              ? 'null'
              : typeof value,
          value:
            Array.isArray(value) || (value !== null && typeof value === 'object')
              ? ''
              : String(value ?? ''),
        }))
      : []

  let sampleJson = ''
  try {
    sampleJson = sample ? JSON.stringify(sample, null, 2) : ''
  } catch {
    sampleJson = '// could not be serialised'
  }

  return { shape, sampleJson }
}

/**
 * One representative day row, flattened for display.
 *
 * Exists because "Other figures returned" can only see the payload's top level,
 * and the question this endpoint keeps asking — *why is the amount blank* — is
 * answered by what is inside a day object. Showing the first row's own keys
 * answers it in the dialog instead of in devtools.
 */
function dayFields(entry) {
  if (!entry || typeof entry !== 'object') return []
  return Object.entries(entry).map(([key, value]) => {
    const amount = value !== null && typeof value !== 'object' ? toAmount(value) : null
    return {
      key,
      label: humanise(key),
      value:
        amount !== null
          ? formatCurrency(amount)
          : value === null || value === undefined
            ? '—'
            : Array.isArray(value)
              ? `${value.length} item${value.length === 1 ? '' : 's'}`
              : typeof value === 'object'
                ? 'object'
                : String(value),
    }
  })
}

/**
 * The per-day earnings, if the endpoint sent any.
 *
 * Kept separate from the earnings rows because a day is not a component: it is
 * the evidence for the components. Rows survive with no amount, because a
 * per-day table that silently drops a day the admin can see on their timesheet
 * is worse than one showing an em dash — the shape is confirmed, the figure is
 * not yet read.
 */
function extractDays(payload) {
  const empty = { days: [], sample: null }
  if (!payload || typeof payload !== 'object') return empty

  // Through the case-insensitive index, so `dailyEarnings` resolves the same as
  // `daily_earnings` — a missed list key shows as an absent section, which reads
  // as "no per-day data" rather than "I spelled it wrong".
  const index = keyIndex(payload)
  const list = DAY_LIST_KEYS.map((key) => index.get(normaliseKey(key)))
    .map((actual) => (actual === undefined ? null : payload[actual]))
    .find((candidate) => Array.isArray(candidate) && candidate.length)
  if (!list) return empty

  const days = list
    .map((entry, index) =>
      entry && typeof entry === 'object'
        ? {
            // Always unique. The endpoint's own id is used when it sends one
            // because that is stable across re-fetches, but a list of days with
            // no id — or two entries sharing a date — would collide on it, and
            // Quasar needs the key unique or the table warns and mis-renders.
            key: `${pickFrom(entry, ['id']) ?? index}`,
            date: pickFrom(entry, DAY_DATE_KEYS) ?? '',
            hours: pickFrom(entry, DAY_HOURS_KEYS) ?? '',
            amount: dayAmount(entry),
            note: pickFrom(entry, DAY_NOTE_KEYS) ?? '',
          }
        : null,
    )
    .filter(Boolean)

  const sample = list.find((entry) => entry && typeof entry === 'object') ?? null
  return { days, sample }
}

/** First source that carries money, in order: the object, then its nested halves. */
function sources(payload) {
  return [payload, payload?.earnings, payload?.summary, payload?.earnings_summary, payload?.pay].filter(
    (src) => src && typeof src === 'object' && !Array.isArray(src),
  )
}

/**
 * Key lookup that does not care about case or separators.
 *
 * `key in entry` matched `amount` and missed `Amount`, `dailyPay` and
 * `DAILY_PAY` — and if the day list itself is `dailyEarnings`, the section finds
 * nothing at all and there is no amount to miss. Everything in this module is
 * alias-driven precisely because these names are unconfirmed, so the lookup
 * cannot also be spelling-sensitive or the aliases are pointless.
 *
 * Built once per object and reused for every alias; the first spelling wins, so
 * a payload carrying both `amount` and `Amount` resolves the same way twice
 * rather than depending on key order.
 */
function keyIndex(entry) {
  const index = new Map()
  if (!entry || typeof entry !== 'object') return index
  for (const key of Object.keys(entry)) {
    const norm = normaliseKey(key)
    if (!index.has(norm)) index.set(norm, key)
  }
  return index
}

function normaliseKey(key) {
  return String(key).replace(/[_\s-]/g, '').toLowerCase()
}

/** First readable amount for any of `keys`, searched across every source. */
function pick(srcs, keys) {
  for (const keysToTry of keys) {
    const wanted = normaliseKey(keysToTry)
    for (const src of srcs) {
      if (!src || typeof src !== 'object') continue
      const actual = keyIndex(src).get(wanted)
      if (actual === undefined) continue
      const amount = toAmount(src[actual])
      if (amount !== null) return { amount, key: actual, source: src }
    }
  }
  return null
}

/**
 * Collect an array-shaped breakdown into rows, trying each candidate in turn.
 *
 * Returns `[]` when none of them is a usable list, so callers must test
 * `.length` — an empty array is truthy, which would make an `a || b` chain stop
 * at the first candidate that found nothing.
 */
function rowsFromAnyArray(candidates) {
  for (const list of candidates) {
    if (!Array.isArray(list) || !list.length) continue
    const rows = list
      .map((entry) => ({
        label: entry?.label || entry?.name || entry?.type || humanise(entry?.code || ''),
        amount: toAmount(entry?.amount ?? entry?.value ?? entry?.total),
      }))
      .filter((row) => row.label && row.amount !== null)
    if (rows.length) return rows
  }
  return []
}

/** The last-resort sweep: numeric fields nobody claimed, humanised. */
function unrecognisedFigures(payload, claimed) {
  if (!payload || typeof payload !== 'object') return []
  return Object.entries(payload)
    .filter(([key, value]) => {
      if (claimed.has(key)) return false
      if (ID_KEY.test(key)) return false
      if (NON_FIGURE_KEYS.has(key)) return false
      if (/^(date|created|updated|.*_at|_on)$/.test(key)) return false
      return typeof value === 'number' || (typeof value === 'string' && value !== '' && toAmount(value) !== null)
    })
    .map(([key, value]) => ({ label: humanise(key), amount: toAmount(value), key }))
    .filter((row) => row.amount !== null)
}

/**
 * Everything the dialog draws, derived from one raw response.
 *
 * `fallbackNet` is the row's own `net_pay`, passed in by the page. The table it
 * came from and the item being broken down are the same figure, so when the
 * endpoint does not report one — or reports a different one — this is the
 * number the dialog reconciles against, and a mismatch is shown rather than
 * hidden.
 *
 * @param {object} payload   the `employee-payroll-item` response
 * @param {object} [options]
 * @param {number|string} [options.fallbackNet] net pay from the earners row
 * @returns {{
 *   name: string, position: string, employeeId: string|null,
 *   days: Array<{key: string, date: string, hours: string, amount: number|null, note: string}>,
 *   daysTotal: number|null,
 *   dayFields: Array<{key: string, label: string, value: string}>,
 *   earnings: Array<{label: string, amount: number}>,
 *   deductions: Array<{label: string, amount: number}>,
 *   gross: number|null, totalDeducted: number|null,
 *   net: number|null, reportedNet: number|null, fallbackNet: number|null,
 *   netMatches: boolean|null, drift: number|null,
 *   unrecognised: Array<{label: string, amount: number, key: string}>,
 *   hasFigures: boolean, hasDays: boolean,
 * }}
 */
export function buildSalaryBreakdown(payload, { fallbackNet = null } = {}) {
  const srcs = sources(payload)
  const claimed = new Set()
  const { days, sample } = extractDays(payload)

  const claim = (hit) => {
    if (hit) claimed.add(hit.key)
    return hit ? hit.amount : null
  }

  const collect = (spec) => {
    const rows = []
    for (const { label, keys } of spec) {
      const hit = pick(srcs, keys)
      const amount = claim(hit)
      // A component the endpoint named is a line; one it did not is silence,
      // because a row of zeros reads as "you were paid nothing for this".
      if (amount !== null && amount !== 0) rows.push({ label, amount })
    }
    return rows
  }

  let earnings = rowsFromAnyArray([
    payload?.earnings_breakdown, payload?.salary_breakdown, payload?.earnings, payload?.components,
  ])
  if (!earnings.length) {
    earnings = collect(EARNINGS)
    const gross = claim(pick(srcs, GROSS_KEYS))
    if (!earnings.length && gross !== null) earnings = [{ label: 'Gross pay', amount: gross }]
  }

  const reportedDeductionTotal = claim(pick(srcs, DEDUCTION_TOTAL_KEYS))
  let deductions = rowsFromAnyArray([
    payload?.deductions_breakdown, payload?.deduction_lines, payload?.deduction_components,
  ])
  if (!deductions.length) {
    deductions = collect(DEDUCTIONS)
    if (!deductions.length && reportedDeductionTotal !== null) {
      deductions = [{ label: 'Deductions', amount: reportedDeductionTotal }]
    }
  }

  const reportedGross = earnings.length
    ? earnings.reduce((sum, row) => sum + row.amount, 0)
    : claim(pick(srcs, GROSS_KEYS))

  const reportedNet = claim(pick(srcs, NET_KEYS))
  const fallback = toAmount(fallbackNet)

  // Prefer what the endpoint said; fall back to the table's figure only when it
  // said nothing at all. A disagreement between the two is reported, not
  // averaged away.
  const net = reportedNet ?? fallback ?? null
  const totalDeducted = deductions.length
    ? deductions.reduce((sum, row) => sum + row.amount, 0)
    : reportedDeductionTotal

  const drift =
    net !== null && reportedGross !== null && totalDeducted !== null
      ? reportedGross - totalDeducted - net
      : null

  const netMatches =
    fallback !== null && net !== null ? Math.abs(fallback - net) < 0.005 : null

  return {
    name: payload?.full_name || payload?.name || payload?.employee || '',
    position: payload?.position || payload?.position_name || '',
    employeeId: payload?.employee_id ?? null,
    // The evidence for the earnings above: what each day actually paid. Taken
    // before the earnings sweep so a daily list under `attendance` is never
    // mistaken for an array of components.
    days,
    daysTotal: days.some((day) => day.amount !== null)
      ? days.reduce((sum, day) => sum + (day.amount ?? 0), 0)
      : null,
    // Only surfaced when the days carry no amount: once one is read, the fields
    // of a day object are noise rather than a diagnosis.
    dayFields: days.some((day) => day.amount !== null) ? [] : dayFields(sample),
    // Always available: the shape of what arrived, so a wrong guess above is
    // visible rather than inferred.
    debug: payloadDebug(payload, sample),
    earnings,
    deductions,
    gross: reportedGross,
    totalDeducted: totalDeducted ?? null,
    net,
    reportedNet,
    fallbackNet: fallback,
    netMatches,
    drift,
    unrecognised: unrecognisedFigures(payload, claimed),
    hasFigures: earnings.length > 0 || deductions.length > 0 || net !== null,
    hasDays: days.length > 0,
  }
}

export { formatCurrency }