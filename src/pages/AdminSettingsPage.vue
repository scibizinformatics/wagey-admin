<template>
  <q-page class="admin-dashboard">
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Admin Settings</h1>
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
          <q-tab name="roles" label="Permissions" class="settings-tab" />
          <q-tab name="shifts" label="Shifts" class="settings-tab" />
          <q-tab name="departments" label="Departments" class="settings-tab" />
          <q-tab name="positions" label="Positions" class="settings-tab" />
          <q-tab name="contract-types" label="Contract Types" class="settings-tab" />
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
                    <q-th class="table-header-cell">Logo</q-th>
                    <q-th class="table-header-cell">Company Name</q-th>
                    <q-th class="table-header-cell actions-header">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
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
                    <q-td class="table-body-cell actions-cell">
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="viewCompany(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="visibility" size="16px"
                              /></q-item-section>
                              <q-item-section>View Details</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="editCompany(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="edit" size="16px"
                              /></q-item-section>
                              <q-item-section>Edit Company</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item dropdown-item-danger"
                              @click="deleteCompany(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="delete" size="16px" color="negative"
                              /></q-item-section>
                              <q-item-section>Delete</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
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
                    <q-th class="table-header-cell">Site Name</q-th>
                    <q-th class="table-header-cell">Address</q-th>
                    <q-th class="table-header-cell">Ownership</q-th>
                    <q-th class="table-header-cell">Status</q-th>
                    <q-th class="table-header-cell actions-header">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell">
                      <span class="item-name">{{ props.row.name || 'N/A' }}</span>
                    </q-td>
                    <q-td class="table-body-cell">{{ props.row.location || 'N/A' }}</q-td>
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
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="viewSite(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="visibility" size="16px"
                              /></q-item-section>
                              <q-item-section>View Details</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="editSite(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="edit" size="16px"
                              /></q-item-section>
                              <q-item-section>Edit Site</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item dropdown-item-danger"
                              @click="deleteSite(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="delete" size="16px" color="negative"
                              /></q-item-section>
                              <q-item-section>Delete</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
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
                <h2 class="table-title">Permissions</h2>
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
                    <q-th class="table-header-cell">Role Name</q-th>
                    <q-th class="table-header-cell">Permissions</q-th>
                    <q-th class="table-header-cell actions-header">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
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
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="viewRole(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="visibility" size="16px"
                              /></q-item-section>
                              <q-item-section>View Details</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="editRole(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="edit" size="16px"
                              /></q-item-section>
                              <q-item-section>Edit Role</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item dropdown-item-danger"
                              @click="deleteRole(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="delete" size="16px" color="negative"
                              /></q-item-section>
                              <q-item-section>Delete</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== SHIFTS ===================== -->
        <q-tab-panel name="shifts" class="q-pa-none">
          <!-- Shift Sub-Tabs -->
          <div class="subtabs-wrapper">
            <q-tabs
              v-model="shiftSubTab"
              dense
              class="settings-tabs"
              active-color="primary"
              indicator-color="primary"
              align="left"
            >
              <q-tab name="shift-types" label="Shift Template" class="settings-tab" />
              <q-tab name="weekly-templates" label="Weekly Shift Templates" class="settings-tab" />
            </q-tabs>
          </div>

          <q-tab-panels v-model="shiftSubTab" animated class="transparent-panels">
            <!-- ---- Shift Template ---- -->
            <q-tab-panel name="shift-types" class="q-pa-none">
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title-section">
                    <h2 class="table-title">Shift Templates</h2>
                    <p class="table-subtitle">Manage shift schedule templates</p>
                  </div>
                  <div class="table-actions">
                    <q-btn
                      color="primary"
                      label="Add Shift Template"
                      icon="add"
                      class="add-btn"
                      @click="openShiftTypeTemplateDialog"
                    />
                  </div>
                </div>

                <div class="modern-table-container">
                  <q-table
                    :rows="shiftTypeTemplates"
                    :columns="recurringColumns"
                    row-key="id"
                    :loading="loadingShiftTypeTemplates"
                    flat
                    no-data-label="No shift templates found"
                    class="settings-table"
                    hide-pagination
                    :rows-per-page-options="[0]"
                  >
                    <template v-slot:header>
                      <q-tr class="table-header-row">
                        <q-th class="table-header-cell" style="width: 40%">Name</q-th>
                        <q-th class="table-header-cell text-center" style="width: 30%"
                          >Shift Times</q-th
                        >
                        <q-th class="table-header-cell text-center" style="width: 15%"
                          >Total Hours</q-th
                        >
                        <q-th
                          class="table-header-cell text-center actions-header"
                          style="width: 15%; text-align: center !important"
                          >Actions</q-th
                        >
                      </q-tr>
                    </template>
                    <template v-slot:body="props">
                      <q-tr class="table-body-row">
                        <q-td class="table-body-cell" style="width: 40%">
                          <span class="item-name">{{ props.row.name }}</span>
                        </q-td>

                        <q-td class="table-body-cell text-center" style="width: 30%">
                          <div
                            v-if="props.row.shifts_detail && props.row.shifts_detail.length"
                            class="shifts-time-list"
                          >
                            <div
                              v-for="(shift, idx) in props.row.shifts_detail"
                              :key="idx"
                              class="shift-time-item"
                            >
                              {{ formatTimeDisplay(shift.start_time) }} -
                              {{ formatTimeDisplay(shift.end_time) }}
                            </div>
                          </div>
                          <span v-else>—</span>
                        </q-td>

                        <q-td class="table-body-cell text-center" style="width: 15%">
                          {{ calculateTotalHoursFromRow(props.row) }} hrs
                        </q-td>

                        <q-td class="table-body-cell text-center" style="width: 15%">
                          <div class="flex justify-center items-center full-width">
                            <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                              <q-menu
                                anchor="bottom right"
                                self="top right"
                                class="action-dropdown"
                              >
                                <q-list dense style="min-width: 150px">
                                  <q-item
                                    clickable
                                    v-close-popup
                                    class="dropdown-item"
                                    @click="editShiftTypeTemplate(props.row)"
                                  >
                                    <q-item-section side
                                      ><q-icon name="edit" size="16px"
                                    /></q-item-section>
                                    <q-item-section>Edit</q-item-section>
                                  </q-item>
                                  <q-item
                                    clickable
                                    v-close-popup
                                    class="dropdown-item dropdown-item-danger"
                                    @click="deleteShiftTypeTemplate(props.row)"
                                  >
                                    <q-item-section side
                                      ><q-icon name="delete" size="16px" color="negative"
                                    /></q-item-section>
                                    <q-item-section>Delete</q-item-section>
                                  </q-item>
                                </q-list>
                              </q-menu>
                            </q-btn>
                          </div>
                        </q-td>
                      </q-tr>
                    </template>
                  </q-table>
                </div>
              </div>
            </q-tab-panel>

            <!-- ---- Weekly Shift Templates ---- -->
            <q-tab-panel name="weekly-templates" class="q-pa-none">
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title-section">
                    <h2 class="table-title">Weekly Shift Templates</h2>
                    <p class="table-subtitle">Manage shift type templates for weekly scheduling</p>
                  </div>
                  <div class="table-actions">
                    <q-btn
                      color="primary"
                      label="Add Template"
                      icon="add"
                      class="add-btn"
                      @click="openWeeklyTemplateDialog"
                    />
                  </div>
                </div>

                <div class="modern-table-container">
                  <q-table
                    :rows="weeklyShiftTemplates"
                    :columns="weeklyTemplateColumns"
                    row-key="id"
                    :loading="loadingWeeklyTemplates"
                    flat
                    no-data-label="No weekly shift templates found"
                    class="settings-table"
                    hide-pagination
                    :rows-per-page-options="[0]"
                  >
                    <template v-slot:header>
                      <q-tr class="table-header-row">
                        <q-th class="table-header-cell">Name</q-th>
                        <q-th class="table-header-cell">Rules</q-th>
                        <q-th class="table-header-cell">Created</q-th>
                        <q-th class="table-header-cell actions-header">Actions</q-th>
                      </q-tr>
                    </template>
                    <template v-slot:body="props">
                      <q-tr class="table-body-row">
                        <q-td class="table-body-cell">
                          <span class="item-name">{{ props.row.name }}</span>
                        </q-td>
                        <q-td class="table-body-cell">
                          {{
                            Array.isArray(props.row.rules) ? props.row.rules.length + ' rules' : ''
                          }}
                        </q-td>
                        <q-td class="table-body-cell">
                          {{
                            props.row.created_at
                              ? new Date(props.row.created_at).toLocaleDateString()
                              : ''
                          }}
                        </q-td>
                        <q-td class="table-body-cell actions-cell">
                          <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                            <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                              <q-list dense style="min-width: 150px">
                                <q-item
                                  clickable
                                  v-close-popup
                                  class="dropdown-item"
                                  @click="editWeeklyTemplate(props.row)"
                                >
                                  <q-item-section side
                                    ><q-icon name="edit" size="16px"
                                  /></q-item-section>
                                  <q-item-section>Edit</q-item-section>
                                </q-item>
                                <q-item
                                  clickable
                                  v-close-popup
                                  class="dropdown-item dropdown-item-danger"
                                  @click="deleteWeeklyTemplate(props.row)"
                                >
                                  <q-item-section side
                                    ><q-icon name="delete" size="16px" color="negative"
                                  /></q-item-section>
                                  <q-item-section>Delete</q-item-section>
                                </q-item>
                              </q-list>
                            </q-menu>
                          </q-btn>
                        </q-td>
                      </q-tr>
                    </template>
                  </q-table>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
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
                    <q-th class="table-header-cell">Department Name</q-th>
                    <q-th class="table-header-cell">Description</q-th>
                    <q-th class="table-header-cell">Date Created</q-th>
                    <q-th class="table-header-cell actions-header">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell">
                      <span class="item-name">{{ props.row.name || 'N/A' }}</span>
                    </q-td>
                    <q-td class="table-body-cell">{{ props.row.description || 'N/A' }}</q-td>
                    <q-td class="table-body-cell">{{ formatDate(props.row.date_created) }}</q-td>
                    <q-td class="table-body-cell actions-cell">
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="viewDepartment(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="visibility" size="16px"
                              /></q-item-section>
                              <q-item-section>View Details</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="editDepartment(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="edit" size="16px"
                              /></q-item-section>
                              <q-item-section>Edit Department</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item dropdown-item-danger"
                              @click="deleteDepartment(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="delete" size="16px" color="negative"
                              /></q-item-section>
                              <q-item-section>Delete</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
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
                    <q-th class="table-header-cell">Position Title</q-th>
                    <q-th class="table-header-cell">Department</q-th>
                    <q-th class="table-header-cell">Description</q-th>
                    <q-th class="table-header-cell actions-header">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell">
                      <span class="item-name">{{
                        props.row.title || props.row.name || 'N/A'
                      }}</span>
                    </q-td>
                    <q-td class="table-body-cell">{{ props.row.department_name || 'N/A' }}</q-td>
                    <q-td class="table-body-cell">{{ props.row.description || 'N/A' }}</q-td>
                    <q-td class="table-body-cell actions-cell">
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="viewPosition(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="visibility" size="16px"
                              /></q-item-section>
                              <q-item-section>View Details</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="editPosition(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="edit" size="16px"
                              /></q-item-section>
                              <q-item-section>Edit Position</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item dropdown-item-danger"
                              @click="deletePosition(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="delete" size="16px" color="negative"
                              /></q-item-section>
                              <q-item-section>Delete</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>
        </q-tab-panel>

        <!-- ===================== CONTRACT TYPES ===================== -->
        <q-tab-panel name="contract-types" class="q-pa-none">
          <div class="table-section">
            <div class="table-header">
              <div class="table-title-section">
                <h2 class="table-title">Contract Types</h2>
                <p class="table-subtitle">Manage contract type definitions</p>
              </div>
              <div class="table-actions">
                <q-btn
                  color="primary"
                  label="Add Contract Type"
                  icon="add"
                  class="add-btn"
                  @click="openContractTypeDialog"
                />
              </div>
            </div>

            <div class="modern-table-container">
              <q-table
                :rows="contractTypeDefinitions"
                :columns="contractTypeColumns"
                row-key="id"
                :loading="loadingContractTypes"
                flat
                no-data-label="No contract types found"
                class="settings-table"
                hide-pagination
                :rows-per-page-options="[0]"
              >
                <template v-slot:header>
                  <q-tr class="table-header-row">
                    <q-th class="table-header-cell">Name</q-th>
                    <q-th class="table-header-cell">Eligibilities</q-th>
                    <q-th class="table-header-cell actions-header">Actions</q-th>
                  </q-tr>
                </template>
                <template v-slot:body="props">
                  <q-tr class="table-body-row">
                    <q-td class="table-body-cell">
                      <span class="item-name">{{ props.row.name }}</span>
                    </q-td>
                    <q-td class="table-body-cell">
                      <div class="eligibility-badges">
                        <q-chip
                          v-for="el in props.row.eligibilities"
                          :key="el"
                          size="sm"
                          color="primary"
                          text-color="white"
                        >
                          {{ getEligibilityName(el) }}
                        </q-chip>
                        <span v-if="!props.row.eligibilities?.length" class="text-grey">None</span>
                      </div>
                    </q-td>
                    <q-td class="table-body-cell actions-cell">
                      <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                        <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                          <q-list dense style="min-width: 150px">
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item"
                              @click="editContractType(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="edit" size="16px"
                              /></q-item-section>
                              <q-item-section>Edit</q-item-section>
                            </q-item>
                            <q-item
                              clickable
                              v-close-popup
                              class="dropdown-item dropdown-item-danger"
                              @click="deleteContractType(props.row)"
                            >
                              <q-item-section side
                                ><q-icon name="delete" size="16px" color="negative"
                              /></q-item-section>
                              <q-item-section>Delete</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>
          </div>

          <!-- Contract Type Dialog -->
          <q-dialog v-model="contractTypeDialog" persistent>
            <q-card class="admin-modal-card">
              <q-card-section class="admin-modal-header">
                <div class="modal-title-section">
                  <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
                    <q-icon name="description" size="22px" />
                  </q-avatar>
                  <div>
                    <div class="admin-modal-title">
                      {{ editingContractType ? 'Edit' : 'Add' }} Contract Type
                    </div>
                    <div class="admin-modal-subtitle">Manage contract type definitions</div>
                  </div>
                </div>
                <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
              </q-card-section>

              <q-card-section class="admin-modal-content">
                <q-input
                  v-model="contractTypeForm.name"
                  label="Name *"
                  outlined
                  dense
                  class="q-mb-md"
                />
                <q-select
                  v-model="contractTypeForm.eligibilities"
                  :options="eligibilityOptions"
                  label="Eligibilities"
                  outlined
                  dense
                  multiple
                  use-chips
                  emit-value
                  map-options
                />
              </q-card-section>

              <q-card-actions align="right" class="admin-modal-footer">
                <q-btn flat label="Cancel" color="grey-7" v-close-popup />
                <q-btn
                  color="primary"
                  label="Save"
                  :loading="savingContractType"
                  @click="saveContractType"
                />
              </q-card-actions>
            </q-card>
          </q-dialog>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- ===================== COMPANY DIALOG ===================== -->
    <q-dialog v-model="companyDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
              <q-icon name="business" size="22px" />
            </q-avatar>
            <div>
              <div class="admin-modal-title">
                {{ editingCompany ? 'Edit Company' : 'Add Company' }}
              </div>
              <div class="admin-modal-subtitle">Manage company information and branding</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>

        <q-card-section class="admin-modal-content q-gutter-md">
          <q-input v-model="companyForm.name" label="Company Name *" outlined dense />

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

        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
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
      <q-card class="admin-modal-card" style="max-width: 620px; width: 620px">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
              <q-icon name="location_on" size="22px" />
            </q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingSite ? 'Edit Site' : 'Add Site' }}</div>
              <div class="admin-modal-subtitle">Manage site locations and configurations</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>

        <q-card-section class="admin-modal-content">
          <!-- Section: Basic Info -->
          <div class="form-section-label">Basic Information</div>
          <div class="row q-col-gutter-md q-mb-sm">
            <div class="col-12">
              <q-input v-model="siteForm.name" label="Site Name *" outlined dense>
                <template v-slot:prepend><q-icon name="business" size="18px" /></template>
              </q-input>
            </div>
            <div class="col-12">
              <q-input v-model="siteForm.brand_name" label="Brand Name" outlined dense>
                <template v-slot:prepend><q-icon name="label" size="18px" /></template>
              </q-input>
            </div>
          </div>

          <!-- Section: Location -->
          <div class="form-section-label">Location Details</div>
          <div class="row q-col-gutter-md q-mb-sm">
            <div class="col-12">
              <q-input
                v-model="siteForm.location"
                label="Location / Address *"
                outlined
                dense
                :loading="mapSearchLoading"
                @update:model-value="onLocationInput"
              >
                <template v-slot:prepend><q-icon name="map" size="18px" /></template>
                <template v-slot:hint>Type an address to auto-pin on the map</template>
              </q-input>
            </div>
            <!-- Hidden lat/lng — bound to form but not shown in UI -->
            <input type="hidden" v-model="siteForm.latitude" />
            <input type="hidden" v-model="siteForm.longitude" />

            <!-- Map Picker (auto-shows when location is geocoded) -->
            <div class="col-12" v-show="showSiteMap">
              <div class="map-picker-wrapper">
                <div v-if="siteForm.latitude && siteForm.longitude" class="map-picker-toggle-row">
                  <span class="map-coords-hint">
                    📍 {{ Number(siteForm.latitude).toFixed(6) }},
                    {{ Number(siteForm.longitude).toFixed(6) }}
                  </span>
                </div>
                <div class="site-map-wrapper">
                  <div ref="siteMapContainer" class="site-map-container" />
                </div>
              </div>
            </div>
            <div class="col-6">
              <q-input
                v-model.number="siteForm.radius_meters"
                label="Radius (meters)"
                type="number"
                outlined
                dense
              >
                <template v-slot:prepend
                  ><q-icon name="radio_button_unchecked" size="18px"
                /></template>
              </q-input>
            </div>
            <div class="col-6">
              <q-select
                v-model="siteForm.ownership_type"
                :options="ownershipOptions"
                label="Ownership Type"
                outlined
                dense
              >
                <template v-slot:prepend><q-icon name="home_work" size="18px" /></template>
              </q-select>
            </div>
          </div>

          <!-- Section: Settings / Toggles -->
          <div class="form-section-label">Site Settings</div>
          <div class="toggles-grid q-mb-sm">
            <div class="toggle-item">
              <q-toggle v-model="siteForm.is_active" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Active</span>
                <span class="toggle-hint">Site is currently operational</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle v-model="siteForm.requires_otp" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Requires OTP</span>
                <span class="toggle-hint">Enable OTP verification</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle v-model="siteForm.allow_manual_attendance" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Manual Attendance</span>
                <span class="toggle-hint">Allow manual clock-in/out</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle v-model="siteForm.allow_service_charge" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Service Charge</span>
                <span class="toggle-hint">Include service charge</span>
              </div>
            </div>
            <div class="toggle-item">
              <q-toggle v-model="siteForm.multiply_nd_by_holiday" color="primary" />
              <div class="toggle-label-group">
                <span class="toggle-label">Multiply ND by Holiday</span>
                <span class="toggle-hint">Apply holiday multiplier</span>
              </div>
            </div>
          </div>

          <!-- Section: Extended Shift Days -->
          <div class="form-section-label">Additional</div>
          <div class="row q-mb-md">
            <div class="col-12">
              <q-input
                v-model="siteForm.extended_shift_days"
                label="Extended Shift Days"
                outlined
                dense
                placeholder="e.g. Mon,Tue,Wed"
              >
                <template v-slot:prepend><q-icon name="date_range" size="18px" /></template>
                <template v-slot:hint>Comma-separated days for extended shifts</template>
              </q-input>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            color="primary"
            :label="editingSite ? 'Update Site' : 'Save Site'"
            :loading="savingSite"
            @click="saveSite"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== ROLE DIALOG ===================== -->
    <q-dialog v-model="roleDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
              <q-icon name="admin_panel_settings" size="22px" />
            </q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingRole ? 'Edit Role' : 'Add Role' }}</div>
              <div class="admin-modal-subtitle">Manage user roles and permissions</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="roleForm.name" label="Role Name *" outlined dense class="q-mb-lg" />

          <div class="text-subtitle2 q-mb-xs">Permissions</div>
          <q-separator class="q-mb-md" />

          <div class="row">
            <div v-for="perm in permissionFields" :key="perm.key" class="col-6 q-mb-sm">
              <q-checkbox v-model="roleForm[perm.key]" :label="perm.label" dense />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            color="primary"
            :label="editingRole ? 'Update Role' : 'Save Role'"
            :loading="savingRole"
            @click="saveRole"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== WEEKLY SHIFT TEMPLATE DIALOG ===================== -->
    <q-dialog v-model="weeklyTemplateDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
              <q-icon name="date_range" size="22px" />
            </q-avatar>
            <div>
              <div class="admin-modal-title">
                {{
                  editingWeeklyTemplate ? 'Edit Weekly Shift Template' : 'Add Weekly Shift Template'
                }}
              </div>
              <div class="admin-modal-subtitle">Configure weekly shift assignments</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>

        <q-card-section class="admin-modal-content">
          <!-- Name -->
          <q-input
            v-model="weeklyTemplateForm.name"
            label="Template Name *"
            outlined
            dense
            class="q-mb-md"
          />

          <!-- Weekly Rules -->
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Weekly Shift Rules</div>
            <div
              v-for="rule in weeklyTemplateForm.rules"
              :key="rule.weekday"
              class="row q-col-gutter-sm q-mb-sm items-center"
            >
              <div class="col-3">
                <q-chip dense color="blue-1" text-color="blue-8" :label="rule.weekday" />
              </div>
              <div class="col-9">
                <q-select
                  v-model="rule.shift_template"
                  :options="shiftTypeTemplates"
                  option-value="id"
                  option-label="name"
                  emit-value
                  map-options
                  label="Shift Template"
                  outlined
                  dense
                  clearable
                />
              </div>
            </div>
          </div>

          <!-- Active -->
          <div class="q-mb-md">
            <q-toggle v-model="weeklyTemplateForm.is_active" label="Active" color="primary" />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            color="primary"
            label="Save"
            :loading="savingWeeklyTemplate"
            @click="saveWeeklyTemplate"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== SHIFT TEMPLATE DIALOG ===================== -->
    <q-dialog v-model="shiftTypeTemplateDialog" persistent>
      <q-card class="admin-modal-card" style="max-width: 720px; width: 720px">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
              <q-icon name="schedule" size="22px" />
            </q-avatar>
            <div>
              <div class="admin-modal-title">
                {{ editingShiftTypeTemplate ? 'Edit Shift Template' : 'Add Shift Template' }}
              </div>
              <div class="admin-modal-subtitle">Define shift schedules and timings</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <!-- Template Name -->
          <q-input
            v-model="shiftTypeTemplateForm.name"
            label="Template Name"
            outlined
            dense
            class="q-mb-md"
          />

          <!-- Shifts List -->
          <div class="text-subtitle2 q-mb-sm">Shifts *</div>
          <div
            v-for="(shift, index) in shiftTypeTemplateForm.shifts"
            :key="index"
            class="row q-col-gutter-sm q-mb-md items-start"
          >
            <div class="col-4">
              <q-select
                v-model="shift.site_id"
                :options="sites"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                label="Site *"
                outlined
                dense
                clearable
              />
            </div>
            <div class="col-3">
              <q-input
                v-model="shift.default_start_time"
                label="Start Time *"
                type="time"
                outlined
                dense
                @update:model-value="updateCalculations()"
              />
            </div>
            <div class="col-3">
              <q-input
                v-model="shift.default_end_time"
                label="End Time *"
                type="time"
                outlined
                dense
                @update:model-value="updateCalculations()"
              />
            </div>
            <div class="col-2 flex items-center justify-end">
              <q-btn
                v-if="shiftTypeTemplateForm.shifts.length > 1"
                flat
                round
                dense
                color="negative"
                icon="delete"
                @click="deleteShift(index)"
              />
            </div>
          </div>

          <!-- Add Shift Button -->
          <q-btn
            flat
            color="primary"
            icon="add"
            label="Add Shift"
            class="q-mb-md"
            @click="addShift()"
          />
        </q-card-section>

        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            color="primary"
            :label="editingShiftTypeTemplate ? 'Update' : 'Save'"
            :loading="savingShiftTypeTemplate"
            @click="saveShiftTypeTemplate"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== DEPARTMENT DIALOG ===================== -->
    <q-dialog v-model="departmentDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
              <q-icon name="corporate_fare" size="22px" />
            </q-avatar>
            <div>
              <div class="admin-modal-title">
                {{ editingDepartment ? 'Edit Department' : 'Add Department' }}
              </div>
              <div class="admin-modal-subtitle">Manage department information</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="departmentForm.name" label="Department Name *" outlined dense />
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
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
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add">
              <q-icon name="work" size="22px" />
            </q-avatar>
            <div>
              <div class="admin-modal-title">
                {{ editingPosition ? 'Edit Position' : 'Add Position' }}
              </div>
              <div class="admin-modal-subtitle">Manage job positions</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
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
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            color="primary"
            :label="editingPosition ? 'Update' : 'Save'"
            :loading="savingPosition"
            @click="savePosition"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'

