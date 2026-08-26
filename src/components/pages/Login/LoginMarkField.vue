<template>
  <!--
    A depth field of drifting Wagey marks. Decorative and pointer-transparent;
    it sits inside the stage, so the sign-in card always occludes it.

    What keeps this from looking like clip-art scattered on a page:

    1. Three depth tiers. Size, opacity, blur and glow all move together — small
       + faint + blurred reads as far away, large + brighter + sharp + glowing
       reads as near. That single correlation is what turns a dozen copies of
       one glyph into a space rather than a rash of stickers.
    2. No two glyphs share a rhythm. Every one carries its own duration, and a
       NEGATIVE delay so it starts mid-phase. Without that they all rise and
       fall on the same beat and the field pulses like one object.
    3. Two motion paths. Most glyphs drift in place; a few rise slowly through
       the whole viewport, fading in and out at the ends, so the scene has
       traffic through it rather than only wobble.
    4. Positions are hand-placed, not random — they frame the card and stay out
       of the centre column, because a mark crossing the form is noise. Random
       placement clumps, and re-randomising on each mount would make the page
       look different every visit for no reason.
    5. Restraint. Fewer marks and lower opacity than a full field would take:
       the marks are meant to be noticed second, after the form.
  -->
  <div class="field" aria-hidden="true">
    <img
      v-for="(g, i) in glyphs"
      :key="i"
      :src="markWhite"
      alt=""
      class="glyph"
      :class="[`glyph--${g.tier}`, `glyph--${g.motion}`]"
      :style="{
        '--x': g.x,
        '--y': g.y,
        '--size': `${g.size}px`,
        '--op': g.op,
        '--dur': `${g.dur}s`,
        '--delay': `-${g.delay}s`,
      }"
    />
  </div>
</template>

<script setup>
// Trimmed to the glyph, so `size` below is the mark's real on-screen size.
import markWhite from '@/assets/wagey_mark.png'

// `tier` drives blur and glow (see the style block); `motion` picks the
// keyframe path. `rise` glyphs ignore `y` — they cross the full viewport.
const glyphs = [
  // ── far: small, soft, barely there ─────────────────────────────────────────
  { x: '9%', y: '15%', size: 8, op: 0.075, tier: 'far', motion: 'bob', dur: 13, delay: 2 },
  { x: '25%', y: '68%', size: 8, op: 0.07, tier: 'far', motion: 'sway', dur: 16, delay: 7 },
  { x: '74%', y: '19%', size: 8, op: 0.075, tier: 'far', motion: 'bob', dur: 14, delay: 11 },
  { x: '90%', y: '73%', size: 8, op: 0.07, tier: 'far', motion: 'sway', dur: 18, delay: 4 },
  { x: '47%', y: '7%', size: 7, op: 0.065, tier: 'far', motion: 'bob', dur: 15, delay: 13 },
  { x: '58%', y: '92%', size: 8, op: 0.07, tier: 'far', motion: 'sway', dur: 17, delay: 6 },

  // ── mid ───────────────────────────────────────────────────────────────────
  { x: '16%', y: '41%', size: 12, op: 0.12, tier: 'mid', motion: 'sway', dur: 20, delay: 9 },
  { x: '33%', y: '13%', size: 11, op: 0.11, tier: 'mid', motion: 'bob', dur: 18, delay: 15 },
  { x: '84%', y: '45%', size: 13, op: 0.13, tier: 'mid', motion: 'bob', dur: 22, delay: 5 },
  { x: '71%', y: '81%', size: 11, op: 0.11, tier: 'mid', motion: 'sway', dur: 24, delay: 17 },
  { x: '6%', y: '86%', size: 11, op: 0.11, tier: 'mid', motion: 'bob', dur: 21, delay: 20 },

  // ── near: larger, brighter, glowing ───────────────────────────────────────
  { x: '21%', y: '80%', size: 18, op: 0.17, tier: 'near', motion: 'sway', dur: 26, delay: 10 },
  { x: '89%', y: '11%', size: 16, op: 0.15, tier: 'near', motion: 'bob', dur: 23, delay: 19 },
  { x: '80%', y: '89%', size: 15, op: 0.14, tier: 'near', motion: 'sway', dur: 28, delay: 3 },

  // ── rising through the scene ──────────────────────────────────────────────
  { x: '13%', y: '50%', size: 14, op: 0.14, tier: 'near', motion: 'rise', dur: 34, delay: 6 },
  { x: '92%', y: '50%', size: 10, op: 0.1, tier: 'mid', motion: 'rise', dur: 41, delay: 23 },
]
</script>

<style lang="scss" scoped>
.field {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.glyph {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--size);
  height: auto;
  opacity: var(--op);
  will-change: transform, opacity;
}

// ── Depth tiers ─────────────────────────────────────────────────────────────
// Only the near tier pays for a drop-shadow; at far and mid sizes the glow is
// invisible and it is the most expensive part of the filter to composite.
.glyph--far {
  filter: blur(0.7px);
}

.glyph--mid {
  filter: blur(0.3px);
}

.glyph--near {
  filter: drop-shadow(0 0 9px rgba(126, 158, 255, 0.5));
}

// ── Motion ──────────────────────────────────────────────────────────────────
// Bob and sway pair a transform path with a slower opacity shimmer on a
// different period, so a glyph never repeats the same combined state.
.glyph--bob {
  animation:
    bob var(--dur) var(--lg-ease) var(--delay) infinite alternate,
    shimmer calc(var(--dur) / 1.7) ease-in-out var(--delay) infinite alternate;
}

.glyph--sway {
  animation:
    sway var(--dur) var(--lg-ease) var(--delay) infinite alternate,
    shimmer calc(var(--dur) / 1.4) ease-in-out var(--delay) infinite alternate;
}

// Rise drives its own opacity (fading in and out at the ends of the run), so it
// gets no shimmer — two animations on one property would fight.
.glyph--rise {
  animation: rise var(--dur) linear var(--delay) infinite;
}

@keyframes bob {
  from {
    transform: translate3d(0, 0, 0) rotate(-5deg);
  }

  to {
    transform: translate3d(0, -14px, 0) rotate(5deg);
  }
}

@keyframes sway {
  from {
    transform: translate3d(-8px, 5px, 0) rotate(4deg);
  }

  to {
    transform: translate3d(10px, -12px, 0) rotate(-6deg);
  }
}

@keyframes rise {
  0% {
    transform: translate3d(0, 58vh, 0) rotate(-10deg);
    opacity: 0;
  }

  18% {
    opacity: var(--op);
  }

  82% {
    opacity: var(--op);
  }

  100% {
    transform: translate3d(18px, -58vh, 0) rotate(10deg);
    opacity: 0;
  }
}

@keyframes shimmer {
  from {
    opacity: calc(var(--op) * 0.5);
  }

  to {
    opacity: var(--op);
  }
}

// The field is pure decoration — with reduced motion it holds still at its
// resting opacity rather than disappearing, so the composition is unchanged.
@media (prefers-reduced-motion: reduce) {
  .glyph {
    animation: none;
  }

  .glyph--rise {
    display: none;
  }
}
</style>
