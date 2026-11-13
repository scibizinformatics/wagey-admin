/**
 * The wording behind the Review step's three confirmations.
 *
 * Review is the gate before payslips. `review-to-ready` marks the employee payroll
 * items it is given, and only once *every* one of them is marked does the run move
 * on to payslip release — and nothing puts an employee back, so each of these is
 * asked rather than fired. Two entry points into the same decision (the row menu,
 * one employee at a time, and the toolbar, for everyone still outstanding) plus the
 * release that follows them.
 *
 * The release's wording used to sit inline in the page, on a bare `$q.dialog`. It
 * lives here for the reason every other derivation in this feature lives in
 * `composables/utils` or beside its component: the button, the dialog and the toast
 * that follows all read the same counts, so they cannot tell a reader three
 * different stories about how many people are about to be signed off.
 *
 * Shaped like `fundingConfirm.js` and `disburseConfirm.js` beside it — the same
 * confirm object contract, the same "bolded subject then the verb" sentence, the
 * same facts-then-note order — so `components/common/ConfirmDialog.vue` renders all
 * three without a branch or a slot.
 */

/**
 * One fact list entry per thing worth restating, with a fact the caller did not
 * supply simply left out.
 */
const facts = (...pairs) =>
  pairs
    .filter((pair) => Array.isArray(pair))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value }))

/**
 * What both review dialogs say about why the click matters.
 *
 * The consequence is the same sentence whichever entry point was used — the run
 * leaves review as soon as the last employee goes in — and it is the one thing a
 * reader cannot see from the button they just pressed. Kept as one constant so the
 * two dialogs cannot drift into telling different stories about the same gate.
 */
const REVIEW_GATE_NOTE =
  'Review is the gate before payslips. Once every employee on the run is reviewed it moves on to payslip release, and nobody can be added to it after that.'

/**
 * Confirmation for reviewing everyone still outstanding, from the toolbar.
 *
 * `alreadyReviewed` is only there to give `count` a size — the batch is `count` and
 * nothing else, so the two figures cannot end up describing different sets of
 * people. It is left out entirely on a run nobody has reviewed yet, where it would
 * be a row reading "Already reviewed 0".
 *
 * @param {object} params
 * @param {number} params.count employees about to be marked reviewed
 * @param {number} [params.alreadyReviewed] how many are reviewed already
 * @param {string} [params.groupName] the run's name
 * @returns {{title: string, name: string, sub: string, icon: string, tone: string,
 *   facts: Array<{label: string, value: string}>, sentence: string, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
export function buildReviewAllConfirm({ count = 0, alreadyReviewed = 0, groupName = '' }) {
  return {
    title: 'Mark all employees reviewed?',
    name: `${count} employee${count === 1 ? '' : 's'}`,
    // The run is the context for a decision about people, and the fact rows
    // deliberately do not repeat it. This line is where it belongs; saying it twice
    // is how a confirm starts reading like a form.
    sub: groupName || 'This payout group',
    icon: 'o_done_all',
    tone: 'good',
    // Continues from the bolded count, so it opens with a verb.
    sentence: 'will be marked reviewed.',
    facts: facts(
      ['Employees', String(count)],
      alreadyReviewed > 0 ? ['Already reviewed', String(alreadyReviewed)] : null,
    ),
    note: REVIEW_GATE_NOTE,
    actionLabel: 'Mark reviewed',
    buttonClass: 'dash-modal__approve',
    cancelable: true,
  }
}

/**
 * Confirmation for reviewing one employee, from the row menu.
 *
 * The two counts are the run's progress, not this employee's attributes: the review
 * summary names an employee and their request totals but carries no position, so a
 * "Position" row here would render nothing at all rather than something wrong.
 *
 * `stillToReview` is the count *after* this one goes in, and the label says so —
 * the question the reader is answering is not "mark this one" but "what does
 * marking this one leave me", and a bare "Still to review 6" reads as six people
 * about to go in this batch. Both counts are dropped when they would be zero, which
 * is also the one case where the run moves on to payslip release the moment Confirm
 * is pressed — the case the note is really about.
 *
 * @param {object} params
 * @param {string} [params.employee] whose review is being recorded
 * @param {string} [params.groupName] the run's name
 * @param {number} [params.alreadyReviewed] employees reviewed before this one
 * @param {number} [params.stillToReview] employees left after this one
 * @returns {{title: string, name: string, sub: string, icon: string, tone: string,
 *   facts: Array<{label: string, value: string}>, sentence: string, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
export function buildReviewOneConfirm({
  employee,
  groupName = '',
  alreadyReviewed = 0,
  stillToReview = 0,
}) {
  return {
    title: 'Mark this employee reviewed?',
    name: employee || 'This employee',
    sub: groupName || 'This payout group',
    icon: 'o_check_circle',
    tone: 'good',
    sentence: 'will be marked reviewed.',
    facts: facts(
      alreadyReviewed > 0 ? ['Already reviewed', String(alreadyReviewed)] : null,
      stillToReview > 0 ? ['Still to review after this', String(stillToReview)] : null,
    ),
    note: REVIEW_GATE_NOTE,
    actionLabel: 'Mark reviewed',
    buttonClass: 'dash-modal__approve',
    cancelable: true,
  }
}

/**
 * Confirmation for releasing payslips to everyone reviewed so far.
 *
 * Says who is *not* in the batch. A release covers the reviewed employees and nobody
 * else, so without the count a partial release reads as "this run's payslips are
 * out" and someone will believe the run is finished while the unreviewed are still
 * sitting unreleased — which is the mistake this gate exists to prevent.
 *
 * The caller only opens this when someone *is* left out, so `staying` is normally
 * non-zero; the other branch is here so the builder cannot claim a warning that is
 * not true if a caller ever changes that.
 *
 * @param {object} params
 * @param {number} params.going reviewed employees whose payslips are being sent
 * @param {number} [params.staying] unreviewed employees excluded from it
 * @param {string} [params.groupName] the run's name
 * @returns {{title: string, name: string, sub: string, icon: string, tone: string,
 *   facts: Array<{label: string, value: string}>, sentence: string, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
/**
 * Confirmation for undoing the review-to-ready transition.
 *
 * The undo is whole-run (`reset-review` targets every EPI unless it is handed
 * ids), and this page cannot know how many are currently reviewed — the endpoint
 * answers `epis_reset` afterwards — so the subject is the run, and the count is
 * reported by the toast rather than guessed at here.
 *
 * `payslip_status` and the claim fields are untouched by this endpoint, which is
 * the one thing a reader cannot tell from a button labelled "undo review".
 */
