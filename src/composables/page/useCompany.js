import { ref } from 'vue'

const KEYS = ['selectCompany', 'selectedCompany', 'company_id', 'companyId']

function getCompanyId() {
  for (const key of KEYS) {
    const value = localStorage.getItem(key)
    if (value) return value
  }
  console.warn('No company ID found in localStorage')
  return null
}

/**
 * Resolve company ID from localStorage, handling both plain strings
 * and JSON-serialized objects (e.g. { id: 1, name: "Acme" }).
 * Shares the same logic previously duplicated in DashboardPage and useAnnouncements.
 */
function resolvedCompanyId() {
  const raw = getCompanyId()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const id = parsed?.id ?? parsed
    if (id == null || id === '') {
      console.warn('[resolvedCompanyId] Parsed company ID is empty:', raw)
      return null
    }
    return id
  } catch {
    if (raw == null || raw === '') {
      console.warn('[resolvedCompanyId] Raw company ID is empty')
      return null
    }
    return raw
  }
}

export { resolvedCompanyId }

export function useCompany() {
  const companyId = ref(resolvedCompanyId())

  /** Re-read from storage (useful after login / company switch). */
  function refreshCompanyId() {
    companyId.value = resolvedCompanyId()
  }

  return { companyId, refreshCompanyId }
}
