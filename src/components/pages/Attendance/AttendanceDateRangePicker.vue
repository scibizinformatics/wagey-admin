<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent position="top">
    <q-card style="min-width: 350px" class="q-pa-md">
      <q-card-section class="row items-center">
        <div class="text-h6">Select Date Range</div>
        <q-space />
        <q-btn icon="fas fa-times" flat round dense v-close-popup />
      </q-card-section>
      <q-card-section>
        <q-date
          v-model="dateRange"
          range
          mask="YYYY-MM-DD"
          :locale="dateLocale"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          color="indigo"
          label="Apply"
          @click="$emit('apply', dateRange)"
          :disable="!dateRange || !dateRange.from || !dateRange.to"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  initialRange: { type: Object, default: () => ({ from: '', to: '' }) },
  dateLocale: { type: Object, default: () => ({}) },
});

defineEmits(['update:modelValue', 'apply']);

const dateRange = ref({ from: '', to: '' });

watch(() => props.modelValue, (val) => {
  if (val) {
    dateRange.value = props.initialRange?.from
      ? { ...props.initialRange }
      : { from: '', to: '' };
  }
});
</script>
