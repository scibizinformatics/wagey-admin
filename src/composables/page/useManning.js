import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { extractErrorMessage } from 'src/composables/utils/http'
import { normalizeManning, sumManning } from 'src/composables/utils/manning'

/**
 * Site manning for one day — `GET /organization/sites/manning/{company_id}/`.
 *
 * The endpoint takes the company in the path and the day as a `date` query
 * param, and returns `{ company_id, date, site_manning: [...] }`. Rows are a
 * site + position pair; see `composables/utils/manning.js` for the shape and
 * for every derived reading, which lives there so the table, the card list and
 * the summary tiles cannot disagree about the same figures.
 *
 * Company scoping is resolved on each request rather than captured when the
 * composable is created: the workspace switcher can settle after a page is
 * built, and an id read once at setup is how a page ends up fetching for the
 * wrong workspace. The response is then checked against the id we asked for
 * before it is rendered, because the company is part of the URL and a mismatch
 * means we are looking at somebody else's board.
 */

/** Today, in the browser's own calendar — not UTC, which is a day off past 4pm here. */
export function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Ids cross the wire as numbers in this payload and as strings in others. */
function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

export function useManning() {
  const { companyId } = useCompany()

  /** The day on the board. Owned here so the fetch and the header agree on it. */
  const date = ref(todayIso())

  const rows = ref([])
  const loading = ref(false)
  const error = ref('')

  /** What the server actually answered for, which is what the header should say. */
  const servedDate = ref('')

  // Date navigation fires faster than the requests come back, so a slower
  // earlier response must not land on top of a newer one. Only the latest token
  // is allowed to write to state.
  let latestRequest = 0

  const totals = computed(() => sumManning(rows.value))

  /** Whether any position on the board carries a headcount requirement. */
  const hasRequirements = computed(() => rows.value.some((row) => row.hasRequirement))

  /** Every site on the board, in the order the backend listed them — for the
   *  toolbar filter. A Set rather than a sort: the API already returns sites
   *  grouped, and re-sorting them alphabetically would put the filter list in a
   *  different order from the table. */
  const siteNames = computed(() => Array.from(new Set(rows.value.map((row) => row.site))))

  /**
   * Load the board for a day.
   *
   * @param {string} [targetDate] ISO day; defaults to the current `date`.
   * @returns {Promise<Array>} the normalised rows, or [] on failure.
   */
  async function fetchManning(targetDate) {
    const day = targetDate || date.value || todayIso()
    date.value = day

    const company = companyId.value
    if (!company) {
      rows.value = []
      servedDate.value = ''
      // Stated rather than silently empty: no workspace selected is a different
      // situation from a site with nobody on it, and the page says so.
      error.value = 'No company selected. Pick a workspace to see its manning.'
      return []
    }

    const token = ++latestRequest
    loading.value = true
    error.value = ''

    try {
      const response = await api.get(`/organization/sites/manning/${company}/`, {
        params: { date: day },
      })
      if (token !== latestRequest) return rows.value

      const payload = response.data?.data ?? response.data ?? {}

      // The company is in the path, so a mismatch is not a filter that was
      // ignored — it is the wrong board, and showing it would be worse than
      // showing nothing.
      if (payload?.company_id != null && !sameId(payload.company_id, company)) {
        rows.value = []
        servedDate.value = ''
        error.value = 'The server answered for a different company. Reload and try again.'
        return []
      }

      rows.value = normalizeManning(payload)
      servedDate.value = payload?.date || day
      return rows.value
    } catch (err) {
      if (token !== latestRequest) return rows.value
      rows.value = []
      servedDate.value = ''
      error.value = extractErrorMessage(err, 'Failed to load site manning')
      return []
    } finally {
      if (token === latestRequest) loading.value = false
    }
  }

  /** Move the board by whole days. Past and future are both allowed: the board
   *  is as useful for checking tomorrow's coverage as yesterday's. */
  function shiftDay(days) {
    const [y, m, d] = String(date.value).split('-').map(Number)
    // Built from parts rather than `new Date(string)`, which reads a bare date
    // as UTC midnight and lands on the previous day in western timezones.
    const moved = new Date(y, (m || 1) - 1, d || 1)
    moved.setDate(moved.getDate() + days)
    return fetchManning(
      `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, '0')}-${String(moved.getDate()).padStart(2, '0')}`,
    )
  }

  function goToPreviousDay() {
    return shiftDay(-1)
  }

  function goToNextDay() {
    return shiftDay(1)
  }

  function goToToday() {
    return fetchManning(todayIso())
  }

  function clearError() {
    error.value = ''
  }

  /** Drop everything held for the previous workspace. Site and position names
   *  from one company mean nothing in the next one. */
  function reset() {
    latestRequest += 1
    rows.value = []
    servedDate.value = ''
    error.value = ''
    loading.value = false
  }

  return {
    // state
    date,
    servedDate,
    rows,
    totals,
    hasRequirements,
    siteNames,
    loading,
    error,
    // methods
    fetchManning,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    clearError,
    reset,
  }
}
