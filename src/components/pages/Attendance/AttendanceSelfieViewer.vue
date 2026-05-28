<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="selfie-dialog-card">
      <q-card-section class="selfie-dialog-header">
        <div class="dialog-title">{{ title }}</div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" class="close-btn" />
      </q-card-section>
      <q-card-section class="selfie-dialog-body">
        <img :src="imageUrl" alt="Selfie" class="selfie-full-image" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  title: { type: String, default: 'Selfie' },
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.selfie-dialog-card {
  width: 100%;
  max-width: 600px;
  border-radius: 12px;
}
.selfie-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}
.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
  line-height: 1.3;
}
.selfie-dialog-body {
  padding: 16px;
}
.selfie-full-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  max-height: 70vh;
  object-fit: contain;
}
.close-btn {
  color: #64748b;
}
</style>
