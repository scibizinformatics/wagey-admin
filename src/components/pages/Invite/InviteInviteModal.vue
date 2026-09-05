<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
    @hide="resetForm"
  >
    <q-card class="dash-modal dash-modal--sm">
      <q-card-section class="dash-modal__head">
        <span class="dash-modal__head-icon">
          <q-icon name="o_mail" size="20px" />
        </span>
        <div class="dash-modal__head-titles">
          <div class="dash-modal__title">Invite employee</div>
          <div class="dash-modal__sub">They receive a join code by email</div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Close" @click="close" />
      </q-card-section>

      <q-form class="dash-modal__form" @submit="onSubmit">
        <q-card-section class="dash-modal__body dash-modal__stack">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Email address</span>
            <q-input
              v-model="form.email"
              type="email"
              placeholder="name@company.com"
              outlined
              dense
              hide-bottom-space
              autofocus
              class="dash-field"
              :rules="emailRules"
            />
            <span class="dash-modal__field-hint">
              The address the invitation is sent to. One employee per invitation.
            </span>
          </label>

          <label class="dash-modal__field">
            <span class="dash-modal__field-label">User role</span>
            <q-select
              v-model="form.user_role"
              :options="userRoleOptions"
              :loading="loadingRoles"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              hide-bottom-space
              popup-content-class="dash-popup"
              placeholder="Select a role"
              class="dash-field"
              :rules="[(val) => !!val || 'Pick the role this person joins with']"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="inv-no-option">
                    {{ loadingRoles ? 'Loading roles…' : 'No roles configured yet' }}
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <span class="dash-modal__field-hint">
              Decides what they can see once they join. It can be changed later.
            </span>
          </label>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" @click="close" />
          <q-btn
            type="submit"
            unelevated
            no-caps
            label="Send invitation"
            class="dash-modal__submit"
            :loading="saving"
            :disable="!isFormValid"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Sending one invitation. Two fields, each with a line saying what it decides —
 * the old version titled them "Email Information" and "Role Assignment", which
 * named the field again rather than explaining it.
 */
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'

defineProps({
  modelValue: { type: Boolean, default: false },
  userRoleOptions: { type: Array, default: () => [] },
  loadingRoles: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'send'])

const $q = useQuasar()

const form = ref({ email: '', user_role: null })

const emailRules = [
  (val) => !!val || 'An email address is required',
  (val) => /.+@.+\..+/.test(val || '') || 'That does not look like an email address',
]

const isFormValid = computed(
  () => !!form.value.email && /.+@.+\..+/.test(form.value.email) && !!form.value.user_role,
)

/** Cleared on hide, so "Send another" from the success dialog opens an empty
 *  form instead of the address that was just invited. */
const resetForm = () => {
  form.value = { email: '', user_role: null }
}

const close = () => emit('update:modelValue', false)

const onSubmit = () => {
  if (!isFormValid.value) return
  emit('send', { email: form.value.email.trim(), user_role: form.value.user_role })
}
</script>

<style scoped>
/* The "nothing to pick" line inside the role menu. Larger than a field hint
   because it stands in for a list item, not for helper text under a control. */
.inv-no-option {
  font-size: 13px;
  color: var(--dash-ink-3);
}
</style>
