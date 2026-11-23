// src/boot/axios.js
import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { useAuthStore } from 'src/boot/auth'

// Dev:  empty string → Quasar proxy handles /api → https://staging.wageyapp.com
// Prod: full origin  → requests go directly to the API server
const baseURL =
  process.env.NODE_ENV === 'production'
    ? process.env.API_BASE_URL || 'https://staging.wageyapp.com'
    : ''

const api = axios.create({ baseURL })

// SimpleJWT's TokenRefreshView, verified against the backend: POST { refresh }
// answers { access }, plus a new { refresh } when the server has token rotation
// switched on. An expired refresh token comes back 401 `token_not_valid`.
// `/api` is already in devServer.proxy, so this needs no config change in dev.
const REFRESH_URL = '/api/token/refresh/'

// The endpoints reachable without a session. Everything else is refused before
// it leaves the browser when the store holds no token — see the request
// interceptor.
const PUBLIC_PATHS = [
  '/api/employee/login/',
  REFRESH_URL,
  '/user/forgot-password/',
  '/user/verify-otp/',
  '/user/reset-password/',
]

/**
 * The path component of a request URL, with or without an origin.
 *
 * `config.url` is normally a leading-slash path, but a caller may pass a full
 * URL, and `baseURL` is applied by axios separately. Parsing against a dummy
 * origin handles both; the split fallback covers a value `URL` rejects.
 */
function pathnameOf(url) {
  if (!url) return ''
  try {
    return new URL(url, 'http://relative.invalid').pathname
  } catch {
    return String(url).split(/[?#]/)[0]
  }
}

/**
 * Is this request allowed to go out with no session?
 *
 * The **pathname** must end with one of `PUBLIC_PATHS`, and the query string is
 * not part of what is matched.
 *
 * This used to be `PUBLIC_PATHS.some((path) => url.includes(path))`, run against
 * the raw URL. Two things were wrong with that: a request whose *query* happened
 * to carry a public path (`?next=/api/employee/login/`) was classified as public
 * — skipping both the no-session guard below and the 401-refresh branch, i.e.
 * steering the one code path that decides whether a person is still signed in
 * from a URL somebody else can write — and any path anywhere in the URL matched.
 *
 * A suffix, not an equality, on purpose: callers reach these endpoints through
 * the deprecated `BASE` re-export in `composables/utils/http.js`, which is the
 * full API origin in a production build, so `config.url` may be an absolute URL
 * (handled by parsing) and may carry a proxy prefix or a doubled slash if
 * `API_BASE_URL` has a trailing one. Equality would make `…//user/forgot-password/`
 * public-in-name-only and then reject the request locally with `ERR_NO_SESSION`
 * — a password reset that cannot be attempted.
 */
function isPublicRequest(config) {
  const pathname = pathnameOf(config?.url)
  return pathname ? PUBLIC_PATHS.some((path) => pathname.endsWith(path)) : false
}

/**
 * The human-readable part of an error body, if it has one.
 *
 * Accepts a bare string too (Django's own 404 page, a plain-text refusal) but
 * truncates it: the point is to name the failure, not to paste a response body
 * into a console somebody is about to screenshot.
 */
function messageFrom(data) {
  if (typeof data === 'string') return data.slice(0, 200)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const message = data.detail ?? data.message ?? data.error
  if (typeof message === 'string') return message.slice(0, 200)
  // A DRF validation body is an object of field → [errors]. The field names are
  // enough to place the failure; the values are exactly what must not be logged.
  const fields = Object.keys(data)
  return fields.length ? `fields: ${fields.join(', ')}` : null
}

// Axios v1 hands the interceptor an AxiosHeaders instance on the way out but a
// plain object on a config the caller built by hand, and only one of the two
// has `.get` / `.delete`.
function readAuthHeader(config) {
  const headers = config?.headers
  if (!headers) return null
  if (typeof headers.get === 'function') return headers.get('Authorization') || null
  return headers.Authorization || null
}

function dropAuthHeader(config) {
  const headers = config?.headers
  if (!headers) return
  if (typeof headers.delete === 'function') headers.delete('Authorization')
  else delete headers.Authorization
}

// Read Django's csrftoken cookie
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

api.interceptors.request.use((config) => {
  const authStore = useAuthStore()

  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  } else if (!isPublicRequest(config) && !readAuthHeader(config)) {
    // Refuse to send it. A request with no Authorization header is answered by
    // DRF with "Authentication credentials were not provided" — an error that
    // reads like a backend fault when it only ever means the session ended on
    // this side. Worse, it arrives once per queued request: EmployeesPage walks
    // its roster in batches of twenty, so a session ending mid-page produced a
    // screenful of them and not one named the real failure.
    //
    // Shaped like an axios error — it carries `config`, and
    // `extractErrorMessage` renders `ERR_NO_SESSION` as a session message — so
    // existing catch blocks need no change.
    const error = new Error('Your session has ended. Please sign in again.')
    error.code = 'ERR_NO_SESSION'
    error.config = config
    return Promise.reject(error)
  }

  // Attach CSRF token for all mutating requests
  const method = (config.method || '').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken()
    if (csrf) {
      config.headers['X-CSRFToken'] = csrf
    }
  }

  // Dev only, and without the token.
  //
  // This used to log `tokenPreview: <first 30 chars of the bearer token>` on
  // every single request, in every build — bearer material should not be
  // printable at all, and a browser console is copied into bug reports and
  // screen shares. Whether the header is present is the only part that was ever
  // useful for debugging, so that is all that is left.
  if (process.env.NODE_ENV !== 'production') {
    console.log('[axios request]', config.method?.toUpperCase(), config.url, {
      authorization: config.headers.Authorization ? 'present' : 'MISSING',
    })
  }

  return config
})

