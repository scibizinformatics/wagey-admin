<template>
  <q-page class="modern-page">
    <!-- Minimal Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">Leave Requests</h1>
          <p class="page-subtitle">{{ totalRequests }} total requests</p>
        </div>
        <q-btn
          icon="refresh"
          flat
          round
          color="grey-6"
          @click="fetchRequests"
          :loading="loading"
          class="refresh-btn"
        />
      </div>
    </div>

    <!-- Elegant Stats Cards -->
    <div class="stats-section">
      <div class="stat-card pending">
        <div class="stat-content">
          <div class="stat-number">{{ pendingCount }}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-indicator"></div>
      </div>

      <div class="stat-card approved">
        <div class="stat-content">
          <div class="stat-number">{{ approvedCount }}</div>
          <div class="stat-label">Approved</div>
        </div>
        <div class="stat-indicator"></div>
      </div>

      <div class="stat-card rejected">
        <div class="stat-content">
          <div class="stat-number">{{ rejectedCount }}</div>
          <div class="stat-label">Rejected</div>
        </div>
        <div class="stat-indicator"></div>
      </div>
    </div>

    <!-- Minimal Filter Bar -->
    <div class="filter-bar">
      <div class="search-container">
        <q-input
          v-model="searchTerm"
          placeholder="Search requests..."
          outlined
          dense
          borderless
          class="search-input"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="grey-5" size="20px" />
          </template>
        </q-input>
      </div>

      <div class="filter-group">
        <q-select
          v-model="selectedFilter"
          :options="filterOptions"
          outlined
          dense
          borderless
          label="Type"
          class="filter-select"
          map-options
          emit-value
        />

        <q-select
          v-model="statusFilter"
          :options="statusOptions"
          outlined
          dense
          borderless
          label="Status"
          class="filter-select"
          map-options
          emit-value
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">
        <q-spinner size="32px" color="primary" thickness="3" />
      </div>
      <div class="loading-text">Loading requests...</div>
    </div>

    <!-- Modern Table -->
    <div v-else-if="filteredRequests.length > 0" class="table-container">
      <q-table
        :rows="filteredRequests"
        :columns="tableColumns"
        row-key="id"
        flat
        class="elegant-table"
        :pagination="{ rowsPerPage: 15 }"
        separator="none"
      >
        <template v-slot:body="props">
          <q-tr :props="props" class="table-row" @click="openDetails(props.row)">
            <q-td key="employeeName" :props="props" class="employee-cell">
              <div class="employee-info">
                <div class="employee-avatar">
                  {{ props.row.employeeName.charAt(0).toUpperCase() }}
                </div>
                <div class="employee-details">
                  <div class="employee-name">{{ props.row.employeeName }}</div>
                  <div class="employee-dept">{{ props.row.department || 'General' }}</div>
                </div>
              </div>
            </q-td>

            <q-td key="type" :props="props" class="type-cell">
              <div class="type-chip" :class="props.row.type">
                {{ getTypeLabel(props.row.type) }}
              </div>
            </q-td>

            <q-td key="dates" :props="props" class="dates-cell">
              <div class="date-range">
                <div class="start-date">{{ formatDate(props.row.startDate) }}</div>
                <div class="date-separator">→</div>
                <div class="end-date">{{ formatDate(props.row.endDate) }}</div>
              </div>
              <div class="duration">{{ props.row.duration }}</div>
            </q-td>

            <q-td key="status" :props="props" class="status-cell">
              <div class="status-badge" :class="props.row.status">
                {{ props.row.status }}
              </div>
            </q-td>

            <q-td key="actions" :props="props" class="actions-cell">
              <div class="action-buttons">
                <q-btn
                  v-if="props.row.status === 'pending'"
                  icon="check"
                  flat
                  round
                  size="sm"
                  color="positive"
                  class="action-btn approve-btn"
                  @click.stop="approveRequest(props.row)"
                  :loading="actionLoading === `approve-${props.row.id}`"
                />
                <q-btn
                  v-if="props.row.status === 'pending'"
                  icon="close"
                  flat
                  round
                  size="sm"
                  color="negative"
                  class="action-btn reject-btn"
                  @click.stop="rejectRequest(props.row)"
                  :loading="actionLoading === `reject-${props.row.id}`"
                />
                <q-btn
                  icon="visibility"
                  flat
                  round
                  size="sm"
                  color="grey-5"
                  class="action-btn view-btn"
                  @click.stop="openDetails(props.row)"
                />
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <q-icon name="search_off" size="48px" color="grey-3" />
      </div>
      <div class="empty-title">No requests found</div>
      <div class="empty-subtitle">Try adjusting your search or filters</div>
    </div>

    <!-- Elegant Details Dialog -->
    <q-dialog v-model="showDetails" class="details-dialog">
      <q-card class="dialog-card">
        <div class="dialog-header">
          <div class="dialog-title">Request Details</div>
          <q-btn icon="close" flat round size="sm" v-close-popup class="close-btn" />
        </div>

        <div class="dialog-body" v-if="selectedRequest">
          <!-- Employee Section -->
          <div class="detail-section">
            <div class="section-header">
              <div class="employee-avatar large">
                {{ selectedRequest.employeeName.charAt(0).toUpperCase() }}
              </div>
              <div class="employee-info-detail">
                <div class="employee-name-detail">{{ selectedRequest.employeeName }}</div>
                <div class="employee-meta">{{ selectedRequest.department || 'General' }}</div>
              </div>
              <div class="status-badge large" :class="selectedRequest.status">
                {{ selectedRequest.status }}
              </div>
            </div>
          </div>

          <!-- Request Info Grid -->
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Type</div>
              <div class="type-chip" :class="selectedRequest.type">
                {{ getTypeLabel(selectedRequest.type) }}
              </div>
            </div>

            <div class="info-item">
              <div class="info-label">Duration</div>
              <div class="info-value">{{ selectedRequest.duration }}</div>
            </div>

            <div class="info-item">
              <div class="info-label">Start Date</div>
              <div class="info-value">{{ formatDate(selectedRequest.startDate) }}</div>
            </div>

            <div class="info-item">
              <div class="info-label">End Date</div>
              <div class="info-value">{{ formatDate(selectedRequest.endDate) }}</div>
            </div>
          </div>

          <!-- Reason Section -->
          <div v-if="selectedRequest.reason" class="detail-section">
            <div class="section-title">Reason</div>
            <div class="reason-content">{{ selectedRequest.reason }}</div>
          </div>

          <!-- Message Section -->
          <div v-if="selectedRequest.message" class="detail-section">
            <div class="section-title">Additional Message</div>
            <div class="message-content">{{ selectedRequest.message }}</div>
          </div>

          <!-- Admin Response -->
          <div v-if="selectedRequest.adminResponse" class="detail-section">
            <div class="section-title">Admin Response</div>
            <div class="admin-response">{{ selectedRequest.adminResponse }}</div>
            <div v-if="selectedRequest.respondedBy" class="response-meta">
              By {{ selectedRequest.respondedBy }} • {{ formatDate(selectedRequest.respondedDate) }}
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <div class="action-group" v-if="selectedRequest && selectedRequest.status === 'pending'">
            <q-btn
              label="Reject"
              color="negative"
              flat
              @click="rejectRequest(selectedRequest)"
              :loading="actionLoading === `reject-${selectedRequest.id}`"
              class="action-btn-dialog reject"
            />
            <q-btn
              label="Approve"
              color="positive"
              @click="approveRequest(selectedRequest)"
              :loading="actionLoading === `approve-${selectedRequest.id}`"
              class="action-btn-dialog approve"
            />
          </div>
          <q-btn flat label="Close" color="grey-7" v-close-popup class="close-action" />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()
