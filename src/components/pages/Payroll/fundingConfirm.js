/**
 * The wording behind the Funding step's confirmation.
 *
 * Money leaving the company is not a label somebody can correct later in the
 * screen, so the gate here is asked rather than assumed: recording a funding
 * entry at all.
 *
 * The copy lives in a module rather than in the dialog for the reason every
 * other derivation in this codebase lives in `composables/utils` or beside its
 * component: the field hint under Amount, the dialog and the toast that follows
 * all read the same figures, so they cannot tell a reader three different stories
 * about what is about to happen to a payout run.
 *
 * It is shaped like `RequestPage`'s `decisionConfirm.js` and `AccessCards`'
 * `statusConfirm.js` on purpose — the same confirm object contract, the same
 * "bolded subject then the verb" sentence, the same facts-then-note order — so
 * `components/common/ConfirmDialog.vue` renders them without a branch.
 *
 * There was once a second builder in this file, for leaving a group that was not
 * fully funded for disbursement. That gate is gone — `FundingPage` no longer
 * offers the forward button to an underfunded group at all, so there is nothing
 * left to ask about.
 */

import { formatCurrency } from 'src/composables/utils/format'

/**
 * One fact list entry per thing worth restating, with a fact the caller did not
 * supply simply left out — an empty *value* and an absent *fact* are both natural
 * at a call site and only one of them can be destructured without a crash.
 */
const facts = (...pairs) =>
  pairs
    .filter((pair) => Array.isArray(pair))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value }))

/** The subject a facts-free sentence would otherwise have nowhere to point. */
const groupOf = (groupName) => groupName || 'this payout group'

/** What is left owing once this entry lands, never a negative figure. */
const remainingAfter = (remainingBefore, amount) => Math.max(0, remainingBefore - amount)

/**
 * Confirmation for recording one funding entry.
 *
 * Reads three outcomes apart, because the step permits all of them — funding a
 * group in instalments is normal, so a short amount is a decision to confirm
 * rather than a mistake to refuse:
 *
 *   short    — the entry is legitimate but the group is not covered yet
 *   settled  — the entry exactly covers what was owed
 *   over     — the entry is more than the group needed, which is worth a second
 *              look because it usually means a mis-typed figure
 *
 * `remainingBefore` is the gap as it stood when the dialog opened, not as it
 * stands when Confirm is pressed: a group funded from another tab in between
 * would otherwise make the dialog describe a state that no longer exists.
 *
 * @param {object}  params
 * @param {number}  params.amount          the entered amount
 * @param {string}  [params.source]        the funding source chosen
 * @param {string}  [params.reference]     the reference number entered
 * @param {number}  params.remainingBefore the gap at the moment of asking
 * @param {string}  [params.groupName]     the run's name
 * @returns {{title: string, name: string, sub: string, icon: string, tone: string,
 *   actionLabel: string, buttonClass: string, facts: Array<{label: string, value: string}>,
 *   sentence: string, note: string}}
 */
export function buildFundingConfirm({
  amount,
  source,
  reference,
  remainingBefore,
  groupName,
}) {
  const entered = Number(amount) || 0
  const before = Number(remainingBefore) || 0
  const after = remainingAfter(before, entered)
  const short = entered < before
  const over = before > 0 && entered > before

  return {
    title: 'Record this funding?',
    // The amount is the subject: it is the number a reader is about to be held
    // to, and the one they will check against their own paperwork afterwards.
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
    // Continues from the bolded amount, so it opens with a verb.
    sentence: `will be recorded against ${groupOf(groupName)}.`,
    note: over
      ? `That is ${formatCurrency(entered - before)} more than this group needs. Check the figure if it was not deliberate.`
      : short
        ? `This leaves ${formatCurrency(after)} still to fund. Disbursement stays closed until the group is fully funded.`
        : 'This covers the group in full.',
  }
}
