<template>
  <q-page class="invite-page">
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">Employee Invitations</h1>
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

              <q-select
                v-model="invitationForm.user_role"
                label="User Role"
                :options="userRoleOptions"
                :loading="loadingRoles"
                outlined
                dense
                emit-value
                map-options
                option-label="label"
                option-value="value"
                hint="Select a user role"
                clearable
              />

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
  { name: 'company', label: 'Company', align: 'left', field: (row) => row.company, sortable: true },
  { name: 'role', label: 'Role', align: 'left', field: (row) => row.role, sortable: true },
  {
    name: 'code',
    label: 'Invitation Code',
    align: 'left',
    field: (row) => row.code,
    sortable: true,
  },
  { name: 'status', label: 'Status', align: 'center', field: (row) => row.status, sortable: true },
  { name: 'is_used', label: 'Used', align: 'center', field: (row) => row.is_used, sortable: true },
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

// Helper: parse selectedCompany to a usable numeric id (returns null if invalid)
function parseSelectedCompany(raw) {
  if (!raw && raw !== 0) return null
  // try JSON parse first
  try {
    const parsed = JSON.parse(raw)
    // parsed could be a number, object, or string
    if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed
    if (typeof parsed === 'string' && parsed.trim() !== '') {
      const n = Number(parsed)
      if (!isNaN(n) && n > 0) return n
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed.id || parsed.company_id || parsed.value || null
    }
  } catch {
    // not JSON — try direct numeric conversion
    const n = Number(raw)
    if (!isNaN(n) && n > 0) return n
  }
  return null
}

// Table methods
const fetchInvitations = async () => {
  try {
    loadingTable.value = true
    const token = localStorage.getItem('access_token')
    const selectedCompanyRaw = localStorage.getItem('selectedCompany')

    console.log('📋 Fetching invitations...')
    console.log('🔍 raw selectedCompany:', selectedCompanyRaw)

    if (!token) {
      throw new Error('No authentication token found')
    }

    const companyId = parseSelectedCompany(selectedCompanyRaw)
    if (!companyId) {
      console.warn('⚠️ No valid company selected — skipping invitations fetch')
      invitations.value = []
      return
    }

    console.log('✓ Using companyId for invitations:', companyId)

    const response = await axios.get('https://staging.wageyapp.com/user/invite-list/', {
      params: { company: companyId, company_id: companyId },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })

    console.log('✅ Invitations response status:', response.status)
    console.log('📌 Invitations payload:', response.data)

    // The API returns an array directly
    let allInvitations = []
    if (Array.isArray(response.data)) {
      allInvitations = response.data
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      allInvitations = response.data.results
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      allInvitations = response.data.data
    } else {
      allInvitations = []
    }

    console.log(`✅ Loaded ${allInvitations.length} invitations`)

    // Since the API already filters by company via query params,
    // we don't need to filter again (the 'company' field is a string name, not ID)
    invitations.value = allInvitations

    // Optional: Log sample data for debugging
    if (invitations.value.length > 0) {
      console.log('📊 Sample invitation:', invitations.value[0])
    }
  } catch (error) {
    console.error('❌ Error fetching invitations:', error)
    console.error('Error response:', error?.response?.data || error?.message || error)
    invitations.value = []

    // Show user-friendly error
    $q.notify({
      type: 'negative',
      message: error?.response?.data?.detail || 'Failed to load invitations',
      position: 'top',
    })
  } finally {
    loadingTable.value = false
  }
}

// FETCH USER ROLES - FIXED and robust
const fetchUserRoles = async () => {
  try {
    loadingRoles.value = true

    const token = localStorage.getItem('access_token')
    const selectedCompanyRaw = localStorage.getItem('selectedCompany')

    console.log('🔍 Fetching roles - token present?', !!token)
    console.log('🔍 raw selectedCompany:', selectedCompanyRaw)

    if (!token) {
      throw new Error('Missing authentication token')
    }

    const companyId = parseSelectedCompany(selectedCompanyRaw)
    if (!companyId) {
      console.warn('⚠️ No valid company selected for roles')
      userRoleOptions.value = []
      return
    }

    console.log('✓ Using companyId for roles:', companyId)

    // use params instead of string interpolation (safer)
    const response = await axios.get(
      `https://staging.wageyapp.com/user/user-roles/?company=${companyId}`,
      {
        params: { company: companyId },
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    console.log('📥 Raw API response status:', response.status)
    console.log('📌 Response data:', response.data)

    // Normalize different response shapes
    let rolesArray = []
    if (Array.isArray(response.data)) {
      rolesArray = response.data
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      rolesArray = response.data.results
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      rolesArray = response.data.data
    } else if (response.data?.roles && Array.isArray(response.data.roles)) {
      rolesArray = response.data.roles
    } else {
      console.warn('⚠️ Unexpected roles response format, keys:', Object.keys(response.data || {}))
      rolesArray = []
    }

    console.log('📋 rolesArray length:', rolesArray.length)

    // Filter roles to the company (if role item has company/company_id)
    const filtered = rolesArray.filter((r) => {
      if (r.company || r.company_id) {
        return Number(r.company || r.company_id) === Number(companyId)
      }
      return true
    })

    // Map to q-select options { label, value }
    userRoleOptions.value = filtered
      .map((r) => {
        const label = r.name || r.role_name || r.title || `Role ${r.id}`
        const value = Number(r.id) || Number(r.role_id) || null
        return { label, value }
      })
      .filter((o) => o.value !== null)

    console.log('✓ userRoleOptions:', userRoleOptions.value)

    // Set default user_role in invitationForm if empty
    if (!invitationForm.value.user_role && userRoleOptions.value.length > 0) {
      invitationForm.value.user_role = userRoleOptions.value[0].value
      console.log('✓ Set default invitationForm.user_role:', invitationForm.value.user_role)
    }

    // If no roles, notify user (optional)
    if (userRoleOptions.value.length === 0) {
      console.warn('⚠️ No roles available for this company')
      // optional UI notify:
      // $q.notify({ type: 'warning', message: 'No roles found for this company', position: 'top' })
    }
  } catch (error) {
    console.error('❌ ERROR FETCHING ROLES:', error)
    console.error('Error response data:', error?.response?.data || error?.message || error)
    userRoleOptions.value = []
    // show friendly notification
    $q.notify({
      type: 'negative',
      message:
        error?.response?.data?.detail || error?.response?.data?.message || 'Failed to load roles',
      position: 'top',
      timeout: 4000,
    })
  } finally {
    loadingRoles.value = false
    console.log('🏁 Finished fetching roles')
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
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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

// Form methods (unchanged)
const sendInvitation = async () => {
  if (!isFormValid.value) return

  try {
    sending.value = true

    const token = localStorage.getItem('access_token')
    const selectedCompany = localStorage.getItem('selectedCompany')

    console.log('📤 Sending invitation...')
    console.log('🔍 raw selectedCompany:', selectedCompany)

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

    // Prepare invitation data
    const invitationData = {
      email: invitationForm.value.email.trim(),
      user_role: Number(invitationForm.value.user_role),
      company_id: companyId,
    }

    console.log('📤 Sending invitation data:', invitationData)

    // REMOVE params from here - company_id is already in the body
    const response = await axios.post('https://staging.wageyapp.com/user/invite/', invitationData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('✅ Invitation response:', response.data)

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
    console.error('Error response data:', error?.response?.data)
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
  console.log('Loading initial data...')
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
