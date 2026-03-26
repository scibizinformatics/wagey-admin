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
      <div class="stats-section">
        <div class="stats-card total-card">
          <div class="stats-icon-wrapper">
            <q-icon name="announcement" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ announcements.length }}</div>
            <div class="stats-label">Total Announcements</div>
          </div>
        </div>

        <div class="stats-card active-card">
          <div class="stats-icon-wrapper">
            <q-icon name="check_circle" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ activeCount }}</div>
            <div class="stats-label">Active</div>
          </div>
        </div>

        <div class="stats-card scheduled-card">
          <div class="stats-icon-wrapper">
            <q-icon name="schedule" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ scheduledCount }}</div>
            <div class="stats-label">Scheduled</div>
          </div>
        </div>

        <div class="stats-card urgent-card">
          <div class="stats-icon-wrapper">
            <q-icon name="priority_high" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ urgentCount }}</div>
            <div class="stats-label">Urgent</div>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Announcement Overview</h2>
          </div>
          <q-select
            v-model="typeFilter"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            label="Filter by Type"
            class="type-select"
            dense
            outlined
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="filter_list" />
            </template>
          </q-select>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-wrapper">
          <q-spinner size="lg" color="primary" />
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredAnnouncements.length === 0" class="empty-state">
          <q-icon name="inbox" size="80px" color="grey-4" />
          <div class="empty-title">No announcements found</div>
          <div class="empty-subtitle">Create your first announcement to get started</div>
        </div>

        <!-- Announcements Table -->
        <div v-else class="modern-table-container">
          <q-table
            :rows="filteredAnnouncements"
            :columns="columns"
            row-key="id"
            flat
            no-data-label="No announcements found"
            class="announcement-table"
            hide-pagination
            :rows-per-page-options="[0]"
          >
            <template v-slot:header>
              <q-tr class="table-header-row">
                <q-th class="table-header-cell col-title">Title</q-th>
                <q-th class="table-header-cell col-type">Type</q-th>
                <q-th class="table-header-cell col-message">Message</q-th>
                <q-th class="table-header-cell col-target">Target</q-th>
                <q-th class="table-header-cell col-schedule">Schedule</q-th>
                <q-th class="table-header-cell col-status">Status</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr
                class="table-body-row"
                :class="{ 'urgent-row': props.row.announcement_type === 'urgent' }"
              >
                <q-td class="table-body-cell title-cell col-title">
                  <span class="announcement-title-text">{{ props.row.title }}</span>
                </q-td>
                <q-td class="table-body-cell col-type">
                  <div :class="['type-badge', getTypeBadgeClass(props.row.announcement_type)]">
                    {{ props.row.announcement_type }}
                  </div>
                </q-td>
                <q-td class="table-body-cell message-cell col-message">
                  <span class="message-preview">{{ props.row.message }}</span>
                </q-td>
                <q-td class="table-body-cell col-target">
                  <span v-if="props.row.target_everyone" class="target-everyone">
                    <q-icon name="group" size="14px" /> Everyone
                  </span>
                  <div v-else class="target-chips">
                    <q-chip
                      v-for="(pos, idx) in props.row.target_positions"
                      :key="`pos-${idx}`"
                      size="xs"
                      dense
                      color="blue-1"
                      text-color="blue-9"
                      icon="work"
                    >
                      {{ getPositionName(pos) }}
                    </q-chip>
                    <q-chip
                      v-for="(role, idx) in props.row.target_roles"
                      :key="`role-${idx}`"
                      size="xs"
                      dense
                      color="purple-1"
                      text-color="purple-9"
                      icon="badge"
                    >
                      {{ getRoleName(role) }}
                    </q-chip>
                    <q-chip
                      v-for="(user, idx) in props.row.target_users"
                      :key="`user-${idx}`"
                      size="xs"
                      dense
                      color="green-1"
                      text-color="green-9"
                      icon="person"
                    >
                      {{ getUserName(user) }}
                    </q-chip>
                  </div>
                </q-td>
                <q-td class="table-body-cell schedule-cell col-schedule">
                  <div v-if="props.row.start_at || props.row.end_at" class="schedule-info">
                    <div v-if="props.row.start_at" class="time-item">
                      <q-icon name="schedule" size="13px" />
                      <span>{{ formatDate(props.row.start_at) }}</span>
                    </div>
                    <div v-if="props.row.end_at" class="time-item">
                      <q-icon name="event" size="13px" />
                      <span>{{ formatDate(props.row.end_at) }}</span>
                    </div>
                  </div>
                  <span v-else class="no-schedule">—</span>
                </q-td>
                <q-td class="table-body-cell col-status">
                  <div
                    :class="[
                      'status-badge',
                      props.row.is_active ? 'status-active' : 'status-inactive',
                    ]"
                  >
                    {{ props.row.is_active ? 'Active' : 'Inactive' }}
                  </div>
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="showDialog" persistent>
      <q-card class="modal-card dialog-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-icon name="campaign" class="modal-icon" />
            <div>
              <div class="modal-title">
                {{ editingAnnouncement ? 'Edit Announcement' : 'Add New Announcement' }}
              </div>
              <div class="modal-subtitle">Fill in the announcement details</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="closeDialog" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content" style="max-height: 75vh; overflow-y: auto">
          <div class="form-sections">
            <div class="form-section">
              <div class="section-title">Announcement Details</div>
              <div class="form-grid">
                <q-input
                  v-model="formData.title"
                  label="Title *"
                  outlined
                  dense
                  class="col-span-2"
                  :rules="[(val) => !!val || 'Title is required']"
                />
                <q-input
                  v-model="formData.message"
                  type="textarea"
                  label="Message *"
                  outlined
                  rows="4"
                  class="col-span-2"
                  :rules="[(val) => !!val || 'Message is required']"
                />
                <q-select
                  v-model="formData.announcement_type"
                  :options="typeSelectOptions"
                  label="Type"
                  outlined
                  dense
                  emit-value
                  map-options
                />
                <div class="toggle-row">
                  <q-toggle v-model="formData.is_active" label="Active" color="primary" />
                  <q-toggle
                    v-model="formData.target_everyone"
                    label="Send to Everyone"
                    color="primary"
                  />
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="section-title">Schedule</div>
              <div class="form-grid">
                <q-input
                  v-model="formData.start_at"
                  label="Start Date"
                  type="datetime-local"
                  outlined
                  dense
                />
                <q-input
                  v-model="formData.end_at"
                  label="End Date"
                  type="datetime-local"
                  outlined
                  dense
                />
              </div>
            </div>

            <div v-if="!formData.target_everyone" class="form-section">
              <div class="section-title">Targeting</div>
              <div class="form-grid">
                <q-select
                  v-model="formData.target_positions"
                  :options="positions"
                  label="Target Positions"
                  outlined
                  dense
                  multiple
                  emit-value
                  map-options
                  use-chips
                  :loading="loadingPositions"
                  placeholder="Select positions"
                  class="col-span-2"
                >
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">No positions available</q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <q-select
                  v-model="formData.target_users"
                  :options="users"
                  label="Target Users"
                  outlined
                  dense
                  multiple
                  emit-value
                  map-options
                  use-chips
                  :loading="loadingUsers"
                  placeholder="Select users"
                  class="col-span-2"
                >
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">No users available</q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <q-select
                  v-model="formData.target_roles"
                  :options="roles"
                  label="Target Roles"
                  outlined
                  dense
                  multiple
                  emit-value
                  map-options
                  use-chips
                  :loading="loadingRoles"
                  placeholder="Select roles"
                  class="col-span-2"
                >
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">No roles available</q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="form-actions">
          <q-btn label="Cancel" flat color="grey-7" @click="closeDialog" />
          <q-btn
            :label="editingAnnouncement ? 'Update' : 'Create'"
            color="primary"
            :loading="saving"
            :disable="saving"
            @click="saveAnnouncement"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card class="modal-card confirm-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-icon name="warning" class="modal-icon warning-icon" />
            <div>
              <div class="modal-title">Delete Announcement</div>
              <div class="modal-subtitle">This action cannot be undone</div>
            </div>
          </div>
          <q-btn
            icon="close"
            flat
            round
            class="modal-close-btn"
            @click="showDeleteDialog = false"
          />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content">
          <p class="confirm-text">
            Are you sure you want to delete
            <strong>{{ announcementToDelete?.title }}</strong
            >?
          </p>
        </q-card-section>
        <q-separator />
        <q-card-section class="form-actions">
          <q-btn label="Cancel" flat color="grey-7" @click="showDeleteDialog = false" />
          <q-btn label="Delete" color="negative" :loading="deleting" @click="confirmDeleteAction" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'
