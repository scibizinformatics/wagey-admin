/**
 * Employee devices — payload normalisation and every reading derived from it.
 *
 * One module for the same reason the other per-feature modules exist: the table,
 * the card list, the summary line and the two dialogs all describe the same
 * device, and none of them may invent its own reading for "is this device in
 * use" or "why was it switched off".
 *
 * Three things about this payload are worth knowing before touching anything
 * here.
 *
 * `is_active` is read **strictly**: `true` is active, `false` is deactivated,
 * and anything else is Unknown. An absent flag silently reading as "in use"
 * would print a working device on top of one that has been switched off, and
 * that is the worse of the two mistakes — never treated as `0`, never treated as
 * `true`. The same strictness is why the deactivated count in the summary folds
 * Unknown in with Deactivated for the header line (the chip still tells them
 * apart) rather than pretending an unreadable row is active.
 *
 * `registered_at`, `last_seen_at` and `deactivated_at` are **instants** — ISO
 * strings carrying a zone offset — so they print through `formatDateTime()` in
 * `utils/format.js`, in the reader's own timezone. A value that cannot be parsed
 * is printed as it arrived rather than blanked, and a device that has never
 * reported in prints "Never", not epoch.
 *
 * `deactivated_reason` arrives as the server's own token ("replaced" in the
 * documented payload). `DEACTIVATE_REASONS` below is the *write* vocabulary, and
 * a payload token this app has not been taught still prints as itself, pushed
 * through `deactivateReasonLabel` — the same call access cards makes with an
 * unknown status — instead of vanishing behind "Unknown".
 */

import { formatDateTime } from 'src/composables/utils/format'

/** Trimmed string, or ''. The payload uses null, '' and absent interchangeably. */
function text(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value.trim() : String(value).trim()
}

