<template>
  <q-card class="dash-modal dash-modal--confirm">
    <q-card-section class="dash-modal__head">
      <div class="dash-modal__head-main">
        <span :class="['dash-modal__head-icon', `dash-modal__head-icon--${confirm.tone}`]">
          <q-icon :name="confirm.icon" size="20px" />
        </span>
        <div class="dash-modal__head-titles">
          <div class="dash-modal__title">{{ confirm.title }}</div>
          <div v-if="confirm.sub" class="dash-modal__sub">{{ confirm.sub }}</div>
        </div>
      </div>
    </q-card-section>

    <q-card-section class="dash-modal__body">
      <!-- A bolded subject, then the verb — the shape EmployeeTerminateDialog
           established. A notice has no subject to bold and says so here by
           leaving `name` empty, which is why both halves are optional. -->
      <div v-if="confirm.name || confirm.sentence" class="dash-modal__confirm-text">
        <strong v-if="confirm.name">{{ confirm.name }}</strong>
        {{ confirm.sentence }}
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

      <div v-if="confirm.note" class="dash-modal__note">{{ confirm.note }}</div>
    </q-card-section>

    <q-card-actions class="dash-modal__foot">
      <!-- Cancel is the only exit from a decision. An alert has no decision to
           back out of, so it sets `cancelable: false` and gets one button. -->
      <q-btn
        v-if="cancelable"
        flat
        no-caps
        label="Cancel"
        class="dash-modal__cancel"
        @click="emit('cancel')"
      />
      <!-- The one solid button, last. The loading state is also what stops a
           second click: `persistent` leaves Cancel as the only other way out,
           so an unguarded pair here would write the same thing twice. -->
      <q-btn
        unelevated
        no-caps
        :label="confirm.actionLabel"
        :class="confirm.buttonClass"
        :loading="loading || busy"
        @click="onAction"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
/**
 * The confirm chrome, with no dialog of its own — deliberately.
 *
 * It renders the `q-card` that `EmployeeTerminateDialog` established and
 * `ConfirmDialog.vue` already wrapped, extracted so there is exactly ONE copy of
 * it in the app. Two hosts use this card:
 *
 *   1. `ConfirmDialog.vue`, which puts it inside a `q-dialog` and owns the action.
 *      That is for the flows that hold a `confirm` ref and recompute their facts
 *      from live reactive state — Requests, Access Cards, Funding, Disburse.
 *   2. `openConfirm()` in `composables/utils/confirmAction.js`, which hands it to
 *      `$q.dialog({ component })`. That is how a plain JS composable — fourteen of
 *      the admin settings composables have no template at all — can ask a question
 *      in the app's own chrome instead of Quasar's default one.
 *
 * The imperative host is why this emits `ok` / `cancel` rather than `confirm`:
 * those are the two event names Quasar's Dialog plugin listens for on a component,
 * and they are what make `openConfirm(...).onOk()` resolve. `ConfirmDialog` maps
 * `ok` onto its own public `confirm` event, so its callers are unaffected.
 *
 * `action` is optional and is what preserves the loading guard. `$q.dialog`
 * closes as soon as `ok` is emitted, which would leave the write running behind a
 * closed dialog and let a second click through. When `action` is supplied the
 * button awaits it and only then emits, so a failure keeps the dialog open and
 * the caller can report it.
 *
 * The caller owns `confirm` and is expected to snapshot whatever the action
 * writes, so the dialog describes the decision that was asked about rather than
 * re-reading live state that may have moved underneath it.
 */
import { computed, ref } from 'vue'

const props = defineProps({
  /** The object a `build*Confirm` helper returns. */
  confirm: { type: Object, required: true },
  /** The host's own in-flight state, for host 1. */
  loading: { type: Boolean, default: false },
  /** An async function to run before `ok` is emitted, for host 2. */
  action: { type: Function, default: null },
})

const emit = defineEmits(['ok', 'cancel'])

/** Whether this dialog can be backed out of. Defaults to yes. */
const cancelable = computed(() => props.confirm?.cancelable !== false)

/** Set only while this card is running `action` itself. */
const busy = ref(false)

async function onAction() {
  if (busy.value) return
  // No `action` means the host runs the write and listens for `ok`, exactly as
  // ConfirmDialog's callers always have.
  if (!props.action) {
    emit('ok')
    return
  }

  busy.value = true
  try {
    await props.action()
    emit('ok')
  } catch (error) {
    // Deliberately swallowed here so the dialog stays open. The action's own
    // error handling has already reported it; re-throwing here would surface it
    // a second time, and letting `ok` through would claim a write that failed.
    console.error('[confirm] action failed; dialog left open', error)
  } finally {
    busy.value = false
  }
}
</script>
