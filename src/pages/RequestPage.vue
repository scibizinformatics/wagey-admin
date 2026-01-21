<template>
  <q-page class="modern-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <!-- Title and Subtitle -->
        <div class="title-section">
          <h1 class="page-title">Leave Requests</h1>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <q-btn
            icon="refresh"
            flat
            round
            color="grey-7"
            @click="fetchRequests"
            :loading="loading"
            class="refresh-btn"
          />
        </div>
      </div>
    </div>

    <!-- Elegant Stats Cards -->
    <div class="stats-section">
      <div class="stat-card pending">
        <div class="stat-content">
          <div class="stat-icon">
            <q-icon name="schedule" />
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ pendingCount }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
      </div>

      <div class="stat-card approved">
        <div class="stat-content">
          <div class="stat-icon">
            <q-icon name="check_circle" />
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ approvedCount }}</div>
            <div class="stat-label">Approved</div>
          </div>
        </div>
      </div>

      <div class="stat-card rejected">
        <div class="stat-content">
          <div class="stat-icon">
            <q-icon name="cancel" />
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ rejectedCount }}</div>
            <div class="stat-label">Rejected</div>
          </div>
        </div>
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
            <q-td key="reason" :props="props" class="reason-cell">
              <div class="reason-text">
                {{ props.row.reason || 'No reason provided' }}
              </div>
            </q-td>
            <q-td key="actions" :props="props" class="actions-cell">
              <div class="action-buttons">
                <q-btn
                  icon="visibility"
                  flat
                  round
                  size="sm"
                  class="action-btn view-btn"
                  @click.stop="openDetails(props.row)"
                >
                  <q-tooltip>View Details</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="props.row.status === 'pending'"
                  icon="edit"
                  flat
                  round
                  size="sm"
                  class="action-btn edit-btn"
                  @click.stop="openDetails(props.row)"
                >
                  <q-tooltip>Edit</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="props.row.status === 'pending'"
                  icon="check"
                  flat
                  round
                  size="sm"
                  class="action-btn approve-btn"
                  @click.stop="approveRequest(props.row)"
                  :loading="actionLoading === `approve-${props.row.id}`"
                >
                  <q-tooltip>Approve</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="props.row.status === 'pending'"
                  icon="close"
                  flat
                  round
                  size="sm"
                  class="action-btn reject-btn"
                  @click.stop="rejectRequest(props.row)"
                  :loading="actionLoading === `reject-${props.row.id}`"
                >
                  <q-tooltip>Reject</q-tooltip>
                </q-btn>
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
  { name: 'reason', label: 'Reason', align: 'left', field: 'reason' },
  { name: 'status', label: 'Status', align: 'left', field: 'status' },
  { name: 'actions', label: '', align: 'right' },
]

// Computed properties for stats
const pendingCount = computed(() => requests.value.filter((r) => r.status === 'pending').length)
const approvedCount = computed(() => requests.value.filter((r) => r.status === 'approved').length)
const rejectedCount = computed(() => requests.value.filter((r) => r.status === 'rejected').length)

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

    // ✅ FIX: Get UUID from the correct localStorage key
    let approverUUID = localStorage.getItem('account_uuid')

    // ✅ Fallback: Try to get from 'user' object if account_uuid doesn't exist
    if (!approverUUID) {
      const storedUser = localStorage.getItem('user')
      if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        try {
          const user = JSON.parse(storedUser)
          approverUUID = user?.uuid
        } catch (e) {
          console.warn('Failed to parse user from localStorage:', e)
        }
      }
    }

    if (!token) {
      throw new Error('No access token found')
    }

    if (!approverUUID) {
      throw new Error('User UUID not found. Please log in again.')
    }

    console.log('🔑 Using approver UUID:', approverUUID)

    const payload = {
      type: request.type,
      status: 'approved',
      action: 'approve',
    }

    console.log('📤 Approving request:', {
      url: `https://staging.wageyapp.com/attendance/approve-requests/${request.type}/${request.id}/`,
      payload,
    })

    await axios.patch(
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

    // Close details dialog if open
    if (showDetails.value) {
      showDetails.value = false
    }
  } catch (e) {
    console.error('❌ Error approving request:', e.response?.data || e.message)

    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to approve request. Please try again.'

    $q.notify({
      type: 'negative',
      message: errorMessage,
      icon: 'error',
    })
  } finally {
    actionLoading.value = null
  }
}

