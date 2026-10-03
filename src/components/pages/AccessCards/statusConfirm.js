/**
 * The wording behind every card-status confirmation.
 *
 * Four verbs reach the same dialog — reactivate, deactivate, mark lost, revoke —
 * and they come from two places: a row menu on the table or the card list, and
 * the Card status group in the detail dialog. Both read `statusActionsFor`, so
 * the two entry points cannot offer a verb the other lacks.
 *
 * The copy lives in a module rather than in the dialog for the reason every
 * other derivation in this codebase lives in `composables/utils`: the row, the
 * dialog and the toast that follows all read the same words, so they cannot tell
 * a reader three different stories about what is about to happen to a
 * credential.
 *
 * It is shaped like `RequestPage`'s `decisionConfirm.js` on purpose — the same
 * `dash-modal--confirm` object contract, the same "bolded subject then the verb"
 * sentence, the same facts-then-note order — so this page's confirmations read
 * identically to the ones an admin meets on Requests, and the two dialog
 * components are interchangeable to the eye.
 *
 * Why every one of them asks, including the reversible one: a status here is not
 * a label, it is what a physical door will do with a card somebody is carrying
 * right now. Reactivate is the only verb that takes nothing away, so it says so
 * in its note instead of borrowing the warning — a confirmation that overclaims
 * is how people learn to click through them.
 */

import { formatUid, WRITABLE_STATUSES, statusLabel } from 'src/composables/utils/accessCards'

/**
 * One fact list entry per thing worth restating, with a fact the payload did not
 * supply simply left out — the same tolerance `decisionConfirm.js` documents,
 * for the same reason: an empty *value* and an absent *fact* are both natural at
 * a call site and only one of them can be destructured without a crash.
 */
const facts = (...pairs) =>
  pairs
    .filter((pair) => Array.isArray(pair))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value }))

/** The one verb whose dialog is not reporting something lost. */
const REVERSIBLE_NOTE = 'Nothing loses access here. You can put this card back from the same menu.'

/** The other three: the card stops working, and that is undoable. */
const CONSEQUENT_NOTE = 'The card stops working at every reader. You can set its status back.'

/**
 * One confirmation, ready to hand to `AccessCardStatusConfirmDialog`.
 *
 * `card` arrives already normalised, so this reads display-ready fields — the
 * spaced `uid`, the resolved `employeeName`, the `status` `cardStatus` built —
 * and never re-derives anything.
 *
 * Returns null for a status the endpoint would refuse, so a verb held open while
 * the card behind it changed state opens no dialog rather than one whose facts
 * contradict the row. Nothing is written in that case; the caller logs it the way
 * `RequestPage` does.
 *
 * @param {object} card   the normalised card
 * @param {string} status the status being moved to
 * @returns {{title: string, name: string, sub: string, icon: string, tone: string,
 *   actionLabel: string, buttonClass: string, facts: Array<{label: string, value: string}>,
 *   sentence: string, note: string}|null}
 */
export function buildStatusConfirm(card, status) {
  const verb = WRITABLE_STATUSES[String(status || '').toLowerCase()]
  if (!verb || !card) return null

  // The card, not the person. The status belongs to the card, and the holder is
  // often unknown or ambiguous on this page — the name is a fact below, not the
  // subject, so the sentence reads the same for a card nobody holds.
  const name = formatUid(card.uid)

  return {
    title: `${verb.actionLabel} this card?`,
    // The sub repeats the uid rather than the name: when one dialog replaces
    // another, the sub is the line still on screen afterwards, and "which card"
    // is the question that survives a lost context.
    name,
    sub: name,
    icon: verb.icon,
    tone: verb.tone,
    actionLabel: verb.actionLabel,
    buttonClass: verb.buttonClass,
    facts: facts(
      ['Card', name],
      ['Holder', card.employeeName || 'Nobody'],
      ['Status now', statusLabel(card.status?.key, card.status?.label)],
      ['Status after', verb.label],
    ),
    // Continues from the bolded uid, so it opens with a verb — and says what a
    // reader will do, which is the part "revoked" leaves to the imagination.
    sentence: verb.sentence,
    note: verb.key === 'active' ? REVERSIBLE_NOTE : CONSEQUENT_NOTE,
  }
}