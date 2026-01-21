<template>
  <q-page class="employee-detail-bg q-pa-none">
    <div class="q-pa-xl">
      <q-card class="main-detail-card q-pa-lg">
        <!-- Back Navigation -->
        <div class="row items-center q-mb-xl">
          <q-btn flat class="back-link" @click="goBack" icon="arrow_back">
            <span class="q-ml-xs">Back</span>
          </q-btn>
        </div>

        <div class="row q-col-gutter-xl">
          <!-- Left Column (2/3) -->
          <div class="col-12 col-lg-8">
            <!-- Personal Info Card -->
            <q-card class="q-mb-xl info-card">
              <q-card-section class="q-pa-xl">
                <div class="row items-center justify-between q-mb-xl">
                  <div class="section-title">Personal Information</div>
                  <q-btn
                    color="primary"
                    label="Edit Profile"
                    class="modern-btn"
                    icon="edit"
                    unelevated
                  />
                </div>

                <div class="row q-col-gutter-xl items-start">
                  <div class="col-auto">
                    <div class="avatar-container">
                      <q-avatar size="140px" class="employee-avatar">
                        <img
                          src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                          alt="Employee Avatar"
                        />
                      </q-avatar>
                      <div class="status-indicator online"></div>
                    </div>
                  </div>
                  <div class="col">
                    <div class="employee-name q-mb-md">Jorge Mendoza</div>
                    <div class="employee-info-grid">
                      <div class="info-item">
                        <div class="info-label">Mobile</div>
                        <div class="info-value">09179876543</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Email</div>
                        <div class="info-value">jorgemendoza@gmail.com</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Birthday</div>
                        <div class="info-value">January 1, 1988</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Address</div>
                        <div class="info-value">Utap, Tacloban</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Emergency Contact</div>
                        <div class="info-value">Harold Mendoza</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Emergency Number</div>
                        <div class="info-value">09170001234</div>
                      </div>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <!-- Employment History Card -->
            <q-card class="q-mb-xl info-card">
              <q-card-section class="q-pa-xl">
                <div class="row items-center justify-between q-mb-xl">
                  <div class="section-title">Employment History</div>
                  <div class="q-gutter-md">
                    <q-btn
                      flat
                      color="primary"
                      label="View All"
                      size="md"
                      class="text-btn"
                      icon="history"
                    />
                    <q-btn
                      color="primary"
                      label="Add Entry"
                      size="md"
                      class="modern-btn"
                      icon="add"
                      unelevated
                    />
                  </div>
                </div>

                <q-table
                  :rows="employmentHistory"
                  :columns="employmentColumns"
                  row-key="id"
                  flat
                  class="modern-table"
                  hide-pagination
                  :rows-per-page-options="[0]"
                >
                  <template v-slot:body-cell-amount="props">
                    <q-td :props="props" class="text-weight-medium"> ₱{{ props.value }} </q-td>
                  </template>
                </q-table>
              </q-card-section>
            </q-card>

            <!-- Payslip History Card -->
            <q-card class="info-card">
              <q-card-section class="q-pa-xl">
                <div class="row items-center justify-between q-mb-lg">
                  <div class="section-title">Payslip History</div>
                  <q-btn
                    flat
                    color="primary"
                    label="View All"
                    size="md"
                    class="text-btn"
                    icon="history"
                  />
                </div>

                <div class="empty-state">
                  <div class="empty-icon">
                    <q-icon name="description" />
                  </div>
                  <div class="empty-title">No Payslip History</div>
                  <div class="empty-subtitle">Payslip records will appear here once generated</div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Right Column (1/3) -->
          <div class="col-12 col-lg-4">
            <!-- Company Info Card -->
            <q-card class="q-mb-xl info-card">
              <q-card-section class="q-pa-xl">
                <div class="company-header q-mb-xl">
                  <div class="row items-center q-gutter-md">
                    <q-avatar size="64px" class="company-avatar">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2020_VEES5.png"
                        style="width: 56px; height: 56px"
                      />
                    </q-avatar>
                    <div>
                      <div class="company-name">VEES5</div>
                      <div class="company-subtitle">CORPORATION</div>
                    </div>
                  </div>
                </div>

                <div class="company-info-grid">
                  <div class="company-info-item">
                    <div class="info-label">Department</div>
                    <div class="info-value">Admin</div>
                  </div>
                  <div class="company-info-item">
                    <div class="info-label">Position</div>
                    <div class="info-value">Finance Officer</div>
                  </div>
                  <div class="company-info-item">
                    <div class="info-label">ID Number</div>
                    <div class="info-value">475671</div>
                  </div>
                  <div class="company-info-item">
                    <div class="info-label">Date Hired</div>
                    <div class="info-value">March 1, 2025</div>
                  </div>
                  <div class="company-info-item">
                    <div class="info-label">Employment Status</div>
                    <div class="status-badge active">Active</div>
                  </div>
                  <div class="company-info-item">
                    <div class="info-label">Device Status</div>
                    <div class="status-badge connected">Connected</div>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <!-- Recent Activity Card -->
            <q-card class="q-mb-xl info-card">
              <q-card-section class="q-pa-xl">
                <div class="row items-center justify-between q-mb-lg">
                  <div class="section-title">Recent Activity</div>
                  <q-btn
                    flat
                    color="primary"
                    label="View All"
                    size="md"
                    class="text-btn"
                    icon="history"
                  />
                </div>

                <div class="activity-list">
                  <div
                    v-for="activity in recentActivities"
                    :key="activity.id"
                    class="activity-item"
                  >
                    <div class="activity-dot"></div>
                    <div class="activity-content">
                      <div class="activity-date">{{ activity.date }}</div>
                      <div class="activity-description">{{ activity.activity }}</div>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <!-- Alerts Card -->
            <q-card class="info-card">
              <q-card-section class="q-pa-xl">
                <div class="row items-center justify-between q-mb-lg">
                  <div class="section-title">System Alerts</div>
                  <q-btn
                    flat
                    color="primary"
                    label="View All"
                    size="md"
                    class="text-btn"
                    icon="history"
                  />
                </div>

                <div class="alerts-list">
                  <div v-for="alert in alerts" :key="alert.id" class="alert-item">
                    <div class="alert-icon" :class="alert.type">
                      <q-icon :name="alert.icon" />
                    </div>
                    <div class="alert-content">
                      <div class="alert-message">{{ alert.message }}</div>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script>