const rejectRequest = async (request) => {
  try {
    actionLoading.value = `reject-${request.id}`

    const token = localStorage.getItem('access_token')

    // ✅ FIX: Get UUID from the correct localStorage key
    let approverUUID = localStorage.getItem('account_uuid')

    // ✅ Fallback: Try to get from 'user' object if account_uuid doesn't exist
    if (!approverUUID) {
      const storedUser = localStorage.getItem('user')
      if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        try {
          const user = JSON.parse(storedUser)
          approverUUID = user?.uuid
        } catch (e) {
          console.warn('Failed to parse user from localStorage:', e)
        }
      }
    }

    if (!token) {
      throw new Error('No access token found')
    }

    if (!approverUUID) {
      throw new Error('User UUID not found. Please log in again.')
    }

    console.log('🔑 Using approver UUID:', approverUUID)

    const payload = {
      type: request.type,
      status: 'rejected',
      action: 'reject',
    }

    console.log('📤 Rejecting request:', {
      url: `https://staging.wageyapp.com/attendance/approve-requests/${request.type}/${request.id}/`,
      payload,
    })

    await axios.patch(
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

    // Close details dialog if open
    if (showDetails.value) {
      showDetails.value = false
    }
  } catch (e) {
    console.error('❌ Error rejecting request:', e.response?.data || e.message)

    const errorMessage = Array.isArray(e.response?.data)
      ? e.response.data[0]
      : e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message ||
        'Failed to reject request. Please try again.'

    $q.notify({
      type: 'negative',
      message: errorMessage,
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
  padding: 16px;
}

/* Clean Header */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 20px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  letter-spacing: -0.03em;
}

.page-subtitle {
  color: #6b7280;
  margin: 4px 0 0 0;
  font-size: 0.8125rem;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.refresh-btn {
  background: #f3f4f6;
  color: #6b7280;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: #e5e7eb;
  color: #374151;
  transform: rotate(180deg);
}

/* Modern Stats Cards */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  position: relative;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.08;
  transition: opacity 0.3s ease;
}

.stat-card.pending::before {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.stat-card.approved::before {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.stat-card.rejected::before {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

.stat-card:hover::before {
  opacity: 0.12;
}

.stat-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}

.stat-card.pending .stat-icon {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #d97706;
}

.stat-card.approved .stat-icon {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.stat-card.rejected .stat-icon {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 2px;
  letter-spacing: -0.02em;
}

.stat-label {
  color: #6b7280;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.stat-indicator {
  display: none;
}

/* Minimal Filter Bar */
.filter-bar {
  background: white;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  border: 1px solid #f1f5f9;
}

.search-container {
  flex: 1;
  min-width: 180px;
}

.search-input {
  width: 100%;
  max-width: 350px;
}

.search-input :deep(.q-field__control) {
  background: #f8fafc;
  border-radius: 8px;
  border: none;
  height: 36px;
}

.filter-group {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.filter-select {
  min-width: 120px;
}

.filter-select :deep(.q-field__control) {
  background: #f8fafc;
  border-radius: 8px;
  border: none;
  height: 36px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 160px;
  gap: 12px;
  background: white;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
}

.loading-text {
  color: #64748b;
  font-size: 0.8125rem;
}

/* Modern Table */
.table-container {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #f1f5f9;
  overflow-x: auto;
}

.elegant-table {
  background: transparent;
  width: 100%;
}

.elegant-table :deep(.q-table__top) {
  display: none;
}

.elegant-table :deep(.q-table__bottom) {
  border-top: 1px solid #f1f5f9;
  padding: 12px 16px;
}

.elegant-table :deep(.q-table__container) {
  overflow-x: auto;
}

.elegant-table :deep(thead tr) {
  background: #f8fafc;
}

.elegant-table :deep(thead th) {
  font-weight: 600;
  color: #475569;
  font-size: 0.8125rem;
  text-transform: none;
  letter-spacing: 0;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
  vertical-align: middle;
}

.table-row {
  cursor: pointer;
  transition: all 0.15s ease;
}

.table-row:hover {
  background: #f8fafc;
}

.table-row :deep(td) {
  padding: 14px 16px;
  border-bottom: 1px solid #f8fafc;
  vertical-align: middle;
}

/* Employee Cell */
.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 160px;
}

.employee-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8125rem;
}

.employee-details {
  min-width: 0;
  flex: 1;
}

.employee-name {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 0.8125rem;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-dept {
  color: #64748b;
  font-size: 0.6875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Type Chip */
.type-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
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
  gap: 6px;
  margin-bottom: 2px;
  flex-wrap: nowrap;
}

.start-date,
.end-date {
  font-size: 0.8125rem;
  color: #1a1a1a;
  font-weight: 500;
  white-space: nowrap;
}

.date-separator {
  color: #94a3b8;
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.duration {
  color: #64748b;
  font-size: 0.6875rem;
  white-space: nowrap;
}

/* Status Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
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
  padding: 5px 10px;
  font-size: 0.8125rem;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: flex-end;
  min-width: 100px;
}

.action-btn {
  opacity: 0.6;
  transition: all 0.2s ease;
  flex-shrink: 0;
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
  padding: 48px 20px;
  background: white;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
  margin: 12px 0 4px 0;
}

.empty-subtitle {
  color: #64748b;
  font-size: 0.8125rem;
}

/* Elegant Dialog */
.details-dialog :deep(.q-dialog__inner) {
  padding: 16px;
}

.dialog-card {
  border-radius: 14px;
  max-width: 540px;
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
  padding: 20px 20px 0 20px;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a1a1a;
}

.close-btn {
  color: #6b7280;
}

.dialog-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

/* Detail Sections */
.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.employee-avatar.large {
  width: 40px;
  height: 40px;
  font-size: 1rem;
  flex-shrink: 0;
}

.employee-info-detail {
  flex: 1;
  min-width: 130px;
}

.employee-name-detail {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.employee-meta {
  color: #64748b;
  font-size: 0.8125rem;
}

.section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 0.8125rem;
  color: #1a1a1a;
  font-weight: 500;
}

/* Content Sections */
.reason-content,
.message-content {
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  color: #475569;
  line-height: 1.5;
  font-size: 0.8125rem;
  border-left: 3px solid #e2e8f0;
  word-wrap: break-word;
}

.admin-response {
  background: #f0fdf4;
  padding: 12px;
  border-radius: 8px;
  color: #16a34a;
  line-height: 1.5;
  font-size: 0.8125rem;
  border-left: 3px solid #22c55e;
  word-wrap: break-word;
}

.response-meta {
  margin-top: 6px;
  font-size: 0.6875rem;
  color: #64748b;
}

/* Dialog Actions */
.dialog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px 20px 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.action-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn-dialog {
  min-width: 76px;
  font-weight: 500;
  padding: 6px 16px;
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

/* ============================================ */
/* RESPONSIVE BREAKPOINTS */
/* ============================================ */

/* Large Desktop (1440px and up) */
@media (min-width: 1440px) {
  .modern-page {
    padding: 24px;
    max-width: 1600px;
    margin: 0 auto;
  }

  .page-header {
    padding: 24px 28px;
  }

  .page-title {
    font-size: 1.75rem;
  }

  .stats-section {
    gap: 20px;
    margin-bottom: 24px;
  }

  .stat-card {
    padding: 20px 24px;
  }

  .filter-bar {
    padding: 14px 20px;
  }

  .search-input {
    max-width: 450px;
  }

  .filter-select {
    min-width: 140px;
  }

  .elegant-table :deep(thead th),
  .table-row :deep(td) {
    padding: 16px 20px;
  }

  .employee-info {
    min-width: 180px;
  }

  .dialog-card {
    max-width: 600px;
  }
}

/* Desktop (1024px to 1439px) */
@media (min-width: 1024px) and (max-width: 1439px) {
  .modern-page {
    padding: 20px;
  }

  .page-header {
    padding: 20px 24px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .stats-section {
    gap: 16px;
    margin-bottom: 20px;
  }

  .filter-bar {
    padding: 12px 16px;
  }

  .search-input {
    max-width: 320px;
  }

  .filter-select {
    min-width: 120px;
  }

  .employee-info {
    min-width: 160px;
  }

  .elegant-table :deep(thead th),
  .table-row :deep(td) {
    padding: 14px 16px;
  }
}

/* Tablet (768px to 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .modern-page {
    padding: 16px;
  }

  .page-header {
    padding: 16px 20px;
  }

  .page-title {
    font-size: 1.375rem;
  }

  .header-content {
    align-items: center;
  }

  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 14px 16px;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .filter-bar {
    padding: 12px;
    flex-wrap: wrap;
  }

  .search-container {
    width: 100%;
    min-width: unset;
  }

  .search-input {
    max-width: 100%;
  }

  .filter-group {
    width: 100%;
    justify-content: space-between;
  }

  .filter-select {
    flex: 1;
    min-width: 110px;
  }

  .table-container {
    overflow-x: auto;
  }

  .elegant-table {
    min-width: 800px;
  }

  .elegant-table :deep(thead th),
  .table-row :deep(td) {
    padding: 12px 14px;
  }

  .employee-info {
    min-width: 140px;
  }

  .dates-cell {
    min-width: 160px;
  }

  .action-buttons {
    min-width: 90px;
  }

  .dialog-card {
    max-width: 90vw;
    margin: 0 12px;
  }

  .dialog-header {
    padding: 16px 16px 0 16px;
  }

  .dialog-body {
    padding: 16px;
  }

  .info-grid {
    gap: 16px;
  }

  .dialog-actions {
    padding: 0 16px 16px 16px;
  }
}

/* Mobile (below 768px) */
@media (max-width: 767px) {
  .modern-page {
    padding: 12px;
  }

  .page-header {
    padding: 14px 16px;
    border-radius: 10px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .refresh-btn {
    align-self: flex-end;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 12px 16px;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }

  .search-container {
    width: 100%;
    min-width: unset;
  }

  .search-input {
    max-width: 100%;
  }

  .filter-group {
    flex-direction: column;
    gap: 8px;
  }

  .filter-select {
    width: 100%;
    min-width: unset;
  }

  .table-container {
    background: transparent;
    border: none;
  }

  .elegant-table {
    display: none;
  }

  .loading-state {
    height: 140px;
    padding: 16px;
  }

  .details-dialog :deep(.q-dialog__inner) {
    padding: 0;
  }

  .dialog-card {
    max-width: 100%;
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    margin: 0;
  }

  .dialog-header {
    padding: 14px;
    border-bottom: 1px solid #f1f5f9;
  }

  .dialog-title {
    font-size: 1rem;
  }

  .dialog-body {
    padding: 14px;
    max-height: calc(100vh - 140px);
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .employee-avatar.large {
    width: 36px;
    height: 36px;
    font-size: 0.9375rem;
  }

  .employee-name-detail {
    font-size: 0.9375rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 20px;
  }

  .detail-section {
    margin-bottom: 20px;
  }

  .reason-content,
  .message-content,
  .admin-response {
    padding: 10px;
    font-size: 0.8125rem;
  }

  .dialog-actions {
    padding: 14px;
    flex-direction: column-reverse;
    align-items: stretch;
    border-top: 1px solid #f1f5f9;
  }

  .action-group {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
  }

  .action-btn-dialog {
    flex: 1;
  }

  .close-action {
    width: 100%;
    margin-bottom: 8px;
  }

  .empty-state {
    padding: 32px 16px;
  }

  .empty-title {
    font-size: 0.9375rem;
  }

  .empty-subtitle {
    font-size: 0.75rem;
  }
}

/* Extra small mobile (below 375px) */
@media (max-width: 374px) {
  .modern-page {
    padding: 10px;
  }

  .page-title {
    font-size: 1.125rem;
  }

  .stat-number {
    font-size: 1.375rem;
  }

  .filter-bar {
    padding: 10px;
  }

  .dialog-body {
    padding: 12px;
  }
}

/* Print styles */
@media print {
  .modern-page {
    padding: 0;
    background: white;
  }

  .page-header,
  .stats-section,
  .filter-bar {
    display: none;
  }

  .table-container {
    border: 1px solid #000;
  }

  .action-buttons,
  .refresh-btn {
    display: none;
  }
}
</style>
