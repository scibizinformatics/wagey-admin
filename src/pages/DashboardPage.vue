<template>
  <div class="dashboard-page">
    <div class="dashboard-inner">
      <!-- Top Stats Row -->
      <div class="stats-row">
        <div v-for="(stat, i) in statsCards" :key="i" class="stat-tile" :class="`tile-${i}`">
          <div class="tile-icon-wrap">
            <q-icon :name="stat.icon" size="22px" />
          </div>
          <div class="tile-body">
            <div class="tile-count">{{ stat.count }}</div>
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
            <q-table
              :rows="payrollRows"
              :columns="payrollColumns"
              row-key="id"
              flat
              dense
              hide-pagination
              :rows-per-page-options="[0]"
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
                      props.value === 'Released' ? 'ct-status--green' : 'ct-status--amber',
                    ]"
                  >
                    {{ props.value }}
                  </span>
                </q-td>
              </template>
            </q-table>
          </div>

          <!-- Charts Row -->
          <div class="two-col-row">
            <div class="panel panel--flex">
              <div class="panel-head">
                <span class="panel-title">Payroll History</span>
              </div>
              <div class="chart-placeholder">
                <q-icon name="show_chart" size="48px" color="grey-4" />
                <div class="chart-placeholder-label">Payroll History Chart</div>
              </div>
            </div>

            <div class="panel panel--flex">
              <div class="panel-head">
                <span class="panel-title">Smart Attendance</span>
              </div>
              <div class="alert-list">
                <div v-for="(alert, index) in attendanceAlerts" :key="index" class="alert-item">
                  <div class="alert-dot"></div>
                  <span class="alert-text">{{ alert }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="panel">
            <div class="panel-head">
              <span class="panel-title">Recent Activity</span>
            </div>
            <div class="activity-list">
              <div v-for="activity in recentActivities" :key="activity.id" class="activity-row">
                <q-avatar size="36px" class="activity-avatar">
                  {{ activity.user.charAt(0) }}
                </q-avatar>
                <div class="activity-info">
                  <div class="activity-user">{{ activity.user }}</div>
                  <div class="activity-time">{{ activity.time }}</div>
                </div>
                <div class="activity-status-badge">{{ activity.status }}</div>
                <div class="activity-details">{{ activity.details }}</div>
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
              <q-badge color="negative" :label="notifications.length" class="q-ml-auto" />
            </div>
            <div class="notif-list">
              <div v-for="(note, i) in notifications" :key="i" class="notif-item">
                <q-icon name="circle" size="7px" color="primary" class="notif-dot" />
                <span class="notif-text">{{ note }}</span>
              </div>
            </div>
          </div>

          <!-- Fraud Alerts -->
          <div class="panel">
            <div class="panel-head">
              <q-icon name="security" size="16px" class="panel-icon panel-icon--red" />
              <span class="panel-title">Device / Fraud Alerts</span>
            </div>
            <div class="fraud-list">
              <div class="fraud-item fraud-item--critical">
                <q-icon name="error" size="16px" />
                <span>Date / Time - Critical Message</span>
              </div>
              <div class="fraud-item fraud-item--warning">
                <q-icon name="warning" size="16px" />
                <span>Date / Time - Warning Message</span>
              </div>
              <div class="fraud-item fraud-item--info">
                <q-icon name="info" size="16px" />
                <span>Date / Time - Info Message</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PayrollDashboard',
  data() {
    return {
      payrollColumns: [
        { name: 'group', label: 'Group Name', field: 'group', align: 'left' },
        { name: 'cycle', label: 'Cycle', field: 'cycle', align: 'left' },
        { name: 'type', label: 'Type', field: 'type', align: 'left' },
        { name: 'start', label: 'Start', field: 'start', align: 'left' },
        { name: 'end', label: 'End', field: 'end', align: 'left' },
        { name: 'employees', label: 'No. of Employees', field: 'employees', align: 'center' },
        { name: 'status', label: 'Status', field: 'status', align: 'center' },
        { name: 'date', label: 'Date Released', field: 'date', align: 'left' },
        { name: 'amount', label: 'Total Amount', field: 'amount', align: 'right' },
      ],
      payrollRows: [
        {
          id: 1,
          group: 'Weekly',
          cycle: 'Weekly',
          type: 'Regular',
          start: 'Jul 7, 2025',
          end: 'Jul 13, 2025',
          employees: 1,
          status: 'Released',
          date: 'Jul 14, 2025',
          amount: '10,000.00',
        },
        {
          id: 2,
          group: 'Bi-Weekly',
          cycle: 'Bi-Weekly',
          type: 'Regular',
          start: 'Jul 1, 2025',
          end: 'Jul 14, 2025',
          employees: 60,
          status: 'Pending',
          date: '-',
          amount: '60,000.00',
        },
        {
          id: 3,
          group: 'Bi-Weekly',
          cycle: 'Bi-Weekly',
          type: 'Contract',
          start: 'Jul 1, 2025',
          end: 'Jul 15, 2025',
          employees: 3,
          status: 'Pending',
          date: '-',
          amount: '25,000.00',
        },
      ],
      recentActivities: [
        {
          id: 1,
          user: 'Kevin Santos',
          time: 'Jul 16, 08:12 AM',
          status: 'Clocked-In',
          details: 'Verified via GPS and Selfie',
        },
        {
          id: 2,
          user: 'HR Admin (Jane D.)',
          time: 'Jul 16, 08:10 AM',
          status: 'Paid Leave Approved',
          details: 'Maria Villanueva',
        },
        {
          id: 3,
          user: 'Joseph Tan',
          time: 'Jul 16, 08:08 AM',
          status: 'Clocked-In',
          details: 'Working',
        },
        {
          id: 4,
          user: 'Maria Villanueva',
          time: 'Jul 16, 08:27 PM',
          status: 'Paid Leave Request',
          details: '1-day VL for July 5 submitted',
        },
      ],
      statsCards: [
        { icon: 'people', count: 64, label: 'Active' },
        { icon: 'person_off', count: 1, label: 'Paid Leave' },
        { icon: 'schedule', count: 60, label: 'Clocked In' },
        { icon: 'person_remove', count: 1, label: 'Absent' },
        { icon: 'access_time', count: 2, label: 'Time Off' },
        { icon: 'request_page', count: 6, label: 'Requests' },
      ],
      attendanceAlerts: [
        '3 employees clocked in outside workplace location',
        '1 employee used on-smartphone device',
        '2 employees clocked in late today (past shift start time)',
        '1 employee forgot to clock out yesterday',
        'Proxy detected: 2 devices logged in from same IP',
        '3 employees have exceeded late clock-in this week',
        '1 selfie upload failed on Android',
      ],
      notifications: [
        '2 employees marked for receive for 22 employees',
        '2 leave requests still pending approval',
        'Company cut off ends in 2 days',
      ],
    }
  },
}
</script>

