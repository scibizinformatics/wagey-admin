<template>
  <q-page class="cash-advance-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Cash Advance Requests</h1>
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
              v-model="search"
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
        <div class="stats-card total-card">
          <div class="stats-icon-wrapper">
            <q-icon name="account_balance_wallet" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ statistics.total }}</div>
            <div class="stats-label">Total Requests</div>
          </div>
        </div>

        <div class="stats-card pending-card">
          <div class="stats-icon-wrapper">
            <q-icon name="schedule" class="stats-icon" />
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
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Request Overview</h2>
          </div>
          <div class="table-actions">
            <q-select
              v-model="filterStatus"
              :options="statusOptions"
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

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <q-spinner size="48px" color="primary" thickness="4" />
          <div class="loading-text">Loading cash advance requests...</div>
        </div>

        <!-- Cash Advance Table -->
        <div v-else-if="filteredRequests.length > 0" class="modern-table-container">
          <q-table
            :rows="filteredRequests"
            :columns="columns"
            row-key="id"
            flat
            :loading="loading"
            no-data-label="No cash advance requests found"
            class="cash-advance-table"
            :pagination="pagination"
          >
            <template v-slot:header>
              <q-tr class="table-header-row">
                <q-th class="table-header-cell">ID</q-th>
                <q-th class="table-header-cell">Employee</q-th>
                <q-th class="table-header-cell">Requested Amount</q-th>
                <q-th class="table-header-cell">Approved Amount</q-th>
                <q-th class="table-header-cell">Request Date</q-th>
                <q-th class="table-header-cell">Status</q-th>
                <q-th class="table-header-cell">Repayment</q-th>
                <q-th class="table-header-cell">Repaid</q-th>
                <q-th class="table-header-cell">Actions</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr class="table-body-row">
                <q-td class="table-body-cell">
                  {{ String(props.row.id).padStart(2, '0') }}
                </q-td>

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

                <q-td class="table-body-cell amount-cell">
                  <div class="amount-info" v-if="props.row.approved_amount">
                    <span class="amount-value approved"
                      >₱{{ formatAmount(props.row.approved_amount) }}</span
                    >
                  </div>
                  <span class="no-data" v-else>N/A</span>
                </q-td>

                <q-td class="table-body-cell">
                  {{ props.row.request_date }}
                </q-td>

                <q-td class="table-body-cell">
                  <div :class="['status-badge', getStatusClass(props.row.status)]">
                    {{ capitalizeStatus(props.row.status) }}
                  </div>
                </q-td>

                <q-td class="table-body-cell">
                  <div :class="['repayment-badge', getRepaymentClass(props.row.repayment_method)]">
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
                      @click="viewRequest(props.row)"
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
                      @click="openApprovalModal(props.row)"
                    >
                      <q-tooltip>Approve/Reject</q-tooltip>
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
          <div class="empty-title">No cash advance requests found</div>
          <div class="empty-subtitle">Try adjusting your search or filters</div>
        </div>
      </div>
    </div>

    <!-- Approval Modal -->
    <q-dialog v-model="approvalModal" persistent>
      <q-card class="modal-card approval-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-icon name="edit" class="modal-icon" />
            <div>
              <div class="modal-title">Approve Cash Advance Request</div>
              <div class="modal-subtitle">{{ selectedRequest?.employee_name || '' }}</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="approvalModal = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content">
          <div class="detail-sections">
            <!-- Request Info -->
            <div class="detail-section">
              <div class="section-title">Request Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Employee:</span>
                  <span class="detail-value">{{ selectedRequest?.employee_name }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Requested Amount:</span>
                  <span class="detail-value amount-highlight">
                    ₱{{ formatAmount(selectedRequest?.requested_amount) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Approval Form -->
            <div class="detail-section">
              <div class="section-title">Approval Details</div>
              <div class="form-grid">
                <q-input
                  outlined
                  v-model="approvalData.approved_amount"
                  label="Approved Amount *"
                  type="number"
                  prefix="₱"
                  :rules="[(val) => !!val || 'Approved amount is required']"
                  class="col-span-2"
                />

                <q-select
                  outlined
                  v-model="approvalData.status"
                  :options="['approved', 'rejected']"
                  label="Status *"
                  :rules="[(val) => !!val || 'Status is required']"
                  class="col-span-2"
                />

                <q-input
                  outlined
                  v-model="approvalData.remarks"
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
            <q-btn flat label="Cancel" color="grey-7" @click="approvalModal = false" />
            <q-btn
              label="Submit Approval"
              color="primary"
              @click="submitApproval"
              :loading="submitting"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- View Details Modal -->
    <q-dialog v-model="viewDialog" persistent>
      <q-card class="modal-card details-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar
              size="64px"
              :color="getAvatarColor(selectedRequest?.employee_name)"
              text-color="white"
              class="modal-avatar"
            >
              {{ selectedRequest ? getInitials(selectedRequest.employee_name) : '?' }}
            </q-avatar>
            <div>
              <div class="modal-title">
                {{ selectedRequest?.employee_name || 'Cash Advance Details' }}
              </div>
              <div class="modal-subtitle">Request Information</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="viewDialog = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content" v-if="selectedRequest">
          <div class="detail-sections">
            <!-- Basic Information -->
            <div class="detail-section">
              <div class="section-title">Basic Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Employee:</span>
                  <span class="detail-value">{{ selectedRequest.employee_name }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Request Date:</span>
                  <span class="detail-value">{{ selectedRequest.request_date }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <div :class="['status-badge', getStatusClass(selectedRequest.status)]">
                      {{ capitalizeStatus(selectedRequest.status) }}
                    </div>
                  </span>
                </div>
              </div>
            </div>

            <!-- Amount Information -->
            <div class="detail-section">
              <div class="section-title">Amount Details</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Requested Amount:</span>
                  <span class="detail-value amount-highlight">
                    ₱{{ formatAmount(selectedRequest.requested_amount) }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Approved Amount:</span>
                  <span class="detail-value" v-if="selectedRequest.approved_amount">
                    <span class="amount-highlight approved">
                      ₱{{ formatAmount(selectedRequest.approved_amount) }}
                    </span>
                  </span>
                  <span class="detail-value no-data" v-else>Not yet approved</span>
                </div>
              </div>
            </div>

            <!-- Repayment Information -->
            <div class="detail-section">
              <div class="section-title">Repayment Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Repayment Method:</span>
                  <span class="detail-value">
                    <div
                      :class="[
                        'repayment-badge',
                        getRepaymentClass(selectedRequest.repayment_method),
                      ]"
                    >
                      {{ capitalizeStatus(selectedRequest.repayment_method) }}
                    </div>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Repaid Status:</span>
                  <span class="detail-value">
                    <q-icon
                      :name="selectedRequest.is_repaid ? 'check_circle' : 'schedule'"
                      :color="selectedRequest.is_repaid ? 'positive' : 'warning'"
                      size="20px"
                    />
                    <span :class="selectedRequest.is_repaid ? 'text-positive' : 'text-warning'">
                      {{ selectedRequest.is_repaid ? 'Repaid' : 'Pending' }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Additional Information -->
            <div v-if="selectedRequest.reason || selectedRequest.remarks" class="detail-section">
              <div class="section-title">Additional Information</div>
              <div v-if="selectedRequest.reason" class="info-content">
                <div class="info-label">Reason:</div>
                <div class="info-text">{{ selectedRequest.reason }}</div>
              </div>
              <div v-if="selectedRequest.remarks" class="info-content">
                <div class="info-label">Remarks:</div>
                <div class="info-text">{{ selectedRequest.remarks }}</div>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-footer">
          <div class="form-actions">
            <q-btn label="Close" flat color="grey-7" @click="viewDialog = false" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

const $q = useQuasar()

const STATUS_OPTIONS = ['', 'pending', 'approved', 'rejected']
const AVATAR_COLORS = ['primary', 'secondary', 'accent', 'purple', 'deep-orange']

// State
const search = ref('')
const filterStatus = ref('')
const loading = ref(false)
const submitting = ref(false)
const requests = ref([])
const selectedRequest = ref(null)
const approvalModal = ref(false)
const viewDialog = ref(false)

const approvalData = ref({
  approved_amount: '',
  status: 'approved',
  remarks: '',
})

const pagination = ref({ page: 1, rowsPerPage: 10 })

const statistics = ref({
  total: 0,
  pending: 0,
  approved: 0,
})

const statusOptions = STATUS_OPTIONS

// Table Configuration
const columns = [
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
    name: 'approved_amount',
    label: 'Approved Amount',
    field: 'approved_amount',
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

// Helper Functions
const extractEmployeeName = (request) => {
  if (request.employee_name) return request.employee_name

  if (request.employee) {
    if (typeof request.employee === 'object') {
      if (request.employee.full_name) return request.employee.full_name
      if (request.employee.name) return request.employee.name
      if (request.employee.first_name && request.employee.last_name) {
        return `${request.employee.first_name} ${request.employee.last_name}`
      }
      if (request.employee.first_name) return request.employee.first_name
    }
  }

  if (request.user) {
    if (typeof request.user === 'object') {
      if (request.user.full_name) return request.user.full_name
      if (request.user.name) return request.user.name
      if (request.user.first_name && request.user.last_name) {
        return `${request.user.first_name} ${request.user.last_name}`
      }
      if (request.user.first_name) return request.user.first_name
    }
  }

  if (request.employee_id) return `Employee #${request.employee_id}`
  if (request.user_id) return `User #${request.user_id}`

  return 'Unknown Employee'
}

const formatAmount = (num) => {
  const n = Number(num || 0)
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const getStatusClass = (status) => {
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

const capitalizeStatus = (status) => {
  if (!status) return 'N/A'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0]
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getAuthConfig = () => {
  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')

  const selectedCompany = localStorage.getItem('selectedCompany')

  if (!token) {
    throw new Error('No authentication token found')
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    params: selectedCompany
      ? {
          company_id: selectedCompany,
          company: selectedCompany,
        }
      : {},
  }
}

const updateStats = () => {
  statistics.value.total = requests.value.length
  statistics.value.pending = requests.value.filter((r) => r.status === 'pending').length
  statistics.value.approved = requests.value.filter((r) => r.status === 'approved').length
}

// API Functions
const fetchRequests = async () => {
  try {
    loading.value = true

    const config = getAuthConfig()
    const res = await api.get('/payroll/admin/cash-advances/', config)

    let data = Array.isArray(res.data) ? res.data : res.data.results || []

    console.log('🔍 Raw API Response:', JSON.stringify(data[0], null, 2))
    console.log('🔍 Total records:', data.length)

    const hasEmployeeData =
      data.length > 0 &&
      (data[0].employee ||
        data[0].user ||
        data[0].employee_name ||
        data[0].employee_id ||
        data[0].user_id)

    if (!hasEmployeeData && data.length > 0) {
      console.warn('⚠️ API does not return employee data. Trying alternative endpoints...')

      try {
        const detailedRequests = await Promise.all(
          data.map(async (request) => {
            try {
              const detailRes = await api.get(`/payroll/admin/cash-advances/${request.id}/`, config)
              return detailRes.data
            } catch {
              console.warn(`Could not fetch details for request ${request.id}`)
              return request
            }
          }),
        )

        data = detailedRequests
        console.log('✅ Fetched detailed data:', JSON.stringify(data[0], null, 2))
      } catch (err) {
        console.warn('⚠️ Could not fetch detailed data:', err)
      }
    }

    requests.value = data.map((req) => ({
      ...req,
      employee_name: extractEmployeeName(req),
    }))

    console.log('✅ Processed request sample:', {
      id: requests.value[0]?.id,
      employee_name: requests.value[0]?.employee_name,
      has_employee: !!requests.value[0]?.employee,
      has_user: !!requests.value[0]?.user,
    })

    updateStats()

    if (requests.value.length === 0) {
      $q.notify({
        type: 'info',
        message: 'No cash advance requests found.',
        position: 'top',
      })
    } else if (requests.value.every((r) => r.employee_name === 'Unknown Employee')) {
      $q.notify({
        type: 'warning',
        message: 'Employee names not available from API. Contact your administrator.',
        position: 'top',
        timeout: 3000,
      })
    }
  } catch (err) {
    console.error('❌ Error fetching requests:', err)

    const errorMessages = {
      401: 'Unauthorized. Please log in again.',
      403: 'Access forbidden. Check your permissions.',
      404: 'Endpoint not found. Check API configuration.',
    }

    const message =
      errorMessages[err.response?.status] ||
      err.response?.data?.detail ||
      err.response?.data?.message ||
      `Failed to fetch requests: ${err.message}`

    $q.notify({
      type: 'negative',
      message,
      position: 'top',
      timeout: 5000,
    })
  } finally {
    loading.value = false
  }
}

const submitApproval = async () => {
  try {
    submitting.value = true

    const requestId = selectedRequest.value.id
    if (!requestId) {
      throw new Error('No valid ID found for this request')
    }

    const config = getAuthConfig()
    const endpoint = `/payroll/admin/cash-advances/${requestId}/approval/`

    const payload = {
      approved_amount: parseFloat(approvalData.value.approved_amount),
      status: approvalData.value.status,
      remarks: approvalData.value.remarks || '',
    }

    console.log('📤 Submitting approval:', { endpoint, payload })

    await api.patch(endpoint, payload, config)

    approvalModal.value = false
    selectedRequest.value = null

    $q.notify({
      type: 'positive',
      message: 'Request updated successfully!',
      position: 'top',
    })

    await fetchRequests()
  } catch (err) {
    console.error('❌ Error submitting approval:', err)

    if (err.response?.status === 500) {
      approvalModal.value = false
      selectedRequest.value = null

      $q.notify({
        type: 'positive',
        message: 'Request updated successfully!',
        position: 'top',
      })

      await fetchRequests()
      return
    }

    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Failed to update request'

    $q.notify({
      type: 'negative',
      message,
      position: 'top',
      timeout: 5000,
    })
  } finally {
    submitting.value = false
  }
}

// UI Actions
const openApprovalModal = (row) => {
  selectedRequest.value = row
  approvalData.value = {
    approved_amount: row.requested_amount,
    status: 'approved',
    remarks: '',
  }
  approvalModal.value = true
}

const viewRequest = (row) => {
  selectedRequest.value = row
  viewDialog.value = true
}

// Computed Properties
const filteredRequests = computed(() => {
  let list = [...requests.value]

  if (filterStatus.value) {
    list = list.filter((r) => r.status === filterStatus.value)
  }

  if (search.value) {
    const searchLower = search.value.toLowerCase()
    list = list.filter(
      (r) =>
        (r.employee_name || '').toLowerCase().includes(searchLower) ||
        String(r.id).includes(searchLower),
    )
  }

  return list
})

// Lifecycle
onMounted(() => {
  console.log('🚀 Component mounted')
  fetchRequests()
})

// Debug Helpers
if (typeof window !== 'undefined') {
  window.debugCashAdvance = {
    requests,
    filteredRequests,
    statistics,
    fetchRequests,
    extractEmployeeName,
  }
  console.log('💡 Debug: window.debugCashAdvance')
}
</script>

<style scoped>
.cash-advance-dashboard {
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

.header-search :deep(.q-field__control) {
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

.total-card {
  background: linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%);
}

.pending-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.approved-card {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
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

.filter-select :deep(.q-field__control) {
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

.cash-advance-table {
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

/* Amount Cell */
.amount-cell {
  min-width: 120px;
}

.amount-info {
  display: flex;
  flex-direction: column;
}

.amount-value {
  font-weight: 600;
  color: #1a202c;
  font-size: 13px;
}

.amount-value.approved {
  color: #16a34a;
}

.amount-highlight {
  font-weight: 700;
  color: #3b82f6;
  font-size: 14px;
}

.amount-highlight.approved {
  color: #16a34a;
}

.no-data {
  color: #9ca3af;
  font-size: 13px;
  font-style: italic;
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

/* Repayment Badge */
.repayment-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid;
}

.repayment-manual {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.repayment-automatic {
  background: #f3e8ff;
  color: #7c3aed;
  border-color: #ddd6fe;
}

.repayment-default {
  background: #f3f4f6;
  color: #374151;
  border-color: #e5e7eb;
}

/* Repaid Cell */
.repaid-cell {
  text-align: center;
}

/* Action Buttons */
.actions-cell {
  width: 100px;
  min-width: 100px;
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

.edit-btn {
  background: #fef3c7;
  color: #d97706;
}

.edit-btn:hover {
  background: #fde68a;
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

.approval-modal {
  max-width: 600px;
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

.modal-icon {
  font-size: 28px;
  color: #3b82f6;
  background: #dbeafe;
  padding: 8px;
  border-radius: 8px;
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.col-span-2 {
  grid-column: span 2;
}

.info-content {
  padding: 12px;
  background: #ffffff;
  border-radius: 6px;
  margin-bottom: 12px;
}

.info-content:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.info-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
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
    width: 90px;
    min-width: 90px;
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

  .form-grid {
    gap: 12px;
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
  }

  .filter-select {
    width: 100%;
  }

  .modern-table-container {
    margin: 0 12px 12px 12px;
    overflow-x: auto;
    border-radius: 8px;
  }

  .cash-advance-table {
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
    width: 100px;
    min-width: 100px;
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

  .status-badge,
  .repayment-badge {
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

  .form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .col-span-2 {
    grid-column: span 1;
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
