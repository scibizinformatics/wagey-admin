/**
 * What the audit page is showing, per source.
 *
 * ONE source of truth for a choice the reader makes with a dropdown. The table,
 * the card list below 1024px and the toolbar all read this descriptor, so
 * switching sources cannot leave one of them describing contract changes in the
 * words for shift changes — the failure this module exists to prevent. The
 * alternative, threading `isContract` booleans through three components, is how
 * a column ends up labelled "Shift" above a row of contract terms.
 *
 * ── Why the two sources carry different WORDS and the same FIELDS ─────────────
 * `GET /audit/contracts/history/` currently answers with the same six fields as
 * `GET /audit/assignment/history/`, including `shift_date`, `new_shift` and
 * `previous_shift`. So the columns cannot differ — there is nothing to switch —
 * and pretending otherwise would mean inventing field names the endpoint does
 * not send.
 *
 * What genuinely does change is the vocabulary, and it has to: a contract change
 * filed under a chip that reads "Unassigned", a column headed "Shift", and an
 * empty state that says "No shift changes recorded" are all wrong on screen even
 * when the values underneath happen to line up. Hence two vocabularies over one
 * shape.
 *
 * If the backend later gives contracts their own fields (`contract_term`,
 * `effective_date`, …), the change is confined to `useContractHistory.js`'s
 * normaliser and this module's `columns`: no renderer reads a field name.
 *
 * ── Why `shiftDate` is labelled per source rather than assumed ────────────────
 * Both endpoints send `shift_date`, and for a contract it is not established
 * whether it means the contract's effective date, the date of the edit, or
 * nothing meaningful. It is labelled per source rather than called "Shift date"
 * on both tabs, because asserting a meaning the data does not carry is worse
 * than a neutral label. If it turns out to be meaningless for contracts, drop
 * `date` from that source's `columns` — the renderers iterate whatever is here,
 * so removing a column needs no other change.
 */

/**
 * How a change reads, per source.
 *
 * `assigned` / `changed` / `removed` are the *keys* — derived from the same
 * before/after pair for both sources, because the pair is the only signal the
 * payload carries (see `changeKind`). Only the label, tone and icon differ:
 * moving somebody to a different shift is "Reassigned", while the same edit
 * applied to a contract is "Updated".
 *
 * `unchanged` is kept in both rather than discarded. A save that moved nothing
 * still records who touched the record and when, which is the question an audit
 * trail exists to answer.
 */
const SHIFT_CHANGE_KINDS = {
  assigned: { key: 'assigned', label: 'Assigned', tone: 'good', icon: 'o_person_add' },
  changed: { key: 'changed', label: 'Reassigned', tone: 'info', icon: 'o_swap_horiz' },
  removed: { key: 'removed', label: 'Unassigned', tone: 'warn', icon: 'o_person_remove' },
  unchanged: { key: 'unchanged', label: 'Re-saved', tone: 'neutral', icon: 'o_history' },
}

const CONTRACT_CHANGE_KINDS = {
  assigned: { key: 'assigned', label: 'Added', tone: 'good', icon: 'o_post_add' },
  changed: { key: 'changed', label: 'Updated', tone: 'info', icon: 'o_edit' },
  removed: { key: 'removed', label: 'Removed', tone: 'warn', icon: 'o_delete' },
  unchanged: { key: 'unchanged', label: 'Re-saved', tone: 'neutral', icon: 'o_history' },
}

/** Filter options, derived from the kinds above so the two cannot disagree. */
function kindFilters(kinds) {
  return [
    { value: 'all', label: 'All changes' },
    { value: 'assigned', label: kinds.assigned.label },
    { value: 'changed', label: kinds.changed.label },
    { value: 'removed', label: kinds.removed.label },
  ]
}

/**
 * Sort options.
 *
 * The date option's *key* is `date` for both sources and only its label differs,
 * because the comparator is looked up by that key. "Shift date" is a claim about
 * the data that only one source can make, so the label is per-source and the key
 * is not.
 */
function sortOptions(dateLabel) {
  return [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'date', label: dateLabel },
    { value: 'employee', label: 'Employee A–Z' },
  ]
}

/**
 * Column definitions, per source.
 *
 * `field` is what Quasar sorts on, and every one of these is a normalised row
 * key rather than a payload field — the renderers never see the wire shape.
 * Widths are kept per source so a longer label ("Contract" beside "Shift") does
 * not fold the column; `minWidth` on the two open-ended columns carries the
 * avatar and the moved value.
 */
