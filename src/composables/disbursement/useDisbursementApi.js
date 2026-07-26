import { api } from 'boot/axios'
import { BASE } from 'src/composables/utils/http'

export function useDisbursementApi() {

  // ── Cutoff Instances ──
  async function fetchCutoffInstances() {
    const { data } = await api.get(`${BASE}/payroll/admin/cutoff-instances/`)
    return data
  }

  // ── List Page ──
  async function fetchDashboardSummary(companyId, cutoffInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-dashboard/${companyId}/${cutoffInstanceId}/`)
    return data
  }

  async function fetchPayoutGroupInstances(companyId, cutoffInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-instances/${companyId}/${cutoffInstanceId}/`)
    return data
  }

  // ── Progress ──
  async function fetchPayoutGroupProgress(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-progress/${payoutGroupInstanceId}/`)
    return data
  }

  // ── Review (Step 1) ──
  async function fetchReviewOverview(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/review-overview/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchAttendanceSummary(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/attendance-summary/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchEmployeePayrollItem(id) {
    const { data } = await api.get(`${BASE}/payroll/admin/employee-payroll-item/${id}/`)
    return data
  }

  // ── Payslips (Step 2) ──
  async function fetchPayslipOverview(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payslip-overview/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchEmployeePayslips(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/employee-payslips/${payoutGroupInstanceId}/`)
    return data
  }

  // ── Funding (Step 3) ──
  async function fetchPayoutGroupInstanceAmounts(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-instance-amounts/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchTopEarners(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/top-earners/${payoutGroupInstanceId}/`)
    return data
  }

  // ── Disburse (Step 4) ──
  async function fetchPayoutGroupInstanceSummary(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-instance-summary/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchDisbursementEmployees(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/disbursement-employees/${payoutGroupInstanceId}/`)
    return data
  }

  // ── Complete (Step 5) ──
  async function fetchPayoutGroupCompletion(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-group-completion/${payoutGroupInstanceId}/`)
    return data
  }

  async function fetchPayoutSummaryByEmployee(payoutGroupInstanceId) {
    const { data } = await api.get(`${BASE}/payroll/admin/payout-summary-by-employee/${payoutGroupInstanceId}/`)
    return data
  }

  return {
    fetchCutoffInstances,
    fetchDashboardSummary,
    fetchPayoutGroupInstances,
    fetchPayoutGroupProgress,
    fetchReviewOverview,
    fetchAttendanceSummary,
    fetchEmployeePayrollItem,
    fetchPayslipOverview,
    fetchEmployeePayslips,
    fetchPayoutGroupInstanceAmounts,
    fetchTopEarners,
    fetchPayoutGroupInstanceSummary,
    fetchDisbursementEmployees,
    fetchPayoutGroupCompletion,
    fetchPayoutSummaryByEmployee,
  }
}
