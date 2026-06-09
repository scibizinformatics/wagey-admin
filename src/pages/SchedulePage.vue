<template>
  <PageShell>
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">Schedule</h1>
            <div class="timezone-badge">
              <q-icon name="schedule" size="14px" />
              <span>{{ userTimezone }}</span>
            </div>
          </div>
          <div class="header-actions">
            <q-btn
              color="primary"
              icon="add"
              label="Add Schedule"
              @click="openAddModal"
              class="add-btn"
              unelevated
              no-caps
            />
            <q-input
              v-model="searchTerm"
              placeholder="Search employees..."
              outlined
              dense
              class="header-search"
              debounce="300"
              @update:model-value="filterEmployees"
            >
              <template #prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <ScheduleStatsCards
        :active-employees="activeEmployees"
        :total-shifts="totalShifts"
        :positions-count="positionsCount"
      />

      <!-- Filters / Controls -->
      <ScheduleFilters
        v-model:filters="filters"
        :site-filter-options="siteFilterOptions"
        :user-options="userOptions"
        :selected-week="selectedWeek"
        @prev-week="prevWeek"
        @next-week="nextWeek"
      />

      <!-- Schedule Table -->
      <ScheduleTable
        :users="users"
        :shifts="shifts"
        :days="days"
        :leave-types="leaveTypes"
        :loading="isLoadingSchedule"
        :loading-text="loadingMessage"
        :quick-action-loading="quickActionLoading"
        :assigning-day-off-id="assigningDayOffId"
        :sites="sites"
        :shift-types="shiftTypes"
        @open-quick-add="openQuickAddModal"
        @open-reassign="openReassignModal"
        @assign-dayoff="assignDayOff"
        @assign-dual-dayoff="assignDualDayOff"
        @quick-direct-assign="quickDirectAssign"
      />

      <!-- Pagination Controls -->
      <div class="pagination-bar">
        <div class="pagination-info">
          <span class="pagination-text">
            Showing {{ ((schedulePage - 1) * schedulePageSize) + 1 }} –
            {{ Math.min(schedulePage * schedulePageSize, schedulePagination.count) }}
            of {{ schedulePagination.count }} employees
          </span>
          <q-select
            v-model="schedulePageSize"
            :options="pageSizeOptions.map((n) => ({ label: `${n} per page`, value: n }))"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            dense
            outlined
            class="page-size-select"
            @update:model-value="onPageSizeChange"
          />
        </div>
        <q-pagination
          v-model="schedulePage"
          :max="Math.ceil(schedulePagination.count / schedulePageSize)"
          :max-pages="6"
          boundary-numbers
          direction-links
          color="primary"
          active-color="primary"
          active-text-color="white"
          icon-first="first_page"
          icon-prev="chevron_left"
          icon-next="chevron_right"
          icon-last="last_page"
          class="schedule-pagination"
          @update:model-value="onPageChange"
        />
      </div>

      <!-- Add Schedule Modal -->
      <ScheduleAddModal
        v-model="showAddModal"
        v-model:new-schedule="newSchedule"
        :filtered-employee-options="filteredEmployeeOptions"
        :shift-template-options="shiftTemplateOptions"
        :recurring-schedule-options="recurringScheduleOptions"
        :department-options="departmentOptions"
        :conflict-warning="addConflictWarning"
        :checking-conflict="isCheckingConflict"
        :loading-employees="loadingEmployees"
        @submit="addSchedule"
        @filter-employees="filterEmployeeOptions"
        @template-change="onRecurringTemplateChange"
      />

      <!-- Quick Add Modal -->
      <ScheduleQuickAddModal
        v-model="showQuickAddModal"
        v-model:quick-add="quickAdd"
        :shift-template-options="shiftTemplateOptions"
        :employee-name="getEmployeeName(quickAdd.userId)"
        :day-label="days[quickAdd.day] || ''"
        :adding="isAddingShift"
        @submit="quickAddSchedule"
        @remove-shift="removeShiftRow"
      />

      <!-- Reassign Modal -->
      <ScheduleReassignModal
        v-model="showReassignModal"
        v-model:reassign-data="reassignData"
        :shift-template-options="shiftTemplateOptions"
        :employee-name="getEmployeeName(reassignData.currentEmployee)"
        :saving="isReassigning"
        @submit="handleReassignShift"
        @back-to-original="reassignData.shiftTemplateId = reassignData.originalTemplateId"
      />
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useCompany } from '@/composables/page/useCompany'
import { useSchedule } from '@/composables/page/useSchedule'
import { useOrganization } from '@/composables/page/useOrganization'
import { useEmployees } from '@/composables/page/useEmployees'
import ScheduleStatsCards from '@/components/pages/Schedule/ScheduleStatsCards.vue'
import ScheduleFilters from '@/components/pages/Schedule/ScheduleFilters.vue'
import ScheduleTable from '@/components/pages/Schedule/ScheduleTable.vue'
import ScheduleAddModal from '@/components/pages/Schedule/ScheduleAddModal.vue'
import ScheduleQuickAddModal from '@/components/pages/Schedule/ScheduleQuickAddModal.vue'
import ScheduleReassignModal from '@/components/pages/Schedule/ScheduleReassignModal.vue'

const $q = useQuasar()

