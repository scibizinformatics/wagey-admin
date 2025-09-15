<template>
  <div class="request-page">
    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading requests...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Failed to load requests</h3>
      <p>{{ error }}</p>
      <button @click="fetchRequests" class="btn btn-retry">Retry</button>
    </div>

    <!-- Main Content -->
    <div v-if="!loading && !error">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">Employee Requests</h1>
        <div class="header-stats">
          <div class="stat-card pending">
            <span class="stat-number">{{ pendingCount }}</span>
            <span class="stat-label">Pending</span>
          </div>
          <div class="stat-card approved">
            <span class="stat-number">{{ approvedCount }}</span>
            <span class="stat-label">Approved</span>
          </div>
          <div class="stat-card rejected">
            <span class="stat-number">{{ rejectedCount }}</span>
            <span class="stat-label">Rejected</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select v-model="selectedType" class="filter-select">
          <option value="">All Request Types</option>
          <option value="leave">Leave Request</option>
          <option value="timeoff">Time-Off</option>
          <option value="schedule">Schedule Exchange</option>
          <option value="overtime">Overtime</option>
        </select>

        <select v-model="selectedStatus" class="filter-select">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by employee name..."
          class="search-input"
        />

        <button @click="fetchRequests" class="btn btn-refresh" title="Refresh">🔄 Refresh</button>
      </div>

      <!-- Requests List -->
      <div class="requests-container">
        <div
          v-for="request in filteredRequests"
          :key="request.id"
          class="request-card"
          :class="request.status"
        >
          <!-- Request Header -->
          <div class="request-header">
            <div class="request-info">
              <h3 class="employee-name">{{ request.employeeName }}</h3>
              <span class="request-type" :class="request.type">
                {{ formatRequestType(request.type) }}
              </span>
            </div>
            <div class="request-meta">
              <span class="request-date">{{ formatDate(request.submittedDate) }}</span>
              <span class="status-badge" :class="request.status">
                {{ request.status.toUpperCase() }}
              </span>
            </div>
          </div>

          <!-- Request Details -->
          <div class="request-details">
            <div class="detail-item">
              <strong>Period:</strong>
              {{ formatDate(request.startDate) }} - {{ formatDate(request.endDate) }}
            </div>
            <div class="detail-item" v-if="request.duration">
              <strong>Duration:</strong> {{ request.duration }}
            </div>
            <div class="detail-item" v-if="request.reason">
              <strong>Reason:</strong> {{ request.reason }}
            </div>
          </div>

          <!-- Request Message -->
          <div class="request-message" v-if="request.message">
            <h4>Message:</h4>
            <p>{{ request.message }}</p>
          </div>

          <!-- Admin Response -->
          <div class="admin-response" v-if="request.adminResponse">
            <h4>Admin Response:</h4>
            <p>{{ request.adminResponse }}</p>
            <small
              >Responded by {{ request.respondedBy }} on
              {{ formatDate(request.respondedDate) }}</small
            >
          </div>

          <!-- Action Buttons (only for pending requests) -->
          <div v-if="request.status === 'pending'" class="action-buttons">
            <button
              @click="showResponseModal(request, 'approve')"
              class="btn btn-approve"
              :disabled="updating"
            >
              <i class="icon-check"></i>
              {{ updating ? 'Processing...' : 'Approve' }}
            </button>
            <button
              @click="showResponseModal(request, 'reject')"
              class="btn btn-reject"
              :disabled="updating"
            >
              <i class="icon-x"></i>
              {{ updating ? 'Processing...' : 'Reject' }}
            </button>
          </div>

          <!-- View Details Button -->
          <div class="view-details">
            <button @click="viewDetails(request)" class="btn btn-details">View Full Details</button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredRequests.length === 0 && !loading" class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No requests found</h3>
          <p>
            {{
              requests.length === 0
                ? 'No requests available.'
                : 'No requests match your current filters.'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Response Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ modalAction === 'approve' ? 'Approve' : 'Reject' }} Request</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <div class="request-summary">
            <p><strong>Employee:</strong> {{ selectedRequest?.employeeName }}</p>
            <p><strong>Request Type:</strong> {{ formatRequestType(selectedRequest?.type) }}</p>
            <p>
              <strong>Period:</strong> {{ formatDate(selectedRequest?.startDate) }} -
              {{ formatDate(selectedRequest?.endDate) }}
            </p>
          </div>

          <div class="response-form">
            <label for="adminResponse">Response Message:</label>
            <textarea
              id="adminResponse"
              v-model="adminResponseText"
              :placeholder="
                modalAction === 'approve'
                  ? 'Optional approval message...'
                  : 'Please provide a reason for rejection...'
              "
              rows="4"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-cancel" :disabled="updating">Cancel</button>
          <button
            @click="submitResponse"
            class="btn"
            :class="modalAction === 'approve' ? 'btn-approve' : 'btn-reject'"
            :disabled="
              !selectedRequest ||
              (modalAction === 'reject' && !adminResponseText.trim()) ||
              updating
            "
          >
            {{
              updating
                ? 'Processing...'
                : modalAction === 'approve'
                  ? 'Approve Request'
                  : 'Reject Request'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal modal-large" @click.stop>
        <div class="modal-header">
          <h3>Request Details</h3>
          <button @click="closeDetailsModal" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <div class="details-grid" v-if="detailsRequest">
            <div class="detail-section">
              <h4>Employee Information</h4>
              <p><strong>Name:</strong> {{ detailsRequest.employeeName }}</p>
              <p><strong>Employee ID:</strong> {{ detailsRequest.employeeId }}</p>
              <p><strong>Department:</strong> {{ detailsRequest.department }}</p>
              <p><strong>Position:</strong> {{ detailsRequest.position }}</p>
            </div>

            <div class="detail-section">
              <h4>Request Information</h4>
              <p><strong>Type:</strong> {{ formatRequestType(detailsRequest.type) }}</p>
              <p>
                <strong>Status:</strong>
                <span class="status-badge" :class="detailsRequest.status">{{
                  detailsRequest.status.toUpperCase()
                }}</span>
              </p>
              <p><strong>Submitted:</strong> {{ formatDate(detailsRequest.submittedDate) }}</p>
              <p>
                <strong>Period:</strong> {{ formatDate(detailsRequest.startDate) }} -
                {{ formatDate(detailsRequest.endDate) }}
              </p>
              <p v-if="detailsRequest.duration">
                <strong>Duration:</strong> {{ detailsRequest.duration }}
              </p>
            </div>

            <div class="detail-section full-width" v-if="detailsRequest.reason">
              <h4>Reason</h4>
              <p>{{ detailsRequest.reason }}</p>
            </div>

            <div class="detail-section full-width" v-if="detailsRequest.message">
              <h4>Employee Message</h4>
              <p>{{ detailsRequest.message }}</p>
            </div>

            <div class="detail-section full-width" v-if="detailsRequest.adminResponse">
              <h4>Admin Response</h4>
              <p>{{ detailsRequest.adminResponse }}</p>
              <small
                >Responded by {{ detailsRequest.respondedBy }} on
                {{ formatDate(detailsRequest.respondedDate) }}</small
              >
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDetailsModal" class="btn btn-cancel">Close</button>
          <div v-if="detailsRequest?.status === 'pending'" class="action-buttons-modal">
            <button @click="approveFromDetails" class="btn btn-approve" :disabled="updating">
              {{ updating ? 'Processing...' : 'Approve' }}
            </button>
            <button @click="rejectFromDetails" class="btn btn-reject" :disabled="updating">
              {{ updating ? 'Processing...' : 'Reject' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="success-toast">
      {{ successMessage }}
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'RequestPage',
  data() {
    return {
      // API base URL
      apiBaseUrl: 'https://staging.wageyapp.com/attendance/leaves/company/',

      // Data states
      requests: [],
      loading: false,
      error: null,
      updating: false,
      successMessage: '',

      // Filter states
      selectedType: '',
      selectedStatus: '',
      searchQuery: '',

      // Modal states
      showModal: false,
      showDetailsModal: false,
      modalAction: '',
      selectedRequest: null,
      detailsRequest: null,
      adminResponseText: '',
    }
  },
  computed: {
    filteredRequests() {
      let filtered = this.requests

      if (this.selectedType) {
        filtered = filtered.filter((r) => r.type === this.selectedType)
      }
      if (this.selectedStatus) {
        filtered = filtered.filter((r) => r.status === this.selectedStatus)
      }
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(
          (r) =>
            r.employeeName?.toLowerCase().includes(query) ||
            r.department?.toLowerCase().includes(query) ||
            r.position?.toLowerCase().includes(query),
        )
      }

      return filtered.sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
    },

    pendingCount() {
      return this.requests.filter((r) => r.status === 'pending').length
    },
    approvedCount() {
      return this.requests.filter((r) => r.status === 'approved').length
    },
    rejectedCount() {
      return this.requests.filter((r) => r.status === 'rejected').length
    },
  },
  methods: {
    // ✅ Fetch requests with axios
    async fetchRequests() {
      this.loading = true
      this.error = null

      try {
        const token = localStorage.getItem('access_token')
        const response = await axios.get(this.apiBaseUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        console.log('API Response:', response.data)

        this.requests = this.mapApiResponseToRequests(
          Array.isArray(response.data)
            ? response.data
            : response.data.results || response.data.data || [],
        )
      } catch (err) {
        console.error('Failed to fetch requests:', err)
        this.error =
          err.response?.data?.message ||
          err.message ||
          'Failed to fetch requests. Please try again.'
      } finally {
        this.loading = false
      }
    },

    // ✅ Update request status
    async updateRequestStatus(requestId, action, responseMessage) {
      if (!requestId) {
        console.error('Request ID is missing')
        this.showSuccessMessage('Request ID is missing.')
        return
      }

      this.updating = true
      try {
        const token = localStorage.getItem('access_token')

        const payload = {
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_response:
            responseMessage || (action === 'approve' ? 'approved.' : 'Request rejected.'),
          // Removed approved_by and approved_at to avoid 403 if server handles this automatically
        }

        await axios.patch(
          `https://staging.wageyapp.com/attendance/leaves/${requestId}/update/`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        )

        this.showSuccessMessage(`Request ${action}d successfully.`)
        await this.fetchRequests() // refresh the list
      } catch (error) {
        console.error('Error updating request status:', error)

        if (error.response?.status === 403) {
          this.showSuccessMessage('You are not authorized to update this request.')
        } else if (error.response?.data?.message) {
          this.showSuccessMessage(`Failed: ${error.response.data.message}`)
        } else {
          this.showSuccessMessage('An unexpected error occurred. Please try again.')
        }
      } finally {
        this.updating = false
      }
    },

    // ✅ Map API response to local structure
    mapApiResponseToRequests(apiData) {
      return apiData.map((item) => ({
        id: item.id,
        employeeId: item.employee_id || item.employee?.id,
        employeeName: item.employee_name || item.employee?.name || item.employee?.full_name,
        department: item.department || item.employee?.department,
        position: item.position || item.employee?.position,
        type: this.mapLeaveType(item.leave_type || item.type),
        status: item.status?.toLowerCase(),
        startDate: item.start_date,
        endDate: item.end_date,
        duration: item.duration || this.calculateDuration(item.start_date, item.end_date),
        reason: item.reason,
        message: item.message || item.description,
        submittedDate: item.created_at || item.submitted_date,
        adminResponse: item.admin_response,
        respondedBy: item.responded_by,
        respondedDate: item.responded_date || item.updated_at,
      }))
    },

    mapLeaveType(apiLeaveType) {
      const map = {
        sick_leave: 'leave',
        annual_leave: 'leave',
        personal_leave: 'leave',
        vacation: 'leave',
        time_off: 'timeoff',
        schedule_change: 'schedule',
        overtime: 'overtime',
      }
      return map[apiLeaveType] || 'leave'
    },

    calculateDuration(startDate, endDate) {
      if (!startDate || !endDate) return ''
      const s = new Date(startDate)
      const e = new Date(endDate)
      const diffDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`
    },

    // Helpers
    getCurrentAdminName() {
      return 'Admin User'
    },

    showSuccessMessage(msg) {
      this.successMessage = msg
      setTimeout(() => (this.successMessage = ''), 3000)
    },

    // UI Helpers
    formatRequestType(type) {
      const map = {
        leave: 'Leave Request',
        timeoff: 'Time-Off',
        schedule: 'Schedule Exchange',
        overtime: 'Overtime Request',
      }
      return map[type] || type
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    },

    // Modal handlers
    showResponseModal(request, action) {
      this.selectedRequest = request
      this.modalAction = action
      this.adminResponseText = ''
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.selectedRequest = null
      this.modalAction = ''
      this.adminResponseText = ''
    },
    viewDetails(req) {
      this.detailsRequest = req
      this.showDetailsModal = true
    },
    closeDetailsModal() {
      this.showDetailsModal = false
      this.detailsRequest = null
    },
    approveFromDetails() {
      this.closeDetailsModal()
      this.showResponseModal(this.detailsRequest, 'approve')
    },
    rejectFromDetails() {
      this.closeDetailsModal()
      this.showResponseModal(this.detailsRequest, 'reject')
    },
    submitResponse() {
      if (!this.selectedRequest) return
      this.updateRequestStatus(
        this.selectedRequest.id, // 👈 id comes from your API response
        this.modalAction,
        this.adminResponseText,
      )
      this.closeModal()
    },
  },
  async mounted() {
    await this.fetchRequests()
  },
}
</script>

<style scoped>
.request-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Header Styles */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.page-title {
  color: #1f2937;
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 20px;
}

.stat-card {
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-width: 80px;
}

.stat-card.pending {
  border-left: 4px solid #f59e0b;
}

.stat-card.approved {
  border-left: 4px solid #10b981;
}

.stat-card.rejected {
  border-left: 4px solid #ef4444;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Filter Styles */
.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.filter-select,
.search-input {
  padding: 10px 15px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.filter-select:focus,
.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input {
  flex: 1;
  min-width: 250px;
}

.btn-refresh {
  background-color: #6366f1;
  color: white;
  white-space: nowrap;
}

.btn-refresh:hover {
  background-color: #5338f5;
}

.btn-retry {
  background-color: #ef4444;
  color: white;
}

.btn-retry:hover {
  background-color: #dc2626;
}

/* Loading and Error States */
.loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 300px;
  gap: 20px;
}

.spinner {
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #ef4444;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.error-state h3 {
  margin: 0 0 8px 0;
  color: #dc2626;
}

.error-state p {
  margin: 0 0 20px 0;
  color: #6b7280;
}

/* Success Toast */
.success-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #10b981;
  color: white;
  padding: 12px 20px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Request Card Styles */
.requests-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.request-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #e5e7eb;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.request-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.request-card.pending {
  border-left-color: #f59e0b;
}

.request-card.approved {
  border-left-color: #10b981;
}

.request-card.rejected {
  border-left-color: #ef4444;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.employee-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.request-type {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.request-type.leave {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.request-type.timeoff {
  background-color: #f3e8ff;
  color: #7c3aed;
}

.request-type.schedule {
  background-color: #fef3c7;
  color: #d97706;
}

.request-type.overtime {
  background-color: #dcfce7;
  color: #16a34a;
}

.request-meta {
  text-align: right;
}

.request-date {
  display: block;
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.pending {
  background-color: #fef3c7;
  color: #d97706;
}

.status-badge.approved {
  background-color: #dcfce7;
  color: #16a34a;
}

.status-badge.rejected {
  background-color: #fee2e2;
  color: #dc2626;
}

.request-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.detail-item {
  font-size: 0.875rem;
  color: #374151;
}

.request-message,
.admin-response {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 8px;
}

.request-message {
  background-color: #f0f9ff;
  border-left: 3px solid #0ea5e9;
}

.admin-response {
  background-color: #f0fdf4;
  border-left: 3px solid #22c55e;
}

.request-message h4,
.admin-response h4 {
  margin: 0 0 8px 0;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.request-message p,
.admin-response p {
  margin: 0;
  color: #374151;
  line-height: 1.5;
}

.admin-response small {
  display: block;
  margin-top: 8px;
  color: #6b7280;
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.view-details {
  display: flex;
  justify-content: flex-end;
}

/* Button Styles */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve {
  background-color: #10b981;
  color: white;
}

.btn-approve:hover:not(:disabled) {
  background-color: #059669;
}

.btn-reject {
  background-color: #ef4444;
  color: white;
}

.btn-reject:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-details {
  background-color: #6b7280;
  color: white;
}

.btn-details:hover {
  background-color: #4b5563;
}

.btn-cancel {
  background-color: #e5e7eb;
  color: #374151;
}

.btn-cancel:hover {
  background-color: #d1d5db;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.2);
}

.modal-large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background-color: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.request-summary {
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.request-summary p {
  margin: 8px 0;
  font-size: 0.875rem;
}

.response-form label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #374151;
}

.response-form textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  resize: vertical;
}

.response-form textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.action-buttons-modal {
  display: flex;
  gap: 12px;
}

/* Details Modal Specific Styles */
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.detail-section {
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
}

.detail-section.full-width {
  grid-column: 1 / -1;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #4b5563;
  letter-spacing: 0.05em;
}

.detail-section p {
  margin: 8px 0;
  color: #374151;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
}

.empty-state p {
  margin: 0;
}

/* Icons */
.icon-check::before {
  content: '✓';
}

.icon-x::before {
  content: '✕';
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .header-stats {
    justify-content: center;
  }

  .filters {
    flex-direction: column;
  }

  .filter-select,
  .search-input {
    width: 100%;
  }

  .request-header {
    flex-direction: column;
    gap: 12px;
  }

  .request-meta {
    text-align: left;
  }

  .request-details {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .modal {
    margin: 10px;
    width: calc(100% - 20px);
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .action-buttons-modal {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .request-page {
    padding: 10px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .request-card {
    padding: 16px;
  }

  .btn {
    padding: 8px 16px;
    font-size: 0.8rem;
  }

  .modal-body,
  .modal-header,
  .modal-footer {
    padding: 16px;
  }
}

/* Animation for smooth transitions */
.request-card {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Accessibility improvements */
.btn:focus,
.filter-select:focus,
.search-input:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.request-card:focus-within {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Print styles */
@media print {
  .action-buttons,
  .view-details,
  .filters,
  .modal-overlay,
  .btn-refresh {
    display: none !important;
  }

  .request-card {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #e5e7eb;
  }
}
</style>
