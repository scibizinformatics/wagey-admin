<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="dash-modal dash-modal--md">
      <q-card-section class="dash-modal__head">
        <div class="dash-modal__head-main">
          <span class="dash-modal__head-icon"><q-icon name="photo_camera" size="20px" /></span>
          <div class="dash-modal__head-titles">
            <div class="dash-modal__title">{{ title }}</div>
            <div class="dash-modal__sub">{{ subtitle }}</div>
          </div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <!-- The image supplies its own edge, so the body drops its padding and
           the picture sits on the sunken ground rather than on white. -->
      <q-card-section class="dash-modal__body dash-modal__body--sunken selfie-body">
        <img :src="imageUrl" :alt="imageAlt" class="selfie-image" />
      </q-card-section>

      <q-card-actions class="dash-modal__foot">
        <q-btn
          flat
          no-caps
          label="Close"
          class="dash-modal__cancel"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
/**
 * The image lightbox for a punch selfie.
 *
 * `subtitle` and `imageAlt` exist because the Payslips step reuses this for a
 * dispute attachment, which is the same shape of thing — one image, opened from a
 * thumbnail in a table — but whose wording is not about a punch. Both default to
 * the selfie copy so the attendance call sites are unchanged.
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  title: { type: String, default: 'Selfie' },
  subtitle: { type: String, default: 'Captured with the punch' },
  imageAlt: { type: String, default: 'Selfie taken at the punch' },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.selfie-body {
  display: grid;
  place-items: center;
  padding: 16px;
}

.selfie-image {
  max-width: 100%;
  max-height: 62vh;
  border-radius: var(--dash-r-md);
  border: 1px solid var(--dash-line);
  background: var(--dash-surface);
  object-fit: contain;
}
</style>
