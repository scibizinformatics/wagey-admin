/**
 * NFC access cards — payload normalisation and every reading derived from it.
 *
 * One module for the same reason the other per-feature modules exist: the table,
 * the card list, the summary line, the detail dialog and the assign dialog all
 * describe the same card, and none of them may invent its own arithmetic for
 * "is this card assigned" or "when was it last used".
 *
 * Three traps in this payload are worth knowing before touching anything here.
 *
 * `employee` is a **display string, not an id**. The list endpoint sends the
 * literal `"Not yet assigned"` for a free card rather than null, so the obvious
 * `if (card.employee)` is true for every row and the whole table reads as
 * assigned. `assignedNameOf` folds that sentinel — and the handful of others the
 * backend has been seen to use — back to ''. It also means the roster is the
 * only way to get from a row to a person: nothing in the list identifies the
 * employee by id, which is why the avatars are matched by name.
 *
 * `last_tap` arrives **pre-formatted in the server's timezone**, sometimes with
 * a trailing zone abbreviation ("2026-09-08 11:57:11 PST") and sometimes
 * without. It is therefore displayed as it was sent — split, never reformatted,
 * the same call `assignmentHistory.js` makes — and parsed only to sort and to
 * say how long ago it was. A card that has never been tapped sends null, which
 * is "never used", not "used at the epoch".
 *
 * `status` and `status_display` say the same thing in two registers, and only
 * the detail endpoint sends the second one. `cardStatus` reads the machine value
 * and keeps the server's own wording as the label when it has it, so a status
 * this app has not been taught still prints as itself instead of vanishing.
 */

import { longLabel } from 'src/composables/utils/calendarDate'

/** Trimmed string, or ''. The payload uses null, '' and absent interchangeably. */
function text(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value.trim() : String(value).trim()
}

// ─── Assignment ──────────────────────────────────────────────────────────────

/**
 * Values the backend sends in `employee` to mean "nobody". They are ordinary
 * strings, so every one of them is truthy — which is the whole trap.
 */
const UNASSIGNED = new Set([
  '',
  '-',
  '—',
  'n/a',
  'na',
  'none',
  'null',
  'unassigned',
  'not assigned',
  'not yet assigned',
])

/**
 * The name of the person holding a card, or '' when it is free.
 *
 * @param {unknown} value the payload's `employee` field, in any of its shapes
 */
export function assignedNameOf(value) {
  if (value && typeof value === 'object') {
    const nested =
      value.full_name ||
      value.name ||
      `${value.first_name || ''} ${value.last_name || ''}`.trim() ||
      value.username
    return text(nested)
  }
  const name = text(value)
  return UNASSIGNED.has(name.toLowerCase()) ? '' : name
}

// ─── Status ──────────────────────────────────────────────────────────────────

const STATUSES = {
  active: { key: 'active', label: 'Active', tone: 'good' },
  // Grey rather than red: an inactive card is switched off, not broken. The red
  // is kept for the states that mean a card is out there and should not be.
  inactive: { key: 'inactive', label: 'Inactive', tone: 'neutral' },
  lost: { key: 'lost', label: 'Lost', tone: 'critical' },
  stolen: { key: 'stolen', label: 'Stolen', tone: 'critical' },
  damaged: { key: 'damaged', label: 'Damaged', tone: 'warn' },
  expired: { key: 'expired', label: 'Expired', tone: 'neutral' },
  revoked: { key: 'revoked', label: 'Revoked', tone: 'neutral' },
}

/**
 * @param {unknown} raw      the `status` field
 * @param {unknown} display  the `status_display` field, detail payload only
 * @returns {{key: string, label: string, tone: string}}
 */
export function cardStatus(raw, display) {
  const key = text(raw).toLowerCase().replace(/\s+/g, '_')
  const known = STATUSES[key]
  const label = text(display)
  if (known) return label ? { ...known, label } : known
  // Unknown to this app, but the server named it — print the server's wording
  // rather than a blank cell, in the neutral tone that promises nothing.
  return { key: key || 'unknown', label: label || text(raw) || 'Unknown', tone: 'neutral' }
}

/** `dash-chip` tone modifier for a state; neutral is the unmodified chip. */
export function chipClass(tone) {
  return tone && tone !== 'neutral' ? `dash-chip--${tone}` : ''
}

// ─── Timestamps ──────────────────────────────────────────────────────────────

// "2026-09-08 11:36:52", or the same with a trailing zone ("… PST") or a T
// separator. Matched by hand rather than handed to `new Date(string)`, which
// reads that shape inconsistently across browsers — and so that a change in the
// server's formatting shows up here instead of producing silent NaN sort keys.
// The fractional part is consumed and dropped rather than captured: to the
// second is as precise as a door tap is ever read, and ".076854" in a table cell
// is noise.
const TAP = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(.*)$/