import { useAnnouncements } from '../composables/useAnnouncements'
import 'src/css/app.scss'

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

const columns = []

// ─── Type options ─────────────────────────────────────────────────────────────
const typeOptions = [
  { label: 'General', value: 'general' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Policy', value: 'policy' },
]

const typeSelectOptions = [...typeOptions]

// ─── Form ─────────────────────────────────────────────────────────────────────
const formData = ref({
  title: '',
  message: '',
  announcement_type: 'general',
  is_active: true,
  start_at: '',
  end_at: '',
  target_everyone: true,
  target_positions: [],
  target_users: [],
  target_roles: [],
})

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

// ─── Name resolvers ───────────────────────────────────────────────────────────
const getRoleName = (roleId) => {
  const role = roles.value.find((r) => r.value === roleId)
  return role ? role.label : `Role #${roleId}`
}

const getPositionName = (posId) => {
  const pos = positions.value.find((p) => p.value === posId)
  return pos ? pos.label : `Position #${posId}`
}

const getUserName = (userId) => {
  const user = users.value.find((u) => u.id === userId)
  return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : `User #${userId}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTypeBadgeClass = (type) => {
  const classes = {
    general: 'type-general',
    urgent: 'type-urgent',
    maintenance: 'type-maintenance',
    policy: 'type-policy',
  }
  return classes[type] || 'type-general'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Dropdown loaders (page-local, no composable for these) ──────────────────
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
  formData.value = {
    title: '',
    message: '',
    announcement_type: 'general',
    is_active: true,
    start_at: '',
    end_at: '',
    target_everyone: true,
    target_positions: [],
    target_users: [],
    target_roles: [],
  }
  fetchPositions()
  fetchUsers()
  fetchRoles()
  showDialog.value = true
}

const editAnnouncement = (a) => {
  editingAnnouncement.value = a
  formData.value = { ...a }
  fetchPositions()
  fetchUsers()
  fetchRoles()
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

const confirmDelete = (announcement) => {
  announcementToDelete.value = announcement
  showDeleteDialog.value = true
}

// ─── Save (create or update) ──────────────────────────────────────────────────
const saveAnnouncement = async () => {
  try {
    const targetEveryone = formData.value.target_everyone ?? true
    const payload = {
      title: formData.value.title,
      message: formData.value.message,
      announcement_type:
        typeof formData.value.announcement_type === 'object'
          ? formData.value.announcement_type.value
          : formData.value.announcement_type || 'general',
      is_active: formData.value.is_active ?? true,
      target_everyone: targetEveryone,
    }

    if (formData.value.start_at) {
      payload.start_at = new Date(formData.value.start_at).toISOString()
    }
    if (formData.value.end_at) {
      payload.end_at = new Date(formData.value.end_at).toISOString()
    }

    if (!targetEveryone) {
      payload.target_users = formData.value.target_users.map((u) =>
        typeof u === 'object' ? u.id : u,
      )
      payload.target_roles = formData.value.target_roles.map((r) =>
        typeof r === 'object' ? r.id : r,
      )
      payload.target_positions = formData.value.target_positions.map((p) =>
        typeof p === 'object' ? p.id : p,
      )
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

/* Stats */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.stats-icon-wrapper {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.total-card .stats-icon-wrapper {
  background: #dbeafe;
}
.active-card .stats-icon-wrapper {
  background: #dcfce7;
}
.scheduled-card .stats-icon-wrapper {
  background: #fef3c7;
}
.urgent-card .stats-icon-wrapper {
  background: #fee2e2;
}

.total-card .stats-icon {
  color: #3b82f6;
  font-size: 22px;
}
.active-card .stats-icon {
  color: #22c55e;
  font-size: 22px;
}
.scheduled-card .stats-icon {
  color: #f59e0b;
  font-size: 22px;
}
.urgent-card .stats-icon {
  color: #ef4444;
  font-size: 22px;
}

.stats-amount {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.stats-label {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
}

/* Table section */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.table-title {
  font-size: 17px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.type-select {
  min-width: 180px;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  gap: 10px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.empty-subtitle {
  font-size: 14px;
  color: #9ca3af;
}

.modern-table-container {
  padding: 0 0 8px;
}

.announcement-table {
  border-radius: 0;
}

.table-header-row {
  background: #f9fafb;
}

.table-header-cell {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
}

.table-body-row:hover {
  background: #f9fafb;
}

.urgent-row {
  border-left: 3px solid #ef4444;
}

.table-body-cell {
  padding: 12px 16px;
  font-size: 13px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

/* Column widths */
.col-title {
  min-width: 160px;
}
.col-type {
  min-width: 110px;
}
.col-message {
  min-width: 200px;
}
.col-target {
  min-width: 160px;
}
.col-schedule {
  min-width: 140px;
}
.col-status {
  min-width: 90px;
}

.announcement-title-text {
  font-weight: 500;
  color: #111827;
}

.message-cell .message-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 260px;
  color: #6b7280;
  font-size: 12px;
}

.target-everyone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.target-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.schedule-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.no-schedule {
  color: #d1d5db;
}

/* Badges */
.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.type-general {
  background: #e0f2fe;
  color: #0369a1;
}
.type-urgent {
  background: #fee2e2;
  color: #dc2626;
}
.type-maintenance {
  background: #fef3c7;
  color: #d97706;
}
.type-policy {
  background: #f3e8ff;
  color: #7c3aed;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #dcfce7;
  color: #16a34a;
}
.status-inactive {
  background: #f3f4f6;
  color: #6b7280;
}

/* Action buttons */
.action-buttons {
  display: flex;
  gap: 4px;
}

.edit-btn {
  color: #3b82f6;
}
.edit-btn:hover {
  background: #dbeafe;
}
.delete-btn {
  color: #ef4444;
}
.delete-btn:hover {
  background: #fecaca;
}

/* Modal */
.modal-card {
  border-radius: 16px;
  overflow: hidden;
}

.dialog-modal {
  width: 640px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.confirm-modal {
  width: 420px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px !important;
  background: #fafafa;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-icon {
  font-size: 28px;
  color: #3b82f6;
  background: #dbeafe;
  padding: 8px;
  border-radius: 10px;
}

.warning-icon {
  color: #f59e0b;
  background: #fef3c7;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.modal-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.modal-close-btn {
  color: #9ca3af;
}

.modal-content {
  padding: 20px 24px !important;
  flex: 1;
  overflow-y: auto;
}

.confirm-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
}

/* Form Sections */
.form-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #e2e8f0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.col-span-2 {
  grid-column: span 2;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 20px;
  grid-column: span 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px !important;
  background: #fafafa;
}

/* ── Responsive ─────────────────────────────────────────── */

@media (max-width: 1024px) {
  .dashboard-container {
    padding: 14px 16px;
  }
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .stats-card {
    padding: 14px;
  }
  .stats-amount {
    font-size: 22px;
  }
  .stats-icon-wrapper {
    width: 42px;
    height: 42px;
  }
  .header-search {
    min-width: 160px;
    max-width: 200px;
  }
  .type-select {
    min-width: 160px;
  }
  .modern-table-container {
    overflow-x: auto;
  }
  .announcement-table {
    min-width: 700px;
  }
  .message-cell .message-preview {
    max-width: 180px;
  }
  .dialog-modal {
    width: 580px;
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
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 12px;
  }
  .stats-card {
    padding: 12px;
    gap: 10px;
  }
  .stats-icon-wrapper {
    width: 38px;
    height: 38px;
  }
  .stats-icon {
    font-size: 20px;
  }
  .stats-amount {
    font-size: 20px;
  }
  .stats-label {
    font-size: 11px;
  }
  .table-header {
    padding: 12px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .table-title {
    font-size: 15px;
  }
  .type-select {
    width: 100%;
    min-width: unset;
  }
  .modern-table-container {
    margin: 0 8px 8px 8px;
    overflow-x: auto;
    border-radius: 8px;
  }
  .announcement-table {
    min-width: 640px;
  }
  .table-header-cell,
  .table-body-cell {
    padding: 10px 8px;
    font-size: 12px;
  }
  .message-cell .message-preview {
    max-width: 140px;
    font-size: 11px;
  }
  .dialog-modal {
    width: 95vw;
    max-width: 95vw;
  }
  .form-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .col-span-2 {
    grid-column: span 1;
  }
  .toggle-row {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }
  .modal-card {
    margin: 8px;
    max-width: calc(100vw - 16px);
  }
}
</style>
