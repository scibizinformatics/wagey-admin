<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card class="confirm-dialog">
      <q-card-section class="confirm-header confirm-header-danger">
        <q-avatar size="44px" class="confirm-icon-wrap confirm-icon-danger">
          <q-icon name="block" size="22px" />
        </q-avatar>
        <div class="confirm-title">Terminate employee?</div>
      </q-card-section>
      <q-card-section class="confirm-content">
        <strong>{{ fullName }}</strong> will be marked as Terminated and lose system access. This can be reversed.
      </q-card-section>
      <q-card-actions align="right" class="confirm-actions">
        <q-btn flat label="Cancel" class="cancel-btn" @click="$emit('update:modelValue', false)" />
        <q-btn unelevated label="Terminate" color="negative" @click="$emit('confirm')" :loading="loading" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employee: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})



const fullName = computed(() => {
  if (!props.employee) return 'N/A'
  return `${props.employee.user?.first_name || ''} ${props.employee.user?.last_name || ''}`.trim() || props.employee.user?.username || 'N/A'
})
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

.confirm-header-danger {
  background: #2563eb !important;
}

.confirm-icon-wrap {
  border-radius: 10px !important;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2) !important;
}

.confirm-icon-danger {
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

@media (max-width: 768px) {
  .confirm-dialog {
    max-width: calc(100vw - 20px);
  }
}
</style>
