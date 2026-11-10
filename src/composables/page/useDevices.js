import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { canonicalUuid, isDeactivateReason, normalizeDevices } from 'src/composables/utils/devices'

/**
 * Employee devices for the active workspace — the phones and browsers staff
 * sign in to the app on.
 *
 *   GET   /user/companies/{company_id}/devices/                            the roll
 *   PATCH /user/companies/{company_id}/devices/{employee_uuid}/deactivate/  switch one off
 *
 * Two things about this API shape the composable.
 *
 * The deactivate route keys on the **employee's uuid, not the device's**. The
 * backend's OpenAPI schema (`/api/schema/` on the server) names the path
 * parameter `employee_uuid` with `format: uuid`, and Django's uuid path
 * converter only matches a canonical lowercase uuid — while `device_uuid`, the
 * row's own identifier, is a free-form string of up to 255 characters (whatever
 * the registering app generated). The device uuid in that slot is exactly the
 * bare HTML 404 this write used to answer: a URL mismatch can never be mistaken
 * for a DRF error, because a DRF "Not found." is JSON. The write is therefore
 * guarded here — an id that cannot be a converter-shaped uuid is refused locally
 * with a message that names the real failure, and `DevicesPage` hands over the
 * row's `employee_id` for it. The endpoint is nested under the company in the
 * path, so unlike the access-card writes there is no un-scoped route to be an
 * extra guard for: the company is still re-resolved on every call, because a
 * workspace switch that lands mid-flight must not write the previous
 * workspace's id into the URL.
 *
 * And **deactivation is one-way**. The write sends `is_active: false` with a
 * reason, and there is no reactivate verb — a device comes back only by being
 * registered again from the app. That is why `deactivateDevice` rejects a reason
 * it has not been taught rather than letting a stale form value through: the
 * reason is what the device is stamped with, and there is no editing it from
 * this page afterwards.
 */

export function useDevices() {
  const { companyId } = useCompany()

  const devices = ref([])
  const loading = ref(false)
  /** The one write, tracked apart from `loading` — the confirm dialog and the
   *  table are on screen at the same time, and a spinner on the wrong one
   *  reports the wrong request. */
  const deactivating = ref(false)
  const error = ref('')

  /** The company the rows on screen were actually fetched for. */
  const servedCompanyId = ref(null)

  // The workspace switcher and the refresh button both fire faster than this
  // endpoint answers, and a slower earlier response must not land on top of a
  // newer one — a table of another company's devices is exactly the outcome a
  // page whose rows name their holders cannot survive.
  const guard = createRequestToken()

  /**
   * Load every device registered in the active workspace.
   *
   * @returns {Promise<Array>} the normalised rows, or [] on failure.
   */
  async function fetchDevices() {
    const company = companyId.value
    if (!company) {
      devices.value = []
      servedCompanyId.value = null
      // Named rather than left as an empty table: no workspace selected is a
      // different situation from a workspace where nobody has signed in.
      error.value = 'No company selected. Pick a workspace to see its devices.'
      return []
    }

    const token = guard.next()
    loading.value = true
    error.value = ''

    try {
      const response = await api.get(`/user/companies/${company}/devices/`)
      if (!guard.isCurrent(token)) return devices.value

      // The documented shape is a bare array; the unwrap mirrors the
      // useEmployees/envelope handling in case a wrapper lands on it later.
      const payload = response.data?.data ?? response.data ?? []
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.devices)
          ? payload.devices
          : []

      devices.value = normalizeDevices(list)
      servedCompanyId.value = company
      return devices.value
    } catch (err) {
      if (!guard.isCurrent(token)) return devices.value
      devices.value = []
      servedCompanyId.value = null
      error.value = extractErrorMessage(err, 'Failed to load devices')
      return []
    } finally {
      if (guard.isCurrent(token)) loading.value = false
    }
  }

  /**
   * Deactivate one device.
   *
   * The reason is guarded, not trusted: `isDeactivateReason` is the backend's
   * `DeactivatedReasonEnum` (`replaced` / `terminated` / `security` / `admin`),
   * and a stale value reappearing in a select is exactly the failure a form
   * cannot catch on its own. The reject is local and immediate, so it cannot
   * half-apply.
   *
   * The employee uuid is guarded the same way, for a different failure: it is
   * what the route looks the device up by, and Django's uuid converter answers a
   * non-uuid with a bare HTML 404 page. `canonicalUuid` normalises the case and
   * refuses anything that is not one — the one shape the URL can carry.
   *
   * `deactivated_at` is sent because the write serializer carries it; if the
   * server stamps its own, deleting that one key is the whole correction.
   *
   * @param {string} employeeUuid the row's `employee_id` — see the header note
   *   on why the route wants the employee's uuid rather than the device's
   * @param {string} reason one of the tokens `isDeactivateReason` accepts
   * @returns {Promise<object>} the endpoint's response payload
   */
  async function deactivateDevice(employeeUuid, reason) {
    const uuid = canonicalUuid(employeeUuid)
    if (!uuid) {
      // The list payload carries `employee_id` beside every device; this is the
      // guard for a caller that has somehow reached one without it. Refused
      // locally rather than sent into the converter slot to come back as an
      // HTML page nobody can read.
      throw new Error('This device carries no employee id the deactivate route can look up.')
    }
    const reasonKey = String(reason ?? '')
      .trim()
      .toLowerCase()
    if (!isDeactivateReason(reasonKey)) {
      throw new Error(`"${String(reason ?? '')}" is not a reason this page can record.`)
    }

    const company = companyId.value
    if (!company) {
      throw new Error('No company selected. Pick a workspace before deactivating a device.')
    }

    deactivating.value = true
    try {
      const response = await api.patch(`/user/companies/${company}/devices/${uuid}/deactivate/`, {
        is_active: false,
        deactivated_reason: reasonKey,
        deactivated_at: new Date().toISOString(),
      })
      return response.data
    } finally {
      deactivating.value = false
    }
  }

  /** Drop everything held for the previous workspace, and bump the in-flight
   *  guard so a response already on its way cannot repopulate the table. */
  function reset() {
    guard.next()
    devices.value = []
    servedCompanyId.value = null
    error.value = ''
    loading.value = false
    deactivating.value = false
  }

  function clearError() {
    error.value = ''
  }

  return {
    // state
    devices,
    loading,
    deactivating,
    error,
    servedCompanyId,
    // methods
    fetchDevices,
    deactivateDevice,
    clearError,
    reset,
  }
}
