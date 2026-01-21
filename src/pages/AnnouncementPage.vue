<template>
  <q-page class="announcements-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <!-- Title Section -->
        <div class="title-section">
          <h1 class="page-title">Announcements</h1>
        </div>
      </div>
    </div>

    <!-- Stats Section -->
    <!-- <div class="stats-section">
      <div class="stats-grid">
        <q-card class="stat-card">
          <q-card-section class="stat-content">
            <div class="stat-icon-wrapper total">
              <q-icon name="announcement" size="28px" />
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ announcements.length }}</div>
              <div class="stat-label">Total Announcements</div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="stat-card">
          <q-card-section class="stat-content">
            <div class="stat-icon-wrapper active">
              <q-icon name="check_circle" size="28px" />
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ activeCount }}</div>
              <div class="stat-label">Active</div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="stat-card">
          <q-card-section class="stat-content">
            <div class="stat-icon-wrapper scheduled">
              <q-icon name="schedule" size="28px" />
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ scheduledCount }}</div>
              <div class="stat-label">Scheduled</div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="stat-card">
          <q-card-section class="stat-content">
            <div class="stat-icon-wrapper urgent">
              <q-icon name="priority_high" size="28px" />
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ urgentCount }}</div>
              <div class="stat-label">Urgent</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>-->

    <!-- Filter Section -->
    <div class="filter-section">
      <div class="filter-content">
        <q-input
          v-model="searchQuery"
          outlined
          placeholder="Search announcements..."
          dense
          class="search-input"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-select
          v-model="typeFilter"
          :options="typeOptions"
          outlined
          dense
          label="Type"
          class="filter-select"
        />
        <q-btn
          color="primary"
          label="New Announcement"
          icon="add"
          unelevated
          @click="openCreateDialog"
          class="add-btn"
        />
      </div>
    </div>

    <!-- Content Section -->
    <div class="content-section">
      <q-spinner v-if="loading" size="lg" color="primary" class="loading-spinner" />

      <div v-else-if="filteredAnnouncements.length === 0" class="empty-state">
        <q-icon name="inbox" size="80px" color="grey-4" />
        <div class="empty-title">No announcements found</div>
        <div class="empty-subtitle">Create your first announcement to get started</div>
      </div>

      <div v-else class="announcements-grid">
        <q-card
          v-for="a in filteredAnnouncements"
          :key="a.id"
          class="announcement-card"
          :class="{ urgent: a.announcement_type === 'urgent' }"
        >
          <q-card-section class="card-header">
            <div class="card-header-top">
              <div class="header-chips">
                <q-chip
                  :color="getTypeColor(a.announcement_type)"
                  text-color="white"
                  dense
                  size="sm"
                  class="type-chip"
                >
                  {{ a.announcement_type }}
                </q-chip>
                <q-badge :color="a.is_active ? 'green' : 'grey'" class="status-badge">
                  {{ a.is_active ? 'Active' : 'Inactive' }}
                </q-badge>
              </div>
            </div>
          </q-card-section>

          <q-card-section class="card-content">
            <h3 class="announcement-title">{{ a.title }}</h3>
            <p class="announcement-message">{{ a.message }}</p>

            <div v-if="!a.target_everyone" class="targeting-section">
              <div class="targeting-chips">
                <q-chip
                  v-for="(pos, idx) in a.target_positions"
                  :key="`pos-${idx}`"
                  size="sm"
                  dense
                  color="blue-1"
                  text-color="blue-9"
                  icon="work"
                >
                  {{ getPositionName(pos) }}
                </q-chip>
                <q-chip
                  v-for="(role, idx) in a.target_roles"
                  :key="`role-${idx}`"
                  size="sm"
                  dense
                  color="purple-1"
                  text-color="purple-9"
                  icon="badge"
                >
                  {{ getRoleName(role) }}
                </q-chip>
                <q-chip
                  v-for="(user, idx) in a.target_users"
                  :key="`user-${idx}`"
                  size="sm"
                  dense
                  color="green-1"
                  text-color="green-9"
                  icon="person"
                >
                  {{ getUserName(user) }}
                </q-chip>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="card-footer">
            <div class="timing-info">
              <div v-if="a.start_at" class="time-item">
                <q-icon name="schedule" size="16px" />
                <span>{{ formatDate(a.start_at) }}</span>
              </div>
              <div v-if="a.end_at" class="time-item">
                <q-icon name="event" size="16px" />
                <span>Ends {{ formatDate(a.end_at) }}</span>
              </div>
            </div>
            <div class="engagement-info">
              <q-icon name="visibility" size="16px" />
              <span>{{ a.views || 0 }} views</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="showDialog" persistent>
      <q-card class="dialog-card" style="min-width: 500px; max-width: 600px">
        <q-card-section class="dialog-header">
          <div class="dialog-title">
            {{ editingAnnouncement ? 'Edit Announcement' : 'Add New Announcement' }}
          </div>
          <q-btn flat round dense icon="close" @click="closeDialog" />
        </q-card-section>

        <q-separator />

        <q-card-section class="dialog-content" style="max-height: 70vh; overflow-y: auto">
          <div class="form-field">
            <label class="field-label">Title *</label>
            <q-input
              v-model="formData.title"
              outlined
              dense
              placeholder="Enter announcement title"
            />
          </div>

          <div class="form-field">
            <label class="field-label">Message *</label>
            <q-input
              v-model="formData.message"
              type="textarea"
              outlined
              rows="4"
              placeholder="Enter announcement message"
            />
          </div>

          <div class="form-field">
            <label class="field-label">Type</label>
            <q-select
              v-model="formData.announcement_type"
              :options="typeSelectOptions"
              outlined
              dense
              emit-value
              map-options
            />
          </div>

          <div class="form-field">
            <label class="field-label">Start Date</label>
            <q-input v-model="formData.start_at" type="datetime-local" outlined dense />
          </div>

          <div class="form-field">
            <label class="field-label">End Date</label>
            <q-input v-model="formData.end_at" type="datetime-local" outlined dense />
          </div>

          <div class="form-field">
            <q-toggle v-model="formData.is_active" label="Active" color="primary" />
          </div>

          <div class="form-field">
            <q-toggle v-model="formData.target_everyone" label="Send to Everyone" color="primary" />
          </div>

          <div v-if="!formData.target_everyone" class="targeting-fields">
            <div class="form-field">
              <label class="field-label">Target Positions</label>
              <q-select
                v-model="formData.target_positions"
                :options="positions"
                outlined
                dense
                multiple
                emit-value
                map-options
                use-chips
                :loading="loadingPositions"
                placeholder="Select positions"
                hint="Select one or more positions"
              >
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey"> No positions available </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <div class="form-field">
              <label class="field-label">Target Users</label>
              <q-select
                v-model="formData.target_users"
                :options="users"
                outlined
                dense
                multiple
                emit-value
                map-options
                use-chips
                :loading="loadingUsers"
                placeholder="Select users"
                hint="Select one or more users"
              >
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey"> No users available </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <div class="form-field">
              <label class="field-label">Target Roles</label>
              <q-select
                v-model="formData.target_roles"
                :options="roles"
                outlined
                dense
                multiple
                emit-value
                map-options
                use-chips
                :loading="loadingRoles"
                placeholder="Select roles"
                hint="Select one or more roles"
              >
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey"> No roles available </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions class="dialog-actions">
          <q-btn label="CANCEL" flat color="grey-7" @click="closeDialog" />
          <q-btn
            :label="editingAnnouncement ? 'UPDATE' : 'CREATE'"
            color="primary"
            unelevated
            @click="saveAnnouncement"
            :loading="submitting"
            :disable="submitting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'
