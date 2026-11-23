<template>
  <q-page class="login">
    <!-- Page furniture, absolute rather than in the flow: the card is centred in
         whatever space is left, so a bar above it would push it down and break
         that centring. -->
    <header class="topbar">
      <div class="topbar__brand">
        <img :src="markWhite" alt="Wagey" class="topbar__mark" />
        <span class="topbar__name">Wagey</span>
        <span class="topbar__rule"></span>
        <span class="topbar__product">Admin console</span>
      </div>
    </header>

    <!-- The ambient field sits behind everything and covers the whole page: the
         screen is one white surface now, so the marks are the only thing on it
         besides the card. See LoginMarkField.vue for the composition. -->
    <LoginMarkField />

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
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import LoginForm from '@/components/pages/Login/LoginForm.vue'
import LoginMarkField from '@/components/pages/Login/LoginMarkField.vue'
// Trimmed to the glyph, so `topbar__mark`'s width is the mark's real width. It
// is the white asset; the style block darkens it for this white page.
import markWhite from '@/assets/wagey_mark.png'

const year = new Date().getFullYear()
const secureConnection = computed(
  () => typeof window !== 'undefined' && window.location.protocol === 'https:',
)
</script>

<style lang="scss" scoped>
// ─── Tokens ──────────────────────────────────────────────────────────────────
// The whole screen is a light surface, so its ink ramp is the dashboard's own
// neutral ramp and its hairlines are the app's borders. LoginForm.vue and
// LoginMarkField.vue read these through inheritance, so the files cannot drift.
//
// The card is a white card on a white page: the edge and the shadow give it its
// shape, which is why `--lg-card-line` and the card's own shadow are load-bearing
// here and not decoration.
.login {
  --lg-canvas: #ffffff;
  --lg-ink: #101828;
  --lg-ink-2: #344054;
  --lg-ink-3: #667085;
  --lg-ink-4: #98a2b3;
  --lg-line: #eaecf0;
  --lg-line-strong: #d0d5dd;
  --lg-accent: #2e4fd4;
  --lg-accent-soft: #2e4fd4;
  // The filled action, mirroring the app's own buttons: `$brand-dark` /
  // `$brand-dark-hover` in css/app.scss and `--dash-brand` in dashboard.scss.
  // Kept here so the card reads one token instead of a repeated hex.
  --lg-brand: #102335;
  --lg-brand-hover: #193d5c;

  --lg-card: #ffffff;
  --lg-card-line: #eaecf0;
  --lg-field: #f9fafb;
  --lg-field-hover: #f2f4f7;

  --lg-r: 14px;
  --lg-ease: cubic-bezier(0.2, 0.8, 0.3, 1);
  --lg-fast: 0.14s;
  --lg-slow: 0.26s;

  // `relative` + `isolate` are what place the mark field under the card and keep
  // its stacking inside this screen: the field is `inset: 0` absolute, so it
  // needs this box as its containing block, and nothing on the page leaks above
  // it. The field clips its own overflow, which is why this box needs none.
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 24px 28px 22px;
  background: var(--lg-canvas);
  color: var(--lg-ink);

  @media (max-width: 600px) {
    padding: 18px 16px 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login {
    --lg-fast: 0.01ms;
    --lg-slow: 0.01ms;
  }
}

// ─── Top bar ─────────────────────────────────────────────────────────────────
// In the same 24/28px inset as the page padding, so the wordmark lines up with
// the card's column at every width. Only the narrow breakpoint needs its own
// pair, because the page's padding changes there.
.topbar {
  position: absolute;
  top: 24px;
  left: 28px;
  z-index: 1;
  animation: fadeDown 0.55s var(--lg-ease) both;

  @media (max-width: 600px) {
    top: 18px;
    left: 16px;
  }
}

.topbar__brand {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

// `brightness(0)` is the same ink trick the mark field uses: the asset is a
// WHITE glyph, so on this page it has to be turned dark to be seen at all.
.topbar__mark {
  width: 18px;
  height: auto;
  flex-shrink: 0;
  filter: brightness(0);
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

// ─── Card holder ─────────────────────────────────────────────────────────────
.login__main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  // Slightly less below than above: an optically centred card sits a touch
  // above the true middle, which is where the eye expects it.
  padding: 28px 0 40px;
}

// ─── Foot bar ────────────────────────────────────────────────────────────────
.footbar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 11.5px;
  color: var(--lg-ink-3);
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
