<template>
  <PageShell>
    <div class="complete-card">
      <!-- Header Section -->
      <div class="page-header">
        <div class="back-row">
          <q-btn flat dense no-caps icon="arrow_back" label="Back to Disbursement" class="back-btn" @click="goBack" />
        </div>
        <div class="header-content">
          <div class="header-titles">
            <h1 class="page-title">Complete</h1>
          </div>
          <div class="header-actions">
            <q-input
              v-model="searchTerm"
              placeholder="Search employees..."
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

      <!-- Stepper Header -->
      <PayoutGroupStepperHeader :group-id="groupId" />

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-total"></span>
            Net Payroll Amount
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(completion?.net_payroll_amount) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-paid"></span>
            Total Employees Paid
          </div>
          <div class="stats-segment-value">{{ completion?.total_employees_paid ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-success"></span>
            Employees Paid
          </div>
          <div class="stats-segment-value">{{ completion?.employees_paid ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-payouts"></span>
            Total Payouts
          </div>
          <div class="stats-segment-value">{{ completion?.total_payouts ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-fees"></span>
            Total Fees
          </div>
          <div class="stats-segment-value">₱{{ parseAmount(completion?.total_fees) }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-date"></span>
            Completion Date
          </div>
          <div class="stats-segment-value">{{ completion?.completion_date || '—' }}</div>
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
          class="complete-table"
        >
          <template #body-cell-status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.status" />
            </q-td>
          </template>
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

      <!-- Pagination Controls -->
      <div class="pagination-bar" v-if="filteredData.length > 0">
        <div class="pagination-info">
          <span class="pagination-text">
            Showing {{ (page - 1) * pageSize + 1 }} –
            {{ Math.min(page * pageSize, filteredData.length) }}
            of {{ filteredData.length }} employees
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
const { fetchPayoutGroupCompletion, fetchPayoutSummaryByEmployee } = useDisbursementApi()

const loading = ref(true)
const completion = ref(null)
const employees = ref([])
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'position', align: 'left', sortable: true },
  { name: 'payment_method', label: 'Payment Method', field: 'payment_method', align: 'center' },
  { name: 'reference_no', label: 'Reference No', field: 'reference_no', align: 'center' },
  { name: 'net_pay', label: 'Net Pay', field: 'net_pay', align: 'right', sortable: true, format: (v) => `\u20B1${parseFloat(v || 0).toLocaleString('en-PH')}` },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  { name: 'released_on', label: 'Released On', field: 'released_on', align: 'center' },
  { name: 'received_by', label: 'Received By', field: 'received_by', align: 'center' },
]

const filteredData = computed(() => {
  if (!searchTerm.value.trim()) return employees.value
  const term = searchTerm.value.toLowerCase()
  return employees.value.filter((e) => {
    return (
      (e.employee || '').toLowerCase().includes(term) ||
      (e.status || '').toLowerCase().includes(term) ||
      (e.payment_method || '').toLowerCase().includes(term)
    )
  })
})

const totalPages = computed(
  () => Math.ceil((filteredData.value?.length ?? 0) / pageSize.value) || 1,
)

const paginatedData = computed(() => {
  if (!filteredData.value) return []
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

function parseAmount(val) {
  return parseFloat(val || 0).toLocaleString('en-PH')
}

onMounted(async () => {
  try {
    const [comp, emp] = await Promise.all([
      fetchPayoutGroupCompletion(groupId),
      fetchPayoutSummaryByEmployee(groupId),
    ])
    completion.value = comp
    employees.value = emp || []
  } catch (err) {
    console.error('[CompletePage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/app/payroll')
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
.complete-card {
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

.stats-dot-paid {
  background: #10b981;
}

.stats-dot-success {
  background: #f59e0b;
}

.stats-dot-payouts {
  background: #8b5cf6;
}

.stats-dot-fees {
  background: #f59e0b;
}

.stats-dot-date {
  background: #3b82f6;
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

.complete-table :deep(.q-table thead th) {
  font-size: 10.5px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 8px 10px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}

.complete-table :deep(.q-table tbody td) {
  padding: 8px 10px;
  font-size: 12.5px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
  vertical-align: middle;
}

.complete-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}

.complete-table :deep(.q-table tbody tr:hover td) {
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
  .complete-card {
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
