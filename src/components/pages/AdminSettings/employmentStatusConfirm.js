/**
 * The wording behind the Employment statuses panel's retire confirmation.
 *
 * Retiring is not deleting, and the copy has to say so: the row stays, its
 * `employee_count` stays, and employees already on it keep it. A
 * `buildDeleteConfirm` object would claim the opposite ("is removed and cannot
 * be undone"), which is exactly the kind of overclaim that teaches people to
 * click through confirms.
 *
 * The shape matches `holidayConfirm.js` / `payrollGroupConfirm.js` — the same
 * contract `components/common/ConfirmDialog.vue` renders without a slot.
 */

import { categoryLabel, employeeCountLabel } from '@/composables/utils/employmentStatuses'

const facts = (...pairs) =>
  pairs
    .filter((pair) => Array.isArray(pair))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value }))

/**
 * @param {object} status - a normalized row from `normaliseEmploymentStatus`
 * @returns {{title: string, sub: string, icon: string, tone: string, name: string,
 *   sentence: string, facts: Array<{label: string, value: string}>, note: string,
 *   actionLabel: string, buttonClass: string, cancelable: boolean}}
 */
export function buildEmploymentStatusRetireConfirm(status) {
  return {
    title: 'Retire this employment status?',
    sub: '',
    icon: 'o_block',
    // `warn`, not `danger`: nothing is destroyed, and the same row can be made
    // selectable again from its menu. A danger head would overstate the cost.
    tone: 'warn',
    name: `"${status?.name || 'This employment status'}"`,
    sentence: 'can no longer be assigned to employees.',
    facts: facts(
      ['Category', categoryLabel(status?.category)],
      ['Code', status?.code],
      [
        'Employees on it',
        status?.employeeCount == null ? null : employeeCountLabel(status.employeeCount),
      ],
    ),
    note: 'Employees already on this status keep it. You can make it selectable again from its row menu.',
    actionLabel: 'Retire status',
    buttonClass: 'dash-modal__approve',
    cancelable: true,
  }
}
