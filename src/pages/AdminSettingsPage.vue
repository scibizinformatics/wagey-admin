<template>
  <q-page class="admin-settings-page">
    <div class="page-header q-pa-lg bg-white shadow-1">
      <div class="row items-center justify-between">
        <div>
          <h4 class="page-title q-ma-none">Admin Settings</h4>
          <p class="page-subtitle q-ma-none text-grey-6">Manage companies, roles, and positions</p>
        </div>
      </div>
    </div>

    <div class="page-content q-pa-lg">
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="companies" icon="business" label="Companies" />
        <q-tab name="roles" icon="admin_panel_settings" label="Roles" />
        <q-tab name="positions" icon="work" label="Positions" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated class="q-mt-md">
        <!-- Companies Tab -->
        <q-tab-panel name="companies" class="q-pa-none">
          <div class="tab-content">
            <div class="content-header q-mb-lg">
              <div class="row items-center justify-between">
                <div>
                  <h5 class="section-title q-ma-none">Companies</h5>
                  <p class="section-subtitle q-ma-none text-grey-6">Manage company information</p>
                </div>
                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Company"
                  @click="openCompanyDialog"
                  unelevated
                />
              </div>
            </div>

            <q-card flat bordered class="data-table-card">
              <q-table
                :rows="companies"
                :columns="companyColumns"
                row-key="id"
                :loading="loadingCompanies"
                flat
                :pagination="{ rowsPerPage: 10 }"
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
                      @click="editCompany(props.row)"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="deleteCompany(props.row)"
                      class="q-ml-xs"
                    />
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Roles Tab -->
        <q-tab-panel name="roles" class="q-pa-none">
          <div class="tab-content">
            <div class="content-header q-mb-lg">
              <div class="row items-center justify-between">
                <div>
                  <h5 class="section-title q-ma-none">Roles</h5>
                  <p class="section-subtitle q-ma-none text-grey-6">
                    Manage user roles and permissions
                  </p>
                </div>
                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Role"
                  @click="openRoleDialog"
                  unelevated
                />
              </div>
            </div>

            <q-card flat bordered class="data-table-card">
              <q-table
                :rows="roles"
                :columns="roleColumns"
                row-key="id"
                :loading="loadingRoles"
                flat
                :pagination="{ rowsPerPage: 10 }"
              >
                <template v-slot:body-cell-permissions="props">
                  <q-td :props="props">
                    <div class="permissions-chips">
                      <q-chip
                        v-for="permission in props.row.permissions"
                        :key="permission"
                        dense
                        size="sm"
                        color="blue-1"
                        text-color="blue-8"
                        :label="permission"
                        class="q-mr-xs"
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
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="deleteRole(props.row)"
                      class="q-ml-xs"
                    />
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Positions Tab -->
        <q-tab-panel name="positions" class="q-pa-none">
          <div class="tab-content">
            <div class="content-header q-mb-lg">
              <div class="row items-center justify-between">
                <div>
                  <h5 class="section-title q-ma-none">Positions</h5>
                  <p class="section-subtitle q-ma-none text-grey-6">
                    Manage job positions and departments
                  </p>
                </div>
                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Position"
                  @click="openPositionDialog"
                  unelevated
                />
              </div>
            </div>

            <q-card flat bordered class="data-table-card">
              <q-table
                :rows="positions"
                :columns="positionColumns"
                row-key="id"
                :loading="loadingPositions"
                flat
                :pagination="{ rowsPerPage: 10 }"
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
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="deletePosition(props.row)"
                      class="q-ml-xs"
                    />
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Company Dialog -->
    <q-dialog v-model="companyDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingCompany ? 'Edit Company' : 'Add New Company' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="saveCompany" class="q-gutter-md">
            <q-input
              v-model="companyForm.name"
              label="Company Name *"
              outlined
              :rules="[(val) => !!val || 'Company name is required']"
            />
            <q-input
              v-model="companyForm.description"
              label="Description"
              outlined
              type="textarea"
              rows="3"
            />
            <q-input v-model="companyForm.address" label="Address" outlined />
            <q-input v-model="companyForm.phone" label="Phone Number" outlined />
            <q-input v-model="companyForm.email" label="Email" outlined type="email" />
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn
            label="Save"
            color="primary"
            @click="saveCompany"
            :loading="savingCompany"
            unelevated
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Role Dialog -->
    <q-dialog v-model="roleDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingRole ? 'Edit Role' : 'Add New Role' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="saveRole" class="q-gutter-md">
            <q-input
              v-model="roleForm.name"
              label="Role Name *"
              outlined
              :rules="[(val) => !!val || 'Role name is required']"
            />
            <q-input
              v-model="roleForm.description"
              label="Description"
              outlined
              type="textarea"
              rows="2"
            />
            <q-select
              v-model="roleForm.companyId"
              :options="companyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Company *"
              outlined
              :rules="[(val) => !!val || 'Company is required']"
            />
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Permissions</div>
              <q-option-group
                v-model="roleForm.permissions"
                :options="permissionOptions"
                color="primary"
                type="checkbox"
                inline
              />
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn label="Save" color="primary" @click="saveRole" :loading="savingRole" unelevated />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Position Dialog -->
    <q-dialog v-model="positionDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingPosition ? 'Edit Position' : 'Add New Position' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="savePosition" class="q-gutter-md">
            <q-input
              v-model="positionForm.title"
              label="Position Title *"
              outlined
              :rules="[(val) => !!val || 'Position title is required']"
            />
            <q-input
              v-model="positionForm.description"
              label="Description"
              outlined
              type="textarea"
              rows="2"
            />
            <q-select
              v-model="positionForm.companyId"
              :options="companyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Company *"
              outlined
              :rules="[(val) => !!val || 'Company is required']"
            />
            <q-input v-model="positionForm.department" label="Department" outlined />
            <q-input
              v-model="positionForm.level"
              label="Level"
              outlined
              placeholder="e.g., Entry, Mid, Senior"
            />
            <q-input
              v-model="positionForm.salaryRange"
              label="Salary Range"
              outlined
              placeholder="e.g., $50,000 - $70,000"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn
            label="Save"
            color="primary"
            @click="savePosition"
            :loading="savingPosition"
            unelevated
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { api } from 'src/boot/axios' // Adjust the import path as needed