export default {
  name: 'EmployeeDetailsPage',
  data() {
    return {
      employmentColumns: [
        {
          name: 'effectiveDate',
          label: 'Effective Date',
          field: 'effectiveDate',
          align: 'left',
          style: 'width: 140px',
        },
        {
          name: 'department',
          label: 'Department',
          field: 'department',
          align: 'left',
          style: 'width: 100px',
        },
        {
          name: 'position',
          label: 'Position',
          field: 'position',
          align: 'left',
          style: 'width: 120px',
        },
        {
          name: 'amount',
          label: 'Amount',
          field: 'amount',
          align: 'right',
          style: 'width: 100px',
        },
        {
          name: 'group',
          label: 'Group',
          field: 'group',
          align: 'center',
          style: 'width: 80px',
        },
        {
          name: 'cycle',
          label: 'Cycle',
          field: 'cycle',
          align: 'left',
          style: 'width: 100px',
        },
        {
          name: 'payType',
          label: 'Pay Type',
          field: 'payType',
          align: 'left',
          style: 'width: 100px',
        },
        {
          name: 'notes',
          label: 'Notes',
          field: 'notes',
          align: 'left',
        },
      ],
      employmentHistory: [
        {
          id: 1,
          effectiveDate: 'March 1, 2026',
          department: 'Admin',
          position: 'Attendant',
          amount: '425.00',
          group: 2,
          cycle: 'Bi-Weekly',
          payType: 'Daily',
          notes: 'Increase Due to Regularization',
        },
        {
          id: 2,
          effectiveDate: 'April 1, 2025',
          department: 'Admin',
          position: 'Cashier',
          amount: '500.00',
          group: 2,
          cycle: 'Bi-Weekly',
          payType: 'Daily',
          notes: '',
        },
        {
          id: 3,
          effectiveDate: 'June 1, 2025',
          department: 'Admin',
          position: 'Finance Officer',
          amount: '25,000.00',
          group: 3,
          cycle: 'Bi-Weekly',
          payType: 'Monthly',
          notes: '',
        },
      ],
      recentActivities: [
        {
          id: 1,
          date: 'Jul 16, 2025 - 08:03 AM',
          activity:
            'Clock In - Successfully clocked in during workplace operation time, on company campus',
        },
        {
          id: 2,
          date: 'Jul 15, 2025 - 06:03 AM',
          activity: 'Selfie Verified - Face match confirmed for attendance',
        },
        {
          id: 3,
          date: 'Jul 14, 2025 - 06:07 AM',
          activity: 'No Clock Out - Employee forgot to clock out yesterday',
        },
        {
          id: 4,
          date: 'Jul 13, 2025 - 12:31 PM',
          activity:
            "Leave Request Submitted - 1-day sick leave for July 18, 2025, Doctor's note attached",
        },
      ],
      alerts: [
        {
          id: 1,
          icon: 'error',
          type: 'error',
          message: 'Critical system alert - Requires immediate attention',
        },
        {
          id: 2,
          icon: 'warning',
          type: 'warning',
          message: 'Warning notification - Action may be required',
        },
        {
          id: 3,
          icon: 'info',
          type: 'info',
          message: 'Information update - System maintenance scheduled',
        },
      ],
    }
  },
  methods: {
    goBack() {
      this.$router.back()
    },
    editEmployee() {
      console.log('Edit employee')
    },
  },
}
</script>