const { companyId } = useCompany()
const {
  fetchScheduleByDateRange,
  assignShift,
  reassignShift: reassignShiftApi,
  assignDayOff: assignDayOffApi,
  applyLeaveForEmployee,
  fetchLeaveTypes: fetchLeaveTypesApi,
  fetchShiftTemplates: fetchShiftTemplatesApi,
  schedulePagination,
} = useSchedule()
const {
  sites,
  departments,
  shiftTypes,
  recurringSchedules,
  fetchSites,
  fetchDepartments,
  fetchShiftTypes,
  fetchRecurringSchedules,
} = useOrganization()
const { employees, loading: loadingEmployees, fetchEmployees } = useEmployees()

// ─── State ────────────────────────────────────────────────────────────────────

const users = ref([])
const shifts = ref([])
const isReassigning = ref(false)
const isLoadingSchedule = ref(false)
const userTimezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone)
const filters = ref({ site: null, employee: null })
const searchTerm = ref('')
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const schedulePage = ref(1)
const schedulePageSize = ref(20)
const pageSizeOptions = [10, 20, 50]

const allSchedules = ref([])
const scheduleCache = ref({})
const loadingMessage = ref('Loading schedules...')

const showAddModal = ref(false)
const showQuickAddModal = ref(false)
const showReassignModal = ref(false)
const isCheckingConflict = ref(false)
const isAddingShift = ref(false)
const assigningDayOffId = ref(null)
const quickActionLoading = ref(null)
const leaveTypes = ref([])
const shiftTemplates = ref([])
const addConflictWarning = ref(false)

// ─── Fresh schedule factory ──────────────────────────────────────────────────
const _freshSchedule = () => ({
  userId: null,
  userIds: [],
  selectedDate: null,
  selectedDates: [],
  oneTimeShifts: [{ shiftTemplate: null }],
  startTime: '',
  endTime: '',
  position: null,
  site: null,
  department: null,
  recurringSchedule: null,
  scheduleType: 'one-time',
  isRotating: false,
  rotationShifts: [],
  weekdays: [],
  repeatInterval: 1,
  recurringStartDate: null,
  recurringEndDate: null,
})

const newSchedule = ref(_freshSchedule())

const quickAdd = ref({ userId: null, day: null, shifts: [], leaveType: null })

const reassignData = ref({
  assignmentId: null,
  shiftTemplateId: null,
  originalTemplateId: null,
  originalTemplateName: null,
  originalSiteName: null,
  originalTime: null,
  originalDuration: null,
  currentEmployee: null,
  date: null,
  day: null,
  isDualShift: false,
  dualShifts: [],
})

// ─── Refs ─────────────────────────────────────────────────────────────────────
const filteredEmployeeOptions = ref([])

// ─── Week helpers ─────────────────────────────────────────────────────────────
const getWeekRange = (date = new Date()) => {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

const selectedWeek = ref(getWeekRange())

const nextWeek = async () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() + 7)
  selectedWeek.value = getWeekRange(newStart)
  schedulePage.value = 1
  await fetchData()
  fetchLeaves()
}

const prevWeek = async () => {
  const newStart = new Date(selectedWeek.value.start)
  newStart.setDate(newStart.getDate() - 7)
  selectedWeek.value = getWeekRange(newStart)
  schedulePage.value = 1
  await fetchData()
  fetchLeaves()
}

const onPageChange = (newPage) => {
  schedulePage.value = newPage
  renderPage()
  fetchLeaves()
}

