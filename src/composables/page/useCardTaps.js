import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { flattenCardTaps } from 'src/composables/utils/cardTaps'

/**
 * NFC card taps for the active company — `GET /audit/card-taps/{company_id}/`.
 *
 * The endpoint answers the whole company in one call (one object per employee,
 * each with an array of days), so unlike attendance there is nothing to cache by
 * month and no pagination to walk — a single fetch per company, published after
 * a stale-response guard. All the filtering the page offers — the day
 * navigator, the date-range review, the employee search — happens client-side
 * over the flattened rows, since the payload already holds everything.
 *
 * Company scoping is resolved on each request rather than captured at setup, so
 * the page cannot fetch for one workspace and write to another. A request-token
 * guard drops out-of-order responses when the workspace switcher races a slower
 * earlier fetch.
 */
export function useCardTaps() {
  const { companyId } = useCompany()

  /** Raw per-employee payload, kept apart from the flattened rows. */
  const employees = ref([])

  /** One row per (employee, day) — what the page actually renders. */
  const rows = ref([])

  const loading = ref(false)
  const error = ref('')

  const guard = createRequestToken()

  /**
   * Load the whole tap log for the active company.
   * @returns {Promise<Array>} the flattened rows, or [] on failure.
   */
  async function fetchCardTaps() {
    const company = companyId.value
    if (!company) {
      rows.value = []
      employees.value = []
      error.value = 'No company selected. Pick a workspace to see its card taps.'
      return []
    }

    const token = guard.next()
    loading.value = true
    error.value = ''

    try {
      const response = await api.get(`/audit/card-taps/${company}/`)
      if (!guard.isCurrent(token)) return rows.value

      const payload = response.data?.data ?? response.data ?? []
      employees.value = Array.isArray(payload) ? payload : []
      rows.value = flattenCardTaps(employees.value)
      return rows.value
    } catch (err) {
      if (!guard.isCurrent(token)) return rows.value
      rows.value = []
      employees.value = []
      error.value = extractErrorMessage(err, 'Failed to load card taps')
      return []
    } finally {
      if (guard.isCurrent(token)) loading.value = false
    }
  }

  /** Drop everything held for the previous workspace. */
  function reset() {
    guard.next()
    rows.value = []
    employees.value = []
    error.value = ''
    loading.value = false
  }

  function clearError() {
    error.value = ''
  }

  return {
    // state
    employees,
    rows,
    loading,
    error,
    // methods
    fetchCardTaps,
    reset,
    clearError,
  }
}