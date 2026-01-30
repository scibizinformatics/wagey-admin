<template>
  <q-page class="employee-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Employee Invitations</h1>
          </div>
          <div class="header-actions">
            <q-btn
              color="primary"
              label="Invite Employee"
              icon="add"
              class="add-employee-btn"
              @click="showInviteModal = true"
            />
            <q-input
              v-model="searchTerm"
              placeholder="Search invitations..."
              class="header-search"
              dense
              outlined
              @input="filterInvitations"
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
        <div class="stats-card personal-card">
          <div class="stats-icon-wrapper">
            <q-icon name="mail" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ invitations.length }}</div>
            <div class="stats-label">Total Invitations</div>
          </div>
        </div>

        <div class="stats-card corporate-card">
          <div class="stats-icon-wrapper">
            <q-icon name="schedule" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ unusedInvitationsCount }}</div>
            <div class="stats-label">Unused</div>
          </div>
        </div>

        <div class="stats-card business-card">
          <div class="stats-icon-wrapper">
            <q-icon name="check_circle" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ usedInvitationsCount }}</div>
            <div class="stats-label">Used</div>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Invitation Overview</h2>
          </div>
          <div class="table-actions">
            <q-btn
              flat
              dense
              round
              icon="refresh"
              @click="fetchInvitations"
              :loading="loadingTable"
            >
              <q-tooltip>Refresh</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- Invitations Table -->
        <div class="modern-table-container">
          <q-table
            :rows="filteredInvitations"
            :columns="columns"
            row-key="id"
            flat
            :loading="loadingTable"
            no-data-label="No invitations found"
            class="loan-table"
            hide-pagination
            :rows-per-page-options="[0]"
          >
            <template v-slot:header>
              <q-tr class="table-header-row">
                <q-th class="table-header-cell">SL No</q-th>
                <q-th class="table-header-cell">Email Address</q-th>
                <q-th class="table-header-cell">Company</q-th>
                <q-th class="table-header-cell">Role</q-th>
                <q-th class="table-header-cell">Invitation Code</q-th>
                <q-th class="table-header-cell">Status</q-th>
                <q-th class="table-header-cell">Used</q-th>
                <q-th class="table-header-cell">Created</q-th>
                <q-th class="table-header-cell">Expires</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr class="table-body-row">
                <q-td class="table-body-cell">
                  {{ String(props.rowIndex + 1).padStart(2, '0') }}.
                </q-td>
                <q-td class="table-body-cell email-cell">
                  <div class="employee-info">
                    <q-avatar size="32px" color="primary" text-color="white">
                      {{ getInitials(props.row.email) }}
                    </q-avatar>
                    <span class="employee-name">{{ props.row.email }}</span>
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  {{ props.row.company || 'N/A' }}
                </q-td>
                <q-td class="table-body-cell">
                  {{ props.row.role || 'N/A' }}
                </q-td>
                <q-td class="table-body-cell">
                  <code class="code-text">{{ props.row.code || 'N/A' }}</code>
                </q-td>
                <q-td class="table-body-cell">
                  <div :class="['status-badge', getStatusClass(props.row.status)]">
                    {{ props.row.status || 'Pending' }}
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  <div
                    :class="[
                      'status-badge',
                      props.row.is_used ? 'status-active' : 'status-terminated',
                    ]"
                  >
                    {{ props.row.is_used ? 'Used' : 'Unused' }}
                  </div>
                </q-td>
                <q-td class="table-body-cell">
                  {{ formatDate(props.row.created_at) }}
                </q-td>
                <q-td class="table-body-cell">
                  {{ formatDate(props.row.expires_at) }}
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </div>
      </div>
    </div>

    <!-- Invite Modal -->
    <q-dialog v-model="showInviteModal" persistent>
      <q-card class="modal-card add-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-icon name="mail" class="modal-icon" />
            <div>
              <div class="modal-title">Invite Employee</div>
              <div class="modal-subtitle">Enter employee email to send invitation</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="closeModal" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content">
          <q-form @submit="sendInvitation" class="edit-form">
            <div class="form-sections">
              <!-- Email Field -->
              <div class="form-section">
                <div class="section-title">Email Information</div>
                <div class="form-grid">
                  <q-input
                    v-model="invitationForm.email"
                    label="Email Address *"
                    type="email"
                    outlined
                    dense
                    :rules="[
                      (val) => !!val || 'Email is required',
                      (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
                    ]"
                  >
                    <template v-slot:prepend>
                      <q-icon name="email" />
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- Role Selection -->
              <div class="form-section">
                <div class="section-title">Role Assignment</div>
                <div class="form-grid">
                  <q-select
                    v-model="invitationForm.user_role"
                    :options="userRoleOptions"
                    :loading="loadingRoles"
                    option-label="label"
                    option-value="value"
                    emit-value
                    map-options
                    label="User Role *"
                    outlined
                    dense
                    clearable
                    :rules="[(val) => !!val || 'Role is required']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="badge" />
                    </template>
                  </q-select>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <q-btn label="Cancel" flat color="grey-7" @click="closeModal" />
              <q-btn
                label="Send Invitation"
                type="submit"
                color="primary"
                :loading="sending"
                :disable="!isFormValid"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- View Invitation Modal -->
    <q-dialog v-model="showViewModal" persistent>
      <q-card class="modal-card view-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="80px" color="primary" text-color="white" class="modal-avatar">
              {{ getInitials(selectedInvitation?.email) }}
            </q-avatar>
            <div>
              <div class="modal-title">{{ selectedInvitation?.email }}</div>
              <div class="modal-subtitle">Invitation Details</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="showViewModal = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content">
          <div class="detail-sections">
            <!-- Invitation Information -->
            <div class="detail-section">
              <div class="section-title">Invitation Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">{{ selectedInvitation?.email || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Company:</span>
                  <span class="detail-value">{{ selectedInvitation?.company || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Role:</span>
                  <span class="detail-value">{{ selectedInvitation?.role || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Invitation Code:</span>
                  <span class="detail-value">
                    <code class="code-text">{{ selectedInvitation?.code || 'N/A' }}</code>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <div :class="['status-badge', getStatusClass(selectedInvitation?.status)]">
                      {{ selectedInvitation?.status || 'Pending' }}
                    </div>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Used:</span>
                  <span class="detail-value">
                    <div
                      :class="[
                        'status-badge',
                        selectedInvitation?.is_used ? 'status-active' : 'status-terminated',
                      ]"
                    >
                      {{ selectedInvitation?.is_used ? 'Yes' : 'No' }}
                    </div>
                  </span>
                </div>
              </div>
            </div>

            <!-- Date Information -->
            <div class="detail-section">
              <div class="section-title">Date Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Created:</span>
                  <span class="detail-value">{{
                    formatDate(selectedInvitation?.created_at) || 'N/A'
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Expires:</span>
                  <span class="detail-value">{{
                    formatDate(selectedInvitation?.expires_at) || 'N/A'
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Success Dialog -->
    <q-dialog v-model="showSuccessDialog">
      <q-card class="terminate-dialog">
        <q-card-section class="terminate-header">
          <q-icon name="check_circle" class="restore-icon" />
          <div class="terminate-title">Invitation Sent!</div>
        </q-card-section>
        <q-card-section class="terminate-content">
          The invitation has been successfully sent to <strong>{{ sentToEmail }}</strong>
        </q-card-section>
        <q-card-actions align="right" class="terminate-actions">
          <q-btn label="Close" flat color="grey-7" @click="showSuccessDialog = false" />
          <q-btn label="Send Another" flat color="primary" @click="sendAnother" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()

// Modal and UI state
const showInviteModal = ref(false)
const showViewModal = ref(false)
const showSuccessDialog = ref(false)
const sentToEmail = ref('')
const loadingTable = ref(false)
const searchTerm = ref('')

// Form data
const invitationForm = ref({
  email: '',
  user_role: null,
})

const sending = ref(false)
const loadingRoles = ref(false)

// Options
const userRoleOptions = ref([])

// Table data
const invitations = ref([])
const filteredInvitations = ref([])
const selectedInvitation = ref(null)

const columns = ref([
  { name: 'sl_no', label: 'SL No', field: 'id', align: 'left' },
  { name: 'email', label: 'Email Address', field: 'email', align: 'left' },
  { name: 'company', label: 'Company', field: 'company', align: 'left' },
  { name: 'role', label: 'Role', field: 'role', align: 'left' },
  { name: 'code', label: 'Invitation Code', field: 'code', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'is_used', label: 'Used', field: 'is_used', align: 'center' },
  { name: 'created_at', label: 'Created', field: 'created_at', align: 'left' },
  { name: 'expires_at', label: 'Expires', field: 'expires_at', align: 'left' },
])

// Computed properties
const isFormValid = computed(() => {
  return (
    invitationForm.value.email &&
    /.+@.+\..+/.test(invitationForm.value.email) &&
    invitationForm.value.user_role
  )
})

const unusedInvitationsCount = computed(() => {
  return invitations.value.filter((inv) => !inv.is_used).length
})

const usedInvitationsCount = computed(() => {
  return invitations.value.filter((inv) => inv.is_used).length
})

// Helper functions
function parseSelectedCompany(raw) {
  if (!raw && raw !== 0) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed
    if (typeof parsed === 'string' && parsed.trim() !== '') {
      const n = Number(parsed)
      if (!isNaN(n) && n > 0) return n
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed.id || parsed.company_id || parsed.value || null
    }
  } catch {
    const n = Number(raw)
    if (!isNaN(n) && n > 0) return n
  }
  return null
}

const getInitials = (email) => {
  if (!email) return '?'
  const parts = email.split('@')[0].split('.')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

const getStatusClass = (status) => {
  if (!status) return 'status-default'
  const statusLower = status.toLowerCase()
  if (statusLower === 'accepted' || statusLower === 'active') return 'status-active'
  if (statusLower === 'declined' || statusLower === 'expired' || statusLower === 'cancelled')
    return 'status-terminated'
  return 'status-default'
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Fetch invitations
const fetchInvitations = async () => {
  try {
    loadingTable.value = true
    const token = localStorage.getItem('access_token')
    const selectedCompanyRaw = localStorage.getItem('selectedCompany')

    if (!token) {
      throw new Error('No authentication token found')
    }

    const companyId = parseSelectedCompany(selectedCompanyRaw)
    if (!companyId) {
      console.warn('⚠️ No valid company selected')
      invitations.value = []
      filteredInvitations.value = []
      return
    }

    const response = await axios.get('https://staging.wageyapp.com/user/invite-list/', {
      params: { company: companyId, company_id: companyId },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })

    let allInvitations = []
    if (Array.isArray(response.data)) {
      allInvitations = response.data
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      allInvitations = response.data.results
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      allInvitations = response.data.data
    }

    invitations.value = allInvitations
    filteredInvitations.value = allInvitations
  } catch (error) {
    console.error('❌ Error fetching invitations:', error)
    invitations.value = []
    filteredInvitations.value = []

    $q.notify({
      type: 'negative',
      message: error?.response?.data?.detail || 'Failed to load invitations',
      position: 'top',
    })
  } finally {
    loadingTable.value = false
  }
}

// Fetch user roles
const fetchUserRoles = async () => {
  try {
    loadingRoles.value = true

    const token = localStorage.getItem('access_token')
    const selectedCompanyRaw = localStorage.getItem('selectedCompany')

    if (!token) {
      throw new Error('Missing authentication token')
    }

    const companyId = parseSelectedCompany(selectedCompanyRaw)
    if (!companyId) {
      console.warn('⚠️ No valid company selected for roles')
      userRoleOptions.value = []
      return
    }

    const response = await axios.get(
      `https://staging.wageyapp.com/user/user-roles/?company=${companyId}`,
      {
        params: { company: companyId },
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    let rolesArray = []
    if (Array.isArray(response.data)) {
      rolesArray = response.data
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      rolesArray = response.data.results
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      rolesArray = response.data.data
    } else if (response.data?.roles && Array.isArray(response.data.roles)) {
      rolesArray = response.data.roles
    }

    const filtered = rolesArray.filter((r) => {
      if (r.company || r.company_id) {
        return Number(r.company || r.company_id) === Number(companyId)
      }
      return true
    })

    userRoleOptions.value = filtered
      .map((r) => {
        const label = r.name || r.role_name || r.title || `Role ${r.id}`
        const value = Number(r.id) || Number(r.role_id) || null
        return { label, value }
      })
      .filter((o) => o.value !== null)

    if (!invitationForm.value.user_role && userRoleOptions.value.length > 0) {
      invitationForm.value.user_role = userRoleOptions.value[0].value
    }
  } catch (error) {
    console.error('❌ ERROR FETCHING ROLES:', error)
    userRoleOptions.value = []
    $q.notify({
      type: 'negative',
      message:
        error?.response?.data?.detail || error?.response?.data?.message || 'Failed to load roles',
      position: 'top',
      timeout: 4000,
    })
  } finally {
    loadingRoles.value = false
  }
}

// Filter invitations
const filterInvitations = () => {
  if (!searchTerm.value.trim()) {
    filteredInvitations.value = invitations.value
    return
  }

  const term = searchTerm.value.toLowerCase()
  filteredInvitations.value = invitations.value.filter(
    (inv) =>
      inv.email?.toLowerCase().includes(term) ||
      inv.company?.toLowerCase().includes(term) ||
      inv.role?.toLowerCase().includes(term) ||
      inv.code?.toLowerCase().includes(term) ||
      inv.status?.toLowerCase().includes(term),
  )
}

// Modal methods
const closeModal = () => {
  showInviteModal.value = false
  resetForm()
}

const resetForm = () => {
  invitationForm.value = {
    email: '',
    user_role: userRoleOptions.value.length > 0 ? userRoleOptions.value[0].value : null,
  }
}

const sendAnother = () => {
  showSuccessDialog.value = false
  resetForm()
  showInviteModal.value = true
}

// Action handlers
const viewInvitation = (invitation) => {
  selectedInvitation.value = invitation
  showViewModal.value = true
}

// Send invitation
const sendInvitation = async () => {
  if (!isFormValid.value) return

  try {
    sending.value = true

    const token = localStorage.getItem('access_token')
    const selectedCompany = localStorage.getItem('selectedCompany')

    if (!token) {
      $q.notify({
        type: 'negative',
        message: 'Missing authentication. Please log in again.',
        position: 'top',
      })
      return
    }

    const companyId = parseSelectedCompany(selectedCompany)
    if (!companyId) {
      $q.notify({
        type: 'negative',
        message: 'No company selected. Please select a company first.',
        position: 'top',
      })
      return
    }

    const invitationData = {
      email: invitationForm.value.email.trim(),
      user_role: Number(invitationForm.value.user_role),
      company_id: companyId,
    }

    await axios.post('https://staging.wageyapp.com/user/invite/', invitationData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    sentToEmail.value = invitationForm.value.email
    showInviteModal.value = false
    showSuccessDialog.value = true

    await fetchInvitations()

    $q.notify({
      type: 'positive',
      message: `Invitation sent successfully to ${invitationForm.value.email}`,
      position: 'top',
    })
  } catch (error) {
    console.error('❌ Error sending invitation:', error)
    let errorMessage = 'Failed to send invitation'
    if (error?.response?.data?.message) errorMessage = error.response.data.message
    else if (error?.response?.data?.detail) errorMessage = error.response.data.detail
    $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 10000 })
  } finally {
    sending.value = false
  }
}

// Load initial data
onMounted(async () => {
  await fetchUserRoles()
  await fetchInvitations()
})
</script>

<style scoped>
/* Copy all the styles from the employee page */
.employee-dashboard {
  background: #f8fafc;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

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

.add-employee-btn {
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

.personal-card {
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
}

.corporate-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.business-card {
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

.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 10px;
  overflow: hidden;
  margin: 0 16px 16px 16px;
}

.loan-table {
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

.code-text {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  color: #374151;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.status-active {
  background: #dcfce7;
  color: #16a34a;
}

.status-terminated {
  background: #fee2e2;
  color: #dc2626;
}

.status-default {
  background: #fef3c7;
  color: #d97706;
}

.modal-card {
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.add-modal {
  max-width: 600px;
}

.view-modal {
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

.modal-icon {
  font-size: 28px;
  color: #3b82f6;
  background: #dbeafe;
  padding: 8px;
  border-radius: 8px;
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

.form-sections,
.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section,
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: 16px;
}

.terminate-dialog {
  max-width: 420px;
  border-radius: 12px;
}

.terminate-header {
  text-align: center;
  padding: 20px 20px 12px;
}

.restore-icon {
  font-size: 42px;
  color: #16a34a;
  margin-bottom: 10px;
}

.terminate-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.terminate-content {
  padding: 0 20px 12px;
  text-align: center;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}

.terminate-content strong {
  color: #111827;
}

.terminate-actions {
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
}

/* Responsive styles matching employee page */
@media (max-width: 1024px) {
  .dashboard-container {
    padding: 16px;
  }

  .header-content {
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .stats-section {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    gap: 12px;
  }

  .add-employee-btn,
  .header-search {
    width: 100%;
    max-width: 100%;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
  }

  .modern-table-container {
    overflow-x: auto;
  }

  .loan-table {
    min-width: 1000px;
  }

  .modal-card {
    margin: 12px;
    max-width: calc(100vw - 24px);
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 12px;
  }

  .page-title {
    font-size: 18px;
  }

  .stats-amount {
    font-size: 22px;
  }

  .table-title {
    font-size: 16px;
  }
}
</style>
