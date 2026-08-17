<template>
  <PageShell>
    <div class="disb-page">
      <!-- ── Page header ─────────────────────────────────────────────────── -->
      <header class="disb-head">
        <div class="disb-head__titles">
          <h1 class="disb-head__title">Disbursement</h1>
          <p class="disb-head__sub">{{ headSummary }}</p>
        </div>
        <q-btn
          outline
          no-caps
          icon="o_file_download"
          label="Export PDF"
          class="btn-outline"
          :disable="!filteredRuns.length"
          @click="exportRuns"
        />
      </header>

      <!-- ── Pipeline summary ────────────────────────────────────────────────
           The cutoff read as a pipeline rather than seven equal readings: what
           still needs work, then what money is where. The old strip gave counts
           and pesos the same weight in one grey band, so nothing led. -->
      <div class="disb-stats">
        <div v-for="tile in statTiles" :key="tile.key" class="disb-stat">
          <div class="disb-stat__head">
            <span class="disb-stat__mark" :style="{ background: tile.mark }" />
            <span class="disb-stat__label">{{ tile.label }}</span>
          </div>
          <span v-if="loadingDashboards" class="dash-shimmer disb-stat__skeleton" />
          <span v-else class="disb-stat__value dash-num">{{ tile.value }}</span>
        </div>
      </div>

      <!-- ── Runs ────────────────────────────────────────────────────────── -->
      <section class="dash-panel disb-list">
        <div class="disb-toolbar">
          <q-input
            ref="searchRef"
            v-model="searchTerm"
            placeholder="Search group, cutoff, method or status"
            dense
            outlined
            clearable
            hide-bottom-space
            debounce="250"
            class="disb-search dash-field"
          >
            <template #prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>

          <span class="disb-toolbar__count">
            {{ filteredRuns.length }} {{ filteredRuns.length === 1 ? 'run' : 'runs' }}
          </span>
        </div>

        <div class="disb-table-wrap">
          <PayoutTable :rows="paginatedRuns" :loading="loading" @view="openRun" />
        </div>

        <footer v-if="filteredRuns.length > 0" class="disb-foot">
          <div class="disb-foot__left">
            <span class="disb-foot__range dash-num">
              {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filteredRuns.length) }}
              of {{ filteredRuns.length }}
            </span>
            <q-select
              v-model="pageSize"
              :options="pageSizeOptions.map((n) => ({ label: `${n} per page`, value: n }))"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              dense
              outlined
              hide-bottom-space
              :popup-content-class="'disb-popup'"
              class="disb-foot__size dash-field"
            />
          </div>
          <q-pagination
            v-model="page"
            :max="totalPages"
            :max-pages="$q.screen.lt.md ? 3 : 6"
            boundary-numbers
            direction-links
            :ripple="false"
            icon-first="first_page"
            icon-prev="chevron_left"
            icon-next="chevron_right"
            icon-last="last_page"
            class="disb-pager"
          />
        </footer>
      </section>
    </div>
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import PageShell from 'src/components/layout/PageShell.vue'
import PayoutTable from 'src/components/pages/Payroll/PayoutTable.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'
import { useCompany } from 'src/composables/page/useCompany'

const router = useRouter()
const $q = useQuasar()
const { companyId } = useCompany()
const { fetchCutoffInstances, fetchDashboardSummary, fetchPayoutGroupInstances } = useDisbursementApi()

const loading = ref(true)
const loadingDashboards = ref(false)
const rows = ref([])
const dashboard = ref(null)
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]

const filteredRuns = computed(() => {
  if (!searchTerm.value.trim()) return rows.value
  const term = searchTerm.value.toLowerCase()
  return rows.value.filter((run) => {
    return (
      (run.group || '').toLowerCase().includes(term) ||
      (run.cutoff || '').toLowerCase().includes(term) ||
      (run.method || '').toLowerCase().includes(term) ||
      (run.status || '').toLowerCase().includes(term)
    )
  })
})

const totalPages = computed(
  () => Math.ceil((filteredRuns.value?.length ?? 0) / pageSize.value) || 1,
)

const searchRef = ref(null)

const headSummary = computed(() => {
  if (loading.value) return 'Loading payout groups…'
  const n = rows.value.length
  if (!n) return 'No payout groups in the open cutoffs'
  return `${n} payout ${n === 1 ? 'group' : 'groups'} across open cutoffs`
})

/**
 * The cutoff read as a pipeline: what still needs a person, then where the money
 * has got to. Ordered left to right in the direction work actually moves, so the
 * leftmost non-zero tile is what to pick up next.
 *
 * Marks come from the design system's status and categorical ramps rather than
 * the seven ad-hoc dot colours the old strip used.
 */
