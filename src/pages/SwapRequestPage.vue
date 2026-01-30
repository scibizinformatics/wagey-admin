<template>
  <q-page class="swap-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Swap Requests</h1>
          </div>
          <div class="header-actions">
            <q-btn
              color="primary"
              icon="refresh"
              label="Refresh"
              class="refresh-btn"
              @click="fetchSwapRequests"
              :loading="loading"
            />
            <q-btn
              icon="bug_report"
              flat
              round
              color="orange"
              class="debug-btn"
              @click="showDebugInfo"
            >
              <q-tooltip>Show Debug Info</q-tooltip>
            </q-btn>
            <q-input
              v-model="search"
              placeholder="Search swap requests..."
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

      <!-- Debug Info Card -->
      <q-card
        v-if="showDebug"
        class="debug-card"
        style="background: #fff3cd; border: 2px solid #ffc107; margin-bottom: 16px"
      >
        <q-card-section>
          <div class="debug-header">
            <div class="debug-title">🐛 Debug Information</div>
            <q-btn flat dense round icon="close" @click="showDebug = false" />
          </div>
          <div class="debug-content">
            <div><strong>Loading:</strong> {{ loading }}</div>
            <div><strong>Swap Requests Count:</strong> {{ swapRequests.length }}</div>
            <div><strong>Filtered Requests Count:</strong> {{ filteredRequests.length }}</div>
            <div><strong>Current Page:</strong> {{ pagination.page }}</div>
            <div><strong>Company ID:</strong> {{ currentUserCompany }}</div>
            <div class="debug-data">
              <strong>First Request:</strong>
              <pre>{{
                swapRequests[0] ? JSON.stringify(swapRequests[0], null, 2) : 'No data'
              }}</pre>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Stats Cards -->
      <div class="stats-section">
        <div class="stats-card total-card">
          <div class="stats-icon-wrapper">
            <q-icon name="swap_horiz" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ statistics.total }}</div>
            <div class="stats-label">Total Requests</div>
          </div>
        </div>

        <div class="stats-card pending-card">
          <div class="stats-icon-wrapper">
            <q-icon name="pending" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ statistics.pending }}</div>
            <div class="stats-label">Pending</div>
          </div>
        </div>

        <div class="stats-card approved-card">
          <div class="stats-icon-wrapper">
            <q-icon name="check_circle" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ statistics.approved }}</div>
            <div class="stats-label">Approved</div>
          </div>
        </div>

        <div class="stats-card rejected-card">
          <div class="stats-icon-wrapper">
            <q-icon name="cancel" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ statistics.rejected }}</div>
            <div class="stats-label">Rejected</div>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Swap Request Overview</h2>
          </div>
          <div class="table-actions">
            <q-select
              v-model="sortBy"
              :options="sortOptions"
              label="Sort by"
              class="sort-select"
              dense
              outlined
            >
              <template v-slot:prepend>
                <q-icon name="sort" />
              </template>
            </q-select>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <q-spinner size="48px" color="primary" thickness="4" />
          <div class="loading-text">Loading swap requests...</div>
        </div>

        <!-- Swap Requests Table -->
        <div v-else-if="paginatedRequests.length > 0" class="modern-table-container">
          <q-table
            :rows="paginatedRequests"
            :columns="columns"
            row-key="id"
            flat
            :loading="loading"
            no-data-label="No swap requests found"
            class="swap-table"
            hide-pagination
            :rows-per-page-options="[0]"
          >
            <template v-slot:header>
              <q-tr class="table-header-row">
                <q-th class="table-header-cell">SL No</q-th>
                <q-th class="table-header-cell">Requested By</q-th>
                <q-th class="table-header-cell">Employees</q-th>
                <q-th class="table-header-cell">Original Date</q-th>
                <q-th class="table-header-cell">New Date</q-th>
                <q-th class="table-header-cell">Status</q-th>
                <q-th class="table-header-cell">Requested Date</q-th>
                <q-th class="table-header-cell">Actions</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr
                class="table-body-row"
                :class="{ 'rejected-row': props.row.status === 'rejected' }"
              >
                <q-td class="table-body-cell">
                  {{
                    String(
                      (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1,
                    ).padStart(2, '0')
                  }}.
                </q-td>

                <q-td class="table-body-cell employee-name-cell">
                  <div class="employee-info">
                    <q-avatar size="32px" color="primary" text-color="white">
                      {{ getInitials(props.row.requested_by_name) }}
                    </q-avatar>
                    <span class="employee-name">{{ props.row.requested_by_name || 'N/A' }}</span>
                  </div>
                </q-td>

                <q-td class="table-body-cell employees-cell">
                  <div class="swap-employees">
                    <div class="employee-from">{{ props.row.from_employee_name }}</div>
                    <div class="swap-icon">
                      <q-icon name="swap_vert" size="16px" color="grey-7" />
                    </div>
                    <div class="employee-to">{{ props.row.to_employee_name }}</div>
                  </div>
                </q-td>

                <q-td class="table-body-cell date-cell">
                  <div class="date-info">
                    <div class="date-main">{{ formatDate(props.row.original_date) }}</div>
                    <div class="date-sub">
                      {{ props.row.original_assignment?.shift_type?.name || 'N/A' }}
                    </div>
                  </div>
                </q-td>

                <q-td class="table-body-cell date-cell">
                  <div class="date-info">
                    <div class="date-main">{{ formatDate(props.row.new_date) }}</div>
                    <div class="date-sub">
                      {{ props.row.new_assignment?.shift_type?.name || 'N/A' }}
                    </div>
                  </div>
                </q-td>

                <q-td class="table-body-cell status-cell">
                  <div :class="['status-badge', getStatusClass(props.row)]">
                    {{ getStatusLabel(props.row) }}
                  </div>

                  <!-- Progress bar for pending/to_employee_approved -->
                  <div v-if="isPendingApproval(props.row)" class="approval-progress">
                    <q-linear-progress
                      :value="getApprovalProgress(props.row)"
                      :color="canAdminApprove(props.row) ? 'positive' : 'warning'"
                      size="4px"
                      rounded
                    />
                    <div
                      class="progress-text"
                      :class="canAdminApprove(props.row) ? 'text-positive' : 'text-warning'"
                    >
                      {{ getApprovalProgressText(props.row) }}
                    </div>
                  </div>

                  <!-- Show completion info for approved/rejected -->
                  <div v-if="props.row.status === 'approved'" class="status-extra">
                    <q-icon name="check_circle" size="14px" color="positive" />
                    <span class="status-extra-text">Approved</span>
                  </div>

                  <div v-if="props.row.status === 'rejected'" class="status-extra">
                    <q-icon name="cancel" size="14px" color="negative" />
                    <span class="status-extra-text">Rejected</span>
                  </div>
                </q-td>

                <q-td class="table-body-cell">
                  {{ formatDateTime(props.row.requested_at) }}
                </q-td>

                <q-td class="table-body-cell actions-cell">
                  <div class="action-buttons">
                    <q-btn
                      flat
                      round
                      icon="visibility"
                      size="sm"
                      class="action-btn view-btn"
                      @click="viewRequest(props.row)"
                    >
                      <q-tooltip>View Details</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="isPendingApproval(props.row)"
                      flat
                      round
                      icon="check"
                      size="sm"
                      class="action-btn approve-btn"
                      :disable="!canAdminApprove(props.row)"
                      @click="approveRequest(props.row)"
                    >
                      <q-tooltip>
                        {{
                          canAdminApprove(props.row)
                            ? 'Approve Swap Request'
                            : `Waiting for ${props.row.to_employee_name} to approve`
                        }}
                      </q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="isPendingApproval(props.row)"
                      flat
                      round
                      icon="close"
                      size="sm"
                      class="action-btn reject-btn"
                      @click="rejectRequest(props.row)"
                    >
                      <q-tooltip>Reject Request</q-tooltip>
                    </q-btn>
                  </div>
                </q-td>
              </q-tr>
            </template>
          </q-table>

          <!-- Pagination Footer -->
          <div class="table-footer">
            <div class="footer-info">
              Total <span class="footer-count">{{ filteredRequests.length }} Records</span>
            </div>
            <q-pagination
              v-model="pagination.page"
              :max="Math.ceil(filteredRequests.length / pagination.rowsPerPage) || 1"
              :max-pages="6"
              direction-links
              boundary-links
              color="primary"
              active-color="primary"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <q-icon name="search_off" size="64px" color="grey-4" />
          </div>
          <div class="empty-title">No swap requests found</div>
          <div class="empty-subtitle">Try adjusting your search or filters</div>
        </div>
      </div>
    </div>

    <!-- View Details Modal -->
    <q-dialog v-model="viewDialog" persistent>
      <q-card class="modal-card details-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="64px" color="primary" text-color="white" class="modal-avatar">
              {{ selectedRequest ? getInitials(selectedRequest.requested_by_name) : '?' }}
            </q-avatar>
            <div>
              <div class="modal-title">
                {{ selectedRequest?.requested_by_name || 'Swap Request Details' }}
              </div>
              <div class="modal-subtitle">Swap Request Information</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="viewDialog = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content" v-if="selectedRequest">
          <div class="detail-sections">
            <!-- Swap Details -->
            <div class="detail-section">
              <div class="section-title">Swap Details</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">From Employee:</span>
                  <span class="detail-value">{{ selectedRequest.from_employee_name }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">To Employee:</span>
                  <span class="detail-value">{{ selectedRequest.to_employee_name }}</span>
                </div>
              </div>
            </div>

            <!-- Original Assignment -->
            <div class="detail-section">
              <div class="section-title">Original Assignment</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">{{ formatDate(selectedRequest.original_date) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Site:</span>
                  <span class="detail-value">{{
                    selectedRequest.original_assignment?.site?.name || 'N/A'
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Shift:</span>
                  <span class="detail-value">{{
                    selectedRequest.original_assignment?.shift_type?.name || 'N/A'
                  }}</span>
                </div>
              </div>
            </div>

            <!-- New Assignment -->
            <div class="detail-section">
              <div class="section-title">New Assignment</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">{{ formatDate(selectedRequest.new_date) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Site:</span>
                  <span class="detail-value">{{
                    selectedRequest.new_assignment?.site?.name || 'N/A'
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Shift:</span>
                  <span class="detail-value">{{
                    selectedRequest.new_assignment?.shift_type?.name || 'N/A'
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Status Information -->
            <div class="detail-section">
              <div class="section-title">Status Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <div :class="['status-badge', getStatusClass(selectedRequest)]">
                      {{ getStatusLabel(selectedRequest) }}
                    </div>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Requested At:</span>
                  <span class="detail-value">{{
                    formatDateTime(selectedRequest.requested_at)
                  }}</span>
                </div>
                <div v-if="selectedRequest.admin_approved_at" class="detail-row">
                  <span class="detail-label">Admin Approved At:</span>
                  <span class="detail-value">{{
                    formatDateTime(selectedRequest.admin_approved_at)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Employee Approval Status -->
            <div v-if="isPendingApproval(selectedRequest)" class="detail-section">
              <div class="section-title">Employee Approvals</div>
              <div class="approval-info">
                <div class="approval-item">
                  <q-icon
                    :name="selectedRequest.to_employee_approved ? 'check_circle' : 'schedule'"
                    :color="selectedRequest.to_employee_approved ? 'positive' : 'warning'"
                    size="20px"
                  />
                  <span>
                    {{ selectedRequest.to_employee_name }}:
                    <span
                      :class="
                        selectedRequest.to_employee_approved ? 'text-positive' : 'text-warning'
                      "
                    >
                      {{ selectedRequest.to_employee_approved ? 'Approved' : 'Pending' }}
                    </span>
                  </span>
                </div>

                <div v-if="canAdminApprove(selectedRequest)" class="approval-item ready">
                  <q-icon name="admin_panel_settings" color="positive" size="20px" />
                  <span class="text-positive">Ready for admin approval</span>
                </div>
                <div v-else class="approval-item waiting">
                  <q-icon name="info" color="orange" size="20px" />
                  <span class="text-orange">Waiting for employee approval</span>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-footer">
          <div class="form-actions">
            <q-btn
              v-if="isPendingApproval(selectedRequest)"
              label="Reject"
              flat
              color="negative"
              @click="
                () => {
                  rejectRequest(selectedRequest)
                  viewDialog = false
                }
              "
            />
            <q-btn
              v-if="isPendingApproval(selectedRequest)"
              label="Approve"
              color="positive"
              :disable="!canAdminApprove(selectedRequest)"
              @click="
                () => {
                  approveRequest(selectedRequest)
                  viewDialog = false
                }
              "
            >
              <q-tooltip v-if="!canAdminApprove(selectedRequest)">
                Waiting for employee approval
              </q-tooltip>
            </q-btn>
            <q-btn label="Close" flat color="grey-7" @click="viewDialog = false" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

export default {
  name: 'SwapRequests',
  setup() {
    const $q = useQuasar()
    const loading = ref(false)
    const search = ref('')
    const sortBy = ref('Newest')
    const swapRequests = ref([])
    const viewDialog = ref(false)
    const selectedRequest = ref(null)
    const showDebug = ref(false)
    const currentUserCompany = ref(null)
    const userHasApprovalRights = ref(true)

    const sortOptions = ['Newest', 'Oldest', 'Status']

    const pagination = ref({
      page: 1,
      rowsPerPage: 10,
    })

    const columns = [
      { name: 'sl_no', label: 'SL No', field: 'id', align: 'left' },
      { name: 'requested_by', label: 'Requested By', field: 'requested_by_name', align: 'left' },
      { name: 'employees', label: 'Employees', field: 'from_employee_name', align: 'left' },
      { name: 'original_date', label: 'Original Date', field: 'original_date', align: 'left' },
      { name: 'new_date', label: 'New Date', field: 'new_date', align: 'left' },
      { name: 'status', label: 'Status', field: 'status', align: 'left' },
      { name: 'requested_at', label: 'Requested Date', field: 'requested_at', align: 'left' },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
    ]

    // Centralized company ID getter
    const getCompanyId = () => {
      let companyId = localStorage.getItem('selectedCompany')

      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        try {
          const parsed = JSON.parse(companyId)
          companyId = parsed?.id || parsed?.companyId || parsed
        } catch {
          // Not JSON, use as-is
        }
      }

      if (!companyId) {
        companyId = localStorage.getItem('company_id')
      }

      if (!companyId) {
        const userStr = localStorage.getItem('user')
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
          try {
            const user = JSON.parse(userStr)
            companyId = user?.companyId || user?.company_id
          } catch (e) {
            console.warn('Failed to parse user from localStorage:', e)
          }
        }
      }

      if (companyId) {
        companyId = parseInt(companyId)
        if (!isNaN(companyId) && companyId > 0) {
          console.log('✅ Using company ID:', companyId)
          return companyId
        }
      }

      console.warn('⚠️ No valid company ID found')
      return null
    }

    const statistics = computed(() => {
      return {
        total: swapRequests.value.length,
        pending: swapRequests.value.filter(
          (req) => req.status === 'pending' || req.status === 'to_employee_approved',
        ).length,
        approved: swapRequests.value.filter((req) => req.status === 'approved').length,
        rejected: swapRequests.value.filter((req) => req.status === 'rejected').length,
      }
    })

    const filteredRequests = computed(() => {
      let filtered = swapRequests.value

      if (search.value) {
        const searchLower = search.value.toLowerCase()
        filtered = filtered.filter(
          (req) =>
            req.requested_by_name?.toLowerCase().includes(searchLower) ||
            req.from_employee_name?.toLowerCase().includes(searchLower) ||
            req.to_employee_name?.toLowerCase().includes(searchLower) ||
            req.status?.toLowerCase().includes(searchLower),
        )
      }

      if (sortBy.value === 'Newest') {
        filtered = [...filtered].sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at))
      } else if (sortBy.value === 'Oldest') {
        filtered = [...filtered].sort((a, b) => new Date(a.requested_at) - new Date(b.requested_at))
      } else if (sortBy.value === 'Status') {
        filtered = [...filtered].sort((a, b) => a.status.localeCompare(b.status))
      }

      return filtered
    })

    const paginatedRequests = computed(() => {
      const start = (pagination.value.page - 1) * pagination.value.rowsPerPage
      const end = start + pagination.value.rowsPerPage
      return filteredRequests.value.slice(start, end)
    })

    const extractEmployeeName = (request, field) => {
      if (field === 'requested_by' && request.original_assignment?.employee?.name) {
        return request.original_assignment.employee.name
      }
      if (field === 'from_employee' && request.from_employee_name) {
        return request.from_employee_name
      }
      if (field === 'to_employee' && request.to_employee_name) {
        return request.to_employee_name
      }
      if (field === 'from_employee' && request.original_assignment?.employee?.name) {
        return request.original_assignment.employee.name
      }
      if (field === 'to_employee' && request.new_assignment?.employee?.name) {
        return request.new_assignment.employee.name
      }
      return 'Unknown Employee'
    }

    const fetchSwapRequests = async () => {
      loading.value = true
      console.log('🚀 Fetching swap requests...')

      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const companyId = getCompanyId()

        if (!companyId) {
          console.warn('⚠️ No company ID available')
          swapRequests.value = []
          $q.notify({
            type: 'warning',
            message: 'Please select a company first',
            position: 'top',
          })
          return
        }

        currentUserCompany.value = companyId
        console.log(`📤 Requesting swap requests for company: ${companyId}`)

        const response = await api.get('https://staging.wageyapp.com/organization/swap-requests/', {
          headers: { Authorization: `Bearer ${token}` },
          params: { company_id: companyId },
        })

        console.log(`✅ Fetched ${response.data.length} swap requests`)

        swapRequests.value = response.data.map((request) => ({
          ...request,
          requested_by_name: extractEmployeeName(request, 'requested_by'),
          from_employee_name: extractEmployeeName(request, 'from_employee'),
          to_employee_name: extractEmployeeName(request, 'to_employee'),
        }))

        $q.notify({
          type: 'positive',
          message: `Loaded ${swapRequests.value.length} swap request(s)`,
          position: 'top',
        })
      } catch (error) {
        console.error('❌ Error fetching swap requests:', error)
        swapRequests.value = []

        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          'Failed to fetch swap requests'

        $q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top',
          timeout: 5000,
        })
      } finally {
        loading.value = false
      }
    }

    const updateSwapRequest = async (requestId, payload) => {
      const token = localStorage.getItem('access_token')
      const companyId = getCompanyId()

      if (!companyId) {
        throw new Error('No company ID found')
      }

      try {
        console.log(`📤 Updating swap request ${requestId}:`, payload)

        const response = await api.patch(
          `https://staging.wageyapp.com/organization/swap-requests/${requestId}/`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { company_id: companyId },
          },
        )

        console.log('✅ Update successful:', response.data)
        return response.data
      } catch (error) {
        console.error('❌ Update failed:', error)
        throw error
      }
    }

    const approveRequest = async (request) => {
      const companyId = getCompanyId()

      if (!companyId) {
        $q.notify({
          type: 'negative',
          message: 'Cannot approve: No company selected',
          position: 'top',
        })
        return
      }

      if (!canAdminApprove(request)) {
        $q.notify({
          type: 'warning',
          message: 'Cannot approve yet',
          caption: `Waiting for ${request.to_employee_name} to approve`,
          position: 'top',
        })
        return
      }

      $q.dialog({
        title: 'Confirm Approval',
        message: `Approve swap between ${request.from_employee_name} and ${request.to_employee_name}?`,
        cancel: true,
        persistent: true,
      }).onOk(async () => {
        loading.value = true
        try {
          await updateSwapRequest(request.id, {
            status: 'approved',
            admin_approved_at: new Date().toISOString(),
          })

          $q.notify({
            type: 'positive',
            message: 'Swap request approved successfully!',
            position: 'top',
          })

          await fetchSwapRequests()
        } catch (error) {
          console.error('❌ Approval error:', error.response?.data)

          let errorMessage = 'Failed to approve request'

          if (Array.isArray(error.response?.data)) {
            errorMessage = error.response.data.join(', ')
          } else if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message
          }

          if (errorMessage.includes('do not have an assigned role')) {
            errorMessage = 'Permission denied: You need admin role in this company to approve swaps'
          }

          $q.notify({
            type: 'negative',
            message: errorMessage,
            caption: 'Please contact your administrator',
            position: 'top',
            timeout: 5000,
          })
        } finally {
          loading.value = false
        }
      })
    }

    const rejectRequest = async (request) => {
      $q.dialog({
        title: 'Confirm Rejection',
        message: `Reject swap between ${request.from_employee_name} and ${request.to_employee_name}?`,
        cancel: true,
        persistent: true,
      }).onOk(async () => {
        loading.value = true
        try {
          await updateSwapRequest(request.id, {
            status: 'rejected',
            admin_approved_at: new Date().toISOString(),
          })

          $q.notify({
            type: 'positive',
            message: 'Swap request rejected',
            position: 'top',
          })

          await fetchSwapRequests()
        } catch (error) {
          console.error('❌ Rejection error:', error.response?.data)

          $q.notify({
            type: 'negative',
            message: error.response?.data?.detail || 'Failed to reject request',
            position: 'top',
          })
        } finally {
          loading.value = false
        }
      })
    }

    const viewRequest = (request) => {
      selectedRequest.value = request
      viewDialog.value = true
    }

    const getInitials = (name) => {
      if (!name) return '?'
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }

    const getStatusClass = (request) => {
      const status = request.status
      if (status === 'pending') return 'status-pending'
      if (status === 'to_employee_approved') return 'status-employee-approved'
      if (status === 'approved') return 'status-approved'
      if (status === 'rejected') return 'status-rejected'
      return 'status-default'
    }

    const getStatusLabel = (request) => {
      const labels = {
        pending: 'Pending',
        to_employee_approved: 'Employee Approved',
        approved: 'Approved',
        rejected: 'Rejected',
      }
      return labels[request.status] || request.status
    }

    const isPendingApproval = (request) => {
      return request.status === 'pending' || request.status === 'to_employee_approved'
    }

    const canAdminApprove = (request) => {
      const isPending = isPendingApproval(request)
      const employeeApproved = request.to_employee_approved === true
      return isPending && employeeApproved
    }

    const getApprovalProgress = (request) => {
      return request.to_employee_approved ? 1 : 0
    }

    const getApprovalProgressText = (request) => {
      if (canAdminApprove(request)) {
        return 'Ready for admin approval'
      }
      return `Waiting for ${request.to_employee_name}`
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
    }

    const formatDateTime = (dateTimeString) => {
      if (!dateTimeString) return 'N/A'
      return new Date(dateTimeString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    const showDebugInfo = () => {
      showDebug.value = !showDebug.value
    }

    onMounted(async () => {
      console.log('🚀 Component mounted')
      await fetchSwapRequests()
    })

    return {
      loading,
      search,
      sortBy,
      sortOptions,
      swapRequests,
      pagination,
      columns,
      statistics,
      filteredRequests,
      paginatedRequests,
      viewDialog,
      selectedRequest,
      showDebug,
      currentUserCompany,
      showDebugInfo,
      approveRequest,
      rejectRequest,
      viewRequest,
      getInitials,
      getStatusClass,
      getStatusLabel,
      isPendingApproval,
      canAdminApprove,
      getApprovalProgress,
      getApprovalProgressText,
      formatDate,
      formatDateTime,
      fetchSwapRequests,
    }
  },
}
</script>

<style scoped>
.swap-dashboard {
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

.debug-btn {
  width: 36px;
  height: 36px;
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

/* Debug Card */
.debug-card {
  border-radius: 12px;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.debug-title {
  font-size: 16px;
  font-weight: 600;
  color: #f59e0b;
}

.debug-content {
  font-size: 12px;
  color: #78716c;
}

.debug-data {
  margin-top: 12px;
}

.debug-data pre {
  font-size: 10px;
  max-height: 200px;
  overflow: auto;
  background: #ffffff;
  padding: 8px;
  border-radius: 4px;
  margin-top: 4px;
}

/* ===================================
   STATS SECTION
   =================================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

.total-card {
  background: linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%);
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

.sort-select {
  min-width: 160px;
}

.sort-select .q-field__control {
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
  margin: 0 16px 0 16px;
}

.swap-table {
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

.employee-name {
  font-weight: 500;
  color: #1a202c;
  font-size: 13px;
}

/* Employees Swap Cell */
.employees-cell {
  min-width: 140px;
}

.swap-employees {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.employee-from {
  font-weight: 500;
  color: #1a202c;
  font-size: 13px;
}

.swap-icon {
  display: flex;
  align-items: center;
  margin: 2px 0;
}

.employee-to {
  font-size: 12px;
  color: #64748b;
}

/* Date Cell */
.date-cell {
  min-width: 120px;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.date-main {
  font-weight: 500;
  color: #1a202c;
  font-size: 13px;
}

.date-sub {
  font-size: 11px;
  color: #64748b;
}

/* Status Cell */
.status-cell {
  min-width: 140px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  margin-bottom: 6px;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.status-employee-approved {
  background: #dbeafe;
  color: #2563eb;
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

.approval-progress {
  margin-top: 6px;
}

.progress-text {
  font-size: 10px;
  margin-top: 4px;
  font-weight: 500;
}

.status-extra {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}

.status-extra-text {
  font-size: 11px;
  font-weight: 500;
}

/* Action Buttons */
.actions-cell {
  width: 130px;
  min-width: 130px;
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

.approve-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.reject-btn {
  background: #fef2f2;
  color: #ef4444;
}

.reject-btn:hover {
  background: #fee2e2;
}

/* Table Footer */
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-top: 1px solid #f1f5f9;
  margin-top: 16px;
}

.footer-info {
  font-size: 13px;
  color: #dc2626;
  font-weight: 500;
}

.footer-count {
  font-weight: 700;
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

.approval-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.approval-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #ffffff;
  border-radius: 6px;
  font-size: 13px;
}

.approval-item.ready {
  background: #f0fdf4;
  font-weight: 500;
}

.approval-item.waiting {
  background: #fff7ed;
  font-weight: 500;
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
    grid-template-columns: repeat(2, 1fr);
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
    margin: 0 14px 0 14px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 11px 8px;
    font-size: 12px;
  }

  .actions-cell {
    width: 120px;
    min-width: 120px;
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
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .refresh-btn {
    flex: 1;
    min-width: 120px;
  }

  .debug-btn {
    flex-shrink: 0;
  }

  .header-search {
    width: 100%;
    max-width: 100%;
    order: 3;
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
  }

  .sort-select {
    width: 100%;
  }

  .modern-table-container {
    margin: 0 12px 0 12px;
    overflow-x: auto;
    border-radius: 8px;
  }

  .swap-table {
    min-width: 1000px;
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

  .actions-cell {
    width: 130px;
    min-width: 130px;
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

  .table-footer {
    flex-direction: column;
    gap: 12px;
    align-items: center;
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
    margin: 0 8px 0 8px;
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
