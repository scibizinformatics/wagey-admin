<template>
  <PageShell>
    <div class="att-page">
      <!-- ── Page header ─────────────────────────────────────────────────── -->
      <header class="att-head">
        <div class="att-head__titles">
          <h1 class="att-head__title">Attendance</h1>
          <p class="att-head__sub">{{ dateSummary }}</p>
        </div>
        <q-btn
          unelevated
          no-caps
          icon="add"
          label="Add attendance"
          class="btn-primary"
          @click="openAddDialog"
        />
      </header>

      <!-- ── List card ──────────────────────────────────────────────────── -->
      <section class="dash-panel att-list">
        <div class="att-toolbar">
          <!-- The day being viewed is the page's primary control, so it leads
               the toolbar rather than sitting in a separate "Filter Records"
               strip below the stats. -->
          <!-- Inert while a date range is active: stepping one day at a time has
               no meaning when the list already spans a span of days. -->
          <div class="daynav" :class="{ 'daynav--off': dateRangeActive }">
            <q-btn
              flat
              dense
              round
              size="11px"
              icon="chevron_left"
              class="daynav__btn"
              aria-label="Previous day"
              :disable="dateRangeActive"
              @click="goToPreviousDay"
            />
            <q-input
              v-model="currentDate"
              type="date"
              dense
              outlined
              hide-bottom-space
              class="daynav__field dash-field"
              aria-label="Date"
              :disable="dateRangeActive"
              @update:model-value="onDateNavChange"
            />
            <q-btn
              flat
              dense
              round
              size="11px"
              icon="chevron_right"
              class="daynav__btn"
              aria-label="Next day"
              :disable="dateRangeActive || currentDate >= today"
              @click="goToNextDay"
            />
            <q-btn
              v-if="currentDate !== today && !dateRangeActive"
              flat
              dense
              no-caps
              size="11px"
              label="Today"
              class="daynav__today"
              @click="goToToday"
            />
          </div>

          <q-input
            ref="searchRef"
            v-model="employeeSearch"
            placeholder="Search employee"
            dense
            outlined
            clearable
            hide-bottom-space
            class="att-search dash-field"
          >
            <template v-slot:prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>

          <!-- Payout group, resolved from each employee's active contract. This
               replaced a cost-centre select; cost centre is still used by the
               add and edit dialogs, it just no longer filters the list. -->
          <!-- Disabled during a date range: payout group is resolved per employee
               from their active contract, one request each, which would mean
               resolving a whole span's worth of people to filter a view that is
               usually already narrowed to one of them. -->
          <q-select
            v-if="payrollGroupOptions.length"
            v-model="payrollGroupFilter"
            :options="payrollGroupSelectOptions"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            :disable="dateRangeActive"
            :popup-content-class="'att-popup'"
            class="att-filter dash-field"
            aria-label="Filter by payout group"
          >
            <template v-slot:prepend>
              <q-icon name="o_groups" size="16px" />
            </template>
            <q-tooltip v-if="dateRangeActive">
              Not available while a date range is active
            </q-tooltip>
          </q-select>

          <!-- Opens the range picker. Separate from the day navigator: that walks
               one day at a time, this reviews a span for a single employee. -->
          <q-btn
            outline
            no-caps
            dense
            size="12px"
            icon="o_date_range"
            :label="dateRangeLabel || 'Date range'"
            class="att-range-btn"
            :class="{ 'att-range-btn--on': dateRangeActive }"
            @click="openDateRangePicker"
          >
            <q-tooltip>Review one employee between two dates</q-tooltip>
          </q-btn>

          <span class="att-toolbar__count">
            {{ filteredTotal }} {{ filteredTotal === 1 ? 'record' : 'records' }}
          </span>
        </div>

        <div v-if="activeFilters.length" class="att-applied">
          <span class="att-applied__label">Filtered by</span>
          <button
            v-for="f in activeFilters"
            :key="f.key"
            type="button"
            class="att-applied__chip"
            @click="clearFilter(f.key)"
          >
            <span class="att-applied__chip-text">{{ f.label }}</span>
            <q-icon name="close" size="13px" />
          </button>
          <q-btn
            flat
            dense
            no-caps
            size="11px"
            label="Clear all"
            class="btn-quiet"
            @click="clearAllFilters"
          />
        </div>

        <!-- Cards below 1024px, table above. -->
        <AttendanceCardList
          v-if="$q.screen.lt.md"
          :rows="pagedRows"
          :loading="loading || resolvingGroups"
          :employees="employees"
          :is-filtered="activeFilters.length > 0"
          :single-employee="reviewingSingleEmployee"
          @view-selfie="viewSelfie"
          @view-photo="viewEmployeePhoto"
          @edit-time="openInlineEdit"
          @view-audit="openAuditTrail"
          @clear-filters="clearAllFilters"
        />
        <AttendanceTable
          v-else
          :rows="pagedRows"
          :loading="loading || resolvingGroups"
          :employees="employees"
          :is-filtered="activeFilters.length > 0"
          :single-employee="reviewingSingleEmployee"
          :sort-by="sort.by"
          :descending="sort.desc"
          @update:sort="onSortChange"
          @view-selfie="viewSelfie"
          @view-photo="viewEmployeePhoto"
          @edit-time="openInlineEdit"
          @view-audit="openAuditTrail"
          @clear-filters="clearAllFilters"
        />

        <footer v-if="filteredTotal > 0" class="att-foot">
          <div class="att-foot__left">
            <span class="att-foot__range dash-num">
              {{ (pagination.page - 1) * pagination.rowsPerPage + 1 }}–{{
                Math.min(pagination.page * pagination.rowsPerPage, filteredTotal)
              }}
              of {{ filteredTotal }}
            </span>
            <q-select
              :model-value="pagination.rowsPerPage"
              :options="pageSizeOptions.map((n) => ({ label: `${n} per page`, value: n }))"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              dense
              outlined
              hide-bottom-space
              :popup-content-class="'att-popup'"
              class="att-foot__size dash-field"
              @update:model-value="onRowsPerPageChange"
            />
          </div>
          <q-pagination
            :model-value="pagination.page"
            :max="totalPages"
            :max-pages="$q.screen.lt.md ? 3 : 6"
            boundary-numbers
            direction-links
            :ripple="false"
            icon-first="first_page"
            icon-prev="chevron_left"
            icon-next="chevron_right"
            icon-last="last_page"
            class="att-pager"
            @update:model-value="onPageChange"
          />
        </footer>
      </section>
    </div>
    <!-- Date Range Picker Dialog -->
    <AttendanceDateRangePicker
      v-model="showDatePicker"
      :initial-range="tempDateRange"
      :initial-employee="dateRangeEmployee"
      :employee-options="employeeOptions"
      :options-loading="filtersLoading"
      @apply="applyDateRange"
    />

    <!-- Selfie Viewer Dialog -->
    <AttendanceSelfieViewer
      v-model="showSelfieDialog"
      :image-url="selectedSelfie"
      :title="selfieDialogTitle"
    />

    <!-- Add Attendance Dialog -->
    <AttendanceAddDialog
      v-model="showAddDialog"
      v-model:record="newRecord"
      :cost-center-options="costCenterOptions"
      :employee-options="addDialogEmployeeOptions"
      :schedule="employeeSchedule"
      :schedule-loading="loadingSchedule"
      :options-loading="filtersLoading"
      :saving="creating"
      :recorded-assignments="alreadyRecordedAssignments"
      :completed-assignments="alreadyCompletedAssignments"
      :completed-record-count="completedRecordCount"
      @submit="submitAttendance"
      @fetch-schedule="fetchEmployeeSchedule"
    />

    <!-- Audit Trail Dialog -->
    <AttendanceAuditDialog
      v-model="showAuditDialog"
      :record="auditRecord"
      :employee-name="auditEmployeeName"
      :photo="auditPhoto"
      :timezone="auditTimezone"
      @acknowledged="onAuditAcknowledged"
    />

    <!-- Employee Photo Viewer Dialog -->
    <AttendanceEmployeePhotoViewer
      v-model="showEmployeePhotoDialog"
      :image-url="selectedEmployeePhoto"
    />

    <!-- Inline Time Edit Dialog -->
    <AttendanceInlineEditDialog
      v-model="showInlineEditDialog"
      v-model:value="inlineEdit.value"
      :field="inlineEdit.field"
      :employee-name="inlineEdit.employeeName"
      :date="inlineEdit.date"
      :saving="inlineEdit.saving"
      @save="saveInlineEdit"
    />

    <!-- Edit Attendance Dialog -->
    <AttendanceEditDialog
      v-model="showEditDialog"
      v-model:record="editingRecord"
      :cost-center-options="costCenterOptions"
      :options-loading="filtersLoading"
      :saving="updating"
      @submit="updateAttendance"
    />
  </PageShell>
