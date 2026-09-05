/**
 * Routes every notification in the app through the custom toast host
 * (`components/common/AppToast.vue` + `composables/useToast.js`).
 *
 * This started as a compatibility shim for ~270 legacy `$q.notify(...)` calls.
 * Those have all been converted to `useToast()` — there are zero `$q.notify`
 * call sites left in `src/` — so nothing in the app depends on it any more.
 *
 * It stays as a backstop, not as a migration path. Quasar's Notify plugin is
 * still registered (`quasar.config.js` → framework.plugins) because QDialog and
 * friends want it present, which means `$q.notify` remains callable; if anyone
 * reaches for it again, or a Quasar internal does, this guarantees the result is
 * still our top-center toast rather than Quasar's own Material snackbar. The
 * option shape it understands is Quasar's (type/message/caption/icon/timeout/
 * actions), and `position` is deliberately ignored.
 *
 * Write `toast.success(...)` / `.error(...)` / `.warning(...)` / `.info(...)` /
 * `.loading(...)` in new code. Do not add `$q.notify` calls back.
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
