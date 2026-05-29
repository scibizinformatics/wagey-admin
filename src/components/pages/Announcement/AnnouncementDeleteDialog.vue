<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="modal-card confirm-modal">
      <q-card-section class="modal-header">
        <div class="modal-title-section">
          <q-icon name="warning" class="modal-icon warning-icon" />
          <div>
            <div class="modal-title">Delete Announcement</div>
            <div class="modal-subtitle">This action cannot be undone</div>
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          class="modal-close-btn"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>
      <q-separator />
      <q-card-section class="modal-content">
        <p class="confirm-text">
          Are you sure you want to delete <strong>{{ announcementTitle }}</strong>?
        </p>
      </q-card-section>
      <q-separator />
      <q-card-section class="form-actions">
        <q-btn flat color="grey-7" label="Cancel" @click="$emit('update:modelValue', false)" />
        <q-btn color="negative" label="Delete" :loading="deleting" @click="$emit('confirm')" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  announcementTitle: { type: String, default: '' },
  deleting: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirm'])
</script>

<style scoped>
.modal-card {
  border-radius: 16px;
  overflow: hidden;
}

.confirm-modal {
  width: 420px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px !important;
  background: #fafafa;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-icon {
  font-size: 28px;
  padding: 8px;
  border-radius: 10px;
}

.warning-icon {
  color: #f59e0b;
  background: #fef3c7;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.modal-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.modal-close-btn {
  color: #9ca3af;
}

.modal-content {
  padding: 20px 24px !important;
  flex: 1;
  overflow-y: auto;
}

.confirm-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px !important;
  background: #fafafa;
}
</style>
