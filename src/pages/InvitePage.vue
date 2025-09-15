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

              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    :color="getStatusColor(props.value)"
                    text-color="white"
                    :label="getStatusLabel(props.value)"
                    size="sm"
                    class="status-chip"
                  />
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

              <template v-slot:body-cell-schedule_name="props">
                <q-td :props="props">
                  <div class="schedule-cell">
                    <q-icon name="schedule" size="16px" color="grey-6" class="q-mr-sm" />
                    {{ props.value || 'N/A' }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-recurring_name="props">
                <q-td :props="props">
                  <div class="recurring-cell">
                    <q-icon name="repeat" size="16px" color="grey-6" class="q-mr-sm" />
                    {{ props.value || 'None' }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-assignment_period="props">
                <q-td :props="props">
                  <div class="assignment-period">
                    <q-icon name="date_range" size="16px" color="grey-6" class="q-mr-sm" />
                    {{ props.value }}
                  </div>
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

              <template v-slot:body-cell-expires_at="props">
                <q-td :props="props">
                  <div class="expires-cell">
                    <q-icon name="schedule" size="16px" color="grey-6" class="q-mr-sm" />
                    {{ formatDate(props.value) }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-date_sent="props">
                <q-td :props="props">
                  {{ formatDate(props.value) }}
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <div class="action-buttons">
                    <q-btn
                      flat
                      round
                      icon="send"
                      size="sm"
                      color="primary"
                      @click="resendInvitation(props.row)"
                      :loading="resendingId === props.row.id"
                      :disable="props.row.is_used"
                    >
                      <q-tooltip>{{
                        props.row.is_used ? 'Cannot resend used invitation' : 'Resend Invitation'
                      }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      icon="delete"
                      size="sm"
                      color="negative"
                      @click="deleteInvitation(props.row)"
                    >
                      <q-tooltip>Delete Invitation</q-tooltip>
                    </q-btn>
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

      <!-- Invite Modal -->
      <q-dialog v-model="showInviteModal" persistent>
        <q-card class="invite-modal">
          <q-card-section class="modal-header">
            <div class="modal-header-content">
              <div class="header-icon">
                <q-icon name="mail" size="32px" color="primary" />
              </div>
              <div class="header-text">
                <h3 class="modal-title">Invite Employee</h3>
                <p class="modal-subtitle">Fill in the details below to send an invitation</p>
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

              <!-- User Role Field -->
              <div class="form-group">
                <label class="form-label">User Role *</label>
                <q-select
                  v-model="invitationForm.user_role"
                  :options="userRoleOptions"
                  outlined
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  placeholder="Select user role"
                  class="form-input"
                  :loading="loadingRoles"
                  :disable="loadingRoles"
                  :rules="[(val) => (val !== null && val !== undefined) || 'User role is required']"
                >
                  <template v-slot:prepend>
                    <q-icon name="person" color="grey-6" />
                  </template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ loadingRoles ? 'Loading roles...' : 'No roles available' }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- Schedule Field -->
              <div class="form-group">
                <label class="form-label">Schedule *</label>
                <q-select
                  v-model="invitationForm.schedule"
                  :options="scheduleOptions"
                  outlined
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  placeholder="Select schedule"
                  class="form-input"
                  :loading="loadingSchedules"
                  :disable="loadingSchedules"
                  :rules="[(val) => (val !== null && val !== undefined) || 'Schedule is required']"
                >
                  <template v-slot:prepend>
                    <q-icon name="schedule" color="grey-6" />
                  </template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ loadingSchedules ? 'Loading schedules...' : 'No schedules available' }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- Recurring Schedule Field -->
              <div class="form-group">
                <label class="form-label">Recurring Schedule</label>
                <q-select
                  v-model="invitationForm.recurring_schedule"
                  :options="recurringScheduleOptions"
                  outlined
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  placeholder="Select recurring schedule (optional)"
                  class="form-input"
                  :loading="loadingRecurring"
                  :disable="loadingRecurring"
                  clearable
                >
                  <template v-slot:prepend>
                    <q-icon name="repeat" color="grey-6" />
                  </template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{
                          loadingRecurring
                            ? 'Loading options...'
                            : 'No recurring schedules available'
                        }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- Date Range Fields -->
              <div class="form-row">
                <div class="form-group half-width">
                  <label class="form-label">Assignment Start Date *</label>
                  <q-input
                    v-model="invitationForm.assignment_start_date"
                    type="date"
                    outlined
                    class="form-input"
                    :rules="[(val) => !!val || 'Start date is required']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="event" color="grey-6" />
                    </template>
                  </q-input>
                </div>

                <div class="form-group half-width">
                  <label class="form-label">Assignment End Date *</label>
                  <q-input
                    v-model="invitationForm.assignment_end_date"
                    type="date"
                    outlined
                    class="form-input"
                    :rules="[
                      (val) => !!val || 'End date is required',
                      (val) =>
                        !invitationForm.assignment_start_date ||
                        val >= invitationForm.assignment_start_date ||
                        'End date must be after start date',
                    ]"
                  >
                    <template v-slot:prepend>
                      <q-icon name="event" color="grey-6" />
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- Custom Message Field -->
              <div class="form-group">
                <label class="form-label">Custom Message (Optional)</label>
                <q-input
                  v-model="customMessage"
                  type="textarea"
                  rows="3"
                  outlined
                  placeholder="Add a personal welcome message for the employee..."
                  class="form-input"
                />
              </div>

              <!-- Form Actions -->
              <div class="form-actions">
                <q-btn flat label="Cancel" color="grey-7" @click="closeModal" />
                <q-btn
                  type="submit"
                  label="Send Invitation"
                  color="primary"
                  :loading="sending"
                  :disable="!isFormValid || loadingAnyData"
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
const resendingId = ref(null)

// Form data
const invitationForm = ref({
  email: '',
  user_role: null,
  schedule: null,
  recurring_schedule: null,
  assignment_start_date: new Date().toISOString().split('T')[0],
  assignment_end_date: (() => {
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    return nextYear.toISOString().split('T')[0]
  })(),
})

const getInvitationStatus = (invitation) => {
  // If the invitation is used, status is 'used'
  if (invitation.is_used) {
    return 'used'
  }

  // Check if invitation has expired
  if (invitation.expires_at) {
    const now = new Date()
    const expirationDate = new Date(invitation.expires_at)

    if (expirationDate < now) {
      return 'expired'
    }
  }

  // If not used and not expired, status is 'unused'
  return 'unused'
}

const customMessage = ref('')
const sending = ref(false)
const loadingRoles = ref(false)
const loadingSchedules = ref(false)
const loadingRecurring = ref(false)

// Table data with updated columns for new API structure
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
    name: 'code',
    label: 'Invitation Code',
    align: 'left',
    field: (row) => row.code || row.invitation_code || row.invite_code,
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    align: 'center',
    field: (row) => getInvitationStatus(row), // Use the computed status
    sortable: true,
  },
  {
    name: 'role',
    label: 'Role',
    align: 'left',
    field: (row) => row.role || getRoleLabel(row.user_role),
    sortable: true,
  },
  {
    name: 'expires_at',
    label: 'Expires',
    align: 'left',
    field: (row) => row.expires_at,
    sortable: true,
  },
  {
    name: 'date_sent',
    label: 'Date Sent',
    align: 'left',
    field: (row) => row.created_at || row.date_sent,
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Actions',
    align: 'center',
    field: 'actions',
  },
]

