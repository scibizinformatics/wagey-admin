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
            <q-icon name="o_report" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Reject this dispute?</div>
            <div v-if="employee" class="dash-modal__sub">{{ employee }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="dash-modal__confirm-text">
          <strong>{{ employee || 'This dispute' }}</strong> is not upheld, and the employee is told
          the claim was rejected. Your reason is recorded against the dispute and cannot be edited
          afterwards.
        </div>

        <!-- The reason is required, not optional: rejecting tells an employee their
             complaint was declined and gives them nothing else to go on, so a bare
             "rejected" is not a usable outcome. -->
        <label class="dash-modal__field reject-reason">
          <span class="dash-modal__field-label"
            >Reason for rejection<span class="dash-modal__req">*</span></span
          >
          <q-input
            v-model="note"
            outlined
            dense
            type="textarea"
            rows="3"
            autofocus
            maxlength="500"
            counter
            placeholder="Why this dispute is not being upheld"
            class="dash-field"
            :disable="loading"
            @keydown.ctrl.enter.prevent="submit"
            @keydown.meta.enter.prevent="submit"
          />
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
          label="Reject dispute"
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
 * The gate in front of rejecting a payslip dispute.
 *
 * This is a bespoke dialog rather than `components/common/ConfirmDialog.vue`
 * because the reject decision needs a *reason* from the admin, and `ConfirmCard`
 * is deliberately slotless and branchless — every word in it comes from the
 * confirm object, which has nowhere to put an input. Rather than loosen that
 * contract for seventeen other confirms, the field lives here.
 *
 * Everything else is the shared chrome: the same `dash-modal dash-modal--confirm`
 * card, the same head tile / title / sub, the same `dash-modal__confirm-text`
 * body and the same Cancel + solid-action footer that
 * `ScheduleReassignConfirmDialog.vue` uses, so this reads as the same dialog as
 * the schedule's reassign warning rather than as a form that happens to confirm
 * something.
 *
 * The write lives in the page's `commitReject`, reachable only from here — the
 * reason is captured in this component and handed over in the event, so the
 * button's `:loading` covers the write and a second click cannot land.
 */
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Whose payslip is being decided, for the head's subtitle. */
  employee: { type: String, default: '' },
  /** The page's own in-flight state, so the button cannot be pressed twice. */
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const note = ref('')

const canSubmit = computed(() => note.value.trim().length > 0 && !props.loading)

// Cleared on open rather than on close, so a reason half-typed into an abandoned
// dialog cannot be resubmitted against the next one by muscle memory.
watch(
  () => props.modelValue,
  (open) => {
    if (open) note.value = ''
  },
)

/** Hands the trimmed reason over; the page owns what happens next. */
function submit() {
  if (!canSubmit.value) return
  emit('confirm', note.value.trim())
}
</script>

<style scoped>
/* Sits under the sentence with the body's own rhythm — the field is the point of
   this dialog, so it needs air rather than butting up against the warning. */
.reject-reason {
  margin-top: 16px;
}
</style>
