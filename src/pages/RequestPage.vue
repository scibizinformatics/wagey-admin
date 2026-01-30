<template>
  <q-page class="request-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Leave Requests</h1>
          </div>
          <div class="header-actions">
            <q-btn
              color="primary"
              icon="refresh"
              label="Refresh"
              class="refresh-btn"
              @click="fetchRequests"
              :loading="loading"
            />
            <q-input
              v-model="searchTerm"
              placeholder="Search requests..."
              class="header-search"
              dense
              outlined
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-section">
        <div class="stats-card pending-card">
          <div class="stats-icon-wrapper">
            <q-icon name="schedule" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ pendingCount }}</div>
            <div class="stats-label">Pending Requests</div>
          </div>
        </div>

        <div class="stats-card approved-card">
          <div class="stats-icon-wrapper">
            <q-icon name="check_circle" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ approvedCount }}</div>
            <div class="stats-label">Approved</div>
          </div>
        </div>

        <div class="stats-card rejected-card">
          <div class="stats-icon-wrapper">
            <q-icon name="cancel" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ rejectedCount }}</div>
            <div class="stats-label">Rejected</div>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Request Overview</h2>
          </div>
          <div class="table-actions">
            <q-select
              v-model="selectedFilter"
              :options="filterOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              label="Filter by Type"
              class="filter-select"
              dense
              outlined
              clearable
            >
              <template v-slot:prepend>
                <q-icon name="filter_list" />
              </template>
            </q-select>

            <q-select
              v-model="statusFilter"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              label="Filter by Status"
              class="filter-select"
              dense
              outlined
              clearable
            >
              <template v-slot:prepend>
                <q-icon name="check_circle" />
              </template>
            </q-select>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <q-spinner size="48px" color="primary" thickness="4" />
          <div class="loading-text">Loading requests...</div>
        </div>

        <!-- Request Table -->
        <div v-else-if="filteredRequests.length > 0" class="modern-table-container">
          <q-table
            :rows="filteredRequests"
            :columns="columns"
            row-key="id"
            flat
            :loading="loading"
            no-data-label="No requests found"
            class="request-table"
            hide-pagination
            :rows-per-page-options="[0]"
          >
            <template v-slot:header>
              <q-tr class="table-header-row">
                <q-th class="table-header-cell">SL No</q-th>
                <q-th class="table-header-cell">Employee</q-th>
                <q-th class="table-header-cell">Type</q-th>
                <q-th class="table-header-cell">Period</q-th>
                <q-th class="table-header-cell">Reason</q-th>
                <q-th class="table-header-cell">Status</q-th>
                <q-th class="table-header-cell">Actions</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr
                class="table-body-row"
                :class="{ 'rejected-row': props.row.status === 'rejected' }"
              >
                <q-td class="table-body-cell">
                  {{ String(props.rowIndex + 1).padStart(2, '0') }}.
                </q-td>

                <q-td class="table-body-cell employee-name-cell">
                  <div class="employee-info">
                    <q-avatar size="32px" color="primary" text-color="white">
                      {{ getInitials(props.row.employeeName) }}
                    </q-avatar>
                    <div class="employee-details">
                      <span class="employee-name">{{ props.row.employeeName }}</span>
                      <span class="employee-dept">{{ props.row.department || 'General' }}</span>
                    </div>
                  </div>
                </q-td>

                <q-td class="table-body-cell">
                  <div :class="['type-badge', props.row.type]">
                    {{ getTypeLabel(props.row.type) }}
                  </div>
                </q-td>

                <q-td class="table-body-cell dates-cell">
                  <div class="date-range">
                    <div class="start-date">{{ formatDate(props.row.startDate) }}</div>
                    <div class="date-separator">→</div>
                    <div class="end-date">{{ formatDate(props.row.endDate) }}</div>
                  </div>
                  <div class="duration">{{ props.row.duration }}</div>
                </q-td>

                <q-td class="table-body-cell reason-cell">
                  <div class="reason-text">
                    {{ props.row.reason || 'No reason provided' }}
                  </div>
                </q-td>

                <q-td class="table-body-cell">
                  <div :class="['status-badge', getStatusClass(props.row)]">
                    {{ capitalizeStatus(props.row.status) }}
                  </div>
                </q-td>

                <q-td class="table-body-cell actions-cell">
                  <div class="action-buttons">
                    <q-btn
                      flat
                      round
                      icon="visibility"
                      size="sm"
                      class="action-btn view-btn"
                      @click="openDetails(props.row)"
                    >
                      <q-tooltip>View Details</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="props.row.status === 'pending'"
                      flat
                      round
                      icon="check"
                      size="sm"
                      class="action-btn approve-btn"
                      @click="approveRequest(props.row)"
                      :loading="actionLoading === `approve-${props.row.id}`"
                    >
                      <q-tooltip>Approve Request</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="props.row.status === 'pending'"
                      flat
                      round
                      icon="close"
                      size="sm"
                      class="action-btn reject-btn"
                      @click="rejectRequest(props.row)"
                      :loading="actionLoading === `reject-${props.row.id}`"
                    >
                      <q-tooltip>Reject Request</q-tooltip>
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
            <q-icon name="search_off" size="64px" color="grey-4" />
          </div>
          <div class="empty-title">No requests found</div>
          <div class="empty-subtitle">Try adjusting your search or filters</div>
        </div>
      </div>
    </div>

    <!-- Request Details Modal -->
    <q-dialog v-model="showDetails" persistent>
      <q-card class="modal-card details-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="64px" color="primary" text-color="white" class="modal-avatar">
              {{ selectedRequest ? getInitials(selectedRequest.employeeName) : '?' }}
            </q-avatar>
            <div>
              <div class="modal-title">
                {{ selectedRequest?.employeeName || 'Request Details' }}
              </div>
              <div class="modal-subtitle">{{ selectedRequest?.department || 'General' }}</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="showDetails = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content" v-if="selectedRequest">
          <div class="detail-sections">
            <!-- Request Status -->
            <div class="detail-section">
              <div class="section-title">Request Status</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <div :class="['status-badge', getStatusClass(selectedRequest)]">
                      {{ capitalizeStatus(selectedRequest.status) }}
                    </div>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Type:</span>
                  <span class="detail-value">
                    <div :class="['type-badge', selectedRequest.type]">
                      {{ getTypeLabel(selectedRequest.type) }}
                    </div>
                  </span>
                </div>
              </div>
            </div>

            <!-- Request Details -->
            <div class="detail-section">
              <div class="section-title">Request Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Start Date:</span>
                  <span class="detail-value">{{ formatDate(selectedRequest.startDate) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">End Date:</span>
                  <span class="detail-value">{{ formatDate(selectedRequest.endDate) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">{{ selectedRequest.duration }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Submitted:</span>
                  <span class="detail-value">{{
                    formatDateTime(selectedRequest.submittedDate)
                  }}</span>
                </div>
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
                By {{ selectedRequest.respondedBy }} •
                {{ formatDateTime(selectedRequest.respondedDate) }}
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-footer">
          <div class="form-actions">
            <q-btn
              v-if="selectedRequest && selectedRequest.status === 'pending'"
              label="Reject"
              flat
              color="negative"
              @click="rejectRequest(selectedRequest)"
              :loading="actionLoading === `reject-${selectedRequest.id}`"
            />
            <q-btn
              v-if="selectedRequest && selectedRequest.status === 'pending'"
              label="Approve"
              color="positive"
              @click="approveRequest(selectedRequest)"
              :loading="actionLoading === `approve-${selectedRequest.id}`"
            />
            <q-btn label="Close" flat color="grey-7" @click="showDetails = false" />
          </div>
        </q-card-section>
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

const columns = [
  { name: 'sl_no', label: 'SL No', field: 'id', align: 'left' },
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'dates', label: 'Period', field: 'startDate', align: 'left' },
  { name: 'reason', label: 'Reason', field: 'reason', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

// Computed properties for stats
const pendingCount = computed(() => requests.value.filter((r) => r.status === 'pending').length)
const approvedCount = computed(() => requests.value.filter((r) => r.status === 'approved').length)
const rejectedCount = computed(() => requests.value.filter((r) => r.status === 'rejected').length)

const filteredRequests = computed(() => {
  let filtered = requests.value

  if (selectedFilter.value && selectedFilter.value !== 'all') {
    filtered = filtered.filter((r) => r.type === selectedFilter.value)
  }

  if (statusFilter.value && statusFilter.value !== 'all') {
    filtered = filtered.filter((r) => r.status === statusFilter.value)
  }

  if (searchTerm.value.trim()) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(search) ||
        (r.reason && r.reason.toLowerCase().includes(search)) ||
        (r.department && r.department.toLowerCase().includes(search)),
    )
  }

  return filtered
})

// Helper functions
const getInitials = (name) =>
  name && name !== 'N/A'
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

const getTypeLabel = (type) => {
  const labels = {
    leave: 'Leave',
    timeoff: 'Time Off',
    schedule: 'Schedule',
    overtime: 'Overtime',
  }
  return labels[type] || 'Request'
}

const getStatusClass = (request) => {
  const status = request.status
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}

const capitalizeStatus = (status) => {
  if (!status) return 'N/A'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const calculateDuration = (start, end) => {
  if (!start || !end) return 'N/A'
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = endDate - startDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays > 1 ? `${diffDays} days` : '1 day'
}

// API functions
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
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

const mapApiResponseToRequests = (apiData) => {
  if (Array.isArray(apiData)) {
    return apiData.map((item) => formatRequest(item))
  }

  if (Array.isArray(apiData.results)) {
    return apiData.results.map((item) => formatRequest(item))
  }

  console.warn('Unexpected API data shape:', apiData)
  return []
}

const formatRequest = (item) => {
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

const openDetails = (request) => {
  selectedRequest.value = request
  showDetails.value = true
}

const approveRequest = async (request) => {
  try {
    actionLoading.value = `approve-${request.id}`

    const token = localStorage.getItem('access_token')
    let approverUUID = localStorage.getItem('account_uuid')

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

    const payload = {
      type: request.type,
      status: 'approved',
      action: 'approve',
    }

    await axios.patch(
      `https://staging.wageyapp.com/attendance/approve-requests/${request.type}/${request.id}/`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

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
      position: 'top',
    })

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
      position: 'top',
    })
  } finally {
    actionLoading.value = null
  }
}

const rejectRequest = async (request) => {
  try {
    actionLoading.value = `reject-${request.id}`

    const token = localStorage.getItem('access_token')
    let approverUUID = localStorage.getItem('account_uuid')

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

    const payload = {
      type: request.type,
      status: 'rejected',
      action: 'reject',
    }

    await axios.patch(
      `https://staging.wageyapp.com/attendance/approve-requests/${request.type}/${request.id}/`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

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
      position: 'top',
    })

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
      position: 'top',
    })
  } finally {
    actionLoading.value = null
  }
}

