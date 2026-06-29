<template>
  <PageShell>
    <div class="announcement-card">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-titles">
            <h1 class="page-title">Announcements</h1>
          </div>
          <div class="header-actions">
            <q-input
              v-model="searchQuery"
              placeholder="Search announcements..."
              class="header-search"
              dense
              outlined
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
            <q-btn
              label="New Announcement"
              icon="add"
              class="add-announcement-btn header-add-btn"
              unelevated
              @click="openCreateDialog"
            />
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <AnnouncementStatsCards
        :total="announcements.length"
        :active="activeCount"
        :scheduled="scheduledCount"
        :urgent="urgentCount"
      />

      <!-- Table -->
      <AnnouncementTable
        :rows="filteredAnnouncements"
        :loading="loading"
        :type-filter="typeFilter"
        :type-options="typeOptions"
        :positions="positions"
        :users="users"
        :roles="roles"
        @update:type-filter="typeFilter = $event"
      />
    </div>

    <!-- Create / Edit Dialog -->
    <AnnouncementEditDialog
      v-model="showDialog"
      :editing-announcement="editingAnnouncement"
      :saving="saving"
      :positions="positions"
      :users="users"
      :roles="roles"
      :loading-positions="loadingPositions"
      :loading-users="loadingUsers"
      :loading-roles="loadingRoles"
      :type-select-options="typeSelectOptions"
      @save="saveAnnouncement"
      @toggle-target-everyone="onTargetEveryoneToggle"
    />

    <!-- Delete Confirmation Dialog -->
    <AnnouncementDeleteDialog
      v-model="showDeleteDialog"
      :announcement-title="announcementToDelete?.title || ''"
      :deleting="deleting"
      @confirm="confirmDeleteAction"
    />
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, computed, onMounted } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'
import { useAnnouncements } from '@/composables/page/useAnnouncements'
import 'src/css/app.scss'
import AnnouncementStatsCards from '@/components/pages/Announcement/AnnouncementStatsCards.vue'
import AnnouncementTable from '@/components/pages/Announcement/AnnouncementTable.vue'
import AnnouncementEditDialog from '@/components/pages/Announcement/AnnouncementEditDialog.vue'
import AnnouncementDeleteDialog from '@/components/pages/Announcement/AnnouncementDeleteDialog.vue'

const $q = useQuasar()

// ─── Composable ───────────────────────────────────────────────────────────────
const {
  announcements,
  loading,
  saving,
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = useAnnouncements()

// ─── UI state ─────────────────────────────────────────────────────────────────
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingAnnouncement = ref(null)
const announcementToDelete = ref(null)
const searchQuery = ref('')
const typeFilter = ref(null)
const deleting = ref(false)

// ─── Type options ─────────────────────────────────────────────────────────────
const typeOptions = [
  { label: 'General', value: 'general' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Policy', value: 'policy' },
]

const typeSelectOptions = [...typeOptions]

// ─── Dropdown data (local — not in composable) ────────────────────────────────
const positions = ref([])
const users = ref([])
const roles = ref([])
const loadingPositions = ref(false)
const loadingUsers = ref(false)
const loadingRoles = ref(false)

// ─── Computed ─────────────────────────────────────────────────────────────────
const activeCount = computed(() => announcements.value.filter((a) => a.is_active).length)

const scheduledCount = computed(() => {
  const now = new Date()
  return announcements.value.filter((a) => a.start_at && new Date(a.start_at) > now).length
})

const urgentCount = computed(
  () => announcements.value.filter((a) => a.announcement_type === 'urgent').length,
)

const filteredAnnouncements = computed(() => {
  let filtered = announcements.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (a) => a.title.toLowerCase().includes(query) || a.message.toLowerCase().includes(query),
    )
  }
  if (typeFilter.value) {
    filtered = filtered.filter((a) => a.announcement_type === typeFilter.value)
  }
  return filtered
})

// ─── Dropdown loaders (page-local) ───────────────────────────────────────────
const fetchPositions = async () => {
  loadingPositions.value = true
  try {
    const token = localStorage.getItem('access_token')
    const selectedCompany = localStorage.getItem('selectedCompany')
    const res = await api.get('/user/positions/', {
      headers: { Authorization: `Bearer ${token}` },
      params: { company: selectedCompany },
    })
    positions.value = (res.data.results || res.data).map((p) => ({
      label: p.name || p.title || p.position_name,
      value: p.id,
    }))
  } catch (error) {
    console.error('Failed to fetch positions:', error)
    $q.notify({ type: 'warning', message: 'Failed to load positions', position: 'top' })
  } finally {
    loadingPositions.value = false
  }
}

