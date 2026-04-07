// src/utils/http.js
// NOTE: Prefer importing { api } from 'boot/axios' directly in your components.
// This file exists only for legacy compatibility. Do not use BASE or authHeaders
// for new code — the axios interceptor in boot/axios.js handles auth automatically.

import { api } from 'boot/axios'

export { api }

/**
 * @deprecated Use `api` from 'boot/axios' instead.
 * Kept only for components not yet migrated to the axios instance.
 */
export function authHeaders() {
  const token = localStorage.getItem('access_token')
  if (!token) {
    console.warn('[authHeaders] No auth token found in localStorage.')
    return {}
  }
  return { Authorization: `Bearer ${token}` }
}

/**
 * @deprecated Use `api` from 'boot/axios' instead.
 */
export const BASE =
  process.env.NODE_ENV === 'production'
    ? process.env.API_BASE_URL || 'https://staging.wageyapp.com'
    : ''
