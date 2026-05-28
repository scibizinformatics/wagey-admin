<template>
  <q-page class="auth-page">
    <div class="auth-container">
      <LoginBrandPanel />
      <LoginForm />
    </div>
  </q-page>
</template>

<script setup>
import LoginBrandPanel from '@/components/pages/Login/LoginBrandPanel.vue'
import LoginForm from '@/components/pages/Login/LoginForm.vue'
</script>

<style lang="scss" scoped>
// ─── Tokens ──────────────────────────────────────────────
$blue-pale: #eff6ff;

// ─── Page ────────────────────────────────────────────────
.auth-page {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  background: $blue-pale;
}

.auth-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

// ─── Accessibility ────────────────────────────────────────
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
