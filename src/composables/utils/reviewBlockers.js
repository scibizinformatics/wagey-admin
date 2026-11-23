/**
 * What stops a payroll run from being reviewed and released.
 *
 * The backend already refuses both transitions while an employee on the run has
 * a pending request inside the cutoff — `review-to-ready` and `release-payslips`
 * answer 400 with a `PGICutoffBlockersResponse` naming the employees and the
 * kinds of request in the way. This module is the client-side half of the same
 * rule: it reads the leave and overtime queues the app already has, narrows them
 * to the run's cutoff and employees, and produces the set of employee payroll
 * items whose payslips must wait.
 *
 * It exists for the same reason every other derivation in this directory does:
 * the notice, the disabled buttons and the confirm wording must agree on *who*
 * is on hold and *why*. Computing that in the page would put the same three
 * counts in three places and let them drift.
 *
 * Two sources, deliberately:
 *
 *   - the **pre-emptive** reading below, from `/attendance/leave-list/` and
 *     `/payroll/overtime-list/`. Neither endpoint accepts a cutoff, so the
 *     narrowing is derived here, using the same overlap/containment rules the
 *     Request page already applies (`leaveCutoffs.js`).
 *   - the **server's own refusal**, parsed by `serverBlockersFrom`. That one
 *     covers every blocker the backend knows — compensable time, cash advances,
 *     schedule swaps, unfinished attendance — and it names the exact EPIs, which
 *     is why it is pinned onto the page when a write is refused rather than
 *     guessed at from the queues.
 *
 * What is deliberately *not* read: the review summary's `leave_request_count` and
 * `ot_request` columns. Their pending-versus-total semantics are undocumented,
 * and `pre_approved_ot` sitting beside `ot_request` suggests they count requests
 * broadly rather than the ones still awaiting a decision. A hard guard built on
 * the wrong reading would either block a clean run or wave through an incomplete
 * one.
 */

import { nameKey } from 'src/composables/utils/employee'
import {
  dayWithinCutoff,
  isPlaceableCutoff,
  leavePeriodOverlapsCutoff,
  normalizeCutoffInstance,
} from 'src/composables/utils/leaveCutoffs'

/** The cutoff a review run covers, from `employee-review-summary`'s own fields. */
export function reviewCutoffFrom(summary) {
  if (!summary) return null
  const cutoff = normalizeCutoffInstance({
    cutoff_name: summary.cutoff_name,
    start_date: summary.start_date,
    end_date: summary.end_date,
  })
  return isPlaceableCutoff(cutoff) ? cutoff : null
}

/**
 * One row of `/attendance/leave-list/` as the guard needs it.
 *
 * Only the four fields the narrowing reads are carried. The Request page's own
 * mapper builds the display row, and duplicating that here would make the guard
 * responsible for fields it never shows.
 */
export function normalizeLeaveQueueRow(item) {
  if (!item || typeof item !== 'object') return null
  return {
    id: item.id ?? null,
    employeeName: String(item.employee_name ?? '').trim(),
    status: String(item.status ?? '')
      .trim()
      .toLowerCase(),
    startDate: item.start_date ?? '',
    endDate: item.end_date ?? '',
  }
}

/** A leave request still awaiting a decision, whatever casing the API sent. */
export function isPendingLeaveRow(row) {
  return Boolean(row) && row.status === 'pending'
}

/**
 * The leave and overtime requests still waiting on a person, narrowed to this
 * run's cutoff and its employees.
 *
 * `employeeNames` is the run's own employee display names. The queues name
 * people by name (leave) or by an id resolved through the roster (overtime), so
 * `nameKey` is the join — the same key `buildEmployeeNameIndex` uses. A name
 * shared by two people matches both, which blocks both: a false hold costs a
 * recheck, while a missed one is an incomplete payslip.
 *
 * An unreadable cutoff blocks nothing and says so through `checked: false`; the
 * caller renders its "could not check" warning instead of an empty all-clear.
 *
 * @param {object} params
 * @param {Array} params.leaveRows normalized leave rows (`normalizeLeaveQueueRow`)
 * @param {Array} params.overtimeRows normalized overtime rows
 *        (`normalizeOvertimeRequests`)
 * @param {object|null} params.cutoff `reviewCutoffFrom(summary)`
 * @param {Array<string>} params.employeeNames the run's employees
 * @returns {{leave: Array, overtime: Array, blockedKeys: Set<string>,
 *   counts: {leave: number, overtime: number}, total: number, checked: boolean}}
 */
