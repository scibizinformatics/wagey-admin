import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import {
  categoryPayload,
  categoryToForm,
  emptyCategoryForm,
  normalizeCategories,
} from 'src/composables/utils/compensableTime'

/**
 * Compensable time categories for the active company, and the dialog that edits
 * one.
 *
 *   GET   /compensable_time/categories/company/{company_id}/
 *   POST  /compensable_time/categories/company/{company_id}/create/
 *   PATCH /compensable_time/categories/{id}/update/
 *
 * Both routes take the company in the **path**, so there is no filter that can
 * be dropped and answer with another workspace's categories. Company is
 * resolved per request from the reactive `companyId`, and the rows are cleared
 * when it changes — ids from the previous workspace mean nothing in the next
 * one.
 *
 * The API documents **no delete** for a category, so none is offered: there is
 * nothing to confirm and no endpoint to confirm it against. A category that
 * should stop being offered is deactivated, which `is_active` carries and
 * which the update endpoint documents.
 *
 * The subcategories are a separate sub-resource with their own endpoints and
 * their own composable — see `useAdminCompensableSubcategories`.
 */
export function useAdminCompensableCategories() {
  const toast = useToast()
  const { companyId } = useCompany()

  const categories = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  const form = ref(emptyCategoryForm())

  const listGuard = createRequestToken()

  watch(companyId, () => {
    categories.value = []
  })

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchCategories() {
    if (!companyId.value) {
      categories.value = []
      return []
    }
    const token = listGuard.next()
    loading.value = true
    try {
      const response = await api.get(`/compensable_time/categories/company/${companyId.value}/`)
      if (!listGuard.isCurrent(token)) return categories.value
      categories.value = normalizeCategories(response.data)
      return categories.value
    } catch (error) {
      console.error('Error fetching compensable categories:', error)
      if (listGuard.isCurrent(token)) {
        categories.value = []
        toast.error(extractErrorMessage(error, 'Failed to load compensable categories'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  /** One category out of the loaded list, so a dialog can re-read it after a write. */
  function categoryById(id) {
    return categories.value.find((category) => String(category.id) === String(id)) || null
  }

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
      return
    }
    editing.value = false
    form.value = emptyCategoryForm()
    dialog.value = true
  }

  function openEditDialog(category) {
    editing.value = true
    form.value = categoryToForm(category)
    dialog.value = true
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveCategory() {
    if (!form.value.name?.trim()) {
      toast.error('Category name is required')
      return false
    }
    if (!companyId.value) {
      toast.error('Please select a company first')
      return false
    }

    saving.value = true
    try {
      if (editing.value) {
        // No `company` on an update: the category already belongs to one, and
        // sending it again is the kind of field a reassignment bug rides in on.
        await api.patch(
          `/compensable_time/categories/${form.value.id}/update/`,
          categoryPayload(form.value, { includeId: true }),
        )
        toast.success('Category updated')
      } else {
        await api.post(
          `/compensable_time/categories/company/${companyId.value}/create/`,
          categoryPayload(form.value),
        )
        toast.success('Category created')
      }
      dialog.value = false
      await fetchCategories()
      return true
    } catch (error) {
      console.error('Error saving compensable category:', error)
      toast.error(extractErrorMessage(error, 'Failed to save compensable category'), {
        timeout: 6000,
      })
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Flip a category's availability without opening the dialog for it.
   *
   * Goes through the same update endpoint and the same body as the form, so the
   * two cannot drift, and the list is re-read either way.
   */
  async function setCategoryActive(category, isActive) {
    saving.value = true
    try {
      await api.patch(
        `/compensable_time/categories/${category.id}/update/`,
        categoryPayload({ ...categoryToForm(category), is_active: isActive }, { includeId: true }),
      )
      toast.success(isActive ? 'Category activated' : 'Category deactivated')
      await fetchCategories()
      return true
    } catch (error) {
      console.error('Error updating compensable category:', error)
      toast.error(extractErrorMessage(error, 'Failed to update compensable category'))
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    categories,
    loading,
    saving,
    dialog,
    editing,
    form,
    fetchCategories,
    categoryById,
    openDialog,
    openEditDialog,
    saveCategory,
    setCategoryActive,
  }
}
