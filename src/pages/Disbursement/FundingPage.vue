<template>
  <PageShell>
    <div class="funding-card">
      <!-- Header Section -->
      <div class="page-header">
        <div class="back-row">
          <q-btn flat dense no-caps icon="arrow_back" label="Back to Disbursement" class="back-btn" @click="goBack" />
        </div>
        <div class="header-content">
          <div class="header-titles">
            <h1 class="page-title">Funding</h1>
          </div>
          <div class="header-actions">
            <q-input
              v-model="searchTerm"
              placeholder="Search funding history..."
              class="header-search"
              dense
              outlined
              @update:model-value="filterHistory"
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Stepper Header -->
      <PayoutGroupStepperHeader :group-id="groupId" />

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-total"></span>
            Total Gross Pay
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(amounts?.total_gross_pay) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-deductions"></span>
            Deductions
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(amounts?.total_deductions) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-ca"></span>
            Cash Advances
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(amounts?.total_cash_advances) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-funding"></span>
            Net Funding Required
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(amounts?.net_funding_required) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-employees"></span>
            Employees
          </div>
          <div class="stats-segment-value">{{ amounts?.employees ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-status"></span>
            Group Status
          </div>
          <div class="stats-segment-value">{{ amounts?.group_status || '-' }}</div>
        </div>
      </div>

      <div class="content-row">
        <div class="content-col">
          <!-- Add Funds Form -->
          <div class="funding-form-section">
            <div class="section-header">
              <q-icon name="account_balance_wallet" size="18px" color="primary" class="section-icon" />
              <h2 class="section-title">Add Funds</h2>
            </div>
            <q-card class="funding-form-card">
              <q-card-section class="funding-form-grid">
                <q-input v-model="form.amount" dense outlined label="Amount" type="number" />
                <q-select v-model="form.source" :options="sourceOptions" dense outlined label="Source" />
                <q-input v-model="form.reference" dense outlined label="Reference / OR No." />
                <q-input v-model="form.custodian" dense outlined label="Custodian" />
                <q-input v-model="form.date" dense outlined label="Date" type="date" class="funding-form-date" />
              </q-card-section>
              <q-separator />
              <q-card-actions align="right" class="funding-form-actions">
                <q-btn unelevated no-caps color="primary" label="Submit Funding" :disable="!form.amount" @click="submitFunding" />
              </q-card-actions>
            </q-card>
          </div>
        </div>
        <div class="content-col">
          <!-- Top Earners -->
          <div class="funding-history-section">
            <div class="section-header">
              <h2 class="section-title">Top Earners</h2>
            </div>
            <div class="table-block">
              <q-table
                :rows="topEarners"
                :columns="topEarnerColumns"
                flat
                dense
                hide-pagination
                hide-no-data
                class="funding-table"
              >
                <template #body-cell-net_pay="props">
                  <q-td :props="props" class="text-right">₱{{ parseFloat(props.row.net_pay || 0).toLocaleString('en-PH') }}</q-td>
                </template>
                <template #no-data>
                  <div class="empty-state">
                    <q-icon name="inbox" size="28px" color="grey-4" />
                    <div class="empty-text">No data found</div>
                  </div>
                </template>
              </q-table>
            </div>
          </div>
        </div>
      </div>

      <!-- Funding History -->
      <div class="funding-history-section">
        <div class="section-header">
          <h2 class="section-title">Funding History</h2>
        </div>
        <div class="table-block">
          <q-table
            :rows="paginatedHistory"
            :columns="historyColumns"
            :loading="loading"
            row-key="id"
            flat
            dense
            hide-no-data
            hide-pagination
            class="funding-table"
          >
            <template #body-cell-status="props">
              <q-td :props="props">
                <StatusPill :status="props.row.status" />
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
        <div class="pagination-bar" v-if="filteredHistory.length > 0">
          <div class="pagination-info">
            <span class="pagination-text">
              Showing {{ (page - 1) * pageSize + 1 }} –
              {{ Math.min(page * pageSize, filteredHistory.length) }}
              of {{ filteredHistory.length }} funding records
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
const { fetchPayoutGroupInstanceAmounts, fetchTopEarners } = useDisbursementApi()

const loading = ref(true)
const amounts = ref(null)
const topEarners = ref([])
const fundingHistory = ref([])
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]

const form = ref({
  amount: '',
  source: null,
  reference: '',
  custodian: '',
  date: new Date().toISOString().slice(0, 10),
})

const sourceOptions = ['Bank Transfer', 'Check', 'Paytaca', 'Cash']

const historyColumns = [
  { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right', sortable: true, format: (v) => `\u20B1${(v ?? 0).toLocaleString('en-PH')}` },
  { name: 'source', label: 'Source', field: 'source', align: 'left', sortable: true },
  { name: 'reference', label: 'Reference', field: 'reference', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
]

const topEarnerColumns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position_name', label: 'Position', field: 'position_name', align: 'left' },
  { name: 'net_pay', label: 'Net Pay', field: 'net_pay', align: 'right', sortable: true },
  { name: 'payslip_status', label: 'Status', field: 'payslip_status', align: 'left', sortable: true },
]

const filteredHistory = computed(() => {
  if (!searchTerm.value.trim()) return fundingHistory.value
  const term = searchTerm.value.toLowerCase()
  return fundingHistory.value.filter((f) => {
    return (
      (f.source || '').toLowerCase().includes(term) ||
      (f.reference || '').toLowerCase().includes(term) ||
      (f.status || '').toLowerCase().includes(term)
    )
  })
})

const totalPages = computed(
  () => Math.ceil((filteredHistory.value?.length ?? 0) / pageSize.value) || 1,
)

const paginatedHistory = computed(() => {
  if (!filteredHistory.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredHistory.value.slice(start, start + pageSize.value)
})

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

onMounted(async () => {
  try {
    const [amt, earners] = await Promise.all([
      fetchPayoutGroupInstanceAmounts(groupId),
      fetchTopEarners(groupId),
    ])
    amounts.value = amt
    topEarners.value = earners || []
  } catch (err) {
    console.error('[FundingPage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/app/payroll')
}

function filterHistory() {
  page.value = 1
}

function onPageChange(newPage) {
  page.value = newPage
}

function onPageSizeChange(newSize) {
  pageSize.value = newSize
  page.value = 1
}

function submitFunding() {
  if (!form.value.amount) return
  fundingHistory.value.push({
    id: Date.now(),
    date: form.value.date,
    amount: Number(form.value.amount),
    source: form.value.source,
    reference: form.value.reference,
    status: 'funded',
  })
  form.value = { amount: '', source: null, reference: '', custodian: '', date: new Date().toISOString().slice(0, 10) }
}
</script>

<style scoped>
/* ==============================
   WRAPPER
   ============================== */
.funding-card {
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

.stats-dot-deductions {
  background: #f59e0b;
}

.stats-dot-ca {
  background: #ef4444;
}

.stats-dot-funding {
  background: #06b6d4;
}

.stats-dot-employees {
  background: #6366f1;
}

.stats-dot-status {
  background: #8b5cf6;
}

.stats-segment-value {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

/* ==============================
   FORM SECTION
   ============================== */
.funding-form-section {
  padding: 16px 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-icon {
  flex-shrink: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  letter-spacing: -0.01em;
}

.content-row {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #f1f3f5;
}

.content-col {
  flex: 1;
  min-width: 0;
}

.content-col:first-child {
  border-right: 1px solid #f1f3f5;
}

.funding-form-card {
  border: 1px solid #e8ecf0;
  border-radius: 12px;
}

.funding-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.funding-form-date {
  grid-column: 1;
}

.funding-form-actions {
  padding: 10px 16px;
}

/* ==============================
   HISTORY SECTION
   ============================== */
.funding-history-section {
  padding: 16px 24px;
}

.funding-history-section .section-header {
  margin-bottom: 8px;
}

/* ==============================
   TABLE SECTION
   ============================== */
.table-block {
}

.funding-table :deep(.q-table thead th) {
  font-size: 10.5px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 8px 10px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}

.funding-table :deep(.q-table tbody td) {
  padding: 8px 10px;
  font-size: 12.5px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
  vertical-align: middle;
}

.funding-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}

.funding-table :deep(.q-table tbody tr:hover td) {
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
  .funding-card {
    border-radius: 14px;
  }

  .page-header {
    padding: 8px 20px;
  }

  .funding-form-section {
    padding: 16px 20px;
  }

  .funding-history-section {
    padding: 16px 20px;
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

  .funding-form-section {
    padding: 16px 16px;
  }

  .funding-history-section {
    padding: 16px 16px;
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
