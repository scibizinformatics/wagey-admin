<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-avatar size="38px" class="dash-modal__head-icon">
            <q-icon name="edit" size="20px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Edit employee</div>
            <div class="dash-modal__sub">{{ fullName }}</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="cancel" />
      </q-card-section>

      <q-form @submit="submit" class="dash-modal__form">
        <q-card-section class="dash-modal__body">
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
              <input
                type="file"
                ref="avatarInput"
                accept="image/*"
                style="display: none"
                @change="onAvatarSelect"
              />
              <div class="avatar-actions">
                <q-btn
                  flat
                  dense
                  color="primary"
                  icon="upload"
                  label="Change photo"
                  @click="$refs.avatarInput.click()"
                />
                <q-btn
                  v-if="editAvatarPreview"
                  flat
                  dense
                  color="negative"
                  icon="delete"
                  label="Remove"
                  @click="removeAvatar"
                />
              </div>
              <div class="avatar-hint">Max 5MB · JPG, PNG, GIF</div>
            </div>
          </div>

          <div class="form-section">
            <div class="dash-modal__section-title">User information</div>
            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Username<span class="dash-modal__req">*</span></span
                >
                <q-input
                  v-model="form.user.username"
                  outlined
                  dense
                  :rules="[(val) => !!val || 'Username is required']"
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Email<span class="dash-modal__req">*</span></span
                >
                <q-input
                  v-model="form.user.email"
                  type="email"
                  outlined
                  dense
                  :rules="[
                    (val) => !!val || 'Email is required',
                    (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
                  ]"
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >First name<span class="dash-modal__req">*</span></span
                >
                <q-input
                  v-model="form.user.first_name"
                  outlined
                  dense
                  :rules="[(val) => !!val || 'First name is required']"
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Middle name</span>
                <q-input
                  v-model="form.user.middle_name"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Last name<span class="dash-modal__req">*</span></span
                >
                <q-input
                  v-model="form.user.last_name"
                  outlined
                  dense
                  :rules="[(val) => !!val || 'Last name is required']"
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
            </div>
          </div>

          <!-- Personal Information Section -->
          <div class="form-section">
            <div class="dash-modal__section-title">Personal information</div>
            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Civil status</span>
                <q-select
                  v-model="form.civil_status"
                  :options="civilStatusOptions"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                  popup-content-class="dash-popup dash-popup--modal"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Birthday</span>
                <q-input
                  v-model="form.birthday"
                  type="date"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Phone number</span>
                <q-input
                  v-model="form.phone_number"
                  outlined
                  dense
                  mask="############"
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Emergency contact</span>
                <q-input
                  v-model="form.emergency_contact"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Address</span>
                <q-input
                  v-model="form.address"
                  outlined
                  dense
                  type="textarea"
                  rows="2"
                  class="dash-field dash-modal__span-2"
                  hide-bottom-space
                />
              </label>
            </div>
          </div>

          <div class="form-section">
            <div class="dash-modal__section-title">Employment information</div>
            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label"
                  >Role<span class="dash-modal__req">*</span></span
                >
                <q-select
                  v-model="form.user_role"
                  :options="roleOptions"
                  option-label="name"
                  option-value="id"
                  outlined
                  dense
                  :rules="[(val) => !!val || 'Role is required']"
                  hide-bottom-space
                  class="dash-field"
                  popup-content-class="dash-popup dash-popup--modal"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Bank account</span>
                <q-input
                  v-model="form.bank_acct"
                  outlined
                  dense
                  hide-bottom-space
                  class="dash-field"
                />
              </label>
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Timezone</span>
                <q-select
                  v-model="form.timezone"
                  :options="timezoneOptions"
                  outlined
                  dense
                  use-input
                  @filter="filterTimezones"
                  hide-bottom-space
                  class="dash-field"
                  popup-content-class="dash-popup dash-popup--modal"
                />
              </label>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn label="Cancel" flat class="dash-modal__cancel" @click="cancel" />
          <q-btn
            label="Save changes"
            type="submit"
            unelevated
            class="dash-modal__submit"
            :loading="saving || uploadingAvatar"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employee: { type: Object, default: () => ({}) },
  roleOptions: { type: Array, default: () => [] },
  civilStatusOptions: {
    type: Array,
    default: () => ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'],
  },
  timezoneOptions: {
    type: Array,
    default: () => [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Manila',
      'Australia/Sydney',
    ],
  },
  saving: { type: Boolean, default: false },
  uploadingAvatar: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel', 'avatarSelect', 'avatarRemove'])

const avatarInput = ref(null)
const editAvatarPreview = ref(null)
const filteredTimezoneOptions = ref([...props.timezoneOptions])

const fullName = computed(() => {
  if (!props.employee) return 'N/A'
  return (
    `${props.employee.user?.first_name || ''} ${props.employee.user?.last_name || ''}`.trim() ||
    props.employee.user?.username ||
    'N/A'
  )
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

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.employee) {
      const detailed = props.employee
      const roleNameFromCompany = detailed.companies?.[0]?.user_role?.name || ''
      const matchingRole =
        props.roleOptions.find(
          (role) =>
            role.name?.toLowerCase() ===
            (
              detailed.user_role_name ||
              detailed.user_role?.name ||
              roleNameFromCompany
            ).toLowerCase(),
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
  },
)

const filterTimezones = (val, update) => {
  if (val === '') {
    update(() => {
      filteredTimezoneOptions.value = props.timezoneOptions
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    filteredTimezoneOptions.value = props.timezoneOptions.filter(
      (v) => v.toLowerCase().indexOf(needle) > -1,
    )
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
  reader.onload = (e) => {
    editAvatarPreview.value = e.target.result
  }
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
/* Avatar upload */
.avatar-upload-section {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--dash-line);
}

.avatar-preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.avatar-placeholder {
  background: var(--dash-n-100) !important;
  color: var(--dash-ink-4) !important;
}

.avatar-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.avatar-hint {
  font-size: 11px;
  color: var(--dash-ink-4);
  text-align: center;
}
</style>
