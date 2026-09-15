import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  findScopeConflict,
  normalizePolicy,
  policyPayload,
  policyScopeLabel,
  validatePolicyDraft,
} from 'src/composables/utils/leaveTypes'

/**
 * The grant policies attached to one leave type.
 *
 *   GET  /attendance/leave-policies/leave-type/{leave_type_id}/
 *   POST /attendance/leave-policies/assign/
 *
 * Separate from `useAdminLeaveTypes` for the same reason
 * `useAdminSitePositionRequirements` is separate from `useAdminSites`: it is a
 * sub-resource with its own endpoints, read by one dialog, and the list it
 * fetches is keyed by leave type rather than by company.
 *
 * Two things shape it. The policy payload **carries no company field** — it is
 * reached through a leave type, which is already company-scoped — so the guard
 * here is against a stale *leave type*, not a stale company; the cache is still
 * dropped when the workspace changes, since type ids do not carry across.
 * And the API documents **no update or delete** for a policy, only list and
 * assign, so this composable offers neither: inventing a `DELETE
 * /attendance/leave-policies/{id}/` would fail at the worst moment, with an
 * admin believing a rule had been withdrawn.
 *
 * The conflict check before assigning is a courtesy, not a substitute for the
 * server's: a department may hold only one monthly/annual policy per type, and
 * being told that beside the form beats reading it off a 400.
 */
export function useAdminLeavePolicies() {
  const { companyId } = useCompany()
  const toast = useToast()

  /** Normalized policies for the type named by `loadedLeaveTypeId`. */
  const policies = ref([])
  const loadedLeaveTypeId = ref(null)
  const loading = ref(false)
  const saving = ref(false)

  const listGuard = createRequestToken()

  watch(companyId, () => {
    policies.value = []
    loadedLeaveTypeId.value = null
  })

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchPolicies(leaveTypeId) {
    if (leaveTypeId == null) {
      policies.value = []
      loadedLeaveTypeId.value = null
      return []
    }
    const token = listGuard.next()
    loading.value = true
    try {
      const response = await api.get(`/attendance/leave-policies/leave-type/${leaveTypeId}/`)
      if (!listGuard.isCurrent(token)) return policies.value
      const rows = response.data?.data ?? response.data ?? []
      policies.value = (Array.isArray(rows) ? rows : []).map(normalizePolicy)
      loadedLeaveTypeId.value = leaveTypeId
      return policies.value
    } catch (error) {
      console.error(`Error fetching policies for leave type ${leaveTypeId}:`, error)
      if (listGuard.isCurrent(token)) {
        policies.value = []
        loadedLeaveTypeId.value = leaveTypeId
        toast.error(extractErrorMessage(error, 'Failed to load grant policies'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  // ─── Assign ────────────────────────────────────────────────────────────────

  /**
   * Attach a policy to an existing leave type.
   *
   * @returns {Promise<boolean>} whether it was saved, so the dialog knows to
   *   reset its form rather than guessing from a changed list length.
   */
  async function assignPolicy(leaveTypeId, draft) {
    if (leaveTypeId == null) {
      toast.error('No leave type selected')
      return false
    }

    const invalid = validatePolicyDraft(draft)
    if (invalid) {
      toast.warning(invalid)
      return false
    }

    const conflict = findScopeConflict(draft, policies.value)
    if (conflict) {
      toast.warning(
        `${policyScopeLabel(conflict)} already has a ${conflict.grantType} policy for this leave type. Only one automatic grant is allowed per department — add an event policy instead, or pick other departments.`,
        { timeout: 7000 },
      )
      return false
    }

    saving.value = true
    try {
      await api.post('/attendance/leave-policies/assign/', {
        leave_type: Number(leaveTypeId),
        ...policyPayload(draft),
      })
      toast.success('Grant policy added')
      await fetchPolicies(leaveTypeId)
      return true
    } catch (error) {
      console.error('Error assigning leave policy:', error)
      toast.error(extractErrorMessage(error, 'Failed to add grant policy'), { timeout: 6000 })
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    policies,
    loadedLeaveTypeId,
    loading,
    saving,
    fetchPolicies,
    assignPolicy,
  }
}
