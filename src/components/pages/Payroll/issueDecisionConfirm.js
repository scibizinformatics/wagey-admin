/**
 * The wording behind the Payslips step's decision confirm.
 *
 * Deciding a dispute is the one thing on this page that cannot be looked up
 * afterwards: the employee's payslip moves out of "Disputed" and the reason they
 * gave stops being the thing the page is about. So the gate is asked rather than
 * assumed — and the question it asks restates the complaint, because the admin
 * is answering "is this the right dispute" and the table's single-line reason
 * column is the only place that complaint is written down.
 *
 * Shaped like `fundingConfirm.js` and `disburseConfirm.js` beside it — the same
 * confirm object contract, the same "bolded subject then the verb" sentence, the
 * same facts-then-note order — so `components/common/ConfirmDialog.vue` renders
 * it without a branch or a slot.
 *
 * Only RESOLVE is worded here. Rejecting asks for a reason in a textarea, which
 * the confirm contract has no slot for; its dialog carries its own copy beside
 * `PayslipRejectDialog.vue`.
 */

/**
 * One fact list entry per thing worth restating, with a fact the caller did not
 * supply simply left out — the same helper `fundingConfirm.js` uses, so the two
 * modules read alike.
 */
const facts = (...pairs) =>
  pairs
    .filter((pair) => Array.isArray(pair))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value }))

/**
 * Confirmation for marking a payslip's disputes resolved.
 *
 * `issueCount` is what the *cached* issues said when the dialog was asked, so it
 * is used as a pluraliser and not as a promise: the write re-reads the open
 * issues itself, and a count that has gone stale by the time Confirm is pressed
 * cannot make the decision wrong. Zero — the cache has not answered yet — falls
 * back to the singular phrasing rather than claiming a number nobody checked.
 *
 * `reason` is the employee's own complaint, truncated by the caller if the cell
 * had to ellipsise it. It is the fact this decision is actually about, so it is
 * rendered in full rather than summarised.
 *
 * @param {object}  params
 * @param {string}  [params.employee]  whose payslip is being decided
 * @param {number}  [params.issueCount] how many issues are open on it
 * @param {string}  [params.reason]    the complaint the employee filed
 * @param {string}  [params.groupName]  the run's name
 * @returns {{title: string, name: string, sub: string, icon: string, tone: string,
 *   actionLabel: string, buttonClass: string, facts: Array<{label: string, value: string}>,
 *   sentence: string, note: string, cancelable: boolean}}
 */
export function buildResolveConfirm({ employee, issueCount = 0, reason, groupName = '' }) {
  const subject = issueCount > 1 ? `${issueCount} disputes` : 'This dispute'

  return {
    title: 'Resolve this dispute?',
    // The employee names the payslip; the run is the context. Same "name · date"
    // pairing the schedule's reassign confirm puts in this slot.
    sub: [employee, groupName].filter(Boolean).join(' · '),
    icon: 'o_check_circle',
    tone: 'good',
    name: subject,
    sentence: `on ${employee || 'this payslip'} will be marked resolved.`,
    facts: facts(
      issueCount > 0 ? ['Open issues', String(issueCount)] : null,
      ['Reported', reason],
      ['Payout group', groupName],
    ),
    // Resolving is not free of consequence — the employee is told the dispute was
    // upheld in their favour and no correction is made to this run's figures — so
    // the note says what resolving does rather than claiming it is undoable.
    note: 'The employee is told their dispute was accepted. No change is made to this payslip’s figures from this screen.',
    actionLabel: 'Resolve',
    buttonClass: 'dash-modal__approve',
    cancelable: true,
  }
}
