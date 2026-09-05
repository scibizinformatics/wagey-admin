/**
 * Reading JSON out of localStorage without letting it take the app down.
 *
 * `JSON.parse` throws on malformed input, and localStorage is full of values
 * this app did not necessarily write: keys left behind by older builds, a value
 * a developer edited by hand in DevTools, a half-written entry from a tab that
 * was closed mid-write. The trap is narrower than it looks, because the two
 * obvious defences do not cover it:
 *
 *   JSON.parse(localStorage.getItem('user'))          // getItem → null is fine
 *                                                     // (JSON.parse(null) is null)
 *   JSON.parse(localStorage.getItem('user') || '{}')  // guards a *missing* key,
 *                                                     // not a malformed one
 *
 * Neither survives the literal string `"undefined"` — which is exactly what
 * `localStorage.setItem(k, JSON.stringify(undefined))` writes, since
 * `JSON.stringify(undefined)` returns `undefined` and `setItem` stringifies it.
 * `JSON.parse("undefined")` throws.
 *
 * That mattered: an unguarded parse of the `user` key sat inside the Pinia auth
 * store's `state()`, which runs in the `auth` boot file. A throw there meant the
 * app never mounted — on every reload, with no UI left to log out from, so the
 * only way back was clearing site data from DevTools. The same parse sat at the
 * top level of `AttendancePage.vue`'s setup, where it blanked that page.
 *
 * `readStoredJson` is the answer to both, and to the thirteen other parse sites
 * that each hand-rolled their own try/catch. It never throws: a missing,
 * malformed or wrong-shaped value yields the fallback.
 */

/**
 * Parse a JSON string, or return `fallback`.
 *
 * Useful on its own for JSON that arrived in an API field rather than from
 * storage — several endpoints return a serialised array in a string column.
 *
 * @template T
 * @param {unknown} raw
 * @param {T} [fallback]
 * @returns {T|*}
 */
export function safeParseJson(raw, fallback = null) {
  if (typeof raw !== 'string' || raw === '') return fallback
  try {
    const parsed = JSON.parse(raw)
    // `JSON.parse('null')` is a successful parse of a useless value.
    return parsed === null ? fallback : parsed
  } catch {
    return fallback
  }
}

/**
 * Read one localStorage key and parse it as JSON, or return `fallback`.
 *
 * The storage read itself is wrapped too: `localStorage` throws on access in a
 * few real situations — Safari's private mode historically, and any embedding
 * where storage is blocked by policy — and a boot file is the worst place to
 * discover that.
 *
 * @template T
 * @param {string} key
 * @param {T} [fallback]
 * @returns {T|*}
 */
export function readStoredJson(key, fallback = null) {
  let raw
  try {
    raw = localStorage.getItem(key)
  } catch {
    return fallback
  }
  return safeParseJson(raw, fallback)
}

/**
 * Like `readStoredJson`, but insists on a plain object.
 *
 * For keys that hold a record — `user` being the one that caused the outage.
 * An array, a number or a bare string parses fine and then fails later at the
 * property access, which is a worse place to find out.
 *
 * @param {string} key
 * @param {object|null} [fallback]
 * @returns {object|null}
 */
export function readStoredObject(key, fallback = null) {
  const value = readStoredJson(key, null)
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  return fallback
}

/**
 * Write one localStorage key, or remove it when there is nothing to write.
 *
 * The other half of the problem `readStoredJson` exists for: the bad values it
 * defends against are ones this app wrote itself. `localStorage.setItem`
 * stringifies whatever it is given, so `setItem('company_id', undefined)`
 * stores the four-character string `"undefined"` — and a key holding
 * `"undefined"` is worse than a missing one, because every `if (!value)` guard
 * in the codebase treats it as present. `company_id` is read by
 * `resolvedCompanyId()`, so that one would have gone into request URLs as a
 * company called "undefined".
 *
 * Removing the key instead means the absent case is actually absent.
 *
 * @param {string} key
 * @param {unknown} value - null, undefined or '' removes the key
 */
export function writeStored(key, value) {
  try {
    if (value === null || value === undefined || value === '') {
      localStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, String(value))
  } catch (error) {
    console.warn(`[storage] could not write "${key}":`, error)
  }
}
