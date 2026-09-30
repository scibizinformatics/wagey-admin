/**
 * The wording behind every confirmation the Requests page raises.
 *
 * Three actions reach the same dialog, and all three are irreversible enough to
 * deserve it: one individual approve/reject on any of the four queues, a bulk
 * approve/reject on the two queues that batch, and the removal of a rejection
 * recommendation. The copy lives in a module rather than in the dialog for the
 * reason every other derivation in this codebase lives in `composables/utils`:
 * the table, the dialog and the toast all read the same words, so they cannot
 * drift apart.
 *
 * Rows arrive already normalized by each queue's own normalizer
 * (`normalizeOvertimeRequest`, `normalizeSwapRequest`, the leave list mapping in
 * the page), so this reads display-ready fields — `categoryName`, `duration`,
 * `original_shift_label` — and never re-derives what they already resolved.
 */

import { longLabel } from 'src/composables/utils/calendarDate'
import { formatOvertimeHours } from 'src/composables/utils/overtimeRequests'
import { amount } from 'src/composables/utils/cashAdvance'

const DASH = '—'

/**
 * No queue in this page can take a decision back: none of the four has a reopen
 * action. A confirmation that reads as though it were cheap is worse than no
 * confirmation at all, so every decision says this. It is a default rather than a
 * constant because the one non-decision here — dropping a recommendation — *is*
 * reversible and must not claim otherwise.
 */
const UNDO_NOTE = 'This decision cannot be undone from this screen.'