import { useAdminCompanies } from '@/composables/admin/useAdminCompanies'
import { useAdminSites } from '@/composables/admin/useAdminSites'
import { useAdminRoles } from '@/composables/admin/useAdminRoles'
import { useAdminShifts } from '@/composables/admin/useAdminShifts'
import { useAdminDepartments } from '@/composables/admin/useAdminDepartments'
import { useAdminPositions } from '@/composables/admin/useAdminPositions'
import { useAdminContractTypes } from '@/composables/admin/useAdminContractTypes'

// ─── Shared Quasar instance ───────────────────────────────────────────────
const $q = useQuasar()

// ─── Page state ───────────────────────────────────────────────────────────
const activeTab = ref('companies')
const shiftSubTab = ref('shift-types')
const searchQuery = ref('')

// ─── Composables ──────────────────────────────────────────────────────────

// Companies
const {
  companies,
  loading: loadingCompanies,
  saving: savingCompany,
  dialog: companyDialog,
  editing: editingCompany,
  form: companyForm,
  logoUploadMethod,
  logoFile,
  logoPreview,
  fetchCompanies,
  openDialog: openCompanyDialog,
  openEditDialog: editCompany,
  onLogoFileSelected,
  clearLogoFile,
  clearLogoUrl,
  onFileRejected,
  handleImageError,
  saveCompany,
  deleteCompany,
} = useAdminCompanies()

