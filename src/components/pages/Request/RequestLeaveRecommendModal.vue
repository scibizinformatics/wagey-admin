<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <q-icon
            name="o_flag"
            size="20px"
            class="dash-modal__head-icon dash-modal__head-icon--warn"
          />
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Recommend rejection</div>
            <div class="dash-modal__sub">{{ request?.employeeName || '' }}</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          dense
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <div class="dash-modal__stack">
          <!--
            The request restated, because the one thing a note attached to the
            wrong row is worse than no note at all. Compact: type, span and
            accrued value are the three facts that decide whether a rejection is
            even arguable, and all three are already on the row behind this.
          -->
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Request</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Type:</span>
                <span class="dash-modal__value">
                  <div class="type-badge">{{ request?.type || '—' }}</div>
                </span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Period:</span>
                <span class="dash-modal__value">
                  {{ longLabel(request?.startDate) }} &rarr; {{ longLabel(request?.endDate) }}
                </span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Duration:</span>
                <span class="dash-modal__value">{{ request?.duration || '—' }}</span>
              </div>
            </div>
          </div>

          <div v-if="request?.reason" class="dash-modal__section">
            <div class="dash-modal__section-title">Reason given</div>
            <div class="dash-modal__note">{{ request.reason }}</div>
          </div>

          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Reason for rejecting</div>
            <div class="dash-modal__grid">
              <label class="dash-modal__field">
                <span class="dash-modal__field-label">Note</span>
                <q-input
                  v-model="note"
                  outlined
                  type="textarea"
                  rows="3"
                  class="dash-field dash-modal__span-2"
                  dense
                  hide-bottom-space
                />
                <span class="dash-modal__field-hint">
                  Optional. This is a recommendation, not a rejection — the request stays pending
                  and can still be approved.
                </span>
              </label>
            </div>
          </div>
        </div>
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
          label="Recommend rejection"
          class="dash-modal__submit"
          :loading="submitting"
          @click="$emit('submit', note)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Captures a rejection recommendation for one leave request.
 *
 * `PATCH /attendance/leave-recommendation/{id}/` takes an
 * `is_recommended_for_rejection` flag and a `rejection_recommendation_note`, so
 * this is a dialog only because of the second field — a recommendation is a
 * piece of advice somebody else has to act on, and advice with no reason behind
 * it is not actionable. The note stays optional (an empty one is submitted as
 * `''`) because the endpoint treats it as optional too.
 *
 * Modelled on `RequestCaApprovalModal`, which is the same shape for the
 * cash-advance queue: restate the request, collect the decision's free text,
 * hand it to the page. The page owns the request, not this dialog.
 */
import { ref, watch } from 'vue'
import { longLabel } from 'src/composables/utils/calendarDate'

const props = defineProps({
  modelValue: Boolean,
  request: Object,
  submitting: Boolean,
})

defineEmits(['update:modelValue', 'submit'])

const note = ref('')

/**
 * Opened empty, every time.
 *
 * The dialog is reused for each request in turn and nothing cleared the note
 * between visits, so recommending a second request carried the first one's
 * reason with it — a silent misattribution, and the worst kind of error here
 * because the note is read as the reviewer's own words.
 */
watch(
  () => props.modelValue,
  (open) => {
    if (open) note.value = ''
  },
)
</script>

<style scoped src="./requestModal.css"></style>
