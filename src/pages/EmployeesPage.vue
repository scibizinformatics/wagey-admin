<template>
  <q-page class="employee-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Employees</h1>
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
            <q-icon name="trending_down" class="stats-icon" />
          </div>
          <div class="stats-content">
            <div class="stats-amount">{{ employeeStats.terminated }}</div>
            <div class="stats-label">Terminated</div>
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
              v-model="selectedSite"
              :options="sites"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              label="Filter by Site"
              class="site-select"
              dense
              outlined
              clearable
              @update:model-value="filterBySite"
            >
              <template v-slot:prepend>
                <q-icon name="location_on" />
              </template>
            </q-select>
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
                <q-th class="table-header-cell">Status</q-th>
                <q-th class="table-header-cell">Actions</q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr
                class="table-body-row"
                :class="{ 'terminated-row': getStatus(props.row) === 'Terminated' }"
              >
                <q-td class="table-body-cell">
                  {{ String(props.rowIndex + 1).padStart(2, '0') }}.
                </q-td>
                <q-td class="table-body-cell employee-name-cell">
                  <div class="employee-info">
                    <q-avatar size="32px" v-if="props.row.user?.picture_url">
                      <img
                        :src="props.row.user.picture_url"
                        :alt="getFullName(props.row)"
                        @error="handleImageError"
                      />
                    </q-avatar>
                    <q-avatar v-else size="32px" color="primary" text-color="white">
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
                  <div :class="['status-badge', getStatusClass(props.row)]">
                    {{ getStatus(props.row) }}
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
                      :disable="getStatus(props.row) === 'Terminated'"
                    >
                      <q-tooltip>Edit Employee</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="getStatus(props.row) !== 'Terminated'"
                      flat
                      round
                      icon="block"
                      size="sm"
                      class="action-btn terminate-btn"
                      @click="confirmTerminate(props.row)"
                    >
                      <q-tooltip>Terminate Employee</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-else
                      flat
                      round
                      icon="restore"
                      size="sm"
                      class="action-btn restore-btn"
                      @click="confirmRestore(props.row)"
                    >
                      <q-tooltip>Restore Employee</q-tooltip>
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
              <!-- Avatar Upload Section -->
              <div class="avatar-upload-section">
                <div class="avatar-preview-wrapper">
                  <q-avatar size="120px" v-if="avatarPreview">
                    <img :src="avatarPreview" alt="Avatar Preview" />
                  </q-avatar>
                  <q-avatar v-else size="120px" color="grey-3" text-color="grey-6">
                    <q-icon name="person" size="60px" />
                  </q-avatar>

                  <input
                    type="file"
                    ref="avatarInputAdd"
                    accept="image/*"
                    style="display: none"
                    @change="handleAvatarSelect"
                  />

                  <div class="avatar-actions">
                    <q-btn
                      flat
                      dense
                      color="primary"
                      icon="upload"
                      label="Upload Photo"
                      @click="$refs.avatarInputAdd.click()"
                    />
                    <q-btn
                      v-if="avatarPreview"
                      flat
                      dense
                      color="negative"
                      icon="delete"
                      label="Remove"
                      @click="removeAvatar"
                    />
                  </div>
                  <div class="avatar-hint">
                    Maximum file size: 5MB. Accepted formats: JPG, PNG, GIF
                  </div>
                </div>
              </div>

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
                    mask="###########"
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
              <q-btn
                label="Add Employee"
                type="submit"
                color="primary"
                :loading="savingEmployee || uploadingAvatar"
              />
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
            <q-avatar size="80px" v-if="selectedEmployee?.user?.picture_url">
              <img :src="selectedEmployee.user.picture_url" :alt="getFullName(selectedEmployee)" />
            </q-avatar>
            <q-avatar v-else size="80px" color="primary" text-color="white" class="modal-avatar">
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
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <div :class="['status-badge', getStatusClass(selectedEmployee)]">
                      {{ getStatus(selectedEmployee) }}
                    </div>
                  </span>
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
              <!-- Avatar Upload Section for Edit -->
              <div class="avatar-upload-section">
                <div class="avatar-preview-wrapper">
                  <q-avatar size="120px" v-if="editAvatarPreview">
                    <img :src="editAvatarPreview" alt="Avatar Preview" />
                  </q-avatar>
                  <q-avatar v-else-if="selectedEmployee?.user?.picture_url" size="120px">
                    <img
                      :src="selectedEmployee.user.picture_url"
                      :alt="getFullName(selectedEmployee)"
                    />
                  </q-avatar>
                  <q-avatar v-else size="120px" color="grey-3" text-color="grey-6">
                    <q-icon name="person" size="60px" />
                  </q-avatar>

                  <input
                    type="file"
                    ref="avatarInputEdit"
                    accept="image/*"
                    style="display: none"
                    @change="handleEditAvatarSelect"
                  />

                  <div class="avatar-actions">
                    <q-btn
                      flat
                      dense
                      color="primary"
                      icon="upload"
                      label="Change Photo"
                      @click="$refs.avatarInputEdit.click()"
                    />
                    <q-btn
                      v-if="editAvatarPreview"
                      flat
                      dense
                      color="negative"
                      icon="delete"
                      label="Remove"
                      @click="removeEditAvatar"
                    />
                  </div>
                  <div class="avatar-hint">
                    Maximum file size: 5MB. Accepted formats: JPG, PNG, GIF
                  </div>
                </div>
              </div>

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
                    mask="############"
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
              <q-btn
                label="Save Changes"
                type="submit"
                color="primary"
                :loading="savingEmployee || uploadingAvatar"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Terminate Confirmation Dialog -->
    <q-dialog v-model="showTerminateDialog" persistent>
      <q-card class="terminate-dialog">
        <q-card-section class="terminate-header">
          <q-icon name="block" class="terminate-icon" />
          <div class="terminate-title">Confirm Termination</div>
        </q-card-section>
        <q-card-section class="terminate-content">
          Are you sure you want to terminate employee
          <strong>{{ getFullName(employeeToTerminate) }}</strong
          >? This will change their status to "Terminated" and they will no longer have access to
          the system.
        </q-card-section>
        <q-card-actions align="right" class="terminate-actions">
          <q-btn flat label="Cancel" color="grey-7" @click="showTerminateDialog = false" />
          <q-btn
            flat
            label="Terminate"
            color="negative"
            @click="terminateEmployee"
            :loading="terminating"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Restore Confirmation Dialog -->
    <q-dialog v-model="showRestoreDialog" persistent>
      <q-card class="restore-dialog">
        <q-card-section class="restore-header">
          <q-icon name="restore" class="restore-icon" />
          <div class="restore-title">Confirm Restoration</div>
        </q-card-section>
        <q-card-section class="restore-content">
          Are you sure you want to restore employee
          <strong>{{ getFullName(employeeToRestore) }}</strong
          >? This will change their status back to "Active" and restore their system access.
        </q-card-section>
        <q-card-actions align="right" class="restore-actions">
          <q-btn flat label="Cancel" color="grey-7" @click="showRestoreDialog = false" />
          <q-btn
            flat
            label="Restore"
            color="positive"
            @click="restoreEmployee"
            :loading="restoring"
          />
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
//const avatarFile = ref(null)
const avatarPreview = ref(null)
const uploadingAvatar = ref(false)

