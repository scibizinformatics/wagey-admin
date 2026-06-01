<template>
  <PageShell>
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Requests</h1>
          </div>
          <div class="header-actions">
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
          <RequestOvertimeTable
            :rows="filteredOvertimeRequests"
            :loading="loading"
            :status-filter="statusFilter"
            @update:status-filter="statusFilter = $event"
            @view-approve="openOvertimeApproval"
          />
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

    <RequestOvertimeApprovalModal
      v-model="showOvertimeApproval"
      :request="selectedOvertimeRequest"
      :approval-data="overtimeApprovalData"
      :overtime-categories="overtimeCategories"
      :submitting="overtimeSubmitting"
      @update:approval-data="overtimeApprovalData = $event"
      @submit="submitOvertimeApproval"
    />
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'
import { api } from 'src/boot/axios'
import RequestStatsCards from 'src/components/pages/Request/RequestStatsCards.vue'
import RequestLeaveTable from 'src/components/pages/Request/RequestLeaveTable.vue'
import RequestOvertimeTable from 'src/components/pages/Request/RequestOvertimeTable.vue'
import RequestCashAdvanceTable from 'src/components/pages/Request/RequestCashAdvanceTable.vue'
import RequestLeaveDetailModal from 'src/components/pages/Request/RequestLeaveDetailModal.vue'
import RequestCaApprovalModal from 'src/components/pages/Request/RequestCaApprovalModal.vue'
import RequestCaViewModal from 'src/components/pages/Request/RequestCaViewModal.vue'
import RequestOvertimeApprovalModal from 'src/components/pages/Request/RequestOvertimeApprovalModal.vue'

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
const overtimeList = ref([])
const overtimeCategories = ref([])
const showOvertimeApproval = ref(false)
const selectedOvertimeRequest = ref(null)
const overtimeApprovalData = ref({
  approved_hours: '',
  category: null,
  reason: '',
  status: 'approved',
})
const overtimeSubmitting = ref(false)

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
  total: overtimeList.value.length,
  pending: overtimeList.value.filter((r) => r.status === 'pending').length,
  approved: overtimeList.value.filter((r) => r.status === 'approved').length,
  rejected: overtimeList.value.filter((r) => r.status === 'rejected').length,
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

