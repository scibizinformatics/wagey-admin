<template>
  <div class="dashboard-container">
    <!-- Main Content -->
    <div class="main-content q-pa-sm">
      <div class="row q-col-gutter-sm q-mb-sm">
        <!-- Left Column -->
        <div class="col-12 col-lg-8">
          <!-- Payroll Status -->
          <q-card class="modern-card q-mb-sm">
            <q-card-section class="compact-section">
              <div class="section-header">
                <q-icon name="receipt" class="section-icon" />
                <span class="section-title">Current Payroll Status</span>
              </div>

              <q-table
                :rows="payrollRows"
                :columns="payrollColumns"
                row-key="id"
                flat
                :bordered="false"
                dense
                hide-pagination
                :rows-per-page-options="[0]"
                class="modern-table"
              >
                <template v-slot:body-cell-status="props">
                  <q-td :props="props">
                    <q-chip
                      :class="
                        props.value === 'Released' ? 'status-chip-success' : 'status-chip-pending'
                      "
                      text-color="white"
                      size="sm"
                    >
                      {{ props.value }}
                    </q-chip>
                  </q-td>
                </template>
              </q-table>
            </q-card-section>
          </q-card>

          <!-- Charts + Attendance -->
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-card class="modern-card chart-card equal-height-card">
                <q-card-section class="full-height-section compact-section">
                  <div class="section-header">
                    <span class="section-title">Payroll History</span>
                  </div>
                  <div class="chart-container">
                    <div class="chart-placeholder">
                      <div class="chart-content">
                        <q-icon name="show_chart" class="chart-icon" />
                        <div class="chart-label">Payroll History Chart</div>
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-sm-6">
              <q-card class="modern-card equal-height-card">
                <q-card-section class="full-height-section compact-section">
                  <div class="section-header">
                    <span class="section-title">Smart Attendance</span>
                  </div>
                  <div class="attendance-content">
                    <q-list dense class="modern-list">
                      <q-item
                        v-for="(alert, index) in attendanceAlerts"
                        :key="index"
                        class="alert-item"
                      >
                        <q-item-section>
                          <q-item-label class="alert-text">{{ alert }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Recent Activity -->
          <q-card class="modern-card q-mt-sm">
            <q-card-section class="compact-section">
              <div class="section-header">
                <span class="section-title">Recent Activity</span>
              </div>
              <q-list separator class="modern-activity-list">
                <q-item
                  v-for="activity in recentActivities"
                  :key="activity.id"
                  class="activity-item"
                >
                  <q-item-section avatar>
                    <q-avatar size="28px" class="modern-avatar">
                      {{ activity.user.charAt(0) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="activity-user">{{ activity.user }}</q-item-label>
                    <q-item-label class="activity-time">{{ activity.time }}</q-item-label>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="activity-status">{{ activity.status }}</q-item-label>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="activity-details">{{ activity.details }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>

        <!-- Right Column -->
        <div class="col-12 col-lg-4">
          <!-- Stats Cards -->
          <div class="row q-col-gutter-xs q-mb-sm">
            <div v-for="(stat, i) in statsCards" :key="i" class="col-6 q-mb-xs">
              <q-card class="stat-card" :class="stat.gradient">
                <q-card-section class="stat-content">
                  <q-icon :name="stat.icon" class="stat-icon" />
                  <div class="stat-number">{{ stat.count }}</div>
                  <div class="stat-label">{{ stat.label }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Notifications -->
          <q-card class="modern-card q-mb-sm">
            <q-card-section class="compact-section">
              <div class="section-header">
                <q-icon name="notifications" class="section-icon notification-icon" />
                <span class="section-title">Notifications</span>
              </div>
              <q-list dense class="modern-list">
                <q-item v-for="(note, i) in notifications" :key="i" class="notification-item">
                  <q-item-section>
                    <q-item-label class="notification-text">{{ note }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Device/Fraud Alerts -->
          <q-card class="modern-card alerts-card">
            <q-card-section class="compact-section">
              <div class="section-header">
                <q-icon name="security" class="section-icon alert-icon" />
                <span class="section-title">Device/Fraud Alerts</span>
              </div>
              <q-list dense class="modern-list">
                <q-item class="alert-item-modern critical">
                  <q-item-section avatar>
                    <div class="alert-indicator critical-indicator">
                      <q-icon name="error" size="12px" />
                    </div>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="alert-text-modern"
                      >Date / Time - Critical Message</q-item-label
                    >
                  </q-item-section>
                </q-item>
                <q-item class="alert-item-modern warning">
                  <q-item-section avatar>
                    <div class="alert-indicator warning-indicator">
                      <q-icon name="warning" size="12px" />
                    </div>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="alert-text-modern"
                      >Date / Time - Warning Message</q-item-label
                    >
                  </q-item-section>
                </q-item>
                <q-item class="alert-item-modern info">
                  <q-item-section avatar>
                    <div class="alert-indicator info-indicator">
                      <q-icon name="info" size="12px" />
                    </div>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="alert-text-modern"
                      >Date / Time - Info Message</q-item-label
                    >
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
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
        { name: 'employees', label: 'Number of Employees', field: 'employees', align: 'center' },
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
        { icon: 'people', count: 64, label: 'Active', gradient: 'gradient-blue' },
        { icon: 'person_off', count: 1, label: 'Paid Leave', gradient: 'gradient-red' },
        { icon: 'schedule', count: 60, label: 'Clocked In', gradient: 'gradient-green' },
        { icon: 'person_remove', count: 1, label: 'Absent', gradient: 'gradient-orange' },
        { icon: 'access_time', count: 2, label: 'Time Off', gradient: 'gradient-purple' },
        { icon: 'request_page', count: 6, label: 'Requests', gradient: 'gradient-cyan' },
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
.dashboard-container {
  min-height: 100vh;
  background: #fafbfc;
}

.main-content {
  max-width: 1280px;
  margin: 0 auto;
}

/* Compact Sections */
.compact-section {
  padding: 10px 12px !important;
}

/* Modern Cards */
.modern-card {
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e8ecf0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.25s ease;
}

.modern-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Section Headers */
.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.section-icon {
  font-size: 17px;
  margin-right: 6px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #2d3748;
  letter-spacing: -0.02em;
}

/* Stats Cards */
.stat-card {
  border-radius: 10px;
  border: none;
  overflow: hidden;
  transition: all 0.25s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.stat-content {
  text-align: center;
  padding: 12px 10px !important;
  color: white;
  position: relative;
}

.stat-icon {
  font-size: 22px;
  margin-bottom: 6px;
  opacity: 0.9;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 9px;
  font-weight: 500;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Gradient Backgrounds */
.gradient-blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.gradient-red {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.gradient-green {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.gradient-orange {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.gradient-purple {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.gradient-cyan {
  background: linear-gradient(135deg, #96fbc4 0%, #f9f047 100%);
}

/* Modern Table */
.modern-table {
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.modern-table :deep(.q-table__top),
.modern-table :deep(.q-table__bottom),
.modern-table :deep(thead tr:first-child th) {
  background-color: #f8fafc;
}

.modern-table :deep(th) {
  font-weight: 600;
  color: #4a5568;
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 0.6px;
  padding: 6px 10px;
}

.modern-table :deep(td) {
  color: #2d3748;
  font-weight: 500;
  font-size: 11px;
  padding: 8px 10px;
}

.modern-table :deep(tbody tr:hover) {
  background-color: #f7fafc;
}

/* Status Chips */
.status-chip-success {
  background: linear-gradient(135deg, #48bb78, #38a169) !important;
  border-radius: 12px;
  font-weight: 600;
  font-size: 10px;
  padding: 3px 8px;
}

.status-chip-pending {
  background: linear-gradient(135deg, #ed8936, #dd6b20) !important;
  border-radius: 12px;
  font-weight: 600;
  font-size: 10px;
  padding: 3px 8px;
}

/* Equal Height Cards */
.equal-height-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.full-height-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.attendance-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chart-container {
  width: 100%;
  flex: 1;
  min-height: 140px;
}

.chart-placeholder {
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d1d5db;
}

.chart-content {
  text-align: center;
}

.chart-icon {
  font-size: 32px;
  color: #a0aec0;
  margin-bottom: 4px;
}

.chart-label {
  font-size: 11px;
  color: #718096;
  font-weight: 500;
}

/* Modern Lists */
.modern-list .q-item {
  border-radius: 5px;
  margin-bottom: 2px;
  transition: all 0.2s ease;
  padding: 6px 10px;
}

.modern-list .q-item:hover {
  background-color: #f7fafc;
}

.alert-text,
.notification-text {
  font-size: 11px;
  color: #4a5568;
  line-height: 1.4;
}

/* Activity List */
.modern-activity-list .activity-item {
  padding: 8px 0;
  border-radius: 8px;
  margin-bottom: 3px;
  transition: all 0.2s ease;
}

.modern-activity-list .activity-item:hover {
  background-color: #f7fafc;
  transform: translateX(2px);
}

.modern-avatar {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-weight: 600;
  font-size: 12px;
}

.activity-user {
  font-weight: 600;
  color: #2d3748;
  font-size: 12px;
}

.activity-time {
  color: #718096;
  font-size: 10px;
  margin-top: 2px;
}

.activity-status {
  font-weight: 600;
  color: #4a5568;
  font-size: 11px;
}

.activity-details {
  color: #718096;
  font-size: 10px;
}

/* Alert Items */
.alert-item-modern {
  padding: 6px 0;
  border-radius: 5px;
  margin-bottom: 3px;
  transition: all 0.2s ease;
}

.alert-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.critical-indicator {
  background: linear-gradient(135deg, #f56565, #e53e3e);
}

.warning-indicator {
  background: linear-gradient(135deg, #ed8936, #dd6b20);
}

.info-indicator {
  background: linear-gradient(135deg, #48bb78, #38a169);
}

.alert-text-modern {
  font-size: 11px;
  color: #4a5568;
  font-weight: 500;
}

/* Icons */
.notification-icon {
  color: #667eea;
}

.alert-icon {
  color: #e53e3e;
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 8px;
  }

  .stat-number {
    font-size: 18px;
  }

  .stat-icon {
    font-size: 20px;
  }

  .stat-content {
    padding: 10px 8px !important;
  }

  .compact-section {
    padding: 8px 10px !important;
  }

  .section-title {
    font-size: 12px;
  }

  .chart-container {
    min-height: 120px;
  }
}

@media (max-width: 600px) {
  .modern-table :deep(th) {
    font-size: 8px;
    padding: 5px 8px;
  }

  .modern-table :deep(td) {
    font-size: 10px;
    padding: 6px 8px;
  }
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modern-card {
  animation: fadeIn 0.4s ease forwards;
}

.stat-card {
  animation: fadeIn 0.5s ease forwards;
}
</style>
