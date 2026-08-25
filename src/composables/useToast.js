/**
 * Application-wide toast notifications.
 *
 * A single module-level queue drives the `<AppToast />` host that is mounted
 * once in `App.vue`, so any file — page, component, composable or plain module —
 * can raise a toast without needing a Quasar instance:
 *
 *   import { useToast } from 'src/composables/useToast'
 *   const toast = useToast()
 *   toast.success('Employee saved', { caption: 'Changes are live' })
 *
 * Legacy `$q.notify(...)` calls keep working: `src/boot/toast.js` replaces
 * Quasar's Notify implementation with `notify()` below, which understands
 * Quasar's option shape (type/message/caption/icon/timeout/actions). Every
 * toast is rendered top-center regardless of the `position` a caller passes.
 */
import { ref } from 'vue'

// Only this many toasts stay on screen; older ones are retired as new ones land
// so a failing loop cannot bury the page under a column of cards.
const MAX_VISIBLE = 4
const DEFAULT_TIMEOUT = 3500

// Quasar's Notify `type` values mapped onto our visual variants.
const TYPE_ALIASES = {
  positive: 'success',
  success: 'success',
  negative: 'error',
  error: 'error',
  warning: 'warning',
  warn: 'warning',
  info: 'info',
  ongoing: 'loading',
  loading: 'loading',
}

const toasts = ref([])
const timers = new Map()
let seq = 0

function normalizeType(type) {
  return TYPE_ALIASES[type] || 'info'
}

/** Quasar allows `notify('some message')`; accept that plus the object form. */
function normalizeOptions(input) {
  const opts = typeof input === 'string' ? { message: input } : { ...(input || {}) }
  const type = opts.spinner ? 'loading' : normalizeType(opts.type)

  // `html: true` callers pass markup; render it as text rather than injecting it.
  const message = String(opts.message ?? opts.title ?? '')
  const caption = opts.caption ? String(opts.caption) : ''

  // A loading toast has no natural end, so it stays until dismissed explicitly.
  let timeout = opts.timeout
  if (timeout === undefined || timeout === null) timeout = type === 'loading' ? 0 : DEFAULT_TIMEOUT
  timeout = Number(timeout)
  if (!Number.isFinite(timeout) || timeout < 0) timeout = DEFAULT_TIMEOUT

  return {
    type,
    message,
    caption,
    timeout,
    icon: opts.icon || '',
    actions: (opts.actions || [])
      .filter((a) => a && (a.label || a.icon))
      .map((a) => ({ label: a.label || '', handler: a.handler, dismiss: a.dismiss !== false })),
  }
}

function clearTimer(id) {
  const timer = timers.get(id)
  if (timer?.handle) clearTimeout(timer.handle)
  timers.delete(id)
}

function startTimer(id, duration) {
  clearTimer(id)
  if (!duration) return
  timers.set(id, {
    handle: setTimeout(() => dismiss(id), duration),
    remaining: duration,
    startedAt: Date.now(),
  })
}

function dismiss(id) {
  clearTimer(id)
  const index = toasts.value.findIndex((t) => t.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

function clear() {
  toasts.value.forEach((t) => clearTimer(t.id))
  toasts.value = []
}

/**
 * Freeze the countdown of every visible toast — used while the pointer rests on
 * the stack so a message is never yanked away mid-read.
 */
function pauseAll() {
  toasts.value.forEach((toast) => {
    if (toast.paused || !toast.timeout) return
    const timer = timers.get(toast.id)
    if (!timer) return
    clearTimeout(timer.handle)
    timer.remaining = Math.max(200, timer.remaining - (Date.now() - timer.startedAt))
    timer.handle = null
    toast.paused = true
  })
}

function resumeAll() {
  toasts.value.forEach((toast) => {
    if (!toast.paused) return
    const timer = timers.get(toast.id)
    toast.paused = false
    if (!timer) return
    timer.startedAt = Date.now()
    timer.handle = setTimeout(() => dismiss(toast.id), timer.remaining)
  })
}

/**
 * Raise a toast. Returns a function that dismisses it, matching the contract of
 * Quasar's `Notify.create` so existing `const done = $q.notify(...)` code holds.
 */
function notify(input) {
  const opts = normalizeOptions(input)
  if (!opts.message && !opts.caption) return () => {}

  // Repeated identical messages (a save that fails per-row, say) collapse onto
  // one card with a counter instead of stacking duplicates.
  const duplicate = toasts.value.find(
    (t) => t.type === opts.type && t.message === opts.message && t.caption === opts.caption,
  )
  if (duplicate) {
    duplicate.count += 1
    duplicate.paused = false
    startTimer(duplicate.id, duplicate.timeout)
    return () => dismiss(duplicate.id)
  }

  const toast = { id: ++seq, count: 1, paused: false, ...opts }

  // Newest first: the stack grows downward from the top edge of the viewport.
  toasts.value.unshift(toast)
  while (toasts.value.length > MAX_VISIBLE) {
    dismiss(toasts.value[toasts.value.length - 1].id)
  }

  startTimer(toast.id, toast.timeout)
  return () => dismiss(toast.id)
}

function withType(type) {
  return (message, options = {}) => notify({ ...options, message, type })
}

export function useToast() {
  return {
    toasts,
    notify,
    success: withType('success'),
    error: withType('error'),
    warning: withType('warning'),
    info: withType('info'),
    loading: withType('loading'),
    dismiss,
    clear,
    pauseAll,
    resumeAll,
  }
}

export { toasts, notify, dismiss, clear, pauseAll, resumeAll }
