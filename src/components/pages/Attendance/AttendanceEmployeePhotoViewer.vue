<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="dash-modal dash-modal--sm">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="account_circle" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">Employee photo</div>
          </div>
        </div>
        <!-- Was `fas fa-times`, a Font Awesome name. Only the two Material sets
             are loaded, so that icon rendered as an empty box. -->
        <q-btn flat round dense icon="close" aria-label="Close" v-close-popup />
      </q-card-section>

      <q-card-section class="dash-modal__body dash-modal__body--sunken photo-body">
        <q-img :src="imageUrl" fit="contain" class="photo-image" />
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn flat no-caps label="Close" class="dash-modal__cancel" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.photo-body {
  display: grid;
  place-items: center;
  padding: 16px;
}

.photo-image {
  max-height: 58vh;
  max-width: 100%;
  border-radius: var(--dash-r-md);
  border: 1px solid var(--dash-line);
  background: var(--dash-surface);
}
</style>
