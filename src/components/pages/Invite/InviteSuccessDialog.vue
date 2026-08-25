<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="inv-sent">
      <q-card-section class="inv-sent__body">
        <span class="dash-featured-icon dash-featured-icon--good inv-sent__icon">
          <q-icon name="o_mark_email_read" size="20px" />
        </span>

        <h2 class="inv-sent__title">Invitation sent</h2>
        <p class="inv-sent__text">
          <strong>{{ sentToEmail }}</strong> has been emailed a join code. It appears in the list as
          pending until they sign up with it.
        </p>
      </q-card-section>

      <q-card-actions class="inv-sent__foot">
        <q-btn
          flat
          no-caps
          label="Invite another"
          class="inv-sent__secondary"
          @click="$emit('send-another')"
        />
        <q-btn
          unelevated
          no-caps
          label="Done"
          class="inv-sent__primary"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Confirmation after a send. No brand bar here — a success note is not a
 * workspace, and the navy header made a two-line acknowledgement look like
 * another form. "Done" is the filled button; inviting another is the side path,
 * not an equal one, which is what the two matching navy buttons implied before.
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  sentToEmail: { type: String, default: '' },
})

defineEmits(['update:modelValue', 'send-another'])
</script>

<style scoped>
.inv-sent {
  width: 380px;
  max-width: 95vw;
  border-radius: var(--dash-r-lg);
  overflow: hidden;
}

.inv-sent__body {
  padding: 22px 20px 18px;
  text-align: center;
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

.inv-sent__foot :deep(.q-btn + .q-btn) {
  /* Quasar spaces sibling buttons itself; the footer's own flex gap is the only
     spacing this footer wants. */
  margin-left: 0;
}

.inv-sent__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  background: var(--dash-n-25);
  border-top: 1px solid var(--dash-line);
}

.inv-sent__secondary {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-2);
  font-size: 13px;
  font-weight: 500;
}
.inv-sent__secondary:hover {
  background: var(--dash-n-100);
}

.inv-sent__primary {
  height: 36px;
  padding: 0 18px;
  border-radius: var(--dash-r-md);
  background: var(--dash-brand);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
}
.inv-sent__primary:hover {
  background: #193d5c;
}

@media (max-width: 599px) {
  .inv-sent__foot {
    flex-direction: column-reverse;
  }
  .inv-sent__foot .q-btn {
    width: 100%;
    margin: 0;
  }
}
</style>
