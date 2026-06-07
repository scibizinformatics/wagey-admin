// composables/useAuth.js
// Authentication — login and company selection used in LoginPage.vue

import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { BASE } from 'src/composables/utils/http'

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
      const response = await api.post(`${BASE}/api/employee/login/`, credentials)
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
    const response = await api.get(`${BASE}/organization/companies/`, {
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
    const response = await api.get(`${BASE}/user/current-user-companies/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data.data ?? response.data ?? []
  }

  // ─── Positions & Roles ────────────────────────────────────────────────────

  /**
   * Fetch available positions (used in employee forms).
   * @param {string} companyId
   */
  async function fetchPositions(companyId) {
    const response = await api.get(`${BASE}/user/positions/`, {
      params: { company: companyId },
    })
    return response.data.data ?? response.data ?? []
  }

  /**
   * Fetch user roles.
   * @param {string} companyId
   */
  async function fetchUserRoles(companyId) {
    const response = await api.get(`${BASE}/user/user-roles/`, {
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
    fetchPositions,
    fetchUserRoles,
  }
}
