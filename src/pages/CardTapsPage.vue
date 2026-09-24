<template>
  <PageShell>
    <div class="ctp-page">
      <!-- ── Page header ─────────────────────────────────────────────────── -->
      <header class="ctp-head">
        <div class="ctp-head__titles">
          <h1 class="ctp-head__title">Card taps</h1>
          <p class="ctp-head__sub">{{ headerSummary }}</p>
        </div>
      </header>

      <!-- ── Error ──────────────────────────────────────────────────────── -->
      <div v-if="error" class="ctp-alert" role="alert">
        <q-icon name="o_error" size="18px" class="ctp-alert__icon" />
        <p class="ctp-alert__text">{{ error }}</p>
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          label="Retry"
          class="ctp-alert__btn"
          @click="retry"
        />
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="close"
          aria-label="Dismiss"
          class="ctp-alert__close"
          @click="clearError"
        />
      </div>

      <!-- ── List card ───────────────────────────────────────────────────── -->
      <section class="dash-panel ctp-list">
        <div class="ctp-toolbar">
          <!-- Inert while a date range is active: stepping one day at a time has
               no meaning when the list already spans a span of days. -->
          <div class="ctp-daynav" :class="{ 'ctp-daynav--off': dateRangeActive }">
            <q-btn
              flat
              dense
              round
              size="11px"
              icon="chevron_left"
              class="ctp-daynav__btn"
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
              class="ctp-daynav__field dash-field"
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
              class="ctp-daynav__btn"
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
              class="ctp-daynav__today"
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
            class="ctp-search dash-field"
          >
            <template v-slot:prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>

          <!-- Opens the range picker. Separate from the day navigator: that walks
               one day at a time, this reviews a span for a single employee. -->
          <q-btn
            outline
            no-caps
            dense
            size="12px"
            icon="o_date_range"
            :label="dateRangeLabel || 'Date range'"
            class="ctp-range-btn"
            :class="{ 'ctp-range-btn--on': dateRangeActive }"
            @click="openDateRangePicker"
          >
            <q-tooltip>Review one employee between two dates</q-tooltip>
          </q-btn>

          <span class="ctp-toolbar__count">
            {{ filteredTotal }} {{ filteredTotal === 1 ? 'record' : 'records' }}
          </span>
          <span
            v-if="dateRangeActive && filteredTotal > 0"
            class="ctp-toolbar__hours"
          >
            · {{ reviewTotalHours }} total
          </span>
        </div>

        <div v-if="activeFilters.length" class="ctp-applied">
          <span class="ctp-applied__label">Filtered by</span>
          <button
            v-for="f in activeFilters"
            :key="f.key"
            type="button"
            class="ctp-applied__chip"
            @click="clearFilter(f.key)"
          >
            <span class="ctp-applied__chip-text">{{ f.label }}</span>
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
        <CardTapsCardList
          v-if="$q.screen.lt.md"
          :rows="pagedRows"
          :loading="loading"
          :is-filtered="activeFilters.length > 0"
          :single-employee="singleEmployee"
          @view-taps="openTapDetail"
          @clear-filters="clearAllFilters"
        />
        <CardTapsTable
          v-else
          :rows="pagedRows"
          :loading="loading"
          :is-filtered="activeFilters.length > 0"
          :single-employee="singleEmployee"
          :sort-by="sort.by"
          :descending="sort.desc"
          @update:sort="onSortChange"
          @view-taps="openTapDetail"
          @clear-filters="clearAllFilters"
        />

        <footer v-if="filteredTotal > 0" class="ctp-foot">
          <div class="ctp-foot__left">
            <span class="ctp-foot__range dash-num">
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
              :popup-content-class="'ctp-popup'"
              class="ctp-foot__size dash-field"
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
            class="ctp-pager"
            @update:model-value="onPageChange"
          />
        </footer>
      </section>
    </div>

    <!-- Date Range Picker Dialog -->
    <AttendanceDateRangePicker
      v-model="showDatePicker"
      title="Review card taps"
      :initial-range="tempDateRange"
      :initial-employee="dateRangeEmployee"
      :employee-options="employeeOptions"
      :options-loading="filtersLoading"
      @apply="applyDateRange"
    />

    <!-- Tap detail dialog -->
    <CardTapsTapDetailDialog v-model="showTapDetail" :row="selectedRow" />
  </PageShell>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useCompany } from '@/composables/page/useCompany'
import { useCardTaps } from '@/composables/page/useCardTaps'
import { todayIso, shiftIso, longLabel } from '@/composables/utils/calendarDate'
import { tapCount, totalDurationLabel } from '@/composables/utils/cardTaps'
import PageShell from '@/components/layout/PageShell.vue'
import AttendanceDateRangePicker from '@/components/pages/Attendance/AttendanceDateRangePicker.vue'
import CardTapsTable from '@/components/pages/CardTaps/CardTapsTable.vue'
import CardTapsCardList from '@/components/pages/CardTaps/CardTapsCardList.vue'
import CardTapsTapDetailDialog from '@/components/pages/CardTaps/CardTapsTapDetailDialog.vue'

