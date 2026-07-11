<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Payroll Groups</h2>
        <p class="table-subtitle">Manage payroll grouping and payment methods</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add Payroll Group" icon="add" class="add-btn" @click="openDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loadingPayrollGroups">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell">Name</div>
            <div class="skeleton-header-cell">Payment Method</div>
            <div class="skeleton-header-cell">Status</div>
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
        <q-table :rows="filteredPayrollGroups" :columns="columns" row-key="id" flat no-data-label="No payroll groups found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Name</q-th>
              <q-th class="table-header-cell">Payment Method</q-th>
              <q-th class="table-header-cell">Status</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"><span class="item-name">{{ props.row.name }}</span></q-td>
              <q-td class="table-body-cell">{{ getPaymentMethodName(props.row.payment_method) }}</q-td>
              <q-td class="table-body-cell">
                <span :class="['status-badge', props.row.is_active ? 'status-active' : 'status-inactive']">
                  {{ props.row.is_active ? 'Active' : 'Inactive' }}
                </span>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup class="dropdown-item" @click="editPayrollGroup(props.row)">
                      <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit Payroll Group</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deletePayrollGroup(props.row)">
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

    <q-dialog v-model="dialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon"><q-icon name="payments" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editing ? 'Edit Payroll Group' : 'Add Payroll Group' }}</div>
              <div class="admin-modal-subtitle">Manage payroll group information</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="form.name" label="Group Name *" outlined dense />

          <q-select
            v-model="form.payment_method"
            :options="paymentMethodOptions"
            label="Payment Method *"
            outlined dense
            emit-value
            map-options
            class="q-mt-md"
          >
            <template v-slot:prepend><q-icon name="account_balance_wallet" size="18px" /></template>
          </q-select>

          <div class="q-mt-md toggle-item">
            <q-toggle v-model="form.is_active" color="primary" size="md" class="brand-toggle" />
            <div class="toggle-label-group">
              <div class="toggle-label">Active</div>
              <div class="toggle-hint">Enable this payroll group for processing</div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" :label="editing ? 'Update' : 'Save'" class="admin-save-btn" :loading="saving" @click="savePayrollGroup" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminPayrollGroups } from '@/composables/admin/useAdminPayrollGroups'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const {
  payrollGroups,
  paymentMethods,
  loading,
  saving,
  dialog,
  editing,
  form,
  fetchPayrollGroups,
  fetchPaymentMethods,
  openDialog,
  openEditDialog,
  savePayrollGroup,
  deletePayrollGroup,
} = useAdminPayrollGroups()

const loadingPayrollGroups = computed(() => loading.value)

const paymentMethodOptions = computed(() =>
  paymentMethods.value.map((pm) => ({ label: pm.name, value: pm.id }))
)

const columns = ref([
  { name: 'name', label: 'Name', field: 'name', align: 'left' },
  { name: 'payment_method', label: 'Payment Method', field: 'payment_method', align: 'left' },
  { name: 'is_active', label: 'Status', field: 'is_active', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const filteredPayrollGroups = computed(() => {
  if (!props.searchQuery) return payrollGroups.value
  const q = props.searchQuery.toLowerCase()
  return payrollGroups.value.filter(
    (g) => (g.name || '').toLowerCase().includes(q)
      || (g.display_name || '').toLowerCase().includes(q)
      || (g.payment_method_name || '').toLowerCase().includes(q),
  )
})

function getPaymentMethodName(id) {
  const pm = paymentMethods.value.find((p) => p.id === id)
  return pm ? pm.name : id ?? '—'
}

function editPayrollGroup(group) {
  openEditDialog(group)
}

onMounted(async () => {
  await Promise.all([fetchPayrollGroups(), fetchPaymentMethods()])
})
</script>

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';
</style>