<template>
  <div class="brand-section">
    <!-- Geometric background shapes -->
    <div class="geo-bg">
      <div class="geo-circle geo-circle--1"></div>
      <div class="geo-circle geo-circle--2"></div>
      <div class="geo-line geo-line--1"></div>
      <div class="geo-line geo-line--2"></div>
      <div class="geo-dot-grid"></div>
    </div>

    <div class="brand-inner">
      <div class="brand-top">
        <!-- Badge -->
        <div class="brand-badge">
          <span class="badge-dot"></span>
          <span class="badge-label">WAGEY ADMIN</span>
        </div>

        <!-- Headline -->
        <div class="brand-hero">
          <h1 class="brand-headline">
            Welcome<br />
            <span class="brand-name">Back.</span>
          </h1>
          <p class="brand-desc">
            Your payroll dashboard awaits.<br />
            Secure, fast, and always in sync.
          </p>
        </div>

        <!-- Stats strip -->
        <div class="brand-stats">
          <div class="stat-item">
            <span class="stat-value">99.9%</span>
            <span class="stat-label">Uptime</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">256-bit</span>
            <span class="stat-label">Encryption</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">Real-time</span>
            <span class="stat-label">Payroll sync</span>
          </div>
        </div>
      </div>

      <!-- Mascot -->
      <div class="mascot-wrap">
        <img src="../../../assets/wagey_mascot.png" alt="Wagey mascot" class="mascot-img" />
      </div>

      <!-- Floating badges -->
      <div class="float-badge float-badge--secure">
        <q-icon name="lock" size="14px" class="float-badge__icon" />
        <span class="float-badge__text">Secure &amp; compliant</span>
      </div>

      <div class="float-badge float-badge--payroll">
        <q-icon name="flash_on" size="14px" class="float-badge__icon" />
        <span class="float-badge__text">Real-time payroll</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Purely presentational — no logic needed
</script>

<style lang="scss" scoped>
// ─── Tokens ──────────────────────────────────────────────
$blue-deep: #0b1f4a;
$blue-mid: #1648a0;
$blue-bright: #2563eb;
$white: #ffffff;

// ─── Left / Brand panel ──────────────────────────────────
// Hidden on mobile (<768px), visible from tablet up
.brand-section {
  display: none;

  // 768px — brand panel appears, compact layout
  @media (min-width: 768px) {
    display: flex;
    flex: 1;
    height: 100vh;
    min-height: 600px;
    position: relative;
    overflow: hidden;
    background: $blue-deep;
    min-width: 0;
  }
}

// ─── Geometric background ────────────────────────────────
.geo-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.geo-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.07);

  &--1 {
    width: 380px;
    height: 380px;
    right: -120px;
    bottom: -60px;
    border-width: 1.5px;
    animation: rotateSlow 40s linear infinite;

    @media (min-width: 1024px) {
      width: 480px;
      height: 480px;
      right: -140px;
      bottom: -70px;
    }

    @media (min-width: 1440px) {
      width: 580px;
      height: 580px;
      right: -160px;
      bottom: -80px;
    }
  }

  &--2 {
    width: 220px;
    height: 220px;
    right: -40px;
    bottom: 20px;
    border-color: rgba(37, 99, 235, 0.25);
    animation: rotateSlow 28s linear infinite reverse;

    @media (min-width: 1024px) {
      width: 270px;
      height: 270px;
      right: -50px;
      bottom: 30px;
    }

    @media (min-width: 1440px) {
      width: 320px;
      height: 320px;
      right: -60px;
      bottom: 40px;
    }
  }
}

.geo-line {
  position: absolute;
  background: rgba(255, 255, 255, 0.04);

  &--1 {
    width: 100%;
    height: 1px;
    top: 38%;
    transform: rotate(-12deg) scaleX(1.5);
    transform-origin: left center;
  }

  &--2 {
    width: 100%;
    height: 1px;
    top: 62%;
    transform: rotate(-12deg) scaleX(1.5);
    transform-origin: left center;
  }
}

.geo-dot-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(
    to bottom right,
    transparent 30%,
    rgba(0, 0, 0, 0.4) 60%,
    transparent 90%
  );

  @media (min-width: 1024px) {
    background-size: 28px 28px;
  }
}

@keyframes rotateSlow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// ─── Brand inner ─────────────────────────────────────────
.brand-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  min-height: 600px;

  // 768px — tighter padding, content fits compact panel
  padding: 2rem 1.75rem 0;

  @media (min-width: 1024px) {
    padding: 2.75rem 2.5rem 0;
  }

  @media (min-width: 1440px) {
    padding: 3.5rem 3.5rem 0;
  }
}

// ─── Brand top content ───────────────────────────────────
.brand-top {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex-shrink: 0;

  @media (min-width: 1024px) {
    gap: 1.5rem;
  }

  @media (min-width: 1440px) {
    gap: 2rem;
  }
}

