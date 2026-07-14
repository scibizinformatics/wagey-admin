<template>
  <PageShell full-height flex-column>
    <!-- Global loading overlay -->
    <q-inner-loading :showing="pageLoading" color="primary" />
      <!-- Top Stats Row -->
      <DashboardStatsRow :stats-cards="statsCards" :page-loading="pageLoading" />

      <!-- Main Grid -->
      <div class="main-grid">
        <!-- Left Column -->
        <div class="col-main">
          <PayrollStatusPanel :rows="payrollRows" :columns="payrollColumns" :loading="payrollLoading" />
          <QuickActionsPanel />
          <RecentActivityPanel :activities="recentActivities" :loading="attendanceLoading || requestsLoading" />
        </div>

        <!-- Right Column -->
        <div class="col-side">
          <NotificationsPanel :notifications="notifications" :pending-count="pendingNotifCount" :loading="requestsLoading" />
          <AnnouncementsPanel :announcements="announcements" :loading="announcementsLoading" />
          <PendingSwapsPanel :pending-swaps="pendingSwaps" :loading="swapLoading" />
        </div>
      </div>
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { ref, computed, onMounted } from 'vue'
import { useEmployees } from '@/composables/page/useEmployees'
import { useAttendance } from '@/composables/page/useAttendance'
import { usePayroll } from '@/composables/page/usePayroll'
import { useRequests } from '@/composables/page/useRequests'
import { useAnnouncements } from '@/composables/page/useAnnouncements'
import { useSwapRequests } from '@/composables/page/useSwapRequests'
import { useCompany, resolvedCompanyId } from '@/composables/page/useCompany'
import { useNotifications } from 'src/composables/useNotifications'

import DashboardStatsRow from '@/components/pages/Dashboard/DashboardStatsRow.vue'
import PayrollStatusPanel from '@/components/pages/Dashboard/PayrollStatusPanel.vue'
import RecentActivityPanel from '@/components/pages/Dashboard/RecentActivityPanel.vue'
import NotificationsPanel from '@/components/pages/Dashboard/NotificationsPanel.vue'
import AnnouncementsPanel from '@/components/pages/Dashboard/AnnouncementsPanel.vue'
import PendingSwapsPanel from '@/components/pages/Dashboard/PendingSwapsPanel.vue'
import QuickActionsPanel from '@/components/pages/Dashboard/QuickActionsPanel.vue'

// ─── Composables ─────────────────────────────────────────────────────────────
useCompany()

const { employees, fetchEmployees } = useEmployees()

const { attendanceData, loading: attendanceLoading, fetchAttendanceByDate } = useAttendance()

const { payrollRunsSummary, isLoading, fetchPayrollRunsSummary } = usePayroll()

const payrollLoading = computed(() => isLoading('fetchingPayrollRunsSummary'))

const { onDataUpdate } = useNotifications()

const {
  leaveRequests,
  overtimeRequests,
  cashAdvanceRequests,
  loading: requestsLoading,
  fetchLeaveRequests,
  fetchOvertimeRequests,
  fetchCashAdvanceRequests,
} = useRequests()

const { announcements, loading: announcementsLoading, fetchAnnouncements } = useAnnouncements()

const { swapRequests, loading: swapLoading, fetchSwapRequests } = useSwapRequests()

// ─── Page-level loading (true until the first critical batch resolves) ────────
const pageLoading = ref(true)

// Uses shared resolvedCompanyId() from useCompany.js