const $q = useQuasar()

const { companyId } = useCompany()
const { rows, loading, error, fetchCardTaps, reset, clearError } = useCardTaps()

// ─── Today ─────────────────────────────────────────────────────────────────────
// A computed, not a constant: a tab left open overnight must not keep reporting
// yesterday. (The attendance page caches this once at setup — that is the known
// stray from the calendarDate convention, not the rule.)
const today = computed(() => todayIso())

// ─── Filters ───────────────────────────────────────────────────────────────────
// The endpoint answers the whole company in one call, so every filter below is
// client-side — no per-day fetch is ever owed.
const filters = ref({ date_from: today.value, date_to: today.value })
const currentDate = ref(today.value)
const employeeSearch = ref('')
const searchRef = ref(null)

const dateRangeActive = ref(false)
const dateRangeEmployee = ref(null)
const tempDateRange = ref({ from: '', to: '' })

const showDatePicker = ref(false)
const showTapDetail = ref(false)
const selectedRow = ref(null)

const singleEmployee = computed(() =>
  Boolean(dateRangeActive.value && dateRangeEmployee.value),
)

const filtersLoading = computed(() => loading.value)

// The employee filter for the range picker. Derived from whatever is loaded:
// the picker is opened against the data on screen, not against a roster call
// the page would otherwise have to make.
const employeeOptions = computed(() => {
  const seen = new Map()
  for (const row of rows.value) {
    if (!seen.has(row.employee_name)) seen.set(row.employee_name, row.employee_name)
  }
  return Array.from(seen.values()).map((name) => ({ label: name, value: name }))
})

// ─── Pagination ────────────────────────────────────────────────────────────────
const pagination = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 })
const pageSizeOptions = [10, 25, 50]

// Column sort, held here rather than inside the table: the table only ever sees
// one page of rows, so sorting there would reorder 25 records out of 56 and
// leave the rest stranded on page 2.
//
// Sorted keys are the ones that compare cleanly: dates and counts. The payload's
// tap-time and duration strings ("08:10:23 AM", "2h 9m 32s") do not sort
// lexicographically, so those columns deliberately stay unsorted.
const sort = ref({ by: '', desc: false })

// ─── Filter application ────────────────────────────────────────────────────────
const filteredRows = computed(() => {
  let data = rows.value

  if (dateRangeActive.value) {
    const { date_from: from, date_to: to } = filters.value
    data = data.filter((row) => row.date >= from && row.date <= to)
    if (dateRangeEmployee.value) {
      data = data.filter((row) => row.employee_name === dateRangeEmployee.value)
    }
  } else if (currentDate.value) {
    data = data.filter((row) => row.date === currentDate.value)
  }

  if (employeeSearch.value && employeeSearch.value.trim()) {
    const term = employeeSearch.value.trim().toLowerCase()
    data = data.filter((row) => row.employee_name.toLowerCase().includes(term))
  }

  return data
})

const filteredTotal = computed(() => filteredRows.value.length)

// Sum of the visible rows' durations, "Xh Ym" — shown only while a range review
// is active so the span of hours means something.
const reviewTotalHours = computed(() => totalDurationLabel(filteredRows.value))

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTotal.value / pagination.value.rowsPerPage)),
)

// Searching or narrowing can drop the row count below the page the reader is
// on, which would show them an empty table with no hint that the rows are
// behind them. Snap back to the last page that exists.
watch(totalPages, (max) => {
  if (pagination.value.page > max) pagination.value.page = max
})

// The value a row sorts by for a given column. Kept as strings so the
// comparator stays one code path — dates and counts are already ISO/numeric
// ordered.
function sortValueFor(row, key) {
  switch (key) {
    case 'employee':
      return String(row?.employee_name || '').toLowerCase()
    case 'date':
      return row?.date || ''
    case 'tap_count':
      return tapCount(row)
    default:
      return ''
  }
}

// Array#sort is stable, so records sharing a value keep the order the fetch
// returned them in.
const sortedRows = computed(() => {
  const key = sort.value.by
  const dir = sort.value.desc ? -1 : 1

  return [...filteredRows.value].sort((a, b) => {
    if (!key) return 0
    const av = sortValueFor(a, key)
    const bv = sortValueFor(b, key)
    return av < bv ? -dir : av > bv ? dir : 0
  })
})

const pagedRows = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.rowsPerPage
  return sortedRows.value.slice(start, start + pagination.value.rowsPerPage)
})

