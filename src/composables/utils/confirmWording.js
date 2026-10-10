/**
 * The wording for confirmation dialogs.
 *
 * Every confirm in the app states the same three things: what is about to happen,
 * what it does to the record, and what it costs to be wrong. Writing that out by
 * hand per dialog is how two of them end up disagreeing about whether an action
 * can be undone. These builders take the facts and compose the object that
 * `ConfirmDialog.vue` renders, so the phrasing is settled in one place.
 *
 * The contract is `components/pages/Request/decisionConfirm.js` and its
 * siblings': a `build*Confirm()` returning a plain object —
 * `{ title, sub, icon, tone, name, sentence, note, actionLabel, buttonClass,
 *    cancelable }` — which the dialog renders without a slot or a branch of its
 * own. Features whose facts are computed from live reactive state still keep their
 * own module; these are for the ones where the shape is fixed.
 */

/**
 * A destructive decision: "this named thing is removed and cannot come back".
 *
 * The sentence is assembled from the three things every delete site already knew
 * how to say — what it is called, what kind of thing it is, and what stops being
 * possible afterwards.
 *
 * @param {object}  options
 * @param {string}  options.name        the record's display name, bolded
 * @param {string}  options.noun        what it is, for the title: "cost center"
 * @param {string}  options.consequence what stops being possible afterwards
 * @param {string}  [options.actionLabel]  verb on the button, default "Delete"
 * @param {string}  [options.tone]        head icon tone, default "danger"
 * @param {string}  [options.icon]        head icon glyph, default "o_delete"
 * @param {string}  [options.buttonClass] default "dash-modal__danger"
 */
export function buildDeleteConfirm({
  name,
  noun,
  consequence,
  actionLabel = 'Delete',
  tone = 'danger',
  icon = 'o_delete',
  buttonClass = 'dash-modal__danger',
}) {
  return {
    title: `Delete this ${noun}?`,
    sub: '',
    icon,
    tone,
    // Quoted so it reads as the record's name rather than as a word in the
    // sentence, matching what the hand-written `$q.dialog` messages did.
    name: `"${name}"`,
    sentence: `is removed and ${consequence}.`,
    facts: [],
    note: 'This cannot be undone.',
    actionLabel,
    buttonClass,
    cancelable: true,
  }
}

/**
 * A batch of employees being terminated, mirroring `EmployeeTerminateDialog`.
 *
 * Note the absent `note`. That dialog says "You can restore them later" in its
 * sentence and carries no note, because terminate is REVERSIBLE — and the note
 * the irreversible confirms use ("This cannot be undone from this screen") would
 * be a lie here. `note` is therefore optional in the contract, not always filled.
 *
 * @param {number} options.count  how many employees are selected and active
 */
export function buildTerminateConfirm({ count }) {
  const subject = `${count} employee${count === 1 ? '' : 's'}`
  return {
    title: `Terminate ${subject}?`,
    sub: '',
    icon: 'block',
    tone: 'danger',
    name: subject,
    sentence: 'are marked Terminated and lose access to the app. You can restore them later.',
    facts: [],
    note: '',
    actionLabel: 'Terminate',
    buttonClass: 'dash-modal__danger',
    cancelable: true,
  }
}

/**
 * An alert: something the reader needs to know and nothing to decide.
 *
 * One button, no Cancel, and no bolded subject — there is no action being
 * confirmed, so there is nothing to name as the object of a verb. The message
 * goes in `note`, which is the one block that renders on its own.
 *
 * @param {object}  options
 * @param {string}  options.title    the headline
 * @param {string}  options.message  what the reader needs to know
 * @param {string}  [options.icon]   default "o_event_busy"
 * @param {string}  [options.tone]   default "warn"
 */
export function buildNotice({ title, message, icon = 'o_event_busy', tone = 'warn' }) {
  return {
    title,
    sub: '',
    icon,
    tone,
    name: '',
    sentence: '',
    facts: [],
    note: message,
    actionLabel: 'OK',
    buttonClass: 'dash-modal__approve',
    cancelable: false,
  }
}
