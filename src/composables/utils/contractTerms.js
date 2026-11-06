/**
 * Shared vocabulary for employment-contract terms: how a pay type, a month and
 * a rate are written down.
 *
 * These three lists were already duplicated verbatim between
 * `EmployeeAssignContractDialog.vue` and `EmployeeEditContractDialog.vue`, and
 * the assign confirmation needed them a third time. A confirm that spells a pay
 * type differently from the select it is confirming is worse than no confirm at
 * all — it makes the recap look like it is describing something else — so the
 * labels live here and every surface reads the same source.
 */

/**
 * Options for the pay-type select. The backend writes exactly `monthly` and
 * `daily` (the contract endpoints' `pay_type` enum), and Admin Settings gives
 * the same pair, so the selects offer nothing else. `label` is what the UI
 * shows, everywhere. A pre-existing contract with another value still
 * *display* — `payTypeLabel` prints the raw text rather than blanking — but
 * re-saving it now means picking one of these.
 */
export const PAY_TYPE_OPTIONS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Daily', value: 'daily' },
]

export const MONTH_OPTIONS = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

/**
 * The display name for a pay type. Falls back to the raw value rather than
 * blanking, so a type the backend added after this list was written still
 * reads as something instead of as a missing field.
 */
export function payTypeLabel(value) {
  if (value === null || value === undefined || value === '') return ''
  const match = PAY_TYPE_OPTIONS.find((o) => o.value === value)
  return match ? match.label : String(value)
}

/** Month number (1-12) to its name. Blank when absent or out of range. */
export function monthLabel(value) {
  const num = Number(value)
  if (!Number.isInteger(num) || num < 1 || num > 12) return ''
  return MONTH_OPTIONS[num - 1].label
}

/**
 * A rate, in pesos, to the centavo. Centavos are kept here (unlike the rounded
 * summary tiles) because a rate is a record, not a reading — 1,234.56 and
 * 1,234.00 are different offers.
 */
export function formatRate(value) {
  const num = Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(num)) return ''
  return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** A work-hours count, dropping the trailing zero so 48 is not "48.0". */
export function formatHours(value) {
  const num = Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(num)) return ''
  return `${num} hr${num === 1 ? '' : 's'} / week`
}

/**
 * The CTO eligibility is a monthly-only term — every dialog that shows its
 * checkbox hides it under any other pay type (`v-if="ctoId && pay_type ===
 * 'monthly'"`). Hiding the checkbox does not remove the id from the form,
 * though, so switching pay type leaves an id the user cannot see and the
 * backend rejects with "LEAVE_CREDITS/OVERTIME_AS_CTO not allowed for daily pay
 * type". Strip it wherever the form's pay type changes.
 */
export const CTO_ELIGIBILITY_NAME = 'Overtime Converted to CTO'

/**
 * The same CTO record can be written down three ways: its id (a number, or the
 * text legacy rows were written from), its `name`, or its `code` — the
 * OVERTIME_AS_CTO string the backend's validation error prints. An eligibilities
 * entry is CTO whenever it is any of these shapes, and the strip only works if
 * it recognises the shape the payload actually carries.
 */
function isCtoLike(value) {
  if (value == null) return false
  const text = String(value).trim().toLowerCase()
  if (!text) return false
  if (text.includes('overtime_as_cto')) return true
  return text.includes('overtime') && text.includes('cto')
}

/** Every record in a payroll-eligibilities list that is a CTO one. */
export function ctoEligibilityIds(options = []) {
  return (options ?? []).filter((e) => isCtoLike(e?.name) || isCtoLike(e?.code)).map((e) => e.id)
}

/** The CTO eligibility's id in a payroll-eligibilities list, or `null`. */
export function ctoEligibilityId(options = []) {
  return ctoEligibilityIds(options)[0] ?? null
}

/**
 * The eligibility ids valid for a pay type: CTO is kept only for monthly pay.
 * An id is recognised as CTO whether it arrives as a number, as the text of a
 * number, or as the eligibility's own name/code. When the options list carries
 * no CTO record at all and no entry names one, the list is returned unchanged —
 * the strip cannot name an id it cannot resolve, so callers fetch the list
 * before writing rather than relying on this quietly passing CTO through.
 */
