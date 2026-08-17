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
  review_required: { label: 'Review required', tone: 'critical' },
  awaiting_ack: { label: 'Awaiting acknowledgment', tone: 'warn' },
  ready_for_funding: { label: 'Ready to fund', tone: 'good' },
  funded: { label: 'Funded', tone: 'info' },
  disbursing: { label: 'Disbursing', tone: 'info' },
  overdue: { label: 'Overdue \u2014 ready to fund', tone: 'critical' },
  completed: { label: 'Completed', tone: 'neutral' },
}

export function getPayoutStatus(status) {
  return PAYOUT_STATUS[status] || { label: status || '\u2014', tone: 'neutral' }
}
