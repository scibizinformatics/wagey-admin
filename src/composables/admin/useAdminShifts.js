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
  const shiftTypeTemplates = ref([])
  const weeklyShiftTemplates = ref([])

  const loading = ref(false)
  const saving = ref(false)
  const loadingShiftTypeTemplates = ref(false)
  const savingShiftTypeTemplate = ref(false)
  const loadingWeeklyTemplates = ref(false)
  const savingWeeklyTemplate = ref(false)

  // ─── Shift dialog state ────────────────────────────────────────────────────
  const shiftDialog = ref(false)
  const editingShift = ref(false)
  const shiftForm = ref(_emptyShiftForm())

  // ─── Shift Type Template dialog state ─────────────────────────────────────
  const shiftTypeTemplateDialog = ref(false)
  const editingShiftTypeTemplate = ref(false)
  const shiftTypeTemplateForm = ref(_emptyRecurringForm())

  // ─── Weekly shift template dialog state ───────────────────────────────────
  const weeklyTemplateDialog = ref(false)
  const weeklyTemplateForm = ref(_emptyWeeklyTemplateForm())
  const editingWeeklyTemplate = ref(false)

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
      shift_type_ids: [],
      site_id: null,
      is_active: true,
    }
  }

  function _emptyWeeklyTemplateForm() {
    return {
      id: null,
      name: '',
      company: null,
      rules: [
        { weekday: 'monday', shift_template: null },
        { weekday: 'tuesday', shift_template: null },
        { weekday: 'wednesday', shift_template: null },
        { weekday: 'thursday', shift_template: null },
        { weekday: 'friday', shift_template: null },
        { weekday: 'saturday', shift_template: null },
        { weekday: 'sunday', shift_template: null },
      ],
      is_active: true,
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

  // ─── Fetch weekly shift templates ─────────────────────────────────────────

  async function fetchWeeklyShiftTemplates() {
    if (!companyId.value) {
      weeklyShiftTemplates.value = []
      return
    }
    loadingWeeklyTemplates.value = true
    try {
      const response = await api.get(`${BASE}/organization/recurring-schedules/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      weeklyShiftTemplates.value = (response.data.data ?? response.data ?? []).map((s) => {
        if (Array.isArray(s.rules)) return s
        const weekdays = _parseWeekdayString(s.weekdays)
        const rule = {
          id: s.id,
          weekday: weekdays[0] ?? null,
          shift_template: s.shift_template ?? null,
        }
        return { ...s, rules: [rule] }
      })
      return weeklyShiftTemplates.value
    } catch (error) {
      console.error('Error fetching weekly shift templates:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load shift templates',
        position: 'top',
      })
    } finally {
      loadingWeeklyTemplates.value = false
    }
  }

  // ─── Weekly shift template dialog helpers ─────────────────────────────────

  function openWeeklyTemplateDialog() {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }
    editingWeeklyTemplate.value = false
    weeklyTemplateForm.value = _emptyWeeklyTemplateForm()
    weeklyTemplateForm.value.company = companyId.value
    weeklyTemplateDialog.value = true
  }

  function openEditWeeklyTemplateDialog(row) {
    editingWeeklyTemplate.value = true

    let rules = []
    if (row.rules && Array.isArray(row.rules)) {
      const weekdays = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]
      rules = weekdays.map((day) => {
        const existing = row.rules.find(
          (r) => r.weekday?.toLowerCase() === day || r.weekday === day,
        )
        return existing
          ? {
              weekday: existing.weekday,
              shift_template: existing.shift_template,
            }
          : { weekday: day, shift_template: null }
      })
    } else {
      const weekdays = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]
      rules = weekdays.map((day) => ({
        weekday: day,
        shift_template: null,
      }))
    }

    weeklyTemplateForm.value = {
      id: row.id,
      name: row.name,
      company: row.company || companyId.value,
      rules,
      is_active: row.is_active ?? true,
    }
    weeklyTemplateDialog.value = true
  }

  async function saveWeeklyTemplate() {
    if (!weeklyTemplateForm.value.name?.trim()) {
      $q.notify({ type: 'warning', message: 'Template name is required', position: 'top' })
      return
    }

    const validRules = weeklyTemplateForm.value.rules.filter((r) => r.shift_template)
    if (!validRules.length) {
      $q.notify({
        type: 'warning',
        message: 'Please add at least one shift rule for a day',
        position: 'top',
      })
      return
    }

    const payload = {
      name: weeklyTemplateForm.value.name.trim(),
      company: parseInt(companyId.value),
      rules: validRules.map((r) => ({
        weekday: r.weekday,
        shift_template: r.shift_template ? parseInt(r.shift_template) : null,
      })),
      is_active: weeklyTemplateForm.value.is_active ?? true,
    }

    savingWeeklyTemplate.value = true
    try {
      if (editingWeeklyTemplate.value) {
        await api.put(
          `${BASE}/organization/recurring-schedules/${weeklyTemplateForm.value.id}/`,
          payload,
          { headers: authHeaders() },
        )
        $q.notify({ type: 'positive', message: 'Weekly shift template updated successfully' })
      } else {
        await api.post(`${BASE}/organization/recurring-schedules/`, payload, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Weekly shift template created successfully' })
      }
      weeklyTemplateDialog.value = false
      await fetchWeeklyShiftTemplates()
    } catch (error) {
      console.error('Error saving weekly shift template:', error)
      let errorMessage = 'Failed to save weekly shift template'
      if (error.response?.data && typeof error.response.data === 'object') {
        const errors = Object.entries(error.response.data).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`,
        )
        if (errors.length) errorMessage = errors.join(' | ')
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 5000 })
    } finally {
      savingWeeklyTemplate.value = false
    }
  }

  async function deleteWeeklyTemplate(template) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${template.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/shift-type-templates/${template.id}/`, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Shift template deleted successfully' })
        await fetchWeeklyShiftTemplates()
      } catch (error) {
        console.error('Error deleting weekly shift template:', error)
        $q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to delete shift template',
          position: 'top',
        })
      }
    })
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

  // ─── Fetch shift type templates ────────────────────────────────────────────

  async function fetchShiftTypeTemplates() {
    if (!companyId.value) {
      shiftTypeTemplates.value = []
      return
    }
    loadingShiftTypeTemplates.value = true
    try {
      const response = await api.get(`${BASE}/organization/shift-type-templates-list/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      console.log('[fetchShiftTypeTemplates] raw response:', response.data)
      shiftTypeTemplates.value = response.data.data ?? response.data ?? []
      console.log(
        '[fetchShiftTypeTemplates] mapped shiftTypeTemplates:',
        JSON.stringify(shiftTypeTemplates.value, null, 2),
      )
      return shiftTypeTemplates.value
    } catch (error) {
      console.error('[fetchShiftTypeTemplates] Error:', error)
      console.error('[fetchShiftTypeTemplates] Error response:', error.response?.data)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load shift type templates',
        position: 'top',
      })
    } finally {
      loadingShiftTypeTemplates.value = false
    }
  }

  // ─── Shift Type Template dialog helpers ────────────────────────────────────

  function openShiftTypeTemplateDialog() {
    if (!companyId.value) {
      $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
      return
    }
    editingShiftTypeTemplate.value = false
    shiftTypeTemplateForm.value = _emptyRecurringForm()
    shiftTypeTemplateDialog.value = true
  }
  function openEditShiftTypeTemplateDialog(row) {
    console.log('[openEditShiftTypeTemplateDialog] raw row data:', JSON.stringify(row, null, 2))
    editingShiftTypeTemplate.value = true

    shiftTypeTemplateForm.value = {
      id: row.id,
      name: row.name,
      shift_type_ids: row.shift_type_ids || [],
      site_id: row.site_id ?? null,
      is_active: row.is_active ?? true,
    }

    console.log(
      '[openEditShiftTypeTemplateDialog] mapped shiftTypeTemplateForm:',
      JSON.stringify(shiftTypeTemplateForm.value, null, 2),
    )
    shiftTypeTemplateDialog.value = true
  }

  // FIX: build payload from `rules` array; validate before sending
  async function saveShiftTypeTemplate() {
    console.log(
      '[saveShiftTypeTemplate] shiftTypeTemplateForm state:',
      JSON.stringify(shiftTypeTemplateForm.value, null, 2),
    )

    if (!shiftTypeTemplateForm.value.name?.trim()) {
      $q.notify({ type: 'warning', message: 'Template name is required', position: 'top' })
      return
    }

    if (!shiftTypeTemplateForm.value.shift_type_ids?.length) {
      $q.notify({
        type: 'warning',
        message: 'Please select at least one shift type',
        position: 'top',
      })
      return
    }

    const payload = {
      name: shiftTypeTemplateForm.value.name.trim(),
      company: parseInt(companyId.value),
      shift_type_ids: shiftTypeTemplateForm.value.shift_type_ids.map((id) => parseInt(id)),
      site_id: shiftTypeTemplateForm.value.site_id
        ? parseInt(shiftTypeTemplateForm.value.site_id)
        : null,
      is_active: shiftTypeTemplateForm.value.is_active ?? true,
    }

    console.log('[saveShiftTypeTemplate] payload to send:', JSON.stringify(payload, null, 2))

    savingShiftTypeTemplate.value = true
    try {
      let response
      if (editingShiftTypeTemplate.value) {
        console.log(
          `[saveShiftTypeTemplate] PUT /organization/shift-type-templates/${shiftTypeTemplateForm.value.id}/`,
        )
        response = await api.put(
          `${BASE}/organization/shift-type-templates/${shiftTypeTemplateForm.value.id}/`,
          payload,
          { headers: authHeaders() },
        )
        console.log('[saveShiftTypeTemplate] PUT response:', response.data)
        $q.notify({ type: 'positive', message: 'Shift template updated successfully' })
      } else {
        console.log('[saveShiftTypeTemplate] POST /organization/shift-type-templates/create/')
        response = await api.post(`${BASE}/organization/shift-type-templates/create/`, payload, {
          headers: authHeaders(),
        })
        console.log('[saveShiftTypeTemplate] POST response:', response.data)
        $q.notify({ type: 'positive', message: 'Shift template created successfully' })
      }
      shiftTypeTemplateDialog.value = false
      await fetchShiftTypeTemplates()
    } catch (error) {
      console.error('[saveShiftTypeTemplate] Error:', error)
      console.error('[saveShiftTypeTemplate] Error response data:', error.response?.data)
      let errorMessage = 'Failed to save shift template'
      if (error.response?.data && typeof error.response.data === 'object') {
        const errors = Object.entries(error.response.data).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`,
        )
        if (errors.length) errorMessage = errors.join(' | ')
      } else if (error.response?.data?.message) errorMessage = error.response.data.message
      $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 5000 })
    } finally {
      savingShiftTypeTemplate.value = false
    }
  }

  async function deleteShiftTypeTemplate(template) {
    $q.dialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${template.name}"?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/shift-type-templates/${template.id}/`, {
          headers: authHeaders(),
        })
        $q.notify({ type: 'positive', message: 'Shift template deleted successfully' })
        await fetchShiftTypeTemplates()
      } catch (error) {
        console.error('Error deleting shift template:', error)
        $q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to delete shift template',
          position: 'top',
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
    shiftTypeTemplates,
    weeklyShiftTemplates,
    loading,
    saving,
    loadingShiftTypeTemplates,
    savingShiftTypeTemplate,
    loadingWeeklyTemplates,
    savingWeeklyTemplate,
    shiftDialog,
    editingShift,
    shiftForm,
    shiftTypeTemplateDialog,
    editingShiftTypeTemplate,
    shiftTypeTemplateForm,
    weeklyTemplateDialog,
    weeklyTemplateForm,
    editingWeeklyTemplate,
    weekdayOptions,
    formatTime,
    extractTime,
    formatWeekdays,
    fetchShifts,
    fetchShiftTemplates,
    fetchShiftTypeTemplates,
    fetchWeeklyShiftTemplates,
    openShiftDialog,
    openEditShiftDialog,
    saveShift,
    deleteShift,
    openShiftTypeTemplateDialog,
    openEditShiftTypeTemplateDialog,
    saveShiftTypeTemplate,
    deleteShiftTypeTemplate,
    openWeeklyTemplateDialog,
    openEditWeeklyTemplateDialog,
    saveWeeklyTemplate,
    deleteWeeklyTemplate,
  }
}
