/**
 * The wording behind the cash-advance flow's confirmations.
 *
 * Deciding a request, deleting one, funding the group and releasing the
 * advances all move or remove money, so each is asked rather than fired. The
 * copy lives in a module for the reason every other derivation here lives
 * beside its component: the row, the dialog and the toast that follows all read
 * the same figures, so they cannot tell a reader three different stories about
 * what is about to happen.
 *
 * Shaped like `Payroll/fundingConfirm.js` and `Payroll/disburseConfirm.js` — the
 * same confirm object contract, the same "bolded subject then the verb"
 * sentence, the same facts-then-note order — so `components/common/ConfirmDialog.vue`
 * renders these without a branch.
 */

import { formatCurrency } from 'src/composables/utils/format'

/** One fact list entry per thing worth restating; an absent value is left out. */
const facts = (...pairs) =>
  pairs
    .filter((pair) => Array.isArray(pair))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value }))

const groupOf = (groupName) => groupName || 'this payout group'

/** The total of a set of request/release rows, as a peso string. */
const totalOf = (rows) =>
  formatCurrency(
    rows.reduce((sum, row) => sum + (Number(row?.amount ?? row?.requested_amount ?? 0) || 0), 0),
  )

/**
 * Confirmation for deciding every pending request an employee has in one go.
 *
 * The employee row's 3-dot menu offers this so a person with several outstanding
 * requests can decide them together rather than one at a time. The wording is the
 * single-request wording with a count and a total, so the dialog still states the
 * money and the decision rather than only "all of them".
 */
export function buildCashAdvanceBulkDecisionConfirm({
  employee,
  requests = [],
  decision,
  groupName = '',
}) {
  const approved = decision === 'approved'
  const count = requests.length

  return {
    title: approved ? 'Approve these cash advances?' : 'Reject these cash advances?',
    name: employee
      ? `${employee}'s ${count} pending request${count === 1 ? '' : 's'}`
      : `${count} pending request${count === 1 ? '' : 's'}`,
    sub: groupOf(groupName),
    icon: approved ? 'o_check_circle' : 'o_cancel',
    tone: approved ? 'good' : 'danger',
    actionLabel: approved ? 'Approve all' : 'Reject all',
    buttonClass: approved ? 'dash-modal__approve' : 'dash-modal__danger',
    facts: facts(
      ['Requests', String(count)],
      ['Total', totalOf(requests)],
      ['Decision', approved ? 'Approved' : 'Rejected'],
    ),
    sentence: approved
      ? `will be approved for a total of ${totalOf(requests)}.`
      : 'will be rejected, and nothing will be funded against them.',
    note: 'Only pending requests can be decided, and a decision cannot be changed from this screen.',
  }
}

/**
 * Confirmation for recording one cash-advance funding entry.
 *
 * The three outcomes are the same ones the salary funding step reads: a short
 * entry is a legitimate instalment, a settled entry covers the group, and an
 * over entry is usually a mis-typed figure. `remainingBefore` is the gap as it
 * stood when the dialog opened, so a refetch behind it cannot make the dialog
 * describe a state that no longer exists.
 */
export function buildCashAdvanceFundingConfirm({
  amount,
  source,
  reference,
  remainingBefore,
  groupName = '',
}) {
  const entered = Number(amount) || 0
  const before = Number(remainingBefore) || 0
  const after = Math.max(0, before - entered)
  const short = entered < before
  const over = before > 0 && entered > before

  return {
    title: 'Record this cash advance funding?',
    name: formatCurrency(entered),
    sub: groupOf(groupName),
    icon: over ? 'o_error' : short ? 'o_warning' : 'o_check_circle',
    tone: short || over ? 'warn' : 'good',
    actionLabel: 'Add funds',
    buttonClass: 'dash-modal__approve',
    facts: facts(
      ['Amount', formatCurrency(entered)],
      ['Funding source', source || 'Not stated'],
      ['Reference no.', reference || 'None'],
      ['Still to fund now', before > 0 ? formatCurrency(before) : 'Nothing outstanding'],
      ['After this entry', after > 0 ? formatCurrency(after) : 'Fully funded'],
    ),
    sentence: `will be recorded against ${groupOf(groupName)}'s cash advances.`,
    note: over
      ? `That is ${formatCurrency(entered - before)} more than this group needs. Check the figure if it was not deliberate.`
      : short
        ? `This leaves ${formatCurrency(after)} still to fund. The advances cannot be released until funding covers them.`
        : 'This covers the group in full.',
  }
}

/**
 * Confirmation for releasing a batch of cash advances.
 *
 * `excluded` is stated even when zero only through the note's absence: a reader
 * who clicked "Release all" on a group with settled rows must not believe the
 * batch included them, so a positive count is always named.
 */
export function buildCashAdvanceDisburseConfirm({ rows = [], excluded = 0, groupName = '' }) {
  const count = rows.length
  const subject = `${count} employee${count === 1 ? '' : 's'}`

  return {
    title: 'Release these cash advances?',
    name: subject,
    sub: groupOf(groupName),
    icon: 'o_send',
    tone: 'warn',
    actionLabel: 'Release advances',
    buttonClass: 'dash-modal__approve',
    facts: facts(
      ['Employees', String(count)],
      ['Total', totalOf(rows)],
      excluded > 0 ? ['Already settled, not included', String(excluded)] : null,
    ),
    sentence: `will be marked for cash advance release in ${groupOf(groupName)}.`,
    note: excluded
      ? `${excluded} employee${excluded === 1 ? '' : 's'} already have a settled claim and are not included in this release.`
      : 'This cannot be undone from this screen.',
  }
}

/** Confirmation for releasing one employee's advance. */
export function buildCashAdvanceDisburseOneConfirm({ employee, amount, method, groupName = '' }) {
  return {
    title: 'Release this cash advance?',
    name: employee ? `${employee}'s advance` : 'This employee',
    sub: groupOf(groupName),
    icon: 'o_send',
    tone: 'warn',
    actionLabel: 'Release advance',
    buttonClass: 'dash-modal__approve',
    facts: facts(['Amount', formatCurrency(amount)], ['Method', method || 'Not stated']),
    sentence: 'will be marked for cash advance release.',
    note: 'This cannot be undone from this screen.',
  }
}
