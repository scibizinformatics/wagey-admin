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
              @click="openInviteModal"
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

          <q-card-section>
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
                  <q-icon name="email" size="16px" class="q-mr-sm text-grey-6" />
                  {{ props.value }}
                </q-td>
              </template>

              <template v-slot:body-cell-role="props">
                <q-td :props="props">
                  <q-chip
                    color="blue-grey-2"
                    text-color="blue-grey-8"
                    :label="props.value"
                    size="sm"
                  />
                </q-td>
              </template>

              <template v-slot:body-cell-created_at="props">
                <q-td :props="props">{{ formatDate(props.value) }}</q-td>
              </template>

              <template v-slot:body-cell-expires_at="props">
                <q-td :props="props">{{ formatDate(props.value) }}</q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
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
                </q-td>
              </template>
            </q-table>

            <div v-else class="empty-state text-center q-pa-lg">
              <q-icon name="mail_outline" size="64px" color="grey-4" class="q-mb-md" />
              <h4>No Invitations Yet</h4>
              <q-btn
                color="primary"
                icon="add"
                label="Send First Invitation"
                @click="openInviteModal"
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
              <q-icon name="mail" size="32px" color="primary" />
              <div>
                <h3 class="modal-title">Invite Employee</h3>
                <p class="modal-subtitle">Enter email and role</p>
              </div>
            </div>
            <q-btn flat round icon="close" @click="closeModal" />
          </q-card-section>

          <q-card-section>
            <q-form @submit="sendInvitation" class="invitation-form">
              <!-- Email -->
              <q-input
                v-model="invitationForm.email"
                type="email"
                outlined
                placeholder="Enter email"
                :rules="[
                  (val) => !!val || 'Email is required',
                  (val) => /.+@.+\..+/.test(val) || 'Invalid email',
                ]"
                class="q-mb-md"
              >
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>

              <!-- Role -->
              <q-select
                v-model="invitationForm.role"
                :options="userRoleOptions"
                outlined
                option-value="id"
                option-label="name"
                emit-value
                map-options
                placeholder="Select role"
                :loading="loadingRoles"
                class="q-mb-md"
              >
                <template v-slot:prepend>
                  <q-icon name="person" />
                </template>
              </q-select>

              <div class="row justify-end q-gutter-sm">
                <q-btn flat label="Cancel" @click="closeModal" />
                <q-btn type="submit" label="Send Invitation" color="primary" :loading="sending" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar, date } from 'quasar'
import axios from 'axios'

const $q = useQuasar()

// state
const invitations = ref([])
const userRoles = ref([])
const loadingTable = ref(false)
const loadingRoles = ref(false)
const sending = ref(false)

const showInviteModal = ref(false)
const invitationForm = ref({
  email: '',
  role: null,
})

// ✅ Table Columns
const columns = [
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'role', label: 'Role', field: 'role', align: 'left' },
  { name: 'created_at', label: 'Date Sent', field: 'created_at', align: 'left' },
  { name: 'expires_at', label: 'Expires At', field: 'expires_at', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

// ✅ Format date safely
const formatDate = (val) => {
  if (!val) return '-'
  return date.formatDate(val, 'MMM D, YYYY HH:mm')
}

const openInviteModal = async () => {
  showInviteModal.value = true
  await fetchUserRoles()
}

// ✅ Fetch Invitations
const fetchInvitations = async () => {
  try {
    loadingTable.value = true
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!companyId) {
      console.error('❌ No company selected in localStorage')
      invitations.value = []
      return
    }

    const res = await axios.get(
      `https://staging.wageyapp.com/user/invite-list/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    invitations.value = res.data || []
  } catch (err) {
    console.error('❌ Error fetching invitations:', err)
    invitations.value = []
  } finally {
    loadingTable.value = false
  }
}

// ✅ Fetch User Roles
const fetchUserRoles = async () => {
  try {
    loadingRoles.value = true
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')
    console.log('🔍 Fetching roles for company:', companyId)

    const res = await axios.get('https://staging.wageyapp.com/user/user-roles/', {
      headers: { Authorization: `Bearer ${token}` },
      params: { company: companyId },
    })
    console.log(res)
    userRoles.value = res.data || []
  } catch (err) {
    console.error('❌ Error fetching roles:', err)
    userRoles.value = []
  } finally {
    loadingRoles.value = false
  }
}

const userRoleOptions = computed(() =>
  userRoles.value.map((role) => ({
    id: role.id,
    name: role.name,
  })),
)

// ✅ Send Invitation
const sendInvitation = async () => {
  try {
    sending.value = true
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('selectedCompany')

    if (!invitationForm.value.email || !invitationForm.value.role || !companyId) {
      $q.notify({ type: 'negative', message: 'Please fill in all fields' })
      return
    }

    const payload = {
      email: invitationForm.value.email,
      user_role: invitationForm.value.role, // role ID
      company_id: companyId, // required by backend
    }

    await axios.post('https://staging.wageyapp.com/user/invite/', payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })

    $q.notify({ type: 'positive', message: 'Invitation sent successfully' })

    showInviteModal.value = false
    invitationForm.value = { email: '', role: null }
    fetchInvitations()
  } catch (err) {
    console.error('❌ Error sending invitation:', err.response?.data || err)
    $q.notify({ type: 'negative', message: 'Failed to send invitation' })
  } finally {
    sending.value = false
  }
}

// ✅ Delete Invitation
const deleteInvitation = async (row) => {
  try {
    const token = localStorage.getItem('access_token')
    await axios.delete(`https://staging.wageyapp.com/user/invite/${row.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    $q.notify({ type: 'positive', message: 'Invitation deleted' })
    fetchInvitations()
  } catch (err) {
    console.error('❌ Error deleting invitation:', err)
    $q.notify({ type: 'negative', message: 'Failed to delete invitation' })
  }
}

const closeModal = () => {
  showInviteModal.value = false
  invitationForm.value = { email: '', role: null }
}

// ✅ Auto fetch when mounted
onMounted(() => {
  fetchInvitations()
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
