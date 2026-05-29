<template>
  <q-page class="announcement-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Announcements</h1>
          </div>
          <div class="header-actions">
            <q-btn
              color="primary"
              label="New Announcement"
              icon="add"
              class="add-announcement-btn"
              @click="openCreateDialog"
            />
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
    </div>
  </q-page>
</template>

<script setup>
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
.announcement-dashboard {
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
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-top: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-announcement-btn {
  min-width: 170px;
}

.header-search {
  min-width: 240px;
  max-width: 320px;
}

.search-icon {
  color: #9ca3af;
}

@media (max-width: 1024px) {
  .dashboard-container {
    padding: 14px 16px;
  }
  .header-search {
    min-width: 160px;
    max-width: 200px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 10px 12px;
  }
  .page-header {
    padding: 14px;
    margin-top: 10px;
    margin-bottom: 12px;
  }
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .page-title {
    font-size: 18px;
  }
  .header-actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
  .add-announcement-btn {
    flex: 1 1 auto;
    min-width: 140px;
  }
  .header-search {
    flex: 2 1 160px;
    min-width: 140px;
    max-width: 100%;
  }
}
</style>
