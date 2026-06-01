<template>
  <q-page :class="['page-shell', { 'full-height': fullHeight }]">
    <div :class="['page-shell-container', { 'full-height': fullHeight, 'flex-column': flexColumn }]">
      <slot />
    </div>
  </q-page>
</template>

<script setup>
defineProps({
  fullHeight: { type: Boolean, default: false },
  flexColumn: { type: Boolean, default: false },
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

@media (max-width: 1024px) {
  .page-shell-container {
    padding: 14px;
  }
}

@media (max-width: 768px) {
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