// ─── Badge ───────────────────────────────────────────────
.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(37, 99, 235, 0.18);
  border: 1px solid rgba(37, 99, 235, 0.32);
  border-radius: 100px;
  padding: 0.3rem 0.75rem;
  width: fit-content;
  animation: fadeSlideDown 0.6s ease both;
  flex-shrink: 0;

  @media (min-width: 1024px) {
    padding: 0.35rem 0.85rem;
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
    animation: pulseDot 2.5s ease-in-out infinite;
  }

  .badge-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;

    @media (min-width: 1024px) {
      font-size: 0.68rem;
    }
  }
}

@keyframes pulseDot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.8);
  }
}

// ─── Headline ────────────────────────────────────────────
.brand-hero {
  animation: fadeSlideUp 0.65s ease 0.1s both;
  flex-shrink: 0;
}

.brand-headline {
  font-weight: 800;
  color: $white;
  margin: 0 0 0.6rem;
  line-height: 1.08;
  letter-spacing: -0.03em;

  // 768px — smaller to fit narrower panel
  font-size: 1.7rem;

  @media (min-width: 1024px) {
    font-size: 2.8rem;
    margin: 0 0 1rem;
  }

  @media (min-width: 1440px) {
    font-size: clamp(3rem, 3.2vw, 3.8rem);
  }
}

.brand-name {
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 60%, #bfdbfe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-desc {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.42);
  line-height: 1.7;
  margin: 0;
  font-weight: 400;

  @media (min-width: 1024px) {
    font-size: 0.88rem;
  }

  @media (min-width: 1440px) {
    font-size: 0.92rem;
    line-height: 1.75;
  }
}

// ─── Stats strip ─────────────────────────────────────────
.brand-stats {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  background: rgba(11, 31, 74, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  width: fit-content;
  flex-shrink: 0;
  animation: fadeSlideUp 0.65s ease 0.2s both;
  backdrop-filter: blur(8px);

  @media (min-width: 1024px) {
    gap: 0.85rem;
    padding: 0.6rem 1rem;
    border-radius: 10px;
  }

  @media (min-width: 1440px) {
    gap: 1.1rem;
    padding: 0.7rem 1.1rem;
    border-radius: 11px;
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-value {
  font-size: 0.7rem;
  font-weight: 700;
  color: $white;
  letter-spacing: -0.01em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);

  @media (min-width: 1024px) {
    font-size: 0.75rem;
  }

  @media (min-width: 1440px) {
    font-size: 0.8rem;
  }
}

.stat-label {
  font-size: 0.55rem;
  color: rgba(255, 255, 255, 0.38);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);

  @media (min-width: 1024px) {
    font-size: 0.58rem;
  }

  @media (min-width: 1440px) {
    font-size: 0.6rem;
  }
}

.stat-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);

  @media (min-width: 1024px) {
    height: 20px;
  }

  @media (min-width: 1440px) {
    height: 22px;
  }
}

// ─── Mascot ──────────────────────────────────────────────
.mascot-wrap {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1;
  animation: fadeSlideUp 0.7s ease 0.3s both;

  @media (min-width: 1024px) {
    height: 55%;
  }

  @media (min-width: 1440px) {
    height: 60%;
  }
}

.mascot-img {
  width: auto;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: bottom center;
  filter: drop-shadow(0 20px 48px rgba(11, 31, 74, 0.5));
}

// ─── Floating badges ─────────────────────────────────────
.float-badge {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.4rem 0.7rem;
  font-size: 0.65rem;
  font-weight: 600;
  pointer-events: none;
  z-index: 2;
  animation: floatBadge 4s ease-in-out infinite;

  @media (min-width: 1024px) {
    gap: 7px;
    padding: 0.45rem 0.8rem;
    font-size: 0.7rem;
  }

  @media (min-width: 1440px) {
    gap: 8px;
    padding: 0.5rem 0.9rem;
    font-size: 0.72rem;
  }

  &__icon {
    flex-shrink: 0;
  }

  &__text {
    white-space: nowrap;
  }
}

.float-badge--secure {
  top: 52%;
  right: 4%;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 100px;
  color: $blue-deep;
  box-shadow: 0 4px 16px rgba(11, 31, 74, 0.15);
  animation-delay: 0.1s;

  @media (min-width: 1024px) {
    top: 44%;
    right: 8%;
  }

  @media (min-width: 1440px) {
    top: 42%;
    right: 10%;
  }

  .float-badge__icon {
    color: $blue-bright;
  }
}

.float-badge--payroll {
  bottom: 14%;
  left: 2%;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 100px;
  color: $blue-deep;
  box-shadow: 0 4px 16px rgba(11, 31, 74, 0.15);
  animation-delay: 0.6s;

  @media (min-width: 1024px) {
    bottom: 20%;
    left: 6%;
  }

  @media (min-width: 1440px) {
    bottom: 22%;
    left: 8%;
  }

  .float-badge__icon {
    color: #f59e0b;
  }
}

@keyframes floatBadge {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

// ─── Keyframes ───────────────────────────────────────────
@keyframes fadeSlideDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
