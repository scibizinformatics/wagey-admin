<template>
  <q-page padding>
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">Swap Requests</h1>
        </div>

        <div class="header-actions row items-center q-gutter-md">
          <q-input
            v-model="search"
            outlined
            dense
            placeholder="Search swap requests..."
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
            @click="fetchSwapRequests"
            :loading="loading"
            class="refresh-btn"
          />

          <q-btn
            icon="bug_report"
            flat
            round
            color="orange"
            @click="showDebugInfo"
            class="debug-btn"
          >
            <q-tooltip>Show Debug Info</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>

    <!-- Debug Info Card -->
    <q-card v-if="showDebug" class="q-mb-md" style="background: #fff3cd; border: 2px solid #ffc107">
      <q-card-section>
        <div class="row items-center justify-between q-mb-sm">
          <div class="text-h6 text-orange-9">🐛 Debug Information</div>
          <q-btn flat dense round icon="close" @click="showDebug = false" />
        </div>
        <div class="text-caption text-grey-8">
          <div><strong>Loading:</strong> {{ loading }}</div>
          <div><strong>Swap Requests Count:</strong> {{ swapRequests.length }}</div>
          <div><strong>Filtered Requests Count:</strong> {{ filteredRequests.length }}</div>
          <div><strong>Current Page:</strong> {{ pagination.page }}</div>
          <div><strong>Company ID:</strong> {{ currentUserCompany }}</div>
          <div class="q-mt-sm">
            <strong>First Request:</strong>
            <pre class="q-mt-xs" style="font-size: 10px; max-height: 200px; overflow: auto">{{
              swapRequests[0] ? JSON.stringify(swapRequests[0], null, 2) : 'No data'
            }}</pre>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Statistics Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-3">
        <q-card class="stats-card" style="background: #e8d7f1">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="swap_horiz" size="40px" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ statistics.total }}</div>
                <div class="text-subtitle2 text-weight-medium">Total Requests</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card class="stats-card" style="background: #fff9c4">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="pending" size="40px" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ statistics.pending }}</div>
                <div class="text-subtitle2 text-weight-medium">Pending</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card class="stats-card" style="background: #c8e6c9">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="check_circle" size="40px" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ statistics.approved }}</div>
                <div class="text-subtitle2 text-weight-medium">Approved</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card class="stats-card" style="background: #ffccbc">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="cancel" size="40px" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ statistics.rejected }}</div>
                <div class="text-subtitle2 text-weight-medium">Rejected</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Swap Requests Table -->
    <q-card class="shadow-1" style="border: 2px solid #2196f3; border-radius: 8px">
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6 text-weight-bold">Swap Request Overview</div>
          <q-select
            v-model="sortBy"
            :options="sortOptions"
            outlined
            dense
            label="Sort by"
            style="min-width: 150px"
          />
        </div>

        <div style="border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden">
          <q-markup-table flat separator="horizontal">
            <thead style="background: #f5f5f5">
              <tr>
                <th class="text-left" style="width: 60px">No</th>
                <th class="text-left" style="width: 180px">Requested By</th>
                <th class="text-left" style="width: 180px">Employees</th>
                <th class="text-left" style="width: 150px">Original Date</th>
                <th class="text-left" style="width: 150px">New Date</th>
                <th class="text-center" style="width: 200px">Status</th>
                <th class="text-left" style="width: 150px">Requested Date</th>
                <th class="text-center" style="width: 120px">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="8" class="text-center q-py-lg">
                  <q-spinner color="primary" size="40px" />
                  <div class="q-mt-sm text-grey-7">Loading swap requests...</div>
                </td>
              </tr>
              <tr v-else-if="paginatedRequests.length === 0">
                <td colspan="8" class="text-center q-py-lg text-grey-7">No swap requests found</td>
              </tr>
              <tr v-else v-for="(request, index) in paginatedRequests" :key="request.id">
                <td class="text-left">
                  {{ (pagination.page - 1) * pagination.rowsPerPage + index + 1 }}.
                </td>
                <td class="text-left">
                  <div class="row items-center">
                    <q-avatar size="32px" color="primary" text-color="white" class="q-mr-sm">
                      {{ getInitials(request.requested_by_name) }}
                    </q-avatar>
                    <span>{{ request.requested_by_name || 'N/A' }}</span>
                  </div>
                </td>
                <td class="text-left">
                  <div class="text-weight-medium">{{ request.from_employee_name }}</div>
                  <div class="row items-center q-mt-xs">
                    <q-icon name="swap_vert" size="16px" color="grey-7" />
                    <span class="q-ml-xs">{{ request.to_employee_name }}</span>
                  </div>
                </td>
                <td class="text-left">
                  <div class="text-weight-medium">{{ formatDate(request.original_date) }}</div>
                  <div class="text-caption text-grey-7">
                    {{ request.original_assignment?.shift_type?.name || 'N/A' }}
                  </div>
                </td>
                <td class="text-left">
                  <div class="text-weight-medium">{{ formatDate(request.new_date) }}</div>
                  <div class="text-caption text-grey-7">
                    {{ request.new_assignment?.shift_type?.name || 'N/A' }}
                  </div>
                </td>
                <td class="text-center">
                  <q-badge
                    :color="getStatusColor(request.status)"
                    :label="getStatusLabel(request)"
                    style="padding: 4px 12px; font-size: 11px"
                  />

                  <!-- Progress bar for pending/to_employee_approved -->
                  <div v-if="isPendingApproval(request)" class="q-mt-xs">
                    <q-linear-progress
                      :value="getApprovalProgress(request)"
                      :color="canAdminApprove(request) ? 'positive' : 'warning'"
                      size="4px"
                    />
                    <div
                      class="text-caption q-mt-xs"
                      :class="canAdminApprove(request) ? 'text-positive' : 'text-warning'"
                    >
                      {{ getApprovalProgressText(request) }}
                    </div>
                  </div>

                  <!-- Show completion info for approved/rejected -->
                  <div v-if="request.status === 'approved'" class="q-mt-xs">
                    <div class="text-caption text-positive">
                      <q-icon name="check_circle" size="14px" /> Approved
                    </div>
                  </div>

                  <div v-if="request.status === 'rejected'" class="q-mt-xs">
                    <div class="text-caption text-negative">
                      <q-icon name="cancel" size="14px" /> Rejected
                    </div>
                  </div>
                </td>
                <td class="text-left">{{ formatDateTime(request.requested_at) }}</td>
                <td class="text-center">
                  <div class="row justify-center q-gutter-xs">
                    <!-- View Button - Always show -->
                    <q-btn
                      flat
                      round
                      dense
                      icon="visibility"
                      size="sm"
                      color="primary"
                      @click="viewRequest(request)"
                    >
                      <q-tooltip>View Details</q-tooltip>
                    </q-btn>

                    <!-- Approve Button - Show for pending approval requests -->
                    <q-btn
                      v-if="isPendingApproval(request)"
                      flat
                      round
                      dense
                      icon="check"
                      size="sm"
                      :color="canAdminApprove(request) ? 'positive' : 'grey'"
                      :disable="!canAdminApprove(request)"
                      @click="approveRequest(request)"
                    >
                      <q-tooltip>
                        {{
                          canAdminApprove(request)
                            ? 'Approve Swap Request'
                            : `Waiting for ${request.to_employee_name} to approve`
                        }}
                      </q-tooltip>
                    </q-btn>

                    <!-- Reject Button - Show for pending approval requests -->
                    <q-btn
                      v-if="isPendingApproval(request)"
                      flat
                      round
                      dense
                      icon="close"
                      size="sm"
                      color="negative"
                      @click="rejectRequest(request)"
                    >
                      <q-tooltip>Reject Request</q-tooltip>
                    </q-btn>
                  </div>
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>

        <!-- Footer -->
        <div class="row items-center justify-between q-mt-md">
          <div class="text-subtitle2" style="color: #f44336">
            Total <span class="text-weight-bold">{{ filteredRequests.length }} Records</span>
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
      </q-card-section>
    </q-card>

    <!-- View Details Dialog -->
    <q-dialog v-model="viewDialog" persistent>
      <q-card style="min-width: 600px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Swap Request Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedRequest">
          <div class="q-gutter-md">
            <div>
              <div class="text-weight-bold q-mb-xs">Requested By:</div>
              <div>{{ selectedRequest.requested_by_name }}</div>
            </div>

            <q-separator />

            <div>
              <div class="text-weight-bold q-mb-xs">Swap Details:</div>
              <div>
                {{ selectedRequest.from_employee_name }} ↔ {{ selectedRequest.to_employee_name }}
              </div>
            </div>

            <q-separator />

            <div class="row q-col-gutter-md">
              <div class="col-6">
                <div class="text-weight-bold q-mb-xs">Original Assignment:</div>
                <div>{{ formatDate(selectedRequest.original_date) }}</div>
                <div class="text-caption text-grey-7">
                  Site: {{ selectedRequest.original_assignment?.site?.name || 'N/A' }}
                </div>
                <div class="text-caption text-grey-7">
                  Shift: {{ selectedRequest.original_assignment?.shift_type?.name || 'N/A' }}
                </div>
              </div>
              <div class="col-6">
                <div class="text-weight-bold q-mb-xs">New Assignment:</div>
                <div>{{ formatDate(selectedRequest.new_date) }}</div>
                <div class="text-caption text-grey-7">
                  Site: {{ selectedRequest.new_assignment?.site?.name || 'N/A' }}
                </div>
                <div class="text-caption text-grey-7">
                  Shift: {{ selectedRequest.new_assignment?.shift_type?.name || 'N/A' }}
                </div>
              </div>
            </div>

            <q-separator />

            <div>
              <div class="text-weight-bold q-mb-xs">Status:</div>
              <q-badge
                :color="getStatusColor(selectedRequest.status)"
                :label="getStatusLabel(selectedRequest)"
              />
            </div>

            <!-- Employee Approval Status -->
            <div v-if="isPendingApproval(selectedRequest)">
              <div class="text-weight-bold q-mb-xs">Employee Approvals:</div>
              <div class="q-gutter-sm">
                <div class="row items-center">
                  <q-icon
                    :name="selectedRequest.to_employee_approved ? 'check_circle' : 'schedule'"
                    :color="selectedRequest.to_employee_approved ? 'positive' : 'warning'"
                    size="20px"
                    class="q-mr-xs"
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

                <div v-if="canAdminApprove(selectedRequest)" class="row items-center q-mt-sm">
                  <q-icon
                    name="admin_panel_settings"
                    color="positive"
                    size="20px"
                    class="q-mr-xs"
                  />
                  <span class="text-positive text-weight-medium">Ready for admin approval</span>
                </div>
                <div v-else class="row items-center q-mt-sm">
                  <q-icon name="info" color="orange" size="20px" class="q-mr-xs" />
                  <span class="text-orange text-weight-medium">Waiting for employee approval</span>
                </div>
              </div>
            </div>

            <div>
              <div class="text-weight-bold q-mb-xs">Requested At:</div>
              <div>{{ formatDateTime(selectedRequest.requested_at) }}</div>
            </div>

            <div v-if="selectedRequest.admin_approved_at">
              <div class="text-weight-bold q-mb-xs">Admin Approved At:</div>
              <div>{{ formatDateTime(selectedRequest.admin_approved_at) }}</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" v-if="isPendingApproval(selectedRequest)">
          <q-btn
            label="Reject"
            color="negative"
            outline
            @click="rejectRequest(selectedRequest)"
            v-close-popup
          />
          <q-btn
            label="Approve"
            color="positive"
            :disable="!canAdminApprove(selectedRequest)"
            @click="approveRequest(selectedRequest)"
            v-close-popup
          >
            <q-tooltip v-if="!canAdminApprove(selectedRequest)">
              Waiting for employee approval
            </q-tooltip>
          </q-btn>
        </q-card-actions>
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

    const sortOptions = ['Newest', 'Oldest', 'Status']

    const pagination = ref({
      page: 1,
      rowsPerPage: 10,
    })

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

    const debugLocalStorage = () => {
      console.log('🔍 ===== LOCALSTORAGE DEBUG =====')
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        const value = localStorage.getItem(key)
        console.log(`  ${key}:`, value?.substring(0, 50))
      }
      console.log('🔍 ===============================')
    }

    const fetchCurrentUserCompany = async () => {
      try {
        let companyId = localStorage.getItem('selectedCompany')
        if (companyId) {
          currentUserCompany.value = companyId
          console.log(`✅ Company ID: ${companyId}`)
          return companyId
        }

        companyId = localStorage.getItem('company_id')
        if (companyId) {
          currentUserCompany.value = companyId
          return companyId
        }

        throw new Error('Company ID not found')
      } catch (error) {
        console.error('❌ Failed to get company ID:', error.message)
        throw error
      }
    }

    const fetchSwapRequests = async () => {
      loading.value = true
      console.log('🚀 Fetching swap requests...')

      try {
        const token = localStorage.getItem('access_token')
        if (!token) throw new Error('No authentication token')

        const companyId = await fetchCurrentUserCompany()
        if (!companyId) {
          swapRequests.value = []
          return
        }

        const response = await api.get('/organization/swap-requests/', {
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
        console.error('❌ Error:', error)
        swapRequests.value = []
        $q.notify({
          type: 'negative',
          message: 'Failed to fetch swap requests',
          position: 'top',
        })
      } finally {
        loading.value = false
      }
    }

    const updateSwapRequest = async (requestId, payload) => {
      const token = localStorage.getItem('access_token')
      try {
        const response = await api.patch(`/organization/swap-requests/${requestId}/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
        return response.data
      } catch (error) {
        console.error('❌ Update failed:', error)
        throw error
      }
    }

    const approveRequest = async (request) => {
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
            message: 'Swap request approved!',
            position: 'top',
          })

          await fetchSwapRequests()
        } catch {
          $q.notify({
            type: 'negative',
            message: 'Failed to approve request',
            position: 'top',
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
            approved_at: new Date().toISOString(),
          })

          $q.notify({
            type: 'positive',
            message: 'Swap request rejected',
            position: 'top',
          })

          await fetchSwapRequests()
        } catch {
          $q.notify({
            type: 'negative',
            message: 'Failed to reject request',
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

    // Helper functions
    const getInitials = (name) => {
      if (!name) return '?'
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }

    const getStatusColor = (status) => {
      const colors = {
        pending: 'orange',
        to_employee_approved: 'blue',
        approved: 'green',
        rejected: 'red',
      }
      return colors[status] || 'grey'
    }

    const getStatusLabel = (request) => {
      const labels = {
        pending: 'PENDING',
        to_employee_approved: 'EMPLOYEE APPROVED',
        approved: 'APPROVED',
        rejected: 'REJECTED',
      }
      return labels[request.status] || request.status.toUpperCase()
    }

    // NEW: Check if request is pending approval
    const isPendingApproval = (request) => {
      return request.status === 'pending' || request.status === 'to_employee_approved'
    }

    // NEW: Enhanced canAdminApprove
    const canAdminApprove = (request) => {
      const isPending = isPendingApproval(request)
      const employeeApproved = request.to_employee_approved === true

      console.log('🔍 Can approve?', {
        id: request.id,
        isPending,
        employeeApproved,
        result: isPending && employeeApproved,
      })

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

    onMounted(() => {
      console.log('🚀 Component mounted')
      debugLocalStorage()
      fetchSwapRequests()
    })

    return {
      loading,
      search,
      sortBy,
      sortOptions,
      swapRequests,
      pagination,
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
      getStatusColor,
      getStatusLabel,
      isPendingApproval,
      canAdminApprove,
      getApprovalProgress,
      getApprovalProgressText,
      formatDate,
      formatDateTime,
      localStorage,
    }
  },
}
</script>

<style scoped>
.page-header {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.title-section h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.stats-card {
  border-radius: 8px;
}

.rounded-borders {
  border-radius: 8px;
}

.shadow-1 {
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
}

.q-markup-table {
  border: none;
}

.q-markup-table thead tr,
.q-markup-table tbody td {
  height: 60px;
}

.q-markup-table tbody tr:hover {
  background-color: #f5f5f5;
}

.swap-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