const statTiles = computed(() => {
  const d = dashboard.value
  return [
    {
      key: 'open',
      label: 'Open groups',
      value: d?.open_payout_groups ?? 0,
      mark: 'var(--dash-cat-1)',
    },
    {
      key: 'review',
      label: 'Review required',
      value: d?.review_required ?? 0,
      mark: 'var(--dash-critical-mark)',
    },
    {
      key: 'ack',
      label: 'Awaiting ack',
      value: d?.awaiting_acknowledgement ?? 0,
      mark: 'var(--dash-warn-mark)',
    },
    {
      key: 'ready',
      label: 'Ready to fund',
      value: `₱${parseAmount(d?.ready_for_funding_amount)}`,
      mark: 'var(--dash-good-mark)',
    },
    {
      key: 'funded',
      label: 'Funded',
      value: `₱${parseAmount(d?.funded_amount)}`,
      mark: 'var(--dash-cat-2)',
    },
    {
      key: 'disbursing',
      label: 'Disbursing',
      value: `₱${parseAmount(d?.disbursing_amount)}`,
      mark: 'var(--dash-info-mark)',
    },
    {
      key: 'completed',
      label: 'Completed',
      value: d?.completed_this_cutoff ?? 0,
      mark: 'var(--dash-neutral-mark)',
    },
  ]
})

// "/" focuses search, matching the other list pages.
function onGlobalKey(e) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
  e.preventDefault()
  searchRef.value?.focus()
}

onMounted(() => window.addEventListener('keydown', onGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))

const paginatedRuns = computed(() => {
  if (!filteredRuns.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredRuns.value.slice(start, start + pageSize.value)
})

onMounted(async () => {
  try {
    const raw = await fetchCutoffInstances()
    const cutoffs = Array.isArray(raw) ? raw : raw?.results ?? []

    if (!cutoffs.length) {
      loading.value = false
      return
    }

    // PHASE 1: Fetch payout groups for all cutoffs (batched) and show table immediately
    const allGroups = await fetchWithConcurrency(
      cutoffs,
      (c) => fetchPayoutGroupInstances(companyId.value, c.id).catch(() => null),
      10,
    )
    rows.value = allGroups.flatMap((g) => g || []).map((item) => ({
      id: item.id,
      group: item.payout_group_name,
      cutoff: item.cutoff_instance_name,
      method: item.payout_method_name,
      employees: item.employees,
      netAmount: parseFloat(item.net_amount || 0),
      status: item.payout_status,
      statusDisplay: item.payout_status_display,
    }))
    loading.value = false

    // PHASE 2: Background-fetch dashboard summaries and aggregate stats
    loadingDashboards.value = true
    const dashboardResults = await fetchWithConcurrency(
      cutoffs,
      (c) => fetchDashboardSummary(companyId.value, c.id).catch(() => null),
      10,
    )
    dashboard.value = aggregateDashboards(dashboardResults.filter(Boolean))
  } catch (err) {
    console.error('[DisbursementListPage] load failed:', err)
  } finally {
    loading.value = false
    loadingDashboards.value = false
  }
})

function openRun(row) {
  router.push({ path: `/app/payroll/review/${row.id}`, query: { pgi_status: row.status } })
}

function exportRuns() {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(16)
    doc.text('Disbursement Runs', 14, 20)
    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-PH')}`, 14, 27)

    const headers = [['Group', 'Cutoff', 'Method', 'Employees', 'Net Amount', 'Status']]
    const body = rows.value.map((run) => [
      run.group || '',
      run.cutoff || '',
      run.method || '',
      run.employees ?? 0,
      `₱${(run.netAmount ?? 0).toLocaleString('en-PH')}`,
      run.status || '',
    ])

    doc.autoTable({
      head: headers,
      body,
      startY: 32,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [16, 35, 53], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })

    doc.save(`disbursement-runs-${new Date().toISOString().slice(0, 10)}.pdf`)
    $q.notify({ type: 'positive', message: 'PDF exported successfully', position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to export PDF', position: 'top' })
    console.error('[DisbursementListPage] PDF export error:', err)
  }
}

async function fetchWithConcurrency(items, fn, concurrency = 10) {
  const results = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

function aggregateDashboards(allDashboards) {
  const agg = {
    open_payout_groups: 0,
    review_required: 0,
    awaiting_acknowledgement: 0,
    ready_for_funding: 0,
    ready_for_funding_amount: 0,
    funded: 0,
    funded_amount: 0,
    disbursing: 0,
    disbursing_amount: 0,
    completed_this_cutoff: 0,
  }
  for (const d of allDashboards) {
    agg.open_payout_groups += d.open_payout_groups || 0
    agg.review_required += d.review_required || 0
    agg.awaiting_acknowledgement += d.awaiting_acknowledgement || 0
    agg.ready_for_funding += d.ready_for_funding || 0
    agg.ready_for_funding_amount += parseFloat(d.ready_for_funding_amount || 0)
    agg.funded += d.funded || 0
    agg.funded_amount += parseFloat(d.funded_amount || 0)
    agg.disbursing += d.disbursing || 0
    agg.disbursing_amount += parseFloat(d.disbursing_amount || 0)
    agg.completed_this_cutoff += d.completed_this_cutoff || 0
  }
  return agg
}

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

// Both reset to page 1: narrowing the list while on page 3 would otherwise land
// on a page that no longer exists. Search was previously reset by a `filterRuns`
// handler on the input; a watcher covers it without the template wiring.
watch([pageSize, searchTerm], () => {
  page.value = 1
})
</script>

<style scoped>
/* ============================================================================
   DISBURSEMENT LIST
   ----------------------------------------------------------------------------
   Entry point to the five-step flow. Was one card stacking header / a seven-cell
   grey stats strip / a section heading / table / pagination. Now: page header,
   a pipeline summary, and one list card — the same shape as Employees,
   Attendance and Schedule.
   ========================================================================== */
.disb-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Page header ── */
.disb-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.disb-head__titles {
  min-width: 0;
}

.disb-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
  line-height: 1.2;
}

.disb-head__sub {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.btn-outline {
  height: 38px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink-2);
}

/* ── Pipeline summary ──
   Seven tiles that wrap, rather than seven segments divided by vertical rules in
   a fixed row — the old strip could not fit its own content once the drawer took
   its share, so labels truncated before the numbers did. */
.disb-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 10px;
}

.disb-stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  padding: 11px 13px 12px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  box-shadow: var(--dash-shadow-xs);
}

