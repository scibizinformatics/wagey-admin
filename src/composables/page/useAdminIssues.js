/**
 * The data behind the needs-attention drawer.
 *
 * The drawer is a second reader over queues that already have pages, so it
 * fetches each queue independently rather than borrowing a page composable's
 * published state. That independence is the point: one queue failing must not
 * blank the other eight, and the failure has to stay visible. A drawer that
 * showed "nothing needs you" because a request timed out would be worse than
 * one that showed nothing at all.
 *
 * `refreshSummary` is the cheap hint that feeds the header badge before the
 * drawer is ever opened. `refresh` is the full read, run only when the drawer
 * opens (and on an explicit refresh), and it replaces the badge count with the
 * exact number the sections add up to.
 */
import { computed, ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useCompany } from 'src/composables/page/useCompany'
import { useAttendance } from 'src/composables/page/useAttendance'
import { useManning } from 'src/composables/page/useManning'
import { useEmployees } from 'src/composables/page/useEmployees'
import { extractErrorMessage } from 'src/composables/utils/http'
import { createRequestToken } from 'src/composables/utils/requestToken'
import { monthStartIso, shiftIso, todayIso } from 'src/composables/utils/calendarDate'
import { getEmployeeId, hasOpenAudit } from 'src/composables/utils/attendance'
import { normalizeOvertimeRequests } from 'src/composables/utils/overtimeRequests'
import { normalizeSwapRequests } from 'src/composables/utils/swapRequests'
import { normalizeCompensableApplications } from 'src/composables/utils/compensableTime'
import { normalizeAccessCards } from 'src/composables/utils/accessCards'
import {
  ISSUE_SECTION_META,
  accessCardIssueSection,
  attendanceDateOf,
  attendanceIssueSection,
  manningIssueSection,
  openPayrollIssues,
  payrollIssueSection,
  readList,
  requestQueueResult,
  scheduleSwapResult,
} from 'src/composables/utils/adminIssues'

const DETAIL_TTL_MS = 30 * 1000

/** One cache per company and calendar day; see `cacheKeyFor`. */
const detailCache = new Map()

const SUMMARY_KEYS = [
  'unfilled_positions',
  'pending_overtime_requests',
  'pending_leave_applications',
  'suspicious_attendance',
  'pending_schedule_swaps',
]

/**
 * A source that already knows its own message (the manning composable keeps a
 * readable `error` string rather than throwing one) carries it here so the
 * drawer can show that sentence instead of the generic fallback.
 */
function sourceError(message) {
  const error = new Error(message)
  error.userMessage = message
  return error
}

function cacheKeyFor(company) {
  return `${company}|${todayIso()}`
}

function countTone(items, tone) {
  return items.reduce((sum, item) => (item.tone === tone ? sum + (item.count ?? 1) : sum), 0)
}