// ─── Header + filters ─────────────────────────────────────────────────────────
function longDayLabel(iso) {
  if (!iso) return ''
  const date = new Date(`${iso}T00:00:00`)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// The formatted span string shared by the toolbar button, the header subtitle and
// the applied-filter chips.
const dateRangeSpanLabel = computed(() => {
  if (!dateRangeActive.value) return ''
  const { date_from: from, date_to: to } = filters.value
  return from === to ? longDayLabel(from) : `${longLabel(from)} – ${longLabel(to)}`
})

// The toolbar button's label: employee + span once one person is selected, the
// span alone otherwise. Empty while inactive so the button shows its fallback.
const dateRangeLabel = computed(() => {
  if (!dateRangeActive.value) return ''
  return dateRangeEmployee.value
    ? `${dateRangeEmployee.value} · ${dateRangeSpanLabel.value}`
    : dateRangeSpanLabel.value
})

// The header subtitle names the current selection: the date, or the employee and
// span being reviewed.
const headerSummary = computed(() => {
  if (dateRangeActive.value) {
    const person = dateRangeEmployee.value ? `${dateRangeEmployee.value} · ` : ''
    return `${person}${dateRangeSpanLabel.value}`
  }
  if (!currentDate.value) return ''
  return currentDate.value === today.value
    ? `Today · taps on ${longDayLabel(currentDate.value)}`
    : `Taps on ${longDayLabel(currentDate.value)}`
})

const activeFilters = computed(() => {
  const out = []
  if (dateRangeActive.value) {
    out.push({ key: 'dateRange', label: dateRangeSpanLabel.value })
    if (dateRangeEmployee.value) {
      out.push({ key: 'dateRangeEmployee', label: dateRangeEmployee.value })
    }
  }
  if (employeeSearch.value?.trim()) {
    out.push({ key: 'search', label: `“${employeeSearch.value.trim()}”` })
  }
  return out
})

function clearFilter(key) {
  if (key === 'search') employeeSearch.value = ''
  // Dropping the span leaves range mode entirely; dropping just the employee
  // widens the same span to everyone.
  if (key === 'dateRange') exitDateRange()
  if (key === 'dateRangeEmployee') dateRangeEmployee.value = null
}

// Clears the search and the range too, not just the date — this backs both the
// toolbar's "Clear all" and the empty state's "Clear filters".
function clearAllFilters() {
  filters.value = { date_from: today.value, date_to: today.value }
  employeeSearch.value = ''
  dateRangeActive.value = false
  dateRangeEmployee.value = null
  currentDate.value = today.value
  pagination.value.page = 1
}

// "/" focuses search, matching the Attendance and Employees pages. Ignored while
// the user is already typing somewhere, so it never swallows a literal slash.
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
// Every move is client-side — the whole company's taps are already in memory —
// so navigation never refetches, only re-filters.
function onDateNavChange(val) {
  if (!val) return
  currentDate.value = val
  filters.value.date_from = val
  filters.value.date_to = val
  pagination.value.page = 1
}

function goToPreviousDay() {
  const day = shiftIso(currentDate.value, -1)
  onDateNavChange(day)
}

function goToNextDay() {
  const day = shiftIso(currentDate.value, 1)
  onDateNavChange(day)
}

function goToToday() {
  onDateNavChange(today.value)
}

// ─── Date range ───────────────────────────────────────────────────────────────
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

  filters.value.date_from = range.from <= range.to ? range.from : range.to
  filters.value.date_to = range.from <= range.to ? range.to : range.from
  dateRangeEmployee.value = range.employee ?? null
  dateRangeActive.value = true
  showDatePicker.value = false
  pagination.value.page = 1
}

// Back to the single day the navigator was last on
function exitDateRange() {
  dateRangeActive.value = false
  dateRangeEmployee.value = null
  filters.value.date_from = currentDate.value
  filters.value.date_to = currentDate.value
  pagination.value.page = 1
}

// ─── Tap detail ───────────────────────────────────────────────────────────────
function openTapDetail(row) {
  selectedRow.value = row
  showTapDetail.value = true
}

// ─── Error retry ──────────────────────────────────────────────────────────────
function retry() {
  fetchCardTaps()
}

// ─── Pagination handlers ──────────────────────────────────────────────────────
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

// ─── Lifecycle ────────────────────────────────────────────────────────────────
// Refetch per workspace: a company switch must not keep another company's taps
// on screen, and the composable clears its rows on reset.
watch(companyId, (id) => {
  reset()
  if (id) fetchCardTaps()
}, { immediate: true })
</script>

<style scoped>
/* ============================================================================
   CARD TAPS PAGE
   ----------------------------------------------------------------------------
   Mirrors the Attendance page's chrome (see AttendancePage.vue) — the two pages
   are meant to read as siblings: a day-at-a-time navigator, a date-range review
   for one employee, and a search box, over one list card.
   ========================================================================== */
