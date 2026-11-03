import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  bracketPayload,
  normalizeContributionBrackets,
  sameId,
  validateBracketForm,
} from 'src/composables/utils/contributionSettings'

/**
 * Contribution components for the active company.
 *
 *   GET    /payroll/contributions/components/{company_id}/
 *   POST   /payroll/contributions/components/{company_id}/
 *   PATCH  /payroll/contributions/components/{company_id}/{id}/
 *   DELETE /payroll/contributions/components/{company_id}/{id}/
 *
 * The endpoint calls a band a "component"; the UI says component too. A
 * component may carry no type — companies set their bands up before the schemes
 * exist — so `type` is nullable and the Type column is where the first type is
 * created. `employee_fixed` / `employee_percent` are the employee's share and
 * `fixed_amount` the employer's; the normaliser in `utils/contributionSettings`
 * is the only place the two vocabularies meet.
 *
 * `is_active` is the reversible way to stop a bracket applying, which is why the
 * row menu offers it beside the delete: a bracket is often retired for one
 * company setup and brought back for another.
 */
export function useAdminContributionBrackets() {
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
    return `/payroll/contributions/components/${companyId.value}/`
  }

  function memberPath(id) {
    return `/payroll/contributions/components/${companyId.value}/${id}/`
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchContributionBrackets() {
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
      brackets.value = normalizeContributionBrackets(response.data).filter(
        (bracket) => bracket.companyId == null || String(bracket.companyId) === askedFor,
      )
      return brackets.value
    } catch (error) {
      console.error('Error fetching contribution components:', error)
      if (listGuard.isCurrent(token)) {
        brackets.value = []
        toast.error(extractErrorMessage(error, 'Failed to load contribution components'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  function contributionBracketById(id) {
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
  async function saveContributionBracket(draft, bracket = null) {
    const invalid = validateBracketForm(draft)
    if (invalid) {
      toast.warning(invalid)
      return false
    }

    const editing = bracket?.id != null
    if (editing && !sameId(bracket.id, draft?.id)) {
      // The row and the form drifted apart — a list refreshed under an open
      // dialog can do that. Writing the draft's id would edit a different row.
      toast.error('That component changed while the form was open. Reopen it and try again.')
      return false
    }
    if (!editing && !companyId.value) {
      toast.error('Please select a company first')
      return false
    }

    saving.value = true
    try {
      if (editing) {
        await api.patch(memberPath(bracket.id), bracketPayload(draft))
        toast.success('Contribution component updated')
      } else {
        await api.post(collectionPath(), bracketPayload(draft, { companyId: companyId.value }))
        toast.success('Contribution component created')
      }
      await fetchContributionBrackets()
      return true
    } catch (error) {
      console.error('Error saving contribution component:', error)
      toast.error(extractErrorMessage(error, 'Failed to save contribution component'), {
        timeout: 6000,
      })
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Toggle ────────────────────────────────────────────────────────────────

  /**
   * Flip whether a bracket applies.
   *
   * A partial PATCH rather than the full body: `is_active` is the only field
   * this intends to change, and a full write would re-send every decimal from a
   * row the admin did not open.
   */
  async function setContributionBracketActive(bracket, isActive) {
    if (bracket?.id == null) {
      toast.error('That contribution component could not be found any more')
      return false
    }

    saving.value = true
    try {
      await api.patch(memberPath(bracket.id), { is_active: isActive })
      toast.success(
        isActive ? 'Contribution component activated' : 'Contribution component deactivated',
      )
      await fetchContributionBrackets()
      return true
    } catch (error) {
      console.error('Error updating contribution component:', error)
      toast.error(extractErrorMessage(error, 'Failed to update contribution component'))
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  /** The write only; the `ConfirmDialog` in the panel asks the question. */
  async function deleteContributionBracket(bracket) {
    if (bracket?.id == null) {
      toast.error('That contribution component could not be found any more')
      return false
    }

    saving.value = true
    try {
      await api.delete(memberPath(bracket.id))
      toast.success('Contribution component deleted')
      await fetchContributionBrackets()
      return true
    } catch (error) {
      console.error('Error deleting contribution component:', error)
      toast.error(extractErrorMessage(error, 'Failed to delete contribution component'), {
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
    fetchContributionBrackets,
    contributionBracketById,
    saveContributionBracket,
    setContributionBracketActive,
    deleteContributionBracket,
  }
}