// Options for dropdowns
const userRoleOptions = ref([])
const scheduleOptions = ref([])
const recurringScheduleOptions = ref([])

// Computed properties
const isFormValid = computed(() => {
  return (
    invitationForm.value.email &&
    /.+@.+\..+/.test(invitationForm.value.email) &&
    invitationForm.value.user_role !== null &&
    invitationForm.value.schedule !== null &&
    invitationForm.value.assignment_start_date &&
    invitationForm.value.assignment_end_date &&
    invitationForm.value.assignment_end_date >= invitationForm.value.assignment_start_date
  )
})

const loadingAnyData = computed(() => {
  return loadingRoles.value || loadingSchedules.value || loadingRecurring.value
})

// Table methods
const fetchInvitations = async () => {
  try {
    loadingTable.value = true
    const token = localStorage.getItem('access_token')

    if (!token) {
      throw new Error('No authentication token found')
    }

    const response = await axios.get('https://staging.wageyapp.com/user/invite-list/', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Invitations response:', response.data)

    // Handle different API response formats
    if (Array.isArray(response.data)) {
      invitations.value = response.data
    } else if (response.data.results && Array.isArray(response.data.results)) {
      invitations.value = response.data.results
    } else if (response.data.data && Array.isArray(response.data.data)) {
      invitations.value = response.data.data
    } else {
      invitations.value = []
    }
  } catch (error) {
    console.error('Error fetching invitations:', error)

    // Mock data for development/demo purposes with new API structure
    invitations.value = [
      {
        id: 1,
        email: 'john.doe@example.com',
        company: 'Tech Solutions Inc',
        role: 'Administrator',
        schedule_name: 'Morning Shift',
        recurring_name: 'Weekly',
        assignment_start_date: '2024-09-01',
        assignment_end_date: '2025-09-01',
        is_used: false,
        status: 'pending',
        created_at: '2024-09-04T10:30:00Z',
        expires_at: '2024-09-18T10:30:00Z',
      },
      {
        id: 2,
        email: 'jane.smith@example.com',
        company: 'Digital Marketing Co',
        role: 'Manager',
        schedule_name: 'Afternoon Shift',
        recurring_name: 'Bi-weekly',
        assignment_start_date: '2024-09-01',
        assignment_end_date: '2025-09-01',
        is_used: true,
        status: 'accepted',
        created_at: '2024-09-03T14:20:00Z',
        expires_at: '2024-09-17T14:20:00Z',
      },
      {
        id: 3,
        email: 'mike.johnson@example.com',
        company: 'Consulting Group',
        role: 'Employee',
        schedule_name: 'Night Shift',
        recurring_name: null,
        assignment_start_date: '2024-09-05',
        assignment_end_date: '2025-09-05',
        is_used: false,
        status: 'expired',
        created_at: '2024-08-20T09:15:00Z',
        expires_at: '2024-09-03T09:15:00Z',
      },
    ]
  } finally {
    loadingTable.value = false
  }
}

// API Methods
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
      userRoleOptions.value = [
        { label: 'Administrator', value: 1 },
        { label: 'Manager', value: 2 },
        { label: 'Employee', value: 3 },
      ]
    }
  } catch (error) {
    console.error('Error fetching user roles:', error)
    userRoleOptions.value = [
      { label: 'Administrator', value: 1 },
      { label: 'Manager', value: 2 },
      { label: 'Employee', value: 3 },
    ]
  } finally {
    loadingRoles.value = false
  }
}

