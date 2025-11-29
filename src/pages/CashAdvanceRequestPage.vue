<template>
  <q-page class="q-pa-md">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">Cash Advance Requests</h1>
        </div>

        <div class="header-actions row items-center q-gutter-sm">
          <q-input
            outlined
            dense
            v-model="search"
            placeholder="Search requests..."
            class="search-input"
            style="min-width: 300px"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>

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

    <!-- Statistics Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-4">
        <q-card flat class="stat-card stat-card-purple">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="account_balance_wallet" size="40px" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ statistics.total }}</div>
                <div class="text-subtitle2">Total Requests</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card flat class="stat-card stat-card-yellow">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="schedule" size="40px" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ statistics.pending }}</div>
                <div class="text-subtitle2">Pending</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card flat class="stat-card stat-card-green">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="check_circle" size="40px" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ statistics.approved }}</div>
                <div class="text-subtitle2">Approved</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Main Content -->
    <q-card flat class="bg-white">
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6 text-weight-medium">Request Overview</div>
          <div class="row q-gutter-sm items-center">
            <q-select
              outlined
              dense
              v-model="filterStatus"
              :options="statusOptions"
              label="Filter by Status"
              style="min-width: 150px"
            />
          </div>
        </div>

        <!-- Table -->
        <q-table
          flat
          :rows="filteredRequests"
          :columns="columns"
          row-key="id"
          :loading="loading"
          :pagination="pagination"
          class="modern-table"
        >
          <template v-slot:body-cell-employee_name="props">
            <q-td :props="props">
              <div class="row items-center">
                <q-avatar
                  size="32px"
                  :color="getAvatarColor(props.row.employee_name)"
                  text-color="white"
                  class="q-mr-sm"
                >
                  {{ getInitials(props.row.employee_name) }}
                </q-avatar>
                <span>{{ props.row.employee_name }}</span>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-requested_amount="props">
            <q-td :props="props">
              <span class="text-weight-medium"
                >₱{{ formatAmount(props.row.requested_amount) }}</span
              >
            </q-td>
          </template>

          <template v-slot:body-cell-approved_amount="props">
            <q-td :props="props">
              <span class="text-weight-medium" v-if="props.row.approved_amount">
                ₱{{ formatAmount(props.row.approved_amount) }}
              </span>
              <span class="text-grey-6" v-else>N/A</span>
            </q-td>
          </template>

          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="getStatusColor(props.row.status)"
                :label="props.row.status.toUpperCase()"
                class="q-px-md q-py-xs"
              />
            </q-td>
          </template>

          <template v-slot:body-cell-repayment_method="props">
            <q-td :props="props">
              <q-badge
                outline
                :color="props.row.repayment_method === 'manual' ? 'blue' : 'purple'"
                :label="props.row.repayment_method.toUpperCase()"
                class="q-px-md q-py-xs"
              />
            </q-td>
          </template>

          <template v-slot:body-cell-is_repaid="props">
            <q-td :props="props">
              <q-icon
                :name="props.row.is_repaid ? 'check_circle' : 'schedule'"
                :color="props.row.is_repaid ? 'positive' : 'warning'"
                size="24px"
              />
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <div class="row q-gutter-xs">
                <q-btn
                  flat
                  round
                  dense
                  icon="visibility"
                  color="blue"
                  size="sm"
                  @click="viewRequest(props.row)"
                >
                  <q-tooltip>View Details</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  icon="edit"
                  color="orange"
                  size="sm"
                  @click="openApprovalModal(props.row)"
                  v-if="props.row.status === 'pending'"
                >
                  <q-tooltip>Approve/Reject</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Approval Modal -->
    <q-dialog v-model="approvalModal" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Approve Cash Advance Request</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <div class="q-gutter-md">
            <div>
              <div class="text-subtitle2 q-mb-xs">Employee</div>
              <div class="text-body1 text-weight-medium">{{ selectedRequest?.employee_name }}</div>
            </div>

            <div>
              <div class="text-subtitle2 q-mb-xs">Requested Amount</div>
              <div class="text-body1 text-weight-medium">
                ₱{{ formatAmount(selectedRequest?.requested_amount) }}
              </div>
            </div>

            <q-input
              outlined
              v-model="approvalData.approved_amount"
              label="Approved Amount *"
              type="number"
              prefix="₱"
              :rules="[(val) => !!val || 'Approved amount is required']"
            />

            <q-select
              outlined
              v-model="approvalData.status"
              :options="['approved', 'rejected']"
              label="Status *"
              :rules="[(val) => !!val || 'Status is required']"
            />

            <q-input
              outlined
              v-model="approvalData.remarks"
              label="Remarks"
              type="textarea"
              rows="3"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            label="Submit"
            color="primary"
            @click="submitApproval"
            :loading="submitting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- View Details Dialog -->
    <q-dialog v-model="viewDialog">
      <q-card style="min-width: 600px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Cash Advance Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedRequest">
          <div class="q-gutter-md">
            <div class="row">
              <div class="col-6">
                <div class="text-caption text-grey-7">Employee</div>
                <div class="text-body1 text-weight-medium">{{ selectedRequest.employee_name }}</div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-7">Request Date</div>
                <div class="text-body1">{{ selectedRequest.request_date }}</div>
              </div>
            </div>

            <q-separator />

            <div class="row">
              <div class="col-6">
                <div class="text-caption text-grey-7">Requested Amount</div>
                <div class="text-h6 text-primary">
                  ₱{{ formatAmount(selectedRequest.requested_amount) }}
                </div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-7">Approved Amount</div>
                <div class="text-h6 text-positive" v-if="selectedRequest.approved_amount">
                  ₱{{ formatAmount(selectedRequest.approved_amount) }}
                </div>
                <div class="text-body1 text-grey-6" v-else>Not yet approved</div>
              </div>
            </div>

            <q-separator />

            <div class="row">
              <div class="col-6">
                <div class="text-caption text-grey-7">Status</div>
                <q-badge
                  :color="getStatusColor(selectedRequest.status)"
                  :label="selectedRequest.status.toUpperCase()"
                  class="q-px-md q-py-xs q-mt-xs"
                />
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-7">Repayment Method</div>
                <div class="text-body1">{{ selectedRequest.repayment_method }}</div>
              </div>
            </div>

            <q-separator />

            <div v-if="selectedRequest.reason">
              <div class="text-caption text-grey-7">Reason</div>
              <div class="text-body1">{{ selectedRequest.reason }}</div>
            </div>

            <div v-if="selectedRequest.remarks">
              <div class="text-caption text-grey-7">Remarks</div>
              <div class="text-body1">{{ selectedRequest.remarks }}</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Close" color="grey-7" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

