<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="ann-del">
      <q-card-section class="ann-del__body">
        <span class="ann-del__icon">
          <q-icon name="o_delete" size="20px" />
        </span>

        <h2 class="ann-del__title">Delete this announcement?</h2>
        <p class="ann-del__text">
          <strong>{{ announcementTitle || 'This announcement' }}</strong> will be removed for
          everyone. There is no undo.
        </p>
      </q-card-section>

      <q-card-actions class="ann-del__foot">
        <q-btn
          flat
          no-caps
          label="Keep it"
          class="ann-del__cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          label="Delete"
          class="ann-del__confirm"
          :loading="deleting"
          @click="$emit('confirm')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * Delete confirmation. The old version wore the brand navy header with an amber
 * warning tile and a #6b7280 subtitle that was unreadable on it — and its
 * confirm button was Quasar's stock `negative`, a different red from every other
 * destructive control in the app. This uses the design system's critical tone
 * throughout, and the destructive verb sits on the filled button while the safe
 * choice stays quiet.
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  announcementTitle: { type: String, default: '' },
  deleting: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirm'])
</script>

<style scoped>
.ann-del {
  width: 380px;
  max-width: 95vw;
  border-radius: var(--dash-r-lg);
  overflow: hidden;
}

.ann-del__body {
  padding: 22px 20px 18px;
  text-align: center;
}

.ann-del__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  border-radius: var(--dash-r-lg);
  background: var(--dash-critical-bg);
  border: 1px solid var(--dash-critical-line);
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

.ann-del__foot :deep(.q-btn + .q-btn) {
  /* Quasar spaces sibling buttons itself; the footer's own flex gap is the only
     spacing this wants. */
  margin-left: 0;
}
.ann-del__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  background: var(--dash-n-25);
  border-top: 1px solid var(--dash-line);
}

.ann-del__cancel {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-2);
  font-size: 13px;
  font-weight: 500;
}
.ann-del__cancel:hover {
  background: var(--dash-n-100);
}

.ann-del__confirm {
  height: 36px;
  padding: 0 18px;
  border-radius: var(--dash-r-md);
  background: var(--dash-critical);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
}
.ann-del__confirm:hover {
  background: #912018;
}

@media (max-width: 599px) {
  .ann-del__foot {
    flex-direction: column-reverse;
  }
  .ann-del__foot .q-btn {
    width: 100%;
    margin: 0;
  }
}
</style>
