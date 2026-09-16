import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  emptyHolidayTypeForm,
  holidayPolicyPayload,
  holidayTypePayload,
  holidayTypeToForm,
  normalizeHolidayTypes,
  validateHolidayPolicyDraft,
  validateHolidayTypeForm,
} from 'src/composables/utils/holidayTypes'

/**
 * Holiday types for the active company, and the dialog that edits one.
 *
 *   GET    /attendance/holiday-types/?company_id={id}
 *   POST   /attendance/holiday-types/create/
 *   PATCH  /attendance/holiday-types/{id}/
 *   DELETE /attendance/holiday-types/{id}/
 *
 * Note the filter is **`company_id`**, not the `company` that the leave-type
 * list takes — the two endpoints sit under the same prefix and disagree, and an
 * unrecognised query parameter is ignored rather than rejected, so getting it
 * wrong returns every company's types instead of an error. The rows are
 * therefore also checked against the company that was asked for before they are
 * published, which is the same defence `useAuditLogs` uses.
 *
 * Create takes the type and, optionally, its policies in one atomic body, so
 * the create dialog can offer the first leave source inline. Unlike the leave
 * policies, holiday policies have a full detail route, so the chain can be
 * edited in place afterwards — see `useAdminHolidayPolicies`.
 */
export function useAdminHolidayTypes() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()

  const holidayTypes = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(emptyHolidayTypeForm())
  /** The optional first leave source, offered on create only. */
  const includeFirstPolicy = ref(false)

  const listGuard = createRequestToken()

  watch(companyId, () => {
    holidayTypes.value = []
  })

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchHolidayTypes() {
    if (!companyId.value) {
      holidayTypes.value = []
      return []
    }
    const token = listGuard.next()
    const askedFor = String(companyId.value)
    loading.value = true
    try {
      const response = await api.get('/attendance/holiday-types/', {
        params: { company_id: companyId.value },
      })
      if (!listGuard.isCurrent(token)) return holidayTypes.value
      const rows = normalizeHolidayTypes(response.data)
      // A row that names another company means the filter did not take. Drop it
      // rather than showing another workspace's holidays; a row that names no
      // company at all is kept, since the payload is allowed to omit it.
      holidayTypes.value = rows.filter(
        (type) => type.companyId == null || String(type.companyId) === askedFor,
      )
      return holidayTypes.value
    } catch (error) {
      console.error('Error fetching holiday types:', error)
      if (listGuard.isCurrent(token)) {
        holidayTypes.value = []
        toast.error(extractErrorMessage(error, 'Failed to load holiday types'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  /** One type out of the loaded list, so a dialog can re-read it after a write. */
  function holidayTypeById(id) {
    return holidayTypes.value.find((type) => String(type.id) === String(id)) || null
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
      return
    }
    editing.value = false
    form.value = emptyHolidayTypeForm()
    includeFirstPolicy.value = false
    dialog.value = true
  }

  function openEditDialog(type) {
    editing.value = true
    form.value = holidayTypeToForm(type)
    includeFirstPolicy.value = false
    dialog.value = true
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  /**
   * @param {object|null} policyDraft a first leave source to create alongside
   *   the type, or null. Ignored when editing — the chain has its own endpoints
   *   by then, and sending it here would add a duplicate rather than edit one.
   *   It is validated here rather than dropped or left to the server: the
   *   create body is atomic, so a source the endpoint rejects takes the holiday
   *   type down with it, and a source quietly discarded for being incomplete
   *   leaves an admin believing a chain is in place that is actually empty.
   */
  async function saveHolidayType(policyDraft = null) {
    const invalid = validateHolidayTypeForm(form.value)
    if (invalid) {
      toast.warning(invalid)
      return false
    }
    if (!companyId.value) {
      toast.error('Please select a company first')
      return false
    }

    if (!editing.value && policyDraft) {
      // No existing chain to collide with on create, so the default empty list
      // is the right second argument.
      const invalidPolicy = validateHolidayPolicyDraft(policyDraft)
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
        await api.patch(
          `/attendance/holiday-types/${form.value.id}/`,
          holidayTypePayload(form.value),
        )
        toast.success('Holiday type updated')
      } else {
        const payload = holidayTypePayload(form.value, companyId.value)
        if (policyDraft) payload.policies = [holidayPolicyPayload(policyDraft)]
        await api.post('/attendance/holiday-types/create/', payload)
        toast.success(
          policyDraft ? 'Holiday type and its leave source created' : 'Holiday type created',
        )
      }
      dialog.value = false
      await fetchHolidayTypes()
      return true
    } catch (error) {
      console.error('Error saving holiday type:', error)
      toast.error(extractErrorMessage(error, 'Failed to save holiday type'), { timeout: 6000 })
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  function deleteHolidayType(type) {
    $q.dialog({
      title: 'Delete this holiday type?',
      message: `"${type.name}" is removed along with its leave sources. Holidays that name the code "${type.code}" lose the type they were attached to. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`/attendance/holiday-types/${type.id}/`)
        toast.success('Holiday type deleted')
        await fetchHolidayTypes()
      } catch (error) {
        console.error('Error deleting holiday type:', error)
        toast.error(extractErrorMessage(error, 'Failed to delete holiday type'))
      }
    })
  }

  return {
    holidayTypes,
    loading,
    saving,
    dialog,
    editing,
    form,
    includeFirstPolicy,
    fetchHolidayTypes,
    holidayTypeById,
    openDialog,
    openEditDialog,
    saveHolidayType,
    deleteHolidayType,
  }
}
