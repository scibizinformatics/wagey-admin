<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="modal-card dialog-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-icon name="campaign" class="modal-icon" />
          <div>
            <div class="modal-title">
              {{ isEditing ? 'Edit Announcement' : 'Add New Announcement' }}
            </div>
            <div class="modal-subtitle">Fill in the announcement details</div>
          </div>
        </div>
        <q-btn icon="close" flat round class="modal-close-btn" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content" style="max-height: 75vh; overflow-y: auto">
        <div class="form-sections">
          <div class="form-section">
            <div class="section-title">Announcement Details</div>
            <div class="form-grid">
              <q-input
                v-model="localForm.title"
                label="Title *"
                outlined
                dense
                class="col-span-2"
                :rules="[(val) => !!val || 'Title is required']"
              />
              <q-input
                v-model="localForm.message"
                type="textarea"
                label="Message *"
                outlined
                rows="4"
                class="col-span-2"
                :rules="[(val) => !!val || 'Message is required']"
              />
              <q-select
                v-model="localForm.announcement_type"
                :options="typeSelectOptions"
                label="Type"
                outlined
                dense
                emit-value
                map-options
              />
              <div class="toggle-row">
                <q-toggle v-model="localForm.is_active" label="Active" color="primary" class="brand-toggle" />
                <q-toggle
                  v-model="localForm.target_everyone"
                  label="Send to Everyone"
                  color="primary"
                  @update:model-value="onToggleEveryone"
                />
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">Schedule</div>
            <div class="form-grid">
              <q-input
                v-model="localForm.start_at"
                label="Start Date"
                type="datetime-local"
                outlined
                dense
              />
              <q-input
                v-model="localForm.end_at"
                label="End Date"
                type="datetime-local"
                outlined
                dense
              />
            </div>
          </div>

          <div v-if="!localForm.target_everyone" class="form-section">
            <div class="section-title">Targeting</div>
            <div class="form-grid">
              <q-select
                v-model="localForm.target_positions"
                :options="positions"
                label="Target Positions"
                outlined
                dense
                multiple
                use-chips
                emit-value
                map-options
                :loading="loadingPositions"
                placeholder="Select positions"
                class="col-span-2"
              >
                <template v-slot:no-option>
                  <q-item><q-item-section class="text-grey">No positions available</q-item-section></q-item>
                </template>
              </q-select>

              <q-select
                v-model="localForm.target_users"
                :options="users"
                label="Target Users"
                outlined
                dense
                multiple
                use-chips
                emit-value
                map-options
                :loading="loadingUsers"
                placeholder="Select users"
                class="col-span-2"
              >
                <template v-slot:no-option>
                  <q-item><q-item-section class="text-grey">No users available</q-item-section></q-item>
                </template>
              </q-select>

              <q-select
                v-model="localForm.target_roles"
                :options="roles"
                label="Target Roles"
                outlined
                dense
                multiple
                use-chips
                emit-value
                map-options
                :loading="loadingRoles"
                placeholder="Select roles"
                class="col-span-2"
              >
                <template v-slot:no-option>
                  <q-item><q-item-section class="text-grey">No roles available</q-item-section></q-item>
                </template>
              </q-select>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="form-actions">
        <q-btn label="Cancel" flat color="grey-7" @click="$emit('update:modelValue', false)" />
        <q-btn
          :label="isEditing ? 'Update' : 'Create'"
          color="primary"
          :loading="saving"
          :disable="saving"
          @click="onSave"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editingAnnouncement: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  positions: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
  roles: { type: Array, default: () => [] },
  loadingPositions: { type: Boolean, default: false },
  loadingUsers: { type: Boolean, default: false },
  loadingRoles: { type: Boolean, default: false },
  typeSelectOptions: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'save', 'toggle-target-everyone'])

const defaultForm = {
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

const localForm = ref({ ...defaultForm })

const isEditing = computed(() => !!props.editingAnnouncement)

const onToggleEveryone = (val) => {
  emit('toggle-target-everyone', val)
}

const onSave = () => {
  emit('save', { ...localForm.value })
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.editingAnnouncement) {
        const e = props.editingAnnouncement
        localForm.value = {
          title: e.title || '',
          message: e.message || '',
          announcement_type: e.announcement_type || 'general',
          is_active: e.is_active ?? true,
          start_at: e.start_at || '',
          end_at: e.end_at || '',
          target_everyone: e.target_everyone ?? true,
          target_positions: e.target_positions || [],
          target_users: e.target_users || [],
          target_roles: e.target_roles || [],
        }
      } else {
        localForm.value = { ...defaultForm }
      }
    }
  },
)
</script>

<style scoped>
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px !important;
  background: #102335;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-icon {
  font-size: 28px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px;
  border-radius: 10px;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
}

.modal-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

.modal-content {
  padding: 20px 24px !important;
  flex: 1;
  overflow-y: auto;
}

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

@media (max-width: 1024px) {
  .dialog-modal {
    width: 580px;
  }
}

@media (max-width: 768px) {
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
.brand-toggle.q-toggle--active .q-toggle__track {
  background: rgba(16, 35, 53, 0.5) !important;
}
.brand-toggle.q-toggle--active .q-toggle__thumb:after {
  background: #102335 !important;
}
</style>
