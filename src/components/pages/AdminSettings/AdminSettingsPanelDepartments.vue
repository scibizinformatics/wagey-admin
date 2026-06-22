<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Departments</h2>
        <p class="table-subtitle">Manage organizational departments</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add Department" icon="add" class="add-btn" @click="openDepartmentDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loadingDepartments">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell">Department Name</div>
            <div class="skeleton-header-cell">Description</div>
            <div class="skeleton-header-cell">Policies</div>
            <div class="skeleton-header-cell" style="flex: 0 0 60px">Actions</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell" style="flex: 0 0 60px"><q-skeleton type="text" width="40px" /></div>
          </div>
        </div>
      </template>
      <template v-else>
        <q-table :rows="filteredDepartments" :columns="departmentColumns" row-key="id" flat no-data-label="No departments found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Department Name</q-th>
              <q-th class="table-header-cell">Policies</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"><span class="item-name">{{ props.row.name }}</span></q-td>
              <q-td class="table-body-cell">{{ getPolicyNames(props.row.policies) }}</q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup class="dropdown-item" @click="editDepartment(props.row)">
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit Department</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deleteDepartment(props.row)">
                        <q-item-section side><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                        <q-item-section>Delete</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </template>
    </div>

    <q-dialog v-model="departmentDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="corporate_fare" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingDepartment ? 'Edit Department' : 'Add Department' }}</div>
              <div class="admin-modal-subtitle">Manage department information</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="departmentForm.name" label="Department Name *" outlined dense class="q-mb-md" />
          <q-select v-model="departmentForm.cost_center" :options="costCenters" option-value="id" option-label="name" emit-value map-options label="Cost Center (optional)" outlined dense clearable class="q-mt-md">
            <template v-slot:prepend><q-icon name="account_balance" size="18px" /></template>
          </q-select>
          <q-select v-model="departmentForm.policies" :options="policies" option-value="id" option-label="name" label="Policies" outlined dense multiple use-chips clearable class="q-mt-md" />
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" :label="editingDepartment ? 'Update' : 'Save'" :loading="savingDepartment" @click="saveDepartment" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminDepartments } from '@/composables/admin/useAdminDepartments'
import { useAdminCostCenters } from '@/composables/admin/useAdminCostCenters'
import { useAdminDepartmentPolicies } from '@/composables/admin/useAdminDepartmentPolicies'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const { costCenters, fetchCostCenters } = useAdminCostCenters()
const { policies, fetchDepartmentPolicies } = useAdminDepartmentPolicies()

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

const getPolicyNames = (ids) => {
  if (!ids?.length) return '—'
  return ids.map((id) => {
    const p = policies.value.find((p) => p.id === id)
    return p ? p.name : id
  }).join(', ')
}

  const departmentColumns = ref([
    { name: 'name', label: 'Department Name', field: 'name', align: 'left' },
    { name: 'policies', label: 'Policies', field: 'policies', align: 'left' },
    { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
  ])

const filteredDepartments = computed(() => {
  if (!props.searchQuery) return departments.value
  const q = props.searchQuery.toLowerCase()
  return departments.value.filter((d) => (d.name || '').toLowerCase().includes(q))
})

onMounted(async () => {
  await fetchDepartments()
  await fetchCostCenters()
  await fetchDepartmentPolicies()
})
</script>

<style scoped>
@import './AdminSettingsPanelShared.css';
</style>
