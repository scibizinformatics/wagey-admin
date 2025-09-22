<template>
  <q-page class="announcements-page">
    <!-- Header Section -->
    <div class="page-header q-pa-lg">
      <div class="header-content">
        <div class="title-section">
          <q-icon name="campaign" class="title-icon" />
          <div>
            <h1 class="page-title">Announcements</h1>
            <p class="page-subtitle">Manage and broadcast important messages</p>
          </div>
        </div>

        <div class="header-actions">
          <q-input
            v-model="searchQuery"
            outlined
            dense
            placeholder="Search announcements..."
            class="search-input"
            bg-color="white"
            debounce="300"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
            <template v-slot:append>
              <q-btn
                v-if="searchQuery"
                flat
                round
                dense
                icon="clear"
                @click="searchQuery = ''"
                size="sm"
              />
            </template>
          </q-input>

          <q-select
            v-model="selectedType"
            :options="typeOptions"
            outlined
            dense
            emit-value
            map-options
            placeholder="All Types"
            bg-color="white"
            class="filter-select"
          >
            <template v-slot:prepend>
              <q-icon name="filter_list" />
            </template>
          </q-select>

          <q-btn color="primary" unelevated @click="openCreateModal" class="add-btn" no-caps>
            <q-icon name="add" class="q-mr-xs" />
            New Announcement
          </q-btn>
        </div>
      </div>
    </div>

    <!-- Stats Dashboard -->
    <div class="stats-section q-px-lg q-pb-lg">
      <div class="stats-grid">
        <q-card class="stat-card active-stat">
          <q-card-section class="stat-content">
            <div class="stat-icon-wrapper active">
              <q-icon name="notifications_active" size="md" />
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ activeAnnouncements }}</div>
              <div class="stat-label">Active</div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="stat-card total-stat">
          <q-card-section class="stat-content">
            <div class="stat-icon-wrapper total">
              <q-icon name="campaign" size="md" />
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ filteredAnnouncements.length }}</div>
              <div class="stat-label">Total</div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="stat-card scheduled-stat">
          <q-card-section class="stat-content">
            <div class="stat-icon-wrapper scheduled">
              <q-icon name="schedule" size="md" />
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ scheduledAnnouncements }}</div>
              <div class="stat-label">Scheduled</div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="stat-card views-stat">
          <q-card-section class="stat-content">
            <div class="stat-icon-wrapper views">
              <q-icon name="visibility" size="md" />
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ totalViews }}</div>
              <div class="stat-label">Total Views</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content-section q-px-lg">
      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <q-card class="loading-card">
          <q-card-section class="text-center q-pa-xl">
            <q-spinner-dots color="primary" size="3em" />
            <div class="q-mt-md text-h6 text-grey-7">Loading announcements...</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredAnnouncements.length === 0" class="empty-container">
        <q-card class="empty-card">
          <q-card-section class="text-center q-pa-xl">
            <q-icon name="campaign" size="4em" color="grey-4" class="q-mb-md" />
            <div class="text-h5 text-grey-7 q-mb-sm">No announcements found</div>
            <div class="text-body2 text-grey-6 q-mb-lg">
              {{
                searchQuery || selectedType
                  ? 'Try adjusting your filters'
                  : 'Create your first announcement to get started'
              }}
            </div>
            <q-btn
              v-if="!searchQuery && !selectedType"
              color="primary"
              unelevated
              @click="openCreateModal"
              no-caps
            >
              <q-icon name="add" class="q-mr-xs" />
              Create Announcement
            </q-btn>
          </q-card-section>
        </q-card>
      </div>

      <!-- Announcements Grid -->
      <div v-else class="announcements-grid">
        <q-card
          v-for="announcement in paginatedAnnouncements"
          :key="announcement.id"
          class="announcement-card"
          :class="getCardClass(announcement)"
        >
          <!-- Card Header -->
          <q-card-section class="card-header">
            <div class="header-left">
              <q-chip
                :color="getTypeColor(announcement.announcement_type)"
                text-color="white"
                :icon="getTypeIcon(announcement.announcement_type)"
                size="sm"
                class="type-chip"
              >
                {{ announcement.announcement_type }}
              </q-chip>

              <q-chip
                :color="getStatusColor(announcement)"
                :text-color="getStatusTextColor(announcement)"
                :icon="getStatusIcon(announcement)"
                size="sm"
                outline
                class="status-chip"
              >
                {{ getStatus(announcement) }}
              </q-chip>
            </div>

            <div class="header-actions">
              <q-btn
                flat
                round
                dense
                icon="edit"
                size="sm"
                @click="editAnnouncement(announcement)"
                class="action-btn"
              >
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                size="sm"
                @click="deleteAnnouncement(announcement)"
                class="action-btn delete-btn"
              >
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Card Content -->
          <q-card-section class="card-content">
            <h3 class="announcement-title">{{ announcement.title }}</h3>
            <p class="announcement-message">{{ announcement.message }}</p>

            <!-- Targeting Information -->
            <div v-if="hasTargeting(announcement)" class="targeting-section q-mt-md">
              <div class="targeting-label">
                <q-icon name="group" size="sm" />
                Targeting:
              </div>
              <div class="targeting-chips">
                <q-chip
                  v-if="announcement.target_positions"
                  dense
                  color="blue-1"
                  text-color="blue-8"
                  icon="work"
                  size="sm"
                >
                  Positions: {{ formatArray(announcement.target_positions) }}
                </q-chip>
                <q-chip
                  v-if="announcement.target_users"
                  dense
                  color="green-1"
                  text-color="green-8"
                  icon="person"
                  size="sm"
                >
                  Users: {{ formatArray(announcement.target_users) }}
                </q-chip>
                <q-chip
                  v-if="announcement.target_roles"
                  dense
                  color="purple-1"
                  text-color="purple-8"
                  icon="admin_panel_settings"
                  size="sm"
                >
                  Roles: {{ formatArray(announcement.target_roles) }}
                </q-chip>
                <q-chip
                  v-if="announcement.target_sites"
                  dense
                  color="orange-1"
                  text-color="orange-8"
                  icon="location_on"
                  size="sm"
                >
                  Sites: {{ formatArray(announcement.target_sites) }}
                </q-chip>
                <q-chip
                  v-if="announcement.target_departments"
                  dense
                  color="teal-1"
                  text-color="teal-8"
                  icon="business"
                  size="sm"
                >
                  Departments: {{ formatArray(announcement.target_departments) }}
                </q-chip>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Card Footer -->
          <q-card-section class="card-footer">
            <div class="timing-info">
              <div class="time-item">
                <q-icon name="play_arrow" size="sm" color="green" />
                <span>Start: {{ formatDate(announcement.start_at) }}</span>
              </div>
              <div class="time-item">
                <q-icon name="stop" size="sm" color="red" />
                <span>End: {{ formatDate(announcement.end_at) }}</span>
              </div>
            </div>

            <div class="engagement-info">
              <q-chip dense outline color="grey-6" size="sm">
                <q-icon name="visibility" size="xs" class="q-mr-xs" />
                {{ announcement.views || 0 }} views
              </q-chip>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-section q-mt-lg">
        <q-card class="pagination-card">
          <q-card-section class="pagination-content">
            <q-pagination
              v-model="currentPage"
              :max="totalPages"
              :max-pages="5"
              direction-links
              boundary-links
              icon-first="skip_previous"
              icon-last="skip_next"
              icon-prev="fast_rewind"
              icon-next="fast_forward"
              color="primary"
              active-design="push"
            />
            <div class="pagination-info">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }}-{{
                Math.min(currentPage * itemsPerPage, filteredAnnouncements.length)
              }}
              of {{ filteredAnnouncements.length }} announcements
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <q-dialog
      v-model="showModal"
      persistent
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="modal-card">
        <!-- Modal Header -->
        <q-card-section class="modal-header">
          <div class="modal-title">
            <q-icon :name="editingAnnouncement ? 'edit' : 'add'" size="md" class="q-mr-sm" />
            {{ editingAnnouncement ? 'Edit Announcement' : 'New Announcement' }}
          </div>
          <q-btn flat round dense icon="close" @click="closeModal" />
        </q-card-section>

        <q-separator />

        <!-- Modal Content -->
        <q-card-section class="modal-content">
          <q-form @submit="saveAnnouncement" class="announcement-form">
            <div class="form-grid">
              <!-- Basic Information -->
              <q-card class="form-section">
                <q-card-section>
                  <div class="section-title">
                    <q-icon name="info" class="q-mr-sm" />
                    Basic Information
                  </div>

                  <div class="form-row">
                    <q-input
                      v-model="formData.title"
                      label="Title *"
                      outlined
                      required
                      counter
                      maxlength="200"
                      :rules="[(val) => !!val || 'Title is required']"
                    />
                  </div>

                  <div class="form-row">
                    <q-input
                      v-model="formData.message"
                      label="Message *"
                      type="textarea"
                      outlined
                      required
                      rows="4"
                      counter
                      maxlength="1000"
                      :rules="[(val) => !!val || 'Message is required']"
                    />
                  </div>

                  <div class="form-row-split">
                    <q-select
                      v-model="formData.announcement_type"
                      :options="typeOptions"
                      label="Type *"
                      outlined
                      emit-value
                      map-options
                      required
                    />

                    <q-toggle
                      v-model="formData.is_active"
                      label="Active"
                      color="positive"
                      size="lg"
                    />
                  </div>
                </q-card-section>
              </q-card>

              <!-- Scheduling -->
              <q-card class="form-section">
                <q-card-section>
                  <div class="section-title">
                    <q-icon name="schedule" class="q-mr-sm" />
                    Scheduling
                  </div>

                  <div class="form-row-split">
                    <q-input
                      v-model="formData.start_at"
                      label="Start Date & Time *"
                      type="datetime-local"
                      outlined
                      required
                    />

                    <q-input
                      v-model="formData.end_at"
                      label="End Date & Time *"
                      type="datetime-local"
                      outlined
                      required
                    />
                  </div>
                </q-card-section>
              </q-card>

              <!-- Targeting -->
              <q-card class="form-section">
                <q-card-section>
                  <div class="section-title">
                    <q-icon name="group" class="q-mr-sm" />
                    Targeting
                  </div>

                  <div class="form-row">
                    <q-toggle
                      v-model="formData.target_everyone"
                      label="Target Everyone"
                      color="primary"
                      size="lg"
                    />
                  </div>

                  <div v-if="!formData.target_everyone" class="targeting-inputs">
                    <q-input
                      v-model="targetPositionsInput"
                      label="Target Positions"
                      placeholder="Enter positions separated by commas"
                      outlined
                      hint="Comma-separated list of position names"
                    />

                    <q-input
                      v-model="targetUsersInput"
                      label="Target Users"
                      placeholder="Enter user IDs separated by commas"
                      outlined
                      hint="Comma-separated list of user IDs"
                    />

                    <q-input
                      v-model="targetRolesInput"
                      label="Target Roles"
                      placeholder="Enter role IDs separated by commas"
                      outlined
                      hint="Comma-separated list of role IDs"
                    />

                    <q-input
                      v-model="targetSitesInput"
                      label="Target Sites"
                      placeholder="Enter site IDs separated by commas"
                      outlined
                      hint="Comma-separated list of site IDs"
                    />

                    <q-input
                      v-model="targetDepartmentsInput"
                      label="Target Departments"
                      placeholder="Enter department IDs separated by commas"
                      outlined
                      hint="Comma-separated list of department IDs"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </q-form>
        </q-card-section>

        <q-separator />

        <!-- Modal Actions -->
        <q-card-actions class="modal-actions">
          <q-btn flat label="Cancel" @click="closeModal" class="q-mr-sm" />
          <q-btn
            unelevated
            color="primary"
            :label="submitting ? 'Saving...' : 'Save Announcement'"
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
import { useQuasar } from 'quasar'
import axios from 'axios'