export default {
  name: 'AdminSettingsPage',
  data() {
    return {
      activeTab: 'companies',

      // Companies
      companies: [],
      loadingCompanies: false,
      companyDialog: false,
      editingCompany: false,
      savingCompany: false,
      companyForm: {
        id: null,
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
      },
      companyColumns: [
        { name: 'name', label: 'Company Name', field: 'name', align: 'left', sortable: true },
        { name: 'description', label: 'Description', field: 'description', align: 'left' },
        { name: 'address', label: 'Address', field: 'address', align: 'left' },
        { name: 'phone', label: 'Phone', field: 'phone', align: 'left' },
        { name: 'email', label: 'Email', field: 'email', align: 'left' },
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
        description: '',
        companyId: null,
        permissions: [],
      },
      roleColumns: [
        { name: 'name', label: 'Role Name', field: 'name', align: 'left', sortable: true },
        { name: 'description', label: 'Description', field: 'description', align: 'left' },
        { name: 'company', label: 'Company', field: 'companyName', align: 'left' },
        { name: 'permissions', label: 'Permissions', field: 'permissions', align: 'left' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],
      permissionOptions: [
        { label: 'Read', value: 'read' },
        { label: 'Write', value: 'write' },
        { label: 'Delete', value: 'delete' },
        { label: 'Manage Users', value: 'manage_users' },
        { label: 'Manage Payroll', value: 'manage_payroll' },
        { label: 'Manage Attendance', value: 'manage_attendance' },
        { label: 'Admin Access', value: 'admin_access' },
      ],

      // Positions
      positions: [],
      loadingPositions: false,
      positionDialog: false,
      editingPosition: false,
      savingPosition: false,
      positionForm: {
        id: null,
        title: '',
        description: '',
        companyId: null,
        department: '',
        level: '',
        salaryRange: '',
      },
      positionColumns: [
        { name: 'title', label: 'Position Title', field: 'title', align: 'left', sortable: true },
        { name: 'description', label: 'Description', field: 'description', align: 'left' },
        { name: 'company', label: 'Company', field: 'companyName', align: 'left' },
        { name: 'department', label: 'Department', field: 'department', align: 'left' },
        { name: 'level', label: 'Level', field: 'level', align: 'left' },
        { name: 'salaryRange', label: 'Salary Range', field: 'salaryRange', align: 'left' },
        { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
      ],
    }
  },

  computed: {
    companyOptions() {
      return this.companies.map((company) => ({
        id: company.id,
        name: company.name,
      }))
    },
  },

  async mounted() {
    await this.fetchCompanies()
    await this.fetchRoles()
    await this.fetchPositions()
  },

  methods: {
    // Company Methods
    async fetchCompanies() {
      try {
        this.loadingCompanies = true
        const response = await api.get('/api/companies')
        // Handle both response.data and response.data.data formats
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
        description: '',
        address: '',
        phone: '',
        email: '',
      }
      this.companyDialog = true
    },

    editCompany(company) {
      this.editingCompany = true
      this.companyForm = { ...company }
      this.companyDialog = true
    },

    async saveCompany() {
      // Validate form before submission
      if (!this.companyForm.name.trim()) {
        this.$q.notify({
          type: 'negative',
          message: 'Company name is required',
          position: 'top',
        })
        return
      }

      try {
        this.savingCompany = true

        if (this.editingCompany) {
          const response = await api.put(`/api/companies/${this.companyForm.id}`, this.companyForm)
          this.$q.notify({
            type: 'positive',
            message: response.data?.message || 'Company updated successfully',
            position: 'top',
          })
        } else {
          const response = await api.post('/api/companies', this.companyForm)
          this.$q.notify({
            type: 'positive',
            message: response.data?.message || 'Company created successfully',
            position: 'top',
          })
        }

        this.companyDialog = false
        await this.fetchCompanies()
      } catch (error) {
        console.error('Error saving company:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to save company',
          position: 'top',
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
            await api.delete(`/api/companies/${company.id}`)
            this.$q.notify({
              type: 'positive',
              message: 'Company deleted successfully',
            })
            await this.fetchCompanies()
          } catch (error) {
            console.error('Error deleting company:', error)
            this.$q.notify({
              type: 'negative',
              message: 'Failed to delete company',
            })
          }
        })
    },

    // Role Methods
    async fetchRoles() {
      try {
        this.loadingRoles = true
        const response = await api.get('/api/roles')
        // Handle both response.data and response.data.data formats
        this.roles = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching roles:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to load roles',
          position: 'top',
        })
      } finally {
        this.loadingRoles = false
      }
    },

    openRoleDialog() {
      this.editingRole = false
      this.roleForm = {
        id: null,
        name: '',
        description: '',
        companyId: null,
        permissions: [],
      }
      this.roleDialog = true
    },

    editRole(role) {
      this.editingRole = true
      this.roleForm = { ...role }
      this.roleDialog = true
    },

    async saveRole() {
      try {
        this.savingRole = true

        if (this.editingRole) {
          await api.put(`/api/roles/${this.roleForm.id}`, this.roleForm)
          this.$q.notify({
            type: 'positive',
            message: 'Role updated successfully',
          })
        } else {
          await api.post('/api/roles', this.roleForm)
          this.$q.notify({
            type: 'positive',
            message: 'Role created successfully',
          })
        }

        this.roleDialog = false
        await this.fetchRoles()
      } catch (error) {
        console.error('Error saving role:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to save role',
        })
      } finally {
        this.savingRole = false
      }
    },

    async deleteRole(role) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete the role "${role.name}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/api/roles/${role.id}`)
            this.$q.notify({
              type: 'positive',
              message: 'Role deleted successfully',
            })
            await this.fetchRoles()
          } catch (error) {
            console.error('Error deleting role:', error)
            this.$q.notify({
              type: 'negative',
              message: 'Failed to delete role',
            })
          }
        })
    },

    // Position Methods
    async fetchPositions() {
      try {
        this.loadingPositions = true
        const response = await api.get('/api/positions')
        // Handle both response.data and response.data.data formats
        this.positions = response.data.data || response.data || []
      } catch (error) {
        console.error('Error fetching positions:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.message || 'Failed to load positions',
          position: 'top',
        })
      } finally {
        this.loadingPositions = false
      }
    },

    openPositionDialog() {
      this.editingPosition = false
      this.positionForm = {
        id: null,
        title: '',
        description: '',
        companyId: null,
        department: '',
        level: '',
        salaryRange: '',
      }
      this.positionDialog = true
    },

    editPosition(position) {
      this.editingPosition = true
      this.positionForm = { ...position }
      this.positionDialog = true
    },

    async savePosition() {
      try {
        this.savingPosition = true

        if (this.editingPosition) {
          await api.put(`/api/positions/${this.positionForm.id}`, this.positionForm)
          this.$q.notify({
            type: 'positive',
            message: 'Position updated successfully',
          })
        } else {
          await api.post('/api/positions', this.positionForm)
          this.$q.notify({
            type: 'positive',
            message: 'Position created successfully',
          })
        }

        this.positionDialog = false
        await this.fetchPositions()
      } catch (error) {
        console.error('Error saving position:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to save position',
        })
      } finally {
        this.savingPosition = false
      }
    },

    async deletePosition(position) {
      this.$q
        .dialog({
          title: 'Confirm Delete',
          message: `Are you sure you want to delete the position "${position.title}"?`,
          cancel: true,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await api.delete(`/api/positions/${position.id}`)
            this.$q.notify({
              type: 'positive',
              message: 'Position deleted successfully',
            })
            await this.fetchPositions()
          } catch (error) {
            console.error('Error deleting position:', error)
            this.$q.notify({
              type: 'negative',
              message: 'Failed to delete position',
            })
          }
        })
    },
  },
}
</script>

