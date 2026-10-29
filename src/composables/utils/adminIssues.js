/**
 * Needs-attention vocabulary and per-source row shaping.
 *
 * The drawer is a second reader over queues that already exist elsewhere, so
 * nothing here talks to the API. Each `*Section` function takes the rows a
 * source returned and produces the section the drawer renders: a handful of
 * rows, a count, and the deep link that opens the queue itself.
 *
 * The chip wording is deliberately a small closed set. A reader should be able
 * to tell "this may change someone's pay" from "somebody should look at this"
 * without opening the drawer twice, and every row must use one of the four
 * labels below — a bespoke label per source would make the drawer a second
 * design language.
 */
import { longLabel } from 'src/composables/utils/calendarDate'
import { getEmployeeName } from 'src/composables/utils/attendance'
import {
  attentionChips,
  manningNeedsAttention,
  manningStatus,
  statusRank,
} from 'src/composables/utils/manning'

export const ISSUE_SECTION_META = {
  attendance: { label: 'Attendance', icon: 'o_gpp_maybe', order: 1 },
  schedule: { label: 'Schedule', icon: 'o_store', order: 2 },
  swaps: { label: 'Schedule requests', icon: 'o_swap_horiz', order: 3 },
  requests: { label: 'Requests', icon: 'o_inbox', order: 4 },
  payroll: { label: 'Payroll', icon: 'o_paid', order: 5 },
  access: { label: 'Access cards', icon: 'o_contactless', order: 6 },
}

export const ISSUE_IMPACTS = {
  payroll: { label: 'May Affect Payroll', chipClass: 'dash-chip--critical', tone: 'critical' },
  attendance: { label: 'Attendance Incomplete', chipClass: 'dash-chip--warn', tone: 'warn' },
  staffing: { label: 'Affects Staffing', chipClass: 'dash-chip--info', tone: 'info' },
  review: { label: 'Needs Review', chipClass: 'dash-chip--warn', tone: 'warn' },
  failed: { label: 'Check Failed', chipClass: 'dash-chip--critical', tone: 'critical' },
}

export function issueImpact(key) {
  return ISSUE_IMPACTS[key] ?? ISSUE_IMPACTS.review
}

function impactFields(key) {
  const meta = issueImpact(key)
  return { impact: meta.label, chipClass: meta.chipClass, tone: meta.tone }
}

/**
 * The list inside a DRF response, whatever this endpoint wrapped it in.
 *
 * `keys` are the endpoint-specific envelopes, tried before the generic `data`
 * / `results` ones: cash advances answer `{ data: { requests: [] } }`, payroll
 * issues can answer `{ issues: [] }`, and access cards use `access_cards`.
 * Empty is a valid answer here, so the first array found wins even when it is
 * empty.
 */
export function readList(payload, keys = []) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key]
  }
  if (Array.isArray(payload.data)) return payload.data

  if (payload.data && typeof payload.data === 'object') {
    for (const key of keys) {
      if (Array.isArray(payload.data[key])) return payload.data[key]
    }
    if (Array.isArray(payload.data.results)) return payload.data.results
  }

  if (Array.isArray(payload.results)) return payload.results
  return []
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export function attendanceDateOf(row) {
  return row?.date || row?.attendance_date || row?.log_date || ''
}

function attendanceReason(row) {
  if (row?.is_suspicious) return row.suspicious_reason || 'Suspicious punch'
  if (row?.flagged) return row.flagged_reason || 'Flagged punch'
  if (row?.auto_closed) return row.auto_closed_reason || 'Auto-closed punch'
  return ''
}

function attendanceImpactKey(row) {
  if (row?.is_suspicious) return 'payroll'
  return 'attendance'
}

export function attendanceIssueItem(row, roster = [], index = 0) {
  const date = attendanceDateOf(row)
  const resolved = getEmployeeName(row?.employee, roster)
  const resolvedIsPlaceholder = resolved === 'Unknown Employee' || resolved.startsWith('Employee #')
  const name = resolvedIsPlaceholder && row?.employee_name ? row.employee_name : resolved
  const reason = attendanceReason(row)
  const query = { issue: 'all', unresolved: '1' }
  if (date) query.date = date
  // A bare employee id resolves to "Employee #12", which is not a search term.
  if (name && !name.startsWith('Employee #') && name !== 'Unknown Employee') {
    query.employee = name
  }

  return {
    key: `attendance:${row?.id ?? row?.uuid ?? `${date}:${name}:${index}`}`,
    title: name,
    subtitle: [longLabel(date), reason].filter(Boolean).join(' · '),
    icon: row?.is_suspicious ? 'o_gpp_maybe' : row?.flagged ? 'o_flag' : 'o_info',
    to: { path: '/app/attendance', query },
    count: 1,
    ...impactFields(attendanceImpactKey(row)),
  }
}

