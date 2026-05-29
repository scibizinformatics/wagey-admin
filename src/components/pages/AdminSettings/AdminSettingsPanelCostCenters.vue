<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Cost Centers</h2>
        <p class="table-subtitle">Manage payroll cost centers and bank accounts</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add Cost Center" icon="add" class="add-btn" @click="openCostCenterDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loadingCostCenters">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell">Name</div>
            <div class="skeleton-header-cell">Bank Accounts</div>
            <div class="skeleton-header-cell">Status</div>
            <div class="skeleton-header-cell" style="flex: 0 0 60px">Actions</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" width="120px" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" width="60px" /></div>
            <div class="skeleton-cell" style="flex: 0 0 60px"><q-skeleton type="text" width="40px" /></div>
          </div>
        </div>
      </template>
      <template v-else>
        <q-table :rows="filteredCostCenters" :columns="costCenterColumns" row-key="id" flat no-data-label="No cost centers found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Name</q-th>
              <q-th class="table-header-cell">Bank Accounts</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"><span class="item-name">{{ props.row.name }}</span></q-td>
              <q-td class="table-body-cell">
                <div v-if="props.row.bank_accounts && props.row.bank_accounts.length">
                  <q-chip v-for="(bank, idx) in props.row.bank_accounts.slice(0, 2)" :key="idx" dense size="sm" color="blue-1" text-color="blue-8" :label="bank.bank_name || bank.bank_account_name" class="permission-chip" />
                  <q-chip v-if="props.row.bank_accounts.length > 2" dense size="sm" color="grey-3" text-color="grey-8" :label="`+${props.row.bank_accounts.length - 2}`" class="permission-chip" />
                </div>
                <span v-else class="text-grey-5">No bank accounts</span>
              </q-td>
              <q-td class="table-body-cell">
                <div :class="['status-badge', props.row.is_active ? 'status-active' : 'status-inactive']">{{ props.row.is_active ? 'Active' : 'Inactive' }}</div>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup class="dropdown-item" @click="editCostCenter(props.row)">
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit Cost Center</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deleteCostCenter(props.row)">
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

    <q-dialog v-model="costCenterDialog" persistent>
      <q-card class="admin-modal-card" style="max-width: 600px; width: 600px">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="account_balance" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingCostCenter ? 'Edit Cost Center' : 'Add Cost Center' }}</div>
              <div class="admin-modal-subtitle">Manage payroll cost centers and bank accounts</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <div class="form-section-label">Basic Information</div>
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12">
              <q-input v-model="costCenterForm.name" label="Cost Center Name *" outlined dense>
                <template v-slot:prepend><q-icon name="label" size="18px" /></template>
              </q-input>
            </div>
            <div class="col-12">
              <q-toggle v-model="costCenterForm.is_active" label="Active" color="primary" />
            </div>
          </div>
          <div class="form-section-label">Bank Accounts</div>
          <div v-for="(bank, idx) in costCenterForm.bank_accounts" :key="idx" class="q-mb-md" style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 14px 8px">
            <div class="row q-col-gutter-sm items-center q-mb-xs">
              <div class="col text-caption text-weight-medium text-grey-7">Bank Account {{ idx + 1 }}</div>
              <div class="col-auto">
                <q-btn flat round dense icon="remove_circle_outline" color="negative" size="sm" @click="removeBankAccount(idx)" :disable="costCenterForm.bank_accounts.length === 1" />
              </div>
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6"><q-input v-model="bank.bank_name" label="Bank Name" outlined dense /></div>
              <div class="col-12 col-sm-6"><q-input v-model="bank.bank_account_name" label="Account Name" outlined dense /></div>
              <div class="col-12 col-sm-6"><q-input v-model="bank.bank_account_number" label="Account Number" outlined dense /></div>
              <div class="col-12 col-sm-6 flex items-center"><q-toggle v-model="bank.is_active" label="Active" color="primary" dense /></div>
            </div>
          </div>
          <q-btn flat color="primary" icon="add" label="Add Bank Account" class="q-mb-sm" @click="addBankAccount" />
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" :label="editingCostCenter ? 'Update' : 'Save'" :loading="savingCostCenter" @click="saveCostCenter" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminCostCenters } from '@/composables/admin/useAdminCostCenters'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const {
  costCenters,
  loading: loadingCostCenters,
  saving: savingCostCenter,
  dialog: costCenterDialog,
  editing: editingCostCenter,
  form: costCenterForm,
  fetchCostCenters,
  openDialog: openCostCenterDialog,
  openEditDialog: editCostCenter,
  addBankAccount,
  removeBankAccount,
  saveCostCenter,
  deleteCostCenter,
} = useAdminCostCenters()

const costCenterColumns = ref([
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'bank_accounts', label: 'Bank Accounts', field: 'bank_accounts', align: 'left' },
  { name: 'is_active', label: 'Status', field: 'is_active', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const filteredCostCenters = computed(() => {
  if (!props.searchQuery) return costCenters.value
  const q = props.searchQuery.toLowerCase()
  return costCenters.value.filter((c) => (c.name || '').toLowerCase().includes(q))
})

onMounted(fetchCostCenters)
</script>
