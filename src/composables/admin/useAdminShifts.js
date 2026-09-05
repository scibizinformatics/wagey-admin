import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'
import { useToast } from 'src/composables/useToast'
import { safeParseJson } from 'src/composables/utils/storage'

export function useAdminShifts() {
  const $q = useQuasar()
  const toast = useToast()
  const { companyId } = useCompany()

  const shiftTypes = ref([])
  const shiftTemplates = ref([])
  const shiftTypeTemplates = ref([])
  const weeklyShiftTemplates = ref([])
  const shiftTemplates24h = ref([])

  const loadingShiftTypeTemplates = ref(false)
  const savingShiftTypeTemplate = ref(false)
  const loadingWeeklyTemplates = ref(false)
  const savingWeeklyTemplate = ref(false)
  const loadingShiftTemplates24h = ref(false)
  const savingShiftTemplate24h = ref(false)

  // ─── Shift Type Template dialog state ─────────────────────────────────────
  const shiftTypeTemplateDialog = ref(false)
  const editingShiftTypeTemplate = ref(false)
  const shiftTypeTemplateForm = ref(_emptyRecurringForm())

  // ─── Weekly shift template dialog state ───────────────────────────────────
  const weeklyTemplateDialog = ref(false)
  const weeklyTemplateForm = ref(_emptyWeeklyTemplateForm())
  const editingWeeklyTemplate = ref(false)

  // ─── 24-hour shift template dialog state ───────────────────────
  const shiftTemplate24hDialog = ref(false)
  const editingShiftTemplate24h = ref(false)
  const shiftTemplate24hForm = ref({ id: null, name: '', is_active: true, shifts: [] })

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
      // A bracketed value is meant to be JSON; anything else — and anything
      // that fails to parse — is the comma-separated form.
      days = t.startsWith('[') ? (safeParseJson(t, null) ?? t.split(',')) : t.split(',')
    }
    if (!Array.isArray(days) || days.length === 0) return 'N/A'
    return days
      .map((d) => ABBR_TO_FULL[d.trim().toLowerCase()] || d.trim())
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
      .join(', ')
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
      })
      shiftTemplates.value = response.data.data ?? response.data ?? []
      shiftTypes.value = shiftTemplates.value
      return shiftTemplates.value
    } catch (error) {
      console.error('Error fetching shift templates:', error)
      toast.error(error.response?.data?.message || 'Failed to load shift templates')
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
      })
      weeklyShiftTemplates.value = (response.data.data ?? response.data ?? []).map((s) => {
        if (Array.isArray(s.rules)) return s
        const weekdays = _parseWeekdayString(s.weekdays)
        const rules = weekdays.map((day) => ({
          weekday: day,
          shift_template: s.shift_template ?? null,
        }))
        return { ...s, rules }
      })
      return weeklyShiftTemplates.value
    } catch (error) {
      console.error('Error fetching weekly shift templates:', error)
      toast.error(error.response?.data?.message || 'Failed to load shift templates')
    } finally {
      loadingWeeklyTemplates.value = false
    }
  }

  // ─── Weekly shift template dialog helpers ─────────────────────────────────

  function openWeeklyTemplateDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
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
      toast.warning('Template name is required')
      return
    }

    const validRules = weeklyTemplateForm.value.rules.filter((r) => r.shift_template)
    if (!validRules.length) {
      toast.warning('Please add at least one shift rule for a day')
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
        )
        toast.success('Weekly shift template updated successfully')
      } else {
        await api.post(`${BASE}/organization/recurring-schedules/`, payload)
        toast.success('Weekly shift template created successfully')
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
      toast.error(errorMessage, { timeout: 5000 })
    } finally {
      savingWeeklyTemplate.value = false
    }
  }

  async function deleteWeeklyTemplate(template) {
    $q.dialog({
      title: 'Delete this template?',
      message: `"${template.name}" is removed and can no longer be scheduled. Shifts already placed from it are not affected. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/recurring-schedules/${template.id}/`)
        toast.success('Weekly shift template deleted successfully')
        await fetchWeeklyShiftTemplates()
      } catch (error) {
        console.error('Error deleting weekly shift template:', error)
        toast.error(error.response?.data?.message || 'Failed to delete shift template')
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
      toast.error(error.response?.data?.message || 'Failed to load shift type templates')
    } finally {
      loadingShiftTypeTemplates.value = false
    }
  }

  // ─── Shift Type Template dialog helpers ────────────────────────────────────

  function openShiftTypeTemplateDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
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
      toast.warning('Please add at least one shift')
      return
    }

    // Validate each shift has required fields
    const invalidShifts = shiftTypeTemplateForm.value.shifts.filter(
      (s) => !s.site_id || !s.default_start_time || !s.default_end_time,
    )
    if (invalidShifts.length) {
      toast.warning('All shifts must have site, start time, and end time')
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
        )
        console.log('[saveShiftTypeTemplate] PUT response:', response.data)
        toast.success('Shift template updated successfully')
      } else {
        console.log('[saveShiftTypeTemplate] POST /organization/shift-type-templates/create/')
        response = await api.post(`${BASE}/organization/shift-type-templates/create/`, payload)
        console.log('[saveShiftTypeTemplate] POST response:', response.data)
        toast.success('Shift template created successfully')
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
      toast.error(errorMessage, { timeout: 5000 })
    } finally {
      savingShiftTypeTemplate.value = false
    }
  }

  async function deleteShiftTypeTemplate(template) {
    $q.dialog({
      title: 'Delete this template?',
      message: `"${template.name}" is removed and can no longer be scheduled. Shifts already placed from it are not affected. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/shift-type-templates/${template.id}/`)
        toast.success('Shift template deleted successfully')
        await fetchShiftTypeTemplates()
      } catch (error) {
        console.error('Error deleting shift template:', error)
        toast.error(error.response?.data?.message || 'Failed to delete shift template')
      }
    })
  }

  // ─── 24-Hour shift templates ───────────────────────────────────────────────
  // Same shift shape as the regular shift-type templates, but the segments are
  // expected to chain around the clock (e.g. 06:00-14:00, 14:00-22:00,
  // 22:00-06:00), so the modal reports live coverage instead of total/break.

  function _emptyTemplate24hForm() {
    return {
      id: null,
      name: '',
      is_active: true,
      shifts: [
        { default_start_time: '', default_end_time: '' },
        { default_start_time: '', default_end_time: '' },
        { default_start_time: '', default_end_time: '' },
      ],
    }
  }

  /**
   * `<input type="time">` yields `HH:MM`, but the backend parses these with
   * `%H:%M:%S` and raises `time data '11:42' does not match format` on anything
   * shorter — so the seconds are filled in on the way out.
   */
  function toApiTime(t) {
    if (!t) return t
    const parts = String(t).split(':')
    if (parts.length < 2) return t
    const [h, m, sec = '00'] = parts
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  /**
   * Length of one segment in hours, wrapping past midnight so a 22:00-06:00
   * night shift reads as 8 and not as -16.
   */
  function _shiftHours(start, end) {
    if (!start || !end) return 0
    const from = new Date(`2000-01-01T${extractTime(start)}`)
    let to = new Date(`2000-01-01T${extractTime(end)}`)
    if (isNaN(from) || isNaN(to)) return 0
    if (to < from) to = new Date(to.getTime() + 24 * 60 * 60 * 1000)
    return Math.round(((to - from) / (1000 * 60 * 60)) * 100) / 100
  }

  /** `shifts`/`shifts_detail` come back either as arrays or JSON strings. */
  function parseShiftList(value) {
    if (!value) return []
    if (Array.isArray(value)) return value
    const parsed = safeParseJson(value, [])
    return Array.isArray(parsed) ? parsed : []
  }

  async function fetchShiftTemplates24h() {
    if (!companyId.value) {
      shiftTemplates24h.value = []
      return
    }
    loadingShiftTemplates24h.value = true
    try {
      const response = await api.get(`${BASE}/organization/shift-type-templates-24h-list/`, {
        params: { company: companyId.value },
      })
      shiftTemplates24h.value = response.data.data ?? response.data ?? []
      return shiftTemplates24h.value
    } catch (error) {
      console.error('Error fetching 24-hour shift templates:', error)
      toast.error(error.response?.data?.message || 'Failed to load 24-hour shift templates')
    } finally {
      loadingShiftTemplates24h.value = false
    }
  }

  function openShiftTemplate24hDialog() {
    if (!companyId.value) {
      toast.warning('Please select a company first')
      return
    }
    editingShiftTemplate24h.value = false
    shiftTemplate24hForm.value = _emptyTemplate24hForm()
    shiftTemplate24hDialog.value = true
  }

  function openEditShiftTemplate24hDialog(row) {
    editingShiftTemplate24h.value = true
    const shifts = parseShiftList(row.shifts_detail).length
      ? parseShiftList(row.shifts_detail)
      : parseShiftList(row.shifts)
    shiftTemplate24hForm.value = {
      id: row.id,
      name: row.name || '',
      is_active: row.is_active ?? true,
      shifts: shifts.length
        ? shifts.map((s) => ({
            default_start_time: extractTime(s.start_time || s.default_start_time),
            default_end_time: extractTime(s.end_time || s.default_end_time),
          }))
        : _emptyTemplate24hForm().shifts,
    }
    shiftTemplate24hDialog.value = true
  }

  async function saveShiftTemplate24h() {
    const form = shiftTemplate24hForm.value

    if (!form.name?.trim()) {
      toast.warning('Template name is required')
      return
    }
    if (!form.shifts?.length) {
      toast.warning('Please add at least one shift')
      return
    }
    const invalid = form.shifts.filter((s) => !s.default_start_time || !s.default_end_time)
    if (invalid.length) {
      toast.warning('All shifts must have a start time and an end time')
      return
    }
    // The endpoint takes a segment of exactly 8 hrs (work only) or 9 hrs
    // (8 work + 1 break) and rejects the whole template otherwise, so the same
    // rule is checked here rather than spending a round-trip on a 400.
    const badLength = form.shifts.findIndex((s) => {
      const hours = _shiftHours(s.default_start_time, s.default_end_time)
      return hours !== 8 && hours !== 9
    })
    if (badLength !== -1) {
      const shift = form.shifts[badLength]
      const hours = _shiftHours(shift.default_start_time, shift.default_end_time)
      toast.warning(
        `Shift ${badLength + 1} runs ${hours} hrs — each shift must be exactly 8 hrs (work only) or 9 hrs (8 hrs work + 1 hr break).`,
        { timeout: 6000 },
      )
      return
    }

    // Kept to exactly the fields the create endpoint documents (name /
    // company_id / shifts) — it 500s rather than 400s on anything it does not
    // recognise, so extra keys are not worth the risk. `is_active` is only sent
    // on update, where the detail route does model the field.
    const payload = {
      name: form.name.trim(),
      company_id: parseInt(companyId.value),
      shifts: form.shifts.map((s) => ({
        default_start_time: toApiTime(s.default_start_time),
        default_end_time: toApiTime(s.default_end_time),
      })),
    }
    if (editingShiftTemplate24h.value) payload.is_active = form.is_active ?? true

    savingShiftTemplate24h.value = true
    try {
      if (editingShiftTemplate24h.value) {
        // Mirrors the regular shift-type-template detail route; the 24h list and
        // create endpoints are the only two the API documents explicitly.
        await api.put(`${BASE}/organization/shift-type-templates-24h/${form.id}/`, payload)
        toast.success('24-hour shift template updated successfully')
      } else {
        await api.post(`${BASE}/organization/shift-type-templates-24h/create/`, payload)
        toast.success('24-hour shift template created successfully')
      }
      shiftTemplate24hDialog.value = false
      await fetchShiftTemplates24h()
    } catch (error) {
      console.error('Error saving 24-hour shift template:', error)
      // The payload is the first thing a backend dev needs when this endpoint
      // throws, and a 500 comes back as an HTML page with nothing else in it.
      console.error('[saveShiftTemplate24h] payload that failed:', JSON.stringify(payload, null, 2))
      let errorMessage = 'Failed to save 24-hour shift template'
      if (error.response?.status >= 500) {
        errorMessage = 'The server failed while saving this template (500)'
      } else if (error.response?.data && typeof error.response.data === 'object') {
        const errors = Object.entries(error.response.data).map(([k, v]) => {
          const text = Array.isArray(v) ? v.join(', ') : v
          // DRF's catch-all key means nothing to whoever is filling the form;
          // its message already reads as a sentence.
          return k === 'non_field_errors' || k === 'detail' ? text : `${k}: ${text}`
        })
        if (errors.length) errorMessage = errors.join(' | ')
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      toast.error(errorMessage, { timeout: 6000 })
    } finally {
      savingShiftTemplate24h.value = false
    }
  }

  async function deleteShiftTemplate24h(template) {
    $q.dialog({
      title: 'Delete this template?',
      message: `"${template.name}" is removed and can no longer be scheduled. Shifts already placed from it are not affected. This cannot be undone.`,
      cancel: { label: 'Cancel', flat: true },
      ok: { label: 'Delete', color: 'negative', unelevated: true },
      persistent: true,
    }).onOk(async () => {
      try {
        await api.delete(`${BASE}/organization/shift-type-templates-24h/${template.id}/`)
        toast.success('24-hour shift template deleted successfully')
        await fetchShiftTemplates24h()
      } catch (error) {
        console.error('Error deleting 24-hour shift template:', error)
        toast.error(error.response?.data?.message || 'Failed to delete 24-hour shift template')
      }
    })
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /** Map from abbreviated (Mon, Tue, …) to full lowercase weekday names. */
  const ABBR_TO_FULL = {
    mon: 'monday',
    tue: 'tuesday',
    wed: 'wednesday',
    thu: 'thursday',
    fri: 'friday',
    sat: 'saturday',
    sun: 'sunday',
  }

  function _parseWeekdayString(wd) {
    if (!wd) return []
    let days = wd
    if (typeof days === 'string') {
      const t = days.trim()
      days = t.startsWith('[') ? (safeParseJson(t, null) ?? t.split(',')) : t.split(',')
    }
    const map = {
      monday: 'monday',
      tuesday: 'tuesday',
      wednesday: 'wednesday',
      thursday: 'thursday',
      friday: 'friday',
      saturday: 'saturday',
      sunday: 'sunday',
      mon: 'monday',
      tue: 'tuesday',
      wed: 'wednesday',
      thu: 'thursday',
      fri: 'friday',
      sat: 'saturday',
      sun: 'sunday',
      Mon: 'monday',
      Tue: 'tuesday',
      Wed: 'wednesday',
      Thu: 'thursday',
      Fri: 'friday',
      Sat: 'saturday',
      Sun: 'sunday',
    }
    return Array.isArray(days)
      ? days.map((d) => map[d.trim()] || map[d.trim().toLowerCase()] || d.trim().toLowerCase())
      : []
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
    shiftTemplates24h,
    loadingShiftTemplates24h,
    savingShiftTemplate24h,
    shiftTemplate24hDialog,
    editingShiftTemplate24h,
    shiftTemplate24hForm,
    parseShiftList,
    fetchShiftTemplates24h,
    openShiftTemplate24hDialog,
    openEditShiftTemplate24hDialog,
    saveShiftTemplate24h,
    deleteShiftTemplate24h,
  }
}