/**
 * A tap stamp to milliseconds, for sorting and for "how long ago" only.
 *
 * Built from the parts in the server's own clock, so nothing is shifted by the
 * reader's timezone. Returns NaN when it will not parse, which callers treat as
 * "cannot say" rather than sorting the row to one far end of the list.
 */
export function tapToMs(value) {
  const raw = text(value)
  if (!raw) return NaN
  const match = raw.match(TAP)
  if (!match) {
    const parsed = Date.parse(raw)
    return Number.isNaN(parsed) ? NaN : parsed
  }
  const [, year, month, day, hour, minute, second] = match
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second || 0),
  ).getTime()
}

/**
 * A tap stamp split for layout: `{ day, time }`.
 *
 * The day is relabelled from its ISO part ("Sep 8, 2026"); the clock half is a
 * substring of what the server sent, zone abbreviation included, so the wall
 * clock a reader sees is the one the door recorded.
 */
export function splitTap(value) {
  const raw = text(value)
  if (!raw) return { day: '', time: '' }
  const match = raw.match(TAP)
  if (!match) return { day: raw, time: '' }
  const [, year, month, day, hour, minute, second, rest] = match
  const clock = `${hour}:${minute}${second ? `:${second}` : ''}${rest ? ` ${text(rest)}` : ''}`
  return { day: longLabel(`${year}-${month}-${day}`), time: clock.trim() }
}

const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000

/**
 * "4 hours ago" for a tap stamp — the secondary line under the date, so nobody
 * has to subtract today's date from it to know whether the card is in use.
 *
 * @param {number} ms from `tapToMs`
 * @param {number} [now] injectable for tests; defaults to the current instant
 */
