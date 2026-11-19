import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, extractErrorMessage } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'
import {
  buildEmploymentStatusIndex,
  normaliseEmploymentStatus,
  sortEmploymentStatuses,
  unwrapEmploymentStatusList,
} from 'src/composables/utils/employmentStatuses'

/**
 * The company's employment statuses — the list behind the Employees row menu's
 * Cancel action, the labels the employee list prints, and a single-record read
 * for the employee's current one.
 *
 * `GET /user/companies/{company_id}/employment-statuses/` answers every status
 * the company has, retired ones included, in one request. The page keeps both
 * readings of that answer:
 *
 *   - `statuses` is the selectable subset, and is what the Cancel dialog offers.
 *     Retired rows (`is_selectable: false`) are not choices: the write endpoint
 *     answers "This employment status is not selectable.", so they are dropped
 *     here rather than offered and refused.
 *   - `allStatuses` / `statusLookup` keep the retired rows too, because an
 *     employee still sitting on one must keep reading that status's name and
 *     category instead of falling back to "Active". The lookup is indexed by id,
 *     code and name — see `buildEmploymentStatusIndex`.
 *
 * The flag is read as `false`-only — a row carrying no flag at all is selectable,
 * which is the same reading the overtime category list needed.
 *
 * `GET …/employment-statuses/{id}/` is the only authoritative way to label the
 * status an employee is on when the row carries that status as a pk (see
 * `employmentStatusIdOf`). It is deliberately **not cached**: it is one small
 * read per dialog open, and a label left over from before another admin moved
 * the employee is exactly the wrong thing to show before a write.
 *
 * The list is cached per company: statuses are changed in Admin Settings, not
 * while someone is walking the employee list, so a five-minute entry keeps the
 * page from costing a request on every visit. `force` is for a caller that has
 * just changed one; Admin settings also calls `invalidateEmploymentStatusCache`
 * after its own writes.
 */
const cacheByCompany = {}
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Drop a company's cached statuses — or every company's, when no id is given.
 *
 * Writers in Admin settings call this after a create, edit, default change or
 * retirement so the Employees row menu picks the change up immediately instead
 * of serving a five-minute-old list. The cache is module-level because the
 * settings page and the employee list are different route components and are
 * never mounted at once.
 */
export function invalidateEmploymentStatusCache(companyId) {
  if (companyId == null || companyId === '') {
    for (const key of Object.keys(cacheByCompany)) delete cacheByCompany[key]
    return
  }
  delete cacheByCompany[companyId]
}

export function useEmploymentStatuses() {
  const toast = useToast()
  const { companyId } = useCompany()

  const statuses = ref([])
  const allStatuses = ref([])
  const loading = ref(false)

  /**
   * Id/code/name index over every status, retired included. Rebuilt whenever the
   * list lands, so the employee table re-renders its chips and labels once
   * instead of resolving each row separately.
   */
  const statusLookup = computed(() => buildEmploymentStatusIndex(allStatuses.value))

  function applyList(all) {
    const sorted = sortEmploymentStatuses(all)
    allStatuses.value = sorted
    statuses.value = sorted.filter((status) => status.isSelectable)
  }

  async function fetchEmploymentStatuses({ force = false } = {}) {
    const cid = companyId.value
    if (!cid) {
      statuses.value = []
      allStatuses.value = []
      return []
    }

    const cached = cacheByCompany[cid]
    if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      applyList(cached.all)
      return statuses.value
    }

    loading.value = true
    try {
      // No `is_selectable` filter: the retired rows are needed to label employees
      // still sitting on one. The selectable subset is derived above.
      const response = await api.get(`${BASE}/user/companies/${cid}/employment-statuses/`)
      const rows = unwrapEmploymentStatusList(response.data)
      const all = rows.map(normaliseEmploymentStatus)
      cacheByCompany[cid] = { all, timestamp: Date.now() }
      applyList(all)
      return statuses.value
    } catch (error) {
      console.error('Error fetching employment statuses:', error)
      toast.error(extractErrorMessage(error, 'Failed to load employment statuses'))
      statuses.value = []
      allStatuses.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * One status by pk — the employee's current one.
   *
   * Answers `null` rather than raising: it only feeds the dialog's "currently
   * reads …" sentence, which already has `employmentStatusLabelOf` to fall back
   * on, so a 404 (a status retired out from under the row, or a hard-deleted
   * company) is an answer and not something to interrupt the reader with.
   * `expectedStatuses` keeps the interceptor's error log quiet for that case; the
   * rejection still lands here, where 404 is read as "nothing to show".
   */
  async function fetchEmploymentStatus(id) {
    const cid = companyId.value
    if (!cid || id == null) return null

    try {
      const response = await api.get(`${BASE}/user/companies/${cid}/employment-statuses/${id}/`, {
        expectedStatuses: [404],
      })
      return normaliseEmploymentStatus(response.data?.data ?? response.data)
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error('[useEmploymentStatuses] status ✖ error', error)
      }
      return null
    }
  }

  return {
    statuses,
    allStatuses,
    statusLookup,
    loading,
    fetchEmploymentStatuses,
    fetchEmploymentStatus,
  }
}
