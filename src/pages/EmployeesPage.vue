<template>
  <q-page class="employee-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Employees</h1>
          <div class="header-actions">
            <q-input
              v-model="searchTerm"
              placeholder="Search employees..."
              class="header-search"
              dense
              outlined
              @update:model-value="filterEmployees"
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
            <q-btn
              color="primary"
              label="Add Employee"
              icon="add"
              class="add-employee-btn"
              unelevated
              @click="openAddModal"
            />
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-section">
        <div class="stats-card stats-total">
          <div class="stats-icon-wrapper stats-icon-blue">
            <q-icon name="people" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Total Employees</div>
            <div class="stats-amount">{{ employeeStats.total }}</div>
            <div class="stats-delta stats-delta-neutral">All time</div>
          </div>
        </div>

        <div class="stats-card stats-active">
          <div class="stats-icon-wrapper stats-icon-green">
            <q-icon name="check_circle" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Active</div>
            <div class="stats-amount">{{ employeeStats.active }}</div>
            <div class="stats-delta stats-delta-positive">
              {{
                employeeStats.total > 0
                  ? Math.round((employeeStats.active / employeeStats.total) * 100)
                  : 0
              }}% of total
            </div>
          </div>
        </div>

        <div class="stats-card stats-terminated">
          <div class="stats-icon-wrapper stats-icon-red">
            <q-icon name="remove_circle" />
          </div>
          <div class="stats-content">
            <div class="stats-label">Terminated</div>
            <div class="stats-amount">{{ employeeStats.terminated }}</div>
            <div class="stats-delta stats-delta-negative">
              {{
                employeeStats.total > 0
                  ? Math.round((employeeStats.terminated / employeeStats.total) * 100)
                  : 0
              }}% of total
            </div>
          </div>
        </div>
      </div>

      <!-- Main Table Section -->
      <div class="table-section">
        <div class="table-header">
          <h2 class="table-title">Employee Overview</h2>
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
            <!-- Loading skeleton -->
            <template v-slot:loading>
              <q-inner-loading showing color="primary" />
            </template>

            <template v-slot:header="props">
              <q-tr class="table-header-row">
                <q-th key="name" :props="props" class="table-header-cell">Employee</q-th>
                <q-th key="role" :props="props" class="table-header-cell">Role</q-th>
                <q-th key="phone" :props="props" class="table-header-cell">Phone</q-th>
                <q-th key="status" :props="props" class="table-header-cell">Status</q-th>
                <q-th key="actions" :props="props" class="table-header-cell table-header-actions"
                  >Actions</q-th
                >
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr class="table-body-row">
                <!-- Employee name + avatar + email merged cell -->
                <q-td key="name" :props="props" class="table-body-cell employee-name-cell">
                  <div class="employee-info">
                    <q-avatar size="34px" v-if="props.row.user?.picture_url">
                      <img
                        :src="props.row.user.picture_url"
                        :alt="getFullName(props.row)"
                        @error="handleImageError"
                      />
                    </q-avatar>
                    <q-avatar v-else size="34px" class="avatar-fallback">
                      {{ getInitials(getFullName(props.row)) }}
                    </q-avatar>
                    <div class="employee-name-block">
                      <span class="employee-name">{{ getFullName(props.row) }}</span>
                      <a :href="`mailto:${getEmail(props.row)}`" class="email-link">
                        {{ getEmail(props.row) }}
                      </a>
                    </div>
                  </div>
                </q-td>

                <q-td key="role" :props="props" class="table-body-cell">
                  <span class="role-chip">{{ getRole(props.row) }}</span>
                </q-td>

                <q-td key="phone" :props="props" class="table-body-cell">
                  {{ getPhoneNumber(props.row) }}
                </q-td>

                <q-td key="status" :props="props" class="table-body-cell">
                  <div :class="['status-badge', getStatusClass(props.row)]">
                    <span class="status-dot"></span>
                    {{ getStatus(props.row) }}
                  </div>
                </q-td>

                <!-- Actions: ⋯ dropdown -->
                <q-td key="actions" :props="props" class="table-body-cell actions-cell">
                  <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                    <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                      <q-list dense style="min-width: 150px">
                        <q-item
                          clickable
                          v-close-popup
                          @click="viewEmployee(props.row)"
                          class="dropdown-item"
                        >
                          <q-item-section avatar
                            ><q-icon name="visibility" size="16px"
                          /></q-item-section>
                          <q-item-section>View details</q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          @click="editEmployee(props.row)"
                          :disable="getStatus(props.row) === 'Terminated'"
                          class="dropdown-item"
                        >
                          <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
                          <q-item-section>Edit</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item
                          v-if="getStatus(props.row) !== 'Terminated'"
                          clickable
                          v-close-popup
                          @click="confirmTerminate(props.row)"
                          class="dropdown-item dropdown-item-danger"
                        >
                          <q-item-section avatar
                            ><q-icon name="block" size="16px"
                          /></q-item-section>
                          <q-item-section>Terminate</q-item-section>
                        </q-item>
                        <q-item
                          v-else
                          clickable
                          v-close-popup
                          @click="confirmRestore(props.row)"
                          class="dropdown-item dropdown-item-restore"
                        >
                          <q-item-section avatar
                            ><q-icon name="restore" size="16px"
                          /></q-item-section>
                          <q-item-section>Restore</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </q-td>
              </q-tr>
            </template>

            <!-- Empty state -->
            <template v-slot:no-data>
              <div class="empty-state">
                <q-icon name="group_off" size="48px" class="empty-state-icon" />
                <div class="empty-state-title">No employees found</div>
                <div class="empty-state-sub">
                  Try adjusting your search or filters, or add your first employee.
                </div>
                <q-btn
                  unelevated
                  color="primary"
                  icon="add"
                  label="Add Employee"
                  class="empty-state-btn"
                  @click="openAddModal"
                />
              </div>
            </template>
          </q-table>
        </div>
      </div>
    </div>

    <!-- ======================== ADD EMPLOYEE MODAL (Stepper) ======================== -->
    <q-dialog v-model="showAddModal" persistent>
      <q-card class="modal-card add-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
              <q-icon name="person_add" size="22px" />
            </q-avatar>
            <div>
              <div class="modal-title">Add New Employee</div>
              <div class="modal-subtitle" id="add-step-label">Step 1 of 3 — User information</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" @click="cancelAdd" />
        </q-card-section>
        <q-separator />

        <!-- Stepper dots -->
        <div class="stepper-dots">
          <span :class="['dot', addStep >= 1 ? 'dot-active' : '']"></span>
          <span :class="['dot', addStep >= 2 ? 'dot-active' : '']"></span>
          <span :class="['dot', addStep >= 3 ? 'dot-active' : '']"></span>
        </div>

        <q-card-section class="modal-content">
          <q-form @submit="addEmployee" class="edit-form" ref="addFormRef">
            <!-- Step 1: User Info -->
            <div v-show="addStep === 1">
              <!-- Avatar Upload Section -->
              <div class="avatar-upload-section">
                <div class="avatar-preview-wrapper">
                  <q-avatar size="90px" v-if="avatarPreview">
                    <img :src="avatarPreview" alt="Avatar Preview" />
                  </q-avatar>
                  <q-avatar v-else size="90px" class="avatar-placeholder">
                    <q-icon name="person" size="40px" />
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
                  <div class="avatar-hint">Max 5MB · JPG, PNG, GIF</div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-title">User information</div>
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
                      (val) => val.length >= 8 || 'Min 8 characters',
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
            </div>

            <!-- Step 2: Personal Info -->
            <div v-show="addStep === 2">
              <div class="form-section">
                <div class="section-title">Personal information</div>
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
            </div>

            <!-- Step 3: Employment Info -->
            <div v-show="addStep === 3">
              <div class="form-section">
                <div class="section-title">Employment information</div>
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
              <q-btn v-if="addStep > 1" label="Back" flat color="grey-7" @click="addStep--" />
              <q-btn label="Cancel" flat color="grey-7" @click="cancelAdd" />
              <q-btn
                v-if="addStep < 3"
                label="Next"
                color="primary"
                unelevated
                @click="addStep++"
              />
              <q-btn
                v-else
                label="Add Employee"
                type="submit"
                color="primary"
                unelevated
                :loading="savingEmployee || uploadingAvatar"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ======================== VIEW EMPLOYEE MODAL (Tabbed) ======================== -->
    <q-dialog v-model="showViewModal" persistent>
      <q-card class="modal-card view-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="52px" v-if="selectedEmployee?.user?.picture_url">
              <img :src="selectedEmployee.user.picture_url" :alt="getFullName(selectedEmployee)" />
            </q-avatar>
            <q-avatar v-else size="52px" class="avatar-fallback avatar-fallback-lg">
              {{ getInitials(getFullName(selectedEmployee)) }}
            </q-avatar>
            <div>
              <div class="modal-title">{{ getFullName(selectedEmployee) }}</div>
              <div class="modal-subtitle">
                <span
                  :class="['status-badge', getStatusClass(selectedEmployee)]"
                  style="font-size: 11px"
                >
                  <span class="status-dot"></span>{{ getStatus(selectedEmployee) }}
                </span>
              </div>
            </div>
          </div>
          <q-btn
            icon="close"
            flat
            round
            dense
            class="modal-close-btn"
            @click="showViewModal = false"
          />
        </q-card-section>
        <q-separator />

        <!-- Tabs -->
        <q-tabs
          v-model="viewTab"
          dense
          align="left"
          class="view-tabs"
          indicator-color="primary"
          active-color="primary"
        >
          <q-tab name="user" label="User info" />
          <q-tab name="personal" label="Personal" />
          <q-tab name="employment" label="Employment" />
        </q-tabs>
        <q-separator />

        <q-card-section class="modal-content">
          <q-tab-panels v-model="viewTab" animated>
            <!-- User Info Tab -->
            <q-tab-panel name="user" class="q-pa-none">
              <div class="detail-grid-cards">
                <div class="detail-card">
                  <div class="detail-card-label">Username</div>
                  <div class="detail-card-value">
                    {{ selectedEmployee?.user?.username || 'N/A' }}
                  </div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Email</div>
                  <div class="detail-card-value">{{ getEmail(selectedEmployee) }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Full Name</div>
                  <div class="detail-card-value">{{ getFullName(selectedEmployee) }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Role</div>
                  <div class="detail-card-value">{{ getRole(selectedEmployee) }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Status</div>
                  <div class="detail-card-value">
                    <span :class="['status-badge', getStatusClass(selectedEmployee)]"
                      ><span class="status-dot"></span>{{ getStatus(selectedEmployee) }}</span
                    >
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- Personal Tab -->
            <q-tab-panel name="personal" class="q-pa-none">
              <div class="detail-grid-cards">
                <div class="detail-card">
                  <div class="detail-card-label">Civil Status</div>
                  <div class="detail-card-value">{{ getCivilStatus(selectedEmployee) }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Birthday</div>
                  <div class="detail-card-value">
                    {{ formatDate(selectedEmployee?.birthday) || 'N/A' }}
                  </div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Phone</div>
                  <div class="detail-card-value">{{ getPhoneNumber(selectedEmployee) }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Emergency Contact</div>
                  <div class="detail-card-value">
                    {{ selectedEmployee?.emergency_contact || 'N/A' }}
                  </div>
                </div>
                <div class="detail-card detail-card-full">
                  <div class="detail-card-label">Address</div>
                  <div class="detail-card-value">{{ selectedEmployee?.address || 'N/A' }}</div>
                </div>
              </div>
            </q-tab-panel>

            <!-- Employment Tab -->
            <q-tab-panel name="employment" class="q-pa-none">
              <div class="detail-grid-cards">
                <div class="detail-card">
                  <div class="detail-card-label">Bank Account</div>
                  <div class="detail-card-value">{{ selectedEmployee?.bank_acct || 'N/A' }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Timezone</div>
                  <div class="detail-card-value">{{ selectedEmployee?.timezone || 'N/A' }}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Last Updated</div>
                  <div class="detail-card-value">
                    {{ formatDateTime(selectedEmployee?.last_date_updated) || 'N/A' }}
                  </div>
                </div>
                <div class="detail-card">
                  <div class="detail-card-label">Updated By</div>
                  <div class="detail-card-value">{{ selectedEmployee?.updated_by || 'N/A' }}</div>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ======================== EDIT EMPLOYEE MODAL ======================== -->
    <q-dialog v-model="showEditModal" persistent>
      <q-card class="modal-card edit-modal">
        <q-card-section class="modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-edit">
              <q-icon name="edit" size="20px" />
            </q-avatar>
            <div>
              <div class="modal-title">Edit Employee</div>
              <div class="modal-subtitle">{{ getFullName(selectedEmployee) }}</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" @click="cancelEdit" />
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-content">
          <q-form @submit="saveEmployee" class="edit-form">
            <!-- Avatar Upload Section for Edit -->
            <div class="avatar-upload-section">
              <div class="avatar-preview-wrapper">
                <q-avatar size="90px" v-if="editAvatarPreview">
                  <img :src="editAvatarPreview" alt="Avatar Preview" />
                </q-avatar>
                <q-avatar v-else-if="selectedEmployee?.user?.picture_url" size="90px">
                  <img
                    :src="selectedEmployee.user.picture_url"
                    :alt="getFullName(selectedEmployee)"
                  />
                </q-avatar>
                <q-avatar v-else size="90px" class="avatar-placeholder">
                  <q-icon name="person" size="40px" />
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
                <div class="avatar-hint">Max 5MB · JPG, PNG, GIF</div>
              </div>
            </div>

            <div class="form-section">
              <div class="section-title">User information</div>
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
                <q-input v-model="editForm.birthday" label="Birthday" type="date" outlined dense />
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

            <div class="form-section">
              <div class="section-title">Employment information</div>
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

            <div class="form-actions">
              <q-btn label="Cancel" flat color="grey-7" @click="cancelEdit" />
              <q-btn
                label="Save Changes"
                type="submit"
                color="primary"
                unelevated
                :loading="savingEmployee || uploadingAvatar"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ======================== TERMINATE CONFIRMATION ======================== -->
    <q-dialog v-model="showTerminateDialog" persistent>
      <q-card class="confirm-dialog">
        <q-card-section class="confirm-header confirm-header-danger">
          <q-avatar size="44px" class="confirm-icon-wrap confirm-icon-danger">
            <q-icon name="block" size="22px" />
          </q-avatar>
          <div class="confirm-title">Terminate employee?</div>
        </q-card-section>
        <q-card-section class="confirm-content">
          <strong>{{ getFullName(employeeToTerminate) }}</strong> will be marked as Terminated and
          lose system access. This can be reversed.
        </q-card-section>
        <q-card-actions align="right" class="confirm-actions">
          <q-btn flat label="Cancel" color="grey-7" @click="showTerminateDialog = false" />
          <q-btn
            unelevated
            label="Terminate"
            color="negative"
            @click="terminateEmployee"
            :loading="terminating"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ======================== RESTORE CONFIRMATION ======================== -->
    <q-dialog v-model="showRestoreDialog" persistent>
      <q-card class="confirm-dialog">
        <q-card-section class="confirm-header confirm-header-success">
          <q-avatar size="44px" class="confirm-icon-wrap confirm-icon-success">
            <q-icon name="restore" size="22px" />
          </q-avatar>
          <div class="confirm-title">Restore employee?</div>
        </q-card-section>
        <q-card-section class="confirm-content">
          <strong>{{ getFullName(employeeToRestore) }}</strong> will be restored to Active status
          and regain system access.
        </q-card-section>
        <q-card-actions align="right" class="confirm-actions">
          <q-btn flat label="Cancel" color="grey-7" @click="showRestoreDialog = false" />
          <q-btn
            unelevated
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
import { useQuasar } from 'quasar'
import { useEmployees } from 'src/composables/useEmployees'
import { useRolesAndPositions } from 'src/composables/useRolesAndPositions'
import { useOrganization } from 'src/composables/useOrganization'

const $q = useQuasar()

// ─── Composables ──────────────────────────────────────────────────────────────
const {
  employees,
  loading,
  saving: savingEmployee,
  fetchEmployees: fetchEmployeesList,
  fetchEmployee,
  addEmployee: addEmployeeApi,
  updateEmployee,
  updateUser,
  terminateEmployee: terminateEmployeeApi,
  restoreEmployee: restoreEmployeeApi,
} = useEmployees()

const { userRoles, fetchUserRoles } = useRolesAndPositions()
const { sites: rawSites, fetchSites: fetchSitesApi } = useOrganization()

// ─── Local UI state ───────────────────────────────────────────────────────────
const filteredEmployees = ref([])
const searchTerm = ref('')
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
const terminating = ref(false)
const restoring = ref(false)

// Stepper & tab state
const addStep = ref(1)
const viewTab = ref('user')

// Avatar
const avatarFile = ref(null)
const avatarPreview = ref(null)
const editAvatarFile = ref(null)
const editAvatarPreview = ref(null)
const uploadingAvatar = ref(false)

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
const roleOptions = computed(() => userRoles.value)
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
  { name: 'name', label: 'Employee', field: (row) => getFullName(row), align: 'left' },
  { name: 'role', label: 'Role', field: (row) => getRole(row), align: 'left' },
  { name: 'phone', label: 'Phone', field: 'phone_number', align: 'left' },
  { name: 'status', label: 'Status', field: (row) => getStatus(row), align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

// ─── Computed ─────────────────────────────────────────────────────────────────
const employeeStats = computed(() => {
  const total = employees.value.length
  const active = employees.value.filter((emp) => getStatus(emp) === 'Active').length
  const terminated = employees.value.filter((emp) => getStatus(emp) === 'Terminated').length
  return { total, active, terminated }
})

// ─── Helper Functions ─────────────────────────────────────────────────────────

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

const getPhoneNumber = (employee) => employee?.phone_number || 'N/A'

const getCivilStatus = (employee) => employee?.civil_status || 'N/A'

const getStatus = (employee) => {
  if (!employee) return 'N/A'
  if (employee.status && employee.status.toLowerCase() === 'terminated') return 'Terminated'
  if (employee.is_active === false) return 'Terminated'
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
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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

function formatPhilippinePhone(number) {
  if (!number) return ''
  let cleaned = number.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = '+63' + cleaned.slice(1)
  else if (cleaned.startsWith('9')) cleaned = '+63' + cleaned
  else if (cleaned.startsWith('63')) cleaned = '+' + cleaned
  const valid = /^\+639\d{9}$/.test(cleaned)
  return valid ? cleaned : ''
}

// ─── Data fetching ────────────────────────────────────────────────────────────

const fetchEmployees = async () => {
  try {
    // fetchEmployees from composable fetches the list; then enrich each with phone_number
    const list = await fetchEmployeesList()

    const detailed = await Promise.all(
      list.map((emp) =>
        fetchEmployee(emp.id)
          .then((r) => ({ ...emp, phone_number: r.phone_number || '' }))
          .catch(() => emp),
      ),
    )

    employees.value = detailed
    filteredEmployees.value = detailed
    sortEmployees()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail ?? 'Failed to fetch employees',
      position: 'top',
    })
  }
}

const fetchRoles = async () => {
  try {
    await fetchUserRoles()
  } catch {
    // silent fallback — roleOptions stays empty
  }
}

const fetchSites = async () => {
  try {
    await fetchSitesApi()
    sites.value = [
      { label: 'All Sites', value: null },
      ...rawSites.value.map((site) => ({
        label: site.name || site.site_name || `Site ${site.id}`,
        value: site.id,
      })),
    ]
  } catch (err) {
    sites.value = [{ label: 'All Sites', value: null }]
    $q.notify({
      type: 'warning',
      message: err.response?.data?.detail ?? 'Could not load sites. Showing all employees.',
      position: 'top',
    })
  }
}

const fetchEmployeeDetails = async (employeeId) => {
  try {
    return await fetchEmployee(employeeId)
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to fetch employee details', position: 'top' })
    return null
  }
}

// ─── Add Employee ─────────────────────────────────────────────────────────────

async function addEmployee() {
  try {
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
      user_role: addForm.value.user_role?.id ? parseInt(addForm.value.user_role.id) : null,
      status: 'active',
    }

    // Remove empty values
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === undefined || payload[key] === null) {
        delete payload[key]
      }
    })

    const newEmployee = await addEmployeeApi(payload)

    // Upload avatar if selected
    if (avatarFile.value && newEmployee.user?.id) {
      try {
        uploadingAvatar.value = true
        const formData = new FormData()
        formData.append('picture', avatarFile.value)
        await updateUser(newEmployee.user.id, formData)
        await fetchEmployees()
        $q.notify({
          type: 'positive',
          message: 'Employee and profile picture added successfully!',
          position: 'top',
        })
      } catch {
        await fetchEmployees()
        $q.notify({
          type: 'warning',
          message: 'Employee created but profile picture upload failed',
          position: 'top',
        })
      } finally {
        uploadingAvatar.value = false
      }
    } else {
      await fetchEmployees()
      $q.notify({ type: 'positive', message: 'Employee added successfully!', position: 'top' })
    }

    resetAddForm()
    showAddModal.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.response?.data?.error ||
        Object.entries(error.response?.data || {})
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join(' | ') ||
        'Failed to add employee',
      position: 'top',
      timeout: 5000,
    })
  }
}