.disb-stat__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.disb-stat__mark {
  width: 3px;
  height: 10px;
  border-radius: var(--dash-r-pill);
  flex-shrink: 0;
}

.disb-stat__label {
  font-size: 12px;
  color: var(--dash-ink-3);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disb-stat__value {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--dash-ink);
}

.disb-stat__skeleton {
  width: 62px;
  height: 16px;
}

/* ── List card ── */
.disb-list {
  overflow: hidden;
}

.disb-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dash-line);
  flex-wrap: wrap;
}

.disb-search {
  flex: 1 1 220px;
  min-width: 0;
  max-width: 360px;
}
.disb-search :deep(.q-field__control) {
  height: 34px;
  min-height: 34px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.disb-search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.disb-search :deep(.q-field__marginal) {
  height: 34px;
  color: var(--dash-ink-4);
}

.disb-toolbar__count {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--dash-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* The progress column carries five step nodes, so the table needs room to
   scroll sideways on a laptop rather than crushing them. */
.disb-table-wrap {
  overflow-x: auto;
  padding: 0 6px;
}

/* ── Footer ── */
.disb-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 16px;
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
  flex-wrap: wrap;
}

.disb-foot__left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.disb-foot__range {
  font-size: 12.5px;
  color: var(--dash-ink-3);
  white-space: nowrap;
}

.disb-foot__size {
  width: 132px;
}
.disb-foot__size :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.disb-foot__size :deep(.q-field__native) {
  font-size: 12.5px;
  color: var(--dash-ink-2);
  min-height: 32px;
  padding: 0;
}
.disb-foot__size :deep(.q-field__marginal) {
  height: 32px;
  color: var(--dash-ink-4);
}

.disb-pager :deep(.q-btn) {
  min-width: 30px;
  min-height: 30px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-3);
}
.disb-pager :deep(.q-btn:hover) {
  background: var(--dash-n-100);
  color: var(--dash-ink);
}
.disb-pager :deep(.q-btn--active) {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line-strong);
  color: var(--dash-ink);
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}

/* ── Responsive ── */
@media (max-width: 1023px) {
  .disb-head__title {
    font-size: 20px;
  }
  .disb-toolbar,
  .disb-foot {
    padding: 10px 14px;
  }
  .disb-search {
    flex: 1 1 100%;
    max-width: none;
  }
  .disb-toolbar__count {
    display: none;
  }
}

@media (max-width: 640px) {
  .disb-head {
    align-items: stretch;
  }
  .disb-head .btn-outline {
    width: 100%;
  }
  .disb-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .disb-foot {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .disb-foot__left {
    justify-content: space-between;
  }
  .disb-pager {
    align-self: center;
  }
}
</style>

<style>
/* QSelect popups teleport to the body. */
.disb-popup {
  border-radius: var(--dash-r-md) !important;
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow-lg) !important;
  padding: 4px;
}
.disb-popup .q-item {
  min-height: 32px;
  padding: 0 9px;
  border-radius: var(--dash-r-sm);
  font-size: 12.5px;
  color: var(--dash-ink-2);
}
.disb-popup .q-item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.disb-popup .q-item--active {
  background: var(--dash-accent-bg);
  color: var(--dash-accent);
  font-weight: 600;
}
</style>