// Sites
const {
  sites,
  loading: loadingSites,
  saving: savingSite,
  dialog: siteDialog,
  editing: editingSite,
  form: siteForm,
  fetchSites,
  openDialog: openSiteDialog,
  openEditDialog: editSite,
  saveSite,
  deleteSite,
} = useAdminSites()

// ─── Leaflet Map Picker (Sites) ────────────────────────────────────────────
const showSiteMap = ref(false)
const siteMapContainer = ref(null)
let leafletMap = null
let leafletMarker = null
let leafletLoaded = false

const mapSearchLoading = ref(false)
let locationDebounceTimer = null

async function loadLeaflet() {
  if (leafletLoaded) return
  // Inject Leaflet CSS
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }
  // Inject Leaflet JS
  if (!window.L) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
  leafletLoaded = true
}

async function initSiteMap() {
  await loadLeaflet()
  await nextTick()
  if (!siteMapContainer.value) return

  // Destroy previous instance
  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
    leafletMarker = null
  }

  // Default center: Philippines (or existing coords)
  const lat = parseFloat(siteForm.value?.latitude) || 14.5995
  const lng = parseFloat(siteForm.value?.longitude) || 120.9842

  leafletMap = window.L.map(siteMapContainer.value).setView([lat, lng], 13)

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(leafletMap)

  // If existing coords, place marker
  if (siteForm.value?.latitude && siteForm.value?.longitude) {
    leafletMarker = window.L.marker([lat, lng], { draggable: true }).addTo(leafletMap)
    leafletMarker.bindPopup('📍 Site Location').openPopup()
    leafletMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng()
      siteForm.value.latitude = pos.lat.toFixed(7)
      siteForm.value.longitude = pos.lng.toFixed(7)
    })
  }

  // Click to set/move marker
  leafletMap.on('click', (e) => {
    const { lat: clickLat, lng: clickLng } = e.latlng
    siteForm.value.latitude = clickLat.toFixed(7)
    siteForm.value.longitude = clickLng.toFixed(7)
    if (leafletMarker) {
      leafletMarker.setLatLng([clickLat, clickLng])
    } else {
      leafletMarker = window.L.marker([clickLat, clickLng], { draggable: true }).addTo(leafletMap)
      leafletMarker.bindPopup('📍 Site Location').openPopup()
      leafletMarker.on('dragend', (ev) => {
        const pos = ev.target.getLatLng()
        siteForm.value.latitude = pos.lat.toFixed(7)
        siteForm.value.longitude = pos.lng.toFixed(7)
      })
    }
    leafletMarker.bindPopup(`📍 ${clickLat.toFixed(5)}, ${clickLng.toFixed(5)}`).openPopup()
  })

  // Fix tile rendering after map becomes visible
  setTimeout(() => leafletMap && leafletMap.invalidateSize(), 300)
}

