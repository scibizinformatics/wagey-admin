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
      <q-card class="admin-modal-card admin-modal-card--md">
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

<style scoped>
@import './AdminSettingsPanelShared.css';

/* ── Table Section ── */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
  margin-bottom: 0;
}

.table-section .q-table__bottom {
  display: none !important;
}

.table-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #ffffff;
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

/* ── Table Styles ── */
.modern-table-container {
  overflow-x: auto;
  max-height: 480px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-radius: 12px !important;
}

.modern-table-container::-webkit-scrollbar {
  display: none;
}

.settings-table {
  background: transparent !important;
}

.table-header-cell {
  background: #f8fafc;
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
  background: #ffffff;
  font-size: 13px;
  color: #374151;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f3f5 !important;
  vertical-align: middle;
  text-align: left !important;
  min-height: 48px;
}

.table-body-row:last-child .table-body-cell {
  border-bottom: none !important;
}

.item-name {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
}

.actions-header {
  text-align: center !important;
  width: 60px;
}

.actions-cell {
  text-align: center !important;
  width: 60px;
}

.actions-header .q-table__sort-icon,
.actions-header span {
  text-align: center !important;
  justify-content: center !important;
}

/* ── Table Skeleton Loading ── */
.table-skeleton {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  overflow: hidden;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fb;
  border-bottom: 1px solid #e8ecf0;
}

.skeleton-header-cell {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f3f5;
}

.skeleton-row:last-child {
  border-bottom: none;
}

.skeleton-cell {
  flex: 1;
  display: flex;
  align-items: center;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .table-title {
    font-size: 16px;
  }

  .modern-table-container {
    margin: 0 12px 12px 12px;
  }
}

@media (max-width: 768px) {
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
}

@media (max-width: 480px) {
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
}
</style>
