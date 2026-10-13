/**
 * Which stage of the payroll pipeline a payout group is sitting at, and how many
 * are at each.
 *
 * The Current Cutoff tab's stage rail and the badge in its table are two readers
 * of the same answer, and they must not each work it out — a rail that counts one
 * thing and a table that filters another is how a reader concludes the tab is
 * broken. Both read `countCutoffStages` / `normalizeCutoffStage` from here.
 *
 * ── Why the mapping exists ───────────────────────────────────────────────────
 *
 * There are two status vocabularies in this codebase and they do not overlap.
 * The payout-group side (`constants/payoutStatus.js`, `constants/pgiStatus.js`,
 * and every `payout_status` the API sends) spells its states `review_required`,
 * `awaiting_acknowledgement`, `ready_for_payslip_release`, `overdue`. The stage
 * rail spells its segments `needs_attention`, `awaiting_acknowledgment`,
 * `ready_for_funding` — and the two acknowledgment spellings differ by a single
 * letter, British against American.
 *
 * The rail rendered a segment only on an exact key match, so most real statuses
 * matched nothing, every segment counted zero, and the whole pipeline fell
 * through to its empty state: "No open payout groups — every group in this cutoff
 * has cleared the pipeline." That message is the opposite of the truth, and it is
 * the failure this module exists to prevent.
 *
 * The mapping follows `PGI_STATUS_MAP`, which is where the app has already
 * recorded how the backend's states relate to the payroll steps. Anything it does
 * not cover is reported rather than guessed at, so a new backend status shows up
 * in the console instead of silently disappearing from the rail.
 */

/**
 * The stages, in the order payroll actually moves through them.
 *
 * Left to right is the direction of travel, so a wide early segment is the
 * bottleneck and a rail weighted to the right is a cutoff about to close.
 */
export const CUTOFF_STAGES = [
  'needs_attention',
  'under_review',
  'awaiting_acknowledgment',
  'ready_for_funding',
  'funded',
  'disbursing',
  'complete',
]

/**
 * Every spelling the app knows of, mapped onto a stage.
 *
 * The keys are normalised before lookup (lowercased, spaces and hyphens become
 * underscores), so only genuinely different words need listing.
 */
const STAGE_ALIASES = {
  // A stage name in its own right — the rail's vocabulary passes straight through.
  needs_attention: 'needs_attention',
  under_review: 'under_review',
  awaiting_acknowledgment: 'awaiting_acknowledgment',
  ready_for_funding: 'ready_for_funding',
  funded: 'funded',
  disbursing: 'disbursing',
  complete: 'complete',

  // `constants/payoutStatus.js` / the API's `payout_status`.
  //
  // `review_required` and `disputed` are the two states the backend calls out as
  // blocking, and `PGI_STATUS_MAP` places both at the very start of the flow, so
  // both belong to the first stage rather than being invented into one of their
  // own. `draft` is likewise step zero in that map — work not started — which is
  // what "under review" means as a place to send it.
  review_required: 'needs_attention',
  disputed: 'needs_attention',
  draft: 'under_review',

  // Payslips released, people have not yet acknowledged them. `PGI_STATUS_MAP`
  // puts `ready_for_payslip_release` and both acknowledgment spellings on the
  // same step (1), so they are the same place in this pipeline: waiting on people.
  ready_for_payslip_release: 'awaiting_acknowledgment',
  awaiting_ack: 'awaiting_acknowledgment',
  // British spelling, which is the one the API sends and the one every Disbursement
  // reader already handles. The rail's own key is American. One letter apart.
  awaiting_acknowledgement: 'awaiting_acknowledgment',

  // Labelled "Overdue — ready to fund" by `PAYOUT_STATUS`, and mapped to the
  // funding step by `PGI_STATUS_MAP`. Money is owed and can go in now.
  overdue: 'ready_for_funding',

  // `PAYOUT_STATUS` and `PGI_STATUS_MAP` both carry both spellings; the rail's key
  // is the short one.
  completed: 'complete',
}

/** Reduce a status to the form `STAGE_ALIASES` is keyed by. */
function normalizeKey(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

/**
 * The stage a status belongs to, or null when the app does not know it.
 *
 * Null rather than a guess. Every value here moves work on this tab, and a stage
 * invented for a status nobody has seen would put a payout group somewhere it is
 * not — worse than reporting that its status is unrecognised, which is what the
 * caller does with a null.
 *
 * @param {unknown} status
 * @returns {string|null}
 */
export function normalizeCutoffStage(status) {
  return STAGE_ALIASES[normalizeKey(status)] ?? null
}

/**
 * Finds the payload inside whatever envelope the API wrapped it in.
 *
 * The envelopes in use across this app are not uniform — `{ data: [...] }`,
 * `{ results: [...] }`, a bare array — and a wrapped payload read as a bare one
 * looks exactly like an endpoint that answered with nothing.
 */
function unwrapStages(payload) {
  if (!payload || typeof payload !== 'object') return payload
  if (Array.isArray(payload)) return payload
  for (const key of ['data', 'results', 'cutoffs', 'payout_groups', 'stages', 'counts']) {
    const inner = payload[key]
    if (Array.isArray(inner) || (inner && typeof inner === 'object')) return inner
  }
  return payload
}

/**
 * How many payout groups sit at each stage.
 *
 * Accepts every shape this endpoint has been read as, because none of them is
 * contracted anywhere in the repo and the panel has to work rather than render an
 * empty state over a populated response:
 *
 *   - a list of payout groups, one per row → counted one each;
 *   - a list of `{ status, count }` → counted by the number given;
 *   - a dictionary of `{ status: count }` → taken as the counts themselves.
 *
 * Statuses are run through `normalizeCutoffStage`, so the result is keyed by
 * `CUTOFF_STAGES` whatever spelling arrived.
 *
 * Unrecognised statuses are counted separately and returned rather than dropped.
 * Dropping them is the bug this module exists to fix, and a pipeline that quietly
 * omits a stage reads as a pipeline with nothing stuck in it.
 *
 * @param {object|Array} payload the response body.
 * @returns {{counts: Record<string, number>, unknown: Record<string, number>, total: number}}
 */
export function countCutoffStages(payload) {
  const body = unwrapStages(payload)
  const counts = {}
  const unknown = {}

  const add = (raw, amount) => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return

    const stage = normalizeCutoffStage(raw)
    if (stage) {
      counts[stage] = (counts[stage] ?? 0) + value
      return
    }
    // Keyed on the literal so the console names what actually arrived, rather than
    // a normalised form the reader cannot grep the backend for.
    const key = String(raw ?? '').trim() || '(no status)'
    unknown[key] = (unknown[key] ?? 0) + value
  }

  if (Array.isArray(body)) {
    for (const row of body) {
      if (row && typeof row === 'object') {
        const raw = row.status ?? row.payout_status ?? row.funding_status ?? row.stage
        // One row is one group unless the row says it stands for several.
        add(raw, row.count ?? row.total ?? 1)
      } else {
        add(row, 1)
      }
    }
  } else if (body && typeof body === 'object') {
    for (const [key, value] of Object.entries(body)) add(key, value)
  }

  const total = Object.values(counts).reduce((acc, n) => acc + n, 0)
  return { counts, unknown, total }
}
