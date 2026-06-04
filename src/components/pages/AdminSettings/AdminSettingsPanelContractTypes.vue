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
                  <template v-if="props.row.eligibility_details?.length">
                    <q-chip v-for="el in props.row.eligibility_details" :key="el.id" size="sm" color="primary" text-color="white">{{ el.name }}</q-chip>
                  </template>
                  <template v-else>
                    <q-chip v-for="el in props.row.eligibilities" :key="el" size="sm" color="primary" text-color="white">{{ getEligibilityName(el) }}</q-chip>
                  </template>
                  <span v-if="!(props.row.eligibility_details?.length || props.row.eligibilities?.length)" class="text-grey">None</span>
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
          <div class="text-subtitle2 q-mb-xs">Eligibilities</div>
          <q-separator class="q-mb-md" />
          <div class="row">
            <div v-for="opt in eligibilityOptions" :key="opt.value" class="col-6 q-mb-sm">
              <q-checkbox
                :model-value="contractTypeForm.eligibilities.includes(opt.value)"
                @update:model-value="toggleEligibility(opt.value, $event)"
                :label="opt.label"
                :disable="opt.disable"
                dense
              />
            </div>
          </div>
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
import { ref, computed, onMounted, watch } from 'vue'
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

const flexibleId = computed(() => eligibilities.value.find((e) => e.name === 'Work Hours Flexible')?.id)
const strictId = computed(() => eligibilities.value.find((e) => e.name === 'Work Hours Strict')?.id)

const eligibilityOptions = computed(() =>
  eligibilities.value.map((e) => {
    const isSelected = contractTypeForm.value.eligibilities.includes(e.id)
    const otherSelected =
      e.id === flexibleId.value
        ? contractTypeForm.value.eligibilities.includes(strictId.value)
        : e.id === strictId.value
          ? contractTypeForm.value.eligibilities.includes(flexibleId.value)
          : false
    return {
      label: e.name,
      value: e.id,
      disable: otherSelected && !isSelected,
    }
  }),
)

watch(
  () => contractTypeForm.value.eligibilities,
  (newVal, oldVal) => {
    if (!flexibleId.value || !strictId.value) return
    const hasFlexible = newVal.includes(flexibleId.value)
    const hasStrict = newVal.includes(strictId.value)
    if (hasFlexible && hasStrict) {
      const hadFlexible = oldVal?.includes(flexibleId.value)
      const hadStrict = oldVal?.includes(strictId.value)
      if (hadFlexible && !hadStrict) {
        contractTypeForm.value.eligibilities = newVal.filter((id) => id !== strictId.value)
      } else if (!hadFlexible && hadStrict) {
        contractTypeForm.value.eligibilities = newVal.filter((id) => id !== flexibleId.value)
      } else {
        contractTypeForm.value.eligibilities = newVal.filter((id) => id !== strictId.value)
      }
    }
  },
)

function toggleEligibility(id, checked) {
  const current = contractTypeForm.value.eligibilities
  if (checked) {
    contractTypeForm.value.eligibilities = [...current, id]
  } else {
    contractTypeForm.value.eligibilities = current.filter((eid) => eid !== id)
  }
}

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