const fetchUsers = async () => {
  loadingUsers.value = true
  try {
    const token = localStorage.getItem('access_token')
    let storedCompany = localStorage.getItem('selectedCompany')
    let companyId = null
    try {
      const parsed = JSON.parse(storedCompany)
      companyId = parsed?.id || parsed
    } catch {
      companyId = storedCompany
    }
    if (!token || !companyId) return
    const response = await api.get(`/user/companies/${companyId}/employees/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    users.value = (response.data || []).map((u) => {
      const fullName =
        u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User #${u.id}`
      return { id: u.id, label: fullName, value: u.id, full_name: fullName }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    $q.notify({ type: 'negative', message: 'Failed to fetch users', position: 'top' })
  } finally {
    loadingUsers.value = false
  }
}

const fetchRoles = async () => {
  loadingRoles.value = true
  try {
    const token = localStorage.getItem('access_token')
    const selectedCompany = localStorage.getItem('selectedCompany')
    const res = await api.get('/user/user-roles/', {
      headers: { Authorization: `Bearer ${token}` },
      params: { company: selectedCompany },
    })
    roles.value = (res.data.results || res.data).map((r) => ({
      label: r.name || r.role_name || r.title,
      value: r.id,
    }))
  } catch (error) {
    console.error('Failed to fetch roles:', error)
    $q.notify({ type: 'warning', message: 'Failed to load roles', position: 'top' })
  } finally {
    loadingRoles.value = false
  }
}

// ─── Dialog helpers ───────────────────────────────────────────────────────────
const openCreateDialog = () => {
  editingAnnouncement.value = null
  showDialog.value = true
}

const onTargetEveryoneToggle = (val) => {
  if (!val) {
    fetchPositions()
    fetchUsers()
    fetchRoles()
  }
}

// ─── Save (create or update) ──────────────────────────────────────────────────
const getCompanyId = () => {
  const stored = localStorage.getItem('selectedCompany')
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    return parsed?.id ?? parsed
  } catch {
    return stored
  }
}

const saveAnnouncement = async (form) => {
  try {
    const targetEveryone = form.target_everyone ?? true
    const payload = {
      title: form.title,
      message: form.message,
      announcement_type:
        typeof form.announcement_type === 'object'
          ? form.announcement_type.value
          : form.announcement_type || 'general',
      is_active: form.is_active ?? true,
      target_everyone: targetEveryone,
      company: getCompanyId(),
    }

    if (form.start_at) {
      payload.start_at = new Date(form.start_at).toISOString()
    }
    if (form.end_at) {
      payload.end_at = new Date(form.end_at).toISOString()
    }

    if (!targetEveryone) {
      payload.target_users = form.target_users.map((u) => (typeof u === 'object' ? u.id : u))
      payload.target_roles = form.target_roles.map((r) => (typeof r === 'object' ? r.id : r))
      payload.target_positions = form.target_positions.map((p) => (typeof p === 'object' ? p.id : p))
    }

    if (editingAnnouncement.value) {
      await updateAnnouncement(editingAnnouncement.value.id, payload)
      $q.notify({ type: 'positive', message: 'Announcement updated successfully', position: 'top' })
    } else {
      await createAnnouncement(payload)
      $q.notify({ type: 'positive', message: 'Announcement created successfully', position: 'top' })
    }

    await fetchAnnouncements()
    showDialog.value = false
  } catch (error) {
    console.error('Save error:', error)
    const data = error.response?.data
    let errMsg = 'Failed to save announcement'
    if (data && typeof data === 'object') {
      const first = Object.values(data)[0]
      errMsg = Array.isArray(first) ? first[0] : data.detail || data.message || errMsg
    } else if (typeof data === 'string' && !data.startsWith('<')) {
      errMsg = data
    }
    $q.notify({ type: 'negative', message: errMsg, position: 'top' })
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const confirmDeleteAction = async () => {
  deleting.value = true
  try {
    await deleteAnnouncement(announcementToDelete.value.id)
    $q.notify({ type: 'positive', message: 'Announcement deleted successfully', position: 'top' })
    await fetchAnnouncements()
    showDeleteDialog.value = false
  } catch (error) {
    console.error('Delete error:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || error.message || 'Failed to delete announcement',
      position: 'top',
    })
  } finally {
    deleting.value = false
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(fetchAnnouncements)
</script>

<style scoped>
/* ==============================
   WRAPPER
   ============================== */
.announcement-card {
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

.add-announcement-btn {
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
  .announcement-card {
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
  .add-announcement-btn {
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
