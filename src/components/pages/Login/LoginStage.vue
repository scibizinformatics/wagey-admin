<template>
  <!--
    The ambient backdrop for the login screen. Purely decorative — every layer
    is `pointer-events: none`, so the form above always receives the click.

    The composition is built around one light, placed just above the card, and
    nothing coloured moves. Earlier versions drifted three saturated blobs
    across the ground; that reads as consumer software. Here the ground is inert
    and the structure on it — a rule grid and concentric hairline rings — is
    only *revealed* where the light falls, so the screen reads as a lit surface
    rather than as artwork pasted onto one.

    Layer order (back to front):
      base     — the static near-black ground
      glow     — the one light source
      grid     — fine rules, masked to the light
      rings    — concentric hairlines centred on the light, masked the same way
      sweep    — one slow diagonal specular pass
      marks    — the drifting field of Wagey marks (see LoginMarkField.vue)
      grain    — film grain, which is what stops the gradients banding
      vignette — darkens the corners so the card sits in the brightest area
  -->
  <div class="stage" aria-hidden="true">
    <div class="stage__base"></div>
    <div class="glow"></div>
    <div class="grid"></div>
    <div class="rings"></div>
    <div class="sweep"></div>

    <LoginMarkField />

    <div class="grain"></div>
    <div class="vignette"></div>
  </div>
</template>

<script setup>
import LoginMarkField from './LoginMarkField.vue'
</script>

<style lang="scss" scoped>
// `--px` / `--py` place the light, and every masked layer reads the same pair,
// so the lit composition moves as one. They are plain values: the light does
// not follow the cursor and does not drift, so nothing needs to animate them.
// `--py` sits above centre because the card is optically centred, and light
// arriving from above a surface is the reading the eye accepts without effort.
.stage {
  --px: 50%;
  --py: 24%;

  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

// ── Ground ──────────────────────────────────────────────────────────────────
.stage__base {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1180px 720px at 50% -6%, #16293d 0%, transparent 64%),
    radial-gradient(920px 700px at 50% 112%, rgba(46, 79, 212, 0.18) 0%, transparent 66%),
    linear-gradient(180deg, #0a1320 0%, #080f18 56%, #060b12 100%);
}

// ── The light ───────────────────────────────────────────────────────────────
// Wide and low-contrast. A tight bright core behind an opaque card would only
// show as a rim around it, which looks like a mistake; this instead lifts the
// whole area the card sits in.
.glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      620px 520px at var(--px) var(--py),
      rgba(255, 255, 255, 0.055) 0%,
      transparent 70%
    ),
    radial-gradient(
      1150px 1020px at var(--px) var(--py),
      rgba(88, 120, 255, 0.15) 0%,
      transparent 66%
    );
}

// ── Structure, revealed by the light ────────────────────────────────────────
// Both layers are drawn across the whole viewport and masked to the light, so
// structure only shows where it is lit.
//
// No hand-written `-webkit-` twins: autoprefixer adds prefixes from this
// project's browserslist, all of which take `mask-image` unprefixed.
.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 76px 76px;
  mask-image: radial-gradient(
    880px 720px at var(--px) var(--py),
    #000 0%,
    rgba(0, 0, 0, 0.42) 46%,
    transparent 74%
  );
}

// Centred on the light, which is centred on the card: the rings read as the
// card's own influence spreading across the surface rather than as a pattern
// that happens to be there.
.rings {
  position: absolute;
  inset: 0;
  background: repeating-radial-gradient(
    circle at var(--px) var(--py),
    rgba(255, 255, 255, 0.055) 0 1px,
    transparent 1px 148px
  );
  mask-image: radial-gradient(
    1000px 900px at var(--px) var(--py),
    transparent 0%,
    rgba(0, 0, 0, 0.5) 36%,
    transparent 78%
  );
}

// ── Specular pass ───────────────────────────────────────────────────────────
// One slow, low-contrast streak, long enough between passes that it registers
// as the surface catching light rather than as a loop.
.sweep {
  position: absolute;
  top: -60%;
  bottom: -60%;
  left: -40%;
  width: 26%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.016) 45%,
    rgba(255, 255, 255, 0.036) 50%,
    rgba(255, 255, 255, 0.016) 55%,
    transparent 100%
  );
  transform: rotate(16deg);
  filter: blur(13px);
  animation: sweepAcross 21s linear infinite;
}

@keyframes sweepAcross {
  0% {
    transform: translateX(0) rotate(16deg);
    opacity: 0;
  }

  14% {
    opacity: 1;
  }

  72% {
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
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23g)'/%3E%3C/svg%3E");
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(112% 96% at 50% 32%, transparent 34%, rgba(2, 5, 10, 0.82) 100%);
}

// ── Reduced motion ──────────────────────────────────────────────────────────
// The light and the structure stay — they are what give the screen depth, not
// decoration. Only the sweep is motion for its own sake.
@media (prefers-reduced-motion: reduce) {
  .sweep {
    display: none;
  }
}
</style>
