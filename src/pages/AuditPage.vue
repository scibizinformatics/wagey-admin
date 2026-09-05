<template>
  <PageShell>
    <div class="aud-page">
      <!-- ── Page header ─────────────────────────────────────────────────── -->
      <header class="aud-head">
        <div class="aud-head__titles">
          <h1 class="aud-head__title">Audit trail</h1>
          <p class="aud-head__sub">{{ headerSummary }}</p>
        </div>
      </header>

      <!-- ── Error ───────────────────────────────────────────────────────── -->
      <div v-if="error" class="aud-alert" role="alert">
        <q-icon name="o_error" size="18px" class="aud-alert__icon" />
        <p class="aud-alert__text">{{ error }}</p>
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          label="Retry"
          class="aud-alert__btn"
          @click="refresh"
        />
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="close"
          aria-label="Dismiss"
          class="aud-alert__close"
          @click="clearError"
        />
      </div>

      <!-- What the view is not showing. Said out loud rather than left implied:
           a capped list that looks complete is worse than a shorter one that
           admits where it stops. The filters below run over what is loaded, so
           this does not promise that narrowing them reaches the rest. -->
      <div v-if="truncated" class="aud-note" role="status">
        <q-icon name="o_info" size="17px" class="aud-note__icon" />
        <p class="aud-note__text">
          Showing the {{ rows.length.toLocaleString() }} most recent changes in this workspace.
          Older changes are past the amount this page loads at once.
        </p>
      </div>

      <!-- The trail is narrowed to this workspace using its employee list (the
           endpoint answers company-wide). If that list did not load, the rows
           can still include other companies — better said than left to be read
           as this workspace's history. -->
      <div
        v-if="!companyScoped && rows.length && !loading"
        class="aud-note aud-note--warn"
        role="status"
      >
        <q-icon name="o_warning" size="17px" class="aud-note__icon" />
        <p class="aud-note__text">
          These changes could not be narrowed to this workspace — the employee list did not load, so
          other companies may appear below. Refresh to try again.
        </p>
      </div>

      <!-- ── Trail ───────────────────────────────────────────────────────── -->
      <section class="dash-panel aud-panel">
        <AuditToolbar
          ref="toolbarRef"
          :search="search"
          :kind="kindFilter"
          :sort="sortBy"
          :range="dateRange"
          :count="filteredRows.length"
          :loading="loading"
          @update:search="onFilterChange('search', $event)"
          @update:kind="onFilterChange('kind', $event)"
          @update:sort="sortBy = $event"
          @update:range="onFilterChange('range', $event)"
          @refresh="refresh"
        />

        <!-- Cards below 1024px, table above — the same threshold Attendance,
             Manning and Contributions use. -->
        <AuditCardList
          v-if="$q.screen.lt.md"
          :rows="displayRows"
          :loading="loading"
          :is-filtered="isFiltered"
          @clear-filters="clearFilters"
        />
        <AuditTable
          v-else
          :rows="displayRows"
          :loading="loading"
          :is-filtered="isFiltered"
          @clear-filters="clearFilters"
        />

        <footer v-if="!loading && filteredRows.length" class="aud-foot">
          <div class="aud-foot__left">
            <span class="aud-foot__range dash-num">
              {{ (page - 1) * pageSize + 1 }}–{{
                Math.min(page * pageSize, filteredRows.length)
              }}
              of {{ filteredRows.length.toLocaleString() }}
            </span>
            <q-select
              v-model="pageSize"
              :options="pageSizeOptions"
              emit-value
              map-options
              dense
              outlined
              hide-bottom-space
              class="aud-foot__size dash-field"
              aria-label="Rows per page"
              @update:model-value="page = 1"
            />
          </div>
          <q-pagination
            v-model="page"
            :max="totalPages"
            :max-pages="$q.screen.lt.md ? 3 : 6"
            boundary-numbers
            direction-links
            :ripple="false"
            icon-prev="chevron_left"
            icon-next="chevron_right"
            icon-first="first_page"
            icon-last="last_page"
            class="aud-pager"
          />
        </footer>
      </section>
    </div>
  </PageShell>
</template>