const onPageSizeChange = (newSize) => {
  schedulePageSize.value = newSize
  schedulePage.value = 1
  renderPage()
  fetchLeaves()
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const getSiteName = (siteId, shift = null) => {
  if (!siteId) return null
  if (shift?.siteName) return shift.siteName
  const id = typeof siteId === 'number' ? siteId : parseInt(siteId)
  return sites.value.find((s) => s.id === id)?.name || null
}

const getEmployeeName = (id) => users.value.find((u) => u.id === id)?.name || 'Unknown Employee'

const isEmployeeTerminated = (emp) => {
  if (emp.status?.toLowerCase() === 'terminated') return true
  const empStatus = emp.companies?.[0]?.employment_status
  if (empStatus?.toLowerCase() === 'terminated') return true
  return false
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const totalShifts = computed(() => shifts.value.length)
const activeEmployees = computed(() => schedulePagination.value.count)
const positionsCount = computed(() => new Set(shifts.value.map((s) => s.position)).size)

const siteFilterOptions = computed(() => [
  { label: 'All Sites', value: null },
  ...sites.value.map((site) => ({ label: site.name, value: site.id })),
])

const userOptions = computed(() => users.value.map((u) => ({ label: u.name, value: u.id })))

const employeeOptions = computed(() =>
  employees.value
    .filter((emp) => !isEmployeeTerminated(emp))
    .map((emp) => ({ label: emp.full_name || emp.name, value: emp.id })),
)

const departmentOptions = computed(() =>
  departments.value.map((d) => ({ label: d.name, value: d.id })),
)

const shiftTemplateOptions = computed(() => {
  const opts = shiftTemplates.value.map((t) => {
    let label = t.name
    const shiftsDetail = parseShifts(t.shifts_detail)
    if (!label && shiftsDetail.length) {
      label = shiftsDetail
        .map((s) => {
          const site = s.site?.name || getSiteName(s.site?.id || t.site_id) || ''
          const start = s.start_time || s.default_start_time || ''
          const end = s.end_time || s.default_end_time || ''
          const time = start && end ? `${start} - ${end}` : start || end
          return site ? `${time} (${site})` : time
        })
        .filter(Boolean)
        .join(' / ')
    }
    return {
      label: label || `Template ${t.id}`,
      value: Number(t.id),
      site: t.site || t.site_id,
    }
  })
  return opts
})

const recurringScheduleOptions = computed(() =>
  recurringSchedules.value.map((r) => ({ label: r.name, value: r.id })),
)

const filteredAllSchedules = computed(() => {
  return allSchedules.value.filter((empData) => {
    const employee = empData.employee || empData
    const fullName = employee.full_name || employee.name || ''
    const empId = employee.id || empData.id

    const matchEmployee = !filters.value.employee || empId == filters.value.employee
    const matchSearch = fullName.toLowerCase().includes((searchTerm.value || '').toLowerCase())
    const matchSite = !filters.value.site || (() => {
      const schedules = empData.schedules || empData.schedule || empData.schedule_list || []
      if (!Array.isArray(schedules) || schedules.length === 0) return true
      return schedules.some((s) => {
        const sSite = typeof s.site === 'number' ? s.site : parseInt(s.site)
        const fSite = typeof filters.value.site === 'number' ? filters.value.site : parseInt(filters.value.site)
        return sSite === fSite
      })
    })()

    return matchEmployee && matchSearch && matchSite
  })
})

// ─── Watchers ─────────────────────────────────────────────────────────────────
watch(
  employeeOptions,
  (newOptions) => {
    filteredEmployeeOptions.value = newOptions
  },
  { immediate: true },
)

watch(
  () => ({ search: searchTerm.value, employee: filters.value.employee, site: filters.value.site }),
  () => {
    schedulePage.value = 1
    renderPage()
    fetchLeaves()
  },
)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseShifts(shiftsData) {
  if (!shiftsData) return []
  if (Array.isArray(shiftsData)) return shiftsData
  if (typeof shiftsData === 'string') {
    try {
      return JSON.parse(shiftsData)
    } catch {
      return []
    }
  }
  return []
}

const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const filterEmployeeOptions = (val, update) => {
  update(() => {
    filteredEmployeeOptions.value = !val
      ? employeeOptions.value
      : employeeOptions.value.filter((opt) => opt.label.toLowerCase().includes(val.toLowerCase()))
  })
}

const removeShiftRow = (index) => {
  quickAdd.value.shifts.splice(index, 1)
}

const filterEmployees = () => {}

// ─── localStorage leave helpers ───────────────────────────────────────────────
const LEAVE_STORAGE_KEY = 'wagey_leaves'
const getStoredLeaves = () => {
  try {
    return JSON.parse(localStorage.getItem(LEAVE_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}
const saveLeaveToStorage = (leave) => {
  const leaves = getStoredLeaves()
  if (!leaves.find((l) => l.localId === leave.localId)) {
    leaves.push(leave)
    localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(leaves))
  }
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
const normalizeCompanyId = () => {
  let raw = localStorage.getItem('selectedCompany')
  try {
    raw = JSON.parse(raw)?.id || raw
  } catch {
    // ignore parse errors
  }
  return parseInt(raw)
}

const fetchSitesAndDepartments = async () => {
  try {
    await Promise.all([
      fetchSites(),
      fetchDepartments(),
      fetchShiftTypes(),
      fetchRecurringSchedules(),
    ])
  } catch {
    // handled silently
  }
}

const fetchLeaveTypes = async () => {
  leaveTypes.value = await fetchLeaveTypesApi()
}

const fetchShiftTemplatesList = async () => {
  shiftTemplates.value = await fetchShiftTemplatesApi()
}

const fetchLeaves = () => {
  const cId = String(normalizeCompanyId())
  const ws = selectedWeek.value.start
  const weekStartStr = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`
  const allLeaves = getStoredLeaves().filter((l) => String(l.companyId) === cId)
  shifts.value = shifts.value.filter((s) => !s.isLeave)
  const weekStart = new Date(weekStartStr + 'T00:00:00')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  allLeaves.forEach((leave) => {
    if (!leave.start_date) return
    const ls = new Date(leave.start_date + 'T00:00:00')
    const le = new Date((leave.end_date || leave.start_date) + 'T00:00:00')
    if (ls > weekEnd || le < weekStart) return
    const leaveTypeName =
      leaveTypes.value.find((lt) => lt.id === leave.leave_type)?.name ||
      leave.leave_type_name ||
      'Leave'
    for (let d = new Date(ls); d <= le; d.setDate(d.getDate() + 1)) {
      const daysDiff = Math.round((d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff >= 0 && daysDiff < 7) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        shifts.value.push({
          id: `leave-${leave.localId}-${daysDiff}`,
          assignmentId: leave.localId,
          userId: leave.employee_id,
          day: daysDiff,
          startTime: null,
          endTime: null,
          position: leaveTypeName,
          shiftTypeId: null,
          site: null,
          department: null,
          status: 'approved',
          date: dateStr,
          isLeave: true,
          leaveTypeName,
        })
      }
    }
  })
}

const renderPage = () => {
  const start = (schedulePage.value - 1) * schedulePageSize.value
  const end = start + schedulePageSize.value
  const employeesData = filteredAllSchedules.value.slice(start, end)

  users.value = employeesData
    .filter((emp) => !isEmployeeTerminated(emp.employee || emp))
    .map((emp) => ({
      id: emp.employee?.id || emp.id,
      name: emp.employee?.full_name || emp.full_name || emp.name || `Employee ${emp.id}`,
      email: emp.employee?.email || emp.email || '',
    }))

  shifts.value = []
  const ws = selectedWeek.value.start
  const weekStartStr = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`
  const weekStartLocal = new Date(weekStartStr + 'T00:00:00')
  const weekEndLocal = new Date(weekStartLocal)
  weekEndLocal.setDate(weekEndLocal.getDate() + 6)

  employeesData.forEach((empData) => {
    const employee =
      empData.employee && typeof empData.employee === 'object'
        ? empData.employee
        : empData.id
          ? empData
          : null
    if (!employee?.id) return
    const scheduleList = empData.schedules || empData.schedule || empData.schedule_list || []
    const parsedSchedules =
      typeof scheduleList === 'string'
        ? (() => {
            try {
              return JSON.parse(scheduleList)
            } catch {
              return []
            }
          })()
        : scheduleList
    if (!Array.isArray(parsedSchedules) || parsedSchedules.length === 0) return
    parsedSchedules.forEach((schedule, sIndex) => {
      if (!schedule.date) return
      const scheduleDateStr = schedule.date.substring(0, 10)
      const scheduleDate = new Date(scheduleDateStr + 'T00:00:00')
      const daysDiff = Math.round(
        (scheduleDate.getTime() - weekStartLocal.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (daysDiff < 0 || daysDiff >= 7) return
      const isDayOffShift =
        schedule.is_off === true ||
        schedule.is_day_off === true ||
        schedule.status === 'day_off' ||
        schedule.shift_type_name?.toLowerCase().includes('day off')
      const startTime = isDayOffShift
        ? null
        : schedule.actual_start_time?.substring(0, 5) ||
          schedule.start_time?.substring(0, 5) ||
          null
      const endTime = isDayOffShift
        ? null
        : schedule.actual_end_time?.substring(0, 5) ||
          schedule.end_time?.substring(0, 5) ||
          null
      let shiftTypeId = schedule.shift_type || null
      let shiftTypeName = isDayOffShift ? 'Day Off' : schedule.shift_type_name || null
      if (!isDayOffShift && !shiftTypeName && startTime) {
        const match =
          shiftTypes.value.find((st) => {
            const stStart = st.default_start_time?.substring(0, 5)
            const stEnd = st.default_end_time?.substring(0, 5)
            return stStart === startTime && stEnd === endTime
          }) ||
          shiftTypes.value.find((st) => st.default_start_time?.substring(0, 5) === startTime)
        if (match) {
          shiftTypeId = shiftTypeId || match.id
          shiftTypeName = match.name
        }
      }
      if (shiftTypeId && !shiftTypeName) {
        shiftTypeName = shiftTypes.value.find((st) => st.id === shiftTypeId)?.name || null
      }
      const resolvedAssignmentId =
        schedule.employee_assignment_id || schedule.assignment_id || null
      shifts.value.push({
        id: `${schedule.id}-${sIndex}`,
        assignmentId: resolvedAssignmentId,
        userId: employee.id,
        day: daysDiff,
        startTime,
        endTime,
        position: shiftTypeName || (startTime ? `${startTime}–${endTime}` : 'Shift'),
        shiftTypeId,
        shiftTemplateId: schedule.shift_template || schedule.shift_template_id || null,
        site: schedule.site || null,
        siteName: schedule.site_name || null,
        department: schedule.department || null,
        status: schedule.status || 'active',
        date: scheduleDateStr,
        is_off: isDayOffShift,
      })
    })
  })

  schedulePagination.value = {
    page: schedulePage.value,
    page_size: schedulePageSize.value,
    count: filteredAllSchedules.value.length,
    next: null,
    previous: null,
  }
}

const fetchData = async () => {
  isLoadingSchedule.value = true
  loadingMessage.value = 'Loading schedules...'
  try {
    const token = localStorage.getItem('access_token')
    const cId = normalizeCompanyId()
    if (!token || !cId) {
      $q.notify({
        type: 'negative',
        message: !token ? 'Please log in to view schedules' : 'No company selected.',
      })
      return
    }
    const ws = selectedWeek.value.start
    const weekEnd = selectedWeek.value.end
    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const weekKey = fmt(ws)

    if (scheduleCache.value[weekKey]) {
      allSchedules.value = scheduleCache.value[weekKey]
    } else {
      const allResults = []
      let page = 1
      let hasMore = true

      const mergeEmployeeData = (results) => {
        const map = new Map()
        results.forEach((rawResult) => {
          const list = Array.isArray(rawResult)
            ? rawResult
            : Array.isArray(rawResult?.results)
              ? rawResult.results
              : Array.isArray(rawResult?.data)
                ? rawResult.data
                : rawResult
                  ? [rawResult]
                  : []
          list.forEach((empData) => {
            const empId = empData.employee?.id || empData.id
            if (!empId) return
            if (map.has(empId)) {
              const existing = map.get(empId)
              const newSchedules = empData.schedules || empData.schedule || empData.schedule_list || []
              const existingSchedules = existing.schedules || []
              existing.schedules = [...existingSchedules, ...newSchedules]
            } else {
              map.set(empId, {
                ...empData,
                schedules: [
                  ...(empData.schedules || empData.schedule || empData.schedule_list || []),
                ],
              })
            }
          })
        })
        return Array.from(map.values())
      }

      while (hasMore) {
        loadingMessage.value = `Loading page ${page}...`
        const response = await fetchScheduleByDateRange(fmt(ws), fmt(weekEnd), {
          page: page,
          page_size: 10,
        })
        const merged = mergeEmployeeData([response])
        allResults.push(...merged)
        hasMore = schedulePagination.value.next !== null
        page++
      }

      const getFirstName = (fullName) => {
        if (!fullName) return ''
        return fullName.trim().split(' ')[0].toLowerCase()
      }

      allResults.sort((a, b) => {
        const nameA = getFirstName(a.employee?.full_name || a.full_name)
        const nameB = getFirstName(b.employee?.full_name || b.full_name)
        return nameA.localeCompare(nameB)
      })

      const existingIds = new Set(allResults.map((r) => r.employee?.id || r.id))
      employees.value.forEach((emp) => {
        if (!existingIds.has(emp.id) && !isEmployeeTerminated(emp)) {
          allResults.push({
            ...emp,
            employee: emp,
            schedules: [],
          })
        }
      })

      allResults.sort((a, b) => {
        const nameA = (a.employee?.full_name || a.full_name || '').trim().toLowerCase()
        const nameB = (b.employee?.full_name || b.full_name || '').trim().toLowerCase()
        return nameA.localeCompare(nameB)
      })

      scheduleCache.value[weekKey] = allResults
      allSchedules.value = allResults
    }

    renderPage()

    $q.notify({
      type: shifts.value.length ? 'positive' : 'info',
      message: allSchedules.value.length
        ? `Loaded ${allSchedules.value.length} employees`
        : 'No schedules found for the selected week.',
      timeout: allSchedules.value.length ? 2000 : 3000,
    })
  } catch (e) {
    console.error('FETCH ERROR:', e)
    $q.notify({ type: 'negative', message: 'Failed to load schedules', timeout: 5000 })
  } finally {
    isLoadingSchedule.value = false
    loadingMessage.value = 'Loading schedules...'
  }
}

// ─── Recurring template change ────────────────────────────────────────────────
const onRecurringTemplateChange = (templateId) => {
  if (!templateId) {
    newSchedule.value.startTime = ''
    newSchedule.value.endTime = ''
    newSchedule.value.weekdays = []
    return
  }
  const template = recurringSchedules.value.find((r) => r.id === templateId)
  if (!template) return
  if (template.start_time) newSchedule.value.startTime = template.start_time.substring(0, 5)
  if (template.end_time) newSchedule.value.endTime = template.end_time.substring(0, 5)
  if (template.shift_type) newSchedule.value.position = template.shift_type
  if (template.is_rotating !== undefined) newSchedule.value.isRotating = template.is_rotating
  if (template.site) newSchedule.value.site = template.site
  if (template.department) newSchedule.value.department = template.department
  if (template.start_date) newSchedule.value.recurringStartDate = template.start_date
  if (template.end_date) newSchedule.value.recurringEndDate = template.end_date
  if (template.weekdays) {
    newSchedule.value.weekdays = parseWeekdays(template.weekdays)
  } else if (Array.isArray(template.rules) && template.rules.length) {
    newSchedule.value.weekdays = [
      ...new Set(template.rules.map((r) => r.weekday?.toLowerCase()).filter(Boolean)),
    ]
  }
  $q.notify({ type: 'info', message: 'Template loaded successfully', timeout: 3000 })
}

const parseWeekdays = (weekdaysStr) => {
  if (!weekdaysStr) return []
  if (Array.isArray(weekdaysStr)) return weekdaysStr.map((d) => d.toString().trim().toLowerCase())
  return weekdaysStr
    .toString()
    .split(',')
    .map((d) => d.trim().toLowerCase())
}

// ─── Modal handlers ───────────────────────────────────────────────────────────
const openAddModal = () => {
  newSchedule.value = _freshSchedule()
  addConflictWarning.value = false
  fetchEmployees()
  fetchShiftTemplatesList()
  showAddModal.value = true
}

const openQuickAddModal = (userId, dayIdx) => {
  quickAdd.value = {
    userId,
    day: dayIdx,
    shifts: [{ shiftTemplate: null }],
    leaveType: null,
  }
  fetchShiftTemplatesList()
  showQuickAddModal.value = true
}

const openReassignModal = async (shift) => {
  await fetchSites()
  await fetchShiftTemplatesList()
  if (shift.isMerged && shift.shifts?.length > 1) {
    if (shift.shifts.find((s) => !s.assignmentId)) {
      $q.notify({
        type: 'negative',
        message: 'Cannot update — missing assignment ID on one of the shifts',
        timeout: 5000,
      })
      return
    }
    const resolveTemplateId = (s) => {
      const fromTemplate = Number(s.shiftTemplateId) || null
      if (fromTemplate && shiftTemplates.value.find((t) => t.id === fromTemplate))
        return fromTemplate
      const fromType = Number(s.shiftTypeId) || null
      if (fromType && shiftTemplates.value.find((t) => t.id === fromType)) return fromType
      return fromTemplate || fromType
    }
    const mainTemplateId = resolveTemplateId(shift.shifts[0])
    reassignData.value = {
      assignmentId: null,
      shiftTemplateId: mainTemplateId,
      originalTemplateId: mainTemplateId,
      dualShifts: shift.shifts.map((s) => ({
        assignmentId: s.assignmentId,
        shiftTemplateId: resolveTemplateId(s),
        originalTemplateId: resolveTemplateId(s),
        originalTemplateName: s.position || 'N/A',
        originalSiteName: s.siteName || getSiteName(s.site),
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      currentEmployee: shift.userId,
      date: shift.shifts[0].date,
      day: shift.day,
      isDualShift: true,
    }
    showReassignModal.value = true
    return
  }
  if (!shift.assignmentId) {
    $q.notify({
      type: 'negative',
      message: 'Cannot update this shift',
      caption: 'Missing required field: Assignment ID',
      timeout: 5000,
    })
    return
  }
  const _fromTemplate = Number(shift.shiftTemplateId) || null
  const _fromType = Number(shift.shiftTypeId) || null
  const templateId =
    _fromTemplate && shiftTemplates.value.find((t) => t.id === _fromTemplate)
      ? _fromTemplate
      : _fromType && shiftTemplates.value.find((t) => t.id === _fromType)
        ? _fromType
        : _fromTemplate || _fromType
  reassignData.value = {
    assignmentId: shift.assignmentId,
    shiftTemplateId: templateId,
    originalTemplateId: templateId,
    originalTemplateName:
      shiftTemplates.value.find((t) => t.id === templateId)?.name ||
      shiftTemplates.value.find((t) => t.id === templateId)?.time_display ||
      shift.position ||
      'N/A',
    originalSiteName: shift.siteName || getSiteName(shift.site),
    originalTime: `${shift.startTime || ''} - ${shift.endTime || ''}`,
    originalDuration: shift.duration,
    currentEmployee: shift.userId,
    date: shift.date,
    day: shift.day,
    isDualShift: false,
    dualShifts: [],
  }
  showReassignModal.value = true
}

// ─── CRUD actions ─────────────────────────────────────────────────────────────
const resolveId = (val) => {
  if (val === null || val === undefined) return null
  const raw = typeof val === 'object' ? val?.value : val
  const n = parseInt(raw)
  return isNaN(n) ? null : n
}

const addSchedule = async () => {
  const n = newSchedule.value
  if (!n.userIds?.length)
    return $q.notify({ type: 'negative', message: 'Please select at least one employee.' })
  if (n.scheduleType === 'one-time') {
    if (!n.selectedDates?.length)
      return $q.notify({ type: 'negative', message: 'Please select at least one date.' })
    for (const s of n.oneTimeShifts) {
      if (!s.shiftTemplate)
        return $q.notify({
          type: 'negative',
          message: 'Please select a shift template for all shifts.',
        })
    }
  }
  if (n.scheduleType === 'recurring') {
    if (!n.recurringStartDate)
      return $q.notify({ type: 'negative', message: 'Please select a start date.' })
    if (!n.recurringEndDate)
      return $q.notify({ type: 'negative', message: 'Please select an end date.' })
    if (!n.recurringSchedule)
      return $q.notify({ type: 'negative', message: 'Please select a recurring template.' })
  }
  isCheckingConflict.value = true
  addConflictWarning.value = false
  try {
    const cId = normalizeCompanyId()
    if (n.scheduleType === 'recurring') {
      const template = recurringSchedules.value.find((r) => r.id === resolveId(n.recurringSchedule))
      const rules = Array.isArray(template?.rules) && template.rules.length ? template.rules : []
      const recurringEntries = rules.map((rule) => {
        const entry = {
          recurring_id: resolveId(n.recurringSchedule),
          weekday: rule.weekday,
          start_date: n.recurringStartDate,
          end_date: n.recurringEndDate,
        }
        const ruleShiftType = resolveId(rule.shift_type)
        const ruleShiftTemplate = resolveId(rule.shift_template)
        if (ruleShiftType) entry.shift_type = ruleShiftType
        else if (ruleShiftTemplate) entry.shift_template = ruleShiftTemplate
        if (n.startTime || rule.start_time) entry.start_time = n.startTime || rule.start_time
        if (n.endTime || rule.end_time) entry.end_time = n.endTime || rule.end_time
        return entry
      })
      const payload = {
        company_id: cId,
        employee_ids: n.userIds,
        recurring: recurringEntries,
      }
      await assignShift(payload)
    } else {
      const schedulePayloads = n.selectedDates.flatMap((dateStr) =>
        n.oneTimeShifts.map((shift) => {
          const templateId = resolveId(shift.shiftTemplate)
          const template = shiftTemplates.value.find((t) => t.id === templateId)
          const siteId = template?.site || template?.site_id
          return {
            date: dateStr,
            shift_template_id: templateId,
            site_id: siteId ? Number(siteId) : undefined,
          }
        }),
      )
      const payload = {
        company_id: cId,
        employee_ids: n.userIds,
        schedules: schedulePayloads,
      }
      await assignShift(payload)
    }
    showAddModal.value = false
    newSchedule.value = _freshSchedule()
    if (n.recurringStartDate || n.selectedDates?.[0]) {
      const targetDate = new Date((n.recurringStartDate || n.selectedDates[0]) + 'T00:00:00')
      selectedWeek.value = getWeekRange(targetDate)
    }
    await new Promise((r) => setTimeout(r, 1200))
    delete scheduleCache.value[fmtDate(selectedWeek.value.start)]
    await fetchData()
    fetchLeaves()
    const scheduleLabel = n.scheduleType === 'recurring' ? 'Recurring schedule' : 'Schedule'
    const startHint =
      n.scheduleType === 'recurring' && n.recurringStartDate
        ? ` Starting ${n.recurringStartDate}.`
        : ''
    $q.notify({
      type: 'positive',
      message: `${scheduleLabel} created successfully!`,
      caption: `Navigate to the correct week to see the new shifts.${startHint}`,
      icon: 'check_circle',
      timeout: 5000,
    })
  } catch (error) {
    handleScheduleError(error)
  } finally {
    isCheckingConflict.value = false
  }
}

const quickAddSchedule = async () => {
  const { userId, day, shifts: qShifts } = quickAdd.value
  if (!userId || day === null)
    return $q.notify({ type: 'negative', message: 'Employee and day are required.' })
  for (let i = 0; i < qShifts.length; i++) {
    if (!qShifts[i].shiftTemplate)
      return $q.notify({
        type: 'negative',
        message: `Please select a shift template for shift ${i + 1}`,
      })
  }
  isAddingShift.value = true
  try {
    const cId = normalizeCompanyId()
    const { start } = selectedWeek.value
    const targetDate = new Date(start)
    targetDate.setDate(targetDate.getDate() + day)
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`
    await assignShift({
      company_id: cId,
      employee_ids: [userId],
      schedules: qShifts.map((shift) => {
        const templateId =
          typeof shift.shiftTemplate === 'object' ? shift.shiftTemplate.value : shift.shiftTemplate
        const template = shiftTemplates.value.find((t) => t.id === Number(templateId))
        const siteId = template?.site || template?.site_id
        return {
          date: dateStr,
          shift_template_id: Number(templateId),
          site_id: siteId ? Number(siteId) : undefined,
        }
      }),
    })
    $q.notify({
      type: 'positive',
      message: `${qShifts.length} shift${qShifts.length > 1 ? 's' : ''} added successfully for ${days[day]}!`,
      icon: 'check_circle',
    })
    showQuickAddModal.value = false
    quickAdd.value = { userId: null, day: null, shifts: [], leaveType: null }
    delete scheduleCache.value[fmtDate(selectedWeek.value.start)]
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 500)
  } catch (error) {
    handleScheduleError(error)
  } finally {
    isAddingShift.value = false
  }
}

const handleReassignShift = async () => {
  isReassigning.value = true
  const r = reassignData.value
  try {
    if (r.isDualShift) {
      await Promise.all(
        r.dualShifts.map((s) => {
          const templateId = parseInt(r.shiftTemplateId)
          const template = shiftTemplates.value.find((t) => t.id === templateId)
          const resolvedCompanyId = template?.company?.id || template?.company_id || companyId.value
          const payload = {
            employee_id: r.currentEmployee,
            company_id: parseInt(resolvedCompanyId),
            date: r.date,
            shift_template_id: templateId,
            assignment_id: s.assignmentId,
          }
          return reassignShiftApi(payload).then((res) => ({ ...res, assignmentId: s.assignmentId }))
        }),
      )
      $q.notify({
        type: 'positive',
        message: 'Both shifts updated successfully!',
        icon: 'check_circle',
        timeout: 3000,
      })
      delete scheduleCache.value[fmtDate(selectedWeek.value.start)]
      fetchData()
    } else {
      const templateId = parseInt(r.shiftTemplateId)
      const template = shiftTemplates.value.find((t) => t.id === templateId)
      const resolvedCompanyId = template?.company?.id || template?.company_id || companyId.value
      const payload = {
        employee_id: r.currentEmployee,
        company_id: parseInt(resolvedCompanyId),
        date: r.date,
        shift_template_id: templateId,
        assignment_id: r.assignmentId,
      }
      await reassignShiftApi(payload)
      $q.notify({
        type: 'positive',
        message: 'Shift updated successfully!',
        icon: 'check_circle',
        timeout: 3000,
      })
      delete scheduleCache.value[fmtDate(selectedWeek.value.start)]
      fetchData()
    }
    showReassignModal.value = false
  } catch (error) {
    console.error('Reassign failed:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to reassign shift.',
      timeout: 6000,
    })
  } finally {
    isReassigning.value = false
  }
}

const assignDayOff = async (element) => {
  assigningDayOffId.value = element.id
  try {
    const cId = normalizeCompanyId()
    await assignDayOffApi({
      employee_id: element.userId,
      company_id: cId,
      date: element.date,
      site_id: parseInt(element.site),
    })
    const idx = shifts.value.findIndex((s) => s.id === element.id)
    if (idx !== -1)
      shifts.value[idx] = {
        ...shifts.value[idx],
        position: 'Day Off',
        startTime: null,
        endTime: null,
      }
    $q.notify({
      type: 'positive',
      message: 'Day off assigned!',
      caption: `${getEmployeeName(element.userId)}'s shift changed to Day Off`,
      icon: 'event_busy',
      timeout: 3000,
    })
    delete scheduleCache.value[fmtDate(selectedWeek.value.start)]
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 1500)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to assign day off.',
      timeout: 5000,
    })
  } finally {
    assigningDayOffId.value = null
  }
}

const assignDualDayOff = async (mergedElement) => {
  assigningDayOffId.value = mergedElement.id
  try {
    const cId = normalizeCompanyId()
    await Promise.all(
      mergedElement.shifts.map((s) =>
        assignDayOffApi({
          employee_id: mergedElement.userId,
          company_id: cId,
          date: s.date,
          site_id: parseInt(s.site),
        }),
      ),
    )
    $q.notify({
      type: 'positive',
      message: 'Day off assigned to both shifts!',
      caption: `${getEmployeeName(mergedElement.userId)}'s dual shift changed to Day Off`,
      icon: 'event_busy',
      timeout: 3000,
    })
    delete scheduleCache.value[fmtDate(selectedWeek.value.start)]
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 1500)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to assign day off.',
      timeout: 5000,
    })
  } finally {
    assigningDayOffId.value = null
  }
}

const quickDirectAssign = async (userId, dayIdx, type, leaveSubType = null) => {
  const key = `${userId}-${dayIdx}-${type}`
  quickActionLoading.value = key
  try {
    const { start } = selectedWeek.value
    const targetDate = new Date(start)
    targetDate.setDate(targetDate.getDate() + dayIdx)
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`
    const cId = String(normalizeCompanyId())
    if (type === 'leave') {
      const leaveType = leaveTypes.value.find((lt) => lt.id === leaveSubType)
      if (!leaveType) {
        return $q.notify({ type: 'negative', message: 'Invalid leave type selected.' })
      }
      const payload = {
        employee_id: userId,
        leave_type: leaveType.id,
        start_date: dateStr,
        end_date: dateStr,
        hours: 8,
        reason: leaveType.name || 'Leave',
        company_id: cId,
      }
      const postRes = await applyLeaveForEmployee(payload)
      const apiLeaveId = postRes?.id ?? null
      const localId = `${userId}-${dateStr}-${leaveType.id}-${Date.now()}`
      saveLeaveToStorage({
        localId,
        apiId: apiLeaveId,
        companyId: cId,
        employee_id: userId,
        leave_type: leaveType.id,
        leave_type_name: leaveType.name,
        start_date: dateStr,
        end_date: dateStr,
      })
      $q.notify({
        type: 'positive',
        message: `${leaveType.name} assigned!`,
        caption: `${getEmployeeName(userId)} — ${days[dayIdx]}`,
        icon: 'beach_access',
        timeout: 3000,
      })
    } else {
      const siteOptionsList = sites.value.map((s) => ({ label: s.name, value: s.id }))
      const siteId = parseInt(siteOptionsList[0]?.value)
      if (!siteId)
        return $q.notify({ type: 'negative', message: 'No sites available to assign day off.' })
      await assignDayOffApi({
        employee_id: userId,
        company_id: cId,
        date: dateStr,
        site_id: siteId,
      })
      $q.notify({
        type: 'positive',
        message: 'Day off assigned!',
        caption: `${getEmployeeName(userId)} — ${days[dayIdx]}`,
        icon: 'event_busy',
        timeout: 3000,
      })
    }
    delete scheduleCache.value[fmtDate(selectedWeek.value.start)]
    setTimeout(async () => {
      await fetchData()
      fetchLeaves()
    }, 500)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.detail ||
        `Failed to assign ${type === 'dayoff' ? 'day off' : 'leave'}.`,
      timeout: 5000,
    })
  } finally {
    quickActionLoading.value = null
  }
}

const handleScheduleError = (error) => {
  const data = error.response?.data
  let msg = 'Failed to create schedule'
  if (Array.isArray(data?.errors) && data.errors.length) msg = data.errors.join('; ')
  else if (data?.detail) msg = data.detail
  else if (typeof data === 'string') msg = data
  $q.notify({ type: 'negative', message: msg, timeout: 10000, position: 'top', multiLine: true })
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchSitesAndDepartments()
  await fetchEmployees()
  await fetchLeaveTypes()
  await fetchShiftTemplatesList()
  await fetchData()
  fetchLeaves()
})
</script>

<style scoped>
.page-header {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.title-section {
  display: flex;
  align-items: center;
  gap: 10px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.timezone-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  color: #1d4ed8;
  white-space: nowrap;
}
.timezone-badge .q-icon {
  font-size: 13px;
  color: #3b82f6;
}
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.header-search {
  min-width: 220px;
  max-width: 280px;
}
.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}
.search-icon {
  color: #9ca3af;
}
.add-btn {
  height: 36px;
  border-radius: 8px !important;
  font-weight: 500;
  font-size: 13px;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
}
@media (max-width: 1024px) {
  .header-content { flex-wrap: wrap; gap: 12px; }
  .title-section { width: 100%; }
  .header-actions { width: 100%; justify-content: flex-end; }
  .header-search { max-width: 100%; flex: 1; }
}
@media (max-width: 768px) {
  .header-actions { flex-direction: column; }
  .header-search, .add-btn { width: 100%; max-width: 100%; }
}
@media (max-width: 480px) {
  .page-title { font-size: 18px; }
}

/* Pagination Bar */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  padding: 12px 20px;
  margin-top: 16px;
  gap: 16px;
  flex-wrap: wrap;
}
.pagination-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.pagination-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}
.page-size-select {
  min-width: 120px;
}
.page-size-select :deep(.q-field__control) {
  border-radius: 8px;
}
.schedule-pagination :deep(.q-btn) {
  font-weight: 600;
  border-radius: 8px;
  min-width: 32px;
  min-height: 32px;
}
.schedule-pagination :deep(.q-btn--active) {
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
}
@media (max-width: 768px) {
  .pagination-bar {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
  }
  .pagination-info {
    justify-content: center;
  }
}
</style>
