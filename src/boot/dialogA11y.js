/**
 * Clears the Chrome warning:
 *
 *   "Blocked aria-hidden on an element because its descendant retained focus."
 *
 * Quasar renders every QDialog backdrop with a hardcoded `aria-hidden="true"`
 * *and* `tabindex="-1"` (see QDialog.js's backdrop vnode). Browsers focus a
 * `tabindex="-1"` element on mousedown, so clicking the backdrop — routine on a
 * `persistent` dialog, where the click shakes the card instead of closing it —
 * parks focus on an aria-hidden node, and Chrome refuses to apply the
 * aria-hidden until focus moves away.
 *
 * The backdrop has no reason to hold focus: Quasar drives the dismiss/shake off
 * its own `onClick`, which still fires. Suppressing only the default mousedown
 * focus leaves that behaviour untouched, and keeps focus inside the dialog where
 * it belongs.
 */

export default function dialogA11y() {
  if (typeof window === 'undefined') return

  document.addEventListener(
    'mousedown',
    (event) => {
      const el = event.target
      if (el instanceof Element && el.classList.contains('q-dialog__backdrop')) {
        event.preventDefault()
      }
    },
    true,
  )
}
