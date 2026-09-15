/**
 * Department location rules — the shared reading of
 * `GET /organization/departments/{department_id}/location-rule/`.
 *
 * A rule caps how many **on-site** and **off-site** shifts one department's
 * employees may hold per period:
 *
 *   { id, department, department_name, period_type, on_site, off_site,
 *     is_active }
 *
 * It is a hard block, checked everywhere an assignment is created — manual
 * assign, recurring/auto-assign, reassignment and swap approval — so the
 * wording on screen has to read as a ceiling, not a target. That is the
 * opposite of the site position requirements in the same Admin Settings screen
 * (`composables/utils/positionRequirements.js`), which say how many people a
 * site *should* have; confusing the two is the easiest mistake to make here.
 *
 * Five things about the payload drive the helpers below.
 *
 * First, **0 means no limit, not a limit of zero.** It is the field's default,
 * so a rule saved with `off_site: 0` blocks nothing off-site — a renderer that
 * prints the raw number says "0 off-site shifts allowed" about a department
 * with no off-site restriction at all. Everything below goes through
 * `limitLabel` / `hasCap` rather than reading the number directly.
 *
 * Second, **no rule and an inactive rule both mean "no restriction"** — but for
 * different reasons, and only one of them is something an admin set up and can
 * switch back on. `summarizeLocationRule` reports them as distinct states so
 * the table can say "Paused" for a disabled rule and an em dash for a
 * department that never had one.
 *
 * Third, **it counts shifts, not days.** A day carrying two shifts spends two
 * credits, and OFF / leave shifts and shifts with no site never spend any. The
 * labels say "shifts" for that reason; "4 days on-site" would be wrong for any
 * department that runs split shifts.
 *
 * Fourth, **the period is part of the limit.** 4 per week and 4 per month are
 * different rules, so no figure from this payload is meaningful without its
 * period — which is why the summary and the sentence both carry it.
 *
 * Fifth, **the server rejects a rule that restricts nothing** (both caps 0) and
 * caps a weekly rule at seven shifts in total. `validateLocationRule` says so
 * before the round trip, because a 400 on submit is a worse way to learn it.
 *
 * One thing the payload does not say, worth knowing when explaining the rule to
 * an admin: an employee's department comes from their *active employment
 * contract* on the schedule date, not from any roster this screen can see.
 */

/** A weekly period cannot hold more than seven shifts. */
export const WEEK_MAX = 7

/** How a period is measured. Order is the order the picker offers them in. */
export const PERIOD_TYPES = [
  {
    value: 'week',
    label: 'Week',
    short: 'week',
    hint: 'Monday to Sunday.',
  },
  {
    value: 'cutoff',
    label: 'Payroll cutoff',
    short: 'cutoff',
    hint: 'The cutoff the payroll run uses, falling back to the 1st/2nd of the month where none is defined.',
  },
  {
    value: 'monthly',
    label: 'Calendar month',
    short: 'month',
    hint: 'The 1st to the last day of the month.',
  },
]

const DEFAULT_PERIOD = 'week'

function periodEntry(periodType) {
  return PERIOD_TYPES.find((p) => p.value === periodType) || PERIOD_TYPES[0]
}

/** "Week", "Payroll cutoff", "Calendar month". */
export function periodLabel(periodType) {
  return periodEntry(periodType).label
}

/** "per week", "per cutoff", "per month" — the form a limit is read in. */
export function perPeriodLabel(periodType) {
  return `per ${periodEntry(periodType).short}`
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
 */
export function normalizeLocationRule(raw) {
  if (!raw || typeof raw !== 'object') return null

  const periodType = PERIOD_TYPES.some((p) => p.value === raw.period_type)
    ? raw.period_type
    : DEFAULT_PERIOD

  const onSite = count(raw.on_site)
  const offSite = count(raw.off_site)
  const isActive = raw.is_active !== false

  return {
    id: raw.id ?? null,
    departmentId: raw.department ?? null,
    departmentName: raw.department_name || '',
    periodType,
    periodLabel: periodLabel(periodType),
    onSite,
    offSite,
    isActive,
    capsOnSite: onSite > 0,
    capsOffSite: offSite > 0,
    // Set up, switched on, and actually holding something back. A rule can be
    // all three of present, active and toothless at once (both caps 0).
    enforcing: isActive && (onSite > 0 || offSite > 0),
  }
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
 *   open      active, but both caps are 0, so it restricts nothing
 *   active    enforcing at least one cap
 */
export function summarizeLocationRule(rule) {
  if (rule === undefined) return { state: 'unknown', label: '', detail: '' }
  if (rule === null) return { state: 'none', label: '—', detail: '' }

  const detail = perPeriodLabel(rule.periodType)

  if (!rule.isActive) {
    return { state: 'paused', label: 'Paused', detail }
  }
  if (!rule.capsOnSite && !rule.capsOffSite) {
    return { state: 'open', label: 'No limits set', detail }
  }

  const parts = []
  if (rule.capsOnSite) parts.push(`${rule.onSite} on-site`)
  if (rule.capsOffSite) parts.push(`${rule.offSite} off-site`)

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
  if (!rule.capsOnSite && !rule.capsOffSite) {
    return 'Both limits are 0, so nothing is restricted.'
  }

  const per = perPeriodLabel(rule.periodType)
  if (rule.capsOnSite && rule.capsOffSite) {
    return `Up to ${rule.onSite} on-site and ${rule.offSite} off-site shifts ${per}.`
  }
  if (rule.capsOnSite) {
    return `Up to ${rule.onSite} on-site shifts ${per}. Off-site is not capped.`
  }
  return `Up to ${rule.offSite} off-site shifts ${per}. On-site is not capped.`
}

/**
 * Why the server would refuse this rule, or `null` if it would take it.
 *
 * Both checks are the server's own, restated: at least one cap must be a real
 * limit, and a weekly rule cannot promise more shifts than a week holds.
 */
export function validateLocationRule({ periodType, onSite, offSite } = {}) {
  const on = Number(onSite)
  const off = Number(offSite)

  for (const value of [on, off]) {
    if (!Number.isInteger(value) || value < 0) {
      return 'Limits must be whole numbers of 0 or more.'
    }
  }

  if (on === 0 && off === 0) {
    return 'Set at least one limit above 0 — a rule with both at 0 restricts nothing. Remove the rule instead.'
  }

  if (periodType === 'week') {
    if (on > WEEK_MAX || off > WEEK_MAX) {
      return `A weekly limit cannot be more than ${WEEK_MAX} shifts.`
    }
    if (on + off > WEEK_MAX) {
      return `On-site and off-site limits add up to more than ${WEEK_MAX} shifts in a week.`
    }
  }

  return null
}

/** The form's fields as the API's body. */
export function toLocationRulePayload({ periodType, onSite, offSite, isActive } = {}) {
  return {
    period_type: periodType || DEFAULT_PERIOD,
    on_site: count(onSite),
    off_site: count(offSite),
    is_active: isActive !== false,
  }
}

/** A blank form, in the shape the dialog binds to. */
export function blankLocationRuleForm() {
  return { periodType: DEFAULT_PERIOD, onSite: 0, offSite: 0, isActive: true }
}

/** An existing rule as form values, so the dialog opens on what is saved. */
export function locationRuleToForm(rule) {
  if (!rule) return blankLocationRuleForm()
  return {
    periodType: rule.periodType,
    onSite: rule.onSite,
    offSite: rule.offSite,
    isActive: rule.isActive,
  }
}
