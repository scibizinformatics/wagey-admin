import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { BASE } from 'src/composables/utils/http'
import { rowMatchesEmployee } from 'src/composables/utils/attendance'

// ── Month cache ──────────────────────────────────────────────────────────────
// The endpoint is keyed by year/month and always answers with a whole month, so
// the same month is asked for over and over: stepping a day at a time, and —
// worse — every time a date range is redrawn, since a span is assembled from one
// request per calendar month it touches. Widening a range by a week re-fetched
// months that were already on screen. Cached responses make that instant, and
// overlapping spans only pay for the months they add.
//
// Keyed by company as well as month so switching workspace cannot serve another
// company's attendance, and by the query params so a cost-centre-filtered month
// is never mistaken for the unfiltered one.
const monthCache = new Map()
// Concurrent callers for the same month share one request rather than racing.
// Range mode leans on this: two spans that overlap, or a re-render mid-fetch,
// would otherwise issue the same month twice.
const inflight = new Map()

const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes
// Enough for a year of browsing either side of today. `Map` iterates in
// insertion order and reads re-insert, so trimming the front evicts the
// least-recently-used month.
const MAX_CACHED_MONTHS = 24

// ── Server-side employee narrowing ───────────────────────────────────────────
// The endpoint answers with a whole company-month, which is most of what makes a
// date range slow: reviewing one person over two weeks still downloads every
// punch every colleague made across those months.
//
// Whether it accepts `?employee=` is not something the payload contract says, so
// it is probed rather than assumed:
//   null  — untried, send it and see
//   false — proven to do nothing (or rejected outright); stop sending it
//
// Proving it matters in both directions. If the filter works the payload
// collapses to one person's rows. If it does not, the param has to be dropped
// again — left on, it would put every employee in their own cache entry for a
// response that holds the whole company anyway, so switching employee inside the
// same range would re-download a month already in hand.
let employeeFilterSupported = null

/** A response holding somebody else's rows is proof the filter did nothing. */
function filterWasIgnored(rows, wanted) {
  return rows.some((row) => !rowMatchesEmployee(row, wanted))
}

/** Params in a fixed order, so `{a,b}` and `{b,a}` are one cache entry. */
function paramsKey(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

/** The endpoint answers with a bare array, `{results,count}` or `{data,total}`. */
function normaliseMonth(payload) {
  if (Array.isArray(payload)) return { data: payload, total: payload.length }
  if (Array.isArray(payload?.results)) {
    return { data: payload.results, total: payload.count ?? payload.results.length }
  }
  if (Array.isArray(payload?.data)) {
    return { data: payload.data, total: payload.total ?? payload.data.length }
  }
  return { data: [], total: 0 }
}

function readCache(key) {
  const hit = monthCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.timestamp > CACHE_TTL_MS) {
    monthCache.delete(key)
    return null
  }
  // Re-insert to mark it as most recently used.
  monthCache.delete(key)
  monthCache.set(key, hit)
  return hit
}

function writeCache(key, result) {
  monthCache.set(key, { ...result, timestamp: Date.now() })
  while (monthCache.size > MAX_CACHED_MONTHS) {
    monthCache.delete(monthCache.keys().next().value)
  }
}

/**
 * Drop cached months so the next fetch goes to the network. Called after every
 * write below — an edited punch has to show up immediately, and a two-minute
 * TTL is far too long to wait to see your own change.
 *
 * @param {string|number} [companyId] Limit the purge to one company.
 */
export function invalidateAttendanceCache(companyId) {
  if (companyId == null) {
    monthCache.clear()
    return
  }
  const prefix = `${companyId}|`
  for (const key of [...monthCache.keys()]) {
    if (key.startsWith(prefix)) monthCache.delete(key)
  }
}