</template>

<script setup>
import { api } from 'src/boot/axios'
import { BASE, extractErrorMessage } from 'src/composables/utils/http'
import { sortShiftsByStart } from 'src/composables/utils/schedule'
import { useAuthStore } from 'src/boot/auth'
import { useCompany } from '@/composables/page/useCompany'
import PageShell from '@/components/layout/PageShell.vue'
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAttendance } from '@/composables/page/useAttendance'
import { useEmployees } from '@/composables/page/useEmployees'
import { toUTC, formatInTimezone } from '@/composables/utils/timezone'
import { useOrganization } from '@/composables/page/useOrganization'
import AttendanceTable from '@/components/pages/Attendance/AttendanceTable.vue'
import AttendanceCardList from '@/components/pages/Attendance/AttendanceCardList.vue'
import AttendanceDateRangePicker from '@/components/pages/Attendance/AttendanceDateRangePicker.vue'
import AttendanceSelfieViewer from '@/components/pages/Attendance/AttendanceSelfieViewer.vue'
import AttendanceAddDialog from '@/components/pages/Attendance/AttendanceAddDialog.vue'
import AttendanceEmployeePhotoViewer from '@/components/pages/Attendance/AttendanceEmployeePhotoViewer.vue'
import AttendanceInlineEditDialog from '@/components/pages/Attendance/AttendanceInlineEditDialog.vue'
import AttendanceEditDialog from '@/components/pages/Attendance/AttendanceEditDialog.vue'
import AttendanceAuditDialog from '@/components/pages/Attendance/AttendanceAuditDialog.vue'

// Shared accessors — these were duplicated verbatim between this page and
// AttendanceTable, so the two could disagree about the same record.
import {
  getEmployeeId,
  getEmployeeName as getEmployeeNameFor,
  getEmployeePhoto as getEmployeePhotoFor,
  getShiftName,
  getAssignmentId,
  getLockedShiftRecordIds,
  isRecordComplete,
  rowMatchesEmployee,
} from '@/composables/utils/attendance'
import { useAdminPayrollGroups } from '@/composables/admin/useAdminPayrollGroups'
import { useEmployeePayoutGroup } from '@/composables/page/useEmployeePayoutGroup'
import { useLoadedToast } from '@/composables/useLoadedToast'
import { useToast } from '@/composables/useToast'

const $q = useQuasar()
const toast = useToast()

const { companyId } = useCompany()
const { notifyLoaded } = useLoadedToast()

// ─── Composables ──────────────────────────────────────────────────────────────
const {
  attendanceData,
  loading,
  fetchAttendance,
  fetchAttendanceByDate,
  fetchEmployeeSchedule: fetchScheduleFromComposable,
  logAttendance,
  updateAttendance: updateAttendanceApi,
  invalidateCache: invalidateAttendanceCache,
} = useAttendance()

const { employees, fetchEmployees, fetchEmployee } = useEmployees()
const {
  sites: rawSites,
  costCenters: rawCostCenters,
  fetchSites: fetchSitesApi,
  fetchCostCenters: fetchCostCentersApi,
} = useOrganization()

// ─── Local UI state ───────────────────────────────────────────────────────────
// Counted, not a flag. Sites and employees are fetched together on mount and
// both drive this; with a plain boolean the first to finish reported the filters
// ready while the employee list was still on the wire, so the dropdown rendered
// as loaded and empty.
const filtersInFlight = ref(0)
const filtersLoading = computed(() => filtersInFlight.value > 0)

// Dialog states
const showDatePicker = ref(false)
const showAuditDialog = ref(false)
const showEditDialog = ref(false)
const showAddDialog = ref(false)
const showSelfieDialog = ref(false)
const selectedSelfie = ref('')
const selfieDialogTitle = ref('')

// Inline time edit state
const showInlineEditDialog = ref(false)
const inlineEdit = ref({
  record: null,
  field: '',
  value: '',
  date: '',
  employeeName: '',
  saving: false,
})

// Loading states
const updating = ref(false)
const creating = ref(false)

// Schedule state
const employeeSchedule = ref(null)
const loadingSchedule = ref(false)
const scheduleError = ref(null)

const showEmployeePhotoDialog = ref(false)
const selectedEmployeePhoto = ref('')
const selectedEmployeeName = ref('')

const pagination = ref({
  page: 1,
  rowsPerPage: 25,
  rowsNumber: 0,
})

const pageSizeOptions = [10, 25, 50]

// Column sort, held here rather than inside the table: the table only ever sees
// one page of rows, so sorting there would reorder 25 records out of 56 and
// leave the rest stranded on page 2. Sorting the whole filtered set here means
// clicking "Work type" really does pull every rest-day row to the front.
const sort = ref({ by: '', desc: false })

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

// cost_center stays in `filters` because fetchAttendanceData still forwards it
// as a query param when set — it is simply no longer driven by a filter control.
const filters = ref({
  date_from: today,
  date_to: today,
  cost_center: '',
})

// ─── Payout group filter ──────────────────────────────────────────────────────
// Client-side, unlike the cost-centre filter it replaced: cost_center is a
// supported query param on the attendance endpoint, payout group is not. The
// group comes from each employee's active contract instead.
const { payrollGroups, fetchPayrollGroups } = useAdminPayrollGroups()
const {
  resolving: resolvingGroups,
  groupIdFor,
  inlineGroupId,
  ensure: ensurePayoutGroups,
} = useEmployeePayoutGroup()

const payrollGroupFilter = ref(null)

const payrollGroupOptions = computed(() =>
  payrollGroups.value.map((g) => ({ label: g.name, value: g.id })),
)

const payrollGroupSelectOptions = computed(() => [
  { label: 'All payout groups', value: null },
  ...payrollGroupOptions.value,
])

/**
 * Roster primary key for an attendance row's employee.
 *
 * Rows carry either a uuid or a numeric id, but the contract endpoint wants the
 * numeric pk — so resolve through the roster rather than passing whatever the
 * row happened to hold.
 */
function rosterIdFor(rowEmployee) {
  if (rowEmployee && typeof rowEmployee === 'object' && rowEmployee.id) return rowEmployee.id
  const key = getEmployeeId(rowEmployee)
  if (!key) return null
  const found = employees.value.find((e) => e.uuid === key || e.id === key)
  return found?.id ?? (typeof key === 'number' ? key : null)
}

function rowPayoutGroupId(row) {
  const inline = inlineGroupId(row.employee)
  if (inline !== null) return inline
  return groupIdFor(rosterIdFor(row.employee))
}

const currentDate = ref(today)
const tempDateRange = ref({ from: '', to: '' })

// Audit trail dialog — snapshot of the row whose eye icon was clicked
const auditRecord = ref({})
const auditEmployeeName = ref('')
const auditPhoto = ref('')
const auditTimezone = ref('')

// ─── Date-range review ────────────────────────────────────────────────────────
// A span of days for (optionally) one employee, as an alternative to the
// day-at-a-time navigator. Held apart from `currentDate` so that leaving range
// mode drops the user back on the day they were looking at before.
const dateRangeActive = ref(false)
const dateRangeEmployee = ref(null)

const reviewingSingleEmployee = computed(() =>
  Boolean(dateRangeActive.value && dateRangeEmployee.value),
)

