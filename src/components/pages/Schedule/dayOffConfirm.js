/**
 * The wording behind the day-off confirmation.
 *
 * Assigning a day off reaches one dialog from three places in the grid — the day-off
 * button on a single shift's card, the same button on a dual-shift day, and the
 * empty cell's "Day off" item — and each of them used to write straight through.
 * A scheduler moves a card's day off to free someone up, and one stray click
 * silently replaced a shift somebody was working; nothing on screen announced it
 * and nothing took it back automatically.
 *
 * All three now read one builder, so the dialog says the same thing whichever
 * control opened it, and the copy lives in a module rather than in the page for
 * the reason every other derivation here lives in `composables/utils`: the
 * question asked, the row it was asked about and the toast that follows cannot
 * drift into telling a reader three different stories about a shift.
 *
 * It is shaped like `AccessCards/statusConfirm.js` on purpose — the same
 * `dash-modal--confirm` object contract, the same "bolded subject then the verb"
 * sentence, the same facts-then-note order — so this page's confirmations read
 * identically to the ones an admin meets on Requests and Access Cards, and
 * `components/common/ConfirmDialog.vue` renders all of them without a slot or a
 * branch of its own.
 */

import { longLabel } from '@/composables/utils/calendarDate'

/**
 * One fact list entry per thing worth restating, with a fact the caller did not
 * supply simply left out — the tolerance `statusConfirm.js` documents, for the
 * same reason: an empty *value* and an absent *fact* are both natural at a call
 * site and only one of them can be destructured without a crash.
 */
const facts = (...pairs) =>
  pairs
    .filter((pair) => Array.isArray(pair))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value }))

/**
 * There is deliberately no "cannot be undone" note here.
 *
 * The day-off chip carries its own "Reassign day off" tool, so a shift can go
 * back on the same day from the same grid. The irreversible note the delete
 * confirms use would be a lie about this one, and a confirmation that overclaims
 * is how people learn to click through them.
 */
const REVERSIBLE_NOTE = 'You can put a shift back on this day from the same grid.'

/** "10:00–14:00 · Bacoor", or "2 shifts · 10:00–14:00 & 18:00–22:00 · Bacoor". */
function describeCurrent(shifts) {
  const list = (shifts || []).filter(Boolean)
  if (!list.length) return ''
  if (list.length > 1) {
    const sites = [...new Set(list.map((s) => s.siteName).filter(Boolean))]
    const times = list.map((s) => legTime(s)).filter(Boolean)
    return [`${list.length} shifts`, times.join(' & '), ...sites].filter(Boolean).join(' · ')
  }
  const shift = list[0]
  return [legTime(shift), shift.siteName].filter(Boolean).join(' · ')
}

/** One leg's clock span, or '' for a shift that carries no times at all. */
const legTime = (shift) => [shift.startTime, shift.endTime].filter(Boolean).join('–')

/**
 * One confirmation, ready to hand to `ConfirmDialog`.
 *
 * `mode` is `'dual'` for a day holding two shifts, `'empty'` for a cell with
 * nothing on it and anything else for a single shift. It changes the title, the
 * button label and the sentence — the two days are not the same decision, since
 * one of them is replacing a shift that exists and the other is marking a blank
 * one, and a dialog that read identically for both would be wrong about one.
 *
 * @param {object} options
 * @param {string} options.employeeName the person the day off lands on, bolded
 * @param {string} options.date          the ISO day, for the headline date
 * @param {string} [options.dayLabel]    the grid's short day name ("Mon")
 * @param {'shift'|'dual'|'empty'} [options.mode] what is on the day now
 * @param {Array<{startTime?: string, endTime?: string, siteName?: string}>} [options.shifts]
 *        what is scheduled now — left out entirely for an empty day
 * @returns {{title: string, sub: string, icon: string, tone: string, name: string,
 *   sentence: string, facts: Array<{label: string, value: string}>, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
export function buildDayOffConfirm({
  employeeName = '',
  date = '',
  dayLabel = '',
  mode = 'shift',
  shifts = [],
} = {}) {
  const dual = mode === 'dual'
  const dateLabel = longLabel(date)
  const current = describeCurrent(shifts)

  return {
    title: dual ? 'Assign a day off to both shifts?' : 'Assign a day off?',
    // Repeats the day alongside the name: when one dialog replaces another, the
    // sub is the line still on screen afterwards, and *which day* is the question
    // that survives a lost context on a grid this wide.
    sub: [employeeName, dateLabel].filter(Boolean).join(' · '),
    icon: 'o_event_busy',
    tone: 'warn',
    // The person, not the shift: the decision is about who stops working, and
    // the name is what the reader can check against the row they just clicked.
    name: employeeName,
    // Opens with a verb from the bolded subject, and says what the day becomes —
    // the part a bare "Assign a day off?" leaves to the imagination.
    sentence: current
      ? `will have ${dual ? 'both shifts' : 'the shift'} on ${dateLabel} replaced with a day off.`
      : `will be marked as off on ${dateLabel}.`,
    facts: facts(
      ['Employee', employeeName],
      ['Day', [dayLabel, dateLabel].filter(Boolean).join(', ')],
      ['On this day now', current],
      ['After', 'Day off'],
    ),
    note: REVERSIBLE_NOTE,
    actionLabel: dual ? 'Assign to both' : 'Assign day off',
    buttonClass: 'dash-modal__approve',
    cancelable: true,
  }
}
