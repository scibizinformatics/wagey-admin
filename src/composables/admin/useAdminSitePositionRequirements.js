import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { useAdminPositions } from 'src/composables/admin/useAdminPositions'
import {
  normalizeRequirements,
  summarizeRequirements,
  todayIso,
} from 'src/composables/utils/positionRequirements'

/**
 * Per-site position requirements — "this site needs N of this position".
 *
 *   GET  /organization/sites/{site_id}/position-requirements/
 *   POST /organization/sites/{site_id}/position-requirements/
 *        body: { site, position_id, quantity_needed }
 *
 * The endpoint is site-scoped by path and has no list-across-sites form, so the
 * Sites table's summary column costs one request per site. They are issued
 * together and the whole batch is written under a single request token: the
 * workspace switcher can settle after the panel is built, and a slower batch
 * for the previous company must not land on top of a newer one. Company scoping
 * is resolved per call rather than captured at setup, for the same reason —
 * and the cache is dropped outright when the company changes, since site ids
 * from the previous workspace mean nothing in the next one.
 *
 * Position *names* come from the company's positions list, which the requirement
 * rows do not carry (see `composables/utils/positionRequirements.js`). They are
 * fetched once here and shared by the column and the dialog so both resolve an
 * id the same way.
 */
export function useAdminSitePositionRequirements() {
  const { companyId } = useCompany()
  const toast = useToast()
  const { positions, loading: loadingPositions, fetchPositions } = useAdminPositions()

  /** siteId → normalized requirement rows. Absent means "not loaded". */
  const bySite = ref({})

  const loadingSummary = ref(false)
  const loadingSite = ref(false)
  const saving = ref(false)

  // Only the newest batch may write to `bySite`.
  let latestBatch = 0

  watch(companyId, () => {
    latestBatch += 1
    bySite.value = {}
  })

  function url(siteId) {
    return `/organization/sites/${siteId}/position-requirements/`
  }

  /** The company's positions, fetched at most once per mount. */
  async function ensurePositions() {
    if (positions.value.length) return positions.value
    return fetchPositions()
  }

  /**
   * One site's requirements, normalized. Returns the rows and caches them.
   * Callers that need names resolved should `await ensurePositions()` first —
   * `fetchAll` and the dialog both do.
   */
  async function fetchForSite(siteId, { silent = false } = {}) {
    if (!companyId.value || siteId == null) return []
    if (!silent) loadingSite.value = true
    try {
      const response = await api.get(url(siteId))
      const raw = response.data?.data ?? response.data ?? []
      const rows = normalizeRequirements(raw, positions.value, todayIso())
      bySite.value = { ...bySite.value, [siteId]: rows }
      return rows
    } catch (error) {
      console.error(`Error fetching position requirements for site ${siteId}:`, error)
      if (!silent) {
        toast.error(extractErrorMessage(error, 'Failed to load position requirements'))
      }
      return []
    } finally {
      if (!silent) loadingSite.value = false
    }
  }

  /**
   * Every site's requirements, for the table column.
   *
   * A site that fails is left out of the cache rather than cached as empty —
   * "we could not ask" and "no requirements set" are different answers, and the
   * column prints them differently. Failures stay quiet: one toast per site
   * would bury the page under a column of identical cards.
   */
  async function fetchAll(siteIds = []) {
    const ids = siteIds.filter((id) => id != null)
    if (!companyId.value || !ids.length) {
      bySite.value = {}
      return {}
    }

    const batch = ++latestBatch
    loadingSummary.value = true
    try {
      await ensurePositions()
      if (batch !== latestBatch) return bySite.value

      const results = await Promise.all(
        ids.map((id) =>
          api
            .get(url(id))
            .then((response) => ({ id, raw: response.data?.data ?? response.data ?? [] }))
            .catch((error) => {
              console.error(`Error fetching position requirements for site ${id}:`, error)
              return null
            }),
        ),
      )
      if (batch !== latestBatch) return bySite.value

      const today = todayIso()
      const next = {}
      for (const result of results) {
        if (!result) continue
        next[result.id] = normalizeRequirements(result.raw, positions.value, today)
      }
      bySite.value = next
      return next
    } finally {
      if (batch === latestBatch) loadingSummary.value = false
    }
  }

  /** The summary the table column renders. `null` when the site never loaded. */
  function summaryFor(siteId) {
    const rows = bySite.value[siteId]
    if (!rows) return null
    return summarizeRequirements(rows)
  }

  /**
   * Add a requirement. The API assigns the effective window and active flag, so
   * the body carries only the three fields it accepts.
   */
  async function createRequirement({ siteId, positionId, quantityNeeded }) {
    if (!siteId) {
      toast.error('No site selected')
      return false
    }
    if (!positionId) {
      toast.error('Pick a position')
      return false
    }
    const quantity = Number(quantityNeeded)
    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error('Headcount must be a whole number of 1 or more')
      return false
    }

    saving.value = true
    try {
      await api.post(url(siteId), {
        site: Number(siteId),
        position_id: Number(positionId),
        quantity_needed: quantity,
      })
      toast.success('Position requirement added')
      await fetchForSite(siteId)
      return true
    } catch (error) {
      console.error('Error creating position requirement:', error)
      toast.error(extractErrorMessage(error, 'Failed to add position requirement'))
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    bySite,
    positions,
    loadingPositions,
    loadingSummary,
    loadingSite,
    saving,
    ensurePositions,
    fetchForSite,
    fetchAll,
    summaryFor,
    createRequirement,
  }
}