function isoDayLabel(iso) {
  if (!iso) return ''
  // Pin to local midnight — a bare YYYY-MM-DD parses as UTC and can shift a day
  const date = new Date(`${iso}T00:00:00`)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const dateRangeSpanLabel = computed(() => {
  if (!dateRangeActive.value) return ''
  const { date_from: from, date_to: to } = filters.value
  return from === to ? isoDayLabel(from) : `${isoDayLabel(from)} – ${isoDayLabel(to)}`
})

const dateRangeEmployeeName = computed(() => {
  if (!dateRangeEmployee.value) return ''
  const match = employeeOptions.value.find(
    (o) => String(o.value) === String(dateRangeEmployee.value),
  )
  return match?.label ?? 'Selected employee'
})

// Doubles as the toolbar button's label, so an active review is legible without
// opening the dialog.
const dateRangeLabel = computed(() => {
  if (!dateRangeActive.value) return ''
  return dateRangeEmployeeName.value
    ? `${dateRangeEmployeeName.value} · ${dateRangeSpanLabel.value}`
    : dateRangeSpanLabel.value
})

// The option values come from `emp.id || emp.uuid` while getEmployeeId() on a
// record prefers uuid, so a roster entry carrying both would compare unequal.
// Match against every id the record exposes rather than picking one.
// Every calendar month the span touches, as ['2026-07', '2026-08', …]. The
// attendance endpoint takes year and month in its path, so a span crossing a
// month boundary needs one request per month.
function monthsInRange(from, to) {
  const out = []
  let [year, month] = from.split('-').map(Number)
  const [endYear, endMonth] = to.split('-').map(Number)

  while (year < endYear || (year === endYear && month <= endMonth)) {
    out.push({ year: String(year), month: String(month).padStart(2, '0') })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return out
}

// Filter options
const siteOptions = ref([])
const costCenterOptions = ref([])
const employeeOptions = ref([])
const employeeSearch = ref('')
const searchRef = ref(null)

// Edit form
const editingRecord = ref(null)

// Add form
const newRecord = ref({
  employee: '',
  cost_center_id: '',
  date: '',
  time_in: '',
  time_out: '',
  source: 'admin',
  selected_assignment_id: null,
})

// Every attendance the employee already has on the day being added. This is
// what the Add dialog refuses against: a day that has already been clocked in
// and out must not take a second record, because payroll would then count it
// twice.
//
// `attendanceData` holds a whole month, so the date has to be part of the match
// — without it a record on any other day of the month would block this one.
const existingRecordsForNewRecord = computed(() => {
  if (!newRecord.value.employee || !newRecord.value.date) return []
  const employeeId = getEmployeeId(newRecord.value.employee)
  return attendanceData.value.filter((a) => {
    const aEmp = a.employee?.id ?? a.employee?.uuid ?? a.employee_uuid ?? a.employee
    if (String(aEmp) !== String(employeeId)) return false
    const recordDate = a.date || a.attendance_date || a.log_date
    return recordDate === newRecord.value.date
  })
})

// The same records keyed by the shift they were filed against, for the
// per-shift badges. The assignment id is read through getAssignmentId rather
// than `a.assignment_id` directly: the list endpoint nests it under
// `employee_assignment`, and reading the flat spelling alone left this list
// permanently empty, which is how a completed shift could be recorded twice in
// the first place.
const alreadyRecordedAssignments = computed(() =>
  existingRecordsForNewRecord.value.map(getAssignmentId).filter(Boolean),
)

// A subset of the above: shifts whose record already has both punches. Those are
// worked and done — the dialog says so rather than the vaguer "already recorded".
const alreadyCompletedAssignments = computed(() =>
  existingRecordsForNewRecord.value.filter(isRecordComplete).map(getAssignmentId).filter(Boolean),
)

// A count, not ids, so the dialog can still refuse a duplicate on a day whose
// records carry no assignment id at all — the case where nothing can be matched
// shift-by-shift and the per-shift badges have nothing to go on.
const completedRecordCount = computed(
  () => existingRecordsForNewRecord.value.filter(isRecordComplete).length,
)

// Shifts on the books for the day being added. A day is fully accounted for
// once its completed records cover every one of them. Zero means the schedule
// has not loaded (or does not exist), and a day with no schedule is refused
// separately below with its own message.
const shiftsScheduledForNewRecord = computed(() => employeeSchedule.value?.length ?? 0)

/**
 * Who is looking at this page, from the auth store.
 *
 * This used to be `JSON.parse(localStorage.getItem('user') || '{}')` at the top
 * level of setup. The `|| '{}'` guards a *missing* key, not a malformed one — so
 * a `user` value that would not parse threw during setup and blanked the whole
 * page, not just these two readings. It also re-derived `role === 'admin'`,
 * which the store already exposes as an `isAdmin` getter, from a second read of
 * the same key.
 *
 * Computed rather than resolved once, so both track a sign-in that completes
 * after this page is created.
 */
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)
const createdBy = computed(() => authStore.user?.employee_uuid || null)

// ─── Timezone cache ──────────────────────────────────────────────────────────────
const employeeTimezoneCache = reactive({})
const fetchedEmployees = ref({})

function getTimezoneForEmployee(employee) {
  const empId = getEmployeeId(employee)
  if (!empId) return null
  if (employeeTimezoneCache[empId]) return employeeTimezoneCache[empId]
  if (typeof employee === 'object' && employee.timezone) {
    employeeTimezoneCache[empId] = employee.timezone
    return employee.timezone
  }
  const found = employees.value.find((e) => e.uuid === empId || e.id === empId)
  if (found?.timezone) {
    employeeTimezoneCache[empId] = found.timezone
    return found.timezone
  }
  return null
}

function triggerTimezoneFetch(data) {
  for (const row of data) {
    const empId = getEmployeeId(row.employee)
    if (!empId) continue
    if (employeeTimezoneCache[empId]) continue
    if (typeof row.employee === 'object' && row.employee.timezone) {
      employeeTimezoneCache[empId] = row.employee.timezone
      continue
    }
    const found = employees.value.find((e) => e.uuid === empId || e.id === empId)
    if (found?.timezone) {
      employeeTimezoneCache[empId] = found.timezone
      continue
    }
    queueTimezoneFetch(empId)
  }
}

// A browser allows about six concurrent connections per host. Firing an
// employee-detail request for everyone at once filled that queue with lookups,
// and the attendance requests behind them — the next month of a range, the next
// day — waited their turn. Four at a time keeps the timezone stamps arriving
// without ever being what the table is waiting on.
const MAX_CONCURRENT_TIMEZONE_FETCHES = 4
const timezoneQueue = []
let timezoneFetchesInFlight = 0

function queueTimezoneFetch(empId) {
  if (fetchedEmployees.value[empId]) return
  fetchedEmployees.value[empId] = true
  timezoneQueue.push(empId)
  pumpTimezoneQueue()
}

function pumpTimezoneQueue() {
  while (timezoneFetchesInFlight < MAX_CONCURRENT_TIMEZONE_FETCHES && timezoneQueue.length) {
    const empId = timezoneQueue.shift()
    timezoneFetchesInFlight += 1
    fetchEmployee(empId)
      .then((detail) => {
        if (detail?.timezone) employeeTimezoneCache[empId] = detail.timezone
      })
      .catch(() => {
        /* timezone fetch failed, will use browser timezone */
      })
      .finally(() => {
        timezoneFetchesInFlight -= 1
        pumpTimezoneQueue()
      })
  }
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const filteredAttendanceRows = computed(() => {
  let data = attendanceData.value

  if (dateRangeActive.value) {
    // The endpoint returns whole months, so the span is trimmed here. Records
    // carry a plain YYYY-MM-DD `date`, which compares correctly as a string.
    const { date_from: from, date_to: to } = filters.value
    data = data.filter((row) => {
      const recordDate = row.date || row.attendance_date || row.log_date
      return recordDate && recordDate >= from && recordDate <= to
    })

    if (dateRangeEmployee.value) {
      data = data.filter((row) => rowMatchesEmployee(row, dateRangeEmployee.value))
    }
  } else if (currentDate.value) {
    data = data.filter((row) => {
      const recordDate = row.date || row.attendance_date || row.log_date
      return recordDate === currentDate.value
    })
  }
  if (employeeSearch.value && employeeSearch.value.trim()) {
    const term = employeeSearch.value.trim().toLowerCase()
    data = data.filter((row) => getEmployeeName(row.employee).toLowerCase().includes(term))
  }

  // A row whose group cannot be resolved is excluded while a group is selected —
  // "show me group A" should not fall back to including unknowns.
  if (payrollGroupFilter.value) {
    data = data.filter(
      (row) => String(rowPayoutGroupId(row) ?? '') === String(payrollGroupFilter.value),
    )
  }
  return data
})

const filteredTotal = computed(() => filteredAttendanceRows.value.length)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTotal.value / pagination.value.rowsPerPage)),
)

