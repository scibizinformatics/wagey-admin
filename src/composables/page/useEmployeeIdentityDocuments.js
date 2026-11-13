import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { BASE } from 'src/composables/utils/http'
import {
  normaliseIdentityDocument,
  unwrapIdentityDocumentList,
} from 'src/composables/utils/identityDocuments'

/**
 * One employee's identity documents — the employee-id-dependent side of the
 * feature. Reached from the Employees page's Actions menu, so this composable is
 * instantiated by the dialog that owns one employee at a time; it holds no
 * module-level cache and no shared list state (two employees opened in sequence
 * must not show each other's documents).
 *
 *   GET   /user/companies/{company_id}/employees/{employee_id}/identity-documents/
 *   POST  /user/companies/{company_id}/employees/{employee_id}/identity-documents/
 *   PATCH /user/companies/{company_id}/employees/{employee_id}/identity-documents/{pk}/
 *
 * The `POST` is an upsert keyed by `document_type`: a type the employee already
 * holds answers 201 with `replaced: true`, an identical submission answers 200
 * with `unchanged: true`. Callers read those flags to word the toast — "saved"
 * would be a lie for the unchanged case and a half-truth for a replacement.
 *
 * The `PATCH` carries only `is_verified` or `is_active`; it is not a general
 * edit route, so replacing a document number is another `POST`.
 */
export function useEmployeeIdentityDocuments() {
  const fetching = ref(false)
  const saving = ref(false)
  /** id of the document row currently being patched. */
  const savingId = ref(null)

  function documentsPath(companyId, employeeId) {
    return `${BASE}/user/companies/${companyId}/employees/${employeeId}/identity-documents/`
  }

  async function fetchDocuments(companyId, employeeId) {
    if (!companyId || !employeeId) return []
    fetching.value = true
    try {
      const response = await api.get(documentsPath(companyId, employeeId))
      return unwrapIdentityDocumentList(response.data).map(normaliseIdentityDocument)
    } finally {
      fetching.value = false
    }
  }

  /**
   * Create or replace a document. `body` is built by `identityDocumentBody()`,
   * which chooses multipart only when an attachment is present.
   */
  async function saveDocument(companyId, employeeId, body) {
    if (!companyId || !employeeId) throw new Error('No employee selected')
    saving.value = true
    try {
      const response = await api.post(documentsPath(companyId, employeeId), body)
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function patchDocument(companyId, employeeId, id, payload) {
    if (!companyId || !employeeId || !id) throw new Error('No document selected')
    savingId.value = id
    try {
      const response = await api.patch(`${documentsPath(companyId, employeeId)}${id}/`, payload)
      return response.data
    } finally {
      savingId.value = null
    }
  }

  return {
    fetching,
    saving,
    savingId,
    fetchDocuments,
    saveDocument,
    patchDocument,
  }
}
