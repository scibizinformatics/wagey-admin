import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  contributionTypePayload,
  normalizeContributionTypes,
  validateContributionTypeForm,
} from 'src/composables/utils/contributionSettings'

/**
 * Contribution types for the active company — the schemes a bracket belongs to.
 *
 *   GET    /payroll/contributions/types/{company_id}/
 *   POST   /payroll/contributions/types/{company_id}/
 *   PATCH  /payroll/contributions/types/{company_id}/{id}/
 *   DELETE /payroll/contributions/types/{company_id}/{id}/
 *
 * Unlike a bracket, a type carries no `is_active`: the only way to retire one is
 * to delete it, which is why the panel asks through the shared confirm. A type
 * that still has brackets filed under it is refused by the server rather than
 * cascaded here — deleting a scheme must not silently take its brackets with it
 * on a screen that never showed them.
 *
 * The list is keyed by company and the rows are checked against the company
 * that was asked for before they are published, as the holiday-type and audit
 * composables do: an endpoint that ignores the id in its path would otherwise
 * fill this table with another workspace's schemes.
 */
export function useAdminContributionTypes() {
  const toast = useToast()
  const { companyId } = useCompany()

  const contributionTypes = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const listGuard = createRequestToken()

  watch(companyId, () => {
    // Invalidate an in-flight response even if nothing re-fetches: its rows
    // belong to the workspace that was active when it was sent.
    listGuard.next()
    contributionTypes.value = []
  })

  function collectionPath() {
    return `/payroll/contributions/types/${companyId.value}/`
  }

  function memberPath(id) {
    return `/payroll/contributions/types/${companyId.value}/${id}/`
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchContributionTypes() {
    if (!companyId.value) {
      contributionTypes.value = []
      loading.value = false
      return []
    }
    const token = listGuard.next()
    const askedFor = String(companyId.value)
    loading.value = true
    try {
      const response = await api.get(collectionPath())
      if (!listGuard.isCurrent(token)) return contributionTypes.value
      contributionTypes.value = normalizeContributionTypes(response.data).filter(
        (type) => type.companyId == null || String(type.companyId) === askedFor,
      )
      return contributionTypes.value
    } catch (error) {
      console.error('Error fetching contribution types:', error)
      if (listGuard.isCurrent(token)) {
        contributionTypes.value = []
        toast.error(extractErrorMessage(error, 'Failed to load contribution types'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  function contributionTypeById(id) {
    return contributionTypes.value.find((type) => String(type.id) === String(id)) || null
  }

  // ─── Writes ────────────────────────────────────────────────────────────────

  async function createContributionType(form) {
    const invalid = validateContributionTypeForm(form)
    if (invalid) {
      toast.warning(invalid)
      return false
    }
    if (!companyId.value) {
      toast.error('Please select a company first')
      return false
    }

    saving.value = true
    try {
      await api.post(collectionPath(), {
        ...contributionTypePayload(form),
        company: companyId.value,
      })
      toast.success('Contribution type created')
      await fetchContributionTypes()
      return true
    } catch (error) {
      console.error('Error creating contribution type:', error)
      toast.error(extractErrorMessage(error, 'Failed to save contribution type'), {
        timeout: 6000,
      })
      return false
    } finally {
      saving.value = false
    }
  }

  async function updateContributionType(type, form) {
    const invalid = validateContributionTypeForm(form)
    if (invalid) {
      toast.warning(invalid)
      return false
    }
    if (type?.id == null) {
      toast.error('That contribution type could not be found any more')
      return false
    }

    saving.value = true
    try {
      await api.patch(memberPath(type.id), contributionTypePayload(form))
      toast.success('Contribution type updated')
      await fetchContributionTypes()
      return true
    } catch (error) {
      console.error('Error updating contribution type:', error)
      toast.error(extractErrorMessage(error, 'Failed to save contribution type'), {
        timeout: 6000,
      })
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * The write only. The question is asked by the panel's `ConfirmDialog`, so the
   * wording and the freeze both live where the table can also see them.
   */
  async function deleteContributionType(type) {
    if (type?.id == null) {
      toast.error('That contribution type could not be found any more')
      return false
    }

    saving.value = true
    try {
      await api.delete(memberPath(type.id))
      toast.success('Contribution type deleted')
      // Unconditional, after the toast: a write that reported failure may still
      // have landed, and a stale row is the worse of the two mistakes.
      await fetchContributionTypes()
      return true
    } catch (error) {
      console.error('Error deleting contribution type:', error)
      toast.error(extractErrorMessage(error, 'Failed to delete contribution type'), {
        timeout: 8000,
      })
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    contributionTypes,
    loading,
    saving,
    fetchContributionTypes,
    contributionTypeById,
    createContributionType,
    updateContributionType,
    deleteContributionType,
  }
}