.ctp-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.ctp-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.ctp-head__titles {
  min-width: 0;
}

.ctp-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.ctp-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Error ── */
.ctp-alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-radius: var(--dash-r-md);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
  color: var(--dash-critical);
}
.ctp-alert__icon {
  flex: none;
}
.ctp-alert__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
}
.ctp-alert__btn {
  color: inherit;
  font-weight: 600;
}
.ctp-alert__close {
  color: inherit;
}

/* ── List card ── */
.ctp-list {
  overflow: hidden;
}

/* ── Toolbar ── */
.ctp-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

/* ── Day navigator ── */
.ctp-daynav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.ctp-daynav__btn {
  color: var(--dash-ink-3);
}
.ctp-daynav__btn:hover {
  color: var(--dash-ink);
  background: var(--dash-n-100);
}

.ctp-daynav__field {
  width: 152px;
}
.ctp-daynav__field :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.ctp-daynav__field :deep(.q-field__native) {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  min-height: 34px;
  padding: 0;
}
.ctp-daynav__field :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.ctp-daynav__today {
  margin-left: 4px;
  color: var(--dash-accent);
  font-weight: 600;
}

/* ── Search + filter ── */
.ctp-search {
  flex: 1 1 180px;
  min-width: 0;
  max-width: 280px;
}
.ctp-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.ctp-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.ctp-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.ctp-range-btn {
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

.ctp-range-btn :deep(.q-btn__content) {
  flex-wrap: nowrap;
  gap: 6px;
}

.ctp-range-btn :deep(.block) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Quasar paints `outline` as a pseudo-element border; recolour that rather than
   adding a second border on top of it. */
.ctp-range-btn :deep(.q-btn__content + span),
.ctp-range-btn::before {
  border-color: var(--dash-line-strong);
}

.ctp-range-btn:hover::before {
  border-color: var(--dash-n-400);
}

/* An applied range puts the employee and span in the label, so mark the button
   as carrying state rather than sitting idle. */
.ctp-range-btn--on {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}

.ctp-range-btn--on::before,
.ctp-range-btn--on:hover::before {
  border-color: var(--dash-accent);
}

/* The day navigator is disabled, not hidden, while a range is on — hiding it
   would make the toolbar jump every time a range is applied or cleared. */
.ctp-daynav--off {
  opacity: 0.45;
  pointer-events: none;
}

.ctp-toolbar__count {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Total hours beside the record count during a range review. */
.ctp-toolbar__hours {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-ink-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Applied filters ── */
.ctp-applied {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding: 9px 16px;
  border-bottom: 1px solid var(--dash-line);
  background: var(--dash-n-25);
}

.ctp-applied__label {
  font-size: 12px;
  color: var(--dash-ink-4);
  white-space: nowrap;
}

.ctp-applied__chip {
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
.ctp-applied__chip:hover {
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
}
.ctp-applied__chip:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}

.ctp-applied__chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Footer ── */
.ctp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 16px;
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  flex-wrap: wrap;
}

.ctp-foot__left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.ctp-foot__range {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.ctp-foot__size {
  width: 132px;
}
.ctp-foot__size :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.ctp-foot__size :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink-2);
  min-height: 32px;
  padding: 0;
}
.ctp-foot__size :deep(.q-field__marginal) {
  height: 32px;
  color: var(--dash-ink-4);
}

.ctp-pager :deep(.q-btn) {
  min-width: 30px;
  min-height: 30px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
}
.ctp-pager :deep(.q-btn:hover) {
  background: var(--dash-n-100);
  color: var(--dash-ink);
}
.ctp-pager :deep(.q-btn--active) {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line-strong);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}

.btn-quiet {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
  padding: 0 8px;
}

/* ============================================================================
   RESPONSIVE
   ----------------------------------------------------------------------------
     >= 1024   table
     < 1024    CardTapsCardList replaces the table; no sideways scroll
     < 640     day navigator and search go full width, footer stacks
   ========================================================================== */
@media (max-width: 1023px) {
  .ctp-head__title {
    font-size: 20px;
  }
  .ctp-toolbar {
    padding: 10px 14px;
  }
  .ctp-daynav {
    width: 100%;
  }
  .ctp-daynav__field {
    flex: 1;
    width: auto;
  }
  .ctp-search {
    flex: 1 1 160px;
    max-width: none;
  }
  .ctp-applied,
  .ctp-foot {
    padding-left: 14px;
    padding-right: 14px;
  }
}

@media (max-width: 639px) {
  .ctp-toolbar__count,
  .ctp-toolbar__hours {
    display: none;
  }
}
</style>