import 'src/css/app.scss'

export default {
  name: 'AnnouncementPage',
  setup() {
    const $q = useQuasar()

    // Reactive state
    const announcements = ref([])
    const loading = ref(false)
    const submitting = ref(false)
    const showDialog = ref(false)
    const editingAnnouncement = ref(null)
    const searchQuery = ref('')
    const typeFilter = ref({ label: 'All Types', value: null })

    // Type options
    const typeOptions = [
      { label: 'All Types', value: null },
      { label: 'General', value: 'general' },
      { label: 'Urgent', value: 'urgent' },
      { label: 'Maintenance', value: 'maintenance' },
      { label: 'Policy', value: 'policy' },
    ]

    const typeSelectOptions = [
      { label: 'General', value: 'general' },
      { label: 'Urgent', value: 'urgent' },
      { label: 'Maintenance', value: 'maintenance' },
      { label: 'Policy', value: 'policy' },
    ]

    // Form data
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

    const targetPositionsInput = ref('')
    const targetUsersInput = ref('')
    const targetRolesInput = ref('')

    // Dropdown data
    const positions = ref([])
    const users = ref([])
    const roles = ref([])
    const loadingPositions = ref(false)
    const loadingUsers = ref(false)
    const loadingRoles = ref(false)

    // Computed counts
    const activeCount = computed(() => announcements.value.filter((a) => a.is_active).length)
    const scheduledCount = computed(() => {
      const now = new Date()
      return announcements.value.filter((a) => a.start_at && new Date(a.start_at) > now).length
    })
    const urgentCount = computed(
      () => announcements.value.filter((a) => a.announcement_type === 'urgent').length,
    )

    // ✅ Name getters
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

    // Computed filters
    const filteredAnnouncements = computed(() => {
      let filtered = announcements.value

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(
          (a) => a.title.toLowerCase().includes(query) || a.message.toLowerCase().includes(query),
        )
      }

      if (typeFilter.value && typeFilter.value.value) {
        filtered = filtered.filter((a) => a.announcement_type === typeFilter.value.value)
      }

      return filtered
    })

    const getTypeColor = (type) => {
      const colors = {
        general: 'blue',
        urgent: 'red',
        maintenance: 'orange',
        policy: 'purple',
      }
      return colors[type] || 'grey'
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }

    // Fetch positions
    const fetchPositions = async () => {
      loadingPositions.value = true
      try {
        const token = localStorage.getItem('access_token')
        const selectedCompany = localStorage.getItem('selectedCompany')

        const res = await api.get('https://staging.wageyapp.com/user/positions/', {
          headers: { Authorization: `Bearer ${token}` },
          params: { company: selectedCompany },
        })

        positions.value = (res.data.results || res.data).map((p) => ({
          label: p.name || p.title || p.position_name,
          value: p.id,
        }))

        console.log('Positions loaded:', positions.value.length)
      } catch (error) {
        console.error('Failed to fetch positions:', error)
        $q.notify({
          type: 'warning',
          message: 'Failed to load positions',
          position: 'top',
        })
      } finally {
        loadingPositions.value = false
      }
    }

    // Fetch users
    const fetchUsers = async () => {
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

        if (!token || !companyId) {
          $q.notify({
            type: 'negative',
            message: 'Missing token or company ID.',
            position: 'top',
          })
          return
        }

        loadingUsers.value = true

        const response = await api.get(
          `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        // 🟢 Transform users into Quasar-friendly objects
        users.value = (response.data || []).map((u) => {
          const fullName =
            u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User #${u.id}`

          return {
            id: u.id,
            label: fullName,
            value: u.id,
            full_name: fullName,
          }
        })

        console.log('✅ Users mapped for dropdown:', users.value)
      } catch (error) {
        console.error('❌ Error fetching users:', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to fetch users',
          position: 'top',
        })
      } finally {
        loadingUsers.value = false
      }
    }

    // Fetch roles
    const fetchRoles = async () => {
      loadingRoles.value = true
      try {
        const token = localStorage.getItem('access_token')
        const selectedCompany = localStorage.getItem('selectedCompany')

        const res = await api.get('https://staging.wageyapp.com/user/user-roles/', {
          headers: { Authorization: `Bearer ${token}` },
          params: { company: selectedCompany },
        })

        roles.value = (res.data.results || res.data).map((r) => ({
          label: r.name || r.role_name || r.title,
          value: r.id,
        }))
      } catch (error) {
        console.error('Failed to fetch roles:', error)
        $q.notify({
          type: 'warning',
          message: 'Failed to load roles',
          position: 'top',
        })
      } finally {
        loadingRoles.value = false
      }
    }

    // Fetch announcements
    const fetchAnnouncements = async () => {
      loading.value = true
      try {
        const token = localStorage.getItem('access_token')
        const selectedCompany = localStorage.getItem('selectedCompany')

        if (!token || !selectedCompany) {
          $q.notify({
            type: 'warning',
            message: 'Please login and select a company first.',
            position: 'top',
          })
          return
        }

        const res = await api.get('https://staging.wageyapp.com/communication/announcements/', {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = Array.isArray(res.data) ? res.data : res.data.results || res.data.data || []

        announcements.value = data.filter((a) => String(a.company) === String(selectedCompany))
      } catch (error) {
        console.error('Fetch error:', error)
        $q.notify({
          type: 'negative',
          message: error.response?.data?.message || error.message || 'Failed to load announcements',
          position: 'top',
        })
      } finally {
        loading.value = false
      }
    }

    // Save announcement
    const saveAnnouncement = async () => {
      submitting.value = true
      try {
        const token = localStorage.getItem('access_token')
        const storedCompany = localStorage.getItem('selectedCompany')

        if (!token || !storedCompany) {
          $q.notify({
            type: 'warning',
            message: 'Authentication or company missing.',
            position: 'top',
          })
          submitting.value = false
          return
        }

        let companyId = storedCompany
        try {
          const parsed = JSON.parse(storedCompany)
          companyId = parsed?.id || parsed
        } catch {
          //comment
        }

        const payload = {
          title: formData.value.title,
          message: formData.value.message,
          announcement_type:
            typeof formData.value.announcement_type === 'object'
              ? formData.value.announcement_type.value
              : formData.value.announcement_type,
          is_active: formData.value.is_active ?? true,
          start_at: formData.value.start_at
            ? new Date(formData.value.start_at).toISOString()
            : null,
          end_at: formData.value.end_at ? new Date(formData.value.end_at).toISOString() : null,
          target_everyone: formData.value.target_everyone ?? true,
          target_users: formData.value.target_users.map((u) => (typeof u === 'object' ? u.id : u)),
          target_roles: formData.value.target_roles.map((r) => (typeof r === 'object' ? r.id : r)),
          target_positions: formData.value.target_positions.map((p) =>
            typeof p === 'object' ? p.id : p,
          ),
          company: parseInt(companyId),
        }

        const url = editingAnnouncement.value
          ? `https://staging.wageyapp.com/communication/announcements/${editingAnnouncement.value.id}/`
          : 'https://staging.wageyapp.com/communication/announcements/create/'

        const method = editingAnnouncement.value ? 'put' : 'post'

        await api[method](url, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })

        $q.notify({
          type: 'positive',
          message: editingAnnouncement.value
            ? 'Announcement updated successfully'
            : 'Announcement created successfully',
          position: 'top',
        })

        await fetchAnnouncements()
        showDialog.value = false
      } catch (error) {
        console.error('Save error:', error)
        $q.notify({
          type: 'negative',
          message: error.response?.data?.message || error.message || 'Failed to save announcement',
          position: 'top',
        })
      } finally {
        submitting.value = false
      }
    }

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

    const closeDialog = () => (showDialog.value = false)

    onMounted(fetchAnnouncements)

    // ✅ Return all refs, methods, and getters used in template
    return {
      announcements,
      loading,
      submitting,
      showDialog,
      editingAnnouncement,
      searchQuery,
      typeFilter,
      typeOptions,
      typeSelectOptions,
      formData,
      targetPositionsInput,
      targetUsersInput,
      targetRolesInput,
      positions,
      users,
      roles,
      loadingPositions,
      loadingUsers,
      loadingRoles,
      activeCount,
      scheduledCount,
      urgentCount,
      filteredAnnouncements,
      getTypeColor,
      formatDate,
      fetchAnnouncements,
      fetchPositions,
      fetchUsers,
      fetchRoles,
      openCreateDialog,
      editAnnouncement,
      closeDialog,
      saveAnnouncement,
      getRoleName,
      getPositionName, // ✅ added
      getUserName, // ✅ added
    }
  },
}
</script>

