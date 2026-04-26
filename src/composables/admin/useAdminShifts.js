import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE, authHeaders } from 'src/composables/utils/http'

export function useAdminShifts() {
  const $q = useQuasar()
  const { companyId } = useCompany()

  const shiftTypes = ref([])
  const shiftTemplates = ref([])
  const shiftTypeTemplates = ref([])
  const weeklyShiftTemplates = ref([])

  const loadingShiftTypeTemplates = ref(false)
  const savingShiftTypeTemplate = ref(false)
  const loadingWeeklyTemplates = ref(false)
  const savingWeeklyTemplate = ref(false)

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

  function _emptyRecurringForm() {
    return {
      id: null,
      name: '',
      total_hours: 0,
      break_hours: 0,
      shifts: [{ site_id: null, default_start_time: '', default_end_time: '' }],
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

  // ─── Fetch shift templates ────────────────────────────────────────────────

  async function fetchShiftTemplates() {
    if (!companyId.value) {
      shiftTemplates.value = []
      return
    }
    try {
      const response = await api.get(`${BASE}/organization/shift-types/`, {
        params: { company: companyId.value },
        headers: authHeaders(),
      })
      shiftTemplates.value = response.data.data ?? response.data ?? []
      shiftTypes.value = shiftTemplates.value
      return shiftTemplates.value
    } catch (error) {
      console.error('Error fetching shift templates:', error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Failed to load shift templates',
        position: 'top',
      })
    }
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
      total_hours: row.total_hours || 9,
      break_hours: row.break_hours || 0,
      shifts: row.shifts || [{ site_id: null, default_start_time: '', default_end_time: '' }],
    }

    console.log(
      '[openEditShiftTypeTemplateDialog] mapped shiftTypeTemplateForm:',
      JSON.stringify(shiftTypeTemplateForm.value, null, 2),
    )
    shiftTypeTemplateDialog.value = true
  }

  async function saveShiftTypeTemplate() {
    console.log(
      '[saveShiftTypeTemplate] shiftTypeTemplateForm state:',
      JSON.stringify(shiftTypeTemplateForm.value, null, 2),
    )

    if (!shiftTypeTemplateForm.value.shifts?.length) {
      $q.notify({
        type: 'warning',
        message: 'Please add at least one shift',
        position: 'top',
      })
      return
    }

    // Validate each shift has required fields
    const invalidShifts = shiftTypeTemplateForm.value.shifts.filter(
      (s) => !s.site_id || !s.default_start_time || !s.default_end_time,
    )
    if (invalidShifts.length) {
      $q.notify({
        type: 'warning',
        message: 'All shifts must have site, start time, and end time',
        position: 'top',
      })
      return
    }

    const payload = {
      name: shiftTypeTemplateForm.value.name?.trim() || '',
      company_id: parseInt(companyId.value),
      total_hours: parseFloat(shiftTypeTemplateForm.value.total_hours) || 9,
      break_hours: parseFloat(shiftTypeTemplateForm.value.break_hours) || 0,
      shifts: shiftTypeTemplateForm.value.shifts.map((s) => ({
        site_id: parseInt(s.site_id),
        default_start_time: s.default_start_time,
        default_end_time: s.default_end_time,
      })),
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
    shiftTypes,
    shiftTemplates,
    shiftTypeTemplates,
    weeklyShiftTemplates,
    loadingShiftTypeTemplates,
    savingShiftTypeTemplate,
    loadingWeeklyTemplates,
    savingWeeklyTemplate,
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
    fetchShiftTemplates,
    fetchShiftTypeTemplates,
    fetchWeeklyShiftTemplates,
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
