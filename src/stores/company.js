import { defineStore } from 'pinia'
import { getCountryCurrency, getCountryLocale } from '@/composables/utils/locale'

const STORAGE_KEY = 'selectedCompany'

/**
 * @typedef {object} Company
 * @property {number|string} id
 * @property {string} name
 * @property {string|null} logo
 * @property {string} country      – ISO 3166-1 alpha-2 code (e.g. 'PH', 'US')
 * @property {string} country_name – Human-readable country name (e.g. 'Philippines')
 */

function readStoredCompany() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.id != null) {
      return parsed
    }
  } catch {
    // Legacy: plain string ID stored previously
    return { id: raw, name: '', logo: null, country: '', country_name: '' }
  }
  return null
}

export const useCompanyStore = defineStore('company', {
  state: () => ({
    /** @type {Company|null} */
    company: readStoredCompany(),
    /** @type {Company[]} */
    companies: [],
  }),

  getters: {
    /** @returns {string|null} */
    companyId: (state) => {
      if (!state.company) return null
      const id = state.company.id
      if (id == null || id === '') return null
      return String(id)
    },

    /** @returns {boolean} */
    hasCompany: (state) => state.company != null && state.company.id != null,

    /** @returns {string} */
    currency: (state) => {
      const code = state.company?.country
      if (!code) return 'PHP'
      return getCountryCurrency(code) || 'PHP'
    },

    /** @returns {string} */
    locale: (state) => {
      const code = state.company?.country
      if (!code) return 'en-PH'
      return getCountryLocale(code) || 'en-PH'
    },
  },

  actions: {
    /**
     * Set the active company and persist to localStorage.
     * @param {Company|null} company
     */
    setCompany(company) {
      this.company = company
      if (company) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(company))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    },

    /**
     * Set the full list of available companies.
     * @param {Company[]} companies
     */
    setCompanies(companies) {
      this.companies = Array.isArray(companies) ? companies : []
    },

    /**
     * Hydrate store from localStorage (useful on app reload).
     */
    hydrate() {
      this.company = readStoredCompany()
    },

    /**
     * Clear company state (e.g. on logout).
     */
    clear() {
      this.company = null
      this.companies = []
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})

// ─── Country Helpers are imported from @/composables/utils/locale ───────────