// Searching, picking a payout group or a shorter span can drop the row count
// below the page the reader is on, which would show them an empty table with no
// hint that the rows are behind them. Snap back to the last page that exists.
watch(totalPages, (max) => {
  if (pagination.value.page > max) pagination.value.page = max
})

// The rows actually handed to the table.
//
// Sliced here for both modes, because both hold the whole set in memory: a
// range covers whole months, and a single day is one month's response filtered
// down to a date. Day mode used to skip the slice on the assumption that the
// server had already paged, which left the pager drawing pages that all
// rendered the same rows — every record for the day, on every page.
//
// The per-row timezone stamp happens here rather than in filteredAttendanceRows
// so it only ever runs over one page of rows instead of the whole span.
// Records that cannot take a manual time because their shift is already
// accounted for by another, completed record. Resolved over the whole loaded
// month rather than over `filteredAttendanceRows`, so a search or a payout-group
// filter that happens to hide the completed record does not quietly unlock its
// duplicate.
const lockedShiftRecordIds = computed(() => getLockedShiftRecordIds(attendanceData.value))

function shiftLockReason(row) {
  const shift = getShiftName(row)
  return shift && shift !== '—'
    ? `${shift} already has a completed attendance for this day. Edit that record instead — times entered here would count the shift twice.`
    : 'This shift already has a completed attendance for this day. Edit that record instead — times entered here would count the shift twice.'
}

// The value a row sorts by for a given column. Kept as strings so the
// comparator stays one code path — dates and times are already ISO-ordered, and
// names and work types compare case-insensitively.
function sortValueFor(row, key) {
  switch (key) {
    case 'employee':
      return getEmployeeName(row.employee).toLowerCase()
    case 'date':
      return row.date || row.attendance_date || row.log_date || ''
    case 'work_type':
      return (row.work_type || '').toLowerCase()
    case 'shift_name':
      return (getShiftName(row) || '').toLowerCase()
    case 'time_in':
      return row.time_in || ''
    case 'time_out':
      return row.time_out || ''
    default:
      return ''
  }
}

// "Work" is the status the reader comes to this table for, so those records are
// pinned above every other work type — and above the untyped rows — no matter
// which column is sorted or in which direction. The chosen sort then orders
// rows inside each of the two blocks.
function isWorkRecord(row) {
  return String(row?.work_type || '')
    .trim()
    .toLowerCase()
    .startsWith('work')
}

// Sorted before the page slice, over every row that survived the filters.
//
// Rows with no value for the sorted column sink to the bottom in both
// directions: a descending sort on work type should lead with the work types,
// not with a block of em dashes. Array#sort is stable, so records sharing a
// value keep the order the fetch returned them in.
const sortedAttendanceRows = computed(() => {
  const key = sort.value.by
  const dir = sort.value.desc ? -1 : 1

  return [...filteredAttendanceRows.value].sort((a, b) => {
    const pinned = (isWorkRecord(b) ? 1 : 0) - (isWorkRecord(a) ? 1 : 0)
    if (pinned) return pinned
    if (!key) return 0

    const av = sortValueFor(a, key)
    const bv = sortValueFor(b, key)
    if (!av && !bv) return 0
    if (!av) return 1
    if (!bv) return -1
    return av < bv ? -dir : av > bv ? dir : 0
  })
})

// The current page's rows, undecorated. Split out of `pagedRows` so the timezone
// prefetch below can watch what is on screen without also depending on the
// timezone cache those fetches fill — which would make the watcher retrigger
// itself on every arrival.
const visibleRows = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.rowsPerPage
  return sortedAttendanceRows.value.slice(start, start + pagination.value.rowsPerPage)
})

const pagedRows = computed(() => {
  const locked = lockedShiftRecordIds.value

  return visibleRows.value.map((row) => {
    const isLocked = locked.has(row.id)
    return {
      ...row,
      _timezone: getTimezoneForEmployee(row.employee) || '',
      _shiftLocked: isLocked,
      _shiftLockedReason: isLocked ? shiftLockReason(row) : '',
    }
  })
})

// Timezone stamps are resolved for the page being looked at, not for everything
// the fetch returned. A range covering three months of a whole company used to
// queue a lookup per person the moment the data landed — thousands of rows, one
// request each, none of them on screen. Paging or re-sorting picks up whoever is
// newly visible.
watch(
  () => visibleRows.value.map((row) => getEmployeeId(row.employee)).join(','),
  () => triggerTimezoneFetch(visibleRows.value),
  { immediate: true },
)

// ─── Header + filters ─────────────────────────────────────────────────────────
const dateSummary = computed(() => {
  if (dateRangeActive.value) {
    return dateRangeEmployeeName.value
      ? `${dateRangeEmployeeName.value} · ${dateRangeSpanLabel.value}`
      : dateRangeSpanLabel.value
  }
  if (!currentDate.value) return ''
  // Parsed as parts rather than `new Date(string)` so the label is not shifted a
  // day by the browser treating a bare date as UTC midnight.
  const [y, m, d] = currentDate.value.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return currentDate.value === today ? `Today · ${label}` : label
})

/** Everything narrowing the list beyond the chosen day, each removable. */
const activeFilters = computed(() => {
  const out = []
  if (dateRangeActive.value) {
    out.push({ key: 'dateRange', label: dateRangeSpanLabel.value })
    if (dateRangeEmployee.value) {
      out.push({ key: 'dateRangeEmployee', label: dateRangeEmployeeName.value })
    }
  }
  if (employeeSearch.value?.trim()) {
    out.push({ key: 'search', label: `“${employeeSearch.value.trim()}”` })
  }
  if (payrollGroupFilter.value) {
    const group = payrollGroupOptions.value.find((g) => g.value === payrollGroupFilter.value)
    out.push({ key: 'payrollGroup', label: group?.label ?? 'Payout group' })
  }
  return out
})

function clearFilter(key) {
  if (key === 'search') employeeSearch.value = ''
  if (key === 'payrollGroup') payrollGroupFilter.value = null
  // Dropping the span leaves range mode entirely; dropping just the employee
  // widens the same span to everyone, which needs no refetch — the months are
  // already loaded and filteredAttendanceRows re-runs on its own.
  if (key === 'dateRange') exitDateRange()
  if (key === 'dateRangeEmployee') dateRangeEmployee.value = null
}

// "/" focuses search, matching the Employees page. Ignored while the user is
// already typing somewhere, so it never swallows a literal slash.
function onGlobalKey(e) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
  e.preventDefault()
  searchRef.value?.focus()
}

onMounted(() => window.addEventListener('keydown', onGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))

// ─── Date navigation ──────────────────────────────────────────────────────────
function goToPreviousDay() {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() - 1)
  const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  currentDate.value = newDate
  filters.value.date_from = newDate
  filters.value.date_to = newDate
  pagination.value.page = 1
  fetchAttendanceData()
}

function goToNextDay() {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() + 1)
  const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  currentDate.value = newDate
  filters.value.date_from = newDate
  filters.value.date_to = newDate
  pagination.value.page = 1
  fetchAttendanceData()
}

function onDateNavChange(val) {
  if (!val) return
  currentDate.value = val
  filters.value.date_from = val
  filters.value.date_to = val
  pagination.value.page = 1
  fetchAttendanceData()
}

// Jumping back to today was previously only reachable through "Clear All",
// which also dropped the cost-centre filter as a side effect.
function goToToday() {
  onDateNavChange(today)
}

