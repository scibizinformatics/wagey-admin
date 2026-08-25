/**
 * Invitation lifecycle, shared by the Invite page's table, card list and detail
 * modal so one invite reads the same in all three.
 *
 * The API sends two overlapping fields — a free-text `status` and a boolean
 * `is_used` — which the old table showed as two adjacent columns saying nearly
 * the same thing ("Pending" beside "Unused"). They are folded into one state
 * here: acceptance is decided by `is_used`, expiry by comparing `expires_at`
 * with now, and `status` is consulted only for the outcomes those two cannot
 * express (a recipient who declined, an invite an admin pulled back).
 */

/** An unused invite this close to `expires_at` is called out rather than left
 *  looking like any other pending one — it is the only row a person can still
 *  act on before it lapses. */
const EXPIRING_WITHIN_DAYS = 3

const MS_PER_DAY = 86_400_000

/** Raw `status` values that settle the state on their own. */
const TERMINAL_RAW = {
  declined: 'declined',
  rejected: 'declined',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  revoked: 'cancelled',
}

const STATES = {
  accepted: { key: 'accepted', label: 'Accepted', tone: 'good' },
  pending: { key: 'pending', label: 'Pending', tone: 'info' },
  expiring: { key: 'expiring', label: 'Expiring soon', tone: 'warn' },
  // Grey, not red: a lapsed invite is inert, not a failure to fix. The red is
  // saved for `declined`, which is a person's answer.
  expired: { key: 'expired', label: 'Expired', tone: 'neutral' },
  declined: { key: 'declined', label: 'Declined', tone: 'critical' },
  cancelled: { key: 'cancelled', label: 'Cancelled', tone: 'neutral' },
}

/** Whole days from now until `value`; negative once it is in the past. */
export function daysUntil(value) {
  if (!value) return null
  const then = new Date(value)
  if (Number.isNaN(then.getTime())) return null
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfThen = new Date(then)
  startOfThen.setHours(0, 0, 0, 0)
  return Math.round((startOfThen - startOfToday) / MS_PER_DAY)
}

/** @returns {{key: string, label: string, tone: string}} */
export function inviteState(invite) {
  if (!invite) return STATES.pending
  if (invite.is_used) return STATES.accepted

  const raw = String(invite.status ?? '')
    .trim()
    .toLowerCase()
  const terminal = TERMINAL_RAW[raw]
  if (terminal) return STATES[terminal]

  const left = daysUntil(invite.expires_at)
  if (raw === 'expired') return STATES.expired
  if (left === null) return STATES.pending
  if (left < 0) return STATES.expired
  if (left <= EXPIRING_WITHIN_DAYS) return STATES.expiring
  return STATES.pending
}

/** `dash-chip` tone modifier for a state; neutral is the unmodified chip. */
export function chipClass(tone) {
  return tone && tone !== 'neutral' ? `dash-chip--${tone}` : ''
}

/** Two letters for the avatar, from the local part of the address. */
export function inviteInitials(email) {
  if (!email) return '?'
  const local = String(email).split('@')[0]
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Human gap for a date — the secondary line under a formatted date, so a reader
 * does not have to subtract today's date from it to know whether it matters.
 */
export function relativeDay(value) {
  const days = daysUntil(value)
  if (days === null) return ''
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 0) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}

/** Role id → label, using the page's fetched role options. */
export function roleLabel(value, options = []) {
  if (value === null || value === undefined || value === '') return '—'
  const match = options.find((option) => option.value === Number(value))
  return match ? match.label : String(value)
}
