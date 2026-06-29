<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="modal-card add-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
            <q-icon name="mail" size="22px" />
          </q-avatar>
          <div>
            <div class="modal-title">Invite Employee</div>
            <div class="modal-subtitle">Enter employee email to send invitation</div>
          </div>
        </div>
        <q-btn icon="close" flat round dense class="modal-close-btn" @click="closeModal" />
      </q-card-section>

      <q-card-section class="modal-content">
        <q-form @submit="onSubmit" class="edit-form">
          <div class="form-section">
            <div class="section-title">Email Information</div>
            <div class="form-grid">
              <q-input
                v-model="form.email"
                label="Email Address *"
                type="email"
                outlined
                dense
                :rules="[
                  (val) => !!val || 'Email is required',
                  (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
                ]"
              >
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">Role Assignment</div>
            <div class="form-grid">
              <q-select
                v-model="form.user_role"
                :options="userRoleOptions"
                :loading="loadingRoles"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                label="User Role *"
                outlined
                dense
                clearable
                :rules="[(val) => !!val || 'Role is required']"
              >
                <template v-slot:prepend>
                  <q-icon name="badge" />
                </template>
              </q-select>
            </div>
          </div>

          <div class="form-actions">
            <q-btn label="Cancel" flat class="cancel-btn" @click="closeModal" />
            <q-btn
              label="Send Invitation"
              type="submit"
              unelevated
              class="submit-btn"
              :loading="saving"
              :disable="!isFormValid"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  userRoleOptions: { type: Array, default: () => [] },
  loadingRoles: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'send'])

const form = ref({
  email: '',
  user_role: null,
})

const isFormValid = computed(() => {
  return form.value.email && /.+@.+\..+/.test(form.value.email) && form.value.user_role
})

const closeModal = () => {
  emit('update:modelValue', false)
}

const onSubmit = () => {
  if (!isFormValid.value) return
  emit('send', { email: form.value.email.trim(), user_role: form.value.user_role })
}
</script>

<style scoped>
.modal-card {
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.add-modal {
  max-width: 520px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #102335 !important;
  border-bottom: none !important;
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
  color: #ffffff !important;
}

.modal-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8) !important;
  margin-top: 2px;
}

.modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
  background: #f9fafb !important;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
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
  grid-template-columns: 1fr;
  gap: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
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

@media (max-width: 768px) {
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions .q-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .modal-title {
    font-size: 15px;
  }
}
</style>