function onLocationInput(value) {
  clearTimeout(locationDebounceTimer)
  if (!value || value.trim().length < 3) return
  locationDebounceTimer = setTimeout(async () => {
    mapSearchLoading.value = true
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const data = await res.json()
      if (!data.length) return
      const result = data[0]
      const lat = parseFloat(result.lat)
      const lng = parseFloat(result.lon)
      siteForm.value.latitude = lat.toFixed(7)
      siteForm.value.longitude = lng.toFixed(7)

      // Auto-show the map on first geocode result
      if (!showSiteMap.value) {
        showSiteMap.value = true
        await initSiteMap()
      }

      if (leafletMap) {
        leafletMap.setView([lat, lng], 16)
        if (leafletMarker) {
          leafletMarker.setLatLng([lat, lng])
        } else {
          leafletMarker = window.L.marker([lat, lng], { draggable: true }).addTo(leafletMap)
          leafletMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng()
            siteForm.value.latitude = pos.lat.toFixed(7)
            siteForm.value.longitude = pos.lng.toFixed(7)
          })
        }
        leafletMarker.bindPopup(`📍 ${result.display_name}`).openPopup()
      }
    } catch (e) {
      console.error('Geocode error:', e)
    } finally {
      mapSearchLoading.value = false
    }
  }, 600)
}

