<template>
  <PageShell>
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Swap Requests</h1>
          </div>
          <div class="header-actions">
            <q-btn flat round icon="refresh" size="md" class="header-btn" @click="fetchSwapRequests" />
            <q-input v-model="search" placeholder="Search swap requests..." class="header-search" dense outlined>
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <SwapRequestStatsCards :statistics="statistics" />

      <!-- Table -->
      <SwapRequestTable
        :rows="paginatedRequests"
        :loading="loading"
        :sort-by="sortBy"
        :processing-id="processingId"
        :pagination="pagination"
        :total-records="filteredRequests.length"
        @update:sort-by="sortBy = $event"
        @update:pagination="pagination = $event"
        @view="viewRequest"
        @approve="approveRequest"
        @reject="rejectRequest"
      />

    <!-- View Modal -->
    <SwapRequestViewModal
      v-model="viewDialog"
      :request="selectedRequest"
      @approve="handleModalApprove"
      @reject="handleModalReject"
    />
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, computed, onMounted, onActivated } from 'vue'
import { useQuasar } from 'quasar'
import { useSwapRequests } from '@/composables/page/useSwapRequests'
import SwapRequestStatsCards from 'src/components/pages/SwapRequest/SwapRequestStatsCards.vue'
import SwapRequestTable from 'src/components/pages/SwapRequest/SwapRequestTable.vue'
import SwapRequestViewModal from 'src/components/pages/SwapRequest/SwapRequestViewModal.vue'

const $q = useQuasar()

const {
  swapRequests,
  loading,
  fetchSwapRequests: fetchFromComposable,
  updateSwapRequest: updateFromComposable,
} = useSwapRequests()

const processingId = ref(null)
const search = ref('')
const sortBy = ref('Newest')
const viewDialog = ref(false)
const selectedRequest = ref(null)
const currentUserCompany = ref(null)
const correctedStatuses = ref({})

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
})

const getCompanyId = () => {
  const selectedCompanyRaw = localStorage.getItem('selectedCompany')
  if (selectedCompanyRaw && selectedCompanyRaw !== 'null' && selectedCompanyRaw !== 'undefined') {
    const asInt = parseInt(selectedCompanyRaw)
    if (!isNaN(asInt) && asInt > 0) {
      return asInt
    }
  }
  return null
}

const statistics = computed(() => ({
  total: swapRequests.value.length,
  pending: swapRequests.value.filter(
    (req) => req.status === 'pending' || req.status === 'to_employee_approved',
  ).length,
  approved: swapRequests.value.filter((req) => req.status === 'approved').length,
  rejected: swapRequests.value.filter((req) => req.status === 'rejected').length,
}))

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

const normalizeRequest = (request) => ({
  ...request,
  requested_by_name: request.from_employee_name || 'Unknown',
  from_employee_name: request.from_employee_name || 'Unknown',
  to_employee_name: request.to_employee_name || 'Unknown',
  original_assignment: request.original_assignment
    ? {
        ...request.original_assignment,
        site: request.original_assignment.site?.name || request.original_assignment.site || 'N/A',
        shift_type:
          request.original_assignment.shift_type?.name || request.original_assignment.shift_type || 'N/A',
      }
    : null,
  new_assignment: request.new_assignment
    ? {
        ...request.new_assignment,
        site: request.new_assignment.site?.name || request.new_assignment.site || 'N/A',
        shift_type:
          request.new_assignment.shift_type?.name || request.new_assignment.shift_type || 'N/A',
      }
    : null,
})

const fetchSwapRequests = async () => {
  const companyId = getCompanyId()
  if (!companyId) {
    swapRequests.value = []
    $q.notify({ type: 'warning', message: 'Please select a company first', position: 'top' })
    return
  }
  currentUserCompany.value = companyId
  try {
    const rawData = await fetchFromComposable({ company: companyId })
    const mergedData = rawData.map((r) =>
      correctedStatuses.value[r.id] ? { ...r, status: correctedStatuses.value[r.id] } : r,
    )
    swapRequests.value = mergedData.map(normalizeRequest)
    $q.notify({
      type: 'positive',
      message: `Loaded ${swapRequests.value.length} swap request(s)`,
      position: 'top',
    })
  } catch (error) {
    swapRequests.value = []
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch swap requests',
      position: 'top',
      timeout: 5000,
    })
  }
}

const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.user_id || null
  } catch {
    return null
  }
}

const updateSwapRequest = async (requestId, status) => {
  const userId = getCurrentUserId()
  return updateFromComposable(requestId, { id: requestId, status, approved_by: userId })
}

const parseErrorMessage = (error) => {
  const data = error.response?.data
  if (!data) return error.message || 'An unexpected error occurred'
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data.join(', ')
  if (data.detail) return data.detail
  if (data.message) return data.message
  if (data.error) return data.error
  if (data.status) return data.status
  const fieldErrors = Object.entries(data)
    .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
    .join(' | ')
  return fieldErrors || error.message || 'An unexpected error occurred'
}