<style scoped>
/* ── Base ── */
.dashboard-page {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}
.dashboard-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Top Stats Row ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
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
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}
.tile-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Layout ── */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
}
.col-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.col-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Panel ── */
.panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}
.panel--flex {
  display: flex;
  flex-direction: column;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
}
.panel-icon {
  color: #1a73e8;
}
.panel-icon--red {
  color: #d32f2f;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

/* ── CT Table (Connecteam-style) ── */
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
  padding: 11px 16px;
  border-bottom: 1px solid #e8ecf0;
}
.ct-table :deep(td) {
  font-size: 13px;
  color: #374151;
  padding: 13px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.ct-table :deep(tr:last-child td) {
  border-bottom: none;
}
.ct-status {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
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
  gap: 16px;
}
.chart-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: #fafafa;
  border-top: 1px solid #f1f3f5;
  gap: 8px;
}
.chart-placeholder-label {
  font-size: 13px;
  color: #9ca3af;
}

/* ── Alert list ── */
.alert-list {
  padding: 8px 0;
  border-top: 1px solid #f1f3f5;
}
.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.alert-item:last-child {
  border-bottom: none;
}
.alert-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  margin-top: 5px;
  flex-shrink: 0;
}
.alert-text {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
}

/* ── Activity list ── */
.activity-list {
  padding: 0;
}
.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f3f5;
}
.activity-row:last-child {
  border-bottom: none;
}
.activity-avatar {
  background: linear-gradient(135deg, #1a73e8, #6c63ff);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
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
  font-size: 11px;
  font-weight: 600;
  color: #1a73e8;
  background: #e8f4ff;
  padding: 3px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.activity-details {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

/* ── Notifications ── */
.notif-list {
  padding: 4px 0;
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
  margin-top: 4px;
  flex-shrink: 0;
}
.notif-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.5;
}

/* ── Fraud Alerts ── */
.fraud-list {
  padding: 4px 0;
}
.fraud-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 12px;
  border-bottom: 1px solid #f1f3f5;
}
.fraud-item:last-child {
  border-bottom: none;
}
.fraud-item--critical {
  color: #c62828;
}
.fraud-item--critical .q-icon {
  color: #c62828;
}
.fraud-item--warning {
  color: #e65100;
}
.fraud-item--warning .q-icon {
  color: #e65100;
}
.fraud-item--info {
  color: #2e7d32;
}
.fraud-item--info .q-icon {
  color: #2e7d32;
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
