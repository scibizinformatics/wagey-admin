<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card edit-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon modal-avatar-edit">
            <q-icon name="edit" size="20px" />
          </q-avatar>
          <div>
            <div class="modal-title">Edit Employee</div>
            <div class="modal-subtitle">{{ fullName }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="cancel" />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content">
        <q-form @submit="submit" class="edit-form">
          <!-- Avatar Upload Section for Edit -->
          <div class="avatar-upload-section">
            <div class="avatar-preview-wrapper">
              <q-avatar size="90px" v-if="editAvatarPreview">
                <img :src="editAvatarPreview" alt="Avatar Preview" />
              </q-avatar>
              <q-avatar v-else-if="employee?.user?.picture_url" size="90px">
                <img :src="employee.user.picture_url" :alt="fullName" />
              </q-avatar>
              <q-avatar v-else size="90px" class="avatar-placeholder">
                <q-icon name="person" size="40px" />
              </q-avatar>
              <input type="file" ref="avatarInput" accept="image/*" style="display: none" @change="onAvatarSelect" />
              <div class="avatar-actions">
                <q-btn flat dense color="primary" icon="upload" label="Change Photo" @click="$refs.avatarInput.click()" />
                <q-btn v-if="editAvatarPreview" flat dense color="negative" icon="delete" label="Remove" @click="removeAvatar" />
              </div>
              <div class="avatar-hint">Max 5MB · JPG, PNG, GIF</div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">User information</div>
            <div class="form-grid">
              <q-input v-model="form.user.username" label="Username *" outlined dense :rules="[(val) => !!val || 'Username is required']" />
              <q-input v-model="form.user.email" label="Email *" type="email" outlined dense :rules="[(val) => !!val || 'Email is required', (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email']" />
              <q-input v-model="form.user.first_name" label="First Name *" outlined dense :rules="[(val) => !!val || 'First name is required']" />
              <q-input v-model="form.user.middle_name" label="Middle Name" outlined dense />
              <q-input v-model="form.user.last_name" label="Last Name *" outlined dense :rules="[(val) => !!val || 'Last name is required']" />
            </div>
          </div>

          <!-- Personal Information Section -->
          <div class="form-section">
            <div class="section-title">Personal Information</div>
            <div class="form-grid">
              <q-select v-model="form.civil_status" :options="civilStatusOptions" label="Civil Status" outlined dense />
              <q-input v-model="form.birthday" label="Birthday" type="date" outlined dense />
              <q-input v-model="form.phone_number" label="Phone Number" outlined dense mask="############" />
              <q-input v-model="form.emergency_contact" label="Emergency Contact" outlined dense />
              <q-input v-model="form.address" label="Address" outlined dense type="textarea" rows="2" class="col-span-2" />
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">Employment information</div>
            <div class="form-grid">
              <q-select v-model="form.user_role" :options="roleOptions" option-label="name" option-value="id" label="Role *" outlined dense :rules="[(val) => !!val || 'Role is required']" />
              <q-input v-model="form.bank_acct" label="Bank Account" outlined dense />
              <q-select v-model="form.timezone" :options="timezoneOptions" label="Timezone" outlined dense use-input @filter="filterTimezones" />
            </div>
          </div>

          <div class="form-actions">
            <q-btn label="Cancel" flat class="cancel-btn" @click="cancel" />
            <q-btn label="Save Changes" type="submit" unelevated class="submit-btn" :loading="saving || uploadingAvatar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employee: { type: Object, default: () => ({}) },
  roleOptions: { type: Array, default: () => [] },
  civilStatusOptions: { type: Array, default: () => ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'] },
  timezoneOptions: { type: Array, default: () => [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Manila', 'Australia/Sydney',
  ] },
  saving: { type: Boolean, default: false },
  uploadingAvatar: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel', 'avatarSelect', 'avatarRemove'])

const avatarInput = ref(null)
const editAvatarPreview = ref(null)
const filteredTimezoneOptions = ref([...props.timezoneOptions])

const fullName = computed(() => {
  if (!props.employee) return 'N/A'
  return `${props.employee.user?.first_name || ''} ${props.employee.user?.last_name || ''}`.trim() || props.employee.user?.username || 'N/A'
})

const form = ref({
  user: { id: 0, username: '', email: '', first_name: '', middle_name: '', last_name: '' },
  user_role: null,
  civil_status: '',
  address: '',
  phone_number: '',
  emergency_contact: '',
  birthday: '',
  bank_acct: '',
  timezone: '',
})

watch(() => props.modelValue, (val) => {
  if (val && props.employee) {
    const detailed = props.employee
    const roleNameFromCompany = detailed.companies?.[0]?.user_role?.name || ''
    const matchingRole = props.roleOptions.find(
      (role) => role.name?.toLowerCase() === (detailed.user_role_name || detailed.user_role?.name || roleNameFromCompany).toLowerCase(),
    ) || null

    form.value = {
      user: {
        id: detailed.user?.id || 0,
        username: detailed.user?.username || '',
        email: detailed.user?.email || '',
        first_name: detailed.user?.first_name || '',
        middle_name: detailed.user?.middle_name || '',
        last_name: detailed.user?.last_name || '',
      },
      user_role: matchingRole || detailed.user_role || null,
      civil_status: detailed.civil_status || '',
      address: detailed.address || '',
      phone_number: detailed.phone_number || '',
      emergency_contact: detailed.emergency_contact || '',
      birthday: detailed.birthday || '',
      bank_acct: detailed.bank_acct || '',
      timezone: detailed.timezone || '',
    }
    editAvatarPreview.value = null
  }
})

const filterTimezones = (val, update) => {
  if (val === '') {
    update(() => { filteredTimezoneOptions.value = props.timezoneOptions })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    filteredTimezoneOptions.value = props.timezoneOptions.filter((v) => v.toLowerCase().indexOf(needle) > -1)
  })
}

const onAvatarSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) return
  emit('avatarSelect', file)
  const reader = new FileReader()
  reader.onload = (e) => { editAvatarPreview.value = e.target.result }
  reader.readAsDataURL(file)
}

const removeAvatar = () => {
  editAvatarPreview.value = null
  emit('avatarRemove')
  if (avatarInput.value) avatarInput.value.value = ''
}

const cancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const submit = () => {
  emit('submit', { ...form.value })
}
</script>

<style scoped>
.modal-card {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  width: 560px;
  max-width: 95vw !important;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: #2563eb !important;
  border-bottom: none !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.modal-header .q-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}
.modal-header .q-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.15) !important;
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

.modal-avatar-edit {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.modal-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  flex-shrink: 0;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  max-height: 70vh;
  flex: 1;
  background: #f9fafb !important;
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
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.col-span-2 {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #f1f3f5;
  margin-top: 8px;
}

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

/* Avatar upload */
.avatar-upload-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f1f3f5;
}

.avatar-preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.avatar-placeholder {
  background: #f3f4f6 !important;
  color: #9ca3af !important;
}

.avatar-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.avatar-hint {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

@media (max-width: 768px) {
  .modal-card {
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 24px);
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .col-span-2 {
    grid-column: span 1;
  }
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions .q-btn {
    width: 100%;
  }
}
</style>
