/**
 * Payout-group statuses.
 *
 * `tone` names a chip modifier from the design system (src/css/dashboard.scss)
 * rather than a Quasar palette pair. The old `color: 'green-1'` /
 * `textColor: 'green-9'` values came from Quasar's stock palette, which is not
 * the app's \u2014 so these badges were the one place still rendering in colours
 * nothing else used.
 *
 * Labels are sentence case, matching every other status chip in the app.
 */
export const PAYOUT_STATUS = {
  draft: { label: 'Draft', tone: 'neutral' },
  under_review: { label: 'Under review', tone: 'info' },
  review_required: { label: 'Review required', tone: 'critical' },
  ready_for_payslip_release: { label: 'Ready to release payslips', tone: 'warn' },
  awaiting_ack: { label: 'Awaiting acknowledgment', tone: 'warn' },
  // The API spells this one out in full; both spellings reach this map.
  awaiting_acknowledgement: { label: 'Awaiting acknowledgment', tone: 'warn' },
  disputed: { label: 'Disputed', tone: 'critical' },
  complete: { label: 'Completed', tone: 'neutral' },
  ready_for_funding: { label: 'Ready to fund', tone: 'good' },
  funded: { label: 'Funded', tone: 'info' },
  disbursing: { label: 'Disbursing', tone: 'info' },
  overdue: { label: 'Overdue \u2014 ready to fund', tone: 'critical' },
  completed: { label: 'Completed', tone: 'neutral' },
}

export function getPayoutStatus(status) {
  const known = PAYOUT_STATUS[status]
  if (known) return known
  // An unmapped status is still shown, but as words rather than as the raw
  // `ready_for_payslip_release` the API sends: the badge sits in a page header,
  // where snake_case reads as a leaked field name.
  const words = String(status || '')
    .replace(/_/g, ' ')
    .trim()
  if (!words) return { label: '\u2014', tone: 'neutral' }
  return { label: words.charAt(0).toUpperCase() + words.slice(1), tone: 'neutral' }
}
