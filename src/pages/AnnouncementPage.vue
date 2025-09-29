<template>
  <q-page class="announcements-page">
    <!-- Example header -->
    <div class="row items-center q-pa-md justify-between">
      <h4 class="q-mt-none">Announcements</h4>
      <q-btn color="primary" label="New Announcement" icon="add" @click="openCreateDialog" />
    </div>

    <!-- Announcement cards -->
    <q-spinner v-if="loading" size="lg" color="primary" class="q-my-xl flex flex-center" />
    <div v-else class="row q-col-gutter-md q-pa-md">
      <div v-for="a in announcements" :key="a.id" class="col-12 col-md-4">
        <q-card>
          <q-card-section>
            <div class="text-h6">{{ a.title }}</div>
            <div class="text-subtitle2 text-grey">{{ a.announcement_type }}</div>
            <div class="q-mt-sm">{{ a.message }}</div>
          </q-card-section>
          <q-separator />
          <q-card-actions align="right">
            <q-btn flat dense icon="edit" @click="editAnnouncement(a)" />
            <q-btn flat dense icon="delete" color="negative" @click="deleteAnnouncement(a)" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Create/Edit Dialog Wizard -->
    <q-dialog v-model="showDialog" persistent transition-show="scale" transition-hide="scale">
      <q-card style="width: 800px; max-width: 95vw">
        <!-- Header -->
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">
            <q-icon :name="editingAnnouncement ? 'edit' : 'add_circle_outline'" class="q-mr-sm" />
            {{ editingAnnouncement ? 'Edit Announcement' : 'New Announcement' }}
          </div>
          <q-btn flat round dense icon="close" @click="closeDialog" />
        </q-card-section>

        <q-separator />

        <!-- Stepper -->
        <q-card-section>
          <q-stepper v-model="step" flat animated color="primary" alternative-labels>
            <!-- Step 1 -->
            <q-step name="1" title="Basic Info" icon="info" :done="step > 1">
              <q-input v-model="formData.title" label="Title" outlined class="q-mb-md" required />
              <q-input
                v-model="formData.message"
                label="Message"
                type="textarea"
                outlined
                autogrow
                class="q-mb-md"
                required
              />
              <q-select
                v-model="formData.announcement_type"
                :options="typeOptions.slice(1)"
                label="Type"
                outlined
                class="q-mb-md"
              />
              <q-toggle v-model="formData.is_active" label="Active" />
              <q-stepper-navigation>
                <q-btn color="primary" label="Next" @click="step = '2'" />
              </q-stepper-navigation>
            </q-step>

            <!-- Step 2 -->
            <q-step name="2" title="Schedule" icon="event" :done="step > 2">
              <q-input
                v-model="formData.start_at"
                type="datetime-local"
                label="Start Date"
                outlined
                class="q-mb-md"
              />
              <q-input v-model="formData.end_at" type="datetime-local" label="End Date" outlined />
              <q-stepper-navigation>
                <q-btn flat label="Back" @click="step = '1'" class="q-mr-sm" />
                <q-btn color="primary" label="Next" @click="step = '3'" />
              </q-stepper-navigation>
            </q-step>

            <!-- Step 3 -->
            <q-step name="3" title="Target Audience" icon="groups">
              <q-toggle
                v-model="formData.target_everyone"
                label="Send to Everyone"
                class="q-mb-md"
              />

              <div v-if="!formData.target_everyone">
                <q-input
                  v-model="targetPositionsInput"
                  label="Target Positions (comma separated)"
                  outlined
                  class="q-mb-md"
                />
                <q-input
                  v-model="targetUsersInput"
                  label="Target Users (IDs comma separated)"
                  outlined
                  class="q-mb-md"
                />
                <q-input
                  v-model="targetRolesInput"
                  label="Target Roles (comma separated)"
                  outlined
                />
              </div>

              <q-stepper-navigation>
                <q-btn flat label="Back" @click="step = '2'" class="q-mr-sm" />
                <q-btn
                  color="primary"
                  label="Save"
                  @click="saveAnnouncement"
                  :loading="submitting"
                  :disable="submitting"
                />
              </q-stepper-navigation>
            </q-step>
          </q-stepper>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

