<template>
  <q-page class="employee-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Employee Management</h1>
            <p class="page-subtitle">Manage your team members and their information</p>
          </div>
          <div class="header-actions">
            <q-input
              v-model="searchTerm"
              placeholder="Search employees..."
              class="header-search"
              dense
              outlined
              @input="filterEmployees"
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-section">
        <div class="stats-card personal-card">
          <div class="stats-icon-wrapper">
            <q-icon name="people" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ employeeStats.total }}</div>
            <div class="stats-label">Total Employees</div>
          </div>
        </div>

        <div class="stats-card corporate-card">
          <div class="stats-icon-wrapper">
            <q-icon name="business" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ employeeStats.active }}</div>
            <div class="stats-label">Active</div>
          </div>
        </div>

        <div class="stats-card business-card">
          <div class="stats-icon-wrapper">
            <q-icon name="trending_up" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ employeeStats.inactive }}</div>
            <div class="stats-label">Inactive</div>
          </div>
        </div>

        <div class="stats-card custom-card">
          <div class="stats-icon-wrapper">
            <q-icon name="settings" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Manage Team</div>
            <div class="stats-sublabel">Choose Action</div>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title-section">
            <h2 class="table-title">Employee Overview</h2>
          </div>
          <div class="table-actions">
            <q-select
              v-model="sortBy"
              :options="['Newest', 'Oldest', 'A-Z', 'Z-A']"
              label="Sort by: Newest"
              class="sort-select"
              dense
              outlined
            />
          </div>
        </div>

        <!-- Employee Table -->
        <div class="modern-table-container">
          <q-table
            :rows="filteredEmployees"
            :columns="columns"
            row-key="id"
            flat
            :loading="loading"
            no-data-label="No employees found"
            class="loan-table"
            hide-pagination
            :rows-per-page-options="[0]"
          >
            <template v-slot:header>
              <q-tr class="table-header-row">
                <q-th class="table-header-cell">SL No</q-th>
                <q-th class="table-header-cell">Employee Name</q-th>
                <q-th class="table-header-cell">Email</q-th>
                <q-th class="table-header-cell">Position</q-th>
                <q-th class="table-header-cell">Role</q-th>
                <q-th class="table-header-cell">Status</q-th>
                <q-th class="table-header-cell">Actions</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr class="table-body-row" :class="{ 'total-row': props.row.isTotal }">
                <q-td class="table-body-cell">
                  {{ String(props.rowIndex + 1).padStart(2, '0') }}.
                </q-td>
                <q-td class="table-body-cell employee-name-cell">
                  <div class="employee-info">
                    <q-avatar size="32px" color="primary" text-color="white">
                      {{ getInitials(getFullName(props.row)) }}
                    </q-avatar>
                    <span class="employee-name">{{ getFullName(props.row) }}</span>
                  </div>
                </q-td>
                <q-td class="table-body-cell email-cell">
                  <a :href="`mailto:${getEmail(props.row)}`" class="email-link">
                    {{ getEmail(props.row) }}
                  </a>
                </q-td>
                <q-td class="table-body-cell">
                  {{ props.row.position || 'N/A' }}
                </q-td>
                <q-td class="table-body-cell">
                  {{ props.row.user_role_name || 'N/A' }}
                </q-td>
                <q-td class="table-body-cell">
                  <div
                    class="status-badge"
                    :class="getModernStatusClass(props.row.employment_status)"
                  >
                    {{ props.row.employment_status || 'N/A' }}
                  </div>
                </q-td>
                <q-td class="table-body-cell actions-cell">
                  <div class="action-buttons">
                    <q-btn
                      flat
                      round
                      icon="visibility"
                      size="sm"
                      class="action-btn view-btn"
                      @click="viewEmployee(props.row)"
                    />
                    <q-btn
                      flat
                      round
                      icon="edit"
                      size="sm"
                      class="action-btn edit-btn"
                      @click="editEmployee(props.row)"
                    />
                    <q-btn
                      flat
                      round
                      icon="update"
                      size="sm"
                      class="action-btn update-btn"
                      @click="updateEmployee(props.row)"
                    />
                  </div>
                </q-td>
              </q-tr>
            </template>
          </q-table>

          <!-- Table Footer -->
          <div class="table-footer">
            <div class="footer-info">
              <span class="total-label">Total</span>
              <span class="total-employees">{{ filteredEmployees.length }} Employees</span>
              <span class="total-active">{{ employeeStats.active }} Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- View Employee Modal -->
    <q-dialog v-model="showViewModal" persistent>
      <q-card class="modal-card view-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="48px" color="primary" text-color="white" class="modal-avatar">
              {{ getInitials(getFullName(selectedEmployee)) }}
            </q-avatar>
            <div>
              <div class="modal-title">{{ getFullName(selectedEmployee) }}</div>
              <div class="modal-subtitle">Employee Details</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="showViewModal = false" />
        </q-card-section>

        <q-separator />

        <q-card-section class="modal-content">
          <div class="detail-grid">
            <div class="detail-section">
              <h3 class="section-title">Personal Information</h3>
              <div class="detail-row">
                <span class="detail-label">Full Name:</span>
                <span class="detail-value">{{ getFullName(selectedEmployee) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">{{ getEmail(selectedEmployee) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Username:</span>
                <span class="detail-value">{{ selectedEmployee?.user?.username || 'N/A' }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h3 class="section-title">Employment Information</h3>
              <div class="detail-row">
                <span class="detail-label">Position:</span>
                <span class="detail-value">{{ selectedEmployee?.position || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Role:</span>
                <span class="detail-value">{{ selectedEmployee?.user_role_name || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <q-chip
                  :label="selectedEmployee?.employment_status || 'N/A'"
                  :class="getModernStatusClass(selectedEmployee?.employment_status)"
                  class="status-chip"
                />
              </div>
            </div>

            <div class="detail-section">
              <h3 class="section-title">Additional Details</h3>
              <div class="detail-row">
                <span class="detail-label">Employee ID:</span>
                <span class="detail-value">{{ selectedEmployee?.id || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">User ID:</span>
                <span class="detail-value">{{ selectedEmployee?.user?.id || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date Active:</span>
                <span class="detail-value">{{
                  selectedEmployee?.date_created
                    ? new Date(selectedEmployee.date_created).toLocaleDateString()
                    : 'N/A'
                }}</span>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Edit Employee Modal -->
    <q-dialog v-model="showEditModal" persistent>
      <q-card class="modal-card edit-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-icon name="edit" class="modal-icon" />
            <div>
              <div class="modal-title">Edit Employee</div>
              <div class="modal-subtitle">{{ getFullName(selectedEmployee) }}</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="cancelEdit" />
        </q-card-section>

        <q-separator />

        <q-card-section class="modal-content">
          <q-form @submit="saveEmployee" class="edit-form">
            <div class="form-grid">
              <div class="form-section">
                <h3 class="section-title">Personal Information</h3>

                <q-input
                  v-model="editForm.first_name"
                  label="First Name"
                  outlined
                  dense
                  class="form-input"
                  :rules="[(val) => !!val || 'First name is required']"
                />

                <q-input
                  v-model="editForm.last_name"
                  label="Last Name"
                  outlined
                  dense
                  class="form-input"
                  :rules="[(val) => !!val || 'Last name is required']"
                />

                <q-input
                  v-model="editForm.email"
                  label="Email"
                  type="email"
                  outlined
                  dense
                  class="form-input"
                  :rules="[
                    (val) => !!val || 'Email is required',
                    (val) => /.+@.+\..+/.test(val) || 'Email must be valid',
                  ]"
                />

                <q-input
                  v-model="editForm.username"
                  label="Username"
                  outlined
                  dense
                  class="form-input"
                />
              </div>

              <div class="form-section">
                <h3 class="section-title">Employment Information</h3>

                <q-input
                  v-model="editForm.position"
                  label="Position"
                  outlined
                  dense
                  class="form-input"
                />

                <q-select
                  v-model="editForm.user_role_name"
                  :options="roleOptions"
                  label="Role"
                  outlined
                  dense
                  class="form-input"
                  emit-value
                  map-options
                />

                <q-select
                  v-model="editForm.employment_status"
                  :options="statusOptions"
                  label="Employment Status"
                  outlined
                  dense
                  class="form-input"
                  emit-value
                  map-options
                />
              </div>
            </div>

            <div class="form-actions">
              <q-btn label="Cancel" flat color="grey-7" @click="cancelEdit" class="cancel-btn" />
              <q-btn
                label="Save Changes"
                type="submit"
                color="primary"
                :loading="savingEmployee"
                class="save-btn"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const employees = ref([])
const filteredEmployees = ref([])
const searchTerm = ref('')
const loading = ref(false)
const sortBy = ref('Newest')

// Modal states
const showViewModal = ref(false)
const showEditModal = ref(false)
const selectedEmployee = ref({})
const savingEmployee = ref(false)

// Edit form data
const editForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  position: '',
  user_role_name: '',
  employment_status: '',
  address: '',
  password: '',
})

// Options for dropdowns
const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Employee', value: 'employee' },
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'HR', value: 'hr' },
]

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Terminated', value: 'terminated' },
]

const columns = [
  {
    name: 'full_name',
    label: 'Full Name',
    align: 'left',
    field: (row) => getFullName(row),
    sortable: true,
  },
  { name: 'email', label: 'Email', align: 'left', field: (row) => getEmail(row), sortable: true },
  {
    name: 'position',
    label: 'Position',
    align: 'left',
    field: (row) => row.position,
    sortable: true,
  },
  {
    name: 'role',
    label: 'Role',
    align: 'left',
    field: (row) => row.user_role_name,
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    align: 'left',
    field: (row) => row.employment_status,
    sortable: true,
  },
  { name: 'actions', label: 'Actions', align: 'center', field: () => '' },
]

// --- Computed ---
const employeeStats = computed(() => {
  const total = employees.value.length
  const active = employees.value.filter(
    (emp) => emp.employment_status?.toLowerCase() === 'active',
  ).length
  const inactive = total - active
  return { total, active, inactive }
})

// --- Helpers ---
const getFullName = (employee) => {
  return (
    employee.full_name ||
    `${employee.user?.first_name || ''} ${employee.user?.last_name || ''}`.trim() ||
    employee.user?.username ||
    'N/A'
  )
}

const getEmail = (employee) => employee.user?.email || 'N/A'

const getInitials = (name) =>
  name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

const getModernStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'status-active'
    case 'terminated':
    case 'inactive':
      return 'status-inactive'
    default:
      return 'status-active'
  }
}

// --- API Calls ---
const fetchEmployees = async () => {
  try {
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('companyId')

    if (!token || !companyId) {
      $q.notify({
        type: 'negative',
        message: 'Missing token or company ID. Please log in again.',
        position: 'top',
      })
      return
    }

    loading.value = true
    const response = await axios.get(`https://staging.wageyapp.com/user/employees/${companyId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    employees.value = response.data
    filteredEmployees.value = employees.value
  } catch (error) {
    console.error('Error fetching employees:', error.response?.data || error.message)
    $q.notify({ type: 'negative', message: 'Failed to fetch employees', position: 'top' })
  } finally {
    loading.value = false
  }
}

const saveEmployee = async () => {
  try {
    savingEmployee.value = true
    const token = localStorage.getItem('access_token')
    const companyId = localStorage.getItem('companyId')

    if (!token || !companyId) {
      $q.notify({
        type: 'negative',
        message: 'Missing token or company ID. Please log in again.',
        position: 'top',
      })
      return
    }

    const payload = {
      first_name: editForm.value.first_name,
      last_name: editForm.value.last_name,
      email: editForm.value.email,
      username: editForm.value.username,
      position: editForm.value.position,
      user_role_name: editForm.value.user_role_name,
      employment_status: editForm.value.employment_status,
      address: editForm.value.address,
      company_id: companyId,
    }

    if (editForm.value.password) {
      payload.password = editForm.value.password
    }

    const response = await axios.put(
      `https://staging.wageyapp.com/user/employees/${selectedEmployee.value.id}/update/`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    const updatedEmployee = response.data
    const employeeIndex = employees.value.findIndex((emp) => emp.id === updatedEmployee.id)
    if (employeeIndex !== -1) {
      employees.value[employeeIndex] = updatedEmployee
    }

    filteredEmployees.value = employees.value

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(updatedEmployee)} updated successfully`,
      position: 'top',
    })
    showEditModal.value = false
  } catch (error) {
    console.error('Error updating employee:', error.response?.data || error.message)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to update employee',
      position: 'top',
    })
  } finally {
    savingEmployee.value = false
  }
}

// --- Actions ---
const filterEmployees = () => {
  if (!searchTerm.value.trim()) {
    filteredEmployees.value = employees.value
    return
  }
  const term = searchTerm.value.toLowerCase()
  filteredEmployees.value = employees.value.filter((emp) => {
    return (
      getFullName(emp).toLowerCase().includes(term) ||
      getEmail(emp).toLowerCase().includes(term) ||
      (emp.position || '').toLowerCase().includes(term)
    )
  })
}

const viewEmployee = (emp) => {
  selectedEmployee.value = emp
  showViewModal.value = true
}

const editEmployee = (emp) => {
  selectedEmployee.value = emp
  editForm.value = {
    first_name: emp.user?.first_name || '',
    last_name: emp.user?.last_name || '',
    email: emp.user?.email || '',
    username: emp.user?.username || '',
    position: emp.position || '',
    user_role_name: emp.user_role_name || '',
    employment_status: emp.employment_status || '',
    address: emp.address || '',
    password: '',
  }
  showEditModal.value = true
}

const cancelEdit = () => {
  showEditModal.value = false
  editForm.value = {
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    position: '',
    user_role_name: '',
    employment_status: '',
    address: '',
    password: '',
  }
}

const updateEmployee = (emp) =>
  $q.notify({ type: 'info', message: `Updating ${getFullName(emp)}`, position: 'top' })

onMounted(() => {
  fetchEmployees()
})
</script>

<style scoped>
.employee-dashboard {
  background: #f8fafc;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* Header Section */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.header-search {
  width: 300px;
}

.header-search .q-field__control {
  border-radius: 8px;
  height: 40px;
}

.search-icon {
  color: #9ca3af;
}

/* Stats Section */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stats-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.personal-card {
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
}

.corporate-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.business-card {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.custom-card {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.stats-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.stats-icon {
  font-size: 28px;
  color: #374151;
}

.stats-content {
  flex: 1;
}

.stats-amount {
  font-size: 32px;
  font-weight: 700;
  color: #1a202c;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}

.stats-sublabel {
  font-size: 14px;
  color: #64748b;
}

/* Table Section */
.table-section {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-header {
  padding: 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.sort-select {
  width: 180px;
}

.sort-select .q-field__control {
  border-radius: 8px;
  height: 40px;
}

/* Modern Table */
.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 12px;
  overflow: hidden;
  margin: 0 24px 24px 24px;
}

.loan-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.table-header-row {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.table-header-cell {
  padding: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  text-align: left;
  border: none;
}

.table-body-row {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-body-row:hover {
  background: #f8fafc;
}

.table-body-cell {
  padding: 16px;
  font-size: 14px;
  color: #374151;
  border: none;
  vertical-align: middle;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.employee-name {
  font-weight: 500;
  color: #1a202c;
}

.email-cell .email-link {
  color: #3b82f6;
  text-decoration: none;
}

.email-cell .email-link:hover {
  text-decoration: underline;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-inactive {
  background: #fef2f2;
  color: #991b1b;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.view-btn {
  background: #dbeafe;
  color: #3b82f6;
}

.view-btn:hover {
  background: #bfdbfe;
}

.edit-btn {
  background: #fef3c7;
  color: #d97706;
}

.edit-btn:hover {
  background: #fde68a;
}

.update-btn {
  background: #dcfce7;
  color: #16a34a;
}

.update-btn:hover {
  background: #bbf7d0;
}

/* Table Footer */
.table-footer {
  background: #f8fafc;
  padding: 16px 24px;
  border-top: 2px solid #3b82f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-info {
  display: flex;
  gap: 24px;
  align-items: center;
}

.total-label {
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
}

.total-employees {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.total-active {
  font-size: 14px;
  font-weight: 600;
  color: #16a34a;
}

/* Modal Styles */
.modal-card {
  width: 100%;
  max-width: 900px;
  max-height: 80vh;
  border-radius: 12px;
}

.view-modal {
  max-width: 800px;
}

.edit-modal {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #f9fafb;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-avatar {
  flex-shrink: 0;
}

.modal-icon {
  font-size: 32px;
  color: #3b82f6;
  background: #dbeafe;
  padding: 8px;
  border-radius: 8px;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin-top: 2px;
}

.modal-close-btn {
  color: #6b7280;
}

.modal-close-btn:hover {
  background: #f3f4f6;
}

.modal-content {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

/* View Modal Styles */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.detail-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
  margin-right: 16px;
}

.detail-value {
  font-size: 14px;
  color: #111827;
  text-align: right;
  word-break: break-word;
}

/* Edit Modal Styles */
.edit-form {
  width: 100%;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.form-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
}

.form-input {
  margin-bottom: 16px;
}

.form-input:last-child {
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  padding: 8px 24px;
  border-radius: 6px;
}

.save-btn {
  padding: 8px 24px;
  border-radius: 6px;
  font-weight: 500;
}

/* Status Chip */
.status-chip {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 20px;
  text-transform: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-search {
    width: 100%;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .table-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .sort-select {
    width: 100%;
  }

  .modern-table-container {
    margin: 0 16px 16px 16px;
  }

  .table-body-cell {
    padding: 12px 8px;
    font-size: 12px;
  }

  .employee-info {
    gap: 8px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }

  .footer-info {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .modal-card {
    margin: 16px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
  }

  .detail-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .cancel-btn,
  .save-btn {
    width: 100%;
  }
}

/* Scrollbar Styling */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Loading States */
.form-input .q-field--loading .q-field__control::before {
  background: #f3f4f6;
}

/* Focus States */
.modal-close-btn:focus,
.cancel-btn:focus,
.save-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.form-input .q-field--focused .q-field__control {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}
</style>
