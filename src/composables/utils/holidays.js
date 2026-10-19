/**
 * Holidays — one dated occurrence of a holiday type.
 *
 *   GET    /attendance/holidays/company/{company_id}/
 *   POST   /attendance/holidays/company/{company_id}/
 *   DELETE /attendance/holidays/{id}/
 *
 * A **Holiday** is one dated occurrence; a **HolidayType** is the kind of thing
 * it is, and those live in `holidayTypes.js`. The two are separate resources and
 * the type comes first: a holiday attaches itself to a type **by code**, not by
 * id, so the string a HolidayType's `code` field carries is what goes out as
 * `holiday_type` — and what comes back on a row.
 *
 * Three things drive the helpers below.
 *
 * First, **`holiday_type` is a code, never an id.** Nothing here resolves one
 * into the other: `holidayTypeLabel` turns a code into the *name* a reader wants
 * while leaving the code itself untouched underneath, because a type that has
 * been deleted leaves its holidays pointing at a code nothing carries — and
 * showing the code is the honest reading of that, where showing nothing would
 * read as a bug in this table.
 *
 * Second, **`date` is a calendar day, not an instant** — `YYYY-MM-DD` in the
 * viewer's own timezone, which is what `todayIso()` returns. Nothing here builds
 * one from `new Date()` directly, and `isIsoDay` checks the round trip so a typed
 * `2026-02-30` is refused here rather than saved and read back shifted.
 *
 * Third, **`is_paid` and `pay_percentage` are server-set and unrendered.** The
 * create body takes neither, so `holidayPayload` sends neither, and the Holidays
 * panel has no column for either. `normalizeHoliday` still maps them, because a
 * normalizer's job is to reflect what the endpoint sends — but `isPaid` is null
 * rather than false when the flag is absent, so the row never claims "unpaid" on
 * the strength of a field that was not sent. Whoever surfaces it next inherits
 * that distinction.
 */
import { fromIso, todayIso, toIso } from 'src/composables/utils/calendarDate'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * A string is a real `YYYY-MM-DD` calendar day.
 *
 * The round trip is the test: `fromIso('2026-02-30')` lands on 2 March, so
 * `toIso` does not give the input back. Format alone would accept it.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isIsoDay(value) {
  const iso = String(value || '')
  if (!ISO_DAY.test(iso)) return false
  const date = fromIso(iso)
  return !isNaN(date.getTime()) && toIso(date) === iso
}

/**
 * An empty holiday form.
 *
 * `date` starts on today, read per call rather than cached — a form built at
 * module load would open on the day the module loaded.
 */
export function emptyHolidayForm() {
  return {
    name: '',
    date: todayIso(),
    holiday_type: '',
    is_recurring: false,
  }
}

/**
 * An existing holiday as the form reads it.
 *
 * Only the four editable fields, and `holiday_type` taken off the code: the row
 * already holds a code and the picker already offers codes, so they are in the
 * same language and no translation happens in between. `date` is already an ISO
 * calendar day on both sides.
 */
export function holidayToForm(holiday) {
  return {
    name: holiday?.name || '',
    date: holiday?.date || '',
    holiday_type: holiday?.holidayTypeCode || '',
    is_recurring: Boolean(holiday?.isRecurring),
  }
}

/**
 * One holiday into the shape every renderer reads.
 *
 * `isPaid` is null when the flag is absent, never false, and `payPercentage` is
 * null rather than zero — both are mapped because the endpoint sends them, and
 * both are currently read by nothing. See the header.
 */
export function normalizeHoliday(raw) {
  return {
    id: raw?.id ?? null,
    companyId: raw?.company ?? null,
    name: raw?.name || '',
    // The date **part** of whatever the endpoint sent. The create body takes a
    // bare `YYYY-MM-DD`, but a row can come back as a full timestamp, and the
    // row above it — with the same day — would then never match: the exact
    // compare fails on the suffix and `holidayForDate`'s recurring branch slices
    // `MM-DD` off something like `10-19T00:00:00Z`. Trimming here rather than at
    // each comparison keeps the match, the recurring month-day test and
    // `sortHolidays` reading the same string. A no-op on a bare date.
    date: String(raw?.date || '').slice(0, 10),
    /** The code. Read `holidayTypeLabel` for the name; this stays the code. */
    holidayTypeCode: raw?.holiday_type || '',
    isPaid: raw?.is_paid ?? null,
    payPercentage: raw?.pay_percentage ?? null,
    isRecurring: raw?.is_recurring ?? false,
    createdAt: raw?.created_at || '',
    updatedAt: raw?.updated_at || '',
  }
}

/**
 * A list response into rows, read in calendar order.
 *
 * The wrapper is not uniform across this API, so `{results}` and `{data}` are
 * both accepted before falling back to nothing.
 */
export function normalizeHolidays(raw) {
  const rows = Array.isArray(raw) ? raw : (raw?.results ?? raw?.data ?? [])
  return sortHolidays((Array.isArray(rows) ? rows : []).map(normalizeHoliday))
}

/**
 * Earliest date first, so the panel reads as a calendar rather than as whatever
 * order the rows arrived in. A row with no date cannot be placed on one, so it
 * goes to the end rather than to the top where it would look like the nearest
 * holiday.
 */
export function sortHolidays(rows = []) {
  return [...rows].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    if (a.date === b.date) return String(a.name || '').localeCompare(String(b.name || ''))
    return a.date < b.date ? -1 : 1
  })
}

