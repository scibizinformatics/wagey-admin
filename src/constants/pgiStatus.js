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

/** Human labels for the same five steps, indexed like `PGI_STEP_ROUTES`. */
export const PGI_STEP_LABELS = ['Review', 'Payslips', 'Funding', 'Disbursement', 'Complete']

/**
 * Where a run's status places it, as a 0-based index into `PGI_STEP_ROUTES`, or
 * `null` when the status is not one this app knows how to place.
 *
 * `currentStep` is already that index, except for a finished run where it is 5 —
 * one past the last page — so it is clamped here the same way the route lookup
 * clamps it. A step page compares its own index against this to tell whether the
 * run has moved on without repeating the clamp or re-deriving the map.
 */
export function currentStepIndexForPgiStatus(pgiStatus) {
  const mapping = PGI_STATUS_MAP[pgiStatus]
  if (!mapping) return null
  return Math.min(Math.max(mapping.currentStep, 0), PGI_STEP_ROUTES.length - 1)
}

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
  const index = currentStepIndexForPgiStatus(pgiStatus)
  return PGI_STEP_ROUTES[index ?? 0]
}

/**
 * Whether a payout group has finished the whole five-step flow.
 *
 * Read off the map rather than listed by hand: "complete" is whatever sits at or
 * past the last step, so adding a sixth step moves this with it instead of leaving
 * a hand-written pair of statuses behind. `complete` and `completed` are both
 * mapped to `currentStep: 5` today, which is why both of them finish.
 *
 * This is the same reading `PayoutProgressStepper` draws — the bar says "all steps
 * done" exactly when the status satisfies this — so a list filtered by it and a
 * progress bar showing it cannot disagree about what finished.
 *
 * @param {string} pgiStatus
 * @returns {boolean}
 */
export function isCompletePgiStatus(pgiStatus) {
  const mapping = PGI_STATUS_MAP[pgiStatus]
  return Boolean(mapping) && mapping.currentStep >= PGI_STEP_ROUTES.length
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
