<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="confirm-dialog">
      <q-card-section class="confirm-header confirm-header-success">
        <q-avatar size="44px" class="confirm-icon-wrap confirm-icon-success">
          <q-icon name="check_circle" size="22px" />
        </q-avatar>
        <div class="confirm-title">Invitation Sent!</div>
      </q-card-section>
      <q-card-section class="confirm-content">
        The invitation has been successfully sent to <strong>{{ sentToEmail }}</strong>
      </q-card-section>
      <q-card-actions align="right" class="confirm-actions">
        <q-btn flat label="Close" class="cancel-btn" @click="$emit('update:modelValue', false)" />
        <q-btn label="Send Another" unelevated class="submit-btn" @click="$emit('send-another')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  sentToEmail: { type: String, default: '' },
})

defineEmits(['update:modelValue', 'send-another'])
</script>

<style scoped>
.confirm-dialog {
  width: 400px;
  max-width: 95vw;
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  overflow: hidden;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px 16px !important;
}

.confirm-header-success {
  background: #2563eb !important;
}

.confirm-icon-wrap {
  border-radius: 10px !important;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2) !important;
}

.confirm-icon-success {
  color: #ffffff !important;
}

.confirm-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.confirm-content {
  padding: 16px 20px !important;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;
  background: #f9fafb;
}

.confirm-content strong {
  color: #111827;
}

.confirm-actions {
  padding: 12px 16px !important;
  border-top: 1px solid #f1f3f5;
  gap: 8px;
  background: #f9fafb;
}

.cancel-btn {
  color: #6b7280;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  padding: 0 18px !important;
  min-height: 38px !important;
}
.cancel-btn:hover {
  background: #f1f5f9 !important;
}
.submit-btn {
  background: #2563eb !important;
  color: white;
  border-radius: 10px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  min-height: 38px !important;
  padding: 0 22px !important;
}
.submit-btn:hover {
  background: #1d4ed8 !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
}

@media (max-width: 768px) {
  .confirm-dialog {
    max-width: calc(100vw - 20px);
  }
}
</style>
