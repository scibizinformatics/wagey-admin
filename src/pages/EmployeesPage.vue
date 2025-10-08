<template>
  <q-page class="employee-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Employee Management</h1>
          </div>
          <div class="header-actions">
            <q-btn
              color="primary"
              label="Add Employee"
              icon="add"
              class="add-employee-btn"
              @click="openAddModal"
            />
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
              label="Sort by"
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
                <q-th class="table-header-cell">Phone</q-th>
                <q-th class="table-header-cell">Role</q-th>
                <q-th class="table-header-cell">Civil Status</q-th>
                <q-th class="table-header-cell">Actions</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr class="table-body-row">
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
                  {{ getPhoneNumber(props.row) }}
                </q-td>
                <q-td class="table-body-cell">
                  {{ getRole(props.row) }}
                </q-td>
                <q-td class="table-body-cell">
                  <div class="civil-status-badge">
                    {{ getCivilStatus(props.row) }}
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
                    >
                      <q-tooltip>View Details</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      icon="edit"
                      size="sm"
                      class="action-btn edit-btn"
                      @click="editEmployee(props.row)"
                    >
                      <q-tooltip>Edit Employee</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      icon="delete"
                      size="sm"
                      class="action-btn delete-btn"
                      @click="confirmDelete(props.row)"
                    >
                      <q-tooltip>Delete Employee</q-tooltip>
                    </q-btn>
                  </div>
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </div>
      </div>
    </div>

    <!-- Add Employee Modal -->
    <q-dialog v-model="showAddModal" persistent>
      <q-card class="modal-card add-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-icon name="person_add" class="modal-icon" />
            <div>
              <div class="modal-title">Add New Employee</div>
              <div class="modal-subtitle">Fill in the employee details</div>
            </div>
          </div>
          <q-btn icon="close" flat round class="modal-close-btn" @click="cancelAdd" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content">
          <q-form @submit="addEmployee" class="edit-form">
            <div class="form-sections">
              <!-- User Information Section -->
              <div class="form-section">
                <div class="section-title">User Information</div>
                <div class="form-grid">
                  <q-input
                    v-model="addForm.user.username"
                    label="Username *"
                    outlined
                    dense
                    :rules="[(val) => !!val || 'Username is required']"
                  />
                  <q-input
                    v-model="addForm.user.email"
                    label="Email *"
                    type="email"
                    outlined
                    dense
                    :rules="[
                      (val) => !!val || 'Email is required',
                      (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
                    ]"
                  />
                  <q-input
                    v-model="addForm.user.first_name"
                    label="First Name *"
                    outlined
                    dense
                    :rules="[(val) => !!val || 'First name is required']"
                  />
                  <q-input
                    v-model="addForm.user.last_name"
                    label="Last Name *"
                    outlined
                    dense
                    :rules="[(val) => !!val || 'Last name is required']"
                  />
                  <q-input
                    v-model="addForm.password"
                    label="Password *"
                    type="password"
                    outlined
                    dense
                    :rules="[
                      (val) => !!val || 'Password is required',
                      (val) => val.length >= 8 || 'Password must be at least 8 characters',
                    ]"
                  />
                  <q-input
                    v-model="confirmPassword"
                    label="Confirm Password *"
                    type="password"
                    outlined
                    dense
                    :rules="[
                      (val) => !!val || 'Please confirm password',
                      (val) => val === addForm.password || 'Passwords do not match',
                    ]"
                  />
                </div>
              </div>

              <!-- Personal Information Section -->
              <div class="form-section">
                <div class="section-title">Personal Information</div>
                <div class="form-grid">
                  <q-select
                    v-model="addForm.civil_status"
                    :options="civilStatusOptions"
                    label="Civil Status"
                    outlined
                    dense
                  />
                  <q-input v-model="addForm.birthday" label="Birthday" type="date" outlined dense />
                  <q-input
                    v-model="addForm.phone_number"
                    label="Phone Number"
                    outlined
                    dense
                    mask="(###) ###-####"
                  />
                  <q-input
                    v-model="addForm.emergency_contact"
                    label="Emergency Contact"
                    outlined
                    dense
                  />
                  <q-input
                    v-model="addForm.address"
                    label="Address"
                    outlined
                    dense
                    type="textarea"
                    rows="2"
                    class="col-span-2"
                  />
                </div>
              </div>

              <!-- Employment Information Section -->
              <div class="form-section">
                <div class="section-title">Employment Information</div>
                <div class="form-grid">
                  <q-select
                    v-model="addForm.user_role"
                    :options="roleOptions"
                    option-label="name"
                    option-value="id"
                    label="Role *"
                    outlined
                    dense
                    :rules="[(val) => !!val || 'Role is required']"
                  />
                  <q-input v-model="addForm.bank_acct" label="Bank Account" outlined dense />
                  <q-select
                    v-model="addForm.timezone"
                    :options="timezoneOptions"
                    label="Timezone"
                    outlined
                    dense
                    use-input
                    @filter="filterTimezones"
                  />
                </div>
              </div>
            </div>

            <div class="form-actions">
              <q-btn label="Cancel" flat color="grey-7" @click="cancelAdd" />
              <q-btn label="Add Employee" type="submit" color="primary" :loading="savingEmployee" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

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
          <div class="detail-sections">
            <!-- User Information -->
            <div class="detail-section">
              <div class="section-title">User Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Username:</span>
                  <span class="detail-value">{{ selectedEmployee?.user?.username || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">{{ getEmail(selectedEmployee) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Full Name:</span>
                  <span class="detail-value">{{ getFullName(selectedEmployee) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Role:</span>
                  <span class="detail-value">{{ getRole(selectedEmployee) }}</span>
                </div>
              </div>
            </div>

            <!-- Personal Information -->
            <div class="detail-section">
              <div class="section-title">Personal Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Civil Status:</span>
                  <span class="detail-value">{{ getCivilStatus(selectedEmployee) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Birthday:</span>
                  <span class="detail-value">{{
                    formatDate(selectedEmployee?.birthday) || 'N/A'
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Phone:</span>
                  <span class="detail-value">{{ getPhoneNumber(selectedEmployee) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Emergency Contact:</span>
                  <span class="detail-value">{{
                    selectedEmployee?.emergency_contact || 'N/A'
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Address:</span>
                  <span class="detail-value">{{ selectedEmployee?.address || 'N/A' }}</span>
                </div>
              </div>
            </div>

            <!-- Employment Information -->
            <div class="detail-section">
              <div class="section-title">Employment Information</div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Bank Account:</span>
                  <span class="detail-value">{{ selectedEmployee?.bank_acct || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Timezone:</span>
                  <span class="detail-value">{{ selectedEmployee?.timezone || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Last Updated:</span>
                  <span class="detail-value">{{
                    formatDateTime(selectedEmployee?.last_date_updated) || 'N/A'
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Updated By:</span>
                  <span class="detail-value">{{ selectedEmployee?.updated_by || 'N/A' }}</span>
                </div>
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
            <div class="form-sections">
              <!-- User Information Section -->
              <div class="form-section">
                <div class="section-title">User Information</div>
                <div class="form-grid">
                  <q-input
                    v-model="editForm.user.username"
                    label="Username *"
                    outlined
                    dense
                    :rules="[(val) => !!val || 'Username is required']"
                  />
                  <q-input
                    v-model="editForm.user.email"
                    label="Email *"
                    type="email"
                    outlined
                    dense
                    :rules="[
                      (val) => !!val || 'Email is required',
                      (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
                    ]"
                  />
                  <q-input
                    v-model="editForm.user.first_name"
                    label="First Name *"
                    outlined
                    dense
                    :rules="[(val) => !!val || 'First name is required']"
                  />
                  <q-input
                    v-model="editForm.user.last_name"
                    label="Last Name *"
                    outlined
                    dense
                    :rules="[(val) => !!val || 'Last name is required']"
                  />
                </div>
              </div>

              <!-- Personal Information Section -->
              <div class="form-section">
                <div class="section-title">Personal Information</div>
                <div class="form-grid">
                  <q-select
                    v-model="editForm.civil_status"
                    :options="civilStatusOptions"
                    label="Civil Status"
                    outlined
                    dense
                  />
                  <q-input
                    v-model="editForm.birthday"
                    label="Birthday"
                    type="date"
                    outlined
                    dense
                  />
                  <q-input
                    v-model="editForm.phone_number"
                    label="Phone Number"
                    outlined
                    dense
                    mask="(###) ###-####"
                  />
                  <q-input
                    v-model="editForm.emergency_contact"
                    label="Emergency Contact"
                    outlined
                    dense
                  />
                  <q-input
                    v-model="editForm.address"
                    label="Address"
                    outlined
                    dense
                    type="textarea"
                    rows="2"
                    class="col-span-2"
                  />
                </div>
              </div>

              <!-- Employment Information Section -->
              <div class="form-section">
                <div class="section-title">Employment Information</div>
                <div class="form-grid">
                  <q-select
                    v-model="editForm.user_role"
                    :options="roleOptions"
                    option-label="name"
                    option-value="id"
                    label="Role *"
                    outlined
                    dense
                    :rules="[(val) => !!val || 'Role is required']"
                  />
                  <q-input v-model="editForm.bank_acct" label="Bank Account" outlined dense />
                  <q-select
                    v-model="editForm.timezone"
                    :options="timezoneOptions"
                    label="Timezone"
                    outlined
                    dense
                    use-input
                    @filter="filterTimezones"
                  />
                </div>
              </div>
            </div>

            <div class="form-actions">
              <q-btn label="Cancel" flat color="grey-7" @click="cancelEdit" />
              <q-btn label="Save Changes" type="submit" color="primary" :loading="savingEmployee" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card class="delete-dialog">
        <q-card-section class="delete-header">
          <q-icon name="warning" class="delete-icon" />
          <div class="delete-title">Confirm Delete</div>
        </q-card-section>
        <q-card-section class="delete-content">
          Are you sure you want to delete employee
          <strong>{{ getFullName(employeeToDelete) }}</strong
          >? This action cannot be undone.
        </q-card-section>
        <q-card-actions align="right" class="delete-actions">
          <q-btn flat label="Cancel" color="grey-7" @click="showDeleteDialog = false" />
          <q-btn flat label="Delete" color="negative" @click="deleteEmployee" :loading="deleting" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from 'src/boot/auth'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const authStore = useAuthStore()
const employees = ref([])
const filteredEmployees = ref([])
const searchTerm = ref('')
const loading = ref(false)
const sortBy = ref('Newest')

// Modal states
const showAddModal = ref(false)
const showViewModal = ref(false)
const showEditModal = ref(false)
const showDeleteDialog = ref(false)
const selectedEmployee = ref({})
const employeeToDelete = ref({})
const savingEmployee = ref(false)
const deleting = ref(false)

// Form states
const confirmPassword = ref('')
const addForm = ref({
  user: {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
  },
  password: '',
  user_role: null,
  civil_status: '',
  address: '',
  phone_number: '',
  emergency_contact: '',
  birthday: '',
  bank_acct: '',
  timezone: '',
})

const editForm = ref({
  user: {
    id: 0,
    username: '',
    email: '',
    first_name: '',
    last_name: '',
  },
  user_role: null,
  civil_status: '',
  address: '',
  phone_number: '',
  emergency_contact: '',
  birthday: '',
  bank_acct: '',
  timezone: '',
})

// Options for dropdowns
const civilStatusOptions = ref(['Single', 'Married', 'Divorced', 'Widowed', 'Separated'])

const roleOptions = ref([])
const timezoneOptions = ref([
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Manila',
  'Australia/Sydney',
])
const filteredTimezoneOptions = ref([])

// Table columns (required by q-table even though we use custom slots)
const columns = ref([
  { name: 'sl_no', label: 'SL No', field: 'id', align: 'left' },
  { name: 'name', label: 'Employee Name', field: 'full_name', align: 'left' },
  { name: 'email', label: 'Email', field: (row) => row.user?.email, align: 'left' },
  { name: 'phone', label: 'Phone', field: 'phone_number', align: 'left' },
  { name: 'role', label: 'Role', field: 'user_role_name', align: 'left' },
  { name: 'civil_status', label: 'Civil Status', field: 'civil_status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

// --- Computed ---
const employeeStats = computed(() => {
  const total = employees.value.length
  const active = employees.value.filter((emp) => emp.is_active !== false).length
  const inactive = total - active
  return { total, active, inactive }
})

// --- Helpers ---
const getFullName = (employee) => {
  if (!employee) return 'N/A'
  return (
    `${employee.user?.first_name || ''} ${employee.user?.last_name || ''}`.trim() ||
    employee.user?.username ||
    'N/A'
  )
}

const getEmail = (employee) => employee?.user?.email || 'N/A'

// NEW HELPER FUNCTIONS FOR API STRUCTURE
const getRole = (employee) => {
  if (!employee) return 'N/A'
  // Try user_role_name (new API structure)
  if (employee.user_role_name) return employee.user_role_name
  // Fallback to user_role.name (old structure)
  if (employee.user_role?.name) return employee.user_role.name
  // Try to get from companies array
  if (employee.companies && employee.companies.length > 0) {
    return employee.companies[0].user_role || 'N/A'
  }
  return 'N/A'
}

const getPhoneNumber = (employee) => {
  return employee?.phone_number || 'N/A'
}

const getCivilStatus = (employee) => {
  return employee?.civil_status || 'N/A'
}

const getInitials = (name) =>
  name && name !== 'N/A'
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

const formatDate = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatDateTime = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// --- API Calls ---
const fetchEmployees = async () => {
  try {
    const token = localStorage.getItem('access_token')
    let storedCompany = localStorage.getItem('selectedCompany')
    let companyId = null

    try {
      const parsed = JSON.parse(storedCompany)
      companyId = parsed?.id || parsed
    } catch {
      companyId = storedCompany
    }

    if (!token || !companyId) {
      $q.notify({
        type: 'negative',
        message: 'Missing token or company ID.',
        position: 'top',
      })
      return
    }

    loading.value = true

    const response = await axios.get(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    employees.value = response.data || []
    filteredEmployees.value = employees.value
    sortEmployees()
  } catch (error) {
    console.error('Error fetching employees:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to fetch employees',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

const fetchRoles = async () => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const response = await axios.get('https://staging.wageyapp.com/user/user-roles/', {
      headers: { Authorization: `Bearer ${token}` },
    })
    roleOptions.value = response.data
  } catch (error) {
    console.error('Error fetching roles:', error)
    roleOptions.value = [
      { id: 1, name: 'Admin' },
      { id: 2, name: 'Manager' },
      { id: 3, name: 'Employee' },
      { id: 4, name: 'HR' },
    ]
  }
}

async function addEmployee() {
  try {
    const token = authStore.token || localStorage.getItem('access_token')
    const user = authStore.user || JSON.parse(localStorage.getItem('user'))
    const userId = user?.id || JSON.parse(localStorage.getItem('user_id')) || null

    let storedCompany = localStorage.getItem('selectedCompany')
    let companyId = null

    try {
      const parsed = JSON.parse(storedCompany)
      companyId = parsed?.id || parsed
    } catch {
      companyId = storedCompany
    }

    if (!token) {
      $q.notify({
        type: 'negative',
        message: 'Missing authentication token. Please log in again.',
        position: 'top',
      })
      return
    }

    if (!companyId) {
      $q.notify({
        type: 'negative',
        message: 'No company selected. Please select a company first.',
        position: 'top',
      })
      return
    }

    if (!userId) {
      $q.notify({
        type: 'negative',
        message: 'Unable to identify logged-in user (updated_by). Please re-login.',
        position: 'top',
      })
      return
    }

    const payload = {
      username: addForm.value.user.username,
      email: addForm.value.user.email,
      password: addForm.value.password,
      first_name: addForm.value.user.first_name,
      middle_name: addForm.value.user.middle_name || '',
      last_name: addForm.value.user.last_name,
      flow: 'admin',
      civil_status: addForm.value.civil_status || '',
      address: addForm.value.address || '',
      phone_number: addForm.value.phone_number || '',
      emergency_contact: addForm.value.emergency_contact || '',
      birthday: addForm.value.birthday || null,
      bank_acct: addForm.value.bank_acct || '',
      timezone: addForm.value.timezone || '',
      last_date_updated: new Date().toISOString(),
      user_role: addForm.value.user_role?.id || 0,
      updated_by: userId,
      companies: [{ company_id: companyId }],
    }

    await axios.post(`https://staging.wageyapp.com/user/employees/`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    $q.notify({
      type: 'positive',
      message: 'Employee added successfully!',
      position: 'top',
    })

    await fetchEmployees()
    resetAddForm()
    showAddModal.value = false
  } catch (error) {
    console.error('❌ Error adding employee:', error)
    console.log('🔍 Response data:', error.response?.data)

    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.message ||
        error.response?.data?.detail ||
        JSON.stringify(error.response?.data) ||
        'Failed to add employee',
      position: 'top',
    })
  }
}

const saveEmployee = async () => {
  try {
    savingEmployee.value = true
    const token = localStorage.getItem('access_token')
    let storedCompany = localStorage.getItem('selectedCompany')
    let companyId = null

    try {
      const parsed = JSON.parse(storedCompany)
      companyId = parsed?.id || parsed
    } catch {
      companyId = storedCompany
    }

    if (!token || !companyId) {
      $q.notify({ type: 'negative', message: 'Missing token or company ID.', position: 'top' })
      return
    }

    const payload = {
      user: {
        id: editForm.value.user.id,
        username: editForm.value.user.username,
        email: editForm.value.user.email,
        first_name: editForm.value.user.first_name,
        last_name: editForm.value.user.last_name,
      },
      user_role_id: editForm.value.user_role?.id,
      civil_status: editForm.value.civil_status,
      address: editForm.value.address,
      phone_number: editForm.value.phone_number,
      emergency_contact: editForm.value.emergency_contact,
      birthday: editForm.value.birthday || null,
      bank_acct: editForm.value.bank_acct,
      timezone: editForm.value.timezone,
    }

    const response = await axios.patch(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/${selectedEmployee.value.id}/`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    const updatedEmployee = response.data
    const employeeIndex = employees.value.findIndex((emp) => emp.id === updatedEmployee.id)
    if (employeeIndex !== -1) {
      employees.value[employeeIndex] = updatedEmployee
    }
    filteredEmployees.value = employees.value
    sortEmployees()

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(updatedEmployee)} updated successfully`,
      position: 'top',
    })
    showEditModal.value = false
  } catch (error) {
    console.error('Error updating employee:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to update employee',
      position: 'top',
    })
  } finally {
    savingEmployee.value = false
  }
}

const deleteEmployee = async () => {
  try {
    deleting.value = true
    const token = localStorage.getItem('access_token')
    let storedCompany = localStorage.getItem('selectedCompany')
    let companyId = null

    try {
      const parsed = JSON.parse(storedCompany)
      companyId = parsed?.id || parsed
    } catch {
      companyId = storedCompany
    }

    if (!token || !companyId) {
      $q.notify({ type: 'negative', message: 'Missing token or company ID.', position: 'top' })
      return
    }

    await axios.delete(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/${employeeToDelete.value.id}/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    employees.value = employees.value.filter((e) => e.id !== employeeToDelete.value.id)
    filteredEmployees.value = employees.value

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(employeeToDelete.value)} deleted successfully`,
      position: 'top',
    })
    showDeleteDialog.value = false
  } catch (error) {
    console.error('Error deleting employee:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to delete employee',
      position: 'top',
    })
  } finally {
    deleting.value = false
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
      getPhoneNumber(emp).toLowerCase().includes(term) ||
      getRole(emp).toLowerCase().includes(term) ||
      getCivilStatus(emp).toLowerCase().includes(term)
    )
  })
}

const sortEmployees = () => {
  const sorted = [...filteredEmployees.value]

  switch (sortBy.value) {
    case 'Newest':
      sorted.sort((a, b) => new Date(b.last_date_updated || 0) - new Date(a.last_date_updated || 0))
      break
    case 'Oldest':
      sorted.sort((a, b) => new Date(a.last_date_updated || 0) - new Date(b.last_date_updated || 0))
      break
    case 'A-Z':
      sorted.sort((a, b) => getFullName(a).localeCompare(getFullName(b)))
      break
    case 'Z-A':
      sorted.sort((a, b) => getFullName(b).localeCompare(getFullName(a)))
      break
  }

  filteredEmployees.value = sorted
}

const filterTimezones = (val, update) => {
  if (val === '') {
    update(() => {
      filteredTimezoneOptions.value = timezoneOptions.value
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredTimezoneOptions.value = timezoneOptions.value.filter(
      (v) => v.toLowerCase().indexOf(needle) > -1,
    )
  })
}

// Modal Actions
const openAddModal = () => {
  resetAddForm()
  showAddModal.value = true
}

const viewEmployee = (emp) => {
  selectedEmployee.value = emp
  showViewModal.value = true
}

const editEmployee = (emp) => {
  selectedEmployee.value = emp

  // Find matching role from roleOptions based on user_role_name
  const matchingRole = roleOptions.value.find((role) => role.name === emp.user_role_name)

  editForm.value = {
    user: {
      id: emp.user?.id || 0,
      username: emp.user?.username || '',
      email: emp.user?.email || '',
      first_name: emp.user?.first_name || '',
      last_name: emp.user?.last_name || '',
    },
    user_role: matchingRole || null,
    civil_status: emp.civil_status || '',
    address: emp.address || '',
    phone_number: emp.phone_number || '',
    emergency_contact: emp.emergency_contact || '',
    birthday: emp.birthday || '',
    bank_acct: emp.bank_acct || '',
    timezone: emp.timezone || '',
  }
  showEditModal.value = true
}

const confirmDelete = (emp) => {
  employeeToDelete.value = emp
  showDeleteDialog.value = true
}

const cancelAdd = () => {
  showAddModal.value = false
  resetAddForm()
}

const cancelEdit = () => {
  showEditModal.value = false
  editForm.value = {
    user: {
      id: 0,
      username: '',
      email: '',
      first_name: '',
      last_name: '',
    },
    user_role: null,
    civil_status: '',
    address: '',
    phone_number: '',
    emergency_contact: '',
    birthday: '',
    bank_acct: '',
    timezone: '',
  }
}

const resetAddForm = () => {
  addForm.value = {
    user: {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
    },
    password: '',
    user_role: null,
    civil_status: '',
    address: '',
    phone_number: '',
    emergency_contact: '',
    birthday: '',
    bank_acct: '',
    timezone: '',
  }
  confirmPassword.value = ''
}

// Watch for sort changes
watch(sortBy, () => {
  sortEmployees()
})

onMounted(() => {
  fetchEmployees()
  fetchRoles()
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

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.add-employee-btn {
  height: 40px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
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

.civil-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
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
  transition: all 0.2s ease;
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

.delete-btn {
  background: #fef2f2;
  color: #ef4444;
}

.delete-btn:hover {
  background: #fee2e2;
}

/* Modal Styles */
.modal-card {
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.add-modal,
.edit-modal {
  max-width: 1000px;
}

.view-modal {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #f9fafb;
  flex-shrink: 0;
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
  overflow-y: auto;
  flex: 1;
}

/* Form Sections */
.form-sections,
.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section,
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.col-span-2 {
  grid-column: span 2;
}

/* Detail Grid */
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  margin-top: 24px;
}

/* Delete Dialog */
.delete-dialog {
  max-width: 400px;
  border-radius: 12px;
}

.delete-header {
  text-align: center;
  padding: 24px 24px 16px;
}

.delete-icon {
  font-size: 48px;
  color: #ef4444;
  margin-bottom: 12px;
}

.delete-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.delete-content {
  padding: 0 24px 16px;
  text-align: center;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}

.delete-content strong {
  color: #111827;
}

.delete-actions {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
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

  .header-actions {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .add-employee-btn,
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
    overflow-x: auto;
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

  .modal-card {
    margin: 16px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .col-span-2 {
    grid-column: span 1;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .detail-value {
    text-align: left;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
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
.q-field--loading .q-field__control::before {
  background: #f3f4f6;
}

/* Focus States */
.modal-close-btn:focus,
.form-actions button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.q-field--focused .q-field__control {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}
</style>