// ─── Save Employee (Edit) ─────────────────────────────────────────────────────

const saveEmployee = async () => {
  try {
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

    const updatedEmployee = await updateEmployee(selectedEmployee.value.id, payload)

    // Upload avatar if a new one was selected
    if (editAvatarFile.value && updatedEmployee.user?.id) {
      try {
        uploadingAvatar.value = true
        const formData = new FormData()
        formData.append('picture', editAvatarFile.value)
        await updateUser(updatedEmployee.user.id, formData)

        await fetchEmployees()
      } catch {
        $q.notify({
          type: 'warning',
          message: 'Employee updated but profile picture upload failed',
          position: 'top',
        })
        const index = employees.value.findIndex((emp) => emp.id === updatedEmployee.id)
        if (index !== -1) employees.value[index] = updatedEmployee
        filteredEmployees.value = [...employees.value]
        sortEmployees()
      } finally {
        uploadingAvatar.value = false
      }
    } else {
      const index = employees.value.findIndex((emp) => emp.id === updatedEmployee.id)
      if (index !== -1) employees.value[index] = updatedEmployee
      filteredEmployees.value = [...employees.value]
      sortEmployees()
    }

    $q.notify({
      type: 'positive',
      message: `Employee ${getFullName(updatedEmployee)} updated successfully.`,
      position: 'top',
    })

    showEditModal.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.detail ?? 'Failed to update employee',
      position: 'top',
    })
  }
}