const isStaleDataError = (errorMessage) => {
  const msg = errorMessage.toLowerCase()
  return msg.includes('no longer pending') || msg.includes('already') || msg.includes('waiting for target employee')
}

const isPendingApproval = (request) => {
  if (!request) return false
  return request.status === 'pending' || request.status === 'to_employee_approved'
}

const canAdminApprove = (request) => {
  if (!request) return false
  return isPendingApproval(request) && request.to_employee_approved === true
}

const approveRequest = async (request) => {
  if (!getCompanyId()) {
    $q.notify({ type: 'negative', message: 'Cannot approve: No company selected', position: 'top' })
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
    processingId.value = request.id
    const optimisticUpdate = (id, status) => {
      const idx = swapRequests.value.findIndex((r) => r.id === id)
      if (idx !== -1) {
        swapRequests.value.splice(idx, 1, { ...swapRequests.value[idx], status })
      }
    }
    optimisticUpdate(request.id, 'approved')
    viewDialog.value = false
    try {
      await updateSwapRequest(request.id, 'approved')
      $q.notify({ type: 'positive', message: 'Swap request approved successfully!', position: 'top' })
      await fetchSwapRequests()
    } catch (error) {
      let errorMessage = parseErrorMessage(error)
      if (errorMessage.includes('do not have an assigned role')) {
        errorMessage = 'Permission denied: You need admin role in this company to approve swaps'
      }
      if (isStaleDataError(errorMessage)) {
        correctedStatuses.value[request.id] = 'approved'
        $q.notify({ type: 'positive', message: 'Swap request approved successfully!', position: 'top', timeout: 3000 })
      } else {
        optimisticUpdate(request.id, request.status)
        $q.notify({ type: 'negative', message: errorMessage, caption: 'Please contact your administrator', position: 'top', timeout: 5000 })
        await fetchSwapRequests()
      }
    } finally {
      processingId.value = null
    }
  })
}

const rejectRequest = async (request) => {
  if (!isPendingApproval(request)) {
    $q.notify({
      type: 'warning',
      message: 'Cannot reject this request',
      caption: 'Only pending requests can be rejected',
      position: 'top',
    })
    return
  }
  $q.dialog({
    title: 'Confirm Rejection',
    message: `Reject swap between ${request.from_employee_name} and ${request.to_employee_name}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    processingId.value = request.id
    const optimisticUpdate = (id, status) => {
      const idx = swapRequests.value.findIndex((r) => r.id === id)
      if (idx !== -1) {
        swapRequests.value.splice(idx, 1, { ...swapRequests.value[idx], status })
      }
    }
    optimisticUpdate(request.id, 'rejected')
    viewDialog.value = false
    try {
      await updateSwapRequest(request.id, 'rejected')
      $q.notify({ type: 'positive', message: 'Swap request rejected successfully', position: 'top' })
      await fetchSwapRequests()
    } catch (error) {
      const errorMessage = parseErrorMessage(error)
      if (isStaleDataError(errorMessage)) {
        correctedStatuses.value[request.id] = 'rejected'
        $q.notify({ type: 'positive', message: 'Swap request rejected successfully', position: 'top', timeout: 3000 })
      } else {
        optimisticUpdate(request.id, request.status)
        $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 5000 })
        await fetchSwapRequests()
      }
    } finally {
      processingId.value = null
    }
  })
}

const handleModalApprove = (request) => {
  approveRequest(request)
}

const handleModalReject = (request) => {
  rejectRequest(request)
}

const viewRequest = (request) => {
  selectedRequest.value = request
  viewDialog.value = true
}

onMounted(async () => {
  await fetchSwapRequests()
})

onActivated(async () => {
  await fetchSwapRequests()
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
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.header-btn {
  height: 36px;
  width: 36px;
  border-radius: 8px;
  color: #6b7280 !important;
}
.header-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
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
.search-icon { color: #9ca3af; }
@media (max-width: 1024px) {
  .page-header { padding: 14px; }
  .header-content { flex-wrap: wrap; }
  .header-actions { width: 100%; justify-content: space-between; }
  .header-search { min-width: 200px; }
}
@media (max-width: 768px) {
  .page-header { padding: 12px 14px; margin-bottom: 12px; }
  .header-content { flex-direction: column; align-items: stretch; }
  .header-actions { flex-direction: row; flex-wrap: wrap; gap: 8px; }
  .header-search { width: 100%; max-width: 100%; order: 3; }
}
@media (max-width: 480px) {
  .page-header { padding: 12px; border-radius: 12px; }
  .page-title { font-size: 18px; }
}
</style>