<style scoped lang="scss">
.announcements-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  background: #f8fafc;
}

/* Header */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  margin-top: 27px;
  border: 1px solid #e2e8f0;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
}

.title-section {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

/* Stats Section */
.stats-section {
  max-width: 1400px;
  margin: 24px auto;
  padding: 0 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px !important;
}

.stat-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper.total {
  background: #e3f2fd;
  color: #1976d2;
}

.stat-icon-wrapper.active {
  background: #e8f5e9;
  color: #388e3c;
}

.stat-icon-wrapper.scheduled {
  background: #fff3e0;
  color: #f57c00;
}

.stat-icon-wrapper.urgent {
  background: #ffebee;
  color: #d32f2f;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

/* Filter Section */
.filter-section {
  max-width: 1400px;
  margin: 24px auto;
  padding: 0 40px;
}

.filter-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.filter-select {
  width: 200px;
}

.add-btn {
  border-radius: 4px;
  font-weight: 500;
  text-transform: none;
  padding: 8px 20px;
}

/* Content Section */
.content-section {
  max-width: 1400px;
  margin: 0 auto 40px;
  padding: 0 40px;
}

.loading-spinner {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.empty-state {
  background: white;
  border-radius: 8px;
  padding: 80px 40px;
  text-align: center;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #424242;
  margin: 16px 0 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: #666;
}

/* Announcements Grid */
.announcements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.announcement-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  overflow: hidden;
}

.announcement-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.announcement-card.urgent {
  border-left: 4px solid #d32f2f;
}

.card-header {
  padding: 16px !important;
}

.card-header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.header-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.type-chip {
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
}

.status-badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-content {
  padding: 0 16px 16px !important;
}

.announcement-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.announcement-message {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.targeting-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.targeting-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-footer {
  padding: 12px 16px !important;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timing-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.engagement-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

/* Dialog */
.dialog-card {
  width: 600px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 20px 24px !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.dialog-content {
  padding: 24px !important;
  overflow-y: auto;
  flex: 1;
}

.form-field {
  margin-bottom: 20px;
}

.form-field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #424242;
  margin-bottom: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.targeting-fields {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.dialog-actions {
  padding: 16px 24px !important;
  background: #fafafa;
  justify-content: flex-end;
  gap: 12px;
}

/* Responsive */
@media (max-width: 1024px) {
  .page-header,
  .stats-section,
  .filter-section,
  .content-section {
    padding-left: 24px;
    padding-right: 24px;
  }

  .announcements-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 24px 16px;
  }

  .stats-section,
  .filter-section,
  .content-section {
    padding-left: 16px;
    padding-right: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .filter-content {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    max-width: none;
    width: 100%;
  }

  .announcements-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 26px;
  }

  .page-subtitle {
    font-size: 14px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-content {
    padding: 16px !important;
  }

  .stat-number {
    font-size: 28px;
  }
}
</style>
