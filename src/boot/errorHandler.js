/**
 * Catches what Vue would otherwise only whisper into the console.
 *
 * Without this, an exception thrown while Vue is rendering — most often a
 * dereference of a payload field that turned out to be null inside a computed —
 * unmounts the component subtree, logs a stack trace, and stops. From the
 * person's side of the screen a panel, a tab, or an entire page simply goes
 * blank: no message, no fallback, nothing to report but "it disappeared". In a
 * payroll product that is the worst available failure mode, because a blank
 * total is indistinguishable from a zero one.
 *
 * There is no error-reporting service wired up, so what this can do is bounded:
 * make the failure *visible* and make the console trace complete enough to act
 * on. That is still the difference between a bug report that says "the dashboard
 * went blank" and one that names a component and a hook.
 *
 * Deliberately not doing:
 *   - Swallowing anything. Everything still reaches the console.
 *   - Retrying or re-rendering. The component state that threw is not
 *     trustworthy, and a retry loop on a render error is a spin.
 *   - Reporting cancelled requests. Axios rejects superseded requests by
 *     design (see the AbortController use in `usePayroll.js`), and those are
 *     bookkeeping, not faults.
 */
import { useToast } from 'src/composables/useToast'

// Vue passes a terse code for the lifecycle hook; these are the ones worth
// naming in a message a person might read out.
const HOOK_LABELS = {
  render: 'rendering',
  setup: 'setup',
  'render function': 'rendering',
  mounted: 'mount',
  updated: 'update',
  unmounted: 'unmount',
}

function isCancellation(err) {
  return (
    err?.name === 'CanceledError' ||
    err?.name === 'AbortError' ||
    err?.code === 'ERR_CANCELED'
  )
}

/** Best-effort component name, for the console line. */
function componentName(instance) {
  if (!instance) return 'unknown component'
  const options = instance.type ?? {}
  return options.name || options.__name || options.__file || 'anonymous component'
}

export default ({ app }) => {
  const toast = useToast()

  // Repeated identical messages collapse onto one card with a counter in
  // useToast, so a computed that throws once per row cannot bury the page.
  app.config.errorHandler = (err, instance, info) => {
    if (isCancellation(err)) return

    const where = HOOK_LABELS[info] || info || 'an unknown phase'
    console.error(
      `[vue error] ${componentName(instance)} threw during ${where}:`,
      err,
    )

    toast.error('Something on this page failed to load', {
      caption: 'The rest of the page still works. Reload to try again.',
      timeout: 8000,
    })
  }

  // Warnings are Vue's own diagnostics and are stripped from production
  // builds; leaving the default handler in place keeps them in dev where they
  // are useful and silent where they are not.
}
