<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
    @hide="resetForm"
  >
    <q-card class="inv-modal">
      <q-card-section class="inv-modal__head">
        <span class="inv-modal__head-icon">
          <q-icon name="o_mail" size="19px" />
        </span>
        <div class="inv-modal__head-titles">
          <div class="inv-modal__head-title">Invite employee</div>
          <div class="inv-modal__head-sub">They receive a join code by email</div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Close" @click="close" />
      </q-card-section>

      <q-form @submit="onSubmit">
        <q-card-section class="inv-modal__body">
          <label class="inv-field">
            <span class="inv-field__label">Email address</span>
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
            <span class="inv-field__hint">
              The address the invitation is sent to. One employee per invitation.
            </span>
          </label>

          <label class="inv-field">
            <span class="inv-field__label">User role</span>
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
                  <q-item-section class="inv-modal__no-option">
                    {{ loadingRoles ? 'Loading roles…' : 'No roles configured yet' }}
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <span class="inv-field__hint">
              Decides what they can see once they join. It can be changed later.
            </span>
          </label>
        </q-card-section>

        <q-card-actions class="inv-modal__foot">
          <q-btn flat no-caps label="Cancel" class="inv-modal__cancel" @click="close" />
          <q-btn
            type="submit"
            unelevated
            no-caps
            label="Send invitation"
            class="inv-modal__submit"
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
.inv-modal {
  width: 460px;
  max-width: 95vw;
  border-radius: var(--dash-r-lg);
  overflow: hidden;
}

/* ── Head ──
   The brand bar the app's other dialogs use, at the lighter weight the design
   system settled on: one 38px icon tile, no 44px avatar. */
.inv-modal__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  background: var(--dash-brand);
}
.inv-modal__head-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}
.inv-modal__head-titles {
  flex: 1;
  min-width: 0;
}
.inv-modal__head-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
}
.inv-modal__head-sub {
  margin-top: 1px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.78);
}
.inv-modal__head :deep(.q-btn) {
  color: rgba(255, 255, 255, 0.8);
  flex: none;
}
.inv-modal__head :deep(.q-btn:hover) {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.15);
}

/* ── Body ── */
.inv-modal__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  background: var(--dash-surface);
}

.inv-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
/* A real label above the field rather than a floating one: the hint under the
   field needs somewhere to attach, and a floating label leaves the resting
   state of an empty field ambiguous. */
.inv-field__label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dash-ink-2);
}
.inv-field__hint {
  font-size: 11.5px;
  color: var(--dash-ink-4);
  line-height: 1.45;
}
.inv-field :deep(.q-field__control) {
  height: 38px;
  min-height: 38px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.inv-field :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.inv-field :deep(.q-field__marginal) {
  height: 38px;
  color: var(--dash-ink-4);
}
/* Validation text pushes the hint down instead of overlapping it. */
.inv-field :deep(.q-field--error .q-field__bottom) {
  padding-top: 4px;
  font-size: 11.5px;
}

.inv-modal__no-option {
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* ── Foot ── */
.inv-modal__foot :deep(.q-btn + .q-btn) {
  /* Quasar spaces sibling buttons itself; the footer's own flex gap is the only
     spacing this footer wants. */
  margin-left: 0;
}

.inv-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  background: var(--dash-n-25);
  border-top: 1px solid var(--dash-line);
}
/* Cancel is quiet text. Both buttons used to be the same filled navy, which
   gave a dismissal the same weight as sending the invitation. */
.inv-modal__cancel {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-2);
  font-size: 13px;
  font-weight: 500;
}
.inv-modal__cancel:hover {
  background: var(--dash-n-100);
}
.inv-modal__submit {
  height: 36px;
  padding: 0 16px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
}
.inv-modal__submit:hover {
  background: #193d5c;
}

@media (max-width: 599px) {
  .inv-modal {
    width: 100%;
    border-radius: 0;
  }
  .inv-modal__foot {
    flex-direction: column-reverse;
  }
  .inv-modal__foot .q-btn {
    width: 100%;
    margin: 0;
  }
}
</style>
