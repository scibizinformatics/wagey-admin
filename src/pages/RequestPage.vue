<template>
  <PageShell fluid>
    <div class="requests-page">
      <!-- Page header -->
      <header class="page-head">
        <div class="page-identity">
          <h1 class="page-heading">Requests</h1>
          <div class="page-meta">
            <template v-if="companyName">
              <span class="page-meta-item">{{ companyName }}</span>
              <span class="page-meta-dot" aria-hidden="true">·</span>
            </template>
            <span :class="['page-meta-item', { waiting: totalPending > 0 }]">
              {{ pendingSummary }}
            </span>
            <span class="page-meta-dot" aria-hidden="true">·</span>
            <span class="page-meta-item page-meta-live">
              <span class="live-dot" aria-hidden="true"></span>
              Updated {{ lastUpdatedLabel }}
            </span>
          </div>
        </div>

        <div class="page-actions">
          <q-btn
            round
            flat
            icon="refresh"
            class="refresh-btn"
            @click="handleRefresh"
            :loading="refreshLoading"
          >
            <q-tooltip>Refresh</q-tooltip>
          </q-btn>
          <span class="action-divider" aria-hidden="true"></span>
          <q-btn
            v-if="activeTab === 'leave'"
            unelevated
            no-caps
            icon="add"
            label="Apply leave"
            class="primary-action-btn"
            @click="openApplyLeaveModal"
          />
          <q-btn
            v-else-if="activeTab === 'overtime'"
            unelevated
            no-caps
            icon="add"
            label="Overtime advance"
            class="primary-action-btn"
            @click="openOvertimeAdvanceModal"
          />
          <q-btn-toggle
            v-else-if="activeTab === 'cash_advance'"
            v-model="caViewMode"
            no-caps
            unelevated
            :options="[
              { label: 'All requests', value: 'all', icon: 'list' },
              { label: 'By cutoff', value: 'cutoff', icon: 'calendar_today' },
            ]"
            class="view-toggle"
          />
        </div>
      </header>

      <!-- Work surface: tabs ride the card's top edge, then one stat/filter
           band, then the table. -->
      <section class="queue-content">
        <div class="tab-bar-row">
          <nav class="tab-bar" aria-label="Request queues">
            <button
              v-for="queue in queues"
              :key="queue.key"
              type="button"
              :class="['queue-tab', { active: activeTab === queue.key }]"
              :aria-pressed="activeTab === queue.key"
              @click="activeTab = queue.key"
            >
              <q-icon :name="queue.icon" size="18px" class="queue-tab-icon" />
              <span class="queue-tab-label">{{ queue.label }}</span>
              <span v-if="queue.pending > 0" class="queue-tab-count">
                {{ queue.pending }}
                <q-tooltip>{{ queue.pending }} pending</q-tooltip>
              </span>
            </button>
          </nav>
          <div class="tab-bar-aside">
            <!-- Overtime has no filter toolbar of its own — its rows live inside
                 the expandable payroll-run cards — so its search sits here. -->
            <template v-if="activeTab === 'overtime'">
              <q-input
                v-model="overtimeSearch"
                placeholder="Search employee"
                dense
                outlined
                clearable
                class="grid-search tab-bar-search dash-field"
              >
                <template v-slot:prepend>
                  <q-icon name="search" size="18px" />
                </template>
              </q-input>
              <q-select
                v-model="overtimeStatusFilter"
                :options="overtimeStatusOptions"
                emit-value
                map-options
                dense
                outlined
                hide-bottom-space
                popup-content-class="dash-popup"
                class="grid-filter dash-field"
                aria-label="Filter overtime by status"
              >
                <template v-slot:prepend>
                  <q-icon name="o_filter_alt" size="16px" />
                </template>
              </q-select>
            </template>
            <RequestStatsCards
              class="tab-bar-stats"
              :active-tab="activeTab"
              :leave-stats="leaveStats"
              :overtime-stats="overtimeStats"
              :ca-statistics="caStatistics"
              :swap-statistics="swapStatistics"
            />
          </div>
        </div>

        <!-- Tab Panels -->
        <q-tab-panels v-model="activeTab" class="tab-panels">
          <q-tab-panel name="leave" class="tab-panel-content">
            <RequestLeaveTable
              :rows="filteredLeaveRequests"
              :loading="loading"
              :action-loading="actionLoading"
              :status-filter="statusFilter"
              :search="searchTerm"
              @update:status-filter="statusFilter = $event"
              @update:search="searchTerm = $event"
              @view-details="openLeaveDetails"
              @approve="approveRequest"
              @reject="rejectRequest"
            />
          </q-tab-panel>

          <q-tab-panel name="overtime" class="tab-panel-content">
            <div class="panel-surface">
              <div v-if="overtimeSummary.length" class="overtime-summary-list">
                <div
                  v-for="log in overtimeSummary"
                  :key="log.id"
                  :class="['overtime-summary-card', { active: selectedDisbursementLog === log.id }]"
                  @click="selectDisbursementLog(log.id)"
                >
                  <div class="summary-card-header">
                    <div class="summary-card-name-group">
                      <q-icon
                        name="expand_more"
                        :style="{
                          transform:
                            selectedDisbursementLog === log.id ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease',
                        }"
                        size="18px"
                        class="expand-icon"
                      />
                      <div class="summary-name-stack">
                        <div class="summary-name">{{ getBaseName(log.name) }}</div>
                        <div class="summary-period" v-if="getPeriodFromName(log.name)">
                          {{ getPeriodFromName(log.name) }}
                        </div>
                      </div>
                    </div>

                    <div class="summary-stat-cols">
                      <div class="summary-stat-col">
                        <span class="summary-stat-label">Total OT</span>
                        <span class="summary-stat-val">{{ log.overtime_total_count }}</span>
                      </div>
                      <div class="summary-stat-col">
                        <span class="summary-stat-label">Approved</span>
                        <span class="summary-stat-val">{{ log.overtime_approved_count }}</span>
                      </div>
                      <div class="summary-stat-col">
                        <span class="summary-stat-label">Requested</span>
                        <span class="summary-stat-val">{{
                          log.overtime_total_count - log.overtime_approved_count
                        }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Expanded Panel with Overtime Requests Table -->
                  <div
                    v-if="selectedDisbursementLog === log.id"
                    class="overtime-panel-wrapper"
                    @click.stop
                  >
                    <div class="overtime-panel">
                      <div class="overtime-panel-header">
                        <div class="panel-title">
                          <q-icon name="schedule" size="16px" color="primary" />
                          <span>Overtime Requests</span>
                          <span class="panel-count">{{ overtimeRequests.length }}</span>
                        </div>
                      </div>
                      <!-- Loading. Built from the live `otColumns`, so the placeholder
                         shares the real table's columns, labels and alignment. -->
                      <TableSkeleton
                        v-if="overtimeLoading"
                        :columns="otColumns"
                        :rows="4"
                        flush
                        wrap-class="overtime-table-container dash-scroll-x"
                      />

                      <!-- Empty -->
                      <div v-else-if="filteredOvertimeRequests.length === 0" class="grid-empty">
                        <div class="grid-empty-icon"><q-icon name="more_time" size="26px" /></div>
                        <div class="grid-empty-title">
                          {{
                            overtimeNarrowed
                              ? 'No overtime matches your search'
                              : 'No overtime in this run'
                          }}
                        </div>
                        <div class="grid-empty-text">
                          {{
                            overtimeNarrowed
                              ? 'Clear the search or switch back to All statuses to see every overtime request in this payroll run.'
                              : 'Overtime logged against this payroll run will appear here for approval.'
                          }}
                        </div>
                      </div>

                      <div v-else>
                        <!-- Bulk Actions -->
                        <div v-if="selectedOvertimeIds.size > 0" class="bulk-actions-bar">
                          <span class="bulk-count">{{ selectedOvertimeIds.size }} selected</span>
                          <q-btn
                            unelevated
                            dense
                            no-caps
                            icon="check"
                            color="positive"
                            label="Approve Selected"
                            :loading="overtimeSubmitting.size > 0"
                            @click="bulkApproveOvertime"
                          />
                          <q-btn
                            unelevated
                            dense
                            no-caps
                            icon="close"
                            color="negative"
                            label="Reject Selected"
                            :loading="overtimeSubmitting.size > 0"
                            @click="bulkRejectOvertime"
                          />
                          <q-btn flat dense label="Clear" @click="clearOvertimeSelection" />
                        </div>

                        <div class="overtime-table-container dash-scroll-x">
                          <q-table
                            :rows="filteredOvertimeRequests"
                            :columns="otColumns"
                            row-key="id"
                            flat
                            hide-pagination
                            :rows-per-page-options="[0]"
                            class="dash-qtable dash-qtable--flush request-grid overtime-grid"
                          >
                            <template v-slot:header="props">
                              <q-tr class="grid-head-row" :props="props">
                                <q-th
                                  key="select"
                                  :props="props"
                                  class="grid-head-cell ot-cell-select"
                                >
                                  <q-checkbox
                                    :model-value="allOvertimeSelected"
                                    @update:model-value="toggleSelectAllOvertime"
                                    dense
                                    size="xs"
                                  />
                                </q-th>
                                <q-th
                                  key="employeeName"
                                  :props="props"
                                  class="grid-head-cell ot-cell-employee"
                                  >Employee</q-th
                                >
                                <q-th
                                  key="schedule"
                                  :props="props"
                                  class="grid-head-cell ot-cell-time"
                                  >Scheduled / actual</q-th
                                >
                                <q-th key="dates" :props="props" class="grid-head-cell ot-cell-date"
                                  >Date</q-th
                                >
                                <q-th
                                  key="hours"
                                  :props="props"
                                  class="grid-head-cell ot-cell-hours"
                                  >Hours</q-th
                                >
                                <q-th
                                  key="status"
                                  :props="props"
                                  class="grid-head-cell ot-cell-status"
                                  >Status</q-th
                                >
                                <q-th
                                  key="actions"
                                  :props="props"
                                  class="grid-head-cell grid-head-cell--right ot-cell-actions"
                                  >Actions</q-th
                                >
                              </q-tr>
                            </template>
                            <template v-slot:body="props">
                              <q-tr
                                class="dash-qtable__row grid-row"
                                :class="{
                                  'grid-row--waiting': ['requested', 'qualified'].includes(
                                    props.row.status,
                                  ),
                                }"
                                :props="props"
                              >
                                <q-td
                                  key="select"
                                  :props="props"
                                  class="grid-cell grid-cell--center ot-cell-select"
                                >
                                  <q-checkbox
                                    v-if="['requested', 'qualified'].includes(props.row.status)"
                                    :model-value="selectedOvertimeIds.has(props.row.id)"
                                    @update:model-value="toggleOvertimeSelection(props.row.id)"
                                    dense
                                    size="xs"
                                  />
                                </q-td>
                                <q-td
                                  key="employeeName"
                                  :props="props"
                                  class="grid-cell ot-cell-employee"
                                >
                                  <div class="identity">
                                    <span class="identity-avatar">
                                      {{
                                        props.row.employeeName
                                          ? props.row.employeeName
                                              .split(' ')
                                              .map((n) => n[0])
                                              .join('')
                                              .toUpperCase()
                                              .slice(0, 2)
                                          : '?'
                                      }}
                                    </span>
                                    <span class="identity-text">
                                      <span class="identity-name">{{
                                        props.row.employeeName
                                      }}</span>
                                      <span class="identity-sub">{{ props.row.categoryName }}</span>
                                    </span>
                                  </div>
                                </q-td>
                                <q-td key="schedule" :props="props" class="grid-cell ot-cell-time">
                                  <div v-if="props.row.schedules?.[0]" class="range">
                                    {{ props.row.schedules[0].actual_start }}
                                    <span class="range-sep">&rarr;</span>
                                    {{ props.row.schedules[0].actual_end }}
                                  </div>
                                  <div v-else class="range muted">&mdash;</div>
                                  <div v-if="props.row.attendances?.[0]" class="range-meta">
                                    actual {{ props.row.attendances[0].time_in }} &rarr;
                                    {{ props.row.attendances[0].time_out }}
                                  </div>
                                  <div v-else class="range-meta">no attendance</div>
                                </q-td>
                                <q-td key="dates" :props="props" class="grid-cell ot-cell-date">
                                  <span class="stat-num">{{
                                    props.row.date
                                      ? new Date(props.row.date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                        })
                                      : 'N/A'
                                  }}</span>
                                </q-td>
                                <q-td key="hours" :props="props" class="grid-cell ot-cell-hours">
                                  <div class="hours-cell-content">
                                    <q-input
                                      v-if="['requested', 'qualified'].includes(props.row.status)"
                                      :model-value="
                                        overtimeEditableHours[props.row.id] ?? props.row.hours
                                      "
                                      @update:model-value="
                                        overtimeEditableHours[props.row.id] = $event
                                      "
                                      @click.stop
                                      dense
                                      outlined
                                      type="number"
                                      step="0.01"
                                      class="hours-input"
                                    />
                                    <span v-else class="amount">
                                      {{ props.row.hours === '-' ? '—' : props.row.hours + 'h' }}
                                    </span>
                                    <span v-if="props.row.convertedToCto" class="cto-badge"
                                      >CTO</span
                                    >
                                  </div>
                                </q-td>
                                <q-td key="status" :props="props" class="grid-cell ot-cell-status">
                                  <span
                                    :class="['status-pill', overtimeStatusPill(props.row.status)]"
                                  >
                                    {{
                                      props.row.status
                                        ? props.row.status.charAt(0).toUpperCase() +
                                          props.row.status.slice(1)
                                        : 'N/A'
                                    }}
                                  </span>
                                </q-td>
                                <q-td
                                  key="actions"
                                  :props="props"
                                  class="grid-cell ot-cell-actions"
                                >
                                  <div class="grid-actions">
                                    <q-btn
                                      flat
                                      dense
                                      round
                                      icon="visibility"
                                      size="sm"
                                      class="grid-action"
                                      @click.stop="openOvertimeDetail(props.row)"
                                    >
                                      <q-tooltip>View details</q-tooltip>
                                    </q-btn>
                                    <q-btn
                                      v-if="['requested', 'qualified'].includes(props.row.status)"
                                      flat
                                      dense
                                      round
                                      icon="check"
                                      size="sm"
                                      class="grid-action grid-action--approve"
                                      @click.stop="approveOvertimeSingle(props.row)"
                                      :loading="overtimeSubmitting.has(props.row.id)"
                                    >
                                      <q-tooltip>Approve</q-tooltip>
                                    </q-btn>
                                    <q-btn
                                      v-if="['requested', 'qualified'].includes(props.row.status)"
                                      flat
                                      dense
                                      round
                                      icon="close"
                                      size="sm"
                                      class="grid-action grid-action--reject"
                                      @click.stop="rejectOvertimeSingle(props.row)"
                                      :loading="overtimeSubmitting.has(props.row.id)"
                                    >
                                      <q-tooltip>Reject</q-tooltip>
                                    </q-btn>
                                  </div>
                                </q-td>
                              </q-tr>
                            </template>
                          </q-table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Featured-icon empty state, so an overtime tab with no runs
                   looks designed rather than broken. -->
              <div v-else class="overtime-empty-state dash-empty">
                <span class="dash-featured-icon">
                  <q-icon name="o_more_time" size="20px" />
                </span>
                <p class="dash-empty__title">No payroll runs with overtime</p>
                <p class="dash-empty__sub">
                  Once a payroll run records overtime, it appears here as a card you can expand to
                  review and approve each request.
                </p>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="cash_advance" class="tab-panel-content">
            <div class="panel-surface">
              <RequestCashAdvanceTable
                v-if="caViewMode === 'all'"
                :rows="filteredCaRequests"
                :loading="loading"
                :ca-filter-status="caFilterStatus"
                :ca-status-options="caStatusOptions"
                :ca-pagination="caPagination"
                :search="searchTerm"
                @update:ca-filter-status="caFilterStatus = $event"
                @update:search="searchTerm = $event"
                @view="viewCaRequest"
                @approve="openCaApprovalModal"
              />

              <RequestCashAdvanceCutoff
                v-else
                :logs="caDisbursementLogs"
                :loading="loading"
                :expanded-log-id="selectedCaDisbursementLog"
                :cutoff-requests="caCutoffRequests"
                :cutoff-loading="caCutoffLoading"
                :search="caCutoffSearch"
                @expand="selectCaDisbursementLog"
                @view="viewCaRequest"
                @approve="openCaApprovalModal"
                @update:search="caCutoffSearch = $event"
              />
            </div>
          </q-tab-panel>

          <q-tab-panel name="swap" class="tab-panel-content">
            <RequestSwapTable
              :rows="filteredSwapRequests"
              :loading="swapLoading"
              :sortBy="swapSortBy"
              :processingId="swapActionLoading"
              :pagination="swapPagination"
              :totalRecords="swapRequests.length"
              :search="searchTerm"
              @update:search="searchTerm = $event"
              @update:sortBy="swapSortBy = $event"
              @update:pagination="swapPagination = $event"
              @view="viewSwapRequest"
              @approve="approveSwapRequest"
              @reject="rejectSwapRequest"
            />
          </q-tab-panel>
        </q-tab-panels>
      </section>

      <!-- Modals -->
      <RequestLeaveDetailModal
        v-model="showLeaveDetails"
        :request="selectedLeaveRequest"
        :action-loading="actionLoading"
        @approve="approveRequest"
        @reject="rejectRequest"
      />

      <RequestCaApprovalModal
        v-model="caApprovalModal"
        :request="selectedCaRequest"
        :approval-data="caApprovalData"
        :submitting="caSubmitting"
        @update:approval-data="caApprovalData = $event"
        @submit="submitCaApproval"
      />

      <RequestCaViewModal v-model="caViewDialog" :request="selectedCaRequest" />

      <RequestOvertimeDetailModal v-model="showOvertimeDetail" :request="selectedOvertimeRow" />

      <OvertimeAdvanceModal
        v-model="showOvertimeAdvanceModal"
        :categories="overtimeCategories"
        :employee-options="overtimeAdvanceEmployeeOptions"
        :submitting="overtimeAdvanceSubmitting"
        :company-id="selectedCompany"
        @filter-employees="filterOvertimeAdvanceEmployees"
        @submit="submitOvertimeAdvance"
      />

      <RequestSwapViewModal
        v-model="showSwapViewDialog"
        :request="selectedSwapRequest"
        @approve="approveSwapRequest"
        @reject="rejectSwapRequest"
      />

      <RequestApplyLeaveModal
        v-model="showApplyLeaveModal"
        :employee-options="applyLeaveEmployeeOptions"
        :leave-types="applyLeaveTypes"
        :submitting="applyLeaveSubmitting"
        @filter-employees="filterApplyLeaveEmployees"
        @submit="submitApplyLeave"
      />
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { useEmployees } from 'src/composables/page/useEmployees'
import { useCompany } from 'src/composables/page/useCompany'
import RequestStatsCards from 'src/components/pages/Request/RequestStatsCards.vue'
import RequestLeaveTable from 'src/components/pages/Request/RequestLeaveTable.vue'
import RequestCashAdvanceTable from 'src/components/pages/Request/RequestCashAdvanceTable.vue'
import RequestLeaveDetailModal from 'src/components/pages/Request/RequestLeaveDetailModal.vue'
import RequestCaApprovalModal from 'src/components/pages/Request/RequestCaApprovalModal.vue'
import RequestCaViewModal from 'src/components/pages/Request/RequestCaViewModal.vue'
import RequestOvertimeDetailModal from 'src/components/pages/Request/RequestOvertimeDetailModal.vue'
import OvertimeAdvanceModal from 'src/components/pages/Request/OvertimeAdvanceModal.vue'
import RequestCashAdvanceCutoff from 'src/components/pages/Request/RequestCashAdvanceCutoff.vue'
import RequestSwapTable from 'src/components/pages/Request/RequestSwapTable.vue'
import RequestSwapViewModal from 'src/components/pages/Request/RequestSwapViewModal.vue'
import RequestApplyLeaveModal from 'src/components/pages/Request/RequestApplyLeaveModal.vue'

