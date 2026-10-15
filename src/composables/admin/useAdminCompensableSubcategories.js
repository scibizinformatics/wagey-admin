import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  normalizeSubcategories,
  subcategoryPayload,
  subcategoryToForm,
} from 'src/composables/utils/compensableTime'

/**
 * The subcategories belonging to one compensable time category.
 *
 *   GET   /compensable_time/subcategories/category/{category_id}/
 *   POST  /compensable_time/subcategories/category/{category_id}/create/
 *   PATCH /compensable_time/subcategories/{id}/update/
 *
 * Separate from `useAdminCompensableCategories` for the same reason
 * `useAdminLeavePolicies` is separate from `useAdminLeaveTypes`: it is a
 * sub-resource with its own endpoints, and the list it fetches is keyed by
 * **category** rather than by company — the category is already company-scoped,
 * so the guard here is against a stale *category*, not a stale company. The
 * rows are still dropped when the workspace changes, since category ids do not
 * carry across.
 *
 * Like the categories, the API documents **no delete**. Deactivation is the
 * documented way to stop something being offered, and it is reversible, so it
 * carries no confirm gate.
 *
 * `default_allowance_types` rides on every write as an array, including an
 * empty one — see `subcategoryPayload`.
 */
export function useAdminCompensableSubcategories() {
  const toast = useToast()
  const { companyId } = useCompany()

  /** Normalized subcategories for the category named by `loadedCategoryId`. */
  const subcategories = ref([])
  const loadedCategoryId = ref(null)
  const loading = ref(false)
  const saving = ref(false)

  const listGuard = createRequestToken()

  watch(companyId, () => {
    subcategories.value = []
    loadedCategoryId.value = null
  })

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchSubcategories(categoryId) {
    if (categoryId == null) {
      subcategories.value = []
      loadedCategoryId.value = null
      return []
    }
    const token = listGuard.next()
    loading.value = true
    try {
      const response = await api.get(`/compensable_time/subcategories/category/${categoryId}/`)
      if (!listGuard.isCurrent(token)) return subcategories.value
      subcategories.value = normalizeSubcategories(response.data)
      loadedCategoryId.value = categoryId
      return subcategories.value
    } catch (error) {
      console.error(`Error fetching subcategories for category ${categoryId}:`, error)
      if (listGuard.isCurrent(token)) {
        subcategories.value = []
        loadedCategoryId.value = categoryId
        toast.error(extractErrorMessage(error, 'Failed to load subcategories'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  /**
   * Add a subcategory to a category.
   *
   * @returns {Promise<boolean>} whether it was saved, so the dialog knows to
   *   reset its form rather than guessing from a changed list length.
   */
  async function createSubcategory(categoryId, draft) {
    if (!draft?.name?.trim()) {
      toast.error('Subcategory name is required')
      return false
    }
    if (categoryId == null) {
      toast.error('No category selected')
      return false
    }

    saving.value = true
    try {
      await api.post(
        `/compensable_time/subcategories/category/${categoryId}/create/`,
        subcategoryPayload(draft),
      )
      toast.success('Subcategory created')
      await fetchSubcategories(categoryId)
      return true
    } catch (error) {
      console.error('Error creating compensable subcategory:', error)
      toast.error(extractErrorMessage(error, 'Failed to save subcategory'), { timeout: 6000 })
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  /**
   * @param {object} subcategory the loaded row being edited, for its id.
   * @param {object} draft the form as it now stands.
   */
  async function updateSubcategory(subcategory, draft) {
    if (subcategory?.id == null) {
      toast.error('No subcategory selected')
      return false
    }
    if (!draft?.name?.trim()) {
      toast.error('Subcategory name is required')
      return false
    }

    saving.value = true
    try {
      await api.patch(
        `/compensable_time/subcategories/${subcategory.id}/update/`,
        subcategoryPayload(draft, { includeId: true }),
      )
      toast.success('Subcategory updated')
      await fetchSubcategories(loadedCategoryId.value)
      return true
    } catch (error) {
      console.error('Error updating compensable subcategory:', error)
      toast.error(extractErrorMessage(error, 'Failed to save subcategory'), { timeout: 6000 })
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Flip a subcategory's availability, through the same endpoint and the same
   * body as the form.
   *
   * Unlike a category, which this does not check the payload for, a
   * subcategory's re-read is keyed by the category it was last loaded for — so
   * this refuses to write when that is not known rather than re-fetching
   * nothing and reporting success against a list that never changed.
   */
  async function setSubcategoryActive(subcategory, isActive) {
    const categoryId = loadedCategoryId.value
    if (categoryId == null) {
      toast.error('No category selected')
      return false
    }

    saving.value = true
    try {
      await api.patch(
        `/compensable_time/subcategories/${subcategory.id}/update/`,
        subcategoryPayload(
          { ...subcategoryToForm(subcategory), is_active: isActive },
          { includeId: true },
        ),
      )
      toast.success(isActive ? 'Subcategory activated' : 'Subcategory deactivated')
      await fetchSubcategories(categoryId)
      return true
    } catch (error) {
      console.error('Error updating compensable subcategory:', error)
      toast.error(extractErrorMessage(error, 'Failed to update subcategory'))
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    subcategories,
    loadedCategoryId,
    loading,
    saving,
    fetchSubcategories,
    createSubcategory,
    updateSubcategory,
    setSubcategoryActive,
  }
}