// Reset map state when dialog closes
watch(siteDialog, (val) => {
  if (!val) {
    showSiteMap.value = false
    clearTimeout(locationDebounceTimer)
    mapSearchLoading.value = false
    if (leafletMap) {
      leafletMap.remove()
      leafletMap = null
      leafletMarker = null
    }
  }
})

// Roles
const {
  roles,
  loading: loadingRoles,
  saving: savingRole,
  dialog: roleDialog,
  editing: editingRole,
  form: roleForm,
  permissionFields,
  getActivePermissions,
  fetchRoles,
  openDialog: openRoleDialog,
  openEditDialog: editRole,
  saveRole,
  deleteRole,
} = useAdminRoles()

// Shifts + Shift Templates + Weekly Templates
const {
  shiftTypeTemplates,
  weeklyShiftTemplates,
  loadingShiftTypeTemplates,
  savingShiftTypeTemplate,
  loadingWeeklyTemplates,
  savingWeeklyTemplate,
  shiftTypeTemplateDialog,
  editingShiftTypeTemplate,
  shiftTypeTemplateForm,
  weeklyTemplateDialog,
  weeklyTemplateForm,
  editingWeeklyTemplate,
  fetchShiftTemplates,
  fetchShiftTypeTemplates,
  fetchWeeklyShiftTemplates,
  openShiftTypeTemplateDialog,
  openEditShiftTypeTemplateDialog: editShiftTypeTemplate,
  saveShiftTypeTemplate,
  deleteShiftTypeTemplate,
  openWeeklyTemplateDialog,
  openEditWeeklyTemplateDialog: editWeeklyTemplate,
  saveWeeklyTemplate,
  deleteWeeklyTemplate,
} = useAdminShifts()

