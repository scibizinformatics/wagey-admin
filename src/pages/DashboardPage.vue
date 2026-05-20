<template>
  <div class="dashboard-page">
    <!-- Global loading overlay -->
    <q-inner-loading :showing="pageLoading" color="primary" />

    <div class="dashboard-inner">
      <!-- Top Stats Row -->
      <div class="stats-row">
        <div v-for="(stat, i) in statsCards" :key="i" class="stat-tile" :class="`tile-${i}`">
          <div class="tile-icon-wrap">
            <q-icon :name="stat.icon" size="22px" />
          </div>
          <div class="tile-body">
            <div class="tile-count">
              <q-skeleton v-if="pageLoading" type="text" width="40px" />
              <template v-else>{{ stat.count }}</template>
            </div>
            <div class="tile-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="main-grid">
        <!-- Left Column -->
        <div class="col-main">
          <!-- Payroll Status -->
          <div class="panel">
            <div class="panel-head">
              <div class="panel-head-left">
                <q-icon name="receipt" size="18px" class="panel-icon" />
                <span class="panel-title">Current Payroll Status</span>
              </div>
            </div>
            <div v-if="!payrollLoading && !payrollRows.length" class="empty-panel-state">
              <div
                class="eps-shimmer"
                v-for="n in 4"
                :key="n"
                :style="{ width: n % 2 === 0 ? '60%' : '80%', animationDelay: `${n * 0.12}s` }"
              />
            </div>
            <q-table
              v-else
              :rows="payrollRows"
              :columns="payrollColumns"
              row-key="id"
              flat
              dense
              hide-pagination
              :rows-per-page-options="[0]"
              :loading="payrollLoading"
              no-data-label="No payroll data found"
              class="ct-table"
            >
              <template v-slot:header="props">
                <q-tr :props="props" class="ct-thead-row">
                  <q-th v-for="col in props.cols" :key="col.name" class="ct-th">{{
                    col.label
                  }}</q-th>
                </q-tr>
              </template>
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <span
                    :class="[
                      'ct-status',
                      props.value?.toLowerCase() === 'released'
                        ? 'ct-status--green'
                        : 'ct-status--amber',
                    ]"
                  >
                    {{ props.value }}
                  </span>
                </q-td>
              </template>
            </q-table>
          </div>

          <!-- Recent Activity -->
          <div class="panel">
            <div class="panel-head">
              <span class="panel-title">Recent Activity</span>
            </div>
            <div class="activity-list">
              <template v-if="attendanceLoading || requestsLoading">
                <div v-for="n in 3" :key="n" class="activity-row">
                  <q-skeleton type="QAvatar" size="36px" />
                  <div class="activity-info">
                    <q-skeleton type="text" width="120px" />
                    <q-skeleton type="text" width="80px" />
                  </div>
                </div>
              </template>
              <template v-else-if="recentActivities.length">
                <div v-for="activity in recentActivities" :key="activity.id" class="activity-row">
                  <q-avatar size="36px" class="activity-avatar">
                    {{ activity.initial }}
                  </q-avatar>
                  <div class="activity-info">
                    <div class="activity-user">{{ activity.user }}</div>
                    <div class="activity-time">{{ activity.time }}</div>
                  </div>
                  <div class="activity-status-badge">{{ activity.status }}</div>
                  <div class="activity-details">{{ activity.details }}</div>
                </div>
              </template>
              <div v-else class="empty-panel-state">
                <div
                  class="eps-shimmer"
                  v-for="n in 3"
                  :key="n"
                  :style="{ width: n % 2 === 0 ? '50%' : '70%', animationDelay: `${n * 0.13}s` }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="col-side">
          <!-- Notifications -->
          <div class="panel">
            <div class="panel-head">
              <q-icon name="notifications" size="16px" class="panel-icon" />
              <span class="panel-title">Notifications</span>
              <q-badge
                v-if="pendingNotifCount > 0"
                color="negative"
                :label="pendingNotifCount"
                class="q-ml-auto"
              />
            </div>
            <div class="notif-list">
              <template v-if="requestsLoading">
                <div v-for="n in 3" :key="n" class="notif-item">
                  <q-skeleton type="circle" size="7px" />
                  <q-skeleton type="text" style="flex: 1" />
                </div>
              </template>
              <div v-for="(note, i) in notifications" v-else :key="i" class="notif-item">
                <q-icon name="circle" size="7px" color="primary" class="notif-dot" />
                <span class="notif-text">{{ note }}</span>
              </div>
              <div v-if="!requestsLoading && !notifications.length" class="empty-panel-state">
                <div
                  class="eps-shimmer"
                  v-for="n in 3"
                  :key="n"
                  :style="{ width: n % 2 === 0 ? '58%' : '72%', animationDelay: `${n * 0.14}s` }"
                />
              </div>
            </div>
          </div>

          <!-- Announcements -->
          <div class="panel">
            <div class="panel-head">
              <q-icon name="campaign" size="16px" class="panel-icon" />
              <span class="panel-title">Announcements</span>
            </div>
            <div class="notif-list">
              <template v-if="announcementsLoading">
                <div v-for="n in 3" :key="n" class="notif-item">
                  <q-skeleton type="circle" size="7px" />
                  <q-skeleton type="text" style="flex: 1" />
                </div>
              </template>
              <template v-else-if="announcements.length">
                <div v-for="(item, i) in announcements.slice(0, 5)" :key="i" class="notif-item">
                  <q-icon name="circle" size="7px" color="orange" class="notif-dot" />
                  <span class="notif-text">{{
                    item.title ?? item.message ?? item.content ?? item
                  }}</span>
                </div>
              </template>
              <div v-else class="empty-panel-state">
                <div
                  class="eps-shimmer"
                  v-for="n in 3"
                  :key="n"
                  :style="{ width: n % 2 === 0 ? '62%' : '78%', animationDelay: `${n * 0.11}s` }"
                />
              </div>
            </div>
          </div>

          <!-- Swap Requests -->
          <div class="panel">
            <div class="panel-head">
              <q-icon name="swap_horiz" size="16px" class="panel-icon panel-icon--amber" />
              <span class="panel-title">Pending Swaps</span>
              <q-badge
                v-if="pendingSwaps.length"
                color="warning"
                :label="pendingSwaps.length"
                class="q-ml-auto"
              />
            </div>
            <div class="notif-list">
              <template v-if="swapLoading">
                <div v-for="n in 2" :key="n" class="notif-item">
                  <q-skeleton type="circle" size="7px" />
                  <q-skeleton type="text" style="flex: 1" />
                </div>
              </template>
              <template v-else-if="pendingSwaps.length">
                <div v-for="(swap, i) in pendingSwaps.slice(0, 4)" :key="i" class="notif-item">
                  <q-icon name="circle" size="7px" color="warning" class="notif-dot" />
                  <span class="notif-text">
                    {{ swap.requester_name ?? swap.employee_name ?? 'Employee' }}
                    wants to swap with
                    {{ swap.requested_name ?? swap.target_name ?? 'teammate' }}
                  </span>
                </div>
              </template>
              <div v-else class="empty-panel-state">
                <div
                  class="eps-shimmer"
                  v-for="n in 2"
                  :key="n"
                  :style="{ width: n % 2 === 0 ? '55%' : '70%', animationDelay: `${n * 0.16}s` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect } from 'vue'
