<template>
  <q-page class="attendance-bg q-pa-none">
    <div class="attendance-blue-section q-pa-xl q-pt-lg">
      <div class="row items-center q-mb-lg">
        <div class="col-auto q-gutter-md row">
          <q-card
            v-for="stat in stats"
            :key="stat.label"
            class="summary-card text-center"
            :class="stat.bg"
          >
            <q-card-section>
              <div class="text-h5 text-weight-bold">{{ stat.count }}</div>
              <div class="text-caption">{{ stat.label }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col text-right">
          <q-btn
            color="primary"
            class="add-slot-btn"
            rounded
            size="lg"
            icon="add"
            label="Add Time Slot"
          />
        </div>
      </div>
      <!-- Filter Row -->
      <div class="row q-gutter-md q-mb-md">
        <div class="col">
          <q-select
            dense
            outlined
            label="Date:"
            v-model="filters.date"
            :options="dateOptions"
            class="filter-select"
          />
        </div>
        <div class="col">
          <q-select
            dense
            outlined
            label="Source:"
            v-model="filters.source"
            :options="sourceOptions"
            class="filter-select"
          />
        </div>
        <div class="col">
          <q-select
            dense
            outlined
            label="Employee:"
            v-model="filters.employee"
            :options="employeeOptions"
            class="filter-select"
          />
        </div>
        <div class="col">
          <q-select
            dense
            outlined
            label="Department:"
            v-model="filters.department"
            :options="departmentOptions"
            class="filter-select"
          />
        </div>
        <div class="col">
          <q-select
            dense
            outlined
            label="Status:"
            v-model="filters.status"
            :options="statusOptions"
            class="filter-select"
          />
        </div>
      </div>
      <q-card class="attendance-table-card q-pa-none">
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="id"
          flat
          bordered
          separator="cell"
          dense
          :rows-per-page-options="[0]"
          class="attendance-table"
        >
          <template v-slot:body-cell-locationStatus="props">
            <q-td :props="props">
              <q-icon
                :name="props.value ? 'check' : 'close'"
                :color="props.value ? 'green' : 'red'"
              />
            </q-td>
          </template>
          <template v-slot:body-cell-qrStatus="props">
            <q-td :props="props">
              <q-icon
                :name="props.value ? 'check' : 'close'"
                :color="props.value ? 'green' : 'red'"
              />
            </q-td>
          </template>
          <template v-slot:body-cell-selfie="props">
            <q-td :props="props">
              <q-icon
                :name="props.value ? 'check' : 'close'"
                :color="props.value ? 'green' : 'red'"
              />
            </q-td>
          </template>
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-chip :color="statusColor(props.value)" text-color="white" size="sm">{{
                props.value
              }}</q-chip>
            </q-td>
          </template>
          <template v-slot:body-cell-action="props">
            <q-td :props="props">
              <q-btn flat dense size="sm" color="secondary" label="Edit" class="q-mr-xs" />
              <q-btn flat dense size="sm" color="negative" label="Delete" />
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
const stats = [
  { label: 'Scheduled Today', count: 30, bg: 'bg-blue-1' },
  { label: 'Clocked In', count: 26, bg: 'bg-green-1' },
  { label: 'Absent', count: 4, bg: 'bg-red-1' },
  { label: 'Late', count: 2, bg: 'bg-orange-1' },
]
const filters = ref({ date: '', source: '', employee: '', department: '', status: '' })
const dateOptions = ['Jul 15', 'Jul 14', 'Jul 13']
const sourceOptions = ['App', 'Manual']
const employeeOptions = [
  'Jorge Mendoza',
  'Maria Villanueva',
  'Kevin Santos',
  'Abigail Reyes',
  'Joseph Tan',
  'Jenny Arullo',
  'Reynaldo Lim',
  'Jane Dela Cruz',
  'Mark Villanueva',
  'Nico Santos',
  'Carla Zamora',
  'Ryan Cruz',
  'Beatrice Uy',
  'Alicia Robles',
  'Franca Dela Peña',
  'Anna Feliciano',
  'Paolo Ignacio',
]
const departmentOptions = ['Fatima', 'Admin', 'Apitong']
const statusOptions = ['Complete', 'Flagged', 'Absent']
const columns = [
  { name: 'date', label: 'Date', align: 'left', field: 'date', sortable: true },
  { name: 'source', label: 'Source', align: 'left', field: 'source', sortable: true },
  { name: 'name', label: 'Employee', align: 'left', field: 'name', sortable: true },
  { name: 'shift', label: 'Shift', align: 'center', field: 'shift', sortable: true },
  { name: 'clockIn', label: 'Clock In', align: 'center', field: 'clockIn', sortable: true },
  { name: 'clockOut', label: 'Clock Out', align: 'center', field: 'clockOut', sortable: true },
  {
    name: 'locationStatus',
    label: 'Location Status',
    align: 'center',
    field: 'locationStatus',
    sortable: false,
  },
  {
    name: 'qrStatus',
    label: 'QR Scan Status',
    align: 'center',
    field: 'qrStatus',
    sortable: false,
  },
  { name: 'selfie', label: 'Selfie', align: 'center', field: 'selfie', sortable: false },
  { name: 'status', label: 'Status', align: 'center', field: 'status', sortable: true },
  { name: 'notes', label: 'Notes', align: 'left', field: 'notes', sortable: false },
  { name: 'action', label: 'Action', align: 'center', field: 'action', sortable: false },
]
const rows = [
  {
    id: 1,
    date: 'Jul 15',
    source: 'App',
    name: 'Jorge Mendoza',
    shift: '1',
    clockIn: '06:03 AM',
    clockOut: '02:05 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: '',
  },
  {
    id: 2,
    date: 'Jul 15',
    source: 'App',
    name: 'Maria Villanueva',
    shift: '1',
    clockIn: '06:30 AM',
    clockOut: '02:00 PM',
    locationStatus: false,
    qrStatus: true,
    selfie: true,
    status: 'Flagged',
    notes: 'Outside workplace area',
  },
  {
    id: 3,
    date: 'Jul 15',
    source: 'Manual',
    name: 'Kevin Santos',
    shift: '2',
    clockIn: '06:00 PM',
    clockOut: '03:00 AM',
    locationStatus: true,
    qrStatus: false,
    selfie: true,
    status: 'Complete',
    notes: 'Added by Supervisor',
  },
  {
    id: 4,
    date: 'Jul 15',
    source: 'App',
    name: 'Abigail Reyes',
    shift: '2',
    clockIn: '02:12 PM',
    clockOut: '-',
    locationStatus: true,
    qrStatus: false,
    selfie: true,
    status: 'Complete',
    notes: 'No clock-out recorded',
  },
  {
    id: 5,
    date: 'Jul 15',
    source: 'App',
    name: 'Joseph Tan',
    shift: '1',
    clockIn: '06:45 AM',
    clockOut: '10:00 PM',
    locationStatus: true,
    qrStatus: false,
    selfie: false,
    status: 'Flagged',
    notes: 'Forgot to scan QR',
  },
  {
    id: 6,
    date: 'Jul 15',
    source: 'App',
    name: 'Jenny Arullo',
    shift: '1',
    clockIn: '-',
    clockOut: '01:59 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: false,
    status: 'Absent',
    notes: 'No check-in activity',
  },
  {
    id: 7,
    date: 'Jul 15',
    source: 'App',
    name: 'Reynaldo Lim',
    shift: '2',
    clockIn: '08:00 AM',
    clockOut: '05:00 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: false,
    status: 'Flagged',
    notes: 'Blurry selfie, needs validation',
  },
  {
    id: 8,
    date: 'Jul 15',
    source: 'App',
    name: 'Jane Dela Cruz',
    shift: '1',
    clockIn: '02:00 PM',
    clockOut: '10:00 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: 'Early clock-in',
  },
  {
    id: 9,
    date: 'Jul 15',
    source: 'App',
    name: 'Mark Villanueva',
    shift: '2',
    clockIn: '06:15 AM',
    clockOut: '02:30 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: 'Slight late',
  },
  {
    id: 10,
    date: 'Jul 15',
    source: 'App',
    name: 'Nico Santos',
    shift: '1',
    clockIn: '06:15 AM',
    clockOut: '02:30 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: 'Ongoing shift, no clock-out yet',
  },
  {
    id: 11,
    date: 'Jul 15',
    source: 'App',
    name: 'Carla Zamora',
    shift: '2',
    clockIn: '-',
    clockOut: '-',
    locationStatus: false,
    qrStatus: false,
    selfie: false,
    status: 'Absent',
    notes: 'Did not report to work',
  },
  {
    id: 12,
    date: 'Jul 15',
    source: 'App',
    name: 'Ryan Cruz',
    shift: '1',
    clockIn: '08:05 AM',
    clockOut: '05:00 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: '',
  },
  {
    id: 13,
    date: 'Jul 15',
    source: 'App',
    name: 'Beatrice Uy',
    shift: '2',
    clockIn: '01:05 PM',
    clockOut: '05:15 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: 'Shortened shift (authorized)',
  },
  {
    id: 14,
    date: 'Jul 15',
    source: 'Manual',
    name: 'Alicia Robles',
    shift: '1',
    clockIn: '08:00 AM',
    clockOut: '05:00 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: 'Offline log manually uploaded',
  },
  {
    id: 15,
    date: 'Jul 15',
    source: 'App',
    name: 'Franca Dela Peña',
    shift: '2',
    clockIn: '02:00 PM',
    clockOut: '10:00 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: '1 minute OT',
  },
  {
    id: 16,
    date: 'Jul 15',
    source: 'App',
    name: 'Anna Feliciano',
    shift: '1',
    clockIn: '01:59 PM',
    clockOut: '05:00 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: 'Clock-in delayed >15 mins',
  },
  {
    id: 17,
    date: 'Jul 15',
    source: 'App',
    name: 'Paolo Ignacio',
    shift: '2',
    clockIn: '01:59 PM',
    clockOut: '05:00 PM',
    locationStatus: true,
    qrStatus: true,
    selfie: true,
    status: 'Complete',
    notes: 'On time',
  },
]
function statusColor(status) {
  if (status === 'Complete') return 'green'
  if (status === 'Flagged') return 'orange'
  if (status === 'Absent') return 'red'
  return 'grey'
}
</script>

<style scoped>
.attendance-header-bar {
  min-height: 56px;
}
.attendance-bg {
  background: #eaf1fb;
  min-height: 100vh;
}
.attendance-blue-section {
  border-radius: 0 0 18px 18px;
  margin-bottom: 0;
}
.summary-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  min-width: 180px;
  min-height: 70px;
  display: inline-block;
}
.add-slot-btn {
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 20px;
  text-transform: none;
}
.filter-select {
  min-width: 120px;
  background: #fff;
  border-radius: 8px;
}
.attendance-table-card {
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-top: 18px;
}
.attendance-table th {
  font-weight: 600;
  background: #eaf1fb;
  color: #1741a6;
  font-size: 0.95rem;
}
.attendance-table td {
  background: white;
  font-size: 0.92rem;
}
</style>