// Departments
const {
  departments,
  loading: loadingDepartments,
  saving: savingDepartment,
  dialog: departmentDialog,
  editing: editingDepartment,
  form: departmentForm,
  fetchDepartments,
  openDialog: openDepartmentDialog,
  openEditDialog: editDepartment,
  saveDepartment,
  deleteDepartment,
} = useAdminDepartments()

// Positions
const {
  positions,
  loading: loadingPositions,
  saving: savingPosition,
  dialog: positionDialog,
  editing: editingPosition,
  form: positionForm,
  fetchPositions,
  openDialog: openPositionDialog,
  openEditDialog: editPosition,
  savePosition,
  deletePosition,
} = useAdminPositions()

// Contract Types (definitions)
const {
  contractTypes: contractTypeDefinitions,
  eligibilities,
  loading: loadingContractTypes,
  saving: savingContractType,
  dialog: contractTypeDialog,
  editing: editingContractType,
  form: contractTypeForm,
  fetchContractTypes: fetchContractTypeDefs,
  fetchEligibilities,
  openDialog: openContractTypeDialog,
  editContractType,
  saveContractType,
  deleteContractType,
} = useAdminContractTypes()

// Local employees list (shared by contracts)
const employees = ref([])
async function fetchEmployees() {
  // Contracts composable delegates employee fetching back to here since
  // employees are also used elsewhere on the page.
  try {
    const { api } = await import('src/boot/axios')
    const { authHeaders, BASE } = await import('@/composables/utils/http')
    const { useCompany } = await import('@/composables/page/useCompany')
    const { companyId } = useCompany()
    if (!companyId.value) return
    const res = await api.get(`${BASE}/user/companies/${companyId.value}/employees/`, {
      params: { company: companyId.value },
      headers: authHeaders(),
    })
    employees.value = res.data.data ?? res.data ?? []
  } catch (e) {
    console.error('Error fetching employees:', e)
  }
}

// ─── view* aliases (view → opens edit dialog) ─────────────────────────────
const viewCompany = (r) => editCompany(r)
const viewSite = (r) => editSite(r)
const viewRole = (r) => editRole(r)
const viewDepartment = (r) => editDepartment(r)
const viewPosition = (r) => editPosition(r)

// ─── Shift Template helpers ────────────────────────────────────────────────
function calculateShiftDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0

  const start = new Date(`2000-01-01T${startTime}`)
  let end = new Date(`2000-01-01T${endTime}`)

  // Handle midnight crossover (e.g., 10:00 PM to 02:00 AM)
  if (end < start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  }

  const durationMs = end - start
  return durationMs / (1000 * 60 * 60) // Convert to hours
}

function calculateWorkingHours() {
  const form = shiftTypeTemplateForm.value
  if (!form.shifts || !form.shifts.length) return 0

  let totalWorkingHours = 0

  for (const shift of form.shifts) {
    const duration = calculateShiftDuration(shift.default_start_time, shift.default_end_time)
    totalWorkingHours += duration
  }

  return Math.round(totalWorkingHours * 10) / 10
}

