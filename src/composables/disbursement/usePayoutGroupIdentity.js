import { ref } from 'vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { useCompany } from 'src/composables/page/useCompany'

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
 * That left every header showing its loading shimmer forever. This walks the
 * cutoffs for the active company and finds the row, which sounds expensive and
 * is not: both calls are the same cached ones the list page already made, so
 * arriving from the list costs nothing and only a deep link or a hard refresh
 * actually hits the network.
 */
export function usePayoutGroupIdentity() {
  const { companyId } = useCompany()
  const { fetchCutoffInstances, fetchPayoutGroupInstances } = useDisbursementApi()

  /**
   * `{ name, cutoff, status, cashAdvanceStatus, cutoffId, siblings }` once
   * resolved, null until then. `siblings` is the same cutoff's other runs —
   * what the Review step's transfer picker draws its targets from.
   */
  const identity = ref(null)
  const resolving = ref(false)

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

  async function resolve(payoutGroupInstanceId) {
    const cid = companyId.value
    if (!cid || !payoutGroupInstanceId) return null

    resolving.value = true
    try {
      const raw = await fetchCutoffInstances()
      const cutoffs = Array.isArray(raw) ? raw : (raw?.results ?? [])
      if (!cutoffs.length) return null

      // Cutoffs are few and every one of these is cached, so they are asked for
      // together rather than in sequence — the run could be under any of them.
      const groups = await Promise.all(
        cutoffs.map((c) => fetchPayoutGroupInstances(cid, c.id).catch(() => null)),
      )

      // Walked per cutoff rather than flatMapped, so the cutoff the match was
      // found under — and the runs sharing it — stay attached to it. The
      // transfer picker needs both: its targets are only the other payroll
      // groups running in this same cutoff, which is what keeps a moved
      // employee on the period their payslip belongs to.
      let matchedCutoff = null
      let match = null
      let siblingRows = []
      for (let i = 0; i < cutoffs.length && !match; i++) {
        const rows = toRows(groups[i])
        const found = rows.find((row) => String(row?.id) === String(payoutGroupInstanceId))
        if (found) {
          matchedCutoff = cutoffs[i]
          match = found
          siblingRows = rows
        }
      }
      if (!match) return null

      identity.value = {
        name: match.payout_group_name || '',
        cutoff: match.cutoff_instance_name || '',
        status: match.payout_status || '',
        // The cutoff the run was found under, as an id. `cutoff` above is the
        // name the payload prints, which is not something an API can be asked
        // about again; this is.
        cutoffId: matchedCutoff?.id ?? null,
        // The other runs in this cutoff, as { instanceId, name, payrollGroupId }.
        // Carried raw enough for a caller to exclude this run by instanceId and
        // resolve each name to a master payroll group without another fetch.
        siblings: siblingRows.map((row) => ({
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
