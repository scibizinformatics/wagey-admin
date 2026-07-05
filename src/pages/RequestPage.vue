<template>
  <PageShell>
    <div class="payroll-card">
      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tab-pills">
          <button
            :class="['tab-pill', { active: activeTab === 'leave' }]"
            @click="activeTab = 'leave'"
          >
            <q-icon name="event_note" class="tab-pill-icon" />
            <span>Leave</span>
            <span v-if="leaveStats.pending > 0" class="tab-badge">{{ leaveStats.pending }}</span>
          </button>
          <button
            :class="['tab-pill', { active: activeTab === 'overtime' }]"
            @click="activeTab = 'overtime'"
          >
            <q-icon name="more_time" class="tab-pill-icon" />
            <span>Overtime</span>
            <span v-if="overtimeStats.pending > 0" class="tab-badge">{{ overtimeStats.pending }}</span>
          </button>
          <button
            :class="['tab-pill', { active: activeTab === 'cash_advance' }]"
            @click="activeTab = 'cash_advance'"
          >
            <q-icon name="account_balance_wallet" class="tab-pill-icon" />
            <span>Cash Advance</span>
            <span v-if="caStatistics.pending > 0" class="tab-badge">{{ caStatistics.pending }}</span>
          </button>
        </div>
      </div>

      <!-- Header -->
      <div class="page-header">
        <div class="page-header-content">
          <h1 class="page-title">Requests</h1>
          <div class="page-header-actions">
            <q-btn
              round flat icon="refresh"
              class="refresh-btn"
              @click="handleRefresh"
              :loading="loading"
            >
              <q-tooltip>Refresh</q-tooltip>
            </q-btn>
            <q-input
              v-model="searchTerm"
              placeholder="Search requests..."
              class="header-search"
              dense outlined
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <RequestStatsCards
        :active-tab="activeTab"
        :leave-stats="leaveStats"
        :overtime-stats="overtimeStats"
        :ca-statistics="caStatistics"
      />

      <!-- Tab Panels -->
      <q-tab-panels v-model="activeTab" animated class="tab-panels">
        <q-tab-panel name="leave" class="tab-panel-content">
          <RequestLeaveTable
            :rows="filteredLeaveRequests"
            :loading="loading"
            :action-loading="actionLoading"
            :status-filter="statusFilter"
            @update:status-filter="statusFilter = $event"
            @view-details="openLeaveDetails"
            @approve="approveRequest"
            @reject="rejectRequest"
          />
        </q-tab-panel>

        <q-tab-panel name="overtime" class="tab-panel-content">
          <div class="payroll-card">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Payroll Run Overtime Summary</h2>
                <div class="table-info">{{ overtimeSummary.length }} runs</div>
              </div>
            </div>

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
                      :style="{ transform: selectedDisbursementLog === log.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }"
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
                      <span class="summary-stat-label">Pending</span>
                      <span class="summary-stat-val">{{ log.overtime_total_count - log.overtime_approved_count }}</span>
                    </div>
                  </div>
                </div>

                <!-- Expanded Panel with Overtime Requests Table -->
                <div v-if="selectedDisbursementLog === log.id" class="overtime-panel-wrapper" @click.stop>
                  <div class="overtime-panel">
                    <div class="overtime-panel-header">
                      <div class="panel-title">
                        <q-icon name="schedule" size="16px" color="primary" />
                        <span>Overtime Requests</span>
                        <span class="panel-count">{{ overtimeRequests.length }}</span>
                      </div>
                      <div class="panel-actions">
                        <q-input
                          v-model="overtimeSearch"
                          dense outlined
                          placeholder="Search employees..."
                          class="overtime-search-input"
                          clearable
                        >
                          <template v-slot:prepend>
                            <q-icon name="search" size="16px" />
                          </template>
                        </q-input>
                      </div>
                    </div>

                    <div v-if="overtimeLoading" class="overtime-panel-loading">
                      <q-spinner color="primary" size="20px" />
                      <span>Loading overtime requests...</span>
                    </div>

                    <div v-else-if="filteredOvertimeRequests.length === 0" class="overtime-panel-empty">
                      <q-icon name="search_off" size="48px" color="grey-4" />
                      <div class="empty-title">No overtime requests found</div>
                      <div class="empty-subtitle">Try adjusting your search or filters</div>
                    </div>

                    <div v-else>
                      <!-- Bulk Actions -->
                      <div v-if="selectedOvertimeIds.size > 0" class="bulk-actions-bar">
                        <span class="bulk-count">{{ selectedOvertimeIds.size }} selected</span>
                        <q-btn
                          unelevated dense no-caps
                          icon="check" color="positive"
                          label="Approve Selected"
                          :loading="overtimeSubmitting.size > 0"
                          @click="bulkApproveOvertime"
                        />
                        <q-btn flat dense label="Clear" @click="clearOvertimeSelection" />
                      </div>

                      <div class="overtime-table-container">
                      <q-table
                        :rows="filteredOvertimeRequests"
                        :columns="otColumns"
                        row-key="id"
                        flat
                        hide-pagination
                        :rows-per-page-options="[0]"
                        class="overtime-table"
                      >
                        <template v-slot:header="props">
                          <q-tr class="table-header-row" :props="props">
                            <q-th key="select" :props="props" class="table-header-cell" style="width: 48px">
                              <q-checkbox
                                :model-value="allOvertimeSelected"
                                @update:model-value="toggleSelectAllOvertime"
                                dense
                              />
                            </q-th>
                            <q-th key="employeeName" :props="props" class="table-header-cell">Employee</q-th>
                            <q-th key="schedule" :props="props" class="table-header-cell">Schedule</q-th>
                            <q-th key="attendance" :props="props" class="table-header-cell">Attendance</q-th>
                            <q-th key="dates" :props="props" class="table-header-cell">Date</q-th>
                            <q-th key="hours" :props="props" class="table-header-cell">Hours</q-th>
                            <q-th key="status" :props="props" class="table-header-cell">Status</q-th>
                            <q-th key="actions" :props="props" class="table-header-cell">Actions</q-th>
                          </q-tr>
                        </template>
                        <template v-slot:body="props">
                          <q-tr class="table-body-row" :props="props">
                            <q-td key="select" :props="props" class="table-body-cell" style="width: 48px; text-align: center;">
                              <q-checkbox
                                v-if="['pending', 'qualified'].includes(props.row.status)"
                                :model-value="selectedOvertimeIds.has(props.row.id)"
                                @update:model-value="toggleOvertimeSelection(props.row.id)"
                                dense
                              />
                            </q-td>
                            <q-td key="employeeName" :props="props" class="table-body-cell">
                              <div class="employee-info">
                                <q-avatar size="28px" color="primary" text-color="white">
                                  {{ props.row.employeeName ? props.row.employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?' }}
                                </q-avatar>
                                <span class="employee-name">{{ props.row.employeeName }}</span>
                              </div>
                            </q-td>
                            <q-td key="schedule" :props="props" class="table-body-cell">
                              <div class="time-cell">
                                <template v-if="props.row.schedules?.[0]">
                                  <span class="time-range">{{ props.row.schedules[0].actual_start }} - {{ props.row.schedules[0].actual_end }}</span>
                                </template>
                                <span v-else class="shimmer-empty">-</span>
                              </div>
                            </q-td>
                            <q-td key="attendance" :props="props" class="table-body-cell">
                              <div class="time-cell">
                                <template v-if="props.row.attendances?.[0]">
                                  <span class="time-range">{{ props.row.attendances[0].time_in }} - {{ props.row.attendances[0].time_out }}</span>
                                </template>
                                <span v-else class="shimmer-empty">-</span>
                              </div>
                            </q-td>
                            <q-td key="dates" :props="props" class="table-body-cell">
                              <div class="date-text">{{ props.row.date ? new Date(props.row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A' }}</div>
                            </q-td>
                            <q-td key="hours" :props="props" class="table-body-cell">
                              <div class="hours-cell-content">
                                <q-input
                                  v-if="['pending', 'qualified'].includes(props.row.status)"
                                  :model-value="overtimeEditableHours[props.row.id] ?? props.row.hours"
                                  @update:model-value="overtimeEditableHours[props.row.id] = $event"
                                  @click.stop
                                  dense outlined type="number" step="0.01"
                                  class="hours-input"
                                />
                                <span v-else class="hours-text">
                                  {{ props.row.hours === '-' ? '-' : props.row.hours + 'h' }}
                                </span>
                                <span v-if="props.row.convertedToCto" class="cto-badge">CTO</span>
                              </div>
                            </q-td>
                            <q-td key="status" :props="props" class="table-body-cell">
                              <div :class="['status-badge', `status-${props.row.status}`]">
                                {{ props.row.status ? props.row.status.charAt(0).toUpperCase() + props.row.status.slice(1) : 'N/A' }}
                              </div>
                            </q-td>
                            <q-td key="actions" :props="props" class="table-body-cell">
                              <div class="action-buttons">
                                <q-btn flat round icon="visibility" size="sm" class="action-btn view-btn" @click.stop="openOvertimeDetail(props.row)">
                                  <q-tooltip>View Details</q-tooltip>
                                </q-btn>
                                <q-btn
                                  v-if="['pending', 'qualified'].includes(props.row.status)"
                                  flat round icon="check" size="sm"
                                  class="action-btn approve-btn"
                                  @click.stop="approveOvertimeSingle(props.row)"
                                  :loading="overtimeSubmitting.has(props.row.id)"
                                >
                                  <q-tooltip>Approve</q-tooltip>
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

            <div v-else class="overtime-empty-state">
              <span class="text-grey-5">No payroll runs with overtime data found</span>
            </div>
          </div>
        </q-tab-panel>

        <q-tab-panel name="cash_advance" class="tab-panel-content">
          <RequestCashAdvanceTable
            :rows="filteredCaRequests"
            :loading="loading"
            :ca-filter-status="caFilterStatus"
            :ca-status-options="caStatusOptions"
            :ca-pagination="caPagination"
            @update:ca-filter-status="caFilterStatus = $event"
            @view="viewCaRequest"
            @approve="openCaApprovalModal"
          />
        </q-tab-panel>
      </q-tab-panels>

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

    <RequestCaViewModal
      v-model="caViewDialog"
      :request="selectedCaRequest"
    />

    <RequestOvertimeDetailModal
      v-model="showOvertimeDetail"
      :request="selectedOvertimeRow"
    />
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import RequestStatsCards from 'src/components/pages/Request/RequestStatsCards.vue'
import RequestLeaveTable from 'src/components/pages/Request/RequestLeaveTable.vue'
import RequestCashAdvanceTable from 'src/components/pages/Request/RequestCashAdvanceTable.vue'
import RequestLeaveDetailModal from 'src/components/pages/Request/RequestLeaveDetailModal.vue'
import RequestCaApprovalModal from 'src/components/pages/Request/RequestCaApprovalModal.vue'
import RequestCaViewModal from 'src/components/pages/Request/RequestCaViewModal.vue'
import RequestOvertimeDetailModal from 'src/components/pages/Request/RequestOvertimeDetailModal.vue'

const $q = useQuasar()

// ===== SHARED STATE =====
const activeTab = ref('leave')
const getCompanyId = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('selectedCompany'))
    const id = parsed?.id || parsed?.companyId
    if (id) return String(id)
  } catch { /* ignore parse errors */ }
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

// ===== COMPUTED STATS =====
const leaveStats = computed(() => ({
  total: leaveList.value.length,
  pending: leaveList.value.filter((r) => r.status === 'pending').length,
  approved: leaveList.value.filter((r) => r.status === 'approved').length,
  rejected: leaveList.value.filter((r) => r.status === 'rejected').length,
}))

const overtimeStats = computed(() => ({
  total: overtimeSummary.value.reduce((sum, log) => sum + (log.overtime_total_count || 0), 0),
  pending: overtimeSummary.value.reduce((sum, log) => sum + ((log.overtime_total_count || 0) - (log.overtime_approved_count || 0)), 0),
  approved: overtimeSummary.value.reduce((sum, log) => sum + (log.overtime_approved_count || 0), 0),
  rejected: 0,
}))

// ===== FILTERED LISTS =====
const filteredLeaveRequests = computed(() => {
  let filtered = [...leaveList.value]
  if (statusFilter.value && statusFilter.value !== 'all' && statusFilter.value !== null) {
    filtered = filtered.filter((r) => r.status === statusFilter.value)
  }
  if (searchTerm.value.trim()) {
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

const actionableOvertimeIds = computed(() => {
  return filteredOvertimeRequests.value
    .filter(r => ['pending', 'qualified'].includes(r.status))
    .map(r => r.id)
})

const allOvertimeSelected = computed(() => {
  const actionable = actionableOvertimeIds.value
  return actionable.length > 0 && actionable.every(id => selectedOvertimeIds.value.has(id))
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

const otColumns = [
  { name: 'select', label: '', field: '', align: 'center' },
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'schedule', label: 'Schedule', field: 'schedule', align: 'left' },
  { name: 'attendance', label: 'Attendance', field: 'attendance', align: 'left' },
  { name: 'dates', label: 'Date', field: 'date', align: 'left' },
  { name: 'hours', label: 'Hours', field: 'hours', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

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

const updateCaStats = () => {
  caStatistics.value.total = caRequests.value.length
  caStatistics.value.pending = caRequests.value.filter((r) => r.status === 'pending').length
  caStatistics.value.approved = caRequests.value.filter((r) => r.status === 'approved').length
  caStatistics.value.rejected = caRequests.value.filter((r) => r.status === 'rejected').length
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
      params: companyId ? { company_id: companyId } : {},
    })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    overtimeCategories.value = data.filter((c) => c.is_active)
  } catch { /* non-critical, fail silently */ }
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
      status: item.status?.toLowerCase(),
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
    const msg = e.response?.data?.message || e.response?.data?.detail || e.message || 'Failed to approve overtime'
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
        const row = overtimeRequests.value.find(r => r.id === id)
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
      const msg = e.response?.data?.message || e.response?.data?.detail || e.message || 'Failed to bulk approve'
      $q.notify({ type: 'negative', message: msg, icon: 'error', position: 'top' })
    } finally {
      overtimeSubmitting.value = new Set()
    }
  })
}

const filteredOvertimeRequests = computed(() => {
  let filtered = [...overtimeRequests.value]
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

// ===== LEAVE: APPROVE / REJECT =====
const approveRequest = async (request) => {
  try {
    actionLoading.value = `approve-${request.id}`
    await api.patch(
      `/attendance/leave-approval/${request.id}/`,
      { status: 'approved' },
    )
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
    await api.patch(
      `/attendance/leave-approval/${request.id}/`,
      { status: 'rejected' },
    )
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
    const res = await api.get('/cash_advance/admin/', {
      params: { company_id: selectedCompany.value },
    })
    let data = Array.isArray(res.data) ? res.data : res.data.results || []
    caRequests.value = data.map((req) => ({
      ...req,
      employee_name: req.employee_name || extractEmployeeName(req),
    }))
    updateCaStats()
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

const submitCaApproval = async () => {
  try {
    caSubmitting.value = true
    const requestId = selectedCaRequest.value.id
    if (!requestId) throw new Error('No valid ID found for this request')
    const payload = {
      status: caApprovalData.value.status,
      remarks: caApprovalData.value.remarks || '',
    }
    await api.patch(
      `/cash_advance/admin/${requestId}/approval/`,
      payload,
    )
    caApprovalModal.value = false
    selectedCaRequest.value = null
    $q.notify({ type: 'positive', message: 'Request updated successfully!', position: 'top' })
    await fetchCaRequests()
  } catch (err) {
    if (err.response?.status === 500) {
      caApprovalModal.value = false
      selectedCaRequest.value = null
      $q.notify({ type: 'positive', message: 'Request updated successfully!', position: 'top' })
      await fetchCaRequests()
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

// ===== REFRESH HANDLER =====
const handleRefresh = () => {
  if (activeTab.value === 'cash_advance') {
    fetchCaRequests()
  } else if (activeTab.value === 'overtime') {
    fetchOvertimeSummary()
    fetchOvertimeCategories()
  } else {
    fetchLeaveRequests()
  }
}

// Fetch data when tab changes
watch(activeTab, (newTab) => {
  statusFilter.value = 'all'
  if (newTab === 'cash_advance') {
    fetchCaRequests()
  } else if (newTab === 'overtime') {
    fetchOvertimeSummary()
    fetchOvertimeCategories()
  } else {
    fetchLeaveRequests()
  }
})

// Re-fetch all data when selected company changes
watch(selectedCompany, () => {
  selectedDisbursementLog.value = null
  fetchLeaveRequests()
  fetchOvertimeSummary()
  fetchOvertimeCategories()
  fetchCaRequests()
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
  fetchLeaveRequests()
  fetchOvertimeSummary()
  fetchOvertimeCategories()
  fetchCaRequests()
})

onUnmounted(() => {
  window.removeEventListener('storage', syncCompany)
})
</script>

<style scoped>
.page-header {
  padding: 8px 24px;
  border-bottom: 1px solid #f1f3f5;
}
.page-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.page-header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.refresh-btn {
  height: 36px;
  width: 36px;
  border-radius: 8px;
  color: #6b7280 !important;
}
.refresh-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}
.header-search {
  min-width: 200px;
  max-width: 260px;
  flex: 1;
}
.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}
.search-icon { color: #9ca3af; }
.tabs-section {
  padding: 10px 14px;
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
.tab-pill-icon { font-size: 15px; }
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
.tab-panels {
  background: transparent;
}
.tab-panel-content {
  padding: 0;
}
@media (min-width: 1440px) {
  .tab-pill { padding: 9px 18px; font-size: 14px; }
}
@media (max-width: 768px) {
  .page-header { padding: 12px 14px; }
  .page-header-content { flex-direction: column; align-items: stretch; gap: 10px; }
  .page-header-actions { flex-direction: row; gap: 8px; flex-wrap: wrap; }
  .header-search { max-width: 100%; width: 100%; flex: 1; min-width: 0; }
  .tabs-section { padding: 8px 10px; }
  .tab-pills { gap: 5px; }
  .tab-pill { padding: 7px 12px; font-size: 12px; flex: 1; justify-content: center; }
}
@media (max-width: 480px) {
  .page-title { font-size: 18px; }
  .tab-pill span:not(.tab-badge) { display: none; }
  .tab-pill { padding: 8px 14px; }
  .tab-pill-icon { font-size: 16px; }
}

/* Overtime Section - Payroll Card */
.payroll-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}
.tab-panels .payroll-card {
  border-radius: 0 0 16px 16px;
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-wrap: wrap;
}
.table-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
}
.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.table-info {
  font-size: 12px;
  color: #9ca3af;
}
.table-header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.header-search {
  min-width: 200px;
  max-width: 260px;
}
.overtime-summary-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
.overtime-summary-card {
  background: #ffffff;
  border: 1px solid #e0e7ef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}
.overtime-summary-card:hover {
  background: #eef3fb;
}
.overtime-summary-card.active {
  background: #ffffff;
}
.summary-card-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  gap: 16px;
  flex-wrap: nowrap;
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #d8e4f0;
  background: #eef3fb;
}
.overtime-summary-card.active .summary-card-header {
  border-bottom-color: #bfdbfe;
  background: #deeaf8;
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
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.summary-period {
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.summary-stat-cols {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 0 0 auto;
}
.summary-stat-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding: 0 12px;
  border-right: 1px solid #d1dce8;
}
.summary-stat-col:first-child {
  padding-left: 0;
}
.summary-stat-col:last-of-type {
  border-right: none;
}
.summary-stat-label {
  font-size: 10px;
  font-weight: 600;
  color: #8a9ab5;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.summary-stat-val {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}
.overtime-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
}
.expand-icon {
  flex-shrink: 0;
  color: #6b7280;
  transition: transform 0.3s ease;
}

@media (max-width: 1024px) {
  .summary-stat-col { padding: 0 10px; }
  .summary-stat-label { font-size: 9px; }
  .summary-stat-val { font-size: 13px; }
  .summary-card-header { padding: 12px 16px; gap: 12px; }
}

@media (max-width: 768px) {
  .summary-card-header { flex-wrap: wrap; padding: 12px 14px; gap: 10px; }
  .summary-card-name-group { flex: 1 1 100%; min-width: 0; }
  .summary-stat-cols { flex: 1 1 auto; overflow-x: auto; padding-bottom: 2px; }
  .summary-stat-col { padding: 0 8px; }
}

@media (max-width: 480px) {
  .summary-card-header { flex-direction: column; align-items: flex-start; padding: 10px 12px; gap: 8px; }
  .summary-card-name-group { width: 100%; }
  .summary-stat-cols { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
}

/* Expanded Panel Styles */
.overtime-panel-wrapper {
  border-top: 1px solid #d1dce8;
  background: #f8fafc;
}
.overtime-panel {
  padding: 16px 20px;
}
.overtime-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}
.panel-count {
  background: #eef3fb;
  color: #3b82f6;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}
.panel-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.overtime-search-input {
  min-width: 180px;
  max-width: 220px;
}
.overtime-panel-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  font-size: 13px;
  color: #6b7280;
}
.overtime-panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 8px;
  text-align: center;
}
.overtime-table-container {
  background: #ffffff;
  border-radius: 0 0 8px 8px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}
.overtime-table {
  background: #ffffff;
  width: 100%;
}
.table-header-row {
  background: #f8fafc;
}
.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #6b7280 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 11px 16px !important;
  border-bottom: 1px solid #e8ecf0 !important;
  vertical-align: middle !important;
}
.table-body-row {
  transition: background 0.15s ease;
}
.table-body-row:hover {
  background: #f9fafb;
}
.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle !important;
}
.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
}
.type-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.date-text {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}
.hours-text {
  font-size: 13px;
  color: #374151;
  font-weight: 600;
}
.time-cell {
  font-size: 12px;
  color: #374151;
}
.time-range {
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
}
.shimmer-empty {
  color: #9ca3af;
  font-style: italic;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.status-pending {
  background: #fffbeb;
  color: #92400e;
}
.status-approved {
  background: #f0fdf4;
  color: #16a34a;
}
.status-rejected {
  background: #fef2f2;
  color: #dc2626;
}
.status-qualified {
  background: #eff6ff;
  color: #1d4ed8;
}
.cto-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  background: #e0f2fe;
  color: #0369a1;
  margin-left: 6px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}
.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}
.action-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  background: #102335;
  color: #ffffff;
}
.action-btn:hover {
  background: #193d5c;
}
.hours-input {
  max-width: 90px;
}
.hours-input :deep(.q-field__control) {
  height: 32px;
  min-height: 32px;
  padding: 0 8px;
}
.hours-input :deep(.q-field__native) {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}
.hours-cell-content {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bulk-actions-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.bulk-count {
  font-size: 13px;
  font-weight: 600;
  color: #16a34a;
}

@media (max-width: 768px) {
  .overtime-panel { padding: 12px 14px; }
  .overtime-panel-header { flex-direction: column; align-items: stretch; }
  .panel-actions { width: 100%; }
  .overtime-search-input { max-width: 100%; width: 100%; }
  .panel-actions .q-field { width: 100%; }
}
</style>

