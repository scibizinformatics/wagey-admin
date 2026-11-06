/**
 * The cash-advance flow's four stages.
 *
 * This is deliberately a separate sequence from the payroll run's five steps.
 * A cash advance is reviewed, funded, released and closed against a payout group
 * instance, but no endpoint returns a single "cash advance status" the way
 * `payout_status` describes a payroll run. Each step page therefore derives the
 * stage from its own payload (pending requests left, funding covered, claims
 * released) and hands it to the shell and the progress header.
 *
 * The payroll status is still useful as an opening hint: the list page has it on
 * every row already, so it can decide which step to open without a second call.
 * The pages then correct it from their own figures — the cash-advance flow can
 * lag the payroll flow, never the other way round.
 */

/** The four cash-advance steps, in order. */
export const CA_STEP_ROUTES = ['review', 'funding', 'disburse', 'complete']

/** Human labels for the same four steps, indexed like `CA_STEP_ROUTES`. */
export const CA_STEP_LABELS = ['Review', 'Funding', 'Disburse', 'Complete']

/**
 * Payroll/payout status → cash-advance stage.
 *
 * The review stage owns everything before funding, because the cash advance can
 * be decided while the payroll run is still being reviewed, its payslips are
 * being acknowledged, or a dispute is open. `ready_for_funding` is where the
 * funding step belongs, and `funded`/`disbursing` are past it.
 *
 * The map also accepts the CA status words the cash-advance endpoints use
 * (`ready_for_funding` appears in the delete response's `pgi_ca_status`), which
 * is why the keys are a superset of the payroll statuses.
 */
export const CA_STAGE_MAP = {
  // ── Review ──
  draft: 0,
  pending: 0,
  under_review: 0,
  review_required: 0,
  ready_for_payslip_release: 0,
  awaiting_acknowledgement: 0,
  awaiting_acknowledgment: 0,
  awaiting_ack: 0,
  disputed: 0,
  // `waiting_admin_approval` is the endpoint's own word for an advance that has
  // been requested and is sitting on an admin decision (`cash_advance_status`
  // on `payout-group-progress`). Review is the step that work lives on. Without
  // the key the value fell through to the *payroll* status here, which named a
  // stage of a different flow entirely.
  waiting_admin_approval: 0,

  // ── Funding ──
  ready_for_funding: 1,
  overdue: 1,
  approved: 1,

  // ── Disburse ──
  funded: 2,
  disbursing: 2,
  ready_for_disbursement: 2,
  // `ca_current_progress` on `payout-group-progress` spells the release stage
  // `disbursement` — the route key is `disburse`, this is the stage word.
  disbursement: 2,
  ready_for_release: 2,

  // ── Complete ──
  complete: 3,
  completed: 3,
}

/**
 * A status word as the map's key: `"Ready for Funding"` → `"ready_for_funding"`.
 *
 * The endpoints spell the same state both ways — the payroll payload sends
 * `ready_for_funding`, the cash-advance detail sends `"Ready for Funding"` — and
 * the badge and the stage map both need one key.
 */
export function normalizeStatusKey(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

/**
 * A stage's 0-based index, or `null` when the value is not one this flow knows.
 *
 * Accepts both the route keys (`review`, `funding`, …) and the status words the
 * endpoints send (`pending`, `Ready for Funding`, …), because callers reach here
 * from a route param, a payload's `group_status`, and the shell's derived stage.
 */
export function cashAdvanceStepIndex(status) {
  if (!status) return null
  const key = normalizeStatusKey(status)
  const routeIndex = CA_STEP_ROUTES.indexOf(key)
  if (routeIndex !== -1) return routeIndex
  return CA_STAGE_MAP[key] ?? null
}

/**
 * The step a run should open on, from the hint the list page holds.
 *
 * An unknown hint opens Review: it is the only step no cash advance can be past.
 */
export function stepRouteForCashAdvanceStatus(status) {
  const index = cashAdvanceStepIndex(status)
  return CA_STEP_ROUTES[index ?? 0]
}

/**
 * The further-along of a page's own stage and the status it was handed.
 *
 * The cash-advance work can move on without the page's payload knowing: Review
 * still sees zero pending requests after funding, and Funding still sees a fully
 * funded group after disbursement starts. The PGI row's `cash_advance_status`
 * (or the payload's `group_status`) is the fresher signal, so it advances the
 * bar instead of letting an earlier step pull it back.
 *
 * A hint the flow does not recognise is ignored, leaving the page's own stage.
 */
export function furtherCashAdvanceStage(base, status) {
  const baseIndex = cashAdvanceStepIndex(base) ?? 0
  const hintIndex = cashAdvanceStepIndex(status)
  const index = Math.max(baseIndex, hintIndex ?? baseIndex)
  return CA_STEP_ROUTES[Math.min(index, CA_STEP_ROUTES.length - 1)]
}

/**
 * The four steps as a progress header reads them.
 *
 * Cash advances have no equivalent of `payout-group-progress`, so the bar is
 * derived from one stage rather than from a per-step status array: everything
 * before the current stage is done, the current stage is in progress, and
 * everything after it is locked. That is exactly the reading the payroll header
 * draws when its progress endpoint is unavailable.
 */
export function computeCashAdvanceStepsFromStatus(status, stepDefs) {
  const index = cashAdvanceStepIndex(status) ?? 0
  return stepDefs.map((def, i) => ({
    ...def,
    state: i < index ? 'completed' : i === index ? 'current' : 'locked',
  }))
}