/**
 * @param {Array} rows unacknowledged flagged / suspicious records
 * @param {Array} roster used to turn a bare employee id into a name
 * @param {{from?: string, to?: string}} window the range the source actually read
 */
export function attendanceIssueSection(rows = [], roster = [], { from = '', to = '' } = {}) {
  const sorted = [...rows].sort((left, right) =>
    attendanceDateOf(right).localeCompare(attendanceDateOf(left)),
  )
  const items = sorted.map((row, index) => attendanceIssueItem(row, roster, index))
  if (!items.length) return null

  const query = { issue: 'all', unresolved: '1' }
  if (from) query.from = from
  if (to) query.to = to

  return {
    items,
    count: items.length,
    viewAll:
      items.length > 4
        ? {
            label: `View all ${items.length} unresolved`,
            to: { path: '/app/attendance', query },
          }
        : null,
  }
}

// ─── Manning ────────────────────────────────────────────────────────────────

function manningImpactKey(status) {
  if (status.key === 'awol') return 'payroll'
  if (status.key === 'not-timed-in') return 'attendance'
  return 'staffing'
}

export function manningIssueItem(row, date = '') {
  const status = manningStatus(row)
  if (!manningNeedsAttention(row)) return null

  const labels = attentionChips(row)
    .filter((chip) => chip.tone !== 'neutral')
    .map((chip) => chip.label)
  const subtitle = labels.length ? labels.join(' · ') : status.label
  const icon =
    status.key === 'awol'
      ? 'o_person_off'
      : status.key === 'not-timed-in'
        ? 'o_schedule'
        : 'o_group_off'

  return {
    key: `schedule:${row.key}`,
    title: `${row.site} · ${row.position}`,
    subtitle,
    icon,
    to: manningLink(date),
    count: 1,
    ...impactFields(manningImpactKey(status)),
  }
}

/**
 * The board's day travels with the link.
 *
 * The drawer reads today's board, but the page can be sitting on another day;
 * `?gaps=1` alone would then show a different day's gaps than the one the
 * reader clicked. The page consumes the date before its fetch, so the link
 * lands on the row it named.
 */
function manningLink(date) {
  return {
    path: '/app/manning',
    query: { gaps: '1', ...(date ? { date } : {}) },
  }
}

export function manningIssueSection(rows = [], date = '') {
  const sorted = rows
    .filter(manningNeedsAttention)
    .sort((left, right) => statusRank(left) - statusRank(right))
  const items = sorted.map((row) => manningIssueItem(row, date)).filter(Boolean)
  if (!items.length) return null

  return {
    items,
    count: items.length,
    viewAll:
      items.length > 4
        ? {
            label: `View all ${items.length} gaps`,
            to: manningLink(date),
          }
        : null,
  }
}

// ─── Requests ───────────────────────────────────────────────────────────────

const REQUEST_QUEUES = {
  leave: { title: 'Leave requests', icon: 'o_event_note', tab: 'leave' },
  overtime: { title: 'Overtime requests', icon: 'o_more_time', tab: 'overtime' },
  cashAdvance: {
    title: 'Cash advance requests',
    icon: 'o_account_balance_wallet',
    tab: 'cash_advance',
  },
  compensable: { title: 'Compensable time', icon: 'o_work_history', tab: 'compensable' },
}

export function requestQueueItem(key, count) {
  if (!count) return null
  const meta = REQUEST_QUEUES[key]
  if (!meta) return null

  return {
    key: `requests:${key}`,
    title: meta.title,
    subtitle: `${count} awaiting your decision`,
    icon: meta.icon,
    to: { path: '/app/requests', query: { tab: meta.tab } },
    count,
    ...impactFields('review'),
  }
}

export function requestQueueResult(key, count) {
  const item = requestQueueItem(key, count)
  return { items: item ? [item] : [], count: item ? count : 0 }
}

export function scheduleSwapItem(count) {
  if (!count) return null
  return {
    key: 'schedule:swaps',
    title: 'Schedule swaps',
    subtitle: `${count} waiting on a decision`,
    icon: 'o_swap_horiz',
    to: { path: '/app/requests', query: { tab: 'swap' } },
    count,
    ...impactFields('review'),
  }
}

export function scheduleSwapResult(count) {
  const item = scheduleSwapItem(count)
  return { items: item ? [item] : [], count: item ? count : 0 }
}

// ─── Payroll ────────────────────────────────────────────────────────────────

