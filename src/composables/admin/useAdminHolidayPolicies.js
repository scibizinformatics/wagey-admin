import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  holidayPolicyPayload,
  nextOrder,
  normalizeHolidayPolicy,
  parkingOrder,
  sortHolidayPolicies,
  validateHolidayPolicyDraft,
} from 'src/composables/utils/holidayTypes'

/**
 * The leave sources attached to one holiday type — its fallback chain.
 *
 *   GET    /attendance/holiday-policies/holiday-type/{holiday_type_id}/
 *   POST   /attendance/holiday-policies/assign/
 *   PATCH  /attendance/holiday-policies/{id}/
 *   DELETE /attendance/holiday-policies/{id}/
 *
 * Unlike the leave policies, these have a full detail route, so the chain is
 * editable in place: a source can be disabled without losing its position, and
 * the order can be changed.
 *
 * **Reordering is three requests, not a swap.** `order` is unique per holiday
 * type, so writing A's position onto B while A still holds it is a uniqueness
 * violation — the obvious two-PATCH swap fails on the first call. The move
 * therefore parks the row being moved at an order nothing holds, frees its
 * position for its neighbour, then lands it. If a later step fails the chain is
 * left part-moved rather than silently wrong, so the list is re-read and the
 * failure says so out loud; the alternative — reporting success on a partial
 * write — would leave an admin believing a priority they cannot see is in force.
 *
 * **Assign sends the position explicitly.** `order` is unique per holiday type
 * *and the endpoint defaults it to 1*, which is exactly where a chain starts —
 * so omitting it is not "add me at the end", it is a guaranteed
 * `The fields holiday_type, order must make a unique set` on every type that
 * already has a source. The end of the chain is computed here, and a collision
 * (another admin added a source since this chain was read) is retried once
 * against a freshly read chain.
 */