const loading = ref(false)
const actionLoading = ref(null)
const requests = ref([])
const selectedFilter = ref('all')
const statusFilter = ref('all')
const searchTerm = ref('')
const selectedRequest = ref(null)
const showDetails = ref(false)

const filterOptions = [
  { label: 'All Types', value: 'all' },
  { label: 'Leave', value: 'leave' },
  { label: 'Overtime', value: 'overtime' },
  { label: 'Schedule', value: 'schedule' },
  { label: 'Time Off', value: 'timeoff' },
]

const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const tableColumns = [
  { name: 'employeeName', label: 'Employee', align: 'left', field: 'employeeName' },
  { name: 'type', label: 'Type', align: 'left', field: 'type' },
  { name: 'dates', label: 'Period', align: 'left', field: 'startDate' },
  { name: 'status', label: 'Status', align: 'left', field: 'status' },
  { name: 'actions', label: '', align: 'right' },
]

// Computed properties for stats
const pendingCount = computed(() => requests.value.filter((r) => r.status === 'pending').length)
const approvedCount = computed(() => requests.value.filter((r) => r.status === 'approved').length)
const rejectedCount = computed(() => requests.value.filter((r) => r.status === 'rejected').length)
const totalRequests = computed(() => requests.value.length)

// ✅ fetch data from API
const fetchRequests = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')
    if (!token) throw new Error('No access token found')
    if (!companyId) throw new Error('No company ID found')

    const res = await axios.get(
      `https://staging.wageyapp.com/attendance/admin-requests/${companyId}/`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    requests.value = mapApiResponseToRequests(res.data)
  } catch (e) {
    console.error('Error fetching requests:', e.response?.data || e.message)
    $q.notify({
      type: 'negative',
      message: 'Failed to fetch requests. Please try again.',
    })
  } finally {
    loading.value = false
  }
}

