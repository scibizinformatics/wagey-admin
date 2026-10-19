import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useToast } from 'src/composables/useToast'
import { extractErrorMessage } from 'src/composables/utils/http'
import {
  holidayPayload,
  holidayUpdatePayload,
  normalizeHolidays,
  validateHolidayForm,
} from 'src/composables/utils/holidays'
import { createRequestToken } from 'src/composables/utils/requestToken'

/**
 * The dated holidays for the active company, and the dialog that adds or edits
 * one.
 *
 *   GET    /attendance/holidays/company/{company_id}/
 *   POST   /attendance/holidays/company/{company_id}/
 *   PATCH  /attendance/holidays/{id}/
 *   DELETE /attendance/holidays/{id}/
 *
 * The update is a **PATCH**, not the PUT beside it. A partial body is what
 * "leave `is_paid` alone" means; a PUT would have to echo back the fields the
 * server owns — `created_at`, `updated_at` and the two it derives — which is a
 * client rewriting server state it never read correctly in the first place.
 *
 * The company is resolved per call, never captured when the dialog opened — a
 * workspace switch between the two would otherwise write a holiday into the
 * previous one, which is the one mistake here that costs a stranger their
 * calendar.
 */
export function useAdminHolidays() {
  const toast = useToast()
  const { companyId } = useCompany()

  const holidays = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const dialog = ref(false)
  const editing = ref(false)
  /** The row being edited, and the one `saveHoliday` PATCHes. */
  const editingHoliday = ref(null)

  const listGuard = createRequestToken()

  // Ids from the previous workspace mean nothing in the next one.
  watch(companyId, () => {
    holidays.value = []
    dialog.value = false
    editing.value = false
    editingHoliday.value = null
  })

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchHolidays() {
    if (!companyId.value) {
      holidays.value = []
      return []
    }
    const token = listGuard.next()
    const askedFor = String(companyId.value)
    loading.value = true
    try {
      const response = await api.get(`/attendance/holidays/company/${companyId.value}/`)
      if (!listGuard.isCurrent(token)) return holidays.value
      const rows = normalizeHolidays(response.data)
      // The company is in the path, but a row that names another one would mean
      // the list is not scoped the way it was asked for. Drop it rather than
      // showing another workspace's calendar — the same defence
      // `useAdminHolidayTypes` applies.
      holidays.value = rows.filter(
        (holiday) => holiday.companyId == null || String(holiday.companyId) === askedFor,
      )
      return holidays.value
    } catch (error) {
      console.error('Error fetching holidays:', error)
      if (listGuard.isCurrent(token)) {
        holidays.value = []
        toast.error(extractErrorMessage(error, 'Failed to load holidays'))
      }
      return []
    } finally {
      if (listGuard.isCurrent(token)) loading.value = false
    }
  }

  // ─── Dialog ────────────────────────────────────────────────────────────────

  /**
   * The create half. `useAdminHolidayTypes` splits the same way — a bare
   * `openDialog` for add, `openEditDialog` for edit — so the two panels in this
   * group read alike.
   */
  function openDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
      return
    }
    editing.value = false
    editingHoliday.value = null
    dialog.value = true
  }

  function openEditDialog(holiday) {
    if (!holiday) return
    editing.value = true
    // The row itself, not a snapshot: the dialog reads it for its initial
    // values, and `saveHoliday` reads its id. Both go stale together if the list
    // is refetched underneath, which is the same staleness the list itself has.
    editingHoliday.value = holiday
    dialog.value = true
  }

  // ─── Create / update ───────────────────────────────────────────────────────

  /**
   * @param {object} form - as `emptyHolidayForm` / `holidayToForm` return it.
   *   Validated here rather than left to the server, so an incomplete holiday is
   *   named before it is sent. The same rules apply to an edit: a holiday that
   *   could not be created cannot be corrected either.
   * @returns {Promise<boolean>} whether the holiday was saved.
   */
  async function saveHoliday(form) {
    const invalid = validateHolidayForm(form)
    if (invalid) {
      toast.warning(invalid)
      return false
    }
    if (!companyId.value) {
      toast.error('Please select a company first')
      return false
    }
    // Editing is addressed by the row's own id, so an id that went missing means
    // there is nothing to write to — worth saying rather than patching `/null/`.
    if (editing.value && editingHoliday.value?.id == null) {
      toast.error('That holiday could not be found any more')
      return false
    }

    const wasEditing = editing.value
    saving.value = true
    try {
      if (wasEditing) {
        await api.patch(
          `/attendance/holidays/${editingHoliday.value.id}/`,
          holidayUpdatePayload(form),
        )
        toast.success('Holiday updated')
      } else {
        await api.post(
          `/attendance/holidays/company/${companyId.value}/`,
          holidayPayload(form, companyId.value),
        )
        toast.success('Holiday added')
      }
      dialog.value = false
      // Re-read rather than patch the row in place: the server owns `is_paid` and
      // recomputes it when `holiday_type` moves, so anything written back from
      // the submitted form would be a guess that outlives this one call.
      await fetchHolidays()
      return true
    } catch (error) {
      console.error(wasEditing ? 'Error updating holiday:' : 'Error adding holiday:', error)
      toast.error(
        extractErrorMessage(
          error,
          wasEditing ? 'Failed to update holiday' : 'Failed to add holiday',
        ),
        { timeout: 6000 },
      )
      return false
    } finally {
      saving.value = false
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  /**
   * The confirmed delete — the write only.
   *
   * The question is asked by the panel's `ConfirmDialog`, which owns the wording
   * (`holidayConfirm.js`) and the freeze, so this no longer opens a dialog of its
   * own: that host is the one that renders the shared chrome, and a second one
   * here would have meant Quasar's stock box on a branded page.
   *
   * @param {object} holiday - the row the confirmation was opened over
   * @returns {Promise<boolean>} whether it was deleted.
   */
  async function deleteHoliday(holiday) {
    if (holiday?.id == null) {
      toast.error('That holiday could not be found any more')
      return false
    }
    try {
      await api.delete(`/attendance/holidays/${holiday.id}/`)
      toast.success('Holiday deleted')
      // Unconditional, after the toast: a delete that reported failure may still
      // have landed, and the list is the only thing that can say what is left.
      await fetchHolidays()
      return true
    } catch (error) {
      console.error('Error deleting holiday:', error)
      toast.error(extractErrorMessage(error, 'Failed to delete holiday'))
      return false
    }
  }

  return {
    holidays,
    loading,
    saving,
    dialog,
    editing,
    editingHoliday,
    fetchHolidays,
    openDialog,
    openEditDialog,
    saveHoliday,
    deleteHoliday,
  }
}
