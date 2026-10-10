/**
 * Shift-assignment history rows, as the audit page reads them.
 *
 * `GET /audit/assignment/history/` answers with one entry per saved change to a
 * person's shift on a day:
 *
 *   { updater_name, employee_name, shift_date, new_shift, previous_shift,
 *     updated_at }
 *
 * Everything the page shows is derived here rather than in the table, because
 * the table and the card list below 1024px render the same rows and must agree
 * on what each one *says* — which of the two shift names is current, whether the
 * row is an assignment or a removal, and how it sorts. Two renderers deriving
 * that separately is how one change ends up labelled "Reassigned" in the table
 * and "Assigned" in the cards.
 *
 * The readings themselves — stamp parsing, the row shape, the change
 * classification, the roster scoping — live in `composables/utils/auditRows.js`,
 * shared with the contract source. What is left here is the shift vocabulary and
 * the comparators; what is in `composables/utils/auditSources.js` is the wording
 * the renderers show.
 *
 * Re-exports the shared primitives, so a caller that only cares about shifts does
 * not have to know there is a second source.
 */

import { buildAuditEntry, byStamp, searchText } from 'src/composables/utils/auditRows'
import { auditSource, changeKind } from 'src/composables/utils/auditSources'

const SOURCE = auditSource('shifts')

/**
 * Re-exported so a caller that only cares about shifts does not have to know
 * there is a second source. `chipClass` is read by both renderers, and the
 * stamp helpers and the roster scoping are the payload readings this module's
 * header describes.
 */
export {
  chipClass,
  scopeEntriesToRoster,
  splitStamp,
  stampToMs,
} from 'src/composables/utils/auditRows'

/**
 * One payload entry to the shift row both renderers read.
 *
 * The field reads are explicit rather than defaulted, so a reader can see which
 * payload key backs each neutral row key. See `buildAuditEntry`.
 */
export function normaliseAssignmentEntry(entry, index = 0) {
  return buildAuditEntry(entry, index, {
    kinds: SOURCE.changeKinds,
    readPrevious: (e) => readShift(e?.previous_shift),
    readNext: (e) => readShift(e?.new_shift),
    readDate: (e) => readShift(e?.shift_date),
  })
}

function readShift(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value.trim() : String(value).trim()
}

/** The whole response to rows, in the order the server sent them. */
export function normaliseAssignmentHistory(entries) {
  return (Array.isArray(entries) ? entries : []).map(normaliseAssignmentEntry)
}

/**
 * Does this row match what was typed?
 *
 * @param {object} row   a normalised row
 * @param {string} term  already lowercased and trimmed by the caller
 */
export function matchesSearch(row, term) {
  if (!term) return true
  return searchText(row).toLowerCase().includes(term)
}

/**
 * Sort comparators, keyed by the toolbar's sort options.
 *
 * Every one falls back to the server's original index, so rows the comparator
 * cannot separate — two changes saved in the same second, or two stamps that
 * would not parse — hold a stable order instead of shuffling on each recompute.
 *
 * The `date` key is deliberately not called `shiftDate`: it orders by the day the
 * change concerns, which is a shift date on one source and something else on
 * another, and the toolbar's option values come from `auditSources.js` where each
 * source can label its own.
 */
export const SORTS = {
  newest: (a, b) => byStamp(b, a) || a.index - b.index,
  oldest: (a, b) => byStamp(a, b) || a.index - b.index,
  employee: (a, b) =>
    a.employeeName.localeCompare(b.employeeName) || byStamp(b, a) || a.index - b.index,
  date: (a, b) =>
    (a.dateValue || '').localeCompare(b.dateValue || '') || byStamp(b, a) || a.index - b.index,
}

/** Re-exported so a consumer of the shift source can classify without reaching
 *  for the descriptor itself. */
export { changeKind }
