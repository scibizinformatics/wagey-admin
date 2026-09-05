<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--xs inv-sent">
      <q-card-section class="dash-modal__body dash-modal__body--center inv-sent__body">
        <span class="dash-featured-icon dash-featured-icon--good inv-sent__icon">
          <q-icon name="o_mark_email_read" size="20px" />
        </span>

        <h2 class="inv-sent__title">Invitation sent</h2>
        <p class="inv-sent__text">
          <strong>{{ sentToEmail }}</strong> has been emailed a join code. It appears in the list as
          pending until they sign up with it.
        </p>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Invite another"
          class="dash-modal__cancel"
          @click="$emit('send-another')"
        />
        <q-btn
          unelevated
          no-caps
          label="Done"
          class="dash-modal__submit"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Confirmation after a send. This is the one dialog in the app with no navy
 * header — a success note is not a workspace, and the brand bar made a two-line
 * acknowledgement look like another form. Everything else (card, footer, button
 * pair) is the shared `dash-modal` chrome. "Done" is the filled button; inviting
 * another is the side path, not an equal one, which is what the two matching
 * navy buttons implied before.
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  sentToEmail: { type: String, default: '' },
})

defineEmits(['update:modelValue', 'send-another'])
</script>

<style scoped>
.inv-sent__body {
  padding: 22px 20px 18px;
}

.inv-sent__icon {
  margin-bottom: 12px;
}

.inv-sent__title {
  margin: 0;
  font-size: 16.5px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--dash-ink);
}

.inv-sent__text {
  margin: 6px auto 0;
  max-width: 36ch;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--dash-ink-3);
}
.inv-sent__text strong {
  color: var(--dash-ink);
  font-weight: 600;
  word-break: break-word;
}
</style>