// ─── Selfie viewer ────────────────────────────────────────────────────────────
function viewSelfie(imageUrl, title) {
  selectedSelfie.value = imageUrl
  selfieDialogTitle.value = `${title} Selfie`
  showSelfieDialog.value = true
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
async function fetchEmployeeSchedule(employeeId, date) {
  if (!employeeId || !date) return

  loadingSchedule.value = true
  scheduleError.value = null
  employeeSchedule.value = null

  try {
    const schedulesList = await fetchScheduleFromComposable(employeeId, date)
    if (schedulesList && schedulesList.length > 0) {
      const sortedList = sortShiftsByStart(schedulesList)
      employeeSchedule.value = sortedList.map((s) => ({
        employee_id: s.employee_id,
        employee_name: s.employee_name,
        position: s.position_name,
        site: s.site_name,
        date: s.schedule_date,
        shift_start: formatScheduleTime(s.start_time),
        shift_end: formatScheduleTime(s.end_time),
        status: s.status,
        assignment_id: s.id ?? s.employee_assignment_id ?? s.assignment_id ?? null,
      }))
    } else {
      employeeSchedule.value = null
    }
  } catch (error) {
    scheduleError.value = extractErrorMessage(error, 'Failed to load schedule')
    employeeSchedule.value = null
  } finally {
    loadingSchedule.value = false
  }
}

async function hasScheduleForEmployeeDate(employeeId, date) {
  try {
    const schedules = await fetchScheduleFromComposable(employeeId, date)
    return schedules && schedules.length > 0
  } catch {
    return false
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────
// Stamped on each fetch so a superseded one cannot publish over its successor.
// Changing the range while the previous span's months are still in the air used
// to be a race decided by whichever server response happened to land last.
let fetchToken = 0

async function fetchAttendanceData(params = {}) {
  const token = ++fetchToken
  const isCurrent = () => token === fetchToken

  try {
    // No page/limit, in either mode. The endpoint is keyed by year/month, and
    // day mode narrows that month down to one date client-side (see
    // filteredAttendanceRows), so a server-side page would be a slice of the
    // *month*: the rows for the selected day would arrive scattered across
    // pages, and asking for page 2 could return a page holding none of them.
    // Both modes therefore fetch the month and paginate locally.
    const extraParams = {
      ...(filters.value.cost_center ? { cost_center: filters.value.cost_center } : {}),
      ...params,
    }

    if (dateRangeActive.value) {
      const { date_from: from, date_to: to } = filters.value
      const months = monthsInRange(from, to)

      // No page/limit here: the span is narrowed client-side, so a server-side
      // page would silently clip days off the end of each month.
      //
      // The employee goes up as well. Reviewing one person over a fortnight was
      // still downloading every punch the whole company made across the months
      // it touched, which is the bulk of what makes a range slow. `loadMonth`
      // works out for itself whether the endpoint honours it and stops sending
      // it if not, so the rows are still narrowed client-side below either way.
      const rangeParams = {
        ...(filters.value.cost_center ? { cost_center: filters.value.cost_center } : {}),
        ...(dateRangeEmployee.value ? { employee: dateRangeEmployee.value } : {}),
        ...params,
      }

      // The same record can't arrive twice, but months are fetched independently
      // and a boundary record showing up in both would render as a duplicate.
      const collected = []
      const seen = new Set()

      // One request per calendar month the span touches — the endpoint keys off
      // year/month in its path — issued together rather than in sequence, and
      // published as each one lands rather than only once the slowest has. A
      // span crossing several months used to sit blank for the whole round trip
      // even though the first month back usually holds rows the reader can
      // already work with. `commit: false` keeps each month from publishing
      // itself, so what reaches the table is always the assembled span.
      await Promise.all(
        months.map(({ year, month }) =>
          fetchAttendance(year, month, rangeParams, { commit: false }).then((rows) => {
            for (const row of rows ?? []) {
              const key = row.id ?? JSON.stringify(row)
              if (seen.has(key)) continue
              seen.add(key)
              collected.push(row)
            }
            if (isCurrent()) attendanceData.value = collected.slice()
          }),
        ),
      )

      if (!isCurrent()) return

      // filteredAttendanceRows trims to the span and employee, so the API's own
      // month totals would overstate the footer count.
      const inRange = filteredAttendanceRows.value
      pagination.value.rowsNumber = inRange.length

      if (inRange.length === 0) {
        showErrorNotification('No attendance records found for this range.')
      }
      notifyLoaded('Attendance', inRange.length)
      return
    }

    let { data, total } = await fetchAttendanceByDate(currentDate.value, extraParams)

    // A count larger than the rows delivered means the endpoint answered with a
    // paginated slice of the month rather than the month itself. Since the day
    // is picked out of that response locally, a slice would hide every record
    // that fell outside it — so ask once more for the whole set. `limit` and
    // `page_size` between them cover both of DRF's paginator styles, and either
    // one is ignored as an unknown query param by the other, so the retry is
    // safe whichever the backend uses. Costs nothing in the common case, where
    // the first response already carried everything.
    if (total > data.length) {
      const full = await fetchAttendanceByDate(currentDate.value, {
        ...extraParams,
        limit: total,
        page_size: total,
      })
      if (full.data.length > data.length) data = full.data
    }

    if (!isCurrent()) return

    attendanceData.value = [...data]
    // The API's count is for the whole month; the footer speaks for the day.
    pagination.value.rowsNumber = filteredAttendanceRows.value.length

    const dateFilteredCount = data.filter((row) => {
      const recordDate = row.date || row.attendance_date || row.log_date
      return recordDate === currentDate.value
    }).length

    if (dateFilteredCount === 0) {
      showErrorNotification('No attendance records found for this date.')
    }
    notifyLoaded('Attendance', dateFilteredCount)
  } catch (error) {
    if (!isCurrent()) return
    showErrorNotification(extractErrorMessage(error, 'Failed to load attendance data'))
    attendanceData.value = []
  }
}

async function fetchSites() {
  filtersInFlight.value += 1
  try {
    await fetchSitesApi()
    siteOptions.value = rawSites.value.map((site) => ({
      label: site.name || site.site_name || site.title || `Site ${site.id}`,
      value: site.id || site.site_id || site.uuid,
      site,
    }))
  } catch (error) {
    showErrorNotification(extractErrorMessage(error, 'Failed to load sites'))
    siteOptions.value = []
  } finally {
    filtersInFlight.value -= 1
  }
}

async function fetchCostCenters() {
  try {
    await fetchCostCentersApi()
    costCenterOptions.value = rawCostCenters.value.map((cc) => ({
      label: cc.name || `Cost Center ${cc.id}`,
      value: cc.id,
      costCenter: cc,
    }))
  } catch {
    costCenterOptions.value = []
  }
}

async function fetchEmployeeDetails() {
  filtersInFlight.value += 1
  try {
    // The resolved rows, not `employees.value`. Two callers sharing one in-flight
    // request left the ref of whichever one joined late unset, so the dropdown
    // was built from an empty list often enough to look random.
    const list = await fetchEmployees()
    employeeOptions.value = list
      .map((emp) => ({
        label: getEmployeeName(emp) || 'Unknown Employee',
        value: emp.uuid || emp.id,
        employee: emp,
      }))
      .filter((opt) => opt.label !== 'Unknown Employee')

    if (employeeOptions.value.length === 0) {
      showErrorNotification('No employees found. Please add employees first.')
    }
  } catch (error) {
    showErrorNotification(extractErrorMessage(error, 'Failed to load employees'))
    employeeOptions.value = []
  } finally {
    filtersInFlight.value -= 1
  }
}

// ─── Submit attendance (add) ──────────────────────────────────────────────────
async function submitAttendance(record) {
  if (creating.value) return

  if (!record.employee) {
    showErrorNotification('Please select an employee')
    return
  }
  if (!record.time_in) {
    showErrorNotification('Please enter a time in')
    return
  }

  // The dialog already disables Save for this, but the check belongs on the
  // submit path too — it is the last point before the POST. Same rule: a shift
  // clocked in and out is finished, and a second record for it makes payroll
  // count the day twice.
  if (
    shiftsScheduledForNewRecord.value > 0 &&
    completedRecordCount.value >= shiftsScheduledForNewRecord.value
  ) {
    showErrorNotification(
      shiftsScheduledForNewRecord.value > 1
        ? 'Every shift scheduled for this day already has a completed attendance. Edit the existing records instead.'
        : 'This employee already has an attendance with a time in and time out on this day. Edit the existing record instead.',
    )
    return
  }

  const targetAssignment = record.selected_assignment_id
  if (targetAssignment != null && alreadyRecordedAssignments.value.includes(targetAssignment)) {
    showErrorNotification(
      alreadyCompletedAssignments.value.includes(targetAssignment)
        ? 'That shift already has a completed attendance for this day. Edit the existing record instead.'
        : 'That shift already has an attendance record for this day. Edit the existing record instead.',
    )
    return
  }

  const employeeId = getEmployeeId(record.employee)
  const selectedEmp = employees.value.find(
    (emp) => emp.id === employeeId || emp.uuid === employeeId,
  )
  const empTimezone = selectedEmp?.timezone || employeeTimezoneCache[employeeId]

  const timeIn = new Date(toUTC(record.date, record.time_in, empTimezone))
  let timeOut = null
  if (record.time_out) {
    timeOut = new Date(toUTC(record.date, record.time_out, empTimezone))
    if (timeOut <= timeIn) timeOut.setDate(timeOut.getDate() + 1)
  }

  if (
    record.date &&
    (!employeeSchedule.value || employeeSchedule.value.length === 0) &&
    !loadingSchedule.value
  ) {
    await $q.dialog({
      title: 'No shift on this day',
      message:
        'Attendance is recorded against a scheduled shift, so this employee needs one for this date before a punch can be added.',
      persistent: true,
      ok: { label: 'OK', color: 'primary' },
    })
    return
  }

  creating.value = true

  let recordId = null

  try {
    if (!selectedEmp) {
      showErrorNotification('Employee not found.')
      return
    }

    const employeeUUID = selectedEmp.uuid || selectedEmp.id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!employeeUUID || !uuidRegex.test(employeeUUID)) {
      showErrorNotification('Invalid employee ID format.')
      return
    }

    if (!createdBy.value) {
      showErrorNotification('User not authenticated. Please log in again.')
      return
    }

    const payload = {
      employee_id: employeeUUID,
      time_in: timeIn.toISOString(),
      source: 'manual',
      connectivity: 'online',
      created_by: createdBy.value,
      ...(record.selected_assignment_id != null && {
        assignment_id: Number(record.selected_assignment_id),
      }),
      ...(timeOut && { time_out: timeOut.toISOString() }),
    }

    const result = await logAttendance(payload)
    recordId = result?.id ?? result?.data?.id

    showSuccessNotification('Attendance recorded successfully!')
    closeAddDialog()
    await fetchAttendanceData()
  } catch (error) {
    if (recordId != null) {
      try {
        await api.delete(`${BASE}/attendance/log/${companyId.value}/${recordId}/`)
        invalidateAttendanceCache()
      } catch {
        /* rollback failure is non-critical */
      }
    }
    showErrorNotification(extractErrorMessage(error, 'Failed to record attendance'))
  } finally {
    creating.value = false
  }
}

// ─── Inline time edit ─────────────────────────────────────────────────────────
async function openInlineEdit(row, field) {
  // The cell renders as a lock rather than a pencil in this case, so reaching
  // here means the row was opened some other way. Refuse it anyway — this is the
  // one place every time edit funnels through.
  if (lockedShiftRecordIds.value.has(row.id)) {
    showErrorNotification(shiftLockReason(row))
    return
  }

  const employeeId = getEmployeeId(row.employee)
  if (!(await hasScheduleForEmployeeDate(employeeId, row.date))) {
    await $q.dialog({
      title: 'No shift on this day',
      message:
        'Attendance is recorded against a scheduled shift, so this employee needs one for this date before a punch can be edited.',
      persistent: true,
      ok: { label: 'OK', color: 'primary' },
    })
    return
  }
  const currentValue = field === 'time_in' ? row.time_in : row.time_out
  inlineEdit.value = {
    record: row,
    field,
    value: formatTimeForInput(currentValue, getTimezoneForEmployee(row.employee)),
    date: row.date,
    employeeName: getEmployeeName(row.employee),
    saving: false,
  }
  showInlineEditDialog.value = true
}

function closeInlineEdit() {
  showInlineEditDialog.value = false
  inlineEdit.value = {
    record: null,
    field: '',
    value: '',
    date: '',
    employeeName: '',
    saving: false,
  }
}

/**
 * Did the record actually land on the punch we sent?
 *
 * Compared to the minute, because that is all the editor can express: the
 * server keeps the seconds it already had (or stamps its own), so an
 * equality test on the ISO strings would call a stored edit a failure.
 * Reads whatever the last refetch published, so call this after one.
 */
function punchLandedAsSent(recordId, field, sentTimestamp) {
  const stored = (attendanceData.value || []).find((row) => row?.id === recordId)
  if (!stored || !sentTimestamp) return false
  const storedAt = new Date(stored[field] || 0).getTime()
  const sentAt = new Date(sentTimestamp).getTime()
  if (isNaN(storedAt) || isNaN(sentAt)) return false
  return Math.floor(storedAt / 60000) === Math.floor(sentAt / 60000)
}

async function saveInlineEdit() {
  if (!inlineEdit.value.value || !inlineEdit.value.record) return

  inlineEdit.value.saving = true
  try {
    const record = inlineEdit.value.record
    const field = inlineEdit.value.field
    const date = record.date
    const empTimezone = getTimezoneForEmployee(record.employee)
    let newTimestamp = toUTC(date, inlineEdit.value.value, empTimezone)

    const existingTimeIn = field === 'time_in' ? newTimestamp : record.time_in
    const existingTimeOut = field === 'time_out' ? newTimestamp : record.time_out

    let timeOutTimestamp = existingTimeOut
    if (existingTimeIn && existingTimeOut) {
      const tIn = new Date(existingTimeIn)
      let tOut = new Date(existingTimeOut)
      if (tOut <= tIn) {
        tOut.setDate(tOut.getDate() + 1)
        timeOutTimestamp = tOut.toISOString()
      }
    }

    const label = field === 'time_in' ? 'Time In' : 'Time Out'
    const sentTimestamp = field === 'time_in' ? existingTimeIn : timeOutTimestamp

    try {
      await updateAttendanceApi(record.id, {
        time_in: existingTimeIn,
        time_out: timeOutTimestamp,
        source: record.source || 'admin',
      })
    } catch (error) {
      // `attendance/log-update/` can save the punch and *then* fail — a 500
      // has been observed arriving with the new time already stored. Reporting
      // that as a flat failure says the opposite of what happened and leaves
      // the stale time on screen until the reader reloads, so ask the server
      // what it actually holds before deciding which message to raise. The
      // error is still surfaced when the write genuinely did not land.
      await fetchAttendanceData()
      if (punchLandedAsSent(record.id, field, sentTimestamp)) {
        showWarningNotification(
          `${label} was saved, but the server reported an error while finishing the update.`,
        )
      } else {
        showErrorNotification(extractErrorMessage(error, 'Failed to update'))
      }
      closeInlineEdit()
      return
    }

    showSuccessNotification(`${label} updated successfully`)
    closeInlineEdit()
    await fetchAttendanceData()
  } catch (error) {
    // Anything reaching here failed before the write was sent, so the rows on
    // screen are still current and no refetch is owed.
    showErrorNotification(extractErrorMessage(error, 'Failed to update'))
  } finally {
    inlineEdit.value.saving = false
  }
}

// ─── Update attendance (edit dialog) ─────────────────────────────────────────
async function updateAttendance(record) {
  if (!record) return

  updating.value = true
  try {
    const selectedEmp = employees.value.find(
      (emp) =>
        emp.id === record.employee ||
        emp.uuid === record.employee ||
        (typeof record.employee === 'object' &&
          (emp.id === record.employee.id || emp.uuid === record.employee.uuid)),
    )

    if (!selectedEmp) {
      showErrorNotification('Employee not found.')
      return
    }

    const empTimezone =
      selectedEmp?.timezone || employeeTimezoneCache[getEmployeeId(record.employee)]

    let timeInTimestamp = null
    let timeOutTimestamp = null

    if (record.time_in) {
      timeInTimestamp = toUTC(record.date, record.time_in, empTimezone)
    }

    if (record.time_out) {
      let timeOutDate = new Date(toUTC(record.date, record.time_out, empTimezone))
      if (record.time_in && timeOutDate <= new Date(timeInTimestamp)) {
        timeOutDate.setDate(timeOutDate.getDate() + 1)
      }
      timeOutTimestamp = timeOutDate.toISOString()
    }

    await updateAttendanceApi(record.id, {
      time_in: timeInTimestamp,
      time_out: timeOutTimestamp,
      time_in_source: record.time_in_source || record.source || 'admin',
      time_out_source: record.time_out_source || record.source || 'admin',
      source: record.source || 'admin',
      ...(record.cost_center_id != null && { cost_center: record.cost_center_id }),
    })

    showSuccessNotification('Attendance updated successfully')
    showEditDialog.value = false
    await fetchAttendanceData()
  } catch (error) {
    const msg =
      error.response?.status === 404
        ? 'Update endpoint not found. Please check the API documentation.'
        : extractErrorMessage(error, 'Failed to update attendance')
    showErrorNotification(msg)
  } finally {
    updating.value = false
  }
}

// ─── Dialog handlers ──────────────────────────────────────────────────────────
function openAddDialog() {
  newRecord.value = {
    employee: '',
    cost_center_id: '',
    date: currentDate.value || today,
    time_in: '',
    time_out: '',
    source: 'admin',
    selected_assignment_id: null,
  }
  employeeSchedule.value = null
  scheduleError.value = null
  loadingSchedule.value = false
  showAddDialog.value = true
}

function closeAddDialog() {
  showAddDialog.value = false
  newRecord.value = {
    employee: '',
    cost_center_id: '',
    date: '',
    time_in: '',
    time_out: '',
    source: 'admin',
    selected_assignment_id: null,
  }
  employeeSchedule.value = null
  scheduleError.value = null
  loadingSchedule.value = false
}

// ─── Filters ──────────────────────────────────────────────────────────────────
// Clears the search and payout-group filters too, not just the date — this backs
// both the toolbar's "Clear all" and the empty state's "Clear filters", and
// leaving either one set would make those actions look broken.
function clearAllFilters() {
  filters.value = { date_from: today, date_to: today, cost_center: '' }
  employeeSearch.value = ''
  payrollGroupFilter.value = null
  dateRangeActive.value = false
  dateRangeEmployee.value = null
  currentDate.value = today
  pagination.value.page = 1
  fetchAttendanceData()
}

function openDateRangePicker() {
  tempDateRange.value = dateRangeActive.value
    ? { from: filters.value.date_from, to: filters.value.date_to }
    : { from: '', to: '' }
  showDatePicker.value = true
}

function applyDateRange(range) {
  if (!range || !range.from || !range.to) {
    showDatePicker.value = false
    return
  }

  // Guard against a hand-entered inverted span; q-date's own range mode can't
  // produce one, but the payload is a plain object either way.
  const from = range.from <= range.to ? range.from : range.to
  const to = range.from <= range.to ? range.to : range.from

  filters.value.date_from = from
  filters.value.date_to = to
  dateRangeEmployee.value = range.employee ?? null
  dateRangeActive.value = true

  // Cleared rather than merely disabled — a filter that still narrows the table
  // while its control is greyed out is the worst of both.
  payrollGroupFilter.value = null

  showDatePicker.value = false
  pagination.value.page = 1
  fetchAttendanceData()
}

// Back to the single day the navigator was last on
function exitDateRange() {
  dateRangeActive.value = false
  dateRangeEmployee.value = null
  filters.value.date_from = currentDate.value
  filters.value.date_to = currentDate.value
  pagination.value.page = 1
  fetchAttendanceData()
}

// Who the add dialog may pick from — a non-admin recording attendance is held to
// the site they picked. Derived rather than assigned: this used to be a QSelect
// `@filter` handler that rewrote `employeeOptions` in place, and since the same
// array is handed to the date-range picker, the site narrowing (and anything
// typed into the add dialog's search) stayed applied and showed up over there as
// a dropdown with a couple of names in it. Matching text is filtered inside each
// dialog now; the page only decides eligibility.
const addDialogEmployeeOptions = computed(() => {
  const siteId = newRecord.value.site_id
  if (isAdmin.value || !siteId) return employeeOptions.value

  return employeeOptions.value.filter((option) => {
    const employee = option.employee ?? {}
    const employeeSiteId = employee.site_id || employee.siteId || employee.site
    return employeeSiteId && Number(employeeSiteId) === Number(siteId)
  })
})

// Both modes page over rows that are already in memory and pagedRows slices
// them, so turning a page is instant and neither handler refetches. Day mode
// used to, which spent a round trip to redisplay the records it already held.
function onPageChange(newPage) {
  pagination.value.page = newPage
}

function onRowsPerPageChange(newSize) {
  pagination.value.rowsPerPage = newSize
  pagination.value.page = 1
}

// Back to page 1 on every sort change — the point of sorting is to see what now
// ranks first, and staying on page 3 hides it.
function onSortChange({ sortBy, descending }) {
  sort.value = { by: sortBy || '', desc: Boolean(descending) }
  pagination.value.page = 1
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Thin wrappers that bind the shared accessors to this page's employee roster.
const getEmployeeName = (employee) => getEmployeeNameFor(employee, employees.value)
const getEmployeePhoto = (employee) => getEmployeePhotoFor(employee, employees.value)

function viewEmployeePhoto(employee) {
  if (!employee) return
  selectedEmployeeName.value = getEmployeeName(employee)
  selectedEmployeePhoto.value = getEmployeePhoto(employee)
  showEmployeePhotoDialog.value = true
}

// ─── Audit trail ──────────────────────────────────────────────────────────────
// The row is snapshotted rather than referenced: a refetch while the dialog is
// open would otherwise swap the record out from under it, or blank it entirely.
function openAuditTrail(row) {
  if (!row) return
  auditRecord.value = { ...row }
  auditEmployeeName.value = getEmployeeName(row.employee)
  auditPhoto.value = getEmployeePhoto(row.employee) || ''
  auditTimezone.value = row._timezone || getTimezoneForEmployee(row.employee) || ''
  showAuditDialog.value = true
}

// The dialog writes the acknowledgement itself; the rows are this page's to
// refresh. Its snapshot is re-synced from the reloaded set afterwards so the
// acknowledgement's author and stamp come from the server rather than being
// assumed here — and so the table's Audit column agrees with the open dialog.
async function onAuditAcknowledged(recordId) {
  await fetchAttendanceData()

  const id = recordId ?? auditRecord.value?.id
  if (!id) return

  const fresh = attendanceData.value.find(
    (row) => String(row?.id) === String(id) || String(row?.uuid) === String(id),
  )
  if (fresh) auditRecord.value = { ...auditRecord.value, ...fresh }
}

function formatTimeForInput(dateTimeString, timezone) {
  if (!dateTimeString) return ''
  return formatInTimezone(dateTimeString, timezone, '24h')
}

function formatScheduleTime(timeString) {
  if (!timeString) return '-'
  try {
    if (/^(\d{1,2}):(\d{2})(:\d{2})?$/.test(timeString)) {
      const [hours, minutes] = timeString.split(':').map(Number)
      return new Date(1970, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
    const date = new Date(timeString)
    if (isNaN(date.getTime())) return timeString
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return timeString
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
function showSuccessNotification(message) {
  toast.success(message, { timeout: 3000 })
}

function showErrorNotification(message) {
  toast.error(message, { timeout: 5000 })
}

function showWarningNotification(message) {
  toast.warning(message, { timeout: 6000 })
}

// ─── Watchers ─────────────────────────────────────────────────────────────────
// Payout groups feed the toolbar select, so the list loads with the page. Gated
// on companyId because fetchPayrollGroups returns an empty list without one, and
// does so silently.
watch(
  companyId,
  (id) => {
    if (id) fetchPayrollGroups()
  },
  { immediate: true },
)

// Contracts are only fetched once a group is actually selected, then cached
// (module-level, shared with the Schedule page). Filtering is client-side, so
// no refetch of attendance is needed — just resolve, then re-evaluate.
watch(payrollGroupFilter, async (groupId) => {
  pagination.value.page = 1
  if (!groupId) return
  const ids = attendanceData.value.map((row) => rosterIdFor(row.employee)).filter(Boolean)
  await ensurePayoutGroups(ids)
})

// Rows arriving for a new date still need resolving while a group filter is on.
watch(attendanceData, async () => {
  if (!payrollGroupFilter.value) return
  const ids = attendanceData.value.map((row) => rosterIdFor(row.employee)).filter(Boolean)
  await ensurePayoutGroups(ids)
})

// Searching is a whole-roster action, so it takes precedence over a range that
// has usually been narrowed to one person — typing into the box would otherwise
// search within that one employee's span and look broken.
watch(employeeSearch, (term) => {
  pagination.value.page = 1
  if (term && term.trim() && dateRangeActive.value) {
    exitDateRange()
  }
})

watch(
  () => newRecord.value.date,
  (newDate) => {
    employeeSchedule.value = null
    scheduleError.value = null
    if (newRecord.value.employee && newDate) {
      newRecord.value.selected_assignment_id = null
      fetchEmployeeSchedule(newRecord.value.employee, newDate)
    }
  },
)

watch(
  () => newRecord.value.employee,
  (newEmp) => {
    if (newEmp && newRecord.value.date) {
      newRecord.value.selected_assignment_id = null
    }
  },
)

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    await Promise.all([fetchSites(), fetchCostCenters(), fetchEmployeeDetails()])
    await fetchAttendanceData()
  } catch {
    showErrorNotification('Error during initialization')
  }
})
</script>

<style scoped>
/* ============================================================================
   ATTENDANCE PAGE
   ----------------------------------------------------------------------------
   Built on the app design system in src/css/dashboard.scss, matching the
   Employees page. Was one card stacking header / stats / a "Filter Records"
   strip / table / pagination; it is now a page header plus a single list card
   whose toolbar carries the day being viewed and the filters.
   ========================================================================== */
.att-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.att-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.att-head__titles {
  min-width: 0;
}

.att-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.att-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Buttons ── */
.btn-primary {
  height: 38px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}
.btn-primary:hover {
  background: #193d5c;
}

.btn-quiet {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  padding: 0 8px;
}

/* ── List card ── */
.att-list {
  /* Corners are clipped on all four sides. The old wrapper set
     `overflow: visible`, which let the footer paint square over the bottom
     radius while the top stayed round. */
  overflow: hidden;
}

/* ── Toolbar ── */
.att-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

/* ── Day navigator ── */
.daynav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.daynav__btn {
  color: var(--dash-ink-3);
}
.daynav__btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

.daynav__field {
  width: 152px;
}
.daynav__field :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.daynav__field :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  min-height: 34px;
  padding: 0;
}
.daynav__field :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.daynav__today {
  margin-left: 4px;
  color: var(--dash-accent);
  font-weight: 600;
}

/* ── Search + filter ── */
.att-search {
  flex: 1 1 180px;
  min-width: 0;
  max-width: 280px;
}
.att-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.att-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.att-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.att-filter {
  width: 172px;
  flex-shrink: 0;
}
.att-filter :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  padding: 0 8px 0 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.att-filter :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  padding: 0;
  min-height: 34px;
}
.att-filter :deep(.q-field__marginal) {
  height: 34px;
  min-width: 0;
  padding: 0;
  color: var(--dash-ink-4);
}
.att-filter :deep(.q-field__prepend) {
  padding-right: 7px;
}

/* ── Date range ── */
/* Sized and edged to sit level with the search and payout-group fields rather
   than reading as a floating action. */
.att-range-btn {
  height: 34px;
  padding: 0 11px;
  border-radius: 8px;
  color: var(--dash-ink-2);
  max-width: 290px;
  font-weight: 500;
  transition:
    background var(--dash-fast, 0.15s) var(--dash-ease, ease),
    border-color var(--dash-fast, 0.15s) var(--dash-ease, ease),
    color var(--dash-fast, 0.15s) var(--dash-ease, ease);
}

.att-range-btn :deep(.q-btn__content) {
  flex-wrap: nowrap;
  gap: 6px;
}

.att-range-btn :deep(.block) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Quasar paints `outline` as a pseudo-element border; recolour that rather than
   adding a second border on top of it. */
.att-range-btn :deep(.q-btn__content + span),
.att-range-btn::before {
  border-color: var(--dash-line-strong);
}

.att-range-btn:hover::before {
  border-color: var(--dash-n-400);
}

/* An applied range puts the employee and span in the label, so mark the button
   as carrying state rather than sitting idle. */
.att-range-btn--on {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}

.att-range-btn--on::before,
.att-range-btn--on:hover::before {
  border-color: var(--dash-accent);
}

/* The day navigator is disabled, not hidden, while a range is on — hiding it
   would make the toolbar jump every time a range is applied or cleared. */
.daynav--off {
  opacity: 0.45;
  pointer-events: none;
}

.att-toolbar__count {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Applied filters ── */
.att-applied {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding: 9px 16px;
  border-bottom: 1px solid var(--dash-line);
  background: var(--dash-n-25);
}

.att-applied__label {
  font-size: 12px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

.att-applied__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 220px;
  padding: 3px 7px 3px 9px;
  border-radius: var(--dash-r-sm);
  border: 1px solid var(--dash-line-strong);
  background: var(--dash-surface);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--dash-ink-2);
  cursor: pointer;
  transition:
    border-color var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.att-applied__chip:hover {
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
}
.att-applied__chip:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

.att-applied__chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Footer ── */
.att-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 16px;
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  flex-wrap: wrap;
}

.att-foot__left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.att-foot__range {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.att-foot__size {
  width: 132px;
}
.att-foot__size :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.att-foot__size :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink-2);
  min-height: 32px;
  padding: 0;
}
.att-foot__size :deep(.q-field__marginal) {
  height: 32px;
  color: var(--dash-ink-4);
}

.att-pager :deep(.q-btn) {
  min-width: 30px;
  min-height: 30px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
}
.att-pager :deep(.q-btn:hover) {
  background: var(--dash-n-100);
  color: var(--dash-ink);
}
.att-pager :deep(.q-btn--active) {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line-strong);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}