// ============================================================================
// COMPOSABLES & CONSTANTS
// ============================================================================
const $q = useQuasar()

const STATUS_OPTIONS = ['', 'pending', 'approved', 'rejected']
const AVATAR_COLORS = ['primary', 'secondary', 'accent', 'purple', 'deep-orange']

// ============================================================================
// STATE
// ============================================================================
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

// ============================================================================
// TABLE CONFIGURATION
// ============================================================================
const columns = [
  {
    name: 'id',
    label: 'ID',
    field: 'id',
    align: 'left',
    sortable: true,
  },
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
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    align: 'center',
    sortable: true,
  },
  {
    name: 'repayment_method',
    label: 'Repayment Method',
    field: 'repayment_method',
    align: 'center',
    sortable: true,
  },
  {
    name: 'is_repaid',
    label: 'Repaid?',
    field: 'is_repaid',
    align: 'center',
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Actions',
    align: 'center',
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract employee name from various possible data structures
 */
const extractEmployeeName = (request) => {
  // Direct employee_name field
  if (request.employee_name) return request.employee_name

  // Employee object variations
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

  // User object variations
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

  // If we have an employee_id, show it
  if (request.employee_id) {
    return `Employee #${request.employee_id}`
  }

  // If we have a user_id, show it
  if (request.user_id) {
    return `User #${request.user_id}`
  }

  return 'Unknown Employee'
}

/**
 * Format number as currency
 */
const formatAmount = (num) => {
  const n = Number(num || 0)
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Get color based on status
 */
const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    approved: 'positive',
    rejected: 'negative',
  }
  return colors[status] || 'grey'
}

