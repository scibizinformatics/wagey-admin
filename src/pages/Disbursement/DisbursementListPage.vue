<template>
  <PageShell>
    <div class="disbursement-card">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-titles">
            <h1 class="page-title">Disbursement</h1>
          </div>
          <div class="header-actions">
            <q-input
              v-model="searchTerm"
              placeholder="Search runs..."
              class="header-search"
              dense
              outlined
              @update:model-value="filterRuns"
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
            <q-btn
              label="Export"
              icon="file_download"
              class="header-add-btn"
              unelevated
              @click="exportRuns"
            />
          </div>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-total"></span>
            Open Groups
          </div>
          <div class="stats-segment-value">
            <q-skeleton v-if="loadingDashboards" type="text" style="width: 30px; height: 16px" />
            <template v-else>{{ dashboard?.open_payout_groups ?? 0 }}</template>
          </div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-review"></span>
            Review Required
          </div>
          <div class="stats-segment-value">
            <q-skeleton v-if="loadingDashboards" type="text" style="width: 30px; height: 16px" />
            <template v-else>{{ dashboard?.review_required ?? 0 }}</template>
          </div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-ack"></span>
            Awaiting Ack
          </div>
          <div class="stats-segment-value">
            <q-skeleton v-if="loadingDashboards" type="text" style="width: 30px; height: 16px" />
            <template v-else>{{ dashboard?.awaiting_acknowledgement ?? 0 }}</template>
          </div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-funding"></span>
            Ready for Funding
          </div>
          <div class="stats-segment-value">
            <q-skeleton v-if="loadingDashboards" type="text" style="width: 60px; height: 16px" />
            <template v-else>₱{{ parseAmount(dashboard?.ready_for_funding_amount) }}</template>
          </div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-funded"></span>
            Funded
          </div>
          <div class="stats-segment-value">
            <q-skeleton v-if="loadingDashboards" type="text" style="width: 60px; height: 16px" />
            <template v-else>₱{{ parseAmount(dashboard?.funded_amount) }}</template>
          </div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-disbursing"></span>
            Disbursing
          </div>
          <div class="stats-segment-value">
            <q-skeleton v-if="loadingDashboards" type="text" style="width: 60px; height: 16px" />
            <template v-else>₱{{ parseAmount(dashboard?.disbursing_amount) }}</template>
          </div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-completed"></span>
            Completed
          </div>
          <div class="stats-segment-value">
            <q-skeleton v-if="loadingDashboards" type="text" style="width: 30px; height: 16px" />
            <template v-else>{{ dashboard?.completed_this_cutoff ?? 0 }}</template>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="section-header">
        <h2 class="section-title">Disbursement Runs</h2>
      </div>
      <div class="table-block">
        <PayoutTable
          :rows="paginatedRuns"
          :loading="loading"
          @view="openRun"
        />
      </div>

      <!-- Pagination Controls -->
      <div class="pagination-bar" v-if="filteredRuns.length > 0">
        <div class="pagination-info">
          <span class="pagination-text">
            Showing {{ (page - 1) * pageSize + 1 }} –
            {{ Math.min(page * pageSize, filteredRuns.length) }}
            of {{ filteredRuns.length }} runs
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
            class="page-size-select"
          />
        </div>
        <q-pagination
          v-model="page"
          :max="totalPages"
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
        />
      </div>
    </div>

  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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

watch(pageSize, () => {
  page.value = 1
})

function filterRuns() {
  page.value = 1
}
</script>

<style scoped>
/* ==============================
   WRAPPER
   ============================== */
.disbursement-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

/* ==============================
   HEADER
   ============================== */
.page-header {
  padding: 8px 24px;
  border-bottom: 1px solid #f1f3f5;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
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
  border-radius: 10px;
  height: 36px;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.header-search :deep(.q-field__control:hover) {
  border-color: #cbd5e1;
}

.search-icon {
  color: #94a3b8;
}

.header-add-btn {
  height: 36px;
  border-radius: 10px;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 13px;
  background: #102335 !important;
  color: #ffffff !important;
}

.header-add-btn:hover {
  background: #193d5c !important;
}

/* ==============================
   STATS BAR
   ============================== */
.stats-bar {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-bottom: 1px solid #f1f3f5;
  padding: 10px 24px;
  gap: 0;
}

.stats-segment {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats-divider {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
  margin: 0 20px;
  flex-shrink: 0;
}

.stats-segment-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  white-space: nowrap;
}

.stats-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stats-dot-total {
  background: #6366f1;
}

.stats-dot-review {
  background: #f59e0b;
}

.stats-dot-ack {
  background: #3b82f6;
}

.stats-dot-funding {
  background: #06b6d4;
}

.stats-dot-funded {
  background: #10b981;
}

.stats-dot-disbursing {
  background: #f97316;
}

.stats-dot-completed {
  background: #22c55e;
}

.stats-segment-value {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

/* ==============================
   TABLE SECTION
   ============================== */
.table-block {
}

/* ==============================
   SECTION HEADER
   ============================== */
.section-header {
  padding: 0px 14px 1px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  letter-spacing: -0.01em;
}

/* ==============================
   PAGINATION BAR
   ============================== */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f1f3f5;
  padding: 10px 24px;
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
  font-size: 12px;
  color: #94a3b8;
  font-weight: 400;
}

.page-size-select {
  min-width: 120px;
}

.page-size-select :deep(.q-field__control) {
  border-radius: 8px;
  border-color: #e2e8f0;
}

.schedule-pagination :deep(.q-btn) {
  font-weight: 500;
  border-radius: 8px;
  min-width: 32px;
  min-height: 32px;
  font-size: 13px;
}

.schedule-pagination :deep(.q-btn--active) {
  font-weight: 600;
}

/* ==============================
   RESPONSIVE
   ============================== */
@media (max-width: 1440px) {
  .disbursement-card {
    border-radius: 14px;
  }

  .page-header {
    padding: 8px 20px;
  }

  .stats-bar {
    padding: 10px 20px;
  }

  .stats-divider {
    margin: 0 16px;
  }

  .pagination-bar {
    padding: 10px 20px;
  }
}

@media (max-width: 1024px) {
  .page-header {
    padding: 8px 16px;
  }

  .page-title {
    font-size: 19px;
  }

  .header-search {
    min-width: 180px;
  }

  .stats-bar {
    padding: 10px 16px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .stats-divider {
    margin: 0 12px;
  }

  .stats-segment-value {
    font-size: 14px;
  }

  .pagination-bar {
    padding: 10px 16px;
  }

  .pagination-info {
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    gap: 8px;
  }

  .header-search,
  .header-add-btn {
    width: 100%;
    max-width: 100%;
  }

  .stats-bar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 16px;
  }

  .stats-divider {
    display: none;
  }

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

@media (max-width: 480px) {
  .page-title {
    font-size: 18px;
  }
}
</style>