import { useEmployees } from '@/composables/page/useEmployees'
import { useAttendance } from '@/composables/page/useAttendance'
import { usePayroll } from '@/composables/page/usePayroll'
import { useRequests } from '@/composables/page/useRequests'
import { useAnnouncements } from '@/composables/page/useAnnouncements'
import { useSwapRequests } from '@/composables/page/useSwapRequests'
import { useCompany } from '@/composables/page/useCompany'
import { useNotifications } from 'src/composables/useNotifications'

// ─── Composables ─────────────────────────────────────────────────────────────
const { companyId } = useCompany()

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

// ─── Resolve company ID (handles both plain string and JSON object in storage) ─
function resolvedCompanyId() {
  if (companyId.value && typeof companyId.value !== 'object') return companyId.value
  try {
    const stored = localStorage.getItem('selectedCompany')
    if (!stored) return companyId.value
    const parsed = JSON.parse(stored)
    return parsed?.id ?? parsed
  } catch {
    return companyId.value
  }
}

// ─── Payroll table columns ────────────────────────────────────────────────────
const payrollColumns = [
  { name: 'group', label: 'Group Name', field: 'group', align: 'left' },
  { name: 'cycle', label: 'Cycle', field: 'cycle', align: 'left' },
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

// Debug watcher — remove once ID shapes are confirmed
watchEffect(() => {
  if (employees.value.length && attendanceData.value.length) {
    const emp = employees.value[0]
    const att = attendanceData.value[0]
    console.debug('[Dashboard] employee ID fields:', {
      id: emp?.id,
      employee_id: emp?.employee_id,
      user: emp?.user?.id,
    })
    console.debug('[Dashboard] attendance ID fields:', {
      employee_id: att?.employee_id,
      employee: att?.employee,
      user_id: att?.user_id,
      user: att?.user?.id ?? att?.user,
    })
  }
})

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
  return list.slice(0, 10).map((p, i) => ({
    id: p.id ?? i,
    group: p.name ?? '-',
    cycle: p.period ?? '-',
    type: 'Payroll Run',
    start: p.period ? String(p.period).split(' - ')[0] : '-',
    end: p.period ? String(p.period).split(' - ')[1] ?? '-' : '-',
    employees: p.number_of_employee ?? p.employee_count ?? p.employees ?? '-',
    status: p.status ?? '-',
    date: fmtDate(p.created_at ?? p.date_released ?? p.released_at),
    amount: fmtCurrency(p.total_net_pay ?? p.calculated_amount),
  }))
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

  await Promise.allSettled([
    fetchEmployees(),
    fetchAttendanceByDate(today()),
    fetchLeaveRequests(),
    fetchOvertimeRequests(),
    fetchPayrollRunsSummary({ company_id: cid }),
    ...(cid ? [fetchCashAdvanceRequests(cid)] : []),
    fetchAnnouncements(),
    fetchSwapRequests({ company: cid }),
  ])

  console.debug(
    '[Dashboard] payroll runs summary type:',
    typeof payrollRunsSummary.value,
    Array.isArray(payrollRunsSummary.value) ? `array(${payrollRunsSummary.value.length})` : payrollRunsSummary.value,
  )

  pageLoading.value = false
})
</script>

