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

/** The five step pages, in order, as they appear under /app/payroll. */
export const PGI_STEP_ROUTES = ['review', 'payslips', 'funding', 'disburse', 'complete']

/**
 * The step a run should open on — where the work actually is, not where the flow
 * begins. Opening every run on Review meant a run halfway through its payslips
 * landed on a step it had already finished, and the person had to read the
 * progress bar and click again to get where the row had just told them it was.
 *
 * An unknown status opens Review: the first step is the safe guess, since it is
 * the only one no run can be past.
 */
export function stepRouteForPgiStatus(pgiStatus) {
  const mapping = PGI_STATUS_MAP[pgiStatus]
  if (!mapping) return PGI_STEP_ROUTES[0]
  // `complete` maps to a current step of 5 — one past the last page — because a
  // finished run has no step in progress.
  const index = Math.min(Math.max(mapping.currentStep, 0), PGI_STEP_ROUTES.length - 1)
  return PGI_STEP_ROUTES[index]
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