onMounted(fetchRequests)
</script>

<style scoped>
.request-dashboard {
  background: #f8fafc;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

/* ===================================
   HEADER SECTION
   =================================== */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
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
  color: #1a202c;
  margin: 0 0 4px 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.refresh-btn {
  height: 36px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 13px;
}

.header-search {
  min-width: 180px;
  max-width: 250px;
  flex: 1;
}

.header-search .q-field__control {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

/* ===================================
   STATS SECTION
   =================================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  min-width: 0;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.pending-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.approved-card {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.rejected-card {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

.stats-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.stats-icon {
  font-size: 24px;
  color: #374151;
}

.stats-content {
  flex: 1;
  min-width: 0;
}

.stats-amount {
  font-size: 26px;
  font-weight: 700;
  color: #1a202c;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}

/* ===================================
   TABLE SECTION
   =================================== */
.table-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.table-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.filter-select {
  min-width: 160px;
}

.filter-select .q-field__control {
  border-radius: 8px;
  height: 36px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.loading-text {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

/* Modern Table */
.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 10px;
  overflow: hidden;
  margin: 0 16px 16px 16px;
}

.request-table {
  background: white;
  border-radius: 10px;
  overflow: hidden;
}

.table-header-row {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.table-header-cell {
  padding: 12px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  text-align: left;
  border: none;
  white-space: nowrap;
}

.table-body-row {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-body-row:hover {
  background: #f8fafc;
}

.rejected-row {
  opacity: 0.6;
  background: #fef2f2;
}

.rejected-row:hover {
  background: #fee2e2;
}

.table-body-cell {
  padding: 12px 10px;
  font-size: 13px;
  color: #374151;
  border: none;
  vertical-align: middle;
}

/* Employee Cell */
.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.employee-name {
  font-weight: 500;
  color: #1a202c;
  font-size: 13px;
}

.employee-dept {
  font-size: 11px;
  color: #64748b;
}

/* Type Badge */
.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.type-badge.leave {
  background: #eff6ff;
  color: #1d4ed8;
}

.type-badge.timeoff {
  background: #f3e8ff;
  color: #7c3aed;
}

.type-badge.schedule {
  background: #fef3c7;
  color: #d97706;
}

.type-badge.overtime {
  background: #d1fae5;
  color: #059669;
}

/* Date Cell */
.dates-cell {
  min-width: 160px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.start-date,
.end-date {
  font-size: 13px;
  color: #1a202c;
  font-weight: 500;
  white-space: nowrap;
}

.date-separator {
  color: #94a3b8;
  font-size: 11px;
}

.duration {
  color: #64748b;
  font-size: 11px;
}

/* Reason Cell */
.reason-cell {
  max-width: 250px;
}

.reason-text {
  font-size: 13px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

/* Status Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.status-approved {
  background: #dcfce7;
  color: #16a34a;
}

.status-rejected {
  background: #fee2e2;
  color: #dc2626;
}

.status-default {
  background: #f3f4f6;
  color: #374151;
}

/* Action Buttons */
.actions-cell {
  width: 120px;
  min-width: 120px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
}

.action-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.view-btn {
  background: #dbeafe;
  color: #3b82f6;
}

.view-btn:hover {
  background: #bfdbfe;
}

.approve-btn {
  background: #dcfce7;
  color: #16a34a;
}

.approve-btn:hover {
  background: #bbf7d0;
}

.reject-btn {
  background: #fef2f2;
  color: #ef4444;
}

.reject-btn:hover {
  background: #fee2e2;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.empty-subtitle {
  color: #64748b;
  font-size: 13px;
}

/* ===================================
   MODAL STYLES
   =================================== */
.modal-card {
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.details-modal {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9fafb;
  flex-shrink: 0;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar {
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

.modal-close-btn {
  color: #6b7280;
}

.modal-close-btn:hover {
  background: #f3f4f6;
}

.modal-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
  margin-right: 16px;
}

.detail-value {
  font-size: 13px;
  color: #111827;
  text-align: right;
  word-break: break-word;
}

.reason-content,
.message-content {
  background: #ffffff;
  padding: 12px;
  border-radius: 6px;
  color: #374151;
  line-height: 1.6;
  font-size: 13px;
  border-left: 3px solid #e2e8f0;
  word-wrap: break-word;
}

.admin-response {
  background: #f0fdf4;
  padding: 12px;
  border-radius: 6px;
  color: #16a34a;
  line-height: 1.6;
  font-size: 13px;
  border-left: 3px solid #22c55e;
  word-wrap: break-word;
}

.response-meta {
  margin-top: 8px;
  font-size: 11px;
  color: #64748b;
}

.modal-footer {
  padding: 0;
  flex-shrink: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

/* Scrollbar */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ===================================
   RESPONSIVE BREAKPOINTS
   =================================== */

/* 1440px - Large Desktop */
@media (min-width: 1440px) {
  .dashboard-container {
    max-width: 1400px;
    padding: 20px;
  }

  .stats-section {
    gap: 16px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 14px 12px;
  }

  .action-buttons {
    gap: 5px;
  }

  .action-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
  }
}

/* 1024px - Desktop / Tablet Landscape */
@media (max-width: 1024px) {
  .dashboard-container {
    padding: 16px;
  }

  .page-header {
    padding: 14px;
  }

  .header-content {
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .header-search {
    min-width: 200px;
  }

  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .stats-card {
    padding: 14px;
  }

  .stats-icon-wrapper {
    width: 44px;
    height: 44px;
  }

  .stats-icon {
    font-size: 22px;
  }

  .stats-amount {
    font-size: 24px;
  }

  .stats-label {
    font-size: 12px;
  }

  .table-header {
    padding: 14px;
  }

  .modern-table-container {
    margin: 0 14px 14px 14px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 11px 8px;
    font-size: 12px;
  }

  .actions-cell {
    width: 110px;
    min-width: 110px;
  }

  .action-buttons {
    gap: 3px;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }

  .employee-info {
    gap: 8px;
  }

  .employee-name {
    font-size: 12px;
  }

  .modal-card {
    max-width: 90vw;
  }
}

/* 768px - Tablet Portrait */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .page-header {
    padding: 16px;
    margin-bottom: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    gap: 12px;
  }

  .refresh-btn,
  .header-search {
    width: 100%;
    max-width: 100%;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .stats-card {
    padding: 16px;
  }

  .stats-icon-wrapper {
    width: 44px;
    height: 44px;
  }

  .stats-icon {
    font-size: 22px;
  }

  .stats-amount {
    font-size: 24px;
  }

  .stats-label {
    font-size: 13px;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    gap: 12px;
  }

  .table-actions {
    width: 100%;
    flex-direction: column;
    gap: 10px;
  }

  .filter-select {
    width: 100%;
  }

  .modern-table-container {
    margin: 0 12px 12px 12px;
    overflow-x: auto;
    border-radius: 8px;
  }

  .request-table {
    min-width: 900px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 12px 8px;
    font-size: 12px;
  }

  .table-header-cell {
    white-space: nowrap;
  }

  .employee-info {
    gap: 8px;
  }

  .employee-name {
    font-size: 12px;
  }

  .dates-cell {
    min-width: 160px;
  }

  .reason-cell {
    max-width: 200px;
  }

  .actions-cell {
    width: 120px;
    min-width: 120px;
    padding: 12px 6px;
  }

  .action-buttons {
    gap: 3px;
    justify-content: center;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
  }

  .status-badge {
    font-size: 11px;
    padding: 4px 10px;
  }

  .modal-card {
    margin: 12px;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
  }

  .modal-header {
    padding: 16px;
  }

  .modal-title-section {
    gap: 12px;
  }

  .modal-title {
    font-size: 18px;
  }

  .modal-subtitle {
    font-size: 13px;
  }

  .modal-content {
    padding: 16px;
  }

  .detail-section {
    padding: 16px;
  }

  .section-title {
    font-size: 15px;
    margin-bottom: 12px;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 10px 0;
  }

  .detail-value {
    text-align: left;
  }

  .form-actions {
    flex-direction: column-reverse;
    gap: 8px;
    padding: 16px;
  }

  .form-actions button {
    width: 100%;
  }
}

/* Small Mobile - 480px and below */
@media (max-width: 480px) {
  .dashboard-container {
    padding: 12px;
  }

  .page-header {
    padding: 12px;
    border-radius: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .stats-card {
    padding: 14px;
  }

  .stats-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .stats-icon {
    font-size: 20px;
  }

  .stats-amount {
    font-size: 22px;
  }

  .stats-label {
    font-size: 12px;
  }

  .table-header {
    padding: 12px;
  }

  .table-title {
    font-size: 18px;
  }

  .modern-table-container {
    margin: 0 8px 8px 8px;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }

  .modal-header {
    padding: 12px;
  }

  .modal-title {
    font-size: 16px;
  }

  .empty-state {
    padding: 40px 16px;
  }

  .empty-title {
    font-size: 15px;
  }

  .empty-subtitle {
    font-size: 12px;
  }
}
</style>