const resetAddForm = () => {
  addForm.value = {
    user: { username: '', email: '', first_name: '', last_name: '' },
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
  avatarFile.value = null
  avatarPreview.value = null
}

const cancelEdit = () => {
  showEditModal.value = false
  editAvatarFile.value = null
  editAvatarPreview.value = null
  editForm.value = {
    user: { id: 0, username: '', email: '', first_name: '', last_name: '' },
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

const terminateEmployee = async () => {
  try {
    terminating.value = true
    const payload = { companies: [{ employment_status: 'terminated' }] }
    const response = await terminateEmployeeApi(employeeToTerminate.value.id, payload)

    const employeeIndex = employees.value.findIndex((e) => e.id === employeeToTerminate.value.id)
    if (employeeIndex !== -1) {
      employees.value[employeeIndex] = { ...response, is_active: false, status: 'terminated' }
    }

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
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.detail ??
        error.response?.data?.message ??
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
    const payload = {
      companies: [{ employment_status: 'active' }],
      is_active: true,
      status: 'active',
    }
    const response = await restoreEmployeeApi(employeeToRestore.value.id, payload)

    const employeeIndex = employees.value.findIndex((e) => e.id === employeeToRestore.value.id)
    if (employeeIndex !== -1) {
      employees.value[employeeIndex] = { ...response, is_active: true, status: 'active' }
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
    $q.notify({
      type: 'negative',
      message:
        error.response?.data?.detail ??
        error.response?.data?.message ??
        'Failed to restore employee',
      position: 'top',
    })
  } finally {
    restoring.value = false
  }
}

const handleAvatarSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    $q.notify({
      type: 'negative',
      message: 'Please select a valid image file (JPG, PNG, GIF)',
      position: 'top',
    })
    return
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    $q.notify({
      type: 'negative',
      message: 'Image size must be less than 5MB',
      position: 'top',
    })
    return
  }

  avatarFile.value = file

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const handleEditAvatarSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    $q.notify({
      type: 'negative',
      message: 'Please select a valid image file (JPG, PNG, GIF)',
      position: 'top',
    })
    return
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    $q.notify({
      type: 'negative',
      message: 'Image size must be less than 5MB',
      position: 'top',
    })
    return
  }

  editAvatarFile.value = file

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    editAvatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const removeAvatar = () => {
  avatarFile.value = null
  avatarPreview.value = null
  // Clear the file input
  const input = document.querySelector('input[type="file"]')
  if (input) input.value = ''
}

const removeEditAvatar = () => {
  editAvatarFile.value = null
  editAvatarPreview.value = null
  // Clear the file input
  const inputs = document.querySelectorAll('input[type="file"]')
  if (inputs[1]) inputs[1].value = ''
}

const handleImageError = (event) => {
  event.target.src = '' // Clear broken image
  event.target.style.display = 'none'
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
  addStep.value = 1
  showAddModal.value = true
}

const viewEmployee = async (emp) => {
  // fetch full details then show
  const detailed = await fetchEmployeeDetails(emp.id)
  if (detailed) {
    selectedEmployee.value = detailed
    viewTab.value = 'user'
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

  // Fill the form with the employee's existing data
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

const filterBySite = () => {
  console.log('🏢 Site filter changed to:', selectedSite.value)
  filterEmployees()
}

watch(sortBy, () => {
  sortEmployees()
})

onMounted(async () => {
  await Promise.all([fetchRoles(), fetchSites()])
  await fetchEmployees()
})
</script>

<style scoped>
/* ==============================
   BASE
============================== */
.employee-dashboard {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* ==============================
   HEADER
============================== */
.page-header {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8ecf0;
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
  color: #111827;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.header-search {
  min-width: 200px;
  max-width: 260px;
}

.header-search .q-field__control {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
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

/* ==============================
   STATS CARDS
============================== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid #e8ecf0;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  transition: box-shadow 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.stats-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}

.stats-icon-blue {
  background: #eff6ff;
  color: #3b82f6;
}
.stats-icon-green {
  background: #f0fdf4;
  color: #22c55e;
}
.stats-icon-red {
  background: #fef2f2;
  color: #ef4444;
}

.stats-content {
  min-width: 0;
}

.stats-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stats-amount {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

.stats-delta {
  font-size: 12px;
  margin-top: 3px;
  font-weight: 500;
}

.stats-delta-positive {
  color: #22c55e;
}
.stats-delta-negative {
  color: #ef4444;
}
.stats-delta-neutral {
  color: #9ca3af;
}

/* ==============================
   TABLE SECTION
============================== */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  flex-wrap: wrap;
  gap: 10px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.site-select {
  min-width: 180px;
}

.modern-table-container {
  overflow-x: auto;
}

.loan-table {
  width: 100%;
  min-width: 700px;
}

/* Table header */
.table-header-row {
  background: #f8fafc;
}

.table-header-cell {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #6b7280 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 11px 16px !important;
  border-bottom: 1px solid #e8ecf0 !important;
}

.table-header-actions {
  text-align: center !important;
}

/* Table body */
.table-body-row {
  transition: background 0.15s ease;
}

.table-body-row:hover .table-body-cell {
  background: #f9fafb;
}

.table-body-cell {
  font-size: 13px;
  color: #374151;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle;
}

/* Employee info cell */
.employee-name-cell {
  min-width: 200px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-name-block {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-link {
  font-size: 11px;
  color: #6b7280;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-link:hover {
  color: #3b82f6;
  text-decoration: underline;
}

/* Avatar fallback */
.avatar-fallback {
  background: #e0e7ff !important;
  color: #4338ca !important;
  font-weight: 600 !important;
  min-width: 34px !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}

.avatar-fallback :deep(.q-avatar__content) {
  font-size: 12px !important;
  line-height: 1 !important;
}

.avatar-fallback-lg {
  min-width: 52px !important;
  width: 52px !important;
  height: 52px !important;
}

.avatar-fallback-lg :deep(.q-avatar__content) {
  font-size: 16px !important;
}

/* Role chip */
.role-chip {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  white-space: nowrap;
}

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-active {
  background: #f0fdf4;
  color: #16a34a;
}

.status-active .status-dot {
  background: #22c55e;
}

.status-terminated {
  background: #fef2f2;
  color: #dc2626;
}

.status-terminated .status-dot {
  background: #ef4444;
}

.status-default {
  background: #f3f4f6;
  color: #6b7280;
}

.status-default .status-dot {
  background: #9ca3af;
}

/* Action menu */
.actions-cell {
  text-align: center !important;
  width: 60px;
}

.action-menu-btn {
  color: #6b7280 !important;
  border-radius: 6px !important;
}

.action-menu-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.action-dropdown {
  border-radius: 8px !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

.dropdown-item {
  font-size: 13px !important;
  color: #374151 !important;
  min-height: 36px !important;
  padding: 0 12px !important;
}

.dropdown-item:hover {
  background: #f9fafb !important;
}

.dropdown-item-danger {
  color: #dc2626 !important;
}

.dropdown-item-danger:hover {
  background: #fef2f2 !important;
}

.dropdown-item-restore {
  color: #16a34a !important;
}

.dropdown-item-restore:hover {
  background: #f0fdf4 !important;
}

/* ==============================
   EMPTY STATE
============================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 20px;
  text-align: center;
}

.empty-state-icon {
  color: #d1d5db;
  margin-bottom: 12px;
}

.empty-state-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.empty-state-sub {
  font-size: 13px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.empty-state-btn {
  border-radius: 8px;
  font-size: 13px;
  text-transform: none;
}

/* ==============================
   MODALS - SHARED
============================== */
.modal-card {
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 14px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important;
  background: #ffffff;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  border-radius: 10px !important;
  flex-shrink: 0;
}

.modal-avatar-add {
  background: #eff6ff !important;
  color: #3b82f6 !important;
}

.modal-avatar-edit {
  background: #fefce8 !important;
  color: #ca8a04 !important;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.modal-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.modal-close-btn {
  color: #9ca3af !important;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
}

/* ==============================
   STEPPER DOTS (Add Modal)
============================== */
.stepper-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 10px 0 0 0;
  background: #ffffff;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e5e7eb;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.dot-active {
  background: #3b82f6;
  transform: scale(1.2);
}

/* ==============================
   VIEW MODAL TABS
============================== */
.view-tabs {
  background: #ffffff;
  padding: 0 20px;
  font-size: 13px;
}

.view-modal {
  width: 560px;
}

/* Detail grid cards */
.detail-grid-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #f1f3f5;
}

.detail-card-full {
  grid-column: 1 / -1;
}

.detail-card-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.detail-card-value {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  word-break: break-word;
}

/* ==============================
   FORM SECTIONS
============================== */
.form-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.col-span-2 {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f3f5;
  margin-top: 8px;
}

/* ==============================
   AVATAR UPLOAD
============================== */
.avatar-upload-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f1f3f5;
}

.avatar-preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.avatar-placeholder {
  background: #f3f4f6 !important;
  color: #9ca3af !important;
}

.avatar-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.avatar-hint {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

/* ==============================
   CONFIRM DIALOGS
============================== */
.confirm-dialog {
  width: 400px;
  max-width: 95vw;
  border-radius: 14px !important;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px 14px !important;
}

.confirm-icon-wrap {
  border-radius: 10px !important;
  flex-shrink: 0;
}

.confirm-icon-danger {
  background: #fef2f2 !important;
  color: #dc2626 !important;
}

.confirm-icon-success {
  background: #f0fdf4 !important;
  color: #16a34a !important;
}

.confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.confirm-content {
  padding: 0 20px 16px !important;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;
}

.confirm-actions {
  padding: 12px 16px !important;
  border-top: 1px solid #f1f3f5;
  gap: 8px;
}

/* ==============================
   RESPONSIVE
============================== */
@media (max-width: 900px) {
  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .stats-amount {
    font-size: 22px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 14px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    gap: 8px;
  }

  .header-search,
  .add-employee-btn {
    width: 100%;
    max-width: 100%;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .site-select {
    width: 100%;
  }

  .modern-table-container {
    overflow-x: auto;
  }

  .loan-table {
    min-width: 600px;
  }

  .modal-card {
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 24px);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .col-span-2 {
    grid-column: span 1;
  }

  .detail-grid-cards {
    grid-template-columns: 1fr;
  }

  .detail-card-full {
    grid-column: span 1;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .q-btn {
    width: 100%;
  }

  .confirm-dialog {
    max-width: calc(100vw - 20px);
  }
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 10px;
  }

  .page-title {
    font-size: 18px;
  }

  .stats-amount {
    font-size: 20px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 10px 10px !important;
    font-size: 12px;
  }

  .modal-title {
    font-size: 15px;
  }
}
</style>
