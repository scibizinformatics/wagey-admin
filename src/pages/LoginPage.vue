<template>
  <q-page class="login">
    <LoginStage />

    <div class="login__content">
      <header class="topbar">
        <div class="topbar__brand">
          <img :src="markWhite" alt="Wagey" class="topbar__mark" />
          <span class="topbar__name">Wagey</span>
          <span class="topbar__rule"></span>
          <span class="topbar__product">Admin console</span>
        </div>
      </header>

      <main class="login__main">
        <LoginForm />
      </main>

      <footer class="footbar">
        <!-- Only claims what the page can actually verify about itself. -->
        <template v-if="secureConnection">
          <span class="footbar__secure">
            <q-icon name="lock" size="12px" />
            Encrypted connection
          </span>
          <span class="footbar__dot"></span>
        </template>
        <span>© {{ year }} Wagey</span>
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
// Scoped to the login screen, because this is the one dark surface in the app.
// The ground is deliberately deeper and cooler than the navigation rail's navy:
// a full screen of #101f2d reads as a heavy slab, while a near-black ground
// with the rail's navy lifted out of it for the card gives the card somewhere
// to sit. The hues are still the app's own — --dash-accent (#2e4fd4) and the
// rail navy — just re-levelled for a full-bleed dark surface.
.login {
  --lg-void: #070d15;
  --lg-accent: #2e4fd4;
  --lg-accent-soft: #5878ff;

  --lg-ink: #ffffff;
  --lg-ink-2: rgba(255, 255, 255, 0.7);
  --lg-ink-3: rgba(255, 255, 255, 0.46);
  --lg-ink-4: rgba(255, 255, 255, 0.3);

  --lg-line: rgba(255, 255, 255, 0.09);
  --lg-line-strong: rgba(255, 255, 255, 0.16);

  // Solid surfaces, never glass. The card is the navigation rail's navy, so the
  // first surface you meet is the colour of the chrome you land in; the ground
  // behind it is darker, which is what separates the two without a blur.
  --lg-card: #101f2d;
  --lg-card-line: rgba(255, 255, 255, 0.1);
  --lg-field: #16273a;
  --lg-field-hover: #1a2e44;

  --lg-r: 14px;
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
  .login {
    --lg-fast: 0.01ms;
    --lg-slow: 0.01ms;
  }
}

// ─── Content column ──────────────────────────────────────────────────────────
.login__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 24px 28px 22px;

  @media (max-width: 600px) {
    padding: 18px 16px 16px;
  }
}

.login__main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  // Slightly less below than above: an optically centred card sits a touch
  // above the true middle, which is where the eye expects it.
  padding: 28px 0 40px;
}

// ─── Top bar ─────────────────────────────────────────────────────────────────
.topbar {
  display: flex;
  align-items: center;
  animation: fadeDown 0.55s var(--lg-ease) both;
}

.topbar__brand {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.topbar__mark {
  width: 18px;
  height: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 0 9px rgba(126, 158, 255, 0.3));
}

.topbar__name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--lg-ink);
}

.topbar__rule {
  width: 1px;
  height: 13px;
  background: var(--lg-line-strong);
}

.topbar__product {
  font-size: 12.5px;
  color: var(--lg-ink-3);
  white-space: nowrap;
}

// ─── Foot bar ────────────────────────────────────────────────────────────────
.footbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 11.5px;
  color: var(--lg-ink-4);
  animation: fadeUp 0.55s var(--lg-ease) 0.34s both;
}

.footbar__secure {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.footbar__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.8;
}

@keyframes fadeDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .topbar,
  .footbar {
    animation: none;
  }
}
</style>
