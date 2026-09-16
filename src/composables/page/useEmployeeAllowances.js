import { ref } from 'vue'
import { api } from 'src/boot/axios'

/**
 * One employee's allowances — the rows behind the employee 3-dot menu's
 * "Assign allowance" entry on the Employees page.
 *
 * The endpoints are a sibling of the allowance *types* (`useAllowances.js`) but
 * answer about money an employee holds, keyed by company in the path and by the
 * employee's UUID:
 *
 *   GET   /allowance/employee-allowances/company/{company_id}/employee/{employee_id}/
 *   POST  /allowance/employee-allowances/company/{company_id}/create/
 *   PATCH /allowance/employee-allowances/{id}/update/
 *
 * The create endpoint's `employee_id` is the employee UUID the page already
 * holds; the update endpoint's `id` is the allowance row's own id from the list
 * payload. `amount` travels as a decimal string in both directions — the
 * callers build those strings, this module never parses for its own writes.
 */
export function useEmployeeAllowances() {
  const fetching = ref(false)
  const savingCreate = ref(false)
  /** id of the allowance row currently being patched (toggle or amount edit). */
  const savingUpdateId = ref(null)

  /**
   * The list endpoint wraps one employee + their allowances in a single-element
   * array, so the shape is normalized defensively: an array is unwrapped, a bare
   * object passes through, and anything else reads as no allowances.
   */
  const fetchEmployeeAllowances = async (companyId, employeeId) => {
    if (!companyId || !employeeId) return { employee: null, allowances: [] }
    fetching.value = true
    try {
      const res = await api.get(
        `/allowance/employee-allowances/company/${companyId}/employee/${employeeId}/`,
      )
      const row = Array.isArray(res.data) ? res.data[0] : res.data
      return {
        employee: row?.employee ?? null,
        allowances: Array.isArray(row?.allowances) ? row.allowances : [],
      }
    } catch (e) {
      console.error('[useEmployeeAllowances] fetchEmployeeAllowances ✖ error', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      })
      throw e
    } finally {
      fetching.value = false
    }
  }

  const createEmployeeAllowance = async (companyId, payload) => {
    if (!companyId) throw new Error('No active company')
    savingCreate.value = true
    try {
      const res = await api.post(
        `/allowance/employee-allowances/company/${companyId}/create/`,
        payload,
      )
      return res.data
    } catch (e) {
      console.error('[useEmployeeAllowances] createEmployeeAllowance ✖ error', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      })
      throw e
    } finally {
      savingCreate.value = false
    }
  }

  const updateEmployeeAllowance = async (id, payload) => {
    if (!id) throw new Error('No allowance id')
    savingUpdateId.value = id
    try {
      const res = await api.patch(`/allowance/employee-allowances/${id}/update/`, payload)
      return res.data
    } catch (e) {
      console.error('[useEmployeeAllowances] updateEmployeeAllowance ✖ error', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      })
      throw e
    } finally {
      savingUpdateId.value = null
    }
  }

  return {
    fetching,
    savingCreate,
    savingUpdateId,
    fetchEmployeeAllowances,
    createEmployeeAllowance,
    updateEmployeeAllowance,
  }
}