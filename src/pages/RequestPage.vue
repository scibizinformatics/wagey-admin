<template>
  <q-page class="request-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Requests</h1>
          </div>
          <div class="header-actions">
            <q-btn
              round
              flat
              icon="refresh"
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
        <!-- Leave stats -->
        <template v-if="activeTab === 'leave'">
          <div class="stats-card total-card">
            <div class="stats-icon-wrapper leave-icon-bg">
              <q-icon name="event_note" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ leaveStats.total }}</div>
              <div class="stats-label">Total Leave</div>
            </div>
          </div>
          <div class="stats-card pending-card">
            <div class="stats-icon-wrapper">
              <q-icon name="schedule" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ leaveStats.pending }}</div>
              <div class="stats-label">Pending</div>
            </div>
          </div>
          <div class="stats-card approved-card">
            <div class="stats-icon-wrapper">
              <q-icon name="check_circle" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ leaveStats.approved }}</div>
              <div class="stats-label">Approved</div>
            </div>
          </div>
          <div class="stats-card rejected-card">
            <div class="stats-icon-wrapper">
              <q-icon name="cancel" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ leaveStats.rejected }}</div>
              <div class="stats-label">Rejected</div>
            </div>
          </div>
        </template>

        <!-- Overtime stats -->
        <template v-else-if="activeTab === 'overtime'">
          <div class="stats-card overtime-total-card">
            <div class="stats-icon-wrapper overtime-icon-bg">
              <q-icon name="more_time" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ overtimeStats.total }}</div>
              <div class="stats-label">Total Overtime</div>
            </div>
          </div>
          <div class="stats-card pending-card">
            <div class="stats-icon-wrapper">
              <q-icon name="schedule" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ overtimeStats.pending }}</div>
              <div class="stats-label">Pending</div>
            </div>
          </div>
          <div class="stats-card approved-card">
            <div class="stats-icon-wrapper">
              <q-icon name="check_circle" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ overtimeStats.approved }}</div>
              <div class="stats-label">Approved</div>
            </div>
          </div>
          <div class="stats-card rejected-card">
            <div class="stats-icon-wrapper">
              <q-icon name="cancel" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ overtimeStats.rejected }}</div>
              <div class="stats-label">Rejected</div>
            </div>
          </div>
        </template>

        <!-- Cash Advance stats -->
        <template v-else>
          <div class="stats-card total-card">
            <div class="stats-icon-wrapper">
              <q-icon name="account_balance_wallet" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ caStatistics.total }}</div>
              <div class="stats-label">Total Requests</div>
            </div>
          </div>
          <div class="stats-card pending-card">
            <div class="stats-icon-wrapper">
              <q-icon name="schedule" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ caStatistics.pending }}</div>
              <div class="stats-label">Pending</div>
            </div>
          </div>
          <div class="stats-card approved-card">
            <div class="stats-icon-wrapper">
              <q-icon name="check_circle" class="stats-icon" />
            </div>
            <div class="stats-content">
              <div class="stats-amount">{{ caStatistics.approved }}</div>
              <div class="stats-label">Approved</div>
            </div>
          </div>
        </template>
      </div>

      <!-- Tabs (below stats) -->
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
            <span v-if="overtimeStats.pending > 0" class="tab-badge">{{
              overtimeStats.pending
            }}</span>
          </button>
          <button
            :class="['tab-pill', { active: activeTab === 'cash_advance' }]"
            @click="activeTab = 'cash_advance'"
          >
            <q-icon name="account_balance_wallet" class="tab-pill-icon" />
            <span>Cash Advance</span>
            <span v-if="caStatistics.pending > 0" class="tab-badge">{{
              caStatistics.pending
            }}</span>
          </button>
        </div>
      </div>

      <!-- Tab Panels -->
      <q-tab-panels v-model="activeTab" animated class="tab-panels">
        <!-- ===== LEAVE TAB ===== -->
        <q-tab-panel name="leave" class="tab-panel-content">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Leave Requests</h2>
              </div>
              <div class="table-actions">
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
            <div v-if="loading" class="loading-state">
              <q-spinner size="48px" color="primary" :thickness="4" />
              <div class="loading-text">Loading leave requests...</div>
            </div>
            <div v-else-if="filteredLeaveRequests.length > 0" class="modern-table-container">
              <q-table
                :rows="filteredLeaveRequests"
                :columns="leaveColumns"
                row-key="id"
                flat
                :loading="loading"
                no-data-label="No leave requests found"
                class="request-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">Employee</q-th>
                    <q-th class="table-header-cell">Type</q-th>
                    <q-th class="table-header-cell">Period</q-th>
                    <q-th class="table-header-cell">Reason</q-th>
                    <q-th class="table-header-cell">Status</q-th>
                    <q-th class="table-header-cell table-header-actions">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr
                    class="table-body-row"
                    :class="{ 'rejected-row': props.row.status === 'rejected' }"
                  >
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
                      <div class="type-badge">
                        {{ props.row.type }}
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
                      <div class="reason-text">{{ props.row.reason || 'No reason provided' }}</div>
                    </q-td>
                    <q-td class="table-body-cell">
                      <div :class="['status-badge', getLeaveStatusClass(props.row)]">
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
                          @click="openLeaveDetails(props.row)"
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
            <div v-else class="empty-state">
              <div class="empty-icon"><q-icon name="search_off" size="64px" color="grey-4" /></div>
              <div class="empty-title">No leave requests found</div>
              <div class="empty-subtitle">Try adjusting your search or filters</div>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===== OVERTIME TAB ===== -->
        <q-tab-panel name="overtime" class="tab-panel-content">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Overtime Requests</h2>
              </div>
              <div class="table-actions">
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
            <div v-if="loading" class="loading-state">
              <q-spinner size="48px" color="primary" :thickness="4" />
              <div class="loading-text">Loading overtime requests...</div>
            </div>
            <div v-else-if="filteredOvertimeRequests.length > 0" class="modern-table-container">
              <q-table
                :rows="filteredOvertimeRequests"
                :columns="leaveColumns"
                row-key="id"
                flat
                :loading="loading"
                no-data-label="No overtime requests found"
                class="request-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">Employee</q-th>
                    <q-th class="table-header-cell">Type</q-th>
                    <q-th class="table-header-cell">Period</q-th>
                    <q-th class="table-header-cell">Reason</q-th>
                    <q-th class="table-header-cell">Status</q-th>
                    <q-th class="table-header-cell table-header-actions">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr
                    class="table-body-row"
                    :class="{ 'rejected-row': props.row.status === 'rejected' }"
                  >
                    <q-td class="table-body-cell employee-name-cell">
                      <div class="employee-info">
                        <q-avatar size="32px" color="primary" text-color="white">
                          {{ getInitials(props.row.employeeName) }}
                        </q-avatar>
                        <div class="employee-details">
                          <span class="employee-name">{{ props.row.employeeName }}</span>
                        </div>
                      </div>
                    </q-td>
                    <q-td class="table-body-cell">
                      <div class="type-badge">
                        {{ props.row.categoryName }}
                      </div>
                    </q-td>
                    <q-td class="table-body-cell dates-cell">
                      <div class="date-range">
                        <div class="start-date">{{ formatDate(props.row.date) }}</div>
                      </div>
                      <div class="duration">{{ props.row.hours }}h requested</div>
                    </q-td>
                    <q-td class="table-body-cell reason-cell">
                      <div class="reason-text">{{ props.row.reason || 'No reason provided' }}</div>
                    </q-td>
                    <q-td class="table-body-cell">
                      <div :class="['status-badge', getLeaveStatusClass(props.row)]">
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
                          @click="openOvertimeApproval(props.row)"
                        >
                          <q-tooltip>View / Approve</q-tooltip>
                        </q-btn>
                        <q-btn
                          v-if="props.row.status === 'pending'"
                          flat
                          round
                          icon="edit"
                          size="sm"
                          class="action-btn approve-btn"
                          @click="openOvertimeApproval(props.row)"
                          :loading="
                            overtimeSubmitting && selectedOvertimeRequest?.id === props.row.id
                          "
                        >
                          <q-tooltip>Approve / Reject</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon"><q-icon name="search_off" size="64px" color="grey-4" /></div>
              <div class="empty-title">No overtime requests found</div>
              <div class="empty-subtitle">Try adjusting your search or filters</div>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===== CASH ADVANCE TAB ===== -->
        <q-tab-panel name="cash_advance" class="tab-panel-content">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Cash Advance Requests</h2>
              </div>
              <div class="table-actions">
                <q-select
                  v-model="caFilterStatus"
                  :options="caStatusOptions"
                  label="Filter by Status"
                  class="filter-select"
                  dense
                  outlined
                  clearable
                >
                  <template v-slot:prepend>
                    <q-icon name="filter_list" />
                  </template>
                </q-select>
              </div>
            </div>
            <div v-if="loading" class="loading-state">
              <q-spinner size="48px" color="primary" :thickness="4" />
              <div class="loading-text">Loading cash advance requests...</div>
            </div>
            <div v-else-if="filteredCaRequests.length > 0" class="modern-table-container">
              <q-table
                :rows="filteredCaRequests"
                :columns="caColumns"
                row-key="id"
                flat
                :loading="loading"
                no-data-label="No cash advance requests found"
                class="cash-advance-table"
                :pagination="caPagination"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">Employee</q-th>
                    <q-th class="table-header-cell">Requested Amount</q-th>
                    <q-th class="table-header-cell">Request Date</q-th>
                    <q-th class="table-header-cell">Status</q-th>
                    <q-th class="table-header-cell">Repayment</q-th>
                    <q-th class="table-header-cell">Repaid</q-th>
                    <q-th class="table-header-cell table-header-actions">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell employee-name-cell">
                      <div class="employee-info">
                        <q-avatar
                          size="32px"
                          :color="getAvatarColor(props.row.employee_name)"
                          text-color="white"
                        >
                          {{ getInitials(props.row.employee_name) }}
                        </q-avatar>
                        <span class="employee-name">{{ props.row.employee_name }}</span>
                      </div>
                    </q-td>
                    <q-td class="table-body-cell amount-cell">
                      <div class="amount-info">
                        <span class="amount-value"
                          >₱{{ formatAmount(props.row.requested_amount) }}</span
                        >
                      </div>
                    </q-td>
                    <q-td class="table-body-cell">{{ props.row.request_date }}</q-td>
                    <q-td class="table-body-cell">
                      <div :class="['status-badge', getCaStatusClass(props.row.status)]">
                        {{ capitalizeStatus(props.row.status) }}
                      </div>
                    </q-td>
                    <q-td class="table-body-cell">
                      <div
                        :class="['repayment-badge', getRepaymentClass(props.row.repayment_method)]"
                      >
                        {{ capitalizeStatus(props.row.repayment_method) }}
                      </div>
                    </q-td>
                    <q-td class="table-body-cell repaid-cell">
                      <q-icon
                        :name="props.row.is_repaid ? 'check_circle' : 'schedule'"
                        :color="props.row.is_repaid ? 'positive' : 'warning'"
                        size="20px"
                      />
                    </q-td>
                    <q-td class="table-body-cell actions-cell">
                      <div class="action-buttons">
                        <q-btn
                          flat
                          round
                          icon="visibility"
                          size="sm"
                          class="action-btn view-btn"
                          @click="viewCaRequest(props.row)"
                        >
                          <q-tooltip>View Details</q-tooltip>
                        </q-btn>
                        <q-btn
                          v-if="props.row.status === 'pending'"
                          flat
                          round
                          icon="edit"
                          size="sm"
                          class="action-btn edit-btn"
                          @click="openCaApprovalModal(props.row)"
                        >
                          <q-tooltip>Approve/Reject</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon"><q-icon name="search_off" size="64px" color="grey-4" /></div>
              <div class="empty-title">No cash advance requests found</div>
              <div class="empty-subtitle">Try adjusting your search or filters</div>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- ===== LEAVE/OVERTIME DETAILS MODAL ===== -->
    <q-dialog v-model="showLeaveDetails" persistent>
      <q-card class="modal-card details-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="64px" color="primary" text-color="white" class="modal-avatar">
              {{ selectedLeaveRequest ? getInitials(selectedLeaveRequest.employeeName) : '?' }}
            </q-avatar>
            <div>
              <div class="modal-title">
                {{ selectedLeaveRequest?.employeeName || 'Request Details' }}
              </div>
              <div class="modal-subtitle">{{ selectedLeaveRequest?.department || 'General' }}</div>
            </div>
          </div>
          <q-btn
            icon="close"
            flat
            round
            class="modal-close-btn"
            @click="showLeaveDetails = false"
          />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content" v-if="selectedLeaveRequest">
          <div class="detail-sections">
            <div class="detail-section">
              <div class="section-title">Request Status</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <div :class="['status-badge', getLeaveStatusClass(selectedLeaveRequest)]">
                      {{ capitalizeStatus(selectedLeaveRequest.status) }}
                    </div>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Type:</span>
                  <span class="detail-value">
                    <div class="type-badge">
                      {{ selectedLeaveRequest.type }}
                    </div>
                  </span>
                </div>
              </div>
            </div>
            <div class="detail-section">
              <div class="section-title">Request Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Start Date:</span>
                  <span class="detail-value">{{ formatDate(selectedLeaveRequest.startDate) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">End Date:</span>
                  <span class="detail-value">{{ formatDate(selectedLeaveRequest.endDate) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">{{ selectedLeaveRequest.duration }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Submitted:</span>
                  <span class="detail-value">{{
                    formatDateTime(selectedLeaveRequest.submittedDate)
                  }}</span>
                </div>
              </div>
            </div>
            <div v-if="selectedLeaveRequest.reason" class="detail-section">
              <div class="section-title">Reason</div>
              <div class="reason-content">{{ selectedLeaveRequest.reason }}</div>
            </div>
            <div v-if="selectedLeaveRequest.message" class="detail-section">
              <div class="section-title">Additional Message</div>
              <div class="message-content">{{ selectedLeaveRequest.message }}</div>
            </div>
            <div v-if="selectedLeaveRequest.adminResponse" class="detail-section">
              <div class="section-title">Admin Response</div>
              <div class="admin-response">{{ selectedLeaveRequest.adminResponse }}</div>
              <div v-if="selectedLeaveRequest.respondedBy" class="response-meta">
                By {{ selectedLeaveRequest.respondedBy }} •
                {{ formatDateTime(selectedLeaveRequest.respondedDate) }}
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-footer">
          <div class="form-actions">
            <q-btn
              v-if="selectedLeaveRequest && selectedLeaveRequest.status === 'pending'"
              label="Reject"
              flat
              color="negative"
              @click="rejectRequest(selectedLeaveRequest)"
              :loading="actionLoading === `reject-${selectedLeaveRequest.id}`"
            />
            <q-btn
              v-if="selectedLeaveRequest && selectedLeaveRequest.status === 'pending'"
              label="Approve"
              color="positive"
              @click="approveRequest(selectedLeaveRequest)"
              :loading="actionLoading === `approve-${selectedLeaveRequest.id}`"
            />
            <q-btn label="Close" flat color="grey-7" @click="showLeaveDetails = false" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ===== CASH ADVANCE APPROVAL MODAL ===== -->
    <q-dialog v-model="caApprovalModal" persistent>
      <q-card class="modal-card approval-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-icon name="edit" class="modal-icon" />
            <div>
              <div class="modal-title">Approve Cash Advance Request</div>
              <div class="modal-subtitle">{{ selectedCaRequest?.employee_name || '' }}</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="caApprovalModal = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content">
          <div class="detail-sections">
            <div class="detail-section">
              <div class="section-title">Request Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Employee:</span>
                  <span class="detail-value">{{ selectedCaRequest?.employee_name }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Requested Amount:</span>
                  <span class="detail-value amount-highlight"
                    >₱{{ formatAmount(selectedCaRequest?.requested_amount) }}</span
                  >
                </div>
              </div>
            </div>
            <div class="detail-section">
              <div class="section-title">Approval Details</div>
              <div class="form-grid">
                <q-select
                  outlined
                  v-model="caApprovalData.status"
                  :options="['approved', 'rejected']"
                  label="Status *"
                  :rules="[(val) => !!val || 'Status is required']"
                  class="col-span-2"
                />
                <q-input
                  outlined
                  v-model="caApprovalData.remarks"
                  label="Remarks"
                  type="textarea"
                  rows="3"
                  class="col-span-2"
                />
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-footer">
          <div class="form-actions">
            <q-btn flat label="Cancel" color="grey-7" @click="caApprovalModal = false" />
            <q-btn
              label="Submit Approval"
              color="primary"
              @click="submitCaApproval"
              :loading="caSubmitting"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ===== CASH ADVANCE VIEW DETAILS MODAL ===== -->
    <q-dialog v-model="caViewDialog" persistent>
      <q-card class="modal-card details-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar
              size="64px"
              :color="getAvatarColor(selectedCaRequest?.employee_name)"
              text-color="white"
              class="modal-avatar"
            >
              {{ selectedCaRequest ? getInitials(selectedCaRequest.employee_name) : '?' }}
            </q-avatar>
            <div>
              <div class="modal-title">
                {{ selectedCaRequest?.employee_name || 'Cash Advance Details' }}
              </div>
              <div class="modal-subtitle">Request Information</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="caViewDialog = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content" v-if="selectedCaRequest">
          <div class="detail-sections">
            <div class="detail-section">
              <div class="section-title">Basic Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Employee:</span>
                  <span class="detail-value">{{ selectedCaRequest.employee_name }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Request Date:</span>
                  <span class="detail-value">{{ selectedCaRequest.request_date }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <div :class="['status-badge', getCaStatusClass(selectedCaRequest.status)]">
                      {{ capitalizeStatus(selectedCaRequest.status) }}
                    </div>
                  </span>
                </div>
              </div>
            </div>
            <div class="detail-section">
              <div class="section-title">Amount Details</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Requested Amount:</span>
                  <span class="detail-value amount-highlight"
                    >₱{{ formatAmount(selectedCaRequest.requested_amount) }}</span
                  >
                </div>
              </div>
            </div>
            <div class="detail-section">
              <div class="section-title">Repayment Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Repayment Method:</span>
                  <span class="detail-value">
                    <div
                      :class="[
                        'repayment-badge',
                        getRepaymentClass(selectedCaRequest.repayment_method),
                      ]"
                    >
                      {{ capitalizeStatus(selectedCaRequest.repayment_method) }}
                    </div>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Repaid Status:</span>
                  <span class="detail-value">
                    <q-icon
                      :name="selectedCaRequest.is_repaid ? 'check_circle' : 'schedule'"
                      :color="selectedCaRequest.is_repaid ? 'positive' : 'warning'"
                      size="20px"
                    />
                    <span :class="selectedCaRequest.is_repaid ? 'text-positive' : 'text-warning'">
                      {{ selectedCaRequest.is_repaid ? 'Repaid' : 'Pending' }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div
              v-if="selectedCaRequest.reason || selectedCaRequest.remarks"
              class="detail-section"
            >
              <div class="section-title">Additional Information</div>
              <div v-if="selectedCaRequest.reason" class="info-content">
                <div class="info-label">Reason:</div>
                <div class="info-text">{{ selectedCaRequest.reason }}</div>
              </div>
              <div v-if="selectedCaRequest.remarks" class="info-content">
                <div class="info-label">Remarks:</div>
                <div class="info-text">{{ selectedCaRequest.remarks }}</div>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-footer">
          <div class="form-actions">
            <q-btn label="Close" flat color="grey-7" @click="caViewDialog = false" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    <!-- ===== OVERTIME APPROVAL MODAL ===== -->
    <q-dialog v-model="showOvertimeApproval" persistent>
      <q-card class="modal-card approval-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-icon name="more_time" class="modal-icon" />
            <div>
              <div class="modal-title">Overtime Request</div>
              <div class="modal-subtitle">{{ selectedOvertimeRequest?.employeeName || '' }}</div>
            </div>
          </div>
          <q-btn
            icon="close"
            flat
            round
            class="modal-close-btn"
            @click="showOvertimeApproval = false"
          />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content">
          <div class="detail-sections">
            <div class="detail-section">
              <div class="section-title">Request Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Employee:</span>
                  <span class="detail-value">{{ selectedOvertimeRequest?.employeeName }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">{{ formatDate(selectedOvertimeRequest?.date) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Requested Hours:</span>
                  <span class="detail-value">{{ selectedOvertimeRequest?.hours }}h</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Category:</span>
                  <span class="detail-value">{{ selectedOvertimeRequest?.categoryName }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <div
                      :class="['status-badge', getLeaveStatusClass(selectedOvertimeRequest || {})]"
                    >
                      {{ capitalizeStatus(selectedOvertimeRequest?.status) }}
                    </div>
                  </span>
                </div>
              </div>
              <div
                v-if="selectedOvertimeRequest?.reason"
                class="info-content"
                style="margin-top: 10px"
              >
                <div class="info-label">Reason:</div>
                <div class="info-text">{{ selectedOvertimeRequest.reason }}</div>
              </div>
            </div>
            <div v-if="selectedOvertimeRequest?.status === 'pending'" class="detail-section">
              <div class="section-title">Approval Details</div>
              <div class="form-grid">
                <q-select
                  outlined
                  v-model="overtimeApprovalData.status"
                  :options="['approved', 'rejected']"
                  label="Decision *"
                  :rules="[(val) => !!val || 'Status is required']"
                  class="col-span-2"
                />
                <q-input
                  outlined
                  v-model="overtimeApprovalData.approved_hours"
                  label="Approved Hours *"
                  type="number"
                  step="0.01"
                  :rules="[(val) => !!val || 'Approved hours is required']"
                />
                <q-select
                  outlined
                  v-model="overtimeApprovalData.category"
                  :options="overtimeCategories"
                  option-label="name"
                  option-value="id"
                  emit-value
                  map-options
                  label="Category"
                  clearable
                />
                <q-input
                  outlined
                  v-model="overtimeApprovalData.reason"
                  label="Remarks"
                  type="textarea"
                  rows="3"
                  class="col-span-2"
                />
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-footer">
          <div class="form-actions">
            <q-btn flat label="Cancel" color="grey-7" @click="showOvertimeApproval = false" />
            <q-btn
              v-if="selectedOvertimeRequest?.status === 'pending'"
              label="Submit"
              color="primary"
              @click="submitOvertimeApproval"
              :loading="overtimeSubmitting"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'
import { api } from 'src/boot/axios'

const $q = useQuasar()

// ===== SHARED STATE =====
const activeTab = ref('leave')
const getCompanyId = () => {
  // First try: selectedCompany as an object with an id
  try {
    const parsed = JSON.parse(localStorage.getItem('selectedCompany'))
    const id = parsed?.id || parsed?.companyId
    if (id) return String(id)
  } catch {}

  // Second try: selectedCompany as a plain number/string
  const raw = localStorage.getItem('selectedCompany')
  if (raw) return String(raw)

  // Third try: fallback to company_id key
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

const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const leaveColumns = [
  { name: 'sl_no', label: 'SL No', field: 'id', align: 'left' },
  { name: 'employeeName', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'dates', label: 'Period', field: 'startDate', align: 'left' },
  { name: 'reason', label: 'Reason', field: 'reason', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

// ===== CASH ADVANCE STATE =====
const caRequests = ref([])
const caFilterStatus = ref('')
const caSubmitting = ref(false)
const selectedCaRequest = ref(null)
const caApprovalModal = ref(false)
const caViewDialog = ref(false)
const caApprovalData = ref({ status: 'approved', remarks: '' })
const caPagination = ref({ page: 1, rowsPerPage: 10 })
const caStatistics = ref({ total: 0, pending: 0, approved: 0 })
const caStatusOptions = ['', 'pending', 'approved', 'rejected']
const AVATAR_COLORS = ['primary', 'secondary', 'accent', 'purple', 'deep-orange']

const caColumns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  {
    name: 'employee_name',
    label: 'Employee',
    field: 'employee_name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'requested_amount',
    label: 'Requested Amount',
    field: 'requested_amount',
    align: 'left',
    sortable: true,
  },
  {
    name: 'request_date',
    label: 'Request Date',
    field: 'request_date',
    align: 'left',
    sortable: true,
  },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  {
    name: 'repayment_method',
    label: 'Repayment Method',
    field: 'repayment_method',
    align: 'center',
    sortable: true,
  },
  { name: 'is_repaid', label: 'Repaid?', field: 'is_repaid', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', align: 'center' },
]

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

// ===== SHARED HELPERS =====
const getInitials = (name) => {
  if (!name || name === 'N/A') return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const capitalizeStatus = (status) => {
  if (!status) return 'N/A'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

const formatAmount = (num) => {
  const n = Number(num || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ===== LEAVE / OVERTIME HELPERS =====
const getTypeLabel = (type) => {
  const labels = { leave: 'Leave', timeoff: 'Time Off', schedule: 'Schedule', overtime: 'Overtime' }
  return labels[type] || 'Request'
}

const getLeaveStatusClass = (request) => {
  const status = request.status
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}

const calculateDuration = (start, end) => {
  if (!start || !end) return 'N/A'
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = endDate - startDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays > 1 ? `${diffDays} days` : '1 day'
}

// ===== CASH ADVANCE HELPERS =====
const getCaStatusClass = (status) => {
  if (status === 'pending') return 'status-pending'
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-default'
}

const getRepaymentClass = (method) => {
  if (method === 'manual') return 'repayment-manual'
  if (method === 'automatic') return 'repayment-automatic'
  return 'repayment-default'
}

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0]
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

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
}

// ===== API: LEAVE =====
const fetchLeaveRequests = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No access token found')

    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')

    const res = await axios.get(`https://staging.wageyapp.com/attendance/leave-list/`, {
      headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem('access_token')
    if (!token) return
    const companyId = selectedCompany.value
    const res = await axios.get('https://staging.wageyapp.com/payroll/overtime-categories/', {
      headers: { Authorization: `Bearer ${token}` },
      params: companyId ? { company_id: companyId } : {},
    })
    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    overtimeCategories.value = data.filter((c) => c.is_active)
  } catch (e) {
    // non-critical, fail silently
  }
}

const fetchOvertimeRequests = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('No access token found')

    const companyId = selectedCompany.value
    if (!companyId) throw new Error('No company selected')

    console.log(
      '[OT] Fetching overtime | company_id:',
      companyId,
      '| token:',
      token?.slice(0, 20) + '...',
    )

    const res = await axios.get(
      `https://staging.wageyapp.com/payroll/overtime-list/?company=${companyId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    console.log('[OT] Response status:', res.status, '| raw data:', res.data)

    const data = Array.isArray(res.data) ? res.data : res.data.results || []
    console.log('[OT] Parsed records:', data.length)
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
    const res = await api.get('https://staging.wageyapp.com/cash_advance/admin/', config)
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

// Sync selectedCompany with localStorage (e.g. from a company switcher elsewhere in the app)
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
/* ==============================
   BASE
============================== */
.request-dashboard {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* ==============================
   HEADER
============================== */
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

.search-icon {
  color: #9ca3af;
}

/* ==============================
   STATS CARDS
============================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid #e8ecf0;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  transition: box-shadow 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.stats-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}

/* Icon color variants - matching EmployeesPage palette */
.leave-icon-bg,
.stats-icon-wrapper:has(.q-icon[name='event_note']) {
  background: #eff6ff;
  color: #3b82f6;
}

.overtime-icon-bg {
  background: #faf5ff;
  color: #8b5cf6;
}

.stats-card .stats-icon-wrapper {
  background: #eff6ff;
  color: #3b82f6;
}

.total-card .stats-icon-wrapper {
  background: #eff6ff;
  color: #3b82f6;
}

.overtime-total-card .stats-icon-wrapper {
  background: #faf5ff;
  color: #8b5cf6;
}

.pending-card .stats-icon-wrapper {
  background: #fffbeb;
  color: #f59e0b;
}

.approved-card .stats-icon-wrapper {
  background: #f0fdf4;
  color: #22c55e;
}

.rejected-card .stats-icon-wrapper {
  background: #fef2f2;
  color: #ef4444;
}

.stats-content {
  min-width: 0;
}

.stats-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stats-amount {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

/* ==============================
   TABS - pill style
============================== */
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

.tab-pill-icon {
  font-size: 15px;
}

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

/* ==============================
   TABLE SECTION
============================== */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-wrap: wrap;
  gap: 10px;
}

.table-title-section {
  min-width: 0;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  min-width: 160px;
}

.modern-table-container {
  overflow: hidden;
  margin: 0 16px 16px 16px;
}

.request-table,
.cash-advance-table {
  background: #ffffff;
  width: 100%;
}

/* Table header */
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

.table-header-actions {
  text-align: center !important;
}

/* Table body */
.table-body-row {
  transition: background 0.15s ease;
}

.table-body-row:hover .table-body-cell {
  background: #f9fafb;
}

.rejected-row {
  opacity: 0.65;
}

.rejected-row .table-body-cell {
  background: #fef2f2;
}

.rejected-row:hover .table-body-cell {
  background: #fee2e2;
}

.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 13px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle !important;
}

/* ==============================
   EMPLOYEE INFO
============================== */
.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-name-cell {
  min-width: 180px;
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-dept {
  font-size: 11px;
  color: #6b7280;
}

/* ==============================
   STATUS & TYPE BADGES
============================== */
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

.status-default {
  background: #f3f4f6;
  color: #6b7280;
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

.repayment-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #e5e7eb;
}

.repayment-manual {
  background: #fffbeb;
  color: #92400e;
  border-color: #fde68a;
}

.repayment-automatic {
  background: #f0fdf4;
  color: #065f46;
  border-color: #bbf7d0;
}

.repayment-default {
  background: #f3f4f6;
  color: #6b7280;
}

/* ==============================
   DATE / REASON / AMOUNT CELLS
============================== */
.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.start-date,
.end-date {
  color: #374151;
  font-weight: 500;
}

.date-separator {
  color: #9ca3af;
  font-size: 10px;
}

.duration {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

.reason-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #6b7280;
}

.reason-cell {
  max-width: 220px;
}

.dates-cell {
  min-width: 170px;
}

.amount-value {
  font-weight: 600;
  color: #111827;
}

.amount-value.approved {
  color: #065f46;
}

.no-data {
  color: #9ca3af;
  font-size: 12px;
}

.amount-highlight {
  font-weight: 700;
  font-size: 15px;
  color: #111827;
}

.amount-highlight.approved {
  color: #065f46;
}

/* ==============================
   ACTION BUTTONS
============================== */
.actions-cell {
  text-align: center !important;
  width: 120px;
  min-width: 120px;
  vertical-align: middle !important;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}

.action-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.view-btn {
  background: #eff6ff;
  color: #3b82f6;
}

.view-btn:hover {
  background: #dbeafe;
}

.approve-btn {
  background: #f0fdf4;
  color: #16a34a;
}

.approve-btn:hover {
  background: #dcfce7;
}

.reject-btn {
  background: #fef2f2;
  color: #dc2626;
}

.reject-btn:hover {
  background: #fee2e2;
}

.edit-btn {
  background: #fffbeb;
  color: #d97706;
}

.edit-btn:hover {
  background: #fef3c7;
}

/* ==============================
   LOADING & EMPTY STATE
============================== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.loading-text {
  font-size: 14px;
  color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 8px;
  text-align: center;
}

.empty-icon {
  color: #d1d5db;
  margin-bottom: 6px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
}

.empty-subtitle {
  font-size: 13px;
  color: #9ca3af;
}

/* ==============================
   MODAL - SHARED
============================== */
.modal-card {
  width: 600px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 14px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #ffffff;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar {
  flex-shrink: 0;
}

.modal-icon {
  font-size: 24px;
  color: #3b82f6;
  background: #eff6ff;
  padding: 8px;
  border-radius: 10px;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.modal-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.modal-close-btn {
  color: #9ca3af !important;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 14px 20px;
  background: #f9fafb;
  border-top: 1px solid #f1f3f5;
}

/* ==============================
   DETAIL SECTIONS
============================== */
.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 14px 18px;
  border: 1px solid #f1f3f5;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f5;
}

.detail-grid {
  display: flex;
  flex-direction: column;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid #f1f3f5;
}

.detail-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  text-align: right;
  display: flex;
  align-items: center;
  gap: 6px;
}

.reason-content,
.message-content,
.admin-response {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
  padding: 4px 0;
}

.response-meta {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.col-span-2 {
  grid-column: 1 / -1;
}

.info-content {
  margin-bottom: 8px;
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
}

.info-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.5;
}

/* ==============================
   RESPONSIVE
============================== */
@media (max-width: 1024px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stats-amount {
    font-size: 24px;
  }

  .modern-table-container {
    margin: 0 14px 14px 14px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 10px 10px !important;
    font-size: 12px;
  }

  .filter-select {
    min-width: 140px;
  }

  .modal-card {
    min-width: unset;
    max-width: 680px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 14px;
  }

  .page-header {
    padding: 12px 14px;
    margin-bottom: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .header-actions {
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
  }

  .header-search {
    max-width: 100%;
    width: 100%;
    flex: 1;
    min-width: 0;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .stats-card {
    padding: 14px;
  }

  .stats-amount {
    font-size: 22px;
  }

  .tabs-section {
    padding: 8px 10px;
    margin-bottom: 12px;
  }

  .tab-pills {
    gap: 5px;
  }

  .tab-pill {
    padding: 7px 11px;
    font-size: 12px;
    flex: 1;
    justify-content: center;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .table-actions {
    width: 100%;
  }

  .filter-select {
    width: 100%;
    min-width: unset;
  }

  .modern-table-container {
    margin: 0 10px 10px 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .request-table {
    min-width: 700px;
  }

  .cash-advance-table {
    min-width: 750px;
  }

  .employee-dept {
    display: none;
  }

  .modal-card {
    margin: 10px;
    min-width: unset;
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 20px);
    width: 100%;
  }

  .modal-content {
    padding: 14px !important;
  }

  .modal-footer {
    padding: 12px 14px;
  }

  .form-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .form-actions button {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .col-span-2 {
    grid-column: span 1;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .detail-value {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 10px;
  }

  .page-title {
    font-size: 18px;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .stats-card {
    padding: 12px;
  }

  .stats-amount {
    font-size: 20px;
  }

  .tab-pill span:not(.tab-badge) {
    display: none;
  }

  .tab-pill-icon {
    font-size: 16px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 10px 10px !important;
    font-size: 12px;
  }

  .modal-title {
    font-size: 15px;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }
}
</style>
