import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { normalizeLeaveType } from 'src/composables/utils/leaveTypes'

export function useEmployeeBalances() {
  const leaveTypes = ref([])
  const loadingLeaveTypes = ref(false)
  const loadingBalances = ref(false)
  const submittingLeave = ref(false)
  const submittingCto = ref(false)

  /**
   * Leave types for the active company.
   *
   * `{ usesBalance: true }` asks the endpoint for the types that keep a credit
   * ledger (`GET /attendance/leave-types/?company=1&uses_balance=true`) — the
   * Employees table's leave columns and the balance modal are both about
   * balances, and a type that draws from none has no balance to show or grant.
   *
   * This filter replaced `is_paid`, which was the nearest thing available
   * before `uses_balance` existed and was never the same question: an unpaid
   * type can still run a ledger, and a paid one can be marked as not using one.
   * `uses_balance` is the field that actually decides whether a balance exists.
   *
   * The returned rows are still narrowed here as well, through
   * `normalizeLeaveType`, for two reasons. An unrecognised query parameter is
   * ignored rather than rejected, so a backend without the filter wired up
   * would answer with the full list and the column set would silently widen.
   * And `uses_balance` is *optional* on the payload: when the server omits it
   * the documented default is `is_paid || is_cto`, so the shared normaliser
   * applies that rather than reading a missing field as false — which would
   * empty the leave columns outright.
   */
  const fetchLeaveTypes = async (companyId, { usesBalance = null } = {}) => {
    if (!companyId) return []
    loadingLeaveTypes.value = true
    try {
      const params = { company: companyId }
      if (usesBalance !== null) params.uses_balance = usesBalance
      const res = await api.get('/attendance/leave-types/', { params })
      const data = Array.isArray(res.data) ? res.data : res.data.results || []
      const normalized = data.map((item) => {
        const type = normalizeLeaveType(item)
        return {
          id: type.id,
          name: item.name || item.leave_type_name || `Type ${type.id}`,
          isPaid: type.isPaid,
          isCto: type.isCto,
          usesBalance: type.usesBalance,
        }
      })
      leaveTypes.value =
        usesBalance === null
          ? normalized
          : normalized.filter((lt) => lt.usesBalance === usesBalance)
      return leaveTypes.value
    } catch (e) {
      console.error('Failed to fetch leave types', e)
      leaveTypes.value = []
      return []
    } finally {
      loadingLeaveTypes.value = false
    }
  }

  const fetchEmployeeBalances = async (companyId, employeeUUID) => {
    if (!companyId || !employeeUUID) return null
    loadingBalances.value = true
    try {
      const res = await api.get(`/attendance/employee-balances/${companyId}/${employeeUUID}/`)
      const data = res.data || {}

      // Normalize leave_balances array
      const rawBalances = Array.isArray(data.leave_balances)
        ? data.leave_balances
        : Array.isArray(data.leaveBalances)
          ? data.leaveBalances
          : []

      const leaveBalances = rawBalances.map((item) => ({
        leave_type_id: item.leave_type ?? item.leave_type_id ?? item.id ?? null,
        leave_type_name: item.leave_type_name || 'Leave',
        balance: item.remaining ?? item.balance ?? item.total_allocated ?? 0,
      }))

      // Handle cto_balance as object or primitive
      let ctoBalance = data.cto_balance ?? data.ctoBalance ?? null
      if (typeof ctoBalance === 'object' && ctoBalance !== null) {
        ctoBalance = ctoBalance.remaining ?? ctoBalance.hours ?? null
      }

      return {
        leaveBalances,
        ctoBalance,
      }
    } catch (e) {
      console.error('Failed to fetch employee balances', e)
      return null
    } finally {
      loadingBalances.value = false
    }
  }

  /**
   * The two ways a leave balance is written, and they are not interchangeable.
   *
   *   POST /attendance/leave-balances/add/   adds to what is already there
   *   POST /attendance/leave-balances/set/   replaces it outright
   *
   * `add` is a grant: 3 days on a balance of 10 leaves 13. `set` is a
   * correction: setting 5 on a balance of 10 leaves 5, not 15. Sending the same
   * number to the wrong one of these is silent — both return success, and the
   * difference only shows up in the employee's remaining days — so the caller
   * has to choose, and the modal says which it is doing in its title, its hint
   * and its button.
   *
   * @param {'add'|'set'} mode
   */
  const writeLeaveBalance = async (payload, mode = 'add') => {
    const path =
      mode === 'set' ? '/attendance/leave-balances/set/' : '/attendance/leave-balances/add/'
    submittingLeave.value = true
    try {
      const res = await api.post(path, payload)
      return res.data
    } catch (e) {
      console.error(`Failed to ${mode} leave balance`, e)
      throw e
    } finally {
      submittingLeave.value = false
    }
  }

  const addCtoBalance = async (payload) => {
    submittingCto.value = true
    try {
      const res = await api.post('/attendance/cto-balances/add/', payload)
      return res.data
    } catch (e) {
      console.error('Failed to add CTO balance', e)
      throw e
    } finally {
      submittingCto.value = false
    }
  }

  return {
    leaveTypes,
    loadingLeaveTypes,
    loadingBalances,
    submittingLeave,
    submittingCto,
    fetchLeaveTypes,
    fetchEmployeeBalances,
    writeLeaveBalance,
    addCtoBalance,
  }
}