/* ============================================================================
   RESPONSIVE
   ----------------------------------------------------------------------------
     >= 1280   table with employee / work type / shift / time in / time out
     1024-1279 work type drops; shift stays — it is load-bearing, and the
               remaining columns still fit the content width without scrolling
     < 1024    AttendanceCardList replaces the table; no sideways scroll
     < 640     day navigator and filters go full width, footer stacks

   The old page had no such staging: it kept nine columns at every width and
   shrank its own type to 10px to cope, which is not a readable table.
   ========================================================================== */
@media (max-width: 1279px) {
  .att-toolbar__count {
    display: none;
  }
}

@media (max-width: 1023px) {
  .att-head__title {
    font-size: 20px;
  }
  .att-toolbar {
    padding: 10px 14px;
  }
  /* The day navigator keeps its own line; search and the cost-centre filter
     share the next one. */
  .daynav {
    width: 100%;
  }
  .daynav__field {
    flex: 1;
    width: auto;
  }
  .att-search {
    flex: 1 1 160px;
    max-width: none;
  }
  .att-filter {
    flex: 1 1 150px;
    width: auto;
  }
  .att-applied,
  .att-foot {
    padding: 9px 14px;
  }
}

@media (max-width: 768px) {
  .att-head {
    align-items: stretch;
  }
  .att-head .btn-primary {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .att-search,
  .att-filter {
    flex: 1 1 100%;
    max-width: none;
  }
  .att-foot {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .att-foot__left {
    justify-content: space-between;
  }
  .att-pager {
    align-self: center;
  }
}
</style>

<style>
/* Select popups teleport to the body, so they sit outside this component's
   style scope. */
.att-popup {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  padding: 4px;
}
.att-popup .q-item {
  min-height: 32px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.att-popup .q-item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.att-popup .q-item--active {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}
</style>
