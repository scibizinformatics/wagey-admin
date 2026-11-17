import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { useCompany } from 'src/composables/page/useCompany'
import { normalizeCutoffInstance } from 'src/composables/utils/leaveCutoffs'
import { defaultCutoff } from 'src/composables/utils/cutoffState'

/**
 * A run's name, cutoff and status, from its id alone.
 *
 * All five step pages put the run's name in their header, but no step endpoint
 * returns it — `review-overview`, `payslip-overview`, `payout-group-instance-*`
 * and `payout-group-completion` are all about the step's figures, not about the
 * run's identity. The name lives on the payout-group-instance rows the list page
 * reads, which are keyed by cutoff rather than by instance id, so there is no
 * single call that answers "what is run 938 called?".
 *
 * Two rules keep that from becoming "read every run in the workspace", which is
 * what this used to do: it walked every cutoff's payout groups on every step
 * page. Now the identity the list page already handed over in the query is used
 * immediately, and the lookup that remains is narrowed to one cutoff — the one
 * the query names, or the current period — before it widens at all.
 */
export function usePayoutGroupIdentity() {
  const route = useRoute()
  const { companyId } = useCompany()
  const { fetchCutoffInstances, fetchPayoutGroupInstances } = useDisbursementApi()

  /**
   * `{ name, cutoff, status, cashAdvanceStatus, cutoffId, siblings }` once
   * resolved, null until then. `siblings` is the same cutoff's other runs —
   * what the Review step's transfer picker draws its targets from.
   */
  const identity = ref(null)
  const resolving = ref(false)

  // Seeded from the query the list page hands over, so a run opened from the
  // table renders its header without waiting for any request. `resolve` below
  // is still free to correct these.
  const seeded = {
    name: String(route.query.group || '').trim(),
    cutoff: String(route.query.cutoff || '').trim(),
    status: String(route.query.pgi_status || '').trim(),
    cashAdvanceStatus: String(route.query.ca_status || '').trim(),
  }
  if (seeded.name || seeded.cutoff || seeded.status || seeded.cashAdvanceStatus) {
    identity.value = { ...seeded, cutoffId: null, siblings: [] }
  }

  /** The instance rows one `payout-group-instances` answer carries, whatever envelope it used. */
  function toRows(batch) {
    if (Array.isArray(batch)) return batch
    return batch?.results ?? batch?.data ?? []
  }

  /**
   * The master payroll-group id an instance row may carry, if it carries one.
   *
   * The rows are not documented to expose the master group — the frontend reads
   * `payout_group_name` off them — so every spelling a payload might use is
   * tried once here and the answer stays null when none is present. A null is
   * fine: the transfer picker falls back to matching the row's name against
   * `payroll-groups`, and a name held by two master groups is skipped rather
   * than guessed.
   */
  function payrollGroupIdOf(row) {
    const nested = [row?.payout_group, row?.payroll_group]
    for (const candidate of nested) {
      if (candidate && typeof candidate === 'object' && candidate.id != null) return candidate.id
    }
    return (
      row?.payroll_group_id ??
      row?.payout_group_id ??
      (typeof row?.payout_group === 'number' || typeof row?.payout_group === 'string'
        ? row.payout_group
        : null) ??
      (typeof row?.payroll_group === 'number' || typeof row?.payroll_group === 'string'
        ? row.payroll_group
        : null)
    )
  }

  /** Whether a normalized cutoff is the one the query named. */
  function matchesQueryCutoff(cutoff, wanted) {
    if (!cutoff || !wanted) return false
    const target = wanted.trim().toLowerCase()
    return [cutoff.label, cutoff.windowLabel]
      .filter(Boolean)
      .some((text) => String(text).trim().toLowerCase() === target)
  }

  /**
   * The cutoffs to ask about, in the order most likely to contain the run.
   *
   * The list page hands the run's cutoff over in the query, so the first
   * candidate is almost always a cache hit; a deep link falls back to the
   * current period before any other. Only a run outside both falls through to
   * the rest of the list.
   */
  function cutoffCandidates(cutoffs) {
    const wanted = String(route.query.cutoff || '').trim()
    const preferred = wanted ? cutoffs.find((cutoff) => matchesQueryCutoff(cutoff, wanted)) : null
    const current = defaultCutoff(cutoffs)
    const ordered = []
    for (const cutoff of [preferred, current, ...cutoffs]) {
      if (cutoff && !ordered.includes(cutoff)) ordered.push(cutoff)
    }
    return ordered
  }

  /**
   * Resolves a run's identity without reading every cutoff in the workspace.
   *
   * This used to fetch `payout-group-instances` for every cutoff at once, on
   * every step page — a workspace with years of periods paid for all of them to
   * find one row. It now stops at the first cutoff that holds the run, starting
   * with the one the query names. The per-cutoff answer is cached for five
   * minutes by `fetchPayoutGroupInstances`, so arriving from the list costs no
   * network at all.
   */
  async function resolve(payoutGroupInstanceId) {
    const cid = companyId.value
    if (!cid || !payoutGroupInstanceId) return null

    resolving.value = true
    try {
      const raw = await fetchCutoffInstances()
      const list = Array.isArray(raw) ? raw : (raw?.results ?? raw?.data ?? [])
      const cutoffs = (Array.isArray(list) ? list : [])
        .map(normalizeCutoffInstance)
        .filter((cutoff) => cutoff && cutoff.id != null)
      if (!cutoffs.length) return null

      // Walked cutoff by cutoff rather than flatMapped, so the cutoff the match
      // was found under — and the runs sharing it — stay attached to it. The
      // transfer picker needs both: its targets are only the other payroll
      // groups running in this same cutoff, which is what keeps a moved
      // employee on the period their payslip belongs to.
      for (const cutoff of cutoffCandidates(cutoffs)) {
        let rows = []
        try {
          rows = toRows(await fetchPayoutGroupInstances(cid, cutoff.id))
        } catch {
          // A cutoff this company has no runs for answers 404; that is not a
          // failure to resolve, it is the next candidate's turn.
          continue
        }

        const match = rows.find((row) => String(row?.id) === String(payoutGroupInstanceId))
        if (!match) continue

        identity.value = {
          name: match.payout_group_name || '',
          cutoff: match.cutoff_instance_name || '',
          status: match.payout_status || '',
          // The cutoff the run was found under, as an id. `cutoff` above is the
          // name the payload prints, which is not something an API can be asked
          // about again; this is.
          cutoffId: cutoff?.id ?? null,
          // The other runs in this cutoff, as { instanceId, name, payrollGroupId }.
          // Carried raw enough for a caller to exclude this run by instanceId and
          // resolve each name to a master payroll group without another fetch.
          siblings: rows.map((row) => ({
            instanceId: row?.id ?? null,
            name: row?.payout_group_name || '',
            payrollGroupId: payrollGroupIdOf(row),
          })),
          // The PGI row's own cash-advance stage. It moves independently of
          // `payout_status` — funding a cash advance does not necessarily move the
          // payroll run — so the cash-advance bars read this one first.
          cashAdvanceStatus: match.cash_advance_status || match.pgi_ca_status || '',
        }
        return identity.value
      }
      return null
    } finally {
      resolving.value = false
    }
  }

  /** Resolves in the background; a header without a name is not worth an error. */
  function resolveQuietly(payoutGroupInstanceId) {
    return resolve(payoutGroupInstanceId).catch((err) => {
      console.error('[usePayoutGroupIdentity] could not resolve run:', err)
      return null
    })
  }

  return { identity, resolving, resolve, resolveQuietly }
}
