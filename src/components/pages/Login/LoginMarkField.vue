<template>
  <!--
    A depth field of drifting Wagey marks. Decorative and pointer-transparent;
    it sits inside the stage, so the sign-in card always occludes it.

    What keeps this from looking like clip-art scattered on a page:

    1. Three depth tiers. Size, opacity, blur and glow all move together — small
       + faint + blurred reads as far away, large + bright + sharp + glowing
       reads as near. That single correlation is what turns 18 copies of one
       glyph into a space rather than a rash of stickers.
    2. No two glyphs share a rhythm. Every one carries its own duration, and a
       NEGATIVE delay so it starts mid-phase. Without that they all rise and fall
       on the same beat and the whole field pulses like one object.
    3. Three motion paths, not one. Most glyphs bob or sway in place; a few rise
       slowly through the whole viewport, fading in and out at the ends, so the
       scene has traffic through it rather than just wobble.
    4. Positions are hand-placed, not random — they frame the card and stay out
       of the centre column. Random placement clumps, and re-randomising on each
       mount would make the page look different every visit for no reason.
    5. The glyphs are lit, not grey. The near tier carries a soft indigo glow, so
       a mark reads as a luminous brand object catching the stage light instead
       of a smudge sitting on top of the gradient.
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

// `tier` drives blur and glow (see the style block); `motion` picks the keyframe
// path. `rise` glyphs ignore `y` — they cross the full viewport from below.
const glyphs = [
  // ── far: small, soft, barely there ─────────────────────────────────────────
  { x: '8%', y: '17%', size: 8, op: 0.1, tier: 'far', motion: 'bob', dur: 12, delay: 2 },
  { x: '23%', y: '63%', size: 8, op: 0.09, tier: 'far', motion: 'sway', dur: 15, delay: 6 },
  { x: '73%', y: '21%', size: 9, op: 0.1, tier: 'far', motion: 'bob', dur: 13, delay: 9 },
  { x: '91%', y: '71%', size: 8, op: 0.09, tier: 'far', motion: 'sway', dur: 17, delay: 3 },
  { x: '45%', y: '6%', size: 7, op: 0.085, tier: 'far', motion: 'bob', dur: 14, delay: 11 },
  { x: '63%', y: '90%', size: 9, op: 0.1, tier: 'far', motion: 'sway', dur: 16, delay: 5 },

  // ── mid ───────────────────────────────────────────────────────────────────
  { x: '14%', y: '39%', size: 13, op: 0.17, tier: 'mid', motion: 'sway', dur: 19, delay: 7 },
  { x: '30%', y: '12%', size: 11, op: 0.15, tier: 'mid', motion: 'bob', dur: 17, delay: 13 },
  { x: '83%', y: '43%', size: 14, op: 0.18, tier: 'mid', motion: 'bob', dur: 21, delay: 4 },
  { x: '68%', y: '68%', size: 12, op: 0.16, tier: 'mid', motion: 'sway', dur: 18, delay: 15 },
  { x: '5%', y: '83%', size: 12, op: 0.16, tier: 'mid', motion: 'bob', dur: 20, delay: 8 },
  { x: '38%', y: '88%', size: 10, op: 0.14, tier: 'mid', motion: 'sway', dur: 23, delay: 19 },

  // ── near: large, bright, glowing ──────────────────────────────────────────
  { x: '18%', y: '77%', size: 21, op: 0.24, tier: 'near', motion: 'sway', dur: 24, delay: 10 },
  { x: '88%', y: '12%', size: 18, op: 0.22, tier: 'near', motion: 'bob', dur: 22, delay: 17 },
  { x: '78%', y: '87%', size: 17, op: 0.2, tier: 'near', motion: 'sway', dur: 26, delay: 6 },

  // ── rising through the scene ──────────────────────────────────────────────
  { x: '33%', y: '50%', size: 15, op: 0.2, tier: 'near', motion: 'rise', dur: 28, delay: 4 },
  { x: '59%', y: '50%', size: 11, op: 0.15, tier: 'mid', motion: 'rise', dur: 34, delay: 18 },
  { x: '10%', y: '50%', size: 16, op: 0.22, tier: 'near', motion: 'rise', dur: 31, delay: 22 },
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
// Only the near tier pays for a drop-shadow; at far and mid sizes the glow would
// be invisible and it is the most expensive part of the filter to composite.
.glyph--far {
  filter: blur(0.7px);
}

.glyph--mid {
  filter: blur(0.3px);
}

.glyph--near {
  filter: drop-shadow(0 0 9px rgba(126, 158, 255, 0.55));
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
    transform: translate3d(0, -16px, 0) rotate(5deg);
  }
}

@keyframes sway {
  from {
    transform: translate3d(-10px, 6px, 0) rotate(5deg);
  }
  to {
    transform: translate3d(12px, -14px, 0) rotate(-7deg);
  }
}

@keyframes rise {
  0% {
    transform: translate3d(0, 62vh, 0) rotate(-10deg);
    opacity: 0;
  }
  16% {
    opacity: var(--op);
  }
  84% {
    opacity: var(--op);
  }
  100% {
    transform: translate3d(20px, -62vh, 0) rotate(10deg);
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

// Smaller and calmer on a phone: the card takes most of the screen, so a busy
// field would just crowd its edges.
@media (max-width: 700px) {
  .glyph {
    width: calc(var(--size) * 0.75);
  }

  .glyph--rise {
    display: none;
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