export function tapAgo(ms, now = Date.now()) {
  if (!Number.isFinite(ms)) return ''
  const gap = now - ms
  if (gap < MS_PER_MINUTE) return 'just now'
  if (gap < MS_PER_HOUR) return `${Math.floor(gap / MS_PER_MINUTE)} min ago`
  if (gap < MS_PER_DAY) {
    const hours = Math.floor(gap / MS_PER_HOUR)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  const days = Math.floor(gap / MS_PER_DAY)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`
  const years = Math.round(days / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

/**
 * One of the card's lifecycle stamps — `issued_at`, `activated_at`,
 * `deactivated_at`, `expires_at` — for the detail dialog.
 *
 * These are true ISO-8601 instants carrying an offset
 * ("2026-09-08T11:57:11.076854+08:00"), unlike `last_tap`, which arrives
 * already formatted in the server's clock with at most a zone abbreviation
 * stuck on the end. That difference is why the two are handled apart: an
 * instant with an offset can be placed correctly in the reader's own timezone,
 * and a pre-formatted local string cannot be placed anywhere at all — reading
 * one as the other is how a tap moves eight hours.
 */
export function formatStamp(value) {
  const raw = text(value)
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ─── The two states worth naming ─────────────────────────────────────────────

/**
 * A card whose assignment and status disagree.
 *
 * These are the only rows on the page that are neither working nor deliberately
 * put away, and neither one is visible from its two columns separately — you
 * have to read them together, which is exactly the reading a table does not make
 * for you.
 *
 *  - **Active, unassigned**: a live credential belonging to nobody. If it goes
 *    missing there is no name to ask about it.
 *  - **Assigned, inactive**: somebody is carrying a card that will not open the
 *    door, and will report it as broken rather than as switched off.
 *
 * Anything else — active and held, inactive and free — is a settled state and
 * returns null.
 *
 * @returns {{key: string, label: string, tone: string, detail: string}|null}
 */
export function cardAlert(card) {
  if (!card) return null
  const active = card.status?.key === 'active'
  if (active && !card.assigned) {
    return {
      key: 'loose',
      label: 'Active, unassigned',
      tone: 'warn',
      detail: 'This card works but belongs to nobody. Assign it, or set it inactive.',
    }
  }
  if (!active && card.assigned && card.status?.key === 'inactive') {
    return {
      key: 'dormant',
      label: 'Assigned, inactive',
      tone: 'warn',
      detail: `${card.employeeName} is holding a card a reader will not accept.`,
    }
  }
  return null
}

// ─── Normalisation ───────────────────────────────────────────────────────────

/**
 * One list row into the shape every renderer reads.
 *
 * `uid` is the identity — the list payload carries no id at all, and the write
 * endpoints take the uid in the path — so it is also the row key.
 */
export function normalizeAccessCard(raw, index = 0) {
  const uid = text(raw?.uid)
  const employeeName = assignedNameOf(raw?.employee)
  const lastTap = text(raw?.last_tap)
  const { day, time } = splitTap(lastTap)
  const card = {
    key: uid || `card-${index}`,
    id: raw?.id ?? null,
    uid,
    cardType: text(raw?.card_type) || 'nfc',
    label: text(raw?.label),
    employeeName,
    assigned: Boolean(employeeName),
    status: cardStatus(raw?.status, raw?.status_display),
    statusRaw: text(raw?.status).toLowerCase(),
    companyName: text(raw?.company_name),
    lastTapRaw: lastTap,
    lastTapDay: day,
    lastTapTime: time,
    lastTapMs: tapToMs(lastTap),
    issuedAt: text(raw?.issued_at),
    activatedAt: text(raw?.activated_at),
    deactivatedAt: text(raw?.deactivated_at),
    expiresAt: text(raw?.expires_at),
    raw: raw ?? {},
  }
  card.alert = cardAlert(card)
  return card
}

export function normalizeAccessCards(list) {
  return (Array.isArray(list) ? list : []).map(normalizeAccessCard)
}

// ─── Filtering, sorting, counting ────────────────────────────────────────────

export const ASSIGNMENT_FILTERS = [
  { label: 'All cards', value: 'all' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Unassigned', value: 'unassigned' },
  { label: 'Needs attention', value: 'alert' },
]

export const STATUS_FILTERS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

export function matchesAssignment(card, filter) {
  if (filter === 'assigned') return card.assigned
  if (filter === 'unassigned') return !card.assigned
  if (filter === 'alert') return Boolean(card.alert)
  return true
}

export function matchesSearch(card, term) {
  if (!term) return true
  return [card.uid, card.employeeName, card.status.label, card.cardType, card.label].some((field) =>
    String(field ?? '')
      .toLowerCase()
      .includes(term),
  )
}

/** Unparseable and never-tapped stamps sort last in both directions: they are
 *  "no reading", and a reading is what the column is ordered by. */
function byTap(direction) {
  return (a, b) => {
    const left = Number.isFinite(a.lastTapMs) ? a.lastTapMs : null
    const right = Number.isFinite(b.lastTapMs) ? b.lastTapMs : null
    if (left === null && right === null) return a.uid.localeCompare(b.uid)
    if (left === null) return 1
    if (right === null) return -1
    return direction * (right - left)
  }
}

export const SORTS = {
  recent: byTap(1),
  oldest: byTap(-1),
  uid: (a, b) => a.uid.localeCompare(b.uid),
  // Unassigned cards after the named ones rather than at the top under an empty
  // string, which would read as a block of broken rows.
  employee: (a, b) => {
    if (a.assigned !== b.assigned) return a.assigned ? -1 : 1
    return a.employeeName.localeCompare(b.employeeName) || a.uid.localeCompare(b.uid)
  },
}

export const SORT_OPTIONS = [
  { label: 'Recently tapped', value: 'recent' },
  { label: 'Least recently tapped', value: 'oldest' },
  { label: 'Card UID', value: 'uid' },
  { label: 'Employee A–Z', value: 'employee' },
]

/** Counts for the page header. One pass, so the figures cannot disagree. */
export function summarizeAccessCards(cards) {
  const tally = { total: 0, assigned: 0, unassigned: 0, active: 0, inactive: 0, alerts: 0 }
  for (const card of cards) {
    tally.total += 1
    if (card.assigned) tally.assigned += 1
    else tally.unassigned += 1
    if (card.status.key === 'active') tally.active += 1
    else tally.inactive += 1
    if (card.alert) tally.alerts += 1
  }
  return tally
}

/**
 * A uid in four-character runs, for display only.
 *
 * Never what gets copied: a reader pasting the uid into a door controller or a
 * ticket needs the raw value, so the copy button hands over `uid` itself and
 * this only changes what the eye has to track across fourteen hex digits.
 */
export function formatUid(uid) {
  const raw = text(uid)
  if (!raw) return '—'
  return raw.replace(/(.{4})/g, '$1 ').trim()
}

/**
 * A typed-in UID into the form the API keys on.
 *
 * Somebody entering a card by hand is reading it off a sticker, off a reader's
 * console, or out of this app's own spaced display — and those write the same
 * fourteen digits as `04:21:63:01:9F:04:03`, `04-2163-019F-0403`,
 * `0421 6301 9F04 03` and `042163019f0403`. The endpoint accepts exactly one of
 * those, so every separator is dropped and the hex is upper-cased before it goes
 * anywhere near a URL. Anything that is not a hex digit is dropped too, which
 * is what makes a pasted `UID: 042163019F0403` work.
 */
export function normalizeUidInput(value) {
  return text(value)
    .toUpperCase()
    .replace(/[^0-9A-F]/g, '')
}
