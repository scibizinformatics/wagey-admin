// Defines `useAuthStore`. Note the path: this is `src/boot/auth.js`, not
// `src/stores/auth.js` — which does not exist. Import it as
// `import { useAuthStore } from 'src/boot/auth'`.
import { defineStore } from 'pinia'
import { readStoredObject } from 'src/composables/utils/storage'

const TOKEN_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'
const USER_KEY = 'user'

function readStoredString(key) {
  try {
    return localStorage.getItem(key) || null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  /**
   * Rehydrated from localStorage, defensively.
   *
   * `state()` runs while the `auth` boot file is executing — before `axios`'s
   * interceptors, which read this store, and before anything is mounted. A
   * throw here therefore does not degrade a feature; it stops the app from
   * booting at all, on every reload, with no UI left to log out from. The only
   * way out was clearing site data from DevTools.
   *
   * The previous line was `JSON.parse(localStorage.getItem('user')) || null`.
   * `JSON.parse(null)` is safe, so the empty case worked and hid the problem —
   * but any malformed value threw, and the literal string `"undefined"` is a
   * value this store could write itself (see `setAuth`). `readStoredObject`
   * cannot throw and rejects a value that is not a plain object, so a bad `user`
   * key now means "not logged in" instead of "app is bricked".
   */
  state: () => ({
    token: readStoredString(TOKEN_KEY),
    /**
     * The long-lived half of the SimpleJWT pair. It lives here rather than in a
     * loose localStorage key because it is credential material and the rest of
     * the app is forbidden from reading storage for credentials — the axios
     * response interceptor spends it, and nothing else should touch it. The key
     * name is unchanged from when `LoginForm` wrote it directly, so sessions
     * that predate the store keep working.
     */
    refreshToken: readStoredString(REFRESH_KEY),
    user: readStoredObject(USER_KEY),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    canRefresh: (state) => !!state.refreshToken,
  },

  actions: {
    /**
     * @param {string} token
     * @param {object} user
     */
    setAuth(token, user) {
      this.token = token
      this.user = user && typeof user === 'object' ? user : null
      this.persist()
    },

    setToken(newToken) {
      this.token = newToken
      this.persist()
    },

    /**
     * Null-ish is a legitimate argument: the login response does not always
     * carry a refresh token, and `persist()` removes the key rather than
     * writing a value it could not read back.
     */
    setRefreshToken(newRefreshToken) {
      this.refreshToken = newRefreshToken || null
      this.persist()
    },

    /**
     * The other half of the fix for the boot crash above: never write a value
     * this store cannot read back.
     *
     * `JSON.stringify(undefined)` returns `undefined`, and
     * `localStorage.setItem(key, undefined)` stores the *string* `"undefined"` —
     * which `JSON.parse` then throws on. One `setAuth(token, undefined)` was
     * enough to make every subsequent boot fail. A null-ish user removes the
     * key rather than serialising it.
     */
    persist() {
      try {
        if (this.token) localStorage.setItem(TOKEN_KEY, this.token)
        else localStorage.removeItem(TOKEN_KEY)

        if (this.refreshToken) localStorage.setItem(REFRESH_KEY, this.refreshToken)
        else localStorage.removeItem(REFRESH_KEY)

        if (this.user && typeof this.user === 'object') {
          localStorage.setItem(USER_KEY, JSON.stringify(this.user))
        } else {
          localStorage.removeItem(USER_KEY)
        }
      } catch (error) {
        // Storage full, or blocked by policy. The in-memory session still works
        // for this tab; it just will not survive a reload.
        console.warn('[auth] could not persist the session:', error)
      }
    },

    clearToken() {
      this.token = null
      this.refreshToken = null
      this.user = null
      this.persist()
    },
  },
})
