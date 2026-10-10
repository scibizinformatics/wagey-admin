/**
 * Contract audit-log rows, as the audit page reads them.
 *
 * `GET /audit/contracts/history/` answers with one entry per saved change to
 * somebody's contract:
 *
 *   { updater_name, employee_name, shift_date, new_shift, previous_shift,
 *     updated_at }
 *
 * ── Those are the shift endpoint's field names, and that is deliberate ─────────
 * The two endpoints currently answer with the same six keys, so this module reads
 * the same keys `assignmentHistory.js` does. The point of keeping them in
 * separate files is that they are separately documented endpoints, and the shift
 * names are not what a contract payload will keep meaning. When the backend gives
 * contracts their own fields this is the one file that changes: point
 * `readPrevious` / `readNext` / `readDate` at the new keys and, where the new
 * field is an instant rather than a day, read it as one.
 *
 * `readDate` is where that shows first. `shift_date` is a bare `YYYY-MM-DD` here,
 * which `longLabel` reads as a calendar day; a contract's effective date may well
 * arrive as a full ISO timestamp, and a timestamp read as a day is the exact
 * UTC-midnight shift `composables/utils/calendarDate.js` exists to prevent. Until
 * that is established from real data the audit page labels this column neutrally
 * ("Date") rather than calling it something it cannot support.
 *
 * Everything else — stamp parsing, the row shape, the change classification, the
 * roster scoping — is shared with the shift source in
 * `composables/utils/auditRows.js`. What differs is the vocabulary, and that
 * lives in `composables/utils/auditSources.js` so the table and the card list
 * cannot each invent their own.
 */

import { buildAuditEntry, byStamp, searchText } from 'src/composables/utils/auditRows'
import { auditSource } from 'src/composables/utils/auditSources'

const SOURCE = auditSource('contracts')

/**
 * Trimmed string, or ''. The payload uses null, '' and absent interchangeably.
 *
 * Null and '' are the same thing to every reading below: an absent "previous"
 * value is a first entry rather than a missing one, and the distinction the row
 * draws is between *empty* and *different*, not between null and ''.
 */
function text(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value.trim() : String(value).trim()
}

/**
 * One payload entry to the contract row both renderers read.
 *
 * @see buildAuditEntry for the shared row shape and the traps in the payload.
 */
export function normaliseContractEntry(entry, index = 0) {
  return buildAuditEntry(entry, index, {
    kinds: SOURCE.changeKinds,
    readPrevious: (e) => text(e?.previous_shift),
    readNext: (e) => text(e?.new_shift),
    readDate: (e) => text(e?.shift_date),
  })
}

/** The whole response to rows, in the order the server sent them. */
export function normaliseContractHistory(entries) {
  return (Array.isArray(entries) ? entries : []).map(normaliseContractEntry)
}

/**
 * Does this row match what was typed?
 *
 * Same haystack as the shift source — both people, both values, the day — but a
 * separate function rather than a shared one called with a flag, so a future
 * contract-only searchable field (a contract number, a term) has somewhere obvious
 * to go without either source acquiring a boolean parameter.
 *
 * @param {object} row   a normalised row
 * @param {string} term  already lowercased and trimmed by the caller
 */
export function matchesContractSearch(row, term) {
  if (!term) return true
  return searchText(row).toLowerCase().includes(term)
}

/**
 * Sort comparators, keyed by the toolbar's sort options.
 *
 * Identical to the shift source's today, and kept separate for the same reason
 * the normalisers are: these are two endpoints, and the day a contract change
 * concerns may not order the same way a shift date does. Every comparator falls
 * back to the server's index so unorderable pairs hold a stable position.
 */
export const CONTRACT_SORTS = {
  newest: (a, b) => byStamp(b, a) || a.index - b.index,
  oldest: (a, b) => byStamp(a, b) || a.index - b.index,
  employee: (a, b) =>
    a.employeeName.localeCompare(b.employeeName) || byStamp(b, a) || a.index - b.index,
  date: (a, b) =>
    (a.dateValue || '').localeCompare(b.dateValue || '') || byStamp(b, a) || a.index - b.index,
}
