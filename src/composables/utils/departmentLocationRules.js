/**
 * Department location rules — the shared reading of
 * `GET /organization/departments/{department_id}/location-rule/`.
 *
 * A rule caps how many **on-site** and **off-site** shifts one department's
 * employees may hold per period, and can additionally restrict which days a
 * swap may land on:
 *
 *   { id, department, department_name, period_type, on_site, off_site,
 *     is_active, allowed_swap_days, swap_block_holidays }
 *
 * It is a hard block, checked everywhere an assignment is created — manual
 * assign, recurring/auto-assign, reassignment and swap approval — so the
 * wording on screen has to read as a ceiling, not a target. That is the
 * opposite of the site position requirements in the same Admin Settings screen
 * (`composables/utils/positionRequirements.js`), which say how many people a
 * site *should* have; confusing the two is the easiest mistake to make here.
 *
 * Six things about the payload drive the helpers below.
 *
 * First, **0 means no limit, not a limit of zero.** It is the field's default,
 * so a rule saved with `off_site: 0` blocks nothing off-site — a renderer that
 * prints the raw number says "0 off-site shifts allowed" about a department
 * with no off-site restriction at all. Everything below goes through
 * `limitLabel` / `hasCap` rather than reading the number directly.
 *
 * Second, **a rule restricts nothing only when it has no cap *and* no swap
 * restriction.** A rule with both caps at 0 is legitimate as long as it narrows
 * swaps (`allowed_swap_days` off `"any"`, or `swap_block_holidays` on), so
 * `validateLocationRule` rejects only the genuinely toothless rule.
 *
 * Third, **no rule and an inactive rule both mean "no restriction"** — but for
 * different reasons, and only one of them is something an admin set up and can
 * switch back on. `summarizeLocationRule` reports them as distinct states so
 * the table can say "Paused" for a disabled rule and an em dash for a
 * department that never had one.
 *
 * Fourth, **it counts shifts, not days.** A day carrying two shifts spends two
 * credits, and OFF / leave shifts and shifts with no site never spend any. The
 * labels say "shifts" for that reason; "4 days on-site" would be wrong for any
 * department that runs split shifts.
 *
 * Fifth, **the period is part of the limit.** 4 per week and 4 per month are
 * different rules, so no figure from this payload is meaningful without its
 * period — which is why the summary and the sentence both carry it.
 *
 * Sixth, **the server caps a period at the days it holds** — a weekly rule
 * cannot promise more than seven shifts, a semi-monthly one more than fifteen —
 * and on-site plus off-site together cannot exceed that same ceiling.
 * `validateLocationRule` restates that before the round trip, because a 400 on
 * submit is a worse way to learn it.
 *
 * One thing the payload does not say, worth knowing when explaining the rule to
 * an admin: an employee's department comes from their *active employment
 * contract* on the schedule date, not from any roster this screen can see.
 */

/**
 * The shifts each period can hold — the ceiling the server enforces. Also
 * exported through `maxShiftsFor`, which tolerates an unknown period.
 */
const PERIOD_MAX = {
  weekly: 7,
  bi_weekly: 14,
  semi_monthly: 15,
  monthly: 31,
  annual: 366,
}

/** How a period is measured. Order is the order the picker offers them in. */
export const PERIOD_TYPES = [
  {
    value: 'weekly',
    label: 'Week',
    short: 'week',
    noun: 'week',
    hint: 'Monday to Sunday.',
  },
  {
    value: 'bi_weekly',
    label: 'Bi-weekly',
    short: '2 weeks',
    noun: '2-week period',
    hint: 'A fortnight. The server decides where each one starts.',
  },
  {
    value: 'semi_monthly',
    label: 'Semi-monthly',
    short: 'half-month',
    noun: 'half-month',
    hint: 'The 1st–15th and 16th–end of each month.',
  },
  {
    value: 'monthly',
    label: 'Calendar month',
    short: 'month',
    noun: 'month',
    hint: 'The 1st to the last day of the month.',
  },
  {
    value: 'annual',
    label: 'Annual',
    short: 'year',
    noun: 'year',
    hint: 'The calendar year.',
  },
]

const DEFAULT_PERIOD = 'weekly'

function periodEntry(periodType) {
  return PERIOD_TYPES.find((p) => p.value === periodType) || PERIOD_TYPES[0]
}

/** "Week", "Bi-weekly", "Calendar month". */
export function periodLabel(periodType) {
  return periodEntry(periodType).label
}

/** "per week", "per 2 weeks", "per month" — the form a limit is read in. */
export function perPeriodLabel(periodType) {
  return `per ${periodEntry(periodType).short}`
}

/** The most shifts this period can hold. Unknown periods fall back to weekly. */
export function maxShiftsFor(periodType) {
  return PERIOD_MAX[periodType] ?? PERIOD_MAX[DEFAULT_PERIOD]
}

