/**
 * Wording for the two contribution-account decisions.
 *
 * The API has no edit: `PATCH` accepts `is_active` and nothing else, so changing
 * a number is deactivate-then-create. Both confirms therefore say that the old
 * row stays on record and that it cannot be switched back on — the fact that
 * makes the question worth asking.
 *
 * Each takes a snapshot of the row and the draft, so a list refreshing behind
 * the dialog cannot make the question describe a different number from the one
 * the write will touch.
 */

/**
 * Replace a number: the old row is deactivated, the new one is created.
 *
 * @param {object} options
 * @param {string} options.employeeName
 * @param {string} options.typeLabel
 * @param {string} options.oldNumber
 * @param {string} options.newNumber
 */
export function buildReplaceAccountConfirm({ employeeName, typeLabel, oldNumber, newNumber }) {
  const subject = employeeName
    ? `${employeeName}'s ${typeLabel} account number`
    : `This ${typeLabel} account number`
  return {
    title: 'Replace this account number?',
    sub: '',
    icon: 'o_swap_horiz',
    tone: 'warn',
    name: subject,
    sentence: 'is replaced. The current number is deactivated and kept as history.',
    facts: [
      { label: 'Current number', value: oldNumber || '—' },
      { label: 'New number', value: newNumber || '—' },
    ],
    note: 'A deactivated number cannot be switched back on. If the new number is wrong, add it again from Add account.',
    actionLabel: 'Replace number',
    buttonClass: 'dash-modal__approve',
    cancelable: true,
  }
}

/**
 * Retire a number without replacing it. Irreversible, so the button carries the
 * danger treatment rather than the ordinary approval one.
 *
 * @param {object} options
 * @param {string} options.employeeName
 * @param {string} options.typeLabel
 * @param {string} options.accountNumber
 */
export function buildDeactivateAccountConfirm({ employeeName, typeLabel, accountNumber }) {
  const subject = employeeName
    ? `${employeeName}'s ${typeLabel} account number`
    : `This ${typeLabel} account number`
  return {
    title: 'Deactivate this account number?',
    sub: '',
    icon: 'o_block',
    tone: 'danger',
    name: subject,
    sentence: 'stops being used. It stays on record as inactive history.',
    facts: [{ label: 'Account number', value: accountNumber || '—' }],
    note: 'A deactivated number cannot be switched back on. Add a new number if this employee still needs one.',
    actionLabel: 'Deactivate',
    buttonClass: 'dash-modal__danger',
    cancelable: true,
  }
}
