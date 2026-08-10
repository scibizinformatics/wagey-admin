// composables/useAuth.js
// Authentication — login and company selection used in LoginPage.vue

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
    fetchUserCompanies,
    fetchCurrentUserCompanies,
    fetchUserProfile,
    fetchPositions,
    fetchUserRoles,
  }
}
