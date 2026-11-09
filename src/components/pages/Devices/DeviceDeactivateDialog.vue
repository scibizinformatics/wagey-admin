<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--confirm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon dash-modal__head-icon--danger">
            <q-icon name="o_mobile_off" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Deactivate this device?</div>
            <div v-if="device" class="dash-modal__sub">
              {{ device.deviceName || 'Unnamed device' }}
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="dash-modal__confirm-text">
          <strong>{{ device?.deviceName || 'This device' }}</strong> stops being recognised. The
          employee signs in to the app on it again to use it, and the registration this decision
          replaces needs a new sign-in either way.
        </div>

        <!-- The reason is the gate's own input, and this is a bespoke dialog
             rather than ConfirmDialog because of it: ConfirmCard is deliberately
             slotless, and a decision that must collect something cannot be said
             entirely by the confirm object (the PayslipRejectDialog precedent).
             Everything else is the shared chrome — the same head tile, confirm
             text and Cancel + solid foot. -->
        <label class="dash-modal__field dv-reason">
          <span class="dash-modal__field-label"
            >Reason for deactivation<span class="dash-modal__req">*</span></span
          >
          <q-select
            v-model="reason"
            :options="DEACTIVATE_REASONS"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            dense
            outlined
            hide-bottom-space
            placeholder="Why this device is being switched off"
            popup-content-class="dash-popup dash-popup--modal"
            class="dv-reason__select dash-field"
            :disable="loading"
          >
            <template v-slot:prepend>
              <q-icon name="o_help_outline" size="16px" />
            </template>
          </q-select>
          <span v-if="touched && !reason" class="dash-modal__field-hint">
            Choose a reason — the device is stamped with it, and this page cannot edit it
            afterwards.
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
          label="Deactivate device"
          class="dash-modal__danger"
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
 * The gate in front of deactivating a device.
 *
 * The write lives in the page's `commitDeactivate`, reachable only from the
 * `confirm` this dialog emits — the implementation is captured in this
 * component and handed over with the reason, so the button's `:loading` covers
 * the write and a second click cannot land.
 *
 * `loading` is the page's `deactivating` flag rather than a fresh ref: the
 * dialog stays open (it is `persistent`) so the write is visible even if this
 * dialog closes itself.
 */
import { computed, ref, watch } from 'vue'
import { DEACTIVATE_REASONS } from 'src/composables/utils/devices'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The device being deactivated, snapshotted by the page when it opened. */
  device: { type: Object, default: null },
  /** The page's own in-flight state, so the button cannot be pressed twice. */
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const reason = ref('')
// The hint is earned rather than shown from the start: opening a dialog with an
// error already printed reads as scolding.
const touched = ref(false)

const canSubmit = computed(() => reason.value !== '' && !props.loading)

function submit() {
  touched.value = true
  if (!canSubmit.value) return
  // Hands the trimmed token over; the page owns what happens next — including
  // closing this dialog. Emitting a close here too would rob the button of its
  // loading state: the write runs behind an already-dismissed dialog.
  emit('confirm', reason.value)
}

// Cleared on open rather than on close, so a reason half-chosen in an abandoned
// dialog cannot be resubmitted against the next device by muscle memory.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      reason.value = ''
      touched.value = false
    }
  },
)
</script>

<style scoped>
/* Sits under the sentence with the body's own rhythm — the reason is the point
   of this dialog, so it needs air rather than butting up against the text. */
.dv-reason {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
}
</style>
