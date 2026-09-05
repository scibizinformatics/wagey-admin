<template>
  <div class="table-section">
    <div class="table-header">
      <div class="table-title-section">
        <h2 class="table-title">Positions</h2>
        <p class="table-subtitle">Manage job positions and department structures</p>
      </div>
      <div class="table-actions">
        <q-btn
          color="primary"
          label="Add position"
          icon="add"
          class="add-btn"
          @click="openPositionDialog"
        />
      </div>
    </div>

    <div class="modern-table-container">
      <!-- Built from the live `positionColumns`, so the placeholder shares the
           real table's columns, labels and alignment. -->
      <template v-if="loadingPositions">
        <TableSkeleton :columns="positionColumns" :rows="5" />
      </template>
      <template v-else>
        <q-table
          :rows="filteredPositions"
          :columns="positionColumns"
          row-key="id"
          flat
          no-data-label="No positions found"
          class="dash-qtable settings-table"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template v-slot:header>
            <q-tr class="table-header-row">
              <q-th class="table-header-cell">Position Title</q-th>
              <q-th class="table-header-cell">Description</q-th>
              <q-th class="table-header-cell actions-header">Actions</q-th>
            </q-tr>
          </template>
          <template v-slot:body="props">
            <q-tr class="table-body-row">
              <q-td class="table-body-cell"
                ><span class="item-name">{{ props.row.title || props.row.name }}</span></q-td
              >
              <q-td class="table-body-cell">{{ props.row.description }}</q-td>
              <q-td class="table-body-cell actions-cell">
                <q-btn flat round dense icon="more_horiz" class="action-menu-btn">
                  <q-menu anchor="bottom right" self="top right" class="action-dropdown">
                    <q-list dense style="min-width: 150px">
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item"
                        @click="editPosition(props.row)"
                      >
                        <q-item-section side><q-icon name="edit" size="16px" /></q-item-section>
                        <q-item-section>Edit position</q-item-section>
                      </q-item>
                      <q-item
                        clickable
                        v-close-popup
                        class="dropdown-item dropdown-item-danger"
                        @click="deletePosition(props.row)"
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

    <q-dialog v-model="positionDialog" persistent>
      <q-card class="dash-modal">
        <q-card-section class="dash-modal__head">
          <div class="dash-modal__head-main">
            <q-avatar size="38px" class="dash-modal__head-icon"
              ><q-icon name="work" size="22px"
            /></q-avatar>
            <div class="dash-modal__head-titles">
              <div class="dash-modal__title">
                {{ editingPosition ? 'Edit position' : 'Add Position' }}
              </div>
              <div class="dash-modal__sub">Manage job positions</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense aria-label="Close" v-close-popup />
        </q-card-section>
        <q-card-section class="dash-modal__body">
          <label class="dash-modal__field">
            <span class="dash-modal__field-label"
              >Position Name<span class="dash-modal__req">*</span></span
            >
            <q-input
              v-model="positionForm.name"
              outlined
              dense
              class="dash-field"
              hide-bottom-space
            />
          </label>
          <label class="dash-modal__field">
            <span class="dash-modal__field-label">Description</span>
            <q-input
              v-model="positionForm.description"
              outlined
              dense
              type="textarea"
              rows="3"
              hide-bottom-space
              class="dash-field"
            />
          </label>
        </q-card-section>
        <q-card-actions class="dash-modal__foot">
          <q-btn flat no-caps label="Cancel" class="dash-modal__cancel" v-close-popup />
          <q-btn
            :label="editingPosition ? 'Update' : 'Save'"
            no-caps
            class="dash-modal__submit"
            :loading="savingPosition"
            @click="savePosition"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
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

<style scoped lang="scss">
@import './AdminSettingsPanelShared.scss';
</style>