// ─── Payroll table columns ────────────────────────────────────────────────────
const payrollColumns = [
  { name: 'group', label: 'Group Name', field: 'group', align: 'left' },
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'start', label: 'Start', field: 'start', align: 'left' },
  { name: 'end', label: 'End', field: 'end', align: 'left' },
  { name: 'employees', label: 'No. of Employees', field: 'employees', align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'date', label: 'Date Released', field: 'date', align: 'left' },
  { name: 'amount', label: 'Total Amount', field: 'amount', align: 'right' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(str) {
  if (!str) return '-'
  const d = new Date(str)
  return isNaN(d)
    ? str
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function cleanGroupName(name) {
  if (!name) return '-'
  let cleaned = String(name)
  // 1. Strip trailing date range patterns like "| 2026-05-01 - 2026-05-15"
  cleaned = cleaned.replace(/\s*\|?\s*\d{4}[-/]\d{2}[-/]\d{2}\s*[-–]\s*\d{4}[-/]\d{2}[-/]\d{2}\s*$/, '')
  // 2. Strip trailing type indicator like "| Salary" or "| Hourly"
  cleaned = cleaned.replace(/\s*\|\s*\w+\s*$/, '')
  return cleaned.trim() || '-'
}

function fmtTime(str) {
  if (!str) return ''
  const d = new Date(str)
  return isNaN(d)
    ? str
    : d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function fmtCurrency(val) {
  if (val == null) return '-'
  return Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getEmployeeName(record) {
  if (!record) return ''
  if (record.full_name) return record.full_name
  if (record.name) return record.name
  const u = record.user ?? record.employee ?? record
  if (u.full_name) return u.full_name
  if (u.name) return u.name
  const first = u.first_name ?? u.firstname ?? ''
  const last = u.last_name ?? u.lastname ?? ''
  const full = `${first} ${last}`.trim()
  if (full) return full
  return u.email ?? u.username ?? ''
}

// ─── Stats cards ──────────────────────────────────────────────────────────────

const statsCards = computed(() => {
  const todayStr = today()

  const activeEmps = employees.value.filter(
    (e) => (e.status ?? 'active').toLowerCase() === 'active',
  )
  const onLeaveEmps = employees.value.filter((e) => {
    const s = (e.status ?? '').toLowerCase()
    return s === 'on_leave' || s === 'paid_leave' || s === 'leave'
  })

  const todayAtt = attendanceData.value.filter((a) => {
    const d = a.date ?? a.attendance_date ?? a.time_in ?? a.clock_in ?? ''
    return String(d).startsWith(todayStr)
  })
  const clockedIn = todayAtt.filter((a) => {
    const hasIn = a.time_in ?? a.clock_in ?? a.check_in
    const hasOut = a.time_out ?? a.clock_out ?? a.check_out
    return hasIn && !hasOut
  })

  // Build a Set of all employee IDs found in today's attendance
  // covering every field shape the API might return
  const attendedIds = new Set(
    todayAtt.flatMap((a) => {
      const ids = []
      if (a.employee_id != null) ids.push(String(a.employee_id))
      if (a.employee != null) ids.push(String(a.employee))
      if (a.user_id != null) ids.push(String(a.user_id))
      if (a.user?.id != null) ids.push(String(a.user.id))
      if (a.employee?.id != null) ids.push(String(a.employee.id))
      return ids
    }),
  )

  const absent = activeEmps.filter((e) => {
    const empIds = [e.id, e.employee_id, e.user?.id, e.user_id].filter((v) => v != null).map(String)
    // Employee is absent only if NONE of their IDs appear in today's attendance
    return empIds.length > 0 && !empIds.some((id) => attendedIds.has(id))
  })

  const pendingLeave = leaveRequests.value.filter(
    (r) => (r.status ?? '').toLowerCase() === 'pending',
  )
  const pendingOT = overtimeRequests.value.filter(
    (r) => (r.status ?? '').toLowerCase() === 'pending',
  )
  const pendingCA = cashAdvanceRequests.value.filter(
    (r) => (r.status ?? '').toLowerCase() === 'pending',
  )
  const totalRequests = pendingLeave.length + pendingOT.length + pendingCA.length

  return [
    { icon: 'people', count: activeEmps.length, label: 'Active' },
    { icon: 'person_off', count: onLeaveEmps.length, label: 'Paid Leave' },
    { icon: 'schedule', count: clockedIn.length, label: 'Clocked In' },
    { icon: 'person_remove', count: absent.length, label: 'Absent' },
    { icon: 'access_time', count: pendingLeave.length, label: 'Time Off' },
    { icon: 'request_page', count: totalRequests, label: 'Requests' },
  ]
})

// ─── Payroll rows ─────────────────────────────────────────────────────────────
const payrollRows = computed(() => {
  const list = Array.isArray(payrollRunsSummary.value)
    ? payrollRunsSummary.value
    : Array.isArray(payrollRunsSummary.value?.data)
      ? payrollRunsSummary.value.data
      : Array.isArray(payrollRunsSummary.value?.results)
        ? payrollRunsSummary.value.results
        : []
  return list.slice(0, 10).map((p, i) => {
    // Resolve start / end dates: prefer explicit fields, then split period, then extract from name
    let startDate = '-'
    let endDate = '-'
    if (p.start_date && p.end_date) {
      startDate = fmtDate(p.start_date)
      endDate = fmtDate(p.end_date)
    } else if (p.period) {
      const parts = String(p.period).split(' - ')
      startDate = parts[0] ?? '-'
      endDate = parts[1] ?? '-'
    } else if (p.name) {
      // Fallback: extract date range embedded in the name (e.g. "Group | Type | 2026-05-01 - 2026-05-15")
      const match = String(p.name).match(/(\d{4}[-/]\d{2}[-/]\d{2})\s*[-–]\s*(\d{4}[-/]\d{2}[-/]\d{2})/)
      if (match) {
        startDate = fmtDate(match[1])
        endDate = fmtDate(match[2])
      }
    }

    // Date Released: show only if the run was actually released
    const releasedAt = p.released_at ?? p.date_released
    const releaseDate = releasedAt ? fmtDate(releasedAt) : '-'

    return {
      id: p.id ?? i,
      group: cleanGroupName(p.name),
      type: p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : 'Payroll Run',
      start: startDate,
      end: endDate,
      employees: p.total_employees ?? p.number_of_employee ?? p.employee_count ?? p.employees ?? '-',
      status: p.status ?? '-',
      date: releaseDate,
      amount: fmtCurrency(p.total_net_pay ?? p.calculated_amount),
    }
  })
})

// ─── Recent Activity ──────────────────────────────────────────────────────────
const recentActivities = computed(() => {
  const activities = []
  const todayStr = today()

  attendanceData.value
    .filter((a) => {
      const d = a.date ?? a.attendance_date ?? a.time_in ?? a.clock_in ?? ''
      return String(d).startsWith(todayStr) && (a.time_in ?? a.clock_in ?? a.check_in)
    })
    .slice(0, 6)
    .forEach((a) => {
      const name =
        (getEmployeeName(a.employee ?? a.user ?? a) || a.employee_name || a.full_name) ?? null
      if (!name) return
      activities.push({
        id: `att-${a.id}`,
        user: name,
        initial: name.charAt(0).toUpperCase(),
        time: fmtTime(a.time_in ?? a.clock_in ?? a.check_in),
        status: (a.time_out ?? a.clock_out ?? a.check_out) ? 'Clocked-Out' : 'Clocked-In',
        details: a.location_name ?? a.site_name ?? a.source ?? a.cost_center_name ?? '',
      })
    })

  leaveRequests.value.slice(0, 4).forEach((r) => {
    const nameCandidate =
      r.employee_name || r.full_name || getEmployeeName(r.employee ?? r.user ?? r) || null
    const name = nameCandidate && nameCandidate !== 'Unknown' ? nameCandidate : null
    if (!name) return
    activities.push({
      id: `leave-${r.id}`,
      user: name,
      initial: name.charAt(0).toUpperCase(),
      time: fmtTime(r.created_at ?? r.applied_at ?? r.date_applied ?? r.start_date),
      status:
        r.status === 'approved'
          ? 'Leave Approved'
          : r.status === 'pending'
            ? 'Leave Request'
            : `Leave ${r.status ?? ''}`.trim(),
      details: r.leave_type?.name ?? r.leave_type ?? r.type ?? '',
    })
  })

  return activities
    .filter((a) => a.user)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 6)
})

// ─── Notifications ────────────────────────────────────────────────────────────
const pendingSwaps = computed(() =>
  swapRequests.value.filter((s) => (s.status ?? '').toLowerCase() === 'pending'),
)

const pendingNotifCount = computed(() => {
  const pendingLeave = leaveRequests.value.filter(
    (r) => (r.status ?? '').toLowerCase() === 'pending',
  )
  const pendingOT = overtimeRequests.value.filter(
    (r) => (r.status ?? '').toLowerCase() === 'pending',
  )
  const pendingCA = cashAdvanceRequests.value.filter(
    (r) => (r.status ?? '').toLowerCase() === 'pending',
  )
  return pendingLeave.length + pendingOT.length + pendingCA.length
})

const notifications = computed(() => {
  const notes = []
  const pendingLeave = leaveRequests.value.filter(
    (r) => (r.status ?? '').toLowerCase() === 'pending',
  )
  const pendingOT = overtimeRequests.value.filter(
    (r) => (r.status ?? '').toLowerCase() === 'pending',
  )
  const pendingCA = cashAdvanceRequests.value.filter(
    (r) => (r.status ?? '').toLowerCase() === 'pending',
  )

  if (pendingLeave.length)
    notes.push(
      `${pendingLeave.length} leave request${pendingLeave.length > 1 ? 's' : ''} pending approval`,
    )
  if (pendingOT.length)
    notes.push(
      `${pendingOT.length} overtime request${pendingOT.length > 1 ? 's' : ''} pending approval`,
    )
  if (pendingCA.length)
    notes.push(
      `${pendingCA.length} cash advance request${pendingCA.length > 1 ? 's' : ''} pending approval`,
    )
  if (!notes.length) notes.push('No pending notifications')
  return notes
})

// ─── Bootstrap ────────────────────────────────────────────────────────────────
onMounted(async () => {
  const cid = resolvedCompanyId()
  console.debug('[Dashboard] resolved company ID:', cid)

  onDataUpdate('attendance', () => fetchAttendanceByDate(today()))
  onDataUpdate('leave', () => fetchLeaveRequests())
  onDataUpdate('overtime', () => fetchOvertimeRequests())
  onDataUpdate('swap_request', () => fetchSwapRequests({ company: cid }))

  // Batch 1 — critical for main panels
  await Promise.allSettled([
    fetchEmployees(),
    fetchAttendanceByDate(today()),
    fetchPayrollRunsSummary({ company_id: cid }),
  ])

  // Batch 2 — secondary panels
  await Promise.allSettled([
    fetchLeaveRequests(),
    fetchOvertimeRequests(),
    fetchAnnouncements(),
    fetchSwapRequests({ company: cid }),
  ])

  // Batch 3 — cash advance (optional)
  if (cid) {
    await Promise.allSettled([fetchCashAdvanceRequests(cid)])
  }

  pageLoading.value = false
})
</script>

<style scoped>
/* ── Layout ── */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 290px;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.col-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}
.col-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

/* ── Responsive ── */
@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
  .col-side {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 768px) {
  .col-side {
    grid-template-columns: 1fr;
  }
}
</style>