// ── Session refresh ─────────────────────────────────────────────────────────
//
// A second, interceptor-free instance. Refreshing through `api` would send the
// refresh call back through the 401 handler below, and an expired refresh token
// would then recurse until the stack gave out.
const authClient = axios.create({ baseURL })

let refreshInFlight = null

async function refreshAccessToken() {
  const authStore = useAuthStore()
  const refresh = authStore.refreshToken
  if (!refresh) return null

  const response = await authClient.post(REFRESH_URL, { refresh })
  const access = response.data?.access ?? null
  if (!access) return null

  authStore.setToken(access)
  // Keep whichever refresh token the server just handed back: under
  // ROTATE_REFRESH_TOKENS the one we sent is now spent, and reusing it fails the
  // *next* refresh — i.e. it would end the session an hour later, well away from
  // anything that would explain why.
  if (response.data?.refresh) authStore.setRefreshToken(response.data.refresh)
  return access
}

function requestRefresh() {
  // One refresh for the whole wave. Parallel requests 401 together — that is
  // exactly the case this came from — and each firing its own refresh would
  // spend the token N times over, so all but the first would fail under
  // rotation and end the session anyway.
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

let sessionEnding = false

/**
 * End the session and actually get the person back to the login screen.
 *
 * The line this replaces was `window.location.href = '/#/login'`, which does not
 * do that. From `…/#/app/employees` it changes only the fragment, so the browser
 * performs a same-document hash navigation and never reloads: the store had been
 * cleared one line earlier, but the SPA kept running and every request already
 * queued went out unauthenticated. Reloading tears the app down for real, and
 * the redirect query brings the person back to the page they were on once they
 * sign in again.
 */
function endSession(reason) {
  if (sessionEnding || typeof window === 'undefined') return
  sessionEnding = true
  console.warn('[axios] session ended —', reason)

  try {
    useAuthStore().clearToken()
  } catch (error) {
    // Pinia may already be torn down. The reload below clears memory regardless.
    console.warn('[axios] could not clear the auth store:', error)
  }

  const here = window.location.hash.replace(/^#/, '')
  window.location.hash =
    here && !here.startsWith('/login') ? `#/login?redirect=${encodeURIComponent(here)}` : '#/login'
  window.location.reload()
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const req = error.config || {}
    const res = error.response || {}
    // Only the server's own error text is logged, never `res.data`.
    //
    // A failing response body is whatever the endpoint was returning, and on
    // this product that means review rows carrying salary, contributions and
    // employee names. `console.error` is deliberately kept in the production
    // bundle, so the old line put that body into the console of a real signed-in
    // session and into every screenshot attached to a bug report. `detail` /
    // `message` / `error` is the part the server wrote for a person to read.
    const serverMessage = messageFrom(res.data)
    // Some endpoints answer a question rather than fail: `active-contract`
    // returns 404 for "this employee has no active contract", and the attendance
    // audit trail returns 404 for "nothing recorded against this punch yet".
    // Those are results, not errors, and logging them buried the genuine
    // failures — one page of contractless employees produced a screenful of red.
    // A caller opts out per request with `expectedStatuses: [404]`; the promise
    // still rejects, so the caller's own handling is unchanged.
    const expected = req.expectedStatuses
    const isExpected = Array.isArray(expected) && expected.includes(res.status)
    if (!isExpected) {
      const parts = [
        '[axios error] status:',
        res.status,
        '| url:',
        req.url,
        '| method:',
        req.method,
      ]
      if (serverMessage) parts.push(`\nmessage: ${serverMessage}`)
      console.error(...parts)
    }

    if (res.status === 401 && !isPublicRequest(req) && !req._retriedAfterRefresh) {
      // One attempt per request. If the replay 401s too, the access token is not
      // what is wrong and retrying again would loop.
      req._retriedAfterRefresh = true
      let refreshError = null
      let access = null
      try {
        access = await requestRefresh()
        if (access) {
          // Drop the stale header rather than overwrite it — the request
          // interceptor reads the fresh token from the store on the way out.
          dropAuthHeader(req)
          return api(req)
        }
      } catch (error) {
        refreshError = error
      }
      // Only a genuine auth rejection ends the session: the refresh endpoint
      // itself answering 401/403 (the token is truly dead), or there being no
      // refresh token at all. A transient failure while refreshing — network
      // down, backend restarting, 5xx, 429 — means the token is still valid,
      // so keep the session and let this request fail like any other retryable
      // error. Ending it there would log everyone out over a blip.
      const status = refreshError?.response?.status
      const authRejected = status === 401 || status === 403 || refreshError === null
      if (authRejected) {
        endSession(`401 from ${req.url}`)
      } else {
        console.warn('[axios] refresh failed, keeping session:', status ?? refreshError?.message)
      }
    }

    return Promise.reject(error)
  },
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
