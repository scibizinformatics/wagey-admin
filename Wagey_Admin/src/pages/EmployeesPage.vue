<template>
  <q-page class="employees-bg q-pa-none">
    <div class="employees-blue-section q-px-xl q-pt-lg q-pb-md q-mb-xl">
      <div class="row items-center q-gutter-md q-mb-md">
        <div class="col-auto row q-gutter-md">
          <q-card class="summary-card bg-blue-1 text-center">
            <q-card-section>
              <div class="text-h6">Total Employees</div>
              <div class="text-h4 text-weight-bold">100</div>
            </q-card-section>
          </q-card>
          <q-card class="summary-card bg-green-1 text-center">
            <q-card-section>
              <div class="text-h6">Active Employees</div>
              <div class="text-h4 text-weight-bold">64</div>
            </q-card-section>
          </q-card>
          <q-card class="summary-card bg-red-1 text-center">
            <q-card-section>
              <div class="text-h6">Inactive Employees</div>
              <div class="text-h4 text-weight-bold">36</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col text-right">
          <q-input
            dense
            outlined
            rounded
            placeholder=""
            v-model="search"
            class="search-bar q-mr-md"
            :style="{ width: '260px', background: 'white' }"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-btn
            color="primary"
            class="add-employee-btn"
            rounded
            size="lg"
            icon="person_add"
            label="Add Employee"
          />
        </div>
      </div>
    </div>
    <div class="q-px-xl">
      <q-card class="employee-table-card blue-bordered-table q-pa-md">
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="id"
          flat
          bordered
          separator="cell"
          dense
          :rows-per-page-options="[0]"
          :filter="search"
          class="employee-table"
        >
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-chip
                :color="
                  props.value === 'Active' ? 'green' : props.value === 'Terminated' ? 'red' : 'grey'
                "
                text-color="white"
                size="sm"
              >
                {{ props.value }}
              </q-chip>
            </q-td>
          </template>
          <template v-slot:body-cell-device="props">
            <q-td :props="props">
              <span :class="props.value === 'Connected' ? 'text-green' : 'text-red'">{{
                props.value
              }}</span>
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                size="sm"
                color="primary"
                label="View"
                class="q-mr-xs"
                @click="router.push({ name: 'employee-detail', params: { id: props.row.id } })"
              />
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
import { useRouter } from 'vue-router'
const router = useRouter()
const search = ref('')
const columns = [
  { name: 'index', label: '#', align: 'center', field: 'index', sortable: false },
  { name: 'name', label: 'Employee Name', align: 'left', field: 'name', sortable: true },
  { name: 'department', label: 'Department', align: 'left', field: 'department', sortable: true },
  { name: 'position', label: 'Position', align: 'left', field: 'position', sortable: true },
  { name: 'id', label: 'ID Number', align: 'left', field: 'id', sortable: true },
  { name: 'dateHired', label: 'Date Hired', align: 'left', field: 'dateHired', sortable: true },
  { name: 'status', label: 'Employment Status', align: 'center', field: 'status', sortable: true },
  { name: 'wageGroup', label: 'Wage Group', align: 'center', field: 'wageGroup', sortable: true },
  { name: 'payType', label: 'Pay Type', align: 'center', field: 'payType', sortable: true },
  {
    name: 'currentWage',
    label: 'Current Wage',
    align: 'right',
    field: 'currentWage',
    sortable: true,
  },
  {
    name: 'lastUpdated',
    label: 'Last Date Updated',
    align: 'left',
    field: 'lastUpdated',
    sortable: true,
  },
  { name: 'device', label: 'Device Status', align: 'center', field: 'device', sortable: true },
  { name: 'actions', label: 'Action', align: 'center', field: 'actions', sortable: false },
]
const rows = [
  {
    index: 1,
    name: 'Maria Villanueva',
    department: 'Fatima',
    position: 'Cashier',
    id: 'EMP-0001',
    dateHired: '2022-01-10',
    status: 'Active',
    wageGroup: 2,
    payType: 'Daily',
    currentWage: '425.00',
    lastUpdated: '2024-12-01',
    device: 'Connected',
  },
  {
    index: 2,
    name: 'Kevin Santos',
    department: 'Fatima',
    position: 'Attendant',
    id: 'EMP-0002',
    dateHired: '2023-06-10',
    status: 'Active',
    wageGroup: 2,
    payType: 'Daily',
    currentWage: '425.00',
    lastUpdated: '2025-04-01',
    device: 'Connected',
  },
  {
    index: 3,
    name: 'Abigail Reyes',
    department: 'Fatima',
    position: 'Attendant',
    id: 'EMP-0003',
    dateHired: '2023-08-26',
    status: 'Active',
    wageGroup: 2,
    payType: 'Daily',
    currentWage: '425.00',
    lastUpdated: '2025-06-10',
    device: 'Connected',
  },
  {
    index: 4,
    name: 'Joseph Tan',
    department: 'Fatima',
    position: 'Officer',
    id: 'EMP-0004',
    dateHired: '2022-11-03',
    status: 'Active',
    wageGroup: 2,
    payType: 'Daily',
    currentWage: '425.00',
    lastUpdated: '2025-01-15',
    device: 'Connected',
  },
  {
    index: 5,
    name: 'Jenny Arullo',
    department: 'Fatima',
    position: 'Attendant',
    id: 'EMP-0005',
    dateHired: '2024-02-19',
    status: 'Terminated',
    wageGroup: 2,
    payType: 'Daily',
    currentWage: '425.00',
    lastUpdated: '2025-03-01',
    device: 'Disconnected',
  },
  {
    index: 6,
    name: 'Reynaldo Lim',
    department: 'Apitong',
    position: 'Cashier',
    id: 'EMP-0006',
    dateHired: '2023-05-17',
    status: 'Active',
    wageGroup: 2,
    payType: 'Daily',
    currentWage: '425.00',
    lastUpdated: '2025-05-01',
    device: 'Connected',
  },
  {
    index: 7,
    name: 'Jane Dela Cruz',
    department: 'Apitong',
    position: 'Attendant',
    id: 'EMP-0007',
    dateHired: '2022-04-05',
    status: 'Active',
    wageGroup: 2,
    payType: 'Daily',
    currentWage: '425.00',
    lastUpdated: '2025-01-01',
    device: 'Connected',
  },
  {
    index: 8,
    name: 'Eric Villanueva',
    department: 'Apitong',
    position: 'Attendant',
    id: 'EMP-0008',
    dateHired: '2022-06-10',
    status: 'Active',
    wageGroup: 2,
    payType: 'Daily',
    currentWage: '425.00',
    lastUpdated: '2025-07-01',
    device: 'Connected',
  },
  {
    index: 9,
    name: 'Mark Villanueva',
    department: 'Apitong',
    position: 'Finance Officer',
    id: 'EMP-0009',
    dateHired: '2023-04-03',
    status: 'Active',
    wageGroup: 3,
    payType: 'Monthly',
    currentWage: '23,000.00',
    lastUpdated: '2025-01-01',
    device: 'Connected',
  },
  {
    index: 10,
    name: 'Jorge Mendoza',
    department: 'Admin',
    position: 'Finance Officer',
    id: 'EMP-0010',
    dateHired: '2023-10-14',
    status: 'Active',
    wageGroup: 3,
    payType: 'Monthly',
    currentWage: '25,000.00',
    lastUpdated: '2025-05-21',
    device: 'Connected',
  },
  {
    index: 11,
    name: 'Althea Samson',
    department: 'Admin',
    position: 'Liason',
    id: 'EMP-0011',
    dateHired: '2024-05-06',
    status: 'Active',
    wageGroup: 3,
    payType: 'Monthly',
    currentWage: '20,000.00',
    lastUpdated: '2025-01-01',
    device: 'Connected',
  },
  {
    index: 12,
    name: 'Paolo Enriquez',
    department: 'Admin',
    position: 'HR Officer',
    id: 'EMP-0012',
    dateHired: '2023-07-30',
    status: 'Active',
    wageGroup: 3,
    payType: 'Monthly',
    currentWage: '20,000.00',
    lastUpdated: '2025-01-01',
    device: 'Connected',
  },
]
</script>

<style scoped>
.employees-bg {
  background: #eaf1fb;
  min-height: 100vh;
}
.employees-blue-section {
  border-radius: 0 0 18px 18px;
  margin-bottom: 0;
}
.text-h5 {
  font-weight: bold;
}
.summary-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  min-width: 180px;
  min-height: 70px;
  display: inline-block;
}
.add-employee-btn {
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 20px;
  text-transform: none;
  bottom: 40px;
}
.employee-table-card {
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-top: 18px;
}
.employee-table th {
  font-weight: 600;
  background: #eaf1fb;
  color: #1741a6;
  font-size: 0.95rem;
}
.employee-table td {
  background: white;
  font-size: 0.92rem;
}
.search-bar {
  min-width: 50%;
  bottom: 20px;
  padding: 0px 0px;
  border-radius: 18px;
  background: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  font-size: 1rem;
  height: 40px;
  border: -0.5px solid #e3eafc;
}
</style>
