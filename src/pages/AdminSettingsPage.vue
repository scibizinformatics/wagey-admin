<template>
  <q-page class="admin-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">Admin Settings</h1>
          </div>
          <div class="header-actions">
            <q-input
              v-model="searchQuery"
              placeholder="Search settings..."
              class="header-search"
              dense
              outlined
            >
              <template v-slot:prepend>
                <q-icon name="search" class="search-icon" />
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-wrapper">
        <q-tabs
          v-model="activeTab"
          dense
          class="settings-tabs"
          active-color="primary"
          indicator-color="primary"
          align="left"
        >
          <q-tab name="companies" label="Companies" class="settings-tab" />
          <q-tab name="sites" label="Sites" class="settings-tab" />
          <q-tab name="roles" label="Roles" class="settings-tab" />
          <q-tab name="shifts" label="Shifts" class="settings-tab" />
          <q-tab name="departments" label="Departments" class="settings-tab" />
          <q-tab name="positions" label="Positions" class="settings-tab" />
          <q-tab name="contracts" label="Contracts" class="settings-tab" />
          <q-tab name="payslips" label="Payslips" class="settings-tab" />
        </q-tabs>
      </div>

      <!-- Tab Panels -->
      <q-tab-panels v-model="activeTab" animated class="transparent-panels">
        <!-- ===================== COMPANIES ===================== -->
        <q-tab-panel name="companies" class="q-pa-none">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Companies</h2>
                <p class="table-subtitle">Manage company information and branding</p>
              </div>
              <div class="table-actions">
                <q-btn
                  color="primary"
                  label="Add Company"
                  icon="add"
                  class="add-btn"
                  @click="openCompanyDialog"
                />
              </div>
            </div>

            <div class="modern-table-container">
              <q-table
                :rows="filteredCompanies"
                :columns="companyColumns"
                row-key="id"
                :loading="loadingCompanies"
                flat
                no-data-label="No companies found"
                class="settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">SL No</q-th>
                    <q-th class="table-header-cell">Logo</q-th>
                    <q-th class="table-header-cell">Company Name</q-th>
                    <q-th class="table-header-cell">Address</q-th>
                    <q-th class="table-header-cell">Contact</q-th>
                    <q-th class="table-header-cell">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"
                      >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                    >
                    <q-td class="table-body-cell">
                      <q-avatar size="36px" v-if="props.row.logo">
                        <img :src="props.row.logo" />
                      </q-avatar>
                      <q-avatar v-else size="36px" color="primary" text-color="white">
                        <q-icon name="business" />
                      </q-avatar>
                    </q-td>
                    <q-td class="table-body-cell">
                      <span class="item-name">{{ props.row.name || 'N/A' }}</span>
                    </q-td>
                    <q-td class="table-body-cell">{{ props.row.address || 'N/A' }}</q-td>
                    <q-td class="table-body-cell">{{ props.row.contact || 'N/A' }}</q-td>
                    <q-td class="table-body-cell actions-cell">
                      <div class="action-buttons">
                        <q-btn
                          flat
                          round
                          icon="visibility"
                          size="sm"
                          class="action-btn view-btn"
                          @click="viewCompany(props.row)"
                        >
                          <q-tooltip>View Details</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          icon="edit"
                          size="sm"
                          class="action-btn edit-btn"
                          @click="editCompany(props.row)"
                        >
                          <q-tooltip>Edit Company</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== SITES ===================== -->
        <q-tab-panel name="sites" class="q-pa-none">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Sites</h2>
                <p class="table-subtitle">Manage site locations and configurations</p>
              </div>
              <div class="table-actions">
                <q-btn
                  color="primary"
                  label="Add Site"
                  icon="add"
                  class="add-btn"
                  @click="openSiteDialog"
                />
              </div>
            </div>

            <div class="modern-table-container">
              <q-table
                :rows="filteredSites"
                :columns="siteColumns"
                row-key="id"
                :loading="loadingSites"
                flat
                no-data-label="No sites found"
                class="settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">SL No</q-th>
                    <q-th class="table-header-cell">Site Name</q-th>
                    <q-th class="table-header-cell">Address</q-th>
                    <q-th class="table-header-cell">Ownership</q-th>
                    <q-th class="table-header-cell">Status</q-th>
                    <q-th class="table-header-cell">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"
                      >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                    >
                    <q-td class="table-body-cell">
                      <span class="item-name">{{ props.row.name || 'N/A' }}</span>
                    </q-td>
                    <q-td class="table-body-cell">{{ props.row.address || 'N/A' }}</q-td>
                    <q-td class="table-body-cell">
                      <div
                        :class="[
                          'ownership-badge',
                          props.row.ownership_type === 'owned' ? 'owned-badge' : 'leased-badge',
                        ]"
                      >
                        {{ props.row.ownership_type || 'N/A' }}
                      </div>
                    </q-td>
                    <q-td class="table-body-cell">
                      <div
                        :class="[
                          'status-badge',
                          props.row.is_active ? 'status-active' : 'status-inactive',
                        ]"
                      >
                        {{ props.row.is_active ? 'Active' : 'Inactive' }}
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
                          @click="viewSite(props.row)"
                        >
                          <q-tooltip>View Details</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          icon="edit"
                          size="sm"
                          class="action-btn edit-btn"
                          @click="editSite(props.row)"
                        >
                          <q-tooltip>Edit Site</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== ROLES ===================== -->
        <q-tab-panel name="roles" class="q-pa-none">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Roles</h2>
                <p class="table-subtitle">Manage user roles and permissions across the system</p>
              </div>
              <div class="table-actions">
                <q-btn
                  color="primary"
                  label="Add Role"
                  icon="add"
                  class="add-btn"
                  @click="openRoleDialog"
                />
              </div>
            </div>

            <div class="modern-table-container">
              <q-table
                :rows="filteredRoles"
                :columns="roleColumns"
                row-key="id"
                :loading="loadingRoles"
                flat
                no-data-label="No roles found"
                class="settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">SL No</q-th>
                    <q-th class="table-header-cell">Role Name</q-th>
                    <q-th class="table-header-cell">Permissions</q-th>
                    <q-th class="table-header-cell">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"
                      >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                    >
                    <q-td class="table-body-cell">
                      <span class="item-name">{{ props.row.name || 'N/A' }}</span>
                    </q-td>
                    <q-td class="table-body-cell">
                      <div class="permissions-container">
                        <q-chip
                          v-for="(permission, index) in getActivePermissions(props.row).slice(0, 3)"
                          :key="index"
                          dense
                          size="sm"
                          color="blue-1"
                          text-color="blue-8"
                          :label="permission"
                          class="permission-chip"
                        />
                        <q-chip
                          v-if="getActivePermissions(props.row).length > 3"
                          dense
                          size="sm"
                          color="grey-3"
                          text-color="grey-8"
                          :label="`+${getActivePermissions(props.row).length - 3}`"
                          class="permission-chip"
                        />
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
                          @click="viewRole(props.row)"
                        >
                          <q-tooltip>View Details</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          icon="edit"
                          size="sm"
                          class="action-btn edit-btn"
                          @click="editRole(props.row)"
                        >
                          <q-tooltip>Edit Role</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== SHIFTS ===================== -->
        <q-tab-panel name="shifts" class="q-pa-none">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Shifts</h2>
                <p class="table-subtitle">Manage shift types and schedules</p>
              </div>
              <div class="table-actions">
                <q-btn
                  color="primary"
                  label="Add Shift"
                  icon="add"
                  class="add-btn"
                  @click="openShiftDialog"
                />
              </div>
            </div>

            <div class="modern-table-container">
              <q-table
                :rows="filteredShifts"
                :columns="shiftColumns"
                row-key="id"
                :loading="loadingShifts"
                flat
                no-data-label="No shifts found"
                class="settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">SL No</q-th>
                    <q-th class="table-header-cell">Shift Name</q-th>
                    <q-th class="table-header-cell">Time</q-th>
                    <q-th class="table-header-cell">Type</q-th>
                    <q-th class="table-header-cell">Night Diff</q-th>
                    <q-th class="table-header-cell">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"
                      >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                    >
                    <q-td class="table-body-cell">
                      <span class="item-name">{{ props.row.name || 'N/A' }}</span>
                    </q-td>
                    <q-td class="table-body-cell">
                      {{ formatTime(props.row.default_start_time) }} –
                      {{ formatTime(props.row.default_end_time) }}
                    </q-td>
                    <q-td class="table-body-cell">
                      <div
                        :class="[
                          'status-badge',
                          props.row.is_graveyard ? 'status-graveyard' : 'status-regular',
                        ]"
                      >
                        {{ props.row.is_graveyard ? 'Graveyard' : 'Regular' }}
                      </div>
                    </q-td>
                    <q-td class="table-body-cell">
                      <q-icon
                        :name="props.row.apply_night_differential ? 'check_circle' : 'cancel'"
                        :color="props.row.apply_night_differential ? 'positive' : 'grey'"
                        size="20px"
                      />
                    </q-td>
                    <q-td class="table-body-cell actions-cell">
                      <div class="action-buttons">
                        <q-btn
                          flat
                          round
                          icon="visibility"
                          size="sm"
                          class="action-btn view-btn"
                          @click="viewShift(props.row)"
                        >
                          <q-tooltip>View Details</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          icon="edit"
                          size="sm"
                          class="action-btn edit-btn"
                          @click="editShift(props.row)"
                        >
                          <q-tooltip>Edit Shift</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== DEPARTMENTS ===================== -->
        <q-tab-panel name="departments" class="q-pa-none">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Departments</h2>
                <p class="table-subtitle">Manage organizational departments</p>
              </div>
              <div class="table-actions">
                <q-btn
                  color="primary"
                  label="Add Department"
                  icon="add"
                  class="add-btn"
                  @click="openDepartmentDialog"
                />
              </div>
            </div>

            <div class="modern-table-container">
              <q-table
                :rows="filteredDepartments"
                :columns="departmentColumns"
                row-key="id"
                :loading="loadingDepartments"
                flat
                no-data-label="No departments found"
                class="settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">SL No</q-th>
                    <q-th class="table-header-cell">Department Name</q-th>
                    <q-th class="table-header-cell">Description</q-th>
                    <q-th class="table-header-cell">Date Created</q-th>
                    <q-th class="table-header-cell">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"
                      >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                    >
                    <q-td class="table-body-cell">
                      <span class="item-name">{{ props.row.name || 'N/A' }}</span>
                    </q-td>
                    <q-td class="table-body-cell">{{ props.row.description || 'N/A' }}</q-td>
                    <q-td class="table-body-cell">{{ formatDate(props.row.date_created) }}</q-td>
                    <q-td class="table-body-cell actions-cell">
                      <div class="action-buttons">
                        <q-btn
                          flat
                          round
                          icon="visibility"
                          size="sm"
                          class="action-btn view-btn"
                          @click="viewDepartment(props.row)"
                        >
                          <q-tooltip>View Details</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          icon="edit"
                          size="sm"
                          class="action-btn edit-btn"
                          @click="editDepartment(props.row)"
                        >
                          <q-tooltip>Edit Department</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== POSITIONS ===================== -->
        <q-tab-panel name="positions" class="q-pa-none">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Positions</h2>
                <p class="table-subtitle">Manage job positions and department structures</p>
              </div>
              <div class="table-actions">
                <q-btn
                  color="primary"
                  label="Add Position"
                  icon="add"
                  class="add-btn"
                  @click="openPositionDialog"
                />
              </div>
            </div>

            <div class="modern-table-container">
              <q-table
                :rows="filteredPositions"
                :columns="positionColumns"
                row-key="id"
                :loading="loadingPositions"
                flat
                no-data-label="No positions found"
                class="settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">SL No</q-th>
                    <q-th class="table-header-cell">Position Title</q-th>
                    <q-th class="table-header-cell">Department</q-th>
                    <q-th class="table-header-cell">Description</q-th>
                    <q-th class="table-header-cell">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"
                      >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                    >
                    <q-td class="table-body-cell">
                      <span class="item-name">{{
                        props.row.title || props.row.name || 'N/A'
                      }}</span>
                    </q-td>
                    <q-td class="table-body-cell">{{ props.row.department_name || 'N/A' }}</q-td>
                    <q-td class="table-body-cell">{{ props.row.description || 'N/A' }}</q-td>
                    <q-td class="table-body-cell actions-cell">
                      <div class="action-buttons">
                        <q-btn
                          flat
                          round
                          icon="visibility"
                          size="sm"
                          class="action-btn view-btn"
                          @click="viewPosition(props.row)"
                        >
                          <q-tooltip>View Details</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          icon="edit"
                          size="sm"
                          class="action-btn edit-btn"
                          @click="editPosition(props.row)"
                        >
                          <q-tooltip>Edit Position</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== CONTRACTS ===================== -->
        <q-tab-panel name="contracts" class="q-pa-none">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Employee Contracts</h2>
                <p class="table-subtitle">Manage employee contracts and assignments</p>
              </div>
              <div class="table-actions">
                <q-btn
                  color="primary"
                  label="Create Contract"
                  icon="add"
                  class="add-btn"
                  @click="openContractDialog"
                />
              </div>
            </div>

            <div class="modern-table-container">
              <q-table
                :rows="filteredContracts"
                :columns="contractColumns"
                row-key="id"
                :loading="loadingContracts"
                flat
                no-data-label="No contracts found"
                class="settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">SL No</q-th>
                    <q-th class="table-header-cell">Employee</q-th>
                    <q-th class="table-header-cell">Contract Type</q-th>
                    <q-th class="table-header-cell">Status</q-th>
                    <q-th class="table-header-cell">Date Created</q-th>
                    <q-th class="table-header-cell">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell"
                      >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                    >
                    <q-td class="table-body-cell">
                      <span class="item-name">{{ props.row.employee_name || 'N/A' }}</span>
                    </q-td>
                    <q-td class="table-body-cell">
                      <div class="ownership-badge owned-badge">
                        {{ props.row.contract_type_name || 'N/A' }}
                      </div>
                    </q-td>
                    <q-td class="table-body-cell">
                      <div
                        :class="[
                          'status-badge',
                          props.row.is_acknowledged ? 'status-active' : 'status-pending',
                        ]"
                      >
                        {{ props.row.is_acknowledged ? 'Acknowledged' : 'Pending' }}
                      </div>
                    </q-td>
                    <q-td class="table-body-cell">{{ formatDate(props.row.date_created) }}</q-td>
                    <q-td class="table-body-cell actions-cell">
                      <div class="action-buttons">
                        <q-btn
                          flat
                          round
                          icon="visibility"
                          size="sm"
                          class="action-btn view-btn"
                          @click="viewContract(props.row)"
                        >
                          <q-tooltip>View Details</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          icon="edit"
                          size="sm"
                          class="action-btn edit-btn"
                          @click="editContract(props.row)"
                        >
                          <q-tooltip>Edit Contract</q-tooltip>
                        </q-btn>
                        <q-btn
                          v-if="props.row.pdf_url"
                          flat
                          round
                          icon="picture_as_pdf"
                          size="sm"
                          class="action-btn pdf-btn"
                          @click="viewContractPDF(props.row)"
                        >
                          <q-tooltip>View PDF</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== PAYSLIPS ===================== -->
        <q-tab-panel name="payslips" class="q-pa-none">
          <!-- Payslip Sub-tabs -->
          <div class="subtabs-wrapper">
            <q-tabs
              v-model="payslipSubTab"
              dense
              class="settings-tabs"
              active-color="primary"
              indicator-color="primary"
              align="left"
            >
              <q-tab name="allowance-types" label="Allowance Types" class="settings-tab" />
              <q-tab name="tax-brackets" label="Tax Brackets" class="settings-tab" />
              <q-tab name="cutoff-periods" label="Cutoff Periods" class="settings-tab" />
              <q-tab name="payroll-groups" label="Payroll Groups" class="settings-tab" />
              <q-tab name="labor-rules" label="Labor Rules" class="settings-tab" />
              <q-tab name="pay-structures" label="Pay Structures" class="settings-tab" />
            </q-tabs>
          </div>

          <q-tab-panels v-model="payslipSubTab" animated class="transparent-panels">
            <!-- Allowance Types -->
            <q-tab-panel name="allowance-types" class="q-pa-none">
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title-section">
                    <h2 class="table-title">Allowance Types</h2>
                    <p class="table-subtitle">Manage employee allowance types</p>
                  </div>
                  <div class="table-actions">
                    <q-btn
                      color="primary"
                      label="Add Allowance Type"
                      icon="add"
                      class="add-btn"
                      @click="openAllowanceTypeDialog"
                    />
                  </div>
                </div>
                <div class="modern-table-container">
                  <q-table
                    :rows="allowanceTypes"
                    :columns="allowanceTypeColumns"
                    row-key="id"
                    :loading="loadingAllowanceTypes"
                    flat
                    no-data-label="No allowance types found"
                    class="settings-table"
                    hide-pagination
                    :rows-per-page-options="[0]"
                  >
                    <template v-slot:header>
                      <q-tr class="table-header-row">
                        <q-th class="table-header-cell">SL No</q-th>
                        <q-th class="table-header-cell">Name</q-th>
                        <q-th class="table-header-cell">Description</q-th>
                        <q-th class="table-header-cell">Actions</q-th>
                      </q-tr>
                    </template>
                    <template v-slot:body="props">
                      <q-tr class="table-body-row">
                        <q-td class="table-body-cell"
                          >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                        >
                        <q-td class="table-body-cell"
                          ><span class="item-name">{{ props.row.name || 'N/A' }}</span></q-td
                        >
                        <q-td class="table-body-cell">{{ props.row.description || 'N/A' }}</q-td>
                        <q-td class="table-body-cell actions-cell">
                          <div class="action-buttons">
                            <q-btn
                              flat
                              round
                              icon="visibility"
                              size="sm"
                              class="action-btn view-btn"
                              @click="viewAllowanceType(props.row)"
                              ><q-tooltip>View</q-tooltip></q-btn
                            >
                            <q-btn
                              flat
                              round
                              icon="edit"
                              size="sm"
                              class="action-btn edit-btn"
                              @click="editAllowanceType(props.row)"
                              ><q-tooltip>Edit</q-tooltip></q-btn
                            >
                          </div>
                        </q-td>
                      </q-tr>
                    </template>
                  </q-table>
                </div>
              </div>
            </q-tab-panel>

            <!-- Tax Brackets -->
            <q-tab-panel name="tax-brackets" class="q-pa-none">
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title-section">
                    <h2 class="table-title">Tax Brackets</h2>
                    <p class="table-subtitle">Configure tax brackets and rates</p>
                  </div>
                  <div class="table-actions">
                    <q-btn
                      color="primary"
                      label="Add Tax Bracket"
                      icon="add"
                      class="add-btn"
                      @click="openTaxBracketDialog"
                    />
                  </div>
                </div>
                <div class="modern-table-container">
                  <q-table
                    :rows="taxBrackets"
                    :columns="taxBracketColumns"
                    row-key="id"
                    :loading="loadingTaxBrackets"
                    flat
                    no-data-label="No tax brackets found"
                    class="settings-table"
                    hide-pagination
                    :rows-per-page-options="[0]"
                  >
                    <template v-slot:header>
                      <q-tr class="table-header-row">
                        <q-th class="table-header-cell">SL No</q-th>
                        <q-th class="table-header-cell">Min Income</q-th>
                        <q-th class="table-header-cell">Max Income</q-th>
                        <q-th class="table-header-cell">Rate</q-th>
                        <q-th class="table-header-cell">Actions</q-th>
                      </q-tr>
                    </template>
                    <template v-slot:body="props">
                      <q-tr class="table-body-row">
                        <q-td class="table-body-cell"
                          >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                        >
                        <q-td class="table-body-cell">{{ props.row.min_income || 'N/A' }}</q-td>
                        <q-td class="table-body-cell">{{ props.row.max_income || 'N/A' }}</q-td>
                        <q-td class="table-body-cell"
                          ><span class="item-name">{{ props.row.rate || 'N/A' }}</span></q-td
                        >
                        <q-td class="table-body-cell actions-cell">
                          <div class="action-buttons">
                            <q-btn
                              flat
                              round
                              icon="visibility"
                              size="sm"
                              class="action-btn view-btn"
                              @click="viewTaxBracket(props.row)"
                              ><q-tooltip>View</q-tooltip></q-btn
                            >
                            <q-btn
                              flat
                              round
                              icon="edit"
                              size="sm"
                              class="action-btn edit-btn"
                              @click="editTaxBracket(props.row)"
                              ><q-tooltip>Edit</q-tooltip></q-btn
                            >
                          </div>
                        </q-td>
                      </q-tr>
                    </template>
                  </q-table>
                </div>
              </div>
            </q-tab-panel>

            <!-- Cutoff Periods -->
            <q-tab-panel name="cutoff-periods" class="q-pa-none">
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title-section">
                    <h2 class="table-title">Cutoff Periods</h2>
                    <p class="table-subtitle">Manage payroll cutoff periods</p>
                  </div>
                  <div class="table-actions">
                    <q-btn
                      color="primary"
                      label="Add Cutoff Period"
                      icon="add"
                      class="add-btn"
                      @click="openCutoffPeriodDialog"
                    />
                  </div>
                </div>
                <div class="modern-table-container">
                  <q-table
                    :rows="cutoffPeriods"
                    :columns="cutoffPeriodColumns"
                    row-key="id"
                    :loading="loadingCutoffPeriods"
                    flat
                    no-data-label="No cutoff periods found"
                    class="settings-table"
                    hide-pagination
                    :rows-per-page-options="[0]"
                  >
                    <template v-slot:header>
                      <q-tr class="table-header-row">
                        <q-th class="table-header-cell">SL No</q-th>
                        <q-th class="table-header-cell">Name</q-th>
                        <q-th class="table-header-cell">Start Date</q-th>
                        <q-th class="table-header-cell">End Date</q-th>
                        <q-th class="table-header-cell">Actions</q-th>
                      </q-tr>
                    </template>
                    <template v-slot:body="props">
                      <q-tr class="table-body-row">
                        <q-td class="table-body-cell"
                          >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                        >
                        <q-td class="table-body-cell"
                          ><span class="item-name">{{ props.row.name || 'N/A' }}</span></q-td
                        >
                        <q-td class="table-body-cell">{{ formatDate(props.row.start_date) }}</q-td>
                        <q-td class="table-body-cell">{{ formatDate(props.row.end_date) }}</q-td>
                        <q-td class="table-body-cell actions-cell">
                          <div class="action-buttons">
                            <q-btn
                              flat
                              round
                              icon="visibility"
                              size="sm"
                              class="action-btn view-btn"
                              @click="viewCutoffPeriod(props.row)"
                              ><q-tooltip>View</q-tooltip></q-btn
                            >
                            <q-btn
                              flat
                              round
                              icon="edit"
                              size="sm"
                              class="action-btn edit-btn"
                              @click="editCutoffPeriod(props.row)"
                              ><q-tooltip>Edit</q-tooltip></q-btn
                            >
                          </div>
                        </q-td>
                      </q-tr>
                    </template>
                  </q-table>
                </div>
              </div>
            </q-tab-panel>

            <!-- Payroll Groups -->
            <q-tab-panel name="payroll-groups" class="q-pa-none">
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title-section">
                    <h2 class="table-title">Payroll Groups</h2>
                    <p class="table-subtitle">Manage payroll groups and assignments</p>
                  </div>
                  <div class="table-actions">
                    <q-btn
                      color="primary"
                      label="Add Payroll Group"
                      icon="add"
                      class="add-btn"
                      @click="openPayrollGroupDialog"
                    />
                  </div>
                </div>
                <div class="modern-table-container">
                  <q-table
                    :rows="payrollGroups"
                    :columns="payrollGroupColumns"
                    row-key="id"
                    :loading="loadingPayrollGroups"
                    flat
                    no-data-label="No payroll groups found"
                    class="settings-table"
                    hide-pagination
                    :rows-per-page-options="[0]"
                  >
                    <template v-slot:header>
                      <q-tr class="table-header-row">
                        <q-th class="table-header-cell">SL No</q-th>
                        <q-th class="table-header-cell">Group Name</q-th>
                        <q-th class="table-header-cell">Description</q-th>
                        <q-th class="table-header-cell">Actions</q-th>
                      </q-tr>
                    </template>
                    <template v-slot:body="props">
                      <q-tr class="table-body-row">
                        <q-td class="table-body-cell"
                          >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                        >
                        <q-td class="table-body-cell"
                          ><span class="item-name">{{ props.row.name || 'N/A' }}</span></q-td
                        >
                        <q-td class="table-body-cell">{{ props.row.description || 'N/A' }}</q-td>
                        <q-td class="table-body-cell actions-cell">
                          <div class="action-buttons">
                            <q-btn
                              flat
                              round
                              icon="visibility"
                              size="sm"
                              class="action-btn view-btn"
                              @click="viewPayrollGroup(props.row)"
                              ><q-tooltip>View</q-tooltip></q-btn
                            >
                            <q-btn
                              flat
                              round
                              icon="edit"
                              size="sm"
                              class="action-btn edit-btn"
                              @click="editPayrollGroup(props.row)"
                              ><q-tooltip>Edit</q-tooltip></q-btn
                            >
                          </div>
                        </q-td>
                      </q-tr>
                    </template>
                  </q-table>
                </div>
              </div>
            </q-tab-panel>

            <!-- Labor Rules -->
            <q-tab-panel name="labor-rules" class="q-pa-none">
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title-section">
                    <h2 class="table-title">Labor Rules</h2>
                    <p class="table-subtitle">Configure labor regulations and overtime rules</p>
                  </div>
                  <div class="table-actions">
                    <q-btn
                      color="primary"
                      label="Add Labor Rule"
                      icon="add"
                      class="add-btn"
                      @click="openLaborRuleDialog"
                    />
                  </div>
                </div>
                <div class="modern-table-container">
                  <q-table
                    :rows="laborRules"
                    :columns="laborRuleColumns"
                    row-key="id"
                    :loading="loadingLaborRules"
                    flat
                    no-data-label="No labor rules found"
                    class="settings-table"
                    hide-pagination
                    :rows-per-page-options="[0]"
                  >
                    <template v-slot:header>
                      <q-tr class="table-header-row">
                        <q-th class="table-header-cell">SL No</q-th>
                        <q-th class="table-header-cell">Rule Name</q-th>
                        <q-th class="table-header-cell">Description</q-th>
                        <q-th class="table-header-cell">Actions</q-th>
                      </q-tr>
                    </template>
                    <template v-slot:body="props">
                      <q-tr class="table-body-row">
                        <q-td class="table-body-cell"
                          >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                        >
                        <q-td class="table-body-cell"
                          ><span class="item-name">{{ props.row.name || 'N/A' }}</span></q-td
                        >
                        <q-td class="table-body-cell">{{ props.row.description || 'N/A' }}</q-td>
                        <q-td class="table-body-cell actions-cell">
                          <div class="action-buttons">
                            <q-btn
                              flat
                              round
                              icon="visibility"
                              size="sm"
                              class="action-btn view-btn"
                              @click="viewLaborRule(props.row)"
                              ><q-tooltip>View</q-tooltip></q-btn
                            >
                            <q-btn
                              flat
                              round
                              icon="edit"
                              size="sm"
                              class="action-btn edit-btn"
                              @click="editLaborRule(props.row)"
                              ><q-tooltip>Edit</q-tooltip></q-btn
                            >
                          </div>
                        </q-td>
                      </q-tr>
                    </template>
                  </q-table>
                </div>
              </div>
            </q-tab-panel>

            <!-- Pay Structures -->
            <q-tab-panel name="pay-structures" class="q-pa-none">
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title-section">
                    <h2 class="table-title">Pay Structures</h2>
                    <p class="table-subtitle">Define compensation structures and salary grades</p>
                  </div>
                  <div class="table-actions">
                    <q-btn
                      color="primary"
                      label="Add Pay Structure"
                      icon="add"
                      class="add-btn"
                      @click="openPayStructureDialog"
                    />
                  </div>
                </div>
                <div class="modern-table-container">
                  <q-table
                    :rows="payStructures"
                    :columns="payStructureColumns"
                    row-key="id"
                    :loading="loadingPayStructures"
                    flat
                    no-data-label="No pay structures found"
                    class="settings-table"
                    hide-pagination
                    :rows-per-page-options="[0]"
                  >
                    <template v-slot:header>
                      <q-tr class="table-header-row">
                        <q-th class="table-header-cell">SL No</q-th>
                        <q-th class="table-header-cell">Structure Name</q-th>
                        <q-th class="table-header-cell">Base Pay</q-th>
                        <q-th class="table-header-cell">Actions</q-th>
                      </q-tr>
                    </template>
                    <template v-slot:body="props">
                      <q-tr class="table-body-row">
                        <q-td class="table-body-cell"
                          >{{ String(props.rowIndex + 1).padStart(2, '0') }}.</q-td
                        >
                        <q-td class="table-body-cell"
                          ><span class="item-name">{{ props.row.name || 'N/A' }}</span></q-td
                        >
                        <q-td class="table-body-cell">{{ props.row.base_pay || 'N/A' }}</q-td>
                        <q-td class="table-body-cell actions-cell">
                          <div class="action-buttons">
                            <q-btn
                              flat
                              round
                              icon="visibility"
                              size="sm"
                              class="action-btn view-btn"
                              @click="viewPayStructure(props.row)"
                              ><q-tooltip>View</q-tooltip></q-btn
                            >
                            <q-btn
                              flat
                              round
                              icon="edit"
                              size="sm"
                              class="action-btn edit-btn"
                              @click="editPayStructure(props.row)"
                              ><q-tooltip>Edit</q-tooltip></q-btn
                            >
                          </div>
                        </q-td>
                      </q-tr>
                    </template>
                  </q-table>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- ===================== COMPANY DIALOG ===================== -->
    <q-dialog v-model="companyDialog" persistent>
      <q-card style="min-width: 460px; max-width: 520px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingCompany ? 'Edit Company' : 'Add Company' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md q-gutter-md">
          <q-input v-model="companyForm.name" label="Company Name *" outlined dense />
          <q-input v-model="companyForm.address" label="Address" outlined dense />
          <q-input v-model="companyForm.contact" label="Contact" outlined dense />

          <!-- Logo Section -->
          <div>
            <div class="text-subtitle2 q-mb-sm">Logo</div>

            <!-- Toggle between URL and File -->
            <q-btn-toggle
              v-model="logoUploadMethod"
              spread
              no-caps
              dense
              unelevated
              toggle-color="primary"
              color="grey-3"
              text-color="grey-8"
              toggle-text-color="white"
              :options="[
                { label: 'Upload File', value: 'file' },
                { label: 'Paste URL', value: 'url' },
              ]"
              class="q-mb-md"
            />

            <!-- File Upload -->
            <div v-if="logoUploadMethod === 'file'">
              <q-file
                v-model="logoFile"
                label="Choose logo image"
                outlined
                dense
                accept=".jpg,.jpeg,.png,.svg,.webp"
                max-file-size="2097152"
                @update:model-value="onLogoFileSelected"
                @rejected="onFileRejected"
              >
                <template v-slot:prepend>
                  <q-icon name="attach_file" />
                </template>
                <template v-slot:append v-if="logoFile">
                  <q-icon name="close" class="cursor-pointer" @click.stop="clearLogoFile" />
                </template>
              </q-file>
              <div class="text-caption text-grey q-mt-xs">Max 2MB · JPG, PNG, SVG, WEBP</div>
            </div>

            <!-- URL Input -->
            <div v-if="logoUploadMethod === 'url'">
              <q-input
                v-model="companyForm.logo"
                label="Logo URL"
                outlined
                dense
                placeholder="https://example.com/logo.png"
                @update:model-value="logoPreview = companyForm.logo || null"
              >
                <template v-slot:prepend>
                  <q-icon name="link" />
                </template>
                <template v-slot:append v-if="companyForm.logo">
                  <q-icon name="close" class="cursor-pointer" @click="clearLogoUrl" />
                </template>
              </q-input>
            </div>

            <!-- Preview -->
            <div v-if="logoPreview" class="q-mt-md flex items-center q-gutter-sm">
              <div class="text-caption text-grey">Preview:</div>
              <q-avatar
                size="56px"
                square
                style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden"
              >
                <img :src="logoPreview" @error="handleImageError" style="object-fit: contain" />
              </q-avatar>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pt-none">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingCompany ? 'Update Company' : 'Save Company'"
            :loading="savingCompany"
            @click="saveCompany"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== SITE DIALOG ===================== -->
    <q-dialog v-model="siteDialog" persistent>
      <q-card style="min-width: 480px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingSite ? 'Edit Site' : 'Add Site' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input v-model="siteForm.name" label="Site Name *" outlined dense class="q-mb-md" />
          <q-input
            v-model="siteForm.location"
            label="Location / Address *"
            outlined
            dense
            class="q-mb-md"
          />
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6">
              <q-input v-model="siteForm.latitude" label="Latitude *" outlined dense />
            </div>
            <div class="col-6">
              <q-input v-model="siteForm.longitude" label="Longitude *" outlined dense />
            </div>
          </div>
          <q-input
            v-model.number="siteForm.radius_meters"
            label="Radius (meters)"
            type="number"
            outlined
            dense
            class="q-mb-md"
          />
          <q-select
            v-model="siteForm.ownership_type"
            :options="ownershipOptions"
            label="Ownership Type"
            outlined
            dense
            class="q-mb-md"
          />
          <q-toggle v-model="siteForm.is_active" label="Active" class="q-mb-sm" />
          <q-toggle v-model="siteForm.requires_otp" label="Requires OTP" class="q-mb-sm" />
          <q-toggle
            v-model="siteForm.allow_manual_attendance"
            label="Allow Manual Attendance"
            class="q-mb-sm"
          />
          <q-toggle
            v-model="siteForm.allow_service_charge"
            label="Allow Service Charge"
            class="q-mb-sm"
          />
          <q-toggle v-model="siteForm.multiply_nd_by_holiday" label="Multiply ND by Holiday" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingSite ? 'Update' : 'Save'"
            :loading="savingSite"
            @click="saveSite"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== ROLE DIALOG ===================== -->
    <q-dialog v-model="roleDialog" persistent>
      <q-card style="min-width: 500px; max-width: 560px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingRole ? 'Edit Role' : 'Add Role' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input v-model="roleForm.name" label="Role Name *" outlined dense class="q-mb-lg" />

          <div class="text-subtitle2 q-mb-xs">
            Permissions
            <span class="text-caption text-grey q-ml-sm"
              >({{ roleForm.permissions.length }} selected)</span
            >
          </div>
          <q-separator class="q-mb-md" />

          <div class="row">
            <div v-for="perm in availablePermissions" :key="perm" class="col-6 q-mb-sm">
              <q-checkbox
                :model-value="roleForm.permissions.includes(perm)"
                :label="perm"
                dense
                @update:model-value="(val) => togglePermission(perm, val)"
              />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingRole ? 'Update Role' : 'Save Role'"
            :loading="savingRole"
            @click="saveRole"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== SHIFT DIALOG ===================== -->
    <q-dialog v-model="shiftDialog" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingShift ? 'Edit Shift' : 'Add Shift' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input v-model="shiftForm.name" label="Shift Name *" outlined dense class="q-mb-md" />
          <q-input
            v-model="shiftForm.description"
            label="Description"
            outlined
            dense
            class="q-mb-md"
          />
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6">
              <q-input
                v-model="shiftForm.default_start_time"
                label="Start Time *"
                type="time"
                outlined
                dense
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="shiftForm.default_end_time"
                label="End Time *"
                type="time"
                outlined
                dense
              />
            </div>
          </div>
          <q-toggle v-model="shiftForm.is_graveyard" label="Graveyard Shift" class="q-mb-sm" />
          <q-toggle v-model="shiftForm.apply_night_differential" label="Apply Night Differential" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingShift ? 'Update' : 'Save'"
            :loading="savingShift"
            @click="saveShift"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== DEPARTMENT DIALOG ===================== -->
    <q-dialog v-model="departmentDialog" persistent>
      <q-card style="min-width: 380px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingDepartment ? 'Edit Department' : 'Add Department' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input v-model="departmentForm.name" label="Department Name *" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingDepartment ? 'Update' : 'Save'"
            :loading="savingDepartment"
            @click="saveDepartment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== POSITION DIALOG ===================== -->
    <q-dialog v-model="positionDialog" persistent>
      <q-card style="min-width: 380px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingPosition ? 'Edit Position' : 'Add Position' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input
            v-model="positionForm.name"
            label="Position Name *"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="positionForm.description"
            label="Description"
            outlined
            dense
            type="textarea"
            rows="3"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingPosition ? 'Update' : 'Save'"
            :loading="savingPosition"
            @click="savePosition"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== CONTRACT DIALOG ===================== -->
    <q-dialog v-model="contractDialog" persistent>
      <q-card style="min-width: 520px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingContract ? 'Edit Contract' : 'Add Contract' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-select
            v-model="contractForm.employee_id"
            :options="employees.map((e) => ({ label: e.full_name || e.name, value: e.id }))"
            label="Employee *"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-md"
          />
          <q-select
            v-model="contractForm.contract_type_id"
            :options="contractTypes.map((c) => ({ label: c.name, value: c.id }))"
            label="Contract Type *"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-md"
          />
          <q-select
            v-model="contractForm.pay_structure.position_id"
            :options="positions.map((p) => ({ label: p.name, value: p.id }))"
            label="Position *"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-md"
          />
          <q-select
            v-model="contractForm.site_id"
            :options="sites.map((s) => ({ label: s.name, value: s.id }))"
            label="Site"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-md"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingContract ? 'Update' : 'Save'"
            :loading="savingContract"
            @click="saveContract"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== CONTRACT VIEW DIALOG ===================== -->
    <q-dialog v-model="contractViewDialog">
      <q-card style="min-width: 480px" v-if="selectedContract">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Contract Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-list>
            <q-item
              ><q-item-section
                ><q-item-label caption>Employee</q-item-label
                ><q-item-label>{{
                  selectedContract.employee_name || 'N/A'
                }}</q-item-label></q-item-section
              ></q-item
            >
            <q-item
              ><q-item-section
                ><q-item-label caption>Contract Type</q-item-label
                ><q-item-label>{{
                  selectedContract.contract_type_name || 'N/A'
                }}</q-item-label></q-item-section
              ></q-item
            >
            <q-item
              ><q-item-section
                ><q-item-label caption>Company</q-item-label
                ><q-item-label>{{
                  selectedContract.company_name || 'N/A'
                }}</q-item-label></q-item-section
              ></q-item
            >
            <q-item
              ><q-item-section
                ><q-item-label caption>Status</q-item-label
                ><q-item-label>{{
                  selectedContract.is_acknowledged ? 'Acknowledged' : 'Pending'
                }}</q-item-label></q-item-section
              ></q-item
            >
            <q-item
              ><q-item-section
                ><q-item-label caption>Date Created</q-item-label
                ><q-item-label>{{
                  formatDate(selectedContract.date_created)
                }}</q-item-label></q-item-section
              ></q-item
            >
          </q-list>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== ALLOWANCE TYPE DIALOG ===================== -->
    <q-dialog v-model="allowanceTypeDialog" persistent>
      <q-card style="min-width: 380px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{ editingAllowanceType ? 'Edit Allowance Type' : 'Add Allowance Type' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input v-model="allowanceTypeForm.name" label="Name *" outlined dense class="q-mb-md" />
          <q-input v-model="allowanceTypeForm.description" label="Description" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingAllowanceType ? 'Update' : 'Save'"
            :loading="savingAllowanceType"
            @click="saveAllowanceType"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== TAX BRACKET DIALOG ===================== -->
    <q-dialog v-model="taxBracketDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{ editingTaxBracket ? 'Edit Tax Bracket' : 'Add Tax Bracket' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input
            v-model="taxBracketForm.name"
            label="Bracket Name *"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model.number="taxBracketForm.min_amount"
            label="Min Income"
            type="number"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model.number="taxBracketForm.max_amount"
            label="Max Income"
            type="number"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model.number="taxBracketForm.rate"
            label="Rate (%)"
            type="number"
            step="0.01"
            outlined
            dense
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingTaxBracket ? 'Update' : 'Save'"
            :loading="savingTaxBracket"
            @click="saveTaxBracket"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== CUTOFF PERIOD DIALOG ===================== -->
    <q-dialog v-model="cutoffPeriodDialog" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{ editingCutoffPeriod ? 'Edit Cutoff Period' : 'Add Cutoff Period' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input
            v-model="cutoffPeriodForm.name"
            label="Period Name *"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="cutoffPeriodForm.start_date"
            label="Start Date *"
            type="date"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="cutoffPeriodForm.end_date"
            label="End Date *"
            type="date"
            outlined
            dense
            class="q-mb-md"
          />
          <q-toggle v-model="cutoffPeriodForm.is_active" label="Active" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingCutoffPeriod ? 'Update' : 'Save'"
            :loading="savingCutoffPeriod"
            @click="saveCutoffPeriod"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== PAYROLL GROUP DIALOG ===================== -->
    <q-dialog v-model="payrollGroupDialog" persistent>
      <q-card style="min-width: 380px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{ editingPayrollGroup ? 'Edit Payroll Group' : 'Add Payroll Group' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input
            v-model="payrollGroupForm.name"
            label="Group Name *"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="payrollGroupForm.description"
            label="Description"
            outlined
            dense
            type="textarea"
            rows="3"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingPayrollGroup ? 'Update' : 'Save'"
            :loading="savingPayrollGroup"
            @click="savePayrollGroup"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== LABOR RULE DIALOG ===================== -->
    <q-dialog v-model="laborRuleDialog" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingLaborRule ? 'Edit Labor Rule' : 'Add Labor Rule' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-input
            v-model="laborRuleForm.name"
            label="Rule Name *"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="laborRuleForm.description"
            label="Description"
            outlined
            dense
            class="q-mb-md"
            type="textarea"
            rows="3"
          />
          <q-input
            v-model.number="laborRuleForm.multiplier"
            label="Multiplier"
            type="number"
            step="0.01"
            outlined
            dense
            class="q-mb-md"
          />
          <q-toggle v-model="laborRuleForm.is_active" label="Active" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingLaborRule ? 'Update' : 'Save'"
            :loading="savingLaborRule"
            @click="saveLaborRule"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== PAY STRUCTURE DIALOG ===================== -->
    <q-dialog v-model="payStructureDialog" persistent>
      <q-card style="min-width: 440px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{ editingPayStructure ? 'Edit Pay Structure' : 'Add Pay Structure' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-select
            v-model="payStructureForm.position"
            :options="positions.map((p) => ({ label: p.name, value: p.id }))"
            label="Position *"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-md"
          />
          <q-select
            v-model="payStructureForm.pay_type"
            :options="payTypeOptions"
            label="Pay Type *"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model.number="payStructureForm.rate"
            label="Rate *"
            type="number"
            step="0.01"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="payStructureForm.currency"
            label="Currency"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="payStructureForm.effective_from"
            label="Effective From *"
            type="date"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="payStructureForm.effective_to"
            label="Effective To"
            type="date"
            outlined
            dense
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="editingPayStructure ? 'Update' : 'Save'"
            :loading="savingPayStructure"
            @click="savePayStructure"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { api } from 'src/boot/axios'

export default {
  name: 'AdminSettingsPage',
  data() {
    return {
      activeTab: 'companies',
      searchQuery: '',

      // Companies
      companies: [],
      loadingCompanies: false,
      companyDialog: false,
      editingCompany: false,
      savingCompany: false,
      companyForm: {
        id: null,
        name: '',
        logo: '',
      },
      companyColumns: [
        { name: 'name', label: 'Company Name', field: 'name', align: 'left', sortable: true },
        { name: 'logo', label: 'Logo', field: 'logo', align: 'center' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],
      logoUploadMethod: 'url',
      logoFile: null,
      logoPreview: null,

      // Sites
      sites: [],
      loadingSites: false,
      siteDialog: false,
      editingSite: false,
      savingSite: false,
      siteForm: {
        id: null,
        name: '',
        location: '',
        latitude: '',
        longitude: '',
        radius_meters: 100,
        ownership_type: 'owned',
        is_active: true,
        company: null,
      },
      siteColumns: [
        { name: 'name', label: 'Site Name', field: 'name', align: 'left', sortable: true },
        { name: 'location', label: 'Location', field: 'location', align: 'left' },
        { name: 'ownership_type', label: 'Ownership', field: 'ownership_type', align: 'left' },
        { name: 'is_active', label: 'Status', field: 'is_active', align: 'center' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],

      // Departments
      ownershipOptions: ['owned', 'leased', 'partnership'],
      departments: [],
      loadingDepartments: false,
      departmentDialog: false,
      editingDepartment: false,
      savingDepartment: false,
      departmentForm: {
        id: null,
        name: '',
        company: null,
      },
      departmentColumns: [
        { name: 'name', label: 'Department Name', field: 'name', align: 'left', sortable: true },
        { name: 'date_created', label: 'Date Created', field: 'date_created', align: 'left' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],
      // Roles
      roles: [],
      loadingRoles: false,
      roleDialog: false,
      editingRole: false,
      savingRole: false,
      roleForm: {
        id: null,
        name: '',
        permissions: [],
      },
      roleColumns: [
        { name: 'name', label: 'Role Name', field: 'name', align: 'left', sortable: true },
        { name: 'permissions', label: 'Permissions', field: 'permissions', align: 'left' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],
      availablePermissions: [
        'View Dashboard',
        'Manage Employees',
        'View Attendance',
        'Edit Attendance',
        'View Payroll',
        'Release Payroll',
        'Approve Requests',
        'Manage Schedules',
        'Admin Settings',
        'Web Admin',
        'View Salary',
      ],
      // Shifts
      shifts: [],
      loadingShifts: false,
      shiftDialog: false,
      editingShift: false,
      savingShift: false,
      shiftForm: {
        id: null,
        name: '',
        company: null,
        description: '',
        default_start_time: '',
        default_end_time: '',
        is_graveyard: false,
        apply_night_differential: false,
      },
      shiftColumns: [
        { name: 'name', label: 'Shift Name', field: 'name', align: 'left', sortable: true },
        { name: 'description', label: 'Description', field: 'description', align: 'left' },
        { name: 'times', label: 'Time', align: 'left' },
        { name: 'is_graveyard', label: 'Type', field: 'is_graveyard', align: 'center' },
        {
          name: 'apply_night_differential',
          label: 'Night Diff',
          field: 'apply_night_differential',
          align: 'center',
        },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],
      // Positions
      positions: [],
      loadingPositions: false,
      positionDialog: false,
      editingPosition: false,
      savingPosition: false,
      positionForm: {
        id: null,
        name: '',
        description: '',
      },
      positionColumns: [
        { name: 'name', label: 'Position Name', field: 'name', align: 'left' },
        { name: 'description', label: 'Description', field: 'description', align: 'left' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],

      // Contracts
      contracts: [],
      loadingContracts: false,
      contractDialog: false,
      contractViewDialog: false,
      editingContract: false,
      savingContract: false,
      selectedContract: null,
      employees: [],
      contractTypes: [],
      contractForm: {
        id: null,
        employee_id: null,
        company_id: null,
        contract_type_id: null,
        site_id: null,

        // Pay Structure (nested object)
        pay_structure: {
          position_id: null,
          pay_type: 'monthly',
          rate: '',
          currency: 'PHP',
          effective_from: '',
          effective_to: null,
        },

        // Schedules array
        schedules: [],

        // Recurring array
        recurring: [],
      },

      // Add these to help with schedule/recurring management
      scheduleForm: {
        date: '',
        site_id: null,
        department_id: null,
        shift_type_id: null,
      },

      recurringForm: {
        recurring_id: null,
        start_date: '',
        end_date: '',
        site_id: null,
        department_id: null,
      },

      // You'll also need to fetch departments and shift types
      shiftTypes: [],
      loadingShiftTypes: false,
      contractColumns: [
        {
          name: 'employee',
          label: 'Employee',
          field: 'employee_name',
          align: 'left',
          sortable: true,
        },
        {
          name: 'contract_type',
          label: 'Contract Type',
          field: 'contract_type_name',
          align: 'left',
        },
        { name: 'company', label: 'Company', field: 'company_name', align: 'left' },
        { name: 'status', label: 'Status', field: 'is_acknowledged', align: 'center' },
        { name: 'date_created', label: 'Date Created', field: 'date_created', align: 'left' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],

      // Payslips
      payslipSubTab: 'allowance-types',
      // Pay Structures
      payStructures: [],
      loadingPayStructures: false,
      payStructureDialog: false,
      editingPayStructure: false,
      savingPayStructure: false,
      payStructureForm: {
        id: null,
        position: null,
        pay_type: 'monthly',
        rate: 0,
        currency: 'PHP',
        effective_from: '',
        effective_to: null,
      },
      payStructureColumns: [
        {
          name: 'position',
          label: 'Position',
          field: 'position_name',
          align: 'left',
          sortable: true,
        },
        { name: 'pay_type', label: 'Pay Type', field: 'pay_type', align: 'left' },
        { name: 'rate', label: 'Rate', field: 'rate', align: 'right' },
        {
          name: 'effective_from',
          label: 'Effective From',
          field: 'effective_from',
          align: 'left',
        },
        { name: 'effective_to', label: 'Effective To', field: 'effective_to', align: 'left' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],
      payTypeOptions: ['monthly', 'daily', 'hourly'],

      // Allowance Types
      allowanceTypes: [],
      loadingAllowanceTypes: false,
      allowanceTypeDialog: false,
      editingAllowanceType: false,
      savingAllowanceType: false,
      allowanceTypeForm: {
        id: null,
        company: null,
        name: '',
      },
      allowanceTypeColumns: [
        { name: 'name', label: 'Allowance Name', field: 'name', align: 'left', sortable: true },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],

      // Tax Brackets
      taxBrackets: [],
      loadingTaxBrackets: false,
      taxBracketDialog: false,
      editingTaxBracket: false,
      savingTaxBracket: false,
      taxBracketForm: {
        id: null,
        company: null,
        name: '',
        min_amount: 0,
        max_amount: null,
        rate: 0,
      },
      taxBracketColumns: [
        { name: 'name', label: 'Bracket Name', field: 'name', align: 'left', sortable: true },
        { name: 'min_amount', label: 'Min Amount', field: 'min_amount', align: 'right' },
        { name: 'max_amount', label: 'Max Amount', field: 'max_amount', align: 'right' },
        { name: 'rate', label: 'Rate', field: 'rate', align: 'right' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],

      // Cutoff Periods
      cutoffPeriods: [],
      loadingCutoffPeriods: false,
      cutoffPeriodDialog: false,
      editingCutoffPeriod: false,
      savingCutoffPeriod: false,
      cutoffPeriodForm: {
        id: null,
        company: null,
        name: '',
        start_date: '',
        end_date: '',
        is_active: true,
      },
      cutoffPeriodColumns: [
        { name: 'name', label: 'Period Name', field: 'name', align: 'left', sortable: true },
        { name: 'start_date', label: 'Start Date', field: 'start_date', align: 'left' },
        { name: 'end_date', label: 'End Date', field: 'end_date', align: 'left' },
        { name: 'is_active', label: 'Status', field: 'is_active', align: 'center' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],

      // Payroll Groups
      payrollGroups: [],
      loadingPayrollGroups: false,
      payrollGroupDialog: false,
      editingPayrollGroup: false,
      savingPayrollGroup: false,
      payrollGroupForm: {
        id: null,
        company: null,
        name: '',
        description: '',
      },
      payrollGroupColumns: [
        { name: 'name', label: 'Group Name', field: 'name', align: 'left', sortable: true },
        { name: 'description', label: 'Description', field: 'description', align: 'left' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],

      // Labor Rules
      laborRules: [],
      loadingLaborRules: false,
      laborRuleDialog: false,
      editingLaborRule: false,
      savingLaborRule: false,
      laborRuleForm: {
        id: null,
        company: null,
        name: '',
        description: '',
        multiplier: 1.0,
        is_active: true,
      },
      laborRuleColumns: [
        { name: 'name', label: 'Rule Name', field: 'name', align: 'left', sortable: true },
        { name: 'description', label: 'Description', field: 'description', align: 'left' },
        { name: 'multiplier', label: 'Multiplier', field: 'multiplier', align: 'right' },
        { name: 'is_active', label: 'Status', field: 'is_active', align: 'center' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],
    }
  },

  async mounted() {
    console.log('🚀 [MOUNTED] Component mounting...')
    console.log('🚀 [MOUNTED] LocalStorage contents:', {
      selectedCompany: localStorage.getItem('selectedCompany'),
      access_token: localStorage.getItem('access_token') ? '***EXISTS***' : 'NOT FOUND',
    })

    console.log('📊 [MOUNTED] Fetching companies...')
    await this.fetchCompanies()
    console.log('✅ [MOUNTED] Companies fetched:', this.companies.length)

    const companyId = this.getCompanyId()
    console.log('🏢 [MOUNTED] Selected company ID:', companyId)

    if (companyId) {
      console.log('✅ [MOUNTED] Valid company ID found, fetching all data...')

      try {
        // ✅ STEP 1: Fetch positions FIRST (required for pay structures)
        console.log('📍 [MOUNTED] Fetching positions...')
        await this.fetchPositions()
        console.log('✅ [MOUNTED] Positions fetched:', this.positions.length)

        // ✅ STEP 2: Fetch departments (might be needed by other features)
        console.log('🏢 [MOUNTED] Fetching departments...')
        await this.fetchDepartments()
        console.log('✅ [MOUNTED] Departments fetched:', this.departments.length)

        // ✅ STEP 3: Fetch contract types (needed for contracts)
        console.log('📄 [MOUNTED] Fetching contract types...')
        await this.fetchContractTypes()
        console.log('✅ [MOUNTED] Contract types fetched:', this.contractTypes.length)

        // ✅ STEP 4: Fetch employees (needed for contracts)
        console.log('👥 [MOUNTED] Fetching employees...')
        await this.fetchEmployees()
        console.log('✅ [MOUNTED] Employees fetched:', this.employees.length)

        // ✅ STEP 5: Fetch shift types (needed for schedules)
        console.log('⏰ [MOUNTED] Fetching shift types...')
        await this.fetchShiftTypes()
        console.log('✅ [MOUNTED] Shift types fetched:', this.shiftTypes.length)

        // ✅ STEP 6: Now fetch everything else in parallel
        console.log('🔄 [MOUNTED] Fetching remaining data in parallel...')
        await Promise.all([
          this.fetchSites(),
          this.fetchRoles(),
          this.fetchShifts(),
          this.fetchAllowanceTypes(),
          this.fetchTaxBrackets(),
          this.fetchCutoffPeriods(),
          this.fetchPayrollGroups(),
          this.fetchLaborRules(),
          this.fetchPayStructures(), // Now positions are already loaded
          this.fetchContracts(),
        ])

        console.log('✅ [MOUNTED] All data fetched successfully')
        console.log('📊 [MOUNTED] Final data counts:', {
          companies: this.companies.length,
          sites: this.sites.length,
          roles: this.roles.length,
          positions: this.positions.length,
          departments: this.departments.length,
          shifts: this.shifts.length,
          contracts: this.contracts.length,
          contractTypes: this.contractTypes.length,
          employees: this.employees.length,
          shiftTypes: this.shiftTypes.length,
          allowanceTypes: this.allowanceTypes.length,
          taxBrackets: this.taxBrackets.length,
          cutoffPeriods: this.cutoffPeriods.length,
          payrollGroups: this.payrollGroups.length,
          laborRules: this.laborRules.length,
          payStructures: this.payStructures.length,
        })
      } catch (error) {
        console.error('❌ [MOUNTED] Error fetching data:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to load some data. Please refresh the page.',
          position: 'top',
          timeout: 5000,
        })
      }
    } else {
      console.warn('⚠️ [MOUNTED] No company selected')
      this.$q.notify({
        type: 'info',
        message: 'Please select a company to view data',
        position: 'top',
      })
    }

    console.log('🏁 [MOUNTED] Component mounted successfully')
  },

  computed: {
    filteredCompanies() {
      if (!this.searchQuery) return this.companies
      const q = this.searchQuery.toLowerCase()
      return this.companies.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          (c.contact || '').toLowerCase().includes(q),
      )
    },
    filteredSites() {
      if (!this.searchQuery) return this.sites
      const q = this.searchQuery.toLowerCase()
      return this.sites.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.address || '').toLowerCase().includes(q) ||
          (s.ownership_type || '').toLowerCase().includes(q),
      )
    },
    filteredRoles() {
      if (!this.searchQuery) return this.roles
      const q = this.searchQuery.toLowerCase()
      return this.roles.filter((r) => (r.name || '').toLowerCase().includes(q))
    },
    filteredShifts() {
      if (!this.searchQuery) return this.shifts
      const q = this.searchQuery.toLowerCase()
      return this.shifts.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q),
      )
    },
    filteredDepartments() {
      if (!this.searchQuery) return this.departments
      const q = this.searchQuery.toLowerCase()
      return this.departments.filter((d) => (d.name || '').toLowerCase().includes(q))
    },
    filteredPositions() {
      if (!this.searchQuery) return this.positions
      const q = this.searchQuery.toLowerCase()
      return this.positions.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q),
      )
    },
    filteredContracts() {
      if (!this.searchQuery) return this.contracts
      const q = this.searchQuery.toLowerCase()
      return this.contracts.filter(
        (c) =>
          (c.employee_name || '').toLowerCase().includes(q) ||
          (c.contract_type_name || '').toLowerCase().includes(q) ||
          (c.company_name || '').toLowerCase().includes(q),
      )
    },
  },

  methods: {
    // ==================== HELPER METHODS ====================
    getCompanyId() {
      const selectedCompanyRaw = localStorage.getItem('selectedCompany')

      if (!selectedCompanyRaw) {
        console.warn('⚠️ No company selected in localStorage')
        return null
      }

      try {
        const parsed = JSON.parse(selectedCompanyRaw)
        let companyId = parsed?.id || parsed?.company_id || parsed?.value

        if (typeof companyId === 'object' && companyId !== null) {
          companyId = companyId.id || companyId.company_id
        }

        if (companyId) {
          companyId = parseInt(companyId)
          if (!isNaN(companyId) && companyId > 0) {
            console.log('✓ Extracted company ID:', companyId)
            return companyId
          }
        }
      } catch {
        console.log('Failed to parse JSON, trying as direct value')
      }

      const directId = parseInt(selectedCompanyRaw)
      if (!isNaN(directId) && directId > 0) {
        console.log('✓ Direct company ID:', directId)
        return directId
      }

      console.error('❌ Could not extract valid company ID from:', selectedCompanyRaw)
      return null
    },
    getSiteName(siteId) {
      const site = this.sites.find((s) => s.id === siteId)
      return site ? site.name : 'N/A'
    },

    getDepartmentName(deptId) {
      const dept = this.departments.find((d) => d.id === deptId)
      return dept ? dept.name : 'N/A'
    },

    getShiftTypeName(shiftId) {
      const shift = this.shiftTypes.find((s) => s.id === shiftId)
      return shift ? shift.name : 'N/A'
    },
    validateCompanySelection() {
      const companyId = this.getCompanyId()

      if (!companyId) {
        this.$q.notify({
          type: 'warning',
          message: 'Please select a company first',
          position: 'top',
          timeout: 3000,
          actions: [
            {
              label: 'Dismiss',
              color: 'white',
            },
          ],
        })
        return false
      }

      return companyId
    },

    getAuthHeaders() {
      const token = localStorage.getItem('access_token')
      return { Authorization: `Bearer ${token}` }
    },

    getActivePermissions(role) {
      if (Array.isArray(role.permissions)) {
        return role.permissions
      }

      if (typeof role.permissions === 'string') {
        try {
          const parsed = JSON.parse(role.permissions)
          return Array.isArray(parsed) ? parsed : []
        } catch (e) {
          console.warn('⚠️ Failed to parse permissions:', e)
        }
      }

      return []
    },

    formatDate(date) {
      if (!date) return 'N/A'
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    },

    formatAmount(amount) {
      if (!amount && amount !== 0) return '0.00'
      return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    },

    // ==================== COMPANIES ====================
    async fetchCompanies() {
      this.loadingCompanies = true
      try {
        const response = await api.get('/organization/companies/', {
          headers: this.getAuthHeaders(),
        })
        this.companies = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching companies:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to load companies',
          position: 'top',
        })
      } finally {
        this.loadingCompanies = false
      }
    },

    openCompanyDialog() {
      this.editingCompany = false
      this.companyForm = {
        id: null,
        name: '',
        logo: '',
      }
      this.logoUploadMethod = 'url'
      this.logoFile = null
      this.logoPreview = null
      this.companyDialog = true
    },

    editCompany(company) {
      this.editingCompany = true
      this.companyForm = { ...company }
      this.logoUploadMethod = 'url'
      this.logoFile = null
      this.logoPreview = company.logo || null
      this.companyDialog = true
    },

    onLogoFileSelected(file) {
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.logoPreview = e.target.result
        }
        reader.readAsDataURL(file)
      } else {
        this.logoPreview = null
      }
    },

    clearLogoFile() {
      this.logoFile = null
      this.logoPreview = null
      this.companyForm.logo = ''
    },

    clearLogoUrl() {
      this.companyForm.logo = ''
      this.logoPreview = null
    },

    onFileRejected(rejectedEntries) {
      this.$q.notify({
        type: 'negative',
        message: `File rejected: ${rejectedEntries[0].failedPropValidation}`,
        position: 'top',
      })
    },

    handleImageError() {
      this.logoPreview = null
      this.$q.notify({
        type: 'warning',
        message: 'Failed to load image preview',
        position: 'top',
      })
    },

    async saveCompany() {
      if (!this.companyForm.name.trim()) {
        this.$q.notify({
          type: 'negative',
          message: 'Company name is required',
          position: 'top',
        })
        return
      }

      this.savingCompany = true
      try {
        const formData = new FormData()
        formData.append('name', this.companyForm.name)

        if (this.logoUploadMethod === 'file' && this.logoFile) {
          formData.append('logo', this.logoFile)
        } else if (this.logoUploadMethod === 'url' && this.companyForm.logo) {
          formData.append('logo', this.companyForm.logo)
        } else if (!this.editingCompany) {
          formData.append('logo', '')
        }

        const headers = {
          ...this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        }

        if (this.editingCompany) {
          await api.put(`/organization/companies/${this.companyForm.id}/`, formData, { headers })
          this.$q.notify({ type: 'positive', message: 'Company updated successfully' })
        } else {
          await api.post('/organization/companies/create/', formData, { headers })
          this.$q.notify({ type: 'positive', message: 'Company created successfully' })
        }

        this.companyDialog = false
        this.clearLogoFile()
        await this.fetchCompanies()
      } catch (error) {
        console.error('Error saving company:', error)
        let errorMessage = 'Failed to save company'

        if (error.response?.data) {
          const errorData = error.response.data
          if (errorData.logo && Array.isArray(errorData.logo)) {
            errorMessage = errorData.logo.join(', ')
          } else if (errorData.message) {
            errorMessage = errorData.message
          }
        }

        this.$q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top',
          timeout: 5000,
        })
      } finally {
        this.savingCompany = false
      }
    },

    async deleteCompany(company) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${company.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/organization/companies/${company.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Company deleted successfully' })
            await this.fetchCompanies()
          } catch (error) {
            console.error('Error deleting company:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete company' })
          }
        })
    },

    async fetchSites() {
      this.loadingSites = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.sites = []
          return
        }

        const response = await api.get('/organization/sites/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })

        this.sites = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching sites:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to load sites',
          position: 'top',
        })
      } finally {
        this.loadingSites = false
      }
    },

    openSiteDialog() {
      this.editingSite = false
      this.siteForm = {
        id: null,
        name: '',
        location: '',
        latitude: '',
        longitude: '',
        radius_meters: 100,
        ownership_type: 'owned',
        is_active: true,
        requires_otp: false,
        allow_manual_attendance: true,
        allow_service_charge: true,
        multiply_nd_by_holiday: false,
        company: this.getCompanyId(),
      }
      this.siteDialog = true
    },

    editSite(site) {
      this.editingSite = true
      this.siteForm = {
        ...site,
        requires_otp: site.requires_otp ?? false,
        allow_manual_attendance: site.allow_manual_attendance ?? true,
        allow_service_charge: site.allow_service_charge ?? true,
        multiply_nd_by_holiday: site.multiply_nd_by_holiday ?? false,
      }
      this.siteDialog = true
    },

    async saveSite() {
      // Validation
      if (!this.siteForm.name.trim()) {
        this.$q.notify({
          type: 'negative',
          message: 'Site name is required',
          position: 'top',
        })
        return
      }

      if (!this.siteForm.location.trim()) {
        this.$q.notify({
          type: 'negative',
          message: 'Location is required',
          position: 'top',
        })
        return
      }

      if (!this.siteForm.latitude || !this.siteForm.longitude) {
        this.$q.notify({
          type: 'negative',
          message: 'Latitude and longitude are required',
          position: 'top',
        })
        return
      }

      this.savingSite = true
      try {
        const formatCoordinate = (value, decimals = 5) => {
          const num = Number(value)
          if (isNaN(num)) return '0.00000'
          return num.toFixed(decimals).padStart(decimals + 4, '0')
        }

        const payload = {
          name: this.siteForm.name.trim(),
          location: this.siteForm.location.trim(),
          latitude: formatCoordinate(this.siteForm.latitude),
          longitude: formatCoordinate(this.siteForm.longitude),
          radius_meters: parseInt(this.siteForm.radius_meters) || 100,
          ownership_type: this.siteForm.ownership_type || 'owned',
          is_active: Boolean(this.siteForm.is_active),
          requires_otp: Boolean(this.siteForm.requires_otp),
          allow_manual_attendance: Boolean(this.siteForm.allow_manual_attendance),
          allow_service_charge: Boolean(this.siteForm.allow_service_charge),
          multiply_nd_by_holiday: Boolean(this.siteForm.multiply_nd_by_holiday),
          company: this.getCompanyId(),
        }

        if (this.siteForm.business_type) {
          payload.business_type = this.siteForm.business_type
        }

        if (this.editingSite) {
          await api.put(`/organization/sites/${this.siteForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({
            type: 'positive',
            message: 'Site updated successfully',
            position: 'top',
          })
        } else {
          await api.post('/organization/sites/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({
            type: 'positive',
            message: 'Site created successfully',
            position: 'top',
          })
        }

        this.siteDialog = false
        await this.fetchSites()
      } catch (error) {
        console.error('Error saving site:', error)

        let errorMessage = 'Failed to save site'

        if (error.response?.data) {
          const errorData = error.response.data

          if (typeof errorData === 'object') {
            const firstError = Object.values(errorData)[0]
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError
          } else if (errorData.message) {
            errorMessage = errorData.message
          } else if (typeof errorData === 'string') {
            errorMessage = errorData
          }
        }

        this.$q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top',
          timeout: 3000,
        })
      } finally {
        this.savingSite = false
      }
    },

    async deleteSite(site) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${site.name}"?`,
          cancel: true,
          persistent: true,
          ok: {
            color: 'negative',
            label: 'Delete',
          },
          cancel: {
            color: 'grey',
            flat: true,
          },
        })
        .onOk(async () => {
          try {
            await api.delete(`/organization/sites/${site.id}/`, {
              headers: this.getAuthHeaders(),
            })

            this.$q.notify({
              type: 'positive',
              message: 'Site deleted successfully',
              position: 'top',
            })

            await this.fetchSites()
          } catch (error) {
            console.error('Error deleting site:', error)

            let errorMessage = 'Failed to delete site'
            if (error.response?.data?.message) {
              errorMessage = error.response.data.message
            }

            this.$q.notify({
              type: 'negative',
              message: errorMessage,
              position: 'top',
            })
          }
        })
    },

    // ==================== DEPARTMENTS ====================
    async fetchDepartments() {
      this.loadingDepartments = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.departments = []
          return
        }

        const response = await api.get('/organization/departments/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })

        this.departments = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching departments:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to load departments',
          position: 'top',
        })
      } finally {
        this.loadingDepartments = false
      }
    },

    openDepartmentDialog() {
      const companyId = this.validateCompanySelection()
      if (!companyId) return

      this.editingDepartment = false
      this.departmentForm = {
        id: null,
        name: '',
        company: companyId,
      }
      this.departmentDialog = true
    },

    editDepartment(department) {
      this.editingDepartment = true
      this.departmentForm = {
        id: department.id,
        name: department.name,
        company: department.company || this.getCompanyId(),
      }
      this.departmentDialog = true
    },

    async saveDepartment() {
      if (!this.departmentForm.name.trim()) {
        this.$q.notify({
          type: 'negative',
          message: 'Department name is required',
          position: 'top',
        })
        return
      }

      const companyId = this.departmentForm.company || this.getCompanyId()
      if (!companyId) {
        this.$q.notify({
          type: 'negative',
          message: 'Company ID is required',
          position: 'top',
        })
        return
      }

      this.savingDepartment = true
      try {
        const payload = {
          name: this.departmentForm.name.trim(),
          company: companyId,
        }

        if (this.editingDepartment) {
          await api.put(`/organization/departments/${this.departmentForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Department updated successfully' })
        } else {
          await api.post('/organization/departments/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Department created successfully' })
        }

        this.departmentDialog = false
        await this.fetchDepartments()
      } catch (error) {
        console.error('Error saving department:', error)
        console.error('Error response:', error.response?.data)

        // Handle array or string error messages
        let errorMessage = 'Failed to save department'
        if (error.response?.data) {
          if (Array.isArray(error.response.data)) {
            errorMessage = error.response.data[0] // Get first error from array
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error
          }
        }

        this.$q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top',
        })
      } finally {
        this.savingDepartment = false
      }
    },

    async deleteDepartment(department) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${department.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/organization/departments/${department.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Department deleted successfully' })
            await this.fetchDepartments()
          } catch (error) {
            console.error('Error deleting department:', error)
            this.$q.notify({
              type: 'negative',
              message: error.response?.data?.message || 'Failed to delete department',
              position: 'top',
            })
          }
        })
    },

    // ==================== ROLES ====================
    async fetchRoles() {
      this.loadingRoles = true

      try {
        const companyId = this.getCompanyId()

        if (!companyId) {
          this.roles = []
          return
        }

        const response = await api.get('/user/user-roles/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })

        let rolesData = []
        if (response.data.data) {
          rolesData = response.data.data
        } else if (response.data.results) {
          rolesData = response.data.results
        } else if (Array.isArray(response.data)) {
          rolesData = response.data
        }

        this.roles = rolesData
      } catch (error) {
        console.error('Error fetching roles:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to load roles',
          position: 'top',
        })
        this.roles = []
      } finally {
        this.loadingRoles = false
      }
    },

    openRoleDialog() {
      const companyId = this.validateCompanySelection()
      if (!companyId) return

      this.editingRole = false
      this.roleForm = {
        id: null,
        name: '',
        permissions: [],
        company: companyId,
      }
      this.roleDialog = true
    },

    editRole(role) {
      this.editingRole = true

      let permissionsArray = []
      if (Array.isArray(role.permissions)) {
        permissionsArray = role.permissions.slice() // fresh copy
      } else if (typeof role.permissions === 'string') {
        try {
          const parsed = JSON.parse(role.permissions)
          permissionsArray = Array.isArray(parsed) ? parsed.slice() : []
        } catch {
          permissionsArray = []
        }
      }

      this.roleForm = {
        id: role.id,
        name: role.name,
        permissions: permissionsArray,
        company: role.company || this.getCompanyId(),
      }
      this.roleDialog = true
    },

    togglePermission(perm, checked) {
      const perms = this.roleForm.permissions.slice()
      if (checked) {
        if (!perms.includes(perm)) perms.push(perm)
      } else {
        const idx = perms.indexOf(perm)
        if (idx !== -1) perms.splice(idx, 1)
      }
      this.roleForm.permissions = perms
    },

    async saveRole() {
      if (!this.roleForm.name.trim()) {
        this.$q.notify({
          type: 'negative',
          message: 'Role name is required',
          position: 'top',
        })
        return
      }

      const companyId = this.roleForm.company || this.validateCompanySelection()
      if (!companyId) {
        this.$q.notify({
          type: 'negative',
          message: 'Company ID is missing',
          position: 'top',
        })
        return
      }

      this.savingRole = true

      try {
        const payload = {
          name: this.roleForm.name.trim(),
          permissions: Array.isArray(this.roleForm.permissions)
            ? [...this.roleForm.permissions]
            : [],
          company: parseInt(companyId),
        }

        if (this.editingRole) {
          await api.put(`/user/user-roles/${this.roleForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Role updated successfully' })
        } else {
          await api.post('/user/user-roles/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Role created successfully' })
        }

        this.roleDialog = false
        await this.fetchRoles()
      } catch (error) {
        console.error('Error saving role:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to save role',
          position: 'top',
        })
      } finally {
        this.savingRole = false
      }
    },

    async deleteRole(role) {
      console.log('Attempting to delete role:', role.id) // Add this

      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${role.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            const url = `/user/user-roles/${role.id}/`
            console.log('DELETE URL:', url) // Add this

            await api.delete(url, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Role deleted successfully' })
            await this.fetchRoles()
          } catch (error) {
            console.error('Error deleting role:', error)
            console.log('Response data:', error.response?.data) // Add this

            const message =
              error.response?.status === 404
                ? 'Role not found. It may have been already deleted.'
                : error.response?.data?.message || 'Failed to delete role'

            this.$q.notify({ type: 'negative', message })
            await this.fetchRoles() // Refresh list even on error
          }
        })
    },
    // ==================== SHIFTS ====================
    async fetchShifts() {
      this.loadingShifts = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.shifts = []
          return
        }

        const response = await api.get('/organization/shift-types/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })

        this.shifts = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching shifts:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to load shifts',
          position: 'top',
        })
      } finally {
        this.loadingShifts = false
      }
    },

    openShiftDialog() {
      const companyId = this.validateCompanySelection()
      if (!companyId) return

      this.editingShift = false
      this.shiftForm = {
        id: null,
        name: '',
        company: companyId,
        description: '',
        default_start_time: '',
        default_end_time: '',
        is_graveyard: false,
        apply_night_differential: false,
      }
      this.shiftDialog = true
    },

    editShift(shift) {
      this.editingShift = true
      this.shiftForm = {
        id: shift.id,
        name: shift.name,
        company: shift.company || this.getCompanyId(),
        description: shift.description || '',
        default_start_time: this.extractTime(shift.default_start_time),
        default_end_time: this.extractTime(shift.default_end_time),
        is_graveyard: shift.is_graveyard || false,
        apply_night_differential: shift.apply_night_differential || false,
      }
      this.shiftDialog = true
    },

    async saveShift() {
      if (
        !this.shiftForm.name.trim() ||
        !this.shiftForm.default_start_time ||
        !this.shiftForm.default_end_time
      ) {
        this.$q.notify({
          type: 'negative',
          message: 'Please fill all required fields',
          position: 'top',
        })
        return
      }

      const companyId = this.shiftForm.company || this.getCompanyId()
      if (!companyId) {
        this.$q.notify({
          type: 'negative',
          message: 'Company ID is required',
          position: 'top',
        })
        return
      }

      this.savingShift = true
      try {
        // Format times to HH:MM:SS format
        const formatTimeToAPI = (timeString) => {
          const [hours, minutes] = timeString.split(':')
          return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`
        }

        const payload = {
          name: this.shiftForm.name.trim(),
          company: parseInt(companyId),
          description: this.shiftForm.description || '',
          default_start_time: formatTimeToAPI(this.shiftForm.default_start_time),
          default_end_time: formatTimeToAPI(this.shiftForm.default_end_time),
          is_graveyard: Boolean(this.shiftForm.is_graveyard),
          apply_night_differential: Boolean(this.shiftForm.apply_night_differential),
        }

        console.log('Payload being sent:', payload)

        if (this.editingShift) {
          await api.put(`/organization/shift-types/${this.shiftForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Shift updated successfully' })
        } else {
          await api.post('/organization/shift-types/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Shift created successfully' })
        }

        this.shiftDialog = false
        await this.fetchShifts()
      } catch (error) {
        console.error('Error saving shift:', error)
        console.error('Error response:', error.response?.data)

        let errorMessage = 'Failed to save shift'
        if (error.response?.data) {
          if (typeof error.response.data === 'object') {
            const errors = []
            for (const [field, messages] of Object.entries(error.response.data)) {
              if (Array.isArray(messages)) {
                errors.push(`${field}: ${messages.join(', ')}`)
              } else {
                errors.push(`${field}: ${messages}`)
              }
            }
            if (errors.length > 0) {
              errorMessage = errors.join(' | ')
            }
          } else if (Array.isArray(error.response.data)) {
            errorMessage = error.response.data[0]
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error
          }
        }

        this.$q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top',
          timeout: 5000,
        })
      } finally {
        this.savingShift = false
      }
    },

    async deleteShift(shift) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${shift.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/organization/shift-types/${shift.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Shift deleted successfully' })
            await this.fetchShifts()
          } catch (error) {
            console.error('Error deleting shift:', error)
            this.$q.notify({
              type: 'negative',
              message: error.response?.data?.message || 'Failed to delete shift',
              position: 'top',
            })
          }
        })
    },

    formatTime(timeString) {
      if (!timeString) return 'N/A'
      try {
        // Handle HH:MM:SS format
        const [hours, minutes] = timeString.split(':')
        const hour = parseInt(hours)
        const min = parseInt(minutes)
        const period = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour % 12 || 12
        return `${String(displayHour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`
      } catch {
        return timeString
      }
    },

    extractTime(timeString) {
      if (!timeString) return ''
      try {
        // Handle HH:MM:SS format - just take first two parts
        const parts = timeString.split(':')
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
      } catch {
        return ''
      }
    },
    // ==================== POSITIONS ====================
    async fetchPositions() {
      this.loadingPositions = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.positions = []
          return
        }

        const response = await api.get('/user/positions/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })

        this.positions = response.data || []
      } catch (error) {
        console.error('Error fetching positions:', error)
      } finally {
        this.loadingPositions = false
      }
    },

    openPositionDialog() {
      this.editingPosition = false
      this.positionForm = {
        id: null,
        name: '',
        description: '',
      }
      this.positionDialog = true
    },

    editPosition(position) {
      this.editingPosition = true
      this.positionForm = {
        id: position.id,
        name: position.name,
        description: position.description,
      }
      this.positionDialog = true
    },

    async savePosition() {
      if (!this.positionForm.name.trim()) {
        this.$q.notify({ type: 'negative', message: 'Position name is required' })
        return
      }

      this.savingPosition = true
      try {
        const payload = {
          name: this.positionForm.name,
          description: this.positionForm.description || '',
          company: this.getCompanyId(),
        }

        if (this.editingPosition) {
          await api.put(`/user/positions/${this.positionForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Position updated successfully' })
        } else {
          await api.post('/user/positions/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Position created successfully' })
        }

        this.positionDialog = false
        await this.fetchPositions()
      } catch (error) {
        console.error('Error saving position:', error)
        this.$q.notify({ type: 'negative', message: 'Failed to save position' })
      } finally {
        this.savingPosition = false
      }
    },

    async deletePosition(position) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${position.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/user/positions/${position.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Position deleted successfully' })
            await this.fetchPositions()
          } catch (error) {
            console.error('Error deleting position:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete position' })
          }
        })
    },

    // ==================== CONTRACTS ====================
    async fetchContracts() {
      this.loadingContracts = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.contracts = []
          return
        }

        // Note: You may need to check what the LIST endpoint is
        // The provided endpoint is for CREATE only
        const response = await api.get('/user/contracts/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })

        this.contracts = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching contracts:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to load contracts',
          position: 'top',
        })
      } finally {
        this.loadingContracts = false
      }
    },

    async fetchShiftTypes() {
      try {
        const response = await api.get('/attendance/shift-types/', {
          headers: this.getAuthHeaders(),
        })
        this.shiftTypes = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching shift types:', error)
      }
    },

    async fetchEmployees() {
      try {
        const companyId = this.getCompanyId()
        if (!companyId) return

        const response = await api.get('/user/employees/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })

        this.employees = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching employees:', error)
      }
    },

    async fetchContractTypes() {
      try {
        const response = await api.get('/contracts/contract-types/', {
          headers: this.getAuthHeaders(),
        })

        this.contractTypes = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching contract types:', error)
      }
    },

    async openContractDialog() {
      const companyId = this.validateCompanySelection()
      if (!companyId) return

      await Promise.all([this.fetchEmployees(), this.fetchContractTypes()])

      this.editingContract = false
      this.contractForm = {
        id: null,
        employee_id: null,
        company_id: companyId,
        contract_type_id: null,
        position_id: null,
        schedules: [],
        recurring_id: null,
        start_date: '',
        end_date: '',
      }
      this.contractDialog = true
    },

    async editContract(contract) {
      await Promise.all([this.fetchEmployees(), this.fetchContractTypes()])

      this.editingContract = true
      this.contractForm = {
        id: contract.id,
        employee_id: contract.employee_id,
        company_id: contract.company_id,
        contract_type_id: contract.contract_type_id,
        position_id: contract.position_id,
        schedules: contract.schedules || [],
        recurring_id: contract.recurring_id,
        start_date: contract.start_date,
        end_date: contract.end_date,
      }
      this.contractDialog = true
    },

    async saveContract() {
      if (
        !this.contractForm.employee_id ||
        !this.contractForm.contract_type_id ||
        !this.contractForm.position_id
      ) {
        this.$q.notify({
          type: 'negative',
          message: 'Please fill all required fields',
          position: 'top',
        })
        return
      }

      this.savingContract = true
      try {
        const payload = { ...this.contractForm }

        if (this.editingContract) {
          await api.put(`/contracts/employee-contracts/${this.contractForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Contract updated successfully' })
        } else {
          await api.post('/contracts/employee-contracts/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Contract created successfully' })
        }

        this.contractDialog = false
        await this.fetchContracts()
      } catch (error) {
        console.error('Error saving contract:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to save contract',
          position: 'top',
        })
      } finally {
        this.savingContract = false
      }
    },

    viewContract(contract) {
      this.selectedContract = contract
      this.contractViewDialog = true
    },

    viewContractPDF(contract) {
      if (contract.pdf_url) {
        window.open(contract.pdf_url, '_blank')
      }
    },

    async deleteContract(contract) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete this contract for "${contract.employee_name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/contracts/employee-contracts/${contract.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Contract deleted successfully' })
            await this.fetchContracts()
          } catch (error) {
            console.error('Error deleting contract:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete contract' })
          }
        })
    },

    // ==================== ALLOWANCE TYPES ====================
    async fetchAllowanceTypes() {
      this.loadingAllowanceTypes = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.allowanceTypes = []
          return
        }

        const response = await api.get('/payroll/admin/allowance-types/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })
        this.allowanceTypes = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching allowance types:', error)
      } finally {
        this.loadingAllowanceTypes = false
      }
    },

    openAllowanceTypeDialog() {
      this.editingAllowanceType = false
      this.allowanceTypeForm = {
        id: null,
        company: this.getCompanyId(),
        name: '',
      }
      this.allowanceTypeDialog = true
    },

    editAllowanceType(item) {
      this.editingAllowanceType = true
      this.allowanceTypeForm = { ...item }
      this.allowanceTypeDialog = true
    },

    async saveAllowanceType() {
      if (!this.allowanceTypeForm.name.trim()) {
        this.$q.notify({ type: 'negative', message: 'Name is required' })
        return
      }

      this.savingAllowanceType = true
      try {
        const payload = {
          company: this.allowanceTypeForm.company || this.getCompanyId(),
          name: this.allowanceTypeForm.name,
        }

        if (this.editingAllowanceType) {
          await api.put(`/payroll/admin/allowance-types/${this.allowanceTypeForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Allowance type updated successfully' })
        } else {
          await api.post('/payroll/admin/allowance-types/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Allowance type created successfully' })
        }

        this.allowanceTypeDialog = false
        await this.fetchAllowanceTypes()
      } catch (error) {
        console.error('Error saving allowance type:', error)
        this.$q.notify({ type: 'negative', message: 'Failed to save allowance type' })
      } finally {
        this.savingAllowanceType = false
      }
    },

    async deleteAllowanceType(item) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${item.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/payroll/admin/allowance-types/${item.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Allowance type deleted successfully' })
            await this.fetchAllowanceTypes()
          } catch (error) {
            console.error('Error deleting allowance type:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete allowance type' })
          }
        })
    },

    // ==================== TAX BRACKETS ====================
    async fetchTaxBrackets() {
      this.loadingTaxBrackets = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.taxBrackets = []
          return
        }

        const response = await api.get('/payroll/admin/tax-brackets/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })
        this.taxBrackets = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching tax brackets:', error)
      } finally {
        this.loadingTaxBrackets = false
      }
    },

    openTaxBracketDialog() {
      this.editingTaxBracket = false
      this.taxBracketForm = {
        id: null,
        company: this.getCompanyId(),
        name: '',
        min_amount: 0,
        max_amount: null,
        rate: 0,
      }
      this.taxBracketDialog = true
    },

    editTaxBracket(item) {
      this.editingTaxBracket = true
      this.taxBracketForm = { ...item }
      this.taxBracketDialog = true
    },

    async saveTaxBracket() {
      if (!this.taxBracketForm.name.trim()) {
        this.$q.notify({ type: 'negative', message: 'Bracket name is required' })
        return
      }

      this.savingTaxBracket = true
      try {
        const payload = {
          company: this.taxBracketForm.company || this.getCompanyId(),
          name: this.taxBracketForm.name,
          min_amount: this.taxBracketForm.min_amount,
          max_amount: this.taxBracketForm.max_amount || null,
          rate: this.taxBracketForm.rate,
        }

        if (this.editingTaxBracket) {
          await api.put(`/payroll/admin/tax-brackets/${this.taxBracketForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Tax bracket updated successfully' })
        } else {
          await api.post('/payroll/admin/tax-brackets/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Tax bracket created successfully' })
        }

        this.taxBracketDialog = false
        await this.fetchTaxBrackets()
      } catch (error) {
        console.error('Error saving tax bracket:', error)
        this.$q.notify({ type: 'negative', message: 'Failed to save tax bracket' })
      } finally {
        this.savingTaxBracket = false
      }
    },

    async deleteTaxBracket(item) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${item.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/payroll/admin/tax-brackets/${item.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Tax bracket deleted successfully' })
            await this.fetchTaxBrackets()
          } catch (error) {
            console.error('Error deleting tax bracket:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete tax bracket' })
          }
        })
    },

    // ==================== CUTOFF PERIODS ====================
    async fetchCutoffPeriods() {
      this.loadingCutoffPeriods = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.cutoffPeriods = []
          return
        }

        const response = await api.get('/payroll/admin/cutoff-periods/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })
        this.cutoffPeriods = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching cutoff periods:', error)
      } finally {
        this.loadingCutoffPeriods = false
      }
    },

    openCutoffPeriodDialog() {
      this.editingCutoffPeriod = false
      this.cutoffPeriodForm = {
        id: null,
        company: this.getCompanyId(),
        name: '',
        start_date: '',
        end_date: '',
        is_active: true,
      }
      this.cutoffPeriodDialog = true
    },

    editCutoffPeriod(item) {
      this.editingCutoffPeriod = true
      this.cutoffPeriodForm = { ...item }
      this.cutoffPeriodDialog = true
    },

    async saveCutoffPeriod() {
      if (
        !this.cutoffPeriodForm.name.trim() ||
        !this.cutoffPeriodForm.start_date ||
        !this.cutoffPeriodForm.end_date
      ) {
        this.$q.notify({ type: 'negative', message: 'Please fill all required fields' })
        return
      }

      this.savingCutoffPeriod = true
      try {
        const payload = {
          company: this.cutoffPeriodForm.company || this.getCompanyId(),
          name: this.cutoffPeriodForm.name,
          start_date: this.cutoffPeriodForm.start_date,
          end_date: this.cutoffPeriodForm.end_date,
          is_active: this.cutoffPeriodForm.is_active,
        }

        if (this.editingCutoffPeriod) {
          await api.put(`/payroll/admin/cutoff-periods/${this.cutoffPeriodForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Cutoff period updated successfully' })
        } else {
          await api.post('/payroll/admin/cutoff-periods/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Cutoff period created successfully' })
        }

        this.cutoffPeriodDialog = false
        await this.fetchCutoffPeriods()
      } catch (error) {
        console.error('Error saving cutoff period:', error)
        this.$q.notify({ type: 'negative', message: 'Failed to save cutoff period' })
      } finally {
        this.savingCutoffPeriod = false
      }
    },

    async deleteCutoffPeriod(item) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${item.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/payroll/admin/cutoff-periods/${item.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Cutoff period deleted successfully' })
            await this.fetchCutoffPeriods()
          } catch (error) {
            console.error('Error deleting cutoff period:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete cutoff period' })
          }
        })
    },

    // ==================== PAYROLL GROUPS ====================
    async fetchPayrollGroups() {
      this.loadingPayrollGroups = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.payrollGroups = []
          return
        }

        const response = await api.get('/payroll/admin/payroll-groups/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })
        this.payrollGroups = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching payroll groups:', error)
      } finally {
        this.loadingPayrollGroups = false
      }
    },

    openPayrollGroupDialog() {
      this.editingPayrollGroup = false
      this.payrollGroupForm = {
        id: null,
        company: this.getCompanyId(),
        name: '',
        description: '',
      }
      this.payrollGroupDialog = true
    },

    editPayrollGroup(item) {
      this.editingPayrollGroup = true
      this.payrollGroupForm = { ...item }
      this.payrollGroupDialog = true
    },

    async savePayrollGroup() {
      if (!this.payrollGroupForm.name.trim()) {
        this.$q.notify({ type: 'negative', message: 'Group name is required' })
        return
      }

      this.savingPayrollGroup = true
      try {
        const payload = {
          company: this.payrollGroupForm.company || this.getCompanyId(),
          name: this.payrollGroupForm.name,
          description: this.payrollGroupForm.description,
        }

        if (this.editingPayrollGroup) {
          await api.put(`/payroll/admin/payroll-groups/${this.payrollGroupForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Payroll group updated successfully' })
        } else {
          await api.post('/payroll/admin/payroll-groups/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Payroll group created successfully' })
        }

        this.payrollGroupDialog = false
        await this.fetchPayrollGroups()
      } catch (error) {
        console.error('Error saving payroll group:', error)
        this.$q.notify({ type: 'negative', message: 'Failed to save payroll group' })
      } finally {
        this.savingPayrollGroup = false
      }
    },

    async deletePayrollGroup(item) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${item.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/payroll/admin/payroll-groups/${item.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Payroll group deleted successfully' })
            await this.fetchPayrollGroups()
          } catch (error) {
            console.error('Error deleting payroll group:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete payroll group' })
          }
        })
    },

    // ==================== LABOR RULES ====================
    async fetchLaborRules() {
      this.loadingLaborRules = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.laborRules = []
          return
        }

        const response = await api.get('/payroll/admin/labor-rules/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })
        this.laborRules = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching labor rules:', error)
      } finally {
        this.loadingLaborRules = false
      }
    },

    openLaborRuleDialog() {
      this.editingLaborRule = false
      this.laborRuleForm = {
        id: null,
        company: this.getCompanyId(),
        name: '',
        description: '',
        multiplier: 1.0,
        is_active: true,
      }
      this.laborRuleDialog = true
    },

    editLaborRule(item) {
      this.editingLaborRule = true
      this.laborRuleForm = { ...item }
      this.laborRuleDialog = true
    },

    async saveLaborRule() {
      if (!this.laborRuleForm.name.trim() || !this.laborRuleForm.multiplier) {
        this.$q.notify({ type: 'negative', message: 'Please fill all required fields' })
        return
      }

      this.savingLaborRule = true
      try {
        const payload = {
          company: this.laborRuleForm.company || this.getCompanyId(),
          name: this.laborRuleForm.name,
          description: this.laborRuleForm.description,
          multiplier: this.laborRuleForm.multiplier,
          is_active: this.laborRuleForm.is_active,
        }

        if (this.editingLaborRule) {
          await api.put(`/payroll/admin/labor-rules/${this.laborRuleForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Labor rule updated successfully' })
        } else {
          await api.post('/payroll/admin/labor-rules/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Labor rule created successfully' })
        }

        this.laborRuleDialog = false
        await this.fetchLaborRules()
      } catch (error) {
        console.error('Error saving labor rule:', error)
        this.$q.notify({ type: 'negative', message: 'Failed to save labor rule' })
      } finally {
        this.savingLaborRule = false
      }
    },

    async deleteLaborRule(item) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete "${item.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/payroll/admin/labor-rules/${item.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Labor rule deleted successfully' })
            await this.fetchLaborRules()
          } catch (error) {
            console.error('Error deleting labor rule:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete labor rule' })
          }
        })
    },

    // ==================== PAY STRUCTURES ====================
    async fetchPayStructures() {
      this.loadingPayStructures = true
      try {
        const companyId = this.getCompanyId()
        if (!companyId) {
          this.payStructures = []
          return
        }

        const response = await api.get('/payroll/pay-structures/', {
          params: { company: companyId },
          headers: this.getAuthHeaders(),
        })

        const structures = response.data.data || response.data || []

        // Map the pay structures to include position names
        this.payStructures = structures.map((structure) => {
          const positionName = this.getPositionName(structure.position)

          return {
            ...structure,
            position_name: positionName,
          }
        })
      } catch (error) {
        console.error('Error fetching pay structures:', error)
      } finally {
        this.loadingPayStructures = false
      }
    },

    getPositionName(positionId) {
      const position = this.positions.find((p) => p.id === positionId)
      return position ? position.name : 'N/A'
    },

    openPayStructureDialog() {
      this.editingPayStructure = false
      this.payStructureForm = {
        id: null,
        position: null,
        pay_type: 'monthly',
        rate: 0,
        currency: 'PHP',
        effective_from: '',
        effective_to: null,
      }
      this.payStructureDialog = true
    },

    editPayStructure(item) {
      this.editingPayStructure = true
      this.payStructureForm = {
        id: item.id,
        position: item.position,
        pay_type: item.pay_type,
        rate: item.rate,
        currency: item.currency,
        effective_from: item.effective_from,
        effective_to: item.effective_to || null,
      }
      this.payStructureDialog = true
    },

    async savePayStructure() {
      if (
        !this.payStructureForm.position ||
        !this.payStructureForm.pay_type ||
        !this.payStructureForm.rate ||
        !this.payStructureForm.currency ||
        !this.payStructureForm.effective_from
      ) {
        this.$q.notify({ type: 'negative', message: 'Please fill all required fields' })
        return
      }

      this.savingPayStructure = true
      try {
        const payload = {
          company_id: this.getCompanyId(), // ← CHANGED from 'company' to 'company_id'
          position: this.payStructureForm.position,
          pay_type: this.payStructureForm.pay_type,
          rate: this.payStructureForm.rate.toString(),
          currency: this.payStructureForm.currency,
          effective_from: this.payStructureForm.effective_from,
          effective_to: this.payStructureForm.effective_to || null,
        }

        console.log('💾 Saving pay structure with payload:', payload)

        if (this.editingPayStructure) {
          await api.put(`/payroll/pay-structures/${this.payStructureForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Pay structure updated successfully' })
        } else {
          await api.post('/payroll/pay-structures/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Pay structure created successfully' })
        }

        this.payStructureDialog = false
        await this.fetchPayStructures()
      } catch (error) {
        console.error('❌ Error saving pay structure:', error)
        console.error('❌ Error response data:', error.response?.data)

        // Display detailed error message
        let errorMessage = 'Failed to save pay structure'

        if (error.response?.data) {
          const errorData = error.response.data

          // Check for field-specific errors
          if (typeof errorData === 'object') {
            const errors = []
            for (const [field, messages] of Object.entries(errorData)) {
              if (Array.isArray(messages)) {
                errors.push(`${field}: ${messages.join(', ')}`)
              } else {
                errors.push(`${field}: ${messages}`)
              }
            }
            if (errors.length > 0) {
              errorMessage = errors.join(' | ')
            }
          } else if (typeof errorData === 'string') {
            errorMessage = errorData
          } else if (errorData.message) {
            errorMessage = errorData.message
          }
        }

        this.$q.notify({
          type: 'negative',
          message: errorMessage,
          position: 'top',
          timeout: 5000,
        })
      } finally {
        this.savingPayStructure = false
      }
    },

    async deletePayStructure(item) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: 'Are you sure you want to delete this pay structure?',
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/payroll/pay-structures/${item.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Pay structure deleted successfully' })
            await this.fetchPayStructures()
          } catch (error) {
            console.error('Error deleting pay structure:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete pay structure' })
          }
        })
    },

    // ==================== VIEW METHODS ====================
    viewCompany(company) {
      this.editCompany(company)
    },
    viewSite(site) {
      this.editSite(site)
    },
    viewRole(role) {
      this.editRole(role)
    },
    viewShift(shift) {
      this.editShift(shift)
    },
    viewDepartment(department) {
      this.editDepartment(department)
    },
    viewPosition(position) {
      this.editPosition(position)
    },
    viewAllowanceType(item) {
      this.editAllowanceType(item)
    },
    viewTaxBracket(item) {
      this.editTaxBracket(item)
    },
    viewCutoffPeriod(item) {
      this.editCutoffPeriod(item)
    },
    viewPayrollGroup(item) {
      this.editPayrollGroup(item)
    },
    viewLaborRule(item) {
      this.editLaborRule(item)
    },
    viewPayStructure(item) {
      this.editPayStructure(item)
    },
  },
}
</script>

