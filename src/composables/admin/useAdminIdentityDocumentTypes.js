import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { BASE, extractErrorMessage } from 'src/composables/utils/http'
import {
  normaliseDocumentType,
  sortDocumentTypes,
  unwrapIdentityDocumentList,
} from 'src/composables/utils/identityDocuments'

/**
 * The company's identity-document *types* — Admin settings > Identity documents.
 *
 *   GET   /user/companies/{company_id}/identity-document-types/
 *   POST  /user/companies/{company_id}/identity-document-types/
 *   PATCH /user/companies/{company_id}/identity-document-types/{pk}/
 *
 * This family is company-scoped and takes no employee id, which is what keeps it
 * in Admin settings. The per-employee documents these types describe live on the
 * Employees page (`useEmployeeIdentityDocuments.js`), and the API documents no
 * delete for a type: it is retired by clearing `is_active`, so that is the row
 * action here rather than a bin.
 *
 * `code` is the type's identity, not a label — the sample payloads treat it as a
 * short uppercase token ("PASSPORT", "TIN") — so the form normalises it once on
 * save and the edit dialog says what changing it costs.
 */

export function identityDocumentTypesPath(companyId) {
  return `${BASE}/user/companies/${companyId}/identity-document-types/`
}

/**
 * Read-only list, shared with the employee document dialog so the two surfaces
 * cannot disagree about which types exist. Throws on failure; the caller decides
 * whether that is a toast (settings panel) or an inline error (dialog).
 */
export async function fetchIdentityDocumentTypeList(companyId) {
  if (!companyId) return []
  const response = await api.get(identityDocumentTypesPath(companyId))
  return sortDocumentTypes(unwrapIdentityDocumentList(response.data).map(normaliseDocumentType))
}

function emptyForm() {
  return {
    id: null,
    code: '',
    name: '',
    isRequired: false,
    isActive: true,
    requiresExpiry: false,
    sortOrder: 10,
  }
}

export function useAdminIdentityDocumentTypes() {
  const toast = useToast()
  const { companyId } = useCompany()

  const documentTypes = ref([])
  const loading = ref(false)
  const saving = ref(false)
  /** id of the row whose active flag is being patched. */
  const savingId = ref(null)

  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(emptyForm())

  async function fetchDocumentTypes() {
    if (!companyId.value) {
      documentTypes.value = []
      return
    }
    loading.value = true
    try {
      documentTypes.value = await fetchIdentityDocumentTypeList(companyId.value)
      return documentTypes.value
    } catch (error) {
      console.error('[useAdminIdentityDocumentTypes] fetch ✖ error', error)
      toast.error(extractErrorMessage(error, 'Failed to load identity document types'))
    } finally {
      loading.value = false
    }
  }

  function openDialog() {
    if (!companyId.value) {
      toast.warning('Select a company before adding a document type')
      return
    }
    editing.value = false
    form.value = emptyForm()
    dialog.value = true
  }

  function openEditDialog(type) {
    editing.value = true
    form.value = {
      id: type.id,
      code: type.code,
      name: type.name,
      isRequired: type.isRequired,
      isActive: type.isActive,
      requiresExpiry: type.requiresExpiry,
      sortOrder: type.sortOrder,
    }
    dialog.value = true
  }

  async function saveDocumentType() {
    const name = form.value.name.trim()
    const code = form.value.code.trim().toUpperCase()

    if (!code) {
      toast.error('A code is required')
      return
    }
    if (!name) {
      toast.error('A name is required')
      return
    }
    if (!companyId.value) {
      toast.error('Select a company before saving a document type')
      return
    }

    // The type is a company resource, so the company travels in the path; only
    // the fields the create/update endpoints document go in the body.
    const payload = {
      code,
      name,
      is_required: form.value.isRequired,
      is_active: form.value.isActive,
      requires_expiry: form.value.requiresExpiry,
      sort_order: Number(form.value.sortOrder) || 0,
    }

    saving.value = true
    try {
      if (editing.value && form.value.id) {
        await api.patch(`${identityDocumentTypesPath(companyId.value)}${form.value.id}/`, payload)
        toast.success('Document type updated')
      } else {
        await api.post(identityDocumentTypesPath(companyId.value), payload)
        toast.success('Document type added')
      }
      dialog.value = false
      await fetchDocumentTypes()
    } catch (error) {
      console.error('[useAdminIdentityDocumentTypes] save ✖ error', error)
      toast.error(extractErrorMessage(error, 'Failed to save document type'))
    } finally {
      saving.value = false
    }
  }

  /**
   * Retire or restore a type. Optimistic so the switch does not bounce, and put
   * back on failure — an inactive type cannot be filed against an employee, so
   * showing it as retired when it is not would be the misleading half.
   */
  async function setDocumentTypeActive(type, value) {
    if (!companyId.value || !type?.id) return
    const previous = type.isActive
    type.isActive = value
    savingId.value = type.id
    try {
      await api.patch(`${identityDocumentTypesPath(companyId.value)}${type.id}/`, {
        is_active: value,
      })
      toast.success(`${type.name} ${value ? 'activated' : 'deactivated'}`)
    } catch (error) {
      type.isActive = previous
      console.error('[useAdminIdentityDocumentTypes] toggle ✖ error', error)
      toast.error(extractErrorMessage(error, 'Failed to change the document type'))
    } finally {
      savingId.value = null
    }
  }

  return {
    documentTypes,
    loading,
    saving,
    savingId,
    dialog,
    editing,
    form,
    fetchDocumentTypes,
    openDialog,
    openEditDialog,
    saveDocumentType,
    setDocumentTypeActive,
  }
}
