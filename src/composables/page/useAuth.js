// composables/useAuth.js
// Authentication — login, password reset, and the company/profile lookups the
// login flow needs. Used by LoginPage.vue via LoginForm.vue.

import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { BASE } from 'src/composables/utils/http'

const ENDPOINTS = {
  LOGIN:                `${BASE}/api/employee/login/`,
  COMPANIES:            `${BASE}/organization/companies/`,
  CURRENT_USER_COMPANIES: `${BASE}/user/current-user-companies/`,
  USER_PROFILE:         `${BASE}/user/check-type/`,
  POSITIONS:            `${BASE}/user/positions/`,
  USER_ROLES:           `${BASE}/user/user-roles/`,

  // ─── Password reset (three steps, two of them server round trips) ─────────
  FORGOT_PASSWORD:      `${BASE}/user/forgot-password/`,
  VERIFY_OTP:           `${BASE}/user/verify-otp/`,
  RESET_PASSWORD:       `${BASE}/user/reset-password/`,
}

export function useAuth() {
  const loading = ref(false)

  // ─── Login ────────────────────────────────────────────────────────────────

  /**
   * Authenticate the user.
   * @param {{ email: string, password: string }} credentials
   * @returns {object} – token + user data from API
   */
  async function login(credentials) {
    loading.value = true
    try {
      const response = await api.post(ENDPOINTS.LOGIN, credentials)
      return response.data
    } finally {
      loading.value = false
    }
  }

  // ─── Password reset ───────────────────────────────────────────────────────
  //
  // Three steps, and the middle one is why it is not a single call: the OTP is
  // exchanged for a short-lived token, and it is that token — not the code, and
  // not the email — which authorises the new password. So the code never has to
  // be held in component state past the step that verifies it.

  /**
   * Ask for a one-time code to be emailed.
   *
   * Deliberately not distinguishing "no such account" from success at the call
   * site: an endpoint that answers differently for a registered and an
   * unregistered address is an account-enumeration oracle. Whatever the server
   * returns, the UI says the same thing.
   *
   * @param {string} email
   * @returns {Promise<object>}
   */
  async function requestPasswordReset(email) {
    loading.value = true
    try {
      const response = await api.post(ENDPOINTS.FORGOT_PASSWORD, { email })
      return response.data ?? {}
    } finally {
      loading.value = false
    }
  }

  /**
   * Exchange the emailed code for a reset token.
   *
   * @param {string} email
   * @param {string} otp
   * @returns {Promise<string>} the reset token
   * @throws if the response carries no token — a 200 without one would
   *   otherwise let the flow advance to a password step that cannot succeed.
   */
  async function verifyResetOtp(email, otp) {
    loading.value = true
    try {
      const response = await api.post(ENDPOINTS.VERIFY_OTP, { email, otp })
      const data = response.data ?? {}
      // Every spelling the endpoint has been seen to use, since this is the one
      // value the last step depends on.
      const token = data.token ?? data.reset_token ?? data.data?.token ?? null
      if (!token) throw new Error('The code was accepted but no reset token was returned.')
      return token
    } finally {
      loading.value = false
    }
  }

  /**
   * Set the new password, authorised by the token from `verifyResetOtp`.
   *
   * @param {string} token
   * @param {string} newPassword
   * @returns {Promise<object>}
   */
  async function resetPassword(token, newPassword) {
    loading.value = true
    try {
      const response = await api.post(ENDPOINTS.RESET_PASSWORD, {
        token,
        new_password: newPassword,
      })
      return response.data ?? {}
    } finally {
      loading.value = false
    }
  }

  // ─── Companies ────────────────────────────────────────────────────────────

  /**
   * Fetch the list of companies associated with the logged-in user.
   * @param {string} token – JWT access token returned from login
   * @returns {Promise<Array<{id:number|string,name:string,logo:string|null,country:string,country_name:string}>>}
   */
  async function fetchUserCompanies(token) {
    const response = await api.get(ENDPOINTS.COMPANIES, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data.data ?? response.data ?? []
  }

  /**
   * Fetch companies linked to the currently authenticated user.
   * Used during login to resolve company/account context.
   * @param {string} token – JWT access token returned from login
   * @returns {Promise<Array<{id:number|string,name:string,logo:string|null,country:string,country_name:string}>>}
   */
  async function fetchCurrentUserCompanies(token) {
    const response = await api.get(ENDPOINTS.CURRENT_USER_COMPANIES, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data.data ?? response.data ?? []
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  /**
   * Fetch the current user's profile (used during login to resolve employee UUID).
   * @param {string} token – JWT access token
   * @returns {Promise<{profile:{id:string|null}}|null>}
   */
  async function fetchUserProfile(token) {
    const response = await api.get(ENDPOINTS.USER_PROFILE, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  }

  // ─── Positions & Roles ────────────────────────────────────────────────────

  /**
   * Fetch available positions (used in employee forms).
   * @param {string} companyId
   */
  async function fetchPositions(companyId) {
    const response = await api.get(ENDPOINTS.POSITIONS, {
      params: { company: companyId },
    })
    return response.data.data ?? response.data ?? []
  }

  /**
   * Fetch user roles.
   * @param {string} companyId
   */
  async function fetchUserRoles(companyId) {
    const response = await api.get(ENDPOINTS.USER_ROLES, {
      params: { company: companyId },
    })
    return response.data.data ?? response.data ?? []
  }

  return {
    // state
    loading,
    // methods
    login,
    requestPasswordReset,
    verifyResetOtp,
    resetPassword,
    fetchUserCompanies,
    fetchCurrentUserCompanies,
    fetchUserProfile,
    fetchPositions,
    fetchUserRoles,
  }
}