const sortBy = ref('A-Z')
const sites = ref([])
const selectedSite = ref(null)

// Modal states
const showAddModal = ref(false)
const showViewModal = ref(false)
const showEditModal = ref(false)
const showTerminateDialog = ref(false)
const showRestoreDialog = ref(false)
const selectedEmployee = ref({})
const employeeToTerminate = ref({})
const employeeToRestore = ref({})
const savingEmployee = ref(false)
const terminating = ref(false)
const restoring = ref(false)

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

// Table columns
const columns = ref([
  { name: 'sl_no', label: 'SL No', field: 'id', align: 'left' },
  { name: 'name', label: 'Employee Name', field: 'full_name', align: 'left' },
  { name: 'email', label: 'Email', field: (row) => row.user?.email, align: 'left' },
  { name: 'phone', label: 'Phone', field: 'phone_number', align: 'left' },
  { name: 'role', label: 'Role', field: 'user_role_name', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

// --- Computed ---
const employeeStats = computed(() => {
  const total = employees.value.length
  const active = employees.value.filter((emp) => getStatus(emp) === 'Active').length
  const terminated = employees.value.filter((emp) => getStatus(emp) === 'Terminated').length
  return { total, active, terminated }
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

const getRole = (employee) => {
  if (!employee) return 'N/A'
  if (employee.user_role_name) return employee.user_role_name
  if (employee.user_role?.name) return employee.user_role.name
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

const getStatus = (employee) => {
  if (!employee) return 'N/A'
  // Check for status field first
  if (employee.status && employee.status.toLowerCase() === 'terminated') {
    return 'Terminated'
  }
  // Check is_active field
  if (employee.is_active === false) return 'Terminated'
  // Default to Active
  return 'Active'
}

const getStatusClass = (employee) => {
  const status = getStatus(employee)
  if (status === 'Active') return 'status-active'
  if (status === 'Terminated') return 'status-terminated'
  return 'status-default'
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

    console.log('=== EMPLOYEES FETCHED ===')
    console.log('Sample employee data:', response.data[0])
    console.log('Total employees:', response.data.length)

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

const fetchSites = async () => {
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

    console.log('=== FETCHING SITES DEBUG ===')
    console.log('Token exists:', !!token)
    console.log('Company ID:', companyId)

    if (!token || !companyId) {
      console.warn('Missing token or company ID for fetching sites')
      sites.value = [{ label: 'All Sites', value: null }]
      return
    }

    console.log(
      'Making request to:',
      `https://staging.wageyapp.com/organization/sites/?company=${companyId}`,
    )

    const response = await axios.get(
      `https://staging.wageyapp.com/organization/sites/?company=${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    console.log('Sites API Response:', response.data)

    // Handle different response structures
    let sitesData = []
    if (Array.isArray(response.data)) {
      sitesData = response.data
    } else if (response.data?.results) {
      sitesData = response.data.results
    } else if (response.data?.data) {
      sitesData = response.data.data
    }

    console.log('Processed sites data:', sitesData)

    // Format sites for dropdown
    sites.value = [
      { label: 'All Sites', value: null },
      ...sitesData.map((site) => ({
        label: site.name || site.site_name || `Site ${site.id}`,
        value: site.id,
      })),
    ]

    console.log('Formatted sites for dropdown:', sites.value)

    if (sites.value.length === 1) {
      console.warn('⚠️ No sites found - only "All Sites" option available')
    } else {
      console.log(`✅ Loaded ${sites.value.length - 1} sites`)
    }
  } catch (error) {
    console.error('=== ERROR FETCHING SITES ===')
    console.error('Error message:', error.message)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)

    // Fallback
    sites.value = [{ label: 'All Sites', value: null }]

    $q.notify({
      type: 'warning',
      message: error.response?.data?.detail || 'Could not load sites. Showing all employees.',
      position: 'top',
    })
  }
}

// Fetch full employee details
const fetchEmployeeDetails = async (employeeId) => {
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
      $q.notify({ type: 'negative', message: 'Missing token or company ID.', position: 'top' })
      return null
    }

    const response = await axios.get(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/${employeeId}/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    return response.data
  } catch (error) {
    console.error('❌ Error fetching employee details:', error)
    $q.notify({ type: 'negative', message: 'Failed to fetch employee details', position: 'top' })
    return null
  }
}

// Utility function for PH phone number formatting
function formatPhilippinePhone(number) {
  if (!number) return ''

  let cleaned = number.replace(/\D/g, '') // remove non-digits

  // If number starts with '0' (ex: 09123456789) → convert to +63 format
  if (cleaned.startsWith('0')) {
    cleaned = '+63' + cleaned.slice(1)
  }
  // If number starts with '9' (ex: 9123456789) → add +63
  else if (cleaned.startsWith('9')) {
    cleaned = '+63' + cleaned
  }
  // If already starts with '63' (ex: 639123456789) → add '+'
  else if (cleaned.startsWith('63')) {
    cleaned = '+' + cleaned
  }

  // Validate correct PH mobile number format
  const valid = /^\+639\d{9}$/.test(cleaned)
  return valid ? cleaned : ''
}

// -----------------------------
// Add Employee
// -----------------------------
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
      return $q.notify({
        type: 'negative',
        message: 'Missing authentication token. Please log in again.',
        position: 'top',
      })
    }

    if (!companyId) {
      return $q.notify({
        type: 'negative',
        message: 'No company selected. Please select a company first.',
        position: 'top',
      })
    }

    if (!userId) {
      return $q.notify({
        type: 'negative',
        message: 'Unable to identify logged-in user. Please re-login.',
        position: 'top',
      })
    }

    // ✅ Format phone numbers properly
    const formattedPhone = formatPhilippinePhone(addForm.value.phone_number)
    const formattedEmergency = formatPhilippinePhone(addForm.value.emergency_contact)

    if (!formattedPhone) {
      return $q.notify({
        type: 'warning',
        message: 'Invalid phone number format. Please use +639XXXXXXXXX or 09XXXXXXXXX.',
        position: 'top',
      })
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
      phone_number: formattedPhone,
      emergency_contact: formattedEmergency,
      birthday: addForm.value.birthday || null,
      bank_acct: addForm.value.bank_acct || '',
      timezone: addForm.value.timezone || '',
      last_date_updated: new Date().toISOString(),
      user_role: addForm.value.user_role?.id || 0,
      updated_by: userId,
      status: 'active',
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

// -----------------------------
// Save Employee (Edit)
// -----------------------------
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
      return $q.notify({
        type: 'negative',
        message: 'Missing token or company ID.',
        position: 'top',
      })
    }

    // ✅ Format and validate phone numbers before saving
    const formattedPhone = formatPhilippinePhone(editForm.value.phone_number)
    const formattedEmergency = formatPhilippinePhone(editForm.value.emergency_contact)

    if (!formattedPhone) {
      return $q.notify({
        type: 'warning',
        message: 'Invalid phone number format. Please use +639XXXXXXXXX or 09XXXXXXXXX.',
        position: 'top',
      })
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
      phone_number: formattedPhone,
      emergency_contact: formattedEmergency,
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
    const index = employees.value.findIndex((emp) => emp.id === updatedEmployee.id)
    if (index !== -1) employees.value[index] = updatedEmployee
    filteredEmployees.value = employees.value
    sortEmployees()

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(updatedEmployee)} updated successfully.`,
      position: 'top',
    })

    showEditModal.value = false
  } catch (error) {
    console.error('❌ Error updating employee:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail || 'Failed to update employee',
      position: 'top',
    })
  } finally {
    savingEmployee.value = false
  }
}

const terminateEmployee = async () => {
  try {
    terminating.value = true
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

    // Use the correct payload structure based on the API documentation
    const payload = {
      companies: [
        {
          company_id: parseInt(companyId),
          employment_status: 'terminated',
        },
      ],
    }

    const response = await axios.patch(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/${employeeToTerminate.value.id}/`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    // Update the employee in the local list immediately
    const employeeIndex = employees.value.findIndex((e) => e.id === employeeToTerminate.value.id)
    if (employeeIndex !== -1) {
      // Update the employee with the response data
      employees.value[employeeIndex] = {
        ...response.data,
        is_active: false,
        status: 'terminated',
      }
    }

    // Update filtered list as well
    filteredEmployees.value = [...employees.value]
    sortEmployees()

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(employeeToTerminate.value)} has been terminated`,
      position: 'top',
    })
    showTerminateDialog.value = false
    employeeToTerminate.value = {}
  } catch (error) {
    console.error('Error terminating employee:', error)
    console.error('Error details:', error.response?.data)
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to terminate employee',
      position: 'top',
    })
  } finally {
    terminating.value = false
  }
}

const restoreEmployee = async () => {
  try {
    restoring.value = true
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

    // ✅ match the structure used in terminateEmployee()
    const payload = {
      companies: [
        {
          company_id: parseInt(companyId),
          employment_status: 'active', // 🔑 this is the key change
        },
      ],
      is_active: true, // for safety
      status: 'active',
    }

    console.log('Restoring employee with payload:', payload)

    const response = await axios.patch(
      `https://staging.wageyapp.com/user/companies/${companyId}/employees/${employeeToRestore.value.id}/`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    console.log('Restore response:', response.data)

    // ✅ Update employee locally
    const employeeIndex = employees.value.findIndex((e) => e.id === employeeToRestore.value.id)
    if (employeeIndex !== -1) {
      employees.value[employeeIndex] = {
        ...response.data,
        is_active: true,
        status: 'active',
      }
    }

    filteredEmployees.value = [...employees.value]
    sortEmployees()

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(employeeToRestore.value)} has been restored successfully.`,
      position: 'top',
    })

    showRestoreDialog.value = false
    employeeToRestore.value = {}
  } catch (error) {
    console.error('Error restoring employee:', error)
    console.error('Error details:', error.response?.data)
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to restore employee',
      position: 'top',
    })
  } finally {
    restoring.value = false
  }
}

const filterEmployees = () => {
  let filtered = employees.value

  // Filter by search term
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter((emp) => {
      return (
        getFullName(emp).toLowerCase().includes(term) ||
        getEmail(emp).toLowerCase().includes(term) ||
        getPhoneNumber(emp).toLowerCase().includes(term) ||
        getRole(emp).toLowerCase().includes(term) ||
        getStatus(emp).toLowerCase().includes(term)
      )
    })
  }

  // Filter by selected site
  if (selectedSite.value !== null) {
    console.log('🔍 Filtering by site:', selectedSite.value)

    filtered = filtered.filter((emp) => {
      // Check multiple possible locations for site_id in the employee object
      const empSiteId =
        emp.site_id ||
        emp.site?.id ||
        emp.companies?.[0]?.site_id ||
        emp.companies?.[0]?.site?.id ||
        emp.user_site?.id

      console.log(`Employee ${getFullName(emp)} (ID: ${emp.id}) site:`, empSiteId)

      // Type-safe comparison (handles both string and number IDs)
      const employeeSite = typeof empSiteId === 'number' ? empSiteId : parseInt(empSiteId)
      const filterSite =
        typeof selectedSite.value === 'number' ? selectedSite.value : parseInt(selectedSite.value)

      return employeeSite === filterSite
    })

    console.log('Filtered employees count:', filtered.length)
  }

  filteredEmployees.value = filtered
  sortEmployees() // Apply sorting after filtering
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

const viewEmployee = async (emp) => {
  // fetch full details then show
  const detailed = await fetchEmployeeDetails(emp.id)
  if (detailed) {
    selectedEmployee.value = detailed
    showViewModal.value = true
  }
}

const editEmployee = async (emp) => {
  // fetch full details then populate edit form
  const detailed = await fetchEmployeeDetails(emp.id)
  if (!detailed) return

  selectedEmployee.value = detailed

  // Match the role object correctly
  const matchingRole =
    roleOptions.value.find(
      (role) =>
        role.name?.toLowerCase() ===
        (detailed.user_role_name || detailed.user_role?.name || '').toLowerCase(),
    ) || null

  // Fill the form with the employee’s existing data
  editForm.value = {
    user: {
      id: detailed.user?.id || 0,
      username: detailed.user?.username || '',
      email: detailed.user?.email || '',
      first_name: detailed.user?.first_name || '',
      middle_name: detailed.user?.middle_name || '',
      last_name: detailed.user?.last_name || '',
    },
    user_role: matchingRole || detailed.user_role || null,
    civil_status: detailed.civil_status || '',
    address: detailed.address || '',
    phone_number: detailed.phone_number || '',
    emergency_contact: detailed.emergency_contact || '',
    birthday: detailed.birthday || '',
    bank_acct: detailed.bank_acct || '',
    timezone: detailed.timezone || '',
  }

  showEditModal.value = true
}

const confirmTerminate = (emp) => {
  console.log('=== TERMINATE DEBUG ===')
  console.log('Employee to terminate:', emp)
  console.log('Current status:', getStatus(emp))
  console.log('is_active:', emp.is_active)
  console.log('status field:', emp.status)
  employeeToTerminate.value = emp
  showTerminateDialog.value = true
}

const confirmRestore = (emp) => {
  employeeToRestore.value = emp
  showRestoreDialog.value = true
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
const filterBySite = () => {
  console.log('🏢 Site filter changed to:', selectedSite.value)
  filterEmployees()
}

watch(sortBy, () => {
  sortEmployees()
})

onMounted(() => {
  fetchEmployees()
  fetchRoles()
  fetchSites() // Add this line
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
  padding: 16px;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.site-select {
  min-width: 200px;
}
.add-employee-btn {
  height: 36px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 13px;
}

.header-search {
  min-width: 180px;
  max-width: 250px;
  flex: 1;
}

.header-search .q-field__control {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  min-width: 0;
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
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

.stats-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.stats-icon {
  font-size: 24px;
  color: #374151;
}

.stats-content {
  flex: 1;
  min-width: 0;
}

.stats-amount {
  font-size: 26px;
  font-weight: 700;
  color: #1a202c;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}

.table-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.table-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.sort-select {
  width: 160px;
}

.sort-select .q-field__control {
  border-radius: 8px;
  height: 36px;
}

.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 10px;
  overflow: hidden;
  margin: 0 16px 16px 16px;
}

.loan-table {
  background: white;
  border-radius: 10px;
  overflow: hidden;
}

.table-header-row {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.table-header-cell {
  padding: 12px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  text-align: left;
  border: none;
  white-space: nowrap;
}

.table-body-row {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-body-row:hover {
  background: #f8fafc;
}

.terminated-row {
  opacity: 0.6;
  background: #fef2f2;
}

.terminated-row:hover {
  background: #fee2e2;
}

.table-body-cell {
  padding: 12px 10px;
  font-size: 13px;
  color: #374151;
  border: none;
  vertical-align: middle;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-name {
  font-weight: 500;
  color: #1a202c;
  font-size: 13px;
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
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.status-active {
  background: #dcfce7;
  color: #16a34a;
}

.status-terminated {
  background: #fee2e2;
  color: #dc2626;
}

.status-default {
  background: #f3f4f6;
  color: #374151;
}

.actions-cell {
  width: 120px;
  min-width: 120px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
}

.action-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
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

.edit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.terminate-btn {
  background: #fef2f2;
  color: #ef4444;
}

.terminate-btn:hover {
  background: #fee2e2;
}

.restore-btn {
  background: #dcfce7;
  color: #16a34a;
}

.restore-btn:hover {
  background: #bbf7d0;
}

.modal-card {
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.add-modal,
.edit-modal {
  max-width: 900px;
}

.view-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9fafb;
  flex-shrink: 0;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar {
  flex-shrink: 0;
}

.modal-icon {
  font-size: 28px;
  color: #3b82f6;
  background: #dbeafe;
  padding: 8px;
  border-radius: 8px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-subtitle {
  font-size: 13px;
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
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.avatar-upload-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: center;
}

.avatar-preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.avatar-hint {
  font-size: 11px;
  color: #6b7280;
  text-align: center;
  max-width: 280px;
}

.form-sections,
.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section,
.detail-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.col-span-2 {
  grid-column: span 2;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
  margin-right: 16px;
}

.detail-value {
  font-size: 13px;
  color: #111827;
  text-align: right;
  word-break: break-word;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: 16px;
}

.terminate-dialog,
.restore-dialog {
  max-width: 420px;
  border-radius: 12px;
}

.terminate-header,
.restore-header {
  text-align: center;
  padding: 20px 20px 12px;
}

.terminate-icon {
  font-size: 42px;
  color: #ef4444;
  margin-bottom: 10px;
}

.restore-icon {
  font-size: 42px;
  color: #16a34a;
  margin-bottom: 10px;
}

.terminate-title,
.restore-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.terminate-content,
.restore-content {
  padding: 0 20px 12px;
  text-align: center;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}

.terminate-content strong,
.restore-content strong {
  color: #111827;
}

.terminate-actions,
.restore-actions {
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
}

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

.q-field--loading .q-field__control::before {
  background: #f3f4f6;
}

.modal-close-btn:focus,
.form-actions button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.q-field--focused .q-field__control {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

/* ===================================
   RESPONSIVE BREAKPOINTS
   =================================== */

/* 1440px - Large Desktop */
@media (min-width: 1440px) {
  .dashboard-container {
    max-width: 1400px;
    padding: 20px;
  }

  .stats-section {
    gap: 16px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 14px 12px;
  }

  .action-buttons {
    gap: 5px;
  }

  .action-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
  }
}

/* 1024px - Desktop / Tablet Landscape */
@media (max-width: 1024px) {
  .dashboard-container {
    padding: 16px;
  }

  .page-header {
    padding: 14px;
  }

  .header-content {
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .header-search {
    min-width: 200px;
  }

  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .stats-card {
    padding: 14px;
  }

  .stats-icon-wrapper {
    width: 44px;
    height: 44px;
  }

  .stats-icon {
    font-size: 22px;
  }

  .stats-amount {
    font-size: 24px;
  }

  .stats-label {
    font-size: 12px;
  }

  .table-header {
    padding: 14px;
  }

  .modern-table-container {
    margin: 0 14px 14px 14px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 11px 8px;
    font-size: 12px;
  }

  .actions-cell {
    width: 110px;
    min-width: 110px;
  }

  .action-buttons {
    gap: 3px;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }

  .employee-info {
    gap: 8px;
  }

  .employee-name {
    font-size: 12px;
  }

  .modal-card {
    max-width: 90vw;
  }

  .form-grid {
    gap: 12px;
  }
}

/* 768px - Tablet Portrait */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .page-header {
    padding: 16px;
    margin-bottom: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    gap: 12px;
  }

  .add-employee-btn,
  .header-search {
    width: 100%;
    max-width: 100%;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .stats-card {
    padding: 16px;
  }

  .stats-icon-wrapper {
    width: 44px;
    height: 44px;
  }

  .stats-icon {
    font-size: 22px;
  }

  .stats-amount {
    font-size: 24px;
  }

  .stats-label {
    font-size: 13px;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    gap: 12px;
  }

  .sort-select {
    width: 100%;
  }

  .modern-table-container {
    margin: 0 12px 12px 12px;
    overflow-x: auto;
    border-radius: 8px;
  }

  .loan-table {
    min-width: 800px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 12px 8px;
    font-size: 12px;
  }

  .table-header-cell {
    white-space: nowrap;
  }

  .employee-info {
    gap: 8px;
  }

  .employee-name {
    font-size: 12px;
  }

  .actions-cell {
    width: 120px;
    min-width: 120px;
    padding: 12px 6px;
  }

  .action-buttons {
    gap: 3px;
    justify-content: center;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
  }

  .status-badge {
    font-size: 11px;
    padding: 4px 10px;
  }

  .modal-card {
    margin: 12px;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
  }

  .modal-header {
    padding: 16px;
  }

  .modal-title-section {
    gap: 12px;
  }

  .modal-title {
    font-size: 18px;
  }

  .modal-subtitle {
    font-size: 13px;
  }

  .modal-content {
    padding: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .col-span-2 {
    grid-column: span 1;
  }

  .form-section,
  .detail-section {
    padding: 16px;
  }

  .section-title {
    font-size: 15px;
    margin-bottom: 12px;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 10px 0;
  }

  .detail-value {
    text-align: left;
  }

  .form-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .form-actions button {
    width: 100%;
  }

  .avatar-upload-section {
    padding: 16px;
  }

  .avatar-actions {
    flex-direction: column;
    width: 100%;
  }

  .avatar-actions button {
    width: 100%;
  }
}

/* Small Mobile - 480px and below */
@media (max-width: 480px) {
  .dashboard-container {
    padding: 12px;
  }

  .page-header {
    padding: 12px;
    border-radius: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .stats-card {
    padding: 14px;
  }

  .stats-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .stats-icon {
    font-size: 20px;
  }

  .stats-amount {
    font-size: 22px;
  }

  .stats-label {
    font-size: 12px;
  }

  .table-header {
    padding: 12px;
  }

  .table-title {
    font-size: 18px;
  }

  .modern-table-container {
    margin: 0 8px 8px 8px;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }

  .modal-header {
    padding: 12px;
  }

  .modal-title {
    font-size: 16px;
  }
}
</style>
