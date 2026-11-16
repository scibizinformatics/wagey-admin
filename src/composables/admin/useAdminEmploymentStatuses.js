import { ref } from 'vue'
import { api } from 'boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { invalidateEmploymentStatusCache } from 'src/composables/page/useEmploymentStatuses'
import {
  EMPLOYMENT_STATUS_CODE_PATTERN,
  employmentStatusCodeFor,
  employmentStatusPayload,
  isKnownEmploymentStatusCategory,
  normaliseEmploymentStatus,
  sortEmploymentStatuses,
  unwrapEmploymentStatusList,
} from 'src/composables/utils/employmentStatuses'

/**
 * The company's employment statuses — Admin settings > Employment statuses.
 *
 * A separate composable from `composables/page/useEmploymentStatuses.js`, which
 * is the Employees row menu's read-only, selectable-only, cached view. This one
 * needs every row (retired included), the employee counts and the flags, and it
 * is the writer, so it does not share that cache. It does invalidate it after a
 * write, because the employee dialog would otherwise keep offering a status the
 * admin has just retired.
 *
 * `DELETE` retires rather than deletes, and the default status cannot be retired
 * at all (the endpoint answers a 400 with a `detail`); both are surfaced through
 * `extractErrorMessage` rather than pre-empted with a different write.
 */

export function employmentStatusesPath(companyId) {
  return `/user/companies/${companyId}/employment-statuses/`
}

function emptyForm() {
  return {
    id: null,
    name: '',
    code: '',
    category: '',
    description: '',
    isSelectable: true,
    sortOrder: 10,
    isSystem: false,
    isDefault: false,
    // Once an admin has typed a code, renaming the status must not re-code it:
    // the code is the identity employees and payroll rules point at.
    codeTouched: false,
  }
}