function calculateBreakHours() {
  const form = shiftTypeTemplateForm.value
  if (!form.shifts || !form.shifts.length) {
    form.break_hours = 0
    return 0
  }

  // Single shift logic
  if (form.shifts.length === 1) {
    const workingHours = calculateWorkingHours()
    // Single shift 9+ hours gets 1 hour break auto-deducted
    if (workingHours >= 9) {
      form.break_hours = 1
      return 1
    }
    // Single shift 8 hours or less = no break
    form.break_hours = 0
    return 0
  }

  // Dual/Multiple shift logic
  let totalBreakMinutes = 0

  for (let i = 1; i < form.shifts.length; i++) {
    const prevShift = form.shifts[i - 1]
    const currentShift = form.shifts[i]

    // Different sites = no break (travel time)
    if (prevShift.site_id !== currentShift.site_id) {
      continue
    }

    // Same site with gap = break time
    if (prevShift.default_end_time && currentShift.default_start_time) {
      let prevEnd = new Date(`2000-01-01T${prevShift.default_end_time}`)
      let currStart = new Date(`2000-01-01T${currentShift.default_start_time}`)

      // Handle midnight crossover for break calculation too
      if (currStart < prevEnd) {
        currStart = new Date(currStart.getTime() + 24 * 60 * 60 * 1000)
      }

      const breakMinutes = (currStart - prevEnd) / (1000 * 60)
      if (breakMinutes > 0) totalBreakMinutes += breakMinutes
    }
  }

  const breakHours = totalBreakMinutes / 60
  form.break_hours = Math.round(breakHours * 10) / 10 // Store 1 decimal
  return form.break_hours
}

function calculateTotalHours() {
  const form = shiftTypeTemplateForm.value
  if (!form.shifts || !form.shifts.length) return 0

  // Total Hours = Working Hours - Break Hours
  // (Shows actual billable/working hours after break deduction)
  const workingHours = calculateWorkingHours()
  const breakHours = calculateBreakHours()
  const totalHours = workingHours - breakHours

  form.total_hours = Math.round(totalHours * 10) / 10 // Store 1 decimal
  return form.total_hours
}

function updateCalculations() {
  calculateWorkingHours()
  calculateBreakHours()
  calculateTotalHours()
}

function deleteShift(index) {
  shiftTypeTemplateForm.value.shifts.splice(index, 1)
  updateCalculations()
}

function addShift() {
  shiftTypeTemplateForm.value.shifts.push({
    site_id: null,
    default_start_time: '',
    default_end_time: '',
  })
  updateCalculations()
}

// Parse shifts from API (handles both string and array)
function parseShifts(shiftsData) {
  if (!shiftsData) return []

  if (Array.isArray(shiftsData)) {
    return shiftsData
  }

  if (typeof shiftsData === 'string') {
    try {
      return JSON.parse(shiftsData)
    } catch {
      return []
    }
  }

  return []
}

// Format time from 24h format (HH:mm:ss) to 12h format (h:mm AM/PM)
function formatTimeDisplay(timeString) {
  if (!timeString) return ''

  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12

  return `${hour12}:${minutes} ${ampm}`
}

