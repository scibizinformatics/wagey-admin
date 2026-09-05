// src/utils/http.js
//
// `extractErrorMessage` is the reason to import from here — it is the app-wide
// error formatter and every catch block should use it.
//
// `api` is re-exported for convenience only; prefer `import { api } from
// 'boot/axios'` in new code. `BASE` is legacy: the axios instance already has a
// baseURL, so `${BASE}/path` and `/path` resolve identically, and new call sites
// should just use the path.
//
// `authHeaders()` used to live here too. It read the access token straight out
// of localStorage and returned an Authorization header, which made it a second
// source of truth for credentials alongside the Pinia auth store — and one that
// diverged after logout, when the store is cleared but localStorage may not be.
// The request interceptor in boot/axios.js is now the only thing that
// authenticates a request. All 140-odd call sites were removed and the function
// deleted; don't reintroduce it.

import { api } from 'boot/axios'

export { api }

/**
 * @deprecated Use `api` from 'boot/axios' instead.
 */
export const BASE =
  process.env.NODE_ENV === 'production'
    ? process.env.API_BASE_URL || 'https://staging.wageyapp.com'
    : ''

/**
 * A message worth showing a person, out of an axios error.
 *
 * DRF hands back JSON, but an unhandled exception on the server hands back
 * Django's HTML error page instead — and the `typeof data === 'string' ? data`
 * pattern this replaces put that entire `<!doctype html>…</html>` document into
 * a toast. An HTML body carries nothing a reader can act on, so it is dropped in
 * favour of the status code, which at least says whose problem it is.
 *
 * `fallback` should name the action that failed, e.g. 'Failed to record
 * attendance'.
 */
export function extractErrorMessage(error, fallback = 'Something went wrong') {
  // Raised by the request interceptor when the session has ended, before the
  // request is sent — so there is no response to read a message out of, and the
  // action the caller names in `fallback` is not what failed.
  if (error?.code === 'ERR_NO_SESSION') {
    return error.message || 'Your session has ended. Please sign in again.'
  }

  const response = error?.response
  const data = response?.data

  const asText = (value) => {
    if (Array.isArray(value)) {
      const joined = value.filter((v) => typeof v === 'string').join(' ')
      return joined.trim() || null
    }
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  if (data && typeof data === 'object') {
    const named =
      asText(data.reason) ??
      asText(data.detail) ??
      asText(data.message) ??
      asText(data.error) ??
      asText(data.non_field_errors)
    if (named) return named

    // A per-field validation error — {"time_in": ["This field is required."]}.
    // The first one is enough; the form shows the rest.
    for (const value of Object.values(data)) {
      const text = asText(value)
      if (text) return text
    }
  }

  const text = asText(data)
  // Django's 500 page, a proxy's gateway page, an SPA index.html served in place
  // of an API route — all arrive as markup, none of them are a message.
  const looksLikeMarkup = text ? /^\s*<(?:!doctype|html|\?xml)\b/i.test(text) : false
  if (text && !looksLikeMarkup && text.length <= 300) return text

  const status = response?.status
  if (status >= 500) {
    return `The server hit an error (${status}). This is a fault on the server rather than in what you entered — try again, and report it if it keeps happening.`
  }
  if (status) return `${fallback} (${status})`
  if (error?.message === 'Network Error') {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return fallback
}
