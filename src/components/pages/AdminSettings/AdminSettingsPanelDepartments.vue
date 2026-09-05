<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Departments</h2>
        <p class="table-subtitle">Manage organizational departments</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add department"
          icon="add"
          class="add-btn"
          @click="openDepartmentDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `departmentColumns`, so the placeholder shares the
           real table's columns, labels and alignment. -->
      <template v-if="loadingDepartments">
        <TableSkeleton :columns="departmentColumns" :rows="5" />
      </template>
      <template v-else>
        <q-table
          :rows="filteredDepartments"
          :columns="departmentColumns"
          row-key="id"
          flat
          no-data-label="No departments found"
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Department Name</q-th>
              <q-th class="table-header-cell">Policies</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"
                ><span class="item-name">{{ props.row.name }}</span></q-td
              >
              <q-td class="table-body-cell">{{ getPolicyNames(props.row.policies) }}</q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="editDepartment(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit department</q-item-section>
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
      </template>
    </div>

    <q-dialog v-model="departmentDialog" persistent>
      <q-card class="dash-modal">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon"
              ><q-icon name="corporate_fare" size="22px"
            /></q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editingDepartment ? 'Edit department' : 'Add Department' }}
              </div>
              <div class="dash-modal__sub">Manage department information</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>
        <q-card-section class="dash-modal__body">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Department name<span class="dash-modal__req">*</span></span
            >
            <q-input
              v-model="departmentForm.name"
              outlined
              dense
              class="dash-field"
              hide-bottom-space
            />
          </label>
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Cost center</span>
            <q-select
              v-model="departmentForm.cost_center"
              :options="costCenters"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              outlined
              dense
              clearable
              class="dash-field"
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            >
              <template v-slot:prepend><q-icon name="account_balance" size="18px" /></template>
            </q-select>
          </label>
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Policies</span>
            <q-select
              v-model="departmentForm.policies"
              :options="policies"
              option-value="id"
              option-label="name"
              outlined
              dense
              multiple
              use-chips
              clearable
              class="dash-field"
              hide-bottom-space
              popup-content-class="dash-popup dash-popup--modal"
            />
          </label>
        </q-card-section>
        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="editingDepartment ? 'Update' : 'Save'"
            no-caps
            class="dash-modal__submit"
            :loading="savingDepartment"
            @click="saveDepartment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
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
  return ids
    .map((id) => {
      const p = policies.value.find((p) => p.id === id)
      return p ? p.name : id
    })
    .join(', ')
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

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';
</style>