function columnsFor({ employeeLabel, changeLabel, moveLabel, dateLabel, updaterLabel }) {
  return [
    { name: 'employee', label: employeeLabel, field: 'employeeName', align: 'left', minWidth: 190 },
    {
      name: 'change',
      label: changeLabel,
      field: (row) => row.change.key,
      align: 'left',
      width: 130,
    },
    { name: 'move', label: moveLabel, field: 'newValue', align: 'left', minWidth: 190 },
    { name: 'shiftDate', label: dateLabel, field: 'dateValue', align: 'left', width: 120 },
    { name: 'updater', label: updaterLabel, field: 'updaterName', align: 'left', minWidth: 150 },
    { name: 'updatedAt', label: 'Recorded', field: 'updatedAtMs', align: 'left', width: 130 },
  ]
}

/** The table's minimum width — six columns inside a tablet's content width
 *  means a sideways scroll on every row. Both sources have six columns, so the
 *  value is shared rather than repeated. */
export const AUDIT_TABLE_MIN_WIDTH = 880

/**
 * Shift-assignment changes — `GET /audit/assignment/history/`.
 *
 * Read by `useAssignmentHistory.js`, which is where the rows are fetched and
 * normalised. `url` is here rather than there only so both sources are declared
 * in one readable list; the composable is the thing that actually calls it.
 */
const SHIFTS = {
  key: 'shifts',
  label: 'Shift changes',
  singular: 'shift change',
  plural: 'shift changes',
  /** Used in the header summary: "123 shift assignment changes". */
  headerNoun: 'shift assignment change',
  url: '/audit/assignment/history/',
  searchPlaceholder: 'Search employee, editor or shift',
  rangeTitle: 'Date of the shift that changed',
  /** Shown in the move cell when a value was removed rather than changed. */
  moveNoneLabel: 'no shift',
  changeKinds: SHIFT_CHANGE_KINDS,
  kindFilters: kindFilters(SHIFT_CHANGE_KINDS),
  sortOptions: sortOptions('Shift date'),
  emptyTitle: 'No shift changes recorded',
  emptySub:
    'Once somebody assigns or moves a shift, the change appears here with who made it and when.',
  columns: columnsFor({
    employeeLabel: 'Employee',
    changeLabel: 'Change',
    moveLabel: 'Shift',
    dateLabel: 'Shift date',
    updaterLabel: 'Changed by',
  }),
}

/**
 * Contract changes — `GET /audit/contracts/history/`.
 *
 * Same six fields as the shifts source today; see the module header for why the
 * vocabulary differs anyway, and for where to change it if the backend sends
 * contract-specific fields later.
 */
const CONTRACTS = {
  key: 'contracts',
  label: 'Contract changes',
  singular: 'contract change',
  plural: 'contract changes',
  headerNoun: 'contract change',
  url: '/audit/contracts/history/',
  searchPlaceholder: 'Search employee or editor',
  rangeTitle: 'Date of the contract change',
  moveNoneLabel: 'no contract',
  changeKinds: CONTRACT_CHANGE_KINDS,
  kindFilters: kindFilters(CONTRACT_CHANGE_KINDS),
  sortOptions: sortOptions('Date'),
  emptyTitle: 'No contract changes recorded',
  emptySub:
    'Once somebody adds, updates or removes a contract, the change appears here with who made it and when.',
  columns: columnsFor({
    employeeLabel: 'Employee',
    changeLabel: 'Change',
    moveLabel: 'Contract',
    dateLabel: 'Date',
    updaterLabel: 'Changed by',
  }),
}

/** Every source, keyed. The page holds one of these keys, never the object. */
export const AUDIT_SOURCES = {
  shifts: SHIFTS,
  contracts: CONTRACTS,
}

/** Toolbar dropdown options, in the order they read best. */
export const AUDIT_SOURCE_KEYS = [SHIFTS, CONTRACTS].map((source) => ({
  value: source.key,
  label: source.label,
}))

/** The source for a key, falling back to shifts so a stale key cannot blank the page. */
export function auditSource(key) {
  return AUDIT_SOURCES[key] || SHIFTS
}

/**
 * What kind of change an entry records.
 *
 * Derived from the pair of before/after values, because the payload carries no
 * field naming it. `kinds` is the source's vocabulary, so the *logic* is written
 * once here and only the wording differs between the two sources — a second
 * implementation would be how a contract row came to read "Unassigned".
 *
 * @param {string} previous  the value before the edit ('' when there was none)
 * @param {string} next      the value after the edit  ('' when removed)
 * @param {object} kinds     one source's `changeKinds`
 */
export function changeKind(previous, next, kinds) {
  const table = kinds || SHIFT_CHANGE_KINDS
  if (!previous && next) return table.assigned
  if (previous && !next) return table.removed
  if (previous && next && previous !== next) return table.changed
  return table.unchanged
}
