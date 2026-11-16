/**
 * Wording for the payroll group's one decision.
 *
 * Deactivating a group is the widest thing the row menu can do to it now that
 * the delete option is gone, so it gets the shared `dash-modal--confirm` chrome
 * through `components/common/ConfirmDialog.vue` rather than a message typed
 * inline in the panel.
 *
 * The tone is `warn`, not `danger`: nothing is destroyed and the same row menu
 * can switch the group back on. A danger head here would overclaim, and a
 * confirm that overclaims is how readers learn to click through them.
 */

/**
 * Stop a payroll group from being used for processing.
 *
 * @param {object} options
 * @param {string} options.name                the group's name, quoted and bolded
 * @param {string} options.paymentMethodLabel  the resolved payment method, so the
 *   reader is not asked to recognise an id
 * @returns {{title: string, sub: string, icon: string, tone: string, name: string,
 *   sentence: string, facts: Array<{label: string, value: string}>, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
export function buildPayrollGroupDeactivateConfirm({ name, paymentMethodLabel } = {}) {
  return {
    title: 'Deactivate this payroll group?',
    sub: '',
    icon: 'o_block',
    tone: 'warn',
    name: `"${name || 'This payroll group'}"`,
    sentence: 'is deactivated and can no longer be used for a payroll run.',
    facts: [{ label: 'Payment method', value: paymentMethodLabel || '—' }],
    note: 'Its history is not affected, and you can activate it again from the row menu.',
    actionLabel: 'Deactivate',
    buttonClass: 'dash-modal__danger',
    cancelable: true,
  }
}
