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
        <!-- The sentence names what is about to be acted on and what that does,
             in the shape `EmployeeTerminateDialog` established: a bolded subject,
             then the verb. -->
        <div class="dash-modal__confirm-text">
          <strong>{{ confirm.name }}</strong> {{ confirm.sentence }}
        </div>

        <!-- The facts the decision is actually about. Without them the dialog
             only says "go ahead?" over numbers the reader may have scrolled past
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
             unguarded pair here would write the same thing twice. -->
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
 * The last gate in front of an action that cannot be taken back from this screen.
 *
 * There is no slot and no branch in here on purpose: every word comes from the
 * `confirm` object a caller builds, so the dialog and the wording cannot drift
 * apart and a feature cannot invent a second copy of this chrome. The shape is
 * the one `RequestDecisionConfirmDialog` and `AccessCardStatusConfirmDialog`
 * already established — a bolded subject, then facts, then a note — and both of
 * those can be pointed at this component without changing what they render.
 *
 * It is a component rather than a `$q.dialog` for the reason the whole codebase
 * is: an HTML string cannot render the `--good` / `--warn` / `--danger` head icon
 * per verb, and the tone is usually the whole point of asking.
 *
 * There is deliberately no close button in the head. Cancel is the only exit, so
 * a stray Enter, Escape or backdrop click cannot commit something the reader did
 * not actually decide on — `boot/dialogA11y` is what keeps the backdrop from
 * stealing focus while the shake still reads.
 *
 * The caller owns `confirm` and is expected to snapshot whatever the action
 * writes, so the dialog describes the decision that was asked about rather than
 * re-reading live state that may have moved underneath it.
 */
defineProps({
  modelValue: Boolean,
  // The object a `build*Confirm` helper returns. Null while nothing is pending.
  confirm: { type: Object, default: null },
  loading: Boolean,
})

defineEmits(['update:modelValue', 'confirm'])
</script>