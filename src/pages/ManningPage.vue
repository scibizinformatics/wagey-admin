<template>
  <PageShell>
    <div class="man-page">
      <!-- ── Page header ─────────────────────────────────────────────────── -->
      <header class="man-head">
        <div class="man-head__titles">
          <h1 class="man-head__title">Manning</h1>
          <p class="man-head__sub">{{ dateSummary }}</p>
        </div>
      </header>

      <!-- ── Summary ─────────────────────────────────────────────────────── -->
      <ManningStatsRow :totals="filteredTotals" :loading="loading && !rows.length" />

      <!-- ── Error ───────────────────────────────────────────────────────── -->
      <div v-if="error" class="man-alert" role="alert">
        <q-icon name="o_error" size="18px" class="man-alert__icon" />
        <p class="man-alert__text">{{ error }}</p>
        <q-btn
          flat
          dense
          no-caps
          size="12px"
          label="Retry"
          class="man-alert__btn"
          @click="refresh"
        />
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="close"
          aria-label="Dismiss"
          class="man-alert__close"
          @click="clearError"
        />
      </div>

      <!-- ── Board ───────────────────────────────────────────────────────── -->
      <section class="dash-panel man-board">
        <ManningToolbar
          ref="toolbarRef"
          :date="date"
          :today="today"
          :search="search"
          :site="siteFilter"
          :site-options="siteNames"
          :only-gaps="onlyGaps"
          :count="filteredRows.length"
          :attention-count="attentionCount"
          :loading="loading"
          @update:date="onDateChange"
          @update:search="search = $event"
          @update:site="siteFilter = $event"
          @update:only-gaps="onlyGaps = $event"
          @prev-day="goToPreviousDay"
          @next-day="goToNextDay"
          @go-today="goToToday"
          @refresh="refresh"
        />

        <!-- Cards below 1024px, table above — the same threshold Attendance and
             Contributions use. -->
        <ManningCardList
          v-if="$q.screen.lt.md"
          :rows="filteredRows"
          :loading="loading"
          :show-required="hasRequirements"
          :is-filtered="isFiltered"
          @clear-filters="clearFilters"
        />
        <ManningTable
          v-else
          :rows="filteredRows"
          :loading="loading"
          :show-required="hasRequirements"
          :is-filtered="isFiltered"
          @clear-filters="clearFilters"
        />
      </section>
    </div>
  </PageShell>
</template>

<script setup>
/**
 * MANNING
 * ----------------------------------------------------------------------------
 * Who is meant to be on each site today, and who actually is.
 *
 * One request per day — `GET /organization/sites/manning/{company_id}/?date=` —
 * returning a row per site + position with a shift-level breakdown inside it.
 * Everything on screen is derived from that single response; there is no second
 * endpoint to reconcile, so the page holds no fetch logic of its own beyond
 * `useManning`.
 *
 * Filtering happens here, over the whole response, and the tiles are summed
 * from the filtered result — so they always describe the rows on screen rather
 * than a set the reader cannot see. Sorting is left to the table, which is safe
 * because the whole day arrives in one response and the table is not
 * paginated: there is no page slice for a sort to reorder only part of.
 *
 * The board is scoped to the workspace in the header switcher. A company change
 * drops the rows and the filters before refetching, because a site or position
 * name from the previous workspace means nothing in the next one.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useCompany } from 'src/composables/page/useCompany'
import { useManning, todayIso } from 'src/composables/page/useManning'
import { useLoadedToast } from 'src/composables/useLoadedToast'
import { manningStatus, sumManning } from 'src/composables/utils/manning'
import PageShell from '@/components/layout/PageShell.vue'
import ManningToolbar from '@/components/pages/Manning/ManningToolbar.vue'
import ManningStatsRow from '@/components/pages/Manning/ManningStatsRow.vue'
import ManningTable from '@/components/pages/Manning/ManningTable.vue'
import ManningCardList from '@/components/pages/Manning/ManningCardList.vue'

const $q = useQuasar()
const { companyId } = useCompany()
const { notifyLoaded } = useLoadedToast()

const {
  date,
  servedDate,
  rows,
  hasRequirements,
  siteNames,
  loading,
  error,
  fetchManning,
  goToPreviousDay,
  goToNextDay,
  goToToday,
  clearError,
  reset,
} = useManning()

const today = todayIso()
const toolbarRef = ref(null)

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = ref('')
const siteFilter = ref(null)
const onlyGaps = ref(false)

/** A position with somebody missing, short, or unaccounted for. */
const ATTENTION_STATUSES = new Set(['awol', 'understaffed', 'under-assigned', 'not-timed-in'])

function needsAttention(row) {
  return ATTENTION_STATUSES.has(manningStatus(row).key)
}

/** Over the whole response, not the filtered view — the toolbar's count has to
 *  say how many there are to find, not how many are already on screen. */
const attentionCount = computed(() => rows.value.filter(needsAttention).length)

const filteredRows = computed(() => {
  let list = rows.value

  if (siteFilter.value) {
    list = list.filter((row) => row.site === siteFilter.value)
  }

  const term = search.value.trim().toLowerCase()
  if (term) {
    // Shift names are searched too: "graveyard" or a time is a reasonable thing
    // to type when hunting for the shift that is short.
    list = list.filter(
      (row) =>
        `${row.site} ${row.position}`.toLowerCase().includes(term) ||
        row.shifts.some((shift) => shift.name.toLowerCase().includes(term)),
    )
  }

  if (onlyGaps.value) {
    list = list.filter(needsAttention)
  }

  return list
})

const filteredTotals = computed(() => sumManning(filteredRows.value))

const isFiltered = computed(
  () => Boolean(siteFilter.value) || Boolean(search.value.trim()) || onlyGaps.value,
)

function clearFilters() {
  search.value = ''
  siteFilter.value = null
  onlyGaps.value = false
}

// ─── Header ───────────────────────────────────────────────────────────────────
const dateSummary = computed(() => {
  // Prefer the day the server answered for over the one we asked for, so a
  // header cannot claim a date the rows below it are not from.
  const day = servedDate.value || date.value
  if (!day) return 'Site manning'

  // Parsed as parts rather than `new Date(string)`, which reads a bare date as
  // UTC midnight and shifts the label back a day in western timezones.
  const [y, m, d] = day.split('-').map(Number)
  const label = new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return day === today ? `Today · ${label}` : label
})

// ─── Actions ──────────────────────────────────────────────────────────────────
async function load() {
  const loaded = await fetchManning()
  notifyLoaded('Manning', loaded.length, { noun: 'position' })
}

function onDateChange(value) {
  fetchManning(value)
}

function refresh() {
  clearError()
  load()
}

// ─── Company scoping ──────────────────────────────────────────────────────────
// Filters are cleared alongside the rows: a site name selected in one workspace
// does not exist in the next, and leaving it set would show an empty board with
// no obvious reason why.
watch(companyId, (next, previous) => {
  if (next === previous) return
  reset()
  clearFilters()
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
.man-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.man-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.man-head__titles {
  min-width: 0;
}

.man-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.man-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Error ── */
.man-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
}

.man-alert__icon {
  color: var(--dash-critical-mark);
  flex-shrink: 0;
}

.man-alert__text {
  flex: 1;
  margin: 0;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-critical);
}

.man-alert__btn {
  color: var(--dash-critical);
  font-weight: 600;
  padding: 0 8px;
}

.man-alert__close {
  color: var(--dash-critical);
}

/* ── Board ── */
.man-board {
  /* Clipped on all four sides so the last site block cannot paint square over
     the panel's bottom radius. */
  overflow: hidden;
}
</style>
