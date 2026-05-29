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
      <InviteStatsCards
        :total="invites.length"
        :unused="unusedInvitationsCount"
        :used="usedInvitationsCount"
      />

      <!-- Table Section -->
      <InviteTable
        :rows="filteredInvitations"
        :loading="loading"
        :user-role-options="userRoleOptions"
        @refresh="loadInvitations"
      />

      <!-- Invite Modal -->
      <InviteInviteModal
        v-model="showInviteModal"
        :user-role-options="userRoleOptions"
        :loading-roles="loadingRoles"
        :saving="saving"
        @send="sendInvitation"
      />

      <!-- View Invitation Modal -->
      <InviteViewModal
        v-model="showViewModal"
        :invitation="selectedInvitation"
        :user-role-options="userRoleOptions"
      />

      <!-- Success Dialog -->
      <InviteSuccessDialog
        v-model="showSuccessDialog"
        :sent-to-email="sentToEmail"
        @send-another="sendAnother"
      />
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useInvites } from '@/composables/page/useInvites'
import InviteStatsCards from '@/components/pages/Invite/InviteStatsCards.vue'
import InviteTable from '@/components/pages/Invite/InviteTable.vue'
import InviteInviteModal from '@/components/pages/Invite/InviteInviteModal.vue'
import InviteViewModal from '@/components/pages/Invite/InviteViewModal.vue'
import InviteSuccessDialog from '@/components/pages/Invite/InviteSuccessDialog.vue'

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

// ─── Table ────────────────────────────────────────────────────────────────────
const filteredInvitations = ref([])

// ─── Computed ─────────────────────────────────────────────────────────────────
const unusedInvitationsCount = computed(() => invites.value.filter((inv) => !inv.is_used).length)
const usedInvitationsCount = computed(() => invites.value.filter((inv) => inv.is_used).length)

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

// ─── Send another ─────────────────────────────────────────────────────────────
const sendAnother = () => {
  showSuccessDialog.value = false
  showInviteModal.value = true
}

// ─── Send invitation ──────────────────────────────────────────────────────────
const sendInvitation = async (formData) => {
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
      emails: [formData.email],
      user_role: Number(formData.user_role),
      company_id: Number(companyId),
    }

    await sendInvite(payload)

    sentToEmail.value = formData.email
    showInviteModal.value = false
    showSuccessDialog.value = true

    $q.notify({
      type: 'positive',
      message: `Invitation sent successfully to ${formData.email}`,
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
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 10px;
  }
  .page-title {
    font-size: 18px;
  }
}
</style>
