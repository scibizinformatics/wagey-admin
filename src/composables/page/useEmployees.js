import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { BASE } from 'src/composables/utils/http'

// ── Module-level cache keyed by companyId (fixes cross-user/stale cache bug) ─
// Each company gets its own cache entry: { data: [], timestamp: number }
const cacheByCompany = {}
// In-flight requests keyed by companyId so we still deduplicate concurrent calls
const inflightByCompany = {}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function useEmployees() {
  const { companyId } = useCompany()

  const employees = ref([])
  const loading = ref(false)
  const saving = ref(false)

  // ─── Read ──────────────────────────────────────────────────────────────────

  /** Fetch all employees — uses per-company cache + deduplicates in-flight requests. */
  async function fetchEmployees({ force = false } = {}) {
    if (!companyId.value) throw new Error('Company ID not found')

    const cid = companyId.value

    // 1. Return cached data if still fresh
    const cached = cacheByCompany[cid]
    const isCacheFresh = cached && Date.now() - cached.timestamp < CACHE_TTL_MS
    if (!force && isCacheFresh) {
      employees.value = cached.data
      return cached.data
    }

    // 2. Deduplicate: reuse an already in-flight request for the same company.
    //
    // The shared promise resolves to the rows and does nothing else. It used to
    // assign `employees.value` from inside its own `.then`, which closed over
    // whichever consumer happened to start the request — so a second consumer
    // that joined an in-flight fetch got the rows as a return value while its
    // own `employees` ref was never filled. Anything that awaited the call and
    // then read the ref rather than the result (the attendance page builds its
    // employee dropdown that way) saw an empty list, intermittently, depending
    // on which caller won the race. Same for `loading`, which the winner
    // cleared on everybody's behalf.
    let request = inflightByCompany[cid]

    if (force === true || request === undefined) {
      request = api
        .get(`${BASE}/user/companies/${cid}/employees/`)
        .then((response) => {
          const data = normaliseList(response.data)
          cacheByCompany[cid] = { data, timestamp: Date.now() }
          return data
        })
        .finally(() => {
          // Guarded: a forced re-fetch replaces the entry, and the older
          // request settling later must not delete its successor.
          if (inflightByCompany[cid] === request) delete inflightByCompany[cid]
        })

      inflightByCompany[cid] = request
    }

    loading.value = true
    try {
      const data = await request
      employees.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single employee's full detail from the network.
   * Never uses the list cache — list objects are shallow and missing
   * detail-only fields (phone_number, bank_acct, timezone, civil_status, etc.).
   */
  async function fetchEmployee(employeeId) {
    const response = await api.get(
      `${BASE}/user/companies/${companyId.value}/employees/${employeeId}/`,
    )
    return response.data
  }

  /**
   * Fetch employee contract by employee ID.
   */
  async function fetchEmployeeContract(employeeId) {
    if (!companyId.value) throw new Error('Company ID not found')
    const response = await api.get(
      `${BASE}/user/employee/contracts/${companyId.value}/${employeeId}/`,
    )
    return response.data
  }

  /** Call this after any mutation so the next fetchEmployees() re-fetches. */
  function invalidateCache(cid) {
    const key = cid ?? companyId.value
    if (key) delete cacheByCompany[key]
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async function addEmployee(payload) {
    saving.value = true
    try {
      const response = await api.post(`${BASE}/user/employees/`, payload)
      invalidateCache()
      return response.data
    } finally {
      saving.value = false
    }
  }

  async function updateUser(userId, payload) {
    const response = await api.patch(`${BASE}/user/users/${userId}/`, payload)
    return response.data
  }

  async function uploadEmployeeAvatar(employeeId, file) {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please select an image.')
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image must be less than 5MB')
    }

    const formData = new FormData()
    formData.append('picture', file)

    const response = await api.patch(
      `${BASE}/user/companies/${companyId.value}/employees/${employeeId}/`,
      formData,
    )
    invalidateCache()
    return response.data
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async function updateEmployee(employeeId, payload) {
    saving.value = true
    try {
      const response = await api.patch(
        `${BASE}/user/companies/${companyId.value}/employees/${employeeId}/`,
        payload,
      )
      invalidateCache()
      return response.data
    } finally {
      saving.value = false
    }
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  async function terminateEmployee(employeeId, payload = {}) {
    const response = await api.patch(
      `${BASE}/user/companies/${companyId.value}/employees/${employeeId}/`,
      { status: 'terminated', ...payload },
    )
    invalidateCache()
    return response.data
  }

  async function restoreEmployee(employeeId, payload = {}) {
    const response = await api.patch(
      `${BASE}/user/companies/${companyId.value}/employees/${employeeId}/`,
      { status: 'active', ...payload },
    )
    invalidateCache()
    return response.data
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Sort an employee list A→Z by full name (first + last). */
  function sortByName(list) {
    return [...list].sort((a, b) => {
      const nameA = `${a.user?.first_name ?? ''} ${a.user?.last_name ?? ''}`.trim().toLowerCase()
      const nameB = `${b.user?.first_name ?? ''} ${b.user?.last_name ?? ''}`.trim().toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }

  function normaliseList(raw) {
    let list = []
    if (Array.isArray(raw)) list = raw
    else if (Array.isArray(raw?.data)) list = raw.data
    else if (Array.isArray(raw?.results)) list = raw.results
    else if (Array.isArray(raw?.employees)) list = raw.employees
    return sortByName(list)
  }

  return {
    employees,
    loading,
    saving,
    fetchEmployees,
    fetchEmployee,
    fetchEmployeeContract,
    addEmployee,
    updateEmployee,
    updateUser,
    uploadEmployeeAvatar,
    terminateEmployee,
    restoreEmployee,
    invalidateCache,
  }
}
