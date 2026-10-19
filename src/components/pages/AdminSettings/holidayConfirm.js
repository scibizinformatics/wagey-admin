/**
 * The wording behind the Holiday group's confirmations.
 *
 * Deleting a holiday, deleting a holiday type, taking a leave source out of a
 * chain, and saving a holiday that will grant leave are four different
 * decisions, and each one used to open Quasar's stock dialog with a message
 * typed inline. That is the one place in this group where the chrome gave the
 * game away: two clicks from a branded table, a plain grey box.
 *
 * All four now build the `dash-modal--confirm` object that
 * `components/common/ConfirmDialog.vue` renders, so they read identically to the
 * confirms an admin already meets on Requests, Schedule and Disbursement. The
 * copy lives in a module rather than in either panel for the reason every other
 * derivation here lives in `composables/utils`: the question asked, the record
 * it was asked about and the toast that follows cannot drift into telling one
 * reader three different stories about a holiday.
 *
 * It is shaped like `Schedule/dayOffConfirm.js` on purpose — the same contract,
 * the same bolded-subject-then-verb sentence, the same facts-then-note order — so
 * this group renders the same chrome as the rest of the app.
 */

import { longLabel } from '@/composables/utils/calendarDate'
import { policyChainLabel, summarizeHolidayPolicies } from '@/composables/utils/holidayTypes'

/**
 * One fact list entry per thing worth restating, with a fact the caller did not
 * supply simply left out — the tolerance `statusConfirm.js` and `dayOffConfirm.js`
 * both document, for the same reason: an empty *value* and an absent *fact* are
 * both natural at a call site and only one of them can be destructured without a
 * crash.
 */
const facts = (...pairs) =>
  pairs
    .filter((pair) => Array.isArray(pair))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value }))

/**
 * How many sources will actually be tried — the number that matters, since a
 * disabled source is skipped. "None" rather than "0", so the fact reads as an
 * answer rather than as a failing count.
 */
function sourceLabel(policies) {
  const summary = summarizeHolidayPolicies(policies)
  if (!summary.hasAny) return 'None'
  if (!summary.disabled) return `${summary.enabled} enabled`
  return `${summary.enabled} of ${summary.total} enabled`
}