/** A timestamp from the payload as epoch milliseconds, or null when absent or unparseable. */
function instantMs(value) {
  if (value == null || value === '') return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

// ── Device type ──────────────────────────────────────────────────────────────

/**
 * Every device type this app can *print*. `device_type` is a display token, not
 * a choice — devices report what they run, so anything the backend sends that is
 * not in this map is rendered as itself (capitalised) rather than folded into an
 * Unknown bucket.
 */
const DEVICE_TYPES = {
  android: { label: 'Android', icon: 'o_android' },
  ios: { label: 'iOS', icon: 'o_phone_iphone' },
  // The app also runs as a browser build, and the backend has been seen to send
  // both spellings for it. They read as one type on screen because they are one.
  web: { label: 'Web', icon: 'o_laptop' },
  browser: { label: 'Web', icon: 'o_laptop' },
  unknown: { label: 'Unknown', icon: 'o_help_outline' },
}

/**
 * The type of a device, as `{ key, label, icon }`.
 *
 * @param {unknown} value the payload's `device_type`, in any of its shapes
 */
export function deviceTypeOf(value) {
  const key = text(value).toLowerCase()
  const known = DEVICE_TYPES[key]
  if (known) return { key, label: known.label, icon: known.icon }
  return { key: key || 'unknown', label: key ? capitalize(key) : 'Unknown', icon: 'o_help_outline' }
}

/** Capitalise the first letter only — "hyperion" stays "Hyperion", not "HYPERION". */
function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// ── Status ───────────────────────────────────────────────────────────────────

/**
 * The three states `is_active` can resolve to. Deactivated is **neutral grey,
 * not red**: switching a device off is a deliberate act, and the red tones are
 * kept for pages whose status means something is broken or out of hand. The
 * reason line under the chip carries the why.
 */
export const DEVICE_STATUSES = {
  active: { key: 'active', label: 'Active', tone: 'good' },
  deactivated: { key: 'deactivated', label: 'Deactivated', tone: 'neutral' },
  unknown: { key: 'unknown', label: 'Unknown', tone: 'neutral' },
}

/**
 * Whether a device is in use right now. Strict, as the file header says — this
 * is the one reading the whole feature shares, so the missing-flag case lives
 * here rather than in whichever renderer got there first.
 *
 * @param {unknown} value the payload's `is_active`
 */
export function deviceStatusOf(value) {
  if (value === true) return DEVICE_STATUSES.active
  if (value === false) return DEVICE_STATUSES.deactivated
  return DEVICE_STATUSES.unknown
}

// ── Deactivation reasons ─────────────────────────────────────────────────────

/**
 * The reasons deactivation can be given, one row each — this is the **single
 * source** for both the dialog's select and the guard on the write. Only
 * `replaced` is evidenced by the documented payload; the rest are the words the
 * feature would naturally carry. If the backend validates against a narrower
 * enum, correct it here once and the select, the guard and the labels all follow.
 *
 * Order is deliberate: the administrative grade (replaced, retired) before the
 * security grades (lost, stolen), so the everyday answer is the default reading
 * and the alarming ones sit where a scan still finds them.
 */
export const DEACTIVATE_REASONS = [
  { value: 'replaced', label: 'Replaced' },
  { value: 'retired', label: 'Retired' },
  { value: 'lost', label: 'Lost' },
  { value: 'stolen', label: 'Stolen' },
  { value: 'other', label: 'Other' },
]

/** The value set, for guarding the write rather than rendering a select. */
const DEACTIVATE_REASON_VALUES = new Set(DEACTIVATE_REASONS.map((reason) => reason.value))

/**
 * Is this one of the reasons `deactivate.ts` is allowed to send? Checked at the
 * write, not left to the select: a stale option reappearing in a form is exactly
 * the failure a form select cannot catch alone.
 *
 * @param {unknown} value
 */
export function isDeactivateReason(value) {
  return DEACTIVATE_REASON_VALUES.has(text(value).toLowerCase())
}

/**
 * The human label for a reason token — from `DEACTIVATE_REASONS` when it has been
 * taught, otherwise the token itself, tidied to a capital. A token this app has
 * not been taught was still the server's answer, so printing it beats printing
 * "Unknown" over real information.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function deactivateReasonLabel(value) {
  const key = text(value).toLowerCase()
  const known = DEACTIVATE_REASONS.find((reason) => reason.value === key)
  if (known) return known.label
  return key ? capitalize(key) : ''
}

/**
 * Tone to the chip modifier class the design system carries. Neutral — and any
 * tone this app has not been taught — rides the base `.dash-chip` styling, so a
 * status hue this page does not know degrades to grey rather than to red.
 *
 * @param {string} tone
 * @returns {string}
 */
export function chipClass(tone) {
  if (tone === 'good') return 'dash-chip--good'
  if (tone === 'critical') return 'dash-chip--critical'
  if (tone === 'warn') return 'dash-chip--warn'
  if (tone === 'info') return 'dash-chip--info'
  return ''
}

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * What can be done to a device, as the descriptors the shared `RowMenu` renders.
 * The single source for the verbs so the table, the card list and the detail
 * dialog cannot offer different sets — the same call `statusActionsFor` makes for
 * access cards.
 *
 * A deactivated device has nothing left to offer but its record: there is no
 * reactivate verb here, because only registering again from the app brings a
 * device back.
 *
 * @param {object|null} device a normalised row
 */
export function deviceActionsFor(device) {
  if (!device) return []
  const actions = [{ key: 'view', label: 'View details', icon: 'o_visibility' }]
  if (device.isActive === true) {
    actions.push({
      key: 'deactivate',
      label: 'Deactivate device',
      icon: 'o_mobile_off',
      tone: 'danger',
      separatorBefore: true,
    })
  }
  return actions
}

// ── Search, filters, summary, sort ───────────────────────────────────────────

/**
 * Does this device match the toolbar's search term? Searches across everything a
 * reader might type when looking for one: the employee's name, the device's own
 * name, the uuid pasted from a support ticket, the type and the reason.
 *
 * @param {object} device a normalised row
 * @param {string} term the trimmed search term (may be empty)
 */
export function matchesSearch(device, term) {
  const needle = text(term).toLowerCase()
  if (!needle) return true
  const haystack = [
    device.employeeName,
    device.deviceName,
    device.deviceUuid,
    device.deviceType.label,
    device.deactivatedReasonLabel,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

/**
 * The status filter's narrowings. "Active" is the strict chip status, so a
 * device whose flag we could not read shows only under All — it is not claimed,
 * and not hidden.
 */
export const STATUS_FILTERS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Deactivated', value: 'deactivated' },
]

/**
 * @param {object} device a normalised row
 * @param {string} value one of `STATUS_FILTERS`' values
 */
export function matchesStatus(device, value) {
  if (!value || value === 'all') return true
  return device.status.key === value
}

/**
 * The header line's counts. `unknown` is folded into the deactivated figure for
 * the summary so the line stays two-part; the chip on the row itself still says
 * Unknown.
 *
 * @param {Array} devices normalised rows
 */
export function summarizeDevices(devices) {
  let active = 0
  let deactivated = 0
  let unknown = 0
  for (const device of Array.isArray(devices) ? devices : []) {
    if (device?.status?.key === 'active') active += 1
    else if (device?.status?.key === 'deactivated') deactivated += 1
    else unknown += 1
  }
  return { total: active + deactivated + unknown, active, deactivated, unknown }
}

/**
 * Sorts over the whole roll (every device of the company), not the page — the
 * page sorts before it slices, so "last seen" means the newest report there is.
 * A device that has never reported sorts last under the date sorts via
 * `-Infinity`, never first as a fake epoch.
 */
function compareNewest(a, b, key) {
  const av = a[key] ?? -Infinity
  const bv = b[key] ?? -Infinity
  if (av > bv) return -1
  if (av < bv) return 1
  // Same instant — fall back to the other date so the order holds still.
  const ar = a.registeredMs ?? -Infinity
  const br = b.registeredMs ?? -Infinity
  if (ar > br) return -1
  if (ar < br) return 1
  return 0
}

/** Case-insensitive name compare over one field, with the owner name as tiebreak. */
function compareName(a, b, key) {
  const av = text(a[key]).toLowerCase()
  const bv = text(b[key]).toLowerCase()
  if (av < bv) return -1
  if (av > bv) return 1
  return text(a.employeeName).toLowerCase().localeCompare(text(b.employeeName).toLowerCase())
}

export const SORTS = {
  lastSeen: (a, b) => compareNewest(a, b, 'lastSeenMs'),
  registered: (a, b) => compareNewest(a, b, 'registeredMs'),
  employee: (a, b) => compareName(a, b, 'employeeName'),
  device: (a, b) => compareName(a, b, 'deviceName'),
}

export const SORT_OPTIONS = [
  { label: 'Last seen first', value: 'lastSeen' },
  { label: 'Registered first', value: 'registered' },
  { label: 'Employee A–Z', value: 'employee' },
  { label: 'Device name A–Z', value: 'device' },
]

// ── Normalisation ────────────────────────────────────────────────────────────

/** A stable row key: uuid when the payload carried one, else the numeric id,
 *  else a name composite so the table has *something* to key a `q-table` row on. */
function rowKey(raw, deviceUuid, id) {
  if (deviceUuid) return `uuid:${deviceUuid}`
  if (id != null) return `id:${id}`
  return `name:${text(raw.device_name).toLowerCase()}@${text(raw.employee_name).toLowerCase() || '?'}`
}

/**
 * One payload row to a normalised device.
 *
 * Date display is done **here** rather than in the components so every renderer
 * prints the same string for the same instant, and the raw value is kept beside
 * its label for the sorts and for the detail dialog.
 *
 * @param {object|null} raw one element of the list endpoint's payload
 * @returns {object|null} the normalised row, or null for a non-object entry
 */
export function normalizeDevice(raw) {
  if (!raw || typeof raw !== 'object') return null

  const id = raw.id ?? null
  const deviceUuid = text(raw.device_uuid)
  const isActive = typeof raw.is_active === 'boolean' ? raw.is_active : null
  const registeredAt = raw.registered_at ?? null
  const lastSeenAt = raw.last_seen_at ?? null
  const deactivatedAt = raw.deactivated_at ?? null
  const deactivatedReason = text(raw.deactivated_reason)
  const status = deviceStatusOf(isActive)
  // `*Known` says a value was sent at all, and is how "never reported" is told
  // apart from "reported, but the timestamp does not parse" — the first prints
  // "Never", the second prints the raw value verbatim rather than blanking.
  const registeredKnown = registeredAt != null && registeredAt !== ''
  const lastSeenKnown = lastSeenAt != null && lastSeenAt !== ''
  const deactivatedKnown = deactivatedAt != null && deactivatedAt !== ''

  return {
    id,
    key: rowKey(raw, deviceUuid, id),
    employeeName: text(raw.employee_name),
    // A uuid, and the only field that can join this row to the roster without
    // touching names at all.
    employeeUuid: text(raw.employee_id),
    employeeCompany: text(raw.employee_company),
    deviceUuid,
    deviceName: text(raw.device_name),
    deviceType: deviceTypeOf(raw.device_type),
    isActive,
    status,
    // The strict one-way switch the write and every gate below the page ask.
    deactivated: isActive === false,
    registeredKnown,
    registeredAt,
    registeredLabel: formatDateTime(registeredAt),
    registeredMs: instantMs(registeredAt),
    lastSeenKnown,
    lastSeenAt,
    // "Never" is a real answer for a registered-but-never-reported device, not a
    // missing value — it is said, not dashed.
    lastSeenLabel: lastSeenKnown ? formatDateTime(lastSeenAt) : 'Never',
    lastSeenMs: instantMs(lastSeenAt),
    deactivatedKnown,
    deactivatedReason,
    deactivatedReasonLabel: deactivateReasonLabel(deactivatedReason),
    deactivatedAt,
    deactivatedLabel: deactivatedKnown ? formatDateTime(deactivatedAt) : '',
    deactivatedMs: instantMs(deactivatedAt),
  }
}

/** Every payload row to a normalised device, dropping whatever is not one. */
export function normalizeDevices(list) {
  return (Array.isArray(list) ? list : []).map(normalizeDevice).filter(Boolean)
}