// ✅ map API response to request objects for UI
function mapApiResponseToRequests(apiData) {
  if (Array.isArray(apiData)) {
    return apiData.map((item) => formatRequest(item))
  }

  if (Array.isArray(apiData.results)) {
    return apiData.results.map((item) => formatRequest(item))
  }

  console.warn('Unexpected API data shape:', apiData)
  return []
}

function formatRequest(item) {
  return {
    id: item.id,
    employeeId: item.employee_id,
    employeeName: item.employee_name,
    department: item.department || '',
    position: item.position || '',
    type: item.request_type,
    status: item.status?.toLowerCase(),
    startDate: item.request_date_start,
    endDate: item.request_date_end,
    duration: calculateDuration(item.request_date_start, item.request_date_end),
    reason: item.reason,
    message: item.message || '',
    submittedDate: item.submitted_at,
    adminResponse: item.admin_response || '',
    respondedBy: item.responded_by || '',
    respondedDate: item.responded_date || '',
  }
}

function calculateDuration(start, end) {
  if (!start || !end) return 'N/A'
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = endDate - startDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays > 1 ? `${diffDays} days` : '1 day'
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const filteredRequests = computed(() => {
  let filtered = requests.value

  if (selectedFilter.value !== 'all') {
    filtered = filtered.filter((r) => r.type === selectedFilter.value)
  }

  if (statusFilter.value !== 'all') {
    filtered = filtered.filter((r) => r.status === statusFilter.value)
  }

  if (searchTerm.value.trim()) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(search) ||
        r.reason.toLowerCase().includes(search) ||
        r.department.toLowerCase().includes(search),
    )
  }

  return filtered
})

function getTypeLabel(type) {
  const labels = {
    leave: 'Leave',
    timeoff: 'Time Off',
    schedule: 'Schedule',
    overtime: 'Overtime',
  }
  return labels[type] || 'Request'
}

function openDetails(request) {
  selectedRequest.value = request
  showDetails.value = true
}

