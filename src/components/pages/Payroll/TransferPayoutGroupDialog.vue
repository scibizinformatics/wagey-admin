<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--confirm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon">
            <q-icon name="o_swap_horiz" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Transfer to another payout group?</div>
            <div v-if="employee" class="dash-modal__sub">{{ employee }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="dash-modal__confirm-text">
          <strong>{{ employee || 'This employee' }}</strong> moves to the payout group picked below
          and this run no longer includes them.
          <template v-if="cutoff">
            Their payslip stays on <strong>{{ cutoff }}</strong
            >.
          </template>
        </div>

        <!-- The target is the gate's own input, and this is a bespoke dialog
             rather than ConfirmDialog because of it: ConfirmCard is deliberately
             slotless, and a decision that must collect something cannot be said
             entirely by the confirm object (the PayslipRejectDialog precedent).
             Everything else is the shared chrome — the same head tile, confirm
             text and Cancel + solid foot. -->
        <label v-if="groupsLoading" class="dash-modal__field trf-loading">
          <span class="dash-modal__field-label"
            >Payout group<span class="dash-modal__req">*</span></span
          >
          <div class="trf-loading__row">
            <q-spinner size="18px" />
            <span class="trf-loading__text">Reading the payout groups in this cutoff…</span>
          </div>
        </label>

        <label v-else class="dash-modal__field trf-target">
          <span class="dash-modal__field-label"
            >Payout group<span class="dash-modal__req">*</span></span
          >
          <q-select
            v-model="targetId"
            :options="groups"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            placeholder="Choose where this employee goes"
            popup-content-class="dash-popup dash-popup--modal"
            class="trf-target__select dash-field"
            :disable="loading"
            :aria-label="`Transfer ${employee || 'employee'} to payout group`"
          >
            <template v-slot:prepend>
              <q-icon name="o_groups" size="16px" />
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-italic">No payout group to pick</q-item-section>
              </q-item>
            </template>
          </q-select>
          <span v-if="touched && !targetId" class="dash-modal__field-hint">
            Choose a payout group — the employee cannot move without one.
          </span>
          <span v-else-if="!groups.length" class="dash-modal__field-hint">
            No other payout group is running in this cutoff, so there is nowhere to move this
            employee.
          </span>
        </label>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          label="Transfer employee"
          class="dash-modal__submit"
          :disable="!canSubmit"
          :loading="loading"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The gate in front of transferring an employee payroll item to another payout
 * group within the same cutoff.
 *
 * This is a bespoke dialog rather than `components/common/ConfirmDialog.vue`
 * because the transfer needs a *target* from the admin, and `ConfirmCard` is
 * deliberately slotless and branchless — every word in it comes from the confirm
 * object, which has nowhere to put an input. Rather than loosen that contract
 * for the other confirms, the field lives here.
 *
 * `groups` is built by the page that opened this dialog, and only ever holds
 * payroll groups already running in the same cutoff — the page resolves them
 * through `usePayoutGroupIdentity`'s siblings, so nothing offered here can move
 * an employee off the cutoff their payslip belongs to. The page also owns the
 * write: it lives in `commitTransfer`, reachable only from the `confirm` this
 * component emits, so the button's `:loading` covers it and a second click
 * cannot land.
 *
 * `loading` is the page's `transferring` flag rather than a fresh ref: the
 * dialog stays open (it is `persistent`) so the write is visible even if the
 * page closes it the moment it succeeds.
 */
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Whose payslip is moving, for the head's subtitle and the sentence. */
  employee: { type: String, default: '' },
  /** The cutoff both runs sit in, named in the sentence. Empty when unread. */
  cutoff: { type: String, default: '' },
  /** `{ id, name }` options — same cutoff only, current group already excluded. */
  groups: { type: Array, default: () => [] },
  /** The page is still resolving that list. */
  groupsLoading: { type: Boolean, default: false },
  /** The page's own in-flight state, so the button cannot be pressed twice. */
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const targetId = ref(null)
// The hint is earned rather than shown from the start: opening a dialog with an
// error already printed reads as scolding.
const touched = ref(false)

const canSubmit = computed(
  () => targetId.value != null && !props.loading && !props.groupsLoading && props.groups.length > 0,
)

function submit() {
  touched.value = true
  if (!canSubmit.value) return
  // Hands the id over; the page owns what happens next — including closing
  // this dialog. Emitting a close here too would rob the button of its
  // loading state: the write runs behind an already-dismissed dialog.
  emit('confirm', targetId.value)
}

// Cleared on open rather than on close, so a group half-chosen in an abandoned
// dialog cannot be resubmitted against the next employee by muscle memory.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      targetId.value = null
      touched.value = false
    }
  },
)
</script>

<style scoped>
/* Sits under the sentence with the body's own rhythm — the field is the point
   of this dialog, so it needs air rather than butting up against the text. */
.trf-target,
.trf-loading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
}

/* The read that fills the picker. Inline rather than blocking the select, so
   the dialog keeps its height and the reader sees why the field is not there
   yet rather than a blank where a control should be. */
.trf-loading__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: var(--dash-ink-3);
  font-size: 13px;
}
</style>