/** Which days a swap may land on. */
export const SWAP_DAY_OPTIONS = [
  {
    value: 'any',
    label: 'Any day',
    hint: 'No restriction on the day a swap falls on.',
  },
  {
    value: 'weekdays',
    label: 'Weekdays only',
    hint: 'A swap may only land Monday to Friday.',
  },
  {
    value: 'weekends',
    label: 'Weekends only',
    hint: 'A swap may only land Saturday or Sunday.',
  },
]

export const DEFAULT_ALLOWED_SWAP_DAYS = 'any'

/** "Any day", "Weekdays only", "Weekends only". */
export function swapDaysLabel(value) {
  return SWAP_DAY_OPTIONS.find((o) => o.value === value)?.label || SWAP_DAY_OPTIONS[0].label
}

/** A whole, non-negative count. Anything else is 0, which reads as "no limit". */
function count(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.trunc(parsed)
}

/** Is this number an actual ceiling? 0 is the API's "no limit". */
export function hasCap(value) {
  return count(value) > 0
}

/** "4 shifts", "1 shift", or "No limit" for the 0 the API uses to mean unbounded. */
export function limitLabel(value) {
  const n = count(value)
  if (n <= 0) return 'No limit'
  return `${n} ${n === 1 ? 'shift' : 'shifts'}`
}

/**
 * One API row into the shape every renderer reads. `null` in, `null` out — the
 * endpoint answers with null for a department that has no rule, and that is a
 * real answer rather than a missing one.
 *
 * A legacy `period_type` of `"cutoff"` is no longer in the enum and normalizes
 * to the weekly default. The two were never equivalent, so a visible reset
 * beats a silent mapping onto a period the admin did not choose.
 */
export function normalizeLocationRule(raw) {
  if (!raw || typeof raw !== 'object') return null

  const periodType = PERIOD_TYPES.some((p) => p.value === raw.period_type)
    ? raw.period_type
    : DEFAULT_PERIOD

  const onSite = count(raw.on_site)
  const offSite = count(raw.off_site)
  const isActive = raw.is_active !== false

  const allowedSwapDays = SWAP_DAY_OPTIONS.some((o) => o.value === raw.allowed_swap_days)
    ? raw.allowed_swap_days
    : DEFAULT_ALLOWED_SWAP_DAYS
  const swapBlockHolidays = raw.swap_block_holidays === true

  const capsOnSite = onSite > 0
  const capsOffSite = offSite > 0
  const restrictsSwapDays = allowedSwapDays !== DEFAULT_ALLOWED_SWAP_DAYS
  const restrictsSwaps = restrictsSwapDays || swapBlockHolidays

  return {
    id: raw.id ?? null,
    departmentId: raw.department ?? null,
    departmentName: raw.department_name || '',
    periodType,
    periodLabel: periodLabel(periodType),
    onSite,
    offSite,
    isActive,
    allowedSwapDays,
    swapBlockHolidays,
    capsOnSite,
    capsOffSite,
    restrictsSwapDays,
    restrictsSwaps,
    // Set up, switched on, and actually holding something back. A rule can be
    // all three of present, active and toothless at once (no caps, no swap
    // restriction).
    enforcing: isActive && (capsOnSite || capsOffSite || restrictsSwaps),
  }
}

/** One short phrase for what the swap settings restrict, or '' for none. */
export function swapSummary(rule) {
  if (!rule || !rule.restrictsSwaps) return ''
  const parts = []
  if (rule.restrictsSwapDays) parts.push(swapDaysLabel(rule.allowedSwapDays))
  if (rule.swapBlockHolidays) parts.push('holidays blocked')
  return parts.join(' · ')
}

/**
 * What the Departments table column says about one department.
 *
 * `rule` is the normalized rule, `null` when the department has none, and
 * `undefined` when it could not be read — "we did not ask" and "there is none"
 * are different answers and the column prints them differently.
 *
 *   unknown   the fetch failed or has not run
 *   none      no rule: assignments are unrestricted
 *   paused    a rule exists but `is_active` is false
 *   open      active, but caps are 0 and swaps are unrestricted
 *   active    enforcing at least one cap or swap restriction
 */
export function summarizeLocationRule(rule) {
  if (rule === undefined) return { state: 'unknown', label: '', detail: '' }
  if (rule === null) return { state: 'none', label: '—', detail: '' }

  if (!rule.isActive) {
    return { state: 'paused', label: 'Paused', detail: perPeriodLabel(rule.periodType) }
  }

  const parts = []
  if (rule.capsOnSite) parts.push(`${rule.onSite} on-site`)
  if (rule.capsOffSite) parts.push(`${rule.offSite} off-site`)

  if (!parts.length && !rule.restrictsSwaps) {
    return { state: 'open', label: 'No limits set', detail: perPeriodLabel(rule.periodType) }
  }

  if (rule.restrictsSwaps) parts.push(swapSummary(rule))

  // The period qualifies the caps; a swap-only rule has no cap to qualify.
  const detail = rule.capsOnSite || rule.capsOffSite ? perPeriodLabel(rule.periodType) : ''

  return { state: 'active', label: parts.join(' · '), detail }
}