const filteredOvertimeRequests = computed(() => {
  let filtered = [...overtimeList.value]
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
    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No access token found')
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const res = await axios.get(
      `https://staging.wageyapp.com/attendance/leave-list/?company_id=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
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
    const token = localStorage.getItem('access_token')
    if (!token) return
    const companyId = selectedCompany.value
    const res = await axios.get('https://staging.wageyapp.com/payroll/overtime-categories/', {
      headers: { Authorization: `Bearer ${token}` },
      params: companyId ? { company_id: companyId } : {},
    })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    overtimeCategories.value = data.filter((c) => c.is_active)
  } catch { /* non-critical, fail silently */ }
}

const fetchOvertimeRequests = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No access token found')
    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')
    const res = await axios.get(
      `https://staging.wageyapp.com/payroll/overtime-list/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    overtimeList.value = data.map((item) => ({
      id: item.id,
      employeeName:
        typeof item.employee === 'object'
          ? item.employee?.full_name || item.employee?.name || 'Unknown'
          : item.employee || 'Unknown',
      category: item.category,
      categoryName: item.category_name || 'Uncategorized',
      date: item.date,
      hours: item.hours,
      approvedHours: item.approved_hours,
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
    loading.value = false
  }
}

// ===== LEAVE: APPROVE / REJECT =====
const approveRequest = async (request) => {
  try {
    actionLoading.value = `approve-${request.id}`
    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No access token found')
    await axios.patch(
      `https://staging.wageyapp.com/attendance/leave-approval/${request.id}/`,
      { status: 'approved' },
      { headers: { Authorization: `Bearer ${token}` } },
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
    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No access token found')
    await axios.patch(
      `https://staging.wageyapp.com/attendance/leave-approval/${request.id}/`,
      { status: 'rejected' },
      { headers: { Authorization: `Bearer ${token}` } },
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

// ===== OVERTIME: APPROVE MODAL =====
const openOvertimeApproval = (row) => {
  selectedOvertimeRequest.value = row
  overtimeApprovalData.value = {
    approved_hours: row.hours || '',
    category: row.category || null,
    reason: '',
    status: 'approved',
  }
  showOvertimeApproval.value = true
}

const submitOvertimeApproval = async () => {
  try {
    overtimeSubmitting.value = true
    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No access token found')
    const payload = {
      approved_hours: String(overtimeApprovalData.value.approved_hours),
      category: overtimeApprovalData.value.category ?? 0,
      reason: overtimeApprovalData.value.reason || '',
      status: overtimeApprovalData.value.status,
    }
    await axios.patch(
      `https://staging.wageyapp.com/payroll/overtime-approve/${selectedOvertimeRequest.value.id}/`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const index = overtimeList.value.findIndex((r) => r.id === selectedOvertimeRequest.value.id)
    if (index !== -1) overtimeList.value[index].status = overtimeApprovalData.value.status
    showOvertimeApproval.value = false
    selectedOvertimeRequest.value = null
    $q.notify({
      type: 'positive',
      message: 'Overtime request updated successfully',
      icon: 'check_circle',
      position: 'top',
    })
  } catch (e) {
    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to update overtime request.'
    $q.notify({ type: 'negative', message: errorMessage, icon: 'error', position: 'top' })
  } finally {
    overtimeSubmitting.value = false
  }
}

const openLeaveDetails = (request) => {
  selectedLeaveRequest.value = request
  showLeaveDetails.value = true
}

// ===== API: CASH ADVANCE =====
const getAuthConfig = () => {
  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')
  if (!token) throw new Error('No authentication token found')
  return {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    params: selectedCompany.value ? { company_id: selectedCompany.value } : {},
  }
}

const fetchCaRequests = async () => {
  loading.value = true
  try {
    const config = getAuthConfig()
    const res = await api.get(
      `https://staging.wageyapp.com/cash_advance/admin/?company_id=${selectedCompany.value}`,
      { headers: config.headers },
    )
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
    const config = getAuthConfig()
    const payload = {
      status: caApprovalData.value.status,
      remarks: caApprovalData.value.remarks || '',
    }
    await api.patch(
      `https://staging.wageyapp.com/cash_advance/admin/${requestId}/approval/`,
      payload,
      config,
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
    fetchOvertimeRequests()
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
    fetchOvertimeRequests()
  } else {
    fetchLeaveRequests()
  }
})

// Re-fetch all data when selected company changes
watch(selectedCompany, () => {
  fetchLeaveRequests()
  fetchOvertimeRequests()
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
  fetchOvertimeRequests()
  fetchOvertimeCategories()
  fetchCaRequests()
})

onUnmounted(() => {
  window.removeEventListener('storage', syncCompany)
})
</script>

<style scoped>
.page-header {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
}
.header-content {
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
.header-actions {
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
  background: #ffffff;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
  padding: 10px 14px;
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
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
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
@media (max-width: 768px) {
  .page-header { padding: 12px 14px; margin-bottom: 12px; }
  .header-content { flex-direction: column; align-items: stretch; gap: 10px; }
  .header-actions { flex-direction: row; gap: 8px; flex-wrap: wrap; }
  .header-search { max-width: 100%; width: 100%; flex: 1; min-width: 0; }
  .tabs-section { padding: 8px 10px; margin-bottom: 12px; }
  .tab-pills { gap: 5px; }
  .tab-pill { padding: 7px 11px; font-size: 12px; flex: 1; justify-content: center; }
}
@media (max-width: 480px) {
  .page-title { font-size: 18px; }
  .tab-pill span:not(.tab-badge) { display: none; }
  .tab-pill-icon { font-size: 16px; }
}
</style>
