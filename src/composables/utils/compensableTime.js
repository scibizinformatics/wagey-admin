/**
 * Compensable time categories and their subcategories — the shared reading of
 *   GET  /compensable_time/categories/company/{company_id}/
 *   GET  /compensable_time/subcategories/category/{category_id}/
 *
 * A *category* is a kind of compensable time ("Overtime", "Holiday worked"); a
 * *subcategory* is the narrower thing filed under it ("Regular day off", "Rest
 * day"), and carries the allowance types a request of that kind draws by
 * default. One category holds any number of subcategories, so the two are read
 * and edited separately — the categories table, and the dialog reached from one
 * of its rows — exactly as leave types and their grant policies are.
 *
 * Because the Admin Settings panel, the subcategory dialog and both forms all
 * read the same figures, the normalization and the payload shapes live here
 * rather than in each of them.
 *
 * Three things about the payload drive the helpers below.
 *
 * First, **`default_allowance_types` is a list of ids, not objects.** It is
 * documented as `[0]` — bare ids with no name beside them — so a row cannot
 * print what those allowances are called without a lookup. The dialog pairs
 * them against the company's allowance types; `allowanceTypeIds` stays the raw
 * ids so a form can send back exactly what it was given.
 *
 * Second, **`is_active` is a flag, and a flag the server may not have sent.**
 * It is treated as absent-means-active rather than absent-means-inactive: a
 * category that answered without one is far more likely to be a live one than
 * a retired one, and defaulting to inactive would hide working configuration
 * behind a grey badge.
 *
 * Third, **ids cross the wire as numbers here and as strings elsewhere**, so
 * comparisons go through `sameId` rather than `===`.
 */

import { leaveRequestDurationLabel } from 'src/composables/utils/leaveRequests'
import { longLabel, shiftIso } from 'src/composables/utils/calendarDate'

/** Ids cross the wire as numbers here and as strings elsewhere. */
export function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

/** The list envelope this API uses, tolerating a bare array and a `results` page. */
function rowsFrom(payload) {
  if (Array.isArray(payload)) return payload
  const rows = payload?.data ?? payload?.results
  return Array.isArray(rows) ? rows : []
}

/**
 * `default_allowance_types` into a plain array of ids.
 *
 * Anything that is not an array becomes an empty list rather than a crash:
 * the field is documented, but a null from a backend that has no allowances
 * configured is an ordinary answer.
 */
function normalizeAllowanceTypeIds(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (entry !== null && typeof entry === 'object' ? (entry.id ?? null) : entry))
    .filter((id) => id !== null && id !== undefined && id !== '')
}

/**
 * One category into the shape every renderer reads.
 *
 * A row with no name is dropped rather than rendered. The categories route is
 * documented as returning category objects, so a name-less row means the route
 * answered with something else entirely — a placeholder is worse than an empty
 * table, because it looks like configuration that exists.
 */
export function normalizeCategory(raw) {
  const name = (raw?.name ?? '').trim()
  if (!name) return null

  return {
    id: raw?.id ?? null,
    name,
    description: (raw?.description ?? '').trim(),
    // Absent means active — see the header note.
    isActive: raw?.is_active ?? true,
    /**
     * The subcategories the route embedded, if it did. The documented list
     * shape carries none, so this is normally empty and the panel renders a
     * plain "Manage" affordance rather than a count it cannot know.
     */
    subcategories: Array.isArray(raw?.subcategories)
      ? raw.subcategories.map(normalizeSubcategory).filter(Boolean)
      : [],
  }
}

export function normalizeCategories(payload) {
  return rowsFrom(payload).map(normalizeCategory).filter(Boolean)
}

/**
 * One subcategory into the shape every renderer reads.
 *
 * No name here is not a reason to drop the row: a subcategory is reached only
 * through the dialog for its own category, and its name is the one thing on it
 * that would certainly be there. A nameless row that would otherwise vanish
 * would leave the admin staring at a category that looks like it has nothing
 * under it.
 */
