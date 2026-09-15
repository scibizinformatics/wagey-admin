<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--xs inv-sent">
      <q-card-section class="dash-modal__body dash-modal__body--center inv-sent__body">
        <span class="dash-featured-icon dash-featured-icon--good inv-sent__icon">
          <q-icon name="o_mark_email_read" size="20px" />
        </span>

        <h2 class="inv-sent__title">
          {{ isBatch ? `${emails.length} invitations sent` : 'Invitation sent' }}
        </h2>

        <p v-if="!isBatch" class="inv-sent__text">
          <strong>{{ emails[0] }}</strong> has been emailed a join code. It appears in the list as
          pending until they sign up with it.
        </p>
        <p v-else class="inv-sent__text">
          Each address has been emailed its own join code. They appear in the list as pending until
          they sign up.
        </p>

        <!-- The addresses themselves, on a batch. A count alone leaves the one
             question a person has after a bulk send — was so-and-so on it —
             answerable only by going back to the table and searching. -->
        <ul v-if="isBatch" class="inv-sent__list">
          <li v-for="email in emails" :key="email">{{ email }}</li>
        </ul>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          :label="isBatch ? 'Invite more' : 'Invite another'"
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
 * Confirmation after a send, of one invitation or a batch. This is the one
 * dialog in the app with no navy header — a success note is not a workspace,
 * and the brand bar made a two-line acknowledgement look like another form.
 * Everything else (card, footer, button pair) is the shared `dash-modal`
 * chrome. "Done" is the filled button; inviting more is the side path, not an
 * equal one, which is what the two matching navy buttons implied before.
 */
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** The addresses that were actually sent to, in the order they were entered. */
  emails: { type: Array, default: () => [] },
})

defineEmits(['update:modelValue', 'send-another'])

const isBatch = computed(() => props.emails.length > 1)
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

/* Left-aligned inside a centred body: a column of addresses is a list to scan,
   and centred lines give it a ragged edge on both sides. */
.inv-sent__list {
  width: 100%;
  margin: 12px 0 0;
  padding: 8px 10px;
  list-style: none;
  text-align: left;
  border-radius: var(--dash-r-md);
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line);
  font-size: 12px;
  line-height: 1.65;
  color: var(--dash-ink-2);
}
.inv-sent__list li {
  word-break: break-all;
}
</style>
