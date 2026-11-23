/**
 * The two request queues the Review step's guard reads.
 *
 * `employee-review-summary` says how much leave and overtime each employee has
 * in the run, but not whether any of it is still waiting on an approver. Only
 * the request queues know that — and neither `/attendance/leave-list/` nor
 * `/payroll/overtime-list/` accepts a cutoff or a payout group, so the narrowing
 * is the derivation's job (`utils/reviewBlockers.js`). This module does the
 * fetching only.
 *
 * No cache, on purpose: the guard exists because a decision made in another tab
 * has to be reflected before the next write, and a cached answer would let the
 * page hold an employee after their request was settled. The page refetches on
 * every load and after every action, and offers an explicit recheck.
 *
 * A failed queue is reported rather than thrown. The page fails open — the
 * backend still refuses the write — and says which half it could not read, so a
 * transient error never locks payroll and never pretends to be an all-clear.
 */

import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { readList } from 'src/composables/utils/adminIssues'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { normalizeLeaveQueueRow } from 'src/composables/utils/reviewBlockers'
import {
  buildEmployeeDirectory,
  normalizeOvertimeRequests,
} from 'src/composables/utils/overtimeRequests'

export function useCutoffApprovalQueue() {
  const { companyId } = useCompany()

  // Leave rows are normalized by the guard's own reader; overtime rows go
  // through the shared normalizer so "is this still actionable?" is the same
  // question the Request page asks.
  const leaveRows = ref([])
  const overtimeRows = ref([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')

  // One guard for both lists: they are always fetched and published together, so
  // two independent tokens would only let one half land from a superseded round.
  const guard = createRequestToken()

  async function fetchQueues({ employees = [] } = {}) {
    const company = companyId.value
    if (!company) {
      leaveRows.value = []
      overtimeRows.value = []
      loaded.value = true
      error.value = 'No company is selected, so pending approvals could not be checked.'
      return
    }

    const token = guard.next()
    loading.value = true
    error.value = ''
    try {
      const [leaveResult, overtimeResult] = await Promise.allSettled([
        api.get('/attendance/leave-list/', { params: { company_id: company } }),
        api.get('/payroll/overtime-list/', { params: { company_id: company } }),
      ])

      // Superseded, or the workspace moved while the lists were in the air.
      if (!guard.isCurrent(token)) return
      if (String(companyId.value) !== String(company)) return

      const unavailable = []

      if (leaveResult.status === 'fulfilled') {
        leaveRows.value = readList(leaveResult.value?.data, ['results'])
          .map(normalizeLeaveQueueRow)
          .filter(Boolean)
      } else {
        leaveRows.value = []
        unavailable.push('leave requests')
        console.error('[approval guard] leave queue failed:', leaveResult.reason)
      }

      if (overtimeResult.status === 'fulfilled') {
        const rows = readList(overtimeResult.value?.data, ['results'])
        overtimeRows.value = normalizeOvertimeRequests(rows, buildEmployeeDirectory(employees))
      } else {
        overtimeRows.value = []
        unavailable.push('overtime requests')
        console.error('[approval guard] overtime queue failed:', overtimeResult.reason)
      }

      error.value = unavailable.length
        ? `Could not check ${unavailable.join(' or ')} for pending approvals. They may be missed here, but the server still refuses an incomplete release.`
        : ''
      loaded.value = true
    } catch (err) {
      // The processing half (normalizers, envelope reading) can throw too, and a
      // thrown check must not leave the page in "still checking" forever — that
      // would disable the step with no explanation. Fail open, and say so.
      if (!guard.isCurrent(token)) return
      console.error('[approval guard] queue read failed:', err)
      leaveRows.value = []
      overtimeRows.value = []
      error.value =
        'Could not check pending approvals. They may be missed here, but the server still refuses an incomplete release.'
      loaded.value = true
    } finally {
      if (guard.isCurrent(token)) loading.value = false
    }
  }

  return { leaveRows, overtimeRows, loading, loaded, error, fetchQueues }
}
