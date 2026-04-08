import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function useAdminShifts() {
  const $q = useQuasar()
  const { companyId } = useCompany()

  const shifts = ref([])
  const shiftTypes = ref([])
  const shiftTemplates = ref([])
  const recurringSchedules = ref([])

  const loading = ref(false)
  const saving = ref(false)
  const loadingRecurring = ref(false)
  const savingRecurring = ref(false)

  // ─── Shift dialog state ────────────────────────────────────────────────────
  const shiftDialog = ref(false)
  const editingShift = ref(false)
  const shiftForm = ref(_emptyShiftForm())

  // ─── Recurring dialog state ────────────────────────────────────────────────
  const recurringDialog = ref(false)
  const editingRecurring = ref(false)
  const recurringForm = ref(_emptyRecurringForm())

  const weekdayOptions = [
    { label: 'Monday', value: 'Mon' },
    { label: 'Tuesday', value: 'Tue' },
    { label: 'Wednesday', value: 'Wed' },
    { label: 'Thursday', value: 'Thu' },
    { label: 'Friday', value: 'Fri' },
    { label: 'Saturday', value: 'Sat' },
    { label: 'Sunday', value: 'Sun' },
  ]

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function _emptyShiftForm(cId = null) {
    return {
      id: null,
      name: '',
      company: cId,
      description: '',
      default_start_time: '',
      default_end_time: '',
      is_graveyard: false,
      apply_night_differential: false,
      is_off: false,
      is_extended: false,
    }
  }

  function _emptyRecurringForm() {
    return {
      id: null,
      name: '',
      site_id: null,
      is_active: true,
      rules: [{ weekday: null, shift_type_ids: [] }],
    }
  }

  function formatTime(timeString) {
    if (!timeString) return 'N/A'
    try {
      const [hours, minutes] = timeString.split(':')
      const hour = parseInt(hours)
      const period = hour >= 12 ? 'PM' : 'AM'
      const display = hour % 12 || 12
      return `${String(display).padStart(2, '0')}:${String(parseInt(minutes)).padStart(2, '0')} ${period}`
    } catch {
      return timeString
    }
  }

  function extractTime(t) {
    if (!t) return ''
    try {
      const parts = t.split(':')
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
    } catch {
      return ''
    }
  }

  function formatWeekdays(weekdays) {
    if (!weekdays) return 'N/A'
    let days = weekdays
    if (typeof days === 'string') {
      const t = days.trim()
      if (t.startsWith('[')) {
        try {
          days = JSON.parse(t)
        } catch {
          days = t.split(',')
        }
      } else {
        days = t.split(',')
      }
    }
    if (!Array.isArray(days) || days.length === 0) return 'N/A'
    const map = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun',
    }
    return days.map((d) => map[d.trim().toLowerCase()] || d.trim()).join(', ')
  }

  // ─── Fetch shifts ──────────────────────────────────────────────────────────

  async function fetchShifts() {
    if (!companyId.value) {
      shifts.value = []
      return
    }
    loading.value = true
    try {
      const response = await api.get(`${BASE}/organization/shift-types/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      shifts.value = response.data.data ?? response.data ?? []
      shiftTypes.value = shifts.value
      shiftTemplates.value = shifts.value
      return shifts.value
    } catch (error) {
      console.error('Error fetching shifts:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load shifts',
        position: 'top',
      })
    } finally {
      loading.value = false
    }
  }

  // ─── Fetch shift templates (reuses shift-types data) ──────────────────────

  async function fetchShiftTemplates() {
    if (shifts.value.length) {
      shiftTemplates.value = shifts.value
      return shiftTemplates.value
    }
    await fetchShifts()
  }

  // ─── Shift dialog helpers ──────────────────────────────────────────────────

  function openShiftDialog() {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }
    editingShift.value = false
    shiftForm.value = _emptyShiftForm(companyId.value)
    shiftDialog.value = true
  }

  function openEditShiftDialog(shift) {
    editingShift.value = true
    shiftForm.value = {
      id: shift.id,
      name: shift.name,
      company: shift.company || companyId.value,
      description: shift.description || '',
      default_start_time: extractTime(shift.default_start_time),
      default_end_time: extractTime(shift.default_end_time),
      is_graveyard: shift.is_graveyard || false,
      apply_night_differential: shift.apply_night_differential || false,
      is_off: shift.is_off || false,
      is_extended: shift.is_extended || false,
    }
    shiftDialog.value = true
  }

  async function saveShift() {
    if (
      !shiftForm.value.name.trim() ||
      !shiftForm.value.default_start_time ||
      !shiftForm.value.default_end_time
    ) {
      $q.notify({ type: 'negative', message: 'Please fill all required fields', position: 'top' })
      return
    }
    const cId = shiftForm.value.company || companyId.value
    if (!cId) {
      $q.notify({ type: 'negative', message: 'Company ID is required', position: 'top' })
      return
    }

    saving.value = true
    try {
      const fmt = (t) => {
        const [h, m] = t.split(':')
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`
      }
      const payload = {
        name: shiftForm.value.name.trim(),
        company: parseInt(cId),
        description: shiftForm.value.description || '',
        default_start_time: fmt(shiftForm.value.default_start_time),
        default_end_time: fmt(shiftForm.value.default_end_time),
        is_graveyard: Boolean(shiftForm.value.is_graveyard),
        apply_night_differential: Boolean(shiftForm.value.apply_night_differential),
        is_off: Boolean(shiftForm.value.is_off),
        is_extended: Boolean(shiftForm.value.is_extended),
      }

      if (editingShift.value) {
        await api.put(`${BASE}/organization/shift-types/${shiftForm.value.id}/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Shift updated successfully' })
      } else {
        await api.post(`${BASE}/organization/shift-types/`, payload, { headers: authHeaders() })
        $q.notify({ type: 'positive', message: 'Shift created successfully' })
      }

      shiftDialog.value = false
      await fetchShifts()
    } catch (error) {
      console.error('Error saving shift:', error)
      let errorMessage = 'Failed to save shift'
      if (error.response?.data && typeof error.response.data === 'object') {
        const errors = Object.entries(error.response.data).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`,
        )
        if (errors.length) errorMessage = errors.join(' | ')
      } else if (error.response?.data?.message) errorMessage = error.response.data.message
      $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 5000 })
    } finally {
      saving.value = false
    }
  }

  async function deleteShift(shift) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${shift.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/shift-types/${shift.id}/`, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Shift deleted successfully' })
        await fetchShifts()
      } catch (error) {
        console.error('Error deleting shift:', error)
        $q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to delete shift',
          position: 'top',
        })
      }
    })
  }

  // ─── Fetch recurring ───────────────────────────────────────────────────────

  async function fetchRecurringSchedules() {
    if (!companyId.value) {
      recurringSchedules.value = []
      return
    }
    loadingRecurring.value = true
    try {
      const response = await api.get(`${BASE}/organization/recurring-schedules/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      console.log('[fetchRecurringSchedules] raw response:', response.data)
      recurringSchedules.value = (response.data.data ?? response.data ?? []).map((s) => {
        if (Array.isArray(s.rules)) return s

        const weekdays = _parseWeekdayString(s.weekdays)
        const rule = {
          id: s.id,
          weekday: weekdays[0] ?? null,
          shift_type_ids: s.shift_type ? [s.shift_type] : [],
        }
        return { ...s, rules: [rule] }
      })
      console.log(
        '[fetchRecurringSchedules] mapped recurringSchedules:',
        JSON.stringify(recurringSchedules.value, null, 2),
      )
      return recurringSchedules.value
    } catch (error) {
      console.error('[fetchRecurringSchedules] Error:', error)
      console.error('[fetchRecurringSchedules] Error response:', error.response?.data)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load recurring schedules',
        position: 'top',
      })
    } finally {
      loadingRecurring.value = false
    }
  }

  // ─── Recurring dialog helpers ──────────────────────────────────────────────

  function openRecurringDialog() {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }
    editingRecurring.value = false
    recurringForm.value = _emptyRecurringForm()
    recurringDialog.value = true
  }
  function openEditRecurringDialog(row) {
    console.log('[openEditRecurringDialog] raw row data:', JSON.stringify(row, null, 2))
    editingRecurring.value = true

    let rules
    if (Array.isArray(row.rules) && row.rules.length) {
      // New nested shape: rules already present
      rules = row.rules.map((r) => ({
        weekday: r.weekday ?? null,
        shift_type_ids: Array.isArray(r.shift_type_ids)
          ? r.shift_type_ids
          : r.shift_template
            ? [r.shift_template]
            : [],
      }))
    } else {
      const weekdays = _parseWeekdayString(row.weekdays)
      rules = weekdays.length
        ? weekdays.map((wd) => ({
            weekday: wd,
            shift_type_ids: row.shift_type ? [row.shift_type] : [],
          }))
        : [{ weekday: null, shift_type_ids: [] }]
    }

    recurringForm.value = {
      id: row.id,
      name: row.name,
      site_id: row.site_id ?? null,
      is_active: row.is_active ?? true,
      rules,
    }

    console.log(
      '[openEditRecurringDialog] mapped recurringForm:',
      JSON.stringify(recurringForm.value, null, 2),
    )
    recurringDialog.value = true
  }

  // FIX: build payload from `rules` array; validate before sending
  async function saveRecurringSchedule() {
    console.log(
      '[saveRecurringSchedule] recurringForm state:',
      JSON.stringify(recurringForm.value, null, 2),
    )

    if (!recurringForm.value.name?.trim()) {
      $q.notify({ type: 'warning', message: 'Schedule name is required', position: 'top' })
      return
    }

    const rules = recurringForm.value.rules ?? []
    const incomplete = rules.some((r) => !r.weekday || !r.shift_type_ids?.length)
    if (!rules.length || incomplete) {
      console.warn('[saveRecurringSchedule] Validation failed — incomplete rules:', rules)
      $q.notify({
        type: 'warning',
        message: 'Every rule must have a weekday and at least one shift type selected',
        position: 'top',
      })
      return
    }

    const weekdayFullName = {
      Mon: 'monday',
      Tue: 'tuesday',
      Wed: 'wednesday',
      Thu: 'thursday',
      Fri: 'friday',
      Sat: 'saturday',
      Sun: 'sunday',
    }

    const payload = {
      name: recurringForm.value.name.trim(),
      company: parseInt(companyId.value),
      site_id: recurringForm.value.site_id ? parseInt(recurringForm.value.site_id) : null,
      is_active: recurringForm.value.is_active ?? true,
      rules: rules.map((r) => ({
        weekday: weekdayFullName[r.weekday] ?? r.weekday.toLowerCase(),
        shift_type_ids: r.shift_type_ids.map((id) => parseInt(id)),
      })),
    }

    console.log('[saveRecurringSchedule] payload to send:', JSON.stringify(payload, null, 2))

    savingRecurring.value = true
    try {
      let response
      if (editingRecurring.value) {
        console.log(
          `[saveRecurringSchedule] PUT /organization/recurring-schedules/${recurringForm.value.id}/`,
        )
        response = await api.put(
          `${BASE}/organization/recurring-schedules/${recurringForm.value.id}/`,
          payload,
          { headers: authHeaders() },
        )
        console.log('[saveRecurringSchedule] PUT response:', response.data)
        $q.notify({ type: 'positive', message: 'Recurring schedule updated successfully' })
      } else {
        console.log('[saveRecurringSchedule] POST /organization/recurring-schedules/')
        response = await api.post(`${BASE}/organization/recurring-schedules/`, payload, {
          headers: authHeaders(),
        })
        console.log('[saveRecurringSchedule] POST response:', response.data)
        $q.notify({ type: 'positive', message: 'Recurring schedule created successfully' })
      }
      recurringDialog.value = false
      await fetchRecurringSchedules()
    } catch (error) {
      console.error('[saveRecurringSchedule] Error:', error)
      console.error('[saveRecurringSchedule] Error response data:', error.response?.data)
      let errorMessage = 'Failed to save recurring schedule'
      if (error.response?.data && typeof error.response.data === 'object') {
        const errors = Object.entries(error.response.data).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`,
        )
        if (errors.length) errorMessage = errors.join(' | ')
      } else if (error.response?.data?.message) errorMessage = error.response.data.message
      $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 5000 })
    } finally {
      savingRecurring.value = false
    }
  }

  async function deleteRecurring(schedule) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${schedule.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/recurring-schedules/${schedule.id}/`, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Recurring schedule deleted successfully' })
        await fetchRecurringSchedules()
      } catch (error) {
        console.error('Error deleting recurring schedule:', error)
        $q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to delete recurring schedule',
        })
      }
    })
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  function _parseWeekdayString(wd) {
    if (!wd) return []
    let days = wd
    if (typeof days === 'string') {
      const t = days.trim()
      days = t.startsWith('[')
        ? (() => {
            try {
              return JSON.parse(t)
            } catch {
              return t.split(',')
            }
          })()
        : t.split(',')
    }
    const map = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun',
    }
    return Array.isArray(days) ? days.map((d) => map[d.trim().toLowerCase()] || d.trim()) : []
  }

  return {
    shifts,
    shiftTypes,
    shiftTemplates,
    recurringSchedules,
    loading,
    saving,
    loadingRecurring,
    savingRecurring,
    shiftDialog,
    editingShift,
    shiftForm,
    recurringDialog,
    editingRecurring,
    recurringForm,
    weekdayOptions,
    formatTime,
    extractTime,
    formatWeekdays,
    fetchShifts,
    fetchShiftTemplates,
    openShiftDialog,
    openEditShiftDialog,
    saveShift,
    deleteShift,
    fetchRecurringSchedules,
    openRecurringDialog,
    openEditRecurringDialog,
    saveRecurringSchedule,
    deleteRecurring,
  }
}
