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
  // would otherwise be cut off inside the `--dash-page-max` column.
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
/* The cap itself is `--dash-page-max` in css/dashboard.scss, which steps up at
   1440 / 1920 / 2400px so a 4K screen is not mostly bare canvas. It is a token
   rather than a literal here because pages occasionally need to align a fixed
   element with the content column, and two copies of the number drift. */
.page-shell-container {
  max-width: var(--dash-page-max);
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

/* Wins on specificity (two classes to one), so it holds at every step of the
   width ladder without needing its own media queries. */
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
