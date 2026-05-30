// src/utils/http.js
// NOTE: Prefer importing { api } from 'boot/axios' directly in your components.
// This file exists only for legacy compatibility. Do not use BASE or authHeaders
// for new code — the axios interceptor in boot/axios.js handles auth automatically.

import { api } from 'boot/axios'

export { api }

/**
 * @deprecated No longer needed — the axios interceptor in `boot/axios.js`
 * automatically attaches the Authorization header from the Pinia auth store
 * to every request. This function is kept as a no-op for backward compatibility
 * and will be removed in a future cleanup.
 */
export function authHeaders() {
  return {}
}

/**
 * @deprecated Use `api` from 'boot/axios' instead.
 */
export const BASE =
  process.env.NODE_ENV === 'production'
    ? process.env.API_BASE_URL || 'https://staging.wageyapp.com'
    : ''