// ✅ approve request
// ✅ approve request
const approveRequest = async (request) => {
  try {
    actionLoading.value = `approve-${request.id}`

    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No access token found')

    const payload = {
      type: request.type,
      status: 'approve',
      action: 'approve',
      convert_to_cto: false,
    }

    await axios.put(
      `https://staging.wageyapp.com/attendance/approve-requests/${request.type}/${request.id}/`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    // Update local state
    const index = requests.value.findIndex((r) => r.id === request.id)
    if (index !== -1) {
      requests.value[index].status = 'approved'
      requests.value[index].adminResponse = 'Request approved'
      requests.value[index].respondedBy = 'Admin'
      requests.value[index].respondedDate = new Date().toISOString()
    }

    $q.notify({
      type: 'positive',
      message: 'Request approved successfully',
      icon: 'check_circle',
    })
  } catch (e) {
    console.error('Error approving request:', e.response?.data || e.message)
    $q.notify({
      type: 'negative',
      message: 'Failed to approve request. Please try again.',
      icon: 'error',
    })
  } finally {
    actionLoading.value = null
  }
}

// ✅ reject request
const rejectRequest = async (request) => {
  try {
    actionLoading.value = `reject-${request.id}`

    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No access token found')

    const payload = {
      type: request.type,
      status: 'reject',
      action: 'reject',
      convert_to_cto: false,
    }

    await axios.put(
      `https://staging.wageyapp.com/attendance/approve-requests/${request.type}/${request.id}/`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    // Update local state
    const index = requests.value.findIndex((r) => r.id === request.id)
    if (index !== -1) {
      requests.value[index].status = 'rejected'
      requests.value[index].adminResponse = 'Request rejected'
      requests.value[index].respondedBy = 'Admin'
      requests.value[index].respondedDate = new Date().toISOString()
    }

    $q.notify({
      type: 'negative',
      message: 'Request rejected successfully',
      icon: 'cancel',
    })
  } catch (e) {
    console.error('Error rejecting request:', e.response?.data || e.message)
    $q.notify({
      type: 'negative',
      message: 'Failed to reject request. Please try again.',
      icon: 'error',
    })
  } finally {
    actionLoading.value = null
  }
}

onMounted(fetchRequests)
</script>

<style scoped>
.modern-page {
  background: #fafbfc;
  min-height: 100vh;
  padding: 20px;
}

/* Minimal Header */
.page-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  color: #6b7280;
  margin: 4px 0 0 0;
  font-size: 0.875rem;
  font-weight: 400;
}

.refresh-btn {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.refresh-btn:hover {
  opacity: 1;
}

/* Elegant Stats */
.stats-section {
  display: flex;
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  flex: 1;
  position: relative;
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: #e2e8f0;
  transform: translateY(-1px);
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-number {
  font-size: 2.25rem;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

.stat-indicator {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  border-radius: 0 12px 12px 0;
}

.stat-card.pending .stat-indicator {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.stat-card.approved .stat-indicator {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.stat-card.rejected .stat-indicator {
  background: linear-gradient(135deg, #ef4444, #f87171);
}

/* Minimal Filter Bar */
.filter-bar {
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  border: 1px solid #f1f5f9;
}

.search-container {
  flex: 1;
}

.search-input {
  max-width: 300px;
}

.search-input :deep(.q-field__control) {
  background: #f8fafc;
  border-radius: 8px;
  border: none;
}

.filter-group {
  display: flex;
  gap: 12px;
}

.filter-select {
  min-width: 120px;
}

.filter-select :deep(.q-field__control) {
  background: #f8fafc;
  border-radius: 8px;
  border: none;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
}

.loading-text {
  color: #64748b;
  font-size: 0.875rem;
}

/* Modern Table */
.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #f1f5f9;
}

.elegant-table {
  background: transparent;
}

.elegant-table :deep(.q-table__top) {
  display: none;
}

.elegant-table :deep(.q-table__bottom) {
  border-top: 1px solid #f1f5f9;
  padding: 16px 20px;
}

.elegant-table :deep(thead tr) {
  background: #f8fafc;
}

.elegant-table :deep(thead th) {
  font-weight: 600;
  color: #475569;
  font-size: 0.875rem;
  text-transform: none;
  letter-spacing: 0;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.table-row {
  cursor: pointer;
  transition: all 0.15s ease;
}

.table-row:hover {
  background: #f8fafc;
}

.table-row :deep(td) {
  padding: 20px;
  border-bottom: 1px solid #f8fafc;
  vertical-align: middle;
}

/* Employee Cell */
.employee-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.employee-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.employee-details {
  min-width: 0;
}

.employee-name {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 0.875rem;
  margin-bottom: 2px;
}

.employee-dept {
  color: #64748b;
  font-size: 0.75rem;
}

/* Type Chip */
.type-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.type-chip.leave {
  background: #eff6ff;
  color: #1d4ed8;
}

.type-chip.timeoff {
  background: #f3e8ff;
  color: #7c3aed;
}

.type-chip.schedule {
  background: #fef3c7;
  color: #d97706;
}

.type-chip.overtime {
  background: #d1fae5;
  color: #059669;
}

/* Date Cell */
.dates-cell {
  min-width: 180px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.start-date,
.end-date {
  font-size: 0.875rem;
  color: #1a1a1a;
  font-weight: 500;
}

.date-separator {
  color: #94a3b8;
  font-size: 0.75rem;
}

.duration {
  color: #64748b;
  font-size: 0.75rem;
}

/* Status Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.approved {
  background: #d1fae5;
  color: #059669;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge.large {
  padding: 6px 12px;
  font-size: 0.875rem;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
}

.action-btn {
  opacity: 0.6;
  transition: all 0.2s ease;
}

.table-row:hover .action-btn {
  opacity: 1;
}

.approve-btn:hover {
  background: rgba(76, 175, 80, 0.1);
}

.reject-btn:hover {
  background: rgba(244, 67, 54, 0.1);
}

.view-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #475569;
  margin: 16px 0 4px 0;
}

.empty-subtitle {
  color: #64748b;
  font-size: 0.875rem;
}

/* Elegant Dialog */
.details-dialog :deep(.q-dialog__inner) {
  padding: 20px;
}

.dialog-card {
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  overflow: hidden;
  border: 1px solid #f1f5f9;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0 24px;
}

.dialog-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
}

.close-btn {
  color: #6b7280;
}

.dialog-body {
  padding: 24px;
}

/* Detail Sections */
.detail-section {
  margin-bottom: 32px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.employee-avatar.large {
  width: 48px;
  height: 48px;
  font-size: 1.125rem;
}

.employee-info-detail {
  flex: 1;
}

.employee-name-detail {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.employee-meta {
  color: #64748b;
  font-size: 0.875rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 0.875rem;
  color: #1a1a1a;
  font-weight: 500;
}

/* Content Sections */
.reason-content,
.message-content {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  color: #475569;
  line-height: 1.6;
  border-left: 3px solid #e2e8f0;
}

.admin-response {
  background: #f0fdf4;
  padding: 16px;
  border-radius: 8px;
  color: #16a34a;
  line-height: 1.6;
  border-left: 3px solid #22c55e;
}

.response-meta {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #64748b;
}

/* Dialog Actions */
.dialog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px 24px 24px;
}

.action-group {
  display: flex;
  gap: 8px;
}

.action-btn-dialog {
  min-width: 80px;
  font-weight: 500;
}

.action-btn-dialog.approve {
  background: #10b981;
  color: white;
}

.action-btn-dialog.approve:hover {
  background: #059669;
}

.action-btn-dialog.reject {
  color: #dc2626;
}

.action-btn-dialog.reject:hover {
  background: rgba(220, 38, 38, 0.1);
}

.close-action {
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .modern-page {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .stats-section {
    flex-direction: column;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filter-group {
    flex-direction: column;
  }

  .search-input {
    max-width: none;
  }

  .elegant-table :deep(thead th),
  .table-row :deep(td) {
    padding: 12px 16px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