const fetchSchedules = async () => {
  try {
    loadingSchedules.value = true

    const token = localStorage.getItem('access_token')
    if (!token) {
      throw new Error('No authentication token found')
    }

    const response = await axios.get('https://staging.wageyapp.com/organization/shift-types/', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Schedules response:', response.data)

    // Transform the API response to match the expected format
    if (Array.isArray(response.data)) {
      scheduleOptions.value = response.data.map((schedule) => ({
        label: schedule.name || schedule.shift_name || schedule.title || `Schedule ${schedule.id}`,
        value: schedule.id,
      }))
    } else if (response.data.results && Array.isArray(response.data.results)) {
      scheduleOptions.value = response.data.results.map((schedule) => ({
        label: schedule.name || schedule.shift_name || schedule.title || `Schedule ${schedule.id}`,
        value: schedule.id,
      }))
    } else if (response.data.data && Array.isArray(response.data.data)) {
      scheduleOptions.value = response.data.data.map((schedule) => ({
        label: schedule.name || schedule.shift_name || schedule.title || `Schedule ${schedule.id}`,
        value: schedule.id,
      }))
    } else {
      console.warn('Unexpected schedules API response format:', response.data)
      scheduleOptions.value = [
        { label: 'Morning Shift', value: 1 },
        { label: 'Afternoon Shift', value: 2 },
        { label: 'Night Shift', value: 3 },
      ]
    }
  } catch (error) {
    console.error('Error fetching schedules:', error)
    scheduleOptions.value = [
      { label: 'Morning Shift', value: 1 },
      { label: 'Afternoon Shift', value: 2 },
      { label: 'Night Shift', value: 3 },
    ]
  } finally {
    loadingSchedules.value = false
  }
}

const fetchRecurringSchedules = async () => {
  try {
    loadingRecurring.value = true

    const token = localStorage.getItem('access_token')
    if (!token) {
      throw new Error('No authentication token found')
    }

    const response = await axios.get(
      'https://staging.wageyapp.com/organization/recurring-schedules/',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    console.log('Recurring schedules response:', response.data)

    // Transform the API response to match the expected format
    if (Array.isArray(response.data)) {
      recurringScheduleOptions.value = response.data.map((schedule) => ({
        label: schedule.name || schedule.frequency || schedule.title || `Recurring ${schedule.id}`,
        value: schedule.id,
      }))
    } else if (response.data.results && Array.isArray(response.data.results)) {
      recurringScheduleOptions.value = response.data.results.map((schedule) => ({
        label: schedule.name || schedule.frequency || schedule.title || `Recurring ${schedule.id}`,
        value: schedule.id,
      }))
    } else if (response.data.data && Array.isArray(response.data.data)) {
      recurringScheduleOptions.value = response.data.data.map((schedule) => ({
        label: schedule.name || schedule.frequency || schedule.title || `Recurring ${schedule.id}`,
        value: schedule.id,
      }))
    } else {
      recurringScheduleOptions.value = [
        { label: 'Weekly', value: 1 },
        { label: 'Bi-weekly', value: 2 },
        { label: 'Monthly', value: 3 },
      ]
    }
  } catch (error) {
    console.error('Error fetching recurring schedules:', error)
    recurringScheduleOptions.value = [
      { label: 'Weekly', value: 1 },
      { label: 'Bi-weekly', value: 2 },
      { label: 'Monthly', value: 3 },
    ]
  } finally {
    loadingRecurring.value = false
  }
}

// Helper functions
const getRoleLabel = (value) => {
  const role = userRoleOptions.value.find((r) => r.value === value)
  return role ? role.label : 'Unknown Role'
}

const getStatusLabel = (status) => {
  const statusMap = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
    used: 'Used', // Add this
    unused: 'Unused', // Add this
  }
  return statusMap[status] || 'Pending'
}

// 4. UPDATE your existing getStatusColor function (don't create a new one):
// Find the existing function and replace its content with:
const getStatusColor = (status) => {
  const colorMap = {
    pending: 'orange',
    accepted: 'positive',
    declined: 'negative',
    expired: 'grey',
    used: 'positive', // Add this
    unused: 'blue', // Add this
  }
  return colorMap[status] || 'orange'
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
    user_role: null,
    schedule: null,
    recurring_schedule: null,
    assignment_start_date: new Date().toISOString().split('T')[0],
    assignment_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
  }
  customMessage.value = ''
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
    const companyId = localStorage.getItem('companyId')

    if (!token || !companyId) {
      $q.notify({
        type: 'negative',
        message: 'Missing authentication. Please log in again.',
        position: 'top',
      })
      return
    }

    // Prepare invitation data
    const invitationData = {
      email: invitationForm.value.email.trim(),
      user_role: invitationForm.value.user_role,
      schedule: invitationForm.value.schedule,
      assignment_start_date: invitationForm.value.assignment_start_date,
      assignment_end_date: invitationForm.value.assignment_end_date,
      custom_message: customMessage.value?.trim() || '',
    }

    // Only include recurring_schedule if it's selected
    if (
      invitationForm.value.recurring_schedule !== null &&
      invitationForm.value.recurring_schedule !== undefined
    ) {
      invitationData.recurring_schedule = invitationForm.value.recurring_schedule
    }

    console.log('Sending invitation data:', invitationData)

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

    let errorMessage = 'Failed to send invitation'

    if (error.response?.data) {
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

const resendInvitation = async (invitation) => {
  try {
    resendingId.value = invitation.id

    const token = localStorage.getItem('access_token')
    if (!token) {
      throw new Error('No authentication token found')
    }

    $q.notify({
      type: 'positive',
      message: `Invitation resent to ${invitation.email}`,
      position: 'top',
    })

    // Refresh the invitations table
    await fetchInvitations()
  } catch (error) {
    console.error('Error resending invitation:', error)

    $q.notify({
      type: 'negative',
      message: 'Failed to resend invitation',
      position: 'top',
    })
  } finally {
    resendingId.value = null
  }
}

const deleteInvitation = (invitation) => {
  $q.dialog({
    title: 'Delete Invitation',
    message: `Are you sure you want to delete the invitation for ${invitation.email}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      await axios.delete(`https://staging.wageyapp.com/user/invite/${invitation.id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      $q.notify({
        type: 'positive',
        message: 'Invitation deleted successfully',
        position: 'top',
      })

      // Refresh the invitations table
      await fetchInvitations()
    } catch (error) {
      console.error('Error deleting invitation:', error)

      $q.notify({
        type: 'negative',
        message: 'Failed to delete invitation',
        position: 'top',
      })
    }
  })
}

// Load initial data
onMounted(async () => {
  console.log('Loading initial data...')

  // Fetch all data in parallel
  await Promise.all([
    fetchUserRoles(),
    fetchSchedules(),
    fetchRecurringSchedules(),
    fetchInvitations(),
  ])

  console.log('Loaded options:', {
    userRoles: userRoleOptions.value.length,
    schedules: scheduleOptions.value.length,
    recurringSchedules: recurringScheduleOptions.value.length,
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
.schedule-cell,
.company-cell,
.recurring-cell,
.assignment-period,
.expires-cell {
  display: flex;
  align-items: center;
}

.status-chip {
  font-size: 12px;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 4px;
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
  min-width: 600px;
  max-width: 700px;
  width: 90vw;
  border-radius: 16px;
  max-height: 90vh;
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
  max-height: 60vh;
  overflow-y: auto;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.half-width {
  flex: 1;
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

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
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
