/**
 * The wording behind the Disbursement step's confirmations.
 *
 * Releasing pay moves real money and cannot be undone from this screen, so both
 * routes into it are asked rather than fired: the bulk release for a
 * non-cash group, and the one-at-a-time release for a cash payout.
 *
 * The copy lives in a module for the reason every other derivation here lives in
 * `composables/utils` or beside its component: the button, the dialog and the
 * toast that follows all read the same figures, so they cannot tell a reader
 * three different stories about how much money is about to move.
 *
 * Shaped like `fundingConfirm.js` beside it — the same confirm object contract,
 * the same "bolded subject then the verb" sentence, the same facts-then-note
 * order — so `components/common/ConfirmDialog.vue` renders both without a branch.
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

/** The largest figure in a set, as a peso string. */
export function totalOf(rows) {
  const sum = rows.reduce((acc, row) => acc + (Number(row?.net_pay) || 0), 0)
  return `₱${sum.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Confirmation for releasing a whole non-cash group in one go.
 *
 * Cash is counted and named even though it is not in the batch: the reader has
 * to know it was left out, or "Disburse all" reads as "everything" and someone
 * will believe the run is finished when the cash is still sitting unreleased.
 *
 * @param {Array<object>} rows        the non-cash rows about to be released
 * @param {number} cashCount          how many cash rows were excluded
 * @param {string} [groupName]        the run's name
 * @returns {{title: string, name: string, sub: string, icon: string, tone: string,
 *   actionLabel: string, buttonClass: string, facts: Array<{label: string, value: string}>,
 *   sentence: string, note: string}}
 */
export function buildDisburseAllConfirm(rows, cashCount = 0, groupName = '') {
  const count = rows.length
  const subject = `${count} employee${count === 1 ? '' : 's'}`

  return {
    title: 'Release this pay?',
    name: subject,
    sub: groupName || 'This payout group',
    icon: 'o_payments',
    tone: 'warn',
    actionLabel: 'Release pay',
    buttonClass: 'dash-modal__approve',
    facts: facts(
      ['Employees', String(count)],
      ['Total', totalOf(rows)],
      cashCount > 0 ? ['Cash, released separately', `${cashCount}`] : null,
    ),
    // Continues from the bolded count, so it opens with a verb.
    sentence: `in ${groupName || 'this group'} will be released as paid.`,
    note: cashCount
      ? `${cashCount} cash payout${cashCount === 1 ? '' : 's'} will not be released here — cash is handed over and recorded one employee at a time.`
      : 'This cannot be undone from this screen.',
  }
}

/**
 * Confirmation for releasing one cash payout.
 *
 * `row` arrives as the disbursement payload's row, so this reads `employee` and
 * `net_pay` directly rather than re-deriving either.
 *
 * @param {object} row
 * @param {string} [groupName]
 * @returns {{title: string, name: string, sub: string, icon: string, tone: string,
 *   actionLabel: string, buttonClass: string, facts: Array<{label: string, value: string}>,
 *   sentence: string, note: string}}
 */
export function buildDisburseOneConfirm(row, groupName = '') {
  const name = row?.employee || 'This employee'

  return {
    title: 'Release this cash payout?',
    name,
    sub: groupName || 'This payout group',
    icon: 'o_payments',
    tone: 'warn',
    actionLabel: 'Release pay',
    buttonClass: 'dash-modal__approve',
    facts: facts(
      ['Amount', totalOf([row || {}])],
      ['Method', row?.payout_method || 'Cash'],
      ['Position', row?.position],
    ),
    sentence: `will be released as paid.`,
    note: 'Cash is recorded per employee so each payout can be matched to the person who collected it. This cannot be undone from this screen.',
  }
}