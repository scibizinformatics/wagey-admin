/**
 * Swallows two classes of window-level noise that are not application bugs, so
 * that a real error in the console still means something.
 *
 * 1. Chrome extension message-channel rejections:
 *
 *      "A listener indicated an asynchronous response by returning true, but
 *       the message channel closed before a response was received"
 *
 *    Raised by external browser extensions whose onMessage listeners return
 *    `true` without ever calling sendResponse(). Nothing in this app can fix
 *    it at the source.
 *
 * 2. "ResizeObserver loop completed with undelivered notifications" (and the
 *    older "ResizeObserver loop limit exceeded"):
 *
 *    A browser notice that a resize callback settled its layout over more than
 *    one observation pass. Quasar's own QResizeObserver — behind QTable,
 *    QScrollArea, QSelect and QTabs — routinely does exactly that when a table
 *    or scroll area reflows, and the layout it lands on is correct. The
 *    notice arrives as a window `error` event, which means dev tooling treats
 *    it as a crash: webpack-dev-server was raising its full-screen overlay over
 *    a working page. The dev overlay is filtered in `quasar.config.js`
 *    (devServer.client.overlay.runtimeErrors); this keeps the console clean in
 *    every build.
 *
 * Both filters match on the exact message, so an unrelated error of the same
 * event type still reaches the console.
 */

const RESIZE_OBSERVER_NOISE = /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i

const EXTENSION_NOISE =
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received'

export default function suppressExtensionErrors() {
  if (typeof window === 'undefined') return

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason)
    if (msg.includes(EXTENSION_NOISE)) event.preventDefault()
  })

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || event.error?.message || ''
      if (RESIZE_OBSERVER_NOISE.test(msg)) {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    },
    true,
  )
}
