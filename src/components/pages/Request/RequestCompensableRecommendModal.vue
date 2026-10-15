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
            The application restated, because the one thing a note attached to
            the wrong row is worse than no note at all. Compact: the category, the
            subcategory filed under it, the span and the accrued value are the four
            facts that decide whether a rejection is even arguable, and all four
            are already on the row behind this.
          -->
          <div class="dash-modal__section">
            <div class="dash-modal__section-title">Application</div>
            <div class="dash-modal__rows">
              <div class="dash-modal__row">
                <span class="dash-modal__label">Category:</span>
                <span class="dash-modal__value">
                  <div class="type-badge">{{ request?.categoryName || '—' }}</div>
                </span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Subcategory:</span>
                <span class="dash-modal__value">{{ request?.subCategoryName || '—' }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Dates:</span>
                <span class="dash-modal__value">{{ request?.datesLabel || '—' }}</span>
              </div>
              <div class="dash-modal__row">
                <span class="dash-modal__label">Duration:</span>
                <span class="dash-modal__value">{{ request?.duration || '—' }}</span>
              </div>
            </div>
          </div>

          <div v-if="request?.notes" class="dash-modal__section">
            <div class="dash-modal__section-title">Notes given</div>
            <div class="dash-modal__note">{{ request.notes }}</div>
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
                  and can still be approved or rejected one at a time. A batch cannot: this queue's
                  bulk endpoint skips any application carrying a recommendation, so a flag has to be
                  removed before the application can be decided in a batch.
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
 * Captures a rejection recommendation for one compensable time application.
 *
 * `PATCH /compensable_time/applications/{id}/recommendation/` takes an id and a
 * `rejection_recommendation_note`, so this is a dialog only because of the second
 * field — a recommendation is a piece of advice somebody else has to act on, and
 * advice with no reason behind it is not actionable. The note stays optional (an
 * empty one is submitted as `''`) because the endpoint treats it as optional too.
 *
 * Modelled on `RequestLeaveRecommendModal`, which is the same dialog for the leave
 * queue. The two are not merged: they restate different fields, and merging them
 * would mean one component carrying four branchy fields it only fills in for one
 * of the two queues.
 *
 * The hint names this queue's one real consequence — a batch cannot action a
 * recommended application, because the bulk endpoint skips them — which is not
 * true of the leave queue, where the batch skips them but the single-approval
 * endpoint ignores the flag entirely.
 */
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  request: { type: Object, default: null },
  submitting: Boolean,
})

defineEmits(['update:modelValue', 'submit'])

const note = ref('')

/**
 * Opened empty, every time.
 *
 * The dialog is reused for each application in turn and nothing cleared the note
 * between visits, so recommending a second application would carry the first one's
 * reason with it — a silent misattribution, and the worst kind of error here,
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
