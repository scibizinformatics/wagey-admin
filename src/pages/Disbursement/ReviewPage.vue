<template>
  <PageShell>
    <div class="review-card">
      <!-- Header Section -->
      <div class="page-header">
        <div class="back-row">
          <q-btn flat dense no-caps icon="arrow_back" label="Back to Disbursement" class="back-btn" @click="goBack" />
        </div>
        <div class="header-content">
          <div class="header-titles">
            <h1 class="page-title">Review</h1>
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
      <PayoutGroupStepperHeader :group-id="groupId" :key="stepperKey" />

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-total"></span>
            Total Employees
          </div>
          <div class="stats-segment-value">{{ reviewData.length ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-reviewed"></span>
            Reviewed
          </div>
          <div class="stats-segment-value">{{ overview?.reviewed ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-issues"></span>
            Needs Attention
          </div>
          <div class="stats-segment-value">{{ overview?.needs_attention ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-missing"></span>
            Missing Date
          </div>
          <div class="stats-segment-value">{{ overview?.missing_date ?? 0 }}</div>
        </div>
        <div class="stats-divider"></div>
        <div class="stats-segment">
          <div class="stats-segment-label">
            <span class="stats-dot stats-dot-na"></span>
            N/A
          </div>
          <div class="stats-segment-value">{{ overview?.not_applicable ?? 0 }}</div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="section-header">
        <h2 class="section-title">Attendance Review</h2>
        <q-btn
          label="Release Payslips"
          icon="send"
          class="header-action-btn"
          unelevated
          :loading="releasing"
          @click="releaseAll"
        />
      </div>
      <div class="table-block">
          <q-table
          :rows="paginatedData"
          :columns="columns"
          :loading="loading"
          :pagination="{ rowsPerPage: 0 }"
          row-key="id"
          flat
          dense
          hide-no-data
          hide-pagination
          class="review-table"
          >
            <template #body-cell-status="props">
            <q-td :props="props">
              <StatusPill :status="props.row.status" />
            </q-td>
          </template>
          <template #body-cell-issues="props">
            <q-td :props="props">
              <div class="issues-cell">
                <span v-if="!props.row.issues?.length" class="no-issues">None</span>
                <span v-for="(issue, i) in props.row.issues" :key="i" class="issue-chip">{{ issue }}</span>
              </div>
            </q-td>
          </template>
          <template #body-cell-action="props">
            <q-td :props="props" class="actions-cell">
              <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                  <q-list dense style="min-width: 150px">
                    <q-item
                      clickable
                      v-close-popup
                      :disable="reviewedIds.includes(props.row.id) || reviewingId === props.row.id"
                      @click="reviewEmployee(props.row)"
                      class="dropdown-item"
                    >
                      <q-item-section avatar>
                        <q-spinner v-if="reviewingId === props.row.id" size="16px" />
                        <q-icon v-else name="check" size="16px" color="positive" />
                      </q-item-section>
                      <q-item-section>Review</q-item-section>
                    </q-item>
                    <q-item
                      v-if="reviewedIds.includes(props.row.id)"
                      clickable
                      v-close-popup
                      :disable="releasingId === props.row.id"
                      @click="releaseEmployee(props.row)"
                      class="dropdown-item"
                    >
                      <q-item-section avatar>
                        <q-spinner v-if="releasingId === props.row.id" size="16px" />
                        <q-icon v-else name="send" size="16px" color="info" />
                      </q-item-section>
                      <q-item-section>Release</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item
                      clickable
                      v-close-popup
                      @click="viewEmployee(props.row)"
                      class="dropdown-item"
                    >
                      <q-item-section avatar><q-icon name="visibility" size="16px" /></q-item-section>
                      <q-item-section>View</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
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

    <EmployeeDetailDialog v-model="detailDialogOpen" :employee-id="selectedEmployeeId" />
  </PageShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import StatusPill from 'src/components/common/StatusPill.vue'
import PayoutGroupStepperHeader from 'src/components/pages/Payroll/PayoutGroupStepperHeader.vue'
import PageShell from 'src/components/layout/PageShell.vue'
import EmployeeDetailDialog from 'src/components/pages/Payroll/EmployeeDetailDialog.vue'
import { useDisbursementApi } from 'src/composables/disbursement/useDisbursementApi'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const groupId = route.params.id
const stepperKey = ref(0)
const { fetchReviewOverview, fetchAttendanceSummary, reviewToReady, releasePayslips } = useDisbursementApi()

const loading = ref(true)
const releasing = ref(false)
const reviewingId = ref(null)
const releasingId = ref(null)
const reviewedIds = ref([])
const overview = ref(null)
const reviewData = ref([])
const searchTerm = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const detailDialogOpen = ref(false)
const selectedEmployeeId = ref(null)

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'position', align: 'left', sortable: true },
  { name: 'department', label: 'Department', field: 'department', align: 'left', sortable: true },
  { name: 'days_worked', label: 'Days Worked', field: 'days_worked', align: 'center', sortable: true },
  { name: 'undertime', label: 'Undertime', field: 'undertime', align: 'center' },
  { name: 'late', label: 'Late', field: 'late', align: 'center', sortable: true },
  { name: 'absent', label: 'Absent', field: 'absent', align: 'center', sortable: true },
  { name: 'ot_hours', label: 'OT Hours', field: 'ot_hours', align: 'center' },
  { name: 'issues', label: 'Issues', field: 'issues', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  { name: 'action', label: 'Action', field: 'action', align: 'center' },
]

const filteredData = computed(() => {
  if (!searchTerm.value.trim()) return reviewData.value
  const term = searchTerm.value.toLowerCase()
  return reviewData.value.filter((e) => {
    return (
      (e.employee || '').toLowerCase().includes(term) ||
      (e.department || '').toLowerCase().includes(term) ||
      (e.position || '').toLowerCase().includes(term)
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

onMounted(async () => {
  try {
    const [ov, att] = await Promise.all([
      fetchReviewOverview(groupId),
      fetchAttendanceSummary(groupId),
    ])
    overview.value = ov
    reviewData.value = att?.employees || []
    reviewedIds.value = (att?.employees || []).filter((e) => e.status === 'reviewed').map((e) => e.id)
  } catch (err) {
    console.error('[ReviewPage] fetch failed:', err)
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/app/payroll')
}

function viewEmployee(row) {
  selectedEmployeeId.value = row.id
  detailDialogOpen.value = true
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

async function reviewEmployee(row) {
  reviewingId.value = row.id
  try {
    await reviewToReady(groupId, [row.id])
    if (!reviewedIds.value.includes(row.id)) {
      reviewedIds.value.push(row.id)
    }
  } catch (err) {
    console.error('[ReviewPage] reviewEmployee ✖ error:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to review employee.',
      icon: 'error',
      timeout: 3000,
      position: 'top',
    })
  } finally {
    reviewingId.value = null
  }
}

async function releaseAll() {
  releasing.value = true
  try {
    const epIds = reviewData.value
      .filter((e) => reviewedIds.value.includes(e.id))
      .map((e) => e.id)
    if (!epIds.length) {
      $q.notify({
        type: 'warning',
        message: 'No reviewed employees to release.',
        icon: 'warning',
        timeout: 2000,
        position: 'top',
      })
      return
    }
    await releasePayslips(groupId, epIds)

    stepperKey.value++
    const [ov, att] = await Promise.all([
      fetchReviewOverview(groupId),
      fetchAttendanceSummary(groupId),
    ])
    overview.value = ov
    reviewData.value = att?.employees || []
    $q.notify({
      type: 'positive',
      message: `Payslips released for ${epIds.length} employee${epIds.length > 1 ? 's' : ''}.`,
      icon: 'check_circle',
      timeout: 3000,
      position: 'top',
    })
  } catch (err) {
    console.error('[ReviewPage] releaseAll ✖ error:', err)
  } finally {
    releasing.value = false
  }
}

async function releaseEmployee(row) {
  releasingId.value = row.id
  try {
    await releasePayslips(groupId, [row.id])

    const [ov, att] = await Promise.all([
      fetchReviewOverview(groupId),
      fetchAttendanceSummary(groupId),
    ])
    overview.value = ov
    reviewData.value = att?.employees || []
    $q.notify({
      type: 'positive',
      message: `Payslip released for ${row.employee}.`,
      icon: 'check_circle',
      timeout: 2000,
      position: 'top',
    })
  } catch (err) {
    console.error('[ReviewPage] releaseEmployee ✖ error:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to release payslip.',
      icon: 'error',
      timeout: 3000,
      position: 'top',
    })
  } finally {
    releasingId.value = null
  }
}
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0px 14px 1px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  letter-spacing: -0.01em;
}

.header-action-btn {
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

.header-action-btn:hover {
  background: #193d5c !important;
}

/* ==============================
   WRAPPER
   ============================== */
.review-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

/* ==============================
   HEADER
   ============================== */
.back-row {
  padding: 8px 5px 0;
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

.stats-dot-reviewed {
  background: #10b981;
}

.stats-dot-issues {
  background: #f87171;
}

.stats-dot-missing {
  background: #f59e0b;
}

.stats-dot-na {
  background: #9ca3af;
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

.review-table :deep(.q-table thead th) {
  font-size: 10.5px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 4px 10px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}

.review-table :deep(.q-table tbody td) {
  padding: 8px 10px;
  font-size: 12.5px;
  color: #374151;
  border-bottom: 1px solid #f1f3f5;
  vertical-align: middle;
}

.review-table :deep(.q-table tbody tr:last-child td) {
  border-bottom: none;
}

.review-table :deep(.q-table tbody tr:hover td) {
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

.issues-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.issue-chip {
  font-size: 10px;
  color: #b45309;
  background: #fffbeb;
  padding: 1px 7px;
  border-radius: 4px;
  white-space: nowrap;
}

.no-issues {
  font-size: 11.5px;
  color: #9ca3af;
}

.actions-cell {
  text-align: center !important;
  width: 60px;
}

.action-menu-btn {
  color: #94a3b8 !important;
  border-radius: 8px !important;
}

.action-menu-btn:hover {
  background: #f1f5f9 !important;
  color: #334155 !important;
}

.action-dropdown {
  border-radius: 10px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08) !important;
}

.dropdown-item {
  font-size: 13px !important;
  color: #334155 !important;
  min-height: 36px !important;
  padding: 0 12px !important;
  border-radius: 6px !important;
}

.dropdown-item:hover {
  background: #f8fafc !important;
}

.done-text {
  font-size: 11.5px;
  color: #16a34a;
  font-weight: 600;
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
  .review-card {
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
