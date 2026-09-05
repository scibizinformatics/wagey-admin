import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'

/**
 * Admin audit trail — `GET /audit/admin/logs/`.
 *
 * The backend keeps one row per administrative write, across every module:
 * `{ id, user, user_name, company, company_name, module, action, details,
 *    object_type_name, object_id, ip_address, created_at }`.
 *
 * It answers "who logged this punch, and who edited it afterwards" — the
 * record itself only carries a `created_by` string and an `updated_at` stamp,
 * which cannot name the person behind a later manual correction.
 *
 * Attendance reads its change history from the narrower, purpose-built
 * `GET /audit/attendance/updates/{uuid}/` instead (see below): the admin log is
 * company-wide and keyed by an object id that is only unique within a module,
 * while the updates endpoint is keyed by the record itself and carries the punch
 * times as they stood after each revision — which is what the dialog shows.
 */

const LOGS_URL = '/audit/admin/logs/'
const ATTENDANCE_UPDATES_URL = '/audit/attendance/updates/'

// Asked for over the default page size because the trail for one record can sit
// well down a company-wide, reverse-chronological list when the server does not
// honour the `object_id` filter and we have to narrow it here instead.
const PAGE_SIZE = 200

/** DRF hands back either a bare array or `{ results, count }`. */
function toList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

/** Ids cross the wire as strings in this payload but as numbers elsewhere. */
function sameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

// ── Attendance revisions ─────────────────────────────────────────────────────
// `GET /audit/attendance/updates/{uuid}/` answers with one entry per saved
// revision, each holding the punch as it stood *after* that save:
//   { actual_time_in, actual_time_out, updater_name, updated_at }
// Times and stamps arrive already formatted for display ("09:38:48 AM",
// "Aug 28, 2026 10:32:32 AM"), so they are passed through rather than reparsed —
// the server knows the record's timezone and the browser does not.

const TRIMMED_SECONDS = /^(\d{1,2}:\d{2}):\d{2}(\s*[AP]M)$/i

/** "09:38:48 AM" → "09:38 AM". Seconds are noise at three per row. */
function shortTime(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''
  const match = text.match(TRIMMED_SECONDS)
  return match ? `${match[1]}${match[2].toUpperCase()}` : text
}

/** Newest first, falling back to the server's order when a stamp won't parse. */
function byNewest(entries) {
  const stamped = entries.map((entry, index) => ({
    entry,
    index,
    at: new Date(entry?.updated_at || 0).getTime(),
  }))
  if (stamped.some((item) => isNaN(item.at))) return entries
  stamped.sort((a, b) => b.at - a.at || a.index - b.index)
  return stamped.map((item) => item.entry)
}

/**
 * Shape the revisions for the dialog, newest first.
 *
 * Each entry is diffed against the revision below it so the list can say what
 * that save actually changed. Without it every row reads identically — the same
 * two times repeated — and the reader has to compare them by eye to find the
 * one edit that matters.
 */
function normaliseUpdates(payload) {
  const ordered = byNewest(toList(payload))

  return ordered.map((entry, index) => {
    // The revision immediately before this one; the last row has none, so its
    // values are stated rather than described as a change.
    const previous = ordered[index + 1] || null
    const timeIn = shortTime(entry?.actual_time_in)
    const timeOut = shortTime(entry?.actual_time_out)

    return {
      key: `${entry?.updated_at || 'revision'}-${index}`,
      timeIn,
      timeOut,
      updaterName: (entry?.updater_name || '').trim(),
      updatedAt: (entry?.updated_at || '').trim(),
      isOldest: !previous,
      changedTimeIn: Boolean(previous) && timeIn !== shortTime(previous?.actual_time_in),
      changedTimeOut: Boolean(previous) && timeOut !== shortTime(previous?.actual_time_out),
    }
  })
}