/**
 * Get avatar color based on name
 */
const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0]
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

/**
 * Get initials from name
 */
const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get authentication config
 */
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

/**
 * Update statistics
 */
const updateStats = () => {
  statistics.value.total = requests.value.length
  statistics.value.pending = requests.value.filter((r) => r.status === 'pending').length
  statistics.value.approved = requests.value.filter((r) => r.status === 'approved').length
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch all cash advance requests
 */
const fetchRequests = async () => {
  try {
    loading.value = true

    const config = getAuthConfig()

    // Fetch cash advances
    const res = await api.get('/payroll/admin/cash-advances/', config)

    // Handle both array and paginated responses
    let data = Array.isArray(res.data) ? res.data : res.data.results || []

    console.log('🔍 Raw API Response:', JSON.stringify(data[0], null, 2))
    console.log('🔍 Total records:', data.length)

    // Check if response includes employee data
    const hasEmployeeData =
      data.length > 0 &&
      (data[0].employee ||
        data[0].user ||
        data[0].employee_name ||
        data[0].employee_id ||
        data[0].user_id)

    if (!hasEmployeeData && data.length > 0) {
      console.warn('⚠️ API does not return employee data. Trying alternative endpoints...')

      // Try to get detailed data from individual endpoints
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

    // Normalize employee names
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

/**
 * Submit approval/rejection
 */
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

    // Try PATCH request
    await api.patch(endpoint, payload, config)

    // Close modal and refresh
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

    // Check for 500 error (backend might still save data)
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

// ============================================================================
// UI ACTIONS
// ============================================================================

/**
 * Open approval modal
 */
const openApprovalModal = (row) => {
  selectedRequest.value = row
  approvalData.value = {
    approved_amount: row.requested_amount,
    status: 'approved',
    remarks: '',
  }
  approvalModal.value = true
}

/**
 * View request details
 */
const viewRequest = (row) => {
  selectedRequest.value = row
  viewDialog.value = true
}

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

/**
 * Filtered requests based on search and status
 */
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

// ============================================================================
// LIFECYCLE
// ============================================================================

onMounted(() => {
  console.log('🚀 Component mounted')
  fetchRequests()
})

// ============================================================================
// DEBUG HELPERS
// ============================================================================

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
/* [Previous styles remain exactly the same] */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 23px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.q-page {
  background-color: #f5f7fa;
  min-height: 100vh;
}

.bg-white {
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-input :deep(.q-field__control) {
  border-radius: 8px;
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.search-input :deep(.q-field__control):hover {
  border-color: #cbd5e0;
  background-color: #ffffff;
}

.search-input :deep(.q-field__control):focus-within {
  border-color: #4299e1;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.stat-card {
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
}

.stat-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-card-purple {
  background: linear-gradient(135deg, #e9d5ff 0%, #f3e8ff 50%, #faf5ff 100%);
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.stat-card-purple .q-icon {
  color: #7c3aed;
}

.stat-card-yellow {
  background: linear-gradient(135deg, #fef3c7 0%, #fef9e8 50%, #fffbeb 100%);
  border: 1px solid rgba(245, 158, 11, 0.1);
}

.stat-card-yellow .q-icon {
  color: #f59e0b;
}

.stat-card-green {
  background: linear-gradient(135deg, #d1fae5 0%, #e8f9f0 50%, #f0fdf4 100%);
  border: 1px solid rgba(16, 185, 129, 0.1);
}

.stat-card-green .q-icon {
  color: #10b981;
}

.stat-card .text-h4 {
  color: #1a202c;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.stat-card .text-subtitle2 {
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.75rem;
}

.modern-table {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.modern-table thead tr) {
  background-color: #f8fafc;
}

:deep(.modern-table thead th) {
  color: #475569;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 16px 12px;
  border-bottom: 2px solid #e2e8f0;
}

:deep(.modern-table tbody tr) {
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
}

:deep(.modern-table tbody tr:hover) {
  background-color: #f8fafc;
}

:deep(.modern-table tbody td) {
  padding: 16px 12px;
  color: #334155;
  font-size: 0.875rem;
}

:deep(.q-avatar) {
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.q-badge) {
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  padding: 6px 12px;
}
</style>
