/**
 * Announcement lifecycle, type palette and audience summary — shared by the
 * page, its table, its card list and its dialogs so one announcement reads the
 * same everywhere.
 *
 * `is_active`, `start_at` and `end_at` overlap: the old summary counted an
 * announcement as "Active" whenever `is_active` was set and "Scheduled"
 * whenever `start_at` was in the future, so a scheduled announcement was
 * counted in both and neither number answered "what are employees seeing right
 * now?". The three fields fold into one state here, and the states are mutually
 * exclusive.
 */

const MS_PER_DAY = 86_400_000

const STATES = {
  // Switched off by an admin. Checked first: the schedule of an announcement
  // nobody can see is not what a reader needs to know about it.
  inactive: { key: 'inactive', label: 'Inactive', tone: 'neutral' },
  scheduled: { key: 'scheduled', label: 'Scheduled', tone: 'info' },
  live: { key: 'live', label: 'Live', tone: 'good' },
  ended: { key: 'ended', label: 'Ended', tone: 'neutral' },
}

export const TYPE_META = {
  general: { label: 'General', mark: 'var(--dash-n-400)' },
  urgent: { label: 'Urgent', mark: 'var(--dash-critical-mark)' },
  maintenance: { label: 'Maintenance', mark: 'var(--dash-warn-mark)' },
  policy: { label: 'Policy', mark: 'var(--dash-cat-4)' },
}

export function typeMeta(type) {
  const key = String(type ?? '').toLowerCase()
  return TYPE_META[key] ?? { label: type || 'General', mark: 'var(--dash-n-400)' }
}

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Whole days from today until `value`; negative once it is in the past. */
export function daysUntil(value) {
  const then = toDate(value)
  if (!then) return null
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfThen = new Date(then)
  startOfThen.setHours(0, 0, 0, 0)
  return Math.round((startOfThen - startOfToday) / MS_PER_DAY)
}

/** @returns {{key: string, label: string, tone: string}} */
export function announcementState(announcement) {
  if (!announcement) return STATES.inactive
  if (announcement.is_active === false) return STATES.inactive

  const now = Date.now()
  const start = toDate(announcement.start_at)
  const end = toDate(announcement.end_at)

  if (start && start.getTime() > now) return STATES.scheduled
  if (end && end.getTime() < now) return STATES.ended
  return STATES.live
}

/** `dash-chip` tone modifier; neutral is the unmodified chip. */
export function chipClass(tone) {
  return tone && tone !== 'neutral' ? `dash-chip--${tone}` : ''
}

export function formatDate(value) {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Date without the year, for the compact `start → end` range in a table cell. */
export function formatShortDate(value) {
  const date = toDate(value)
  if (!date) return '—'
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/**
 * The schedule as one line. An announcement with neither bound is not
 * "— to —": it runs for as long as it is active, which is what "Always on"
 * says.
 */
export function windowLabel(announcement) {
  const start = announcement?.start_at
  const end = announcement?.end_at
  if (start && end) return `${formatShortDate(start)} → ${formatShortDate(end)}`
  if (start) return `From ${formatShortDate(start)}`
  if (end) return `Until ${formatShortDate(end)}`
  return 'Always on'
}

/**
 * The one thing about the schedule that is worth a second line: when the state
 * is about to change, or when it already has.
 */
export function windowNote(announcement) {
  if (!announcement) return ''
  const state = announcementState(announcement)
  const startIn = daysUntil(announcement.start_at)
  const endIn = daysUntil(announcement.end_at)

  if (state.key === 'inactive') return 'Not shown to employees'
  if (state.key === 'scheduled') return startIn === null ? '' : `starts ${dayPhrase(startIn)}`
  if (state.key === 'ended') return endIn === null ? '' : `ended ${dayPhrase(endIn)}`
  if (endIn !== null) return `ends ${dayPhrase(endIn)}`
  return 'no end date'
}

function dayPhrase(days) {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 0) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}

/**
 * Who sees it. The old table printed one coloured chip per position, role and
 * user, which on a broad announcement pushed a single row past the height of
 * four others; this returns a summary plus the full list for a tooltip.
 *
 * @returns {{everyone: boolean, count: number, summary: string, names: string[], detail: string}}
 */
export function audienceSummary(announcement, lookups = {}) {
  if (!announcement || announcement.target_everyone) {
    return { everyone: true, count: 0, summary: 'Everyone', names: [], detail: 'Every employee' }
  }

  const groups = [
    { ids: announcement.target_positions, options: lookups.positions, noun: 'position' },
    { ids: announcement.target_roles, options: lookups.roles, noun: 'role' },
    { ids: announcement.target_users, options: lookups.users, noun: 'person' },
  ]

  const names = []
  const parts = []
  for (const group of groups) {
    const ids = Array.isArray(group.ids) ? group.ids : []
    if (!ids.length) continue
    parts.push(`${ids.length} ${plural(group.noun, ids.length)}`)
    for (const id of ids) names.push(optionLabel(id, group.options, group.noun))
  }

  if (!names.length) {
    // Targeted at nobody. Worth naming plainly — it is a configuration mistake,
    // not an audience.
    return { everyone: false, count: 0, summary: 'No one selected', names: [], detail: '' }
  }

  return {
    everyone: false,
    count: names.length,
    summary: parts.join(' · '),
    names,
    detail: names.join(', '),
  }
}

function plural(noun, count) {
  if (count === 1) return noun
  return noun === 'person' ? 'people' : `${noun}s`
}

/** Resolve one target id against a `{ label, value }` option list. */
export function optionLabel(id, options = [], noun = 'item') {
  const match = (options || []).find((option) => option.value === id || option.id === id)
  if (match) return match.label
  const fallback = noun === 'person' ? 'Employee' : noun.charAt(0).toUpperCase() + noun.slice(1)
  return `${fallback} #${id}`
}

/** True when a row targets anything other than everyone, so the page knows
 *  whether the position / role / employee lookups are worth fetching. */
export function hasTargeting(announcement) {
  if (!announcement || announcement.target_everyone) return false
  return [announcement.target_positions, announcement.target_roles, announcement.target_users].some(
    (list) => Array.isArray(list) && list.length > 0,
  )
}

/** Trim a message to a single-line preview for the card list. */
export function messagePreview(message, max = 140) {
  const text = String(message ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}