export function pendingApprovalsForRun({
  leaveRows = [],
  overtimeRows = [],
  cutoff = null,
  employeeNames = [],
} = {}) {
  const keys = new Set(
    (Array.isArray(employeeNames) ? employeeNames : [])
      .map((name) => nameKey(name))
      .filter(Boolean),
  )
  const checked = Boolean(cutoff) && keys.size > 0
  if (!checked) {
    return {
      leave: [],
      overtime: [],
      blockedKeys: new Set(),
      counts: { leave: 0, overtime: 0 },
      total: 0,
      checked: false,
    }
  }

  const leave = (Array.isArray(leaveRows) ? leaveRows : []).filter(
    (row) =>
      isPendingLeaveRow(row) &&
      leavePeriodOverlapsCutoff(row, cutoff) &&
      keys.has(nameKey(row.employeeName)),
  )
  const overtime = (Array.isArray(overtimeRows) ? overtimeRows : []).filter(
    (row) =>
      row?.actionable && dayWithinCutoff(row.date, cutoff) && keys.has(nameKey(row.employeeName)),
  )

  const blockedKeys = new Set(
    [...leave, ...overtime].map((row) => nameKey(row.employeeName)).filter(Boolean),
  )

  return {
    leave,
    overtime,
    blockedKeys,
    counts: { leave: leave.length, overtime: overtime.length },
    total: leave.length + overtime.length,
    checked: true,
  }
}

/** The run's employee payroll-item ids that either source puts on hold. */
export function blockedEpiIds(rows = [], blockedKeys = new Set(), serverIds = []) {
  const present = new Map((Array.isArray(rows) ? rows : []).map((row) => [String(row.epi_id), row]))
  const ids = new Set((Array.isArray(serverIds) ? serverIds : []).map(String))
  for (const key of blockedKeys ?? []) {
    for (const [id, row] of present) {
      if (nameKey(row?.employee) === key) ids.add(id)
    }
  }
  // A pinned id that no longer matches a row on screen must not go on counting.
  return [...ids].filter((id) => present.has(id))
}

/** The noun a blocker type is reported as, for the notice's counts. */
const BLOCKER_LABELS = {
  leave: 'leave request',
  overtime: 'overtime request',
  compensable: 'compensable time request',
  cash_advance: 'cash advance request',
  schedule_swap: 'schedule swap request',
  attendance: 'unfinished attendance record',
}

