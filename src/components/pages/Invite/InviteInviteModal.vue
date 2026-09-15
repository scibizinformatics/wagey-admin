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
          <div class="dash-modal__title">
            {{ isBulk ? 'Invite employees' : 'Invite employee' }}
          </div>
          <div class="dash-modal__sub">
            {{
              isBulk
                ? 'Everyone on the list receives a join code by email'
                : 'They receive a join code by email'
            }}
          </div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Close" @click="close" />
      </q-card-section>

      <q-form class="dash-modal__form" @submit="onSubmit">
        <q-card-section class="dash-modal__body dash-modal__stack">
          <!-- How many people this send is for. A segmented pair rather than an
               on/off switch: the two modes are alternatives, and a switch
               labelled "bulk" leaves the off state unnamed. -->
          <q-btn-toggle
            v-model="mode"
            class="inv-mode"
            no-caps
            unelevated
            spread
            toggle-color="primary"
            color="white"
            text-color="grey-8"
            :options="modeOptions"
            role="group"
            aria-label="How many people to invite"
          />

          <label v-if="!isBulk" class="dash-modal__field">
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

          <!-- A div rather than the `label` the single field uses: this one
               carries block content (the parse report below), which a label's
               content model does not allow. -->
          <div v-else class="dash-modal__field">
            <span class="dash-modal__field-label">Email addresses</span>
            <q-input
              v-model="form.bulk"
              type="textarea"
              autogrow
              placeholder="ana@company.com&#10;ben@company.com&#10;cara@company.com"
              outlined
              hide-bottom-space
              autofocus
              class="dash-field inv-bulk__area"
            />
            <span class="dash-modal__field-hint">
              One per line, or separated by commas — paste a column straight out of a spreadsheet.
              Everyone is invited with the same role.
            </span>

            <!-- What the box was read as, before anything is sent. Duplicates
                 are reported as dropped rather than as a problem; a malformed
                 address is held back for correction, because dropping it too
                 would leave somebody uninvited with nothing saying so. -->
            <div v-if="hasBulkInput" class="inv-parse">
              <p class="inv-parse__line">
                <q-icon
                  :name="parsed.valid.length ? 'o_check_circle' : 'o_info'"
                  size="15px"
                  :class="parsed.valid.length ? 'inv-parse__ok' : 'inv-parse__idle'"
                />
                <span>
                  <strong>{{ parsed.valid.length }}</strong>
                  {{ parsed.valid.length === 1 ? 'address' : 'addresses' }} ready
                  <template v-if="parsed.duplicates.length">
                    · {{ parsed.duplicates.length }}
                    {{ parsed.duplicates.length === 1 ? 'duplicate' : 'duplicates' }} ignored
                  </template>
                </span>
              </p>

              <div v-if="parsed.invalid.length" class="inv-parse__bad">
                <p class="inv-parse__bad-head">
                  {{ parsed.invalid.length === 1 ? 'This entry is not' : 'These entries are not' }}
                  a valid email address. Correct or remove
                  {{ parsed.invalid.length === 1 ? 'it' : 'them' }} to send.
                </p>
                <ul class="inv-parse__bad-list">
                  <li v-for="entry in parsed.invalid" :key="entry">{{ entry }}</li>
                </ul>
              </div>
            </div>
          </div>

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
              {{
                isBulk
                  ? 'Decides what everyone on the list can see once they join. It can be changed per person later.'
                  : 'Decides what they can see once they join. It can be changed later.'
              }}
            </span>
          </label>
        </q-card-section>

        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" @click="close" />
          <q-btn
            type="submit"
            unelevated
            no-caps
            :label="submitLabel"
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
 * Sending invitations, one address or a pasted list of them. Two fields, each
 * with a line saying what it decides — the old version titled them "Email
 * Information" and "Role Assignment", which named the field again rather than
 * explaining it.
 *
 * Both modes emit the same `send` payload — an array of addresses — because the
 * endpoint has always taken `emails: []`; single is the one-element case rather
 * than a separate call. The two boxes keep their own value, so toggling to
 * check the other mode does not discard what was already typed.
 */
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { parseEmailList, isEmailShaped } from './inviteEmails'

defineProps({
  modelValue: { type: Boolean, default: false },
  userRoleOptions: { type: Array, default: () => [] },
  loadingRoles: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'send'])

const $q = useQuasar()

const modeOptions = [
  { label: 'Single', value: 'single' },
  { label: 'Bulk', value: 'bulk' },
]

const mode = ref('single')
const isBulk = computed(() => mode.value === 'bulk')

const form = ref({ email: '', bulk: '', user_role: null })

const emailRules = [
  (val) => !!val || 'An email address is required',
  (val) => isEmailShaped(val) || 'That does not look like an email address',
]

const parsed = computed(() => parseEmailList(form.value.bulk))

const hasBulkInput = computed(() => !!form.value.bulk.trim())

