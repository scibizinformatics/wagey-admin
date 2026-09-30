<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card v-if="confirm" class="dash-modal dash-modal--confirm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span :class="['dash-modal__head-icon', `dash-modal__head-icon--${confirm.tone}`]">
            <q-icon :name="confirm.icon" size="20px" />
          </span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ confirm.title }}</div>
            <div class="dash-modal__sub">{{ confirm.sub }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="dash-modal__body">
        <!-- The sentence names who and what changes, in the shape
             `EmployeeTerminateDialog` established: a bolded subject, then the
             verb. -->
        <div class="dash-modal__confirm-text">
          <strong>{{ confirm.name }}</strong> {{ confirm.sentence }}
        </div>

        <!-- The facts the decision is actually about. Without them the dialog
             only says "approve?" over a row the approver may have scrolled past
             half a page earlier. -->
        <div v-if="confirm.facts.length" class="dash-modal__rows">
          <div v-for="fact in confirm.facts" :key="fact.label" class="dash-modal__row">
            <span class="dash-modal__label">{{ fact.label }}</span>
            <span class="dash-modal__value">{{ fact.value }}</span>
          </div>
        </div>

        <div class="dash-modal__note">{{ confirm.note }}</div>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Cancel"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <!-- The one solid button, last. `loading` is also what stops a second
             click: `persistent` leaves Cancel as the only other way out, so an
             unguarded pair here would be a double submit. -->
        <q-btn
          unelevated
          no-caps
          :label="confirm.actionLabel"
          :class="confirm.buttonClass"
          :loading="loading"
          @click="$emit('confirm')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The last gate in front of one request decision, or one batch of them.
 *
 * The four queues all write on a single click, from a row menu and from inside
 * the detail dialogs, and none of them can be taken back from this screen — so
 * the click that was meant for "open" must not also be the click that pays the
 * employee. This is the `dash-modal--confirm` variant the Employees and Schedule
 * pages already use for their own single-row destructive actions, with no slots:
 * every word in it comes from `decisionConfirm.js`, which is what keeps the
 * table, this dialog and the toast that follows from telling different stories.
 *
 * It serves three actions — one decision, a batch, and dropping a rejection
 * recommendation — and they differ only in content. A batch's subject is a count
 * rather than a person, which is why the head reads `sub`: there the subline
 * carries the number of *people* behind the requests, where for a single row it
 * repeats the name the body leads with.
 *
 * There is deliberately no close button in the head. Cancel is the only exit, so
 * a stray Enter, Escape or backdrop click cannot dismiss a decision the approver
 * has not actually made — `boot/dialogA11y` is what keeps the backdrop from
 * stealing focus while the shake still reads.
 */
defineProps({
  modelValue: Boolean,
  // The object `buildDecisionConfirm` returns. Null while nothing is selected.
  confirm: { type: Object, default: null },
  loading: Boolean,
})

defineEmits(['update:modelValue', 'confirm'])
</script>