<style scoped>
/* Background and Layout */
.employee-detail-bg {
  background: #ffffff;
  min-height: 100vh;
}

.main-detail-card {
  border-radius: 24px;
  background: #ffffff;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.24);
  border: none;
  max-width: 1400px;
  margin: 0 auto;
}

.info-card {
  border-radius: 20px;
  background: #ffffff;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.24);
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.info-card:hover {
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.07),
    0 10px 15px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* Navigation */
.back-link {
  color: #475569 !important;
  font-weight: 600;
  font-size: 16px;
  text-transform: none;
  border-radius: 12px;
  padding: 8px 16px;
  transition: all 0.2s ease;
}

.back-link:hover {
  background: #f8fafc;
  color: #334155 !important;
}

/* Typography */
.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
}

.employee-name {
  font-size: 36px;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.025em;
  line-height: 1.1;
}

/* Buttons */
.modern-btn {
  border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  padding: 12px 24px;
  font-size: 14px;
  letter-spacing: 0.025em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.modern-btn:hover {
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
  transform: translateY(-1px);
}

.text-btn {
  color: #64748b !important;
  font-weight: 600;
  text-transform: none;
  font-size: 14px;
  border-radius: 8px;
  padding: 8px 12px;
}

.text-btn:hover {
  background: #f8fafc;
  color: #475569 !important;
}

/* Avatar */
.avatar-container {
  position: relative;
}

.employee-avatar {
  border: 4px solid #ffffff;
  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.15),
    0 4px 10px rgba(0, 0, 0, 0.1);
}

.status-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-indicator.online {
  background: #10b981;
}

/* Info Grids */
.employee-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}

.company-info-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.company-info-item {
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.company-info-item:last-child {
  border-bottom: none;
}

/* Company Header */
.company-avatar {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
}

.company-name {
  font-size: 20px;
  font-weight: 800;
  color: #2563eb;
  letter-spacing: -0.025em;
}

.company-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.1em;
}

/* Status Badges */
.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.connected {
  background: #dbeafe;
  color: #1d4ed8;
}

/* Table */
.modern-table {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #f1f5f9;
}

.modern-table .q-table__top,
.modern-table .q-table__bottom {
  padding: 0;
}

.modern-table .q-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  font-size: 14px;
  padding: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0;
}

.modern-table .q-table td {
  background: #ffffff;
  padding: 16px;
  font-size: 14px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
}

.modern-table tbody tr:hover {
  background: #f8fafc;
}

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.activity-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  position: relative;
}

.activity-dot {
  width: 12px;
  height: 12px;
  background: #2563eb;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.activity-content {
  flex: 1;
}

.activity-date {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.activity-description {
  font-size: 14px;
  color: #334155;
  line-height: 1.5;
}

/* Alerts */
.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.alert-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  background: #fefefe;
}

.alert-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alert-icon.error {
  background: #fef2f2;
  color: #dc2626;
}

.alert-icon.warning {
  background: #fffbeb;
  color: #d97706;
}

.alert-icon.info {
  background: #eff6ff;
  color: #2563eb;
}

.alert-message {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
  line-height: 1.4;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: #f8fafc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: #94a3b8;
  font-size: 32px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: #64748b;
}

/* Responsive */
@media (max-width: 1023px) {
  .employee-info-grid {
    grid-template-columns: 1fr;
  }

  .employee-name {
    font-size: 28px;
  }

  .section-title {
    font-size: 20px;
  }
}
</style>
