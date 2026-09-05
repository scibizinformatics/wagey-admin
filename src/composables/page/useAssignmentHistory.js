import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useEmployees } from 'src/composables/page/useEmployees'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { extractErrorMessage } from 'src/composables/utils/http'
import {
  normaliseAssignmentHistory,
  scopeEntriesToRoster,
} from 'src/composables/utils/assignmentHistory'

/**
 * Shift-assignment audit trail — `GET /audit/assignment/history/`.
 *
 * One entry per saved change to somebody's shift on a day, DRF-paginated:
 * `{ count, next, previous, results: [...] }`. The row shape and every reading
 * taken from it live in `composables/utils/assignmentHistory.js`; this file is
 * only responsible for getting the rows here.
 *
 * This sits alongside `useAuditLogs.js` rather than inside it. That composable
 * covers the cross-module admin write log (`/audit/admin/logs/`) and one
 * record's attendance revisions; this endpoint is a third, differently shaped
 * resource with its own page, and folding it in would have meant a third set of
 * unrelated refs in a composable whose consumers already have to pick which
 * `logs` they mean.
 *
 * ── Why the whole set is fetched, not one server page at a time ──────────────
 * The page sorts and filters over the complete result set and slices a page out
 * of that itself. Sorting or searching a single server page would only ever
 * reorder the rows already on screen, which silently answers a different
 * question than the one asked: "newest first" over page 3 of 12 is not newest
 * first. So the pages are walked and concatenated up to `MAX_PAGES`, and when
 * that cap is reached `truncated` says so rather than letting the view imply it
 * holds everything.
 *
 * Pages are walked by incrementing `page` on the *relative* path rather than by
 * following the absolute `next` URL the server sends. `next` points at the API
 * host directly, which in development would step around the dev-server proxy
 * and fail CORS.
 *
 * ── Why the company scoping happens here rather than at the endpoint ─────────
 * The trail is asked for one company and answers with every company the caller
 * can see. The request carries the id (under both spellings this API uses), but
 * the payload has no company field at all, so there is nothing to check the
 * filter against on the way back — and in practice it is not applied. The
 * company's own employee roster is what closes that gap: a change to somebody
 * who is not on the roster happened in another workspace. `scopeEntriesToRoster`
 * applies it before normalisation, so `rows` and `totalCount` describe the
 * selected company alone. The roster comes from `useEmployees`, which caches per
 * company and de-duplicates in-flight calls, so this and the page's own avatar
 * fetch are one request. If the query parameter ever does start being honoured,
 * this second pass quietly becomes a no-op over rows that already belong here.
 */

const HISTORY_URL = '/audit/assignment/history/'

// Asked for well over DRF's default so the common case is one request. The
// server may cap it below this; the walk below does not care, it follows `next`
// until there is none.
const PAGE_SIZE = 200

// Ten pages at the requested size. A backstop against years of history pulling
// megabytes into a table nobody scrolls to the end of — not a silent one:
// `truncated` is surfaced and the page says what was left out. The cap counts
// rows as the server sends them, i.e. across every company, so the selected
// company's share of them is smaller than the number suggests.
const MAX_PAGES = 10

