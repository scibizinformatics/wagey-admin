<template>
  <PageShell>
    <div class="invite-card">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-titles">
            <h1 class="page-title">Employee Invitations</h1>
          </div>
          <div class="header-actions">
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
            <q-btn
              label="Invite Employee"
              icon="add"
              class="add-employee-btn header-add-btn"
              unelevated
              @click="showInviteModal = true"
            />
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
    </div>

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
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
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
/* ==============================
   WRAPPER
   ============================== */
.invite-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

/* ==============================
   HEADER
   ============================== */
.page-header {
  padding: 8px 24px;
  border-bottom: 1px solid #f1f3f5;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.header-search {
  min-width: 220px;
  max-width: 280px;
}

.header-search :deep(.q-field__control) {
  border-radius: 10px;
  height: 36px;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.header-search :deep(.q-field__control:hover) {
  border-color: #cbd5e1;
}

.search-icon {
  color: #94a3b8;
}

.add-employee-btn {
  height: 36px;
  border-radius: 10px;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 13px;
}

.header-add-btn {
  background: #102335 !important;
  color: #ffffff !important;
}

.header-add-btn:hover {
  background: #193d5c !important;
}

/* ==============================
   RESPONSIVE
   ============================== */
@media (max-width: 1440px) {
  .invite-card {
    border-radius: 14px;
  }

  .page-header {
    padding: 8px 20px;
  }
}

@media (max-width: 1024px) {
  .page-header {
    padding: 8px 16px;
  }

  .page-title {
    font-size: 19px;
  }

  .header-search {
    min-width: 180px;
  }
}

@media (max-width: 768px) {
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
  .page-title {
    font-size: 18px;
  }
}
</style>