export default {
  name: 'AnnouncementPage',
  setup() {
    const $q = useQuasar()

    // Reactive data
    const announcements = ref([])
    const loading = ref(false)
    const searchQuery = ref('')
    const selectedType = ref('')
    const currentPage = ref(1)
    const itemsPerPage = ref(6)
    const showModal = ref(false)
    const submitting = ref(false)
    const editingAnnouncement = ref(null)

    const formData = ref({
      title: '',
      message: '',
      announcement_type: 'general',
      is_active: true,
      start_at: '',
      end_at: '',
      target_everyone: true,
    })

    const targetPositionsInput = ref('')
    const targetUsersInput = ref('')
    const targetRolesInput = ref('')
    const targetSitesInput = ref('')
    const targetDepartmentsInput = ref('')

    // Options
    const typeOptions = [
      { label: 'All Types', value: '' },
      { label: 'General', value: 'general' },
      { label: 'Urgent', value: 'urgent' },
      { label: 'Maintenance', value: 'maintenance' },
      { label: 'Policy', value: 'policy' },
    ]

    // Computed properties
    const filteredAnnouncements = computed(() => {
      let filtered = announcements.value

      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        filtered = filtered.filter(
          (a) => a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q),
        )
      }

      if (selectedType.value) {
        filtered = filtered.filter((a) => a.announcement_type === selectedType.value)
      }

      return filtered
    })

    const paginatedAnnouncements = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      return filteredAnnouncements.value.slice(start, start + itemsPerPage.value)
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredAnnouncements.value.length / itemsPerPage.value)
    })

    const activeAnnouncements = computed(() => {
      return announcements.value.filter((a) => a.is_active && !isExpired(a)).length
    })

    const scheduledAnnouncements = computed(() => {
      return announcements.value.filter((a) => new Date(a.start_at) > new Date()).length
    })

    const totalViews = computed(() => {
      return announcements.value.reduce((sum, a) => sum + (a.views || 0), 0)
    })

    // Methods
    const loadAnnouncements = async () => {
      try {
        const companyId = localStorage.getItem('companyId')
        const token = localStorage.getItem('access_token')

        if (!companyId || !token) {
          console.error('Missing companyId or access_token in localStorage')
          return
        }

        const res = await axios.get(`https://staging.wageyapp.com/communication/announcements/`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        // ✅ Filter only those for this company
        announcements.value = res.data.filter((a) => String(a.company) === String(companyId))
      } catch (err) {
        console.error('Failed to load announcements:', err.response?.data || err)
      }
    }

    const openCreateModal = () => {
      resetForm()
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      editingAnnouncement.value = null
      resetForm()
    }

    const resetForm = () => {
      formData.value = {
        title: '',
        message: '',
        announcement_type: 'general',
        is_active: true,
        start_at: '',
        end_at: '',
        target_everyone: true,
      }
      targetPositionsInput.value = ''
      targetUsersInput.value = ''
      targetRolesInput.value = ''
      targetSitesInput.value = ''
      targetDepartmentsInput.value = ''
    }

    const editAnnouncement = (announcement) => {
      editingAnnouncement.value = announcement
      formData.value = { ...announcement }
      targetPositionsInput.value = (announcement.target_positions || []).join(', ')
      targetUsersInput.value = (announcement.target_users || []).join(', ')
      targetRolesInput.value = (announcement.target_roles || []).join(', ')
      targetSitesInput.value = (announcement.target_sites || []).join(', ')
      targetDepartmentsInput.value = (announcement.target_departments || []).join(', ')
      showModal.value = true
    }

    const saveAnnouncement = async () => {
      submitting.value = true
      try {
        // ✅ Frontend validation
        if (!formData.value.title.trim()) {
          $q.notify({ type: 'warning', message: 'Title is required', position: 'top' })
          submitting.value = false
          return
        }

        if (!formData.value.message.trim()) {
          $q.notify({ type: 'warning', message: 'Message is required', position: 'top' })
          submitting.value = false
          return
        }

        if (!formData.value.start_at || !formData.value.end_at) {
          $q.notify({
            type: 'warning',
            message: 'Start and End date are required',
            position: 'top',
          })
          submitting.value = false
          return
        }

        if (new Date(formData.value.start_at) >= new Date(formData.value.end_at)) {
          $q.notify({
            type: 'warning',
            message: 'Start date must be before End date',
            position: 'top',
          })
          submitting.value = false
          return
        }

        const token = localStorage.getItem('access_token')
        const companyId = localStorage.getItem('companyId')

        const payload = {
          ...formData.value,
          target_positions: targetPositionsInput.value
            ? targetPositionsInput.value.split(',').map((x) => x.trim())
            : [],
          target_users: targetUsersInput.value
            ? targetUsersInput.value.split(',').map((x) => x.trim())
            : [],
          target_roles: targetRolesInput.value
            ? targetRolesInput.value.split(',').map((x) => x.trim())
            : [],
          target_sites: targetSitesInput.value
            ? targetSitesInput.value.split(',').map((x) => x.trim())
            : [],
          target_departments: targetDepartmentsInput.value
            ? targetDepartmentsInput.value.split(',').map((x) => x.trim())
            : [],
          company: companyId, // ✅ Always send company id
        }

        if (editingAnnouncement.value) {
          // Update existing announcement
          await axios.patch(
            `https://staging.wageyapp.com/communication/announcements/${editingAnnouncement.value.id}/`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } },
          )
          $q.notify({
            type: 'positive',
            message: 'Announcement updated successfully',
            position: 'top',
          })
        } else {
          // Create new announcement
          await axios.post(
            `https://staging.wageyapp.com/communication/announcements/create/`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } },
          )
          $q.notify({
            type: 'positive',
            message: 'Announcement created successfully',
            position: 'top',
          })
        }

        await loadAnnouncements()
        closeModal()
      } catch (error) {
        console.error('Save failed:', error.response?.data || error.message)
        $q.notify({ type: 'negative', message: 'Failed to save announcement', position: 'top' })
      } finally {
        submitting.value = false
      }
    }

    // Helper methods
    const formatDate = (date) => {
      return new Date(date).toLocaleString()
    }

    const isExpired = (announcement) => {
      return new Date(announcement.end_at) < new Date()
    }

    const getStatus = (announcement) => {
      const now = new Date()
      if (!announcement.is_active) return 'Inactive'
      if (now < new Date(announcement.start_at)) return 'Scheduled'
      if (now > new Date(announcement.end_at)) return 'Expired'
      return 'Active'
    }

    const getStatusColor = (announcement) => {
      const status = getStatus(announcement).toLowerCase()
      const colors = {
        active: 'positive',
        scheduled: 'warning',
        expired: 'negative',
        inactive: 'grey-6',
      }
      return colors[status] || 'grey-6'
    }

    const getStatusTextColor = (announcement) => {
      const status = getStatus(announcement).toLowerCase()
      return status === 'scheduled' ? 'warning' : 'white'
    }

    const getStatusIcon = (announcement) => {
      const status = getStatus(announcement).toLowerCase()
      const icons = {
        active: 'check_circle',
        scheduled: 'schedule',
        expired: 'cancel',
        inactive: 'pause_circle',
      }
      return icons[status] || 'help'
    }

    const getTypeColor = (type) => {
      const colors = {
        general: 'primary',
        urgent: 'negative',
        maintenance: 'warning',
        policy: 'info',
      }
      return colors[type] || 'primary'
    }

    const getTypeIcon = (type) => {
      const icons = {
        general: 'info',
        urgent: 'priority_high',
        maintenance: 'build',
        policy: 'policy',
      }
      return icons[type] || 'info'
    }

    const getCardClass = (announcement) => {
      const status = getStatus(announcement).toLowerCase()
      return `card-${status} card-${announcement.announcement_type}`
    }

    const hasTargeting = (announcement) => {
      return (
        announcement.target_positions ||
        announcement.target_users ||
        announcement.target_roles ||
        announcement.target_sites ||
        announcement.target_departments
      )
    }

    const formatArray = (arr) => {
      if (Array.isArray(arr)) {
        return arr.length > 2
          ? `${arr.slice(0, 2).join(', ')}... (+${arr.length - 2})`
          : arr.join(', ')
      }
      return arr
    }

    // Lifecycle
    onMounted(() => {
      loadAnnouncements()
    })

    return {
      // Data
      announcements,
      loading,
      searchQuery,
      selectedType,
      currentPage,
      itemsPerPage,
      showModal,
      submitting,
      editingAnnouncement,
      formData,
      targetPositionsInput,
      targetUsersInput,
      targetRolesInput,
      targetSitesInput,
      targetDepartmentsInput,
      typeOptions,

      // Computed
      filteredAnnouncements,
      paginatedAnnouncements,
      totalPages,
      activeAnnouncements,
      scheduledAnnouncements,
      totalViews,

      // Methods
      loadAnnouncements,
      openCreateModal,
      closeModal,
      editAnnouncement,
      saveAnnouncement,
      formatDate,
      isExpired,
      getStatus,
      getStatusColor,
      getStatusTextColor,
      getStatusIcon,
      getTypeColor,
      getTypeIcon,
      getCardClass,
      hasTargeting,
      formatArray,
    }
  },
}
</script>