export function useAssignmentHistory() {
  const { companyId } = useCompany()
  const { fetchEmployees } = useEmployees()

  const rows = ref([])
  const loading = ref(false)
  const error = ref('')

  // How many changes this company has in the trail as loaded — the same number
  // as `rows` once the roster scoping applies, and the server's company-wide
  // count only when it could not. Null until a response has been seen.
  const totalCount = ref(null)
  const truncated = ref(false)

  // Whether the rows on screen were actually narrowed to the selected company.
  // False only when the roster could not be read, which is the one case where
  // another workspace's rows can still be showing; the page says so rather than
  // implying a scoping it did not get.
  const companyScoped = ref(false)

  // Responses do not arrive in the order they were sent, and this list can be
  // refetched by a company switch or a refresh landing on top of a slow first
  // load. One guard for the one piece of state published here.
  const guard = createRequestToken()

  const hasRows = computed(() => rows.value.length > 0)

  /**
   * Load the assignment trail for the company currently selected in the
   * workspace switcher.
   *
   * The company is resolved per call rather than captured when the composable
   * was created, so a switch mid-session cannot leave one workspace's history
   * on screen under another's name.
   *
   * The id is sent as a query parameter *and* the assembled rows are narrowed
   * against the company's employee roster afterwards, because the endpoint
   * answers company-wide and its payload carries nothing to verify a filter
   * against. See the module header for why that second pass exists.
   */
  async function fetchHistory() {
    const company = companyId.value
    if (!company) {
      rows.value = []
      totalCount.value = null
      truncated.value = false
      companyScoped.value = false
      error.value = 'No company selected.'
      return []
    }

    const token = guard.next()
    loading.value = true
    error.value = ''

    try {
      // Started before the page walk so the roster is in the air while the
      // pages come back, and swallowed: a roster that will not load leaves the
      // rows unscoped and flagged, rather than failing a trail that did arrive.
      const rosterRequest = fetchEmployees().catch(() => [])

      const collected = []
      let count = null
      let page = 1
      let more = true

      while (more && page <= MAX_PAGES) {
        const response = await api.get(HISTORY_URL, {
          params: {
            // Both spellings. This API is inconsistent about which one a
            // company-scoped list takes and DRF ignores the one it does not
            // read, so sending both costs nothing and means the filter lands
            // server-side if the endpoint ever grows it.
            company,
            company_id: company,
            page,
            page_size: PAGE_SIZE,
            // A hint only. DRF ignores an unknown query parameter, and the page
            // sorts the assembled set itself regardless, so an endpoint without
            // OrderingFilter still gets a correctly ordered table — it just
            // fills the cap from whichever end the server chose.
            ordering: '-updated_at',
          },
        })

        const payload = response.data
        const results = Array.isArray(payload) ? payload : (payload?.results ?? [])
        collected.push(...results)

        if (count === null && Number.isFinite(payload?.count)) count = payload.count

        // A bare array means the endpoint is not paginated at all: everything
        // already arrived, so stop rather than asking for a page 2 that would
        // hand back the same rows again.
        more = !Array.isArray(payload) && Boolean(payload?.next) && results.length > 0
        page += 1
      }

      const roster = await rosterRequest

      // A newer call has already answered; drop this one rather than letting an
      // older trail overwrite it.
      if (!guard.isCurrent(token)) return rows.value

      const { entries, scoped } = scopeEntriesToRoster(collected, roster)

      rows.value = normaliseAssignmentHistory(entries)
      companyScoped.value = scoped
      // The server's `count` is company-wide, so it stops describing what is on
      // screen the moment the rows are narrowed. Once scoped, the count *is*
      // the rows; the server's figure would only ever overstate them.
      totalCount.value = scoped ? entries.length : (count ?? collected.length)
      truncated.value = more
      return rows.value
    } catch (err) {
      if (!guard.isCurrent(token)) return rows.value

      const status = err?.response?.status
      // Permission is the one failure worth its own wording: an admin without
      // the audit role should be told they lack it, not that the trail is
      // broken. Everything else goes through the shared extractor.
      error.value =
        status === 401 || status === 403
          ? 'You do not have permission to view the assignment history.'
          : extractErrorMessage(err, 'Could not load the assignment history.')
      rows.value = []
      totalCount.value = null
      truncated.value = false
      companyScoped.value = false
      return []
    } finally {
      if (guard.isCurrent(token)) loading.value = false
    }
  }

  function clearError() {
    error.value = ''
  }

  /**
   * Drop everything and invalidate any request still in the air.
   *
   * Called on a company switch: a shift name or a person from the previous
   * workspace means nothing in the next one, and a response for the old company
   * must not be allowed to land after the reset.
   */
  function reset() {
    guard.next()
    rows.value = []
    totalCount.value = null
    truncated.value = false
    companyScoped.value = false
    error.value = ''
    loading.value = false
  }

  return {
    // state
    rows,
    hasRows,
    loading,
    error,
    totalCount,
    truncated,
    companyScoped,
    // methods
    fetchHistory,
    clearError,
    reset,
  }
}
