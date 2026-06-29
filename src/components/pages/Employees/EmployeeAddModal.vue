<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="modal-card add-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
            <q-icon name="person_add" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">Add New Employee</div>
            <div class="modal-subtitle" id="add-step-label">
              Step {{ step }} of 3 —
              {{ step === 1 ? 'User & personal information' : step === 2 ? 'Employment information' : 'Review & confirm' }}
            </div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="cancel" />
      </q-card-section>

      <!-- Stepper dots -->
      <div class="stepper-dots">
        <span :class="['dot', step >= 1 ? 'dot-active' : '']"></span>
        <span :class="['dot', step >= 2 ? 'dot-active' : '']"></span>
        <span :class="['dot', step >= 3 ? 'dot-active' : '']"></span>
      </div>

      <q-card-section class="modal-content">
        <q-form @submit="submit" class="edit-form" ref="formRef">
          <!-- Step 1: User Info -->
          <div v-show="step === 1">
            <!-- Avatar Upload Section -->
            <div class="avatar-upload-section">
              <div class="avatar-preview-wrapper">
                <q-avatar size="90px" v-if="avatarPreview">
                  <img :src="avatarPreview" alt="Avatar Preview" />
                </q-avatar>
                <q-avatar v-else size="90px" class="avatar-placeholder">
                  <q-icon name="person" size="40px" />
                </q-avatar>
                <input type="file" ref="avatarInput" accept="image/*" style="display: none" @change="onAvatarSelect" />
                <div class="avatar-actions">
                  <q-btn flat dense color="primary" icon="upload" label="Upload Photo" @click="$refs.avatarInput.click()" />
                  <q-btn v-if="avatarPreview" flat dense color="negative" icon="delete" label="Remove" @click="removeAvatar" />
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
                <q-input v-model="form.password" label="Password *" type="password" outlined dense :rules="[(val) => !!val || 'Password is required', (val) => val.length >= 8 || 'Min 8 characters']" />
                <q-input v-model="confirmPassword" label="Confirm Password *" type="password" outlined dense :rules="[(val) => !!val || 'Please confirm password', (val) => val === form.password || 'Passwords do not match']" />
              </div>
            </div>

            <!-- Personal Information Section -->
            <div class="form-section">
              <div class="section-title">Personal Information</div>
              <div class="form-grid">
                <q-select v-model="form.civil_status" :options="civilStatusOptions" label="Civil Status" outlined dense />
                <q-input v-model="form.birthday" label="Birthday" type="date" outlined dense />
                <q-input v-model="form.phone_number" label="Phone Number" outlined dense mask="###########" />
                <q-input v-model="form.emergency_contact" label="Emergency Contact" outlined dense />
                <q-input v-model="form.address" label="Address" outlined dense type="textarea" rows="2" class="col-span-2" />
              </div>
            </div>
          </div>

          <!-- Step 2: Employment Info -->
          <div v-show="step === 2">
            <div class="form-section">
              <div class="section-title">Employment information</div>
              <div class="form-grid">
                <q-select v-model="form.user_role" :options="roleOptions" option-label="name" option-value="id" label="Role *" outlined dense :rules="[(val) => !!val || 'Role is required']" />
                <q-input v-model="form.bank_acct" label="Bank Account" outlined dense />
                <q-select v-model="form.timezone" :options="timezoneOptions" label="Timezone" outlined dense use-input @filter="filterTimezones" />
              </div>
            </div>
          </div>

          <!-- Step 3: Review & Confirm -->
          <div v-show="step === 3">
            <div class="form-section">
              <div class="section-title">Review & Confirm</div>
              <div class="detail-grid-cards">
                <div class="detail-card"><div class="detail-card-label">Username</div><div class="detail-card-value">{{ form.user.username || '—' }}</div></div>
                <div class="detail-card"><div class="detail-card-label">Email</div><div class="detail-card-value">{{ form.user.email || '—' }}</div></div>
                <div class="detail-card"><div class="detail-card-label">Full Name</div><div class="detail-card-value">{{ [form.user.first_name, form.user.middle_name, form.user.last_name].filter(Boolean).join(' ') || '—' }}</div></div>
                <div class="detail-card"><div class="detail-card-label">Role</div><div class="detail-card-value">{{ form.user_role?.name || '—' }}</div></div>
                <div class="detail-card"><div class="detail-card-label">Civil Status</div><div class="detail-card-value">{{ form.civil_status || '—' }}</div></div>
                <div class="detail-card"><div class="detail-card-label">Birthday</div><div class="detail-card-value">{{ form.birthday || '—' }}</div></div>
                <div class="detail-card"><div class="detail-card-label">Phone Number</div><div class="detail-card-value">{{ form.phone_number || '—' }}</div></div>
                <div class="detail-card"><div class="detail-card-label">Bank Account</div><div class="detail-card-value">{{ form.bank_acct || '—' }}</div></div>
                <div class="detail-card"><div class="detail-card-label">Timezone</div><div class="detail-card-value">{{ form.timezone || '—' }}</div></div>
                <div class="detail-card detail-card-full"><div class="detail-card-label">Address</div><div class="detail-card-value">{{ form.address || '—' }}</div></div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <q-btn v-if="step > 1" label="Back" flat class="cancel-btn" @click="step--" />
            <q-btn label="Cancel" flat class="cancel-btn" @click="cancel" />
            <q-btn v-if="step < 3" label="Next" unelevated class="submit-btn" @click="step++" />
            <q-btn v-else label="Add Employee" type="submit" unelevated class="submit-btn" :loading="saving || uploadingAvatar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
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