export function normalizeSubcategory(raw) {
  return {
    id: raw?.id ?? null,
    categoryId: raw?.category ?? null,
    name: (raw?.name ?? '').trim(),
    description: (raw?.description ?? '').trim(),
    isActive: raw?.is_active ?? true,
    allowanceTypeIds: normalizeAllowanceTypeIds(raw?.default_allowance_types),
    createdAt: raw?.created_at ?? null,
  }
}

export function normalizeSubcategories(payload) {
  return rowsFrom(payload).map(normalizeSubcategory)
}

// ─── Forms ───────────────────────────────────────────────────────────────────

export function emptyCategoryForm() {
  return { id: null, name: '', description: '', is_active: true }
}

export function categoryToForm(category) {
  return {
    id: category?.id ?? null,
    name: category?.name ?? '',
    description: category?.description ?? '',
    is_active: category?.isActive ?? true,
  }
}

/**
 * The body for both create and update.
 *
 * `id` rides along on an update because the documented update payload carries
 * it, and is omitted on a create where it would only send the placeholder the
 * docs use to show the shape.
 */
export function categoryPayload(form, { includeId = false } = {}) {
  return {
    ...(includeId && form.id != null ? { id: form.id } : {}),
    name: (form.name ?? '').trim(),
    description: (form.description ?? '').trim(),
    is_active: form.is_active !== false,
  }
}

export function emptySubcategoryForm() {
  return { id: null, name: '', description: '', is_active: true, allowance_type_ids: [] }
}

export function subcategoryToForm(subcategory) {
  return {
    id: subcategory?.id ?? null,
    name: subcategory?.name ?? '',
    description: subcategory?.description ?? '',
    is_active: subcategory?.isActive ?? true,
    allowance_type_ids: [...(subcategory?.allowanceTypeIds ?? [])],
  }
}

/**
 * The body for both create and update.
 *
 * `default_allowance_types` is always sent, as an array — an omitted key is
 * not documented to leave the existing list alone, so clearing the picker to
 * empty and sending it is how an admin actually clears the defaults rather than
 * being unable to.
 */
export function subcategoryPayload(form, { includeId = false } = {}) {
  return {
    ...(includeId && form.id != null ? { id: form.id } : {}),
    name: (form.name ?? '').trim(),
    description: (form.description ?? '').trim(),
    is_active: form.is_active !== false,
    default_allowance_types: Array.isArray(form.allowance_type_ids) ? form.allowance_type_ids : [],
  }
}

// ─── Labels ──────────────────────────────────────────────────────────────────

/** A name, or a counted list of them, for the dialog's allowance-type chips. */
export function allowanceTypeNames(ids, allowanceTypes) {
  const byId = new Map()
  for (const type of Array.isArray(allowanceTypes) ? allowanceTypes : []) {
    if (type?.id == null) continue
    byId.set(String(type.id), type.name || '')
  }

  return (Array.isArray(ids) ? ids : []).map((id) => byId.get(String(id)) || `Type ${id}`)
}

/**
 * What the categories table prints in its subcategory column.
 *
 * A count only when the route embedded the subcategories; otherwise "Manage",
 * which is the action rather than a figure this panel cannot know.
 */
export function subcategorySummary(category) {
  const embedded = category?.subcategories ?? []
  if (!embedded.length) return null
  const total = embedded.length
  const active = embedded.filter((subcategory) => subcategory.isActive).length
  return { total, active, text: `${total} ${total === 1 ? 'subcategory' : 'subcategories'}` }
}