export function buildResetReviewConfirm({ groupName = '' }) {
  return {
    title: 'Undo the review?',
    name: groupName || 'This payout group',
    sub: 'Payslips keep their current state',
    icon: 'o_undo',
    tone: 'warn',
    sentence:
      'will send every reviewed employee back to needs attention, so their payslips can be reviewed again.',
    note: 'Only the review decision is undone — payslips, acknowledgements and claims are left as they are. A run that has moved past review is refused.',
    actionLabel: 'Undo review',
    buttonClass: 'dash-modal__submit',
    cancelable: true,
  }
}

/**
 * Confirmation for undoing the payslip release.
 *
 * This one clears what employees have done — acknowledgements, claims — so it
 * says so before the click rather than after. The endpoint refuses a run whose
 * employees have already acted, and that refusal is worded by the backend when
 * it happens.
 */
export function buildResetReleaseConfirm({ groupName = '' }) {
  return {
    title: 'Undo the payslip release?',
    name: groupName || 'This payout group',
    sub: 'Released payslips return to in progress',
    icon: 'o_settings_backup_restore',
    tone: 'danger',
    sentence:
      'will pull back every released payslip and clear the acknowledgement and claim fields it carries.',
    note: 'Refused once an employee has acknowledged a payslip, filed a dispute, or been paid — resolve those first.',
    actionLabel: 'Undo release',
    buttonClass: 'dash-modal__danger',
    cancelable: true,
  }
}

export function buildReleaseConfirm({ going = 0, staying = 0, groupName = '' }) {
  return {
    title: 'Release payslips?',
    name: `${going} reviewed employee${going === 1 ? '' : 's'}`,
    sub: groupName || 'This payout group',
    icon: 'o_send',
    tone: 'warn',
    sentence: 'will be sent their payslip.',
    facts: facts(
      ['Employees', String(going)],
      staying > 0 ? ['Left out', `${staying} unreviewed`] : null,
    ),
    note:
      staying > 0
        ? `The ${staying} still unreviewed ${staying === 1 ? 'is' : 'are'} left out, and can be released once reviewed.`
        : 'Their payslips go to the employees, and this cannot be undone from this screen.',
    actionLabel: 'Release payslips',
    buttonClass: 'dash-modal__approve',
    cancelable: true,
  }
}