<style scoped>
/* ── Base ── */
.dashboard-page {
  background: #f4f6f9;
  height: 100vh;
  overflow: hidden;
  padding: 0;
}
.dashboard-inner {
  height: 100vh;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

/* ── Top Stats Row ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  flex-shrink: 0;
}
.stat-tile {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: box-shadow 0.2s;
}
.stat-tile:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

/* Colour accents per tile */
.tile-0 .tile-icon-wrap {
  background: #e8f4ff;
  color: #1a73e8;
}
.tile-1 .tile-icon-wrap {
  background: #fdecea;
  color: #d32f2f;
}
.tile-2 .tile-icon-wrap {
  background: #e8f5e9;
  color: #388e3c;
}
.tile-3 .tile-icon-wrap {
  background: #fff3e0;
  color: #f57c00;
}
.tile-4 .tile-icon-wrap {
  background: #f3e5f5;
  color: #7b1fa2;
}
.tile-5 .tile-icon-wrap {
  background: #e0f7fa;
  color: #0097a7;
}

.tile-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tile-count {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}
.tile-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  margin-top: 1px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

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

/* ── Panel ── */
.panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  flex-shrink: 0;
}
.panel--flex {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-shrink: 0;
}
.panel-icon {
  color: #1a73e8;
}
.panel-icon--red {
  color: #d32f2f;
}
.panel-icon--amber {
  color: #f59e0b;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

/* ── CT Table ── */
.ct-table {
  background: transparent;
}
.ct-thead-row {
  background: #f8f9fb;
}
.ct-th {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 10px 16px;
  border-bottom: 1px solid #e8ecf0;
}
.ct-table :deep(td) {
  font-size: 13px;
  color: #374151;
  padding: 11px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.ct-table :deep(tr:last-child td) {
  border-bottom: none;
}
.ct-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}
.ct-status--green {
  background: #e8f5e9;
  color: #2e7d32;
}
.ct-status--amber {
  background: #fff8e1;
  color: #f57f17;
}

/* ── Two-col row ── */
.two-col-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.chart-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: #fafafa;
  border-top: 1px solid #f1f3f5;
  gap: 4px;
  min-height: 0;
}
.chart-placeholder-label {
  font-size: 11px;
  color: #9ca3af;
}

/* ── Alert list ── */
.alert-list {
  padding: 2px 0;
  border-top: 1px solid #f1f3f5;
  overflow-y: auto;
  flex: 1;
}
.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.alert-item:last-child {
  border-bottom: none;
}
.alert-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f59e0b;
  margin-top: 5px;
  flex-shrink: 0;
}
.alert-text {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.4;
}

/* ── Activity list ── */
.activity-list {
  padding: 0;
}
.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.activity-row:last-child {
  border-bottom: none;
}
.activity-avatar {
  background: linear-gradient(135deg, #1a73e8, #6c63ff);
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}
.activity-info {
  flex: 1;
  min-width: 0;
}
.activity-user {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.activity-time {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 1px;
}
.activity-status-badge {
  font-size: 10px;
  font-weight: 600;
  color: #1a73e8;
  background: #e8f4ff;
  padding: 2px 6px;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}
.activity-details {
  font-size: 10px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

/* ── Notifications ── */
.notif-list {
  padding: 2px 0;
}
.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.notif-item:last-child {
  border-bottom: none;
}
.notif-dot {
  margin-top: 3px;
  flex-shrink: 0;
}
.notif-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.4;
}

/* ── Empty panel state (no-data placeholder keeps container height) ── */
@keyframes eps-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.85;
    transform: scaleX(1.015);
  }
}
.empty-panel-state {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  min-height: 100px;
}
.eps-shimmer {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e8ecf0 0%, #d1d9e0 50%, #e8ecf0 100%);
  background-size: 200% 100%;
  animation: eps-pulse 1.6s ease-in-out infinite;
  transform-origin: left center;
}

/* ── Empty state ── */
.empty-activity {
  padding: 20px 16px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

/* ── Responsive ── */
@media (max-width: 1200px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
  .main-grid {
    grid-template-columns: 1fr;
  }
  .col-side {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .two-col-row {
    grid-template-columns: 1fr;
  }
  .col-side {
    grid-template-columns: 1fr;
  }
  .activity-details {
    display: none;
  }
}
@media (max-width: 480px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