/** The addresses this send is for, in either mode. */
const recipients = computed(() =>
  isBulk.value ? parsed.value.valid : [form.value.email.trim()].filter(Boolean),
)

const isFormValid = computed(() => {
  if (!form.value.user_role) return false
  if (!isBulk.value) return isEmailShaped(form.value.email)
  // A malformed entry blocks the send rather than being skipped: the person
  // named in it would otherwise never be invited, and the confirmation would
  // still have read as a clean success.
  return parsed.value.valid.length > 0 && parsed.value.invalid.length === 0
})

const submitLabel = computed(() =>
  recipients.value.length > 1 ? `Send ${recipients.value.length} invitations` : 'Send invitation',
)

/** An address already typed carries over when the person realises they need
 *  several, rather than having to be retyped as the first line of the list. */
watch(mode, (next) => {
  if (next === 'bulk' && !form.value.bulk.trim() && form.value.email.trim()) {
    form.value.bulk = form.value.email.trim()
  }
})

/** Cleared on hide, so "Invite another" from the success dialog opens an empty
 *  form instead of the addresses that were just invited. The mode is left as it
 *  was: someone who has just sent a batch is far more likely to be sending
 *  another one than to have switched back to inviting a single person. */
const resetForm = () => {
  form.value = { email: '', bulk: '', user_role: null }
}

const close = () => emit('update:modelValue', false)

const onSubmit = () => {
  if (!isFormValid.value) return
  emit('send', { emails: recipients.value, user_role: form.value.user_role })
}
</script>

<style scoped>
/* The "nothing to pick" line inside the role menu. Larger than a field hint
   because it stands in for a list item, not for helper text under a control. */
.inv-no-option {
  font-size: 13px;
  color: var(--dash-ink-3);
}

/* Mode switch — the dashboard's segmented control (DashboardPage's
   .view-toggle) at dialog density: 30px rather than 34, since it selects a mode
   rather than holding a value and should not read as heavily as the fields
   under it. */
.inv-mode {
  background: var(--dash-n-100);
  border: 1px solid var(--dash-line);
  padding: 3px;
  border-radius: var(--dash-r-md);
  display: flex;
  gap: 2px;
}

.inv-mode :deep(.q-btn) {
  border-radius: var(--dash-r-sm) !important;
  min-height: unset;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  box-shadow: none;
  transition:
    background-color var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease),
    box-shadow var(--dash-fast) var(--dash-ease);
}

/* Quasar draws a focus/ripple helper via ::before; neutralise its shadow so the
   pills stay flat against the track. */
.inv-mode :deep(.q-btn::before) {
  box-shadow: none;
}

.inv-mode :deep(.q-btn.bg-primary) {
  background: var(--dash-surface) !important;
  color: var(--dash-ink) !important;
  font-weight: 600;
  box-shadow: var(--dash-shadow-xs) !important;
}

.inv-mode :deep(.q-btn.bg-white) {
  background: transparent !important;
  color: var(--dash-ink-3) !important;
}
.inv-mode :deep(.q-btn.bg-white:hover) {
  color: var(--dash-ink-2) !important;
}

.inv-mode :deep(.q-btn:focus-visible) {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring) !important;
}

/* The bulk box reads as a list, so its lines are set further apart than a
   paragraph field's.

   It holds four addresses at rest and grows a line at a time from there
   (`autogrow`), rather than standing at a fixed six-row height: a fixed box is
   both empty space on a two-address send and a scroll on a twenty-address one.
   The floor is four lines because the placeholder shows three — a box that
   grew from one line would jump as soon as it was typed into. There is no
   ceiling; the dialog body scrolls, and its own 84vh cap is what keeps a long
   list inside the screen. */
.inv-bulk__area :deep(.q-field__native) {
  font-size: 12.5px;
  line-height: 1.6;
  min-height: 80px; /* 4 × 20px line */
}

/* Parse report — sits under the hint as part of the same field, so what the box
   was read as is attached to the box rather than floating in the form. */
.inv-parse {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 2px;
}

.inv-parse__line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 11.5px;
  color: var(--dash-ink-3);
}
.inv-parse__line strong {
  color: var(--dash-ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.inv-parse__ok {
  color: var(--dash-good-mark);
  flex-shrink: 0;
}
.inv-parse__idle {
  color: var(--dash-ink-4);
  flex-shrink: 0;
}

/* A soft tint rather than a saturated outline: this block appears while someone
   is still typing, and a hard red edge reads as a failure rather than as an
   entry still to finish. */
.inv-parse__bad {
  padding: 8px 10px;
  border-radius: var(--dash-r-md);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
}
.inv-parse__bad-head {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--dash-critical);
}
.inv-parse__bad-list {
  margin: 5px 0 0;
  padding-left: 16px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--dash-critical);
}
.inv-parse__bad-list li {
  word-break: break-all;
}
</style>