export default {
  name: 'AnnouncementPage',
  setup() {
    const $q = useQuasar()

    const announcements = ref([])
    const loading = ref(false)
    const submitting = ref(false)
    const showDialog = ref(false)
    const editingAnnouncement = ref(null)
    const step = ref('1')

    const typeOptions = [
      { label: 'All Types', value: null },
      { label: 'General', value: 'general' },
      { label: 'Urgent', value: 'urgent' },
      { label: 'Maintenance', value: 'maintenance' },
      { label: 'Policy', value: 'policy' },
    ]

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

    const fetchAnnouncements = async () => {
      loading.value = true
      try {
        const token = localStorage.getItem('access_token')
        const res = await axios.get('https://staging.wageyapp.com/communication/announcements/', {
          headers: { Authorization: `Bearer ${token}` },
        })
        announcements.value = res.data
      } catch {
        $q.notify({ type: 'negative', message: 'Failed to load announcements', position: 'top' })
      } finally {
        loading.value = false
      }
    }

    const saveAnnouncement = async () => {
      submitting.value = true
      try {
        const token = localStorage.getItem('access_token')
        const payload = {
          ...formData.value,
          target_positions: targetPositionsInput.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          target_users: targetUsersInput.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          target_roles: targetRolesInput.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }

        if (editingAnnouncement.value) {
          await axios.put(
            `https://staging.wageyapp.com/communication/announcements/${editingAnnouncement.value.id}/`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } },
          )
          $q.notify({ type: 'positive', message: 'Updated successfully', position: 'top' })
        } else {
          await axios.post('https://staging.wageyapp.com/communication/announcements/', payload, {
            headers: { Authorization: `Bearer ${token}` },
          })
          $q.notify({ type: 'positive', message: 'Created successfully', position: 'top' })
        }

        await fetchAnnouncements()
        showDialog.value = false
      } catch {
        $q.notify({ type: 'negative', message: 'Failed to save', position: 'top' })
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
      }
      targetPositionsInput.value = ''
      targetUsersInput.value = ''
      targetRolesInput.value = ''
      step.value = '1'
      showDialog.value = true
    }

    const editAnnouncement = (a) => {
      editingAnnouncement.value = a
      formData.value = { ...a }
      targetPositionsInput.value = (a.target_positions || []).join(', ')
      targetUsersInput.value = (a.target_users || []).join(', ')
      targetRolesInput.value = (a.target_roles || []).join(', ')
      step.value = '1'
      showDialog.value = true
    }

    const deleteAnnouncement = (a) => {
      $q.dialog({
        title: 'Delete',
        message: `Delete "${a.title}"?`,
        cancel: true,
        persistent: true,
      }).onOk(async () => {
        try {
          const token = localStorage.getItem('access_token')
          await axios.delete(`https://staging.wageyapp.com/communication/announcements/${a.id}/`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          $q.notify({ type: 'positive', message: 'Deleted', position: 'top' })
          await fetchAnnouncements()
        } catch {
          $q.notify({ type: 'negative', message: 'Failed to delete', position: 'top' })
        }
      })
    }

    const closeDialog = () => {
      showDialog.value = false
    }

    onMounted(fetchAnnouncements)

    return {
      announcements,
      loading,
      submitting,
      showDialog,
      editingAnnouncement,
      step,
      typeOptions,
      formData,
      targetPositionsInput,
      targetUsersInput,
      targetRolesInput,
      openCreateDialog,
      editAnnouncement,
      deleteAnnouncement,
      closeDialog,
      saveAnnouncement,
    }
  },
}
</script>

<style scoped>
.announcements-page {
  background: #fafafa;
  min-height: 100vh;
  padding: 0;
}

/* Header */
.page-header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 32px 40px;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon-wrapper {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.title-icon {
  font-size: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #212121;
  margin: 0;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 14px;
  color: #757575;
  margin: 4px 0 0 0;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 240px;
}

.filter-select {
  width: 140px;
}

.add-btn {
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

/* Stats Section */
.stats-section {
  max-width: 1400px;
  margin: 32px auto;
  padding: 0 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-content {
  padding: 24px !important;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.stat-icon-wrapper.total {
  background: #e3f2fd;
  color: #1565c0;
}

.stat-icon-wrapper.scheduled {
  background: #fff3e0;
  color: #ef6c00;
}

.stat-icon-wrapper.views {
  background: #f3e5f5;
  color: #7b1fa2;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  color: #212121;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #757575;
  margin-top: 4px;
  font-weight: 500;
}

/* Content Section */
.content-section {
  max-width: 1400px;
  margin: 0 auto 40px;
  padding: 0 40px;
}

.state-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 80px 40px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 16px;
}

.state-title {
  font-size: 20px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 8px;
}

.state-subtitle {
  font-size: 14px;
  color: #757575;
}

.state-text {
  font-size: 15px;
  color: #757575;
  margin-top: 16px;
}

/* Announcements Grid */
.announcements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.announcement-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.2s;
  overflow: hidden;
}

.announcement-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.announcement-card.urgent {
  border-left: 3px solid #d32f2f;
}

.announcement-card.active {
  border-left: 3px solid #2e7d32;
}

.announcement-card.expired {
  opacity: 0.6;
}

.card-header {
  padding: 20px 20px 16px !important;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-chips {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.type-chip {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  color: #757575;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f5f5f5;
  color: #424242;
}

.delete-btn:hover {
  background: #ffebee;
  color: #d32f2f;
}

.card-content {
  padding: 0 20px 20px !important;
}

.announcement-title {
  font-size: 18px;
  font-weight: 600;
  color: #212121;
  margin: 0 0 8px 0;
  line-height: 1.4;
  letter-spacing: -0.2px;
}

.announcement-message {
  font-size: 14px;
  color: #616161;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.targeting-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f5f5f5;
}

.targeting-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-footer {
  padding: 16px 20px !important;
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
  color: #757575;
}

.engagement-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #757575;
  font-weight: 500;
}

/* Pagination */
.pagination-section {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

/* Modal */
.modal-card {
  background: white;
}

.modal-header {
  padding: 24px 32px !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  display: flex;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
  color: #212121;
}

.modal-content {
  padding: 32px !important;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 20px;
}

.form-row {
  margin-bottom: 20px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-row-split {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.form-row-split:last-child {
  margin-bottom: 0;
}

.targeting-inputs {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.modal-actions {
  padding: 20px 32px !important;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 1024px) {
  .page-header,
  .stats-section,
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
    padding: 24px 20px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }

  .title-section {
    flex-direction: row;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .search-input,
  .filter-select {
    flex: 1;
    min-width: 140px;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .stats-section,
  .content-section {
    padding-left: 20px;
    padding-right: 20px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .announcements-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .modal-header,
  .modal-content,
  .modal-actions {
    padding-left: 20px !important;
    padding-right: 20px !important;
  }

  .form-row-split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
  }

  .page-subtitle {
    font-size: 13px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-content {
    padding: 20px !important;
  }

  .stat-number {
    font-size: 24px;
  }
}
</style>