const formRef = ref(null)
const avatarInput = ref(null)
const step = ref(1)
const confirmPassword = ref('')
const avatarPreview = ref(null)

const form = ref({
  user: { username: '', email: '', first_name: '', middle_name: '', last_name: '' },
  password: '',
  user_role: null,
  civil_status: '',
  address: '',
  phone_number: '',
  emergency_contact: '',
  birthday: '',
  bank_acct: '',
  timezone: '',
})

const filteredTimezoneOptions = ref([...props.timezoneOptions])

watch(() => props.modelValue, (val) => {
  if (val) {
    step.value = 1
    confirmPassword.value = ''
    avatarPreview.value = null
    form.value = {
      user: { username: '', email: '', first_name: '', middle_name: '', last_name: '' },
      password: '',
      user_role: null,
      civil_status: '',
      address: '',
      phone_number: '',
      emergency_contact: '',
      birthday: '',
      bank_acct: '',
      timezone: '',
    }
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
  reader.onload = (e) => { avatarPreview.value = e.target.result }
  reader.readAsDataURL(file)
}

const removeAvatar = () => {
  avatarPreview.value = null
  emit('avatarRemove')
  if (avatarInput.value) avatarInput.value.value = ''
}

const cancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const submit = () => {
  emit('submit', { ...form.value, confirmPassword: confirmPassword.value, avatarPreview: avatarPreview.value })
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
  background: #102335 !important;
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

.modal-avatar-add {
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

/* Stepper dots */
.stepper-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 8px 0 10px;
  background: #102335;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  transition: background 0.2s ease, transform 0.2s ease;
}

.dot-active {
  background: #ffffff;
  transform: scale(1.25);
}

/* Form sections */
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
  background: #102335 !important;
  color: #ffffff !important;
  border-radius: 10px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  padding: 0 18px !important;
  min-height: 38px !important;
}
.cancel-btn:hover {
  background: #193d5c !important;
}
.submit-btn {
  background: #102335 !important;
  color: white;
  border-radius: 10px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  min-height: 38px !important;
  padding: 0 22px !important;
}
.submit-btn:hover {
  background: #193d5c !important;
  box-shadow: 0 4px 12px rgba(16, 35, 53, 0.3) !important;
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

/* Detail grid cards */
.detail-grid-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #f1f3f5;
}

.detail-card-full {
  grid-column: 1 / -1;
}

.detail-card-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.detail-card-value {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  word-break: break-word;
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
  .detail-grid-cards {
    grid-template-columns: 1fr;
  }
  .detail-card-full {
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
