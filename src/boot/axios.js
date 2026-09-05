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

function isPublicRequest(config) {
  const url = config?.url || ''
  return PUBLIC_PATHS.some((path) => url.includes(path))
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
    let dataPreview = res.data
    if (typeof dataPreview === 'string' && dataPreview.length > 200) {
      dataPreview = dataPreview.slice(0, 200) + '...[truncated]'
    }
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
      console.error(
        '[axios error] status:',
        res.status,
        '| url:',
        req.url,
        '| method:',
        req.method,
        '\ndata:',
        dataPreview,
      )
    }

    if (res.status === 401 && !isPublicRequest(req) && !req._retriedAfterRefresh) {
      // One attempt per request. If the replay 401s too, the access token is not
      // what is wrong and retrying again would loop.
      req._retriedAfterRefresh = true
      try {
        const access = await requestRefresh()
        if (access) {
          // Drop the stale header rather than overwrite it — the request
          // interceptor reads the fresh token from the store on the way out.
          dropAuthHeader(req)
          return api(req)
        }
      } catch (refreshError) {
        console.warn(
          '[axios] token refresh failed:',
          refreshError?.response?.status ?? refreshError?.message,
        )
      }
      endSession(`401 from ${req.url}`)
    }

    return Promise.reject(error)
  },
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