const $q = useQuasar()

const { employees, fetchEmployees } = useEmployees()
const { company } = useCompany()

const companyName = computed(() => company.value?.name || '')

// ===== OVERTIME ADVANCE STATE =====
const showOvertimeAdvanceModal = ref(false)
const overtimeAdvanceSubmitting = ref(false)
const overtimeAdvanceEmployeeOptions = ref([])

// ===== APPLY LEAVE STATE =====
const showApplyLeaveModal = ref(false)
const applyLeaveSubmitting = ref(false)
const applyLeaveEmployeeOptions = ref([])
const applyLeaveTypes = ref([])

// ===== SHARED STATE =====
const activeTab = ref('leave')
const getCompanyId = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('selectedCompany'))
    const id = parsed?.id || parsed?.companyId
    if (id) return String(id)
  } catch {
    /* ignore parse errors */
  }
  const raw = localStorage.getItem('selectedCompany')
  if (raw) return String(raw)
  const direct = localStorage.getItem('company_id')
  return direct ? String(direct) : ''
}
const selectedCompany = ref(getCompanyId())
const loading = ref(false)
const searchTerm = ref('')

// ===== LEAVE STATE =====
const leaveList = ref([])
const statusFilter = ref('all')
const actionLoading = ref(null)
const selectedLeaveRequest = ref(null)
const showLeaveDetails = ref(false)

