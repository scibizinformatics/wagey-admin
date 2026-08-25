/**
 * Routes every notification in the app through the custom toast host
 * (`components/common/AppToast.vue` + `composables/useToast.js`).
 *
 * There are ~270 existing `$q.notify(...)` call sites spread over pages and
 * composables. Rather than rewrite each one, this boot file swaps Quasar's
 * Notify implementation for ours: the option shape callers already pass
 * (type/message/caption/icon/timeout/actions) is understood by `notify()`, and
 * `position` is deliberately ignored so every toast appears top-center.
 *
 * New code should prefer `useToast()` directly — `$q.notify` stays wired up only
 * so legacy call sites keep working.
 */
import { Notify } from 'quasar'
import { notify } from 'src/composables/useToast'

export default ({ app }) => {
  // Quasar hangs these helpers off the notify function itself; keep them present
  // as no-ops so any stray call does not throw once the function is replaced.
  notify.setDefaults = () => {}
  notify.registerType = () => {}

  // `Notify.create` is what the plugin exposes to direct importers…
  Notify.create = notify
  Notify.setDefaults = () => {}
  Notify.registerType = () => {}

  // …and `$q.notify` is a separate reference captured when the plugin installed,
  // so it has to be replaced on the shared `$q` object too. `useQuasar()` and
  // `this.$q` both resolve to this same object.
  const $q = app.config.globalProperties.$q
  if ($q) $q.notify = notify
}