/**
 * Deleting one dated holiday.
 *
 * The date and the type are both restated as facts because a holiday is named by
 * its date, not by its name — "Special Non-Working Holiday" appears twelve times
 * in a year and the reader needs to see which one they are about to lose.
 *
 * @param {object} holiday - a normalized row from `normalizeHoliday`
 * @param {string} [typeLabel] the type's resolved name, so the reader is not asked
 *   to recognise a code
 * @returns {{title: string, sub: string, icon: string, tone: string, name: string,
 *   sentence: string, facts: Array<{label: string, value: string}>, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
export function buildHolidayDeleteConfirm(holiday, typeLabel = '') {
  return {
    title: 'Delete this holiday?',
    sub: '',
    icon: 'o_delete',
    tone: 'danger',
    // Quoted so it reads as the record's name rather than as a word in the
    // sentence, matching what the hand-written `$q.dialog` messages did.
    name: `"${holiday?.name || 'This holiday'}"`,
    sentence: 'is taken off the calendar.',
    facts: facts(['Date', longLabel(holiday?.date)], ['Holiday type', typeLabel]),
    note: 'This cannot be undone.',
    actionLabel: 'Delete',
    buttonClass: 'dash-modal__danger',
    cancelable: true,
  }
}

/**
 * Deleting a holiday type, which is the wider of the two deletes.
 *
 * The consequence that belongs in the sentence is the one the old message led
 * with: the type is what every holiday names *by code*, so deleting it silently
 * detaches holidays that have nothing to do with this dialog. That is why the
 * code is quoted in the sentence as well as listed as a fact.
 *
 * @param {object} type - a normalized row from `normalizeHolidayType`
 * @returns {{title: string, sub: string, icon: string, tone: string, name: string,
 *   sentence: string, facts: Array<{label: string, value: string}>, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
export function buildHolidayTypeDeleteConfirm(type) {
  const code = type?.code || ''
  return {
    title: 'Delete this holiday type?',
    sub: '',
    icon: 'o_delete',
    tone: 'danger',
    name: `"${type?.name || 'This holiday type'}"`,
    sentence: code
      ? `is removed along with its leave sources, and every holiday that names the code "${code}" loses the type it was attached to.`
      : 'is removed along with its leave sources.',
    facts: facts(['Code', code], ['Leave sources', sourceLabel(type?.policies)]),
    note: 'This cannot be undone.',
    actionLabel: 'Delete',
    buttonClass: 'dash-modal__danger',
    cancelable: true,
  }
}

/**
 * Taking one leave source out of a type's chain.
 *
 * The `warn` tone is the honest one here, not a stylistic choice: the row goes,
 * but nothing is destroyed — the same dialog can assign the leave type back, and
 * leave already granted from it stands. A `danger` head would overclaim, and a
 * confirmation that overclaims is how people learn to click through them. The
 * note says both halves of that in one place.
 *
 * @param {object} policy - a normalized row from `normalizeHolidayPolicy`
 * @returns {{title: string, sub: string, icon: string, tone: string, name: string,
 *   sentence: string, facts: Array<{label: string, value: string}>, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
export function buildHolidayPolicyRemoveConfirm(policy) {
  const order = policy?.order
  return {
    title: 'Remove this leave source?',
    sub: '',
    icon: 'o_remove_circle',
    tone: 'warn',
    name: policy?.leaveTypeName || 'This leave type',
    sentence:
      'is taken out of the chain, and holidays of this type stop drawing on it. The sources below it move up.',
    facts: facts(
      ['Position', order == null ? 'Not in the chain order yet' : `#${order}`],
      ['Currently', policy?.isEnabled ? 'Enabled' : 'Disabled'],
    ),
    note: 'Leave already granted is not affected. You can add it back to the chain later.',
    actionLabel: 'Remove',
    buttonClass: 'dash-modal__danger',
    cancelable: true,
  }
}

/**
 * Saving a holiday that will grant leave — the one gate here that is not a
 * delete, and the one that costs an admin something they are not looking at.
 *
 * A holiday type with auto-apply on and at least one enabled source grants
 * approved leave when a holiday of that type lands, and that leave comes off the
 * employee's balance. The dialog has to say so before the write, not after: by the
 * time a balance is wrong, the person has to notice it themselves.
 *
 * **The third fact is the chain, not a count.** Which leave type actually pays
 * out is the fact being decided about, and it is ordered — the first source that
 * approves wins — so `policyChainLabel` names them rather than reporting "2
 * enabled" and leaving the reader to work out which one they mean.
 *
 * **There is deliberately no note on the edit path.** Whether re-saving a holiday
 * re-grants leave or tops up what is already there is the backend's business and
 * this client cannot see it, so a reassuring note would be a guess dressed as an
 * assurance. The create path keeps "granted once", which is what the copy already
 * claims.
 *
 * @param {object} options
 * @param {string} options.name   the holiday's name, quoted and bolded
 * @param {string} options.date   its ISO day, restated as a fact
 * @param {object} options.type   a normalized row from `normalizeHolidayType`
 * @param {boolean} [options.editing] an edit rather than a create
 * @returns {{title: string, sub: string, icon: string, tone: string, name: string,
 *   sentence: string, facts: Array<{label: string, value: string}>, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
export function buildHolidayLeaveWarning({ name, date, type, editing = false } = {}) {
  const granted =
    'and eligible employees are granted approved leave from it, deducted from their credits.'
  return {
    title: editing ? 'This change grants leave' : 'This holiday grants leave',
    sub: '',
    // `warn`, not `danger`: nothing is being destroyed, this is a cost the reader
    // should know about before agreeing to it.
    icon: 'o_warning',
    tone: 'warn',
    name: `"${name || 'This holiday'}"`,
    sentence: editing ? `will be saved, ${granted}` : `will be added, ${granted}`,
    facts: facts(
      ['Date', longLabel(date)],
      ['Holiday type', type?.name],
      ['Leave granted from', policyChainLabel(type?.policies)],
    ),
    note: editing ? '' : 'The leave is granted once, when the holiday is created.',
    actionLabel: editing ? 'Update holiday' : 'Add holiday',
    buttonClass: 'dash-modal__approve',
    cancelable: true,
  }
}