// ─── Utility helpers ──────────────────────────────────────────────────────
function formatDate(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Table column definitions ─────────────────────────────────────────────
const ownershipOptions = ['owned', 'leased', 'partnership']

const companyColumns = [
  { name: 'name', label: 'Company Name', field: 'name', align: 'left', sortable: true },
  { name: 'logo', label: 'Logo', field: 'logo', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
const siteColumns = [
  { name: 'name', label: 'Site Name', field: 'name', align: 'left', sortable: true },
  { name: 'location', label: 'Location', field: 'location', align: 'left' },
  { name: 'ownership_type', label: 'Ownership', field: 'ownership_type', align: 'left' },
  { name: 'is_active', label: 'Status', field: 'is_active', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
const roleColumns = [
  { name: 'name', label: 'Role Name', field: 'name', align: 'left', sortable: true },
  { name: 'permissions', label: 'Permissions', field: 'permissions', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
const recurringColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'shift_times', label: 'Shift Times', field: 'shift_times', align: 'center' },
  { name: 'total_hours', label: 'Total Hours', field: 'total_hours', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const weeklyTemplateColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'rules', label: 'Rules', field: 'rules', align: 'left' },
  { name: 'created_at', label: 'Created', field: 'created_at', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
const departmentColumns = [
  { name: 'name', label: 'Department Name', field: 'name', align: 'left', sortable: true },
  { name: 'date_created', label: 'Date Created', field: 'date_created', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
const positionColumns = [
  { name: 'name', label: 'Position Name', field: 'name', align: 'left' },
  { name: 'description', label: 'Description', field: 'description', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const contractTypeColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'eligibilities', label: 'Eligibilities', field: 'eligibilities', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const eligibilityOptions = computed(() =>
  eligibilities.value.map((e) => ({ label: e.name, value: e.id })),
)

function getEligibilityName(id) {
  const el = eligibilities.value.find((e) => e.id === id)
  return el?.name || 'Unknown'
}

// Helper function for table display
function calculateTotalHoursFromRow(row) {
  const shifts = parseShifts(row.shifts_detail)
  if (!shifts || !shifts.length) return 0

  let totalMinutes = 0

  for (const shift of shifts) {
    if (shift.default_start_time && shift.default_end_time) {
      const start = new Date(`2000-01-01T${shift.default_start_time}`)
      let end = new Date(`2000-01-01T${shift.default_end_time}`)

      if (end < start) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
      }

      const durationMs = end - start
      totalMinutes += durationMs / (1000 * 60)
    }
  }

  let breakMinutes = 0
  if (shifts.length === 1) {
    const totalHours = totalMinutes / 60
    if (totalHours >= 9) {
      breakMinutes = 60
    }
  } else {
    for (let i = 1; i < shifts.length; i++) {
      const prevShift = shifts[i - 1]
      const currentShift = shifts[i]

      if (prevShift.site_id !== currentShift.site_id) continue

      if (prevShift.default_end_time && currentShift.default_start_time) {
        let prevEnd = new Date(`2000-01-01T${prevShift.default_end_time}`)
        let currStart = new Date(`2000-01-01T${currentShift.default_start_time}`)

        if (currStart < prevEnd) {
          currStart = new Date(currStart.getTime() + 24 * 60 * 60 * 1000)
        }

        const gapMinutes = (currStart - prevEnd) / (1000 * 60)
        if (gapMinutes > 0) breakMinutes += gapMinutes
      }
    }
  }

  const totalHours = (totalMinutes - breakMinutes) / 60
  return Math.round(totalHours * 10) / 10
}

// ─── Computed search filters ───────────────────────────────────────────────
const filteredCompanies = computed(() => {
  if (!searchQuery.value) return companies.value
  const q = searchQuery.value.toLowerCase()
  return companies.value.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      (c.contact || '').toLowerCase().includes(q),
  )
})
const filteredSites = computed(() => {
  if (!searchQuery.value) return sites.value
  const q = searchQuery.value.toLowerCase()
  return sites.value.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q) ||
      (s.ownership_type || '').toLowerCase().includes(q),
  )
})
const filteredRoles = computed(() => {
  if (!searchQuery.value) return roles.value
  const q = searchQuery.value.toLowerCase()
  return roles.value.filter((r) => (r.name || '').toLowerCase().includes(q))
})
const filteredDepartments = computed(() => {
  if (!searchQuery.value) return departments.value
  const q = searchQuery.value.toLowerCase()
  return departments.value.filter((d) => (d.name || '').toLowerCase().includes(q))
})
const filteredPositions = computed(() => {
  if (!searchQuery.value) return positions.value
  const q = searchQuery.value.toLowerCase()
  return positions.value.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q),
  )
})

// ─── onMounted ────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchCompanies()

  // Fetch sequential deps first, then parallel
  try {
    await fetchPositions()
    await fetchDepartments()
    await fetchEmployees()
    await fetchShiftTemplates()
    await fetchWeeklyShiftTemplates()

    await Promise.all([
      fetchSites(),
      fetchRoles(),
      fetchShiftTypeTemplates(),
      fetchContractTypeDefs(),
      fetchEligibilities(),
    ])
  } catch (error) {
    console.error('Error fetching data:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to load some data. Please refresh the page.',
      position: 'top',
      timeout: 5000,
    })
  }
})

watch(activeTab, async (newTab) => {
  if (newTab === 'contract-types') {
    await Promise.all([fetchContractTypeDefs(), fetchEligibilities()])
  }
})
</script>

<style scoped>
/* ============================================
   BASE LAYOUT
   ============================================ */
.admin-dashboard {
  background: #f4f6f9;
  min-height: 100vh;
  padding: 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* ============================================
   PAGE HEADER — matches EmployeesPage exactly
   ============================================ */
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

.header-left {
  flex: 1;
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

.header-search :deep(.q-field__control) {
  border-radius: 8px;
  height: 36px;
}

.search-icon {
  color: #9ca3af;
}

/* ============================================
   SITE DIALOG STYLES
   ============================================ */
.dialog-header {
  padding: 16px 20px 12px;
}

.form-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #6b7280;
  margin-bottom: 10px;
  margin-top: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid #f0f0f0;
}

.toggles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
}

.toggle-label-group {
  display: flex;
  flex-direction: column;
}

.toggle-label {
  font-size: 13px;
  font-weight: 500;
  color: #1a202c;
  line-height: 1.2;
}

.toggle-hint {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.2;
}

/* ============================================
   TABS
   ============================================ */
.tabs-wrapper {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.subtabs-wrapper {
  background: white;
  border-radius: 10px;
  border: 1px solid #e8ecf0;
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
  border: 1px solid #e8ecf0;
  overflow: hidden;
  margin-bottom: 0;
}

.table-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.table-title-section {
  flex: 1;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
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
  overflow-x: auto;
}

.settings-table {
  width: 100%;
  min-width: 700px;
}

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
  text-align: left !important;
}

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
  text-align: left !important;
}

.item-name {
  font-weight: 600;
  color: #111827;
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
  background: #f0fdf4;
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
  text-align: center !important;
  width: 60px;
}

.actions-header {
  text-align: center !important;
  width: 60px;
}

/* Force Quasar th inner span to also center */
.actions-header .q-table__sort-icon,
.actions-header span {
  text-align: center !important;
  justify-content: center !important;
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

/* Legacy icon-button actions (kept for backward compat) */
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

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.delete-btn:hover {
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
.rules-preview-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rules-preview-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

/* ============================================
   SITE MAP PICKER
   ============================================ */
.map-picker-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  background: #f8fafc;
}

.map-picker-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.map-toggle-btn {
  border-radius: 8px;
  font-weight: 500;
}

.map-coords-hint {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
}

.site-map-wrapper {
  position: relative;
  width: 100%;
}

.site-map-container {
  height: 300px;
  width: 100%;
  z-index: 0;
}

/* Ensure Leaflet popups render above q-dialog overlay */
.leaflet-pane,
.leaflet-top,
.leaflet-bottom {
  z-index: 1000 !important;
}

.q-dialog__inner .leaflet-container {
  z-index: 0;
}

/* ============================================
   ADMIN MODAL — matches EmployeesPage style
   ============================================ */
.admin-modal-card {
  border-radius: 16px !important;
  width: 560px;
  max-width: 95vw !important;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
}

.admin-modal-header {
  background: #2563eb !important;
  border-bottom: none !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 24px;
  flex-shrink: 0;
}

.admin-modal-header .modal-close-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}

.admin-modal-header .modal-close-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-icon {
  border-radius: 10px !important;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}

.admin-modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.admin-modal-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.admin-modal-content {
  padding: 20px !important;
  overflow-y: auto;
  flex: 1;
  background: #f9fafb;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}

.admin-modal-content::-webkit-scrollbar {
  width: 4px;
}

.admin-modal-content::-webkit-scrollbar-track {
  background: transparent;
}

.admin-modal-content::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

.admin-modal-content :deep(.q-field__control) {
  background: #ffffff !important;
}

.admin-modal-footer {
  padding: 12px 20px !important;
  border-top: 1px solid #e8ecf0;
  background: #ffffff;
  flex-shrink: 0;
}
</style>
