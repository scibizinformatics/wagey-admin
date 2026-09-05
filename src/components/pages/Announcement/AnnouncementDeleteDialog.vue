<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="dash-modal dash-modal--xs ann-del">
      <q-card-section class="dash-modal__body dash-modal__body--center ann-del__body">
        <span class="dash-featured-icon ann-del__icon">
          <q-icon name="o_delete" size="20px" />
        </span>

        <h2 class="ann-del__title">Delete this announcement?</h2>
        <p class="ann-del__text">
          <strong>{{ announcementTitle || 'This announcement' }}</strong> will be removed for
          everyone. There is no undo.
        </p>
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Keep it"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          label="Delete"
          class="dash-modal__danger"
          :loading="deleting"
          @click="$emit('confirm')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Delete confirmation. Like the invite success note it carries no navy header —
 * the icon, the question and the sentence under it are the whole dialog, and a
 * brand bar over three lines of text reads as a form that lost its fields. The
 * card, footer and button pair are the shared `dash-modal` chrome, so the
 * destructive button here is the same red as every other one in the app rather
 * than Quasar's stock `negative`.
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  announcementTitle: { type: String, default: '' },
  deleting: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirm'])
</script>

<style scoped>
.ann-del__body {
  padding: 22px 20px 18px;
}

/* The featured icon in the critical tone: the design system ships `--good`, and
   a destructive confirmation is the other case that earns one. */
.ann-del__icon {
  margin-bottom: 12px;
  background: var(--dash-critical-bg);
  border-color: var(--dash-critical-line);
  color: var(--dash-critical);
  box-shadow: 0 0 0 4px rgba(180, 35, 24, 0.05);
}

.ann-del__title {
  margin: 0;
  font-size: 16.5px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--dash-ink);
}

.ann-del__text {
  margin: 6px auto 0;
  max-width: 38ch;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--dash-ink-3);
}
.ann-del__text strong {
  color: var(--dash-ink);
  font-weight: 600;
  word-break: break-word;
}
</style>
