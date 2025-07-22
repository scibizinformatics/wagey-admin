<template>
  <div class="dashboard-container">
    <!-- Main Content -->
    <div class="main-content q-pa-md">
      <div class="row q-col-gutter-xl q-mb-xl">
        <!-- Left Column -->
        <div class="col-12 col-lg-8">
          <!-- Payroll Status -->
          <q-card class="q-mb-md">
            <q-card-section>
              <div class="text-h6 q-mb-md">
                <q-icon name="receipt" class="q-mr-sm" />
                Current Payroll Status
              </div>

              <q-table
                :rows="payrollRows"
                :columns="payrollColumns"
                row-key="id"
                flat
                bordered
                dense
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:body-cell-status="props">
                  <q-td :props="props">
                    <q-chip
                      :color="props.value === 'Released' ? 'green' : 'orange'"
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
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-card>
                <q-card-section>
                  <div class="text-h6 q-mb-md">Payroll History</div>
                  <div class="chart-container">
                    <div
                      class="flex flex-center"
                      style="height: 100%; background: #f5f5f5; border-radius: 8px"
                    >
                      <div class="text-center">
                        <q-icon name="show_chart" size="2rem" color="grey" />
                        <div class="text-caption text-grey">Payroll History Chart</div>
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-sm-6">
              <q-card>
                <q-card-section>
                  <div class="text-h6 q-mb-md">Smart Attendance</div>
                  <q-list dense>
                    <q-item v-for="(alert, index) in attendanceAlerts" :key="index">
                      <q-item-section>
                        <q-item-label caption>{{ alert }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Recent Activity -->
          <q-card class="q-mt-lg q-pa-md card-rounded">
            <q-card-section>
              <div class="text-h6 q-mb-md">Recent Activity</div>
              <q-list separator>
                <q-item v-for="activity in recentActivities" :key="activity.id">
                  <q-item-section avatar>
                    <q-avatar size="32px" color="primary" text-color="white">
                      {{ activity.user.charAt(0) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ activity.user }}</q-item-label>
                    <q-item-label caption>{{ activity.time }}</q-item-label>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ activity.status }}</q-item-label>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>{{ activity.details }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>

        <!-- Right Column -->
        <div class="col-12 col-lg-4">
          <!-- Stats Cards -->
          <div class="row q-col-gutter-sm q-mb-md">
            <div v-for="(stat, i) in statsCards" :key="i" class="col-6 q-mb-sm">
              <q-card class="text-center q-pa-lg card-rounded" :class="stat.bg">
                <q-card-section>
                  <q-icon :name="stat.icon" size="2.5rem" :color="stat.color" class="q-mb-xs" />
                  <div class="text-h4 text-weight-bold">{{ stat.count }}</div>
                  <div class="text-caption">{{ stat.label }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Notifications -->
          <q-card class="q-mb-md">
            <q-card-section>
              <div class="text-h6 q-mb-sm">Notifications</div>
              <q-list dense>
                <q-item v-for="(note, i) in notifications" :key="i">
                  <q-item-section>
                    <q-item-label caption>{{ note }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Device/Fraud Alerts -->
          <q-card>
            <q-card-section>
              <div class="text-h6 q-mb-sm">Device/Fraud Alerts</div>
              <q-list dense>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="error" color="red" size="sm" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Date / Time - Critical Message</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="warning" color="orange" size="sm" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Date / Time - Warning Message</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="info" color="green" size="sm" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Date / Time - Info Message</q-item-label>
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
        { icon: 'people', count: 64, label: 'Active', bg: 'bg-blue-1', color: 'blue' },
        { icon: 'person_off', count: 1, label: 'Paid Leave', bg: 'bg-red-1', color: 'red' },
        { icon: 'schedule', count: 60, label: 'Clocked In', bg: 'bg-green-1', color: 'green' },
        { icon: 'person_remove', count: 1, label: 'Absent', bg: 'bg-orange-1', color: 'orange' },
        { icon: 'access_time', count: 2, label: 'Time Off', bg: 'bg-purple-1', color: 'purple' },
        { icon: 'request_page', count: 6, label: 'Requests', bg: 'bg-cyan-1', color: 'cyan' },
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
  background-color: #eaf1fb;
}

.header-bar {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
}

.chart-container {
  width: 100%;
  height: 200px;
}

.q-table th {
  font-weight: 600;
}

.q-chip {
  font-size: 0.75rem;
}

.card-rounded {
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.q-mb-md {
  margin-bottom: 24px !important;
}
.q-mt-md {
  margin-top: 24px !important;
}
.q-mb-xl {
  margin-bottom: 40px !important;
}
.q-mt-lg {
  margin-top: 32px !important;
}
</style>
