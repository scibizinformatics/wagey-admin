// src/composables/utils/http.js
// Shared HTTP helpers used across all composables.

export const BASE = 'https://staging.wageyapp.com'

/**
 * Returns an Authorization header object using the stored JWT token.
 * Falls back to checking both 'token' and 'access_token' keys.
 */
export function authHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
