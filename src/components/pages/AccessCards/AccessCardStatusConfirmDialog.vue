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
        <!-- The sentence names what changes and what a reader will do about it,
             in the shape `EmployeeTerminateDialog` established: a bolded subject,
             then the verb. -->
        <div class="dash-modal__confirm-text">
          <strong>{{ confirm.name }}</strong> {{ confirm.sentence }}
        </div>

        <!-- Both ends of the change, so nobody has to remember which state the
             row was in before they clicked. `Status now` is the row's own
             wording, which is the server's where this app has one. -->
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
             unguarded pair here would revoke the same card twice. -->
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
 * The last gate in front of one card's status changing.
 *
 * Four verbs reach it — reactivate, deactivate, mark lost, revoke — from the row
 * menu and from the detail dialog, and none of them is taken back by a reader
 * finding they picked the wrong word. This is the same `dash-modal--confirm`
 * shape `RequestDecisionConfirmDialog` and the Employees/Schedule confirms use,
 * with no slots: every word in it comes from `statusConfirm.js`, which is what
 * keeps the row, this dialog and the toast that follows telling one story.
 *
 * It is a component rather than a `$q.dialog` for the reason the whole codebase
 * is: an HTML string cannot render the `--good` / `--warn` / `--danger` head icon
 * per verb, and the tone is the whole point of asking.
 *
 * There is deliberately no close button in the head. Cancel is the only exit, so
 * a stray Enter, Escape or backdrop click cannot switch off a card nobody meant
 * to — `boot/dialogA11y` is what keeps the backdrop from stealing focus while
 * the shake still reads.
 */
defineProps({
  modelValue: Boolean,
  // The object `buildStatusConfirm` returns. Null while nothing is pending.
  confirm: { type: Object, default: null },
  loading: Boolean,
})

defineEmits(['update:modelValue', 'confirm'])
</script>