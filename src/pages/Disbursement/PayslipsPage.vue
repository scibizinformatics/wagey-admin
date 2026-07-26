<template>
  <PageShell>
    <div class="payslip-card">
      <!-- Header Section -->
      <div class="page-header">
        <div class="back-row">
          <q-btn flat dense no-caps icon="arrow_back" label="Back to Disbursement" class="back-btn" @click="goBack" />
        </div>
        <div class="header-content">
          <div class="header-titles">
            <h1 class="page-title">Payslips</h1>
          </div>
          <div class="header-actions">
            <q-input
              v-model="searchTerm"
              placeholder="Search payslips..."
              class="header-search"
              dense
              outlined
              @update:model-value="filterEmployees"
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Tab Pills -->
      <div class="tabs-section">
        <div class="tab-pills">
          <button
            :class="['tab-pill', { active: activeTab === 'all' }]"
            @click="setTab('all')"
          >
            <q-icon name="view_list" class="tab-pill-icon" />
            <span>All</span>
            <span v-if="(overview?.payslip_sent ?? 0) > 0" class="tab-badge">{{ overview?.payslip_sent ?? 0 }}</span>
          </button>
          <button
            :class="['tab-pill', { active: activeTab === 'acknowledged' }]"
            @click="setTab('acknowledged')"
          >
            <q-icon name="check_circle" class="tab-pill-icon" />
            <span>Acknowledged</span>
            <span v-if="(overview?.acknowledged ?? 0) > 0" class="tab-badge">{{ overview?.acknowledged ?? 0 }}</span>
          </button>
          <button
            :class="['tab-pill', { active: activeTab === 'pending' }]"
            @click="setTab('pending')"
          >
            <q-icon name="schedule" class="tab-pill-icon" />
            <span>Pending</span>
            <span v-if="(overview?.pending ?? 0) > 0" class="tab-badge">{{ overview?.pending ?? 0 }}</span>
          </button>
          <button
            :class="['tab-pill', { active: activeTab === 'disputed' }]"
            @click="setTab('disputed')"
          >
            <q-icon name="report" class="tab-pill-icon" />
            <span>Disputed</span>
            <span v-if="(overview?.disputed ?? 0) > 0" class="tab-badge">{{ overview?.disputed ?? 0 }}</span>
          </button>
        </div>
      </div>

      <!-- Stepper Header -->
      <PayoutGroupStepperHeader :group-id="groupId" />

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-total"></span>
            Payslip Sent
          </div>
          <div class="stats-segment-value">{{ overview?.payslip_sent ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-acknowledged"></span>
            Acknowledged
          </div>
          <div class="stats-segment-value">{{ overview?.acknowledged ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-pending"></span>
            Pending
          </div>
          <div class="stats-segment-value">{{ overview?.pending ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-disputed"></span>
            Disputed
          </div>
          <div class="stats-segment-value">{{ overview?.disputed ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-failed"></span>
            Failed Delivery
          </div>
          <div class="stats-segment-value">{{ overview?.failed_delivery ?? 0 }}</div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-block">
        <q-table
          :rows="paginatedData"
          :columns="columns"
          :loading="loading"
          row-key="id"
          flat
          dense
          hide-no-data
          hide-pagination
          class="payslip-table"
        >
          <template #body-cell-payslip_status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.payslip_status" />
            </q-td>
          </template>
          <template #no-data>
            <div class="empty-state">
              <q-icon name="inbox" size="28px" color="grey-4" />
              <div class="empty-text">No data found</div>
            </div>
          </template>
        </q-table>
      </div>

      <!-- Pagination Controls -->
      <div class="pagination-bar" v-if="filteredData.length > 0">
        <div class="pagination-info">
          <span class="pagination-text">
            Showing {{ (page - 1) * pageSize + 1 }} –
            {{ Math.min(page * pageSize, filteredData.length) }}
            of {{ filteredData.length }} payslips
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
            @update:model-value="onPageSizeChange"
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
          @update:model-value="onPageChange"
        />
      </div>
    </div>
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusPill from 'src/components/common/StatusPill.vue'
import PayoutGroupStepperHeader from 'src/components/pages/Payroll/PayoutGroupStepperHeader.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'

const route = useRoute()
const router = useRouter()
const groupId = route.params.id
const { fetchPayslipOverview, fetchEmployeePayslips } = useDisbursementApi()

const loading = ref(true)
const overview = ref(null)
const payslips = ref([])
const activeTab = ref('all')
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position_name', label: 'Position', field: 'position_name', align: 'left', sortable: true },
  { name: 'net_pay', label: 'Net Pay', field: 'net_pay', align: 'right', sortable: true, format: (v) => `\u20B1${parseFloat(v || 0).toLocaleString('en-PH')}` },
  { name: 'payslip_status', label: 'Status', field: 'payslip_status', align: 'left', sortable: true },
  { name: 'acknowledged_on', label: 'Acknowledged On', field: 'acknowledged_on', align: 'center' },
  { name: 'dispute_status', label: 'Dispute Status', field: 'dispute_status', align: 'center' },
]

const filteredData = computed(() => {
  let result = payslips.value
  if (activeTab.value !== 'all') {
    const statusMap = { acknowledged: 'Acknowledged', pending: 'Pending', disputed: 'Disputed' }
    result = result.filter((p) => p.payslip_status === (statusMap[activeTab.value] || activeTab.value))
  }
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter((p) => {
      return (p.employee || '').toLowerCase().includes(term)
    })
  }
  return result
})

const totalPages = computed(
  () => Math.ceil((filteredData.value?.length ?? 0) / pageSize.value) || 1,
)

const paginatedData = computed(() => {
  if (!filteredData.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

onMounted(async () => {
  try {
    const [ov, data] = await Promise.all([
      fetchPayslipOverview(groupId),
      fetchEmployeePayslips(groupId),
    ])
    overview.value = ov
    payslips.value = data || []
  } catch (err) {
    console.error('[PayslipsPage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/app/payroll')
}

function setTab(tab) {
  activeTab.value = tab
  page.value = 1
}

function filterEmployees() {
  page.value = 1
}

function onPageChange(newPage) {
  page.value = newPage
}

function onPageSizeChange(newSize) {
  pageSize.value = newSize
  page.value = 1
}
</script>

<style scoped>
/* ==============================
   WRAPPER
   ============================== */
.payslip-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

/* ==============================
   HEADER
   ============================== */
.back-row {
  padding: 8px 24px 0;
}

.back-btn {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  text-transform: none;
}

.back-btn:hover {
  color: #102335;
}

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

/* ==============================
   TAB PILLS
   ============================== */
.tabs-section {
  padding: 10px 24px;
  border-bottom: 1px solid #f1f3f5;
}

.tab-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.tab-pill:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.tab-pill.active {
  background: #102335;
  border-color: #102335;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(16, 35, 53, 0.3);
}

.tab-pill-icon {
  font-size: 15px;
}

.tab-badge {
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 5px;
  min-width: 17px;
  text-align: center;
  line-height: 1.5;
}

.tab-pill.active .tab-badge {
  background: rgba(255, 255, 255, 0.35);
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

.stats-dot-acknowledged {
  background: #10b981;
}

.stats-dot-pending {
  background: #f59e0b;
}

.stats-dot-disputed {
  background: #f87171;
}

.stats-dot-failed {
  background: #ef4444;
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

.payslip-table :deep(.q-table thead th) {
  font-size: 10.5px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 8px 10px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}

.payslip-table :deep(.q-table tbody td) {
  padding: 8px 10px;
  font-size: 12.5px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
  vertical-align: middle;
}

.payslip-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}

.payslip-table :deep(.q-table tbody tr:hover td) {
  background: #f8fafc;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
}

.empty-text {
  font-size: 13px;
  color: #9ca3af;
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
  .payslip-card {
    border-radius: 14px;
  }

  .page-header {
    padding: 8px 20px;
  }

  .tabs-section {
    padding: 10px 20px;
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

  .tabs-section {
    padding: 10px 16px;
  }

  .tab-pill {
    padding: 7px 12px;
    font-size: 12px;
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

  .header-search {
    width: 100%;
    max-width: 100%;
  }

  .tab-pills {
    gap: 5px;
  }

  .tab-pill {
    padding: 7px 12px;
    font-size: 12px;
    flex: 1;
    justify-content: center;
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

  .tab-pill span:not(.tab-badge) {
    display: none;
  }

  .tab-pill {
    padding: 8px 14px;
  }

  .tab-pill-icon {
    font-size: 16px;
  }
}
</style>
