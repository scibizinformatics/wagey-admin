<template>
  <q-page class="invite-page">
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">Employee Invitations</h1>
            <p class="page-subtitle">Manage and send invitations to new employees</p>
          </div>
          <div class="header-actions">
            <q-btn
              color="primary"
              icon="add"
              label="Invite Employee"
              @click="showInviteModal = true"
              no-caps
              class="invite-btn"
            />
            <q-btn flat round icon="arrow_back" class="back-btn" @click="$router.go(-1)">
              <q-tooltip>Go Back</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>

      <!-- Invitations Table -->
      <div class="table-container">
        <q-card class="invitations-table-card">
          <q-card-section class="table-header">
            <div class="table-header-content">
              <div>
                <h3 class="table-title">Invited Employees</h3>
                <p class="table-subtitle">{{ invitations.length }} invitation(s) sent</p>
              </div>
              <div class="table-actions">
                <q-btn flat icon="refresh" @click="fetchInvitations" :loading="loadingTable">
                  <q-tooltip>Refresh</q-tooltip>
                </q-btn>
              </div>
            </div>
          </q-card-section>

          <q-card-section class="table-section" :class="{ 'q-pa-none': invitations.length > 0 }">
            <q-table
              v-if="invitations.length > 0"
              :rows="invitations"
              :columns="columns"
              row-key="id"
              :loading="loadingTable"
              :rows-per-page-options="[10, 25, 50]"
              class="invitations-table"
            >
              <template v-slot:body-cell-email="props">
                <q-td :props="props">
                  <div class="email-cell">
                    <q-icon name="email" size="16px" color="grey-6" class="q-mr-sm" />
                    {{ props.value }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-company="props">
                <q-td :props="props">
                  <div class="company-cell">
                    <q-icon name="business" size="16px" color="grey-6" class="q-mr-sm" />
                    {{ props.value || 'N/A' }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-role="props">
                <q-td :props="props">
                  <q-chip
                    color="blue-grey-2"
                    text-color="blue-grey-8"
                    :label="props.value || 'N/A'"
                    size="sm"
                  />
                </q-td>
              </template>

              <template v-slot:body-cell-code="props">
                <q-td :props="props">
                  <div class="code-cell">
                    <q-icon name="vpn_key" size="16px" color="grey-6" class="q-mr-sm" />
                    <span class="code-text">{{ props.value || 'N/A' }}</span>
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    :color="getStatusColor(props.value)"
                    text-color="white"
                    :label="props.value || 'Pending'"
                    size="sm"
                    class="status-chip"
                  />
                </q-td>
              </template>

              <template v-slot:body-cell-is_used="props">
                <q-td :props="props">
                  <q-chip
                    :color="props.value ? 'positive' : 'grey-4'"
                    :text-color="props.value ? 'white' : 'grey-8'"
                    :label="props.value ? 'Used' : 'Unused'"
                    size="sm"
                  />
                </q-td>
              </template>

              <template v-slot:body-cell-created_at="props">
                <q-td :props="props">
                  <div class="date-cell">
                    <q-icon name="event" size="16px" color="grey-6" class="q-mr-sm" />
                    {{ formatDate(props.value) }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-expires_at="props">
                <q-td :props="props">
                  <div class="expires-cell">
                    <q-icon name="schedule" size="16px" color="grey-6" class="q-mr-sm" />
                    {{ formatDate(props.value) }}
                  </div>
                </q-td>
              </template>

              <template v-slot:no-data>
                <div class="full-width row flex-center q-gutter-sm">
                  <q-icon size="2em" name="inbox" />
                  <span>No invitations sent yet</span>
                </div>
              </template>
            </q-table>

            <!-- Empty State -->
            <div v-else-if="!loadingTable" class="empty-state">
              <q-icon name="mail_outline" size="64px" color="grey-4" class="q-mb-md" />
              <h4 class="empty-title">No Invitations Yet</h4>
              <p class="empty-subtitle">Start by sending your first employee invitation</p>
              <q-btn
                color="primary"
                icon="add"
                label="Send First Invitation"
                @click="showInviteModal = true"
                no-caps
                class="q-mt-md"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Simplified Invite Modal -->
      <q-dialog v-model="showInviteModal" persistent>
        <q-card class="invite-modal">
          <q-card-section class="modal-header">
            <div class="modal-header-content">
              <div class="header-icon">
                <q-icon name="mail" size="32px" color="primary" />
              </div>
              <div class="header-text">
                <h3 class="modal-title">Invite Employee</h3>
                <p class="modal-subtitle">Enter employee email to send invitation</p>
              </div>
            </div>
            <q-btn flat round icon="close" @click="closeModal" />
          </q-card-section>

          <q-card-section class="modal-form-section">
            <q-form @submit="sendInvitation" class="invitation-form">
              <!-- Email Field -->
              <div class="form-group">
                <label class="form-label">Email Address *</label>
                <q-input
                  v-model="invitationForm.email"
                  type="email"
                  outlined
                  placeholder="Enter employee's email address"
                  class="form-input"
                  :rules="[
                    (val) => !!val || 'Email is required',
                    (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="email" color="grey-6" />
                  </template>
                </q-input>
              </div>

              <!-- User Role Field (Hidden in UI, using default value) -->
              <input type="hidden" v-model="invitationForm.user_role" />

              <!-- Form Actions -->
              <div class="form-actions">
                <q-btn flat label="Cancel" color="grey-7" @click="closeModal" />
                <q-btn
                  type="submit"
                  label="Send Invitation"
                  color="primary"
                  :loading="sending"
                  :disable="!isFormValid"
                  no-caps
                >
                  <q-icon left name="send" />
                </q-btn>
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- Success Dialog -->
      <q-dialog v-model="showSuccessDialog">
        <q-card class="success-dialog">
          <q-card-section class="text-center q-pa-lg">
            <q-icon name="check_circle" size="64px" color="positive" class="q-mb-md" />
            <h4 class="text-h4 q-mb-sm">Invitation Sent!</h4>
            <p class="text-grey-7 q-mb-md">
              The invitation has been successfully sent to {{ sentToEmail }}
            </p>
            <q-btn label="Send Another" color="primary" @click="sendAnother" class="q-mr-sm" />
            <q-btn label="Close" flat @click="showSuccessDialog = false" />
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()

// Modal and UI state
const showInviteModal = ref(false)
const showSuccessDialog = ref(false)
const sentToEmail = ref('')
const loadingTable = ref(false)

// Simplified form data - only email and user_role
const invitationForm = ref({
  email: '',
  user_role: null, // Will be set after fetching roles
})

const sending = ref(false)
const loadingRoles = ref(false)

// Options for dropdowns
const userRoleOptions = ref([])

// Table data
const invitations = ref([])
const columns = [
  {
    name: 'email',
    required: true,
    label: 'Email Address',
    align: 'left',
    field: (row) => row.email,
    format: (val) => `${val}`,
    sortable: true,
  },
  {
    name: 'company',
    label: 'Company',
    align: 'left',
    field: (row) => row.company,
    sortable: true,
  },
  {
    name: 'role',
    label: 'Role',
    align: 'left',
    field: (row) => row.role,
    sortable: true,
  },
  {
    name: 'code',
    label: 'Invitation Code',
    align: 'left',
    field: (row) => row.code,
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    align: 'center',
    field: (row) => row.status,
    sortable: true,
  },
  {
    name: 'is_used',
    label: 'Used',
    align: 'center',
    field: (row) => row.is_used,
    sortable: true,
  },
  {
    name: 'created_at',
    label: 'Created',
    align: 'left',
    field: (row) => row.created_at,
    sortable: true,
  },
  {
    name: 'expires_at',
    label: 'Expires',
    align: 'left',
    field: (row) => row.expires_at,
    sortable: true,
  },
]

// Computed properties
const isFormValid = computed(() => {
  return invitationForm.value.email && /.+@.+\..+/.test(invitationForm.value.email)
})

// Table methods
const fetchInvitations = async () => {
  try {
    loadingTable.value = true
    const token = localStorage.getItem('access_token')
    const selectedCompany = localStorage.getItem('selectedCompany')

    if (!token) {
      throw new Error('No authentication token found')
    }

    if (!selectedCompany) {
      console.warn('No company selected')
      invitations.value = []
      return
    }

    // Parse selectedCompany to get the company ID
    const companyId = parseInt(selectedCompany)

    if (!companyId || isNaN(companyId)) {
      console.warn('Invalid company ID')
      invitations.value = []
      return
    }

    // Fetch invitations with company_id filter
    const response = await axios.get(`https://staging.wageyapp.com/user/invite-list/`, {
      params: {
        company_id: companyId,
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Invitations response:', response.data)

    // Handle different API response formats
    let allInvitations = []
    if (Array.isArray(response.data)) {
      allInvitations = response.data
    } else if (response.data.results && Array.isArray(response.data.results)) {
      allInvitations = response.data.results
    } else if (response.data.data && Array.isArray(response.data.data)) {
      allInvitations = response.data.data
    } else {
      allInvitations = []
    }

    // Filter invitations by company_id if company field exists
    invitations.value = allInvitations.filter((invitation) => {
      // If invitation has a company field, check if it matches
      if (invitation.company_id) {
        return invitation.company_id === companyId
      }
      // If no company_id field, show all (API might already filter)
      return true
    })

    console.log(`Filtered invitations for company ${companyId}:`, invitations.value.length)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    invitations.value = []
  } finally {
    loadingTable.value = false
  }
}

// Fetch user roles
const fetchUserRoles = async () => {
  try {
    loadingRoles.value = true

    const token = localStorage.getItem('access_token')
    if (!token) {
      throw new Error('No authentication token found')
    }

    const response = await axios.get('https://staging.wageyapp.com/user/user-roles/', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('User roles response:', response.data)

    // Transform the API response to match the expected format
    if (Array.isArray(response.data)) {
      userRoleOptions.value = response.data.map((role) => ({
        label: role.name || role.role_name || role.title || `Role ${role.id}`,
        value: role.id,
      }))
    } else if (response.data.results && Array.isArray(response.data.results)) {
      userRoleOptions.value = response.data.results.map((role) => ({
        label: role.name || role.role_name || role.title || `Role ${role.id}`,
        value: role.id,
      }))
    } else if (response.data.data && Array.isArray(response.data.data)) {
      userRoleOptions.value = response.data.data.map((role) => ({
        label: role.name || role.role_name || role.title || `Role ${role.id}`,
        value: role.id,
      }))
    } else {
      console.warn('Unexpected user roles API response format:', response.data)
      userRoleOptions.value = []
    }

    // Set default user_role to first available role
    if (userRoleOptions.value.length > 0 && !invitationForm.value.user_role) {
      invitationForm.value.user_role = userRoleOptions.value[0].value
    }
  } catch (error) {
    console.error('Error fetching user roles:', error)
    userRoleOptions.value = []
  } finally {
    loadingRoles.value = false
  }
}

// Helper functions
const getStatusColor = (status) => {
  if (!status) return 'grey'
  const statusLower = status.toLowerCase()
  const colorMap = {
    pending: 'orange',
    accepted: 'positive',
    declined: 'negative',
    expired: 'grey',
    sent: 'info',
  }
  return colorMap[statusLower] || 'grey'
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

// Form methods
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

    if (!selectedCompany) {
      $q.notify({
        type: 'negative',
        message: 'No company selected. Please select a company first.',
        position: 'top',
      })
      return
    }

    // selectedCompany is stored as a simple string number (e.g., "2")
    const companyId = parseInt(selectedCompany)

    if (!companyId || isNaN(companyId)) {
      $q.notify({
        type: 'negative',
        message: 'Invalid company ID. Please select a company again.',
        position: 'top',
      })
      return
    }

    // Prepare simplified invitation data with company_id
    const invitationData = {
      email: invitationForm.value.email.trim(),
      user_role: parseInt(invitationForm.value.user_role),
      company_id: companyId,
    }

    console.log('Sending invitation data:', invitationData)
    console.log('Authorization token:', token ? 'Present' : 'Missing')

    // Send invitation
    const response = await axios.post(`https://staging.wageyapp.com/user/invite/`, invitationData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Invitation response:', response.data)

    // Success
    sentToEmail.value = invitationForm.value.email
    showInviteModal.value = false
    showSuccessDialog.value = true

    // Refresh the invitations table
    await fetchInvitations()

    $q.notify({
      type: 'positive',
      message: `Invitation sent successfully to ${invitationForm.value.email}`,
      position: 'top',
    })
  } catch (error) {
    console.error('Error sending invitation:', error)
    console.error('Error response data:', error.response?.data)
    console.error('Error response status:', error.response?.status)

    let errorMessage = 'Failed to send invitation'

    if (error.response?.data) {
      // Log the full error response for debugging
      console.log('Full error response:', JSON.stringify(error.response.data, null, 2))

      if (error.response.data.message) {
        errorMessage = error.response.data.message
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data
      } else if (error.response.data.errors || typeof error.response.data === 'object') {
        // Handle validation errors
        const errors = error.response.data.errors || error.response.data
        if (typeof errors === 'object') {
          const errorMessages = Object.entries(errors)
            .map(([field, messages]) => {
              const msgArray = Array.isArray(messages) ? messages : [messages]
              return `${field}: ${msgArray.join(', ')}`
            })
            .join('; ')
          errorMessage = `Validation errors - ${errorMessages}`
        }
      }
    }

    $q.notify({
      type: 'negative',
      message: errorMessage,
      position: 'top',
      timeout: 10000,
    })
  } finally {
    sending.value = false
  }
}

// Load initial data
onMounted(async () => {
  console.log('Loading initial data...')

  // Fetch roles first, then invitations
  await fetchUserRoles()
  await fetchInvitations()

  console.log('Loaded data:', {
    userRoles: userRoleOptions.value.length,
    invitations: invitations.value.length,
  })
})
</script>

<style scoped>
.invite-page {
  background: #f8fafc;
  min-height: 100vh;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* Page Header */
.page-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.title-section h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.invite-btn {
  font-weight: 500;
  padding: 8px 24px;
}

.back-btn {
  color: #6b7280;
}

/* Table Container */
.table-container {
  margin-bottom: 24px;
}

.invitations-table-card {
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #f3f4f6;
}

.table-header {
  padding: 24px;
  border-bottom: 1px solid #f3f4f6;
  background: #f9fafb;
}

.table-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.table-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.table-section {
  padding: 24px;
}

/* Table Styles */
.invitations-table {
  border-radius: 8px;
}

.invitations-table .q-table__top {
  padding: 0;
}

.email-cell,
.expires-cell,
.company-cell,
.code-cell,
.date-cell {
  display: flex;
  align-items: center;
}

.code-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #374151;
}

.status-chip {
  font-size: 12px;
  font-weight: 500;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 64px 32px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.empty-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* Modal Styles */
.invite-modal {
  min-width: 500px;
  max-width: 600px;
  width: 90vw;
  border-radius: 16px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid #f3f4f6;
  background: #f9fafb;
}

.modal-header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.modal-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Form Styles */
.modal-form-section {
  padding: 32px;
}

.invitation-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  background: white;
}

.form-input .q-field__control {
  border-radius: 8px;
  min-height: 48px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

/* Success Dialog */
.success-dialog {
  min-width: 400px;
  border-radius: 16px;
}

.success-dialog .text-h4 {
  color: #1f2937;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 1200px) {
  .page-container {
    max-width: 100%;
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .invite-modal {
    min-width: unset;
    width: 95vw;
    margin: 8px;
  }

  .modal-header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .modal-form-section {
    padding: 24px;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .q-btn {
    width: 100%;
  }

  .table-section {
    padding: 16px;
  }

  .empty-state {
    padding: 48px 24px;
  }
}

@media (max-width: 480px) {
  .page-container {
    padding: 12px;
  }

  .header-content {
    padding: 16px;
  }

  .table-header {
    padding: 16px;
  }

  .invite-modal {
    width: 98vw;
    margin: 4px;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-form-section {
    padding: 16px;
  }
}
</style>