// ===== OVERTIME STATE =====
const overtimeSummary = ref([])
const overtimeCategories = ref([])
const selectedDisbursementLog = ref(null)
const overtimeRequests = ref([])
const overtimeLoading = ref(false)
const overtimeSearch = ref('')
const overtimeStatusFilter = ref('all')
const overtimeStatusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Requested', value: 'requested' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]
const overtimeSubmitting = ref(new Set())
const overtimeEditableHours = ref({})
const selectedOvertimeIds = ref(new Set())
const showOvertimeDetail = ref(false)
const selectedOvertimeRow = ref(null)

// ===== CASH ADVANCE STATE =====
const caRequests = ref([])
const caFilterStatus = ref('')
const caSubmitting = ref(false)
const selectedCaRequest = ref(null)
const caApprovalModal = ref(false)
const caViewDialog = ref(false)
const caApprovalData = ref({ status: 'approved', remarks: '' })
const caPagination = ref({ page: 1, rowsPerPage: 10 })
const caStatistics = ref({ total: 0, pending: 0, approved: 0, rejected: 0 })
const caStatusOptions = ['', 'pending', 'approved', 'rejected']
const caViewMode = ref('all')
const caDisbursementLogs = ref([])
const selectedCaDisbursementLog = ref(null)
const caCutoffRequests = ref([])
const caCutoffLoading = ref(false)
const caCutoffSearch = ref('')

// ===== SWAP STATE =====
const swapRequests = ref([])
const swapSortBy = ref('Newest')
const swapPagination = ref({ page: 1, rowsPerPage: 10 })
const swapLoading = ref(false)
const swapActionLoading = ref(null)
const selectedSwapRequest = ref(null)
const showSwapViewDialog = ref(false)

// ===== COMPUTED STATS =====
const leaveStats = computed(() => ({
  total: leaveList.value.length,
  pending: leaveList.value.filter((r) => r.status === 'pending').length,
  approved: leaveList.value.filter((r) => r.status === 'approved').length,
  rejected: leaveList.value.filter((r) => r.status === 'rejected').length,
}))

const overtimeStats = computed(() => ({
  total: overtimeSummary.value.reduce((sum, log) => sum + (log.overtime_total_count || 0), 0),
  pending: overtimeSummary.value.reduce(
    (sum, log) => sum + ((log.overtime_total_count || 0) - (log.overtime_approved_count || 0)),
    0,
  ),
  approved: overtimeSummary.value.reduce((sum, log) => sum + (log.overtime_approved_count || 0), 0),
  rejected: 0,
}))

const swapStatistics = computed(() => ({
  total: swapRequests.value.length,
  pending: swapRequests.value.filter(
    (r) => r.status === 'pending' || r.status === 'to_employee_approved',
  ).length,
  approved: swapRequests.value.filter((r) => r.status === 'approved').length,
  rejected: swapRequests.value.filter((r) => r.status === 'rejected').length,
}))

// ===== QUEUE RAIL =====
const queues = computed(() => [
  { key: 'leave', label: 'Leave', icon: 'event_note', pending: leaveStats.value.pending },
  { key: 'overtime', label: 'Overtime', icon: 'more_time', pending: overtimeStats.value.pending },
  {
    key: 'cash_advance',
    label: 'Cash Advance',
    icon: 'account_balance_wallet',
    pending: caStatistics.value.pending,
  },
  { key: 'swap', label: 'Swap', icon: 'swap_horiz', pending: swapStatistics.value.pending },
])

const totalPending = computed(() =>
  queues.value.reduce((sum, queue) => sum + (queue.pending || 0), 0),
)

const pendingSummary = computed(() => {
  const waiting = totalPending.value
  if (!waiting) return 'Every queue is clear'
  return `${waiting} awaiting your decision`
})

// ===== "UPDATED x ago" =====
// `nowTick` re-evaluates the label on a timer; without it the relative time
// would freeze at whatever it read when the data last arrived.
const lastUpdated = ref(null)
const nowTick = ref(Date.now())
let tickTimer = null

const markUpdated = () => {
  lastUpdated.value = Date.now()
  nowTick.value = Date.now()
}

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return 'just now'
  const seconds = Math.max(0, Math.round((nowTick.value - lastUpdated.value) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(lastUpdated.value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
})

// ===== FILTERED LISTS =====
const filteredLeaveRequests = computed(() => {
  let filtered = [...leaveList.value]
  if (statusFilter.value && statusFilter.value !== 'all' && statusFilter.value !== null) {
    filtered = filtered.filter((r) => r.status === statusFilter.value)
  }
  if ((searchTerm.value || '').trim()) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.employeeName?.toLowerCase().includes(search) ||
        (r.reason && r.reason.toLowerCase().includes(search)),
    )
  }
  return filtered
})

