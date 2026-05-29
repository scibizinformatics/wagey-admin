<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Positions</h2>
        <p class="table-subtitle">Manage job positions and department structures</p>
      </div>
      <div class="table-actions">
        <q-btn color="primary" label="Add Position" icon="add" class="add-btn" @click="openPositionDialog" />
      </div>
    </div>

    <div class="modern-table-container">
      <template v-if="loadingPositions">
        <div class="table-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-header-cell">Position Title</div>
            <div class="skeleton-header-cell">Description</div>
            <div class="skeleton-header-cell" style="flex: 0 0 60px">Actions</div>
          </div>
          <div class="skeleton-row" v-for="n in 4" :key="n">
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell"><q-skeleton type="text" /></div>
            <div class="skeleton-cell" style="flex: 0 0 60px"><q-skeleton type="text" width="40px" /></div>
          </div>
        </div>
      </template>
      <template v-else>
        <q-table :rows="filteredPositions" :columns="positionColumns" row-key="id" flat no-data-label="No positions found" class="settings-table" hide-pagination :rows-per-page-options="[0]">
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Position Title</q-th>
              <q-th class="table-header-cell">Description</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"><span class="item-name">{{ props.row.title || props.row.name }}</span></q-td>
              <q-td class="table-body-cell">{{ props.row.description }}</q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup class="dropdown-item" @click="editPosition(props.row)">
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit Position</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup class="dropdown-item dropdown-item-danger" @click="deletePosition(props.row)">
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

    <q-dialog v-model="positionDialog" persistent>
      <q-card class="admin-modal-card">
        <q-card-section class="admin-modal-header">
          <div class="modal-title-section">
            <q-avatar size="44px" class="modal-avatar-icon modal-avatar-add"><q-icon name="work" size="22px" /></q-avatar>
            <div>
              <div class="admin-modal-title">{{ editingPosition ? 'Edit Position' : 'Add Position' }}</div>
              <div class="admin-modal-subtitle">Manage job positions</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense class="modal-close-btn" v-close-popup />
        </q-card-section>
        <q-card-section class="admin-modal-content">
          <q-input v-model="positionForm.name" label="Position Name *" outlined dense class="q-mb-md" />
          <q-input v-model="positionForm.description" label="Description" outlined dense type="textarea" rows="3" />
        </q-card-section>
        <q-card-actions align="right" class="admin-modal-footer">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn color="primary" :label="editingPosition ? 'Update' : 'Save'" :loading="savingPosition" @click="savePosition" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminPositions } from '@/composables/admin/useAdminPositions'

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const {
  positions,
  loading: loadingPositions,
  saving: savingPosition,
  dialog: positionDialog,
  editing: editingPosition,
  form: positionForm,
  fetchPositions,
  openDialog: openPositionDialog,
  openEditDialog: editPosition,
  savePosition,
  deletePosition,
} = useAdminPositions()

const positionColumns = ref([
  { name: 'title', label: 'Position Title', field: 'title', align: 'left' },
  { name: 'description', label: 'Description', field: 'description', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
])

const filteredPositions = computed(() => {
  if (!props.searchQuery) return positions.value
  const q = props.searchQuery.toLowerCase()
  return positions.value.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q),
  )
})

onMounted(fetchPositions)
</script>
