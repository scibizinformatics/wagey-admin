export const PGI_STATUS_MAP = {
  draft:                     { completedUpTo: -1, currentStep: 0 },
  under_review:              { completedUpTo: -1, currentStep: 0 },
  review_required:           { completedUpTo: -1, currentStep: 0 },
  ready_for_payslip_release: { completedUpTo: 0, currentStep: 1 },
  awaiting_acknowledgement:  { completedUpTo: 0, currentStep: 1 },
  awaiting_ack:              { completedUpTo: 0, currentStep: 1 },
  disputed:                  { completedUpTo: 0, currentStep: 1 },
  ready_for_funding:         { completedUpTo: 1, currentStep: 2 },
  funded:                    { completedUpTo: 2, currentStep: 3 },
  disbursing:                { completedUpTo: 3, currentStep: 4 },
  complete:                  { completedUpTo: 4, currentStep: 5 },
  completed:                 { completedUpTo: 4, currentStep: 5 },
  overdue:                   { completedUpTo: 1, currentStep: 2 },
}

export function computeStepsFromPgiStatus(pgiStatus, stepDefs) {
  const mapping = PGI_STATUS_MAP[pgiStatus]
  if (!mapping) return null
  return stepDefs.map((def, i) => {
    let state
    if (i <= mapping.completedUpTo) state = 'completed'
    else if (i === mapping.currentStep) state = 'in_progress'
    else state = 'locked'
    return { ...def, state }
  })
}
