export const PAYOUT_STATUS = {
  ready_for_funding: { label: 'Ready for Funding', color: 'green-1', textColor: 'green-9' },
  awaiting_ack: { label: 'Awaiting Acknowledgment', color: 'orange-1', textColor: 'orange-9' },
  review_required: { label: 'Review Required', color: 'red-1', textColor: 'red-9' },
  funded: { label: 'Funded', color: 'blue-1', textColor: 'blue-9' },
  disbursing: { label: 'Disbursing', color: 'purple-1', textColor: 'purple-9' },
  overdue: { label: 'Overdue \u2013 Ready for Funding', color: 'red-1', textColor: 'red-9' },
}

export function getPayoutStatus(status) {
  return PAYOUT_STATUS[status] || { label: status || '\u2014', color: 'grey-2', textColor: 'grey-8' }
}