<script setup>
/**
 * AUDIT TRAIL
 * ----------------------------------------------------------------------------
 * Who moved whose shift, from what to what, and when it was recorded.
 *
 * One source — `GET /audit/assignment/history/` through `useAssignmentHistory`,
 * which walks the server's pages and hands back the whole trail. Everything on
 * screen is derived from that: there is no second endpoint to reconcile.
 *
 * Filtering, sorting and paging all happen here, in that order, over the
 * complete set. That order is the point. Sorting the fifty rows already
 * rendered would answer a different question than the control claims to —
 * "oldest first" has to mean the oldest change there is, not the oldest of the
 * page you happen to be on — so the slice is always taken last, from an
 * already-sorted, already-filtered list.
 *
 * The trail is scoped to the workspace in the header switcher. The endpoint
 * itself answers company-wide, so `useAssignmentHistory` narrows the rows
 * against that company's employee list before publishing them — see its module
 * header. A company change drops the rows *and* the filters before refetching:
 * a person's name or a shift name from the previous workspace means nothing in
 * the next one, and a filter left set would show an empty table with no visible
 * reason why.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { useAssignmentHistory } from 'src/composables/page/useAssignmentHistory'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { matchesSearch, SORTS } from 'src/composables/utils/assignmentHistory'
import { avatarFor, buildEmployeeNameIndex } from 'src/composables/utils/employee'
import PageShell from '@/components/layout/PageShell.vue'
import AuditToolbar from '@/components/pages/Audit/AuditToolbar.vue'
import AuditTable from '@/components/pages/Audit/AuditTable.vue'
import AuditCardList from '@/components/pages/Audit/AuditCardList.vue'

const $q = useQuasar()
const { companyId } = useCompany()
const { notifyLoaded } = useLoadedToast()

const {
  rows,
  loading,
  error,
  totalCount,
  truncated,
  companyScoped,
  fetchHistory,
  clearError,
  reset,
} = useAssignmentHistory()

// Read here for the avatars: the trail names a person but carries no photograph
// and no id, so the faces come from the employee list. The composable reads the
// same list for a different reason — it is what narrows the trail to this
// workspace — and `useEmployees` de-duplicates, so the two are one request.
const { employees, fetchEmployees } = useEmployees()

const toolbarRef = ref(null)

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = ref('')
const kindFilter = ref('all')
const dateRange = ref({ from: null, to: null })
const sortBy = ref('newest')

const isFiltered = computed(
  () =>
    Boolean(search.value.trim()) ||
    kindFilter.value !== 'all' ||
    Boolean(dateRange.value.from || dateRange.value.to),
)

const filteredRows = computed(() => {
  const term = search.value.trim().toLowerCase()
  const { from, to } = dateRange.value
  const kind = kindFilter.value

  const narrowed = rows.value.filter((row) => {
    if (kind !== 'all' && row.change.key !== kind) return false
    // ISO days compare correctly as strings, so no date is constructed here —
    // which also means a row with no shift_date is excluded from a date filter
    // rather than silently treated as the epoch.
    if (from && (!row.shiftDate || row.shiftDate < from)) return false
    if (to && (!row.shiftDate || row.shiftDate > to)) return false
    return matchesSearch(row, term)
  })

  // Sorted after filtering and before the page slice below. `filter` already
  // returned a new array, so this sorts a copy and never mutates the rows the
  // composable published.
  return narrowed.sort(SORTS[sortBy.value] ?? SORTS.newest)
})

function clearFilters() {
  search.value = ''
  kindFilter.value = 'all'
  dateRange.value = { from: null, to: null }
}

// ─── Paging ───────────────────────────────────────────────────────────────────
const pageSizeOptions = [
  { label: '25 per page', value: 25 },
  { label: '50 per page', value: 50 },
  { label: '100 per page', value: 100 },
]

const page = ref(1)
const pageSize = ref(50)

const totalPages = computed(() => Math.ceil(filteredRows.value.length / pageSize.value) || 1)

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

// ─── Avatars ──────────────────────────────────────────────────────────────────
/**
 * Name to employee record, for putting a face against a trail entry.
 *
 * A name that belongs to two employees resolves to null — see
 * `buildEmployeeNameIndex`. On an audit screen, one colleague's photograph
 * against another's actions is worse than no photograph at all.
 */
const employeeIndex = computed(() => buildEmployeeNameIndex(employees.value))

/**
 * The page slice with an avatar attached, which is what both renderers read.
 *
 * Decorating here rather than at normalisation time keeps the two independent:
 * the trail can render before the employee list has landed (initials first,
 * photographs when they arrive) and only the fifty-odd rows actually on screen
 * are touched, not the whole trail. Both the table and the card list read the
 * same decorated rows, so they cannot disagree about a face.
 */
const displayRows = computed(() =>
  pagedRows.value.map((row) => ({
    ...row,
    avatar: avatarFor(employeeIndex.value, row.employeeName),
  })),
)

/**
 * Any filter change returns to page 1.
 *
 * Without this, narrowing 900 rows to 12 while sitting on page 8 leaves the
 * table empty and the pager pointing past the end — which reads as "no results"
 * when there are twelve.
 */
