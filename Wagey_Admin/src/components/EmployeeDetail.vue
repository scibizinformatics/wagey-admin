<template>
  <q-page class="employee-detail-bg q-pa-none">
    <div class="q-pa-xl">
      <q-card class="main-detail-card q-pa-lg">
        <div class="row items-center q-mb-md">
          <q-btn flat class="back-link" @click="goBack">Back</q-btn>
        </div>
        <div class="row q-col-gutter-xl">
          <!-- Left Column (2/3) -->
          <div class="col-12 col-lg-8">
            <q-card class="q-mb-md info-card">
              <q-card-section>
                <div class="row items-center justify-between q-mb-md">
                  <div class="text-h6 text-weight-bold">Personal Info</div>
                  <q-btn color="primary" label="+ Edit" class="edit-btn" />
                </div>
                <div class="row q-gutter-lg">
                  <div class="col-auto">
                    <q-avatar size="120px" class="shadow-2">
                      <img
                        src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                        alt="Employee Avatar"
                      />
                    </q-avatar>
                  </div>
                  <div class="col">
                    <div class="text-h4 text-weight-bold q-mb-sm">Jorge Mendoza</div>
                    <div class="text-body2 q-mb-xs">Mobile: 09179876543</div>
                    <div class="text-body2 q-mb-xs">Email: jorgemendoza@gmail.com</div>
                    <div class="text-body2 q-mb-xs">Birthday: January 1, 1988</div>
                    <div class="text-body2 q-mb-xs">Address: Utap, Tacloban</div>
                    <div class="text-body2 q-mb-xs">Emergency Contact: Harold Mendoza</div>
                    <div class="text-body2">Emergency Contact Number: 09170001234</div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
            <q-card class="q-mb-md info-card">
              <q-card-section>
                <div class="row items-center justify-between q-mb-md">
                  <div class="text-h6 text-weight-bold">Employment History</div>
                  <div class="q-gutter-sm">
                    <q-btn
                      flat
                      color="primary"
                      label="View History"
                      size="sm"
                      class="history-link"
                    />
                    <q-btn color="primary" label="+ Add" size="sm" class="add-btn" />
                  </div>
                </div>
                <q-table
                  :rows="employmentHistory"
                  :columns="employmentColumns"
                  row-key="id"
                  flat
                  bordered
                  dense
                  hide-pagination
                  :rows-per-page-options="[0]"
                  class="blue-bordered-table"
                >
                  <template v-slot:body-cell-amount="props">
                    <q-td :props="props"> ₱{{ props.value }} </q-td>
                  </template>
                </q-table>
              </q-card-section>
            </q-card>
            <q-card class="info-card">
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="text-h6 text-weight-bold">Payslip History</div>
                  <q-btn flat color="primary" label="View History" size="sm" class="history-link" />
                </div>
                <div class="q-mt-md text-center text-grey-6">
                  <q-icon name="description" size="3rem" />
                  <div class="q-mt-sm">No payslip history available</div>
                </div>
              </q-card-section>
            </q-card>
          </div>
          <!-- Right Column (1/3) -->
          <div class="col-12 col-lg-4">
            <q-card class="q-mb-md info-card q-pa-md">
              <div class="row items-center q-mb-md">
                <div class="col-auto">
                  <q-avatar size="56px" color="white">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2020_VEES5.png"
                      style="width: 48px; height: 48px"
                    />
                  </q-avatar>
                </div>
                <div class="col">
                  <div class="text-h6 text-weight-bold text-primary">VEES5</div>
                  <div class="text-caption text-grey-7">CORPORATION</div>
                </div>
              </div>
              <div class="text-body2 q-mb-xs"><strong>Department:</strong> Admin</div>
              <div class="text-body2 q-mb-xs"><strong>Position:</strong> Finance Officer</div>
              <div class="text-body2 q-mb-xs"><strong>ID Number:</strong> 475671</div>
              <div class="text-body2 q-mb-xs"><strong>Date Hired:</strong> March 1, 2025</div>
              <div class="text-body2 q-mb-xs">
                <strong>Employment Status:</strong>
                <span class="text-green text-weight-bold">Active</span>
              </div>
              <div class="text-body2">
                <strong>Device Status:</strong>
                <span class="text-blue text-weight-bold">Connected</span>
              </div>
            </q-card>
            <q-card class="q-mb-md info-card">
              <q-card-section>
                <div class="row items-center justify-between q-mb-md">
                  <div class="text-h6 text-weight-bold">Recent Activity:</div>
                  <q-btn flat color="primary" label="View History" size="sm" class="history-link" />
                </div>
                <q-list dense separator>
                  <q-item v-for="activity in recentActivities" :key="activity.id">
                    <q-item-section>
                      <q-item-label class="text-caption">{{ activity.date }}</q-item-label>
                      <q-item-label caption>{{ activity.activity }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
            <q-card class="info-card">
              <q-card-section>
                <div class="row items-center justify-between q-mb-md">
                  <div class="text-h6 text-weight-bold">Device/Fraud Alerts</div>
                  <q-btn flat color="primary" label="View History" size="sm" class="history-link" />
                </div>
                <q-list dense>
                  <q-item v-for="alert in alerts" :key="alert.id">
                    <q-item-section avatar>
                      <q-icon :name="alert.icon" :color="alert.color" size="sm" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption>{{ alert.message }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
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
          style: 'width: 100px',
        },
        {
          name: 'department',
          label: 'Department',
          field: 'department',
          align: 'left',
          style: 'width: 80px',
        },
        {
          name: 'position',
          label: 'Position',
          field: 'position',
          align: 'left',
          style: 'width: 100px',
        },
        { name: 'amount', label: 'Amount', field: 'amount', align: 'right', style: 'width: 80px' },
        { name: 'group', label: 'Group', field: 'group', align: 'center', style: 'width: 60px' },
        { name: 'cycle', label: 'Cycle', field: 'cycle', align: 'left', style: 'width: 80px' },
        {
          name: 'payType',
          label: 'Pay Type',
          field: 'payType',
          align: 'left',
          style: 'width: 80px',
        },
        { name: 'notes', label: 'Notes', field: 'notes', align: 'left' },
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
        { id: 1, icon: 'error', color: 'red', message: 'Date / Time - Critical Message' },
        { id: 2, icon: 'warning', color: 'orange', message: 'Date / Time - Warning Message' },
        { id: 3, icon: 'info', color: 'green', message: 'Date / Time - Info Message' },
      ],
    }
  },
  methods: {
    goBack() {
      this.$router.back()
    },
    editEmployee() {
      // Open edit employee dialog/page
      console.log('Edit employee')
    },
  },
}
</script>

