<template>
  <!--
    The animated backdrop for the login screen. Purely decorative — every layer
    is `pointer-events: none` so the form above it always receives the click.

    Layer order (back to front):
      base     — the static navy gradient ground
      aurora   — three slow-drifting colour blobs, screened over the ground
      grid     — a fine rule grid that is only *revealed* where the light falls
      spot     — the spotlight itself, following the cursor
      sweep    — a diagonal specular streak crossing every few seconds
      marks    — the drifting field of Wagey marks (see LoginMarkField.vue)
      grain    — a little film grain, which is what stops the gradients banding
      vignette — darkens the corners so the card sits in the brightest area
  -->
  <div ref="stageEl" class="stage" :class="{ 'stage--tracking': tracking }" aria-hidden="true">
    <div class="stage__base"></div>

    <div class="aurora">
      <span class="aurora__blob aurora__blob--indigo"></span>
      <span class="aurora__blob aurora__blob--teal"></span>
      <span class="aurora__blob aurora__blob--violet"></span>
    </div>

    <div class="grid"></div>
    <div class="spot"></div>
    <div class="sweep"></div>

    <LoginMarkField />

    <div class="grain"></div>
    <div class="vignette"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import LoginMarkField from './LoginMarkField.vue'

// `--px` / `--py` are registered custom properties (see the style block), which
// is what lets the spotlight both *transition* toward the cursor and *animate*
// on its own idle drift. While no pointer has moved we leave the drift keyframes
// running; the first movement adds `.stage--tracking`, which stops the animation
// so the inline values written below can take over.
const stageEl = ref(null)
const tracking = ref(false)

let frame = 0
let latest = null

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

function apply() {
  frame = 0
  const el = stageEl.value
  if (!el || !latest) return
  const x = (latest.clientX / window.innerWidth) * 100
  const y = (latest.clientY / window.innerHeight) * 100
  el.style.setProperty('--px', `${x.toFixed(2)}%`)
  el.style.setProperty('--py', `${y.toFixed(2)}%`)
  if (!tracking.value) tracking.value = true
}

function onPointerMove(event) {
  latest = event
  if (frame) return
  frame = requestAnimationFrame(apply)
}

onMounted(() => {
  if (prefersReducedMotion()) return
  window.addEventListener('pointermove', onPointerMove, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<style lang="scss" scoped>
// Registering the two spotlight coordinates as real typed properties is what
// makes them animatable and transitionable. Browsers without @property still
// read the fallbacks below — the light just snaps instead of easing.
@property --px {
  syntax: '<percentage>';
  initial-value: 50%;
  inherits: true;
}

@property --py {
  syntax: '<percentage>';
  initial-value: 38%;
  inherits: true;
}

.stage {
  --px: 50%;
  --py: 38%;

  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;

  // Idle behaviour: the light wanders on its own until the cursor arrives.
  animation: driftLight 26s var(--lg-ease) infinite alternate;
  transition:
    --px 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    --py 0.55s cubic-bezier(0.16, 1, 0.3, 1);

  &--tracking {
    animation: none;
  }
}

@keyframes driftLight {
  0% {
    --px: 34%;
    --py: 30%;
  }
  50% {
    --px: 62%;
    --py: 46%;
  }
  100% {
    --px: 46%;
    --py: 24%;
  }
}

// ── Ground ──────────────────────────────────────────────────────────────────
.stage__base {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1200px 720px at 50% -12%, #16304e 0%, transparent 62%),
    radial-gradient(900px 620px at 88% 104%, rgba(46, 79, 212, 0.24) 0%, transparent 66%),
    linear-gradient(178deg, #0c1826 0%, #091321 52%, #060c14 100%);
}

// ── Aurora ──────────────────────────────────────────────────────────────────
.aurora {
  position: absolute;
  inset: -20%;
  mix-blend-mode: screen;
  filter: blur(90px);
  opacity: 0.5;
}

.aurora__blob {
  position: absolute;
  border-radius: 50%;
  will-change: transform;

  &--indigo {
    width: 46vw;
    height: 46vw;
    top: 4%;
    left: 6%;
    background: radial-gradient(circle, rgba(46, 79, 212, 0.55) 0%, transparent 68%);
    animation: floatBlob 34s var(--lg-ease) infinite alternate;
  }

  &--teal {
    width: 38vw;
    height: 38vw;
    right: 4%;
    top: 34%;
    background: radial-gradient(circle, rgba(14, 147, 132, 0.4) 0%, transparent 68%);
    animation: floatBlob 44s var(--lg-ease) -12s infinite alternate-reverse;
  }

  &--violet {
    width: 42vw;
    height: 42vw;
    left: 34%;
    bottom: -6%;
    background: radial-gradient(circle, rgba(120, 88, 240, 0.32) 0%, transparent 70%);
    animation: floatBlob 52s var(--lg-ease) -22s infinite alternate;
  }
}

@keyframes floatBlob {
  from {
    transform: translate3d(-4%, -2%, 0) scale(1);
  }
  to {
    transform: translate3d(6%, 5%, 0) scale(1.16);
  }
}

// ── Grid, revealed by the light ─────────────────────────────────────────────
// The grid is drawn across the whole viewport but masked to the spotlight, so
// moving the cursor uncovers structure rather than adding brightness. That reads
// as a lit surface instead of a glow pasted on top.
.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.075) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.075) 1px, transparent 1px);
  background-size: 64px 64px;
  // No hand-written `-webkit-` twin: autoprefixer adds prefixes from this
  // project's browserslist, all of which take `mask-image` unprefixed.
  mask-image: radial-gradient(
    900px 660px at var(--px) var(--py),
    #000 0%,
    rgba(0, 0, 0, 0.5) 48%,
    transparent 76%
  );
}

// ── Spotlight ───────────────────────────────────────────────────────────────
.spot {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      560px 560px at var(--px) var(--py),
      rgba(255, 255, 255, 0.13) 0%,
      transparent 68%
    ),
    radial-gradient(
      980px 980px at var(--px) var(--py),
      rgba(88, 120, 255, 0.22) 0%,
      transparent 64%
    );
}

// ── Specular sweep ──────────────────────────────────────────────────────────
.sweep {
  position: absolute;
  top: -60%;
  bottom: -60%;
  left: -40%;
  width: 26%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.022) 45%,
    rgba(255, 255, 255, 0.045) 50%,
    rgba(255, 255, 255, 0.022) 55%,
    transparent 100%
  );
  transform: rotate(16deg);
  filter: blur(11px);
  animation: sweepAcross 15s linear infinite;
}

@keyframes sweepAcross {
  0% {
    transform: translateX(0) rotate(16deg);
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translateX(560%) rotate(16deg);
    opacity: 0;
  }
}

// ── Texture and framing ─────────────────────────────────────────────────────
.grain {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23g)'/%3E%3C/svg%3E");
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 100% at 50% 40%, transparent 40%, rgba(3, 7, 13, 0.62) 100%);
}

// ── Reduced motion ──────────────────────────────────────────────────────────
// The light settles into one fixed, flattering position and nothing moves. The
// spotlight itself stays — it is what makes the card legible, not decoration.
@media (prefers-reduced-motion: reduce) {
  .stage {
    --px: 50%;
    --py: 34%;
    animation: none;
    transition: none;
  }

  .aurora__blob {
    animation: none;
  }

  .sweep {
    display: none;
  }
}
</style>