export function eligibilitiesForPayType(eligibilities, payType, options = []) {
  const list = eligibilities ?? []
  if (payType === 'monthly') return list
  const knownCtoIds = ctoEligibilityIds(options)
  return list.filter((id) => !isCtoLike(id) && !knownCtoIds.some((ctoId) => sameId(id, ctoId)))
}

/**
 * Id-tolerant membership: the option's `5` is the stored `"5"`. Every
 * checkbox on an eligibilities array — and `isMultiplierVisible`, which hides
 * the rows tied to one — reads through this, so a legacy id written as text
 * still renders as ticked instead of ticking off a hidden state.
 */
export function hasEligibility(list, id) {
  return (list ?? []).some((e) => sameId(e, id))
}

/**
 * `list` without every occurrence of `id`. Unticking a checkbox rendered by
 * `hasEligibility` has to remove the same entries it showed, so the removal is
 * as tolerant as the tick test — otherwise the checkbox lies about what the
 * form will send.
 */
export function withoutEligibility(list, id) {
  return (list ?? []).filter((e) => !sameId(e, id))
}

/**
 * Work-hours mode is not a field on a contract. The backend models it as two
 * payroll eligibilities — `Work Hours Flexible` and `Work Hours Strict` — and a
 * contract expresses the mode by carrying one of their ids in `eligibilities`.
 *
 * That is why every surface that offers the choice goes through this module:
 * the contract-type admin form writes the ids, the employee contract dialogs
 * read them back, and a confirm that spelled the mode differently from the
 * select it confirms would be worse than no confirm at all.
 */
export const WORK_HOURS_ELIGIBILITY_NAMES = ['Work Hours Flexible', 'Work Hours Strict']

/** Options for a work-hours mode select. `label` is the eligibility's own name. */
export const WORK_HOURS_TYPE_OPTIONS = [
  { label: WORK_HOURS_ELIGIBILITY_NAMES[0], value: 'flexible' },
  { label: WORK_HOURS_ELIGIBILITY_NAMES[1], value: 'strict' },
]

// Ids arrive as numbers from the eligibilities endpoint and as numbers from the
// contract payload, but a string id is not impossible (older records were
// written from a form input). Compare as text so one stray string cannot make
// the mode look unset and quietly drop it on the next save.
const sameId = (a, b) => a != null && b != null && String(a) === String(b)

/** The two eligibility ids for a payroll-eligibilities list. `null` when absent. */
export function workHoursEligibilityIds(options = []) {
  const idOf = (name) => options.find((e) => e.name === name)?.id ?? null
  return {
    flexible: idOf(WORK_HOURS_ELIGIBILITY_NAMES[0]),
    strict: idOf(WORK_HOURS_ELIGIBILITY_NAMES[1]),
  }
}

/** True when the list carries the two records the select needs to offer. */
export function hasWorkHoursEligibilities(options = []) {
  const { flexible, strict } = workHoursEligibilityIds(options)
  return flexible !== null && strict !== null
}

/**
 * The mode an eligibilities array currently expresses. Flexible wins a tie,
 * which is the rule the contract-type admin form already used — so a legacy row
 * carrying both ids reads the same way on both surfaces.
 */
export function workHoursTypeOf(eligibilities, options = []) {
  const list = eligibilities ?? []
  const { flexible, strict } = workHoursEligibilityIds(options)
  if (flexible !== null && list.some((id) => sameId(id, flexible))) return 'flexible'
  if (strict !== null && list.some((id) => sameId(id, strict))) return 'strict'
  return null
}

/**
 * `eligibilities` rewritten to express exactly `type`: both ids removed, the
 * chosen one appended. `null` clears the mode, which is a real state — the
 * contract-type admin form allows it, and a contract may carry neither id.
 */
export function withWorkHoursType(eligibilities, type, options = []) {
  const list = eligibilities ?? []
  const { flexible, strict } = workHoursEligibilityIds(options)
  if (flexible === null && strict === null) return list
  const rest = list.filter((id) => !sameId(id, flexible) && !sameId(id, strict))
  if (type === 'flexible' && flexible !== null) return [...rest, flexible]
  if (type === 'strict' && strict !== null) return [...rest, strict]
  return rest
}

/** The label for a work-hours mode, or `''` when nothing is set. */
export function workHoursTypeLabel(type) {
  if (!type) return ''
  return WORK_HOURS_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? String(type)
}
