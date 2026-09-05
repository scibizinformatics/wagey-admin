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
            <q-icon name="person_add" size="22px" />
          </q-avatar>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Add employee</div>
            <div class="dash-modal__sub" id="add-step-label">
              Step {{ step }} of 3 —
              {{
                step === 1
                  ? 'User & personal information'
                  : step === 2
                    ? 'Employment information'
                    : 'Review & confirm'
              }}
            </div>
          </div>
        </div>
        <q-btn icon="close" flat round dense aria-label="Close" @click="cancel" />
      </q-card-section>

      <!-- Stepper dots -->
      <div class="stepper-dots">
        <span :class="['dot', step >= 1 ? 'dot-active' : '']"></span>
        <span :class="['dot', step >= 2 ? 'dot-active' : '']"></span>
        <span :class="['dot', step >= 3 ? 'dot-active' : '']"></span>
      </div>

      <q-form @submit="submit" class="dash-modal__form" ref="formRef">
        <q-card-section class="dash-modal__body">
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
                    label="Upload photo"
                    @click="$refs.avatarInput.click()"
                  />
                  <q-btn
                    v-if="avatarPreview"
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
                <label class="dash-modal__field">
                  <span class="dash-modal__field-label"
                    >Password<span class="dash-modal__req">*</span></span
                  >
                  <q-input
                    v-model="form.password"
                    type="password"
                    outlined
                    dense
                    :rules="[
                      (val) => !!val || 'Password is required',
                      (val) => val.length >= 8 || 'Min 8 characters',
                    ]"
                    hide-bottom-space
                    class="dash-field"
                  />
                </label>
                <label class="dash-modal__field">
                  <span class="dash-modal__field-label"
                    >Confirm password<span class="dash-modal__req">*</span></span
                  >
                  <q-input
                    v-model="confirmPassword"
                    type="password"
                    outlined
                    dense
                    :rules="[
                      (val) => !!val || 'Please confirm password',
                      (val) => val === form.password || 'Passwords do not match',
                    ]"
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
                    mask="###########"
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
          </div>

          <!-- Step 2: Employment Info -->
          <div v-show="step === 2">
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
          </div>

          <!-- Step 3: Review & Confirm -->
          <div v-show="step === 3">
            <div class="form-section">
              <div class="dash-modal__section-title">Review and confirm</div>
              <div class="detail-grid-cards">
                <div class="detail-card">
                  <div class="detail-card-label">Username</div>
                  <div class="detail-card-value">{{ form.user.username || '—' }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Email</div>
                  <div class="detail-card-value">{{ form.user.email || '—' }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Full name</div>
                  <div class="detail-card-value">
                    {{
                      [form.user.first_name, form.user.middle_name, form.user.last_name]
                        .filter(Boolean)
                        .join(' ') || '—'
                    }}
                  </div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Role</div>
                  <div class="detail-card-value">{{ form.user_role?.name || '—' }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Civil status</div>
                  <div class="detail-card-value">{{ form.civil_status || '—' }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Birthday</div>
                  <div class="detail-card-value">{{ form.birthday || '—' }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Phone number</div>
                  <div class="detail-card-value">{{ form.phone_number || '—' }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Bank account</div>
                  <div class="detail-card-value">{{ form.bank_acct || '—' }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Timezone</div>
                  <div class="detail-card-value">{{ form.timezone || '—' }}</div>
                </div>
                <div class="detail-card detail-card-full">
                  <div class="detail-card-label">Address</div>
                  <div class="detail-card-value">{{ form.address || '—' }}</div>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn v-if="step > 1" label="Back" flat class="dash-modal__cancel" @click="step--" />
          <q-btn label="Cancel" flat class="dash-modal__cancel" @click="cancel" />
          <q-btn
            v-if="step < 3"
            label="Next"
            unelevated
            class="dash-modal__submit"
            @click="step++"
          />
          <q-btn
            v-else
            label="Add employee"
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
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
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

watch(
  () => props.modelValue,
  (val) => {
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
    avatarPreview.value = e.target.result
  }
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
  emit('submit', {
    ...form.value,
    confirmPassword: confirmPassword.value,
    avatarPreview: avatarPreview.value,
  })
}
</script>

<style scoped>
/* The card, header, body, field metrics and button pair are the shared
   `dash-modal` chrome. What is left is this wizard's own furniture. */

/* ── Step indicator ──
   Three dots on the navy, directly under the header, so the strip reads as part
   of the header rather than as a band of its own. The header line already names
   the step in words; the dots are only the shape of the progress. */
.stepper-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 8px 0 10px;
  background: var(--dash-brand);
  flex: none;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: var(--dash-r-pill);
  background: rgba(255, 255, 255, 0.32);
  transition:
    background var(--dash-slow) var(--dash-ease),
    transform var(--dash-slow) var(--dash-ease);
}

.dot-active {
  background: #ffffff;
  transform: scale(1.25);
}

/* A titled group of fields. Read-only groups get `dash-modal__section`, which
   draws a card; a form group is only a heading over its inputs. */

/* ── Photo ── */
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
  background: var(--dash-n-100);
  color: var(--dash-ink-4);
}

.avatar-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.avatar-hint {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  text-align: center;
}

/* ── Review step ──
   The same read-only fact grid the employee view dialog uses: a label over its
   value, two to a row. The labels were 11px uppercase at 0.04em tracking, the
   one convention the design system singles out as dated. */
.detail-grid-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-card {
  padding: 10px 13px;
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-md);
  min-width: 0;
}

.detail-card-full {
  grid-column: 1 / -1;
}

.detail-card-label {
  margin-bottom: 3px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--dash-ink-3);
}

.detail-card-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--dash-ink);
  word-break: break-word;
}

@media (max-width: 768px) {
  .detail-grid-cards {
    grid-template-columns: minmax(0, 1fr);
  }
  .detail-card-full {
    grid-column: span 1;
  }
}
</style>
