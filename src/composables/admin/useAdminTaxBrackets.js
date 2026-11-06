import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { sameId } from 'src/composables/utils/contributionSettings'
import {
  normalizeTaxBrackets,
  sortTaxBrackets,
  taxBracketPayload,
  validateTaxBracketForm,
} from 'src/composables/utils/taxBrackets'

/**
 * Withholding tax brackets for the active company.
 *
 *   GET    /payroll/admin/tax-brackets/?company=<company_id>
 *   POST   /payroll/admin/tax-brackets/?company=<company_id>
 *   PATCH  /payroll/admin/tax-brackets/<pk>/?company=<company_id>
 *   DELETE /payroll/admin/tax-brackets/<pk>/?company=<company_id>
 *
 * The current endpoint scopes the collection by query parameter — the proposed
 * path-kwarg routes are not implemented, so no path here carries the company on
 * top of the resource path.
 *
 * A bracket carries no `is_active` flag, so it is retired by deletion only and
 * the row menu offers Edit and Delete and nothing else.
 */
export function useAdminTaxBrackets() {
  const toast = useToast()
  const { companyId } = useCompany()

  const brackets = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const listGuard = createRequestToken()

  watch(companyId, () => {
    // Invalidate an in-flight response even if nothing re-fetches: its rows
    // belong to the workspace that was active when it was sent.
    listGuard.next()
    brackets.value = []
  })

  function collectionPath() {
    return `/payroll/admin/tax-brackets/?company=${companyId.value}`
  }

  function memberPath(id) {
    return `/payroll/admin/tax-brackets/${id}/?company=${companyId.value}`
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchTaxBrackets() {
    if (!companyId.value) {
      brackets.value = []
      loading.value = false
      return []
    }
    const token = listGuard.next()
    const askedFor = String(companyId.value)
    loading.value = true
    try {
      const response = await api.get(collectionPath())
      if (!listGuard.isCurrent(token)) return brackets.value
      brackets.value = sortTaxBrackets(
        normalizeTaxBrackets(response.data).filter(
          (bracket) => bracket.companyId == null || String(bracket.companyId) === askedFor,
        ),
      )
      return brackets.value
    } catch (error) {
      console.error('Error fetching withholding tax brackets:', error)
      if (listGuard.isCurrent(token)) {
        brackets.value = []
        toast.error(extractErrorMessage(error, 'Failed to load withholding tax brackets'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  function taxBracketById(id) {
    return brackets.value.find((bracket) => String(bracket.id) === String(id)) || null
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  /**
   * Create or update one bracket, from the dialog's draft.
   *
   * @param {object} draft the form as it now stands.
   * @param {object|null} bracket the loaded row being edited, or null to create.
   * @returns {Promise<boolean>} whether it was saved, so the panel closes the
   *   dialog only on success rather than guessing from a changed row count.
   */
  async function saveTaxBracket(draft, bracket = null) {
    const invalid = validateTaxBracketForm(draft)
    if (invalid) {
      toast.warning(invalid)
      return false
    }

    const editing = bracket?.id != null
    if (editing && !sameId(bracket.id, draft?.id)) {
      // The row and the form drifted apart — a list refreshed under an open
      // dialog can do that. Writing the draft's id would edit a different row.
      toast.error('That tax bracket changed while the form was open. Reopen it and try again.')
      return false
    }
    if (!editing && !companyId.value) {
      toast.error('Please select a company first')
      return false
    }

    saving.value = true
    try {
      if (editing) {
        await api.patch(memberPath(bracket.id), taxBracketPayload(draft, { companyId: companyId.value }))
        toast.success('Tax bracket updated')
      } else {
        await api.post(collectionPath(), taxBracketPayload(draft, { companyId: companyId.value }))
        toast.success('Tax bracket created')
      }
      await fetchTaxBrackets()
      return true
    } catch (error) {
      console.error('Error saving withholding tax bracket:', error)
      toast.error(extractErrorMessage(error, 'Failed to save withholding tax bracket'), {
        timeout: 6000,
      })
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  /** The write only; the `ConfirmDialog` in the panel asks the question. */
  async function deleteTaxBracket(bracket) {
    if (bracket?.id == null) {
      toast.error('That tax bracket could not be found any more')
      return false
    }

    saving.value = true
    try {
      await api.delete(memberPath(bracket.id))
      toast.success('Tax bracket deleted')
      await fetchTaxBrackets()
      return true
    } catch (error) {
      console.error('Error deleting withholding tax bracket:', error)
      toast.error(extractErrorMessage(error, 'Failed to delete withholding tax bracket'), {
        timeout: 8000,
      })
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    brackets,
    loading,
    saving,
    fetchTaxBrackets,
    taxBracketById,
    saveTaxBracket,
    deleteTaxBracket,
  }
}