/**
 * The rule as one sentence, for the dialog's live preview and the row tooltip.
 *
 * Spelling out the uncapped side matters: a reader who sees only "Up to 2
 * off-site shifts per week" has no way to tell whether on-site is unlimited or
 * simply not shown.
 */
export function ruleSentence(rule) {
  if (!rule) return 'No rule — this department can be assigned any mix of shifts.'
  if (!rule.isActive) {
    return 'Paused — the limits are saved but nothing is blocked.'
  }

  const capsSentence = (() => {
    if (!rule.capsOnSite && !rule.capsOffSite) return ''
    const per = perPeriodLabel(rule.periodType)
    if (rule.capsOnSite && rule.capsOffSite) {
      return `Up to ${rule.onSite} on-site and ${rule.offSite} off-site shifts ${per}.`
    }
    if (rule.capsOnSite) {
      return `Up to ${rule.onSite} on-site shifts ${per}. Off-site is not capped.`
    }
    return `Up to ${rule.offSite} off-site shifts ${per}. On-site is not capped.`
  })()

  const swapSentence = (() => {
    if (!rule.restrictsSwaps) return ''
    const day = rule.allowedSwapDays === 'weekdays' ? 'weekdays' : 'weekends'
    if (rule.restrictsSwapDays && rule.swapBlockHolidays) {
      return `Swaps only on ${day}, and never on a holiday.`
    }
    if (rule.restrictsSwapDays) {
      return `Swaps only on ${day}.`
    }
    return 'Swaps are never allowed on a holiday.'
  })()

  if (!capsSentence && !swapSentence) {
    return 'Nothing is capped and swaps are unrestricted, so this rule restricts nothing.'
  }

  return [capsSentence, swapSentence].filter(Boolean).join(' ')
}

/**
 * Why the server would refuse this rule, or `null` if it would take it.
 *
 * Both checks are the server's own, restated: a rule must restrict something —
 * a cap above 0 **or** a swap restriction — and no period can promise more
 * shifts than it holds.
 */
export function validateLocationRule({
  periodType,
  onSite,
  offSite,
  allowedSwapDays,
  swapBlockHolidays,
} = {}) {
  const on = Number(onSite)
  const off = Number(offSite)

  for (const value of [on, off]) {
    if (!Number.isInteger(value) || value < 0) {
      return 'Limits must be whole numbers of 0 or more.'
    }
  }

  const restrictsSwapDays = !!allowedSwapDays && allowedSwapDays !== DEFAULT_ALLOWED_SWAP_DAYS
  const restrictsSwaps = restrictsSwapDays || swapBlockHolidays === true

  if (on === 0 && off === 0 && !restrictsSwaps) {
    return 'Set a limit above 0, or restrict swaps — a rule that caps nothing and restricts no swap blocks nothing. Remove the rule instead.'
  }

  const entry = periodEntry(periodType)
  const max = maxShiftsFor(periodType)

  if (on > max || off > max) {
    return `A ${entry.noun} cannot hold more than ${max} shifts.`
  }
  if (on + off > max) {
    return `On-site and off-site limits add up to more than ${max} shifts in a ${entry.noun}.`
  }

  return null
}

/** The form's fields as the API's body. */
export function toLocationRulePayload(
  { periodType, onSite, offSite, isActive, allowedSwapDays, swapBlockHolidays } = {},
  departmentId,
) {
  return {
    department: departmentId ?? 0,
    period_type: periodType || DEFAULT_PERIOD,
    on_site: count(onSite),
    off_site: count(offSite),
    is_active: isActive !== false,
    allowed_swap_days: allowedSwapDays || DEFAULT_ALLOWED_SWAP_DAYS,
    swap_block_holidays: swapBlockHolidays === true,
  }
}

/** A blank form, in the shape the dialog binds to. */
export function blankLocationRuleForm() {
  return {
    periodType: DEFAULT_PERIOD,
    onSite: 0,
    offSite: 0,
    isActive: true,
    allowedSwapDays: DEFAULT_ALLOWED_SWAP_DAYS,
    swapBlockHolidays: false,
  }
}

/** An existing rule as form values, so the dialog opens on what is saved. */
export function locationRuleToForm(rule) {
  if (!rule) return blankLocationRuleForm()
  return {
    periodType: rule.periodType,
    onSite: rule.onSite,
    offSite: rule.offSite,
    isActive: rule.isActive,
    allowedSwapDays: rule.allowedSwapDays ?? DEFAULT_ALLOWED_SWAP_DAYS,
    swapBlockHolidays: rule.swapBlockHolidays === true,
  }
}
