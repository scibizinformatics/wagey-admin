<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Permissions</h2>
        <p class="table-subtitle">Manage user roles and permissions across the system</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add role"
          icon="add"
          class="add-btn"
          @click="openRoleDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `roleColumns`, so the placeholder shares the
           real table's columns, labels and alignment. -->
      <template v-if="loadingRoles">
        <TableSkeleton :columns="roleColumns" :rows="5" />
      </template>
      <template v-else>
        <q-table
          :rows="filteredRoles"
          :columns="roleColumns"
          row-key="id"
          flat
          no-data-label="No roles found"
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Role Name</q-th>
              <q-th class="table-header-cell">Permissions</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"
                ><span class="item-name">{{ props.row.name }}</span></q-td
              >
              <q-td class="table-body-cell">
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
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="editRole(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit role</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="deleteRole(props.row)"
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

    <q-dialog v-model="roleDialog" persistent>
      <q-card class="dash-modal">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon"
              ><q-icon name="admin_panel_settings" size="22px"
            /></q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">{{ editingRole ? 'Edit role' : 'Add Role' }}</div>
              <div class="dash-modal__sub">Manage user roles and permissions</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>
        <q-card-section class="dash-modal__body">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Role Name<span class="dash-modal__req">*</span></span
            >
            <q-input v-model="roleForm.name" outlined dense class="dash-field" hide-bottom-space />
          </label>
          <div class="text-subtitle2 q-mb-xs">Permissions</div>
          <q-separator class="q-mb-md" />
          <div class="row">
            <div v-for="perm in permissionFields" :key="perm.key" class="col-6 q-mb-sm">
              <q-checkbox v-model="roleForm[perm.key]" :label="perm.label" dense />
            </div>
          </div>
        </q-card-section>
        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="editingRole ? 'Update Role' : 'Save Role'"
            no-caps
            class="dash-modal__submit"
            :loading="savingRole"
            @click="saveRole"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
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

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';
</style>