export function useAuditLogs() {
  const { companyId } = useCompany()

  const logs = ref([])
  const loading = ref(false)
  const error = ref('')

  // The attendance revision list keeps its own state: it has a different shape
  // from an admin log row, and the dialog showing it must not have to guess
  // which of the two `logs` currently holds.
  const updates = ref([])
  const updatesLoading = ref(false)
  const updatesError = ref('')
  // Bumped per request so a slow answer for a record the reader has already
  // moved on from is dropped instead of rendering under the new one's name.
  let updatesToken = 0

  /**
   * Fetch the audit trail, newest first.
   *
   * Every call is scoped to the company currently selected in the workspace
   * switcher — resolved here rather than captured when the composable was
   * created, so a switch mid-session cannot leave one workspace's history on
   * screen. Results are re-checked against that id after they arrive, because
   * the endpoint is company-wide and we cannot assume it honoured the filter.
   *
   * @param {object}        [options]
   * @param {string|number} [options.objectId]   Narrow to one record's history.
   * @param {string}        [options.module]     Prefer entries from this module, e.g. 'attendance'.
   * @param {number}        [options.limit]      Keep at most this many entries.
   */
  async function fetchAuditLogs({ objectId, module, limit } = {}) {
    const company = companyId.value
    if (!company) {
      logs.value = []
      error.value = 'No company selected.'
      return []
    }

    loading.value = true
    error.value = ''
    try {
      const params = { company, page_size: PAGE_SIZE }
      // Sent as a hint only. An unknown query param is ignored by DRF, and the
      // same narrowing is applied below regardless, so an endpoint without this
      // filter still returns a correct — just larger — result set. `module` is
      // deliberately not sent: the spec does not pin down its spelling, and an
      // exact-match filter on the wrong casing would come back empty rather
      // than merely unfiltered.
      if (objectId != null && objectId !== '') params.object_id = objectId

      const response = await api.get(LOGS_URL, { params })

      let entries = toList(response.data).filter(
        // An entry with no company at all is kept: some backends only stamp it
        // on company-scoped modules, and dropping those would hide real history.
        (entry) => entry?.company == null || sameId(entry.company, company),
      )

      if (objectId != null && objectId !== '') {
        entries = entries.filter((entry) => sameId(entry?.object_id, objectId))
      }

      // Object ids are only unique within a module, so a record id can collide
      // with an unrelated row elsewhere. Prefer the entries that name the module
      // we asked for — but fall back to the unnarrowed set when none match, so a
      // backend that spells the module differently shows history rather than a
      // misleading "no activity".
      if (module) {
        const wanted = module.toLowerCase()
        const onModule = entries.filter((entry) =>
          `${entry?.module || ''} ${entry?.object_type_name || ''}`.toLowerCase().includes(wanted),
        )
        if (onModule.length) entries = onModule
      }

      entries.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
      if (limit) entries = entries.slice(0, limit)

      logs.value = entries
      return entries
    } catch (err) {
      // Surfaced as state, not a toast: the trail is a secondary panel inside a
      // dialog, and a failure to load it should not read like the record itself
      // failed to open.
      const status = err?.response?.status
      error.value =
        status === 403 || status === 401
          ? 'You do not have permission to view the audit trail.'
          : 'Could not load the audit trail.'
      logs.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * The saved revisions of one attendance record, newest first.
   *
   * Keyed by the record's own uuid, so no company scoping is needed here — the
   * uuid came from a row already fetched for the selected company, and the
   * endpoint answers for that record alone.
   *
   * @param {string} attendanceUuid
   */
  async function fetchAttendanceUpdates(attendanceUuid) {
    if (!attendanceUuid) {
      updates.value = []
      updatesError.value = ''
      return []
    }

    const token = (updatesToken += 1)
    updatesLoading.value = true
    updatesError.value = ''
    try {
      // A 404 means "nothing recorded against this punch yet" and is handled as
      // an empty history below, so it is declared expected and not logged.
      const response = await api.get(`${ATTENDANCE_UPDATES_URL}${attendanceUuid}/`, {
        expectedStatuses: [404],
      })
      const entries = normaliseUpdates(response.data)
      if (token !== updatesToken) return entries

      updates.value = entries
      return entries
    } catch (err) {
      if (token !== updatesToken) return []

      // Surfaced as state, not a toast: the trail is a secondary panel inside a
      // dialog, and a failure to load it should not read like the record itself
      // failed to open.
      const status = err?.response?.status
      if (status === 404) {
        // Nothing has been recorded against this punch yet — an empty history,
        // not a failure.
        updates.value = []
        return []
      }
      updatesError.value =
        status === 403 || status === 401
          ? 'You do not have permission to view the change history.'
          : 'Could not load the change history.'
      updates.value = []
      return []
    } finally {
      if (token === updatesToken) updatesLoading.value = false
    }
  }

  function reset() {
    logs.value = []
    error.value = ''
    // Invalidates any request still in the air, so it cannot land after a reset.
    updatesToken += 1
    updates.value = []
    updatesError.value = ''
    updatesLoading.value = false
  }

  return {
    // state
    logs,
    loading,
    error,
    updates,
    updatesLoading,
    updatesError,
    // methods
    fetchAuditLogs,
    fetchAttendanceUpdates,
    reset,
  }
}