<style scoped>
.employee-header-bar {
  background: #2563eb;
  min-height: 56px;
  border-bottom: 4px solid #1741a6;
}
.employee-detail-bg {
  background: #eaf1fb;
  min-height: 100vh;
}
.main-detail-card {
  border: 2.5px solid #2563eb;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.07);
}
.info-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1.5px solid #2563eb22;
  background: #fff;
}
.back-link {
  color: #2563eb !important;
  font-weight: bold;
  font-size: 1.1rem;
  text-transform: none;
  min-width: 0;
  padding-left: 0;
}
.edit-btn {
  border-radius: 20px;
  font-weight: bold;
  text-transform: none;
}
.add-btn {
  border-radius: 20px;
  font-weight: bold;
  text-transform: none;
}
.history-link {
  color: #2563eb !important;
  font-weight: bold;
  text-transform: none;
}
.blue-bordered-table {
  border: 1.5px solid #2563eb;
  border-radius: 10px;
  background: #fff;
}
.blue-bordered-table .q-table th {
  background: #eaf1fb;
  color: #1741a6;
  font-weight: bold;
  font-size: 0.95rem;
}
.blue-bordered-table .q-table td {
  background: #fff;
  font-size: 0.92rem;
}
.text-h4 {
  font-size: 2.1rem;
}
.text-h6 {
  font-size: 1.25rem;
}
</style>