export function useAdminEmploymentStatuses() {
  const toast = useToast()
  const { companyId } = useCompany()

  const statuses = ref([])
  const loading = ref(false)
  const saving = ref(false)
  /** id of the row whose default / selectability is being patched. */
  const savingId = ref(null)

  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(emptyForm())

  const retireTarget = ref(null)
  const showRetireConfirm = ref(false)
  const retiring = ref(false)

  const listGuard = createRequestToken()

  async function fetchStatuses() {
    const cid = companyId.value
    if (!cid) {
      statuses.value = []
      return []
    }

    const token = listGuard.next()
    loading.value = true
    try {
      const response = await api.get(employmentStatusesPath(cid))
      if (!listGuard.isCurrent(token)) return statuses.value
      statuses.value = sortEmploymentStatuses(
        unwrapEmploymentStatusList(response.data).map(normaliseEmploymentStatus),
      )
      return statuses.value
    } catch (error) {
      if (listGuard.isCurrent(token)) {
        console.error('[useAdminEmploymentStatuses] fetch ✖ error', error)
        statuses.value = []
        toast.error(extractErrorMessage(error, 'Failed to load employment statuses'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  /**
   * Refresh the panel and the Employees row menu's cache after a write. Both a
   * success and a failure land here: a 400 can mean another admin changed the
   * default underneath this one, and the table should show what the server
   * actually holds rather than the guess it was built from.
   */
  async function refreshAfterWrite() {
    await fetchStatuses()
    invalidateEmploymentStatusCache(companyId.value)
  }

  function openDialog() {
    if (!companyId.value) {
      toast.warning('Select a company before adding an employment status')
      return
    }
    editing.value = false
    form.value = emptyForm()
    dialog.value = true
  }

  function openEditDialog(status) {
    editing.value = true
    form.value = {
      id: status.id,
      name: status.name,
      code: status.code,
      category: status.category,
      description: status.description,
      isSelectable: status.isSelectable,
      sortOrder: status.sortOrder,
      isSystem: status.isSystem,
      isDefault: status.isDefault,
      codeTouched: true,
    }
    dialog.value = true
  }

  /**
   * The name and category the endpoint requires, plus the code's format when one
   * is supplied, checked locally first so the message names the field instead of
   * coming back as a bare 400. The code itself is optional: a blank one is
   * derived from the name on create and keeps the existing code on edit.
   * Uniqueness is the server's to decide and its message is the one shown.
   */
  function validateForm() {
    const current = form.value
    if (!current.name.trim()) return 'A status name is required'

    // A system status's code and category are fixed; only its name (and the
    // editable settings below the grid) can change.
    if (editing.value && current.isSystem) return ''

    const typedCode = current.code.trim().toLowerCase()
    if (typedCode && !EMPLOYMENT_STATUS_CODE_PATTERN.test(typedCode)) {
      return 'The code must use lowercase letters, numbers and underscores, starting with a letter or number'
    }
    if (!editing.value && !employmentStatusCodeFor(current)) {
      return 'Enter a code — one could not be generated from this name'
    }
    if (!isKnownEmploymentStatusCategory(current.category)) {
      return 'Choose a category for this status'
    }

    return ''
  }

  async function saveStatus() {
    const cid = companyId.value
    if (!cid) {
      toast.error('Select a company before saving an employment status')
      return
    }

    const problem = validateForm()
    if (problem) {
      toast.error(problem)
      return
    }

    saving.value = true
    try {
      const payload = employmentStatusPayload(form.value, { editing: editing.value })
      if (editing.value && form.value.id) {
        await api.patch(`${employmentStatusesPath(cid)}${form.value.id}/`, payload)
        toast.success('Employment status updated')
      } else {
        await api.post(employmentStatusesPath(cid), payload)
        toast.success('Employment status added')
      }
      dialog.value = false
    } catch (error) {
      console.error('[useAdminEmploymentStatuses] save ✖ error', error)
      toast.error(extractErrorMessage(error, 'Failed to save the employment status'))
    } finally {
      saving.value = false
      await refreshAfterWrite()
    }
  }

  /**
   * The only way `is_default` is ever written, and only as `true`: the API
   * refuses to unset a default ("Assign another status as the default instead
   * of unsetting this one"), so the transfer happens by assigning the new one.
   */
  async function makeDefault(status) {
    const cid = companyId.value
    if (!cid || !status?.id || status.isDefault) return

    savingId.value = status.id
    try {
      await api.patch(`${employmentStatusesPath(cid)}${status.id}/`, { is_default: true })
      toast.success(`${status.name} is now the default employment status`)
    } catch (error) {
      console.error('[useAdminEmploymentStatuses] default ✖ error', error)
      toast.error(extractErrorMessage(error, 'Failed to change the default employment status'))
    } finally {
      savingId.value = null
      await refreshAfterWrite()
    }
  }

  /**
   * A retired status is not gone: `is_selectable` is writable, so the same PATCH
   * puts it back in the assignable list. There is no separate restore verb in
   * the API, which is why this is a row action beside Retire rather than a
   * create-shaped dialog.
   */
  async function restoreStatus(status) {
    const cid = companyId.value
    if (!cid || !status?.id || status.isSelectable) return

    savingId.value = status.id
    try {
      await api.patch(`${employmentStatusesPath(cid)}${status.id}/`, { is_selectable: true })
      toast.success(`${status.name} can be assigned again`)
    } catch (error) {
      console.error('[useAdminEmploymentStatuses] restore ✖ error', error)
      toast.error(extractErrorMessage(error, 'Failed to restore the employment status'))
    } finally {
      savingId.value = null
      await refreshAfterWrite()
    }
  }

  function requestRetire(status) {
    if (!status?.id) return
    // Snapshotted so the question describes the row that was clicked, even if a
    // refetch replaces the list underneath the open dialog.
    retireTarget.value = status
    showRetireConfirm.value = true
  }

  async function retireStatus(status) {
    const cid = companyId.value
    if (!cid || !status?.id) return

    retiring.value = true
    savingId.value = status.id
    try {
      await api.delete(`${employmentStatusesPath(cid)}${status.id}/`)
      toast.success(`${status.name} retired`)
      showRetireConfirm.value = false
      retireTarget.value = null
    } catch (error) {
      // The default's DELETE answers `detail`; extractErrorMessage reads it.
      console.error('[useAdminEmploymentStatuses] retire ✖ error', error)
      toast.error(extractErrorMessage(error, 'Failed to retire the employment status'))
    } finally {
      retiring.value = false
      savingId.value = null
      await refreshAfterWrite()
    }
  }

  return {
    statuses,
    loading,
    saving,
    savingId,
    dialog,
    editing,
    form,
    retireTarget,
    showRetireConfirm,
    retiring,
    fetchStatuses,
    openDialog,
    openEditDialog,
    saveStatus,
    makeDefault,
    restoreStatus,
    requestRetire,
    retireStatus,
  }
}