export function useAdminHolidayPolicies() {
  const { companyId } = useCompany()
  const toast = useToast()

  /** Normalized, chain-ordered policies for `loadedHolidayTypeId`. */
  const policies = ref([])
  const loadedHolidayTypeId = ref(null)
  const loading = ref(false)
  const saving = ref(false)
  /** Id of the policy currently being moved, toggled or removed. */
  const busyPolicyId = ref(null)

  const listGuard = createRequestToken()

  watch(companyId, () => {
    policies.value = []
    loadedHolidayTypeId.value = null
  })

  function detailUrl(policyId) {
    return `/attendance/holiday-policies/${policyId}/`
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchPolicies(holidayTypeId) {
    if (holidayTypeId == null) {
      policies.value = []
      loadedHolidayTypeId.value = null
      return []
    }
    const token = listGuard.next()
    loading.value = true
    try {
      const response = await api.get(`/attendance/holiday-policies/holiday-type/${holidayTypeId}/`)
      if (!listGuard.isCurrent(token)) return policies.value
      const rows = response.data?.data ?? response.data ?? []
      policies.value = sortHolidayPolicies(
        (Array.isArray(rows) ? rows : []).map(normalizeHolidayPolicy),
      )
      loadedHolidayTypeId.value = holidayTypeId
      return policies.value
    } catch (error) {
      console.error(`Error fetching policies for holiday type ${holidayTypeId}:`, error)
      if (listGuard.isCurrent(token)) {
        policies.value = []
        loadedHolidayTypeId.value = holidayTypeId
        toast.error(extractErrorMessage(error, 'Failed to load leave sources'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  // ─── Assign ────────────────────────────────────────────────────────────────

  /**
   * A 400 from the unique-together rule on `(holiday_type, order)`.
   *
   * That message is the only assign failure worth a second attempt: it means
   * the position computed from the chain we hold is already taken, and the
   * request created nothing, so retrying cannot duplicate a row.
   */
  function isOrderCollision(error) {
    if (error?.response?.status !== 400) return false
    const data = error.response.data
    if (!data || typeof data !== 'object') return false
    const messages = [data.non_field_errors, data.order]
      .flat()
      .filter((message) => typeof message === 'string')
    return messages.some((message) => /unique set/i.test(message))
  }

  /** @returns {Promise<boolean>} whether it was saved. */
  async function assignPolicy(holidayTypeId, draft) {
    if (holidayTypeId == null) {
      toast.error('No holiday type selected')
      return false
    }

    // The chain position the dialog advertises, sent as-is. Leaving `order` off
    // makes the server use its default of 1, which collides with the first
    // source of any chain that already has one.
    const positioned = { ...draft, order: nextOrder(policies.value) }
    const invalid = validateHolidayPolicyDraft(positioned, policies.value)
    if (invalid) {
      toast.warning(invalid)
      return false
    }

    saving.value = true
    try {
      try {
        await api.post('/attendance/holiday-policies/assign/', {
          holiday_type: Number(holidayTypeId),
          ...holidayPolicyPayload(positioned),
        })
      } catch (error) {
        if (!isOrderCollision(error)) throw error
        // The chain moved under us — read it again and take the position after
        // whatever landed. One retry only: a second collision means someone
        // else is still writing, and the error is the honest answer then.
        await fetchPolicies(holidayTypeId)
        await api.post('/attendance/holiday-policies/assign/', {
          holiday_type: Number(holidayTypeId),
          ...holidayPolicyPayload({ ...draft, order: nextOrder(policies.value) }),
        })
      }
      toast.success('Leave source added')
      await fetchPolicies(holidayTypeId)
      return true
    } catch (error) {
      console.error('Error assigning holiday policy:', error)
      toast.error(extractErrorMessage(error, 'Failed to add leave source'), { timeout: 6000 })
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Enable / disable ──────────────────────────────────────────────────────

  async function setPolicyEnabled(holidayTypeId, policy, isEnabled) {
    if (!policy?.id) return false
    busyPolicyId.value = policy.id
    try {
      await api.patch(detailUrl(policy.id), { is_enabled: Boolean(isEnabled) })
      // Keeps its position either way — a disabled source is skipped, not moved.
      toast.success(isEnabled ? 'Leave source enabled' : 'Leave source disabled')
      await fetchPolicies(holidayTypeId)
      return true
    } catch (error) {
      console.error('Error updating holiday policy:', error)
      toast.error(extractErrorMessage(error, 'Failed to update leave source'))
      await fetchPolicies(holidayTypeId)
      return false
    } finally {
      busyPolicyId.value = null
    }
  }

  // ─── Reorder ───────────────────────────────────────────────────────────────

  /**
   * Move one policy one step along the chain.
   *
   * @param {'up'|'down'} direction up is earlier, and earlier wins.
   */
  async function movePolicy(holidayTypeId, policy, direction) {
    const chain = sortHolidayPolicies(policies.value)
    const index = chain.findIndex((row) => row.id === policy?.id)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || targetIndex < 0 || targetIndex >= chain.length) return false

    const neighbour = chain[targetIndex]
    const from = policy.order
    const to = neighbour.order
    if (from == null || to == null) {
      toast.warning('These sources have no order yet — reload and try again.')
      await fetchPolicies(holidayTypeId)
      return false
    }

    const park = parkingOrder(chain)
    busyPolicyId.value = policy.id
    let step = 0
    try {
      await api.patch(detailUrl(policy.id), { order: park })
      step = 1
      await api.patch(detailUrl(neighbour.id), { order: from })
      step = 2
      await api.patch(detailUrl(policy.id), { order: to })
      return true
    } catch (error) {
      console.error('Error reordering holiday policies:', error)
      toast.error(
        step === 0
          ? extractErrorMessage(error, 'Failed to reorder the leave sources')
          : 'The reorder stopped partway — the chain below is what is actually saved.',
        { timeout: 7000 },
      )
      return false
    } finally {
      busyPolicyId.value = null
      // Always re-read: on success it confirms the new order, and on a partial
      // failure it is the only way the list tells the truth.
      await fetchPolicies(holidayTypeId)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function deletePolicy(holidayTypeId, policy) {
    if (!policy?.id) return false
    busyPolicyId.value = policy.id
    try {
      await api.delete(detailUrl(policy.id))
      toast.success('Leave source removed')
      await fetchPolicies(holidayTypeId)
      return true
    } catch (error) {
      console.error('Error deleting holiday policy:', error)
      toast.error(extractErrorMessage(error, 'Failed to remove leave source'))
      return false
    } finally {
      busyPolicyId.value = null
    }
  }

  return {
    policies,
    loadedHolidayTypeId,
    loading,
    saving,
    busyPolicyId,
    fetchPolicies,
    assignPolicy,
    setPolicyEnabled,
    movePolicy,
    deletePolicy,
  }
}