/** A loose token for a blocker type, whatever separator or plural the API used. */
export function normalizeBlockerType(type) {
  return String(type ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * The six kinds the app can word and link, from whatever spelling the backend
 * sent — `leave_requests`, `Leave Requests` and `leave` are one kind.
 *
 * Unknown kinds keep their normalized token so they still render as something
 * specific rather than being folded into a generic "pending request".
 */
export function canonicalBlockerType(type) {
  const key = normalizeBlockerType(type)
  if (!key) return ''
  if (key.includes('leave')) return 'leave'
  if (key.includes('overtime')) return 'overtime'
  if (key.includes('compensable')) return 'compensable'
  if (key.includes('cash') && key.includes('advance')) return 'cash_advance'
  if (key.includes('swap')) return 'schedule_swap'
  if (key.includes('attendance')) return 'attendance'
  return key
}

/** A blocker type as a readable noun; unknown types are spelled out, not dropped. */
export function blockerTypeLabel(type) {
  const canonical = canonicalBlockerType(type)
  if (BLOCKER_LABELS[canonical]) return BLOCKER_LABELS[canonical]
  const words = normalizeBlockerType(type).replace(/_+/g, ' ').trim()
  return words ? `${words} request` : 'pending request'
}

/**
 * A refused `review-to-ready` / `release-payslips`, read out of the response.
 *
 * Returns null for every other 400 — the partial-progress answer ("1 of 3 EPIs
 * still need review") and the run-out-of-review refusal both arrive with no
 * `blockers`, and the callers already have handling for them. A body carrying
 * `blockers` or `blocker_counts` is the cutoff-blocker refusal, and its
 * `epi_ids` are the exact rows to hold.
 *
 * @param {unknown} error a rejected axios error
 * @returns {{epiIds: string[], employeeNames: string[],
 *   counts: Array<{key: string, label: string, count: number}>,
 *   message: string}|null}
 */
export function serverBlockersFrom(error) {
  const data = error?.response?.data
  if (!data || typeof data !== 'object') return null

  const blockers = Array.isArray(data.blockers) ? data.blockers : []
  const counts = []
  const counted = new Map()

  const rawCounts = data.blocker_counts
  if (rawCounts && typeof rawCounts === 'object' && !Array.isArray(rawCounts)) {
    for (const [key, value] of Object.entries(rawCounts)) {
      const count = Number(value)
      if (!Number.isFinite(count) || count <= 0) continue
      const canonical = canonicalBlockerType(key) || normalizeBlockerType(key)
      counted.set(canonical, (counted.get(canonical) ?? 0) + count)
    }
  }

  // Some payloads carry only the per-employee rows. Derive the counts from their
  // reasons rather than reporting a refusal with no explanation.
  if (!counted.size) {
    for (const blocker of blockers) {
      for (const reason of Array.isArray(blocker?.reasons) ? blocker.reasons : []) {
        const key = String(reason?.type ?? '').trim()
        if (!key) continue
        const canonical = canonicalBlockerType(key) || normalizeBlockerType(key)
        counted.set(canonical, (counted.get(canonical) ?? 0) + 1)
      }
    }
  }

  for (const [key, count] of counted) {
    counts.push({ key, label: blockerTypeLabel(key), count })
  }

  const epiIds = [
    ...new Set(
      blockers.flatMap((blocker) =>
        (Array.isArray(blocker?.epi_ids) ? blocker.epi_ids : []).map(String),
      ),
    ),
  ]
  const employeeNames = [
    ...new Set(
      blockers.map((blocker) => String(blocker?.employee_name ?? '').trim()).filter(Boolean),
    ),
  ]

  // A 400 with neither ids nor counts is not this refusal; leave it to the
  // caller's existing messaging.
  if (!epiIds.length && !counts.length) return null

  return {
    epiIds,
    employeeNames,
    counts,
    message: String(data.message ?? '').trim(),
  }
}

/**
 * Two refusals merged into one — used when the review-all fallback writes one
 * employee at a time and each write answers with the same run-wide blocker list.
 * Counts take the larger figure per type rather than summing, because the same
 * run-wide refusal is reported repeatedly.
 */
export function mergeServerBlockers(first, second) {
  if (!first) return second ?? null
  if (!second) return first
  const counts = new Map(first.counts.map((entry) => [entry.key, entry]))
  for (const entry of second.counts) {
    const current = counts.get(entry.key)
    counts.set(entry.key, {
      key: entry.key,
      label: entry.label,
      count: current ? Math.max(current.count, entry.count) : entry.count,
    })
  }
  return {
    epiIds: [...new Set([...first.epiIds, ...second.epiIds])],
    employeeNames: [...new Set([...first.employeeNames, ...second.employeeNames])],
    counts: [...counts.values()],
    message: first.message || second.message,
  }
}

/** "2 leave requests and 1 overtime request", for a sentence or a tooltip. */
export function blockerCountsSentence(counts = []) {
  const parts = (Array.isArray(counts) ? counts : [])
    .filter((entry) => entry && Number(entry.count) > 0)
    .map((entry) => {
      const count = Number(entry.count)
      return `${count} ${entry.label}${count === 1 ? '' : 's'}`
    })
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}
