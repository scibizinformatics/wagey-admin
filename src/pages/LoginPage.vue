<template>
  <q-page class="login">
    <!-- ═══ Brand panel ═══════════════════════════════════════════════════ -->
    <!--
      The only dark surface left on this screen. It carries the product
      identity and the ambient stage; the form sits on white beside it. On
      narrow screens the panel is dropped entirely and the card's own mark
      carries the brand.
    -->
    <aside class="login__brand">
      <LoginStage />

      <div class="login__brand-inner">
        <header class="topbar">
          <div class="topbar__brand">
            <img :src="markWhite" alt="Wagey" class="topbar__mark" />
            <span class="topbar__name">Wagey</span>
            <span class="topbar__rule"></span>
            <span class="topbar__product">Admin console</span>
          </div>
        </header>

        <div class="brand-copy">
          <p class="brand-copy__eyebrow">Payroll &amp; HR operations</p>
          <h2 class="brand-copy__title">Everything your workforce runs on, in one console.</h2>
          <p class="brand-copy__body">
            Schedules, attendance, contracts and disbursement — reviewed and released from a
            single place.
          </p>
        </div>
      </div>
    </aside>

    <!-- ═══ Form panel ════════════════════════════════════════════════════ -->
    <main class="login__panel">
      <div class="login__main">
        <LoginForm />
      </div>

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
    </main>
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
// The form panel is a light surface, so its ink ramp is the dashboard's own
// neutral ramp and its hairlines are the app's borders. These are the tokens
// LoginForm.vue reads, so the two files cannot drift apart.
//
// The brand panel keeps a dark palette locally (below), because it is the only
// dark surface left on this screen — the ambient stage lives there, and the
// form does not need to know about it.
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

  --lg-card: #ffffff;
  --lg-card-line: #eaecf0;
  --lg-field: #f9fafb;
  --lg-field-hover: #f2f4f7;

  --lg-r: 14px;
  --lg-ease: cubic-bezier(0.2, 0.8, 0.3, 1);
  --lg-fast: 0.14s;
  --lg-slow: 0.26s;

  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--lg-canvas);
  color: var(--lg-ink);
}

@media (prefers-reduced-motion: reduce) {
  .login {
    --lg-fast: 0.01ms;
    --lg-slow: 0.01ms;
  }
}

// ─── Brand panel ─────────────────────────────────────────────────────────────
// The stage is absolute inside this panel, so the light, grid and rings are
// composed against the panel rather than the whole viewport.
.login__brand {
  position: relative;
  display: flex;
  overflow: hidden;
  background: #070d15;
  color: #ffffff;
  isolation: isolate;
}

.login__brand-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 34px 44px 34px;
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
  color: #ffffff;
}

.topbar__rule {
  width: 1px;
  height: 13px;
  background: rgba(255, 255, 255, 0.16);
}

.topbar__product {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.46);
  white-space: nowrap;
}

// ─── Brand copy ──────────────────────────────────────────────────────────────
// Sits at the foot of the panel: identity at the top, the claim at the bottom,
// and the stage holds the middle. Reading order stays top-down.
.brand-copy {
  max-width: 460px;
  margin-top: auto;
  padding-bottom: 4px;
  animation: fadeUp 0.7s var(--lg-ease) 0.12s both;
}

.brand-copy__eyebrow {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(150, 178, 255, 0.9);
}

.brand-copy__title {
  margin: 0 0 14px;
  // Declared, not inherited: Quasar gives `h2` a 3.75rem line height, which
  // would open a huge line box on a 32px headline.
  font-size: clamp(24px, 2.2vw, 32px);
  line-height: 1.18;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #ffffff;
}

.brand-copy__body {
  margin: 0;
  max-width: 44ch;
  font-size: 13.5px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.6);
}

// ─── Form panel ──────────────────────────────────────────────────────────────
.login__panel {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 24px 28px 22px;
  // White, with one very low-contrast wash of the brand hue in the top corner.
  // It keeps the surface from reading as a blank sheet without tinting the card.
  background:
    radial-gradient(760px 460px at 82% -12%, rgba(46, 79, 212, 0.055), transparent 72%),
    var(--lg-canvas);

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

// ─── Foot bar ────────────────────────────────────────────────────────────────
.footbar {
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

// ─── Wide screens ────────────────────────────────────────────────────────────
// The even split is the 1440px design width. The two edges below are where the
// proportions stop working on their own, so each gets an explicit column set.

// 1024px: at an even split the form panel leaves the card ~30px on each side,
// which reads as cramped. The brand column gives some of its width back.
@media (min-width: 901px) and (max-width: 1199px) {
  .login {
    grid-template-columns: minmax(0, 0.84fr) minmax(0, 1.16fr);
  }

  .login__brand-inner {
    padding: 26px 28px;
  }
}

// 2560px: past this the even split turns the brand panel into a very wide dark
// slab and leaves the card floating in a 1200px white field. The brand column
// stops growing and the form side takes the rest.
@media (min-width: 1800px) {
  .login {
    grid-template-columns: 860px minmax(0, 1fr);
  }

  .login__brand-inner {
    padding: 48px 64px;
  }

  .brand-copy {
    max-width: 520px;
  }
}

// ─── Narrow screens ──────────────────────────────────────────────────────────
// One column, and the brand panel goes: a half-width dark slab above a form is
// worse than no slab at all. The card's mark carries the identity instead.
@media (max-width: 900px) {
  .login {
    grid-template-columns: minmax(0, 1fr);
  }

  .login__brand {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .topbar,
  .brand-copy,
  .footbar {
    animation: none;
  }
}
</style>
