<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Permissions</h2>
        <p class="table-subtitle">Manage user roles and permissions across the system</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add Role" icon="add" class="add-btn" @click="openRoleDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loadingRoles">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell">Role Name</div>
            <div class="skeleton-header-cell">Permissions</div>
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
        <q-table :rows="filteredRoles" :columns="roleColumns" row-key="id" flat no-data-label="No roles found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Role Name</q-th>
              <q-th class="table-header-cell">Permissions</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"><span class="item-name">{{ props.row.name }}</span></q-td>
              <q-td class="table-body-cell">
                <div class="permissions-container">
                  <q-chip v-for="(permission, index) in getActivePermissions(props.row).slice(0, 3)" :key="index" dense size="sm" color="blue-1" text-color="blue-8" :label="permission" class="permission-chip" />
                  <q-chip v-if="getActivePermissions(props.row).length > 3" dense size="sm" color="grey-3" text-color="grey-8" :label="`+${getActivePermissions(props.row).length - 3}`" class="permission-chip" />
                </div>
              </q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup class="dropdown-item" @click="editRole(props.row)">
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit Role</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deleteRole(props.row)">
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

    <q-dialog v-model="roleDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="admin_panel_settings" size="22px" /></q-avatar>
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
          <q-btn color="primary" :label="editingRole ? 'Update Role' : 'Save Role'" :loading="savingRole" @click="saveRole" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminRoles } from '@/composables/admin/useAdminRoles'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

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

const roleColumns = ref([
  { name: 'name', label: 'Role Name', field: 'name', align: 'left' },
  { name: 'permissions', label: 'Permissions', field: 'permissions', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const filteredRoles = computed(() => {
  if (!props.searchQuery) return roles.value
  const q = props.searchQuery.toLowerCase()
  return roles.value.filter((r) => (r.name || '').toLowerCase().includes(q))
})

onMounted(fetchRoles)
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
