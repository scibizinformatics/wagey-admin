<template>
  <Teleport to="body">
    <div class="wg-toast-viewport" aria-live="polite" aria-relevant="additions">
      <TransitionGroup name="wg-toast" tag="div" class="wg-toast-stack">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="wg-toast"
          :class="`wg-toast--${toast.type}`"
          role="alert"
          @mouseenter="pauseAll"
          @mouseleave="resumeAll"
        >
          <span class="wg-toast__glyph">
            <span v-if="toast.type === 'loading'" class="wg-toast__spinner" />
            <i v-else class="material-icons-outlined">{{ toast.icon || GLYPHS[toast.type] }}</i>
          </span>

          <div class="wg-toast__body">
            <div class="wg-toast__title">
              <span>{{ toast.message }}</span>
              <span v-if="toast.count > 1" class="wg-toast__count">{{ toast.count }}</span>
            </div>
            <div v-if="toast.caption" class="wg-toast__caption">{{ toast.caption }}</div>
            <div v-if="toast.actions.length" class="wg-toast__actions">
              <button
                v-for="(action, i) in toast.actions"
                :key="i"
                type="button"
                class="wg-toast__action"
                @click="runAction(toast, action)"
              >
                {{ action.label }}
              </button>
            </div>
          </div>

          <button
            type="button"
            class="wg-toast__close"
            aria-label="Dismiss notification"
            @click="dismiss(toast.id)"
          >
            <i class="material-icons-outlined">close</i>
          </button>

          <!-- Depleting rail doubles as the countdown; it pauses with the timer on
               hover. Keying on `count` re-creates the element when a duplicate
               message bumps the counter, so the rail restarts with the timer. -->
          <span v-if="toast.timeout" class="wg-toast__rail">
            <span
              :key="toast.count"
              class="wg-toast__rail-fill"
              :style="{
                animationDuration: `${toast.timeout}ms`,
                animationPlayState: toast.paused ? 'paused' : 'running',
              }"
            />
          </span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * Toast host. Mounted once in `App.vue`; renders the shared queue from
 * `useToast()`, which also backs every legacy `$q.notify` call — see
 * `src/boot/toast.js`. Always top-center, newest card closest to the top edge.
 */
import { useToast } from 'src/composables/useToast'

const { toasts, dismiss, pauseAll, resumeAll } = useToast()

const GLYPHS = {
  success: 'check_circle',
  error: 'error_outline',
  warning: 'warning_amber',
  info: 'info',
  loading: 'sync',
}

function runAction(toast, action) {
  if (typeof action.handler === 'function') action.handler()
  if (action.dismiss) dismiss(toast.id)
}
</script>

<style scoped>
.wg-toast-viewport {
  position: fixed;
  top: 18px;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.wg-toast-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(420px, calc(100vw - 32px));
}

.wg-toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 12px 12px 12px 13px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  box-shadow:
    0 1px 2px rgba(16, 35, 53, 0.04),
    0 10px 28px -12px rgba(16, 35, 53, 0.22);
  overflow: hidden;
  pointer-events: auto;
}

/* Icon chip — the only place the type colour appears at full strength. */
.wg-toast__glyph {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
.wg-toast__glyph .material-icons-outlined {
  font-size: 17px;
  line-height: 1;
}

.wg-toast__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}
.wg-toast__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.35;
  color: #111827;
  letter-spacing: -0.005em;
  word-break: break-word;
}
.wg-toast__count {
  flex: 0 0 auto;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 17px;
  text-align: center;
}
.wg-toast__caption {
  font-size: 12.5px;
  line-height: 1.45;
  color: #6b7280;
  word-break: break-word;
}

.wg-toast__actions {
  display: flex;
  gap: 6px;
  margin-top: 7px;
}
.wg-toast__action {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 7px;
  padding: 4px 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}
.wg-toast__action:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.wg-toast__close {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border: none;
  background: transparent;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  cursor: pointer;
  opacity: 0.65;
  transition:
    opacity 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}
.wg-toast__close .material-icons-outlined {
  font-size: 15px;
}
.wg-toast:hover .wg-toast__close {
  opacity: 1;
}
.wg-toast__close:hover {
  background: #f3f4f6;
  color: #4b5563;
}

.wg-toast__rail {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: #f1f2f4;
}
.wg-toast__rail-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  animation-name: wg-toast-deplete;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes wg-toast-deplete {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* ── Type variants ──────────────────────────────────────────────────────── */
.wg-toast--success .wg-toast__glyph {
  background: #e8f7f0;
  color: #0f9d63;
}
.wg-toast--success .wg-toast__rail-fill {
  background: #10b981;
}

.wg-toast--error .wg-toast__glyph {
  background: #fdecec;
  color: #dc2626;
}
.wg-toast--error .wg-toast__rail-fill {
  background: #ef4444;
}

.wg-toast--warning .wg-toast__glyph {
  background: #fef4e4;
  color: #c2740a;
}
.wg-toast--warning .wg-toast__rail-fill {
  background: #f59e0b;
}

.wg-toast--info .wg-toast__glyph {
  background: #e8f0fe;
  color: #2563eb;
}
.wg-toast--info .wg-toast__rail-fill {
  background: #2563eb;
}

.wg-toast--loading .wg-toast__glyph {
  background: #f3f4f6;
  color: #4b5563;
}
.wg-toast--loading .wg-toast__rail-fill {
  background: #9ca3af;
}

.wg-toast__spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #d8dbe0;
  border-top-color: #4b5563;
  animation: wg-toast-spin 0.7s linear infinite;
}
@keyframes wg-toast-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Motion: drop in from the top edge, settle with a soft overshoot ─────── */
.wg-toast-enter-from {
  opacity: 0;
  transform: translateY(-14px) scale(0.96);
}
.wg-toast-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.34s cubic-bezier(0.22, 1.12, 0.36, 1);
}
.wg-toast-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
  position: absolute;
  left: 0;
  right: 0;
}
.wg-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}
.wg-toast-move {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (max-width: 599px) {
  .wg-toast-viewport {
    top: 12px;
  }
  .wg-toast-stack {
    width: calc(100vw - 24px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wg-toast-enter-active,
  .wg-toast-leave-active,
  .wg-toast-move {
    transition-duration: 0.01ms;
  }
  .wg-toast__spinner {
    animation-duration: 2s;
  }
}
</style>
