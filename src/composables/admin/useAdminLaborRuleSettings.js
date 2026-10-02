import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'

/**
 * The company's labor-rule settings, and the one field of them the UI reads:
 *
 *   GET /payroll/admin/company-labor-rule-settings/{company_id}/
 *   -> { "time_format": "12h" | "24h" }
 *
 * `time_format` is a display preference, not a policy: it decides how clock
 * times are *printed* and nothing else. It is deliberately kept out of the value
 * any time is parsed from — `type="time"` inputs and `toUTC()` still speak 24h
 * `HH:mm`, because a `time_format` of 12h must not turn 6:00 PM into an input
 * value of 06:00 and save the wrong punch.
 *
 * A company with no settings row answers 404. That is a configuration state, not
 * a failure, so it resolves to the default quietly (the request is marked
 * `expectedStatuses: [404]` to keep it out of the axios error log) and is cached
 * as 12h rather than re-requested on every visit. Anything else — a 500, a dead
 * network — is logged and left uncached so a later visit retries.
 *
 * The response is read through `data.data ?? data` because this API's envelope is
 * not the same everywhere, and a wrapped payload read as a bare one would look
 * like a company with no setting at all — the 12h default, silently wrong rather
 * than visibly absent.
 *
 * Results are cached per company id, so switching workspaces shows that
 * workspace's format rather than the last one read, and `watch(companyId)`
 * resets the ref synchronously so the outgoing company's format is never painted
 * over the incoming company's rows while its own request is in flight.
 */

/** What a company with no configured `time_format` is shown. */
export const DEFAULT_TIME_FORMAT = '12h'

/**
 * `'12h' | '24h'` from whatever the API sent.
 *
 * Tolerant on input because the documented example (`"12h/24h"`) does not say
 * which literals the field actually carries, and strict on output because every
 * caller passes the result straight to `toLocaleTimeString`. Anything
 * unrecognised — absent, null, a typo, a new value the UI has not been taught —
 * falls back to 12h, which is what the app did before this setting existed.
 *
 * @param {unknown} value
 * @returns {'12h'|'24h'}
 */
export function normalizeTimeFormat(value) {
  if (value === true) return '24h'
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return text === '24h' || text === '24' ? '24h' : '12h'
}

/** companyId -> resolved format. Module-level, like `useEmployeePayoutGroup`. */
const formatCache = new Map()

/**
 * Drop one company's cached format, or all of them.
 *
 * @param {string|number|null} [companyId]
 */
export function invalidateLaborRuleSettings(companyId = null) {
  if (companyId == null) formatCache.clear()
  else formatCache.delete(String(companyId))
}

export function useAdminLaborRuleSettings() {
  const { companyId } = useCompany()

  const timeFormat = ref(DEFAULT_TIME_FORMAT)
  const guard = createRequestToken()

  watch(companyId, () => {
    timeFormat.value = DEFAULT_TIME_FORMAT
  })

  /**
   * Read the active company's labor-rule settings and publish `time_format`.
   *
   * @param {object}  [options]
   * @param {boolean} [options.force] Ignore the per-company cache.
   * @returns {Promise<'12h'|'24h'>} The format now in effect.
   */
  async function fetchLaborRuleSettings({ force = false } = {}) {
    const id = companyId.value
    if (!id) {
      timeFormat.value = DEFAULT_TIME_FORMAT
      return timeFormat.value
    }

    if (!force && formatCache.has(String(id))) {
      timeFormat.value = formatCache.get(String(id))
      return timeFormat.value
    }

    const token = guard.next()
    try {
      const response = await api.get(`/payroll/admin/company-labor-rule-settings/${id}/`, {
        expectedStatuses: [404],
      })
      if (!guard.isCurrent(token)) return timeFormat.value
      const payload = response?.data?.data ?? response?.data ?? {}
      const resolved = normalizeTimeFormat(payload.time_format)
      formatCache.set(String(id), resolved)
      timeFormat.value = resolved
      return resolved
    } catch (error) {
      if (!guard.isCurrent(token)) return timeFormat.value
      // 404 is a company with no settings row — the 12h default is the answer,
      // so it is cached like one. Every other failure is logged and left
      // uncached, so the next visit asks again rather than pinning a company to
      // a format the server never confirmed.
      if (error?.response?.status === 404) {
        formatCache.set(String(id), DEFAULT_TIME_FORMAT)
        timeFormat.value = DEFAULT_TIME_FORMAT
        return timeFormat.value
      }
      console.error(
        'Error fetching company labor rule settings:',
        extractErrorMessage(error, 'Failed to load company labor rule settings'),
      )
      timeFormat.value = DEFAULT_TIME_FORMAT
      return timeFormat.value
    }
  }

  return { timeFormat, fetchLaborRuleSettings }
}