/** The endpoint can be asked for pending only; this also survives an ignored filter. */
export function isOpenPayrollIssue(issue) {
  const status = String(issue?.status ?? '')
    .trim()
    .toLowerCase()
  return !status || status === 'pending' || status === 'open'
}

export function openPayrollIssues(issues = []) {
  return (Array.isArray(issues) ? issues : []).filter(isOpenPayrollIssue)
}

function payrollRunId(issue) {
  const raw =
    issue?.payout_group_instance_id ??
    issue?.payout_group_instance?.id ??
    (typeof issue?.payout_group_instance === 'object' ? null : issue?.payout_group_instance) ??
    issue?.pgi_id ??
    issue?.pgi?.id ??
    null
  return raw == null || raw === '' ? null : raw
}

function payrollRunLabel(issue) {
  return (
    issue?.payout_group_name ||
    issue?.payout_group?.name ||
    issue?.payout_group_instance_name ||
    issue?.cutoff_name ||
    issue?.cutoff ||
    issue?.pgi_name ||
    ''
  )
}

function payrollEmployeeName(issue) {
  return (
    issue?.employee_name ||
    issue?.employee?.name ||
    issue?.employee?.full_name ||
    issue?.payslip?.employee_name ||
    ''
  )
}

export function payrollIssueSection(issues = []) {
  const open = openPayrollIssues(issues)
  if (!open.length) return null

  const groups = new Map()
  for (const issue of open) {
    const runId = payrollRunId(issue)
    const key = runId == null ? 'all' : `run:${runId}`
    let group = groups.get(key)
    if (!group) {
      group = { key, runId, count: 0, label: '', names: new Set() }
      groups.set(key, group)
    }

    group.count += 1
    if (!group.label) group.label = payrollRunLabel(issue)
    const name = payrollEmployeeName(issue)
    if (name) group.names.add(name)
  }

  const items = [...groups.values()]
    .sort((left, right) => right.count - left.count)
    .map((group) => {
      const count = group.count
      const countLabel = `${count} open ${count === 1 ? 'issue' : 'issues'}`
      const names = [...group.names]
      const shownNames = names.slice(0, 2).join(', ')
      const extra = names.length > 2 ? ` +${names.length - 2}` : ''
      const subtitle = shownNames ? `${countLabel} · ${shownNames}${extra}` : countLabel
      return {
        key: `payroll:${group.key}`,
        title: group.label || 'Payslip disputes',
        subtitle,
        icon: 'o_receipt_long',
        to:
          group.runId == null
            ? { path: '/app/payroll' }
            : { path: `/app/payroll/payslips/${group.runId}` },
        count,
        ...impactFields('payroll'),
      }
    })

  return { items, count: open.length }
}

// ─── Access cards ───────────────────────────────────────────────────────────

function accessAlertSubtitle(group) {
  const count = group.count
  const noun = count === 1 ? 'card' : 'cards'
  const base =
    group.key === 'loose'
      ? `${count} working ${noun} with no holder`
      : `${count} holder${count === 1 ? '' : 's'} carrying a card that will not open`
  const names = [...group.names]
  const shownNames = names.slice(0, 2).join(', ')
  const extra = names.length > 2 ? ` +${names.length - 2}` : ''
  return shownNames ? `${base} · ${shownNames}${extra}` : base
}

/**
 * A title for the whole group, not the first card's status.
 *
 * `dormant` covers every way a held card can fail to work — inactive, lost,
 * stolen, expired — so printing the first card's label would describe the other
 * cards in the group wrongly. The subtitle carries the common fact instead.
 */
function accessAlertTitle(group) {
  if (group.key === 'loose') return 'Active, unassigned'
  if (group.key === 'dormant') return 'Assigned, not working'
  return group.label || 'Needs attention'
}

export function accessCardIssueSection(cards = []) {
  const alerts = cards.filter((card) => card?.alert)
  if (!alerts.length) return null

  const groups = new Map()
  for (const card of alerts) {
    const alert = card.alert
    const key = alert.key || alert.label
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        label: alert.label || 'Needs attention',
        count: 0,
        names: new Set(),
      }
      groups.set(key, group)
    }
    group.count += 1
    if (card.employeeName) group.names.add(card.employeeName)
  }

  const items = [...groups.values()]
    .sort((left, right) => right.count - left.count)
    .map((group) => ({
      key: `access:${group.key}`,
      title: accessAlertTitle(group),
      subtitle: accessAlertSubtitle(group),
      icon: group.key === 'loose' ? 'o_contactless' : 'o_person_off',
      to: { path: '/app/access-cards', query: { filter: 'alert' } },
      count: group.count,
      ...impactFields('review'),
    }))

  return { items, count: alerts.length }
}