export function useAdminIssues() {
  const { companyId } = useCompany()
  const attendance = useAttendance()
  const manning = useManning()
  const { fetchEmployees } = useEmployees()

  const sections = ref([])
  const sourceErrors = ref([])
  const loading = ref(false)
  const hasDetails = ref(false)
  const lastUpdated = ref(null)
  const summaryCount = ref(0)

  const detailGuard = createRequestToken()
  const summaryGuard = createRequestToken()

  const totalCount = computed(() => sections.value.reduce((sum, section) => sum + section.count, 0))
  const criticalCount = computed(() =>
    sections.value.reduce((sum, section) => sum + countTone(section.items, 'critical'), 0),
  )
  const warnCount = computed(() =>
    sections.value.reduce((sum, section) => sum + countTone(section.items, 'warn'), 0),
  )
  const infoCount = computed(() =>
    sections.value.reduce((sum, section) => sum + countTone(section.items, 'info'), 0),
  )
  const hasFailures = computed(() => sourceErrors.value.length > 0)
  const badgeCount = computed(() => (hasDetails.value ? totalCount.value : summaryCount.value))
  const allClear = computed(
    () => hasDetails.value && !loading.value && !hasFailures.value && totalCount.value === 0,
  )

  // ─── Sources ──────────────────────────────────────────────────────────────

  async function loadAttendanceAudit(company, roster) {
    const today = todayIso()
    const currentStart = monthStartIso(today)
    const previousEnd = shiftIso(currentStart, -1)
    const previousStart = monthStartIso(previousEnd)
    const [currentYear, currentMonth] = today.split('-')
    const [previousYear, previousMonth] = previousEnd.split('-')

    // `issue=all` is the server's flagged-or-suspicious narrowing, not a
    // request for every record. The previous month is included because an
    // unacknowledged audit from September is still unresolved in October; both
    // months are read together so one cannot land while the other is missing
    // and look like a complete answer.
    const [currentRows, previousRows] = await Promise.all([
      attendance.fetchAttendance(currentYear, currentMonth, { issue: 'all' }, { commit: false }),
      attendance.fetchAttendance(previousYear, previousMonth, { issue: 'all' }, { commit: false }),
    ])

    const seen = new Set()
    const rows = []
    for (const row of [...(currentRows ?? []), ...(previousRows ?? [])]) {
      if (!hasOpenAudit(row)) continue
      const key =
        row.id ??
        row.uuid ??
        `${attendanceDateOf(row)}|${getEmployeeId(row.employee) ?? ''}|${row.time_in ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push(row)
    }

    return attendanceIssueSection(rows, roster, { from: previousStart, to: today })
  }

  async function loadScheduleCoverage() {
    const rows = await manning.fetchManning(todayIso())
    // `fetchManning` reports failure through `error` and returns an empty array,
    // so the empty array alone cannot be read as "no gaps".
    if (manning.error.value) throw sourceError(manning.error.value)
    // The server may answer for a different day than requested; the links must
    // carry the day the rows are actually from, not the one we asked for.
    return manningIssueSection(rows, manning.servedDate.value || todayIso())
  }

  async function loadScheduleSwaps(company) {
    const { data } = await api.get('/organization/swap-requests/', {
      params: { company },
    })
    const rows = normalizeSwapRequests(readList(data, ['results']))
    const count = rows.filter(
      (row) => row.status === 'pending' || row.status === 'to_employee_approved',
    ).length
    return scheduleSwapResult(count)
  }

  async function loadLeaveRequests(company) {
    const { data } = await api.get('/attendance/leave-list/', {
      params: { company_id: company },
    })
    const rows = readList(data, ['results'])
    const count = rows.filter(
      (row) =>
        String(row?.status ?? '')
          .trim()
          .toLowerCase() === 'pending',
    ).length
    return requestQueueResult('leave', count)
  }

  async function loadOvertimeRequests(company) {
    const { data } = await api.get('/payroll/overtime-list/', {
      params: { company_id: company },
    })
    const rows = normalizeOvertimeRequests(readList(data, ['results']))
    return requestQueueResult('overtime', rows.filter((row) => row.actionable).length)
  }

  async function loadCashAdvanceRequests(company) {
    const { data } = await api.get(`/cash_advance/admin/company/${company}/requests/`)
    const rows = readList(data, ['requests', 'results'])
    const count = rows.filter(
      (row) =>
        String(row?.status ?? '')
          .trim()
          .toLowerCase() === 'pending',
    ).length
    return requestQueueResult('cashAdvance', count)
  }

  async function loadCompensableRequests(company) {
    const { data } = await api.get(`/compensable_time/applications/company/${company}/`)
    const rows = normalizeCompensableApplications(data)
    const count = rows.filter((row) => row.status === 'pending').length
    return requestQueueResult('compensable', count)
  }

  async function loadPayrollIssues(company) {
    const { data } = await api.get('/payroll/admin/issues/all/', {
      params: { company, status: 'pending' },
    })
    return payrollIssueSection(readList(data, ['issues', 'results']))
  }

  async function loadAccessCardAlerts(company) {
    const { data } = await api.get(`/user/company/${company}/access-cards/`)
    const cards = normalizeAccessCards(readList(data, ['access_cards', 'results']))
    return accessCardIssueSection(cards)
  }

  const SOURCES = [
    {
      key: 'attendance',
      label: 'Attendance audit',
      section: 'attendance',
      load: loadAttendanceAudit,
    },
    { key: 'manning', label: 'Schedule coverage', section: 'schedule', load: loadScheduleCoverage },
    { key: 'swaps', label: 'Schedule swaps', section: 'swaps', load: loadScheduleSwaps },
    { key: 'leave', label: 'Leave requests', section: 'requests', load: loadLeaveRequests },
    {
      key: 'overtime',
      label: 'Overtime requests',
      section: 'requests',
      load: loadOvertimeRequests,
    },
    {
      key: 'cashAdvance',
      label: 'Cash advance requests',
      section: 'requests',
      load: loadCashAdvanceRequests,
    },
    {
      key: 'compensable',
      label: 'Compensable requests',
      section: 'requests',
      load: loadCompensableRequests,
    },
    { key: 'payroll', label: 'Payslip disputes', section: 'payroll', load: loadPayrollIssues },
    { key: 'access', label: 'Access cards', section: 'access', load: loadAccessCardAlerts },
  ]

  // ─── Publishing ───────────────────────────────────────────────────────────

  function publish(nextSections, nextErrors, at) {
    sections.value = nextSections
    sourceErrors.value = nextErrors
    lastUpdated.value = at
    hasDetails.value = true
    loading.value = false
  }

  function resetState() {
    sections.value = []
    sourceErrors.value = []
    loading.value = false
    hasDetails.value = false
    lastUpdated.value = null
    summaryCount.value = 0
  }

  async function refresh({ force = false } = {}) {
    const company = companyId.value
    if (!company) {
      resetState()
      return
    }

    const key = cacheKeyFor(company)
    if (!force) {
      const cached = detailCache.get(key)
      if (cached && Date.now() - cached.at < DETAIL_TTL_MS) {
        publish(cached.sections, cached.errors, cached.at)
        return
      }
      // A full read is already in the air for this company. Reopening the
      // drawer while it runs should join that read, not start a second one.
      if (loading.value) return
    }

    const token = detailGuard.next()
    loading.value = true

    try {
      // The roster turns a bare employee id into a name. It is shared with the
      // attendance page's own cache, so this is usually free; failing to load
      // it costs names, not the attendance rows themselves.
      const roster = await fetchEmployees().catch(() => [])
      if (!detailGuard.isCurrent(token)) return
      if (String(companyId.value) !== String(company)) return

      const results = await Promise.allSettled(
        SOURCES.map((source) => source.load(company, roster)),
      )
      if (!detailGuard.isCurrent(token)) return
      if (String(companyId.value) !== String(company)) return

      const nextErrors = []
      const grouped = new Map()

      results.forEach((result, index) => {
        const source = SOURCES[index]
        if (result.status === 'rejected') {
          nextErrors.push({
            key: source.key,
            label: source.label,
            message:
              result.reason?.userMessage ||
              extractErrorMessage(result.reason, `Could not check ${source.label.toLowerCase()}`),
          })
          return
        }

        const value = result.value
        if (!value || !value.count) return

        const meta = ISSUE_SECTION_META[source.section]
        let section = grouped.get(source.section)
        if (!section) {
          section = {
            key: source.section,
            label: meta?.label ?? source.section,
            icon: meta?.icon ?? 'o_report',
            order: meta?.order ?? 99,
            items: [],
            count: 0,
            viewAll: null,
          }
          grouped.set(source.section, section)
        }

        section.items.push(...(value.items ?? []))
        section.count += value.count
        if (value.viewAll) section.viewAll = value.viewAll
      })

      const nextSections = [...grouped.values()].sort((left, right) => left.order - right.order)
      const at = Date.now()
      detailCache.set(key, { sections: nextSections, errors: nextErrors, at })
      publish(nextSections, nextErrors, at)
    } catch (error) {
      if (!detailGuard.isCurrent(token)) return
      // The sources settle individually, so this is the unexpected path (the
      // roster read, or a bug in the assembly). Keep whatever sections were
      // already on screen and say the check failed rather than blanking them.
      lastUpdated.value = Date.now()
      sourceErrors.value = [
        {
          key: 'admin-issues',
          label: 'Needs attention',
          message: extractErrorMessage(error, 'Could not check the workspace'),
        },
      ]
      hasDetails.value = true
    } finally {
      if (detailGuard.isCurrent(token)) loading.value = false
    }
  }

  function forceRefresh() {
    return refresh({ force: true })
  }

  async function refreshSummary() {
    const company = companyId.value
    if (!company) {
      summaryCount.value = 0
      return
    }

    const token = summaryGuard.next()
    const [attention, payroll, access] = await Promise.allSettled([
      api.get(`/attendance/needs-attention/${company}/${todayIso()}/`),
      api.get('/payroll/admin/issues/all/', {
        params: { company, status: 'pending' },
      }),
      api.get(`/user/company/${company}/access-cards/`),
    ])

    if (!summaryGuard.isCurrent(token)) return
    if (String(companyId.value) !== String(company)) return

    let next = 0
    if (attention.status === 'fulfilled') {
      const data = attention.value.data ?? {}
      for (const key of SUMMARY_KEYS) next += Number(data?.[key]) || 0
    }
    if (payroll.status === 'fulfilled') {
      next += openPayrollIssues(readList(payroll.value.data, ['issues', 'results'])).length
    }
    if (access.status === 'fulfilled') {
      next += normalizeAccessCards(readList(access.value.data, ['access_cards', 'results'])).filter(
        (card) => card.alert,
      ).length
    }

    summaryCount.value = next
  }

  // A workspace switch invalidates both in-flight reads and every row on
  // screen. The drawer is closed by the shell as well; this is what keeps a
  // response already in the air from repopulating it afterwards.
  watch(
    companyId,
    (next, previous) => {
      if (String(next ?? '') === String(previous ?? '')) return
      detailGuard.next()
      summaryGuard.next()
      resetState()
      refreshSummary()
    },
    { immediate: true },
  )

  return {
    sections,
    sourceErrors,
    loading,
    hasDetails,
    lastUpdated,
    totalCount,
    criticalCount,
    warnCount,
    infoCount,
    badgeCount,
    hasFailures,
    allClear,
    refresh,
    forceRefresh,
    refreshSummary,
  }
}
