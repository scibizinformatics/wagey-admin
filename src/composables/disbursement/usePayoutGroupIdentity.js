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

  /** `{ name, cutoff, status }` once resolved, null until then. */
  const identity = ref(null)
  const resolving = ref(false)

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
      const match = groups
        .flatMap((g) => (Array.isArray(g) ? g : (g?.results ?? [])))
        .find((row) => String(row?.id) === String(payoutGroupInstanceId))
      if (!match) return null

      identity.value = {
        name: match.payout_group_name || '',
        cutoff: match.cutoff_instance_name || '',
        status: match.payout_status || '',
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
