<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card style="min-width: 400px">
      <q-card-section class="row items-center">
        <div class="text-h6">Employee Photo</div>
        <q-space />
        <q-btn icon="fas fa-times" flat round dense v-close-popup />
      </q-card-section>
      <q-card-section class="text-center">
        <q-img
          :src="imageUrl"
          spinner-color="indigo"
          style="max-height: 70vh; max-width: 100%"
          fit="contain"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
});

defineEmits(['update:modelValue']);
</script>
