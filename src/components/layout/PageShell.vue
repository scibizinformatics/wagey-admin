<template>
  <q-page :class="['page-shell', { 'full-height': fullHeight }]">
    <div
      :class="[
        'page-shell-container',
        { 'full-height': fullHeight, 'flex-column': flexColumn, fluid },
      ]"
    >
      <slot />
    </div>
  </q-page>
</template>

<script setup>
defineProps({
  fullHeight: { type: Boolean, default: false },
  flexColumn: { type: Boolean, default: false },
  // Drops the centred max-width cap. For data-dense pages whose wide tables
  // would otherwise be cut off inside the 1400/1600px column.
  fluid: { type: Boolean, default: false },
})
</script>

<style scoped>
.page-shell {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}
.page-shell.full-height {
  height: 100vh;
  overflow: hidden;
}
.page-shell-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}
.page-shell-container.full-height {
  height: 100vh;
}
.page-shell-container.flex-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

@media (min-width: 1440px) {
  .page-shell-container {
    max-width: 1600px;
  }
}

/* Declared last so it beats the width-capped rules above at every breakpoint. */
.page-shell-container.fluid {
  max-width: none;
}

@media (min-width: 1024px) and (max-width: 1439px) {
  .page-shell-container {
    padding: 16px;
  }
}

@media (max-width: 1024px) {
  .page-shell-container {
    padding: 14px;
  }
}

@media (max-width: 480px) {
  .page-shell-container {
    padding: 10px;
  }
}
</style>