// ─── Applications ─────────────────────────────────────────────────────────────
//
// The review queue behind the Requests page's Compensable Time tab, read from
//   GET  /compensable_time/applications/company/{company_id}/
//
// Two payload decisions drive these readings, and both are shared with the leave
// queue rather than restated here.
//
// **The duration is the accrued figure, not the calendar count.** An application
// reports `total_days` and `total_day_value` under exactly the names, and with
// exactly the disagreeing values, that `/attendance/leave-list/` does — so
// `leaveRequestDurationLabel` is imported rather than copied. Two copies of the
// half-day rule is two places for them to drift apart over what a half day is
// worth, and this tab's duration column sits beside the leave tab's.
//
// **`employee` is a UUID and `employee_name` is a display string.** The name is
// the column, so labelling a row needs no roster lookup. The reference is carried
// only so the page's payout-group filter can resolve the row's contract — a name
// cannot be matched to a contract, which is why leave carries the same three
// aliases and compensable needs only this one.

export function normalizeCompensableApplication(raw = {}) {
  const status = String(raw?.status ?? '').toLowerCase()
  // Read once, then derived from: three consumers want these days in three
  // shapes, and resolving them separately is how the table and the details dialog
  // end up printing different spans for one application.
  const dates = readCompensableDates(raw?.dates)

  return {
    id: raw?.id ?? null,
    employeeRef: raw?.employee ?? null,
    employeeName: raw?.employee_name || '',
    categoryId: raw?.category ?? null,
    categoryName: raw?.category_name || '',
    subCategoryId: raw?.sub_category ?? null,
    subCategoryName: raw?.sub_category_name || '',
    /** The per-day rows, read out of the serialized field — see `readCompensableDates`. */
    dates,
    /** The same days as one readable span, for a cell or a dialog. */
    datesLabel: compensableDatesLabel(dates),
    /** How many of those days are half days — the one fact the span cannot carry. */
    halfDayCount: dates.filter((day) => day.is_half_day).length,
    totalDays: raw?.total_days ?? null,
    totalDayValue: raw?.total_day_value ?? null,
    /** The accrued value, resolved once here so the row, the detail dialog and the
     *  confirmation cannot print three different durations for one application. */
    duration: leaveRequestDurationLabel(raw),
    notes: raw?.notes || '',
    status,
    statusLabel: compensableStatusLabel(status),
    submittedDate: raw?.submitted_at ?? null,
    // Strict boolean, as on the leave queue: the serializer may send a truthy
    // non-boolean and the string "false" would flag every row in the tab. And a
    // decided application carries no live recommendation — its flag is history, so
    // rendering it would annotate an approved row with advice to reject it.
    recommendedForRejection: raw?.is_recommended_for_rejection === true && status === 'pending',
    rejectionNote: raw?.rejection_recommendation_note || '',
    recommendedAt: raw?.recommended_at ?? null,
  }
}

// ─── Application dates ────────────────────────────────────────────────────────
//
// The `dates` field is the one place on an application whose printed form is
// longer than the column it sits in: the list endpoint answers with a **JSON
// string** — a serialized array of `{ date, is_half_day, excess_hours }` — which
// a template interpolates verbatim as a wall of braces and quoted keys. The write
// endpoint takes a real array, so the same field arrives in both shapes depending
// on which direction it is going, and a bare ISO day is a third.
//
// All three are read once here, so no caller has to know which one it got.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** The field as a list, whatever it arrived wrapped in. */
function dateListFrom(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  const text = value.trim()
  if (!text) return []
  // A bare day is not JSON, and `JSON.parse` would throw on it.
  if (ISO_DAY.test(text)) return [text]
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Not an error: this is a payload this code has not seen, and degrading one
    // row to a dash is right where a thrown parse would take out the whole table.
    return []
  }
}

/** One entry into the shape every renderer reads, or null if it names no day. */
function normalizeDateEntry(entry) {
  if (typeof entry === 'string') {
    const day = entry.trim()
    return ISO_DAY.test(day) ? compensableDateEntry(day) : null
  }
  const day = typeof entry?.date === 'string' ? entry.date.trim() : ''
  if (!ISO_DAY.test(day)) return null
  return {
    date: day,
    is_half_day: entry.is_half_day === true,
    excess_hours: Number(entry.excess_hours) || 0,
  }
}

