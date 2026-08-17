import { reactive, ref } from 'vue'
import { useCompany } from 'src/composables/page/useCompany'
import { useAdminContracts } from 'src/composables/admin/useAdminContracts'

/**
 * Resolves which payout (payroll) group an employee belongs to.
 *
 * The group lives on the employee's *active contract*, not on their schedule or
 * attendance records:
 *   /user/employee/{companyId}/{employeeId}/active-contract/ -> payroll_group_id
 *
 * Deliberately not the disbursement API: every payout-group endpoint there is
 * keyed by payoutGroupInstanceId — a payout group inside one cutoff — and its
 * responses identify employees by name rather than id. Schedule weeks and
 * attendance dates need not sit inside any cutoff.
 *
 * Deliberately not the contracts *list* endpoint either: it returns every
 * contract an employee has ever held, so picking one means guessing which is
 * current. `fetchActiveContract` answers that question server-side.
 *
 * The cache is module-level and keyed by company, so the Schedule and Attendance
 * pages share resolutions — filtering by group on one page leaves the other
 * warm. In-flight requests are de-duplicated, matching the caching shape
 * useEmployees already uses.
 */

/** { [companyId]: { [employeeId]: groupId | null } } — reactive for computeds. */
const cacheByCompany = reactive({})

/** { [companyId]: { [employeeId]: Promise } } — plain, never rendered. */
const inflight = {}

export function useEmployeePayoutGroup() {
  const { companyId } = useCompany()
  const { fetchActiveContract } = useAdminContracts()

  const resolving = ref(false)

  const bucketFor = (cid) => {
    if (!cacheByCompany[cid]) cacheByCompany[cid] = {}
    return cacheByCompany[cid]
  }

  const normalise = (candidate) => {
    if (candidate === null || candidate === undefined) return null
    // `payroll_group` can arrive as { id, name } rather than a bare id.
    return typeof candidate === 'object' ? (candidate.id ?? null) : candidate
  }

  /**
   * Group already present on a record, when the payload happens to carry one.
   * Costs nothing and skips the request entirely — so if the backend ever adds
   * the field to its list responses, this becomes the only path used.
   */
  function inlineGroupId(record) {
    if (!record) return null
    const employee = record.employee && typeof record.employee === 'object' ? record.employee : record
    return normalise(
      employee.payroll_group_id ??
        employee.payroll_group ??
        employee.payrollGroupId ??
        record.payroll_group_id ??
        record.payroll_group ??
        null,
    )
  }

  function groupIdFromContract(contract) {
    if (!contract) return null
    // active-contract returns one object; tolerate a wrapped list too.
    const record = Array.isArray(contract) ? contract[0] : contract
    if (!record) return null
    return normalise(record.payroll_group_id ?? record.payroll_group ?? null)
  }

  /** Cached group for an employee, or null when unknown / not yet resolved. */
  function groupIdFor(employeeId) {
    const cid = companyId.value
    if (!cid || !employeeId) return null
    return cacheByCompany[cid]?.[employeeId] ?? null
  }

  /** True once we have an answer — including a definitive "no group". */
  function isResolved(employeeId) {
    const cid = companyId.value
    return cid ? cacheByCompany[cid]?.[employeeId] !== undefined : false
  }

  /**
   * Fill the cache for the given employee ids. Batched, because a roster of 200
   * is 200 contract requests; call it lazily — only when a group filter is
   * actually in use — so pages that never filter never pay for it.
   */
  async function ensure(employeeIds = [], concurrency = 20) {
    const cid = companyId.value
    if (!cid) return

    const bucket = bucketFor(cid)
    if (!inflight[cid]) inflight[cid] = {}

    const pending = [...new Set(employeeIds.filter(Boolean))].filter(
      (id) => bucket[id] === undefined && !inflight[cid][id],
    )
    if (!pending.length) return

    resolving.value = true
    try {
      for (let i = 0; i < pending.length; i += concurrency) {
        const batch = pending.slice(i, i + concurrency)

        await Promise.all(
          batch.map((id) => {
            // fetchActiveContract already resolves to null on a 404 (no active
            // contract), so this catch only covers transport failures.
            const req = Promise.resolve(fetchActiveContract(id))
              .then((data) => groupIdFromContract(data))
              .catch(() => null)
              .then((groupId) => {
                bucket[id] = groupId
                delete inflight[cid][id]
              })
            inflight[cid][id] = req
            return req
          }),
        )
      }
    } finally {
      resolving.value = false
    }
  }

  /** Drop a company's cache — after contract changes, say. */
  function invalidate(cid = companyId.value) {
    if (cid && cacheByCompany[cid]) delete cacheByCompany[cid]
  }

  return { resolving, groupIdFor, isResolved, inlineGroupId, ensure, invalidate }
}