const filteredCaRequests = computed(() => {
  let list = [...caRequests.value]
  if (caFilterStatus.value) {
    list = list.filter((r) => r.status === caFilterStatus.value)
  }
  if (searchTerm.value) {
    const searchLower = searchTerm.value.toLowerCase()
    list = list.filter(
      (r) =>
        (r.employee_name || '').toLowerCase().includes(searchLower) ||
        String(r.id).includes(searchLower),
    )
  }
  return list
})

const filteredSwapRequests = computed(() => {
  let filtered = [...swapRequests.value]
  if ((searchTerm.value || '').trim()) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        (r.requested_by_name || '').toLowerCase().includes(search) ||
        (r.from_employee_name || '').toLowerCase().includes(search) ||
        (r.to_employee_name || '').toLowerCase().includes(search),
    )
  }
  if (swapSortBy.value === 'Newest') {
    filtered.sort((a, b) => new Date(b.requested_at || 0) - new Date(a.requested_at || 0))
  } else if (swapSortBy.value === 'Oldest') {
    filtered.sort((a, b) => new Date(a.requested_at || 0) - new Date(b.requested_at || 0))
  } else if (swapSortBy.value === 'Status') {
    filtered.sort((a, b) => (a.status || '').localeCompare(b.status || ''))
  }
  const page = swapPagination.value.page
  const rowsPerPage = swapPagination.value.rowsPerPage
  const start = (page - 1) * rowsPerPage
  return filtered.slice(start, start + rowsPerPage)
})

const refreshLoading = computed(() => {
  if (activeTab.value === 'swap') return swapLoading.value
  if (activeTab.value === 'overtime') return overtimeLoading.value
  return loading.value
})

const actionableOvertimeIds = computed(() => {
  return filteredOvertimeRequests.value
    .filter((r) => ['requested', 'qualified'].includes(r.status))
    .map((r) => r.id)
})

const allOvertimeSelected = computed(() => {
  const actionable = actionableOvertimeIds.value
  return actionable.length > 0 && actionable.every((id) => selectedOvertimeIds.value.has(id))
})

const selectDisbursementLog = (id) => {
  const isSame = selectedDisbursementLog.value === id
  selectedDisbursementLog.value = isSame ? null : id
  clearOvertimeSelection()
  if (!isSame && id) {
    fetchOvertimeRequests(id)
  }
}

