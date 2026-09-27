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

/** Options for the pay-type select. `label` is what the UI shows, everywhere. */
export const PAY_TYPE_OPTIONS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Semi-Monthly', value: 'semi-monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Hourly', value: 'hourly' },
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