<style scoped>
/* ============================================
   BASE LAYOUT
   ============================================ */
.admin-dashboard {
  background: #f8fafc;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

/* ============================================
   PAGE HEADER — matches EmployeesPage exactly
   ============================================ */
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

.header-left {
  flex: 1;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.header-search {
  min-width: 180px;
  max-width: 280px;
  flex: 1;
}

.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

/* ============================================
   TABS
   ============================================ */
.tabs-wrapper {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.subtabs-wrapper {
  background: white;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.settings-tabs {
  padding: 0 8px;
  min-width: max-content;
}

.settings-tab {
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
  color: #616161;
  padding: 12px 16px;
  white-space: nowrap;
}

.transparent-panels {
  background: transparent;
}

/* ============================================
   TABLE SECTION — matches EmployeesPage exactly
   ============================================ */
.table-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  margin-bottom: 0;
}

.table-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.table-title-section {
  flex: 1;
}

.table-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 2px 0;
}

.table-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.add-btn {
  height: 36px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: none;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 13px;
}

/* ============================================
   TABLE STYLES — matches EmployeesPage exactly
   ============================================ */
.modern-table-container {
  border: 2px solid #3b82f6;
  border-radius: 10px;
  overflow: hidden;
  margin: 0 16px 16px 16px;
}

.settings-table {
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
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.table-body-row {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-body-row:hover {
  background: #f8fafc;
}

.table-body-cell {
  padding: 12px 10px;
  font-size: 13px;
  color: #374151;
  border: none;
  vertical-align: middle;
}

.item-name {
  font-weight: 500;
  color: #1a202c;
  font-size: 13px;
}

/* ============================================
   STATUS & OWNERSHIP BADGES
   ============================================ */
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

.status-inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.status-graveyard {
  background: #ede9fe;
  color: #7c3aed;
}

.status-regular {
  background: #e0f2fe;
  color: #0369a1;
}

.ownership-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
}

.owned-badge {
  background: #dbeafe;
  color: #1d4ed8;
}

.leased-badge {
  background: #ffedd5;
  color: #c2410c;
}

/* ============================================
   ACTION BUTTONS — matches EmployeesPage exactly
   ============================================ */
.actions-cell {
  width: 100px;
  min-width: 100px;
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

.pdf-btn {
  background: #fee2e2;
  color: #dc2626;
}

.pdf-btn:hover {
  background: #fecaca;
}

/* ============================================
   PERMISSIONS
   ============================================ */
.permissions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 320px;
}

.permission-chip {
  font-size: 11px;
  border-radius: 4px;
  margin: 0;
}

/* ============================================
   RESPONSIVE — 1024px
   ============================================ */
@media (max-width: 1024px) {
  .dashboard-container {
    padding: 14px;
  }

  .page-header {
    padding: 14px;
  }

  .page-title {
    font-size: 18px;
  }

  .table-title {
    font-size: 16px;
  }

  .modern-table-container {
    margin: 0 12px 12px 12px;
  }
}

/* ============================================
   RESPONSIVE — 768px (Tablet)
   ============================================ */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }

  .page-header {
    padding: 14px;
    margin-bottom: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .header-actions {
    flex-direction: column;
    gap: 8px;
  }

  .header-search {
    max-width: 100%;
    width: 100%;
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .table-actions {
    width: 100%;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .modern-table-container {
    margin: 0 10px 10px 10px;
    overflow-x: auto;
  }

  .settings-table {
    min-width: 700px;
  }

  .table-header-cell,
  .table-body-cell {
    padding: 10px 8px;
    font-size: 12px;
  }

  .actions-cell {
    width: 90px;
    min-width: 90px;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }
}

/* ============================================
   RESPONSIVE — 480px (Small Mobile)
   ============================================ */
@media (max-width: 480px) {
  .dashboard-container {
    padding: 10px;
  }

  .page-header {
    padding: 12px;
    border-radius: 10px;
  }

  .page-title {
    font-size: 17px;
  }

  .table-section {
    border-radius: 10px;
  }

  .table-title {
    font-size: 15px;
  }

  .table-subtitle {
    font-size: 11px;
  }

  .modern-table-container {
    margin: 0 8px 8px 8px;
  }

  .settings-table {
    min-width: 600px;
  }

  .table-header-cell,
  .table-body-cell {
    font-size: 11px;
    padding: 8px 6px;
  }

  .status-badge,
  .ownership-badge {
    font-size: 10px;
    padding: 3px 7px;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }
}
</style>