export function useAttendance() {
  const { companyId } = useCompany()

  const attendanceData = ref([])
  const loading = ref(false)
  // Counted rather than a plain flag: a date range issues one request per month
  // it spans, and the first to come back would otherwise clear the spinner while
  // the rest were still in the air.
  //
  // The counter is per-instance while `inflight` and `monthCache` are shared at
  // module scope, so an instance that *joins* someone else's in-flight month has
  // to count that wait itself — otherwise it awaits a real network round trip
  // with `loading` still false and renders an empty table instead of a skeleton.
  // `track()` is what both paths go through.
  let pendingRequests = 0
  const creating = ref(false)
  const updating = ref(false)
  const acknowledging = ref(false)

  // Guards every write to `attendanceData` below. The date picker can be
  // clicked through faster than the endpoint answers, and the month cache means
  // a later request often resolves first — so an earlier response could land
  // last and publish the wrong day. AttendancePage already guards its *own*
  // commits this way; this covers the composable's, which land first and are
  // therefore the ones left on screen when the page then declines to overwrite
  // them.
  const commitGuard = createRequestToken()

  /** Hold the spinner up for the lifetime of `promise`, however it settles. */
  function track(promise) {
    pendingRequests += 1
    loading.value = true
    return promise.finally(() => {
      pendingRequests -= 1
      if (pendingRequests === 0) loading.value = false
    })
  }

  // ─── Fetch ────────────────────────────────────────────────────────────────

  /**
   * One month from the cache, from an in-flight request for the same month, or
   * from the network — in that order.
   *
   * Callers get their own array. The cached one is handed out to everybody, and
   * the attendance page sorts and de-duplicates what it receives.
   */
  function loadMonth(cid, year, month, params, force) {
    const url = `${BASE}/attendance/company/${cid}/${year}/${month}/`
    const copy = (result) => ({ data: result.data.slice(), total: result.total })
    const keyFor = (p) => `${cid}|${year}-${month}|${paramsKey(p)}`

    const wanted = params.employee
    const probing = wanted != null && wanted !== '' && employeeFilterSupported !== false

    const sent = { ...params }
    if (!probing) delete sent.employee

    const key = keyFor(sent)
    // Where an ignored filter's response belongs: it is the whole month.
    const unfilteredKey = probing ? keyFor({ ...params, employee: undefined }) : key

    if (!force) {
      const cached = readCache(key) ?? (probing ? readCache(unfilteredKey) : null)
      if (cached) return Promise.resolve(copy(cached))

      const pending = inflight.get(key)
      // Someone else is already asking for exactly this month. Wait on their
      // request rather than issuing a second one, but count the wait.
      if (pending) return track(pending).then(copy)
    }

    const request = api
      .get(url, { params: sent })
      .then((response) => {
        const result = normaliseMonth(response.data)

        if (probing && filterWasIgnored(result.data, wanted)) {
          employeeFilterSupported = false
          writeCache(unfilteredKey, result)
          return result
        }

        writeCache(key, result)
        return result
      })
      .catch((error) => {
        // A filter the server refuses outright must not take the month down with
        // it — drop the probe for good and ask again the way that always worked.
        const status = error?.response?.status
        if (probing && status >= 400 && status < 500) {
          employeeFilterSupported = false
          const fallback = { ...params }
          delete fallback.employee
          return api.get(url, { params: fallback }).then((response) => {
            const result = normaliseMonth(response.data)
            writeCache(unfilteredKey, result)
            return result
          })
        }
        throw error
      })
      .finally(() => {
        inflight.delete(key)
      })

    inflight.set(key, request)
    return track(request).then(copy)
  }

  /**
   * Fetch attendance records for a given year/month, optionally filtered by a specific date.
   * @param {string} year
   * @param {string} month
   * @param {object}  [params] - Extra query params (date, cost_center, page, limit …)
   * @param {string}  [params.date] - Optional date filter e.g. '2026-03-27'
   * @param {object}  [options]
   * @param {boolean} [options.force]  - Skip the cache and re-read from the server.
   * @param {boolean} [options.commit] - Publish the rows to `attendanceData`.
   *   A date range fetches one month per call and assembles them itself; letting
   *   each one land in the shared ref made the table re-filter, re-sort and
   *   re-derive its locked-shift set once per month, over a set that grew with
   *   every arrival, before being replaced by the assembled span anyway.
   */
  async function fetchAttendance(year, month, params = {}, { force = false, commit = true } = {}) {
    if (!companyId.value) throw new Error('Company ID not found')

    const token = commit ? commitGuard.next() : null
    const { data } = await loadMonth(companyId.value, year, month, params, force)
    // The caller still gets its rows either way; only publishing is skipped.
    if (commit && commitGuard.isCurrent(token)) attendanceData.value = data
    return data
  }

  /**
   * Fetch attendance records for a specific date. Faster than fetching a full month.
   * @param {string}  date - YYYY-MM-DD e.g. '2026-03-27'
   * @param {object}  [params] - Extra query params (cost_center, page, limit …)
   * @param {object}  [options]
   * @param {boolean} [options.force] - Skip the cache and re-read from the server.
   */
  async function fetchAttendanceByDate(date, params = {}, { force = false } = {}) {
    if (!companyId.value) throw new Error('Company ID not found')
    if (!date) throw new Error('Date is required')

    const [year, month] = date.split('-')
    const token = commitGuard.next()
    const result = await loadMonth(companyId.value, year, month, { date, ...params }, force)

    if (commitGuard.isCurrent(token)) attendanceData.value = result.data
    return result
  }

  /**
   * Fetch the scheduled record for a specific employee on a date.
   * @param {string} employeeId
   * @param {string} date  – YYYY-MM-DD
   */
  async function fetchEmployeeSchedule(employeeId, date) {
    if (!companyId.value || !employeeId || !date) return null

    const response = await api.get(`${BASE}/organization/scheduled/${companyId.value}/${date}/`)

    const list = Array.isArray(response.data)
      ? response.data
      : (response.data.data ?? response.data.schedules ?? [])

    return list.filter((s) => s.employee_id === employeeId)
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  /**
   * Log a single time-in or time-out punch.
   * @param {object} payload – { source, employee_id, timestamp, site_id?, cost_center? }
   */
  async function logAttendance(payload) {
    creating.value = true
    try {
      const response = await api.post(`${BASE}/attendance/log/${companyId.value}/`, payload)
      invalidateAttendanceCache(companyId.value)
      return response.data
    } finally {
      creating.value = false
    }
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  /**
   * Update an attendance record (time_in, time_out, cost_center …).
   * @param {string|number} recordId
   * @param {object} payload
   */
  async function updateAttendance(recordId, payload) {
    updating.value = true
    try {
      const response = await api.put(
        `${BASE}/attendance/log-update/${companyId.value}/${recordId}/`,
        payload,
      )
      invalidateAttendanceCache(companyId.value)
      return response.data
    } finally {
      updating.value = false
    }
  }

  /**
   * Mark a flagged or suspicious punch as reviewed and settled.
   *
   * The record keeps its flag and its reason — acknowledging says an admin has
   * looked at it, not that the anomaly did not happen — so the caller still has
   * to refetch to pick up `acknowledged_by` / `acknowledged_at`.
   *
   * @param {string|number} recordId
   * @param {boolean} [acknowledged] Pass false to withdraw an acknowledgement.
   */
  async function acknowledgeAttendance(recordId, acknowledged = true) {
    if (!companyId.value) throw new Error('Company ID not found')
    if (!recordId) throw new Error('Attendance record ID is required')

    acknowledging.value = true
    try {
      const response = await api.patch(
        `${BASE}/attendance/log/${companyId.value}/${recordId}/acknowledge/`,
        { acknowledged },
      )
      invalidateAttendanceCache(companyId.value)
      return response.data
    } finally {
      acknowledging.value = false
    }
  }

  return {
    // state
    attendanceData,
    loading,
    creating,
    updating,
    acknowledging,
    // methods
    fetchAttendance,
    fetchAttendanceByDate,
    fetchEmployeeSchedule,
    logAttendance,
    updateAttendance,
    acknowledgeAttendance,
    invalidateCache: () => invalidateAttendanceCache(companyId.value),
  }
}
