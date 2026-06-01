<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Contract Types</h2>
        <p class="table-subtitle">Manage contract type definitions</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add Contract Type" icon="add" class="add-btn" @click="openContractTypeDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loadingContractTypes">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell">Name</div>
            <div class="skeleton-header-cell">Eligibilities</div>
            <div class="skeleton-header-cell" style="flex: 0 0 60px">Actions</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" width="120px" /></div>
            <div class="skeleton-cell" style="flex: 0 0 60px"><q-skeleton type="text" width="40px" /></div>
          </div>
        </div>
      </template>
      <template v-else>
        <q-table :rows="contractTypeDefinitions" :columns="contractTypeColumns" row-key="id" flat no-data-label="No contract types found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Name</q-th>
              <q-th class="table-header-cell">Eligibilities</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"><span class="item-name">{{ props.row.name }}</span></q-td>
              <q-td class="table-body-cell">
                <div class="eligibility-badges">
                  <q-chip v-for="el in props.row.eligibilities" :key="el" size="sm" color="primary" text-color="white">{{ getEligibilityName(el) }}</q-chip>
                  <span v-if="!props.row.eligibilities?.length" class="text-grey">None</span>
                </div>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup class="dropdown-item" @click="editContractType(props.row)">
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deleteContractType(props.row)">
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

    <q-dialog v-model="contractTypeDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="description" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingContractType ? 'Edit' : 'Add' }} Contract Type</div>
              <div class="admin-modal-subtitle">Manage contract type definitions</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="contractTypeForm.name" label="Name *" outlined dense class="q-mb-md" />
          <q-select v-model="contractTypeForm.pay_type" :options="[{ label: 'Monthly', value: 'monthly' }, { label: 'Daily', value: 'daily' }]" label="Pay Type" outlined dense emit-value map-options class="q-mb-md" />
          <q-input v-if="contractTypeForm.pay_type === 'daily'" v-model.number="contractTypeForm.work_hours_per_week" label="Work Hours Per Week" outlined dense type="number" min="0" max="48" :rules="[(val) => !val || val <= 48 || 'Maximum is 48 hours']" class="q-mb-md" />
          <q-select v-model="contractTypeForm.eligibilities" :options="eligibilityOptions" label="Eligibilities" outlined dense multiple use-chips emit-value map-options />
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" label="Save" :loading="savingContractType" @click="saveContractType" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminContractTypes } from '@/composables/admin/useAdminContractTypes'

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

const contractTypeColumns = ref([
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'eligibilities', label: 'Eligibilities', field: 'eligibilities', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const eligibilityOptions = computed(() =>
  eligibilities.value.map((e) => ({ label: e.name, value: e.id })),
)

const getEligibilityName = (id) => {
  const el = eligibilities.value.find((e) => e.id === id)
  return el?.name || 'Unknown'
}

onMounted(async () => {
  await fetchContractTypeDefs()
  await fetchEligibilities()
})
</script>

<style scoped>
@import './AdminSettingsPanelShared.css';
</style>
