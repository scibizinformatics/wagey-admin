import { ref } from 'vue'

export function useCompany() {
  const KEYS = ['selectCompany', 'selectedCompany', 'company_id', 'companyId']

  function getCompanyId() {
    for (const key of KEYS) {
      const value = localStorage.getItem(key)
      if (value) return value
    }
    console.warn('⚠️ No company ID found in localStorage')
    return null
  }

  const companyId = ref(getCompanyId())

  /** Re-read from storage (useful after login / company switch). */
  function refreshCompanyId() {
    companyId.value = getCompanyId()
  }

  return { companyId, refreshCompanyId }
}
