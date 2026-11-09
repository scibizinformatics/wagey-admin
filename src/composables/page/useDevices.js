import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { isDeactivateReason, normalizeDevices } from 'src/composables/utils/devices'

/**
 * Employee devices for the active workspace — the phones and browsers staff
 * sign in to the app on.
 *
 *   GET   /user/companies/{company_id}/devices/                        the roll
 *   PATCH /user/companies/{company_id}/devices/{uuid}/deactivate/      switch one off
 *
 * Two things about this API shape the composable.
 *
 * The deactivate route is **documented as `{employee_uuid}` but actually carries
 * the device's `device_uuid`** — that mismatch is confirmed against the backend,
 * and if it is ever wrong the correction is the one path template below. The
 * endpoint is nested under the company in the path, so unlike the access-card
 * writes there is no un-scoped route to be an extra guard for: the company is
 * still re-resolved on every call, because a workspace switch that lands
 * mid-flight must not write the previous workspace's id into the URL.
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
   * The reason is guarded, not trusted: `isDeactivateReason` is the endpoint's
   * apparent vocabulary, and a stale value reappearing in a select is exactly
   * the failure a form cannot catch on its own. The reject is local and
   * immediate, so it cannot half-apply.
   *
   * `deactivated_at` is sent because the documented payload carries it; if the
   * server stamps its own, deleting that one key is the whole correction.
   *
   * @param {string} deviceUuid the row's `device_uuid` — see the header note
   *   about the `{employee_uuid}` in the documented path
   * @param {string} reason one of the tokens `isDeactivateReason` accepts
   * @returns {Promise<object>} the endpoint's response payload
   */
  async function deactivateDevice(deviceUuid, reason) {
    const uuid = String(deviceUuid ?? '').trim()
    if (!uuid) {
      // A row the list produced should always carry one; this is the guard for
      // a caller that has somehow reached a device without it.
      throw new Error('No device was named for this deactivation.')
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
      const response = await api.patch(
        `/user/companies/${company}/devices/${encodeURIComponent(uuid)}/deactivate/`,
        {
          is_active: false,
          deactivated_reason: reasonKey,
          deactivated_at: new Date().toISOString(),
        },
      )
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