const getPeriodFromName = (name) => {
  if (!name) return ''
  const match = name.match(/(\d{4}-\d{2}-\d{2}\s*-\s*\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

const getBaseName = (name) => {
  if (!name) return '\u2014'
  return name.replace(/\s*\|?\s*\d{4}-\d{2}-\d{2}\s*-\s*\d{4}-\d{2}-\d{2}\s*$/, '').trim()
}

// Scheduled and actual times share one column so the grid fits without
// horizontal cut-off; full detail is in RequestOvertimeDetailModal.
const otColumns = [
  { name: 'select', label: '', field: '', align: 'center' },
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'schedule', label: 'Scheduled / actual', field: 'schedule', align: 'left' },
  { name: 'dates', label: 'Date', field: 'date', align: 'left' },
  { name: 'hours', label: 'Hours', field: 'hours', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
]

const overtimeStatusPill = (status) => {
  if (status === 'requested' || status === 'pending') return 'status-pill--pending'
  if (status === 'qualified') return 'status-pill--info'
  if (status === 'approved') return 'status-pill--approved'
  if (status === 'rejected') return 'status-pill--rejected'
  return 'status-pill--default'
}

// ===== CASH ADVANCE HELPERS =====
const extractEmployeeName = (request) => {
  if (request.employee_name) return request.employee_name
  if (request.employee) {
    if (typeof request.employee === 'object') {
      if (request.employee.full_name) return request.employee.full_name
      if (request.employee.name) return request.employee.name
      if (request.employee.first_name && request.employee.last_name)
        return `${request.employee.first_name} ${request.employee.last_name}`
      if (request.employee.first_name) return request.employee.first_name
    }
  }
  if (request.user && typeof request.user === 'object') {
    if (request.user.full_name) return request.user.full_name
    if (request.user.first_name) return request.user.first_name
  }
  if (request.employee_id) return `Employee #${request.employee_id}`
  return 'Unknown Employee'
}

const updateCaStats = (sourceList = caRequests.value) => {
  caStatistics.value.total = sourceList.length
  caStatistics.value.pending = sourceList.filter((r) => r.status === 'pending').length
  caStatistics.value.approved = sourceList.filter((r) => r.status === 'approved').length
  caStatistics.value.rejected = sourceList.filter((r) => r.status === 'rejected').length
}

// ===== API: LEAVE =====
const fetchLeaveRequests = async () => {
  loading.value = true
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const res = await api.get('/attendance/leave-list/', {
      params: { company_id: companyId },
    })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    leaveList.value = data.map((item) => ({
      id: item.id,
      employeeName: item.employee_name,
      company: item.company_name || '',
      type: item.leave_type_name || 'Leave',
      status: item.status?.toLowerCase(),
      startDate: item.start_date,
      endDate: item.end_date,
      duration:
        item.total_days != null
          ? `${item.total_days} day(s)`
          : item.hours
            ? `${item.hours}h`
            : 'N/A',
      reason: item.reason,
      leavePicture: item.leave_picture || null,
      submittedDate: item.submitted_at,
      approvedByName: item.approved_by_name || '',
      approvedAt: item.approved_at || '',
    }))
  } catch (e) {
    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to fetch leave requests.'
    $q.notify({ type: 'negative', message: errorMessage, icon: 'error', position: 'top' })
  } finally {
    loading.value = false
  }
}

// ===== API: OVERTIME =====
const fetchOvertimeCategories = async () => {
  try {
    const companyId = selectedCompany.value
    const res = await api.get('/payroll/overtime-categories/', {
      params: companyId ? { company: companyId } : {},
    })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    overtimeCategories.value = data.filter((c) => c.is_active)
  } catch {
    /* non-critical, fail silently */
  }
}

const fetchOvertimeSummary = async () => {
  try {
    const companyId = selectedCompany.value
    if (!companyId) return
    const res = await api.get('/payroll/admin/disbursement-logs/overtime-summary/', {
      params: { company: companyId },
    })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    overtimeSummary.value = data
  } catch (e) {
    console.error('Failed to fetch overtime summary', e)
  }
}

const fetchOvertimeRequests = async (logId) => {
  overtimeLoading.value = true
  overtimeEditableHours.value = {}
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const params = { company: companyId }
    if (logId) {
      params.disbursement_log_id = logId
    }
    const res = await api.get('/payroll/overtime-list/', { params })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    overtimeRequests.value = data.map((item) => ({
      id: item.id,
      employeeCompany: item.employee_company,
      employeeName:
        typeof item.employee === 'object'
          ? item.employee?.full_name || item.employee?.name || 'Unknown'
          : item.employee || 'Unknown',
      category: item.category,
      categoryName: item.category_name || 'Uncategorized',
      date: item.date,
      hours: item.hours ?? item.qualified_hours ?? '-',
      qualifiedHours: item.qualified_hours,
      approvedHours: item.approved_hours,
      attendances: item.attendances || [],
      schedules: item.schedules || [],
      status: item.status === 'REQUESTED' ? 'requested' : item.status?.toLowerCase(),
      approvedByName: item.approved_by_name || 'Pending',
      convertedToCto: item.converted_to_cto || false,
      reason: item.reason,
      submittedDate: item.submitted_at,
    }))
  } catch (e) {
    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to fetch overtime requests.'
    $q.notify({ type: 'negative', message: errorMessage, icon: 'error', position: 'top' })
  } finally {
    overtimeLoading.value = false
  }
}

const openOvertimeDetail = (row) => {
  selectedOvertimeRow.value = row
  showOvertimeDetail.value = true
}

const approveOvertimeSingle = async (row) => {
  overtimeSubmitting.value.add(row.id)
  try {
    const hours = overtimeEditableHours.value[row.id] ?? row.hours
    await api.patch(`/payroll/overtime-approve/${row.id}/`, {
      approved_hours: String(hours),
      category: row.category ?? 0,
      reason: '',
      status: 'approved',
    })
    $q.notify({
      type: 'positive',
      message: 'Overtime approved successfully',
      icon: 'check_circle',
      position: 'top',
    })
    clearOvertimeSelection()
    await fetchOvertimeRequests(selectedDisbursementLog.value)
    await fetchOvertimeSummary()
  } catch (e) {
    console.log('Overtime approve error:', JSON.stringify(e.response?.data, null, 2))
    const msg =
      e.response?.data?.message ||
      e.response?.data?.non_field_errors?.[0] ||
      e.response?.data?.detail ||
      e.message ||
      'Failed to approve overtime'
    $q.notify({ type: 'negative', message: msg, icon: 'error', position: 'top' })
  } finally {
    overtimeSubmitting.value.delete(row.id)
  }
}

const rejectOvertimeSingle = async (row) => {
  overtimeSubmitting.value.add(row.id)
  try {
    const hours = overtimeEditableHours.value[row.id] ?? row.hours
    await api.patch(`/payroll/overtime-approve/${row.id}/`, {
      approved_hours: String(hours),
      category: row.category ?? 0,
      reason: '',
      status: 'rejected',
    })
    $q.notify({
      type: 'positive',
      message: 'Overtime rejected',
      icon: 'cancel',
      position: 'top',
    })
    clearOvertimeSelection()
    await fetchOvertimeRequests(selectedDisbursementLog.value)
    await fetchOvertimeSummary()
  } catch (e) {
    console.log('Overtime reject error:', JSON.stringify(e.response?.data, null, 2))
    const msg =
      e.response?.data?.message ||
      e.response?.data?.non_field_errors?.[0] ||
      e.response?.data?.detail ||
      e.message ||
      'Failed to reject overtime'
    $q.notify({ type: 'negative', message: msg, icon: 'error', position: 'top' })
  } finally {
    overtimeSubmitting.value.delete(row.id)
  }
}

const toggleOvertimeSelection = (id) => {
  const newSet = new Set(selectedOvertimeIds.value)
  if (newSet.has(id)) newSet.delete(id)
  else newSet.add(id)
  selectedOvertimeIds.value = newSet
}

const toggleSelectAllOvertime = () => {
  if (allOvertimeSelected.value) {
    selectedOvertimeIds.value = new Set()
  } else {
    selectedOvertimeIds.value = new Set(actionableOvertimeIds.value)
  }
}

const clearOvertimeSelection = () => {
  selectedOvertimeIds.value = new Set()
}

// ===== OVERTIME ADVANCE =====
const openOvertimeAdvanceModal = async () => {
  overtimeAdvanceEmployeeOptions.value = []
  await fetchOvertimeAdvanceEmployees()
  showOvertimeAdvanceModal.value = true
}

const fetchOvertimeAdvanceEmployees = async () => {
  try {
    await fetchEmployees({ force: true })
    overtimeAdvanceEmployeeOptions.value = employees.value.map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
  } catch {
    /* silent */
  }
}

const filterOvertimeAdvanceEmployees = (val) => {
  if (!val || val.trim() === '') {
    overtimeAdvanceEmployeeOptions.value = employees.value.map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
    return
  }
  const search = val.toLowerCase()
  overtimeAdvanceEmployeeOptions.value = employees.value
    .filter((e) => {
      const name =
        e.user?.full_name || `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim()
      return name.toLowerCase().includes(search)
    })
    .map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
}

const submitOvertimeAdvance = async (payload) => {
  overtimeAdvanceSubmitting.value = true
  const companyId = selectedCompany.value
  if (!companyId) {
    $q.notify({ type: 'negative', message: 'No company selected', icon: 'error', position: 'top' })
    overtimeAdvanceSubmitting.value = false
    return
  }
  try {
    const body = {
      employee_ids: payload.employee_ids,
      category: payload.category,
      date: payload.date,
      reason: payload.reason,
    }
    if (payload.limit_hours) {
      body.limit_hours = payload.limit_hours
    }
    await api.post(`/attendance/overtime/admin/${companyId}/`, body)
    $q.notify({
      type: 'positive',
      message: 'Overtime advance created successfully',
      icon: 'check_circle',
      position: 'top',
    })
    showOvertimeAdvanceModal.value = false
    if (selectedDisbursementLog.value) {
      await fetchOvertimeRequests(selectedDisbursementLog.value)
    }
    await fetchOvertimeSummary()
  } catch (e) {
    const msg =
      e.response?.data?.message ||
      e.response?.data?.non_field_errors?.[0] ||
      e.message ||
      'Failed to create overtime advance'
    $q.notify({ type: 'negative', message: msg, icon: 'error', position: 'top' })
  } finally {
    overtimeAdvanceSubmitting.value = false
  }
}

// ===== APPLY LEAVE =====
const openApplyLeaveModal = async () => {
  applyLeaveEmployeeOptions.value = []
  applyLeaveTypes.value = []
  try {
    await fetchEmployees({ force: true })
    applyLeaveEmployeeOptions.value = employees.value.map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
    const companyId = selectedCompany.value
    if (companyId) {
      const res = await api.get('/attendance/leave-types/', {
        params: { company: companyId },
      })
      const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.results || []
      applyLeaveTypes.value = data
    }
  } catch {
    /* silent */
  }
  showApplyLeaveModal.value = true
}

const filterApplyLeaveEmployees = (val) => {
  if (!val || val.trim() === '') {
    applyLeaveEmployeeOptions.value = employees.value.map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
    return
  }
  const search = val.toLowerCase()
  applyLeaveEmployeeOptions.value = employees.value
    .filter((e) => {
      const name =
        e.user?.full_name || `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim()
      return name.toLowerCase().includes(search)
    })
    .map((e) => ({
      id: e.id,
      name:
        e.user?.full_name ||
        `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() ||
        'Unknown',
    }))
}

const submitApplyLeave = async (payload) => {
  applyLeaveSubmitting.value = true
  try {
    await api.post('/attendance/leave/apply-for-employee/', {
      ...payload,
      status: 'approved',
    })
    $q.notify({
      type: 'positive',
      message: 'Leave assigned successfully',
      icon: 'check_circle',
      position: 'top',
    })
    showApplyLeaveModal.value = false
    await fetchLeaveRequests()
  } catch (e) {
    const msg =
      e.response?.data?.detail ||
      e.response?.data?.message ||
      e.response?.data?.non_field_errors?.[0] ||
      e.message ||
      'Failed to assign leave'
    $q.notify({ type: 'negative', message: msg, icon: 'error', position: 'top' })
  } finally {
    applyLeaveSubmitting.value = false
  }
}

const bulkApproveOvertime = async () => {
  const ids = Array.from(selectedOvertimeIds.value)
  $q.dialog({
    title: 'Bulk Approve',
    message: `Approve ${ids.length} overtime request(s)?`,
    ok: { label: 'Approve', color: 'positive', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    overtimeSubmitting.value = new Set(ids)
    try {
      for (const id of ids) {
        const row = overtimeRequests.value.find((r) => r.id === id)
        const hours = overtimeEditableHours.value[id] ?? row?.hours
        await api.patch(`/payroll/overtime-approve/${id}/`, {
          approved_hours: String(hours),
          category: row?.category ?? 0,
          reason: '',
          status: 'approved',
        })
      }
      $q.notify({
        type: 'positive',
        message: `${ids.length} overtime request(s) approved`,
        icon: 'check_circle',
        position: 'top',
      })
      clearOvertimeSelection()
      await fetchOvertimeRequests(selectedDisbursementLog.value)
      await fetchOvertimeSummary()
    } catch (e) {
      console.log('Overtime bulk approve error:', JSON.stringify(e.response?.data, null, 2))
      const msg =
        e.response?.data?.message ||
        e.response?.data?.non_field_errors?.[0] ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to bulk approve'
      $q.notify({ type: 'negative', message: msg, icon: 'error', position: 'top' })
    } finally {
      overtimeSubmitting.value = new Set()
    }
  })
}

const bulkRejectOvertime = async () => {
  const ids = Array.from(selectedOvertimeIds.value)
  $q.dialog({
    title: 'Bulk Reject',
    message: `Reject ${ids.length} overtime request(s)?`,
    ok: { label: 'Reject', color: 'negative', unelevated: true },
    cancel: { label: 'Cancel', flat: true },
  }).onOk(async () => {
    overtimeSubmitting.value = new Set(ids)
    try {
      for (const id of ids) {
        const row = overtimeRequests.value.find((r) => r.id === id)
        const hours = overtimeEditableHours.value[id] ?? row?.hours
        await api.patch(`/payroll/overtime-approve/${id}/`, {
          approved_hours: String(hours),
          category: row?.category ?? 0,
          reason: '',
          status: 'rejected',
        })
      }
      $q.notify({
        type: 'positive',
        message: `${ids.length} overtime request(s) rejected`,
        icon: 'cancel',
        position: 'top',
      })
      clearOvertimeSelection()
      await fetchOvertimeRequests(selectedDisbursementLog.value)
      await fetchOvertimeSummary()
    } catch (e) {
      console.log('Overtime bulk reject error:', JSON.stringify(e.response?.data, null, 2))
      const msg =
        e.response?.data?.message ||
        e.response?.data?.non_field_errors?.[0] ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to bulk reject'
      $q.notify({ type: 'negative', message: msg, icon: 'error', position: 'top' })
    } finally {
      overtimeSubmitting.value = new Set()
    }
  })
}

const filteredOvertimeRequests = computed(() => {
  let filtered = [...overtimeRequests.value]
  if (overtimeStatusFilter.value && overtimeStatusFilter.value !== 'all') {
    filtered = filtered.filter((r) => r.status === overtimeStatusFilter.value)
  }
  if ((overtimeSearch.value || '').trim()) {
    const search = overtimeSearch.value.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.employeeName?.toLowerCase().includes(search) ||
        (r.reason && r.reason.toLowerCase().includes(search)),
    )
  }
  return filtered
})

const overtimeNarrowed = computed(
  () => !!(overtimeSearch.value || '').trim() || overtimeStatusFilter.value !== 'all',
)

// ===== LEAVE: APPROVE / REJECT =====
const approveRequest = async (request) => {
  try {
    actionLoading.value = `approve-${request.id}`
    await api.patch(`/attendance/leave-approval/${request.id}/`, { status: 'approved' })
    const index = leaveList.value.findIndex((r) => r.id === request.id)
    if (index !== -1) leaveList.value[index].status = 'approved'
    $q.notify({
      type: 'positive',
      message: 'Leave request approved successfully',
      icon: 'check_circle',
      position: 'top',
    })
    if (showLeaveDetails.value) showLeaveDetails.value = false
  } catch (e) {
    if (e.response?.status === 500) {
      const index = leaveList.value.findIndex((r) => r.id === request.id)
      if (index !== -1) leaveList.value[index].status = 'approved'
      $q.notify({
        type: 'positive',
        message: 'Leave request approved successfully',
        icon: 'check_circle',
        position: 'top',
      })
      if (showLeaveDetails.value) showLeaveDetails.value = false
      return
    }
    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to approve request.'
    $q.notify({ type: 'negative', message: errorMessage, icon: 'error', position: 'top' })
  } finally {
    actionLoading.value = null
  }
}

const rejectRequest = async (request) => {
  try {
    actionLoading.value = `reject-${request.id}`
    await api.patch(`/attendance/leave-approval/${request.id}/`, { status: 'rejected' })
    const index = leaveList.value.findIndex((r) => r.id === request.id)
    if (index !== -1) leaveList.value[index].status = 'rejected'
    $q.notify({
      type: 'warning',
      message: 'Leave request rejected',
      icon: 'cancel',
      position: 'top',
    })
    if (showLeaveDetails.value) showLeaveDetails.value = false
  } catch (e) {
    if (e.response?.status === 500) {
      const index = leaveList.value.findIndex((r) => r.id === request.id)
      if (index !== -1) leaveList.value[index].status = 'rejected'
      $q.notify({
        type: 'warning',
        message: 'Leave request rejected',
        icon: 'cancel',
        position: 'top',
      })
      if (showLeaveDetails.value) showLeaveDetails.value = false
      return
    }
    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to reject request.'
    $q.notify({ type: 'negative', message: errorMessage, icon: 'error', position: 'top' })
  } finally {
    actionLoading.value = null
  }
}

const openLeaveDetails = (request) => {
  selectedLeaveRequest.value = request
  showLeaveDetails.value = true
}

// ===== API: CASH ADVANCE =====
const fetchCaRequests = async () => {
  loading.value = true
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const res = await api.get(`/cash_advance/admin/company/${companyId}/requests/`)
    let data = Array.isArray(res.data)
      ? res.data
      : res.data?.data?.requests || res.data?.requests || res.data?.results || []
    caRequests.value = data.map((req) => ({
      ...req,
      employee_name: req.employee_name || extractEmployeeName(req),
    }))
    updateCaStats(caRequests.value)
  } catch (err) {
    const errorMessages = {
      401: 'Unauthorized. Please log in again.',
      403: 'Access forbidden.',
      404: 'Endpoint not found.',
    }
    const message =
      errorMessages[err.response?.status] ||
      err.response?.data?.detail ||
      err.response?.data?.message ||
      `Failed to fetch requests: ${err.message}`
    $q.notify({ type: 'negative', message, position: 'top', timeout: 5000 })
  } finally {
    loading.value = false
  }
}

const fetchCaDisbursementLogs = async () => {
  loading.value = true
  try {
    const res = await api.get('/cash_advance/admin/disbursement-logs/')
    caDisbursementLogs.value = Array.isArray(res.data) ? res.data : res.data.results || []
  } catch (err) {
    console.error('Failed to fetch CA disbursement logs', err)
  } finally {
    loading.value = false
  }
}

const fetchCaCutoffRequests = async (logId) => {
  caCutoffLoading.value = true
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const params = { log_id: logId }
    const res = await api.get(`/cash_advance/admin/company/${companyId}/requests/`, { params })
    let data = Array.isArray(res.data)
      ? res.data
      : res.data?.data?.requests || res.data?.requests || res.data?.results || []
    caCutoffRequests.value = data.map((req) => ({
      ...req,
      employee_name: req.employee_name || extractEmployeeName(req),
    }))
    updateCaStats(caCutoffRequests.value)
  } catch (err) {
    const errorMessages = {
      401: 'Unauthorized. Please log in again.',
      403: 'Access forbidden.',
      404: 'Endpoint not found.',
    }
    const message =
      errorMessages[err.response?.status] ||
      err.response?.data?.detail ||
      err.response?.data?.message ||
      `Failed to fetch cutoff requests: ${err.message}`
    $q.notify({ type: 'negative', message, position: 'top', timeout: 5000 })
  } finally {
    caCutoffLoading.value = false
  }
}

const submitCaApproval = async () => {
  try {
    caSubmitting.value = true
    const requestId = selectedCaRequest.value.id
    if (!requestId) throw new Error('No valid ID found for this request')
    const payload = {
      status: caApprovalData.value.status,
      remarks: caApprovalData.value.remarks || '',
    }
    await api.patch(`/cash_advance/admin/cash-advances/${requestId}/action/`, payload)
    caApprovalModal.value = false
    selectedCaRequest.value = null
    $q.notify({ type: 'positive', message: 'Request updated successfully!', position: 'top' })
    if (caViewMode.value === 'cutoff' && selectedCaDisbursementLog.value) {
      await fetchCaCutoffRequests(selectedCaDisbursementLog.value)
    } else {
      await fetchCaRequests()
    }
  } catch (err) {
    if (err.response?.status === 500) {
      caApprovalModal.value = false
      selectedCaRequest.value = null
      $q.notify({ type: 'positive', message: 'Request updated successfully!', position: 'top' })
      if (caViewMode.value === 'cutoff' && selectedCaDisbursementLog.value) {
        await fetchCaCutoffRequests(selectedCaDisbursementLog.value)
      } else {
        await fetchCaRequests()
      }
      return
    }
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Failed to update request'
    $q.notify({ type: 'negative', message, position: 'top', timeout: 5000 })
  } finally {
    caSubmitting.value = false
  }
}

const openCaApprovalModal = (row) => {
  selectedCaRequest.value = row
  caApprovalData.value = { status: 'approved', remarks: '' }
  caApprovalModal.value = true
}

const viewCaRequest = (row) => {
  selectedCaRequest.value = row
  caViewDialog.value = true
}

const selectCaDisbursementLog = (id) => {
  const isSame = selectedCaDisbursementLog.value === id
  selectedCaDisbursementLog.value = isSame ? null : id
  caCutoffSearch.value = ''
  if (!isSame && id) {
    fetchCaCutoffRequests(id)
  } else {
    caCutoffRequests.value = []
    updateCaStats(caRequests.value)
  }
}

// ===== API: SWAP REQUESTS =====
const fetchSwapRequests = async () => {
  swapLoading.value = true
  try {
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const res = await api.get('/organization/swap-requests/', {
      params: { company: companyId },
    })
    const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data?.results ?? [])
    swapRequests.value = data
  } catch (e) {
    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to fetch swap requests.'
    $q.notify({ type: 'negative', message: errorMessage, icon: 'error', position: 'top' })
  } finally {
    swapLoading.value = false
  }
}

const approveSwapRequest = async (request) => {
  if (!request.to_employee_approved) {
    $q.notify({
      type: 'warning',
      message: 'Employee has not yet approved the swap',
      icon: 'warning',
      position: 'top',
    })
    return
  }
  swapActionLoading.value = `approve-${request.id}`
  try {
    await api.patch(`/organization/swap-requests/${request.id}/`, {
      status: 'approved',
      remarks: '',
    })
    const index = swapRequests.value.findIndex((r) => r.id === request.id)
    if (index !== -1) swapRequests.value[index].status = 'approved'
    $q.notify({
      type: 'positive',
      message: 'Swap request approved successfully',
      icon: 'check_circle',
      position: 'top',
    })
    if (showSwapViewDialog.value) showSwapViewDialog.value = false
    await fetchSwapRequests()
  } catch (e) {
    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to approve swap request.'
    $q.notify({ type: 'negative', message: errorMessage, icon: 'error', position: 'top' })
  } finally {
    swapActionLoading.value = null
  }
}

const rejectSwapRequest = async (request) => {
  if (!request.to_employee_approved) {
    $q.notify({
      type: 'warning',
      message: 'Employee has not yet approved the swap',
      icon: 'warning',
      position: 'top',
    })
    return
  }
  swapActionLoading.value = `reject-${request.id}`
  try {
    await api.patch(`/organization/swap-requests/${request.id}/`, {
      status: 'rejected',
      remarks: '',
    })
    const index = swapRequests.value.findIndex((r) => r.id === request.id)
    if (index !== -1) swapRequests.value[index].status = 'rejected'
    $q.notify({
      type: 'warning',
      message: 'Swap request rejected',
      icon: 'cancel',
      position: 'top',
    })
    if (showSwapViewDialog.value) showSwapViewDialog.value = false
    await fetchSwapRequests()
  } catch (e) {
    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to reject swap request.'
    $q.notify({ type: 'negative', message: errorMessage, icon: 'error', position: 'top' })
  } finally {
    swapActionLoading.value = null
  }
}

const viewSwapRequest = (request) => {
  selectedSwapRequest.value = request
  showSwapViewDialog.value = true
}

// ===== REFRESH HANDLER =====
const handleRefresh = () => {
  markUpdated()
  if (activeTab.value === 'cash_advance') {
    if (caViewMode.value === 'cutoff') {
      fetchCaDisbursementLogs()
      if (selectedCaDisbursementLog.value) {
        fetchCaCutoffRequests(selectedCaDisbursementLog.value)
      }
    } else {
      fetchCaRequests()
    }
  } else if (activeTab.value === 'overtime') {
    fetchOvertimeSummary()
    fetchOvertimeCategories()
    if (selectedDisbursementLog.value) {
      fetchOvertimeRequests(selectedDisbursementLog.value)
    }
  } else if (activeTab.value === 'swap') {
    fetchSwapRequests()
  } else {
    fetchLeaveRequests()
  }
}

// Fetch data when tab changes
watch(activeTab, (newTab) => {
  statusFilter.value = 'all'
  if (newTab === 'cash_advance') {
    if (caViewMode.value === 'cutoff') {
      fetchCaDisbursementLogs()
    } else {
      fetchCaRequests()
    }
  } else if (newTab === 'overtime') {
    fetchOvertimeSummary()
    fetchOvertimeCategories()
  } else if (newTab === 'swap') {
    fetchSwapRequests()
  } else {
    fetchLeaveRequests()
  }
})

watch(caViewMode, (mode) => {
  if (activeTab.value === 'cash_advance') {
    if (mode === 'cutoff') {
      fetchCaDisbursementLogs()
    } else {
      fetchCaRequests()
    }
  }
})

// Re-fetch all data when selected company changes
watch(selectedCompany, () => {
  markUpdated()
  selectedDisbursementLog.value = null
  selectedCaDisbursementLog.value = null
  caCutoffRequests.value = []
  fetchLeaveRequests()
  fetchOvertimeSummary()
  fetchOvertimeCategories()
  fetchCaRequests()
  fetchCaDisbursementLogs()
  fetchSwapRequests()
})

// Sync selectedCompany with localStorage
const syncCompany = () => {
  const stored = getCompanyId()
  if (stored !== selectedCompany.value) {
    selectedCompany.value = stored
  }
}
window.addEventListener('storage', syncCompany)

onMounted(() => {
  markUpdated()
  fetchLeaveRequests()
  fetchOvertimeSummary()
  fetchOvertimeCategories()
  fetchCaRequests()
  fetchCaDisbursementLogs()
  fetchSwapRequests()
  tickTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  window.removeEventListener('storage', syncCompany)
  if (tickTimer) clearInterval(tickTimer)
})
</script>

<style scoped src="../components/pages/Request/requestGrid.css"></style>

<style scoped>
/* ===========================================================================
   Requests page chrome.

   Everything here reads from the design system in src/css/dashboard.scss — the
   same `--dash-*` neutral ramp, radii, shadows and type scale the tables inside
   this page already use through requestGrid.css. The page previously carried
   its own slate palette (#102335, #e8ecf0, #f8fafc), its own radii (14–16px)
   and its own micro-label convention (10px uppercase at 0.06em tracking), so
   the frame around the queues read as a different product from the queues
   themselves.
   =========================================================================== */

.requests-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ===== Page header =====
   Matched to Contributions and Attendance: a 22px/600 title over a single meta
   line, so the three pages share one masthead rather than three. */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.page-identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.page-heading {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.025em;
  color: var(--dash-ink);
}
.page-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 7px;
  margin-top: 3px;
  font-size: 13px;
  color: var(--dash-ink-3);
}
.page-meta-item {
  white-space: nowrap;
}
.page-meta-item.waiting {
  color: var(--dash-warn);
  font-weight: 500;
}
.page-meta-dot {
  color: var(--dash-n-300);
}
/* Small live indicator on the freshness stamp, so "Updated 2m ago" reads as a
   running clock rather than a static string. */
.page-meta-live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dash-good-mark);
  flex-shrink: 0;
  animation: live-pulse 2.4s ease-in-out infinite;
}
@keyframes live-pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(23, 178, 106, 0.3);
  }
  50% {
    opacity: 0.7;
    box-shadow: 0 0 0 4px rgba(23, 178, 106, 0);
  }
}

/* Every header control stands 36px tall, so the refresh button, the primary
   action and the view toggle centre on each other by construction instead of
   by a per-item nudge. */
.page-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.action-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background: var(--dash-line);
  flex-shrink: 0;
}
.refresh-btn {
  height: 36px;
  width: 36px;
  min-height: 36px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-4) !important;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.refresh-btn:hover {
  background: var(--dash-n-100) !important;
  color: var(--dash-ink) !important;
}
/* Flat, not floating. The previous button lifted 1px and cast a 22px glow on
   hover, which reads as consumer software beside the rest of the dashboard;
   depth here is one hairline-dark plate plus the system's smallest shadow. */
.primary-action-btn {
  height: 36px;
  min-height: 36px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand) !important;
  color: #ffffff !important;
  box-shadow: var(--dash-shadow-xs);
  transition: background var(--dash-fast) var(--dash-ease);
}
.primary-action-btn:hover {
  background: var(--dash-n-800) !important;
}

/* Segmented control: a recessed track carrying a raised white plate on the
   active segment, the same shape the Contributions view switcher uses. It
   replaced a solid navy pill, which made "which list am I looking at" the
   loudest element on the page. */
.view-toggle {
  padding: 3px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  background: var(--dash-n-100);
  box-shadow: none;
}
.view-toggle :deep(.q-btn) {
  height: 28px;
  min-height: 28px;
  padding: 0 11px;
  font-size: 12.5px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--dash-r-sm);
  background: transparent !important;
  color: var(--dash-ink-3) !important;
  box-shadow: none;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.view-toggle :deep(.q-btn .q-icon) {
  font-size: 15px;
  margin-right: 5px;
  color: var(--dash-ink-4);
}
.view-toggle :deep(.q-btn:hover:not(.q-btn--active)) {
  background: rgba(255, 255, 255, 0.6) !important;
  color: var(--dash-ink-2) !important;
}
.view-toggle :deep(.q-btn--active) {
  background: var(--dash-surface) !important;
  border-color: var(--dash-line);
  color: var(--dash-ink) !important;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs);
}
.view-toggle :deep(.q-btn--active .q-icon) {
  color: var(--dash-accent);
}

/* ===== Work surface =====
   One panel on the system's panel chrome: hairline edge, 12px radius, and the
   near-invisible shadow that keeps it flat against the canvas. */
.queue-content {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
  overflow: hidden;
}

/* ===== Tab bar =====
   Underline tabs riding the panel's top edge — an unambiguous "these are tabs"
   affordance, with the active queue's breakdown sharing the same band. */
/* Both halves stretch to the band's height: the tabs then anchor themselves to
   its bottom edge so the active indicator lands on the border, while the search
   and the stat chips centre inside the same height. Bottom-aligning the whole
   row instead left the chips sitting ~3px below the tab labels they read
   alongside. */
.tab-bar-row {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid var(--dash-line);
  background: var(--dash-surface);
  flex-wrap: wrap;
}
.tab-bar {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.tab-bar::-webkit-scrollbar {
  display: none;
}
.queue-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  /* -1px lets the indicator sit over the row's 1px border, so the active tab
     reads as connected to the panel below it. */
  margin-bottom: -1px;
  padding: 12px 12px 13px;
  background: transparent;
  border: none;
  border-radius: var(--dash-r-sm) var(--dash-r-sm) 0 0;
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--dash-fast) var(--dash-ease);
}
.queue-tab:hover {
  background: var(--dash-n-50);
}
/* Soft halo rather than a hard outline, which would fight the hairline borders
   it sits between. */
.queue-tab:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}
/* Rounded indicator that grows out from the centre on selection, rather than a
   hard border switching on. */
.queue-tab::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--dash-accent);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.22s var(--dash-ease);
}
.queue-tab.active::after {
  transform: scaleX(1);
}
/* No tile behind the icon — selection is carried by colour alone. */
.queue-tab-icon {
  color: var(--dash-ink-4);
  flex-shrink: 0;
  transition: color var(--dash-fast) var(--dash-ease);
}
.queue-tab:hover .queue-tab-icon {
  color: var(--dash-ink-2);
}
.queue-tab.active .queue-tab-icon {
  color: var(--dash-accent);
}
.queue-tab-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink-3);
  line-height: 1.3;
  transition: color var(--dash-fast) var(--dash-ease);
}
.queue-tab:hover .queue-tab-label {
  color: var(--dash-ink-2);
}
.queue-tab.active .queue-tab-label {
  color: var(--dash-ink);
  font-weight: 600;
}
/* Bordered rather than flat-filled, so the count holds its edge against both
   the white strip and the hover plate. */
.queue-tab-count {
  min-width: 19px;
  padding: 0 5px;
  border-radius: var(--dash-r-xs);
  background: var(--dash-warn-bg);
  border: 1px solid var(--dash-warn-line);
  color: var(--dash-warn);
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.tab-bar-aside {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  min-width: 0;
}
.tab-bar-search {
  flex: 0 1 240px;
}
.tab-bar-stats {
  flex-shrink: 0;
}

.panel-surface {
  background: var(--dash-surface);
}
.tab-panels {
  background: transparent;
}
.tab-panel-content {
  padding: 0;
}

/* ===== Overtime: payroll-run cards =====
   Each run is an expandable row of its own. It is a control, so its header
   takes a hover plate — but no shadow lift, which would promise a depth the
   panel underneath does not have. */
.overtime-summary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: var(--dash-pad-y) var(--dash-pad-x);
}
.overtime-summary-card {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--dash-fast) var(--dash-ease);
}
.overtime-summary-card:hover,
.overtime-summary-card.active {
  border-color: var(--dash-line-strong);
}
.summary-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid transparent;
  background: var(--dash-surface);
  transition:
    background var(--dash-fast) var(--dash-ease),
    border-color var(--dash-fast) var(--dash-ease);
}
.overtime-summary-card:hover .summary-card-header {
  background: var(--dash-hover);
}
.overtime-summary-card.active .summary-card-header {
  background: var(--dash-n-25);
  border-bottom-color: var(--dash-line);
}
.summary-card-name-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}
.summary-name-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}
.summary-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.summary-period {
  font-size: 12px;
  color: var(--dash-ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.summary-stat-cols {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}
.summary-stat-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 0 14px;
  border-right: 1px solid var(--dash-line);
}
.summary-stat-col:first-child {
  padding-left: 0;
}
.summary-stat-col:last-of-type {
  border-right: none;
  padding-right: 0;
}
/* Sentence case, not tracked-out small caps. Uppercase micro-labels are the
   clearest single tell of an older dashboard, and every other table in the app
   has already dropped them. */
.summary-stat-label {
  font-size: 12px;
  font-weight: 400;
  color: var(--dash-ink-3);
  white-space: nowrap;
}
.summary-stat-val {
  font-size: 14px;
  font-weight: 600;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.expand-icon {
  flex-shrink: 0;
  color: var(--dash-ink-4);
  transition: transform 0.24s var(--dash-ease);
}
.overtime-empty-state {
  padding: 8px 0 22px;
}

/* ===== Overtime: expanded run ===== */
.overtime-panel-wrapper {
  border-top: 1px solid var(--dash-line);
  background: var(--dash-n-25);
}
.overtime-panel {
  padding: 14px 16px 16px;
}
.overtime-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
}
.panel-count {
  padding: 0 6px;
  border-radius: var(--dash-r-xs);
  background: var(--dash-n-100);
  color: var(--dash-ink-3);
  font-size: 11px;
  font-weight: 600;
  line-height: 17px;
  font-variant-numeric: tabular-nums;
}
.overtime-table-container {
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  overflow: auto;
}
.overtime-grid {
  min-width: 790px;
}
.ot-cell-select {
  width: 40px;
}
.ot-cell-employee {
  width: 200px;
}
.ot-cell-time {
  width: 175px;
}
.ot-cell-date {
  width: 125px;
}
.ot-cell-hours {
  width: 120px;
}
.ot-cell-status {
  width: 120px;
}
.ot-cell-actions {
  width: 110px;
}
/* An acronym, so it keeps its capitals — but not the extra tracking and 700
   weight that turned it into a shout inside a 13px cell. */
.cto-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: var(--dash-r-xs);
  background: var(--dash-info-bg);
  border: 1px solid var(--dash-info-line);
  color: var(--dash-info);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 15px;
}
.hours-input {
  max-width: 84px;
}
.hours-input :deep(.q-field__control) {
  height: 30px;
  min-height: 30px;
  padding: 0 8px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-surface);
}
.hours-input :deep(.q-field__native) {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.hours-cell-content {
  display: flex;
  align-items: center;
  gap: 6px;
}
/* Selection is a state, not an outcome — an informational band, rather than
   the green "everything succeeded" bar this used to be. */
.bulk-actions-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 10px;
  background: var(--dash-info-bg);
  border: 1px solid var(--dash-info-line);
  border-radius: var(--dash-r-md);
  flex-wrap: wrap;
}
.bulk-count {
  margin-right: 2px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dash-info);
  font-variant-numeric: tabular-nums;
}
.bulk-actions-bar :deep(.q-btn) {
  height: 28px;
  min-height: 28px;
  padding: 0 10px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: var(--dash-r-sm);
}

/* ===== Responsive ===== */
@media (min-width: 1440px) {
  .page-heading {
    font-size: 24px;
  }
}

/* Laptop */
@media (max-width: 1279px) {
  .page-heading {
    font-size: 20px;
  }
  .queue-tab {
    gap: 7px;
    padding: 11px 10px 12px;
  }
  .summary-stat-col {
    padding: 0 11px;
  }
}

/* Tablet */
@media (max-width: 1023px) {
  .page-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .page-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .action-divider {
    display: none;
  }
  .tab-bar-row {
    align-items: stretch;
    flex-direction: column;
    gap: 0;
    padding: 0 12px;
  }
  .queue-tab {
    flex: 1 0 auto;
    justify-content: center;
  }
  .tab-bar-aside {
    padding: 0 0 10px;
  }
  .tab-bar-search {
    flex: 1 1 auto;
  }
  .summary-card-header {
    padding: 12px 14px;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .summary-card-header {
    flex-wrap: wrap;
    gap: 10px;
  }
  .summary-card-name-group {
    flex: 1 1 100%;
    min-width: 0;
  }
  .summary-stat-cols {
    flex: 1 1 auto;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .summary-stat-col {
    padding: 0 10px;
  }
  .overtime-panel {
    padding: 12px 12px 14px;
  }
  .overtime-panel-header {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 599px) {
  .page-heading {
    font-size: 19px;
  }
  .page-meta {
    font-size: 12px;
  }
  .queue-tab {
    padding: 11px 9px 12px;
  }
  /* Keep the icon and the pending count; the label is the first thing to go. */
  .queue-tab-label {
    display: none;
  }
  .overtime-summary-list {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .summary-card-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;
    gap: 10px;
  }
  .summary-card-name-group {
    width: 100%;
  }
  .summary-stat-cols {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .summary-stat-col:last-of-type {
    padding-right: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .queue-tab,
  .queue-tab::after,
  .expand-icon,
  .primary-action-btn,
  .summary-card-header {
    transition: none;
  }
  .live-dot {
    animation: none;
  }
}
</style>