/**
 * The days an application covers, in date order.
 *
 * De-duplicated rather than kept twice: the same day twice would be counted twice
 * by whatever the server credits, and a span reading "Oct 14 – Oct 15" for a list
 * that says so twice is the first sign the payload is wrong.
 *
 * @param {string|Array} value the raw `dates` field
 * @returns {Array<{date: string, is_half_day: boolean, excess_hours: number}>}
 */
export function readCompensableDates(value) {
  const seen = new Map()
  for (const entry of dateListFrom(value)) {
    const row = normalizeDateEntry(entry)
    if (row && !seen.has(row.date)) seen.set(row.date, row)
  }
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** How many days the label names before it counts the rest. */
const DATES_IN_LABEL = 3

/**
 * The days as one readable span.
 *
 * A run of consecutive days collapses to its two ends, because "Oct 14 – Oct 15"
 * is what a reviewer reads and three printed dates is not. Scattered days have no
 * such span, so they are listed and the remainder counted rather than printed —
 * a cell is not the place for a thirty-date payroll period.
 *
 * @param {string|Array} value the raw `dates` field, or rows already read
 * @returns {string} an em dash when there are no readable days
 */
export function compensableDatesLabel(value) {
  const days = readCompensableDates(value).map((row) => row.date)
  if (!days.length) return '—'
  if (days.length === 1) return longLabel(days[0])

  // Consecutive by construction, since `readCompensableDates` sorted them.
  const consecutive = days.every((day, index) => index === 0 || day === shiftIso(days[index - 1], 1))
  if (consecutive) return `${longLabel(days[0])} – ${longLabel(days[days.length - 1])}`

  const shown = days.slice(0, DATES_IN_LABEL).map(longLabel).join(', ')
  const extra = days.length - DATES_IN_LABEL
  return extra > 0 ? `${shown} +${extra} more` : shown
}

export function normalizeCompensableApplications(payload) {
  return rowsFrom(payload).map(normalizeCompensableApplication)
}

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

/**
 * A status as a person reads it, falling back to the server's own token
 * capitalised — an unrecognised status is a payload this code has not seen, and
 * printing it verbatim beats printing "Unknown" for a decision someone must make.
 */
export function compensableStatusLabel(status) {
  const key = String(status ?? '').toLowerCase()
  if (!key) return 'Unknown'
  return STATUS_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * The pill class for a status, matching the classes `requestGrid.css` already
 * styles and the other three queues return. Anything unrecognised is neutral
 * rather than borrowed from a status it is not.
 */
export function compensableStatusPillClass(status) {
  const key = String(status ?? '').toLowerCase()
  if (key === 'pending') return 'status-pill--pending'
  if (key === 'approved') return 'status-pill--approved'
  if (key === 'rejected') return 'status-pill--rejected'
  return 'status-pill--default'
}

// ─── Application allowances ───────────────────────────────────────────────────
//
// The money attached to one application:
//   GET  /compensable_time/applications/{id}/allowances/list/
//   POST /compensable_time/applications/{id}/allowances/
//   POST /compensable_time/applications/{id}/allowances/revert/
//
// The list answers `{ allowances, total_amount }` rather than the bare array every
// other list in this file does, which is why the reader below is not `rowsFrom`.

function normalizeCompensableAllowance(raw = {}) {
  return {
    id: raw?.id ?? null,
    typeId: raw?.allowance_type ?? null,
    typeName: raw?.allowance_type_name || 'Allowance',
    /** Raw decimal string exactly as sent, for the round trip the revert call
     *  would need; `amount` is the number everything displays. */
    amountRaw: String(raw?.amount ?? ''),
    amount: Number(raw?.amount ?? 0),
    notes: (raw?.notes || '').trim(),
    createdAt: raw?.created_at ?? null,
  }
}

/**
 * One allowance listing into `{ allowances, total }`.
 *
 * `total` is the server's own figure, kept as the string it arrived as and
 * printed as such: a client-side re-sum of the rows would eventually disagree
 * with the server about whether a reverted allowance counts, and that
 * disagreement is a wrong number attached to a request.
 *
 * A row with no id is dropped rather than rendered — the revert endpoint takes
 * allowance ids, and a row that cannot be removed should not offer the affordance.
 *
 * @param {object} payload the `/allowances/list/` body
 */
export function readCompensableAllowances(payload) {
  const envelope = Array.isArray(payload) ? { allowances: payload } : (payload?.data ?? payload ?? {})
  const rows = Array.isArray(envelope?.allowances) ? envelope.allowances : []
  const total = envelope?.total_amount

  return {
    allowances: rows.map(normalizeCompensableAllowance).filter((row) => row.id !== null),
    total: total === null || total === undefined || total === '' ? null : String(total),
  }
}

/** The add body for `POST .../allowances/`, from one draft row. */
export function compensableAllowancePayload(draft = {}) {
  return {
    allowances: [
      {
        allowance_type: draft.allowanceType ?? null,
        amount: String(draft.amount ?? '').trim(),
        notes: (draft.notes ?? '').trim(),
      },
    ],
  }
}

// ─── Applying ─────────────────────────────────────────────────────────────────
//
// Filing an application on someone's behalf, through
//   POST /compensable_time/applications/company/{company_id}/bulk-create/
//
// One request covers several employees at once, and the per-day detail is an
// array rather than a start/end pair — a rest day worked is one date in the
// middle of a month, not every day of a span, so the dates are collected one at a
// time and sent as the entries they are.

/**
 * How many dates one application may carry.
 *
 * A cap rather than a hard rule: the list is built one date at a time, so
 * reaching it means an admin is holding the button down or pasting a payroll
 * period in by mistake. Either way the request is not what they meant to file,
 * and saying so is cheaper than a 400 carrying that same news in worse words.
 */
export const MAX_COMPENSABLE_DATES = 60

/** A fresh entry for the date list: a full day with no excess hours recorded. */
export function compensableDateEntry(date) {
  return { date, is_half_day: false, excess_hours: 0 }
}

/**
 * The active rows out of a normalized list, for a picker.
 *
 * `isActive` already carries the absent-means-active default `normalizeCategory`
 * and `normalizeSubcategory` apply, so this only has to drop the rows an admin
 * switched off. A picker that offered a deactivated subcategory would let an
 * admin file work against a rule this company no longer uses.
 */
export function offeredCategories(categories) {
  return (Array.isArray(categories) ? categories : []).filter((row) => row?.isActive)
}

export function offeredSubcategories(subcategories) {
  return (Array.isArray(subcategories) ? subcategories : []).filter((row) => row?.isActive)
}

/**
 * The bulk-create body.
 *
 * Two deliberate coercions. **`excess_hours` is always sent, as a number, and is
 * `0` when the admin left it blank** — the endpoint's own sample carries the key
 * on every entry, so omitting it is the shape this code knows works, and a blank
 * field means "none recorded" rather than "leave it out".
 *
 * **`is_half_day` is a strict boolean.** It arrives from a segmented toggle as one
 * already, but a truthy reading would turn the string "false" into a half day.
 */
export function compensableApplyPayload(draft = {}) {
  const dates = Array.isArray(draft.dates) ? draft.dates : []
  return {
    employee_ids: (Array.isArray(draft.employeeIds) ? draft.employeeIds : []).filter(
      (id) => id !== null && id !== undefined && id !== '',
    ),
    sub_category: draft.subCategory ?? null,
    dates: dates.map((entry) => ({
      date: entry?.date ?? '',
      is_half_day: entry?.is_half_day === true,
      excess_hours: Number(entry?.excess_hours) || 0,
    })),
    notes: (draft.notes ?? '').trim(),
  }
}