<style scoped>
.admin-settings-page {
  background-color: #f8fafc;
  min-height: 100vh;
}

.page-header {
  border-bottom: 1px solid #e2e8f0;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
}

.tab-content {
  padding: 24px 0;
}

.content-header {
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.section-subtitle {
  font-size: 14px;
  color: #64748b;
}

.data-table-card {
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.permissions-chips {
  max-width: 200px;
}

/* Dialog Styling */
.q-dialog .q-card {
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* Button Styling */
.q-btn {
  border-radius: 8px;
  font-weight: 500;
}

/* Table Styling */
.q-table {
  border-radius: 12px;
}

.q-table thead th {
  font-weight: 600;
  color: #374151;
  background-color: #f9fafb;
}

.q-table tbody tr:hover {
  background-color: #f8fafc;
}

/* Tab Styling */
.q-tabs {
  background-color: white;
  border-radius: 8px 8px 0 0;
}

.q-tab-panels {
  background-color: transparent;
}

/* Form Styling */
.q-field {
  margin-bottom: 16px;
}

.q-field--outlined .q-field__control {
  border-radius: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-content {
    padding: 16px;
  }

  .content-header .row {
    flex-direction: column;
    gap: 16px;
  }

  .content-header .row > div:first-child {
    text-align: center;
  }

  .q-dialog .q-card {
    min-width: 300px !important;
    width: 90vw;
  }
}
</style>
