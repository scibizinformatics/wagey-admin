<template>
  <q-page class="admin-settings-page">
    <!-- Page Header -->
    <div class="page-header q-pa-lg">
      <div class="header-content">
        <div>
          <h4 class="page-title">Admin Settings</h4>
        </div>
        <q-input
          v-model="searchQuery"
          dense
          outlined
          placeholder="Search Settings"
          class="search-input"
        >
          <template v-slot:prepend>
            <q-icon name="search" size="20px" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="tabs-container q-px-lg">
      <q-tabs
        v-model="activeTab"
        dense
        class="custom-tabs"
        active-color="primary"
        indicator-color="primary"
        align="left"
      >
        <q-tab name="companies" label="Companies" class="custom-tab" />
        <q-tab name="sites" label="Sites" class="custom-tab" />
        <q-tab name="roles" label="Roles" class="custom-tab" />
        <q-tab name="departments" label="Departments" class="custom-tab" />
        <q-tab name="positions" label="Positions" class="custom-tab" />
        <q-tab name="contracts" label="Contracts" class="custom-tab" />
        <q-tab name="payslips" label="Payslips" class="custom-tab" />
      </q-tabs>
    </div>

    <!-- Tab Content -->
    <div class="page-content q-pa-lg">
      <q-tab-panels v-model="activeTab" animated class="transparent-panels">
        <!-- Companies Tab -->
        <q-tab-panel name="companies" class="q-pa-none">
          <div class="settings-section">
            <div class="section-header">
              <div>
                <h5 class="section-title">Companies</h5>
                <p class="section-description">Manage company information and branding</p>
              </div>
              <q-btn
                color="primary"
                label="Add Company"
                icon="add"
                @click="openCompanyDialog"
                unelevated
                no-caps
                class="action-btn"
              />
            </div>

            <q-card flat bordered class="settings-card">
              <q-table
                :rows="companies"
                :columns="companyColumns"
                row-key="id"
                :loading="loadingCompanies"
                flat
                :pagination="{ rowsPerPage: 10 }"
                class="custom-table"
              >
                <template v-slot:body-cell-logo="props">
                  <q-td :props="props">
                    <q-avatar v-if="props.row.logo" size="40px">
                      <img :src="props.row.logo" />
                    </q-avatar>
                    <q-icon v-else name="business" size="40px" color="grey-5" />
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      size="sm"
                      @click="editCompany(props.row)"
                    >
                      <q-tooltip>Edit</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="deleteCompany(props.row)"
                      class="q-ml-xs"
                    >
                      <q-tooltip>Delete</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Sites Tab -->
        <q-tab-panel name="sites" class="q-pa-none">
          <div class="settings-section">
            <div class="section-header">
              <div>
                <h5 class="section-title">Sites</h5>
                <p class="section-description">Manage site locations and configurations</p>
              </div>
              <q-btn
                color="primary"
                label="Add Site"
                icon="add"
                @click="openSiteDialog"
                unelevated
                no-caps
                class="action-btn"
              />
            </div>

            <q-card flat bordered class="settings-card">
              <q-table
                :rows="sites"
                :columns="siteColumns"
                row-key="id"
                :loading="loadingSites"
                flat
                :pagination="{ rowsPerPage: 10 }"
                class="custom-table"
              >
                <template v-slot:body-cell-is_active="props">
                  <q-td :props="props">
                    <q-badge
                      :color="props.row.is_active ? 'positive' : 'grey'"
                      :label="props.row.is_active ? 'Active' : 'Inactive'"
                    />
                  </q-td>
                </template>
                <template v-slot:body-cell-ownership_type="props">
                  <q-td :props="props">
                    <q-chip
                      dense
                      size="sm"
                      :color="props.row.ownership_type === 'owned' ? 'blue-1' : 'orange-1'"
                      :text-color="props.row.ownership_type === 'owned' ? 'blue-8' : 'orange-8'"
                      :label="props.row.ownership_type"
                      class="text-capitalize"
                    />
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      size="sm"
                      @click="editSite(props.row)"
                    >
                      <q-tooltip>Edit</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="deleteSite(props.row)"
                      class="q-ml-xs"
                    >
                      <q-tooltip>Delete</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Roles Tab -->
        <q-tab-panel name="roles" class="q-pa-none">
          <div class="settings-section">
            <div class="section-header">
              <div>
                <h5 class="section-title">Roles</h5>
                <p class="section-description">
                  Manage user roles and permissions across the system
                </p>
              </div>
              <q-btn
                color="primary"
                label="Add Role"
                icon="add"
                @click="openRoleDialog"
                unelevated
                no-caps
                class="action-btn"
              />
            </div>

            <q-card flat bordered class="settings-card">
              <q-table
                :rows="roles"
                :columns="roleColumns"
                row-key="id"
                :loading="loadingRoles"
                flat
                :pagination="{ rowsPerPage: 10 }"
                class="custom-table"
              >
                <template v-slot:body-cell-permissions="props">
                  <q-td :props="props">
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
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      size="sm"
                      @click="editRole(props.row)"
                    >
                      <q-tooltip>Edit</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="deleteRole(props.row)"
                      class="q-ml-xs"
                    >
                      <q-tooltip>Delete</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Positions Tab -->
        <q-tab-panel name="positions" class="q-pa-none">
          <div class="settings-section">
            <div class="section-header">
              <div>
                <h5 class="section-title">Positions</h5>
                <p class="section-description">Manage job positions and department structures</p>
              </div>
              <q-btn
                color="primary"
                label="Add Position"
                icon="add"
                @click="openPositionDialog"
                unelevated
                no-caps
                class="action-btn"
              />
            </div>

            <q-card flat bordered class="settings-card">
              <q-table
                :rows="positions"
                :columns="positionColumns"
                row-key="id"
                :loading="loadingPositions"
                flat
                :pagination="{ rowsPerPage: 10 }"
                class="custom-table"
              >
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      size="sm"
                      @click="editPosition(props.row)"
                    >
                      <q-tooltip>Edit</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="deletePosition(props.row)"
                      class="q-ml-xs"
                    >
                      <q-tooltip>Delete</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Department Tab -->
        <q-tab-panel name="departments" class="q-pa-none">
          <div class="settings-section">
            <div class="section-header">
              <div>
                <h5 class="section-title">Departments</h5>
                <p class="section-description">Manage organizational departments</p>
              </div>
              <q-btn
                color="primary"
                label="Add Department"
                icon="add"
                @click="openDepartmentDialog"
                unelevated
                no-caps
                class="action-btn"
              />
            </div>

            <q-card flat bordered class="settings-card">
              <q-table
                :rows="departments"
                :columns="departmentColumns"
                row-key="id"
                :loading="loadingDepartments"
                flat
                :pagination="{ rowsPerPage: 10 }"
                class="custom-table"
              >
                <template v-slot:body-cell-date_created="props">
                  <q-td :props="props">
                    {{ formatDate(props.row.date_created) }}
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      size="sm"
                      @click="editDepartment(props.row)"
                    >
                      <q-tooltip>Edit</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="deleteDepartment(props.row)"
                      class="q-ml-xs"
                    >
                      <q-tooltip>Delete</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Contracts Tab -->
        <q-tab-panel name="contracts" class="q-pa-none">
          <div class="settings-section">
            <div class="section-header">
              <div>
                <h5 class="section-title">Employee Contracts</h5>
                <p class="section-description">Manage employee contracts and assignments</p>
              </div>
              <q-btn
                color="primary"
                label="Create Contract"
                icon="add"
                @click="openContractDialog"
                unelevated
                no-caps
                class="action-btn"
              />
            </div>

            <q-card flat bordered class="settings-card">
              <q-table
                :rows="contracts"
                :columns="contractColumns"
                row-key="id"
                :loading="loadingContracts"
                flat
                :pagination="{ rowsPerPage: 10 }"
                class="custom-table"
              >
                <template v-slot:body-cell-employee="props">
                  <q-td :props="props">
                    {{ props.row.employee_name || 'N/A' }}
                  </q-td>
                </template>
                <template v-slot:body-cell-contract_type="props">
                  <q-td :props="props">
                    <q-chip
                      dense
                      size="sm"
                      color="blue-1"
                      text-color="blue-8"
                      :label="props.row.contract_type_name || 'N/A'"
                    />
                  </q-td>
                </template>
                <template v-slot:body-cell-status="props">
                  <q-td :props="props">
                    <q-badge
                      :color="props.row.is_acknowledged ? 'positive' : 'warning'"
                      :label="props.row.is_acknowledged ? 'Acknowledged' : 'Pending'"
                    />
                  </q-td>
                </template>
                <template v-slot:body-cell-date_created="props">
                  <q-td :props="props">
                    {{ formatDate(props.row.date_created) }}
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props">
                    <q-btn
                      v-if="props.row.pdf_url"
                      flat
                      round
                      dense
                      icon="picture_as_pdf"
                      color="red"
                      size="sm"
                      @click="viewContractPDF(props.row)"
                    >
                      <q-tooltip>View PDF</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="visibility"
                      color="primary"
                      size="sm"
                      @click="viewContract(props.row)"
                    >
                      <q-tooltip>View Details</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      size="sm"
                      @click="editContract(props.row)"
                      class="q-ml-xs"
                    >
                      <q-tooltip>Edit</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="deleteContract(props.row)"
                      class="q-ml-xs"
                    >
                      <q-tooltip>Delete</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Payslips Tab -->
        <q-tab-panel name="payslips" class="q-pa-none">
          <div class="settings-section">
            <!-- Sub-tabs for Payslip Management -->
            <q-tabs
              v-model="payslipSubTab"
              dense
              class="custom-tabs q-mb-md"
              active-color="primary"
              indicator-color="primary"
              align="left"
            >
              <q-tab name="allowance-types" label="Allowance Types" class="custom-tab" />
              <q-tab name="tax-brackets" label="Tax Brackets" class="custom-tab" />
              <q-tab name="cutoff-periods" label="Cutoff Periods" class="custom-tab" />
              <q-tab name="payroll-groups" label="Payroll Groups" class="custom-tab" />
              <q-tab name="labor-rules" label="Labor Rules" class="custom-tab" />
              <q-tab name="pay-structures" label="Pay Structures" class="custom-tab" />
            </q-tabs>

            <q-tab-panels v-model="payslipSubTab" animated class="transparent-panels">
              <!-- Allowance Types -->
              <q-tab-panel name="allowance-types" class="q-pa-none">
                <div class="section-header">
                  <div>
                    <h5 class="section-title">Allowance Types</h5>
                    <p class="section-description">Manage employee allowance types</p>
                  </div>
                  <q-btn
                    color="primary"
                    label="Add Allowance Type"
                    icon="add"
                    @click="openAllowanceTypeDialog"
                    unelevated
                    no-caps
                    class="action-btn"
                  />
                </div>
                <q-card flat bordered class="settings-card">
                  <q-table
                    :rows="allowanceTypes"
                    :columns="allowanceTypeColumns"
                    row-key="id"
                    :loading="loadingAllowanceTypes"
                    flat
                    :pagination="{ rowsPerPage: 10 }"
                    class="custom-table"
                  >
                    <template v-slot:body-cell-actions="props">
                      <q-td :props="props">
                        <q-btn
                          flat
                          round
                          dense
                          icon="edit"
                          color="primary"
                          size="sm"
                          @click="editAllowanceType(props.row)"
                        >
                          <q-tooltip>Edit</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          color="negative"
                          size="sm"
                          @click="deleteAllowanceType(props.row)"
                          class="q-ml-xs"
                        >
                          <q-tooltip>Delete</q-tooltip>
                        </q-btn>
                      </q-td>
                    </template>
                  </q-table>
                </q-card>
              </q-tab-panel>

              <!-- Tax Brackets -->
              <q-tab-panel name="tax-brackets" class="q-pa-none">
                <div class="section-header">
                  <div>
                    <h5 class="section-title">Tax Brackets</h5>
                    <p class="section-description">Configure tax brackets and rates</p>
                  </div>
                  <q-btn
                    color="primary"
                    label="Add Tax Bracket"
                    icon="add"
                    @click="openTaxBracketDialog"
                    unelevated
                    no-caps
                    class="action-btn"
                  />
                </div>
                <q-card flat bordered class="settings-card">
                  <q-table
                    :rows="taxBrackets"
                    :columns="taxBracketColumns"
                    row-key="id"
                    :loading="loadingTaxBrackets"
                    flat
                    :pagination="{ rowsPerPage: 10 }"
                    class="custom-table"
                  >
                    <template v-slot:body-cell-min_amount="props">
                      <q-td :props="props">₱{{ formatAmount(props.row.min_amount) }}</q-td>
                    </template>
                    <template v-slot:body-cell-max_amount="props">
                      <q-td :props="props">
                        {{
                          props.row.max_amount
                            ? '₱' + formatAmount(props.row.max_amount)
                            : 'No Limit'
                        }}
                      </q-td>
                    </template>
                    <template v-slot:body-cell-rate="props">
                      <q-td :props="props">{{ props.row.rate }}%</q-td>
                    </template>
                    <template v-slot:body-cell-actions="props">
                      <q-td :props="props">
                        <q-btn
                          flat
                          round
                          dense
                          icon="edit"
                          color="primary"
                          size="sm"
                          @click="editTaxBracket(props.row)"
                        >
                          <q-tooltip>Edit</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          color="negative"
                          size="sm"
                          @click="deleteTaxBracket(props.row)"
                          class="q-ml-xs"
                        >
                          <q-tooltip>Delete</q-tooltip>
                        </q-btn>
                      </q-td>
                    </template>
                  </q-table>
                </q-card>
              </q-tab-panel>

              <!-- Cutoff Periods -->
              <q-tab-panel name="cutoff-periods" class="q-pa-none">
                <div class="section-header">
                  <div>
                    <h5 class="section-title">Cutoff Periods</h5>
                    <p class="section-description">Define payroll cutoff periods</p>
                  </div>
                  <q-btn
                    color="primary"
                    label="Add Cutoff Period"
                    icon="add"
                    @click="openCutoffPeriodDialog"
                    unelevated
                    no-caps
                    class="action-btn"
                  />
                </div>
                <q-card flat bordered class="settings-card">
                  <q-table
                    :rows="cutoffPeriods"
                    :columns="cutoffPeriodColumns"
                    row-key="id"
                    :loading="loadingCutoffPeriods"
                    flat
                    :pagination="{ rowsPerPage: 10 }"
                    class="custom-table"
                  >
                    <template v-slot:body-cell-start_date="props">
                      <q-td :props="props">{{ formatDate(props.row.start_date) }}</q-td>
                    </template>
                    <template v-slot:body-cell-end_date="props">
                      <q-td :props="props">{{ formatDate(props.row.end_date) }}</q-td>
                    </template>
                    <template v-slot:body-cell-is_active="props">
                      <q-td :props="props">
                        <q-badge
                          :color="props.row.is_active ? 'positive' : 'grey'"
                          :label="props.row.is_active ? 'Active' : 'Inactive'"
                        />
                      </q-td>
                    </template>
                    <template v-slot:body-cell-actions="props">
                      <q-td :props="props">
                        <q-btn
                          flat
                          round
                          dense
                          icon="edit"
                          color="primary"
                          size="sm"
                          @click="editCutoffPeriod(props.row)"
                        >
                          <q-tooltip>Edit</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          color="negative"
                          size="sm"
                          @click="deleteCutoffPeriod(props.row)"
                          class="q-ml-xs"
                        >
                          <q-tooltip>Delete</q-tooltip>
                        </q-btn>
                      </q-td>
                    </template>
                  </q-table>
                </q-card>
              </q-tab-panel>

              <!-- Payroll Groups -->
              <q-tab-panel name="payroll-groups" class="q-pa-none">
                <div class="section-header">
                  <div>
                    <h5 class="section-title">Payroll Groups</h5>
                    <p class="section-description">Organize employees into payroll groups</p>
                  </div>
                  <q-btn
                    color="primary"
                    label="Add Payroll Group"
                    icon="add"
                    @click="openPayrollGroupDialog"
                    unelevated
                    no-caps
                    class="action-btn"
                  />
                </div>
                <q-card flat bordered class="settings-card">
                  <q-table
                    :rows="payrollGroups"
                    :columns="payrollGroupColumns"
                    row-key="id"
                    :loading="loadingPayrollGroups"
                    flat
                    :pagination="{ rowsPerPage: 10 }"
                    class="custom-table"
                  >
                    <template v-slot:body-cell-actions="props">
                      <q-td :props="props">
                        <q-btn
                          flat
                          round
                          dense
                          icon="edit"
                          color="primary"
                          size="sm"
                          @click="editPayrollGroup(props.row)"
                        >
                          <q-tooltip>Edit</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          color="negative"
                          size="sm"
                          @click="deletePayrollGroup(props.row)"
                          class="q-ml-xs"
                        >
                          <q-tooltip>Delete</q-tooltip>
                        </q-btn>
                      </q-td>
                    </template>
                  </q-table>
                </q-card>
              </q-tab-panel>

              <!-- Labor Rules -->
              <q-tab-panel name="labor-rules" class="q-pa-none">
                <div class="section-header">
                  <div>
                    <h5 class="section-title">Labor Rules</h5>
                    <p class="section-description">Configure labor law compliance rules</p>
                  </div>
                  <q-btn
                    color="primary"
                    label="Add Labor Rule"
                    icon="add"
                    @click="openLaborRuleDialog"
                    unelevated
                    no-caps
                    class="action-btn"
                  />
                </div>
                <q-card flat bordered class="settings-card">
                  <q-table
                    :rows="laborRules"
                    :columns="laborRuleColumns"
                    row-key="id"
                    :loading="loadingLaborRules"
                    flat
                    :pagination="{ rowsPerPage: 10 }"
                    class="custom-table"
                  >
                    <template v-slot:body-cell-is_active="props">
                      <q-td :props="props">
                        <q-badge
                          :color="props.row.is_active ? 'positive' : 'grey'"
                          :label="props.row.is_active ? 'Active' : 'Inactive'"
                        />
                      </q-td>
                    </template>
                    <template v-slot:body-cell-actions="props">
                      <q-td :props="props">
                        <q-btn
                          flat
                          round
                          dense
                          icon="edit"
                          color="primary"
                          size="sm"
                          @click="editLaborRule(props.row)"
                        >
                          <q-tooltip>Edit</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          color="negative"
                          size="sm"
                          @click="deleteLaborRule(props.row)"
                          class="q-ml-xs"
                        >
                          <q-tooltip>Delete</q-tooltip>
                        </q-btn>
                      </q-td>
                    </template>
                  </q-table>
                </q-card>
              </q-tab-panel>
              <!-- Pay Structures -->
              <q-tab-panel name="pay-structures" class="q-pa-none">
                <div class="section-header">
                  <div>
                    <h5 class="section-title">Pay Structures</h5>
                    <p class="section-description">Define employee compensation structures</p>
                  </div>
                  <q-btn
                    color="primary"
                    label="Add Pay Structure"
                    icon="add"
                    @click="openPayStructureDialog"
                    unelevated
                    no-caps
                    class="action-btn"
                  />
                </div>
                <q-card flat bordered class="settings-card">
                  <q-table
                    :rows="payStructures"
                    :columns="payStructureColumns"
                    row-key="id"
                    :loading="loadingPayStructures"
                    flat
                    :pagination="{ rowsPerPage: 10 }"
                    class="custom-table"
                  >
                    <template v-slot:body-cell-position="props">
                      <q-td :props="props">
                        {{ props.row.position_name }}
                      </q-td>
                    </template>
                    <template v-slot:body-cell-pay_type="props">
                      <q-td :props="props">
                        <q-chip
                          dense
                          size="sm"
                          :color="props.row.pay_type === 'monthly' ? 'blue-1' : 'green-1'"
                          :text-color="props.row.pay_type === 'monthly' ? 'blue-8' : 'green-8'"
                          :label="props.row.pay_type"
                          class="text-capitalize"
                        />
                      </q-td>
                    </template>
                    <template v-slot:body-cell-rate="props">
                      <q-td :props="props">
                        {{ props.row.currency }} {{ formatAmount(props.row.rate) }}
                      </q-td>
                    </template>
                    <template v-slot:body-cell-effective_from="props">
                      <q-td :props="props">{{ formatDate(props.row.effective_from) }}</q-td>
                    </template>
                    <template v-slot:body-cell-effective_to="props">
                      <q-td :props="props">
                        {{
                          props.row.effective_to ? formatDate(props.row.effective_to) : 'Ongoing'
                        }}
                      </q-td>
                    </template>
                    <template v-slot:body-cell-actions="props">
                      <q-td :props="props">
                        <q-btn
                          flat
                          round
                          dense
                          icon="edit"
                          color="primary"
                          size="sm"
                          @click="editPayStructure(props.row)"
                        >
                          <q-tooltip>Edit</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          color="negative"
                          size="sm"
                          @click="deletePayStructure(props.row)"
                          class="q-ml-xs"
                        >
                          <q-tooltip>Delete</q-tooltip>
                        </q-btn>
                      </q-td>
                    </template>
                  </q-table>
                </q-card>
              </q-tab-panel>
            </q-tab-panels>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- ALL DIALOGS BELOW -->

    <!-- Company Dialog -->
    <q-dialog v-model="companyDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ editingCompany ? 'Edit Company' : 'Add New Company' }}</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form @submit="saveCompany" class="q-gutter-md">
            <q-input
              v-model="companyForm.name"
              label="Company Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Company name is required']"
            />
            <div>
              <div class="text-subtitle2 q-mb-sm text-grey-8">Company Logo</div>
              <q-btn-toggle
                v-model="logoUploadMethod"
                toggle-color="primary"
                :options="[
                  { label: 'Upload File', value: 'file' },
                  { label: 'Use URL', value: 'url' },
                ]"
                unelevated
                dense
                class="q-mb-md"
              />
            </div>
            <div v-if="logoUploadMethod === 'url'">
              <q-input
                v-model="companyForm.logo"
                label="Logo URL"
                outlined
                dense
                placeholder="https://example.com/logo.png"
                hint="Enter the URL of the company logo"
              >
                <template v-slot:append>
                  <q-icon
                    v-if="companyForm.logo"
                    name="close"
                    @click="companyForm.logo = ''"
                    class="cursor-pointer"
                  />
                </template>
              </q-input>
            </div>
            <div v-if="logoUploadMethod === 'file'">
              <q-file
                v-model="logoFile"
                label="Upload Logo"
                outlined
                dense
                accept="image/*"
                max-file-size="5242880"
                @update:model-value="onLogoFileSelected"
                @rejected="onFileRejected"
                hint="Maximum file size: 5MB (JPG, PNG, GIF, SVG)"
              >
                <template v-slot:prepend>
                  <q-icon name="cloud_upload" />
                </template>
                <template v-slot:append>
                  <q-icon
                    v-if="logoFile"
                    name="close"
                    @click.stop="clearLogoFile"
                    class="cursor-pointer"
                  />
                </template>
              </q-file>
            </div>
            <div v-if="logoPreview" class="q-mt-md">
              <div class="text-caption text-grey-7 q-mb-sm">Logo Preview</div>
              <q-card flat bordered class="logo-preview-card">
                <q-avatar size="120px" class="q-ma-md">
                  <img :src="logoPreview" @error="handleImageError" />
                </q-avatar>
              </q-card>
            </div>
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="saveCompany"
            :loading="savingCompany"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Site Dialog -->
    <q-dialog v-model="siteDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ editingSite ? 'Edit Site' : 'Add New Site' }}</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form @submit="saveSite" class="q-gutter-md">
            <q-input
              v-model="siteForm.name"
              label="Site Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Site name is required']"
            />
            <q-input
              v-model="siteForm.location"
              label="Location *"
              outlined
              dense
              :rules="[(val) => !!val || 'Location is required']"
            />
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model="siteForm.latitude"
                  label="Latitude *"
                  outlined
                  dense
                  type="number"
                  step="any"
                  :rules="[(val) => !!val || 'Latitude is required']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="siteForm.longitude"
                  label="Longitude *"
                  outlined
                  dense
                  type="number"
                  step="any"
                  :rules="[(val) => !!val || 'Longitude is required']"
                />
              </div>
            </div>
            <q-input
              v-model.number="siteForm.radius_meters"
              label="Radius (meters)"
              outlined
              dense
              type="number"
            />
            <q-select
              v-model="siteForm.ownership_type"
              :options="ownershipOptions"
              label="Ownership Type *"
              outlined
              dense
              :rules="[(val) => !!val || 'Ownership type is required']"
            />
            <q-toggle v-model="siteForm.is_active" label="Active" color="positive" />
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="saveSite"
            :loading="savingSite"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Role Dialog -->
    <q-dialog v-model="roleDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ editingRole ? 'Edit Role' : 'Add New Role' }}</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form @submit="saveRole" class="q-gutter-md">
            <q-input
              v-model="roleForm.name"
              label="Role Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Role name is required']"
            />
            <div>
              <div class="text-subtitle2 q-mb-sm text-grey-8">Permissions</div>
              <q-select
                v-model="roleForm.permissions"
                :options="availablePermissions"
                label="Select Permissions"
                outlined
                dense
                multiple
                use-chips
                stack-label
                hint="Select one or more permissions for this role"
                class="q-mb-md"
              >
                <template v-slot:selected>
                  <div class="q-gutter-xs" style="max-width: 100%">
                    <q-chip
                      v-for="(permission, index) in roleForm.permissions"
                      :key="index"
                      removable
                      dense
                      color="blue-1"
                      text-color="blue-8"
                      @remove="roleForm.permissions.splice(index, 1)"
                    >
                      {{ permission }}
                    </q-chip>
                  </div>
                </template>
              </q-select>
            </div>
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="saveRole"
            :loading="savingRole"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Position Dialog -->
    <q-dialog v-model="positionDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ editingPosition ? 'Edit Position' : 'Add New Position' }}</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form @submit="savePosition" class="q-gutter-md">
            <q-input
              v-model="positionForm.name"
              label="Position Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Position name is required']"
            />
            <q-input
              v-model="positionForm.description"
              label="Description"
              outlined
              dense
              type="textarea"
              rows="2"
            />
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="savePosition"
            :loading="savingPosition"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Department Dialog -->
    <q-dialog v-model="departmentDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">
            {{ editingDepartment ? 'Edit Department' : 'Add New Department' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form @submit="saveDepartment" class="q-gutter-md">
            <q-input
              v-model="departmentForm.name"
              label="Department Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Department name is required']"
            />
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="saveDepartment"
            :loading="savingDepartment"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Pay Structure Dialog -->
    <q-dialog v-model="payStructureDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">
            {{ editingPayStructure ? 'Edit Pay Structure' : 'Add Pay Structure' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form class="q-gutter-md">
            <q-select
              v-model="payStructureForm.position"
              :options="positions"
              option-value="id"
              option-label="name"
              label="Position *"
              outlined
              dense
              emit-value
              map-options
              :rules="[(val) => !!val || 'Position is required']"
            />
            <q-select
              v-model="payStructureForm.pay_type"
              :options="payTypeOptions"
              label="Pay Type *"
              outlined
              dense
              :rules="[(val) => !!val || 'Pay type is required']"
            />
            <q-input
              v-model.number="payStructureForm.rate"
              label="Rate *"
              outlined
              dense
              type="number"
              step="0.01"
              :rules="[(val) => val > 0 || 'Rate must be greater than 0']"
            />
            <q-input
              v-model="payStructureForm.currency"
              label="Currency *"
              outlined
              dense
              placeholder="e.g., PHP, USD"
              :rules="[(val) => !!val || 'Currency is required']"
            />
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model="payStructureForm.effective_from"
                  label="Effective From *"
                  outlined
                  dense
                  type="date"
                  :rules="[(val) => !!val || 'Effective from date is required']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="payStructureForm.effective_to"
                  label="Effective To"
                  outlined
                  dense
                  type="date"
                  hint="Leave empty for ongoing"
                />
              </div>
            </div>
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="savePayStructure"
            :loading="savingPayStructure"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- Contract Dialog -->
    <!-- Contract Dialog - Updated Structure -->
    <q-dialog v-model="contractDialog" persistent>
      <q-card style="min-width: 700px; max-width: 900px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{ editingContract ? 'Edit Contract' : 'Create Contract' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <div class="row q-col-gutter-md">
            <!-- Employee -->
            <div class="col-6">
              <q-select
                v-model="contractForm.employee_id"
                :options="employees"
                option-value="id"
                option-label="full_name"
                emit-value
                map-options
                label="Employee *"
                outlined
                dense
              />
            </div>

            <!-- Contract Type -->
            <div class="col-6">
              <q-select
                v-model="contractForm.contract_type_id"
                :options="contractTypes"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                label="Contract Type *"
                outlined
                dense
              />
            </div>

            <!-- Site -->
            <div class="col-12">
              <q-select
                v-model="contractForm.site_id"
                :options="sites"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                label="Site *"
                outlined
                dense
              />
            </div>
          </div>

          <!-- Pay Structure Section -->
          <div class="text-subtitle1 q-mt-md q-mb-sm">Pay Structure</div>
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-select
                v-model="contractForm.pay_structure.position_id"
                :options="positions"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                label="Position *"
                outlined
                dense
              />
            </div>

            <div class="col-6">
              <q-select
                v-model="contractForm.pay_structure.pay_type"
                :options="payTypeOptions"
                label="Pay Type *"
                outlined
                dense
              />
            </div>

            <div class="col-4">
              <q-input
                v-model.number="contractForm.pay_structure.rate"
                type="number"
                label="Rate *"
                outlined
                dense
                prefix="₱"
              />
            </div>

            <div class="col-4">
              <q-input
                v-model="contractForm.pay_structure.effective_from"
                type="date"
                label="Effective From *"
                outlined
                dense
              />
            </div>

            <div class="col-4">
              <q-input
                v-model="contractForm.pay_structure.effective_to"
                type="date"
                label="Effective To"
                outlined
                dense
                clearable
              />
            </div>
          </div>

          <!-- Schedules Section -->
          <div class="text-subtitle1 q-mt-md q-mb-sm">
            Schedules
            <q-btn
              size="sm"
              color="primary"
              icon="add"
              label="Add Schedule"
              @click="showScheduleForm = !showScheduleForm"
              flat
              dense
            />
          </div>

          <!-- Schedule Form (collapsible) -->
          <div v-if="showScheduleForm" class="q-pa-md bg-grey-2 rounded-borders q-mb-md">
            <div class="row q-col-gutter-sm">
              <div class="col-3">
                <q-input v-model="scheduleForm.date" type="date" label="Date *" outlined dense />
              </div>
              <div class="col-3">
                <q-select
                  v-model="scheduleForm.site_id"
                  :options="sites"
                  option-value="id"
                  option-label="name"
                  emit-value
                  map-options
                  label="Site *"
                  outlined
                  dense
                />
              </div>
              <div class="col-3">
                <q-select
                  v-model="scheduleForm.department_id"
                  :options="departments"
                  option-value="id"
                  option-label="name"
                  emit-value
                  map-options
                  label="Department *"
                  outlined
                  dense
                />
              </div>
              <div class="col-2">
                <q-select
                  v-model="scheduleForm.shift_type_id"
                  :options="shiftTypes"
                  option-value="id"
                  option-label="name"
                  emit-value
                  map-options
                  label="Shift *"
                  outlined
                  dense
                />
              </div>
              <div class="col-1">
                <q-btn color="primary" icon="add" @click="addSchedule" dense />
              </div>
            </div>
          </div>

          <!-- Schedules List -->
          <q-list v-if="contractForm.schedules.length > 0" bordered separator>
            <q-item v-for="(schedule, index) in contractForm.schedules" :key="index">
              <q-item-section>
                <q-item-label>{{ formatDate(schedule.date) }}</q-item-label>
                <q-item-label caption>
                  Site: {{ getSiteName(schedule.site_id) }} | Dept:
                  {{ getDepartmentName(schedule.department_id) }} | Shift:
                  {{ getShiftTypeName(schedule.shift_type_id) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn icon="delete" flat dense color="negative" @click="removeSchedule(index)" />
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Recurring Section -->
          <div class="text-subtitle1 q-mt-md q-mb-sm">
            Recurring Schedules
            <q-btn
              size="sm"
              color="primary"
              icon="add"
              label="Add Recurring"
              @click="showRecurringForm = !showRecurringForm"
              flat
              dense
            />
          </div>

          <!-- Recurring Form (collapsible) -->
          <div v-if="showRecurringForm" class="q-pa-md bg-grey-2 rounded-borders q-mb-md">
            <div class="row q-col-gutter-sm">
              <div class="col-3">
                <q-input
                  v-model="recurringForm.start_date"
                  type="date"
                  label="Start Date *"
                  outlined
                  dense
                />
              </div>
              <div class="col-3">
                <q-input
                  v-model="recurringForm.end_date"
                  type="date"
                  label="End Date *"
                  outlined
                  dense
                />
              </div>
              <div class="col-2">
                <q-select
                  v-model="recurringForm.site_id"
                  :options="sites"
                  option-value="id"
                  option-label="name"
                  emit-value
                  map-options
                  label="Site *"
                  outlined
                  dense
                />
              </div>
              <div class="col-3">
                <q-select
                  v-model="recurringForm.department_id"
                  :options="departments"
                  option-value="id"
                  option-label="name"
                  emit-value
                  map-options
                  label="Department *"
                  outlined
                  dense
                />
              </div>
              <div class="col-1">
                <q-btn color="primary" icon="add" @click="addRecurring" dense />
              </div>
            </div>
          </div>

          <!-- Recurring List -->
          <q-list v-if="contractForm.recurring.length > 0" bordered separator>
            <q-item v-for="(recurring, index) in contractForm.recurring" :key="index">
              <q-item-section>
                <q-item-label>
                  {{ formatDate(recurring.start_date) }} - {{ formatDate(recurring.end_date) }}
                </q-item-label>
                <q-item-label caption>
                  Site: {{ getSiteName(recurring.site_id) }} | Dept:
                  {{ getDepartmentName(recurring.department_id) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn icon="delete" flat dense color="negative" @click="removeRecurring(index)" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn label="Cancel" color="grey" flat v-close-popup />
          <q-btn label="Save" color="primary" @click="saveContract" :loading="savingContract" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Contract View Dialog -->
    <q-dialog v-model="contractViewDialog">
      <q-card class="dialog-card" style="min-width: 600px">
        <q-card-section class="dialog-header">
          <div class="text-h6">Contract Details</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="selectedContract" class="q-pt-lg">
          <div class="q-gutter-md">
            <div class="row">
              <div class="col-4 text-grey-7">Employee:</div>
              <div class="col-8 text-weight-medium">{{ selectedContract.employee_name }}</div>
            </div>
            <div class="row">
              <div class="col-4 text-grey-7">Contract Type:</div>
              <div class="col-8 text-weight-medium">{{ selectedContract.contract_type_name }}</div>
            </div>
            <div class="row">
              <div class="col-4 text-grey-7">Company:</div>
              <div class="col-8 text-weight-medium">{{ selectedContract.company_name }}</div>
            </div>
            <div class="row">
              <div class="col-4 text-grey-7">Status:</div>
              <div class="col-8">
                <q-badge
                  :color="selectedContract.is_acknowledged ? 'positive' : 'warning'"
                  :label="selectedContract.is_acknowledged ? 'Acknowledged' : 'Pending'"
                />
              </div>
            </div>
            <div class="row">
              <div class="col-4 text-grey-7">Created:</div>
              <div class="col-8 text-weight-medium">
                {{ formatDate(selectedContract.date_created) }}
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn label="Close" color="primary" v-close-popup no-caps unelevated />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Allowance Type Dialog -->
    <q-dialog v-model="allowanceTypeDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">
            {{ editingAllowanceType ? 'Edit Allowance Type' : 'Add Allowance Type' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form class="q-gutter-md">
            <q-input
              v-model="allowanceTypeForm.name"
              label="Allowance Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Allowance name is required']"
            />
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="saveAllowanceType"
            :loading="savingAllowanceType"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Tax Bracket Dialog -->
    <q-dialog v-model="taxBracketDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">
            {{ editingTaxBracket ? 'Edit Tax Bracket' : 'Add Tax Bracket' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form class="q-gutter-md">
            <q-input
              v-model="taxBracketForm.name"
              label="Bracket Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Bracket name is required']"
            />
            <q-input
              v-model.number="taxBracketForm.min_amount"
              label="Minimum Amount *"
              outlined
              dense
              type="number"
              prefix="₱"
              :rules="[(val) => val >= 0 || 'Must be 0 or greater']"
            />
            <q-input
              v-model.number="taxBracketForm.max_amount"
              label="Maximum Amount"
              outlined
              dense
              type="number"
              prefix="₱"
              hint="Leave empty for no limit"
            />
            <q-input
              v-model.number="taxBracketForm.rate"
              label="Tax Rate (%) *"
              outlined
              dense
              type="number"
              step="0.01"
              suffix="%"
              :rules="[(val) => (val >= 0 && val <= 100) || 'Rate must be between 0 and 100']"
            />
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="saveTaxBracket"
            :loading="savingTaxBracket"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Cutoff Period Dialog -->
    <q-dialog v-model="cutoffPeriodDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">
            {{ editingCutoffPeriod ? 'Edit Cutoff Period' : 'Add Cutoff Period' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form class="q-gutter-md">
            <q-input
              v-model="cutoffPeriodForm.name"
              label="Period Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Period name is required']"
            />
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model="cutoffPeriodForm.start_date"
                  label="Start Date *"
                  outlined
                  dense
                  type="date"
                  :rules="[(val) => !!val || 'Start date is required']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="cutoffPeriodForm.end_date"
                  label="End Date *"
                  outlined
                  dense
                  type="date"
                  :rules="[(val) => !!val || 'End date is required']"
                />
              </div>
            </div>
            <q-toggle v-model="cutoffPeriodForm.is_active" label="Active" color="positive" />
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="saveCutoffPeriod"
            :loading="savingCutoffPeriod"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Payroll Group Dialog -->
    <q-dialog v-model="payrollGroupDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">
            {{ editingPayrollGroup ? 'Edit Payroll Group' : 'Add Payroll Group' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form class="q-gutter-md">
            <q-input
              v-model="payrollGroupForm.name"
              label="Group Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Group name is required']"
            />
            <q-input
              v-model="payrollGroupForm.description"
              label="Description"
              outlined
              dense
              type="textarea"
              rows="2"
            />
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="savePayrollGroup"
            :loading="savingPayrollGroup"
            unelevated
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Labor Rule Dialog -->
    <q-dialog v-model="laborRuleDialog" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ editingLaborRule ? 'Edit Labor Rule' : 'Add Labor Rule' }}</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pt-lg">
          <q-form class="q-gutter-md">
            <q-input
              v-model="laborRuleForm.name"
              label="Rule Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Rule name is required']"
            />
            <q-input
              v-model="laborRuleForm.description"
              label="Description"
              outlined
              dense
              type="textarea"
              rows="3"
            />
            <q-input
              v-model.number="laborRuleForm.multiplier"
              label="Rate Multiplier *"
              outlined
              dense
              type="number"
              step="0.01"
              hint="E.g., 1.5 for 150% of base rate"
              :rules="[(val) => val > 0 || 'Multiplier must be greater than 0']"
            />
            <q-toggle v-model="laborRuleForm.is_active" label="Active" color="positive" />
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup no-caps />
          <q-btn
            label="Save"
            color="primary"
            @click="saveLaborRule"
            :loading="savingLaborRule"
            unelevated
            no-caps
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
        // FIRST: Fetch positions (required for pay structures)
        await this.fetchPositions()

        // THEN: Fetch everything else in parallel
        await Promise.all([
          this.fetchSites(),
          this.fetchRoles(),
          this.fetchContracts(),
          this.fetchAllowanceTypes(),
          this.fetchTaxBrackets(),
          this.fetchCutoffPeriods(),
          this.fetchPayrollGroups(),
          this.fetchLaborRules(),
          this.fetchPayStructures(),
          this.fetchContractTypes(),
        ])

        console.log('✅ [MOUNTED] All data fetched successfully')
        console.log('📊 [MOUNTED] Final data counts:', {
          companies: this.companies.length,
          sites: this.sites.length,
          roles: this.roles.length,
          positions: this.positions.length,
          contracts: this.contracts.length,
          allowanceTypes: this.allowanceTypes.length,
          taxBrackets: this.taxBrackets.length,
          cutoffPeriods: this.cutoffPeriods.length,
          payrollGroups: this.payrollGroups.length,
          laborRules: this.laborRules.length,
          payStructures: this.payStructures.length,
          contractTypes: this.contractTypes.length,
        })
      } catch (error) {
        console.error('❌ [MOUNTED] Error fetching data:', error)
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

    // ==================== SITES ====================
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
        company: this.getCompanyId(),
      }
      this.siteDialog = true
    },

    editSite(site) {
      this.editingSite = true
      this.siteForm = { ...site }
      this.siteDialog = true
    },

    async saveSite() {
      if (
        !this.siteForm.name.trim() ||
        !this.siteForm.location.trim() ||
        !this.siteForm.latitude ||
        !this.siteForm.longitude
      ) {
        this.$q.notify({
          type: 'negative',
          message: 'Please fill all required fields',
          position: 'top',
        })
        return
      }

      this.savingSite = true
      try {
        const payload = {
          name: this.siteForm.name,
          location: this.siteForm.location,
          latitude: Number(this.siteForm.latitude).toFixed(6),
          longitude: Number(this.siteForm.longitude).toFixed(6),
          radius_meters: parseInt(this.siteForm.radius_meters) || 100,
          ownership_type: this.siteForm.ownership_type,
          is_active: this.siteForm.is_active,
          company: this.getCompanyId(),
        }

        if (this.editingSite) {
          await api.put(`/organization/sites/${this.siteForm.id}/`, payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Site updated successfully' })
        } else {
          await api.post('/organization/sites/', payload, {
            headers: this.getAuthHeaders(),
          })
          this.$q.notify({ type: 'positive', message: 'Site created successfully' })
        }

        this.siteDialog = false
        await this.fetchSites()
      } catch (error) {
        console.error('Error saving site:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to save site',
          position: 'top',
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
        })
        .onOk(async () => {
          try {
            await api.delete(`/organization/sites/${site.id}/`, {
              headers: this.getAuthHeaders(),
            })
            this.$q.notify({ type: 'positive', message: 'Site deleted successfully' })
            await this.fetchSites()
          } catch (error) {
            console.error('Error deleting site:', error)
            this.$q.notify({ type: 'negative', message: 'Failed to delete site' })
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
        permissionsArray = [...role.permissions]
      } else if (typeof role.permissions === 'string') {
        try {
          permissionsArray = JSON.parse(role.permissions)
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
          permissions: this.roleForm.permissions || [],
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
  },
}
</script>

<style scoped>
.admin-settings-page {
  max-width: 1500px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  background: white;
  border-radius: 16px;
  padding: 40px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.search-input {
  width: 280px;
}

.tabs-container {
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.custom-tabs {
  max-width: 1400px;
  margin: 0 auto;
}

.custom-tab {
  font-size: 14px;
  font-weight: 500;
  text-transform: none;
  color: #616161;
  padding: 12px 20px;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
}

.transparent-panels {
  background: transparent;
}

.settings-section {
  margin-top: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.section-description {
  font-size: 13px;
  color: #757575;
  margin: 0;
}

.action-btn {
  font-size: 14px;
  font-weight: 500;
  padding: 8px 20px;
  border-radius: 6px;
}

.settings-card {
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.custom-table :deep(thead tr) {
  background-color: #fafafa;
}

.custom-table :deep(thead th) {
  font-size: 13px;
  font-weight: 600;
  color: #424242;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 12px 16px;
}

.custom-table :deep(tbody td) {
  font-size: 14px;
  color: #424242;
  padding: 14px 16px;
}

.custom-table :deep(tbody tr) {
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.custom-table :deep(tbody tr:hover) {
  background-color: #fafafa;
}

.permissions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 300px;
}

.permission-chip {
  font-size: 11px;
  border-radius: 4px;
  margin: 0;
}

.text-capitalize {
  text-transform: capitalize;
}

.logo-preview-card {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
}

/* Dialog Styles */
.dialog-card {
  min-width: 500px;
  max-width: 600px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
}

.dialog-header .text-h6 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.dialog-card :deep(.q-card-section:not(.dialog-header):not(.q-card-actions)) {
  padding: 24px;
  max-height: calc(90vh - 150px);
  overflow-y: auto;
}

.dialog-card :deep(.q-form) {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-card :deep(.q-input),
.dialog-card :deep(.q-select),
.dialog-card :deep(.q-file),
.dialog-card :deep(.q-btn-toggle) {
  width: 93%;
}

.dialog-card :deep(.row.q-col-gutter-md) {
  margin: 0 -8px;
}

.dialog-card :deep(.row.q-col-gutter-md > div) {
  padding: 0 23px;
}

.dialog-card :deep(.q-card-actions) {
  padding: 16px 24px;
  gap: 12px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

/* ========================================
   RESPONSIVE BREAKPOINTS
   ======================================== */

/* 1440px screens */
@media (min-width: 1440px) {
  .admin-settings-page {
    max-width: 1600px;
  }

  .page-header {
    padding: 48px;
  }

  .page-content {
    padding: 40px 48px;
  }

  .header-content,
  .custom-tabs {
    max-width: 1500px;
  }

  .page-title {
    font-size: 28px;
  }

  .section-title {
    font-size: 20px;
  }

  /* Dialog size for 1440px */
  .dialog-card {
    min-width: 600px;
    max-width: 700px;
  }

  .dialog-header {
    padding: 24px 28px;
  }

  .dialog-header .text-h6 {
    font-size: 20px;
  }

  .dialog-card :deep(.q-card-section:not(.dialog-header):not(.q-card-actions)) {
    padding: 28px;
  }

  .dialog-card :deep(.q-card-actions) {
    padding: 18px 28px;
  }
}

/* 1024px screens */
@media (min-width: 1024px) and (max-width: 1439px) {
  .admin-settings-page {
    max-width: 1200px;
    padding: 20px;
  }

  .page-header {
    padding: 32px;
  }

  .header-content,
  .custom-tabs,
  .page-content {
    max-width: 1100px;
  }

  .page-title {
    font-size: 22px;
  }

  .search-input {
    width: 240px;
  }

  .section-title {
    font-size: 17px;
  }

  /* Dialog size for 1024px */
  .dialog-card {
    min-width: 520px;
    max-width: 580px;
  }

  .dialog-header {
    padding: 20px 24px;
  }

  .dialog-header .text-h6 {
    font-size: 18px;
  }

  .dialog-card :deep(.q-card-section:not(.dialog-header):not(.q-card-actions)) {
    padding: 24px;
    max-height: calc(85vh - 140px);
  }

  .dialog-card :deep(.q-card-actions) {
    padding: 16px 24px;
  }
}

/* 768px screens (Tablet) */
@media (max-width: 1023px) {
  .admin-settings-page {
    padding: 16px;
  }

  .page-header {
    padding: 24px;
    border-radius: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .page-title {
    font-size: 20px;
  }

  .search-input {
    width: 100%;
  }

  .tabs-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .custom-tabs {
    padding: 0 24px;
    min-width: max-content;
  }

  .custom-tab {
    padding: 12px 16px;
    font-size: 13px;
  }

  .page-content {
    padding: 24px 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .section-title {
    font-size: 16px;
  }

  .action-btn {
    width: auto;
    margin-left: auto;
  }

  .settings-card {
    overflow-x: auto;
  }

  .custom-table {
    min-width: 800px;
  }

  .custom-table :deep(thead th),
  .custom-table :deep(tbody td) {
    padding: 12px;
    font-size: 13px;
  }

  .permissions-container {
    max-width: 250px;
  }

  /* Dialog size for 768px */
  .dialog-card {
    min-width: 85vw;
    max-width: 85vw;
    width: 85vw;
  }

  .dialog-header {
    padding: 18px 20px;
  }

  .dialog-header .text-h6 {
    font-size: 17px;
  }

  .dialog-card :deep(.q-card-section:not(.dialog-header):not(.q-card-actions)) {
    padding: 20px;
    max-height: calc(80vh - 130px);
  }

  .dialog-card :deep(.q-card-actions) {
    padding: 14px 20px;
  }

  .dialog-card :deep(.row.q-col-gutter-md > .col-6) {
    width: 100%;
  }
}

/* Mobile - 767px and below */
@media (max-width: 767px) {
  .admin-settings-page {
    padding: 12px;
  }

  .page-header {
    padding: 20px 16px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .header-content {
    gap: 12px;
  }

  .page-title {
    font-size: 18px;
  }

  .tabs-container {
    margin-left: -12px;
    margin-right: -12px;
    border-radius: 0;
  }

  .custom-tabs {
    padding: 0 16px;
  }

  .custom-tab {
    padding: 10px 12px;
    font-size: 12px;
    min-width: 80px;
  }

  .page-content {
    padding: 20px 12px;
  }

  .settings-section {
    margin-top: 16px;
  }

  .section-header {
    margin-bottom: 16px;
    flex-direction: column;
    align-items: stretch;
  }

  .section-title {
    font-size: 15px;
  }

  .section-description {
    font-size: 12px;
  }

  .action-btn {
    width: 100%;
    margin-left: 0;
    padding: 10px 16px;
    font-size: 13px;
  }

  .settings-card {
    border-radius: 6px;
    margin: 0 -4px;
  }

  .custom-table {
    min-width: 700px;
  }

  .custom-table :deep(thead th),
  .custom-table :deep(tbody td) {
    padding: 10px 8px;
    font-size: 12px;
  }

  .permissions-container {
    max-width: 200px;
  }

  .permission-chip {
    font-size: 10px;
    padding: 3px 6px;
  }

  /* Full-screen dialog on mobile */
  .dialog-card {
    min-width: 100vw;
    max-width: 100vw;
    width: 100vw;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
    margin: 0;
  }

  .dialog-header {
    padding: 16px;
  }

  .dialog-header .text-h6 {
    font-size: 16px;
  }

  .dialog-card :deep(.q-card-section:not(.dialog-header):not(.q-card-actions)) {
    padding: 16px;
    max-height: calc(100vh - 120px);
  }

  .dialog-card :deep(.q-form) {
    gap: 16px;
  }

  .dialog-card :deep(.q-card-actions) {
    padding: 12px 16px;
    flex-direction: column-reverse;
    gap: 8px;
  }

  .dialog-card :deep(.q-card-actions .q-btn) {
    width: 100%;
    margin: 0;
  }

  .logo-preview-card {
    width: 100%;
  }

  .logo-preview-card :deep(.q-avatar) {
    width: 80px !important;
    height: 80px !important;
  }
}

/* Extra small - 480px and below */
@media (max-width: 480px) {
  .page-title {
    font-size: 16px;
  }

  .section-title {
    font-size: 14px;
  }

  .custom-table {
    min-width: 600px;
  }

  .custom-table :deep(thead th),
  .custom-table :deep(tbody td) {
    font-size: 11px;
    padding: 8px 6px;
  }
}
</style>