function onFilterChange(which, value) {
  if (which === 'search') search.value = value
  else if (which === 'kind') kindFilter.value = value
  else if (which === 'range') dateRange.value = value ?? { from: null, to: null }
  page.value = 1
}

// A shrinking list can also strand the pager when the rows themselves change
// under a stable filter — a refresh that returns fewer changes, say.
watch(totalPages, (max) => {
  if (page.value > max) page.value = max
})

// ─── Header ───────────────────────────────────────────────────────────────────
const headerSummary = computed(() => {
  if (loading.value && !rows.value.length) return 'Loading shift assignment changes…'
  if (!rows.value.length) return 'Shift assignment changes'
  const count = totalCount.value ?? rows.value.length
  const total = count.toLocaleString()
  const noun = count === 1 ? 'change' : 'changes'
  // "loaded" rather than "recorded" once the cap was hit: the trail holds more
  // than this, and the header is the one line that states the size of it.
  return `${total} shift assignment ${noun} ${truncated.value ? 'loaded' : 'recorded'}`
})

// ─── Actions ──────────────────────────────────────────────────────────────────
/**
 * The employee list, wanted only for the avatars.
 *
 * Deliberately quiet in every respect. It runs alongside the trail rather than
 * before it, because a face is decoration and the trail is the page — waiting
 * on this would delay the rows for nothing. It raises no "loaded" toast, since
 * only a page's primary data set announces itself. And a failure is swallowed:
 * the trail is complete and correct without photographs, so an error here would
 * report a problem the reader has no reason to care about and cannot act on.
 * The avatars simply stay as initials.
 *
 * `useEmployees` caches per company for five minutes and de-duplicates
 * in-flight calls, so arriving here from the Employees page usually costs no
 * request at all.
 */
async function loadAvatars() {
  try {
    await fetchEmployees()
  } catch {
    // Initials it is.
  }
}

async function load() {
  const [loaded] = await Promise.all([fetchHistory(), loadAvatars()])
  notifyLoaded('Audit trail', loaded.length, { noun: 'change' })
}

function refresh() {
  clearError()
  load()
}

// ─── Company scoping ──────────────────────────────────────────────────────────
watch(companyId, (next, previous) => {
  if (next === previous) return
  reset()
  clearFilters()
  page.value = 1
  if (next) load()
})

// ─── "/" focuses search, matching the other list pages ────────────────────────
function onGlobalKey(event) {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
  const tag = event.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return
  event.preventDefault()
  toolbarRef.value?.focusSearch()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
  load()
})

onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<style scoped>
.aud-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.aud-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.aud-head__titles {
  min-width: 0;
}

.aud-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.aud-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Error ── */
.aud-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
}
.aud-alert__icon {
  color: var(--dash-critical-mark);
  flex-shrink: 0;
}
.aud-alert__text {
  flex: 1;
  margin: 0;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-critical);
}
.aud-alert__btn {
  color: var(--dash-critical);
  font-weight: 600;
  padding: 0 8px;
}
.aud-alert__close {
  color: var(--dash-critical);
}

/* ── Truncation notice ── */
.aud-note {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-info-bg);
  border: 1px solid var(--dash-info-line);
}
.aud-note__icon {
  color: var(--dash-info);
  flex-shrink: 0;
}
.aud-note__text {
  margin: 0;
  font-size: 12.5px;
  color: var(--dash-info);
}

/* Same note, warning tone — used when the workspace scoping could not be
   applied, which is a caveat about the rows rather than information about
   them. */
.aud-note--warn {
  background: var(--dash-warn-bg);
  border-color: var(--dash-warn-line);
}
.aud-note--warn .aud-note__icon,
.aud-note--warn .aud-note__text {
  color: var(--dash-warn);
}

/* ── Panel ── */
.aud-panel {
  /* Clipped so the last row and the footer cannot paint square over the
     panel's bottom radius. */
  overflow: hidden;
}

/* ── Footer ── */
.aud-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-top: 1px solid var(--dash-line);
}

.aud-foot__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.aud-foot__range {
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.aud-foot__size {
  width: 140px;
}
.aud-foot__size :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.aud-foot__size :deep(.q-field__native) {
  font-size: 12px;
  color: var(--dash-ink-2);
  min-height: 32px;
  padding: 0;
}
.aud-foot__size :deep(.q-field__marginal) {
  height: 32px;
  color: var(--dash-ink-4);
}

.aud-pager :deep(.q-btn) {
  color: var(--dash-ink-3);
  font-weight: 500;
}
.aud-pager :deep(.q-btn--active) {
  color: var(--dash-accent);
  background: var(--dash-accent-bg);
}

@media (max-width: 1023px) {
  .aud-foot {
    padding: 10px 12px;
  }
}
</style>
