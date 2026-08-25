<template>
  <q-page class="login-page">
    <LoginStage />

    <div class="login-page__content">
      <header class="brandbar">
        <div class="brandbar__brand">
          <img :src="markWhite" alt="Wagey" class="brandbar__mark" />
          <span class="brandbar__name">Wagey</span>
          <span class="brandbar__divider"></span>
          <span class="brandbar__product">Admin console</span>
        </div>

        <!-- Only claims what the page can actually verify about itself. -->
        <div v-if="secureConnection" class="brandbar__secure">
          <q-icon name="lock" size="13px" />
          <span>Encrypted connection</span>
        </div>
      </header>

      <main class="login-page__main">
        <LoginForm />
      </main>

      <footer class="footbar">
        <span>© {{ year }} Wagey</span>
        <span class="footbar__dot"></span>
        <span>Payroll and HR administration</span>
      </footer>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import LoginStage from '@/components/pages/Login/LoginStage.vue'
import LoginForm from '@/components/pages/Login/LoginForm.vue'
// `wagey_mark.png` is the icon trimmed to the glyph. The untrimmed asset is
// ~69% transparent padding, which made every CSS size draw a third of the mark.
import markWhite from '@/assets/wagey_mark.png'

const year = new Date().getFullYear()
const secureConnection = computed(
  () => typeof window !== 'undefined' && window.location.protocol === 'https:',
)
</script>

<style lang="scss" scoped>
// ─── Tokens ──────────────────────────────────────────────────────────────────
// Scoped to the login screen because this is the one dark surface in the app.
// The hues are the same ones the app-wide system uses (--dash-accent #2e4fd4,
// the navy of the nav rail), re-expressed for a dark ground.
.login-page {
  --lg-void: #060c14;
  --lg-accent: #2e4fd4;
  --lg-accent-soft: #5878ff;

  --lg-ink: #ffffff;
  --lg-ink-2: rgba(255, 255, 255, 0.7);
  --lg-ink-3: rgba(255, 255, 255, 0.46);
  --lg-ink-4: rgba(255, 255, 255, 0.32);

  --lg-line: rgba(255, 255, 255, 0.1);
  --lg-line-strong: rgba(255, 255, 255, 0.2);

  // Solid surfaces, not glass. `--lg-card` is the navy of the authenticated
  // app's navigation rail (--nav-bg), so the first surface you meet is the same
  // colour as the chrome you land in. Opaque also means the drifting marks pass
  // cleanly *behind* the card instead of showing through the form.
  --lg-card: #101f2d;
  --lg-card-line: rgba(255, 255, 255, 0.12);
  --lg-field: #16273a;
  --lg-field-hover: #1b2f45;

  --lg-r: 16px;
  --lg-ease: cubic-bezier(0.2, 0.8, 0.3, 1);
  --lg-fast: 0.14s;
  --lg-slow: 0.26s;

  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: var(--lg-void);
  color: var(--lg-ink);
}

@media (prefers-reduced-motion: reduce) {
  .login-page {
    --lg-fast: 0.01ms;
    --lg-slow: 0.01ms;
  }
}

// ─── Content column ──────────────────────────────────────────────────────────
.login-page__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 22px 26px 20px;

  @media (max-width: 600px) {
    padding: 18px 16px 16px;
  }
}

.login-page__main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

// ─── Brand bar ───────────────────────────────────────────────────────────────
.brandbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  animation: fadeDown 0.6s var(--lg-ease) both;
}

.brandbar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brandbar__mark {
  width: 20px;
  height: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 0 9px rgba(126, 158, 255, 0.32));

  @media (max-width: 600px) {
    width: 18px;
  }
}

.brandbar__name {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--lg-ink);

  @media (max-width: 600px) {
    font-size: 16px;
  }
}

.brandbar__divider {
  width: 1px;
  height: 17px;
  background: var(--lg-line-strong);

  @media (max-width: 600px) {
    height: 15px;
  }
}

.brandbar__product {
  font-size: 14px;
  color: var(--lg-ink-3);
  white-space: nowrap;

  @media (max-width: 600px) {
    font-size: 13px;
  }
}

.brandbar__secure {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--lg-line);
  background: var(--lg-card);
  font-size: 11.5px;
  color: var(--lg-ink-2);

  @media (max-width: 600px) {
    display: none;
  }
}

// ─── Foot bar ────────────────────────────────────────────────────────────────
.footbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 11.5px;
  color: var(--lg-ink-4);
  animation: fadeUp 0.6s var(--lg-ease) 0.36s both;
}

.footbar__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}

@keyframes fadeDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brandbar,
  .footbar {
    animation: none;
  }
}
</style>