/** `1 leave request` / `12 leave requests`. */
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// ₱, as the cash-advance table, view modal and approval modal all render it.
const money = (value) =>
  `₱${amount(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

/**
 * A fact list, with the facts a payload did not supply simply left out.
 *
 * Two different absences have to be tolerated, because the two ways of expressing
 * them are both natural at a call site: an empty *value* (`['Remarks', note]`
 * where the approver wrote none) and an absent *fact* (`cond ? ['Total', n] : null`
 * where the condition did not hold). Destructuring the second before filtering
 * it is a crash rather than an omission, so the pair is checked first.
 */
const facts = (...pairs) =>
  pairs
    .filter((pair) => Array.isArray(pair))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value }))

/** `Oct 12, 2026` at both ends of a range, collapsed for a single-day request. */
const period = (start, end) => {
  const from = longLabel(start)
  const to = longLabel(end)
  if (!from) return DASH
  if (!to || to === from) return from
  return `${from} – ${to}`
}

/** Tone and button per verb, mirroring what the page's toasts already do. */
const VERBS = {
  approved: {
    actionLabel: 'Approve',
    icon: 'check_circle',
    tone: 'good',
    buttonClass: 'dash-modal__approve',
  },
  rejected: {
    actionLabel: 'Reject',
    icon: 'cancel',
    tone: 'danger',
    // `dash-modal__reject` is the bordered critical button, for a form that also
    // offers a constructive choice. Here the destructive act IS the subject of
    // the dialog, so the fill goes on it — see `dash-modal__danger`.
    buttonClass: 'dash-modal__danger',
  },
}

const QUEUES = {
  leave: {
    noun: 'leave request',
    name: (row) => row.employeeName || 'This employee',
    facts: (row) =>
      facts(
        ['Type', row.type],
        ['Duration', row.duration],
        ['Period', period(row.startDate, row.endDate)],
      ),
    // `duration` is the accrued value rather than the calendar-day count, so a
    // half day reads as one here exactly as it does in the table.
    sentence: (row, approved) =>
      approved
        ? 'is approved and the days come off their leave balance.'
        : 'is rejected and the days stay on their leave balance.',
  },

  overtime: {
    noun: 'overtime request',
    name: (row) => row.employeeName || 'This employee',
    // The hours fact reads `context`, not the row, for the same reason the
    // sentence does: `context.hours` is what the endpoint will actually be told,
    // which is the approver's inline edit when they made one and the claimed
    // figure when they did not. Quoting `row.hours` here would let the dialog
    // contradict itself — and promise a number the write does not use.
    facts: (row, context) =>
      facts(
        ['Date', longLabel(row.date)],
        ['Category', row.categoryName],
        ['Hours', formatOvertimeHours(context.hours)],
      ),
    sentence: (row, approved, context) =>
      approved
        ? `is approved for ${formatOvertimeHours(context.hours)} of overtime pay.`
        : 'is rejected and will not be paid.',
  },

  swap: {
    noun: 'shift swap',
    name: (row) => row.requested_by_name || 'This employee',
    facts: (row) =>
      facts(
        [
          'From',
          `${row.from_employee_name} · ${row.original_date_label} ${row.original_shift_label}`,
        ],
        ['To', `${row.to_employee_name} · ${row.new_date_label} ${row.new_shift_label}`],
      ),
    sentence: (row, approved) =>
      approved
        ? 'is approved and both shifts are reassigned.'
        : 'is rejected and the roster is left as it was.',
  },

  cashAdvance: {
    noun: 'cash advance',
    name: (row) => row.employee_name || 'This employee',
    facts: (row) =>
      facts(
        ['Amount', money(row.requested_amount)],
        // Only worth restating when the approver wrote one: an empty remarks
        // field is not information, it is an absent optional.
        ['Remarks', (row.remarks || '').trim() || null],
      ),
    sentence: (row, approved) =>
      approved
        ? `is approved and ${money(row.requested_amount)} is committed for disbursement.`
        : 'is rejected and nothing is disbursed.',
  },
}

/**
 * The two queues that batch, with the grammar their counts need.
 *
 * Kept apart from `QUEUES` rather than folded into it because a batch has no row
 * to read a name off, and the two shapes answer different questions: one names a
 * person, the other counts them. Swap and cash advance have no bulk path at all.
 */
const BULK_QUEUES = {
  leave: {
    one: 'leave request',
    many: 'leave requests',
    one_sentence: (status) =>
      status === 'approved'
        ? 'is approved and the days come off their leave balance.'
        : 'is rejected and the days stay on their leave balance.',
    many_sentence: (status) =>
      status === 'approved'
        ? 'are approved and the days come off their leave balances.'
        : 'are rejected and the days stay on their leave balances.',
  },
  overtime: {
    one: 'overtime request',
    many: 'overtime requests',
    one_sentence: (status) =>
      status === 'approved'
        ? 'is approved and goes to the next payroll.'
        : 'is rejected and will not be paid.',
    many_sentence: (status) =>
      status === 'approved'
        ? 'are approved and go to the next payroll.'
        : 'are rejected and will not be paid.',
  },
}

/**
 * One confirmation, ready to hand to `RequestDecisionConfirmDialog`.
 *
 * `context` carries the few values the dialog has to be told rather than read —
 * today only the resolved overtime hours, which live in the page's edit map and
 * not on the row.
 *
 * Returns null for an unknown queue or verb, so a caller that reaches this with
 * a typo opens no dialog at all instead of an empty one.
 */
export function buildDecisionConfirm({ queue, status, row, context = {} } = {}) {
  const spec = QUEUES[queue]
  const verb = VERBS[status]
  if (!spec || !verb || !row) return null

  const name = spec.name(row)
  return {
    title: `${verb.actionLabel} this ${spec.noun}?`,
    // The head repeats the name the body leads with, the way
    // `EmployeeTerminateDialog` does: the sub is what survives the dialog
    // closing behind whatever else opens on top of it.
    name,
    sub: name,
    icon: verb.icon,
    tone: verb.tone,
    actionLabel: verb.actionLabel,
    buttonClass: verb.buttonClass,
    facts: spec.facts(row, context),
    // Continues from the bolded name, so it opens with a verb.
    sentence: spec.sentence(row, status === 'approved', context),
    note: spec.note ?? UNDO_NOTE,
  }
}

/**
 * One confirmation for a batch.
 *
 * The subject is a count rather than a person, which is the whole difference
 * from the single-row builder: the sentence has to agree with its own subject
 * ("12 leave requests **are** approved"), and the head needs a sub that says
 * something new — twelve requests is rarely twelve people.
 *
 * `actionable` is what the endpoint will actually move, and it is deliberately
 * not the same number as `selected`: a leave request carrying a rejection
 * recommendation is skipped for either verb, so a dialog headlined with the
 * selected count would promise approvals that never happen. The caller passes
 * both and this states the difference as a fact instead.
 *
 * `hours` is the total the write will settle, summed from the approver's own
 * per-row edits, and is only worth showing when the batch is being approved.
 */
export function buildBulkDecisionConfirm({
  queue,
  status,
  actionable = 0,
  selected = actionable,
  employees = 0,
  recommended = 0,
  hours = null,
} = {}) {
  const spec = BULK_QUEUES[queue]
  const verb = VERBS[status]
  if (!spec || !verb) return null

  const one = actionable === 1
  const name = plural(actionable, spec.one, spec.many)
  return {
    title: `${verb.actionLabel} ${name}?`,
    name,
    sub: plural(employees, 'employee', 'employees'),
    icon: verb.icon,
    tone: verb.tone,
    actionLabel: verb.actionLabel,
    buttonClass: verb.buttonClass,
    facts: facts(
      // Only worth saying when it differs from the headline; otherwise a
      // "Selected" row just restates the title in a smaller font.
      recommended > 0 ? ['Selected', selected] : null,
      recommended > 0
        ? ['Recommended for rejection', `${plural(recommended, 'request', 'requests')} — will be skipped`]
        : null,
      hours != null ? ['Hours being approved', formatOvertimeHours(hours)] : null,
    ),
    sentence: one ? spec.one_sentence(status) : spec.many_sentence(status),
    note: UNDO_NOTE,
  }
}

/**
 * The confirmation for dropping a rejection recommendation.
 *
 * The one action here that is neither a queue decision nor a batch, and the one
 * that is genuinely reversible — the request stays pending and the note can be
 * written again — so it says so instead of borrowing the undo warning.
 *
 * The note being deleted is quoted back as a fact: it was somebody's considered
 * opinion, and the approver should be able to see which one is about to go.
 */
export function buildRecommendationConfirm({ request } = {}) {
  if (!request) return null
  const name = request.employeeName || 'This request'
  return {
    title: 'Remove rejection recommendation?',
    name,
    sub: name,
    icon: 'o_flag',
    tone: 'warn',
    actionLabel: 'Remove',
    // Red, as the confirmation it replaces was: this deletes a recorded
    // judgement, even though the request itself is untouched.
    buttonClass: 'dash-modal__danger',
    facts: facts(['Note', (request.rejectionNote || '').trim() || null]),
    sentence: 'loses the recommendation and its note. The request stays pending.',
    note: 'You can recommend rejection again at any time.',
  }
}
