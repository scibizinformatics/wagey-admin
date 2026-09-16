import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  emptyLeaveTypeForm,
  leaveTypePayload,
  leaveTypeToForm,
  normalizeLeaveTypes,
  policyPayload,
  validatePolicyDraft,
} from 'src/composables/utils/leaveTypes'

/**
 * Leave types for the active company, and the dialog that edits one.
 *
 *   GET    /attendance/leave-types/company/{company_id}/
 *   POST   /attendance/leave-types/create/
 *   PATCH  /attendance/leave-types/{id}/
 *   DELETE /attendance/leave-types/{id}/
 *
 * The **company-scoped list route** is used rather than `?company=` on the flat
 * one: it takes the id in the path, so there is no way for the filter to be
 * dropped and answer with another workspace's types. Company is resolved per
 * request from the reactive `companyId`, and the rows are cleared when it
 * changes — ids from the previous workspace mean nothing in the next one.
 *
 * Create takes the type and, optionally, its policies in the same atomic body
 * (`policies: [...]`); if any policy is invalid nothing is saved, which is why
 * the create dialog can offer a first policy inline. **Update deliberately
 * sends the type fields only.** The API documents no nested-policy semantics on
 * `PATCH` — whether an omitted `policies` key would clear the existing ones is
 * not stated — so policies are added through `useAdminLeavePolicies` against
 * their own endpoint, where the behaviour is documented.
 *
 * Rows are normalized on the way in (`composables/utils/leaveTypes.js`) because
 * the table, the policies dialog and the create form all read the same figures.
 */
export function useAdminLeaveTypes() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()

  const leaveTypes = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(emptyLeaveTypeForm())
  /** The optional first policy, offered on create only. */
  const includeFirstPolicy = ref(false)
  const firstPolicy = ref(null)

  const listGuard = createRequestToken()

  watch(companyId, () => {
    leaveTypes.value = []
  })

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchLeaveTypes() {
    if (!companyId.value) {
      leaveTypes.value = []
      return []
    }
    const token = listGuard.next()
    loading.value = true
    try {
      const response = await api.get(`/attendance/leave-types/company/${companyId.value}/`)
      if (!listGuard.isCurrent(token)) return leaveTypes.value
      leaveTypes.value = normalizeLeaveTypes(response.data)
      return leaveTypes.value
    } catch (error) {
      console.error('Error fetching leave types:', error)
      if (listGuard.isCurrent(token)) {
        leaveTypes.value = []
        toast.error(extractErrorMessage(error, 'Failed to load leave types'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  /** One type out of the loaded list, so a dialog can re-read it after a write. */
  function leaveTypeById(id) {
    return leaveTypes.value.find((type) => String(type.id) === String(id)) || null
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
      return
    }
    editing.value = false
    form.value = emptyLeaveTypeForm()
    includeFirstPolicy.value = false
    firstPolicy.value = null
    dialog.value = true
  }

  function openEditDialog(type) {
    editing.value = true
    form.value = leaveTypeToForm(type)
    includeFirstPolicy.value = false
    firstPolicy.value = null
    dialog.value = true
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  /**
   * @param {object|null} policyDraft a first policy to create alongside the
   *   type, or null. Ignored when editing — see the header note. It is
   *   validated here rather than left to the server: the create body is
   *   atomic, so a policy the endpoint rejects takes the leave type down with
   *   it and the admin is left reading a 400 about a field they can see.
   */
  async function saveLeaveType(policyDraft = null) {
    if (!form.value.name?.trim()) {
      toast.error('Leave type name is required')
      return false
    }
    if (!companyId.value) {
      toast.error('Please select a company first')
      return false
    }

    if (!editing.value && policyDraft) {
      const invalidPolicy = validatePolicyDraft(policyDraft)
      if (invalidPolicy) {
        toast.warning(invalidPolicy)
        return false
      }
    }

    saving.value = true
    try {
      if (editing.value) {
        // No `company` on an update: the type already belongs to one, and
        // sending it again is the kind of field a reassignment bug rides in on.
        await api.patch(`/attendance/leave-types/${form.value.id}/`, leaveTypePayload(form.value))
        toast.success('Leave type updated')
      } else {
        const payload = leaveTypePayload(form.value, companyId.value)
        if (policyDraft) payload.policies = [policyPayload(policyDraft)]
        await api.post('/attendance/leave-types/create/', payload)
        toast.success(policyDraft ? 'Leave type and its policy created' : 'Leave type created')
      }
      dialog.value = false
      await fetchLeaveTypes()
      return true
    } catch (error) {
      console.error('Error saving leave type:', error)
      toast.error(extractErrorMessage(error, 'Failed to save leave type'), { timeout: 6000 })
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  function deleteLeaveType(type) {
    $q.dialog({
      title: 'Delete this leave type?',
      message: `"${type.name}" is removed along with its grant policies, and can no longer be filed. Leave already filed against it is not affected. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`/attendance/leave-types/${type.id}/`)
        toast.success('Leave type deleted')
        await fetchLeaveTypes()
      } catch (error) {
        console.error('Error deleting leave type:', error)
        toast.error(extractErrorMessage(error, 'Failed to delete leave type'))
      }
    })
  }

  return {
    leaveTypes,
    loading,
    saving,
    dialog,
    editing,
    form,
    includeFirstPolicy,
    firstPolicy,
    fetchLeaveTypes,
    leaveTypeById,
    openDialog,
    openEditDialog,
    saveLeaveType,
    deleteLeaveType,
  }
}
