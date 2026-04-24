<template>
  <q-page class="invite-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Employee Invitations</h1>
          <div class="header-actions">
            <q-btn
              color="primary"
              label="Invite Employee"
              icon="add"
              class="add-employee-btn"
              unelevated
              @click="showInviteModal = true"
            />
            <q-input
              v-model="searchTerm"
              placeholder="Search invitations..."
              class="header-search"
              dense
              outlined
              @update:model-value="filterInvitations"
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
        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-blue">
            <q-icon name="mail" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Total Invitations</div>
            <div class="stats-amount">{{ invites.length }}</div>
            <div class="stats-delta stats-delta-neutral">All time</div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-yellow">
            <q-icon name="schedule" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Unused</div>
            <div class="stats-amount">{{ unusedInvitationsCount }}</div>
            <div class="stats-delta stats-delta-neutral">
              {{
                invites.length > 0
                  ? Math.round((unusedInvitationsCount / invites.length) * 100)
                  : 0
              }}% of total
            </div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-icon-wrapper stats-icon-green">
            <q-icon name="check_circle" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Used</div>
            <div class="stats-amount">{{ usedInvitationsCount }}</div>
            <div class="stats-delta stats-delta-positive">
              {{
                invites.length > 0 ? Math.round((usedInvitationsCount / invites.length) * 100) : 0
              }}% of total
            </div>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <h2 class="table-title">Invitation Overview</h2>
          <div class="table-actions">
            <q-btn
              flat
              dense
              round
              icon="refresh"
              class="refresh-btn"
              @click="loadInvitations"
              :loading="loading"
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
            :loading="loading"
            no-data-label="No invitations found"
            class="loan-table"
            hide-pagination
            :rows-per-page-options="[0]"
          >
            <template v-slot:loading>
              <q-inner-loading showing color="primary" />
            </template>

            <template v-slot:header>
              <q-tr class="table-header-row">
                <q-th class="table-header-cell th-sl">#</q-th>
                <q-th class="table-header-cell th-email">Email Address</q-th>
                <q-th class="table-header-cell th-company">Company</q-th>
                <q-th class="table-header-cell th-role">Role</q-th>
                <q-th class="table-header-cell th-code">Invitation Code</q-th>
                <q-th class="table-header-cell th-status">Status</q-th>
                <q-th class="table-header-cell th-used">Used</q-th>
                <q-th class="table-header-cell th-created">Created</q-th>
                <q-th class="table-header-cell th-expires">Expires</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr class="table-body-row">
                <q-td class="table-body-cell sl-cell td-sl">
                  {{ String(props.rowIndex + 1).padStart(2, '0') }}.
                </q-td>

                <q-td class="table-body-cell email-name-cell td-email">
                  <div class="employee-info">
                    <q-avatar size="34px" class="avatar-fallback">
                      {{ getInitials(props.row.email) }}
                    </q-avatar>
                    <span class="employee-name">{{ props.row.email }}</span>
                  </div>
                </q-td>

                <q-td class="table-body-cell td-company">
                  {{ props.row.company || 'N/A' }}
                </q-td>

                <q-td class="table-body-cell td-role">
                  <span class="role-chip">{{
                    getRoleLabel(props.row.role ?? props.row.user_role)
                  }}</span>
                </q-td>

                <q-td class="table-body-cell td-code">
                  <code class="code-text">{{ props.row.code || 'N/A' }}</code>
                </q-td>

                <q-td class="table-body-cell td-status">
                  <div :class="['status-badge', getStatusClass(props.row.status)]">
                    <span class="status-dot"></span>
                    {{ props.row.status || 'Pending' }}
                  </div>
                </q-td>

                <q-td class="table-body-cell td-used">
                  <div
                    :class="['status-badge', props.row.is_used ? 'status-active' : 'status-unused']"
                  >
                    <span class="status-dot"></span>
                    {{ props.row.is_used ? 'Used' : 'Unused' }}
                  </div>
                </q-td>

                <q-td class="table-body-cell td-created">
                  {{ formatDate(props.row.created_at) }}
                </q-td>

                <q-td class="table-body-cell td-expires">
                  {{ formatDate(props.row.expires_at) }}
                </q-td>
              </q-tr>
            </template>

            <!-- Empty state -->
            <template v-slot:no-data>
              <div class="empty-state">
                <q-icon name="mail_outline" size="48px" class="empty-state-icon" />
                <div class="empty-state-title">No invitations found</div>
                <div class="empty-state-sub">
                  Try adjusting your search or send a new invitation.
                </div>
              </div>
            </template>
          </q-table>
        </div>
      </div>
    </div>

    <!-- ======================== INVITE MODAL ======================== -->
    <q-dialog v-model="showInviteModal" persistent>
      <q-card class="modal-card add-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
              <q-icon name="mail" size="22px" />
            </q-avatar>
            <div>
              <div class="modal-title">Invite Employee</div>
              <div class="modal-subtitle">Enter employee email to send invitation</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" @click="closeModal" />
        </q-card-section>

        <q-card-section class="modal-content">
          <q-form @submit="sendInvitation" class="edit-form">
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

            <div class="form-actions">
              <q-btn label="Cancel" flat class="cancel-btn" @click="closeModal" />
              <q-btn
                label="Send Invitation"
                type="submit"
                unelevated
                class="submit-btn"
                :loading="saving"
                :disable="!isFormValid"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ======================== VIEW INVITATION MODAL ======================== -->
    <q-dialog v-model="showViewModal" persistent>
      <q-card class="modal-card view-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="52px" class="avatar-fallback avatar-fallback-lg">
              {{ getInitials(selectedInvitation?.email) }}
            </q-avatar>
            <div>
              <div class="modal-title">{{ selectedInvitation?.email }}</div>
              <div class="modal-subtitle">
                <span
                  :class="['status-badge', getStatusClass(selectedInvitation?.status)]"
                  style="font-size: 11px"
                >
                  <span class="status-dot"></span>{{ selectedInvitation?.status || 'Pending' }}
                </span>
              </div>
            </div>
          </div>
          <q-btn
            icon="close"
            flat
            round
            dense
            class="modal-close-btn"
            @click="showViewModal = false"
          />
        </q-card-section>

        <q-card-section class="modal-content">
          <div class="detail-grid-cards">
            <div class="detail-card">
              <div class="detail-card-label">Email</div>
              <div class="detail-card-value">{{ selectedInvitation?.email || 'N/A' }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Company</div>
              <div class="detail-card-value">{{ selectedInvitation?.company || 'N/A' }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Role</div>
              <div class="detail-card-value">
                {{ getRoleLabel(selectedInvitation?.role ?? selectedInvitation?.user_role) }}
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Status</div>
              <div class="detail-card-value">
                <span :class="['status-badge', getStatusClass(selectedInvitation?.status)]">
                  <span class="status-dot"></span>{{ selectedInvitation?.status || 'Pending' }}
                </span>
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Used</div>
              <div class="detail-card-value">
                <span
                  :class="[
                    'status-badge',
                    selectedInvitation?.is_used ? 'status-active' : 'status-unused',
                  ]"
                >
                  <span class="status-dot"></span>{{ selectedInvitation?.is_used ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Created</div>
              <div class="detail-card-value">{{ formatDate(selectedInvitation?.created_at) }}</div>
            </div>
            <div class="detail-card">
              <div class="detail-card-label">Expires</div>
              <div class="detail-card-value">{{ formatDate(selectedInvitation?.expires_at) }}</div>
            </div>
            <div class="detail-card detail-card-full">
              <div class="detail-card-label">Invitation Code</div>
              <div class="detail-card-value">
                <code class="code-text">{{ selectedInvitation?.code || 'N/A' }}</code>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ======================== SUCCESS DIALOG ======================== -->
    <q-dialog v-model="showSuccessDialog">
      <q-card class="confirm-dialog">
        <q-card-section class="confirm-header confirm-header-success">
          <q-avatar size="44px" class="confirm-icon-wrap confirm-icon-success">
            <q-icon name="check_circle" size="22px" />
          </q-avatar>
          <div class="confirm-title">Invitation Sent!</div>
        </q-card-section>
        <q-card-section class="confirm-content">
          The invitation has been successfully sent to <strong>{{ sentToEmail }}</strong>
        </q-card-section>
        <q-card-actions align="right" class="confirm-actions">
          <q-btn flat label="Close" class="cancel-btn" @click="showSuccessDialog = false" />
          <q-btn label="Send Another" unelevated class="submit-btn" @click="sendAnother" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useInvites } from '@/composables/page/useInvites'

const $q = useQuasar()

// ─── Composable ───────────────────────────────────────────────────────────────
const { invites, loading, saving, fetchInvites, sendInvite, fetchUserRoles } = useInvites()

// ─── UI state ─────────────────────────────────────────────────────────────────
const showInviteModal = ref(false)
const showViewModal = ref(false)
const showSuccessDialog = ref(false)
const sentToEmail = ref('')
const searchTerm = ref('')
const selectedInvitation = ref(null)

// ─── Roles state (local to this page) ────────────────────────────────────────
const userRoleOptions = ref([])
const loadingRoles = ref(false)

// ─── Form ─────────────────────────────────────────────────────────────────────
const invitationForm = ref({
  email: '',
  user_role: null,
})

// ─── Table ────────────────────────────────────────────────────────────────────
const filteredInvitations = ref([])

const columns = ref([
  { name: 'sl_no', label: '#', field: 'id', align: 'left' },
  { name: 'email', label: 'Email Address', field: 'email', align: 'left' },
  { name: 'company', label: 'Company', field: 'company', align: 'left' },
  { name: 'role', label: 'Role', field: 'role', align: 'left' },
  { name: 'code', label: 'Invitation Code', field: 'code', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'is_used', label: 'Used', field: 'is_used', align: 'center' },
  { name: 'created_at', label: 'Created', field: 'created_at', align: 'left' },
  { name: 'expires_at', label: 'Expires', field: 'expires_at', align: 'left' },
])

// ─── Computed ─────────────────────────────────────────────────────────────────
const isFormValid = computed(() => {
  return (
    invitationForm.value.email &&
    /.+@.+\..+/.test(invitationForm.value.email) &&
    invitationForm.value.user_role
  )
})

const unusedInvitationsCount = computed(() => invites.value.filter((inv) => !inv.is_used).length)
const usedInvitationsCount = computed(() => invites.value.filter((inv) => inv.is_used).length)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (email) => {
  if (!email) return '?'
  const parts = email.split('@')[0].split('.')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return email.substring(0, 2).toUpperCase()
}

const getStatusClass = (status) => {
  if (!status) return 'status-default'
  const s = status.toLowerCase()
  if (s === 'accepted' || s === 'active') return 'status-active'
  if (s === 'declined' || s === 'expired' || s === 'cancelled') return 'status-terminated'
  return 'status-default'
}

const getRoleLabel = (roleValue) => {
  if (!roleValue && roleValue !== 0) return 'N/A'
  const match = userRoleOptions.value.find((r) => r.value === Number(roleValue))
  return match ? match.label : roleValue
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Data loading ─────────────────────────────────────────────────────────────
const loadInvitations = async () => {
  try {
    await fetchInvites()
    filteredInvitations.value = invites.value
  } catch (error) {
    filteredInvitations.value = []
    $q.notify({
      type: 'negative',
      message:
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        'Failed to load invitations',
      position: 'top',
    })
  }
}

const loadUserRoles = async () => {
  try {
    loadingRoles.value = true
    const rolesRaw = await fetchUserRoles()

    userRoleOptions.value = rolesRaw
      .map((r) => ({
        label: r.name || r.role_name || r.title || `Role ${r.id}`,
        value: Number(r.id) || Number(r.role_id) || null,
      }))
      .filter((o) => o.value !== null)

    if (!invitationForm.value.user_role && userRoleOptions.value.length > 0) {
      invitationForm.value.user_role = userRoleOptions.value[0].value
    }
  } catch (error) {
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

// ─── Search / filter ──────────────────────────────────────────────────────────
const filterInvitations = () => {
  if (!searchTerm.value.trim()) {
    filteredInvitations.value = invites.value
    return
  }
  const term = searchTerm.value.toLowerCase()
  filteredInvitations.value = invites.value.filter(
    (inv) =>
      inv.email?.toLowerCase().includes(term) ||
      inv.company?.toLowerCase().includes(term) ||
      inv.role?.toLowerCase().includes(term) ||
      inv.code?.toLowerCase().includes(term) ||
      inv.status?.toLowerCase().includes(term),
  )
}

// ─── Modal / form helpers ─────────────────────────────────────────────────────
const resetForm = () => {
  invitationForm.value = {
    email: '',
    user_role: userRoleOptions.value.length > 0 ? userRoleOptions.value[0].value : null,
  }
}

const closeModal = () => {
  showInviteModal.value = false
  resetForm()
}

const sendAnother = () => {
  showSuccessDialog.value = false
  resetForm()
  showInviteModal.value = true
}

// ─── Send invitation ──────────────────────────────────────────────────────────
const sendInvitation = async () => {
  if (!isFormValid.value) return

  try {
    const storedCompany = localStorage.getItem('selectedCompany')
    let companyId = null
    try {
      const parsed = JSON.parse(storedCompany)
      companyId = parsed?.id ?? parsed
    } catch {
      companyId = storedCompany
    }

    const payload = {
      emails: [invitationForm.value.email.trim()],
      user_role: Number(invitationForm.value.user_role),
      company_id: Number(companyId),
    }

    await sendInvite(payload)

    sentToEmail.value = invitationForm.value.email
    showInviteModal.value = false
    showSuccessDialog.value = true

    $q.notify({
      type: 'positive',
      message: `Invitation sent successfully to ${invitationForm.value.email}`,
      position: 'top',
    })

    await loadInvitations()
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message || error?.response?.data?.detail || 'Failed to send invitation'
    $q.notify({ type: 'negative', message: errorMessage, position: 'top', timeout: 10000 })
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadUserRoles()
  await loadInvitations()
})
</script>

<style scoped>
/* ==============================
   BASE
============================== */
.invite-dashboard {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* ==============================
   HEADER
============================== */
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
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.header-search {
  min-width: 200px;
  max-width: 260px;
}

.header-search .q-field__control {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
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

/* ==============================
   STATS CARDS
============================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid #e8ecf0;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  transition: box-shadow 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.stats-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}

.stats-icon-blue {
  background: #eff6ff;
  color: #3b82f6;
}
.stats-icon-yellow {
  background: #fffbeb;
  color: #f59e0b;
}
.stats-icon-green {
  background: #f0fdf4;
  color: #22c55e;
}

.stats-content {
  min-width: 0;
}

.stats-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stats-amount {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

.stats-delta {
  font-size: 12px;
  margin-top: 3px;
  font-weight: 500;
}

.stats-delta-positive {
  color: #22c55e;
}
.stats-delta-neutral {
  color: #9ca3af;
}

/* ==============================
   TABLE SECTION
============================== */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-wrap: wrap;
  gap: 10px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.refresh-btn {
  color: #6b7280 !important;
  border-radius: 6px !important;
}

.refresh-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.modern-table-container {
  overflow-x: auto;
}

.loan-table {
  width: 100%;
  min-width: 900px;
}

/* Table header */
.table-header-row {
  background: #f8fafc;
}

.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #6b7280 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 11px 16px !important;
  border-bottom: 1px solid #e8ecf0 !important;
  text-align: left !important;
}

.table-header-actions {
  text-align: center !important;
}

/* Table body */
.table-body-row {
  transition: background 0.15s ease;
}

.table-body-row:hover .table-body-cell {
  background: #f9fafb;
}

.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle;
}

.sl-cell {
  color: #9ca3af;
  font-size: 12px !important;
  width: 48px;
}

/* Column widths and alignment — header and body stay in sync */
.th-sl,
.td-sl {
  width: 52px;
  min-width: 52px;
  text-align: left !important;
}

.th-email,
.td-email {
  min-width: 200px;
  text-align: left !important;
}

.th-company,
.td-company {
  min-width: 120px;
  text-align: left !important;
}

.th-role,
.td-role {
  min-width: 110px;
  text-align: left !important;
}

.th-code,
.td-code {
  min-width: 130px;
  text-align: left !important;
}

.th-status,
.td-status {
  min-width: 110px;
  text-align: left !important;
}

.th-used,
.td-used {
  min-width: 100px;
  text-align: left !important;
}

.th-created,
.td-created {
  min-width: 110px;
  text-align: left !important;
}

.th-expires,
.td-expires {
  min-width: 110px;
  text-align: left !important;
}

.email-name-cell {
  min-width: 220px;
}

/* Employee / email info */
.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  word-break: break-all;
}

/* Avatar */
.avatar-fallback {
  background: #e0e7ff !important;
  color: #4338ca !important;
  font-weight: 600 !important;
  min-width: 34px !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}

.avatar-fallback :deep(.q-avatar__content) {
  font-size: 12px !important;
  line-height: 1 !important;
}

.avatar-fallback-lg {
  min-width: 52px !important;
  width: 52px !important;
  height: 52px !important;
}

.avatar-fallback-lg :deep(.q-avatar__content) {
  font-size: 16px !important;
}

/* Role chip */
.role-chip {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  white-space: nowrap;
}

/* Code text */
.code-text {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  background: #f3f4f6;
  padding: 3px 7px;
  border-radius: 4px;
  color: #374151;
  border: 1px solid #e5e7eb;
}

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-active {
  background: #f0fdf4;
  color: #16a34a;
}
.status-active .status-dot {
  background: #22c55e;
}

.status-terminated {
  background: #fef2f2;
  color: #dc2626;
}
.status-terminated .status-dot {
  background: #ef4444;
}

.status-unused {
  background: #fffbeb;
  color: #d97706;
}
.status-unused .status-dot {
  background: #f59e0b;
}

.status-default {
  background: #f3f4f6;
  color: #6b7280;
}
.status-default .status-dot {
  background: #9ca3af;
}

/* Actions */
.actions-cell {
  text-align: center !important;
  width: 60px;
}

.action-menu-btn {
  color: #6b7280 !important;
  border-radius: 6px !important;
}

.action-menu-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.action-dropdown {
  border-radius: 8px !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

.dropdown-item {
  font-size: 13px !important;
  color: #374151 !important;
  min-height: 36px !important;
  padding: 0 12px !important;
}

.dropdown-item:hover {
  background: #f9fafb !important;
}

/* ==============================
   EMPTY STATE
============================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 56px 20px;
  text-align: center;
}

.empty-state-icon {
  color: #d1d5db;
  margin-bottom: 12px;
}

.empty-state-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.empty-state-sub {
  font-size: 13px;
  color: #9ca3af;
}

/* ==============================
   MODALS
============================== */
.modal-card {
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.add-modal {
  max-width: 520px;
}
.view-modal {
  max-width: 560px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #2563eb !important;
  border-bottom: none !important;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-avatar-add {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff !important;
}

.modal-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8) !important;
  margin-top: 2px;
}

.modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
  background: #f9fafb !important;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}

.modal-content::-webkit-scrollbar {
  width: 4px;
}
.modal-content::-webkit-scrollbar-track {
  background: transparent;
}
.modal-content::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

.modal-content :deep(.q-field__control) {
  background: #ffffff !important;
  border-radius: 10px !important;
}
.modal-content :deep(.q-field--outlined .q-field__control:before) {
  border-color: #e2e8f0 !important;
  border-radius: 10px !important;
}
.modal-content :deep(.q-field--outlined .q-field__control:hover:before) {
  border-color: #2563eb !important;
}
.modal-content :deep(.q-field--outlined.q-field--focused .q-field__control:before) {
  border-color: #2563eb !important;
  border-width: 2px !important;
}

/* Form */
.form-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f3f5;
  margin-top: 8px;
}

/* View modal detail cards */
.detail-grid-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #f1f3f5;
}

.detail-card-full {
  grid-column: 1 / -1;
}

.detail-card-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.detail-card-value {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  word-break: break-word;
}

/* Form buttons */
.cancel-btn {
  color: #6b7280;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  padding: 0 18px !important;
  min-height: 38px !important;
}
.cancel-btn:hover {
  background: #f1f5f9 !important;
}
.submit-btn {
  background: #2563eb !important;
  color: white;
  border-radius: 10px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  min-height: 38px !important;
  padding: 0 22px !important;
}
.submit-btn:hover {
  background: #1d4ed8 !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
}

/* Confirm / success dialog */
.confirm-dialog {
  width: 400px;
  max-width: 95vw;
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  overflow: hidden;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px 16px !important;
}

.confirm-header-success {
  background: #2563eb !important;
}

.confirm-icon-wrap {
  border-radius: 10px !important;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2) !important;
}

.confirm-icon-success {
  color: #ffffff !important;
}

.confirm-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.confirm-content {
  padding: 16px 20px !important;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;
  background: #f9fafb;
}

.confirm-content strong {
  color: #111827;
}

.confirm-actions {
  padding: 12px 16px !important;
  border-top: 1px solid #f1f3f5;
  gap: 8px;
  background: #f9fafb;
}

/* ==============================
   RESPONSIVE
============================== */
@media (max-width: 900px) {
  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 14px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    gap: 8px;
  }

  .header-search,
  .add-employee-btn {
    width: 100%;
    max-width: 100%;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-grid-cards {
    grid-template-columns: 1fr;
  }

  .detail-card-full {
    grid-column: span 1;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .q-btn {
    width: 100%;
  }

  .confirm-dialog {
    max-width: calc(100vw - 20px);
  }
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 10px;
  }

  .page-title {
    font-size: 18px;
  }

  .stats-amount {
    font-size: 22px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 10px 10px !important;
    font-size: 12px;
  }

  .modal-title {
    font-size: 15px;
  }
}
</style>