/**
 * A holiday type code as the reader sees it.
 *
 * `isOrphan` marks a code no current type carries: the type was deleted, or the
 * holiday names one that was never configured. The code is shown anyway rather
 * than blanked — a blank cell reads as "we could not find this holiday", which
 * is a different and wrong answer.
 *
 * @param {string} code
 * @param {Array} types - rows as `normalizeHolidayType` returns them
 * @returns {{label: string, isOrphan: boolean}}
 */
export function holidayTypeLabel(code, types = []) {
  const needle = String(code || '')
  if (!needle) return { label: 'No type', isOrphan: true }
  const match = (Array.isArray(types) ? types : []).find((type) => type?.code === needle)
  if (match) return { label: match.name, isOrphan: false }
  return { label: needle, isOrphan: true }
}

/** Whether the holiday comes back every year, as two words. */
export function recurringLabel(isRecurring) {
  return isRecurring ? 'Every year' : 'One-off'
}

/**
 * The holiday falling on one calendar day, or null.
 *
 * **Exact first, then a recurring match on month and day.** A recurring holiday
 * carries the year it was entered in, so comparing whole dates would drop it off
 * the grid the first January that passed — the schedule reads a week, and this
 * is how a `is_recurring` Christmas keeps landing on 25 December without anyone
 * re-adding it each year.
 *
 * An exact match wins when both would match: a one-off dated that day is the more
 * specific answer, and a recurring rule is the fallback rather than the override.
 *
 * @param {Array} holidays - rows as `normalizeHolidays` returns them
 * @param {string} iso - `YYYY-MM-DD`
 * @returns {object|null} the holiday row, or null
 */
export function holidayForDate(holidays, iso) {
  const day = String(iso || '')
  if (!isIsoDay(day)) return null

  const rows = Array.isArray(holidays) ? holidays : []
  const monthDay = day.slice(5)

  const exact = rows.filter((holiday) => holiday?.date === day)
  const recurring = rows.filter(
    (holiday) => holiday?.isRecurring && String(holiday?.date || '').slice(5) === monthDay,
  )

  // Exact first: a one-off dated that day is the more specific answer, and it has
  // to win over a recurring rule that merely lands on the same month and day.
  // Within each group a row that has a name wins over one that does not — two
  // holidays can share a date, and a blank one would otherwise sort ahead of the
  // named one and render nothing where the reader can see there is a holiday.
  const named = (candidates) =>
    candidates.find((holiday) => String(holiday?.name || '').trim()) || candidates[0] || null

  return named(exact) || named(recurring)
}

/**
 * The holiday types as picker options, valued by **code**.
 *
 * A type with no code is left out: it cannot be attached to by string, and
 * offering it would let an admin pick a row that saves a holiday attached to
 * nothing.
 *
 * @param {Array} types - rows as `normalizeHolidayType` returns them
 * @returns {Array<{value: string, label: string}>}
 */
export function holidayTypeOptions(types = []) {
  return (Array.isArray(types) ? types : [])
    .filter((type) => type?.code)
    .map((type) => ({ value: type.code, label: type.name }))
}

/**
 * The create body.
 *
 * `company` is carried here as well as in the path, because the payload
 * declares it and a company-scoped write that disagrees with its own path is
 * not a question worth asking. `is_paid` and `pay_percentage` are absent on
 * purpose — the endpoint sets them.
 *
 * @param {object} form - as `emptyHolidayForm` returns it
 * @param {number|string} companyId
 */
export function holidayPayload(form, companyId) {
  return {
    company: Number(companyId),
    name: String(form?.name || '').trim(),
    date: form?.date || '',
    holiday_type: String(form?.holiday_type || '').trim(),
    is_recurring: Boolean(form?.is_recurring),
  }
}

/**
 * The update body, for `PATCH /attendance/holidays/{id}/`.
 *
 * Three fields are deliberately absent.
 *
 * **`company`** — the row already belongs to one. Re-sending it is the kind of
 * field a reassignment bug rides in on, and `useAdminHolidayTypes` leaves it out
 * of its updates for the same reason.
 *
 * **`is_paid` and `pay_percentage`** — the endpoint sets them, the create body
 * does not take them, and no form collects them. A PATCH is partial, so leaving
 * them out is what "unchanged" means; sending `false` or `0` would be an
 * instruction to clear them.
 *
 * `id`, `created_at` and `updated_at` stay out for the same reason `company`
 * does — the path carries the id, and the stamps are the server's to write.
 *
 * @param {object} form - as `emptyHolidayForm` / `holidayToForm` return it
 */
export function holidayUpdatePayload(form) {
  return {
    name: String(form?.name || '').trim(),
    date: form?.date || '',
    holiday_type: String(form?.holiday_type || '').trim(),
    is_recurring: Boolean(form?.is_recurring),
  }
}

/**
 * Why a holiday cannot be saved, or `null`.
 *
 * Sentences rather than field names, for the reason `validateHolidayTypeForm`
 * gives: the form is small and fully visible. The same rules apply to an edit:
 * a holiday that cannot be saved cannot be corrected either.
 */
export function validateHolidayForm(form) {
  if (!String(form?.name || '').trim()) return 'Give the holiday a name.'
  if (!isIsoDay(form?.date)) return 'Give the holiday the date it falls on, as YYYY-MM-DD.'
  if (!String(form?.holiday_type || '').trim()) return 'Choose the holiday type it belongs to.'
  return null
}
