/**
 * Suppresses the well-known Chrome extension console noise that leaks into the
 * host application:
 *
 *   "A listener indicated an asynchronous response by returning true, but the
 *    message channel closed before a response was received"
 *
 * This is not a bug in the application; it comes from external browser
 * extensions whose onMessage listeners return `true` without calling
 * sendResponse(). We simply swallow the unhandled rejection so it does not
 * pollute the DevTools console.
 */

export default function suppressExtensionErrors() {
  if (typeof window === 'undefined') return

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason)
    if (
      msg.includes(
        'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received'
      )
    ) {
      event.preventDefault()
    }
  })
}
