import { ref } from 'vue'
import { api } from 'src/boot/axios'

export function useEmployeeBalances() {
  const leaveTypes = ref([])
  const loadingLeaveTypes = ref(false)
  const loadingBalances = ref(false)
  const submittingLeave = ref(false)
  const submittingCto = ref(false)

  const fetchLeaveTypes = async (companyId) => {
    if (!companyId) return []
    loadingLeaveTypes.value = true
    try {
      const res = await api.get('/attendance/leave-types/', {
        params: { company: companyId },
      })
      const data = Array.isArray(res.data) ? res.data : res.data.results || []
      leaveTypes.value = data.map((item) => ({
        id: item.id,
        name: item.name || item.leave_type_name || `Type ${item.id}`,
      }))
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

  const addLeaveBalance = async (payload) => {
    submittingLeave.value = true
    try {
      const res = await api.post('/attendance/leave-balances/add/', payload)
      return res.data
    } catch (e) {
      console.error('Failed to add leave balance', e)
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
    addLeaveBalance,
    addCtoBalance,
  }
}