<style scoped>
/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: #6b7280;
  border-radius: 6px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.close-btn svg {
  width: 1.5rem;
  height: 1.5rem;
}

.modal-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-checkbox {
  margin-right: 0.5rem;
}

.targeting-section {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* Existing styles for the main component */
.announcement-page {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-container {
  position: relative;
}

.search-input {
  padding: 0.75rem 1rem;
  padding-left: 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  width: 300px;
  font-size: 0.875rem;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #6b7280;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #2563eb;
}

.add-btn svg {
  width: 1.25rem;
  height: 1.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.active {
  background: #dcfce7;
  color: #16a34a;
}

.stat-icon.total {
  background: #dbeafe;
  color: #2563eb;
}

.stat-icon.scheduled {
  background: #fef3c7;
  color: #d97706;
}

.stat-icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.announcements-container {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.announcements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.announcement-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.announcement-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.announcement-card.urgent {
  border-left: 4px solid #ef4444;
}

.announcement-card.active {
  border-left: 4px solid #10b981;
}

.announcement-card.expired {
  opacity: 0.6;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.announcement-meta {
  display: flex;
  gap: 0.5rem;
}

.announcement-type {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.announcement-type.general {
  background: #f3f4f6;
  color: #374151;
}

.announcement-type.urgent {
  background: #fee2e2;
  color: #dc2626;
}

.announcement-type.maintenance {
  background: #fef3c7;
  color: #d97706;
}

.announcement-type.policy {
  background: #e0e7ff;
  color: #3730a3;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.active {
  background: #dcfce7;
  color: #16a34a;
}

.status-badge.scheduled {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.expired {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge.inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  background: #f3f4f6;
  color: #6b7280;
}

.action-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.action-btn.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

.action-btn svg {
  width: 1rem;
  height: 1rem;
}

.announcement-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.announcement-message {
  color: #6b7280;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.card-footer {
  border-top: 1px solid #f3f4f6;
  padding-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 1rem;
}

.timing-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.time-icon {
  width: 1rem;
  height: 1rem;
}

.targeting-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.target-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.target-badge svg {
  width: 0.875rem;
  height: 0.875rem;
}

.target-info {
  display: flex;
  gap: 0.5rem;
}

.target-count {
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 12px;
  font-size: 0.75rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: #6b7280;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .announcements-grid {
    grid-template-columns: 1fr;
  }

  .card-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
